---
title: Research Evidence And Guardrails
date: 2026-06-07
status: draft-for-implementation
---

# Research Evidence And Guardrails

## Research Scope

This plan was grounded in:

- Current repo structure and landing source files
- Live `localhost:3000` browser inventory
- `.ai` state, brand, roadmap, beta, and prior landing plans
- Notion Homebase and GTM/brand/pitch pages
- Impeccable design guidance
- Parallel subagent findings for repo structure and design critique

The user asked for "whole codebase and whole Notion." This plan does not claim every file and Notion page was exhaustively read line by line. It does use the canonical source surfaces and targeted searches/fetches that define the landing-page decision.

## Current Live Homepage Evidence

Browser inventory from `http://localhost:3000/`:

- Page title: `Archestimator | Quote, Proposal & Estimate Workspace`
- H1: `A clearer workspace for quote sheets and proposal handoff.`
- `#product` section is currently absent.
- Rendered sections:
  - Hero
  - `#method`
  - company-proof placeholder section
  - `#solutions`
  - `#pricing`
  - `#faq`
  - `#contact`
  - footer
- Current CTAs include mixed labels:
  - `Workspace`
  - `See the workspace`
  - `Request access`
  - `Open workspace`
  - `Try Workspace`

Planning implication:
- The current page is already close to the updated quote/proposal language, but it still needs CTA normalization, stronger proof, and replacement of placeholder company proof.

## Repo Evidence

Homepage composition:

- `src/app/page.tsx`
- `src/components/landing/HeroSection.tsx`
- `src/components/landing/SecondaryClaimSection.tsx`
- `src/components/landing/CompanyProofCarouselSection.tsx`
- `src/components/landing/SolutionSection.tsx`
- `src/components/landing/PricingSection.tsx`
- `src/components/landing/FAQSection.tsx`
- `src/components/landing/FinalCTASection.tsx`
- `src/components/landing/LandingHeader.tsx`
- `src/components/landing/LandingFooter.tsx`

Product routes that show current app direction:

- `src/app/workshop/page.tsx`
- `src/app/workshop/projects/page.tsx`
- `src/app/workshop/projects/[projectId]/estimates/page.tsx`
- `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`
- `src/app/workshop/library/page.tsx`
- `src/app/workshop/templates/page.tsx`
- `src/app/share/[token]/proposal/page.tsx`
- `src/app/features/page.tsx`
- `src/app/pricing/page.tsx`
- `src/app/about/page.tsx`
- `src/app/contact/page.tsx`

Relevant tests:

- `tests/vitest/landing-ab-testing.test.tsx`
- `tests/vitest/landing-auth-state.test.ts`
- `tests/vitest/landing-consent.test.tsx`
- `tests/vitest/landing-company-proof.test.ts`
- `tests/vitest/landing-interactivity.test.tsx`
- `tests/vitest/landing-security-headers.test.ts`
- `tests/vitest/closed-beta-pricing-copy.test.ts`
- `tests/vitest/closed-beta-access.test.ts`
- `e2e/landing-audit.spec.ts`

Planning implication:
- The landing page already has a strong testing base. Implementation should modify tests to enforce the new honesty policy rather than discard them.

## `.ai` Evidence

Core state:

- `.ai/10_state/current-state.md`
- `.ai/10_state/decisions.md`
- `.ai/00_system/ai-folder-canonical-map.md`
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`

Brand:

- `.ai/06_specs/brand/brand-foundation.md`
- `.ai/06_specs/brand/brand-narrative.md`
- `.ai/06_specs/brand/brand-voice.md`
- `.ai/06_specs/brand/hero-message-thesis.md`
- `.ai/06_specs/brand/public-facing-feature-copy.md`
- `.ai/06_specs/brand/marketable-benefit-copy.md`
- `.ai/06_specs/brand/the-archestimator-way.md`
- `.ai/06_specs/brand/landing-brand-narrative-map.md`

Beta and launch:

- `.ai/03_plans/mvp-launch-readiness-2026-06-01/38-closed-beta-scope-and-nonpayment-plan.md`
- `.ai/03_plans/mvp-launch-readiness-2026-06-01/40-closed-beta-operations-runbook.md`
- `.ai/03_plans/mvp-launch-readiness-2026-06-01/42-closed-beta-copy-and-legal-pack.md`
- `.ai/03_plans/mvp-launch-readiness-2026-06-01/43-closed-beta-readiness-scorecard.md`
- `.ai/01_roadmap/17-personas-jobs-to-be-done.md`
- `.ai/01_roadmap/30-design-partner-beta-recruiting-plan.md`

Prior landing plans:

- `.ai/03_plans/landing-page-improvement/17-public-subpages-claims-matrix.md`
- `.ai/03_plans/landing-page-improvement/20-landing-page-audit-and-marketing-synthesis.md`
- `.ai/03_plans/landing-page-improvement/22-current-execution-brief.md`
- `.ai/03_plans/landing-page-improvement/23-comprehensive-landing-page-research-and-strategy.md`

Planning implication:
- Older landing plans are useful, but some are stale. The new plan downgrades screenshot-first and construction-only recommendations because the current user request and newer Notion positioning favor no app mockups, broader quote/proposal framing, and closed-beta honesty.

## Notion Evidence

Fetched Notion pages:

- Archestimator Homebase: `https://app.notion.com/p/9a33f3aafe3e821d87ba0133e683ceb6`
- 01 Brand and Positioning: `https://app.notion.com/p/91c3f3aafe3e838bbea981eb6673d472`
- 02 Marketing and GTM: `https://app.notion.com/p/97b3f3aafe3e82da90b681c559b8cf3d`
- 04 Roadmap and Timeline: `https://app.notion.com/p/61b3f3aafe3e83babf0881cc43149c19`
- 10 Pricing and Business Model: `https://app.notion.com/p/a483f3aafe3e82d88c2b01f89b720478`
- Google for Startups Accelerator Pitch Deck: `https://app.notion.com/p/2223f3aafe3e838a901101bf0ba08953`
- KSGC Pitch Deck: `https://app.notion.com/p/9d43f3aafe3e836f953c815c9cbcf774`
- SLINGSHOT 2026 Pitch Deck: `https://app.notion.com/p/f5a3f3aafe3e82b086ad013edb6136eb`

Notion themes used:

- Archestimator is a pre-launch MVP and closed-beta product.
- The current category should be quote/proposal first, with construction estimating as proof case.
- The strategic language is cost proposal workspace, cost intelligence, and supplier-linked commercial data.
- The bigger opportunity is structured commercial graph and future estimate-to-supplier bridge.
- Public pages must not imply PO execution, legal automation, mature compliance, autonomous AI estimating, fake customers, or finalized pricing.
- Client-side proposal record is an important future angle, but must be framed as future/planned unless implementation evidence exists.

Planning implication:
- The homepage should be bolder about the strategic thesis but more conservative about public capability claims.

## Subagent Evidence

### Repo Exploration Agent

Findings:

- `src/app/page.tsx` currently composes hero, secondary claim, company proof, solution, pricing, FAQ, final CTA, and footer.
- Current product routes show workshop, projects, estimates, library, templates, charts, shared links, auth, and public route surfaces.
- Landing and closed-beta tests already exist.
- Gaps include proof posture, CTA/access reality, terminology drift, and unused marketing modules.

### Design Critique Agent

Findings:

- Do not solve emptiness with more static cards.
- Use media-led proof through labeled video placeholders.
- Replace fake company energy with sample workflow proof.
- Align all CTAs with invite-only beta.
- Use the order: hero, workflow video placeholder, secondary claim, product/storyboard tabs, connected workflow, closed beta, FAQ, final CTA.
- Keep orange hero but improve the rest of page through editorial objects, thin borders, crop marks, timelines, and restrained orange accents.

Planning implication:
- The final plan emphasizes one strong video placeholder early and a limited storyboard card system later.

## Impeccable And Design-System Guardrails

Relevant guidance:

- Landing pages may be more editorial and experimental than workshop UI.
- Workshop/product UI must remain compact and system-aligned.
- Avoid generic AI landing-page tropes, timid empty palettes, fake proof, and unspecific copy.
- Use concrete commercial workflow language.
- Avoid visible instructional text that explains UI mechanics instead of serving the content.
- Keep text fitting cleanly across mobile and desktop.

Planning implication:
- The homepage redesign should feel richer but not decorative for decoration's sake.

## Claim Safety Guardrails

Safe to say:

- `Closed beta`
- `MVP preview`
- `Structured quote, estimate, and proposal workspace`
- `Reusable cost logic`
- `Revision context` when labeled planned or directional
- `Proposal handoff` when labeled partial/planned
- `Human-reviewed AI assistance` if a privacy/safety note is present
- `No public payment during beta`

Use carefully:

- `Cost intelligence`
- `Proposal-ready`
- `Visual breakdowns`
- `Export`
- `Activity/history`
- `Shared proposal record`
- `Supplier catalogs`
- `Quote requests`

Do not say:

- `Trusted by`
- `Guaranteed accurate`
- `Saves X%`
- `AI prices your project`
- `Generate legal documents`
- `Execute purchase orders`
- `Procurement marketplace is live`
- `Enterprise-grade compliance`
- `Final pricing`
- `Customer logos` unless permissioned and verified

## Evidence Conflicts To Resolve Before Implementation

Some Notion surfaces use broader "available" wording for export, shared links, AI, collaboration, and proposal workflows than the conservative public claims matrix. Implementation should resolve this by running a current repo capability audit before public copy changes.

Until that audit is done, public homepage copy should use the safer label:

- Live core estimate workspace: `Available in MVP preview`
- Library/templates/charts/share/export: `Partially available in MVP preview` unless freshly verified end to end
- Revision intelligence/proposal comparisons/supplier catalogs/quote requests: `Planned next`
- AI write/apply/autonomous workflows: `Do not claim` unless explicitly enabled and reviewed

## Final Planning Conclusion

The strongest landing-page improvement is not a prettier version of the old page. It is a strategic reframe:

1. Keep the hero visual strength.
2. Make the first proof object an honest workflow video placeholder.
3. Replace fake social proof with workflow evidence.
4. Explain the quote/proposal method.
5. Make closed beta feel intentional.
6. Route detailed feature truth to `/features`.
7. Verify every claim before shipping.
