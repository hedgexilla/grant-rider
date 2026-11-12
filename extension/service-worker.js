const DEFAULT_API_BASE = "https://grant-rider.vercel.app";

const DEFAULT_AUTOFILL = {
  company_name: "Abena DMS",
  founder_name: "Shariff Tarver",
  founder_title: "Founder & CEO",
  email: "",
  phone: "",
  website: "",
  ein: "",
  entity_type: "for-profit",
  business_stage: "Early-stage / Pilot & Initial Traction",
  industry: "Childcare and early-learning compliance software",
  locations: "New Jersey, Pennsylvania",
  primary_state: "New Jersey",
  city: "",
  target_customers: "Childcare center directors, early-learning providers, and family child-care operators",
  focus_areas: "Childcare compliance; Early learning and preschool; Licensing and inspection readiness; Staff compliance and background-check tracking",
  funding_needs: "Compliance automation & AI document verification; Pilot onboarding for NJ & PA childcare centers",
  requested_amount: "",
  team_size: "",
  year_founded: "",
  elevator_pitch:
    "Abena DMS is an AI-enabled compliance and document management platform built for childcare center directors and early-learning providers across New Jersey and Pennsylvania. We automate licensing readiness, staff background-check tracking, and audit-ready recordkeeping so educators can focus on children instead of paperwork.",
  problem_statement:
    "Childcare and early-learning providers in New Jersey and Pennsylvania face severe administrative burden managing state licensing regulations, staff credential renewals, background checks, and inspection records. Manual binders and fragmented spreadsheets lead to compliance delays and burnout.",
  solution_summary:
    "Abena DMS replaces paper binders with automated compliance tracking: real-time expiration alerts for staff clearances, state-aligned inspection checklists, and instant audit-ready documentation packets.",
  impact_metrics:
    "By deploying Abena DMS with early-learning operators in NJ and PA, each center saves 8-12 administrative hours per week, reduces licensing deficiencies by over 80%, and protects childcare capacity for working families.",
  use_of_funds:
    "Grant funds will directly support: (1) compliance workflow automation and state-licensing templates; (2) onboarding 25+ regional childcare centers into our pilot cohort; and (3) audit-ready reporting tools for providers."
};

// Placeholder contact details shipped in 1.0.0; never submit them on a real application.
const LEGACY_PLACEHOLDERS = {
  email: "shariff@abenadms.com",
  phone: "(215) 555-0194",
  ein: "88-4192045",
  city: "Philadelphia / Camden Metro"
};

function authHeaders(password) {
  return password ? { Authorization: "Basic " + btoa("abena:" + password) } : {};
}

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(["autofill", "apiBase", "widgetEnabled"]);
  if (existing.autofill) {
    const cleaned = { ...existing.autofill };
    for (const [key, value] of Object.entries(LEGACY_PLACEHOLDERS)) {
      if (cleaned[key] === value) cleaned[key] = "";
    }
    const apiBase =
      !existing.apiBase || existing.apiBase.includes("localhost") ? DEFAULT_API_BASE : existing.apiBase;
    await chrome.storage.local.set({ autofill: cleaned, apiBase });
  } else {
    await chrome.storage.local.set({
      autofill: DEFAULT_AUTOFILL,
      apiBase: existing.apiBase || DEFAULT_API_BASE,
      widgetEnabled: existing.widgetEnabled ?? true,
      syncedAt: new Date().toISOString()
    });
  }

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "granted-autofill-page",
      title: "⚡ Autofill Grant Form with Granted Copilot",
      contexts: ["page", "editable"]
    });
    chrome.contextMenus.create({
      id: "granted-open-sidepanel",
      title: "Open Granted AI Copilot Side Panel",
      contexts: ["page", "editable"]
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  if (info.menuItemId === "granted-open-sidepanel") {
    try {
      await chrome.sidePanel.open({ windowId: tab.windowId });
      await sendTabMessageSafe(tab.id, {
        type: "SHOW_TOAST",
        message: "Opened Granted AI Copilot Side Panel"
      });
    } catch (error) {
      console.error("Could not open side panel:", error);
    }
    return;
  }

  if (info.menuItemId === "granted-autofill-page") {
    const { autofill = DEFAULT_AUTOFILL } = await chrome.storage.local.get("autofill");
    const response = await sendTabMessageSafe(tab.id, {
      type: "RUN_AUTOFILL",
      autofill
    });
    const filledCount = response?.filledCount ?? 0;
    await chrome.action.setBadgeText({ text: String(filledCount || "✓"), tabId: tab.id });
    await chrome.action.setBadgeBackgroundColor({ color: "#00c47c", tabId: tab.id });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.type === "GET_STATE") {
        const stored = await chrome.storage.local.get([
          "autofill",
          "profile",
          "apiBase",
          "password",
          "widgetEnabled",
          "syncedAt"
        ]);
        sendResponse({
          ok: true,
          autofill: stored.autofill || DEFAULT_AUTOFILL,
          profile: stored.profile || null,
          apiBase: stored.apiBase || DEFAULT_API_BASE,
          password: stored.password || "",
          widgetEnabled: stored.widgetEnabled ?? true,
          syncedAt: stored.syncedAt || null
        });
        return;
      }

      if (message.type === "SYNC_FROM_SERVER") {
        const stored = await chrome.storage.local.get(["apiBase", "password"]);
        const apiBase = (message.apiBase || stored.apiBase || DEFAULT_API_BASE).replace(/\/$/, "");
        const password = message.password ?? stored.password ?? "";
        const response = await fetch(`${apiBase}/api/autofill`, {
          cache: "no-store",
          headers: authHeaders(password)
        });
        if (response.status === 401) {
          throw new Error("Wrong or missing dashboard password");
        }
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }
        const payload = await response.json();
        const nextAutofill = { ...DEFAULT_AUTOFILL, ...(payload.autofill || {}) };
        await chrome.storage.local.set({
          autofill: nextAutofill,
          profile: payload.profile || null,
          apiBase,
          password,
          syncedAt: payload.syncedAt || new Date().toISOString()
        });
        sendResponse({
          ok: true,
          autofill: nextAutofill,
          profile: payload.profile,
          syncedAt: payload.syncedAt
        });
        return;
      }

      if (message.type === "SAVE_AUTOFILL") {
        const stored = await chrome.storage.local.get("autofill");
        const merged = { ...(stored.autofill || DEFAULT_AUTOFILL), ...(message.autofill || {}) };
        await chrome.storage.local.set({
          autofill: merged,
          syncedAt: new Date().toISOString()
        });
        sendResponse({ ok: true, autofill: merged });
        return;
      }

      if (message.type === "TAILOR_ANSWER") {
        const stored = await chrome.storage.local.get(["apiBase", "password", "profile", "autofill"]);
        const apiBase = (stored.apiBase || DEFAULT_API_BASE).replace(/\/$/, "");
        try {
          const response = await fetch(`${apiBase}/api/autofill`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders(stored.password) },
            body: JSON.stringify({
              profile: stored.profile,
              grantTitle: message.grantTitle,
              grantFunder: message.grantFunder,
              question: message.question,
              tone: message.tone
            })
          });
          if (!response.ok) throw new Error("Fallback to local template");
          const data = await response.json();
          sendResponse({ ok: true, answer: data.answer });
        } catch {
          const af = stored.autofill || DEFAULT_AUTOFILL;
          const fallback = `${af.elevator_pitch}\n\n${af.solution_summary}\n\n${af.use_of_funds}`;
          sendResponse({ ok: true, answer: fallback });
        }
        return;
      }

      if (message.type === "UPDATE_BADGE") {
        const tabId = sender.tab?.id;
        if (tabId) {
          await chrome.action.setBadgeText({
            text: message.count > 0 ? String(message.count) : "",
            tabId
          });
          await chrome.action.setBadgeBackgroundColor({
            color: "#00c47c",
            tabId
          });
        }
        sendResponse({ ok: true });
        return;
      }

      sendResponse({ ok: false, error: "Unknown message type" });
    } catch (error) {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Extension error"
      });
    }
  })();
  return true;
});

async function sendTabMessageSafe(tabId, payload) {
  try {
    return await chrome.tabs.sendMessage(tabId, payload);
  } catch {
    return null;
  }
}
