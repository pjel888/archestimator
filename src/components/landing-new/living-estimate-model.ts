/**
 * The Living Estimate — deterministic scene-state model + fixture data.
 *
 * This module is the single source of truth for the `/new` hero scene:
 * the four narrative states, their labels, the DOM overlay copy, the
 * illustrative fixture, and the pure layout math that the Three.js scene
 * tweens toward. It is intentionally free of three.js / React imports so
 * any consumer (scene, controls, loader, future tests) can use it.
 *
 * ALL figures below are ILLUSTRATIVE. Amounts are hardcoded, pre-formatted
 * display strings — no client-side math is performed anywhere.
 */

/* ------------------------------------------------------------------ */
/* States                                                              */
/* ------------------------------------------------------------------ */

export type LivingEstimateState = "estimate" | "proposal" | "review" | "revision";

export const LIVING_ESTIMATE_STATES: readonly LivingEstimateState[] = [
  "estimate",
  "proposal",
  "review",
  "revision",
] as const;

export const LIVING_ESTIMATE_STATE_LABELS: Record<LivingEstimateState, string> = {
  estimate: "Estimate",
  proposal: "Proposal",
  review: "Review",
  revision: "Revision",
};

/* ------------------------------------------------------------------ */
/* Illustrative fixture (PHP, pre-formatted strings — never computed)  */
/* ------------------------------------------------------------------ */

/** Illustrative project identity shown in the overlay kicker. */
export const LIVING_ESTIMATE_PROJECT = "Makati Workplace Fit-Out · Cost plan · Revision B";

/** Illustrative estimate total (pre-formatted). */
export const LIVING_ESTIMATE_TOTAL = "₱6,502,170";

/** Illustrative client comment that lands on the joinery row. */
export const LIVING_ESTIMATE_COMMENT =
  "Can we review the reception millwork finish against the Level 2 lobby palette?";

/** Illustrative prior/current amounts for the revised joinery row. */
export const JOINERY_PRIOR_AMOUNT = "₱864,000";
export const JOINERY_CURRENT_AMOUNT = "₱912,000";

export interface LivingEstimateRow {
  group: string;
  name: string;
  /** Pre-formatted illustrative amount. */
  amount: string;
  /** True when the row visibly keeps a source marker in the scene. */
  sourced: boolean;
}

/**
 * The twelve illustrative estimate rows behind the twelve scene plates,
 * in three groups of four. Amounts sum to LIVING_ESTIMATE_TOTAL by hand.
 */
export const LIVING_ESTIMATE_ROWS: readonly LivingEstimateRow[] = [
  // Preliminaries and enabling works
  { group: "Preliminaries", name: "Site establishment and protection", amount: "₱214,500", sourced: false },
  { group: "Preliminaries", name: "Demolition and strip-out", amount: "₱186,300", sourced: false },
  { group: "Preliminaries", name: "Temporary services and hoarding", amount: "₱97,400", sourced: false },
  { group: "Preliminaries", name: "Builder's cleaning and waste", amount: "₱88,900", sourced: false },
  // Fit-out and finishes
  { group: "Fit-out", name: "Partitions and glazed screens", amount: "₱812,400", sourced: false },
  { group: "Fit-out", name: "Floor finishes — Levels 1–2", amount: "₱1,148,600", sourced: true },
  { group: "Fit-out", name: "Ceiling systems and acoustic treatment", amount: "₱964,300", sourced: false },
  { group: "Fit-out", name: "Decorative finishes and wall coverings", amount: "₱742,800", sourced: false },
  // Joinery
  { group: "Joinery", name: "Reception and pantry millwork", amount: "₱912,000", sourced: true },
  { group: "Joinery", name: "Executive office casework", amount: "₱428,600", sourced: false },
  { group: "Joinery", name: "Storage and locker joinery", amount: "₱312,400", sourced: false },
  { group: "Joinery", name: "Feature stair balustrade trim", amount: "₱593,970", sourced: false },
] as const;

/** Index of the commented / revised "Reception and pantry millwork" row. */
export const JOINERY_ROW_INDEX = 8;

/** Rows that carry a pinned source marker in the scene (joinery included). */
export const SOURCED_ROW_INDICES: readonly number[] = [5, 8];

/* ------------------------------------------------------------------ */
/* DOM overlay copy (per state)                                        */
/* ------------------------------------------------------------------ */

export interface LivingEstimateOverlay {
  caption: string;
  detail: string;
}

export const LIVING_ESTIMATE_OVERLAYS: Record<LivingEstimateState, LivingEstimateOverlay> = {
  estimate: {
    caption: "Rows keep their source",
    detail: "Joinery · Reception and pantry millwork · ₱912,000 · Supplier quote attached",
  },
  proposal: {
    caption: "The estimate becomes the proposal",
    detail: "Makati Workplace Fit-Out · Total ₱6,502,170",
  },
  review: {
    caption: "Feedback lands on the exact line",
    detail: `${LIVING_ESTIMATE_COMMENT} · Status · In review`,
  },
  revision: {
    caption: "The number changes, the reason stays",
    detail: "₱864,000 → ₱912,000 · Revision B",
  },
};

/* ------------------------------------------------------------------ */
/* Scene dimensions (shared by the model math and the three.js scene)  */
/* ------------------------------------------------------------------ */

export const SCENE_DIMENSIONS = {
  /** Thin estimate-row plate. */
  row: [3.3, 0.13, 0.52],
  /** Group header plate — graphite, slightly wider than a row. */
  header: [3.44, 0.16, 0.58],
  /** Total band — spans the full ledger width. */
  totalBand: [10.4, 0.18, 0.62],
  /** Proposal document — flat paper sheet over a graphite backer. */
  proposal: [2.6, 0.05, 3.5],
  proposalBacker: [2.74, 0.03, 3.64],
  /** Signal-orange emphasis plate that slides under the joinery row. */
  highlight: [3.09, 0.025, 0.59],
  highlightPosition: [3.3, 0.035, -0.56],
  /** Small orange source marker cube. */
  marker: 0.15,
  /** Comment pin (octahedron diamond) radius. */
  pinRadius: 0.09,
  /** Cost thread tube radius. */
  threadRadius: 0.028,
} as const;

/* ------------------------------------------------------------------ */
/* Layout math — pure and deterministic                                */
/* ------------------------------------------------------------------ */

export interface PlateTransform {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  /** Rotation around Y (radians). */
  ry: number;
}

export interface GhostTransform extends PlateTransform {
  opacity: number;
}

export interface ProposalTransform {
  x: number;
  y: number;
  z: number;
  /** Uniform scale — 0.0001 parks the document invisibly. */
  s: number;
  ry: number;
}

export interface PinTransform {
  x: number;
  y: number;
  z: number;
  /** Uniform scale — 0 parks the pin invisibly. */
  s: number;
}

export interface LivingEstimateLayout {
  rows: PlateTransform[];
  headers: PlateTransform[];
  totalBand: PlateTransform;
  proposal: ProposalTransform;
  pin: PinTransform;
  highlight: { s: number };
  ghost: GhostTransform;
}

const ROW_COUNT = 12;
const GROUP_COUNT = 3;
const ROWS_PER_GROUP = 4;

/** Open ledger (estimate): three group columns side by side. */
const OPEN = { colX: 3.55, slot: 0.62, scale: 1 } as const;
/**
 * Compressed stack (proposal onward): tighter columns and slots. Column
 * pitch (3.3) must stay >= scaled row width (3.3 * 0.9 = 2.97) plus the
 * source-marker gap, or neighbouring columns interpenetrate and z-fight.
 */
const TIGHT = { colX: 3.3, slot: 0.56, scale: 0.9 } as const;

const TOTAL_BAND_BASE: PlateTransform = { x: 0, y: 0, z: 2.2, sx: 1, sy: 1, sz: 1, ry: 0 };

function rowSlot(index: number): { group: number; slot: number } {
  return { group: Math.floor(index / ROWS_PER_GROUP), slot: (index % ROWS_PER_GROUP) + 1 };
}

function openRow(index: number): PlateTransform {
  const { group, slot } = rowSlot(index);
  return {
    x: (group - 1) * OPEN.colX,
    y: 0,
    z: (slot - 2) * OPEN.slot,
    sx: OPEN.scale,
    sy: 1,
    sz: OPEN.scale,
    ry: 0,
  };
}

function tightRow(index: number): PlateTransform {
  const { group, slot } = rowSlot(index);
  return {
    x: (group - 1) * TIGHT.colX,
    y: 0,
    z: (slot - 2) * TIGHT.slot,
    sx: TIGHT.scale,
    sy: 1,
    sz: TIGHT.scale,
    ry: 0,
  };
}

function openHeader(group: number): PlateTransform {
  return { x: (group - 1) * OPEN.colX, y: 0, z: -2 * OPEN.slot, sx: OPEN.scale, sy: 1, sz: OPEN.scale, ry: 0 };
}

function tightHeader(group: number): PlateTransform {
  return { x: (group - 1) * TIGHT.colX, y: 0, z: -2 * TIGHT.slot, sx: TIGHT.scale, sy: 1, sz: TIGHT.scale, ry: 0 };
}

/**
 * Full per-state target transforms for every scene object. Each state is
 * absolute (not cumulative), so arbitrary state jumps always land on a
 * coherent composition.
 */
export function computeLivingEstimateLayout(state: LivingEstimateState): LivingEstimateLayout {
  const compressed = state !== "estimate";
  const rows = Array.from({ length: ROW_COUNT }, (_, index) =>
    compressed ? tightRow(index) : openRow(index),
  );
  const headers = Array.from({ length: GROUP_COUNT }, (_, group) =>
    compressed ? tightHeader(group) : openHeader(group),
  );

  const joinery = rows[JOINERY_ROW_INDEX];

  // Review: the commented row lifts off the compressed stack.
  if (state === "review") {
    joinery.y = 0.3;
  }
  // Revision: the row extrudes slightly upward-forward at full size; the
  // ghost plate below keeps the prior state visible. y must clear the
  // proposal plane top (0.5 + 0.05/2 = 0.525) where their footprints cross.
  if (state === "revision") {
    joinery.x = 3.42;
    joinery.y = 0.68;
    joinery.z = -0.26;
    joinery.sx = 1;
    joinery.sy = 1.35;
    joinery.sz = 1;
  }

  const proposalShown = compressed;
  const proposal: ProposalTransform = proposalShown
    ? { x: 3.1, y: 0.5, z: 1.15, s: 1, ry: -0.14 }
    : { x: 1.2, y: -1.8, z: 5.5, s: 0.0001, ry: -0.18 };

  const pinShown = state === "review" || state === "revision";
  const pin: PinTransform = pinShown
    ? { x: joinery.x + 1.0, y: joinery.y + 0.72, z: joinery.z, s: 1 }
    // Parked at the review attachment point (invisible, s = 0) so the pin
    // scales up in place when feedback lands.
    : { x: 4.3, y: 1.02, z: -0.56, s: 0 };

  const highlight = { s: pinShown ? 1 : 0 };

  // The ghost sits at the joinery row's review-era position — when the row
  // shifts up-forward in revision, the prior state stays visible behind it.
  const ghost: GhostTransform = {
    x: 3.3,
    y: 0.3,
    z: -0.62,
    sx: TIGHT.scale,
    sy: 1,
    sz: TIGHT.scale,
    ry: 0,
    opacity: state === "revision" ? 0.25 : 0,
  };

  return { rows, headers, totalBand: { ...TOTAL_BAND_BASE }, proposal, pin, highlight, ghost };
}

/* ------------------------------------------------------------------ */
/* Cost thread anchors                                                 */
/* ------------------------------------------------------------------ */

export type Vec3Tuple = [number, number, number];

/**
 * Anchor points for the Cost Thread curve: source row → total band →
 * proposal plane → comment pin, with raised midpoints so each leg of the
 * thread reads as a clean arc. Derived from the layout targets so the
 * thread always lands exactly where the objects will be.
 */
export function computeThreadAnchors(state: LivingEstimateState): Vec3Tuple[] {
  const layout = computeLivingEstimateLayout(state);
  const joinery = layout.rows[JOINERY_ROW_INDEX];
  const rowW = SCENE_DIMENSIONS.row[0];

  const start: Vec3Tuple = [joinery.x + (rowW * joinery.sx) / 2 + 0.02, joinery.y + 0.12, joinery.z];
  const bandTop: Vec3Tuple = [Math.min(joinery.x + 0.6, 3.4), 0.22, layout.totalBand.z];

  const anchors: Vec3Tuple[] = [
    start,
    [start[0] + 0.3, Math.max(0.55, start[1] + 0.35), (start[2] + layout.totalBand.z) / 2],
    bandTop,
  ];

  if (state !== "estimate") {
    const proposal = layout.proposal;
    anchors.push(
      [proposal.x + 0.55, proposal.y + 0.5, proposal.z + 0.6],
      [proposal.x, proposal.y + 0.14, proposal.z],
    );
  }

  if (state === "review" || state === "revision") {
    const pin = layout.pin;
    anchors.push(
      [pin.x + 0.5, pin.y + 0.4, (pin.z + layout.proposal.z) / 2],
      [pin.x, pin.y - 0.12, pin.z],
    );
  }

  return anchors;
}
