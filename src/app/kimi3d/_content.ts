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
  context: "Construction cost intelligence software",
  title: "BUILD WITH AMBITION",
  subtitle: "Build with Archestimator",
  leadTitleStart: "From cost estimate to client approval.",
  leadTitleHighlight: "All in one workflow.",
  lead: "Build detailed estimates, issue professional proposals, collect client feedback, and keep every decision and revision connected.",
  audiences: [
    "Architects",
    "Engineers",
    "Contractors",
    "Subcontractors",
    "Home Builders",
    "Design-Build Teams",
    "Suppliers",
    "Procurement Teams",
    "Project Managers",
    "Cost Estimators",
    "Construction Managers",
    "Facilities Managers",
    "Renovation Specialists",
    "Real Estate Developers",
    "Interior Designers",
    "Quantity Surveyors",
    "Property Owners",
    "DIYers",
  ],
  primaryCta: PRIMARY_CTA_LABEL,
  demoRegionLabel: "Estimate workspace preview",
} as const;

export const workflowCopy = {
  eyebrow: "Estimate sheet workspace",
  headline: "Build estimates your way.",
  intro:
    "Structure the scope, move priced work into place, and carry proven cost knowledge from one estimate to the next.",
  features: [
    {
      id: "tree",
      title: "Project-driven branch tree",
      body: "Organize scope by area, phase, package, trade, room, or any hierarchy the project needs.",
    },
    {
      id: "rows",
      title: "Drag and drop estimate rows",
      body: "Move materials, labor, services, and assemblies between branches without rebuilding the priced row.",
    },
    {
      id: "components",
      title: "Reusable cost components",
      body: "Save and reuse materials, labor, services, and assemblies so proven cost knowledge carries into the next estimate.",
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
