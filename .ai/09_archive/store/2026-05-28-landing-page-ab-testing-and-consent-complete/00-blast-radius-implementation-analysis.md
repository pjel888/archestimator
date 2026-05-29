# Blast Radius & Implementation Analysis

**Status:** Active analysis; Phase 8a-i DRY auth refactor implemented; PostHog deferred from MVP landing stack
**Created:** 2026-05-27
**Source evidence:** Live repo scan, code-review-graph dependency trace, proxy/auth audit
**Generated graph:** `01-dependency-graph.md` (moved from repo root 2026-05-27)

## 1. Source Inventory — 30 files in blast radius

### Landing components (`src/components/landing/` — 27 files)

```
HeroSection.tsx                    LandingHeader.tsx              LandingFooter.tsx
SecondaryClaimSection.tsx          SolutionSection.tsx            PricingSection.tsx
FAQSection.tsx                     FinalCTASection.tsx            FeaturesSection.tsx
ProductShowcaseSection.tsx         ProductPreview.tsx             ProductPreviewVariants.tsx
CompanyProofCarouselSection.tsx    EstimatorEngineSection.tsx     PartnerSection.tsx
TestimonialSection.tsx             ContactForm.tsx                AnnouncementBanner.tsx
SectionIntro.tsx                   CtaLink.tsx                    PlaceholderMedia.tsx
MotionReveal.tsx                   NeatWireframeBackground.tsx    LandingSmoothScrollProvider.tsx
PublicPageShell.tsx                constants.ts                   company-proof-data.ts
index.ts
```

### Landing pages (`src/app/` — 5 entry points)

```
src/app/page.tsx                   — imports 13 components (full landing)
src/app/about/page.tsx             — imports PublicPageShell
src/app/features/page.tsx          — imports PublicPageShell
src/app/pricing/page.tsx           — imports PublicPageShell
src/app/contact/page.tsx           — imports PublicPageShell + ContactForm
```

### Shared infrastructure touched by ALL landing pages

```
src/app/layout.tsx                 — root layout (fonts, CSS, AppProviders)
src/app/providers.tsx              — React Query + ToastProvider (global)
src/app/globals.css                — global styles
src/lib/supabase/server.ts         — Supabase server client (auth state check)
src/proxy.ts                       — Next 16 Proxy route gating (workshop/auth today; future locale routing must compose here)
next.config.ts                     — no i18n config yet
package.json                       — deps: lenis, @firecms/neat, @phosphor-icons/react
```

## 2. Blast Radius by Workstream

### 2.1 A/B Testing Infrastructure

**Files changed:** 8–12 (custom framework + GA4/Clarity script injection)
**Risk level:** MEDIUM
**Selected stack:** Microsoft Clarity (behavioral analytics) + Google Analytics 4 (conversion funnel) + custom code (variant assignment). PostHog is deferred unless product analytics, feature flags, native experiments, or consolidation become explicit future requirements.
**Zero new dependencies in `package.json`**

| Change | Files affected | Risk |
|--------|---------------|------|
| GA4 script injection | `PublicPageShell.tsx` via `@next/third-parties/google` | LOW — consent-gated |
| Clarity script injection | `PublicPageShell.tsx` | LOW — consent-gated |
| Custom A/B framework | NEW `src/lib/ab-testing/` (types, assigner, tracker, calculator) | LOW — pure TypeScript, testable |
| ABExperimentProvider | NEW `src/components/landing/ABExperimentProvider.tsx` | LOW — consent-gated client wrapper |
| Variant-aware rendering | `src/app/page.tsx`, `HeroSection.tsx` | LOW — server prop |
| GA4 CTA click events | `LandingHeader.tsx`, `FinalCTASection.tsx`, `PricingSection.tsx` | LOW — additive `gtag()` calls |
| Clarity custom events | Via experiment-tracker.ts (shared helper) | LOW |
| GDPR consent gate | See §2.2 below | **DEPENDENCY**: GA4 + Clarity must not fire before consent |

**Microsoft Clarity note:** Clarity provides heatmaps, session recordings, custom tags, and custom events, but it does NOT handle A/B variant assignment. The custom `src/lib/ab-testing/` framework handles assignment. Use `window.clarity("set", "experiment_id", "...")`, `window.clarity("set", "variant", "...")`, and `window.clarity("event", "experiment_view")` after analytics consent so recordings can be filtered by experiment context.

### 2.2 GDPR Compliance

**Files changed:** first slice changed 4 code/test areas; full GDPR scope remains 8–12+ files (banner, legal pages, footer links, deletion/export flows)
**Risk level:** HIGH for full scope — touches auth, Supabase, public page shell, and eventually workshop data rights

| Change | Files affected | Risk |
|--------|---------------|------|
| Cookie consent banner component | NEW `src/components/landing/CookieConsentBanner.tsx` | LOW — scoped component; implemented |
| Banner mount in PublicPageShell | `PublicPageShell.tsx` (NOT root layout — zero workshop exposure) | LOW; implemented |
| Consent utilities | NEW `src/lib/landing/consent.ts` | LOW — parser/serializer/version helpers; implemented |
| CSP Report-Only header | `next.config.ts` public marketing route headers | LOW — report-only; implemented |
| Privacy policy page | NEW `src/app/privacy/page.tsx` + `PublicPageShell` | LOW — new route |
| Terms of service page | NEW `src/app/terms/page.tsx` + `PublicPageShell` | LOW — new route |
| Cookie settings trigger | `CookieConsentBanner.tsx`; optional future footer link | LOW — fixed public trigger implemented, footer link still optional |
| Privacy/terms links in footer | `LandingFooter.tsx` | LOW — two link additions |
| User data export flow | NEW `src/app/workshop/settings/data-export/` or modal | **MEDIUM** — workshop route; Supabase reads |
| Account deletion flow | NEW modal + server action | **HIGH** — destructive; cascades through workspace data, uploaded files, AI audit |
| `getLandingAuthState` DRY fix | 5 page files → extract to `src/lib/landing/get-landing-auth-state.ts` | LOW — pure refactor but touches 5 entry points; implemented |

**Critical constraint:** Cookie consent banner must NOT block SEO. The current banner is mounted only through `PublicPageShell` and does not hide page content. Googlebot must be able to index the page without accepting cookies; verify this explicitly before public launch.

**Root layout impact:**
```typescript
// layout.tsx — careful: this wraps workshop too
// Option A: mount banner only for landing routes via pathname check
// Option B: mount in PublicPageShell instead (landing-only)
// RECOMMENDED: Option B — zero workshop exposure
```

### 2.3 International Readiness (i18n)

**Files changed:** 15–20 (locale routing, translation files, all landing pages)
**Risk level:** HIGH — changes URL structure, affects every landing page and SEO

| Change | Files affected | Risk |
|--------|---------------|------|
| `next-intl` install | `package.json` | LOW — additive |
| i18n proxy composition | UPDATE `src/proxy.ts` | **HIGH** — Proxy runs on matched requests; must preserve existing `/workshop/*`, `/api/*`, `/login`, and `/auth/*` behavior |
| Locale layout | `src/app/[locale]/layout.tsx` (NEW) | **HIGH** — structural change to route tree |
| Locale-prefixed pages | Move 5 pages to `src/app/[locale]/page.tsx`, `[locale]/about/page.tsx`, etc. | **HIGH** — every landing route changes |
| Translation message files | NEW `messages/en.json`, `messages/es.json`, etc. | LOW — additive data |
| Content extraction | `page.tsx`, all landing components (headlines, CTAs, labels) | **MEDIUM** — all copy moved to message keys |
| Sitemap regeneration | `src/app/sitemap.ts` (NEW or updated) | LOW — SEO dependency |
| Redirect from `/` → `/[defaultLocale]` | Middleware or `next.config.ts` | MEDIUM — URL canonicalization |
| `next.config.ts` i18n | Add `i18n` config or `next-intl` plugin | LOW — config only |

**Critical constraint:** Locale prefix must NOT apply to:
- `/workshop/*` — authenticated routes (English-only for now)
- `/api/*` — API routes
- `/login`, `/auth/callback` — auth routes
- `/_next/*`, `/favicon.ico` — Next.js internals

**Next.js 16 Proxy guard:**
```typescript
// src/proxy.ts — compose with the existing auth proxy; do not add a second middleware file
const PUBLIC_ONLY = /^\/($|about|features|pricing|contact|privacy|terms)/;
if (!PUBLIC_ONLY.test(pathname)) return; // skip workshop, api, auth
```

## 3. Dependency & Coupling Map

### Clean boundaries (no change needed)
- Landing ↔ Workshop: **Zero direct imports** ✅
- Landing components ↔ `src/components/ui/*`: **Zero direct imports** ✅

### Coupling that requires caution

| Coupling point | What it means | Mitigation |
|---------------|---------------|------------|
| `app/layout.tsx` wraps everything | Font, CSS, metadata, AppProviders affect workshop | Keep landing-only concerns out of root layout |
| `app/providers.tsx` wraps everything | Analytics scripts must NOT init here | Use landing-scoped scripts in `PublicPageShell` |
| `createSupabaseServerClient` used by landing | Auth state check runs on landing pages | Keep as-is; GDPR doesn't change this |
| `getLandingAuthState` duplicated 5× | DRY violation; fix before adding GDPR | Extract to `src/lib/landing/getLandingAuthState.ts` |
| `LandingSmoothScrollProvider` wraps all sections | Lenis affects scroll behavior across all sections | A/B test variants must work inside Lenis container |
| `constants.ts` (loginHref, workshopHref) | Central route constants | Add locale-aware helpers for i18n |

## 4. Implementation Order & Gating Dependencies

```
                                ┌─────────────────┐
                                │  DRY auth refactor│ ← prerequisite: touch zero behavior
                                │  (5 pages → 1 lib)│
                                └────────┬────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
           ┌───────────────┐   ┌───────────────┐   ┌────────────────┐
           │ GDPR Consent   │   │ Privacy + Terms│   │ i18n Foundation │
           │ Banner         │   │ Pages          │   │ (next-intl,     │
           │ (custom comp)  │   │ (NEW routes)   │   │  proxy)          │
           └───────┬───────┘   └───────┬───────┘   └───────┬────────┘
                   │                   │                   │
                   │    ┌──────────────┘                   │
                   │    ▼                                  │
                   │  ┌────────────────┐                   │
                   │  │ Footer links   │                   │
                   │  │ (privacy,terms,│                   │
                   │  │  cookie prefs) │                   │
                   │  └────────────────┘                   │
                   │                                       │
                   ▼                                       │
           ┌───────────────┐                              │
           │ GA4 + Clarity  │ ← BLOCKED on consent-gated    │
           │ + Custom A/B   │                              │
           │ framework      │                              │
           └───────┬───────┘                              │
                   │                                       │
                   ▼                                       ▼
           ┌───────────────┐                    ┌────────────────┐
           │ First A/B test │                    │ Translation     │
           │ (hero CTA copy)│                    │ extraction      │
           └───────────────┘                    └────────────────┘
```

### Implementation phases

**Phase 8a — Foundation (estimated 2–3 sessions)**
1. Extract `getLandingAuthState` to shared lib (5 files → 1, zero behavior change) — implemented 2026-05-27
2. Create `src/lib/landing/` directory structure
3. Add `next-intl` + compose locale routing into existing `src/proxy.ts` (locale prefix for public-only routes)

**Phase 8b — GDPR + Legal (estimated 2–3 sessions)**
4. Create `/privacy` and `/terms` page routes with `PublicPageShell`
5. Implement `CookieConsentBanner` component (mounted in `PublicPageShell`, NOT root layout)
6. Add a landing-scoped consent hook/provider over `src/lib/landing/consent.ts` only if the current banner state is not enough for analytics event timing
7. Update `LandingFooter` with privacy, terms, and cookie settings links
8. Add user data export and account deletion flows (workshop routes)

**Phase 8c — A/B Testing (estimated 1–2 sessions)**
9. Add GA4 script via `@next/third-parties/google` in `PublicPageShell` (consent-gated)
10. Add Clarity script in `PublicPageShell` (consent-gated)
11. Create `src/lib/ab-testing/` framework (types, variant assigner, experiment tracker, results calculator)
12. Create `ABExperimentProvider` component (consent-gated client wrapper)
13. Wire `getVariant()` into `page.tsx` and `HeroSection`
14. Create first experiment config: `01-hero-cta-copy.ts`
15. Keep PostHog out of `package.json`, CSP, environment docs, and current privacy processor lists unless a future ADR supersedes `05-analytics-stack-decision.md`

**Phase 8d — i18n Content (estimated 2–3 sessions)**
13. Extract English strings to `messages/en.json`
14. Move landing pages to `src/app/[locale]/` route structure
15. Set up redirect from `/` → `/en` (or default locale)
16. Send legal pages for professional translation (privacy, terms — highest risk)
17. Send marketing pages for human translation with construction glossary
18. Regenerate sitemap with locale alternates

## 5. Risk Matrix

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Cookie banner blocks SEO crawlers | MEDIUM | HIGH | Progressive enhancement pattern; test with Googlebot UA |
| Root layout changes leak into workshop | MEDIUM | HIGH | Mount banner in `PublicPageShell`, not root layout |
| Locale proxy breaks `/workshop/*` | MEDIUM | HIGH | Explicit route exclusions in `src/proxy.ts`; add E2E smoke |
| Account deletion cascades wrong rows | LOW | CRITICAL | Soft-delete + grace period; Supabase RLS as safety net |
| GA4/Clarity fire before consent | MEDIUM | MEDIUM | Consent gate in ABExperimentProvider; test with DevTools network tab |
| PostHog added before product need exists | MEDIUM | MEDIUM | Treat as future ADR only; no PostHog package/script/CSP/privacy entry in MVP landing stack |
| `getLandingAuthState` DRY changes break auth | LOW | MEDIUM | Pure extraction — no behavior change; verify with existing auth flow |
| Legal translations have errors | LOW | HIGH | Professional translator + construction glossary; legal review |
| i18n breaks Lenis smooth scroll | LOW | LOW | Locale is a route prefix — Lenis mounts inside the page, unaffected |
| A/B variant causes layout shift (CLS) | MEDIUM | MEDIUM | SSR-safe variant assignment via cookie; no client-side pop-in |

## 6. Testing Strategy

### Existing coverage: NONE
Zero landing page tests exist in the repo. All testing must be built from scratch.

### Required tests (per workstream)

**Foundation (DRY + i18n setup):**
- [x] `getLandingAuthState` returns boolean (unit)
- [ ] Proxy routes `/` → `/[locale]` when i18n is active
- [ ] Proxy does NOT redirect `/workshop/*`, `/api/*`, `/login`, or `/auth/*`
- [ ] `/[locale]/` renders landing page identically to current `/`

**GDPR:**
- [ ] Cookie banner renders on first visit (no consent cookie)
- [ ] Cookie banner DOES NOT render when consent cookie exists
- [ ] Consent cookie stores preferences correctly
- [ ] GA4 and Clarity scripts do NOT load before analytics consent
- [ ] Privacy page accessible at `/privacy` (200)
- [ ] Terms page accessible at `/terms` (200)
- [ ] Footer links point to privacy, terms, and reopen cookie settings

**A/B Testing:**
- [ ] GA4 script loads after analytics consent granted (network tab)
- [ ] Clarity script loads after analytics consent granted
- [ ] Experiment variant cookie `ab_test` is not set before analytics consent and is set only after consent
- [ ] Same visitor always sees the same variant (cookie persists)
- [ ] Variant renders correctly (SSR — no flash of wrong content)
- [ ] CTA click events fire with variant metadata in GA4 real-time report
- [ ] Signup/workshop conversion events explicitly include `experiment_id` and `variant` when an assignment exists
- [ ] PostHog remains absent from network/CSP/package/privacy current-processor scope
- [ ] Results calculator returns correct rates, uplift, and significance for known test data (unit test)

**i18n:**
- [ ] `/en` renders English landing page
- [ ] `/es` renders Spanish landing page (when messages exist)
- [ ] Missing locale redirects to default
- [ ] Sitemap includes locale alternates
- [ ] hreflang tags are correct

**Account deletion:**
- [ ] Soft-delete marks user as deleted (not immediate hard delete)
- [ ] Deleted user cannot log in
- [ ] Workspace data is scheduled for deletion (grace period)
- [ ] Uploaded files are purged after grace period

## 7. Verification Gates

For each phase, run before claiming completion:

```bash
bun run validate        # type-check + lint
bun run build           # production build
git diff --check        # whitespace hygiene
```

Plus manual browser checks:
- Landing page renders at `/` (or `/[locale]`)
- Cookie banner appears on first visit
- Privacy/terms pages accessible
- `/workshop` still loads and functions
- No console errors on landing page
- `prefers-reduced-motion` respected (no forced scroll/animation)

## 8. Cleanup

The raw dependency graph at `01-dependency-graph.md` in this folder is the canonical reference. No temp files remain at repo root.

The DRY `getLandingAuthState` refactor is implemented in `src/lib/landing/get-landing-auth-state.ts` and should remain a zero-behavior extraction. Keep future auth behavior changes separate from landing analytics/compliance work.
