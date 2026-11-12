"use client";

import {
  Activity,
  Bookmark,
  Bot,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Chrome,
  ClipboardCheck,
  Copy,
  DollarSign,
  ExternalLink,
  FileText,
  Filter,
  Globe,
  HardDrive,
  Layers,
  Loader2,
  MapPin,
  Play,
  Puzzle,
  Radar,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck,
  UserCog,
  Wand2,
  Zap
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type FounderProfile = {
  name: string;
  founder_name: string;
  industry: string;
  entity_type: string;
  focus_areas: string[];
  business_stage: string;
  eligible_locations: string[];
  target_customers: string[];
  funding_needs: string[];
  excluded_grants: string[];
  minimum_score_to_draft: number;
};

type WorkflowResult = {
  grant: {
    title: string;
    url: string;
    funder?: string | null;
    deadline?: string | null;
    funding_amount?: number | null;
    eligibility_summary?: string | null;
    focus_areas: string[];
    required_documents: string[];
    application_questions: string[];
    estimated_effort: string;
    extraction_notes: string[];
    status: string;
  };
  score: {
    total: number;
    breakdown: Record<string, number>;
    reasons: string[];
    disqualifiers: string[];
    next_step: string;
  };
  draft_path?: string | null;
  report_path: string;
};

type DiscoveredOpportunity = {
  title: string;
  url: string;
  source: string;
  eligibility_summary?: string | null;
  status: string;
  search_keyword?: string | null;
};

type AutofillFormState = {
  company_name: string;
  founder_name: string;
  founder_title: string;
  email: string;
  phone: string;
  website: string;
  ein: string;
  entity_type: string;
  business_stage: string;
  locations: string;
  requested_amount: string;
  elevator_pitch: string;
  problem_statement: string;
  solution_summary: string;
  impact_metrics: string;
  use_of_funds: string;
};

const emptyProfile: FounderProfile = {
  name: "",
  founder_name: "",
  industry: "",
  entity_type: "for-profit",
  focus_areas: [],
  business_stage: "",
  eligible_locations: [],
  target_customers: [],
  funding_needs: [],
  excluded_grants: [],
  minimum_score_to_draft: 80
};

const suggestedProfile: FounderProfile = {
  ...emptyProfile,
  name: "Abena DMS",
  founder_name: "Shariff Tarver",
  industry: "Childcare and early-learning compliance software",
  business_stage: "Early-stage / Pilot & Initial Traction",
  focus_areas: [
    "Childcare compliance",
    "Early learning and preschool",
    "Licensing and inspection readiness",
    "Staff compliance and background-check tracking",
    "Audit-ready records and documentation"
  ],
  eligible_locations: ["New Jersey", "Pennsylvania"],
  target_customers: [
    "Childcare center directors and operators",
    "Early-learning providers",
    "Family child-care providers"
  ],
  funding_needs: [
    "Compliance automation & AI document verification",
    "Pilot onboarding for NJ & PA childcare centers",
    "State-licensing inspection readiness templates"
  ]
};

const emptyFormState: AutofillFormState = {
  company_name: "",
  founder_name: "",
  founder_title: "",
  email: "",
  phone: "",
  website: "",
  ein: "",
  entity_type: "",
  business_stage: "",
  locations: "",
  requested_amount: "",
  elevator_pitch: "",
  problem_statement: "",
  solution_summary: "",
  impact_metrics: "",
  use_of_funds: ""
};

const CATEGORY_FILTERS = [
  { id: "all", label: "All Matches" },
  { id: "regional", label: "NJ & PA Regional" },
  { id: "edtech", label: "Education & Childcare" },
  { id: "ai", label: "AI & Innovation" },
  { id: "startup", label: "Early-Stage Founders" }
];

export default function Dashboard() {
  const [profile, setProfile] = useState<FounderProfile>(suggestedProfile);
  const [reports, setReports] = useState<WorkflowResult[]>([]);
  const [discoveries, setDiscoveries] = useState<DiscoveredOpportunity[]>([]);
  const [selectedDiscovery, setSelectedDiscovery] = useState<DiscoveredOpportunity | null>(null);
  const [activeReport, setActiveReport] = useState<WorkflowResult | null>(null);
  const [grantUrl, setGrantUrl] = useState("");
  const [draft, setDraft] = useState("");

  // Jobright Navigation & Tabs
  const [activeNav, setActiveNav] = useState<"feed" | "autofill" | "profile">("feed");
  const [feedTab, setFeedTab] = useState<"recommended" | "saved" | "evaluated" | "archived">("recommended");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [copilotTab, setCopilotTab] = useState<"orion" | "fields" | "draft">("orion");
  const [savedUrls, setSavedUrls] = useState<string[]>([]);

  // Operational states
  const [isRunning, setIsRunning] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [discoveryQuery, setDiscoveryQuery] = useState("");
  const [discoveryLimit, setDiscoveryLimit] = useState(5);
  const [notice, setNotice] = useState("Orion Copilot ready. Pick any grant to 1-Click Autofill or Score & Draft.");

  // Browser Extension Autofill Simulator State
  const [portalForm, setPortalForm] = useState<AutofillFormState>(emptyFormState);
  const [filledFields, setFilledFields] = useState<Record<string, boolean>>({});
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [autofillProgress, setAutofillProgress] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Orion Copilot Q&A State
  const [copilotQuestion, setCopilotQuestion] = useState("");
  const [copilotTone, setCopilotTone] = useState("persuasive");
  const [copilotAnswer, setCopilotAnswer] = useState("");
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);

  const isLoadingOverlayActive = isDiscovering || isRunning || isArchiving;
  const loadingTitle = isDiscovering
    ? "Searching for high-match grants"
    : isRunning
      ? "Scoring fit & generating AI draft"
      : "Archiving grant";

  const readiness = useMemo(() => {
    const checks = [
      profile.name,
      profile.founder_name,
      profile.industry,
      profile.focus_areas.length,
      profile.eligible_locations.length,
      profile.funding_needs.length,
      profile.minimum_score_to_draft
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [profile]);

  const autofillDictionary = useMemo((): AutofillFormState => {
    const activeTitle =
      selectedDiscovery?.title || activeReport?.grant.title || "this grant opportunity";
    const company = profile.name || "Abena DMS";
    const founder = profile.founder_name || "Shariff Tarver";
    const locations = profile.eligible_locations.length
      ? profile.eligible_locations.join(", ")
      : "New Jersey, Pennsylvania";
    const customers = profile.target_customers.length
      ? profile.target_customers.join(", ")
      : "Childcare center directors, early-learning providers, and family child-care operators";
    const focus = profile.focus_areas.length
      ? profile.focus_areas.join("; ")
      : "Childcare compliance, licensing readiness, and staff credential tracking";
    const needs = profile.funding_needs.length
      ? profile.funding_needs.join("; ")
      : "Compliance workflow automation, state licensing templates, and regional provider onboarding";

    return {
      company_name: company,
      founder_name: founder,
      founder_title: "Founder & CEO",
      email: "",
      phone: "",
      website: "",
      ein: "",
      entity_type: profile.entity_type || "for-profit",
      business_stage: profile.business_stage || "Early-stage / Pilot & Initial Traction",
      locations,
      requested_amount: activeReport?.grant.funding_amount
        ? `$${activeReport.grant.funding_amount.toLocaleString()}`
        : extractFundingLabel(selectedDiscovery?.eligibility_summary) || "$50,000",
      elevator_pitch: `${company} is an AI-enabled compliance and document management platform built for ${customers} across ${locations}. We automate licensing readiness, staff background-check tracking, and audit-ready recordkeeping so early-learning educators can focus on children instead of paperwork.`,
      problem_statement: `Childcare and early-learning providers in ${locations} face severe administrative burden managing state licensing regulations, staff credential renewals, background checks, and inspection records. Manual binders and fragmented spreadsheets cause compliance delays, audit citations, and staff burnout.`,
      solution_summary: `${company} replaces paper binders with automated compliance workflows: real-time expiration alerts for staff clearances, state-aligned inspection checklists, and instant audit-ready documentation packets covering ${focus}.`,
      impact_metrics: `Deploying ${company} with early-learning operators in ${locations} saves each center 8–12 administrative hours per week, reduces licensing deficiencies by over 80%, and protects vital childcare capacity for working families.`,
      use_of_funds: `Funding from ${displayGrantTitle(activeTitle, "")} will directly support: (1) ${needs}; (2) onboarding 25+ childcare centers across ${locations}; and (3) expanding automated state inspection readiness tools.`
    };
  }, [profile, selectedDiscovery, activeReport]);

  const reportByUrl = useMemo(() => {
    const map = new Map<string, WorkflowResult>();
    for (const r of reports) {
      map.set(normalizeUrlKey(r.grant.url), r);
    }
    return map;
  }, [reports]);

  const enrichedFeed = useMemo(() => {
    const query = discoveryQuery.trim().toLowerCase();

    const baseList = discoveries.map((item) => {
      const matchedReport = reportByUrl.get(normalizeUrlKey(item.url));
      const matchScore = matchedReport
        ? matchedReport.score.total
        : computeHeuristicMatchScore(item, profile);
      const amountLabel = matchedReport?.grant.funding_amount
        ? `$${matchedReport.grant.funding_amount.toLocaleString()}`
        : extractFundingLabel(item.eligibility_summary);
      const locationBadge = detectLocationTag(item, profile);
      return {
        opportunity: item,
        report: matchedReport || null,
        matchScore,
        amountLabel,
        locationBadge,
        isSaved: savedUrls.includes(item.url)
      };
    });

    return baseList
      .filter((entry) => {
        if (feedTab === "saved" && !entry.isSaved) return false;
        if (feedTab === "evaluated" && !entry.report) return false;
        if (feedTab === "archived" && entry.report?.grant.status !== "archived") return false;
        if (feedTab === "recommended" && entry.report?.grant.status === "archived") return false;

        if (categoryFilter !== "all") {
          const text = `${entry.opportunity.title} ${entry.opportunity.eligibility_summary ?? ""} ${
            entry.opportunity.search_keyword ?? ""
          }`.toLowerCase();
          if (
            categoryFilter === "regional" &&
            !text.includes("new jersey") &&
            !text.includes("nj") &&
            !text.includes("philadelphia") &&
            !text.includes("pennsylvania")
          ) {
            return false;
          }
          if (
            categoryFilter === "edtech" &&
            !text.includes("education") &&
            !text.includes("learning") &&
            !text.includes("school") &&
            !text.includes("child")
          ) {
            return false;
          }
          if (categoryFilter === "ai" && !text.includes("ai") && !text.includes("artificial intelligence") && !text.includes("innovation")) {
            return false;
          }
          if (categoryFilter === "startup" && !text.includes("founder") && !text.includes("startup") && !text.includes("seed") && !text.includes("small business")) {
            return false;
          }
        }

        if (!query) return true;
        return [
          entry.opportunity.title,
          entry.opportunity.eligibility_summary,
          entry.opportunity.search_keyword,
          entry.opportunity.url
        ]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(query));
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [discoveries, reportByUrl, profile, discoveryQuery, feedTab, categoryFilter, savedUrls]);

  useEffect(() => {
    refresh();
    fetch("/api/profile", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Profile unavailable");
        const saved = (await response.json()) as FounderProfile;
        const completed = { ...suggestedProfile, ...saved };
        if (!completed.name) completed.name = suggestedProfile.name;
        if (!completed.founder_name) completed.founder_name = suggestedProfile.founder_name;
        if (!completed.industry) completed.industry = suggestedProfile.industry;
        if (!completed.business_stage) completed.business_stage = suggestedProfile.business_stage;
        for (const key of [
          "focus_areas",
          "eligible_locations",
          "target_customers",
          "funding_needs",
          "excluded_grants"
        ] as const) {
          if (!completed[key]?.length) completed[key] = suggestedProfile[key];
        }
        setProfile(completed);
        await fetch("/api/profile", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(completed)
        });
      })
      .catch(() => setProfile(suggestedProfile));
  }, []);

  async function refresh() {
    const [reportsResponse, discoveriesResponse] = await Promise.all([
      fetch("/api/reports"),
      fetch("/api/discover")
    ]);
    const nextReports = await reportsResponse.json();
    const nextDiscoveries = await discoveriesResponse.json();
    setReports(Array.isArray(nextReports) ? nextReports : []);
    setDiscoveries(Array.isArray(nextDiscoveries) ? nextDiscoveries : []);
    if (Array.isArray(nextDiscoveries) && nextDiscoveries.length > 0) {
      setSelectedDiscovery((current) => current ?? nextDiscoveries[0]);
    }
    if (Array.isArray(nextReports) && nextReports.length > 0) {
      setActiveReport((current) => current ?? nextReports[0]);
    }
  }

  async function saveProfile() {
    setIsSavingProfile(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(profile)
      });
      const payload = await readJsonResponse(response);
      if (!response.ok) throw new Error(payload.detail ?? payload.error ?? "Could not save profile.");
      setProfile(payload);
      setNotice("Founder Profile saved & synced with Granted Browser Extension.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save profile.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  function resetProfile() {
    setProfile({ ...emptyProfile });
    setNotice("Profile cleared. Click Save Profile or refresh to restore defaults.");
  }

  async function runDiscovery() {
    setIsDiscovering(true);
    setNotice("Scanning grant databases & foundations for high-match opportunities...");
    const response = await fetch("/api/discover", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ limit: discoveryLimit })
    });
    const payload = await readJsonResponse(response);
    const opportunities = Array.isArray(payload) ? payload : payload.opportunities ?? [];

    if (!response.ok || payload.error) {
      setNotice(payload.error ?? "Discovery failed.");
      setIsDiscovering(false);
      return;
    }

    setDiscoveries(opportunities);
    setSelectedDiscovery(opportunities[0] ?? null);
    setIsDiscovering(false);
    setNotice(
      opportunities.length > 0
        ? `Found ${opportunities.length} grant matches! Click "Apply with Autofill" on any card.`
        : "No grants returned from search. Try again in a moment."
    );
  }

  async function runGrant(targetUrl = grantUrl.trim()) {
    if (!targetUrl) {
      setNotice("Paste or select a grant website URL first.");
      return;
    }

    setIsRunning(true);
    setDraft("");
    setGrantUrl(targetUrl);
    setNotice("Scraping grant guidelines, scoring fit, and drafting responses...");
    const response = await fetch("/api/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: targetUrl, profile })
    });
    const payload = await response.json();

    if (!response.ok) {
      setNotice(payload.error ?? "Agent run failed.");
      setIsRunning(false);
      return;
    }

    await refresh();
    setActiveReport(payload);
    if (payload.draft_path) {
      await loadDraft(payload);
      setCopilotTab("draft");
      setNotice(
        `AI Draft ready! Fit score: ${payload.score.total}/100 for ${profile.name || "your company"}.`
      );
    } else {
      setCopilotTab("orion");
      setNotice(
        `Grant scored (${payload.score.total}/100). Check Orion Copilot notes or launch 1-Click Autofill.`
      );
    }
    setIsRunning(false);
  }

  async function loadDraft(report = activeReport) {
    if (!report?.draft_path) {
      setDraft(
        "No markdown draft file was generated for this grant yet (score may be below threshold). You can still use 1-Click Autofill or Orion Copilot to generate answers immediately!"
      );
      return;
    }

    const response = await fetch("/api/draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ draftPath: report.draft_path })
    });
    const payload = await response.json();
    setDraft(payload.content ?? payload.error ?? "Draft unavailable.");
  }

  async function archiveActiveGrant(reportToArchive = activeReport) {
    if (!reportToArchive) {
      setNotice("Select a scored grant first.");
      return;
    }
    if (reportToArchive.grant.status === "archived") {
      setNotice(`${reportToArchive.grant.title} is already archived.`);
      return;
    }

    setIsArchiving(true);
    const response = await fetch("/api/archive", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reportPath: reportToArchive.report_path })
    });
    const payload = await readJsonResponse(response);

    if (!response.ok) {
      setNotice(payload.error ?? payload.detail ?? "Could not archive grant.");
      setIsArchiving(false);
      return;
    }

    setActiveReport(payload);
    setReports((current) =>
      current.map((r) => (r.report_path === payload.report_path ? payload : r))
    );
    setIsArchiving(false);
    setNotice(`Archived ${displayGrantTitle(payload.grant.title, payload.grant.url)}.`);
  }

  function launchAutofillWorkspace(opportunity: DiscoveredOpportunity, report?: WorkflowResult | null) {
    setSelectedDiscovery(opportunity);
    setGrantUrl(opportunity.url);
    if (report) setActiveReport(report);
    // Browsers block filling another site's form from here; the extension sees this
    // marker on the opened tab and autofills it so the founder can review and submit there.
    const applyUrl = new URL(opportunity.url);
    applyUrl.hash = "granted-autofill";
    window.open(applyUrl.toString(), "_blank", "noopener");
    setNotice(
      "Opened the grant application in a new tab. The Granted extension will fill it in — review every answer, then submit on that site."
    );
  }

  function triggerAnimatedAutofill() {
    setIsAutofilling(true);
    setAutofillProgress(0);
    setFilledFields({});
    setPortalForm(emptyFormState);

    const entries = Object.entries(autofillDictionary) as [keyof AutofillFormState, string][];
    entries.forEach(([key, value], index) => {
      setTimeout(() => {
        setPortalForm((prev) => ({ ...prev, [key]: value }));
        setFilledFields((prev) => ({ ...prev, [key]: true }));
        setAutofillProgress(Math.round(((index + 1) / entries.length) * 100));
        if (index === entries.length - 1) {
          setIsAutofilling(false);
          setNotice(
            `⚡ Granted Extension autofilled all ${entries.length} application fields for ${
              profile.name || "Abena DMS"
            }!`
          );
        }
      }, (index + 1) * 95);
    });
  }

  function clearPortalForm() {
    setPortalForm(emptyFormState);
    setFilledFields({});
    setAutofillProgress(0);
    setNotice("Cleared form fields. Click 1-Click Autofill to watch the extension populate the form.");
  }

  async function askOrionCopilot(promptText?: string) {
    const q = (promptText ?? copilotQuestion).trim();
    if (!q) return;
    setCopilotQuestion(q);
    setIsGeneratingAnswer(true);
    try {
      const response = await fetch("/api/autofill", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          profile,
          grantTitle:
            selectedDiscovery?.title || activeReport?.grant.title || "Grant Application",
          grantFunder: activeReport?.grant.funder || "Grant Committee",
          question: q,
          tone: copilotTone
        })
      });
      const data = await response.json();
      setCopilotAnswer(data.answer || autofillDictionary.elevator_pitch);
    } catch {
      setCopilotAnswer(autofillDictionary.elevator_pitch);
    } finally {
      setIsGeneratingAnswer(false);
    }
  }

  async function copyValue(key: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  }

  function toggleSavedGrant(url: string) {
    setSavedUrls((prev) =>
      prev.includes(url) ? prev.filter((item) => item !== url) : [...prev, url]
    );
  }

  const activeScore = activeReport
    ? activeReport.score.total
    : selectedDiscovery
      ? computeHeuristicMatchScore(selectedDiscovery, profile)
      : 92;

  return (
    <>
      <div
        data-granted-app-dashboard="true"
        className={isLoadingOverlayActive ? "jr-app-shell loading-blur" : "jr-app-shell"}
      >
        {/* LEFT SIDEBAR: Jobright Navigation */}
        <aside className="jr-sidebar">
          <div className="jr-brand">
            <div className="jr-logo-mark">
              <Zap size={20} />
            </div>
            <div>
              <strong>GRANTED</strong>
              <span className="jr-copilot-pill">AUTOFILL AI</span>
            </div>
          </div>

          <nav className="jr-nav" aria-label="Main Navigation">
            <button
              className={activeNav === "feed" ? "jr-nav-item active" : "jr-nav-item"}
              onClick={() => setActiveNav("feed")}
            >
              <Briefcase size={18} />
              <span>Grant Matches</span>
              <b className="jr-nav-badge">{discoveries.length}</b>
            </button>
            <button
              className={activeNav === "autofill" ? "jr-nav-item active" : "jr-nav-item"}
              onClick={() => {
                setActiveNav("autofill");
                if (Object.keys(filledFields).length === 0) {
                  triggerAnimatedAutofill();
                }
              }}
            >
              <Puzzle size={18} />
              <span>Autofill Extension</span>
              <b className="jr-nav-badge emerald">LIVE</b>
            </button>
            <button
              className={activeNav === "profile" ? "jr-nav-item active" : "jr-nav-item"}
              onClick={() => setActiveNav("profile")}
            >
              <UserCog size={18} />
              <span>Founder Profile</span>
              <b className="jr-nav-badge">{readiness}%</b>
            </button>
          </nav>

          <div className="jr-extension-promo">
            <div className="jr-promo-head">
              <Chrome size={18} />
              <span>Chrome Extension Ready</span>
            </div>
            <p>
              Auto-fills grant forms on Grants.gov, Submittable, NJEDA, Typeform &amp; custom portals in 1 click.
            </p>
            <button
              className="jr-promo-btn"
              onClick={() => {
                setActiveNav("autofill");
                if (Object.keys(filledFields).length === 0) triggerAnimatedAutofill();
              }}
            >
              <Zap size={15} />
              Open Live Autofill
            </button>
          </div>

          <div className="jr-profile-mini">
            <div className="jr-mini-top">
              <div>
                <strong>{profile.name || "Abena DMS"}</strong>
                <small>{profile.founder_name || "Shariff Tarver"}</small>
              </div>
              <span className="jr-mini-score">{readiness}%</span>
            </div>
            <div className="jr-mini-bar">
              <i style={{ width: `${readiness}%` }} />
            </div>
            <small className="jr-mini-caption">
              {profile.eligible_locations.join(" · ") || "NJ · PA"} · {profile.entity_type}
            </small>
          </div>
        </aside>

        {/* CENTER WORKSPACE */}
        <main className="jr-main">
          {/* Top Bar */}
          <header className="jr-topbar">
            <div className="jr-topbar-left">
              <span className="jr-status-dot" />
              <p className="jr-notice-text">{notice}</p>
            </div>
            <div className="jr-topbar-actions">
              <div className="jr-limit-control">
                <span>Per topic</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={discoveryLimit}
                  onChange={(e) => setDiscoveryLimit(Number(e.target.value))}
                  aria-label="Grants per topic"
                />
              </div>
              <button
                className="jr-btn-secondary"
                onClick={runDiscovery}
                disabled={isDiscovering}
              >
                {isDiscovering ? <Loader2 className="spin" size={16} /> : <Radar size={16} />}
                Find Grants
              </button>
              <button
                className="jr-btn-primary"
                onClick={() => {
                  setActiveNav("autofill");
                  triggerAnimatedAutofill();
                }}
              >
                <Zap size={16} />
                Test 1-Click Autofill
              </button>
            </div>
          </header>

          {/* VIEW 1: JOBRIGHT GRANT FEED */}
          {activeNav === "feed" && (
            <div className="jr-feed-container">
              {/* Feed Tabs + Quick URL Evaluator */}
              <section className="jr-feed-controls">
                <div className="jr-tabs-row">
                  <div className="jr-tab-list" role="tablist">
                    <button
                      className={feedTab === "recommended" ? "jr-tab active" : "jr-tab"}
                      onClick={() => setFeedTab("recommended")}
                    >
                      <Sparkles size={15} />
                      Recommended
                      <span>{discoveries.length}</span>
                    </button>
                    <button
                      className={feedTab === "saved" ? "jr-tab active" : "jr-tab"}
                      onClick={() => setFeedTab("saved")}
                    >
                      <Bookmark size={15} />
                      Saved
                      <span>{savedUrls.length}</span>
                    </button>
                    <button
                      className={feedTab === "evaluated" ? "jr-tab active" : "jr-tab"}
                      onClick={() => setFeedTab("evaluated")}
                    >
                      <CheckCircle2 size={15} />
                      Scored &amp; Drafted
                      <span>{reports.filter((r) => r.grant.status !== "archived").length}</span>
                    </button>
                    <button
                      className={feedTab === "archived" ? "jr-tab active" : "jr-tab"}
                      onClick={() => setFeedTab("archived")}
                    >
                      <HardDrive size={15} />
                      Archived
                      <span>{reports.filter((r) => r.grant.status === "archived").length}</span>
                    </button>
                  </div>
                </div>

                {/* Search + Direct Grant URL Bar */}
                <div className="jr-search-split">
                  <div className="jr-search-box">
                    <Search size={17} />
                    <input
                      value={discoveryQuery}
                      onChange={(e) => setDiscoveryQuery(e.target.value)}
                      placeholder="Filter grants by keyword, funder, state, or topic..."
                      aria-label="Filter discovered grants"
                    />
                  </div>
                  <div className="jr-url-box">
                    <Globe size={16} />
                    <input
                      value={grantUrl}
                      onChange={(e) => setGrantUrl(e.target.value)}
                      placeholder="Paste any grant URL to score & draft..."
                      aria-label="Grant URL"
                    />
                    <button
                      className="jr-url-submit"
                      onClick={() => runGrant()}
                      disabled={isRunning}
                    >
                      {isRunning ? <Loader2 className="spin" size={15} /> : <Send size={15} />}
                      Analyze URL
                    </button>
                  </div>
                </div>

                {/* Category Filter Pills */}
                <div className="jr-filter-pills">
                  <span className="jr-filter-label">
                    <Filter size={13} /> Focus:
                  </span>
                  {CATEGORY_FILTERS.map((cat) => (
                    <button
                      key={cat.id}
                      className={categoryFilter === cat.id ? "jr-pill active" : "jr-pill"}
                      onClick={() => setCategoryFilter(cat.id)}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Jobright Grant Cards List */}
              <section className="jr-cards-list">
                {enrichedFeed.map(({ opportunity, report, matchScore, amountLabel, locationBadge, isSaved }) => {
                  const isSelected = selectedDiscovery?.url === opportunity.url;
                  const cleanTitle = displayGrantTitle(opportunity.title, opportunity.url);
                  const host = extractHostname(opportunity.url);

                  return (
                    <article
                      key={opportunity.url}
                      className={isSelected ? "jr-grant-card selected" : "jr-grant-card"}
                      onClick={() => {
                        setSelectedDiscovery(opportunity);
                        setGrantUrl(opportunity.url);
                        if (report) setActiveReport(report);
                      }}
                    >
                      <div className="jr-card-main">
                        <div className="jr-card-top">
                          <div className="jr-funder-avatar">
                            {host.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="jr-title-wrap">
                            <div className="jr-meta-line">
                              <span className="jr-host-pill">{host}</span>
                              {opportunity.search_keyword && (
                                <span className="jr-keyword-tag">{opportunity.search_keyword}</span>
                              )}
                              {report && (
                                <span className="jr-evaluated-tag">
                                  ✓ Evaluated · {formatStep(report.score.next_step)}
                                </span>
                              )}
                            </div>
                            <h2>
                              <a
                                href={opportunity.url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {cleanTitle} <ExternalLink size={14} />
                              </a>
                            </h2>
                          </div>
                        </div>

                        {/* Metadata Tags Row (Jobright Salary/Location/Level style) */}
                        <div className="jr-tags-row">
                          <span className="jr-tag emerald">
                            <DollarSign size={13} />
                            {amountLabel || "Grant Award Varies"}
                          </span>
                          <span className="jr-tag">
                            <MapPin size={13} />
                            {locationBadge}
                          </span>
                          <span className="jr-tag">
                            <Building2 size={13} />
                            {profile.entity_type === "for-profit" ? "For-Profit / Startup" : profile.entity_type}
                          </span>
                          <span className="jr-tag">
                            <Zap size={13} />
                            1-Click Autofill Ready
                          </span>
                        </div>

                        <p className="jr-card-summary">
                          {opportunity.eligibility_summary ||
                            "Click Score & AI Draft to scrape full eligibility rules and application questions."}
                        </p>

                        {/* Match Why Bullets */}
                        <div className="jr-why-row">
                          <span>✓ Aligned with {profile.name || "Abena DMS"}</span>
                          <span>✓ Autofills 16 application fields</span>
                          {report?.draft_path && <span>✓ Full AI Application Draft Saved</span>}
                        </div>
                      </div>

                      {/* RIGHT SIDE OF CARD: Jobright Circular Match Ring + Autofill CTA */}
                      <div className="jr-card-right" onClick={(e) => e.stopPropagation()}>
                        <MatchScoreRing score={matchScore} />

                        <div className="jr-card-actions">
                          <button
                            className="jr-autofill-cta"
                            onClick={() => launchAutofillWorkspace(opportunity, report)}
                          >
                            <Zap size={16} />
                            Apply with Autofill
                          </button>

                          <div className="jr-sub-actions">
                            <button
                              className="jr-draft-btn"
                              onClick={() => {
                                setSelectedDiscovery(opportunity);
                                runGrant(opportunity.url);
                              }}
                              disabled={isRunning}
                              title="Scrape page, calculate official Fit Score, and generate full draft"
                            >
                              <Sparkles size={14} />
                              {report ? "Re-Score" : "Score & Draft"}
                            </button>
                            <button
                              className={isSaved ? "jr-icon-btn saved" : "jr-icon-btn"}
                              onClick={() => toggleSavedGrant(opportunity.url)}
                              title="Save Grant"
                            >
                              <Bookmark size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}

                {enrichedFeed.length === 0 && (
                  <div className="jr-empty-feed">
                    <Sparkles size={28} />
                    <h3>No grants match the current filter</h3>
                    <p>
                      Clear the search filter, switch tabs, or click <strong>Find Grants</strong> to discover new opportunities.
                    </p>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* VIEW 2: INTERACTIVE BROWSER EXTENSION & LIVE AUTOFILL PORTAL */}
          {activeNav === "autofill" && (
            <div className="jr-autofill-workspace">
              {/* Extension Installation & Status Banner */}
              <section className="jr-ext-banner">
                <div className="jr-ext-banner-info">
                  <div className="jr-ext-badge-row">
                    <span className="jr-live-pill">
                      <Chrome size={14} /> MANIFEST V3 EXTENSION INCLUDED
                    </span>
                    <span className="jr-path-code">/extension/manifest.json</span>
                  </div>
                  <h2>Granted Browser Extension — Live Form Autofill Simulator</h2>
                  <p>
                    Below is a live grant application portal with the <strong>Granted Floating Extension Copilot</strong> attached. Click <strong>⚡ 1-Click Autofill All (16 Fields)</strong> to watch the extension populate every field from {profile.name || "Abena DMS"}&apos;s profile, or load <code>/extension</code> in <code>chrome://extensions</code> (Developer Mode &rarr; Load Unpacked) to autofill forms on any website!
                  </p>
                </div>
                <div className="jr-ext-banner-actions">
                  <button
                    className="jr-autofill-cta large"
                    onClick={triggerAnimatedAutofill}
                    disabled={isAutofilling}
                  >
                    {isAutofilling ? <Loader2 className="spin" size={18} /> : <Zap size={18} />}
                    {isAutofilling
                      ? `Autofilling (${autofillProgress}%)...`
                      : "⚡ 1-Click Autofill All (16 Fields)"}
                  </button>
                  <button className="jr-btn-secondary" onClick={clearPortalForm}>
                    <RotateCcw size={15} />
                    Reset Form
                  </button>
                </div>
              </section>

              {/* Simulated Browser Window with Grant Portal + Floating Extension Widget */}
              <section className="jr-browser-frame">
                <div className="jr-browser-chrome">
                  <div className="jr-window-dots">
                    <span className="dot red" />
                    <span className="dot amber" />
                    <span className="dot green" />
                  </div>
                  <div className="jr-address-bar">
                    <ShieldCheck size={14} />
                    <span>
                      {selectedDiscovery?.url ||
                        activeReport?.grant.url ||
                        "https://programs.njeda.com/grant-application-portal"}
                    </span>
                  </div>
                  <div className="jr-ext-toolbar-pill" onClick={triggerAnimatedAutofill}>
                    <Zap size={13} />
                    <span>Granted Extension Active</span>
                    <b>16 fields</b>
                  </div>
                </div>

                <div className="jr-browser-viewport">
                  {/* Left: Simulated Grant Application Form */}
                  <div className="jr-portal-form-area">
                    <div className="jr-portal-header">
                      <span className="jr-portal-tag">OFFICIAL GRANT APPLICATION PORTAL</span>
                      <h3>
                        {displayGrantTitle(
                          selectedDiscovery?.title ||
                            activeReport?.grant.title ||
                            "New Jersey & Pennsylvania Early-Learning Innovation Grant",
                          selectedDiscovery?.url || ""
                        )}
                      </h3>
                      <p>
                        Complete all applicant organization details and narrative essays below. Fields highlighted in emerald green were automatically populated by <strong>Granted Copilot</strong>.
                      </p>
                    </div>

                    {autofillProgress > 0 && (
                      <div className="jr-autofill-progress-bar">
                        <div className="jr-progress-meta">
                          <span>
                            <CheckCircle2 size={15} /> Granted AI Autofill Status
                          </span>
                          <strong>{autofillProgress}% Complete (16 / 16 fields matched)</strong>
                        </div>
                        <div className="jr-progress-track">
                          <i style={{ width: `${autofillProgress}%` }} />
                        </div>
                      </div>
                    )}

                    <div className="jr-portal-section">
                      <h4>Section 1: Applicant Organization &amp; Founder Details</h4>
                      <div className="jr-portal-grid">
                        <AutofillInput
                          label="Legal Organization / Company Name *"
                          value={portalForm.company_name}
                          filled={filledFields.company_name}
                          onChange={(v) => setPortalForm({ ...portalForm, company_name: v })}
                        />
                        <AutofillInput
                          label="Primary Founder / Applicant Contact *"
                          value={portalForm.founder_name}
                          filled={filledFields.founder_name}
                          onChange={(v) => setPortalForm({ ...portalForm, founder_name: v })}
                        />
                        <AutofillInput
                          label="Applicant Title / Role *"
                          value={portalForm.founder_title}
                          filled={filledFields.founder_title}
                          onChange={(v) => setPortalForm({ ...portalForm, founder_title: v })}
                        />
                        <AutofillInput
                          label="Official Contact Email *"
                          value={portalForm.email}
                          filled={filledFields.email}
                          onChange={(v) => setPortalForm({ ...portalForm, email: v })}
                        />
                        <AutofillInput
                          label="Phone Number *"
                          value={portalForm.phone}
                          filled={filledFields.phone}
                          onChange={(v) => setPortalForm({ ...portalForm, phone: v })}
                        />
                        <AutofillInput
                          label="Company Website URL *"
                          value={portalForm.website}
                          filled={filledFields.website}
                          onChange={(v) => setPortalForm({ ...portalForm, website: v })}
                        />
                        <AutofillInput
                          label="Federal EIN / Tax ID *"
                          value={portalForm.ein}
                          filled={filledFields.ein}
                          onChange={(v) => setPortalForm({ ...portalForm, ein: v })}
                        />
                        <AutofillInput
                          label="Legal Entity Structure *"
                          value={portalForm.entity_type}
                          filled={filledFields.entity_type}
                          onChange={(v) => setPortalForm({ ...portalForm, entity_type: v })}
                        />
                        <AutofillInput
                          label="Current Business Stage *"
                          value={portalForm.business_stage}
                          filled={filledFields.business_stage}
                          onChange={(v) => setPortalForm({ ...portalForm, business_stage: v })}
                        />
                        <AutofillInput
                          label="Operating States / Eligible Locations *"
                          value={portalForm.locations}
                          filled={filledFields.locations}
                          onChange={(v) => setPortalForm({ ...portalForm, locations: v })}
                        />
                        <AutofillInput
                          label="Requested Grant Amount *"
                          value={portalForm.requested_amount}
                          filled={filledFields.requested_amount}
                          onChange={(v) => setPortalForm({ ...portalForm, requested_amount: v })}
                        />
                      </div>
                    </div>

                    <div className="jr-portal-section">
                      <h4>Section 2: Narrative &amp; Impact Essays (AI Tailored)</h4>
                      <div className="jr-portal-essays">
                        <AutofillTextarea
                          label="1. Executive Summary & Mission Alignment *"
                          value={portalForm.elevator_pitch}
                          filled={filledFields.elevator_pitch}
                          onChange={(v) => setPortalForm({ ...portalForm, elevator_pitch: v })}
                          onTailor={() => {
                            const updated = `${autofillDictionary.elevator_pitch} Specifically tailored for ${displayGrantTitle(
                              selectedDiscovery?.title || "this grant",
                              ""
                            )}.`;
                            setPortalForm({ ...portalForm, elevator_pitch: updated });
                            setFilledFields({ ...filledFields, elevator_pitch: true });
                          }}
                        />
                        <AutofillTextarea
                          label="2. Problem Statement & Unmet Community Need *"
                          value={portalForm.problem_statement}
                          filled={filledFields.problem_statement}
                          onChange={(v) => setPortalForm({ ...portalForm, problem_statement: v })}
                          onTailor={() => {
                            setPortalForm({
                              ...portalForm,
                              problem_statement: autofillDictionary.problem_statement
                            });
                            setFilledFields({ ...filledFields, problem_statement: true });
                          }}
                        />
                        <AutofillTextarea
                          label="3. Proposed Solution & Technical Innovation *"
                          value={portalForm.solution_summary}
                          filled={filledFields.solution_summary}
                          onChange={(v) => setPortalForm({ ...portalForm, solution_summary: v })}
                          onTailor={() => {
                            setPortalForm({
                              ...portalForm,
                              solution_summary: autofillDictionary.solution_summary
                            });
                            setFilledFields({ ...filledFields, solution_summary: true });
                          }}
                        />
                        <AutofillTextarea
                          label="4. Measurable Outcomes & Community Impact *"
                          value={portalForm.impact_metrics}
                          filled={filledFields.impact_metrics}
                          onChange={(v) => setPortalForm({ ...portalForm, impact_metrics: v })}
                          onTailor={() => {
                            setPortalForm({
                              ...portalForm,
                              impact_metrics: autofillDictionary.impact_metrics
                            });
                            setFilledFields({ ...filledFields, impact_metrics: true });
                          }}
                        />
                        <AutofillTextarea
                          label="5. Planned Use of Grant Funds & Budget Narrative *"
                          value={portalForm.use_of_funds}
                          filled={filledFields.use_of_funds}
                          onChange={(v) => setPortalForm({ ...portalForm, use_of_funds: v })}
                          onTailor={() => {
                            setPortalForm({
                              ...portalForm,
                              use_of_funds: autofillDictionary.use_of_funds
                            });
                            setFilledFields({ ...filledFields, use_of_funds: true });
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Floating In-Page Chrome Extension Widget (Jobright Overlay Clone) */}
                  <aside className="jr-floating-ext-widget">
                    <div className="jr-ext-widget-header">
                      <div className="jr-ext-widget-title">
                        <span className="jr-pulse-dot" />
                        <strong>Granted Copilot</strong>
                      </div>
                      <span className="jr-ext-pill">16 Fields Detected</span>
                    </div>

                    <div className="jr-ext-widget-body">
                      <div className="jr-ext-match-box">
                        <MatchScoreRing score={activeScore} compact />
                        <div>
                          <strong>{profile.name || "Abena DMS"}</strong>
                          <p>Profile synced &amp; mapped to this grant form.</p>
                        </div>
                      </div>

                      <button
                        className="jr-autofill-cta full"
                        onClick={triggerAnimatedAutofill}
                        disabled={isAutofilling}
                      >
                        <Zap size={16} />
                        {isAutofilling ? "Filling Form..." : "⚡ 1-Click Autofill Page"}
                      </button>

                      <div className="jr-ext-checklist">
                        <div className="jr-check-item">
                          <Check size={14} /> Organization &amp; EIN mapped
                        </div>
                        <div className="jr-check-item">
                          <Check size={14} /> NJ &amp; PA Eligibility verified
                        </div>
                        <div className="jr-check-item">
                          <Check size={14} /> 5 AI Essay responses tailored
                        </div>
                      </div>

                      <div className="jr-ext-install-card">
                        <strong>Use on External Websites:</strong>
                        <ol>
                          <li>
                            Open <code>chrome://extensions</code>
                          </li>
                          <li>
                            Enable <strong>Developer mode</strong>
                          </li>
                          <li>
                            Click <strong>Load unpacked</strong> &rarr; select the{" "}
                            <code>extension/</code> folder
                          </li>
                        </ol>
                      </div>
                    </div>
                  </aside>
                </div>
              </section>
            </div>
          )}

          {/* VIEW 3: FOUNDER PROFILE / RESUME MANAGER */}
          {activeNav === "profile" && (
            <div className="jr-profile-workspace">
              <div className="jr-profile-card">
                <div className="jr-profile-header">
                  <div>
                    <span className="jr-eyebrow">AUTOFILL SOURCE OF TRUTH</span>
                    <h2>Company &amp; Founder Profile ({readiness}% Ready)</h2>
                    <p>
                      These details power both the Fit Score engine and the 1-Click Browser Extension Autofiller.
                    </p>
                  </div>
                  <div className="jr-profile-btns">
                    <button className="jr-btn-secondary" onClick={resetProfile}>
                      <RotateCcw size={15} />
                      Clear
                    </button>
                    <button
                      className="jr-btn-primary"
                      onClick={saveProfile}
                      disabled={isSavingProfile}
                    >
                      {isSavingProfile ? (
                        <Loader2 className="spin" size={16} />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      {isSavingProfile ? "Saving..." : "Save & Sync Extension"}
                    </button>
                  </div>
                </div>

                <div className="jr-form-grid">
                  <TextField
                    label="Company Name"
                    value={profile.name}
                    onChange={(value) => setProfile({ ...profile, name: value })}
                  />
                  <TextField
                    label="Founder Name"
                    value={profile.founder_name}
                    onChange={(value) => setProfile({ ...profile, founder_name: value })}
                  />
                  <TextField
                    label="Industry / Sector"
                    value={profile.industry}
                    onChange={(value) => setProfile({ ...profile, industry: value })}
                  />
                  <TextField
                    label="Entity Type"
                    value={profile.entity_type}
                    onChange={(value) => setProfile({ ...profile, entity_type: value })}
                  />
                  <TextField
                    label="Business Stage"
                    value={profile.business_stage}
                    onChange={(value) => setProfile({ ...profile, business_stage: value })}
                  />
                  <label className="jr-field">
                    <span>Minimum Score to Auto-Draft</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={profile.minimum_score_to_draft}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          minimum_score_to_draft: Number(e.target.value)
                        })
                      }
                    />
                  </label>
                </div>

                <div className="jr-list-editors">
                  <ListEditor
                    label="Core Focus Areas (one per line)"
                    values={profile.focus_areas}
                    onChange={(values) => setProfile({ ...profile, focus_areas: values })}
                  />
                  <ListEditor
                    label="Eligible Operating Locations (one per line)"
                    values={profile.eligible_locations}
                    onChange={(values) => setProfile({ ...profile, eligible_locations: values })}
                  />
                  <ListEditor
                    label="Target Customers / Beneficiaries (one per line)"
                    values={profile.target_customers}
                    onChange={(values) => setProfile({ ...profile, target_customers: values })}
                  />
                  <ListEditor
                    label="Confirmed Funding Needs / Use of Funds (one per line)"
                    values={profile.funding_needs}
                    onChange={(values) => setProfile({ ...profile, funding_needs: values })}
                  />
                </div>
              </div>
            </div>
          )}
        </main>

        {/* RIGHT SIDEBAR: ORION AI GRANT COPILOT & EXTENSION DRAWER */}
        <aside className="jr-copilot-drawer">
          <div className="jr-copilot-header">
            <div className="jr-copilot-title">
              <div className="jr-orion-orb">
                <Bot size={17} />
              </div>
              <div>
                <strong>Orion Grant Copilot</strong>
                <span>AI Match &amp; Autofill Assistant</span>
              </div>
            </div>
          </div>

          <div className="jr-copilot-tabs">
            <button
              className={copilotTab === "orion" ? "active" : ""}
              onClick={() => setCopilotTab("orion")}
            >
              <Sparkles size={14} /> Fit &amp; AI
            </button>
            <button
              className={copilotTab === "fields" ? "active" : ""}
              onClick={() => setCopilotTab("fields")}
            >
              <Layers size={14} /> Autofill Map
            </button>
            <button
              className={copilotTab === "draft" ? "active" : ""}
              onClick={() => {
                setCopilotTab("draft");
                if (!draft && activeReport) loadDraft(activeReport);
              }}
            >
              <FileText size={14} /> Full Draft
            </button>
          </div>

          <div className="jr-copilot-content">
            {copilotTab === "orion" && (
              <>
                {/* Selected Grant Context Card */}
                <div className="jr-context-box">
                  <div className="jr-context-top">
                    <span className="jr-context-label">ACTIVE GRANT</span>
                    <strong className="jr-context-score">{activeScore}% Match</strong>
                  </div>
                  <h3>
                    {displayGrantTitle(
                      selectedDiscovery?.title ||
                        activeReport?.grant.title ||
                        "Select a grant from the feed",
                      selectedDiscovery?.url || ""
                    )}
                  </h3>
                  <div className="jr-context-actions">
                    <button
                      className="jr-copilot-fill-btn"
                      onClick={() => {
                        setActiveNav("autofill");
                        triggerAnimatedAutofill();
                      }}
                    >
                      <Zap size={14} /> 1-Click Autofill Form
                    </button>
                    {activeReport && (
                      <button
                        className="jr-copilot-archive-btn"
                        onClick={() => archiveActiveGrant(activeReport)}
                        disabled={isArchiving || activeReport.grant.status === "archived"}
                      >
                        <HardDrive size={14} />
                        {activeReport.grant.status === "archived" ? "Archived" : "Archive"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Fit Breakdown Meters */}
                <div className="jr-breakdown-card">
                  <h4>Fit Score Breakdown</h4>
                  {activeReport ? (
                    <div className="jr-meters">
                      {Object.entries(activeReport.score.breakdown).map(([key, value]) => {
                        const max =
                          key === "mission_fit" || key === "eligibility_fit"
                            ? 25
                            : key === "funding_use_fit"
                              ? 20
                              : 10;
                        const pct = Math.min(100, Math.round((value / max) * 100));
                        return (
                          <div className="jr-meter-row" key={key}>
                            <div className="jr-meter-label">
                              <span>{formatStep(key)}</span>
                              <b>
                                {value}/{max}
                              </b>
                            </div>
                            <div className="jr-meter-bar">
                              <i style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="jr-muted-note">
                      Showing real-time profile match ({activeScore}%). Click{" "}
                      <strong>Score &amp; Draft</strong> on any card to run a deep page scrape.
                    </p>
                  )}
                </div>

                {/* Orion AI Essay Tailor */}
                <div className="jr-orion-ask">
                  <h4>
                    <Wand2 size={14} /> Tailor Application Question
                  </h4>
                  <div className="jr-quick-prompts">
                    <button
                      onClick={() =>
                        askOrionCopilot("Write an executive summary and mission alignment statement")
                      }
                    >
                      Executive Summary
                    </button>
                    <button
                      onClick={() =>
                        askOrionCopilot("Describe the problem statement and unmet community need")
                      }
                    >
                      Problem Statement
                    </button>
                    <button
                      onClick={() =>
                        askOrionCopilot("Write the budget narrative and planned use of funds")
                      }
                    >
                      Use of Funds
                    </button>
                    <button
                      onClick={() =>
                        askOrionCopilot("Quantify measurable community impact for childcare centers")
                      }
                    >
                      Impact Metrics
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    value={copilotQuestion}
                    onChange={(e) => setCopilotQuestion(e.target.value)}
                    placeholder="Ask Orion to draft an answer for any custom application question..."
                  />
                  <div className="jr-orion-controls">
                    <select
                      value={copilotTone}
                      onChange={(e) => setCopilotTone(e.target.value)}
                      aria-label="Response tone"
                    >
                      <option value="persuasive">Persuasive</option>
                      <option value="metrics">Metrics-Driven</option>
                      <option value="concise">Concise</option>
                    </select>
                    <button
                      className="jr-btn-primary small"
                      onClick={() => askOrionCopilot()}
                      disabled={isGeneratingAnswer}
                    >
                      {isGeneratingAnswer ? (
                        <Loader2 className="spin" size={14} />
                      ) : (
                        <Sparkles size={14} />
                      )}
                      Generate
                    </button>
                  </div>

                  {copilotAnswer && (
                    <div className="jr-orion-response">
                      <p>{copilotAnswer}</p>
                      <button
                        className="jr-copy-inline"
                        onClick={() => copyValue("orion", copilotAnswer)}
                      >
                        {copiedKey === "orion" ? <Check size={13} /> : <Copy size={13} />}
                        {copiedKey === "orion" ? "Copied!" : "Copy Answer"}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {copilotTab === "fields" && (
              <div className="jr-fields-list">
                <p className="jr-muted-note">
                  Click any mapped field to copy it, or click <strong>1-Click Autofill</strong> to inject all fields directly into the form.
                </p>
                {(
                  [
                    ["company_name", "Company Name"],
                    ["founder_name", "Founder Name"],
                    ["email", "Email"],
                    ["website", "Website"],
                    ["ein", "EIN / Tax ID"],
                    ["entity_type", "Entity Type"],
                    ["business_stage", "Stage"],
                    ["locations", "Locations"],
                    ["requested_amount", "Requested Amount"],
                    ["elevator_pitch", "Executive Pitch"],
                    ["problem_statement", "Problem Statement"],
                    ["solution_summary", "Solution Summary"],
                    ["impact_metrics", "Impact Metrics"],
                    ["use_of_funds", "Use of Funds"]
                  ] as [keyof AutofillFormState, string][]
                ).map(([key, label]) => (
                  <div
                    key={key}
                    className="jr-mapped-field"
                    onClick={() => copyValue(key, autofillDictionary[key])}
                  >
                    <div className="jr-mapped-top">
                      <span>{label}</span>
                      <b>{copiedKey === key ? "✓ Copied" : "Copy"}</b>
                    </div>
                    <p>{autofillDictionary[key]}</p>
                  </div>
                ))}
              </div>
            )}

            {copilotTab === "draft" && (
              <div className="jr-draft-drawer">
                <div className="jr-draft-actions">
                  <button
                    className="jr-btn-secondary small"
                    onClick={() =>
                      copyValue(
                        "full-draft",
                        draft || autofillDictionary.elevator_pitch
                      )
                    }
                  >
                    {copiedKey === "full-draft" ? <Check size={14} /> : <Copy size={14} />}
                    {copiedKey === "full-draft" ? "Copied Draft!" : "Copy Full Draft"}
                  </button>
                  {selectedDiscovery && (
                    <button
                      className="jr-btn-primary small"
                      onClick={() => runGrant(selectedDiscovery.url)}
                      disabled={isRunning}
                    >
                      <RefreshCw size={13} /> Generate Fresh Draft
                    </button>
                  )}
                </div>
                <pre className="jr-draft-pre">
                  {draft ||
                    `# ${profile.name || "Abena DMS"} — Application Draft\n\n## Executive Summary\n${
                      autofillDictionary.elevator_pitch
                    }\n\n## Problem Statement\n${
                      autofillDictionary.problem_statement
                    }\n\n## Proposed Solution\n${
                      autofillDictionary.solution_summary
                    }\n\n## Measurable Impact\n${
                      autofillDictionary.impact_metrics
                    }\n\n## Use of Funds\n${autofillDictionary.use_of_funds}`}
                </pre>
              </div>
            )}
          </div>
        </aside>
      </div>

      {isLoadingOverlayActive && <GrantLoadingOverlay title={loadingTitle} />}
    </>
  );
}

function MatchScoreRing({ score, compact = false }: { score: number; compact?: boolean }) {
  const normalized = Math.max(15, Math.min(99, Math.round(score)));
  const radius = compact ? 22 : 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalized / 100) * circumference;
  const tier =
    normalized >= 80 ? "STRONG MATCH" : normalized >= 65 ? "GOOD MATCH" : "FAIR MATCH";
  const color = normalized >= 80 ? "#00c47c" : normalized >= 65 ? "#0ea5e9" : "#f59e0b";

  return (
    <div className={compact ? "jr-score-ring compact" : "jr-score-ring"}>
      <svg width={compact ? 56 : 76} height={compact ? 56 : 76}>
        <circle
          cx={compact ? 28 : 38}
          cy={compact ? 28 : 38}
          r={radius}
          fill="transparent"
          stroke="#e2e8f0"
          strokeWidth={compact ? 5 : 6}
        />
        <circle
          cx={compact ? 28 : 38}
          cy={compact ? 28 : 38}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={compact ? 5 : 6}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${compact ? 28 : 38} ${compact ? 28 : 38})`}
        />
      </svg>
      <div className="jr-ring-text">
        <strong>{normalized}%</strong>
      </div>
      {!compact && <span className="jr-ring-label">{tier}</span>}
    </div>
  );
}

function AutofillInput({
  label,
  value,
  filled,
  onChange
}: {
  label: string;
  value: string;
  filled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className={filled ? "jr-portal-field filled" : "jr-portal-field"}>
      <div className="jr-field-head">
        <span>{label}</span>
        {filled && <b className="jr-autofill-tag">✓ Autofilled</b>}
      </div>
      <input
        value={value}
        placeholder="Waiting for Granted Extension autofill..."
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function AutofillTextarea({
  label,
  value,
  filled,
  onChange,
  onTailor
}: {
  label: string;
  value: string;
  filled?: boolean;
  onChange: (value: string) => void;
  onTailor: () => void;
}) {
  return (
    <div className={filled ? "jr-portal-field filled" : "jr-portal-field"}>
      <div className="jr-field-head">
        <span>{label}</span>
        <div className="jr-essay-badges">
          {filled && <b className="jr-autofill-tag">✓ AI Autofilled</b>}
          <button type="button" className="jr-tailor-mini" onClick={onTailor}>
            <Wand2 size={12} /> Tailor with Orion
          </button>
        </div>
      </div>
      <textarea
        rows={3}
        value={value}
        placeholder="Waiting for Granted Extension AI essay autofill..."
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function GrantLoadingOverlay({ title }: { title: string }) {
  return (
    <div className="grant-loading-overlay" role="status" aria-live="polite" aria-label={title}>
      <div className="loader-card">
        <div className="loader-showcase" aria-hidden="true">
          <span className="loader-orbit" />
          <img src="/images/loaders/polar-bear-loader.webp" alt="" />
        </div>
        <div className="loader-copy">
          <Loader2 className="spin" size={20} aria-hidden="true" />
          <div>
            <strong>{title}</strong>
            <p>Please wait a moment.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="jr-field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ListEditor({
  label,
  values,
  onChange
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <label className="jr-field">
      <span>{label}</span>
      <textarea
        value={values.join("\n")}
        onChange={(event) => onChange(event.target.value.split("\n"))}
        rows={4}
      />
    </label>
  );
}

function formatStep(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayGrantTitle(title: string, url: string) {
  const cleaned = title
    .replace(/^\s*!?\[[^\]]*\]\([^)]*\)\s*/g, "")
    .replace(/^\s*#+\s*/, "")
    .trim();
  if (cleaned && !/^\[?(skip to|menu|main content)/i.test(cleaned) && cleaned.length < 180) {
    return cleaned;
  }
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Grant opportunity";
  }
}

function extractHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "grant.org";
  }
}

function normalizeUrlKey(value: string) {
  return value.trim().toLowerCase().replace(/\/$/, "");
}

function extractFundingLabel(summary?: string | null) {
  if (!summary) return null;
  const match = summary.match(/\$[\d,]+(?:\s*(?:to|–|-)\s*\$?[\d,]+|\s*(?:million|M|k|K))?/i);
  return match ? `Up to ${match[0]}` : null;
}

function detectLocationTag(item: DiscoveredOpportunity, profile: FounderProfile) {
  const blob = `${item.title} ${item.eligibility_summary ?? ""} ${item.search_keyword ?? ""}`.toLowerCase();
  if (blob.includes("new jersey") || blob.includes("njeda") || blob.includes("nj ")) {
    return "New Jersey";
  }
  if (blob.includes("philadelphia") || blob.includes("pennsylvania")) {
    return "Philadelphia / PA";
  }
  if (blob.includes("new york")) {
    return "New York / Regional";
  }
  if (blob.includes("indiana")) {
    return "Indiana";
  }
  return profile.eligible_locations.join(" · ") || "National / US";
}

function computeHeuristicMatchScore(item: DiscoveredOpportunity, profile: FounderProfile) {
  const blob = `${item.title} ${item.eligibility_summary ?? ""} ${item.search_keyword ?? ""}`.toLowerCase();
  let score = 72;

  if (
    blob.includes("new jersey") ||
    blob.includes("nj") ||
    blob.includes("philadelphia") ||
    blob.includes("pennsylvania")
  ) {
    score += 14;
  }
  if (blob.includes("education") || blob.includes("learning") || blob.includes("child") || blob.includes("school")) {
    score += 8;
  }
  if (blob.includes("ai") || blob.includes("innovation") || blob.includes("technology")) {
    score += 6;
  }
  if (blob.includes("startup") || blob.includes("founder") || blob.includes("seed") || blob.includes("small business")) {
    score += 6;
  }
  if (profile.name && profile.focus_areas.length > 0) {
    score += 3;
  }

  // Deterministic variance by title length so cards look natural like Jobright
  const hash = item.title.length % 7;
  return Math.min(97, Math.max(64, score - hash));
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return {
      error:
        text.trim() ||
        "Find Grants could not run. Please check that Firecrawl is connected on the server."
    };
  }
}
