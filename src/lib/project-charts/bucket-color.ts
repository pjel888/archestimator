/**
 * Stable, colorblind-safe categorical color for project chart buckets.
 *
 * Replaces the old per-series rank-index assignment
 * (`aggregate-project-charts.ts` `toBucket`), which gave the *same* category a
 * *different* color in each estimate column — a correctness bug, because color is
 * the cross-reference linking a chart mark to its table row and to the matching
 * mark in the other estimate (`03` UX-7, `06` A11Y-5/6).
 *
 * The mapping is a pure function of the bucket id, so the same bucket is the same
 * color in every series, every band, every render. The palette is the Okabe–Ito
 * 8-color CVD-safe set (`04` §4): 7 categorical hues (black is reserved for
 * text/axes, so it is not a series color) plus a neutral grey for the "Other"
 * collapse bucket.
 *
 * Data-viz palette exception (`10` D-15 / `13` R-8): these hues may appear ONLY in
 * chart marks, legends, and data-table swatches — never in controls, chrome,
 * navigation, buttons, or headers. They are applied as inline `fill` /
 * `backgroundColor` values from this module, never as Tailwind utility classes,
 * so they cannot leak into the app design system.
 */

/** The shared "Other" collapse bucket id (kept in sync with aggregate-project-charts). */
export const OTHER_BUCKET_ID = "__other__";

/**
 * Okabe–Ito categorical series hues, ordered most-distinguishable-first so that a
 * small bucket set (the common case after the top-8 collapse) draws the widest
 * separations. Yellow is placed last because it is the weakest hue on white.
 */
export const OKABE_ITO_SERIES_COLORS = [
  "#0072B2", // blue
  "#E69F00", // orange
  "#009E73", // bluish green
  "#CC79A7", // reddish purple
  "#56B4E9", // sky blue
  "#D55E00", // vermillion
  "#F0E442", // yellow
] as const;

/** Neutral grey for the "Other" collapse bucket — intentionally NOT a series hue. */
export const OTHER_BUCKET_COLOR = "#9AA0A6";

/** The full CVD-safe palette a chart mark may use (series hues + Other grey). */
export const PROJECT_CHART_CVD_PALETTE = [...OKABE_ITO_SERIES_COLORS, OTHER_BUCKET_COLOR] as const;

const PALETTE_SET = new Set<string>(PROJECT_CHART_CVD_PALETTE);

/** Deterministic 32-bit FNV-1a hash of a string. Pure; stable across processes. */
function fnv1a(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    // 32-bit FNV prime multiply via shifts to stay in safe-integer range.
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Stable categorical color for a bucket id.
 *
 * Pure and deterministic: `colorForBucket(id)` always returns the same hue for the
 * same id, so a bucket keeps its color across estimates, grouping modes, and
 * re-renders. The "Other" bucket always resolves to the neutral grey.
 */
export function colorForBucket(bucketId: string): string {
  if (bucketId === OTHER_BUCKET_ID) {
    return OTHER_BUCKET_COLOR;
  }
  const index = fnv1a(bucketId) % OKABE_ITO_SERIES_COLORS.length;
  return OKABE_ITO_SERIES_COLORS[index];
}

/** True when a color is part of the approved CVD-safe palette. */
export function isCvdSafeBucketColor(color: string): boolean {
  return PALETTE_SET.has(color);
}
