import type { ClaimStatus } from "@/components/landing/shared/StatusPill";
//   ↑ D-4 HARD CONTRACT: single shared type. This file does NOT redefine ClaimStatus.
//     The plate narrows to the Live/Building/Planned subset at the call site
//     (no NotUs nodes appear on the plate — see PlateClaimStatus below).

/**
 * plate-data.ts — the single source of truth the commercial-graph plate
 * renders from (doc 04 §4.8). The SVG geometry is DERIVED from this data,
 * not hand-authored per breakpoint, so the responsive collapse (§4.6) and
 * the status transitions (§4.7) are data-driven.
 *
 * Reconciled verbatim with doc 04 §3 (nodes) + §4.3 (edge table). If this
 * data ever disagrees with the Feature Inventory, the inventory wins — the
 * claims-matrix-check gate enforces it before public cutover.
 */

export type PlateNodeId = "L1" | "L2" | "L3" | "L4" | "B1" | "P1";
export type EdgeKind = "solid" | "lighter" | "dashed-accent";
export type EdgeDirection = "uni" | "bidirectional";

export interface PlateEdge {
  to: PlateNodeId;
  /** solid (Live↔Live), lighter (→Building), dashed-accent (→Planned). */
  kind: EdgeKind;
  /** "bidirectional" renders as ↔ in doc 04 §4.2; data stored once per logical edge. */
  direction: EdgeDirection;
  /** "reuses", "every edit is recorded", etc. (doc 04 §4.3). */
  label?: string;
}

export interface PlateNode {
  id: PlateNodeId;
  /** "The Estimate Tree". */
  label: string;
  /** "Group · Area · rows" — DROPPED at ≤360px per doc 04 §4.6. */
  subLabel?: string;
  /** Drives <StatusPill> + the border style + the caption copy. */
  status: ClaimStatus;
  /** The caption text shown on hover/focus (doc 04 §4.5). */
  publicLabel: string;
  /** Spatial band per doc 04 §4.2. */
  band: "live" | "building" | "planned";
  /** The edges FROM this node per doc 04 §4.3. */
  edges: PlateEdge[];
}

/**
 * The plate's ClaimStatus subset (D-4): only Live | Building | Planned — no NotUs.
 * The type system allows NotUs (it inherits the full ClaimStatus); the DATA below
 * does not include any. This is the narrowing the call site enforces.
 */
export type PlateClaimStatus = Exclude<ClaimStatus, "NotUs">;

/**
 * PLATE_NODES — the data the SVG renders from. Edge storage rule (doc 04 §4.8):
 * store each bidirectional edge ONCE on the lower-id node with
 * `direction: "bidirectional"`; the renderer emits the double-headed arrow.
 */
export const PLATE_NODES: readonly PlateNode[] = [
  {
    id: "L1",
    label: "The Estimate Tree",
    subLabel: "Group · Area · rows",
    status: "Live",
    band: "live",
    publicLabel: "A structured estimate, not a flat sheet.",
    edges: [
      { to: "L2", kind: "solid", direction: "uni", label: "reuses" },
      { to: "L3", kind: "solid", direction: "bidirectional", label: "every edit is recorded" },
      { to: "L4", kind: "solid", direction: "uni", label: "becomes a shared proposal" },
    ],
  },
  {
    id: "L2",
    label: "The Component Library",
    subLabel: "components · brands · suppliers · variants · price history",
    status: "Live",
    band: "live",
    publicLabel: "Your real prices and suppliers, reusable.",
    edges: [
      // Cross-edges within the Live band (doc 04 §4.2 bidirectional ↔):
      { to: "L3", kind: "solid", direction: "bidirectional", label: "library edits are recorded" },
      { to: "L4", kind: "solid", direction: "bidirectional", label: "library components ship in the proposal" },
      { to: "B1", kind: "lighter", direction: "uni" },
    ],
  },
  {
    id: "L3",
    label: "The Activity Record",
    subLabel: "Activity · Node Activity · row Version History",
    status: "Live",
    band: "live",
    publicLabel: "Every revision, on the record.",
    edges: [
      { to: "L4", kind: "solid", direction: "bidirectional", label: "proposal activity is recorded" },
      { to: "B1", kind: "lighter", direction: "uni" },
    ],
  },
  {
    id: "L4",
    label: "The Proposal Handoff",
    subLabel: "shared links · comments · decisions · .xlsx",
    status: "Live",
    band: "live",
    publicLabel: "From estimate to a proposal your client can approve.",
    edges: [],
  },
  {
    id: "B1",
    label: "Surfacing",
    subLabel: "your own history, ready to hand",
    status: "Building",
    band: "building",
    publicLabel: "Your own history, ready to hand. (Building — in progress.)",
    edges: [{ to: "P1", kind: "dashed-accent", direction: "uni", label: "future bridge" }],
  },
  {
    id: "P1",
    label: "The Supplier Bridge",
    subLabel: "estimate → supplier",
    status: "Planned",
    band: "planned",
    publicLabel: "From your estimate to your suppliers. (Planned — on the roadmap.)",
    edges: [],
  },
] as const;

/** Quick id → node lookup for the renderer + the caption island. */
export const PLATE_NODE_BY_ID: ReadonlyMap<PlateNodeId, PlateNode> = new Map(
  PLATE_NODES.map((node) => [node.id, node]),
);

/** The ordered ids in DOM/visual order (L1 top, then band, then B1, then P1). */
export const PLATE_NODE_ORDER: readonly PlateNodeId[] = PLATE_NODES.map((n) => n.id);
