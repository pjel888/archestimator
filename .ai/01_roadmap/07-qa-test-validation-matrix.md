# QA Test Validation Matrix

**Last updated: 2026-05-30**

Master validation matrix covering all test areas for the Archestimator MVP. Each row tracks current coverage, what remains missing, the command or evidence needed to validate, and whether that gap is a launch blocker.

## Coverage Matrix

| # | Test Area | Current Coverage | Missing Coverage | Required Command or Evidence | Run by Implementation Agent Later? | Launch Blocker Status | Notes |
|---|-----------|-----------------|------------------|------------------------------|-----------------------------------|-----------------------|-------|
| 1 | **Unit tests (Bun)** | Tests exist via `bun run test`. Suite runs and passes. | Coverage percentage unknown — no coverage instrumentation or baseline report. | `bun run test` (green), plus a coverage report using Bun's built-in coverage (`bun test --coverage`). | Yes — add coverage tooling, run report, file as baseline. | **Not a blocker** — tests exist and pass. Low coverage would be a pre-production concern, not pre-beta. | Bun's native test runner is fast. Coverage gaps likely in newer modules (share tokens, AI cost estimation, invite utilities). |
| 2 | **DOM/component tests (Vitest)** | Exists via `bun run test:dom`. Publication tests green at V2 P13. | Focused on publication components only. No tests for workshop editor, estimate sheet components, proposal builder UI, cost library browser, or dashboard. | `bun run test:dom` (green). Extend with Vitest + Testing Library for remaining component surface area. | Yes — expand Vitest suite to workshop, sheet, proposal, cost library, dashboard. | **Pre-beta minimum**: publication tests pass. **Pre-production**: workshop + sheet + proposal component tests. | Vitest configured with jsdom. Publication tests cover signed-out, signed-in, wrong-account, and edge-case states. |
| 3 | **Playwright E2E** | Exists via `bun run test:e2e`. Gated smoke tests: `ask-flip-package-builder-live` requires env vars, `shared-link-receiver` gated on `ARCHESTIMATOR_E2E_SHARED_LINK=1`. | No full end-to-end flows for: workspace creation to estimate generation, invite acceptance to collaboration, proposal export to download, AI cost estimation round-trip. Cross-browser matrix not covered. | `bun run test:e2e` (gated tests green). Additional env vars needed for full suite. | Yes — ungate remaining tests, add full-flow E2E scenarios, add cross-browser config. | **Pre-beta minimum**: gated smoke tests pass. **Pre-production**: full E2E suite ungated + cross-browser. | Gate mechanism prevents CI noise from missing env vars. Live smoke tests valuable but fragile. |
| 4 | **Auth provider staging tests** | LEFT TO DO | No staging Supabase + real Google OAuth end-to-end test exists. Current auth tests are mock-based or local-only. | Manual staging walkthrough: sign-up via Google OAuth against staging project, verify session persistence, verify token refresh, verify sign-out and re-sign-in. Automated: Playwright against staging with real OAuth flow (or documented manual checklist). | TBD — requires staging environment setup. Likely manual for pre-beta, automated for pre-production. | **Pre-beta blocker** — must verify Google OAuth works against a non-local Supabase instance. | Real OAuth testing is inherently hard to automate (captcha, consent screen). A documented manual smoke checklist is acceptable for pre-beta. |
| 5 | **Supabase linked-remote tests** | PARTIAL | Invite-entry E2E passed locally against linked remote, but no systematic remote test suite. No tests for: RLS policy enforcement on remote, storage access on remote, edge function invocation on remote, connection pooling behavior. | Manual: run invite-entry E2E against staging remote. Automated: extend Playwright suite to target staging project URL with `--project=staging` flag. | Yes — add staging target to Playwright config, run existing invite-entry spec. | **Pre-beta**: invite-entry against staging remote must pass. **Pre-production**: full remote test suite (RLS, storage, edge functions). | Linked remote testing is critical because RLS and storage policies can differ between local (supabase CLI) and hosted (Supabase platform). |
| 6 | **RLS denial tests** | LEFT TO DO — HIGHEST PRIORITY MISSING | No automated cross-workspace, cross-project, or cross-estimate access tests exist. No tests for: anonymous access attempts, authenticated user accessing another user's workspace, member of workspace A accessing workspace B, viewer role attempting write operations. | Dedicated test suite — either Vitest with mocked auth context OR Playwright with multiple authenticated sessions. Must cover: workspace isolation, project isolation, estimate isolation, role-based escalation prevention. | Yes — create `tests/rls-denial/` or extend existing Playwright suite with multi-session scenarios. | **CRITICAL PRE-BETA BLOCKER** — data isolation is the core security property. Cannot ship without automated proof. | This is the single highest-priority missing test area. Use Playwright with `browser.newContext()` for multi-session tests, or Vitest with direct Supabase client calls asserting 403/406 on cross-tenant access. |
| 7 | **Storage denial tests** | LEFT TO DO | No cross-workspace image or attachment access tests. No tests for: uploading to another workspace's bucket, reading another workspace's files via signed URL, bypassing size limits, bypassing MIME type restrictions. | Dedicated test suite — same approach as RLS denial. Storage bucket policies must be enforced per workspace. | Yes — create alongside RLS denial tests. | **Pre-beta blocker** — storage isolation is part of data isolation. | Supabase Storage RLS policies are separate from database RLS. Must test both layers independently and together. |
| 8 | **API/server-action authorization tests** | LEFT TO DO | No comprehensive `/api` route auth audit exists. No tests for: direct `/api` calls without session cookie, server action invocation without auth, CSRF token validation, rate limiting enforcement. | Audit every `/api` route and server action. For each: document expected auth requirement, write test proving unauthenticated access is denied. | Yes — systematic audit of all API routes and server actions. | **Pre-beta blocker** — any unauthenticated API route is a data leak vector. | This is more audit than test generation. Start with a grep for all `export async function` in route handlers, then verify each has auth guard. |
| 9 | **Invite lifecycle tests** | PARTIAL | Local route/unit/E2E coverage exists for signed-out acceptance, signed-in acceptance, wrong-account rejection, expired/revoked/used/invalid tokens, POST-only acceptance, and pending-invite visibility. Missing: Supabase Auth provider/dashboard proof, hosted invite template/confirmation proof, real email delivery, and real recipient click-through. | Extend existing invite-entry spec to staging target. Manual: send real invite email via staging, click through from recipient inbox, verify auth bridge, accept, redirect, audit, and access. | Yes — run existing invite-entry spec against staging remote. Manual: documented walkthrough with screenshots. | **Pre-beta blocker** — invite flow is the primary collaboration mechanism. Must work against a real Supabase/Auth/email provider path. | The local tests are thorough. The gap is provider-level validation (does the token survive the email→browser round-trip?). |
| 10 | **Share token tests** | PARTIAL | V2 focused Vitest/simulations and linked-route proof exist for core shared-link behavior, durable route rate limiting, recipient sessions, visibility signifiers, and delivery-status webhook handling. Missing: real Resend dashboard/webhook proof, real recipient email delivery/click-through, and full token lifecycle coverage in CI. | Ungate shared-link-receiver E2E by providing `ARCHESTIMATOR_E2E_SHARED_LINK=1` in CI. Add token lifecycle scenarios (create, rotate, revoke, expire). Run a real recipient email smoke with Resend dashboard/webhook evidence. | Yes — provide env var, run gated test, extend with lifecycle scenarios, and attach redacted Resend proof. | **Pre-beta**: gated test plus real recipient smoke must pass. **Pre-production**: full token lifecycle suite. | Share tokens are the read-only counterpart to invites (read-write). Both need live E2E and provider evidence. |
| 11 | **Proposal export tests** | Exists | Focused proposal tests exist and pass. Missing: export format fidelity (does the downloaded PDF/DOCX match the preview?), large proposal edge cases, custom branding/templating if supported. | `bun run test:dom` (proposal tests green). Manual: export and visually compare to preview. | Yes — add visual snapshot tests for export output. | **Not a pre-beta blocker** — core export works. Fidelity is a polish concern. | Export is inherently visual. Snapshot tests can catch regressions, but human review is needed for fidelity. |
| 12 | **AI safety tests** | PARTIAL | Gated live smoke exists but requires explicit env vars. No automated safety boundary tests: prompt injection via estimate fields, token limit exhaustion, cost estimation abuse, harmful content in proposal text. | Ungate live smoke. Add safety boundary tests: fuzz estimate description fields with injection attempts, verify rate limiting on AI endpoints, verify cost ceiling enforcement. | Yes — ungate live smoke, add Vitest safety boundary suite. | **Pre-production blocker** — any AI feature that generates or processes user content needs safety boundaries. | Even with safety guardrails on the model side, the application must enforce its own boundaries (rate limits, input sanitization, output filtering). |
| 13 | **Accessibility tests** | LEFT TO DO | No aXe or WAVE audit has been run. No automated accessibility assertions in any test suite. No manual screen-reader walkthrough documented. | Run aXe-core via Playwright (`@axe-core/playwright`). Run WAVE against key pages. Document manual VoiceOver/NVDA walkthrough for: workshop, estimate sheet, shared link receiver, invite acceptance. | TBD — can be automated (aXe in Playwright) or manual. | **Pre-production blocker** — accessibility is a launch requirement for production-facing SaaS. **Not pre-beta**. | aXe catches ~57% of issues. Manual screen-reader testing catches the rest. Start with automated, then manual for pre-production. |
| 14 | **Mobile/responsive tests** | PARTIAL | Shared link receiver has responsive design. No mobile guard tested for: workshop editor, estimate sheet builder, proposal preview, cost library browser, dashboard. | Playwright viewport tests at 375px, 768px, 1024px, 1440px for all key pages. Manual: test on real mobile device (iOS Safari, Android Chrome). | Yes — add Playwright viewport matrix. | **Pre-beta**: shared link receiver must be mobile-usable (primary end-user surface). **Pre-production**: all surfaces mobile-tested. | The shared link receiver is the most likely mobile entry point for clients. Workshop editing on mobile is secondary. |
| 15 | **Performance smoke tests** | PARTIAL / MANUAL CHROME PROOF OPEN | Route-transition perf smoke, production-auth storage-state proof, authenticated Lighthouse, true webpack analyzer reports, hover `_rsc` proof, and public bfcache cache-header mitigation exist. Missing: manual Chrome bfcache DevTools persisted-restore proof, production Chrome React Profiler proof, load testing, Lighthouse CI, cold-start measurement, large-sheet/XLSX benchmarks. | Lighthouse CI in CI pipeline. Performance budgets: LCP < 2.5s, TBT < 200ms, CLS < 0.1. Capture manual Chrome bfcache + React Profiler evidence. Load test: 50 concurrent shared-link views. Cold start: measure first request after deploy. | Yes — add Lighthouse CI config, add k6/locust load test script, capture manual Chrome traces. | **Pre-beta blocker for route transitions/manual profiler gates; pre-production blocker for broader load/cold-start gates.** | Use `@lhci/cli` for Lighthouse, Chrome DevTools/React DevTools for manual proof, and `k6` for load testing. |
| 16 | **Visual regression / manual review** | LEFT TO DO | No visual regression testing (Percy, Chromatic, or manual screenshot diffing). No documented manual review checklist for pre-release. | Visual regression: Playwright screenshot comparison or Percy integration. Manual review checklist: walk every page, check every component state (loading, empty, error, edge cases). | TBD — visual regression can be automated. Manual review is a release process step. | **Pre-production**: visual regression for key surfaces. **Pre-beta**: documented manual review checklist. | Visual regressions are the most common "it looked fine in dev" bug. Screenshot diffing catches layout shifts, z-index issues, and font rendering changes. |
| 17 | **Browser compatibility** | LEFT TO DO | No cross-browser test matrix exists. Playwright currently runs in Chromium only. No Firefox or WebKit/Safari coverage. | Add Firefox and WebKit projects to Playwright config. Run smoke tests across all three. Manual: test on Safari (macOS + iOS) and Firefox. | Yes — add `--project=firefox --project=webkit` to Playwright config. | **Pre-production blocker** — must validate across Chrome, Firefox, Safari. **Not pre-beta**. | Safari is the most likely divergence point (CSS Grid, flexbox gaps, font rendering). Prioritize Safari manual testing. |
| 18 | **Regression checklist before release** | LEFT TO DO | No documented regression checklist exists. Each release is ad-hoc. | Create `docs/release-checklist.md` with: 1) run full validation suite, 2) manual smoke of key flows, 3) visual review of changed surfaces, 4) performance smoke, 5) accessibility audit. | Yes — create checklist, iterate each release. | **Pre-beta minimum**: first draft of checklist. **Pre-production**: mature, battle-tested checklist. | A regression checklist is the safety net that catches what automated tests miss. It grows with the product. |

## Existing Validation Commands

These commands are wired and runnable today. Every test area above should eventually feed into one of these pipelines.

```
bun run type-check          # TypeScript compilation check (tsc --noEmit)
bun run lint                # ESLint across the project
bun run lint:design-system  # Design system enforcement (color token usage, spacing scale, component API compliance)
bun run test                # Bun unit tests (fast, runs in-process)
bun run test:dom            # Vitest DOM/component tests (jsdom, Testing Library)
bun run test:e2e            # Playwright E2E tests (gated; requires env vars for full suite)
bun run build               # Next.js production build (catches build-time errors including dynamic import failures)
bun run validate            # Combined gate: tsc + lint + test + test:dom (all-or-nothing pass)
```

## Launch Validation Gate Status

### Pre-beta Minimum (must pass before any external user access)

| Gate | Status | Blocking? |
|------|--------|-----------|
| `bun run validate` passes (type-check + lint + unit + DOM) | ✅ Exists, runs in CI | Yes |
| `bun run build` passes (production build) | ✅ Exists, runs in CI | Yes |
| Gated Playwright smoke tests pass | ⚠️ Gated — need env vars in CI | Yes |
| RLS denial tests (cross-workspace/project/estimate isolation) | ❌ LEFT TO DO | **CRITICAL** |
| Storage denial tests (cross-workspace image/attachment isolation) | ❌ LEFT TO DO | **CRITICAL** |
| API/server-action auth audit complete | ❌ LEFT TO DO | Yes |
| Invite lifecycle staging test (real Supabase, real tokens) | ❌ LEFT TO DO | Yes |
| Share token gated test ungated and passing | ⚠️ Gated — need `ARCHESTIMATOR_E2E_SHARED_LINK=1` | Yes |
| Workshop smoke (create workspace, add estimate, export) | ❌ LEFT TO DO | Yes |
| Auth provider staging test (real Google OAuth) | ❌ LEFT TO DO | Yes |

### Pre-production Minimum (must pass before public launch)

All pre-beta gates, plus:

| Gate | Status | Blocking? |
|------|--------|-----------|
| Full Playwright E2E suite ungated + cross-browser (Chromium, Firefox, WebKit) | ❌ LEFT TO DO | Yes |
| Vitest DOM suite expanded to workshop, sheet, proposal, cost library, dashboard | ❌ LEFT TO DO | Yes |
| AI safety boundary tests (injection, rate limiting, cost ceiling) | ❌ LEFT TO DO | Yes |
| Accessibility audit (aXe automated + manual screen-reader walkthrough) | ❌ LEFT TO DO | Yes |
| Mobile/responsive viewport matrix (375px, 768px, 1024px, 1440px) | ❌ LEFT TO DO | Yes |
| Performance smoke (Lighthouse CI, performance budgets, load test) | ⚠️ PARTIAL — route-transition local/prod-like evidence exists; manual Chrome bfcache + React Profiler proof still open | Yes |
| Visual regression (screenshot diffing or Percy) | ❌ LEFT TO DO | Yes |
| Browser compatibility manual (Safari macOS/iOS, Firefox, Chrome) | ❌ LEFT TO DO | Yes |
| Documented regression release checklist | ❌ LEFT TO DO | Yes |
| Share token full lifecycle suite (rotate, revoke, expire) | ❌ LEFT TO DO | Yes |
| Proposal export fidelity verification (visual comparison) | ❌ LEFT TO DO | Yes |

### Blockers Summary

**Immediate pre-beta blockers (must resolve first):**
1. RLS denial tests — data isolation is non-negotiable
2. Storage denial tests — storage isolation is non-negotiable
3. API/server-action auth audit — unauthenticated routes are data leaks
4. Invite lifecycle staging tests — primary collaboration mechanism
5. Auth provider staging test — real OAuth must work

**Secondary pre-beta (should resolve before any user access):**
6. Ungate share token E2E
7. Workshop smoke tests
8. Gated Playwright smoke ungated in CI

**Pre-production (resolve before public launch):**
9. Cross-browser E2E
10. Accessibility audit
11. Mobile viewport matrix
12. Performance smoke + Lighthouse CI
13. Visual regression
14. AI safety boundaries
15. Full component DOM test expansion
16. Regression release checklist

## Activity History Overhaul V1 repo-local QA overlay — 2026-06-02

Milestone 9 added automated accessibility/performance assertions for the Activity History surfaces while preserving the broader roadmap truth that full production accessibility still needs aXe/WAVE and manual screen-reader walkthrough evidence. Current repo-local evidence:

- Shared-link activity feed uses `role=feed`, focusable activity articles, native details disclosure for audit facts, loading skeletons, alert/status states, and an `aria-live=polite` Realtime new-activity announcement.
- Estimate Activity History timeline exposes `role=feed` with accessible day regions and existing article labels.
- Targeted validation: `bun run test:dom -- tests/vitest/project-publication-activity.test.tsx tests/vitest/estimate-sheet-version-control-ui.test.tsx` and `bun run lint:design-system`.
- Performance smoke: 200 shared-feed activity items render under the test budget in Vitest/JSDOM.

This is repo-local automated evidence only. It does not replace browser aXe/WAVE scans or manual assistive-technology walkthroughs before production.
