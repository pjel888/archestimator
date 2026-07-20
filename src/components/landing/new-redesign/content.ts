export const EARLY_ACCESS_HREF = "/contact?intent=started#contact-form";

export const pageContract = {
  announcement: "Now onboarding design partners",
  category: "Construction estimating software",
  descriptor: "An estimate-to-proposal workspace built around reusable cost intelligence",
  benefit: "Less rework. Clearer proposals. Better cost decisions.",
  hero: {
    eyebrow: "Construction estimate-to-proposal workspace",
    title: "Make every estimate easier to build, clearer to present, and simpler to approve.",
    lead: "Archestimator helps AEC teams reduce rework, communicate project costs clearly, and move decisions forward without losing context through reviews and revisions.",
  },
  cta: { label: "Request early access", href: EARLY_ACCESS_HREF },
  nav: [
    { label: "Product", href: "#product" },
    { label: "Workflow", href: "#workflow" },
    { label: "Context", href: "#context" },
    { label: "Trust", href: "#trust" },
  ],
} as const;

export const mainBlocks = [
  "hero-product",
  "capability-proof",
  "platform-thesis",
  "workflow-rail",
  "reusable-intelligence",
  "connected-context",
  "decision-signals",
  "connected-handoffs",
  "structured-control",
  "founder-trust",
  "honest-proof",
  "illustrative-workflow",
  "current-product",
  "early-access-briefing",
  "final-cta",
] as const;

export const capabilities = [
  "Structured estimates",
  "Reusable components",
  "Estimate templates",
  "Project sources",
  "Proposal preview",
  "Editable Excel output",
  "Issued proposals",
  "Contextual comments",
  "Recorded decisions",
  "Version and activity context",
] as const;

export const workflowChapters = [
  {
    id: "build-estimate",
    number: "01",
    label: "Build the estimate",
    title: "Start with a structure the whole cost story can follow.",
    body: "Organize Areas and rows, then make quantities, units, rates, and totals explicit. The calculation stays deterministic and readable.",
  },
  {
    id: "reuse-knowledge",
    number: "02",
    label: "Reuse what you know",
    title: "Bring proven work forward deliberately.",
    body: "Search components, templates, and project sources, inspect their provenance, and choose what belongs in the current estimate.",
  },
  {
    id: "proposal-output",
    number: "03",
    label: "Carry it into the proposal",
    title: "Keep the output recognizably tied to the estimate.",
    body: "Preview a client-facing proposal and download an editable Excel workbook without rebuilding the commercial story elsewhere.",
  },
  {
    id: "review-context",
    number: "04",
    label: "Review it in context",
    title: "Discuss the number where its meaning is visible.",
    body: "Issue a proposal version, target feedback to estimate context, and keep the financial overview and discussion together.",
  },
  {
    id: "revision-trail",
    number: "05",
    label: "Revise with the trail intact",
    title: "Use preserved decisions as context for the next revision.",
    body: "Activity, versions, and decision receipts inform user-controlled revisions. Feedback never rewrites the estimate automatically.",
  },
] as const;

export const proofPrinciples = [
  { title: "Structured", body: "Areas, rows, quantities, units, rates, and totals remain explicit." },
  { title: "Traceable", body: "Reusable sources and issued versions retain visible identity." },
  { title: "Reviewable", body: "Comments and decisions stay tied to proposal context." },
  { title: "User-controlled", body: "Selection, insertion, issuance, and revision remain deliberate actions." },
] as const;

export const currentProduct = [
  { title: "Structured estimating", body: "Build hierarchical estimates with deterministic calculations." },
  { title: "Reusable library", body: "Search and explicitly insert components, templates, and project sources." },
  { title: "Proposal and Excel", body: "Preview the proposal and download an editable .xlsx workbook." },
  { title: "Client review and decision", body: "Issue a version, discuss targeted context, and record a decision." },
] as const;

export const faqs = [
  {
    question: "What is Archestimator?",
    answer: "Construction estimating software—an estimate-to-proposal workspace built around reusable cost intelligence.",
  },
  {
    question: "Who is it for?",
    answer: "AEC teams and collaborators who create, manage, present, review, or decide on project costs.",
  },
  {
    question: "What does early access include?",
    answer: "Founder-led onboarding to the current pre-release workflow, with direct feedback shaping how the product develops.",
  },
  {
    question: "Can Excel stay in the workflow?",
    answer: "Yes. Archestimator supports proposal preview and an editable Excel .xlsx download; it does not imply live two-way spreadsheet synchronization.",
  },
] as const;

export const footerGroups = [
  { label: "Product", links: [{ label: "Features", href: "/features" }, { label: "Trust", href: "/trust" }, { label: "Security", href: "/security" }] },
  { label: "Company", links: [{ label: "About", href: "/about" }, { label: "Contact", href: "/contact" }] },
  { label: "Legal", links: [{ label: "Privacy", href: "/privacy" }, { label: "Terms", href: "/terms" }] },
] as const;

export const claimLedger = {
  accepted: ["structured-estimate", "explicit-reuse", "xlsx-output", "issued-version", "targeted-discussion", "decision-receipt", "version-activity"],
  partial: ["browser-print-save", "manual-discussion-carry-forward"],
  conceptual: ["connected-cost-record-diagram"],
  prohibited: ["automatic-estimate-rewrite", "native-pdf-export", "ai-estimating", "public-api", "integrations", "customer-proof", "traction-metrics"],
} as const;

if (process.env.NODE_ENV !== "production" && mainBlocks.length !== 15) {
  throw new Error("The /new main-block contract must contain exactly 15 blocks.");
}
