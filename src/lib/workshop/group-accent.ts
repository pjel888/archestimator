/**
 * Project Groups color-accent palette.
 *
 * A self-contained, dependency-free module that defines the fixed set of
 * group accent swatches and pure helpers to resolve/validate them.
 *
 * Design constraints:
 * - Accent colors are applied ONLY via inline style (a 3px left rule and a
 *   6px dot). They are NEVER applied to text and NEVER emitted as Tailwind
 *   utility classes.
 * - The palette is provably non-brand-orange: no swatch reads as the brand
 *   orange (#AA412A / rgb(170,65,42)) or any vermillion/orange hue.
 * - `DEFAULT_GROUP_ACCENT.id` is "neutral" — a distinct sentinel that is NOT a
 *   member of `GROUP_ACCENT_SWATCHES` and is never persisted. Only the 8
 *   `GroupAccentId` tokens are ever written to `accent_id`.
 */

export type GroupAccentId =
  | "slate"
  | "stone"
  | "sage"
  | "teal"
  | "indigo"
  | "plum"
  | "rose"
  | "clay";

export type GroupAccentSwatch = {
  id: GroupAccentId | "neutral";
  label: string;
  ruleColor: string; // hex, inline-style only (3px left rule)
  dotColor: string; // hex, inline-style only (6px dot)
};

export const GROUP_ACCENT_SWATCHES: readonly GroupAccentSwatch[] = [
  { id: "slate", label: "Slate", ruleColor: "#6B7785", dotColor: "#5A6573" },
  { id: "stone", label: "Stone", ruleColor: "#8A8279", dotColor: "#756E66" },
  { id: "sage", label: "Sage", ruleColor: "#6E8267", dotColor: "#5C6E56" },
  { id: "teal", label: "Teal", ruleColor: "#4E8A86", dotColor: "#3F7470" },
  { id: "indigo", label: "Indigo", ruleColor: "#6471A6", dotColor: "#515D90" },
  { id: "plum", label: "Plum", ruleColor: "#8A6B8C", dotColor: "#74577A" },
  { id: "rose", label: "Rose", ruleColor: "#B07089", dotColor: "#9A5E78" },
  { id: "clay", label: "Clay", ruleColor: "#9C7A66", dotColor: "#87664F" },
] as const;

export const DEFAULT_GROUP_ACCENT: GroupAccentSwatch = {
  id: "neutral",
  label: "Neutral",
  ruleColor: "#C7CAD1",
  dotColor: "#9AA0A6",
};

/**
 * Resolve an accent token (or null/unknown) to its colors.
 *
 * Pure. Returns the matching swatch's colors when `accentId` is one of the 8
 * persisted `GroupAccentId` tokens; otherwise falls back to
 * `DEFAULT_GROUP_ACCENT`'s colors (covers null, undefined, "" and any unknown
 * string, including the never-persisted "neutral" sentinel).
 */
export function resolveAccent(
  accentId: string | null | undefined,
): { ruleColor: string; dotColor: string } {
  if (accentId) {
    const match = GROUP_ACCENT_SWATCHES.find((swatch) => swatch.id === accentId);
    if (match) {
      return { ruleColor: match.ruleColor, dotColor: match.dotColor };
    }
  }
  return {
    ruleColor: DEFAULT_GROUP_ACCENT.ruleColor,
    dotColor: DEFAULT_GROUP_ACCENT.dotColor,
  };
}

/**
 * True when a color belongs to the accent palette (lint/review guard).
 *
 * Matches case-insensitively against the `ruleColor`/`dotColor` of the 8
 * persisted swatches. The neutral default's colors are intentionally EXCLUDED:
 * this guard exists to confirm that group-specific accent colors originate only
 * from this module's swatch set, and "neutral" is a generic fallback chrome
 * color rather than a chosen group accent.
 */
export function isGroupAccentColor(color: string): boolean {
  if (typeof color !== "string") {
    return false;
  }
  const normalized = color.trim().toLowerCase();
  return GROUP_ACCENT_SWATCHES.some(
    (swatch) =>
      swatch.ruleColor.toLowerCase() === normalized ||
      swatch.dotColor.toLowerCase() === normalized,
  );
}
