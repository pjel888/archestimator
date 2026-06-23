import { expect, test } from "@playwright/test";
import sharp from "sharp";

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
  { name: "narrow", width: 320, height: 812 },
] as const;

test.describe("frontdoor landing visual proof", () => {
  for (const viewport of VIEWPORTS) {
    test(`${viewport.name} renders without overflow and with a live hero field`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/", { waitUntil: "networkidle" });

      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "Your cost intelligence workspace.",
        }),
      ).toBeVisible();

      const overflow = await page.evaluate(() => {
        const documentWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
        return {
          documentWidth,
          windowWidth: window.innerWidth,
          hasOverflow: documentWidth > window.innerWidth + 1,
        };
      });
      expect(overflow).toMatchObject({ hasOverflow: false });

      await page.waitForFunction(() => {
        const canvas = document.querySelector<HTMLCanvasElement>("canvas[data-three-hero]");
        return canvas?.dataset.threeHero === "ready";
      });

      await page.waitForTimeout(400);

      const canvasBox = await page.locator("canvas[data-three-hero='ready']").boundingBox();
      expect(canvasBox).not.toBeNull();
      expect(canvasBox?.width).toBeGreaterThan(0);
      expect(canvasBox?.height).toBeGreaterThan(0);

      const box = canvasBox!;
      const fieldShot = await page.screenshot({
        clip: {
          x: box.x + box.width * 0.48,
          y: box.y + box.height * 0.12,
          width: Math.max(80, box.width * 0.42),
          height: Math.max(120, box.height * 0.62),
        },
      });

      const { data, info } = await sharp(fieldShot)
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      let min = 255;
      let max = 0;
      const buckets = new Set<string>();
      for (let index = 0; index < data.length; index += info.channels) {
        const r = data[index] ?? 0;
        const g = data[index + 1] ?? 0;
        const b = data[index + 2] ?? 0;
        const luma = Math.round((r + g + b) / 3);
        min = Math.min(min, luma);
        max = Math.max(max, luma);
        buckets.add(`${Math.floor(r / 12)}:${Math.floor(g / 12)}:${Math.floor(b / 12)}`);
      }

      expect(max - min).toBeGreaterThan(8);
      expect(buckets.size).toBeGreaterThan(12);
    });
  }
});
