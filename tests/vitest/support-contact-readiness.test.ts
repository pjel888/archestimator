import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const contactPage = readFileSync("src/app/contact/page.tsx", "utf8");
const contactForm = readFileSync("src/components/landing/ContactForm.tsx", "utf8");
const contactMailto = readFileSync("src/components/landing/contact-mailto.ts", "utf8");
const workshopShell = readFileSync("src/components/workshop/WorkshopRouteHeader.tsx", "utf8");
const workshopSettingsModalContent = readFileSync("src/components/workshop/WorkshopSettingsModalContentView.tsx", "utf8");
const supportCenterPage = readFileSync("src/app/workshop/feedback/page.tsx", "utf8");
const supportConversationRoute = readFileSync("src/app/api/support/conversations/route.ts", "utf8");
const supportIntake = readFileSync("src/lib/support/intake-service.ts", "utf8");
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
    expect(contactForm).toContain("SUPPORT_EMAIL");
    expect(contactMailto).toContain("support@archestimator.com");
    expect(contactMailto).toContain("mailto:${SUPPORT_EMAIL}");
    expect(contactForm).toContain("Open Email Draft");
    expect(contactForm).toContain("Support email draft prepared");
    expect(contactForm).toContain("If the draft did not open");
    expect(contactForm).not.toContain("Mock API call delay");
    expect(contactForm).not.toContain("Message Sent Successfully");
    expect(contactForm).not.toContain("We have received your inquiry");
  });

  it("keeps authenticated workshop users one click from durable private support", () => {
    expect(workshopShell).toContain("WorkshopSettingsModalContent");
    expect(workshopSettingsModalContent).toContain("Support Center");
    expect(workshopSettingsModalContent).toContain("Read support replies, continue a request, or send a new private message.");
    expect(workshopSettingsModalContent).toContain('href: "/workshop/feedback"');
    expect(supportCenterPage).toContain("SupportChatWidget");
    expect(supportCenterPage).toContain('title="Support Center"');
    expect(supportConversationRoute).toContain("writeUserSupportMessage");
    expect(supportConversationRoute).toContain("SUPPORT_NO_STORE_HEADERS");
    expect(supportIntake).toContain("support_user_intake_claims");
  });

  it("keeps legal copy aligned to the same support and deletion contact", () => {
    expect(termsPage).toContain("support@archestimator.com");
    expect(termsPage).toContain("beta feedback");
    expect(termsPage).toContain("Last updated for closed beta review");
    expect(termsPage).toContain("may be updated before any public or paid launch");
    expect(termsPage).not.toContain("review this copy with counsel");
    expect(privacyPage).toContain("support@archestimator.com");
    expect(privacyPage).toContain("request access, portability, or verified erasure of support data");
    expect(privacyPage).toContain("It is not a verified privacy erasure.");
    expect(privacyPage).toContain("Last updated for closed beta review");
    expect(privacyPage).toContain("may be updated before any public or paid launch");
    expect(privacyPage).not.toContain("review this copy with counsel");
  });
});
