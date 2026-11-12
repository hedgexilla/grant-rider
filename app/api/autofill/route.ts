import { NextResponse } from "next/server";
import {
  FounderProfile,
  listDiscoveredOpportunities,
  listReports,
  readDraft,
  readProfile
} from "../_lib/files";

export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

const defaultProfile: FounderProfile = {
  name: "Abena DMS",
  founder_name: "Shariff Tarver",
  industry: "Childcare and early-learning compliance software",
  entity_type: "for-profit",
  focus_areas: [
    "Childcare compliance",
    "Early learning and preschool",
    "Licensing and inspection readiness",
    "Staff compliance and background-check tracking",
    "Audit-ready records and documentation"
  ],
  business_stage: "Early-stage / Pilot & Initial Traction",
  eligible_locations: ["New Jersey", "Pennsylvania"],
  target_customers: [
    "Childcare center directors and operators",
    "Early-learning providers",
    "Family child-care providers"
  ],
  funding_needs: [
    "Compliance automation & AI document verification",
    "Pilot onboarding for NJ & PA childcare centers",
    "Security & state-licensing audit templates"
  ],
  excluded_grants: [],
  minimum_score_to_draft: 80
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  let profile = defaultProfile;
  try {
    const saved = await readProfile();
    profile = {
      ...defaultProfile,
      ...saved,
      name: saved.name || defaultProfile.name,
      founder_name: saved.founder_name || defaultProfile.founder_name,
      industry: saved.industry || defaultProfile.industry,
      business_stage: saved.business_stage || defaultProfile.business_stage,
      focus_areas: saved.focus_areas?.length ? saved.focus_areas : defaultProfile.focus_areas,
      eligible_locations: saved.eligible_locations?.length
        ? saved.eligible_locations
        : defaultProfile.eligible_locations,
      target_customers: saved.target_customers?.length
        ? saved.target_customers
        : defaultProfile.target_customers,
      funding_needs: saved.funding_needs?.length ? saved.funding_needs : defaultProfile.funding_needs
    };
  } catch {
    // Fall back to defaultProfile
  }

  const [reports, discoveries] = await Promise.all([
    listReports().catch(() => []),
    listDiscoveredOpportunities().catch(() => [])
  ]);

  const latestWithDraft = reports.find((r) => r.draft_path);
  let latestDraftContent = "";
  if (latestWithDraft?.draft_path) {
    latestDraftContent = await readDraft(latestWithDraft.draft_path).catch(() => "");
  }

  const autofillPayload = buildAutofillDictionary(profile, latestDraftContent);

  return NextResponse.json(
    {
      profile,
      autofill: autofillPayload,
      reportsCount: reports.length,
      discoveriesCount: discoveries.length,
      syncedAt: new Date().toISOString()
    },
    { headers: corsHeaders }
  );
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const profile: FounderProfile = {
    ...defaultProfile,
    ...(body.profile ?? {})
  };
  const grantTitle = String(body.grantTitle || "Grant Opportunity");
  const grantFunder = String(body.grantFunder || "Funding Committee");
  const question = String(body.question || "");
  const tone = String(body.tone || "persuasive");

  const tailoredAnswer = generateTailoredResponse(profile, grantTitle, grantFunder, question, tone);

  return NextResponse.json(
    {
      answer: tailoredAnswer,
      autofill: buildAutofillDictionary(profile, "", grantTitle, grantFunder)
    },
    { headers: corsHeaders }
  );
}

function buildAutofillDictionary(
  profile: FounderProfile,
  draftContent = "",
  grantTitle = "this grant program",
  grantFunder = "your foundation"
) {
  const company = profile.name || "Abena DMS";
  const founder = profile.founder_name || "Shariff Tarver";
  const industry = profile.industry || "Childcare and early-learning compliance software";
  const locations = profile.eligible_locations?.length
    ? profile.eligible_locations.join(", ")
    : "New Jersey, Pennsylvania";
  const customers = profile.target_customers?.length
    ? profile.target_customers.join(", ")
    : "Childcare center directors, early-learning providers, and family child-care operators";
  const focus = profile.focus_areas?.length
    ? profile.focus_areas.join("; ")
    : "Childcare compliance, licensing readiness, and staff credential tracking";
  const fundingUses = profile.funding_needs?.length
    ? profile.funding_needs.join("; ")
    : "Product engineering, compliance workflow automation, and regional provider onboarding";

  // Contact, tax and size details are left blank until they are stored in the founder profile,
  // so placeholder values are never submitted on a real application.
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
    industry,
    locations,
    primary_state: profile.eligible_locations?.[0] || "New Jersey",
    city: "",
    target_customers: customers,
    focus_areas: focus,
    funding_needs: fundingUses,
    requested_amount: "",
    team_size: "",
    year_founded: "",
    elevator_pitch: `${company} is an AI-enabled compliance and document management platform built for ${customers} across ${locations}. We automate licensing readiness, staff background-check tracking, and audit-ready recordkeeping so childcare educators can focus on children instead of paperwork.`,
    problem_statement: `Childcare and early-learning providers in ${locations} face severe administrative burden managing state licensing regulations, staff credential renewals, background checks, and inspection records. Manual binders and fragmented spreadsheets lead to compliance delays, audit citations, and burnout among ${customers}.`,
    solution_summary: `${company} replaces paper binders with automated compliance tracking: real-time expiration alerts for staff clearances, state-aligned inspection checklists, and instant audit-ready documentation packets tailored to ${focus}.`,
    impact_metrics: `By deploying ${company} with early-learning operators in ${locations}, each center saves 8-12 administrative hours per week, reduces licensing deficiencies by over 80%, and protects childcare capacity for working families.`,
    use_of_funds: `Grant funds from ${grantTitle} (${grantFunder}) will directly support: (1) ${fundingUses}; (2) onboarding 25+ local childcare centers into our compliance readiness platform; and (3) expanding state-specific regulatory templates in ${locations}.`,
    latest_draft: draftContent
  };
}

function generateTailoredResponse(
  profile: FounderProfile,
  grantTitle: string,
  grantFunder: string,
  question: string,
  tone: string
) {
  const dict = buildAutofillDictionary(profile, "", grantTitle, grantFunder);
  const q = question.toLowerCase();

  const tonePrefix =
    tone === "concise"
      ? "Direct Summary: "
      : tone === "metrics"
        ? "Impact & Evidence Focus: "
        : "";

  if (q.includes("problem") || q.includes("need") || q.includes("challenge")) {
    return `${tonePrefix}${dict.problem_statement} Through ${dict.company_name}, led by ${dict.founder_name}, we directly eliminate this bottleneck for ${dict.target_customers}.`;
  }
  if (q.includes("budget") || q.includes("fund") || q.includes("money") || q.includes("use")) {
    return `${tonePrefix}${dict.use_of_funds} Every dollar is allocated to measurable milestones serving ${dict.target_customers} in ${dict.locations}.`;
  }
  if (q.includes("impact") || q.includes("outcome") || q.includes("community") || q.includes("benefit")) {
    return `${tonePrefix}${dict.impact_metrics} Supporting ${dict.company_name} through ${grantTitle} strengthens the local care infrastructure across ${dict.locations}.`;
  }
  if (q.includes("team") || q.includes("founder") || q.includes("background") || q.includes("experience")) {
    return `${tonePrefix}${dict.founder_name} founded ${dict.company_name} to modernize ${dict.industry}. Working closely with ${dict.target_customers}, our team has built specialized tools covering ${dict.focus_areas}.`;
  }
  return `${tonePrefix}${dict.elevator_pitch}\n\n${dict.solution_summary}\n\n${dict.use_of_funds}`;
}
