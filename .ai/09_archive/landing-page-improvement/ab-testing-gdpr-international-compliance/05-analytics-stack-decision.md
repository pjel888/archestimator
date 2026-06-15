# Analytics Stack Decision — GA4, Clarity, and PostHog

**Status:** Decision record; PostHog deferred from MVP landing stack
**Created:** 2026-05-27
**Official-source refresh:** 2026-05-27
**Scope:** Public landing page and marketing subpages only; authenticated `/workshop/*` product analytics remains a future product decision

## Decision

Use **Google Analytics 4 + Microsoft Clarity + custom A/B assignment** for the MVP public landing experiment stack.

Do **not** add PostHog to the MVP landing-page stack. PostHog is technically compatible, but it duplicates enough GA4/Clarity functionality that adding it now would increase consent, DPA, privacy-policy, CSP, event-governance, and performance surface area without solving a current MVP requirement.

## Why

| Tool | Keep / defer | Primary job in this plan | Guardrails |
|------|--------------|--------------------------|------------|
| GA4 | Keep | Acquisition, traffic-source, CTA, signup, and conversion reporting | Load only after analytics consent; use Consent Mode; register `experiment_id` and `variant` as event-scoped custom dimensions before analysis; include variant metadata on conversion events. |
| Microsoft Clarity | Keep | Heatmaps, session replay, click diagnostics, and experiment-session filtering | Enable Clarity Consent Mode; no Clarity cookies before opt-in; mask sensitive content; use `clarity("set", ...)` and `clarity("event", ...)` for experiment filtering. |
| PostHog | Defer | Future product analytics, feature flags, experiments, cohorts, or unified product telemetry | Add only after an explicit PostHog ADR; if adopted with GA4/Clarity still active, disable overlapping capture/replay and use explicit event capture only. |

## Can all three run together?

Yes, technically. GA4, Clarity, and PostHog each provide separate JavaScript installation/configuration paths, and Clarity documents Google Analytics / Google Tag Manager integration. There is no official incompatibility found.

That does not make the three-tool stack a good MVP default. Running all three means three analytics processors, overlapping pageview/event streams, overlapping replay/autocapture capabilities, more cookie/storage disclosures, more CSP domains, more consent-mode wiring, and more event taxonomy drift.

## PostHog adoption triggers

Adopt PostHog only if one of these becomes an explicit requirement:

1. Product analytics across authenticated `/workshop/*` flows, such as retention, cohorts, and multi-step product funnels that GA4 is not serving well.
2. Feature flags or remote config for product releases.
3. Native product-side experiments where flag exposure, event capture, and analysis need to live in one system.
4. Session replay tied directly to product funnels, where Clarity alone is insufficient.
5. A deliberate move to consolidate analytics into PostHog and reduce GA4/Clarity dependence.

Do not adopt PostHog just to duplicate GA4 traffic reports or Clarity heatmaps/session recordings on the public landing page.

## If PostHog is adopted later

Minimum implementation posture:

- Create a fresh ADR and DPA/legal checklist entry before installing `posthog-js`.
- Decide whether PostHog replaces Clarity for replay, replaces the custom A/B layer for experiments, or is limited to product analytics/flags.
- Keep PostHog behind the same analytics consent gate as GA4/Clarity.
- Prefer explicit `posthog.capture(...)` events over broad autocapture on the public landing page.
- Disable overlapping pageview/session-replay capture when GA4 and Clarity remain active.
- Configure the correct `api_host` / region, CSP domains, persistence mode, secure cookies, and replay masking before release.
- Add PostHog to `/privacy`, cookie policy, sub-processor/DPA review, and deletion/export handling before enabling it for real visitors.
- Re-run the landing performance budget; the current ~115KB estimate excludes PostHog.

## Current implementation contract

- The current codebase has the consent cookie/banner and Report-Only CSP slice.
- GA4, Clarity, PostHog, and runtime `ab_test` assignment are **not implemented yet**.
- Phase 8c should implement only GA4 + Clarity + custom A/B assignment.
- The A/B tracker must include `experiment_id` and `variant` on both exposure events and conversion events. Do not rely on GA4 to derive later conversion-event dimensions from an earlier `experiment_view` event.
- PostHog must not be added to `package.json`, `next.config.ts` CSP, environment-variable docs, or privacy-policy current-processor lists until a future PostHog adoption decision is approved.

## Official references checked

- Google Analytics: [About consent mode](https://support.google.com/analytics/answer/10000067), [custom dimensions and metrics](https://support.google.com/analytics/answer/14240153), [events and key events](https://support.google.com/analytics/answer/9322688)
- Microsoft Clarity: [Consent Mode](https://learn.microsoft.com/en-us/clarity/setup-and-installation/consent-mode), [Clarity API](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-api), [privacy disclosure](https://learn.microsoft.com/en-us/clarity/setup-and-installation/privacy-disclosure), [masking](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-masking)
- PostHog: [JavaScript web configuration](https://posthog.com/docs/libraries/js/config), [privacy](https://posthog.com/docs/privacy), [GDPR compliance](https://posthog.com/docs/privacy/gdpr-compliance), [feature flags](https://posthog.com/docs/feature-flags), [experiments](https://posthog.com/docs/experiments), [session replay privacy](https://posthog.com/docs/session-replay/privacy)
