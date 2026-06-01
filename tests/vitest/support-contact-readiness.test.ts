import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const contactPage = readFileSync("src/app/contact/page.tsx", "utf8");
const workshopShell = readFileSync("src/components/workshop/WorkshopPageShell.tsx", "utf8");
const termsPage = readFileSync("src/app/terms/page.tsx", "utf8");
const privacyPage = readFileSync("src/app/privacy/page.tsx", "utf8");

describe("closed beta support contact readiness", () => {
  it("keeps a public support contact route available for beta access and workflow feedback", () => {
    expect(contactPage).toContain("Direct Support");
    expect(contactPage).toContain("support@archestimator.com");
    expect(contactPage).toContain("Privacy Promise");
    expect(contactPage).toContain("quote workflow support and access inquiries");
  });

  it("keeps authenticated workshop users one click from beta feedback email", () => {
    expect(workshopShell).toContain("Send beta feedback");
    expect(workshopShell).toContain("mailto:support@archestimator.com?subject=Archestimator%20beta%20feedback");
  });

  it("keeps legal copy aligned to the same support and deletion contact", () => {
    expect(termsPage).toContain("support@archestimator.com");
    expect(termsPage).toContain("beta feedback");
    expect(privacyPage).toContain("support@archestimator.com");
    expect(privacyPage).toContain("request deletion of beta account or workspace data");
  });
});
