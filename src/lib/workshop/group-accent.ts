/**
 * Project Groups color-accent palette.
 *
 * A self-contained, dependency-free module that defines the fixed set of
 * group accent swatches and pure helpers to resolve/validate them.
 *
 * Design constraints:
 * - Accent colors are applied ONLY via inline style. They are NEVER emitted as
 *   Tailwind utility classes.
 * - In the group-mode flag, the accent becomes the border color; a lighter tint
 *   of the accent becomes the background; and the label text is a contrast
 *   variant (dark on light, light on dark) so it stays readable.
 * - The palette is provably non-brand-orange: no swatch reads as the brand
 *   color (Signal #F24405 / rgb(242,68,5)) or any vermillion/orange hue.
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
  ruleColor: string; // hex, inline-style only
  dotColor: string; // hex, inline-style only (legacy, no longer rendered)
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

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const sanitized = hex.replace("#", "");
  if (!/^[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/.test(sanitized)) {
    return null;
  }
  const full =
    sanitized.length === 3
      ? sanitized
          .split("")
          .map((c) => c + c)
          .join("")
      : sanitized;
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function mixHex(hex: string, otherHex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  const other = hexToRgb(otherHex);
  if (!rgb || !other) {
    return hex;
  }
  const p = Math.max(0, Math.min(100, percent)) / 100;
  const mix = (channel: number, otherChannel: number) =>
    Math.round(channel * p + otherChannel * (1 - p));
  return rgbToHex(
    mix(rgb.r, other.r),
    mix(rgb.g, other.g),
    mix(rgb.b, other.b),
  );
}

function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return 1;
  }
  const srgb = [rgb.r, rgb.g, rgb.b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

/**
 * Colors for the group-mode flag derived from a group's accent.
 *
 * - `borderColor` is the accent color itself (matches the horizontal rule).
 * - `backgroundColor` is a lighter tint of the accent.
 * - `textColor` adapts to the background: dark on light, light on dark.
 */
export function getGroupFlagColors(accentId: string | null | undefined): {
  borderColor: string;
  backgroundColor: string;
  textColor: string;
} {
  const { ruleColor } = resolveAccent(accentId);
  const backgroundColor = mixHex(ruleColor, "#FFFFFF", 20);
  const luminance = getLuminance(backgroundColor);
  const textColor =
    luminance > 0.5
      ? mixHex(ruleColor, "#000000", 75)
      : mixHex(ruleColor, "#FFFFFF", 90);
  return {
    borderColor: ruleColor,
    backgroundColor,
    textColor,
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
