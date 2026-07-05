import type { Metadata } from "next";

import { buildLandingMetadata } from "@/lib/landing/seo-metadata";
import { PublicPageShell } from "@/components/landing";
import { LandingShellClient } from "@/components/landing/shell/LandingShellClient";
import { SectionShell } from "@/components/landing/sections/SectionShell";
import { FinalCtaSection } from "@/components/landing/sections/FinalCtaSection";

export const metadata: Metadata = buildLandingMetadata({
  title: "Security — Vulnerability disclosure",
  description:
    "How to report a security vulnerability to Archestimator. Coordinated disclosure, 90-day default timeline, hall of fame for accepted reports.",
  path: "/security",
});

export const dynamic = "force-static";

export default function SecurityPage() {
  return (
    <PublicPageShell isHomePage={false}>
      <LandingShellClient>
        <main data-landing-page-root="true" id="main-content">
          <SectionShell
            id="security-hero"
            label="Security"
            eyebrow="Security"
            accentRail
            heading="Report a vulnerability."
            lead="Archestimator welcomes responsible disclosure. Reports from independent researchers make the product safer for every estimator, contractor, and client on the platform."
          >
            {null}
          </SectionShell>

          <SectionShell
            id="security-policy"
            label="Disclosure policy"
            eyebrow="Section A · Policy"
            heading="Coordinated disclosure, 90-day default."
            lead="Please do not publish a vulnerability until we have acknowledged the report and agreed on a remediation timeline."
          >
            <ol className="space-y-[var(--landing-space-sm)] text-landing-text-body leading-landing-prose text-landing-ink-secondary">
              <li>
                <strong className="text-landing-ink-primary">1. Report privately.</strong> Email{" "}
                <a
                  href="mailto:security@archestimator.com"
                  className="underline underline-offset-4 hover:text-landing-ink-primary"
                >
                  security@archestimator.com
                </a>{" "}
                with reproduction steps and impact. PGP-encrypted reports accepted (key at{" "}
                <code className="rounded bg-landing-hairline px-1 py-0.5 text-[0.85em]">
                  /.well-known/pgp-key.txt
                </code>
                ).
              </li>
              <li>
                <strong className="text-landing-ink-primary">2. We acknowledge within 5 business days.</strong>{" "}
                A real human responds with a triage decision: accepted, duplicates, or out-of-scope.
              </li>
              <li>
                <strong className="text-landing-ink-primary">3. Remediation timeline.</strong> Default
                is 90 days from acknowledgement. Critical issues ship faster; complex issues may be
                negotiated.
              </li>
              <li>
                <strong className="text-landing-ink-primary">4. Public disclosure.</strong> After a
                fix is deployed, we credit the reporter in the hall of fame below (with permission).
              </li>
            </ol>
          </SectionShell>

          <SectionShell
            id="security-scope"
            label="Scope"
            eyebrow="Section B · Scope"
            heading="What is in scope."
            lead="Archestimator is the cost-proposal workspace hosted at archestimator.com."
          >
            <ul className="space-y-[var(--landing-space-xs)] text-landing-text-body leading-landing-prose text-landing-ink-secondary">
              <li>
                <strong>In scope:</strong> archestimator.com (Worker, D1, R2, Durable Objects,
                publication/share links, authentication flows, file upload pipeline).
              </li>
              <li>
                <strong>Out of scope:</strong> third-party services (Cloudflare control plane, Google
                OAuth provider, email delivery provider), Denial of Service volumetric attacks, social
                engineering, physical attacks.
              </li>
              <li>
                <strong>Safe harbor:</strong> we will not pursue legal action against good-faith
                researchers who follow this policy. Avoid degrading service for other users or
                accessing data that is not yours.
              </li>
            </ul>
          </SectionShell>

          <SectionShell
            id="hall-of-fame"
            label="Hall of fame"
            eyebrow="Section C · Acknowledgments"
            heading="Researchers who made Archestimator safer."
            lead="With their permission, accepted reporters are listed here after the fix ships. We are grateful."
          >
            <p className="text-landing-text-body leading-landing-prose text-landing-ink-muted">
              No accepted reports yet. Be the first.
            </p>
          </SectionShell>

          <FinalCtaSection />
        </main>
      </LandingShellClient>
    </PublicPageShell>
  );
}
