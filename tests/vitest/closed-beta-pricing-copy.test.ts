import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const pricingPage = readFileSync(join(process.cwd(), "src/app/pricing/page.tsx"), "utf8");
const landingPricing = readFileSync(join(process.cwd(), "src/components/landing/PricingSection.tsx"), "utf8");

describe("closed beta pricing copy", () => {
  it("frames /pricing as invite-only beta access with no payment rail", () => {
    expect(pricingPage).toMatch(/closed beta/i);
    expect(pricingPage).toMatch(/invite-only/i);
    expect(pricingPage).toMatch(/No payment is required/i);
    expect(pricingPage).toMatch(/pricing will be announced after beta/i);
    expect(pricingPage).toMatch(/href=["']\/contact["']/);
    expect(pricingPage).not.toMatch(/₱0|MVP preview pricing|professional pricing tiers|Try Workspace/i);
  });

  it("keeps landing access copy product-led instead of beta-led", () => {
    const combined = landingPricing;

    expect(combined).toMatch(/Private access\. Real quote work/i);
    expect(combined).toMatch(/request access/i);
    expect(combined).not.toMatch(/closed beta|beta access|after beta/i);
    expect(combined).not.toMatch(/₱0|free access|MVP preview offers free access|pricing tiers/i);
  });
});
