const DISPLAY_FIELDS = [
  ["company_name", "Company"],
  ["founder_name", "Founder"],
  ["email", "Email"],
  ["entity_type", "Entity"],
  ["locations", "Locations"],
  ["requested_amount", "Grant Ask"],
  ["elevator_pitch", "Elevator Pitch"],
  ["problem_statement", "Problem"],
  ["use_of_funds", "Use of Funds"]
];

let currentAutofill = null;

document.addEventListener("DOMContentLoaded", async () => {
  const detectedCountEl = document.getElementById("detected-count");
  const pageTitleEl = document.getElementById("page-title");
  const companyBadgeEl = document.getElementById("company-badge");
  const fieldListEl = document.getElementById("quick-field-list");
  const apiBaseInput = document.getElementById("api-base-input");
  const passwordInput = document.getElementById("password-input");
  const statusMsg = document.getElementById("status-msg");

  const state = await chrome.runtime.sendMessage({ type: "GET_STATE" });
  currentAutofill = state?.autofill || {};
  apiBaseInput.value = state?.apiBase || "https://grant-rider.vercel.app";
  passwordInput.value = state?.password || "";
  companyBadgeEl.textContent = `${currentAutofill.company_name || "Abena DMS"} · Profile Ready`;

  renderFieldChips(fieldListEl, currentAutofill, statusMsg);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    try {
      const scan = await chrome.tabs.sendMessage(tab.id, { type: "SCAN_PAGE" });
      if (scan?.ok) {
        detectedCountEl.textContent = `${scan.fieldCount} fields`;
        pageTitleEl.textContent = scan.pageTitle || tab.title || "Grant Application Page";
      } else {
        detectedCountEl.textContent = "Ready";
        pageTitleEl.textContent = tab.title || "Current webpage";
      }
    } catch {
      detectedCountEl.textContent = "Ready";
      pageTitleEl.textContent = tab.title || "Open any grant application form";
    }
  }

  document.getElementById("autofill-now-btn").addEventListener("click", async () => {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab?.id) return;
    try {
      const res = await chrome.tabs.sendMessage(activeTab.id, {
        type: "RUN_AUTOFILL",
        autofill: currentAutofill
      });
      statusMsg.textContent = `✓ Autofilled ${res?.filledCount ?? 0} fields on this page!`;
    } catch {
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ["content/content.js"]
      });
      const res = await chrome.tabs.sendMessage(activeTab.id, {
        type: "RUN_AUTOFILL",
        autofill: currentAutofill
      });
      statusMsg.textContent = `✓ Autofilled ${res?.filledCount ?? 0} fields!`;
    }
  });

  document.getElementById("sync-server-btn").addEventListener("click", async () => {
    statusMsg.textContent = "Syncing with Granted Dashboard...";
    const res = await chrome.runtime.sendMessage({
      type: "SYNC_FROM_SERVER",
      apiBase: apiBaseInput.value.trim(),
      password: passwordInput.value
    });
    if (res?.ok) {
      currentAutofill = res.autofill;
      companyBadgeEl.textContent = `${currentAutofill.company_name || "Abena DMS"} · Synced`;
      renderFieldChips(fieldListEl, currentAutofill, statusMsg);
      statusMsg.textContent = "✓ Synced latest Founder Profile & Drafts!";
    } else {
      statusMsg.textContent = `Sync failed: ${res?.error || "could not reach dashboard"}. Using saved profile.`;
    }
  });

  document.getElementById("open-sidepanel-btn").addEventListener("click", async () => {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.windowId) {
      await chrome.sidePanel.open({ windowId: activeTab.windowId });
      window.close();
    }
  });

  document.getElementById("open-dashboard-btn").addEventListener("click", async () => {
    const url = apiBaseInput.value.trim() || "https://grant-rider.vercel.app";
    await chrome.tabs.create({ url });
  });
});

function renderFieldChips(container, autofill, statusMsg) {
  container.innerHTML = "";
  for (const [key, label] of DISPLAY_FIELDS) {
    const val = autofill?.[key] || "";
    if (!val) continue;
    const row = document.createElement("div");
    row.className = "field-chip";
    row.title = "Click to copy to clipboard";

    const span = document.createElement("span");
    span.textContent = label;

    const strong = document.createElement("strong");
    strong.textContent = val;

    row.appendChild(span);
    row.appendChild(strong);
    row.addEventListener("click", async () => {
      await navigator.clipboard.writeText(val);
      statusMsg.textContent = `Copied ${label} to clipboard!`;
    });
    container.appendChild(row);
  }
}
