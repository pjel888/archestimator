/**
 * Canonical copy and fixture data for the /new landing page — "The Living
 * Estimate". All page copy lives here; components import from this module
 * instead of carrying inline strings.
 *
 * Currency strings are precomputed with:
 *   Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 })
 * so nothing needs client-side formatting. Fixture numbers are an
 * illustrative estimate, not a claim.
 *
 * Column names, decision labels, and decision scope are verified against
 * current source (estimate row table + client-portal decision section).
 * The visuals remain concept illustrations until sanctioned product
 * captures replace them.
 */

export const nav = {
  links: [
    { label: "Product", href: "#product" },
    { label: "How it works", href: "#how-it-works" },
  ],
  signIn: { label: "Sign in", href: "/login?next=/workshop/projects" },
  cta: { label: "Request early access", href: "/contact?intent=access" },
} as const;

export const hero = {
  definition: "Construction estimate-to-proposal workspace",
  title: "Build the estimate once. Present it clearly. Revise it without losing the story.",
  sub: "Structure project costs from reusable cost knowledge, issue a clear client proposal, and keep feedback, decisions, and revisions connected.",
  cta: { label: "Request early access", href: "/contact?intent=access" },
  trail: ["Working estimate", "Client proposal", "Feedback and decision", "Revision history"],
} as const;

/** Single compressed handoff-contrast line between hero and product proof. */
export const contrast =
  "Spreadsheets, PDFs, email threads, and revised files split one cost decision into separate records. Archestimator keeps the estimate, proposal, feedback, and revision connected.";

export type FixtureItem = {
  name: string;
  qty: string;
  contingency: string;
  subtotal: string;
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

/**
 * Illustrative fixture. Columns are a crop of the current estimate
 * workspace header set — Materials, Qty, Contingency, Subtotal, Total
 * Item Cost — with Adjustment and Misc Cost cropped out for legibility.
 * Names and order are not renamed, recombined, or invented.
 */
export const fixture = {
  project: "Makati Workplace Fit-Out",
  meta: "Cost plan · Revision B",
  status: "In review",
  columns: ["Materials", "Qty", "Contingency", "Subtotal", "Total Item Cost"] as const,
  groups: [
    {
      name: "Preliminaries",
      items: [
        {
          name: "Site mobilization and temporary facilities",
          qty: "1 lot",
          contingency: "—",
          subtotal: "₱486,000",
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
          contingency: "5%",
          subtotal: "₱493,000",
          total: "₱517,650",
        },
        {
          name: "Partition walls and ceilings",
          qty: "520 m²",
          contingency: "5%",
          subtotal: "₱1,237,600",
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
          contingency: "—",
          subtotal: "₱912,000",
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
          contingency: "—",
          subtotal: "₱819,840",
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
          contingency: "—",
          subtotal: "₱1,867,200",
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
          contingency: "—",
          subtotal: "₱600,000",
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
    summary: ["6 groups · 7 line items", "Total ₱6,502,170"],
    total: "₱6,502,170",
    status: "In review",
  },
  comment: {
    label: "Client comment · Joinery",
    quote:
      "Can we review the reception millwork finish against the Level 2 lobby palette?",
  },
  caption: "Concept illustration · verified column structure",
  posterCaption: "Concept illustration · illustrative estimate in PHP",
} as const;

export const proofChapters = {
  title: "The working number stays connected after it leaves the spreadsheet.",
  intro:
    "One project record carries the estimate into presentation, review, and revision. The proof below is a concept model built from current product fields and decisions—not a screenshot.",
  chapters: [
    {
      key: "build",
      title: "Build once",
      body: "Organize the estimate around the way the project is actually understood: phase, location, package, trade, room, or scope.",
    },
    {
      key: "carry",
      title: "Present clearly",
      body: "Move from working estimate to Excel or a client-ready proposal without rebuilding the information by hand.",
    },
    {
      key: "respond",
      title: "Respond in context",
      body: "Clients discuss specific lines on the shared proposal, then record one issue-wide decision: approve, request changes, or decline.",
    },
    {
      key: "revise",
      title: "Revise with context",
      body: "Change the estimate while the activity record preserves what changed and why.",
    },
  ] as const,
  proposalPreviewLabel: "Proposal preview",
  excelChip: "Excel export .xlsx",
  /** Exact current decision labels — issue-wide, never row-level. */
  respondActions: ["Approve", "Request changes", "Decline"] as const,
  respondDecisionNote: "One decision for the whole issued scope",
  activity: [
    {
      label: "Row updated · Joinery — Reception and pantry millwork",
      prior: "₱864,000",
      current: "₱912,000",
    },
    { label: "Client comment · Joinery finish reviewed" },
    { label: "Revision B · published to the shared proposal" },
  ] as { label: string; prior?: string; current?: string }[],
  caption: "Concept illustration · labels verified against current source",
} as const;

export const costKnowledge = {
  title: "Each completed estimate makes the next one easier.",
  body: "Prices, suppliers, variants, assumptions, and source notes should not disappear when a project ends. Archestimator keeps them as reusable private cost knowledge for the next estimate.",
  detail: {
    name: "Reception and pantry millwork",
    meta: "3 variants · 2 suppliers · price history · attachments",
  },
  dataLine:
    "Your data stays yours. It is never pooled into a cross-customer estimate database.",
} as const;

/** Single responsibility-based audience line — the detailed taxonomy lives off the homepage. */
export const audienceLine =
  "For the people who build the number, manage the work, and decide what moves forward.";

export const trust = {
  title: "Built from inside the construction cost workflow.",
  founder:
    "Archestimator is built by an architect and software engineer who has worked across design, project communication, estimating workflows, and digital product development.",
  facts: [
    "Your inputs and decisions remain under your control.",
    "Excel remains available as a familiar output.",
    "Archestimator is a pre-release product entering controlled early access.",
  ] as const,
} as const;

export const faq = {
  title: "A few practical answers.",
  items: [
    {
      question: "Does Archestimator replace Excel?",
      answer:
        "It improves the workflow around the estimate while keeping Excel export available for familiar handoffs and downstream work.",
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
