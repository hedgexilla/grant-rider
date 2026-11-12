const PROFILE_SECTIONS = [
  ["company_name", "Company Name"],
  ["founder_name", "Founder & Contact"],
  ["email", "Contact Email"],
  ["website", "Website"],
  ["entity_type", "Entity Type"],
  ["business_stage", "Business Stage"],
  ["locations", "Eligible Locations"],
  ["requested_amount", "Standard Grant Request"],
  ["elevator_pitch", "Executive Summary / Pitch"],
  ["problem_statement", "Problem Statement"],
  ["solution_summary", "Solution & Product"],
  ["impact_metrics", "Community & Provider Impact"],
  ["use_of_funds", "Use of Funds / Budget Narrative"]
];

let currentAutofill = {};
let activePageTitle = "Grant Application";

document.addEventListener("DOMContentLoaded", async () => {
  await loadExtensionState();
  await scanActiveTab();

  document.getElementById("sp-rescan-btn").addEventListener("click", scanActiveTab);

  document.getElementById("sp-autofill-btn").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    const toast = document.getElementById("sp-toast");
    try {
      const res = await chrome.tabs.sendMessage(tab.id, {
        type: "RUN_AUTOFILL",
        autofill: currentAutofill
      });
      toast.textContent = `✓ Autofilled ${res?.filledCount ?? 0} fields on ${activePageTitle}!`;
    } catch {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content/content.js"]
      });
      const res = await chrome.tabs.sendMessage(tab.id, {
        type: "RUN_AUTOFILL",
        autofill: currentAutofill
      });
      toast.textContent = `✓ Autofilled ${res?.filledCount ?? 0} fields!`;
    }
  });

  document.getElementById("sp-sync-btn").addEventListener("click", async () => {
    const toast = document.getElementById("sp-toast");
    toast.textContent = "Syncing with Granted Dashboard...";
    const res = await chrome.runtime.sendMessage({ type: "SYNC_FROM_SERVER" });
    if (res?.ok) {
      currentAutofill = res.autofill;
      renderProfileList();
      toast.textContent = "✓ Synced latest Founder Profile from Dashboard!";
    } else {
      toast.textContent = "Using locally cached Founder Profile.";
    }
  });

  document.getElementById("sp-generate-btn").addEventListener("click", async () => {
    const question = document.getElementById("sp-question-input").value.trim();
    const tone = document.getElementById("sp-tone-select").value;
    const res = await chrome.runtime.sendMessage({
      type: "TAILOR_ANSWER",
      grantTitle: activePageTitle,
      grantFunder: "Grant Review Committee",
      question: question || "Executive summary and use of funds",
      tone
    });
    if (res?.answer) {
      const box = document.getElementById("sp-answer-box");
      const text = document.getElementById("sp-answer-text");
      text.textContent = res.answer;
      box.hidden = false;
    }
  });

  document.getElementById("sp-copy-answer-btn").addEventListener("click", async () => {
    const text = document.getElementById("sp-answer-text").textContent;
    await navigator.clipboard.writeText(text);
    document.getElementById("sp-toast").textContent = "✓ Copied tailored essay response!";
  });
});

async function loadExtensionState() {
  const state = await chrome.runtime.sendMessage({ type: "GET_STATE" });
  currentAutofill = state?.autofill || {};
  document.getElementById("sp-subtitle").textContent = `${
    currentAutofill.company_name || "Abena DMS"
  } · Form Autofill & Essay Assistant`;
  renderProfileList();
}

async function scanActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const titleEl = document.getElementById("sp-page-title");
  const countEl = document.getElementById("sp-field-count");
  if (!tab?.id) return;

  activePageTitle = tab.title || "Current Grant Page";
  titleEl.textContent = activePageTitle;

  try {
    const scan = await chrome.tabs.sendMessage(tab.id, { type: "SCAN_PAGE" });
    if (scan?.ok) {
      countEl.textContent = String(scan.fieldCount);
      activePageTitle = scan.pageTitle || activePageTitle;
      titleEl.textContent = activePageTitle;
    }
  } catch {
    countEl.textContent = "–";
  }
}

function renderProfileList() {
  const container = document.getElementById("sp-profile-fields");
  container.innerHTML = "";
  const toast = document.getElementById("sp-toast");

  for (const [key, label] of PROFILE_SECTIONS) {
    const val = currentAutofill?.[key];
    if (!val) continue;
    const item = document.createElement("div");
    item.className = "sp-profile-item";
    item.title = "Click to copy field value";

    const span = document.createElement("span");
    span.textContent = label;

    const p = document.createElement("p");
    p.textContent = val;

    item.appendChild(span);
    item.appendChild(p);

    item.addEventListener("click", async () => {
      await navigator.clipboard.writeText(val);
      toast.textContent = `✓ Copied "${label}" to clipboard`;
    });

    container.appendChild(item);
  }
}
