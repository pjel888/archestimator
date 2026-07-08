# 10 — Blast Radius and Dependencies

## 1. Impact classification key
`Required` (must change to satisfy the requirement) · `Probable` (likely change) · `Possible` (might change) · `Verification only` (no edit, but test/review) · `Explicitly unaffected`.

## 2. Direct impact

| Area | File / system | Classification | Requirement |
|---|---|---|---|
| v3 homepage footer | `src/components/landing-v3/ArchestimatorLandingPage.tsx` (footer block ~L644) | Required | FR-CONT-03 |
| `/new` footer | `src/components/landing-new/NewLandingPage.tsx` (~L590) | Required | FR-CONT-03 |
| Shared footer | `src/components/landing/LandingFooter.tsx` | Required | FR-CONT-03 |
| CTA contract doc | `06` §3; optional comment in `contact-mailto.ts`/`landing-content.ts` | Required | FR-CONT-01 |
| `/terms` metadata | `src/app/terms/page.tsx` | Required | FR-CONT-04 |
| `/privacy` metadata | `src/app/privacy/page.tsx` | Required | FR-CONT-04 |
| `/cookies` page | new `src/app/cookies/page.tsx` | Required | FR-CONT-06 |
| Cookie banner link | `src/components/landing/CookieConsentBanner.tsx` | Required | FR-CONT-06 |
| Sitemap `/security` + `/cookies` | `src/app/sitemap.ts` | Required | FR-CONT-05/06 |
| PGP key asset | `public/.well-known/pgp-key.txt` (or remove ref) | Required (owner-gated) | FR-CONT-05 |
| ClosedBetaGate legal line | `src/components/auth/ClosedBetaGate.tsx` | Required | FR-CONT-07 |
| ClosedBetaGate receipt + server action | `src/components/auth/ClosedBetaGate.tsx`, new `src/lib/landing/beta-request-actions.ts` | Required | FR-CONT-08 |
| Beta-request audit/rate-limit reuse | `account_security_events` (audit), `security_rate_limit_events` (rate-limit) | Verification only (no schema change) | FR-CONT-08 |
| Welcome-email trigger | `src/lib/auth/account-actions.ts` or new `src/lib/auth/welcome-email.ts` | Required (owner-gated) | FR-CONT-09 |
| Dashboard empty-state CTA | `src/components/workshop/dashboard/WorkshopDashboard.tsx` or `WorkshopHomebaseClient.tsx` | Required | FR-CONT-10 |
| Onboarding redirect | `src/app/workshop/onboarding/page.tsx` | Required | FR-CONT-11 |
| Tests | new `tests/vitest/landing-cta-continuity.test.tsx`, `tests/vitest/public-trust-link-continuity.test.tsx`, `tests/vitest/beta-request-intake.test.ts`, `tests/vitest/first-project-empty-state.test.tsx`, `tests/vitest/workshop-onboarding-redirect.test.ts`, `tests/vitest/continuity-contract.test.tsx` (+ Playwright additions) | Required | TEST-CONT-01/02 |

## 3. Transitive / indirect impact

| Area | Classification | Why |
|---|---|---|
| `landing-amigo-redesign.test.tsx` | Verification only | must stay green; asserts v3 CTA — if OPEN-CONT-01 changes the canonical CTA, this test may need a paired update |
| `landing-company-proof.test.ts` | Verification only | must stay green (no testimonials) |
| `trust-page-overclaims.test.ts` | Verification only | must stay green (no posture softening) |
| `public-static-route-contract.test.ts` | Verification only | `/cookies` must be `force-static` + free of `cookies()`/`headers()`/`searchParams` — add to the contract list |
| `landing-security-headers.test.ts` | Verification only | `/cookies` inherits headers |
| `legal-terms-*.test.ts` suite | Verification only | terms gate unchanged |
| Proxy (`request-proxy.ts`) | Explicitly unaffected | no route-protection change |
| `session.ts` closed-beta check | Explicitly unaffected | gating unchanged |
| Better Auth core tables | Explicitly unaffected | not in `migrations/`, not touched |
| Estimate/workshop internals | Explicitly unaffected | out of scope |
| Invite token crypto | Explicitly unaffected | sibling pack |

## 4. User/role impact
- **Anonymous visitors:** clearer CTAs, complete footer, cookie policy, beta-request receipt. Net positive; no regression.
- **Closed-beta-enabled users:** welcome email (once), dashboard first-project CTA, saner onboarding redirect. Net positive.
- **Closed-beta-denied users:** unchanged (`/access-required`).
- **Invited collaborators:** unchanged (invite→auth→workshop handoff preserved).
- **Admins:** `beta_access_requested` audit rows surface in the existing allowlist admin queue (`/workshop/settings/users`) — must render submitted name/company as untrusted text.

## 5. Route / API / network impact
- **New route:** `/cookies` (`force-static`). Add to sitemap + robots-allow.
- **New server action:** `requestBetaAccess` (POST endpoint).
- **No new Route Handlers, no new API routes, no proxy changes.**

## 6. Database impact
- **No migration required** for the recommended path (Phase 3/4 reuse existing tables with new `event_type` values).
- Fallback migration `0040_*` only if Phase 4 idempotency query proves inefficient (not recommended).

## 7. Documentation impact
- This plan pack (new).
- Optional doc comment in `contact-mailto.ts` / `landing-content.ts` (the CTA contract).
- `00_AGENT_COORDINATION.md` records the continuity contract for future agents.
- No update to `AGENTS.md` / `DESIGN.md` required (planning-only; their content unchanged).

## 8. Backward compatibility
- All changes are **additive** (new footer links, new page, new receipt, new CTA, new email) or **behavior-preserving refinements** (onboarding redirect target). No removal of existing public routes or auth behavior.
- The `requestBetaAccess` replacing the mailto POST is a behavior change on `/signup`, but the user-visible result improves (receipt vs silent). The mailto fallback remains on `/contact` for general inquiries.

## 9. Other active development (concurrency)
- Shared worktree; other agents may be editing. The continuity pack's file scopes (landing footers, `/cookies`, ClosedBetaGate, dashboard CTA, onboarding redirect) are **disjoint** from the active WIP in `git status` (sidebar/workshop cards/estimate rows/projects-page). Low collision risk. Implementers must still re-read touched files before edits and use file-scope ownership.

## 10. Affected-feature summary (cross-link to sibling packs)
- **Invite flow:** `2026-07-07-invite-token-flow-hardening` — continuity pack touches only the invite→auth *handoff*, not token internals.
- **First-user empty workspace:** `2026-07-07-first-user-activation-empty-workspace` — continuity pack touches only the *entry CTA*.
- **Projects IA:** `2026-07-07-projects-estimates-start-path-ia` — the dashboard CTA links into this surface.
- **RUM/CWV:** `2026-07-07-production-rum-and-cwv-telemetry` — this pack requires "no regression," depends on that pack for production RUM.
- **Privacy/DSAR:** `2026-07-07-retention-and-dsar-data-lifecycle` — `beta_access_requested` + `welcome_email_sent` rows fit the existing DSAR surface.
