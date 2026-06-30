import type { Metadata } from "next";
import { Suspense } from "react";

import { buildLandingMetadata } from "@/lib/landing/seo-metadata";
import { PublicPageShell, ContactForm, ContactFormFromSearchParams } from "@/components/landing";
import { LandingShellClient } from "@/components/landing/shell/LandingShellClient";
import { SectionShell } from "@/components/landing/sections/SectionShell";
import { FinalCtaSection } from "@/components/landing/sections/FinalCtaSection";
import { LandingCTAs } from "@/components/landing/sections/LandingCTAs";

export const metadata: Metadata = buildLandingMetadata({
  title: "Contact - talk to the founder",
  description:
    "Archestimator is founder-led. Book a walkthrough around your own workflow, or send a note. We are looking for design partners who create estimates, quotes, or proposals today, with no payment or commitment.",
  path: "/contact",
});

export const dynamic = "force-static";

export default function ContactPage() {
  return (
    <PublicPageShell isHomePage={false}>
      <LandingShellClient>
        <main data-landing-page-root="true" id="main-content">
          {/* Hero (compact) */}
          <SectionShell
            id="contact-hero"
            label="Contact"
            eyebrow="Contact"
            accentRail
            heading="Talk to the founder."
            lead="Archestimator is founder-led. Book a walkthrough around your own workflow, or send a note. We are looking for design partners who create estimates, quotes, or proposals today, with no payment or commitment."
          >
            <LandingCTAs
              layout="stack"
              location="final-cta"
            />
          </SectionShell>

          {/* What we are looking for */}
          <SectionShell
            id="contact-design-partners"
            label="Design partners"
            eyebrow="What we are looking for"
            heading="A few design partners who estimate, quote, or propose today."
          >
            <ul className="grid gap-[var(--landing-space-sm)] sm:grid-cols-2">
              {DESIGN_PARTNER_POINTS.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-[var(--landing-space-sm)] rounded-landing-dense border border-landing-hairline bg-surface p-[var(--landing-space-md)] text-landing-text-body-sm leading-landing-prose text-landing-ink-secondary"
                >
                  <span
                    aria-hidden="true"
                    className="mt-[6px] inline-block h-[6px] w-[6px] shrink-0 rounded-full bg-brand-orange"
                  />
                  {point}
                </li>
              ))}
            </ul>
          </SectionShell>

          {/* The form */}
          <SectionShell
            id="contact-form"
            label="Send a note"
            eyebrow="Send a note"
            heading="Tell us about your workflow."
          >
            <div className="grid gap-[var(--landing-space-lg)] lg:grid-cols-[0.9fr_1.1fr]">
              <div className="flex flex-col gap-[var(--landing-space-md)] rounded-landing-panel border border-landing-hairline bg-surface p-[var(--landing-space-lg)]">
                <p className="font-display text-landing-text-title leading-landing-tight text-landing-ink">
                  Direct Support
                </p>
                <p className="text-landing-text-body-sm leading-landing-prose text-landing-ink-secondary">
                  Reach us directly at{" "}
                  <a
                    href="mailto:support@archestimator.com"
                    className="font-medium text-brand-orange-dark underline decoration-landing-hairline underline-offset-4 hover:decoration-brand-orange"
                  >
                    support@archestimator.com
                  </a>
                  . We read every note.
                </p>
                <p className="text-landing-text-caption text-landing-ink-muted">
                  Privacy Promise: we do not sell or lease your email address. It is strictly used
                  to reply to quote workflow support and access inquiries.
                </p>
              </div>
              <div className="rounded-landing-panel border border-landing-hairline bg-surface p-[var(--landing-space-lg)]">
                <Suspense fallback={<ContactForm />}>
                  <ContactFormFromSearchParams />
                </Suspense>
              </div>
            </div>
          </SectionShell>

          <FinalCtaSection />
        </main>
      </LandingShellClient>
    </PublicPageShell>
  );
}

const DESIGN_PARTNER_POINTS = [
  "You create estimates, quotes, or proposals today on a spreadsheet or an enterprise tool that does not fit.",
  "No payment and no commitment. Twenty minutes of feedback and permission to test the MVP.",
  "You are open to a walkthrough around your real workflow, not a generic demo.",
  "You are in AEC: architecture, engineering, construction, cost estimating, fit-out, interior design, or supply.",
] as const;
