# Public Landing Subpages Analysis Plan

**Date:** 2026-05-21 17:56 PST; refreshed 2026-05-27 14:50 PHT
**Status:** Planning only for remaining subpage/content/privacy gates; public marketing routes now exist, but release claims remain gated.
**Scope:** Public marketing subpages related to the landing page: `/features`, `/pricing`, `/about`, `/contact`, and supporting trust/content pages.
**Parent folder:** `.ai/03_plans/landing-page-improvement/`
**Hard boundary:** The accepted homepage hero remains locked. This plan may define new subpage hero/intro sections, but must not alter the existing `/` hero unless Philip explicitly reopens it.

## Purpose

Archestimator now has a stronger homepage, but the public marketing system still behaves like a one-page landing page. This plan defines the analysis needed before adding dedicated public subpages so the product does not become a set of thin, generic SaaS pages.

The subpages should answer deeper visitor questions without repeating the homepage:

1. What exactly does Archestimator do?
2. Which features exist now, which are MVP-preview, and which are future direction?
3. What does early access/pricing mean?
4. Who is behind the product and why does it exist?
5. How can a serious evaluator request access or ask questions?
6. What trust, privacy, and security claims are safe to publish?

## Evidence read for this planning pass

Source and route evidence:

- `src/app/page.tsx`
- `src/app/layout.tsx`
- `src/components/landing/LandingHeader.tsx`
- `src/components/landing/LandingFooter.tsx`
- `src/components/landing/ProductShowcaseSection.tsx`
- `src/components/landing/ProductPreviewVariants.tsx`
- `src/components/landing/SecondaryClaimSection.tsx`
- `src/components/landing/SolutionSection.tsx`
- `src/components/landing/PricingSection.tsx`
- `package.json`

Planning and state evidence:

- `.ai/03_plans/landing-page-improvement/README.md`
- `.ai/03_plans/landing-page-improvement/01-current-inventory.md`
- `.ai/03_plans/landing-page-improvement/06-brand-source-synthesis.md`
- `.ai/03_plans/landing-page-improvement/09-readiness-and-release-plan.md`
- `.ai/03_plans/README.md`
- `.ai/10_state/current-state.md`
- `.ai/10_state/decisions.md`
- `.ai/06_specs/archestimator-product-thesis.md`
- `.ai/06_specs/mvp-ux-flow.md`
- `.ai/13_research/competitor-landscape-construction-estimating-2026-05-16.md`

Brand folder read/synthesized:

- `.ai/06_specs/brand/README.md`
- `.ai/06_specs/brand/brand-foundation.md`
- `.ai/06_specs/brand/brand-narrative.md`
- `.ai/06_specs/brand/brand-voice.md`
- `.ai/06_specs/brand/clarity-and-mess-narrative.md`
- `.ai/06_specs/brand/hero-message-thesis.md`
- `.ai/06_specs/brand/spatial-hierarchy-narrative.md`
- `.ai/06_specs/brand/the-archestimator-way.md`
- `.ai/06_specs/brand/landing-brand-narrative-map.md`
- `.ai/06_specs/brand/benefits-and-value-props.md`
- `.ai/06_specs/brand/public-facing-feature-copy.md`
- `.ai/06_specs/brand/marketable-benefit-copy.md`
- `.ai/06_specs/brand/combined-benefit-title-system.md`

Independent review input:

- A read-only subagent review inspected the same route/brand/planning context and recommended route architecture, content hierarchy, research questions, readiness gates, and risks. Its useful findings are incorporated here.

## Current public route state

Current public marketing route inventory from `src/app`:

- `/` — existing public landing page.
- `/features` — public marketing route exists; content claims must stay maturity-labeled.
- `/pricing` — public marketing route exists; pricing posture still needs Philip approval.
- `/about` — public marketing route exists; founder/company facts remain approval-gated.
- `/contact` — public marketing route exists; contact mechanism and privacy language remain release-gated.
- `/login` — Supabase magic-link auth route.
- `/auth/callback` — Supabase auth callback route.

No dedicated public marketing subpages currently exist for:

- `/privacy`
- `/security`
- `/resources`

Current `/` composition:

1. `LandingHeader`
2. `HeroSection`
3. `CompanyProofCarouselSection`
4. `ProductShowcaseSection`
5. `SecondaryClaimSection`
6. `SolutionSection`
7. `PricingSection`
8. `FinalCTASection`
9. `LandingFooter`

Current header/footer navigation mostly uses in-page anchors:

- `#product`
- `#method`
- `#solutions`
- `#pricing`
- `#contact`

That is correct for the one-page landing version, but dedicated subpages need a route-aware public navigation plan before implementation.

## Brand constraints for all public subpages

Use the active public feature anchors exactly or very close to exactly:

1. **Estimate Workspace** — build around the project, not a blank spreadsheet.
2. **Component Library** — reuse what repeats.
3. **Revision Intelligence** — know what changed before it becomes a proposal problem.
4. **Proposal Comparisons** — compare options without scattering files.
5. **Visual Cost Breakdowns** — show clients where the cost moved.
6. **Proposal-Ready Outputs** — keep the client package connected to the estimate.
7. **Industry Standard Export Formats** — send the work out in formats teams already use.

Core language to preserve:

- construction cost estimators;
- estimates, quantities, unit costs, line items, assumptions, revisions;
- project hierarchy, lot, structure, level, area, scope, trade;
- BOQ, proposal, Excel/PDF handoff;
- fewer file hunts, fewer unclear versions, fewer proposal mismatches.

Claims to avoid unless verified:

- fake logos, fake testimonials, fake customers, fake usage metrics;
- `Trusted by`, `Used by`, `Customers include`, reviews, ratings, or adoption counts;
- final pricing or permanent free pricing;
- production maturity beyond MVP preview;
- security/compliance certifications;
- guaranteed savings, guaranteed accuracy, or risk-free estimating;
- `AI-powered` unless a specific approved public AI behavior exists.

## Recommended subpages and jobs

### 1. `/features` — highest priority

**User job:** Understand what Archestimator actually does beyond the homepage preview.

**Primary answer:** Archestimator is an estimating workspace where project hierarchy, reusable cost components, revisions, comparisons, visual breakdowns, proposal-ready outputs, and Excel/PDF handoff stay connected.

**Recommended page structure:**

1. Feature-page intro/H1 focused on construction-estimating clarity.
2. Method overview: project-shaped estimate logic.
3. Feature chapters for the seven public anchors.
4. Each chapter includes:
   - public feature name;
   - benefit line;
   - what the user can do;
   - what problem it replaces;
   - proof visual or diagram;
   - maturity label if needed: `Available in preview`, `MVP preview`, or `Planned`.
5. Final CTA to workspace/demo.

**Do not:** Present proposal outputs, revision intelligence, exports, or comparisons as production-finished unless the live product supports them.

### 2. `/pricing` — second priority

**User job:** Understand access, cost posture, and whether the product is ready enough to try.

**Primary answer:** Archestimator is currently an MVP preview / early-access estimating workspace, not a mature finalized pricing product.

**Recommended page structure:**

1. Pricing/early-access H1.
2. Honest MVP preview explanation.
3. What is included now.
4. What is still being shaped.
5. Pricing status:
   - avoid final tier cards unless approved;
   - if `₱0` appears, label it as preview/early-access only;
   - avoid implying permanent free pricing.
6. FAQ:
   - Is this production-ready?
   - What does MVP preview include?
   - Will pricing change later?
   - Who is this for?
   - Are exports/proposals available now or planned?
7. CTA to workspace/demo/contact.

**Do not:** Copy competitor tiering patterns before Philip approves the monetization model.

### 3. `/about` — useful, but must stay factual

**User job:** Understand why Archestimator exists and whether the product has a serious point of view.

**Primary answer:** Archestimator exists because construction estimating is too often scattered across files, duplicated spreadsheets, buried assumptions, and proposal cleanup.

**Recommended page structure:**

1. Why Archestimator exists.
2. The messy workflow problem.
3. The Archestimator way:
   - start with project structure;
   - price in context;
   - reuse what repeats;
   - keep assumptions attached;
   - make revisions visible;
   - compare options visually;
   - keep proposal output connected.
4. Who it is for first.
5. What Archestimator is not:
   - not a broad ERP;
   - not a takeoff-first product;
   - not AI magic;
   - not a finished enterprise platform.
6. Current stage and CTA.

**Open fact requirement:** Founder/company facts, geography, and legal entity wording need Philip confirmation before publication.

### 4. `/contact` — should exist once the contact mechanism is decided

**User job:** Request access, request a demo, ask a question, or give product feedback.

**Primary answer:** There is a clear, low-friction path to reach Archestimator.

**Recommended page structure:**

1. Contact/request access H1.
2. Primary path: request demo or early access.
3. Secondary paths:
   - product feedback;
   - design-partner inquiry;
   - support/login issue;
   - partnership/general inquiry.
4. Contact form or approved contact method.
5. Privacy note next to the form.
6. Success/error states.

**Open implementation requirement:** Decide backend destination before code: form action, email, CRM, Calendly, or mailto.

### 5. `/privacy` — likely required before broader public lead capture

**User job:** Understand how personal and project data is handled.

**Primary answer:** Archestimator handles contact/auth/project data according to a clear policy grounded in actual infrastructure and reviewed legal language.

**Recommended content areas:**

- data collected;
- auth/login data;
- project/estimate data;
- contact-form data;
- cookies/analytics: current `archestimator_cookie_consent` essential cookie, planned GA4/Clarity/A/B cookies after opt-in, and no PostHog unless a future ADR adopts it;
- service providers: Supabase, planned Google Analytics, planned Microsoft Clarity, hosting, and any selected contact/email provider;
- data retention/deletion;
- privacy contact;
- effective date.

**Open legal requirement:** Do not improvise legal policy. Draft from actual system facts, Phase 8 cookie/CSP/DPA docs, and `ab-testing-gdpr-international-compliance/05-analytics-stack-decision.md`, then get legal/human review.

### 6. `/security` — optional, only after a verified fact matrix

**User job:** Understand whether the product treats estimate/project data seriously.

**Primary answer:** Archestimator has a real technical security posture, but does not overclaim certifications.

**Safe only if verified:**

- Supabase Auth is used;
- workspace-scoped data model exists;
- RLS exists in schema direction;
- service-role key is never exposed client-side;
- local dev-auth bypass is localhost-only and disabled by default.

**Do not claim unless true and documented:**

- SOC 2;
- ISO;
- enterprise-grade security;
- encryption specifics beyond provider-backed facts;
- guaranteed data safety.

### 7. `/resources` — defer until real content exists

**User job:** Learn practical estimating concepts and discover Archestimator through search.

**Primary answer:** Archestimator publishes useful construction-estimating guidance, not thin SEO filler.

**Only launch when there are real briefs for:**

- construction cost estimating workflow;
- BOQ/proposal structure;
- revision/change-order estimating;
- Excel/PDF handoff;
- reusable component/cost library setup;
- proposal comparisons and visual breakdowns.

**Do not:** Launch an empty blog/resources index just to fill navigation.

## Route architecture options

### Option A — route group public shell

Potential later structure:

```txt
src/app/(public)/layout.tsx
src/app/(public)/page.tsx
src/app/(public)/features/page.tsx
src/app/(public)/pricing/page.tsx
src/app/(public)/about/page.tsx
src/app/(public)/contact/page.tsx
src/app/(public)/privacy/page.tsx
src/app/(public)/security/page.tsx
src/app/(public)/resources/page.tsx
src/app/(public)/resources/[slug]/page.tsx
```

Pros:

- clean public layout separation;
- shared public header/footer/metadata patterns;
- public URLs remain `/features`, `/pricing`, etc.

Risks:

- moving current `src/app/page.tsx` into a route group can accidentally disturb the accepted homepage hero and current landing behavior;
- route-group migration should not happen in the same pass as page-content work unless implementation risk is low and tests cover it.

### Option B — keep homepage in place, add shared public shell component

Potential later structure:

```txt
src/app/page.tsx
src/app/features/page.tsx
src/app/pricing/page.tsx
src/app/about/page.tsx
src/app/contact/page.tsx
src/app/privacy/page.tsx
src/app/security/page.tsx
src/components/landing/PublicPageShell.tsx
src/components/landing/public-pages/*
src/content/marketing/*
```

Pros:

- least risk to the accepted homepage;
- subpages can share `LandingHeader`, `LandingFooter`, CTA constants, and brand tokens without moving `/`;
- easy first implementation slice.

Risks:

- public/app route organization is less clean until route groups are introduced;
- shared metadata/sitemap patterns need discipline.

### Recommendation

For the first implementation pass, prefer **Option B** unless a route-group migration is explicitly approved. Keep `src/app/page.tsx` stable, add public subpages one at a time, and extract shared public-page chrome only as needed.

## Shared content architecture recommendation

When implementation is approved, avoid hardcoding page copy across several page components. Prefer a small content layer:

```txt
src/content/marketing/features.ts
src/content/marketing/pricing.ts
src/content/marketing/public-nav.ts
src/components/landing/PublicPageShell.tsx
src/components/landing/public-pages/FeatureChapter.tsx
src/components/landing/public-pages/PublicHero.tsx
src/components/landing/public-pages/PublicCTA.tsx
src/components/landing/public-pages/PublicFAQ.tsx
```

Rules:

- Keep public feature names in one source so homepage and `/features` do not drift.
- Keep maturity labels explicit where a feature is preview/planned.
- Keep CTAs aligned to existing `workshopHref` and `loginHref` constants unless contact routes are approved.
- Do not create fake customer-proof content arrays.

## Page-level information hierarchy

### `/features`

1. Product method claim.
2. Feature navigation or chapter list.
3. Seven feature chapters.
4. Proof visuals/diagrams.
5. CTA.

### `/pricing`

1. Early-access/pricing posture.
2. What is included in MVP preview.
3. What is not final yet.
4. FAQ.
5. CTA.

### `/about`

1. Why the product exists.
2. The messy workflow problem.
3. The Archestimator way.
4. Current stage / who it is for.
5. CTA.

### `/contact`

1. Request access/contact intent.
2. Form or approved contact method.
3. Inquiry categories.
4. Privacy note and success/error state.
5. Secondary route links.

### `/privacy` and `/security`

1. Plain-English trust/legal intro.
2. Fact-backed sections.
3. Effective date/contact.
4. No marketing exaggeration.

### `/resources`

1. Topic taxonomy.
2. Article/guide cards only when real content exists.
3. SEO metadata and internal linking.
4. Do not launch thin.

## Sequencing plan

### Phase 0 — Claims matrix before implementation

Create a claims matrix mapping every public feature to one of:

- live/implemented;
- MVP preview/mockup;
- planned/future;
- needs proof;
- should not be claimed publicly yet.

This is mandatory before `/features` or `/pricing` copy becomes implementation-ready.

### Phase 1 — Public shell and navigation decision

Decide:

- keep homepage in place or route group migration;
- route-aware header behavior;
- footer link behavior across real routes;
- active nav states;
- anchor fallback behavior from subpages back to homepage sections.

### Phase 2 — `/features` content plan and implementation slice

Build the deepest product explanation first. This page strengthens every other public page.

### Phase 3 — `/pricing` content plan and implementation slice

Build only after MVP-preview wording is approved and `₱0` semantics are clarified.

### Phase 4 — `/about` and `/contact`

Build when founder/company facts and contact destination are approved.

### Phase 5 — `/privacy` and optional `/security`

Build when legal/provider facts are gathered. Privacy is higher priority than security if contact forms or public lead capture are added. Use the Phase 8 cookie audit, DPA checklist, consent implementation state, Report-Only CSP state, and analytics-stack decision as the source of truth.

### Phase 6 — `/resources`

Build only after real resource briefs exist and SEO research has been done.

## Files likely to change later

When implementation is approved, likely files include:

- `src/app/features/page.tsx`
- `src/app/pricing/page.tsx`
- `src/app/about/page.tsx`
- `src/app/contact/page.tsx`
- `src/app/privacy/page.tsx`
- `src/app/security/page.tsx`
- `src/app/resources/page.tsx`
- `src/components/landing/LandingHeader.tsx`
- `src/components/landing/LandingFooter.tsx`
- `src/components/landing/PublicPageShell.tsx`
- `src/components/landing/public-pages/*`
- `src/content/marketing/*`
- `src/app/sitemap.ts`
- `src/app/robots.ts`
- focused tests under `tests/vitest/landing-*.test.tsx`

Do not change these during this planning pass.

## Analysis risks

1. **Thin-page risk:** Subpages that only repeat homepage copy will weaken credibility and SEO.
2. **Fake-maturity risk:** Features such as exports, proposal outputs, revision intelligence, and visual comparisons must be labeled by current maturity.
3. **Pricing risk:** `₱0` can be misread as permanent pricing if not framed as MVP preview.
4. **Legal/privacy risk:** Contact forms and auth data collection require privacy coverage grounded in current Phase 8 facts: consent banner/cookie implemented, GA4/Clarity planned but not wired, PostHog deferred, DPA/legal review open, and `/privacy`/`/terms` not yet shipped.
5. **Security-overclaim risk:** Do not turn Supabase/Auth/RLS facts into certifications.
6. **Navigation risk:** Header/footer anchors need route-aware behavior once subpages exist.
7. **Dirty-worktree risk:** The repo has many active uncommitted changes; implementation must isolate public-page work carefully.

## Acceptance criteria for this analysis plan

- It stays planning-only.
- It starts from current route/source evidence.
- It uses the brand folder as the public-copy source of truth.
- It defines clear jobs for pricing, features, about, contact, and support pages.
- It identifies implementation architecture without touching code.
- It marks the claims matrix as mandatory before implementation.
