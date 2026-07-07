# 04 — Requirements Specification

Stable IDs. Categories: FR (functional), UX, A11Y, ARCH, SEC, REL, OPS, TEST, DOC, CONT (continuity). Every requirement has objective acceptance criteria, source, priority (P0 critical / P1 high / P2 medium), dependencies, validation method, affected code areas, risks, status.

**Status legend:** `pending` (not yet implemented — all are pending, this is a plan), `blocked-external`, `deferred-with-rationale`.

---

## FR — Functional

### FR-CONT-01 — Continuity contract document (P0)
**Statement:** A single documented contract maps every public CTA label and `intent` value to its destination route and its logged-in/logged-out variant, covering the v3 homepage, `/new`, shared `LandingCTAs`/`LandingHeader`, and `ClosedBetaGate`.
**Rationale:** Two divergent CTA postures exist (G1); without a canonical mapping, downstream copy/tests will drift.
**Source:** `PROMPT.md` ("beta CTA"); repo evidence (`landing-content.ts`, `contact-mailto.ts`).
**Acceptance criteria:**
- AC-FR-01a: A markdown section (in `06` or a generated `landing-cta-contract.md` referenced by it) lists each CTA surface × label × href × intent × auth-state.
- AC-FR-01b: The `intent` vocabulary in `contact-mailto.ts` is documented (walkthrough/access/started/beta-request/feedback/general) with normalization rules.
**Validation:** static doc review; cross-check against `rg "intent=" src/components/landing*`.
**Affected:** `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md`, `src/components/landing-v3/landing-content.ts` (doc-of-record, optional comment), `src/components/landing/contact-mailto.ts` (doc comment).
**Risks:** contract drift if not test-enforced (mitigated by FR-CONT-02 test).
**Status:** pending (Phase 0).

### FR-CONT-02 — Canonical CTA posture enforced by test (P0)
**Statement:** The live v3 homepage primary logged-out CTA target and the `ClosedBetaGate` "Request access" target match the canonical contract; a test fails if they drift.
**Rationale:** Locks OPEN-CONT-01 resolution into code.
**Acceptance criteria:**
- AC-FR-02a: A vitest asserts `ArchestimatorLandingPage` logged-out `PrimaryCta` href equals the contract value.
- AC-FR-02b: A vitest asserts `ClosedBetaGate` posts to the contract beta-request endpoint.
**Validation:** `bunx vitest run <new test>` — see `12`.
**Affected:** new test file `tests/vitest/landing-cta-continuity.test.tsx`.
**Status:** pending (Phase 0); blocked-external on OPEN-CONT-01 decision (recommended option documented).

### FR-CONT-03 — Unified footer trust-link group (P1)
**Statement:** All public footers (v3 `LandingFooter`, `/new` footer, shared `LandingFooter`) render the same set of trust/legal/support links: Privacy, Terms, Trust, Security, Contact (mailto).
**Rationale:** G2 — inconsistent footers break continuity expectations.
**Acceptance criteria:**
- AC-FR-03a: Each footer contains links to `/privacy`, `/terms`, `/trust`, `/security`, and `mailto:support@archestimator.com` (or `/contact`).
- AC-FR-03b: No footer omits a contract link; a test enumerates the expected set per footer and asserts presence.
**Validation:** RTL test rendering each footer.
**Affected:** `src/components/landing-v3/ArchestimatorLandingPage.tsx` (footer block), `src/components/landing-new/NewLandingPage.tsx`, `src/components/landing/LandingFooter.tsx`.
**Status:** pending (Phase 1); blocked-external on OPEN-CONT-02.

### FR-CONT-04 — Legal pages have per-route metadata (P1)
**Statement:** `/terms` and `/privacy` export `metadata` (title, description, canonical, OG) via `buildLandingMetadata` (indexable), consistent with `/security`/`/trust`.
**Rationale:** G3 — legal pages lack metadata; bad for SEO + sharing.
**Acceptance criteria:**
- AC-FR-04a: `src/app/terms/page.tsx` exports `metadata` with title, description, canonical `${ORIGIN}/terms`, OG.
- AC-FR-04b: Same for `src/app/privacy/page.tsx`.
- AC-FR-04c: A test asserts both export metadata and that canonical matches `LANDING_SITE_ORIGIN`.
**Validation:** metadata export test.
**Affected:** `src/app/terms/page.tsx`, `src/app/privacy/page.tsx`.
**Status:** pending (Phase 2).

### FR-CONT-05 — `/security` in sitemap; PGP key asset present (P2)
**Statement:** `src/app/sitemap.ts` includes `/security`; `public/.well-known/pgp-key.txt` exists (or the `security.txt` reference is removed if no key is published).
**Rationale:** G4 — missing sitemap entry + dangling PGP reference.
**Acceptance criteria:**
- AC-FR-05a: Sitemap array contains `/security`.
- AC-FR-05b: Either `public/.well-known/pgp-key.txt` exists OR `security.txt` no longer references it (owner decision on key publication).
**Validation:** sitemap test; file existence check.
**Affected:** `src/app/sitemap.ts`, `public/.well-known/`.
**Status:** pending (Phase 2); PGP key publication is owner-gated.

### FR-CONT-06 — Cookie-policy page (P1)
**Statement:** A `/cookies` route documents the cookie categories the `CookieConsentBanner` controls (essential, analytics) and the consent cookie name; the banner links to it.
**Rationale:** G5 — consent banner without a policy page.
**Acceptance criteria:**
- AC-FR-06a: `src/app/cookies/page.tsx` renders a `force-static` page listing essential + analytics categories and the `archestimator:landing-consent` cookie.
- AC-FR-06b: `CookieConsentBanner` renders a "Cookie policy" link to `/cookies`.
- AC-FR-06c: `/cookies` added to sitemap at low priority (0.3) and allowed by robots.
**Validation:** route render test; banner link test.
**Affected:** new `src/app/cookies/page.tsx`, `src/components/landing/CookieConsentBanner.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`.
**Status:** pending (Phase 2); blocked-external on OPEN-CONT-03.

### FR-CONT-07 — ClosedBetaGate plain-language legal pre-link (P1)
**Statement:** `ClosedBetaGate` renders a plain-language line "By requesting access you agree to our Terms and Privacy Policy" with links to `/terms` and `/privacy`, above or below the submit button.
**Rationale:** G6 — no legal context on the gate; sets expectation without a double-gate (DEC-CONT-01).
**Acceptance criteria:**
- AC-FR-07a: `ClosedBetaGate` renders links to `/terms` and `/privacy` within the gate card.
- AC-FR-07b: Copy is plain-language, non-blocking (no checkbox required to submit — that stays at the post-auth clickwrap).
- AC-FR-07c: Test asserts both links render.
**Validation:** RTL test.
**Affected:** `src/components/auth/ClosedBetaGate.tsx`.
**Status:** pending (Phase 3); blocked-external on OPEN-CONT-06.

### FR-CONT-08 — Beta-request receipt + server intake (P1)
**Statement:** Submitting `ClosedBetaGate` calls a server action (`requestBetaAccess`) that: validates honeypot, rate-limits by email+IP-hash, records an audit row, and returns a receipt state ("Thanks — we'll reach out") to the client; the silent mailto POST is removed.
**Rationale:** G7 + security — silent mailto has no audit trail, no rate limit, no receipt. DEC-CONT-02.
**Acceptance criteria:**
- AC-FR-08a: `requestBetaAccess` server action exists, requires honeypot empty, enforces a per-email + per-IP-hash rate limit (D1 `security_rate_limit_events` or `closed_beta_allowlist_audit_events`).
- AC-FR-08b: On success it inserts an audit row (status `requested`) and the UI shows a receipt; on rate-limit it shows a throttled message; on honeypot trip it fails closed silently.
- AC-FR-08c: Tests cover happy, honeypot, rate-limit, and duplicate-request paths.
**Validation:** server-action unit tests.
**Affected:** new `src/lib/landing/beta-request-actions.ts`, `src/components/auth/ClosedBetaGate.tsx` (client wrapper or server-action form), audit store (reuse `closed-beta-d1-store.ts`).
**Status:** pending (Phase 3).

### FR-CONT-09 — Welcome/onboarding email (P2, owner-gated)
**Statement:** On first successful workshop entry (terms accepted + workspace provisioned), a single welcome email is sent via `sendCloudflareEmail` (subject + plain + HTML), only once per user (idempotency via a flag/audit row).
**Rationale:** G8 — no welcome touchpoint; delivery OFF by default.
**Acceptance criteria:**
- AC-FR-09a: A welcome-email send is triggered exactly once per user on first workshop entry; idempotency proven by a test that fires the trigger twice and asserts one send.
- AC-FR-09b: When `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED=false`, the send is skipped gracefully (no error, logged).
- AC-FR-09c: Copy is beta-stage honest (no overclaims); owner approves copy (OPEN-CONT-04).
**Validation:** unit test with mocked `sendCloudflareEmail`; idempotency test.
**Affected:** `src/lib/auth/account-actions.ts` (or a new `src/lib/auth/welcome-email.ts`), inline template.
**Status:** pending (Phase 4); blocked-external on OPEN-CONT-04 + delivery config.

### FR-CONT-10 — First-project empty-state CTA on dashboard (P1)
**Statement:** When the user's workspace has zero projects, the dashboard renders an explicit "Create your first project" CTA linking to `/workshop/projects` (or opening `NewProjectModal`); when projects exist, the CTA is absent.
**Rationale:** G9 — no first-workflow handoff for genuinely-empty workspaces.
**Acceptance criteria:**
- AC-FR-10a: `WorkshopDashboard`/`WorkshopHomebaseClient` renders the CTA iff `projectCount === 0`.
- AC-FR-10b: CTA links to `/workshop/projects` and is keyboard-reachable.
- AC-FR-10c: Test asserts presence with 0 projects and absence with ≥1.
**Validation:** RTL test with fixture.
**Affected:** `src/components/workshop/dashboard/WorkshopDashboard.tsx` or `WorkshopHomebaseClient.tsx`.
**Status:** pending (Phase 5).

### FR-CONT-11 — `/workshop/onboarding` redirect target (P2)
**Statement:** `/workshop/onboarding` redirects to `/workshop/projects` when the workspace is empty (first-project handoff) and to `/workshop` otherwise, instead of always redirecting to settings.
**Rationale:** G9 — onboarding redirect goes to settings, not first workflow.
**Acceptance criteria:**
- AC-FR-11a: `/workshop/onboarding` checks project count; empty → `/workshop/projects`, non-empty → `/workshop`.
- AC-FR-11b: Test asserts both branches.
**Validation:** route test.
**Affected:** `src/app/workshop/onboarding/page.tsx`.
**Status:** pending (Phase 5).

### FR-CONT-12 — Production domain confirmation (P0, external)
**Statement:** `LANDING_SITE_ORIGIN` confirmed as `https://archestimator.com` and the `L-SEO-1 GATED` marker cleared (or updated to the confirmed domain).
**Rationale:** G12 — all canonicals/OG/sitemap depend on it.
**Acceptance criteria:** owner confirms; marker removed/updated in `seo-metadata.ts`.
**Validation:** static + owner confirmation.
**Status:** blocked-external (OPEN-CONT-05).

---

## UX / A11Y

### UX-CONT-01 — Coherent post-auth landing (P1)
The user always lands on a meaningful next step after auth: `/workshop` (dashboard) for a normal user, `/workshop/pending-invite` for an invitee, or `/workshop/terms` if terms pending. No ambiguous "where am I".
- AC: trace test asserts the three branches.

### A11Y-CONT-01 — Footer links keyboard-reachable + labeled (P1)
All footer trust links are `<a>` with discernible text, keyboard-focusable, in a logical tab order.
- AC: axe/RTL assertions on focusability + accessible names.

### A11Y-CONT-02 — Cookie banner + ClosedBetaGate a11y (P1)
Cookie banner buttons and ClosedBetaGate submit have accessible names, visible focus, and the banner is dismissible via keyboard. Form fields have labels.
- AC: RTL keyboard + axe assertions.

### A11Y-CONT-03 — Legal pages landmark + heading structure (P2)
`/terms`, `/privacy`, `/cookies`, `/security`, `/trust` each have one `<h1>`, proper heading order, and a `<main>` landmark.
- AC: RTL/axe structural assertions.

---

## ARCH

### ARCH-CONT-01 — Continuity changes are frontend + 1 server action + 1 email (P0)
No auth/schema/proxy architecture change for the core path. The only server-side additions are `requestBetaAccess` (Phase 3) and the welcome email trigger (Phase 4). DB: no migration required for core (see `21`); Phase 3 reuses existing audit tables.
- AC: `21` confirms no new tables for FR-CONT-01..07,10,11; Phase 3/4 reuse existing.

### ARCH-CONT-02 — Trust boundary ordering preserved (P0)
Proxy auth-header → WorkshopLayout terms gate → `getCurrentUserContext` closed-beta check ordering is unchanged. No new gate is inserted before the post-auth clickwrap.
- AC: trace test + static review of `request-proxy.ts`/`workshop/layout.tsx`/`session.ts`.

---

## SEC

### SEC-CONT-01 — `requestBetaAccess` hardened (P0)
Honeypot, per-email+IP-hash rate limit, audit row, fail-closed on honeypot trip, no PII logged beyond email + IP-hash. Server-action directly reachable POST endpoint — must validate.
- AC: tests for honeypot/rate-limit/duplicate/audit.

### SEC-CONT-02 — No new credential exposure (P0)
No new cookies/tokens introduced. Welcome email does not include tokens/links beyond a plain `/workshop` link. Existing credential materials unchanged (see `20`).
- AC: credential-material review; email copy review.

### SEC-CONT-03 — Footer/mailto addresses not enumerable (P2)
`mailto:support@archestimator.com` is static public content (acceptable). `requestBetaAccess` must not confirm whether an email is already on the allowlist (uniform receipt message).
- AC: uniform-receipt test.

---

## REL / OPS

### REL-CONT-01 — Welcome email failure does not block entry (P1)
If `sendCloudflareEmail` fails (binding missing, delivery disabled, circuit open), workshop entry still succeeds; failure is logged, not surfaced as a hard error to the user.
- AC: test where email send fails → entry succeeds.

### OPS-CONT-01 — Rollout gates defined (P1)
Merge gate = tests green + type/lint; closed-beta rollout = hosted smoke of full path; production = email deliverability proof (Phase 4) + domain confirmation.
- AC: `13` documents gates.

---

## TEST

### TEST-CONT-01 — Continuity contract test (P0)
One test file asserts the full user-visible path: `/` → CTA → `/contact`/`ClosedBetaGate` → (grant) → `/login` → `/workshop` → terms gate → workspace → dashboard first-project CTA. Uses fixtures/mocks for the allowlist grant.
- AC: test exists and exercises each transition's user-visible result.

### TEST-CONT-02 — Per-requirement test coverage (P0)
Every behavior-bearing FR/UX/A11Y/SEC requirement maps to ≥1 test in the execution matrix (`12`).
- AC: traceability matrix shows no untraced requirement.

---

## DOC

### DOC-CONT-01 — Continuity contract documented (P1)
The CTA/intent contract (FR-CONT-01) and the trust-truthfulness ledger (`03` §4) are recorded in-repo for future agents.
- AC: docs exist and are referenced.

### DOC-CONT-02 — No new overclaims (P0)
No public copy introduces "trusted by", invented metrics, fake logos, or softened security/truthfulness posture. Existing tests guard this; new copy reviewed against the claims ledger.
- AC: claims-ledger cross-check + existing overclaim tests still pass.

---

## Shadow-path matrices

### Flow A: Public CTA → contact / beta-request
| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| "Book a walkthrough" (`intent=walkthrough`) | mailto opens / contact form renders | n/a (link) | n/a | n/a | n/a | n/a | n/a | n/a | contact form | TEST-CONT-01 |
| `ClosedBetaGate` → `requestBetaAccess` | receipt shown | email missing → validation error | empty email → error | bad email format → error | n/a (public) | server error → friendly error | double-submit → idempotent receipt | rate-limit → throttled msg | receipt / error | SEC-CONT-01 |

### Flow B: Login → terms gate → workspace
| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| `/login` magic-link | email sent → click → `/workshop` | no email → validation | empty → error | bad format → error | closed-beta denied → `/access-required` | email svc down → graceful | n/a | magic-link replay guarded by Better Auth | `/workshop` or error | existing + TEST-CONT-01 |
| Terms gate | accept → `/workshop` | checkbox unchecked → blocked | n/a | version mismatch → blocked | n/a | n/a | n/a | re-accept guarded | gate clears | existing + ARCH-CONT-02 |
| `ensureDefaultWorkspace` | workspace created | n/a | n/a | n/a | n/a | D1 error → error boundary | concurrent create → unique constraint wins | memoized per-request | dashboard loads | existing |

### Flow C: Invite → auth → workshop
| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| `/invite/[token]` | preview → continue → login → accept | missing token → 404 | expired → terminal state | malformed token → invalid state | wrong-account → sign-out option | D1 error → friendly | token race guarded by unique partial index | replay blocked + audited | accepted → `/workshop?invite=accepted` | sibling pack + TEST-CONT-01 (handoff only) |

### Flow D: First-workflow entry
| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Dashboard empty-state CTA | 0 projects → CTA shown → `/workshop/projects` | n/a | n/a | n/a | n/a | D1 error → existing boundary | n/a | n/a | CTA visible | FR-CONT-10 |
| `/workshop/onboarding` redirect | empty → `/workshop/projects` | n/a | non-empty → `/workshop` | n/a | n/a | n/a | n/a | n/a | redirect | FR-CONT-11 |

Every applicable cell is answered or marked not-applicable with reason. No flow left incomplete.
