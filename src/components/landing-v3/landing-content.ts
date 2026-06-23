export const WALKTHROUGH_HREF = "/contact?intent=walkthrough";
export const WORKSPACE_HREF = "/workshop";
export const LOGIN_HREF = "/login?next=/workshop/projects";

export const navItems = [
  { label: "Product", href: "#product" },
  { label: "Workflow", href: "#workflow" },
  { label: "Specialties", href: "#specialties" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
] as const;

export const proofAudiences = [
  "General contractors",
  "Specialty contractors",
  "Design-build teams",
  "Commercial interiors",
] as const;

export const workflowSteps = [
  {
    id: "structure",
    number: "01",
    title: "Structure the work the way it will be built.",
    body:
      "Organize the estimate by phase, location, scope, package, or trade. Keep quantities, rates, assumptions, and source notes attached to the work they describe.",
    state: "Project structure expands around phases, locations, trades, packages, and scoped alternates.",
  },
  {
    id: "reuse",
    number: "02",
    title: "Start from commercial knowledge, not an empty sheet.",
    body:
      "Reuse materials, labor, services, assemblies, variants, suppliers, and known costs without losing the context behind them.",
    state: "A saved assembly moves from the cost library into a selected estimate row with source context intact.",
  },
  {
    id: "propose",
    number: "03",
    title: "Turn the estimate into a proposal without rebuilding it.",
    body:
      "Carry line items, totals, exclusions, and assumptions into a clean client-facing proposal without reformatting or copy-paste.",
    state: "Proposal paper emerges while the original estimate rows remain connected.",
  },
  {
    id: "decide",
    number: "04",
    title: "Revise without losing the decision trail.",
    body:
      "Capture comments, questions, revision requests, approvals, and version history in the same commercial record.",
    state: "A comment, adjusted line, version comparison, and recorded decision resolve into one trail.",
  },
] as const;

export const featureChapters = [
  {
    kicker: "Reusable cost intelligence",
    title: "Every completed estimate makes the next one stronger.",
    body:
      "Save materials, labor, services, assemblies, variants, suppliers, and source notes as reusable commercial knowledge. Start from what your team actually knows, not from a copied sheet with no history.",
    callout: "The value is not simply saving a rate. It is remembering why the rate was trusted.",
  },
  {
    kicker: "Proposal handoff",
    title: "Send a polished proposal without breaking the link to the estimate.",
    body:
      "Line items, totals, exclusions, and assumptions move into a client-ready proposal without reformatting or copy-paste. The numbers stay traceable to the work behind them.",
    callout: "Client-facing clarity without internal context loss.",
  },
  {
    kicker: "Revision and activity history",
    title: "Make every revision legible.",
    body:
      "Keep comments, changes, versions, and decisions attached to the proposal. See what changed, who changed it, and what the client ultimately approved.",
    callout: "A change should never erase the reason behind it.",
  },
] as const;

export const comparisonRows = [
  ["Rates are copied.", "Costs keep their source."],
  ["Proposal data is reformatted.", "Proposal data stays connected."],
  ["Feedback moves to email.", "Review remains attached."],
  ["Revisions overwrite earlier versions.", "Versions stay recoverable."],
  ["The next estimate starts from a blank or duplicated sheet.", "Commercial knowledge compounds."],
] as const;

export const specialties = [
  {
    id: "general-contractors",
    label: "General contractors",
    copy:
      "Organize costs across phases, locations, trades, bid packages, and allowances while preserving the assumptions behind the total.",
    visual: "Phase and package tree with allowances held beside the estimate total.",
  },
  {
    id: "specialty-contractors",
    label: "Specialty contractors",
    copy:
      "Build reusable assemblies, variants, supplier references, labor logic, and scope packages that can move into future estimates.",
    visual: "Assembly variants with supplier context and reusable labor logic.",
  },
  {
    id: "interiors-design-build",
    label: "Commercial interiors and design-build",
    copy:
      "Keep rooms, finishes, options, exclusions, and client decisions connected from the first estimate through final approval.",
    visual: "Room-based estimate with finish options and client decisions attached.",
  },
] as const;

export const productProof = [
  "Structured source notes",
  "Recoverable version history",
  "Proposal review attached to the estimate",
  "Recorded decisions",
  "Reusable costs and assemblies",
] as const;

export const faqs = [
  {
    question: "Who is Archestimator designed for?",
    answer:
      "Estimators, preconstruction leads, proposal owners, general contractors, specialty contractors, design-build teams, and commercial interiors teams that need estimate, proposal, revision, and approval context in one place.",
  },
  {
    question: "How can an estimate be structured?",
    answer:
      "An estimate can be organized around the project: phase, location, room, package, trade, scope, or another hierarchy that matches how the work will be built.",
  },
  {
    question: "What costs or components can be saved and reused?",
    answer:
      "Teams can reuse materials, labor, services, assemblies, variants, suppliers, known costs, assumptions, and source notes as commercial knowledge for future estimates.",
  },
  {
    question: "Can Archestimator produce a client-ready proposal?",
    answer:
      "Yes. Estimate line items, totals, exclusions, and assumptions can be carried into a polished client-facing proposal while remaining connected to the original estimate context.",
  },
  {
    question: "How are comments, revisions, and approvals recorded?",
    answer:
      "Review comments, revision requests, changed values, version history, approvals, and decisions remain attached to the commercial record so the reason behind the number is not lost.",
  },
] as const;
