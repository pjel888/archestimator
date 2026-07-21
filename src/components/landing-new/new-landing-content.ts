import {
  Calculator,
  ChatCircleText,
  ClockCounterClockwise,
  FileArrowDown,
  FileText,
  SealCheck,
  Stack,
  Swap,
  Table,
  TreeStructure,
} from "@phosphor-icons/react/dist/ssr";

/**
 * Single source of truth for every visible string on the `/new` preview route.
 * Copy is transcribed from the plan-pack copy deck; change it there first.
 */

export const EARLY_ACCESS_HREF = "/contact?intent=beta-request";
export const WORKSPACE_HREF = "/workshop";
export const LOGIN_HREF = "/login?next=/workshop/projects";

export type LandingCtaLocation = "header" | "hero" | "early-access" | "final-cta";

export const PRIMARY_CTA_LABEL = "Request beta access";
export const SIGNED_IN_CTA_LABEL = "Open workspace";
export const SIGN_IN_LABEL = "Sign in";

export const headerCopy = {
  nav: [
    { label: "Product", href: "#product" },
    { label: "Workflow", href: "#workflow" },
    { label: "Connected record", href: "#connected-record" },
    { label: "FAQ", href: "#faq" },
  ],
  menuLabel: "Menu",
  skipLink: "Skip to content",
} as const;

export const heroCopy = {
  badge: "Estimate → proposal → decision",
  title: "Build the estimate. Keep the context.",
  lead: "One connected workspace for AEC teams to build estimates, present proposals, and move decisions forward.",
  stageNote: "Built for the full estimate-to-proposal workflow.",
  demoDisclosure: "Sanitized Archestimator workspace demonstration",
  demoRegionLabel: "Sanitized Archestimator estimate workspace demonstration",
} as const;

export const workflowOutcomes = [
  {
    id: "structure",
    index: "01",
    title: "Structure",
    body: "Organize scope by area, phase, package, trade, room, or another hierarchy that matches the job.",
    icon: TreeStructure,
  },
  {
    id: "reuse",
    index: "02",
    title: "Reuse",
    body: "Bring saved costs, components, suppliers, and source notes into the next estimate.",
    icon: Stack,
  },
  {
    id: "present",
    index: "03",
    title: "Present",
    body: "Carry estimate context into a client-ready proposal or familiar spreadsheet output.",
    icon: FileArrowDown,
  },
  {
    id: "revise",
    index: "04",
    title: "Revise",
    body: "Keep comments, changed values, versions, and decisions attached to the same commercial record.",
    icon: ClockCounterClockwise,
  },
] as const;

export const audienceCopy = {
  label: "Built for teams that own the number",
  listLabel: "Archestimator is designed for AEC teams responsible for estimates and proposals.",
  items: [
    "Estimators",
    "Architects",
    "Engineers",
    "General contractors",
    "Specialty contractors",
    "Design-build teams",
    "Commercial interiors teams",
  ],
} as const;

export const bentoCopy = {
  kicker: "The working record",
  title: "One estimate. One connected record.",
  lead: "Keep structure, cost knowledge, proposal output, and review history together from first scope to final decision.",
  cards: [
    {
      id: "structure",
      kicker: "01 · Structure",
      title: "Build around real project structure.",
      body: "Organize scope by area, phase, package, trade, room, or another hierarchy that reflects how the work will be built.",
      visual: "scope-tree",
      icon: TreeStructure,
    },
    {
      id: "reuse",
      kicker: "02 · Reuse",
      title: "Reuse cost knowledge with its context.",
      body: "Bring saved materials, labor, services, assemblies, variants, suppliers, and source notes into the next estimate.",
      visual: "saved-component",
      icon: Stack,
    },
    {
      id: "present",
      kicker: "03 · Present",
      title: "Present the number without rebuilding it.",
      body: "Carry line items, totals, exclusions, and assumptions into a client-ready proposal or familiar spreadsheet output.",
      visual: "outputs",
      icon: FileArrowDown,
    },
    {
      id: "revise",
      kicker: "04 · Revise",
      title: "Revise without erasing the reason.",
      body: "Keep comments, changed values, versions, and decisions attached to the same commercial record.",
      visual: "revision",
      icon: ClockCounterClockwise,
    },
  ],
} as const;

export type BentoVisual = (typeof bentoCopy.cards)[number]["visual"];

export const recordFlowCopy = {
  kicker: "One connected workflow",
  title: "A proposal should never lose its estimate.",
  lead: "Keep the scope, source costs, review, revision, and final decision in the same working record.",
  bullets: [
    "Start from the way the project is structured.",
    "Reuse costs and components with their source context.",
    "Bring review and revision back to the same record.",
  ],
  nodes: [
    { id: "scope", label: "Scope structure", tone: "cool" },
    { id: "costs", label: "Cost library + sources", tone: "cool" },
    { id: "estimate", label: "Estimate", tone: "signal" },
    { id: "output", label: "Proposal / Excel", tone: "slate" },
    { id: "review", label: "Review", tone: "slate" },
    { id: "decision", label: "Revision + decision", tone: "olive" },
  ],
  description:
    "Project scope and reusable cost sources feed the estimate. The estimate becomes proposal or spreadsheet output, receives review, and returns through revision to a recorded decision.",
} as const;

export const activityCopy = {
  kicker: "Review in context",
  title: "See the change. Keep the reason.",
  lead: "Make every revision easier to review by keeping the changed value, feedback, and decision together.",
  panelLabel: "Sanitized workflow example",
  entries: [
    {
      id: "changed-value",
      title: "Kitchen floor finish replaced",
      meta: "Estimate · changed value retained",
      icon: Swap,
    },
    {
      id: "comment",
      title: "Client comment added to the proposal",
      meta: "Review · context attached",
      icon: ChatCircleText,
    },
    {
      id: "revision",
      title: "Proposal revision prepared",
      meta: "Revision · earlier version remains visible",
      icon: ClockCounterClockwise,
    },
    {
      id: "decision",
      title: "Decision recorded against the reviewed proposal",
      meta: "Decision · activity history updated",
      icon: SealCheck,
    },
  ],
} as const;

export const principlesCopy = {
  title: "Keep the tools your team trusts. Lose the disconnected handoffs.",
  cards: [
    {
      id: "scope",
      title: "Structured around real scope",
      body: "Organize the estimate around locations, phases, packages, trades, rooms, or another hierarchy that matches the project—not one flat sheet.",
      icon: TreeStructure,
    },
    {
      id: "excel",
      title: "Excel stays in the workflow",
      body: "Keep familiar spreadsheet output where it helps while Archestimator connects the estimate, proposal, review, and revision context.",
      icon: Table,
    },
    {
      id: "review",
      title: "Client review stays attached",
      body: "Keep comments, changed values, versions, and decisions with the commercial record instead of a separate email thread.",
      icon: ChatCircleText,
    },
  ],
} as const;

export const connectionCopy = {
  kicker: "Commercial context",
  title: "What stays connected.",
  lead: "The value is not another isolated file. It is the relationship between the number, its source, the proposal, and the decision that follows.",
  pairs: [
    {
      id: "cost-source",
      pair: "Cost ↔ Source note",
      body: "Keep the reason behind a cost beside the value that uses it.",
    },
    {
      id: "component-supplier",
      pair: "Component ↔ Supplier or variant",
      body: "Reuse components with the supplier, option, or context that shaped them.",
    },
    {
      id: "estimate-proposal",
      pair: "Estimate ↔ Proposal",
      body: "Present the estimate without rebuilding its commercial context elsewhere.",
    },
    {
      id: "comment-context",
      pair: "Comment ↔ Proposal context",
      body: "Keep feedback beside the proposal context it addresses.",
    },
    {
      id: "revision-value",
      pair: "Revision ↔ Changed value",
      body: "Keep the changed number and its reason legible together.",
    },
    {
      id: "decision-history",
      pair: "Decision ↔ Activity history",
      body: "Keep the reviewed version and decision in one history.",
    },
  ],
} as const;

export const earlyAccessCopy = {
  kicker: "Pre-release beta access",
  title: "Start with the handoff that costs your team time.",
  lead: "The beta is for AEC teams ready to test a more connected estimating, proposal, or revision workflow.",
  requestCard: {
    title: "Request beta access",
    body: "For AEC teams that create estimates, quotes, or proposals today and want to test a more connected workflow. No payment or commitment is required for the design-partner conversation.",
    note: "Bring the workflow you use today.",
  },
  expectCard: {
    title: "What to expect",
    points: [
      "A founder-led conversation around your current estimating and proposal process.",
      "A practical look at the pre-release MVP, with live behavior separated from work in progress.",
      "A chance to test the workflow and share direct feedback.",
    ],
    note: "Early access is for product learning, not a public pricing commitment.",
  },
} as const;

export const faqCopy = {
  title: "Questions before changing the estimating workflow.",
  faqs: [
    {
      question: "Who is Archestimator for?",
      answer:
        "Archestimator is designed for estimators, architects, engineers, general contractors, specialty contractors, design-build teams, commercial interiors teams, and other AEC professionals responsible for building or presenting project costs.",
    },
    {
      question: "Does Archestimator replace Excel?",
      answer:
        "Not necessarily. Excel remains a useful working document and output in construction. Archestimator is designed to keep project structure, reusable cost knowledge, proposal context, review, and revisions connected around the estimate.",
    },
    {
      question: "What can teams save and reuse?",
      answer:
        "Teams can reuse materials, labor, services, assemblies, variants, suppliers, known costs, assumptions, and source notes as commercial knowledge for future estimates.",
    },
    {
      question: "Can clients review and respond to proposals?",
      answer:
        "Archestimator supports client-facing proposal review so comments and decisions can remain connected to the proposal and the estimate behind it. Exact access and review behavior should be demonstrated from the current product rather than overstated in marketing copy.",
    },
    {
      question: "Is Archestimator generally available?",
      answer:
        "Archestimator is currently a pre-release MVP. AEC teams can request early access for a founder-led conversation and an opportunity to test the workflow and share feedback.",
    },
  ],
} as const;

export const finalCtaCopy = {
  title: "Keep the estimate and decision connected.",
  body: "Request beta access and bring the estimating or proposal handoff you want to improve.",
  dockLabel: "Archestimator workflow stages",
  dock: [
    { id: "estimate", label: "Estimate", icon: Calculator },
    { id: "reuse", label: "Reuse", icon: Stack },
    { id: "proposal", label: "Proposal", icon: FileText },
    { id: "revision", label: "Revision", icon: ClockCounterClockwise },
  ],
} as const;

export const footerCopy = {
  boilerplate:
    "Archestimator is construction estimating software for AEC teams, combining structured estimates, reusable cost intelligence, client-ready proposals, reviews, revisions, and decisions in one connected workflow.",
  links: [
    { label: "Product", href: "#product" },
    { label: "Workflow", href: "#workflow" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
  workspaceLabel: "Workspace",
} as const;
