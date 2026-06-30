import type { Metadata } from "next";

import { buildLandingMetadata } from "@/lib/landing/seo-metadata";
import { PublicPageShell } from "@/components/landing";
import { LandingShellClient } from "@/components/landing/shell/LandingShellClient";
import { SectionShell } from "@/components/landing/sections/SectionShell";
import { FinalCtaSection } from "@/components/landing/sections/FinalCtaSection";
import { ClaimsLedger } from "@/components/landing/claims-ledger/ClaimsLedger";
import { StatusPill } from "@/components/landing/shared/StatusPill";

export const metadata: Metadata = buildLandingMetadata({
  title: "Trust",
  description:
    "What Archestimator will and will not claim. Trust comes from honesty — the full claims ledger, the privacy posture, the security as shipped, and the maturity plainly stated.",
  path: "/trust",
});

export const dynamic = "force-static";

export default function TrustPage() {
  return (
    <PublicPageShell isHomePage={false}>
      <LandingShellClient>
        <main data-landing-page-root="true" id="main-content">
          {/* Hero (compact) */}
          <SectionShell
            id="trust-hero"
            label="Trust"
            eyebrow="Trust"
            accentRail
            heading="What we will and will not claim."
            lead="Trust comes from honesty. So here is exactly what Archestimator does today, what is improving, what is on the roadmap, and what it is not."
          >
            {null}
          </SectionShell>

          {/* Section A — the full claims ledger */}
          <SectionShell
            id="trust-claims"
            label="The claims matrix, in depth"
            eyebrow="Section A · Claims"
            heading="Every claim, with its status."
            lead="The same ledger that appears on the homepage, in full. If a claim is not here, we do not make it."
          >
            <ClaimsLedger enableFilter variant="full" title={null} />
          </SectionShell>

          {/* Section B — Private by design */}
          <SectionShell
            id="trust-privacy"
            label="Private by design"
            eyebrow="Section B · Privacy"
            accentRail
            heading="Your data is yours."
            lead="Archestimator is not an aggregator and not a database of other people's estimates. The intelligence in your workspace is built from your work, never pooled or anonymized across customers."
          >
            <div className="rounded-landing-panel border border-landing-hairline-strong bg-surface p-[var(--landing-space-lg)]">
              <span aria-hidden="true" className="mb-[var(--landing-space-xs)] inline-block h-[14px] w-[2px] rounded-full bg-brand-orange" />
              <p className="text-landing-text-body leading-landing-prose text-landing-ink-secondary">
                This is a deliberate positioning choice. It is the opposite of a cross-customer
                benchmark, and it means we forgo that benchmark. We think that trade is worth it:
                your commercial intelligence should never leave your workspace to populate someone
                else&rsquo;s.
              </p>
            </div>
          </SectionShell>

          {/* Section C — Security posture (as shipped, §C canonical per C-13) */}
          <SectionShell
            id="trust-security"
            label="Security posture"
            eyebrow="Section C · Security"
            heading="What we can say today."
            lead="Only what is actually shipped. Verified against the real security code — no badges for work that is not done."
          >
            <ul className="grid gap-[var(--landing-space-sm)] sm:grid-cols-2">
              {SECURITY_CLAIMS.map((claim) => (
                <li
                  key={claim}
                  className="flex items-start gap-[var(--landing-space-sm)] rounded-landing-dense border border-landing-hairline bg-surface p-[var(--landing-space-md)]"
                >
                  <span className="mt-[2px] shrink-0">
                    <StatusPill status="Live" size="sm" />
                  </span>
                  <span className="text-landing-text-body-sm leading-landing-prose text-landing-ink-secondary">
                    {claim}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-[var(--landing-space-md)] max-w-[var(--landing-measure-prose)] text-landing-text-caption text-landing-ink-muted">
              Rate limiting is Postgres, not Redis. Turnstile is not yet built. Anything beyond this
              list (SOC2/GDPR/HIPAA/DPA badges, formal compliance guarantees) waits on the legal
              entity and DPA work.
            </p>
          </SectionShell>

          {/* Section D — Maturity + limitations */}
          <SectionShell
            id="trust-maturity"
            label="Maturity and limitations"
            eyebrow="Section D · Maturity"
            heading="What this is, and is not."
            lead="The honest list, in trust-page voice."
          >
            <ul className="grid gap-[var(--landing-space-sm)] sm:grid-cols-2">
              {LIMITATIONS.map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-[var(--landing-space-sm)] rounded-landing-dense border border-landing-hairline bg-surface p-[var(--landing-space-md)]"
                >
                  <span className="mt-[2px] shrink-0">
                    <StatusPill status="NotUs" size="sm" redline />
                  </span>
                  <span className="text-landing-text-body-sm leading-landing-prose text-landing-ink-secondary">
                    {line}
                  </span>
                </li>
              ))}
            </ul>
          </SectionShell>

          {/* Section E — Data residency (RESERVED, L-LEG-3/4 gated placeholder) */}
          <SectionShell
            id="trust-residency"
            label="Data residency"
            eyebrow="Section E · Residency"
            heading="Data residency and processing arrangements."
          >
            <div className="rounded-landing-panel border border-dashed border-landing-hairline-strong bg-surface/60 p-[var(--landing-space-lg)]">
              <div className="mb-[var(--landing-space-2xs)] flex items-center gap-[var(--landing-space-2xs)]">
                <StatusPill status="Planned" size="sm" />
                <span className="font-numeric text-landing-text-label uppercase tracking-landing-label text-landing-ink-muted">
                  Planned · gated on legal
                </span>
              </div>
              <p className="text-landing-text-body leading-landing-prose text-landing-ink-secondary">
                Data residency and processing arrangements are part of our roadmap. We will publish
                them here once they are finalized.
              </p>
              <p className="mt-[var(--landing-space-sm)] text-landing-text-caption text-landing-ink-muted">
                We do not claim SOC2, GDPR, HIPAA, or DPA compliance. Entity and DPA work are not
                done. No badges.
              </p>
            </div>
          </SectionShell>

          <FinalCtaSection />
        </main>
      </LandingShellClient>
    </PublicPageShell>
  );
}

const SECURITY_CLAIMS = [
  "Bearer-secret invite and share tokens (≥32 bytes, base64url, HMAC-SHA256 with a server pepper, never logged raw).",
  "Token expiry and revocation.",
  "POST-only mutations — GET confirms, POST grants.",
  "HttpOnly, Secure, SameSite cookies. No tokens in localStorage.",
  "Durable composite-key rate limiting with Retry-After (Postgres).",
  "Audit logging and metrics/alerts on the collaboration surface.",
  "Row-level security enforced on every table.",
  "Better Auth session gating, Google OAuth and magic-link flows, plus signed Cloudflare collaboration rooms.",
] as const;

const LIMITATIONS = [
  "A focused tool for working estimators, not enterprise SaaS.",
  "AI is on the roadmap, not in the product today.",
  "Exports are working documents, not immutable issued records, legal documents, or POs.",
  "Not procurement, ERP, or payment execution.",
  "Not an aggregator or a database of other people's estimates.",
  "No BIM or drawing ingestion today.",
  "English UI, no localization yet.",
] as const;
