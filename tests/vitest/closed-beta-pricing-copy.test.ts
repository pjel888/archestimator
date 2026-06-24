import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const pricingPage = readFileSync(join(process.cwd(), "src/app/pricing/page.tsx"), "utf8");

describe("closed beta pricing copy", () => {
  it("frames /pricing as unpublished hypothesis copy with no payment rail", () => {
    expect(pricingPage).toMatch(/Pricing numbers are a hypothesis/i);
    expect(pricingPage).toMatch(/not a published price/i);
    expect(pricingPage).toMatch(/will be published once/i);
    expect(pricingPage).not.toMatch(/₱0|MVP preview pricing|professional pricing tiers|Try Workspace|checkout|payment/i);
  });

  it("keeps beta access copy on active signup and contact routes", () => {
    const combined = [
      readFileSync(join(process.cwd(), "src/app/signup/page.tsx"), "utf8"),
      readFileSync(join(process.cwd(), "src/app/contact/page.tsx"), "utf8"),
    ].join("\n");

    expect(combined).toMatch(/closed beta/i);
    expect(combined).toMatch(/request access/i);
    expect(combined).not.toMatch(/₱0|free access|MVP preview offers free access|pricing tiers|checkout/i);
  });
  it("keeps active public product copy away from old quote-sheet phrasing", () => {
    const publicCopySources = [
      readFileSync(join(process.cwd(), "src/app/features/page.tsx"), "utf8"),
      readFileSync(join(process.cwd(), "src/app/pricing/page.tsx"), "utf8"),
      readFileSync(join(process.cwd(), "src/app/about/page.tsx"), "utf8"),
    ].join("\n");

    expect(publicCopySources).not.toMatch(/structured quote sheets/i);
    expect(publicCopySources).not.toMatch(/multi-sheet estimates/i);
    expect(publicCopySources).not.toMatch(/multiple quote sheets/i);
    expect(publicCopySources).not.toMatch(/version-labeled sheets/i);
    expect(publicCopySources).not.toMatch(/quote sheets(?!\?)/i);
    expect(publicCopySources).not.toMatch(/structured sheet/i);
  });

});
