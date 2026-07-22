import { SUPPORT_EMAIL } from "@/components/landing/contact-mailto";

export const BETA_ACCESS_EMAIL = SUPPORT_EMAIL;
export const BETA_ACCESS_MAILTO_HREF = `mailto:${BETA_ACCESS_EMAIL}?subject=${encodeURIComponent(
  "Archestimator beta access request",
)}&body=${encodeURIComponent(
  [
    "Hello Archestimator support,",
    "",
    "I would like to request beta access.",
    "",
    "Account email:",
    "Company or team:",
    "Current estimating workflow:",
    "",
    "Thank you.",
  ].join("\n"),
)}`;
export const EARLY_ACCESS_HREF = BETA_ACCESS_MAILTO_HREF;
export const WORKSPACE_HREF = "/workshop";
export const LOGIN_HREF = "/login?next=/workshop/projects";

export type LandingCtaLocation = "header" | "hero" | "final-cta";

export const PRIMARY_CTA_LABEL = "Request beta access";
export const SIGNED_IN_CTA_LABEL = "Open workspace";
export const SIGN_IN_LABEL = "Sign in";

export const headerCopy = {
  nav: [
    { label: "Product", href: "#product" },
    { label: "Estimate", href: "#workflow-estimate" },
    { label: "Proposals", href: "#workflow-proposal" },
    { label: "Decisions", href: "#workflow-record" },
    { label: "Knowledge", href: "#cost-knowledge" },
    { label: "FAQ", href: "#faq" },
  ],
  menuLabel: "Menu",
  skipLink: "Skip to content",
} as const;

export const heroCopy = {
  titleLines: ["Estimate smarter.", "Propose better."],
  opening: "Where estimates become client-approved proposals.",
  demoDisclosure: "Current Archestimator estimate workspace · sanitized demonstration data",
  demoRegionLabel: "Current Archestimator estimate workspace demonstration",
} as const;

export const heroSteps = [
  {
    id: "scope",
    index: "01",
    compactTitle: "Estimate",
  },
  {
    id: "decision",
    index: "02",
    compactTitle: "Propose",
  },
  {
    id: "history",
    index: "03",
    compactTitle: "Decide",
  },
] as const;

export const workflowCopy = {
  label: "One connected workflow",
  chapters: [
    {
      id: "estimate",
      index: "01",
      label: "Estimate smarter",
      title: "Build estimates around real scope.",
      body:
        "Start with the project, not a blank grid. Build a hierarchy that matches the work, then price it with reusable cost knowledge and traceable source context.",
      features: [
        {
          title: "Project-shaped estimate trees",
        },
        {
          title: "Reusable cost components",
        },
        {
          title: "Source-aware pricing",
        },
        {
          title: "Live rollups and Excel output",
        },
      ],
    },
    {
      id: "proposal",
      index: "02",
      label: "Propose better",
      title: "Turn the estimate into a client decision.",
      body:
        "Issue a client-ready proposal from the estimate behind it. The scope, totals, assumptions, and financial breakdown stay connected instead of becoming another detached file.",
      features: [
        {
          title: "Client-ready issued views",
        },
        {
          title: "Clear financial breakdowns",
        },
        {
          title: "Comments in proposal context",
        },
        {
          title: "Controlled versions",
        },
      ],
    },
    {
      id: "record",
      index: "03",
      label: "Win faster",
      title: "Record the decision and every change after.",
      body:
        "A response should not end the record. Keep the reviewed version, requested changes, revised values, activity, and final decision legible together.",
      features: [
        {
          title: "Review status",
        },
        {
          title: "Revision requests",
        },
        {
          title: "Recoverable version history",
        },
        {
          title: "Recorded client decisions",
        },
      ],
    },
  ],
} as const;

export const knowledgeCopy = {
  label: "Reusable cost knowledge",
  title: "Every completed estimate makes the next one stronger.",
  body:
    "Save the commercial knowledge your team already worked to understand. Start the next estimate from trusted components and context instead of another duplicated spreadsheet.",
  items: ["Materials", "Labor", "Services", "Assemblies", "Variants", "Suppliers", "Source notes"],
  closing: "The value is not simply saving a rate. It is remembering why the rate was trusted.",
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
        "Not necessarily. Excel remains a useful working document and output in construction. Archestimator keeps project structure, reusable cost knowledge, proposal context, review, and revisions connected around the estimate.",
    },
    {
      question: "What can teams save and reuse?",
      answer:
        "Teams can reuse materials, labor, services, assemblies, variants, suppliers, known costs, assumptions, and source notes as commercial knowledge for future estimates.",
    },
    {
      question: "Is Archestimator generally available?",
      answer:
        "Archestimator is currently a pre-release product. AEC teams can request beta access to explore the current workflow and share feedback.",
    },
  ],
} as const;

export const finalCtaCopy = {
  label: "Pre-release beta",
  title: "Stop rebuilding the same decision in separate files.",
  body: "Request beta access and bring the estimating or proposal handoff you want to improve.",
} as const;

export const footerCopy = {
  boilerplate:
    "Construction estimating and proposals in one connected workflow, from real project scope to recorded client decision.",
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
