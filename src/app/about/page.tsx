import type { Metadata } from "next";

import { getLandingAuthState } from "@/lib/landing/get-landing-auth-state";
import { buildLandingMetadata } from "@/lib/landing/seo-metadata";
import { PublicPageShell } from "@/components/landing";
import { LandingShellClient } from "@/components/landing/shell/LandingShellClient";
import { SectionShell } from "@/components/landing/sections/SectionShell";
import { FinalCtaSection } from "@/components/landing/sections/FinalCtaSection";

export const metadata: Metadata = buildLandingMetadata({
  title: "About — a new company, building for teams who live in spreadsheets",
  description:
    "Archestimator started with a simple frustration: every estimate holds real commercial knowledge, and every time a project ends, that knowledge dies in a spreadsheet. We are building the cost intelligence layer that fixes that.",
  path: "/about",
});

export default async function AboutPage() {
  const isLoggedIn = await getLandingAuthState();
  return (
    <PublicPageShell isLoggedIn={isLoggedIn} isHomePage={false}>
      <LandingShellClient>
        <main data-landing-page-root="true" id="main-content">
          {/* Hero (compact) — introduction posture (§5.1) */}
          <SectionShell
            id="about-hero"
            label="About Archestimator"
            eyebrow="About"
            accentRail
            heading="A new company, building for teams who live in spreadsheets."
            lead="Name the world as it is. Declare who we are. Show who you become with us."
          />

          {/* The intro — founder voice (§11.5) */}
          <SectionShell
            id="about-intro"
            label="The intro"
            eyebrow="The intro"
            heading="Every estimate holds real commercial knowledge. Today it dies in a spreadsheet."
          >
            <div className="flex flex-col gap-[var(--landing-space-md)]">
              <p className="max-w-[var(--landing-measure-prose)] text-landing-text-body-lg leading-landing-prose text-landing-ink text-pretty">
                Archestimator started with a simple frustration: every estimate holds real commercial
                knowledge — your prices, your suppliers, your judgment — and every time a project
                ends, that knowledge dies in a spreadsheet. The next job starts from row one.
              </p>
              <p className="max-w-[var(--landing-measure-prose)] text-landing-text-body leading-landing-prose text-landing-ink-secondary text-pretty">
                We are building the cost intelligence layer for teams who live in those spreadsheets.
                Not an enterprise suite that takes months to set up, but a workspace where your own
                estimating work compounds: structured estimates, a reusable library, a clean revision
                record, and proposals your clients can actually review and approve.
              </p>
              <p className="max-w-[var(--landing-measure-prose)] text-landing-text-body leading-landing-prose text-landing-ink-secondary text-pretty">
                Built by someone who has worked both sides of this, the design and cost side, and the
                software side.
              </p>
              <p className="max-w-[var(--landing-measure-prose)] text-landing-text-body leading-landing-prose text-landing-ink-secondary text-pretty">
                This is a new company and an early product. We would rather tell you exactly what it
                does today and where it is going than oversell it. That honesty is part of how we work.
              </p>
            </div>
          </SectionShell>

          {/* Mission + vision + promise (§4.5) */}
          <SectionShell
            id="about-mission"
            label="Mission, vision, promise"
            eyebrow="Mission · Vision · Promise"
            heading="Why this exists."
          >
            <div className="grid gap-[var(--landing-space-lg)] md:grid-cols-3">
              <div className="rounded-landing-panel border border-landing-hairline bg-surface p-[var(--landing-space-lg)]">
                <p className="font-numeric text-landing-text-label uppercase tracking-landing-label text-landing-ink-muted">
                  Mission
                </p>
                <p className="mt-[var(--landing-space-sm)] text-landing-text-body-sm leading-landing-prose text-landing-ink-secondary">
                  Give AEC teams a cost intelligence layer — one place where unit costs, suppliers,
                  revisions, and client decisions compound instead of dying in spreadsheets, from
                  first cost estimate to client approval.
                </p>
              </div>
              <div className="rounded-landing-panel border border-landing-hairline bg-surface p-[var(--landing-space-lg)]">
                <p className="font-numeric text-landing-text-label uppercase tracking-landing-label text-landing-ink-muted">
                  Vision
                </p>
                <p className="mt-[var(--landing-space-sm)] text-landing-text-body-sm leading-landing-prose text-landing-ink-secondary">
                  Become the cost intelligence layer for the AEC economy: every estimate a reusable
                  asset, every approval a permanent record, and a structured bridge from project
                  demand to supplier supply.
                </p>
              </div>
              <div className="rounded-landing-panel border-l-2 border-brand-orange border-landing-hairline bg-surface p-[var(--landing-space-lg)]">
                <p className="font-numeric text-landing-text-label uppercase tracking-landing-label text-landing-ink-muted">
                  Promise
                </p>
                <p className="mt-[var(--landing-space-sm)] font-display text-landing-text-body-lg leading-landing-tight text-landing-ink">
                  You never start from zero again. Your numbers hold up.
                </p>
              </div>
            </div>
          </SectionShell>

          {/* The founder — L-FND-1 GATED */}
          <SectionShell
            id="about-founder"
            label="The founder"
            eyebrow="The founder"
            heading="Built by someone who has lived the gap."
            lead="Founder public bio assets (credentials, photo, links) are coming. We won’t invent them. Until they land, this section is the §13.1 core line."
          >
            <div
              aria-hidden="true"
              data-landing-founder-slot="reserved"
              className="relative min-h-[200px] overflow-hidden rounded-landing-panel border border-landing-hairline bg-surface"
            >
              <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--brand-orange-soft)_0%,transparent_60%)] opacity-60" />
              <div className="absolute inset-0 flex items-end p-[var(--landing-space-lg)]">
                <p className="font-display text-landing-text-body-lg leading-landing-tight text-landing-ink">
                  Archestimator exists because the founder has felt the workflow from both sides —
                  the design and cost side, and the software side.
                </p>
              </div>
            </div>
            <p className="mt-[var(--landing-space-md)] text-landing-text-caption text-landing-ink-muted">
              Founder bio and photo are coming. We won’t invent credentials.
            </p>
          </SectionShell>

          {/* Privacy stance (R10) */}
          <SectionShell
            id="about-privacy"
            label="Private by design"
            eyebrow="Privacy"
            heading="Your data is yours."
          >
            <p className="max-w-[var(--landing-measure-prose)] text-landing-text-body-lg leading-landing-prose text-landing-ink text-pretty">
              Your data is yours, never pooled or anonymized across customers. This is a deliberate
              positioning choice — the opposite of a cross-customer benchmark. We forgo that
              benchmark; we think the trade is worth it.
            </p>
          </SectionShell>

          {/* What this is, and is not (§7.4) */}
          <SectionShell
            id="about-limits"
            label="What this is, and is not"
            eyebrow="Honest limitations"
            heading="An early product. Honest about what it is not."
          >
            <ul className="grid gap-[var(--landing-space-sm)] sm:grid-cols-2">
              {LIMITATIONS.map((line) => (
                <li
                  key={line}
                  className="rounded-landing-dense border border-landing-hairline bg-surface p-[var(--landing-space-md)] text-landing-text-body-sm leading-landing-prose text-landing-ink-secondary"
                >
                  {line}
                </li>
              ))}
            </ul>
          </SectionShell>

          <FinalCtaSection isLoggedIn={isLoggedIn} />
        </main>
      </LandingShellClient>
    </PublicPageShell>
  );
}

const LIMITATIONS = [
  "Pre-launch MVP, not production-hardened enterprise SaaS.",
  "AI is on the roadmap, not in the product today.",
  "Exports are working documents, not immutable issued records, legal documents, or POs.",
  "Not procurement, ERP, or payment execution.",
  "Not an aggregator or a database of other people's estimates.",
  "No BIM or drawing ingestion today. English UI, no localization yet.",
] as const;
