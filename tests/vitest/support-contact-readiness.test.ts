import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const contactPage = readFileSync("src/app/contact/page.tsx", "utf8");
const contactForm = readFileSync("src/components/landing/ContactForm.tsx", "utf8");
const workshopShell = readFileSync("src/components/workshop/WorkshopPageShell.tsx", "utf8");
const workshopSettingsModalContent = readFileSync("src/components/workshop/WorkshopSettingsModalContent.tsx", "utf8");
const betaFeedbackPage = readFileSync("src/app/workshop/feedback/page.tsx", "utf8");
const betaFeedbackAction = readFileSync("src/lib/workshop/beta-feedback-actions.ts", "utf8");
const termsPage = readFileSync("src/app/terms/page.tsx", "utf8");
const privacyPage = readFileSync("src/app/privacy/page.tsx", "utf8");

describe("closed beta support contact readiness", () => {
  it("keeps a public support contact route available for beta access and workflow feedback", () => {
    expect(contactPage).toContain("Direct Support");
    expect(contactPage).toContain("support@archestimator.com");
    expect(contactPage).toContain("Privacy Promise");
    expect(contactPage).toContain("quote workflow support and access inquiries");
  });

  it("keeps the public contact form honest by using a support email draft instead of a fake submission", () => {
    expect(contactForm).toContain("buildSupportMailto");
    expect(contactForm).toContain("support@archestimator.com");
    expect(contactForm).toContain("mailto:${SUPPORT_EMAIL}");
    expect(contactForm).toContain("Open Email Draft");
    expect(contactForm).toContain("Support email draft prepared");
    expect(contactForm).toContain("If the draft did not open");
    expect(contactForm).not.toContain("Mock API call delay");
    expect(contactForm).not.toContain("Message Sent Successfully");
    expect(contactForm).not.toContain("We have received your inquiry");
  });

  it("keeps authenticated workshop users one click from persisted beta feedback", () => {
    expect(workshopShell).toContain("WorkshopSettingsModalContent");
    expect(workshopSettingsModalContent).toContain("Send beta feedback");
    expect(workshopSettingsModalContent).toContain('href: "/workshop/feedback"');
    expect(betaFeedbackPage).toContain("BetaFeedbackForm");
    expect(betaFeedbackAction).toContain("beta_feedback_submissions");
    expect(betaFeedbackAction).toContain('feedbackRedirect({ fallback: "1" })');
  });

  it("keeps legal copy aligned to the same support and deletion contact", () => {
    expect(termsPage).toContain("support@archestimator.com");
    expect(termsPage).toContain("beta feedback");
    expect(termsPage).toContain("Last updated for closed beta review");
    expect(termsPage).toContain("may be updated before any public or paid launch");
    expect(termsPage).not.toContain("review this copy with counsel");
    expect(privacyPage).toContain("support@archestimator.com");
    expect(privacyPage).toContain("request deletion of beta account or workspace data");
    expect(privacyPage).toContain("Last updated for closed beta review");
    expect(privacyPage).toContain("may be updated before any public or paid launch");
    expect(privacyPage).not.toContain("review this copy with counsel");
  });
});
