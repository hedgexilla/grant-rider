(() => {
  if (window.__grantedCopilotInjected) return;
  window.__grantedCopilotInjected = true;

  let panelExpanded = false;
  let cachedAutofill = null;

  function getFieldLabel(el) {
    const parts = [];
    if (el.id) {
      const explicit = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (explicit?.innerText) parts.push(explicit.innerText);
    }
    const parentLabel = el.closest("label");
    if (parentLabel?.innerText) parts.push(parentLabel.innerText);
    const fieldWrapper = el.closest(".field, .form-group, .form-field, [data-field-label]");
    if (fieldWrapper?.getAttribute("data-field-label")) {
      parts.push(fieldWrapper.getAttribute("data-field-label"));
    } else if (fieldWrapper) {
      const heading = fieldWrapper.querySelector("label, span, h3, h4, p");
      if (heading?.innerText) parts.push(heading.innerText);
    }
    if (el.getAttribute("aria-label")) parts.push(el.getAttribute("aria-label"));
    if (el.getAttribute("placeholder")) parts.push(el.getAttribute("placeholder"));
    if (el.name) parts.push(el.name);
    if (el.id) parts.push(el.id);
    return parts.join(" ").toLowerCase().replace(/\s+/g, " ").trim();
  }

  function scanFillableFields() {
    const nodes = Array.from(
      document.querySelectorAll(
        'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([disabled]), textarea:not([disabled]), select:not([disabled])'
      )
    );
    return nodes.filter((el) => {
      if (el.closest(".granted-ext-floating-root")) return false;
      if (el.getAttribute("data-no-autofill") === "true") return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 20 && rect.height > 14;
    });
  }

  function resolveValueForField(label, tagName, autofill) {
    if (!autofill) return null;
    const text = label.toLowerCase();

    if (tagName === "textarea" || text.includes("essay") || text.includes("narrative")) {
      if (text.includes("problem") || text.includes("challenge") || text.includes("need")) {
        return { key: "problem_statement", value: autofill.problem_statement };
      }
      if (text.includes("use of fund") || text.includes("budget") || text.includes("how will") || text.includes("allocation")) {
        return { key: "use_of_funds", value: autofill.use_of_funds };
      }
      if (text.includes("impact") || text.includes("outcome") || text.includes("metric") || text.includes("community") || text.includes("benefit")) {
        return { key: "impact_metrics", value: autofill.impact_metrics };
      }
      if (text.includes("solution") || text.includes("product") || text.includes("innovation") || text.includes("approach")) {
        return { key: "solution_summary", value: autofill.solution_summary };
      }
      if (text.includes("customer") || text.includes("audience") || text.includes("population") || text.includes("serve")) {
        return { key: "target_customers", value: autofill.target_customers };
      }
      if (text.includes("focus") || text.includes("priority") || text.includes("area")) {
        return { key: "focus_areas", value: autofill.focus_areas };
      }
      return { key: "elevator_pitch", value: autofill.elevator_pitch };
    }

    if (text.includes("company") || text.includes("organization") || text.includes("business name") || text.includes("legal name") || text.includes("applicant name")) {
      return { key: "company_name", value: autofill.company_name };
    }
    if (text.includes("founder") || text.includes("contact name") || text.includes("full name") || text.includes("applicant contact") || text.includes("ceo") || text.includes("first and last")) {
      return { key: "founder_name", value: autofill.founder_name };
    }
    if (text.includes("title") || text.includes("role")) {
      return { key: "founder_title", value: autofill.founder_title };
    }
    if (text.includes("email") || text.includes("e-mail")) {
      return { key: "email", value: autofill.email };
    }
    if (text.includes("phone") || text.includes("mobile") || text.includes("tel")) {
      return { key: "phone", value: autofill.phone };
    }
    if (text.includes("website") || text.includes("url") || text.includes("domain") || text.includes("site")) {
      return { key: "website", value: autofill.website };
    }
    if (text.includes("ein") || text.includes("tax id") || text.includes("fein")) {
      return { key: "ein", value: autofill.ein };
    }
    if (text.includes("entity") || text.includes("structure") || text.includes("incorporat") || text.includes("nonprofit") || text.includes("profit")) {
      return { key: "entity_type", value: autofill.entity_type };
    }
    if (text.includes("stage") || text.includes("maturity") || text.includes("phase")) {
      return { key: "business_stage", value: autofill.business_stage };
    }
    if (text.includes("industry") || text.includes("sector") || text.includes("category")) {
      return { key: "industry", value: autofill.industry };
    }
    if (text.includes("state") || text.includes("location") || text.includes("region") || text.includes("geography")) {
      return { key: "locations", value: autofill.locations };
    }
    if (text.includes("city") || text.includes("headquarters")) {
      return { key: "city", value: autofill.city };
    }
    if (text.includes("amount") || text.includes("request") || text.includes("grant size") || text.includes("funding ask")) {
      return { key: "requested_amount", value: autofill.requested_amount };
    }
    if (text.includes("team") || text.includes("employee") || text.includes("headcount")) {
      return { key: "team_size", value: autofill.team_size };
    }
    if (text.includes("year") || text.includes("founded")) {
      return { key: "year_founded", value: autofill.year_founded };
    }
    if (text.includes("customer") || text.includes("beneficiar")) {
      return { key: "target_customers", value: autofill.target_customers };
    }
    if (text.includes("focus") || text.includes("keyword")) {
      return { key: "focus_areas", value: autofill.focus_areas };
    }
    if (text.includes("pitch") || text.includes("summary") || text.includes("mission") || text.includes("description")) {
      return { key: "elevator_pitch", value: autofill.elevator_pitch };
    }
    return null;
  }

  function setNativeFieldValue(el, value) {
    const tag = el.tagName.toLowerCase();
    if (tag === "select") {
      const options = Array.from(el.options);
      const lowerVal = String(value).toLowerCase();
      const match = options.find(
        (opt) =>
          opt.value.toLowerCase().includes(lowerVal) ||
          opt.text.toLowerCase().includes(lowerVal) ||
          lowerVal.includes(opt.value.toLowerCase())
      );
      if (match) {
        el.value = match.value;
      } else if (options.length > 1) {
        el.selectedIndex = 1;
      }
    } else {
      const proto =
        tag === "textarea"
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(proto, "value");
      if (descriptor?.set) {
        descriptor.set.call(el, value);
      } else {
        el.value = value;
      }
    }
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.classList.add("granted-ext-autofilled");
  }

  async function autofillPageFields(autofillData) {
    const fields = scanFillableFields();
    const matched = [];

    for (const el of fields) {
      const label = getFieldLabel(el);
      const match = resolveValueForField(label, el.tagName.toLowerCase(), autofillData);
      if (match && match.value) {
        matched.push({ el, value: match.value, key: match.key, label });
      }
    }

    const BATCH_SIZE = 10;
    for (let i = 0; i < matched.length; i += BATCH_SIZE) {
      const batch = matched.slice(i, i + BATCH_SIZE);
      await new Promise((resolve) =>
        requestAnimationFrame(() => {
          for (const item of batch) {
            setNativeFieldValue(item.el, item.value);
          }
          resolve();
        })
      );
      if (globalThis.scheduler?.yield) {
        await globalThis.scheduler.yield();
      }
    }

    showToast(
      matched.length > 0
        ? `⚡ Granted Copilot autofilled ${matched.length} grant form field${matched.length === 1 ? "" : "s"}!`
        : "No matching grant form fields detected on this page."
    );

    return {
      filledCount: matched.length,
      totalFields: fields.length,
      filledKeys: matched.map((m) => m.key)
    };
  }

  function showToast(message) {
    const existing = document.querySelector(".granted-ext-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "granted-ext-toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3400);
  }

  function renderFloatingCopilot() {
    if (document.querySelector("[data-granted-app-dashboard='true']")) {
      return;
    }

    const fields = scanFillableFields();
    if (fields.length === 0) return;

    let root = document.querySelector(".granted-ext-floating-root");
    if (!root) {
      root = document.createElement("div");
      root.className = "granted-ext-floating-root";
      document.body.appendChild(root);
    }

    root.innerHTML = "";

    if (panelExpanded) {
      const card = document.createElement("div");
      card.className = "granted-ext-card";

      const header = document.createElement("div");
      header.className = "granted-ext-card-header";

      const brand = document.createElement("div");
      brand.className = "granted-ext-brand";
      brand.textContent = "⚡ Granted Copilot";

      const badge = document.createElement("span");
      badge.className = "granted-ext-badge";
      badge.textContent = `${fields.length} fields`;
      brand.appendChild(badge);

      const closeBtn = document.createElement("button");
      closeBtn.className = "granted-ext-close";
      closeBtn.textContent = "✕";
      closeBtn.addEventListener("click", () => {
        panelExpanded = false;
        renderFloatingCopilot();
      });

      header.appendChild(brand);
      header.appendChild(closeBtn);

      const body = document.createElement("div");
      body.className = "granted-ext-card-body";

      const status = document.createElement("p");
      status.className = "granted-ext-status";
      status.textContent = `Ready to autofill ${fields.length} detected inputs on this grant page using ${cachedAutofill?.company_name || "Abena DMS"}'s profile.`;

      const fillBtn = document.createElement("button");
      fillBtn.className = "granted-ext-btn-primary";
      fillBtn.textContent = `⚡ 1-Click Autofill (${fields.length} fields)`;
      fillBtn.addEventListener("click", async () => {
        const state = await chrome.runtime.sendMessage({ type: "GET_STATE" });
        cachedAutofill = state?.autofill || cachedAutofill;
        await autofillPageFields(cachedAutofill);
      });

      const row = document.createElement("div");
      row.className = "granted-ext-btn-row";

      const syncBtn = document.createElement("button");
      syncBtn.className = "granted-ext-btn-secondary";
      syncBtn.textContent = "↻ Sync Profile";
      syncBtn.addEventListener("click", async () => {
        const res = await chrome.runtime.sendMessage({ type: "SYNC_FROM_SERVER" });
        if (res?.ok) {
          cachedAutofill = res.autofill;
          showToast("✓ Synced latest Founder Profile from Granted Dashboard");
          renderFloatingCopilot();
        } else {
          showToast("Using locally saved Founder Profile");
        }
      });

      row.appendChild(syncBtn);
      body.appendChild(status);
      body.appendChild(fillBtn);
      body.appendChild(row);

      card.appendChild(header);
      card.appendChild(body);
      root.appendChild(card);
    }

    const fab = document.createElement("button");
    fab.className = "granted-ext-fab";

    const dot = document.createElement("span");
    dot.className = "granted-ext-fab-dot";

    const label = document.createElement("span");
    label.textContent = "Autofill Grant";

    const count = document.createElement("span");
    count.className = "granted-ext-fab-count";
    count.textContent = String(fields.length);

    fab.appendChild(dot);
    fab.appendChild(label);
    fab.appendChild(count);

    fab.addEventListener("click", () => {
      panelExpanded = !panelExpanded;
      renderFloatingCopilot();
    });

    root.appendChild(fab);
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    (async () => {
      if (message.type === "SCAN_PAGE") {
        const fields = scanFillableFields();
        sendResponse({
          ok: true,
          fieldCount: fields.length,
          fields: fields.slice(0, 25).map((el) => ({
            tag: el.tagName.toLowerCase(),
            label: getFieldLabel(el).slice(0, 80)
          })),
          pageTitle: document.title,
          pageUrl: window.location.href
        });
        return;
      }

      if (message.type === "RUN_AUTOFILL") {
        const autofill = message.autofill || cachedAutofill;
        const result = await autofillPageFields(autofill);
        sendResponse({ ok: true, ...result });
        return;
      }

      if (message.type === "SHOW_TOAST") {
        showToast(message.message || "Granted Copilot ready");
        sendResponse({ ok: true });
        return;
      }

      sendResponse({ ok: false });
    })();
    return true;
  });

  (async () => {
    try {
      const state = await chrome.runtime.sendMessage({ type: "GET_STATE" });
      if (state?.autofill) cachedAutofill = state.autofill;
      const fields = scanFillableFields();
      await chrome.runtime.sendMessage({ type: "UPDATE_BADGE", count: fields.length });
      if (state?.widgetEnabled !== false && fields.length > 0) {
        renderFloatingCopilot();
      }
      if (window.location.hash === "#granted-autofill") {
        history.replaceState(null, "", window.location.pathname + window.location.search);
        if (fields.length > 0) {
          await autofillPageFields(cachedAutofill);
          setTimeout(() => showToast("Review every answer, then press the site's Submit button."), 3600);
        } else {
          showToast("No form found yet. Sign in or open the application form, then click Autofill Grant.");
        }
      }
    } catch {
      // Content script loaded before service worker ready
    }
  })();
})();
