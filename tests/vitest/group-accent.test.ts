import { describe, expect, it } from "vitest";

import {
  DEFAULT_GROUP_ACCENT,
  GROUP_ACCENT_SWATCHES,
  type GroupAccentId,
  isGroupAccentColor,
  resolveAccent,
} from "@/lib/workshop/group-accent";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const EXPECTED_IDS: readonly GroupAccentId[] = [
  "slate",
  "stone",
  "sage",
  "teal",
  "indigo",
  "plum",
  "rose",
  "clay",
];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const match = HEX_RE.exec(hex.trim());
  if (!match) {
    throw new Error(`Not a 6-digit hex color: ${hex}`);
  }
  const value = hex.trim().slice(1);
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

describe("GROUP_ACCENT_SWATCHES palette purity", () => {
  it("has exactly 8 swatches", () => {
    expect(GROUP_ACCENT_SWATCHES).toHaveLength(8);
  });

  it("exposes exactly the 8 accent ids in contract order", () => {
    expect(GROUP_ACCENT_SWATCHES.map((swatch) => swatch.id)).toEqual(EXPECTED_IDS);
  });

  it("gives every swatch a non-empty label", () => {
    for (const swatch of GROUP_ACCENT_SWATCHES) {
      expect(swatch.label.length).toBeGreaterThan(0);
    }
  });

  it("gives every swatch valid 6-digit hex rule/dot colors", () => {
    for (const swatch of GROUP_ACCENT_SWATCHES) {
      expect(swatch.ruleColor).toMatch(HEX_RE);
      expect(swatch.dotColor).toMatch(HEX_RE);
    }
  });

  it("uses unique ids across the palette", () => {
    const ids = GROUP_ACCENT_SWATCHES.map((swatch) => swatch.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("DEFAULT_GROUP_ACCENT (neutral) is distinct from slate", () => {
  it('uses the "neutral" sentinel id', () => {
    expect(DEFAULT_GROUP_ACCENT.id).toBe("neutral");
  });

  it("is not a member of GROUP_ACCENT_SWATCHES", () => {
    const ids = GROUP_ACCENT_SWATCHES.map((swatch) => swatch.id);
    expect(ids).not.toContain("neutral");
    expect(GROUP_ACCENT_SWATCHES).not.toContain(DEFAULT_GROUP_ACCENT);
  });

  it("differs in color from the slate swatch", () => {
    const slate = GROUP_ACCENT_SWATCHES.find((swatch) => swatch.id === "slate");
    expect(slate).toBeDefined();
    expect(DEFAULT_GROUP_ACCENT.ruleColor.toLowerCase()).not.toBe(
      slate?.ruleColor.toLowerCase(),
    );
    expect(DEFAULT_GROUP_ACCENT.dotColor.toLowerCase()).not.toBe(
      slate?.dotColor.toLowerCase(),
    );
  });

  it("has valid 6-digit hex colors of its own", () => {
    expect(DEFAULT_GROUP_ACCENT.ruleColor).toMatch(HEX_RE);
    expect(DEFAULT_GROUP_ACCENT.dotColor).toMatch(HEX_RE);
  });
});

describe("resolveAccent", () => {
  it("resolves each known token to that swatch's colors", () => {
    for (const swatch of GROUP_ACCENT_SWATCHES) {
      expect(resolveAccent(swatch.id)).toEqual({
        ruleColor: swatch.ruleColor,
        dotColor: swatch.dotColor,
      });
    }
  });

  it("falls back to DEFAULT colors for null", () => {
    expect(resolveAccent(null)).toEqual({
      ruleColor: DEFAULT_GROUP_ACCENT.ruleColor,
      dotColor: DEFAULT_GROUP_ACCENT.dotColor,
    });
  });

  it("falls back to DEFAULT colors for undefined", () => {
    expect(resolveAccent(undefined)).toEqual({
      ruleColor: DEFAULT_GROUP_ACCENT.ruleColor,
      dotColor: DEFAULT_GROUP_ACCENT.dotColor,
    });
  });

  it("falls back to DEFAULT colors for an unknown string", () => {
    expect(resolveAccent("bogus")).toEqual({
      ruleColor: DEFAULT_GROUP_ACCENT.ruleColor,
      dotColor: DEFAULT_GROUP_ACCENT.dotColor,
    });
  });

  it('treats the "neutral" sentinel as unknown (never persisted) → DEFAULT', () => {
    expect(resolveAccent("neutral")).toEqual({
      ruleColor: DEFAULT_GROUP_ACCENT.ruleColor,
      dotColor: DEFAULT_GROUP_ACCENT.dotColor,
    });
  });

  it("falls back to DEFAULT colors for an empty string", () => {
    expect(resolveAccent("")).toEqual({
      ruleColor: DEFAULT_GROUP_ACCENT.ruleColor,
      dotColor: DEFAULT_GROUP_ACCENT.dotColor,
    });
  });
});

describe("non-brand-orange guard", () => {
  const BRAND_ORANGE = { r: 170, g: 65, b: 42 }; // #AA412A

  const allHexes = [
    ...GROUP_ACCENT_SWATCHES.flatMap((swatch) => [swatch.ruleColor, swatch.dotColor]),
    DEFAULT_GROUP_ACCENT.ruleColor,
    DEFAULT_GROUP_ACCENT.dotColor,
  ];

  it("contains no exact brand-orange token", () => {
    const lowered = allHexes.map((hex) => hex.toLowerCase());
    expect(lowered).not.toContain("#aa412a");
  });

  it("contains no color that reads as orange/vermillion (high r, low g, low b)", () => {
    for (const hex of allHexes) {
      const { r, g, b } = hexToRgb(hex);
      // Orange/vermillion signature: strong red channel with suppressed
      // green and blue. None of our muted swatches should hit this.
      expect(r > 180 && g < 110 && b < 90).toBe(false);
    }
  });

  it("keeps every swatch away from the brand-orange point (Euclidean tolerance)", () => {
    const TOLERANCE = 40;
    for (const hex of allHexes) {
      const { r, g, b } = hexToRgb(hex);
      const distance = Math.sqrt(
        (r - BRAND_ORANGE.r) ** 2 +
          (g - BRAND_ORANGE.g) ** 2 +
          (b - BRAND_ORANGE.b) ** 2,
      );
      expect(distance).toBeGreaterThan(TOLERANCE);
    }
  });
});

describe("isGroupAccentColor", () => {
  it("returns true for a palette rule color", () => {
    expect(isGroupAccentColor("#4E8A86")).toBe(true); // teal rule
  });

  it("returns true for a palette dot color", () => {
    expect(isGroupAccentColor("#87664F")).toBe(true); // clay dot
  });

  it("matches case-insensitively", () => {
    expect(isGroupAccentColor("#4e8a86")).toBe(true);
    expect(isGroupAccentColor("  #4E8A86  ")).toBe(true);
  });

  it("returns false for brand orange", () => {
    expect(isGroupAccentColor("#AA412A")).toBe(false);
  });

  it("returns false for an arbitrary non-palette color", () => {
    expect(isGroupAccentColor("#123456")).toBe(false);
  });

  it("excludes the neutral default's colors (guard targets group accents only)", () => {
    expect(isGroupAccentColor(DEFAULT_GROUP_ACCENT.ruleColor)).toBe(false);
    expect(isGroupAccentColor(DEFAULT_GROUP_ACCENT.dotColor)).toBe(false);
  });
});
