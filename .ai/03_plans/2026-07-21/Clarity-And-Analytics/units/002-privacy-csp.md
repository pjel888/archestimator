# UNIT-002 — Privacy naming and CSP coverage

## Goal and status

`READY` · dependencies: UNIT-001 · requirements: SEC-001, SEC-002 · risks: RISK-005, RISK-006

Name GA4 and Clarity as processors and ensure CSP allowlists cover every PublicPageShell route that can load trackers.

## Owned paths

- `src/app/privacy/page.tsx` and/or shared privacy content modules
- `src/lib/legal/terms-content.ts` (processor language only if needed)
- `src/components/landing/CookieConsentBanner.tsx` (copy only if replay/heatmaps need clearer language)
- `next.config.ts` (CSP source matching for `/new`, legal shells, etc.)

## Implementation boundary

1. Update privacy (and terms if required) to name Google Analytics 4 and Microsoft Clarity, purposes (traffic/conversion vs heatmaps/session replay), and that they load only after analytics consent.
2. Extend landing Report-Only CSP `source` matchers so every route using `PublicPageShell` + `LandingAnalyticsLoader` is covered. Do not put trackers on `/share`.
3. Keep share enforced CSP behavior and no-loader invariant.
4. Do not expand tracking to workshop/auth routes.

## Acceptance evidence

- Privacy text names both providers.
- CSP matcher list covers PublicPageShell tracker routes.
- Grep confirms loaders still mount only via `PublicPageShell`.
- TEST_PROPOSAL (unrun): share/CSP vitest.

## Recovery and completion

Revert owned copy/CSP edits. Complete when UNIT-003/004 can proceed without disclosure debt.
