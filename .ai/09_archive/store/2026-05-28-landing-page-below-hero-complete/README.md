# Landing Page Improvement Plan

**Status:** Active planning folder
**Created:** 2026-05-21
**Updated:** 2026-05-27 14:50 PHT
**Route/screen:** `/` public landing page plus planned public marketing subpages.
**Current pass focus:** Below-hero conversion architecture, focused-middle container layout, locked-hero section reorder, Lenis smooth-scroll and soft section-settling correction, placeholder-safe company proof, brand-aligned feature icons, Kimi K2.6/frontend-design delegation, functional product tabs, no-new-package motion/interactivity readiness planning, professional footer work, public-subpage claims safety, planning for `/features`, `/pricing`, `/about`, `/contact`, and supporting trust/content pages, plus A/B testing infrastructure, GDPR compliance, and international readiness (`ab-testing-gdpr-international-compliance/`).
**Hard boundary:** Current user override on 2026-05-27 allows copy changes for the quote/proposal narrative pivot; do not change the accepted hero layout or visual system unless separately requested.
**Supersedes:** `.ai/09_archive/store/2026-05-21-intercom-v4-ui-ux-improvement-plan-superseded/intercom-v4-ui-ux-improvement-plan.md`

## User job

A company team creating detailed quotations or proposals should quickly understand why Archestimator helps them assemble, revise, compare, and hand off itemized commercial offers faster than disconnected spreadsheet/proposal workflows. Construction estimating remains the current implemented proof case.

## Goal

Improve the current public landing page using live repo evidence, not the outdated Intercom/v4 plan. The page should prove the hero claim by showing the actual Archestimator method: structured quote/estimate sheets, reusable supplier/catalog logic, traceable revisions, proposal comparisons, visual cost breakdowns, proposal-ready output direction, and spreadsheet/document handoff.

## Non-goals

- Do not revive the archived Intercom/v4 app-shell plan.
- Do not change authenticated `/workshop` routes as part of landing-page work unless the landing preview needs a static screenshot/mockup reference.
- Do not add fake logos, fake testimonials, fake usage metrics, or fake customer proof. Placeholder company entries are allowed only as clearly marked implementation scaffolding and must not read as real social proof.
- Do not imply finished pricing, finished export behavior, or production maturity beyond the current MVP-preview state.
- Do not let landing typography rules bleed into app/workshop surfaces; the non-landing 12px maximum still applies there.
- If Philip says the hero is acceptable for a future visual pass, lock the hero layout and improve the sections below it first; copy may still change when product positioning changes.

## Current source references

Code and design-system references:

- `src/app/page.tsx`
- `src/components/landing/LandingHeader.tsx`
- `src/components/landing/HeroSection.tsx`
- `src/components/landing/ProductPreview.tsx`
- `src/components/landing/SecondaryClaimSection.tsx`
- `src/components/landing/SolutionSection.tsx`
- `src/components/landing/EstimatorEngineSection.tsx`
- `src/components/landing/FeaturesSection.tsx`
- `src/components/landing/PartnerSection.tsx`
- `src/components/landing/PricingSection.tsx`
- `src/components/landing/FinalCTASection.tsx`
- `DESIGN.md`
- `src/app/globals.css`
- `package.json`

Brand and planning references:

- `.ai/06_specs/brand/README.md`
- `.ai/06_specs/brand/landing-brand-narrative-map.md`
- `.ai/06_specs/brand/public-facing-feature-copy.md`
- `.ai/06_specs/brand/benefits-and-value-props.md`
- `.ai/06_specs/brand/combined-benefit-title-system.md`
- `.ai/10_state/decisions.md` landing-copy decision from 2026-05-19

## Documents in this folder

1. `01-current-inventory.md` — current landing-page source inventory and immediate risks.
2. `02-ux-improvement-plan.md` — UX/content direction for the new pass.
3. `03-implementation-plan.md` — implementation slices and validation gates.
4. `04-readiness-gate.md` — pre-implementation and completion checklist.
5. `05-archived-plan-delta.md` — explicit differences from the archived Intercom/v4 plan.
6. `06-brand-source-synthesis.md` — brand-folder synthesis translated into below-hero landing constraints.
7. `07-below-hero-container-layout-plan.md` — Tailwind container/focused-middle layout plan for sections below the locked hero.
8. `08-motion-and-microinteraction-plan.md` — CSS/IntersectionObserver-first motion plan with Lenis smooth-scroll spike criteria and GSAP fallback criteria.
9. `09-readiness-and-release-plan.md` — implementation readiness, QA matrix, accessibility gate, and release evidence checklist.
10. `10-conversion-flow-and-company-carousel-research.md` — research-backed conversion flow and full-width post-hero company carousel plan.
11. `11-lenis-smooth-scroll-and-placeholder-company-proof-plan.md` — Lenis smooth-scroll package plan plus placeholder company proof guardrails.
12. `12-kimi-k2-6-landing-page-prompting-and-delegation-plan.md` — Kimi K2.6 research, prompt structure, direct CLI notes, and copy-paste delegation prompts.
13. `13-below-hero-interactivity-readiness-plan.md` — Kimi-informed functional-tabs, IntersectionObserver reveal, no-new-package interactivity plan and readiness gate.
14. `14-public-subpages-analysis-plan.md` — analysis plan for dedicated public subpages including recommended routes, jobs, architecture options, and route-specific hierarchy.
15. `15-public-subpages-research-plan.md` — research backlog for feature maturity, pricing, about/contact facts, privacy/security, SEO, and competitor refresh work.
16. `16-public-subpages-readiness-and-gate-plan.md` — implementation and release readiness gates for public subpages, including SEO, accessibility, proof safety, responsive QA, and validation requirements.
17. `17-public-subpages-claims-matrix.md` — claim-maturity source of truth for public pages, separating live MVP features from preview, planned, and unsafe claims.
18. `18-scroll-snap-section-order-feature-icons-plan.md` — below-hero section order, focused container, Lenis snap, lag reduction, and five feature-icon implementation route.
19. `19-cinematic-scroll-performance-correction-plan.md` — correction plan for replacing hard slideshow snap with Lenis-first cinematic smooth scrolling and soft section settling.
20. `20-landing-page-audit-and-marketing-synthesis.md` — comprehensive performance, SEO, UX, UI, and marketing audit with actionable PLG recommendations.
21. `21-b2b-saas-and-estimation-landing-page-best-practices.md` — detailed research and best-practices guide for tech startups and vertical B2B SaaS apps like Archestimator.
22. `22-current-execution-brief.md` — approved and active implementation guide for the current below-hero pass.
23. `23-comprehensive-landing-page-research-and-strategy.md` — master landing page playbook consolidating general and vertical-specific best practices, competitor analysis, current audits, and the below-hero blueprint.
24. `ab-testing-gdpr-international-compliance/` — A/B testing infrastructure, GDPR cookie consent and data privacy compliance, and international readiness/i18n planning for the public landing page and marketing subpages. Current truth: first consent banner/cookie and public-route Report-Only CSP slice exists; GA4, Microsoft Clarity, A/B assignment, privacy/terms pages, DPA/legal review, strict CSP, and i18n proxy composition remain open. PostHog is explicitly deferred from the MVP landing stack unless future product analytics/feature flags are approved.
    - `ab-testing/README.md` — A/B testing tool selection, event taxonomy, conversion metrics, experiment governance
    - `gdpr-compliance/README.md` — cookie consent, privacy policy, data processing disclosure, user data rights, Supabase DPA review
    - `international-readiness/README.md` — i18n strategy, locale routing, translation readiness, multi-region legal compliance (GDPR, CCPA, etc.)
    - `05-analytics-stack-decision.md` — official-doc GA4/Clarity/PostHog stack decision

## Deletion criteria

If Philip rejects this direction, delete or archive this folder as a scoped planning artifact. Do not preserve it as hidden active direction.
