import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const pricingPage = readFileSync(join(process.cwd(), "src/app/pricing/page.tsx"), "utf8");
const landingPricing = readFileSync(join(process.cwd(), "src/components/landing/PricingSection.tsx"), "utf8");
const landingFaq = readFileSync(join(process.cwd(), "src/components/landing/FAQSection.tsx"), "utf8");

describe("closed beta pricing copy", () => {
  it("frames /pricing as invite-only beta access with no payment rail", () => {
    expect(pricingPage).toMatch(/closed beta/i);
    expect(pricingPage).toMatch(/invite-only/i);
    expect(pricingPage).toMatch(/No payment is required/i);
    expect(pricingPage).toMatch(/pricing will be announced after beta/i);
    expect(pricingPage).toMatch(/href=["']\/contact["']/);
    expect(pricingPage).not.toMatch(/₱0|MVP preview pricing|professional pricing tiers|Try Workspace/i);
  });

  it("removes free-tier language from the landing pricing and FAQ sections", () => {
    const combined = `${landingPricing}\n${landingFaq}`;

    expect(combined).toMatch(/closed beta/i);
    expect(combined).toMatch(/request access/i);
    expect(combined).not.toMatch(/₱0|free access|MVP preview offers free access|pricing tiers/i);
  });
  it("keeps public product copy aligned to estimates and tabs outside Excel/spreadsheet contexts", () => {
    const publicCopySources = [
      readFileSync(join(process.cwd(), "src/app/features/page.tsx"), "utf8"),
      readFileSync(join(process.cwd(), "src/app/pricing/page.tsx"), "utf8"),
      readFileSync(join(process.cwd(), "src/app/about/page.tsx"), "utf8"),
      readFileSync(join(process.cwd(), "src/components/landing/AnimatedProposalRecordSection.tsx"), "utf8"),
      readFileSync(join(process.cwd(), "src/components/landing/FeaturesSection.tsx"), "utf8"),
      readFileSync(join(process.cwd(), "src/components/landing/PricingSection.tsx"), "utf8"),
    ].join("\n");

    expect(publicCopySources).toMatch(/structured estimate tabs/i);
    expect(publicCopySources).not.toMatch(/structured quote sheets/i);
    expect(publicCopySources).not.toMatch(/multi-sheet estimates/i);
    expect(publicCopySources).not.toMatch(/multiple quote sheets/i);
    expect(publicCopySources).not.toMatch(/version-labeled sheets/i);
    expect(publicCopySources).not.toMatch(/quote sheets(?!\?)/i);
    expect(publicCopySources).not.toMatch(/structured sheet/i);

    expect(landingFaq).toMatch(/Excel quote sheets/i);
    expect(landingFaq).toMatch(/spreadsheet\/document handoff/i);
  });

});
