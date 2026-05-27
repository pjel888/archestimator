# A/B Testing Infrastructure Plan

**Status:** Planning; consent prerequisite first slice implemented; PostHog deferred from MVP landing stack
**Created:** 2026-05-27
**Scope:** Public landing page `/` and marketing subpages

## User job

As a product owner, I need to measure which landing page variants drive the most qualified sign-ups so I can optimize conversion without degrading the experience for any visitor.

## Goals

1. Select an A/B testing tool or lightweight framework compatible with Next.js 16 + React 19 + Tailwind v4
2. Define a conversion event taxonomy that connects landing page actions to authenticated workspace sign-ups
3. Establish experiment governance: hypothesis-first, minimum sample sizes, run duration, and statistical significance gates
4. Implement without blocking SSR, without layout shift, and without violating GDPR consent

## Non-goals

- No full-feature flag system for the app (that's a separate product concern)
- No multi-armed bandit or AI-driven optimization in the first pass
- No user-level personalization or segmentation beyond A/B variant assignment

## Tool evaluation — free-tier landscape (2026)

### The Google Optimize problem

Google Optimize was **sunset in September 2023** and there is **no free Google-native A/B testing replacement for web**. Firebase A/B Testing exists but is mobile/app-only. Google now recommends paid third parties (Optimizely, VWO, AB Tasty) for web experimentation.

This means any free A/B testing stack must use either:
- A **third-party free tier** (PostHog, Statsig, GrowthBook), or
- A **custom variant assignment** implementation + free analytics for measurement

### What's actually free?

| Tool | Free tier | A/B testing | Analytics | Recordings | GDPR |
|------|----------|-------------|-----------|------------|------|
| **Microsoft Clarity** | Vendor-controlled free tier | ❌ No variant assignment | Behavioral analytics | Session replay/heatmaps | ✅ Consent Mode |
| **Google Analytics 4** | Vendor-controlled free tier | ❌ No (Optimize dead) | ✅ Full funnel | ❌ | ⚠️ Needs Consent Mode |
| **PostHog Cloud (EU)** | Vendor-controlled free tier | ✅ Full experiments | ✅ Product analytics | ✅ Session replay | ✅ Consent/privacy setup required |
| **GrowthBook self-hosted** | Unlimited, forever | ✅ Full experiments | ❌ (needs analytics tool) | ❌ | ✅ Your infra |
| **Statsig Developer** | 2M events/mo | ✅ Core experiments | ✅ Event analytics | ❌ | ⚠️ US-hosted |

### Decision: Stack C — Clarity + GA4 + Custom code, no PostHog for MVP

**Selected on 2026-05-27 and revalidated against official docs on 2026-05-27.** We won't onboard a third-party service just for A/B testing when we can build the variant assignment ourselves.

```
Microsoft Clarity (planned analytics vendor) -> behavioral analytics: heatmaps, session recordings, click maps
Google Analytics 4 (planned analytics vendor) -> conversion funnel: page views, events, goal tracking
Custom code (~150 lines) -> A/B variant assignment, experiment tracking, result computation
```

**Why this stack:**
- **No new experiment service**: GA4 and Clarity are already the planned baseline analytics vendors. PostHog, GrowthBook, Statsig, and paid suites are unnecessary until experiments become product-side or feature-flag-driven.
- **We control the experiment logic**: Custom code means no SDK dependency, no vendor lock-in, no usage-based pricing surprise. The experiment framework is ~150 lines of TypeScript — SSR-safe cookie assignment + event dispatch + a simple results calculator.
- **GDPR**: Clarity has Consent Mode. GA4 has Consent Mode. Custom code stays in our repo. Google and Microsoft still remain planned analytics processors that require privacy disclosure, account-level DPA/legal review, and pre-consent cookie verification before launch.
- **Setup time**: 1–2 hours for the custom framework. Clarity and GA4 are one script tag each.
- **PostHog deferred**: PostHog is the right tool only if Archestimator later needs product analytics, cohorts, feature flags, native experiments, or replay tied to authenticated `/workshop/*` funnels. For MVP public landing tests, it duplicates GA4 traffic/conversion reporting and Clarity replay/heatmaps.

### What was ruled out

| Tool | Why ruled out |
|------|--------------|
| **PostHog** | Too much for MVP landing analytics. Reconsider only for product analytics, feature flags, native experiments, or replacing/consolidating GA4/Clarity later. |
| **GrowthBook** | Requires Docker + MongoDB self-hosting; overkill for a custom variant assigner |
| **Statsig** | Same objection as PostHog — another service |
| **Google Optimize** | Dead since Sept 2023. No free web replacement from Google. |
| **Firebase A/B Testing** | Mobile/app only. Not for web landing pages. |
| **Optimizely / VWO / AB Tasty** | No free tier. Enterprise-only pricing. |
| **Vercel Flags** | Beta, experimental. Not yet stable for production. |
| **LaunchDarkly** | No free tier for experiments. |
| **Amplitude Experiment** | Requires paid Amplitude plan. |

See `../05-analytics-stack-decision.md` for the official-doc decision record and future PostHog adoption triggers.

## Conversion event taxonomy (draft)

```
page_view          → landing /, /about, /features, /pricing, /contact
cta_click          → hero CTA, nav CTA, final CTA, pricing CTA
signup_start       → /login page visit
signup_complete    → successful auth callback → /workshop
workshop_enter     → first /workshop page load post-signup
project_create     → first project created (upgrade event)
```

## Environment variables

```
# .env.local — GA4 and Clarity IDs
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX    # Google Analytics 4 measurement ID
NEXT_PUBLIC_CLARITY_PROJECT_ID=xxxxxxxxxx      # Microsoft Clarity project ID
```

Both are `NEXT_PUBLIC_` because the scripts run client-side. GA4 uses `@next/third-parties/google` which reads the env var automatically. Clarity needs a manual script element in `PublicPageShell` reading the project ID.

## Graceful degradation

If GA4 or Clarity fails to load (ad blocker, network error, script blocked in some regions):

- **Landing page must still render and function.** Analytics scripts are non-blocking `<script async>` — they don't delay paint.
- **A/B variant assignment is server-side after consent** — pre-consent visitors see control variant A and no `ab_test` cookie is written.
- **`window.gtag` / `window.clarity` guards**: the experiment tracker checks `window.gtag?.()` and `window.clarity?.()` before calling — failed scripts cause silent no-ops, not crashes.
- **No console pollution**: suppress "gtag is not defined" warnings with a pre-init stub if desired, but the optional-chaining guards make this non-urgent.

## Consent-first assignment rule

Default posture: treat the `ab_test` cookie as **analytics / non-essential**, not strictly necessary.

- Before analytics consent: render variant A, do not set `ab_test`, do not fire `experiment_view`, GA4, or Clarity events.
- After analytics consent: assign and persist the visitor's variant in the `ab_test` cookie, then fire consent-gated experiment events.
- Store consent itself in a small first-party essential cookie such as `archestimator_cookie_consent` so server components can determine whether SSR variant assignment is allowed. A localStorage mirror can power the preferences UI, but localStorage alone is not enough for SSR assignment.

**Current implementation note (2026-05-27):** `src/lib/landing/consent.ts` and `src/components/landing/CookieConsentBanner.tsx` now implement the first consent-cookie slice. `tests/vitest/landing-consent.test.tsx` proves the current public-page consent code does not set `ab_test` before analytics consent. Actual A/B assignment is still not implemented.
- If legal review later classifies experiment bucketing as strictly necessary, add the legal rationale and privacy-policy wording to `gdpr-compliance/README.md` before changing this behavior.

## Bot filtering

Bots, crawlers, and health-check pings will hit the landing page, get assigned a variant, and never convert — polluting experiment results. Filter them in the variant assigner.

```typescript
// src/lib/ab-testing/bot-patterns.ts
const BOT_UA_PATTERNS = [
  /googlebot/i, /ahrefsbot/i, /semrushbot/i, /bingbot/i,
  /duckduckbot/i, /yandexbot/i, /baiduspider/i, /slurp/i,
  /facebookexternalhit/i, /twitterbot/i, /discordbot/i,
  /whatsapp/i, /telegrambot/i, /slackbot/i,
  /uptime/i, /pingdom/i, /statuscake/i, /monitor/i,
  /headless/i, /puppeteer/i, /playwright/i, /selenium/i,
];

export function isBot(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return BOT_UA_PATTERNS.some((pattern) => pattern.test(userAgent));
}
```

In `getVariant()`:
```typescript
// Skip variant assignment for bots — they pollute results
const ua = headers().get("user-agent");
if (isBot(ua)) return "A"; // default to control variant, don't set cookie
```

Bots always see variant A (control). They don't get a cookie, don't fire GA4/Clarity events, and don't count toward experiment totals.

## GA4 cross-page attribution

A key question: if a user sees variant A on the landing page, browses for 3 minutes, then signs up on `/login` — how should the `signup_complete` event carry the `experiment_id` and `variant` dimensions?

**Answer: Do not rely on automatic carry-forward.** GA4's `_ga` cookie ties events into sessions, but custom event parameters describe the event where they are sent. GA4 event-scoped custom dimensions report custom event parameters; they are not a safe session-scoped variant store.

**Implementation rule:** persist the experiment assignment in the consent-gated first-party `ab_test` cookie and explicitly send `experiment_id` and `variant` on every experiment-relevant conversion event (`cta_click`, `signup_start`, `signup_complete`, `workshop_enter`). If `/login` or `/auth/callback` cannot read the assignment reliably, add a first-party handoff parameter or local event log before declaring the experiment measurable.

**Caveat:** If the user clears cookies, switches devices, or the assignment expires, attribution breaks. This is acceptable for pre-MVP, but the conversion event must still include variant metadata whenever it is available.

**Smoke test (Phase 8c-ii):**
1. Open incognito window
2. Visit landing page → verify `experiment_view` event in GA4 real-time report
3. Navigate to `/login` → sign up
4. Verify `signup_start` and `signup_complete` events explicitly include `experiment_id` and `variant`
5. Repeat with different variant (clear cookies, reload) → verify values differ

## Limitations & future work

| Limitation | Current behavior | Future option |
|-----------|-----------------|---------------|
| Multivariate testing | Only single-variable A/B tests supported | Extend `getVariant()` to accept `Variant[]` with multi-arm assignment |
| Redirect tests | Only component-level variants | Add URL-rewrite layer in `src/proxy.ts` for page-level A/B |
| Cross-page attribution | Explicit event metadata only; conversion events must resend `experiment_id` and `variant` | Local event log API or PostHog/server-side identity stitching if attribution needs grow |
| Cross-device attribution | Cookie/device-bound assignment; device-switch breaks chain | PostHog product analytics or server-side identity stitching (future) |
| Cookie size | Single `ab_test` cookie stores all experiments | Split cookies or cap concurrent experiments at 10 |
| Performance budget | No measurement yet | Audit excludes PostHog: GA4 ~45KB, Clarity ~20KB, Lenis ~12KB, @firecms/neat ~30KB, next-intl ~8KB ≈ ~115KB total. Revisit if Lighthouse Performance score < 70 or if PostHog is adopted later. |

## Results pipeline: GA4 → Calculator

The custom results calculator (`src/lib/ab-testing/results-calculator.ts`) is a pure function — it doesn't fetch data. Here's how results flow:

```
GA4 "experiment_view" events  ──→  GA4 Exploration Report (free-form)
         │                                    │
         │  24-48 hr delay                    │  Export CSV
         │  (custom dimension                 │
         │   registration)                    ▼
         │                    results-calculator.ts (pure function)
         │                                    │
         ▼                                    ▼
    Must register                     ExperimentResult { rates, uplift,
    experiment_id +                  pValue, significant }
    variant as event-scoped
    custom dimensions in
    GA4 Admin FIRST
```

### Critical: GA4 custom dimension registration

**GA4 event parameters are NOT automatically available as dimensions.** You must register them in GA4 Admin before they appear in Exploration reports. And there's a **24–48 hour delay** from registration before data populates.

**Registration steps (must do on Day 0, immediately after deploying event tracking):**
1. GA4 Admin → Data display → Custom definitions → Custom dimensions
2. Create event-scoped dimension: **"Experiment ID"** → maps to event parameter `experiment_id`
3. Create event-scoped dimension: **"Variant"** → maps to event parameter `variant`
4. Wait 24–48 hours for dimensions to populate in Explorations

**Gotchas:**
- Max 50 event-scoped custom dimensions per GA4 property (free tier)
- You cannot analyze data sent BEFORE the dimension was created — no retroactive backfill
- If you delete a dimension to free quota, wait 48 hours before adding a new one
- High-cardinality values (e.g., experiment IDs with timestamps) get condensed into "(other)" — keep values bounded and categorical

### Experiment analysis workflow

**Pre-launch (Day 0):**
1. Register `experiment_id` and `variant` as custom dimensions in GA4 Admin
2. Verify events fire using GA4 Realtime report (click event name → see parameters)

**During experiment (Days 0–N):**
- Use GA4 Realtime report for sanity checks (manual tally, last 30 min of data)
- Realtime is NOT for final results — it caps at 700 rows and only shows 30 min windows

**Post-experiment (Day N+1, after 24-48 hr delay):**
1. GA4 → Explore → Free-form exploration
2. Rows: "Experiment ID" custom dimension
3. Columns: "Variant" custom dimension
4. Values: Event count (filtered to conversion event name)
5. Export → CSV
6. Feed CSV numbers into `results-calculator.ts`
7. Document results in `experiments/01-hero-cta-copy.md`

### Alternative: Local event log API (fast-follow)

If the 24-48 hour GA4 delay is unacceptable for rapid iteration, add a lightweight API route:

```
POST /api/ab-testing/event
Body: { experimentId, variant, eventName, timestamp }
→ Stores in estimate_sheet_events or dedicated ab_testing_events table
→ Queryable immediately, no delay
```

Cost: one new API route + one DB table + one migration. Schedule this as a fast-follow if experiment cadence exceeds the GA4 delay tolerance.

## Experiment governance

- Every experiment must have a written hypothesis, success metric, minimum detectable effect, and planned duration
- Store experiment definitions in this folder as numbered docs (`01-experiment-hero-cta-copy.md`, etc.)
- Use `ab-testing/experiments/` subfolder for active experiment records
- Minimum 100 conversions per variant before declaring a winner (adjustable)
- Do not run overlapping experiments on the same page section

## Custom A/B testing implementation pattern

### Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Next.js Server                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ read consent cookie → if analytics consent exists │   │
│  │ read AB_TEST cookie → assign variant (A/B)        │   │
│  │ no consent → return control A and set no cookie   │   │
│  │ pass variant as prop to page component            │   │
│  │ set AB_TEST cookie on first visit (50/50 split)   │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────┬───────────────────────────────────┘
                       │ variant prop
┌──────────────────────▼───────────────────────────────────┐
│                    Client Component                       │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Render variant A or B based on prop               │   │
│  │ On mount: push variant to GA4 + Clarity           │   │
│  │ On CTA click: push event to GA4 + Clarity         │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### Core files

```
src/lib/ab-testing/
├── types.ts              — Variant, Experiment, ExperimentResult types
├── variant-assigner.ts   — cookie read/write, random assignment, SSR-safe
├── experiment-tracker.ts — push events to GA4 (gtag) + Clarity (clarity.event)
├── results-calculator.ts — compute conversion rates, confidence intervals, significance
└── experiments/
    └── 01-hero-cta-copy.ts — experiment config: variants, hypothesis, success metric

src/components/landing/
└── ABExperimentProvider.tsx — consent-gated client wrapper (NO effect until consent)

src/lib/landing/
└── useLandingCookieConsent.ts — future client hook over current consent cookie/banner state
```

### Variant assigner (`src/lib/ab-testing/variant-assigner.ts`)

```typescript
// ~60 lines. SSR-safe. No external deps.

import { cookies } from "next/headers";

type Variant = "A" | "B";

const COOKIE_NAME = "ab_test";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Read the current variant from cookie only after analytics consent.
 * If no cookie exists and consent exists, randomly assign A or B (50/50) and set cookie.
 * If consent is missing, return control A and do not set a non-essential cookie.
 * Called from server component — never causes hydration mismatch.
 */
export async function getVariant(
  experimentId: string,
  options: { analyticsConsent: boolean }
): Promise<Variant> {
  if (!options.analyticsConsent) {
    return "A";
  }

  const cookieStore = await cookies();
  const existing = cookieStore.get(COOKIE_NAME);

  if (existing) {
    try {
      const parsed = JSON.parse(existing.value);
      if (parsed[experimentId]) {
        return parsed[experimentId] as Variant;
      }
    } catch {
      // corrupted cookie — reassign
    }
  }

  // Assign new variant
  const variant: Variant = Math.random() < 0.5 ? "A" : "B";
  const allAssignments = existing ? safeParseJson(existing.value) : {};
  allAssignments[experimentId] = variant;

  cookieStore.set(COOKIE_NAME, JSON.stringify(allAssignments), {
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: false, // client needs to read it for GA4/Clarity
  });

  return variant;
}

/** Helper — JSON.parse with try/catch, returns {} on failure */
function safeParseJson(value: string): Record<string, string> {
  try { return JSON.parse(value); } catch { return {}; }
}
```

### Experiment tracker (`src/lib/ab-testing/experiment-tracker.ts`)

```typescript
// ~50 lines. Pushes events to both GA4 and Clarity.
// Only fires after GDPR consent is granted.

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    clarity?: (...args: any[]) => void;
  }
}

export function trackExperimentView(experimentId: string, variant: string) {
  // GA4: custom event with experiment/variant dimensions
  window.gtag?.("event", "experiment_view", {
    experiment_id: experimentId,
    variant,
  });

  // Clarity: custom tags + event for session replay filtering
  window.clarity?.("set", "experiment_id", experimentId);
  window.clarity?.("set", "variant", variant);
  window.clarity?.("event", "experiment_view");
}

export function trackConversion(
  experimentId: string,
  variant: string,
  eventName: string,
  metadata?: Record<string, string>
) {
  // GA4 conversion event
  window.gtag?.("event", eventName, {
    experiment_id: experimentId,
    variant,
    ...metadata,
  });

  // Clarity custom event
  window.clarity?.("set", "experiment_id", experimentId);
  window.clarity?.("set", "variant", variant);
  Object.entries(metadata ?? {}).forEach(([key, value]) => {
    window.clarity?.("set", key, value);
  });
  window.clarity?.("event", eventName);
}
```

### Results calculator (`src/lib/ab-testing/results-calculator.ts`)

```typescript
// ~40 lines. Pure function — testable without browser.
// Computes conversion rate, relative uplift, and p-value (chi-squared).

export interface ExperimentResult {
  variantA: { views: number; conversions: number; rate: number };
  variantB: { views: number; conversions: number; rate: number };
  uplift: number; // percentage
  pValue: number;
  significant: boolean; // p < 0.05
  recommendation: "A" | "B" | "inconclusive";
}
```

### Usage in `page.tsx`

```typescript
// src/app/page.tsx (server component)
import { getVariant } from "@/lib/ab-testing/variant-assigner";

export default async function LandingPage() {
  const isLoggedIn = await getLandingAuthState();
  const consent = await getLandingConsentState();
  const heroVariant = await getVariant("hero-cta-copy", {
    analyticsConsent: consent.analytics,
  });

  return (
    <PublicPageShell isLoggedIn={isLoggedIn} isHomePage={true}>
      <ABExperimentProvider experimentId="hero-cta-copy" variant={heroVariant}>
        <LandingHeader isLoggedIn={isLoggedIn} isHomePage={true} />
        <LandingSmoothScrollProvider>
          <main>
            <HeroSection variant={heroVariant} />
            {/* ... rest of sections */}
          </main>
        </LandingSmoothScrollProvider>
        <LandingFooter />
      </ABExperimentProvider>
    </PublicPageShell>
  );
}
```

### Consent gating (`ABExperimentProvider.tsx`)

```typescript
// Client component. Reads consent from a hook/provider built on
// src/lib/landing/consent.ts and CookieConsentBanner state.
// Does NOT call gtag/clarity until consent is granted.
// On consent grant: fires pending experiment_view events.

"use client";

import { useEffect, useRef } from "react";
import { useLandingCookieConsent } from "@/lib/landing/useLandingCookieConsent";
import { trackExperimentView } from "@/lib/ab-testing/experiment-tracker";

export function ABExperimentProvider({
  experimentId,
  variant,
  children,
}: {
  experimentId: string;
  variant: string;
  children: React.ReactNode;
}) {
  const { consent } = useLandingCookieConsent();
  const tracked = useRef(false);

  useEffect(() => {
    if (consent.analytics && !tracked.current) {
      trackExperimentView(experimentId, variant);
      tracked.current = true;
    }
  }, [consent.analytics, experimentId, variant]);

  return <>{children}</>;
}
```

## Implementation phases

### Phase 8c-i: GA4 + Clarity baseline (30 min)
- Add GA4 script via `@next/third-parties/google` in `PublicPageShell`
- Add Clarity script in `PublicPageShell`
- Both gated behind cookie consent (see GDPR plan Phase 8b-i)
- **Immediately register custom dimensions in GA4 Admin** (experiment_id, variant) — the 24-hour clock starts now
- Verify: both scripts load, no console errors, events appear in GA4 Realtime
- Verify: scripts do NOT load on `/workshop/*`
- Verify: PostHog is not installed, loaded, listed in current cookies, or added to CSP for MVP

### Phase 8c-ii: Custom A/B framework (1–2 hours)
- Create `src/lib/ab-testing/` directory with types, assigner, tracker, calculator
- Create `src/components/landing/ABExperimentProvider.tsx` (consent-gated)
- Create a landing-scoped consent hook/provider over `src/lib/landing/consent.ts` if the current banner state is not enough for event timing
- Write unit tests for variant assigner (deterministic with seeded random) and results calculator
- Wire into `page.tsx`: read variant server-side, pass as prop, mount `ABExperimentProvider`

### Phase 8c-iii: First experiment (1 hour setup + 1–2 weeks run)
- Define experiment config: `01-hero-cta-copy.ts`
- Implement variant B component (e.g., different CTA text)
- Deploy, verify `experiment_view` events in GA4 Realtime
- Let run for ≥100 conversions per variant
- **After 24-48 hours**: open GA4 Exploration, export CSV, compute results using calculator
- Archive findings in `experiments/01-hero-cta-copy.md`
- Remove losing variant, promote winning variant to production

### Phase 8c-iv: Iteration
- Experiment template/checklist for future tests
- Results archive in `experiments/` folder
- Optional: simple admin dashboard (GA4 exploration report or custom page)

## Files affected

| File | Change type | Risk |
|------|------------|------|
| `src/lib/ab-testing/types.ts` | NEW | LOW |
| `src/lib/ab-testing/variant-assigner.ts` | NEW | LOW |
| `src/lib/ab-testing/experiment-tracker.ts` | NEW | LOW |
| `src/lib/ab-testing/results-calculator.ts` | NEW | LOW |
| `src/lib/ab-testing/experiments/01-hero-cta-copy.ts` | NEW | LOW |
| `src/components/landing/ABExperimentProvider.tsx` | NEW | LOW |
| `src/components/landing/PublicPageShell.tsx` | Add GA4 + Clarity scripts (consent-gated) | LOW |
| `src/app/page.tsx` | Call `getVariant()`, pass to `ABExperimentProvider` | LOW |
| `src/components/landing/HeroSection.tsx` | Accept `variant` prop, render A or B | LOW |
| `src/components/landing/LandingHeader.tsx` | Add GA4 CTA click event | LOW |
| `src/components/landing/FinalCTASection.tsx` | Add GA4 CTA click event | LOW |
| `src/components/landing/PricingSection.tsx` | Add GA4 CTA click event | LOW |
| `package.json` | **NO new deps** | — |
| `src/app/providers.tsx` | **DO NOT TOUCH** | — |

## Dependencies

- **Blocks on:** GDPR consent banner (Phase 8b-i) — both GA4 and Clarity must not fire before consent
- **Blocks on:** DRY auth refactor (Phase 8a-i)
- **Independent of:** i18n (can proceed in parallel)

## Verification gates

- [ ] `bun run build` passes with zero new dependencies in `package.json`
- [ ] GA4 script loads only after analytics consent granted (browser network tab check)
- [ ] Clarity script loads only after analytics consent granted
- [ ] Neither GA4 nor Clarity loads on `/workshop/*` routes
- [x] Variant cookie `ab_test` is NOT set by the current consent slice before analytics consent
- [ ] Variant cookie `ab_test` is set only after analytics consent (Application > Cookies in DevTools)
- [ ] Same visitor always sees the same variant (cookie persists across reloads)
- [ ] No hydration mismatch — variant rendered server-side, no client-side flash
- [ ] `experiment_view` event fires in GA4 real-time report (with variant dimension)
- [ ] CTA click events fire with `experiment_id` and `variant` metadata
- [ ] `signup_start`, `signup_complete`, and `workshop_enter` events explicitly resend `experiment_id` and `variant` when an assignment exists
- [ ] Results calculator returns correct rates, uplift, and significance for known test data (unit test)
- [ ] Clarity recordings show `experiment_view` custom event for filtering
- [ ] Clarity filters include `experiment_id` and `variant` custom tags after analytics consent
- [ ] PostHog is absent from network requests, CSP, privacy current-processor list, and `package.json` unless a future PostHog ADR supersedes this plan
- [ ] Any experiment copy or variant claim has a maturity label checked against `../17-public-subpages-claims-matrix.md` before publish

## References

- `22-current-execution-brief.md` — active below-hero implementation
- `17-public-subpages-claims-matrix.md` — feature maturity for public claims
- `../gdpr-compliance/README.md` — GDPR consent dependency
- `../05-analytics-stack-decision.md` — GA4/Clarity/PostHog decision record
