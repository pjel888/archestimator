import type { ClaimStatus } from "@/components/landing/shared/StatusPill";
//   ↑ D-4 HARD CONTRACT: single shared type. This file does NOT redefine ClaimStatus.

/**
 * claims-data.ts — the single source the ClaimsLedger renders from
 * (doc 06 §3 CLAIMS MATRIX). Compiled from MASTER §7.2 + §15.
 *
 * If a public claim is not in this matrix, it cannot appear on the site.
 * The claims-matrix-check gate (scripts/claims-matrix-check.mjs) reconciles
 * this against the live Feature Inventory before public cutover.
 *
 * Group ordering: Live (§3.1) → Building (§3.2) → Planned (§3.3) → NotUs (§3.4).
 * The "NotUs" group renders as a clearly-delimited "What we are NOT" block, NOT
 * as a fourth status bucket competing with Live/Building/Planned (doc 06 §3.4).
 */

export interface ClaimRowData {
  /** Public wording, short. */
  claim: string;
  status: ClaimStatus;
  /** "§7.2" — points back to MASTER for the audit trail. */
  source: string;
  /** Optional honest qualifier, rendered in --secondary under the claim. */
  note?: string;
  /** Architect-redline annotation: adds the --brand-orange accent rail (doc 06 §2.3).
   *  Reserved for honesty-anchor rows + the NotUs rows that protect the brand. */
  redline?: boolean;
}

export interface ClaimGroup {
  id: "live" | "building" | "planned" | "not-us";
  /** Section heading inside the ledger. */
  heading: string;
  /** One-line lead under the heading. */
  lead: string;
  rows: ClaimRowData[];
}

export const CLAIM_GROUPS: readonly ClaimGroup[] = [
  {
    id: "live",
    heading: "Live — ships today",
    lead: "Present tense. Each of these is in the MVP and safe to claim as current.",
    rows: [
      {
        claim: "Estimate workspace with a hierarchical tree (Group / Area / rows; drag-drop reorder).",
        status: "Live",
        source: "§7.2, §8.3",
      },
      {
        claim: "Reusable component library: components, brands, suppliers, variants, pricing, images, attachments, and misc_cost entries.",
        status: "Live",
        source: "§7.2, §6.5",
      },
      {
        claim: "Drag reusable components and templates into the estimate sheet instead of rebuilding line items by hand.",
        status: "Live",
        source: "§7.2, §6.5",
      },
      {
        claim: "Inline sheet editing (optimistic, UUID-safe rows) and estimate templates.",
        status: "Live",
        source: "§7.2",
      },
      {
        claim: "Activity, Node Activity, and row Version History — what changed, when, why.",
        status: "Live",
        source: "§7.2",
      },
      {
        claim: "D3 project comparison charts (donut + bubble).",
        status: "Live",
        source: "§7.2",
      },
      {
        claim: "Project publication with shared links: comments, decisions, and password protection.",
        status: "Live",
        source: "§7.2, §6.6",
      },
      {
        claim: "Collaboration invites with roles and realtime cursors.",
        status: "Live",
        source: "§7.2, §7.3",
        note: "Role names and permission granularity are being finalized.",
      },
      {
        claim: "Excel .xlsx proposal export (preview + download).",
        status: "Live",
        source: "§7.2",
        note: "A working document today; not an immutable issued record.",
      },
      {
        claim: "Private by design — your data is yours, never pooled or anonymized across customers.",
        status: "Live",
        source: "§4.4 #4, R10, §3.3",
        redline: true,
      },
      {
        claim: "Deterministic arithmetic. No AI-generated pricing, no probabilistic ranges, no takeoff.",
        status: "Live",
        source: "§8.4",
      },
    ],
  },
  {
    id: "building",
    heading: "Building — partial today, improving",
    lead: "Phrased as in-progress, never as fully shipped.",
    rows: [
      {
        claim: "Activity rollups and action taxonomy — improving.",
        status: "Building",
        source: "§7.2",
      },
      {
        claim: "Proposal export policy — preview and download exist; an issued, immutable snapshot is an open decision.",
        status: "Building",
        source: "§7.2, §16.2",
      },
    ],
  },
  {
    id: "planned",
    heading: "Planned — on the roadmap, not yet shipped",
    lead: "Direction only. Never phrased as current.",
    rows: [
      {
        claim: "Surfacing your own accumulated history by client, project type, and supplier — the payoff the hook commits to.",
        status: "Planned",
        source: "§3.3, §7.2, §17 #13",
        redline: true,
      },
      {
        claim: "Proposal snapshots / issued exports (policy gate first).",
        status: "Planned",
        source: "§7.2, §16.2",
      },
      {
        claim: "Archiving and trash (a paid-tier capability).",
        status: "Planned",
        source: "§7.2, §9.2",
      },
      {
        claim: "Proposal open-tracking (tiered; the sender sees when a client opens the shared link).",
        status: "Planned",
        source: "§7.2, §9.2",
      },
      {
        claim: "Beta onboarding and first-run flow with demo-data/reset rules.",
        status: "Planned",
        source: "§7.5, §18.3",
      },
      {
        claim: "Supplier catalog → quote requests → product comparison → procurement bridge.",
        status: "Planned",
        source: "§7.2, §4.4 #3",
      },
      {
        claim: "Client-side proposal record / archive.",
        status: "Planned",
        source: "§7.2, §9.1",
      },
    ],
  },
  {
    id: "not-us",
    heading: "What we are NOT",
    lead: "The explicit boundary. Each row is a refusal to claim something the product is not.",
    rows: [
      {
        claim: "Not production-hardened enterprise SaaS.",
        status: "NotUs",
        source: "§7.4, §15",
      },
      {
        claim: "Exports are working documents, not immutable issued records, legal documents, or POs.",
        status: "NotUs",
        source: "§7.4, §16.2, §15",
        redline: true,
      },
      {
        claim: "AI is on the roadmap, not in the product today. When it ships it is Ask-only at Pro and up, with a visible privacy note.",
        status: "NotUs",
        source: "§7.2, §8.5, §16.1, §15",
        redline: true,
      },
      {
        claim: "Not procurement, ERP, or payment execution.",
        status: "NotUs",
        source: "§7.4, §15",
      },
      {
        claim: "Not an aggregator, not a database of other people's estimates, not a bulk import of your old files.",
        status: "NotUs",
        source: "§3.3, §15, R10",
        redline: true,
      },
      {
        claim: "No BIM or drawing ingestion today. English UI, no localization yet.",
        status: "NotUs",
        source: "§7.4, §8.6",
      },
      {
        claim: "No logos, testimonials, adoption metrics, or partner names — none exist yet, and we do not invent them.",
        status: "NotUs",
        source: "§12.8, §14.1, §15",
      },
      {
        claim: "No compliance badges (SOC2/GDPR/HIPAA/DPA) — entity and DPA work are not done.",
        status: "NotUs",
        source: "§4.4, §17 #2/#4, §18.2",
      },
    ],
  },
] as const;

/** Flat list of all rows — used by the homepage footer abbreviation + the filter. */
export const ALL_CLAIM_ROWS: readonly ClaimRowData[] = CLAIM_GROUPS.flatMap((g) => g.rows);

/** The 3-row footer abbreviation (doc 06 §2.4). */
export const FOOTER_CLAIM_ROWS: readonly ClaimRowData[] = [
  {
    claim: "Pre-launch MVP. Live foundation: estimate tree, reusable library, Activity, proposal handoff.",
    status: "Live",
    source: "§7.2",
  },
  {
    claim: "AI is on the roadmap, not in the product today.",
    status: "NotUs",
    source: "§7.2, §8.5",
    redline: true,
  },
  {
    claim: "Exports are working documents, not immutable issued records.",
    status: "NotUs",
    source: "§16.2",
    redline: true,
  },
];
