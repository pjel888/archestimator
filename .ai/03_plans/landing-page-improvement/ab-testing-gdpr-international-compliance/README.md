# Landing Page: A/B Testing, GDPR Compliance & International Readiness

**Status:** Active planning; Phase 8a-i and first Phase 8b-i consent/CSP slice implemented; legal, analytics, privacy-page, and i18n gates still open; PostHog deferred from MVP landing stack
**Created:** 2026-05-27
**Parent plan:** `.ai/03_plans/landing-page-improvement/`
**Scope:** Public landing page `/` plus public marketing subpages (`/about`, `/features`, `/pricing`, `/contact`)

## Goal

Prepare the Archestimator public landing page and marketing subpages for:
1. **A/B testing infrastructure** — measure and optimize conversion from landing page to sign-up/workshop
2. **GDPR compliance** — cookie consent, data privacy notices, lawful basis for processing, and user data rights for EU/UK visitors
3. **International readiness** — i18n foundation, localization strategy, and multi-region compliance (GDPR, CCPA, etc.)

## Non-goals

- Do not touch the authenticated `/workshop/*` routes as part of this work except where GDPR data-access/deletion requests require backend audit support
- Do not change the above-the-fold hero (locked per current pass)
- Do not add fake pricing, fake testimonials, or unverified international claims
- Do not implement full i18n translation pipelines — scope to readiness planning and GDPR-first infrastructure

## Sub-workstreams

| Folder | Scope |
|--------|-------|
| `ab-testing/` | A/B testing tool selection, event taxonomy, conversion metrics, experiment governance |
| `gdpr-compliance/` | Cookie consent banner, privacy policy, data processing disclosure, user rights requests |
| `international-readiness/` | i18n strategy, locale routing, translation readiness, multi-region legal compliance |

## Documents in this folder

| # | File | Description |
|---|------|-------------|
| 00 | `00-blast-radius-implementation-analysis.md` | Full blast radius analysis: 30 files mapped, risk matrix, implementation order, dependency graph |
| 01 | `01-dependency-graph.md` | Raw dependency graph from code-review-graph trace (import trees, cross-contamination) |
| 02 | `02-cookie-csp-dpa-gap-closure.md` | Cookie audit, CSP policy recommendation, DPA verification checklist, @firecms/neat warning |
| 03 | `03-residual-risk-resolution.md` | Residual-risk register: verified planning facts, mitigations, and open gates |
| 04 | `04-current-audit-and-corrections.md` | Current audit corrections: live implementation state, overclaim cleanup, Next 16 proxy guidance, open gates |
| 05 | `05-analytics-stack-decision.md` | Official-doc decision record for GA4 + Clarity + custom A/B, with PostHog deferred unless product analytics/flags become explicit |
| — | `ab-testing/README.md` | A/B testing: Clarity + GA4 + custom code, event taxonomy, experiment governance, verification gates |
| — | `gdpr-compliance/README.md` | GDPR: cookie consent, privacy/terms pages, user data rights, account deletion flow |
| — | `international-readiness/README.md` | i18n: next-intl, locale routing, translation pipeline, construction glossary, sitemap |

## Implementation order

```
Phase 8a-i   DRY auth refactor (getLandingAuthState → shared lib) ✅ implemented
    │
    ├── Phase 8a-ii   i18n foundation (next-intl, existing src/proxy.ts, [locale] routing)
    ├── Phase 8b-i    Cookie consent banner + Report-Only CSP (GDPR) ✅ first slice implemented
    │       │
    │       ├── Phase 8b-ii   Privacy + Terms pages (GDPR)
    │       └── Phase 8c-i    GA4 + Clarity scripts (A/B testing) ← BLOCKED on consent-gated script wiring + pre-consent verification
    │               │
    │               └── Phase 8c-ii   Event tracking (A/B testing)
    │                       │
    │                       └── Phase 8c-iii  First experiment (A/B testing)
    │
    ├── Phase 8a-iii  Translation extraction (i18n)
    ├── Phase 8a-iv   Construction glossary (i18n)
    ├── Phase 8b-iii  User data rights (GDPR — workshop scope)
    └── Phase 8a-v    Sitemap + SEO (i18n)
```

**Parallelizable:** i18n foundation (8a-ii) and GDPR consent (8b-i) can proceed simultaneously after DRY refactor. A/B testing MUST wait for GDPR consent.

**Decision (2026-05-27):** Stack C — Microsoft Clarity (behavioral analytics) + Google Analytics 4 (conversion funnel) + custom code for A/B variant assignment (~150 lines, zero new dependencies). We won't onboard PostHog or any other third-party experiment service for MVP landing-page experiments. PostHog remains a future product-analytics/feature-flag option only if that need becomes explicit.

**Estimated total:** 7–9 implementation sessions across all phases (reduced from 8–11 due to custom code being lighter than SDK integration).

**Current audit correction (2026-05-27):** The prior "all residual risks resolved" wording was too strong. GA4/Clarity/PostHog implementation facts are verified for planning, and the first consent/CSP implementation slice now exists. DPA/legal review, privacy/terms pages, analytics scripts, A/B assignment, i18n proxy composition, and claims-matrix review remain open gates before Phase 8 can ship.

## Relationship to existing landing-page work

The active execution brief (`22-current-execution-brief.md`) covers below-hero layout, section reorder, and visual polish. This plan adds the compliance and growth layer on top — it does not replace or conflict with the current below-hero implementation.

## Deletion criteria

If Philip rejects this direction, archive this folder under `.ai/09_archive/store/` with a clear delta note.
