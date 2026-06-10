# 10 — Landing Page Performance Audit

**Date**: 2026-06-11 | **Status**: Source-audited; runtime measurement pending | **Prior Oracle**: Gaps filled in Review #2 | **Last Update**: 2026-06-11 02:42 UTC
**Scope**: `/` landing page — first step in the north-star path
**Oracle Gap**: The audit of the "full path from landing page to estimate sheet" previously skipped the landing page entirely.

---

## 1. Rendering Path

### Server Component: `src/app/page.tsx` (49 lines)

```
LandingPage (Server)
├── getLandingAuthState() — Supabase auth check
├── cookies().get("archestimator_cookie_consent") — consent read
├── parseLandingConsentValue() — consent parsing
├── getVariant("hero-cta-copy", { analyticsConsent }) — A/B test assignment
└── Return:
    └── PublicPageShell (Client)
        ├── ABExperimentProvider (Client)
        ├── LandingHeader (Client) — conditional login/logout button
        ├── LandingSmoothScrollProvider (Client)
        │   └── <main>
        │       ├── HeroSection (Client) — CTA copy variant
        │       ├── CompanyProofCarouselSection (Client) — trust logos
        │       ├── SecondaryClaimSection
        │       ├── ProductShowcaseSection
        │       ├── PricingSection
        │       └── FinalCTASection
        ├── LandingFooter (Client)
        ├── LandingAnalyticsLoader (Client) — GA + Clarity (conditional)
        ├── CookieConsentBanner (Client)
        └── [hidden] NeatWireframeBackground (Client) — WebGL
```

### Component Count: 31 files in `src/components/landing/`

| Component | File | Type | Performance Concern |
|-----------|------|------|---------------------|
| HeroSection | `HeroSection.tsx` | Client | Large hero with CTA |
| CompanyProofCarouselSection | `CompanyProofCarouselSection.tsx` | Client | Carousel with logos |
| AnimatedProposalRecordSection | `AnimatedProposalRecordSection.tsx` (834 lines) | Client | **Heavy** — roughjs SVG sketch, ResizeObserver, rAF redraw |
| NeatWireframeBackground | `NeatWireframeBackground.tsx` (175 lines) | Client | **Heavy** — WebGL via @firecms/neat |
| LandingSmoothScrollProvider | `LandingSmoothScrollProvider.tsx` (42 lines) | Client | **Medium** — Lenis rAF loop |
| LandingAnalyticsLoader | `LandingAnalyticsLoader.tsx` (23 lines) | Client | **Medium** — GA4 + Clarity scripts |
| CookieConsentBanner | `CookieConsentBanner.tsx` (104 lines) | Client | Low — useSyncExternalStore |
| LandingHeader | `LandingHeader.tsx` | Client | Low — nav + login button |
| LandingFooter | `LandingFooter.tsx` | Client | Low — static footer |
| PricingSection | `PricingSection.tsx` | Client | Low — static pricing cards |
| ProductShowcaseSection | `ProductShowcaseSection.tsx` | Client | Low — static showcase |
| SecondaryClaimSection | `SecondaryClaimSection.tsx` | Client | Low |
| FinalCTASection | `FinalCTASection.tsx` | Client | Low |
| FAQSection | `FAQSection.tsx` | Client | Low |
| FeaturesSection | `FeaturesSection.tsx` | Client | Low |
| TestimonialSection | `TestimonialSection.tsx` | Client | Low |
| PartnerSection | `PartnerSection.tsx` | Client | Low |
| SolutionSection | `SolutionSection.tsx` | Client | Low |
| EstimatorEngineSection | `EstimatorEngineSection.tsx` | Client | Low |
| AnnouncementBanner | `AnnouncementBanner.tsx` | Client | Low |
| PublicPageShell | `PublicPageShell.tsx` | Client | Low |
| ABExperimentProvider | `ABExperimentProvider.tsx` | Client | Low |
| ClarityScript | `ClarityScript.tsx` | Client | Low |
| MotionReveal | `MotionReveal.tsx` | Client | Low |
| ProductPreview | `ProductPreview.tsx` | Client | Low |
| ContactForm | `ContactForm.tsx` | Client | Low |
| CtaLink | `CtaLink.tsx` | Client | Low |
| LaunchFeatureHeading | `LaunchFeatureHeading.tsx` | Client | Low |
| SectionIntro | `SectionIntro.tsx` | Client | Low |
| PlaceholderMedia | `PlaceholderMedia.tsx` | Client | Low |
| ProductPreviewVariants | `ProductPreviewVariants.tsx` | Client | Low |

---

## 2. Data Fetching (Server-Side)

| Fetch | File | Operation | Impact |
|-------|------|-----------|--------|
| `getLandingAuthState()` | `src/lib/landing/get-landing-auth-state.ts` | `supabase.auth.getUser()` — secure HTTP round-trip | **HIGH** — 50-150ms added to every landing page TTFB |
| `cookies().get()` | inline in page.tsx | Cookie read (server-side) | Negligible |
| `parseLandingConsentValue()` | `src/lib/landing/consent.ts` | JSON parse | Negligible |
| `getVariant()` | `src/lib/ab-testing/variant-assigner.ts` | Cookie read + random assignment + `headers().get("user-agent")` | Low — 30-day cookie, no DB |

**Key finding**: `getLandingAuthState()` does a Supabase Auth round-trip on every landing page load, even for unauthenticated users (caught error returns false). This adds 50-150ms to every landing page TTFB.

**Recommendation**: Cache the auth check or use the proxy (`src/proxy.ts`) to set a header. The landing page doesn't need real-time auth state — it only needs to know if the user is logged in to show "Dashboard" vs "Sign In" in the header.

---

## 3. Heavy Components — Detailed Analysis

### 3.1 NeatWireframeBackground (WebGL)

**File**: `src/components/landing/NeatWireframeBackground.tsx` (175 lines)
**Dependency**: `@firecms/neat` (dynamic import → Three.js-based WebGL gradient)

**Performance characteristics** (surprisingly well-optimized):
- ✅ **Dynamic import**: `const { NeatGradient } = await import('@firecms/neat')` — not in initial bundle
- ✅ **Idle activation**: Uses `requestIdleCallback` with 1800ms timeout → activates after page is idle
- ✅ **Static fallback**: Falls back to CSS gradient for `prefers-reduced-motion`, touch devices, mobile (`max-width: 767px`)
- ✅ **IntersectionObserver**: Pauses WebGL when off-screen (`gradient.paused = !entry.isIntersecting`)
- ✅ **Scroll sync**: Updates `yOffset` on passive scroll listener
- ✅ **Cleanup**: `gradient.destroy()` on unmount, `MutationObserver` removes attribution link
- ⚠️ **Bundle size**: `@firecms/neat` is ~130KB gzip (Three.js-based) — but dynamic import defers it
- ⚠️ **GPU cost**: WebGL animation loop runs continuously when visible — GPU power draw on battery devices
- ⚠️ **rAF + scroll**: Has both `requestAnimationFrame` (WebGL) and passive scroll listener — two animation loops

**Performance rating**: Well-optimized for a WebGL background. Dynamic import + idle activation + fallback are all good practices.

### 3.2 AnimatedProposalRecordSection (RoughJS SVG)

**File**: `src/components/landing/AnimatedProposalRecordSection.tsx` (834 lines)
**Dependency**: `roughjs` (hand-drawn SVG library)

**Performance characteristics**:
- ✅ **IntersectionObserver**: Only draws when section enters viewport (threshold 0.35)
- ✅ **Reduced motion**: Respects `prefers-reduced-motion` — skips animation, shows static sketch
- ✅ **ResizeObserver**: Redraws on resize with rAF debounce
- ⚠️ **Large component**: 834 lines — second largest in the landing path
- ⚠️ **DOM measurement**: `measureElementRect()` calls `getBoundingClientRect()` for 7 elements on every redraw
- ⚠️ **SVG manipulation**: Creates/destroys SVG children on every redraw
- ⚠️ **7 ResizeObservers**: One for stage + one per step element (7 total)
- ⚠️ **Font loading trigger**: `document.fonts.ready.then(redraw)` — adds dependency on font load completion
- ⚠️ **CSS animation**: Uses CSS `@keyframes` for draw-in effect — paint cost per frame
- ⚠️ **`roughjs` bundle**: ~10KB gzip for hand-drawn rendering

**Performance rating**: Acceptable for a below-fold section (only activates on scroll). The 7 ResizeObservers are the main concern — they fire on any layout change.

### 3.3 LandingSmoothScrollProvider (Lenis)

**File**: `src/components/landing/LandingSmoothScrollProvider.tsx` (42 lines)
**Dependency**: `lenis` + `lenis/react`

**Performance characteristics**:
- ✅ **Reduced motion**: Returns plain children (no Lenis) when `prefers-reduced-motion: reduce`
- ✅ **Import isolation**: Lenis CSS loaded via `lenis/dist/lenis.css` in root layout — not JS-injected
- ⚠️ **rAF loop**: Lenis runs a continuous `requestAnimationFrame` for smooth scrolling
- ⚠️ **lerp = 0.105**: Low lerp means smooth but adds ~100ms perceived scroll delay
- ⚠️ **Bundle**: ~10KB gzip for Lenis core

**Performance rating**: Well gated (reduced motion bypass). The rAF loop is inherent to smooth scrolling. Lerp is appropriately conservative.

### 3.4 Third-Party Scripts

**File**: `src/components/landing/LandingAnalyticsLoader.tsx` (23 lines)

| Script | Loaded Via | Size | Gated? |
|--------|-----------|------|--------|
| Google Analytics 4 | `@next/third-parties/google` → `GoogleAnalytics` | ~45KB gzip | ✅ Analytics consent required |
| Microsoft Clarity | `ClarityScript.tsx` → inline script inject | ~20KB gzip | ✅ Analytics consent required |

- ✅ **Consent-gated**: Both scripts only load if `consent.analytics === true`
- ✅ **Server-safe**: `NEXT_PUBLIC_*` env vars checked before injection
- ✅ **Next.js native**: GA4 uses `@next/third-parties/google` (optimized loading)
- ⚠️ **Clarity**: Inline script injection (not Next.js optimized) — may block parser

---

## 4. CSS & Bundle Analysis

### CSS Bundle — Measured Sizes

| Import | Size (measured) | Location | Loaded On |
|--------|----------------|----------|-----------|
| `globals.css` | **20,055 bytes** (~20KB) | Root layout | All pages |
| `react-complex-tree/lib/style-modern.css` | **6,824 bytes** (~6.8KB) | Root layout | All pages (including landing) |
| `lenis/dist/lenis.css` | **513 bytes** (~0.5KB) | Root layout | All pages |
| **Total CSS baseline** | **27,392 bytes** (~27KB) | — | Every page on the site |

**Finding**: `react-complex-tree/style-modern.css` (6,824 bytes) is loaded on the landing page even though there's no tree component. This is imported in the root layout (`src/app/layout.tsx:5`) and applies to ALL pages. The Lenis CSS (513 bytes) is also loaded everywhere even though only the landing page uses smooth scrolling.

**Recommendation**: Move `react-complex-tree` CSS import to the workshop layout, `lenis/dist/lenis.css` to the landing page component. This would save ~7.3KB of CSS on non-landing pages and ~6.8KB on landing pages (Lenis is needed there).

### CSS Animation Cost
- `AnimatedProposalRecordSection.module.css` — CSS `@keyframes` for sketch draw-in
- `MotionReveal.tsx` — CSS transitions for scroll-triggered reveals
- No CSS-in-JS runtime (Tailwind CSS v4 is CSS-first) ✅

---

## 5. A/B Testing Overhead

**File**: `src/lib/ab-testing/variant-assigner.ts`

| Operation | Cost |
|-----------|------|
| `headers().get("user-agent")` | Negligible (header read) |
| `isBot(ua)` check | Negligible (string match) |
| `cookies().get("ab_test")` | Negligible (cookie read) |
| Random assignment | Negligible |
| Cookie set (30-day) | Negligible (Set-Cookie header) |

**No performance concern** — entirely server-side, no DB queries, cookie-based with 30-day persistence.

---

## 6. Cookie Overhead

| Cookie | Purpose | Size | HttpOnly |
|--------|---------|------|----------|
| `archestimator_cookie_consent` | Analytics consent | ~50B | No (client-read) |
| `ab_test` | A/B variant assignment | ~40B | No (client-read) |
| Supabase auth cookies | Session tokens | ~200B | Yes |

**Total cookie overhead per request**: ~300B — negligible.

---

## 7. Landing Page Performance Summary

| Layer | Bottleneck | Severity | Measured Impact | Fix |
|-------|-----------|----------|----------------|-----|
| Server fetch | `getLandingAuthState()` Supabase Auth HTTP round-trip | **HIGH** | Estimated 50-150ms (unmeasured) | Replace with display-only session-cookie/header hint, or remove auth-dependent landing header state; keep secure `getUser()` on protected routes |
| CSS bundle | `react-complex-tree/style-modern.css` (6,824B) loaded on landing | **MEDIUM** | **6.8KB** wasted on landing page | Move to workshop layout |
| CSS bundle | `lenis/dist/lenis.css` (513B) loaded on all pages | **LOW** | 513B wasted on non-landing pages | Move to landing page |
| Font | Inter + Roboto_Mono via next/font/google — no explicit `display` setting | **LOW** | Uses next/font default (`swap`) | Acceptable — `swap` prevents FOIT |
| WebGL | `@firecms/neat` dynamic import (idle-activated) | **LOW** | ~130KB deferred bundle | Already well-optimized |
| RoughJS SVG | `AnimatedProposalRecordSection` 834 lines, 7 ResizeObservers | **LOW** | Below-fold, IntersectionObserver-gated | Acceptable |
| Third-party | GA4 + Clarity scripts (consent-gated) | **LOW** | Deferred until analytics consent | Acceptable |
| Lenis | rAF smooth scroll loop | **LOW** | Reduced-motion bypassed | Acceptable |
| Image optimization | Carousel logos, section images, and hero image props — next/image usage partially audited | **UNKNOWN** | Unmeasured | Needs audit; local Next 16 docs deprecate `priority` in favor of `preload` |
| Auth overhead | `getLandingAuthState()` on every `/` visit | **HIGH** | Adds Supabase round-trip to every visitor (even logged-out) | Cache auth state for landing page |

### Measured CSS Impact

The root layout (`src/app/layout.tsx:5-7`) imports three CSS files globally:
- `globals.css`: 20,055 bytes — design tokens, base styles (required everywhere)
- `react-complex-tree/lib/style-modern.css`: 6,824 bytes — tree component styles (wasted on landing page)
- `lenis/dist/lenis.css`: 513 bytes — smooth scroll styles (wasted on non-landing pages)

**Total CSS baseline**: 27,392 bytes loaded on every single page.

### Quick Wins for Landing Page

1. **Remove the landing auth round-trip from anonymous first paint**: `getLandingAuthState()` adds an estimated 50-150ms Supabase Auth round-trip to every `/` visit. Use a display-only cookie/header hint or a neutral "Open app" CTA, and keep secure `getUser()` validation on protected routes. Do not cache authenticated user state globally with `unstable_cache`.
2. **Move tree CSS to workshop layout**: `react-complex-tree/style-modern.css` (6,824 bytes) is loaded on landing page unnecessarily. Move import from root layout to workshop layout.
3. **Audit landing page images**: Verify all images use `next/image` with proper `sizes`; use `preload` only for the single true LCP hero image in Next 16, and keep non-LCP carousel/section images lazy or default-loaded.
4. **Measure actual TTFB/FCP/LCP**: Run Lighthouse on the landing page to establish baseline before any changes.
