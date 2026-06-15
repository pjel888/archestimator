# Current Audit and Corrections

**Status:** Active correction note
**Created:** 2026-05-27
**Scope:** Truth sync for this Phase 8 planning folder and the first low-risk code cleanup.

## What is implemented now

- `src/lib/landing/get-landing-auth-state.ts` centralizes the duplicated public-page auth check.
- `src/app/page.tsx`, `src/app/about/page.tsx`, `src/app/features/page.tsx`, `src/app/pricing/page.tsx`, and `src/app/contact/page.tsx` call the shared helper.
- `src/lib/landing/consent.ts` centralizes the first consent-cookie parser/serializer.
- `src/components/landing/CookieConsentBanner.tsx` renders the first public-page consent banner and cookie-settings control.
- `src/components/landing/PublicPageShell.tsx` mounts the consent banner on public marketing pages.
- `next.config.ts` applies `Content-Security-Policy-Report-Only` to `/`, `/about`, `/features`, `/pricing`, and `/contact`.
- No A/B experiment framework is implemented yet.
- No GA4 or Microsoft Clarity script is implemented yet.
- No PostHog script, SDK, cookie/storage entry, CSP domain, or privacy current-processor entry is implemented or approved for MVP.
- No privacy or terms pages are implemented yet.
- No i18n route move, translation catalog, or locale routing is implemented yet.

## Corrections to prior risk language

The previous "all residual risks resolved" wording overstated readiness. These documents now use three states:

- **Verified** - implemented or externally confirmed with current source evidence.
- **Mitigated / planned** - an implementation path exists, but the work is not complete.
- **Open** - a human/legal/product decision or implementation gate remains.

For this folder, legal/DPA verification is **open**, while GA4 custom-dimension timing, GA4 event-parameter scope, Clarity consent-mode behavior, Clarity custom tags/events, and PostHog's product-analytics/feature-flag role are **externally verified as planning facts**.

## Current external evidence checked

- Google Analytics custom dimensions: GA4 requires event parameters to be registered as custom dimensions/metrics before they are reportable, and Google documents a 24-48 hour delay. Source: https://support.google.com/analytics/answer/14240153
- Google Analytics data processing terms: GA4 account owners need to verify the account-level Data Processing Terms / amendment state and required contact details. Source: https://support.google.com/analytics/answer/3379636
- Microsoft Clarity consent mode: Clarity requires consent signals for EEA/UK/Switzerland traffic and can be configured so cookies are not written until consent is granted. Source: https://learn.microsoft.com/en-us/clarity/setup-and-installation/consent-mode
- Microsoft Clarity client API: `window.clarity("event", "...")`, custom tags, and consent APIs exist, but they must be gated behind consent. Source: https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-api
- PostHog role: PostHog supports product analytics, web analytics, feature flags, experiments, and session replay, but those overlap with GA4/Clarity for this MVP landing scope. It is deferred unless product analytics/flags/native experiments become explicit. Sources: https://posthog.com/docs/product-analytics, https://posthog.com/docs/feature-flags, https://posthog.com/docs/experiments
- PostHog JS config/privacy: if adopted later, configure capture, persistence, session replay, region/API host, and opt-in/opt-out behavior before loading. Sources: https://posthog.com/docs/libraries/js/config, https://posthog.com/docs/privacy/gdpr-compliance
- Supabase DPA: a current Supabase DPA exists and references subprocessors plus transfer/processing terms, but Archestimator still needs human confirmation/signature posture for the active project and company/legal entity. Source: https://supabase.com/downloads/docs/Supabase%2BDPA%2B260317.pdf
- Next.js 16 routing policy: Next.js 16 renamed Middleware to Proxy. This repo already has `src/proxy.ts`; future i18n work must compose with that file, not add a separate `src/middleware.ts`. Source: `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`

## Open gates before Phase 8 can ship

1. **Legal/DPA gate:** Record Supabase, Google Analytics, and Microsoft Clarity DPA/terms posture with date, account/entity, and reviewer. Add PostHog only if a future ADR adopts it.
2. **Consent gate:** `archestimator_cookie_consent` is implemented and tests prove this slice does not set `ab_test` before analytics consent. GA4, Clarity, and A/B assignment remain blocked until they are wired through the consent state. If a future legal decision classifies experiment assignment as strictly necessary, document the rationale in `gdpr-compliance/README.md` before implementation.
3. **Analytics-stack gate:** Phase 8c must stay GA4 + Clarity + custom A/B only. PostHog remains absent from package, CSP, env, privacy current-processor, and cookie/storage docs until `05-analytics-stack-decision.md` is superseded.
4. **Proxy gate:** Compose locale routing into existing `src/proxy.ts` while preserving `/workshop/*`, `/api/*`, `/login`, `/auth/*`, static assets, and existing Supabase auth behavior.
5. **Claims gate:** Before publishing public pages or localized copy, run every new claim through `../17-public-subpages-claims-matrix.md`.
6. **Verification gate:** Run the targeted landing auth/consent/landing UI tests, type-check, lint, design-system lint, `git diff --check`, and browser smoke before marking any implementation phase complete.

## Next implementation slice

The next safe slice is Phase 8b-ii privacy/terms content plus legal/account verification, while analytics and A/B assignment stay blocked until consent-gated script loading is implemented:

- record Supabase, Google, and Microsoft DPA/terms posture for the actual Archestimator accounts;
- add privacy/terms pages that list the consent cookie, future GA4/Clarity/A/B cookies, current data processors, and PostHog only as a deferred future processor if mentioned at all;
- keep `ab_test` classified as analytics/non-essential unless legal review explicitly changes it.
