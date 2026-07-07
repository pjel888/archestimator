# 11 — Implementation Plan

**Authoritative execution guide for the future implementation AI.** Phased, dependency-aware, with exact target paths and symbols per task. Read-only planning — no code changed here.

Every task below names exact repo-relative paths and symbols (no "likely"). Where owner decisions gate a copy/label choice, the task is marked `BLOCKED-EXTERNAL` with the OPEN-CONT ID, but the technical target paths are still exact.

---

## Phase 0 — Continuity contract + CTA intent reconciliation

**Objective:** Establish the canonical CTA/intent vocabulary and the continuity contract that all downstream phases consume.
**Requirements:** FR-CONT-01, FR-CONT-02, FR-CONT-12.
**Prerequisites:** stale-plan revalidation checklist (README) confirmed.
**Dependencies:** OPEN-CONT-01 (CTA posture), OPEN-CONT-05 (domain).
**Exit criteria:** contract documented; CTA-continuity test green (or blocked-external marker recorded).

### WP-0.1 — Document the CTA/intent continuity contract
**Task IDs:** T-0.1.
**Req IDs:** FR-CONT-01, DOC-CONT-01.
**Objective:** Record the canonical surface×label×href×intent×auth-state mapping.
**Target paths:**
- `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` §3 (already drafted in this pack — confirm it matches resolved OPEN-CONT-01).
- Optional: doc comment atop `src/components/landing/contact-mailto.ts` (above `normalizeInquiryType`) and `src/components/landing-v3/landing-content.ts` (above `WALKTHROUGH_HREF`).
**Symbols:** `normalizeInquiryType`, `SUPPORT_EMAIL`, `WALKTHROUGH_HREF`, `WORKSPACE_HREF`, `LOGIN_HREF`.
**Why:** prevents downstream drift; single source of truth.
**Expected output:** doc section + optional comments.
**Validation:** static review; cross-check `rg "intent=" src/components/landing*` matches the table.
**Parallelization:** sequential (load-bearing prerequisite).
**Complexity:** Small.
**Status:** pending (partially done in this pack; finalize after OPEN-CONT-01).

### WP-0.2 — CTA-continuity test
**Task IDs:** T-0.2.
**Req IDs:** FR-CONT-02.
**Objective:** Lock the canonical primary logged-out CTA target + ClosedBetaGate target in code.
**New file:** `tests/vitest/landing-cta-continuity.test.tsx`.
**Target symbols asserted:** `ArchestimatorLandingPage` `PrimaryCta` href (logged-out); `ClosedBetaGate` form action/intent.
**Why:** contract drift protection.
**Validation:** `bunx vitest run tests/vitest/landing-cta-continuity.test.tsx`.
**Parallelization:** sequential after WP-0.1.
**Complexity:** Small.
**Status:** pending; BLOCKED-EXTERNAL on OPEN-CONT-01 (write the test to assert the resolved canonical values).

### WP-0.3 — Confirm production domain
**Task IDs:** T-0.3.
**Req IDs:** FR-CONT-12.
**Target:** `src/lib/landing/seo-metadata.ts` (`LANDING_SITE_ORIGIN`, `L-SEO-1 GATED` marker).
**Status:** BLOCKED-EXTERNAL (OPEN-CONT-05). No code change until owner confirms.

---

## Phase 1 — Footer / trust-link continuity

**Objective:** One unified trust-link group across all public footers.
**Requirements:** FR-CONT-03, A11Y-CONT-01.
**Prerequisites:** Phase 0 contract.
**Dependencies:** OPEN-CONT-02 (footer set).
**Parallel-safe with:** Phase 2, Phase 3 (disjoint file scopes).

### WP-1.1 — Unify footer links
**Task IDs:** T-1.1a, T-1.1b, T-1.1c.
**Req IDs:** FR-CONT-03.
**Objective:** render Privacy, Terms, Trust, Security, Contact (mailto or `/contact`) in all three footers.
**Target paths & symbols:**
- `src/components/landing-v3/ArchestimatorLandingPage.tsx` — footer block (~L644-654); add `/trust`, `/security`, `/contact` (mailto). Keep existing Privacy/Terms.
- `src/components/landing-new/NewLandingPage.tsx` — footer (~L590-595); add `/terms`, `/security`, `/contact`. Keep Trust/Privacy.
- `src/components/landing/LandingFooter.tsx` — currently logo-only; add the full link group (Privacy, Terms, Trust, Security, Contact).
**Why:** G2 inconsistency.
**A11y:** `<a>` with discernible text, Tab order, visible focus.
**Tests:** `tests/vitest/public-trust-link-continuity.test.tsx` (new) — enumerate expected set per footer, assert presence + accessible name.
**Validation:** `bunx vitest run tests/vitest/public-trust-link-continuity.test.tsx`; `bun run type-check`.
**Bundle/cache:** static `<a>`; no JS; `force-static` pages unaffected.
**Rollback:** git revert.
**Complexity:** Small (×3).
**Status:** pending; BLOCKED-EXTERNAL on OPEN-CONT-02 (exact set).

---

## Phase 2 — Legal / support page completeness

**Objective:** Complete the legal/support surface (cookies, security sitemap, metadata, PGP).
**Requirements:** FR-CONT-04, FR-CONT-05, FR-CONT-06, A11Y-CONT-03.
**Prerequisites:** Phase 0.
**Dependencies:** OPEN-CONT-03 (cookie page).
**Parallel-safe with:** Phase 1, Phase 3.

### WP-2.1 — Legal-page metadata
**Task IDs:** T-2.1a, T-2.1b.
**Req IDs:** FR-CONT-04.
**Target paths:** `src/app/terms/page.tsx`, `src/app/privacy/page.tsx`.
**Change:** export `metadata` via `buildLandingMetadata({ path, title, description })` (consistent with `/security`/`/trust`).
**Symbols:** `buildLandingMetadata` (`src/lib/landing/seo-metadata.ts`).
**Tests:** extend `public-static-route-contract.test.ts` or new `legal-page-metadata.test.ts` — assert metadata export + canonical.
**Complexity:** Small.
**Status:** pending.

### WP-2.2 — `/cookies` page + banner link
**Task IDs:** T-2.2a, T-2.2b, T-2.2c.
**Req IDs:** FR-CONT-06.
**New file:** `src/app/cookies/page.tsx` (RSC, `force-static`, `PublicPageShell`). Content: essential + analytics categories, `archestimator:landing-consent` cookie name, link back to `/privacy`.
**Target paths (edits):**
- `src/components/landing/CookieConsentBanner.tsx` — add `<a href="/cookies">Cookie policy</a>`.
- `src/app/sitemap.ts` — add `/cookies` (priority 0.3).
- `src/app/robots.ts` — `/cookies` allowed (it's not in Disallow).
- `tests/vitest/public-static-route-contract.test.ts` — add `/cookies` to the force-static + no-`cookies()`/`headers()` assertion list.
**Tests:** `tests/vitest/cookies-page.test.tsx` (render + banner link); structural a11y (single `<h1>`, `<main>`).
**A11y:** single `<h1>`, heading order, `<main>` landmark.
**Complexity:** Small–Medium.
**Status:** pending; BLOCKED-EXTERNAL on OPEN-CONT-03 (whether standalone page vs embedded — recommendation: standalone).

### WP-2.3 — `/security` sitemap + PGP asset
**Task IDs:** T-2.3a, T-2.3b.
**Req IDs:** FR-CONT-05.
**Target paths:**
- `src/app/sitemap.ts` — add `/security` (priority ~0.5).
- `public/.well-known/pgp-key.txt` — add the key OR edit `public/.well-known/security.txt` to remove the `pgp-key.txt` reference (owner decision on key publication).
**Tests:** sitemap test asserts `/security`; file-existence or no-dangling-reference test.
**Complexity:** Small.
**Status:** pending; T-2.3b BLOCKED-EXTERNAL (PGP key publication — owner/security).

---

## Phase 3 — Terms-gate continuity + beta-request receipt

**Objective:** Plain-language legal pre-link on the gate + a real beta-request intake with receipt, audit, rate-limit.
**Requirements:** FR-CONT-07, FR-CONT-08, SEC-CONT-01, SEC-CONT-03.
**Prerequisites:** Phase 0.
**Dependencies:** OPEN-CONT-06 (legal-line posture).
**Parallel-safe with:** Phase 1, Phase 2.

### WP-3.1 — ClosedBetaGate legal line
**Task IDs:** T-3.1.
**Req IDs:** FR-CONT-07.
**Target:** `src/components/auth/ClosedBetaGate.tsx`.
**Change:** add plain-language line + `<a href="/terms">` + `<a href="/privacy">` (reuse `LoginForm.tsx:108` legal-row pattern). Non-blocking (no checkbox).
**Tests:** extend `beta-request-intake.test.ts` (or a focused `closed-beta-gate-legal-line.test.tsx`) — assert both links render.
**Complexity:** Small.
**Status:** pending; BLOCKED-EXTERNAL on OPEN-CONT-06.

### WP-3.2 — `requestBetaAccess` server action + intake store
**Task IDs:** T-3.2a (action), T-3.2b (store), T-3.2c (ClosedBetaGate wiring).
**Req IDs:** FR-CONT-08, SEC-CONT-01, SEC-CONT-03.
**New file:** `src/lib/landing/beta-request-actions.ts` (`"use server"`).
**Public contract:** `requestBetaAccess(input: { email: string; name?: string; company?: string; company_url: string }): Promise<{ ok: boolean; reason?: 'invalid'|'rate_limited'|'honeypot' }>`.
**Behavior:** validate (email format, length caps ≤320/name ≤120/company ≤120, honeypot empty); resolve IP-hash (HMAC+pepper, reuse `src/lib/collaboration/invite-entry.ts` pepper-resolver pattern or a generic `src/lib/auth/ip-hash.ts`); check rate-limit (per email 3/hr + per IP-hash 10/hr via `security_rate_limit_events`); insert audit row (`closed_beta_allowlist_audit_events`, event_type `beta_access_requested`, metadata_json `{name,company,source:'closed_beta_gate'}`); return `ok:true`. On honeypot trip → return `ok:true` silently (fail-closed). On rate-limit → return `reason:'rate_limited'`. On invalid → `reason:'invalid'`.
**Store reuse:** `src/lib/auth/closed-beta-d1-store.ts` (add `recordBetaAccessRequestInD1`) + existing rate-limit helper pattern.
**ClosedBetaGate wiring:** change `<form action="/contact" method="post">` → `<form action={requestBetaAccess}>`; render receipt state on `ok:true` (or redirect-with-state for no-JS).
**Tests:** `tests/vitest/beta-request-intake.test.ts` — happy, honeypot, rate-limit, duplicate (uniform receipt), invalid, oversized.
**Denial/uniformity:** success/duplicate/already-on-allowlist all return uniform client receipt (SEC-CONT-03).
**Security:** server action = direct POST endpoint; self-validates; no auth required (public); no PII beyond email+name+company; IP only as hash.
**Data:** 3 D1 statements; no migration (see `21`).
**Cache:** `no-store`.
**Complexity:** Medium.
**Status:** pending.

---

## Phase 4 — Welcome / invite-acceptance email (owner-gated)

**Objective:** One idempotent welcome email on first workshop entry.
**Requirements:** FR-CONT-09, REL-CONT-01, SEC-CONT-02.
**Prerequisites:** Phase 0; owner enables email delivery.
**Dependencies:** OPEN-CONT-04 (copy + delivery config).

### WP-4.1 — Welcome-email trigger + idempotency
**Task IDs:** T-4.1a (trigger), T-4.1b (idempotency), T-4.1c (template).
**Req IDs:** FR-CONT-09.
**New file (preferred):** `src/lib/auth/welcome-email.ts` — `maybeSendWelcomeEmail({ userId, email, displayName })`.
**Trigger site (pick ONE — recommendation):** `src/lib/auth/account-actions.ts` `completeOnboarding` (after workspace resolve + `onboarding_completed` event) OR first `ensureDefaultWorkspace` success in `src/app/workshop/page.tsx`. Do NOT wire both.
**Idempotency:** `SELECT 1 FROM account_security_events WHERE user_id=? AND event_type='welcome_email_sent' LIMIT 1`; skip if present; INSERT after successful send.
**Template:** inline (consistent with existing inline templates); subject "Welcome to Archestimator"; plain + HTML; **no tokens** — only a plain `/workshop` link; beta-stage honest copy.
**Failure:** `sendCloudflareEmail` error / `EMAIL_NOT_CONFIGURED` / delivery disabled → log + skip (REL-CONT-01); do not block entry.
**Tests:** `tests/vitest/welcome-email.test.ts` — sends once (idempotency: fire twice → one send), skips when delivery disabled, does not block on failure, contains no token.
**Complexity:** Medium.
**Status:** pending; BLOCKED-EXTERNAL on OPEN-CONT-04.

### WP-4.2 — Invite-acceptance email (continuity touch)
**Task IDs:** T-4.2.
**Req IDs:** (continuity of `06` §3 invite handoff).
**Note:** a collaboration-invite *acceptance* notification to the inviter already exists in the sibling invite pack's scope. **This pack does not duplicate it.** Verification only: confirm the invite→auth→workshop handoff copy is coherent (`/invite/[token]` preview, pending-invite interstitial). No new code unless a gap is found during implementation.
**Complexity:** Verification only.
**Status:** pending (verify only).

---

## Phase 5 — First-workflow entry

**Objective:** Clear handoff to the first project/estimate.
**Requirements:** FR-CONT-10, FR-CONT-11, UX-CONT-01.
**Prerequisites:** Phase 0 contract.

### WP-5.1 — Dashboard first-project empty-state CTA
**Task IDs:** T-5.1.
**Req IDs:** FR-CONT-10.
**Target paths:** `src/components/workshop/dashboard/WorkshopDashboard.tsx` or `WorkshopHomebaseClient.tsx` (confirm which owns the empty-state region during implementation — `WorkshopHomebaseClient` per audit).
**Change:** when `projectCount === 0`, render a CTA card "Create your first project" → `/workshop/projects` (or open `NewProjectModal`). Reuse existing button/card primitive from `src/components/ui/`.
**Tests:** `tests/vitest/first-project-empty-state.test.tsx` — present at 0, absent at ≥1; keyboard-reachable.
**Complexity:** Small–Medium.
**Status:** pending.

### WP-5.2 — `/workshop/onboarding` redirect target
**Task IDs:** T-5.2.
**Req IDs:** FR-CONT-11.
**Target path:** `src/app/workshop/onboarding/page.tsx`.
**Change:** replace `redirect("/workshop/settings")` with: fetch project count (reuse `getWorkshopHomebaseData`/repository helper) → empty: `redirect("/workshop/projects")`; non-empty: `redirect("/workshop")`.
**Tests:** `tests/vitest/workshop-onboarding-redirect.test.ts` — both branches.
**Complexity:** Small.
**Status:** pending.

---

## Phase 6 — Tests, performance evaluator, rollout gates

**Objective:** Continuity contract test + perf evaluator + gates.
**Requirements:** TEST-CONT-01, TEST-CONT-02, PERF-CONT, OPS-CONT-01.
**Prerequisites:** Phases 0–5.

### WP-6.1 — Continuity contract test
**Task IDs:** T-6.1.
**Req IDs:** TEST-CONT-01.
**New file:** `tests/vitest/continuity-contract.test.tsx`.
**Scope:** assert the full user-visible path transitions: `/` PrimaryCta → `/contact`/ClosedBetaGate → `requestBetaAccess` receipt → (mock grant) → `/login` → `/workshop` → terms gate → workspace → dashboard CTA. Mock D1/allowlist.
**Complexity:** Medium.
**Status:** pending.

### WP-6.2 — Performance evaluator (Playwright redirect-count + TTFB)
**Task IDs:** T-6.2.
**Req IDs:** PERF-CONT.
**Target:** extend `e2e/landing-audit.spec.ts` (or new `e2e/continuity-transition.spec.ts`) — assert `/workshop` bounce redirect count ≤ existing + `/login` TTFB ≤ budget.
**Complexity:** Medium.
**Status:** pending.

### WP-6.3 — Rollout gate checklist + smoke
**Task IDs:** T-6.3.
**Req IDs:** OPS-CONT-01.
**Output:** document the hosted-smoke steps in `13` (done in this pack); execution is the rollout gate.
**Complexity:** Small (doc); Medium (smoke execution — external).
**Status:** pending (doc done; execution external).

---

## Server/client boundary / streaming / cache / bundle impact summary

- **Server/Client:** no new `"use client"` required except optionally a tiny ClosedBetaGate receipt wrapper (Phase 3) — prefer progressive-enhancement `<form action>` to avoid it. Justify any Client boundary.
- **Streaming/Suspense:** `/login` already wraps `LoginForm` in `<Suspense>`; `/cookies` is static (no Suspense needed). No new waterfalls.
- **Cache/revalidation:** public pages stay `force-static` + `s-maxage`; `requestBetaAccess` `no-store`; dashboard unchanged (`private,no-cache,no-store`).
- **Bundle/RSC/API payload:** negligible (static links + tiny DTO).
- **D1 query count:** +3 per `requestBetaAccess` (indexed); welcome-email idempotency +1 SELECT.
- **Render/client-state:** no new global state; receipt + CTA visibility are transient/derived.

## Cloudflare resource-boundary impact
- All within bound resources (Worker `archestimator-proof`, D1 `ARCH_DB`, Email `EMAIL`). No new bindings. No legacy-provider surface touched.

## Performance measurement + rollback gate
- Per WP-6.2 + `09` §2. Rollback = git revert (frontend) / `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED=false` (email) / mailto fallback (beta-request).

## Validation commands
```bash
bun run type-check
bun run lint
bunx vitest run tests/vitest/landing-cta-continuity.test.tsx tests/vitest/public-trust-link-continuity.test.tsx tests/vitest/beta-request-intake.test.ts tests/vitest/first-project-empty-state.test.tsx tests/vitest/workshop-onboarding-redirect.test.ts tests/vitest/continuity-contract.test.tsx
bunx vitest run tests/vitest/landing-amigo-redesign.test.tsx tests/vitest/landing-company-proof.test.tsx tests/vitest/trust-page-overclaims.test.tsx tests/vitest/public-static-route-contract.test.ts   # regression guards
bunx playwright test e2e/landing-audit.spec.ts   # perf evaluator (or e2e/continuity-transition.spec.ts)
```

## Risks (per-task)
See `14`. Key: OPEN-CONT-01 drift, footer copy/contrast, `requestBetaAccess` abuse, welcome-email double-fire (mitigated by idempotency).

## Documentation updates
- This pack + optional `contact-mailto.ts`/`landing-content.ts` comments (WP-0.1).
- No `AGENTS.md`/`DESIGN.md` changes.
