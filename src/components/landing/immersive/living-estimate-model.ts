/**
 * The Living Estimate — deterministic scene-state model.
 *
 * Single source of truth for the `/new` Living Estimate scene: the four
 * narrative states and the pure layout math the Three.js scene tweens
 * toward. Intentionally free of three.js / React imports so any consumer
 * (scene, story driver, future tests) can use it. Every state is absolute
 * (not cumulative), so arbitrary state jumps always land on a coherent
 * composition — forward and backward scroll scrubs stay coherent.
 *
 * The scene is fully abstract: plates, a total band, a proposal plane, a
 * review pin, and a ghost plate. No amounts, no fixture copy, no overlay
 * captions — meaning lives in the semantic DOM copy.
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
  /** Signal-orange emphasis plate that slides under the reviewed row. */
  highlight: [3.09, 0.025, 0.59],
  highlightPosition: [3.3, 0.035, -0.56],
  /** Small orange source marker cube. */
  marker: 0.15,
  /** Review pin (octahedron diamond) radius. */
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

/** Index of the reviewed / revised row plate. */
export const REVIEWED_ROW_INDEX = 8;

/** Row plates that carry a source marker in the scene. */
export const SOURCED_ROW_INDICES: readonly number[] = [5, 8];

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

  const reviewed = rows[REVIEWED_ROW_INDEX];

  // Review: the reviewed row lifts off the compressed stack.
  if (state === "review") {
    reviewed.y = 0.3;
  }
  // Revision: the row extrudes slightly upward-forward at full size; the
  // ghost plate below keeps the prior state visible. y must clear the
  // proposal plane top (0.5 + 0.05/2 = 0.525) where their footprints cross.
  if (state === "revision") {
    reviewed.x = 3.42;
    reviewed.y = 0.68;
    reviewed.z = -0.26;
    reviewed.sx = 1;
    reviewed.sy = 1.35;
    reviewed.sz = 1;
  }

  const proposalShown = compressed;
  const proposal: ProposalTransform = proposalShown
    ? { x: 3.1, y: 0.5, z: 1.15, s: 1, ry: -0.14 }
    : { x: 1.2, y: -1.8, z: 5.5, s: 0.0001, ry: -0.18 };

  const pinShown = state === "review" || state === "revision";
  const pin: PinTransform = pinShown
    ? { x: reviewed.x + 1.0, y: reviewed.y + 0.72, z: reviewed.z, s: 1 }
    // Parked at the review attachment point (invisible, s = 0) so the pin
    // scales up in place when feedback lands.
    : { x: 4.3, y: 1.02, z: -0.56, s: 0 };

  const highlight = { s: pinShown ? 1 : 0 };

  // The ghost sits at the reviewed row's review-era position — when the
  // row shifts up-forward in revision, the prior state stays visible.
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
 * proposal plane → review pin, with raised midpoints so each leg of the
 * thread reads as a clean arc. Derived from the layout targets so the
 * thread always lands exactly where the objects will be.
 */
export function computeThreadAnchors(state: LivingEstimateState): Vec3Tuple[] {
  const layout = computeLivingEstimateLayout(state);
  const reviewed = layout.rows[REVIEWED_ROW_INDEX];
  const rowW = SCENE_DIMENSIONS.row[0];

  const start: Vec3Tuple = [reviewed.x + (rowW * reviewed.sx) / 2 + 0.02, reviewed.y + 0.12, reviewed.z];
  const bandTop: Vec3Tuple = [Math.min(reviewed.x + 0.6, 3.4), 0.22, layout.totalBand.z];

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
