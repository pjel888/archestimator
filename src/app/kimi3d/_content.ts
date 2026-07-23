/**
 * Single source of truth for every visible string on the `/kimi3d` route.
 * Claims stay source-backed and free of em dashes.
 */

const SUPPORT_EMAIL = "support@archestimator.com";

export { SUPPORT_EMAIL };

export const BETA_ACCESS_MAILTO_HREF = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
  "Archestimator early access request",
)}&body=${encodeURIComponent(
  [
    "Hello Archestimator support,",
    "",
    "I would like to request early access.",
    "",
    "Account email:",
    "Company or team:",
    "Current estimating workflow:",
    "",
    "Thank you.",
  ].join("\n"),
)}`;

export const WORKSPACE_HREF = "/workshop";
export const LOGIN_HREF = "/login?next=/workshop/projects";

export const PRIMARY_CTA_LABEL = "Request early access";
export const SIGNED_IN_CTA_LABEL = "Open workspace";
export const SIGN_IN_LABEL = "Sign in";

export const preReleaseCopy = {
  status: "Private alpha",
  request: `Early access: ${SUPPORT_EMAIL}`,
} as const;

export const headerCopy = {
  wordmark: "Archestimator",
  nav: [
    { label: "Product", href: "#product" },
    { label: "Workflow", href: "#workflow" },
    { label: "Client review", href: "#proof" },
  ],
  menuLabel: "Menu",
  menuTitle: "Navigation",
  menuCloseLabel: "Close navigation",
  menuCloseText: "Close",
  skipLink: "Skip to content",
} as const;

export const heroCopy = {
  context: "Construction cost intelligence software for winning AEC teams",
  title: "BUILD WITH AMBITION",
  subtitle: "Build with Archestimator",
  lead: "Structure itemized scope and costs, reuse materials and assemblies, publish selected estimate content to a client portal or Excel, and keep comments, decisions, and revisions tied to the issued version.",
  primaryCta: PRIMARY_CTA_LABEL,
  demoRegionLabel: "Estimate workspace preview",
} as const;

export const workflowCopy = {
  headline: "From working estimate to client review and the next revision.",
  intro:
    "The working estimate remains the source. A published version gives clients a defined document to review while your team prepares the next revision.",
  stages: [
    {
      id: "build",
      index: "01",
      title: "Build the estimate",
      body: "Organize scope by area, phase, package, trade, or room. Add quantities, unit costs, suppliers, and totals, then reuse materials, labor, services, assemblies, and source notes from the cost library.",
      handoff: "Structured, priced scope",
    },
    {
      id: "publish",
      index: "02",
      title: "Publish a client version",
      body: "Choose estimate content for the client portal, or generate an editable Excel workbook from the working estimate.",
      handoff: "Published client version or Excel workbook",
    },
    {
      id: "review",
      index: "03",
      title: "Review the published version",
      body: "Clients can browse estimate and financial views, discuss specific scope, and, when permitted, approve, request changes, or decline.",
      handoff: "Feedback tied to the issued version",
    },
    {
      id: "revise",
      index: "04",
      title: "Revise with history",
      body: "Update the working estimate while version snapshots and activity preserve what changed after the client reviewed that version.",
      handoff: "Recorded changes and review history",
    },
  ],
} as const;

export const clientProofCopy = {
  title: "Send the version you want reviewed.",
  body: "Give clients a clear cost breakdown, focused discussion, and decision controls in one place. They can review the version you publish without seeing the estimate still in progress.",
} as const;

export const audienceCopy = {
  headline: "For the teams that own the estimate and explain it.",
  lead: "Archestimator is for construction and design professionals who build project costs and explain them to clients.",
  roles: [
    "Estimators",
    "General contractors",
    "Specialty contractors",
    "Design-build teams",
    "Architects and engineers",
    "Commercial interiors teams",
  ],
} as const;

export const faqCopy = {
  headline: "What teams need to know.",
  faqs: [
    {
      question: "What can clients review?",
      answer:
        "A published portal can present selected estimate and financial views, keep discussion tied to that version, and expose approve, request-change, or decline actions only when the team permits them.",
    },
    {
      question: "Does Archestimator replace Excel?",
      answer:
        "No. Excel remains a useful working document and output in construction. Archestimator adds the project structure, reusable cost knowledge, issued proposal context, review, and revision history that a spreadsheet does not keep connected on its own.",
    },
    {
      question: "Is Archestimator generally available?",
      answer:
        "No. Archestimator is currently in private alpha. AEC teams can request early access to test the workflow and share feedback.",
    },
  ],
} as const;

export const closingCopy = {
  headline: "Try Archestimator with your next estimate.",
  body: "Request early access for your team. Archestimator is currently in private alpha.",
  cta: PRIMARY_CTA_LABEL,
} as const;

export const footerCopy = {
  boilerplate:
    "A clearer handoff for construction estimates, from working scope to the client version under review.",
  contactLabel: "Early access",
  links: [
    { label: "Product", href: "#product" },
    { label: "Workflow", href: "#workflow" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
} as const;
