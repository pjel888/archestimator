/**
 * Canonical copy and fixture data for the /new landing page — "The Living
 * Estimate". All page copy lives here; components import from this module
 * instead of carrying inline strings.
 *
 * Currency strings are precomputed with:
 *   Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 })
 * so nothing needs client-side formatting. Fixture numbers are an
 * illustrative estimate, not a claim.
 */

export const nav = {
  links: [
    { label: "Product", href: "#product" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Who it's for", href: "#who-its-for" },
    { label: "Trust", href: "#trust" },
  ],
  signIn: { label: "Sign in", href: "/login?next=/workshop/projects" },
  cta: { label: "Request early access", href: "/contact?intent=access" },
} as const;

export const hero = {
  eyebrow: "Construction estimating software for AEC teams",
  title:
    "Make every estimate easier to build, clearer to present, and simpler to approve.",
  titleLines: [
    "Make every estimate",
    "easier to build, clearer to present,",
    "and simpler to approve.",
  ],
  sub: "Archestimator helps AEC teams reduce rework, communicate project costs clearly, and move decisions forward without losing context through reviews and revisions.",
  cta: { label: "Request early access", href: "/contact?intent=access" },
  quietLink: { label: "How Archestimator works ↓", href: "#how-it-works" },
} as const;

export type ProblemFragmentKind = "sheet" | "document" | "message" | "file";

export const problem = {
  eyebrow: "The handoff problem",
  title: "Construction costs lose context every time they change hands.",
  body: "An estimate moves from working sheets to Excel, proposal documents, client questions, and repeated revisions. Each handoff creates more rework—and another opportunity to lose the assumptions and decisions behind the number.",
  fragments: [
    { kind: "sheet", label: "Working sheet .xlsx" },
    { kind: "document", label: "Proposal — detached PDF" },
    { kind: "message", label: "Email — 're: revised joinery?'" },
    { kind: "file", label: "v7_FINAL_final.xlsx" },
  ] as { kind: ProblemFragmentKind; label: string }[],
  closing: "The estimate should stay connected after you send it.",
} as const;

export type BenefitDetail =
  | { kind: "library"; name: string; meta: string }
  | { kind: "proposal"; label: string; value: string }
  | { kind: "revision"; prior: string; current: string; meta: string };

export const benefits = {
  title: "Less rework. Clearer proposals. Better-controlled revisions.",
  panels: [
    {
      title: "Spend less time rebuilding work",
      body: "Reuse relevant cost knowledge and estimate structures instead of reconstructing every project from another copied file.",
      detail: {
        kind: "library",
        name: "Reception millwork",
        meta: "Reused from Cost library · 3 projects",
      },
    },
    {
      title: "Present project costs more clearly",
      body: "Give clients and project teams a proposal they can understand, review, and respond to without losing the work behind it.",
      detail: { kind: "proposal", label: "Proposal total", value: "₱6,454,170" },
    },
    {
      title: "Keep revisions under control",
      body: "Preserve the connection between the estimate, the conversation, and the changes that follow.",
      detail: {
        kind: "revision",
        prior: "₱864,000",
        current: "₱912,000",
        meta: "Revision B · reason attached",
      },
    },
  ] as { title: string; body: string; detail: BenefitDetail }[],
} as const;

export type FixtureItem = {
  name: string;
  qty: string;
  unitCost: string;
  contingency: string;
  total: string;
  /** Short source-note label shown on rows that carry an attached source. */
  source?: string;
  /** Prior revision value, shown as a ghost beside the current total. */
  prior?: string;
};

export type FixtureGroup = {
  name: string;
  items: FixtureItem[];
};

export const fixture = {
  project: "Makati Workplace Fit-Out",
  meta: "Cost plan · Revision B",
  status: "In review",
  columns: ["Item", "Qty", "Unit cost", "Contingency", "Total"] as const,
  groups: [
    {
      name: "Preliminaries",
      items: [
        {
          name: "Site mobilization and temporary facilities",
          qty: "1 lot",
          unitCost: "₱486,000",
          contingency: "—",
          total: "₱486,000",
        },
      ],
    },
    {
      name: "Architectural works",
      items: [
        {
          name: "Demolition and strip-out",
          qty: "340 m²",
          unitCost: "₱1,450",
          contingency: "5%",
          total: "₱517,650",
        },
        {
          name: "Partition walls and ceilings",
          qty: "520 m²",
          unitCost: "₱2,380",
          contingency: "5%",
          total: "₱1,299,480",
        },
      ],
    },
    {
      name: "Joinery",
      items: [
        {
          name: "Reception and pantry millwork",
          qty: "1 lot",
          unitCost: "₱912,000",
          contingency: "—",
          total: "₱912,000",
          source: "Supplier quote attached",
          prior: "₱864,000",
        },
      ],
    },
    {
      name: "MEP coordination",
      items: [
        {
          name: "Electrical and data rough-in",
          qty: "96 pts",
          unitCost: "₱8,540",
          contingency: "—",
          total: "₱819,840",
        },
      ],
    },
    {
      name: "Furniture and equipment",
      items: [
        {
          name: "Workstations and task seating",
          qty: "48 sets",
          unitCost: "₱38,900",
          contingency: "—",
          total: "₱1,867,200",
        },
      ],
    },
    {
      name: "Allowances",
      items: [
        {
          name: "Design development allowance",
          qty: "1 lot",
          unitCost: "₱600,000",
          contingency: "—",
          total: "₱600,000",
        },
      ],
    },
  ] as FixtureGroup[],
  totalLabel: "Estimate total",
  total: "₱6,502,170",
  note: "QS review — joinery rate confirmed against supplier quotation, March.",
  joinery: { prior: "₱864,000", current: "₱912,000", revision: "Revision B" },
  proposal: {
    title: "Client proposal · Makati Workplace Fit-Out",
    summary: ["6 groups · 7 line items", "Total ₱6,454,170"],
    total: "₱6,454,170",
    status: "In review",
  },
  comment: {
    label: "Client comment · Joinery",
    quote:
      "Can we review the reception millwork finish against the Level 2 lobby palette?",
  },
  caption: "Illustrative — current product workflow",
  posterCaption: "Illustrative estimate · PHP",
} as const;

export const proofChapters = {
  title: "One connected path from working estimate to client response.",
  intro:
    "Archestimator keeps the working cost structure, familiar outputs, client review, and revision context connected.",
  chapters: [
    {
      key: "build",
      index: "01",
      title: "Build with structure",
      body: "Organize the estimate around the way the project is actually understood: phase, location, package, trade, room, or scope.",
    },
    {
      key: "carry",
      index: "02",
      title: "Carry the number forward",
      body: "Move from working estimate to Excel or a client-ready proposal without rebuilding the information by hand.",
    },
    {
      key: "respond",
      index: "03",
      title: "Let clients respond in context",
      body: "Give recipients a clear proposal they can open, review, question, comment on, or decide on.",
    },
    {
      key: "revise",
      index: "04",
      title: "Revise without losing the trail",
      body: "Change the estimate while preserving the response, prior state, and reason behind the revision.",
    },
  ] as const,
  proposalPreviewLabel: "Proposal preview",
  excelChip: "Excel export .xlsx",
  respondActions: ["Comment", "Request changes", "Accept"] as const,
  activity: [
    { label: "Revision B — Joinery", prior: "₱864,000", current: "₱912,000" },
    { label: "Client comment resolved" },
  ] as { label: string; prior?: string; current?: string }[],
  caption: "Illustrative — current product workflow",
} as const;

export const costKnowledge = {
  eyebrow: "Work that compounds",
  title: "Each completed estimate makes the next one easier.",
  body: "Prices, suppliers, assemblies, variants, assumptions, and source notes should not disappear when a project ends. Archestimator turns the team's own estimating work into reusable private cost knowledge.",
  loop: [
    "Completed estimate",
    "Reusable cost knowledge",
    "Next estimate starts ahead",
    "New proposal and revision history ↺",
  ] as const,
  /** The single node rendered as the orange signal node. */
  signalNode: "Reusable cost knowledge",
  dataLine:
    "Your data stays yours. It is never pooled into a cross-customer estimate database.",
} as const;

export const audience = {
  title:
    "For the people who build the number, manage the project, and decide what moves forward.",
  columns: [
    {
      title: "Build the number",
      items: [
        "Estimators and quantity surveyors",
        "Architects and engineers",
        "Contractors and design-build teams",
        "Commercial interiors",
        "Proposal owners",
        "Suppliers",
      ],
    },
    {
      title: "Manage the project",
      items: [
        "Project managers",
        "Construction managers",
        "Preconstruction and commercial teams",
        "Multidisciplinary project teams",
      ],
    },
    {
      title: "Decide what moves forward",
      items: ["Clients", "Developers and owners", "Procurement", "Internal approvers"],
    },
  ] as const,
} as const;

export const trust = {
  title: "Designed from inside the AEC process.",
  founder:
    "Archestimator is built by an architect and software engineer who has worked across design, project communication, estimating workflows, and digital product development.",
  principles: [
    {
      title: "Your data stays yours",
      body: "Private workspace data is not pooled or anonymized across customers.",
    },
    {
      title: "The number remains under your control",
      body: "Archestimator structures and connects the workflow. It does not invent prices or autonomously estimate the project.",
    },
    {
      title: "Familiar outputs remain available",
      body: "Export to Excel when the project, client, or downstream process requires it.",
    },
    {
      title: "Honest product status",
      body: "Archestimator is a pre-release MVP preparing for controlled early access.",
    },
  ] as const,
} as const;

export const faq = {
  title: "Frequently asked questions",
  items: [
    {
      question: "What is Archestimator?",
      answer:
        "Archestimator is construction estimating software—an estimate-to-proposal workspace built around reusable cost intelligence.",
    },
    {
      question: "Who is it for?",
      answer:
        "It is built for the people who create, manage, communicate, review, and approve construction costs, including estimators, architects, engineers, contractors, project teams, suppliers, clients, developers, and procurement.",
    },
    {
      question: "Does Archestimator replace Excel?",
      answer:
        "It improves the workflow around the estimate while keeping Excel export available for familiar handoffs and downstream work.",
    },
    {
      question: "Can clients review a proposal?",
      answer:
        "The current product supports shared client-facing proposals with comments, decisions, and access controls.",
    },
    {
      question: "Does Archestimator generate estimates automatically?",
      answer:
        "No. The current product uses the user's own inputs and cost knowledge. AI and autonomous estimating are not part of the current public product story.",
    },
    {
      question: "Is Archestimator available now?",
      answer: "Archestimator is a pre-release MVP preparing for controlled early access.",
    },
  ] as const,
} as const;

export const finalCta = {
  title: "Bring your construction cost workflow into one connected place.",
  line: "Build the estimate, present it clearly, keep feedback attached, and revise without losing context.",
  cta: { label: "Request early access", href: "/contact?intent=access" },
} as const;

export const footer = {
  links: [
    { label: "Features", href: "/features" },
    { label: "About", href: "/about" },
    { label: "Pricing", href: "/pricing" },
    { label: "Trust", href: "/trust" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Contact", href: "/contact" },
    { label: "Sign in", href: "/login" },
  ] as const,
  status: "Pre-release MVP — preparing for controlled early access",
  copyright: "© 2026 Archestimator",
} as const;
