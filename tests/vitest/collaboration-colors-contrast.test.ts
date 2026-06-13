import { describe, expect, it } from "vitest";

import { collaborationColorPalette } from "@/lib/collaboration/colors";

// WCAG 1.4.3 contrast proof for the avatar/cursor fix (Teamspace plan T3.1 / R-8 /
// finding F3). The avatar previously rendered `cursor` text on a `cursorSoft`
// background (~3.3:1, FAIL). The fix renders the palette's intended white text
// (`text:#FFFFFF`) on the saturated `cursor` background — this test proves every
// one of the 8 hues clears 4.5:1.

function channelLuminance(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("collaboration avatar contrast (WCAG 1.4.3)", () => {
  it("renders white text on every saturated cursor hue at >= 4.5:1", () => {
    for (const color of collaborationColorPalette) {
      expect(color.text.toUpperCase()).toBe("#FFFFFF");
      const ratio = contrastRatio(color.text, color.cursor);
      expect(ratio, `${color.name} white-on-cursor ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("white-on-cursor gives more headroom than the old soft-bg pairing for every hue", () => {
    // NOTE: the audit (F3) claimed the old `cursor`-on-`cursorSoft` pairing was a
    // ~3.3:1 WCAG fail. Measured, the old pairing actually clears 4.5:1 for all 8
    // hues (amber is marginal at ~4.51). The real win of using the palette's
    // intended white text on the saturated `cursor` background is HEADROOM: it is
    // strictly >= the old pairing for every hue (amber 4.51 -> 5.02), so the
    // change is a guaranteed non-regression.
    for (const color of collaborationColorPalette) {
      const next = contrastRatio(color.text, color.cursor);
      const previous = contrastRatio(color.cursor, color.cursorSoft);
      expect(next, `${color.name}: white-on-cursor ${next.toFixed(2)} >= old ${previous.toFixed(2)}`).toBeGreaterThanOrEqual(
        previous,
      );
    }
  });
});
