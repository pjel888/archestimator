# 11 — Implementation Plan

> The authoritative execution guide. Each phase is a **durable-goal contract**. Tasks carry exact repo-relative paths and symbols and the full 16-field template (Unit ID, Req IDs, Goal, User/system outcome, Scope, Non-goals, Files, Patterns to follow, Dependencies/sequencing, Implications, Detailed test scenarios, Verification command, Manual/browser/provider proof, Rollback/recovery, Stop/blocker, Done criteria). `P0` is implementation-ready; `P1`/`P2` are gated on `OPEN-OPS-01`; `P3`/`P4` on `OPEN-ERASE-01`/`OPEN-LEGAL-02`. **The executor must re-read each target file before editing** (concurrent-repo safety).

Phase order: **P0 → P1 → P2 → P3 → P4**. Files off-limits to this implementation: anything outside the compliance surface described in `03` (do not touch retention rules, account-audit hashing, or the worker cron unless a task explicitly says so).

> **Repo convention (verified):** operator/requester mutations are **Server Actions** (`"use server"`, `formData`, `requireCurrentUserContext` + role check + `revalidatePath`/`redirect`), matching `src/lib/auth/beta-allowlist-admin-actions.ts`. The verify surface is a Server Action (P0-T5), **not** a Route Handler POST — this keeps the raw bearer token in the request body, never a URL query param.

---

## Phase P0 — Repository lifecycle, identity verification (incl. verify Server Action), intake hardening, requester lookup

**Durable-goal contract**
- **Goal ID:** `P0-LIFECYCLE`
- **Objective:** Turn the intake-only surface into one with a state machine, identity verification (repository + verify Server Action), abuse protection, and a requester status lookup.
- **Scope:** migration `0037`; repository lifecycle + verify + rate-limit + lookup-token functions; intake route hardening; verify Server Action; requester status lookup route. (Public form copy gated on `OPEN-LEGAL-01`.)
- **Requirements covered:** FR-1, FR-2, IDENT-1, IDENT-2, ABUSE-1, EVID-2, UX-1 (lookup endpoint).
- **Required evidence:** PC-01…PC-05, PC-08, PC-13; local D1 apply + `EXPLAIN`; `type-check` green.
- **Completion audit:** every P0 requirement maps to a green test; no raw token/email in storage or URL (PC-13).
- **Checkpoint artifacts:** `evidence/p0-*.txt` (local D1 apply, EXPLAIN, test output).
- **Stop condition:** all P0 tasks pass their validation; `OPEN-LEGAL-01` gates only the **privacy-notice copy / public-form link** (DOC-1), which is a doc update tracked separately (see "Documentation updates" below) — not a P0 code task.
- **Blocker condition:** D1 binding unavailable; `AUTH_AUDIT_HASH_PEPPER` missing in prod.
- **Review gate:** focused tests + `git diff --check`.
- **QA gate:** denial tests (PC-04, PC-08, PC-13) green.

### P0-T1 — Migration `0037_privacy_request_lifecycle.sql`
- **Unit ID:** P0-T1. **Req IDs:** FR-2, IDENT-1, SLA-1, EVID-1, OPS-2.
- **Goal:** add lifecycle/verification/evidence/SLA columns + two new tables.
- **User/system outcome:** downstream code has columns/tables to write lifecycle, verification, and evidence.
- **Scope:** add `identity_verified`, `sla_due_at`, `evidence_json`, `legal_hold` to `privacy_requests`; create `privacy_request_events`, `privacy_request_verification_tokens`.
- **Non-goals:** no data backfill; no change to 0033 rows or retention rules.
- **Files:** `migrations/0037_privacy_request_lifecycle.sql` (new).
- **Patterns to follow:** `migrations/0033`/`0034` (CHECK enums, JSON-validity, `idx_*` naming, positional binds).
- **Dependencies/sequencing:** first in P0; all later P0 tasks depend on it.
- **Implications — Data/API/security/perf:** additive (safe); new indexes → O(log n) reads; no authz change.
- **Detailed test scenarios:** (a) apply to fresh local D1 → success; (b) re-apply is a no-op error (D1 tracks applied); (c) `EXPLAIN QUERY PLAN` on `SELECT … WHERE request_id=?` uses `idx_priv_req_events_request_created`; (d) `EXPLAIN` on token-hash lookup uses `idx_priv_req_tokens_hash`.
- **Verification command:** local apply via the project's `cf:d1-*` apply path + `EXPLAIN QUERY PLAN`.
- **Manual/browser/provider proof:** remote D1 apply at execution (standing auth), recorded in evidence ledger.
- **Rollback/recovery:** additive → safe to leave; down-migration drops new cols/tables (lifecycle-data loss only).
- **Stop/blocker:** D1 binding unavailable.
- **Done criteria:** local apply log + EXPLAIN output in `evidence/`.
- **Complexity:** Small.

### P0-T2 — Repository lifecycle + verify + lookup-token + rate-limit functions
- **Unit ID:** P0-T2. **Req IDs:** FR-2, IDENT-1, IDENT-2, EVID-1, ABUSE-1, UX-1 (token verify).
- **Goal:** the post-intake data layer.
- **User/system outcome:** transitions, identity verification, lookup-token issue/verify, and intake rate-limiting are available server-side.
- **Scope:** `transitionStatus` (state-machine-guarded, CAS on `status`), `getById`, `createVerificationToken`+`consumeVerificationToken` (single-use, 24h, hash-only), `issueLookupToken`+`consumeLookupToken` (single-use, 24h, request-id-bound), `markVerifiedAtIntake`, `appendNote`, `recordEvent`, `checkPrivacyRequestRateLimit` (mirror `ai/rate-limit.ts`).
- **Non-goals:** no UI; no operator gate here (that is `requirePlatformOperator` in P1-T1).
- **Files:** `src/lib/compliance/privacy-request-repository.ts` (extend).
- **Patterns to follow:** existing `createPrivacyRequest`/`listPrivacyRequests`; `hashAccountSecurityValue` for tokens; `ai/rate-limit.ts` for the sliding window.
- **Dependencies/sequencing:** after P0-T1.
- **Implications:** illegal transition → `ConflictError(409)`; expired token → `410`; reused → `409`; rate limit → `RateLimitError(429)`; raw token never persisted.
- **Detailed test scenarios:** (a) each legal transition sets the right lifecycle col + writes an event; (b) illegal transition → 409, no mutation; (c) terminal rejects; (d) concurrent legal race → second 409/no-op; (e) verify token: hash-only stored, single-use, 24h, request-id-bound, reuse→409, expired→410; (f) lookup token: same lifecycle; (g) raw token absent from every stored column/log fixture.
- **Verification command:** `bun run test:dom -- compliance-privacy-request-repository` + `compliance-privacy-verification` + `compliance-privacy-no-raw-data` + `compliance-privacy-request-rate-limit`.
- **Manual/browser/provider proof:** none (unit).
- **Rollback/recovery:** revert the file; `0037` columns remain (harmless).
- **Stop/blocker:** none.
- **Done criteria:** PC-04, PC-05, PC-06, PC-13 green.
- **Complexity:** Medium-Large.

### P0-T3 — Intake route hardening (rate limit + authenticated fast path + response field)
- **Unit ID:** P0-T3. **Req IDs:** FR-1, IDENT-2, ABUSE-1.
- **Goal:** intake recognizes a session and throttles abuse.
- **User/system outcome:** authenticated requesters are auto-verified; anonymous intake is rate-limited.
- **Scope:** resolve optional session via `getCurrentUserContext`; on session set `requester_user_id`+`identity_verified=1`; call `checkPrivacyRequestRateLimit`; add `identityVerified` to the 201 body.
- **Non-goals:** no Turnstile (deferred ABUSE-2); no confirmation email here (P1-T5).
- **Files:** `src/app/api/compliance/privacy-requests/route.ts` (modify).
- **Patterns to follow:** existing `POST` + `deriveClientIp`; `getCurrentUserContext` from `session.ts`.
- **Dependencies/sequencing:** after P0-T2.
- **Implications:** response gains a field (additive); rate-limit fail-open logged (closed-beta).
- **Detailed test scenarios:** (a) anonymous → 201 `identityVerified=false`; (b) authenticated member → 201 `identityVerified=true` + `requester_user_id`; (c) 6th call/min → 429 + `Retry-After`; (d) opaque 500 on D1 failure.
- **Verification command:** `bun run test:dom -- compliance-privacy-request-route`.
- **Manual/browser/provider proof:** none (route-handler unit).
- **Rollback/recovery:** remove the session branch + rate-limit call.
- **Stop/blocker:** none.
- **Done criteria:** PC-01, PC-02, PC-03 green.
- **Complexity:** Small-Medium.

### P0-T4 — Requester status lookup endpoint
- **Unit ID:** P0-T4. **Req IDs:** UX-1, SEC-2 (enumeration; threat `08` SEC-06).
- **Goal:** requester checks status without an operator.
- **User/system outcome:** requester sees `{status, updatedAt}` for their own request.
- **Scope:** `GET /api/compliance/privacy-requests/[id]/status?token=…`; verify lookup-token hash; **404 uniform** for unknown id / bad / expired / consumed token; `Referrer-Policy: no-referrer`; `no-store`. (Public privacy-page copy that links here is **blocked on `OPEN-LEGAL-01`** — ship the endpoint only.)
- **Non-goals:** no PII in the response; no list of other requests.
- **Files:** new `src/app/api/compliance/privacy-requests/[id]/status/route.ts`.
- **Patterns to follow:** existing `NO_STORE`/`force-dynamic`; `consumeLookupToken` from P0-T2.
- **Dependencies/sequencing:** after P0-T2; parallel with P0-T3 (different file).
- **Implications:** the lookup token is the only URL-borne credential → mitigated by single-use + 24h + no-PII response + `no-referrer` (see `21`).
- **Detailed test scenarios:** (a) valid id+token → 200 `{status, updatedAt}`; (b) unknown id → 404; (c) bad token → 404; (d) expired token → 404; (e) consumed token → 404; (f) response has `Referrer-Policy: no-referrer` + `Cache-Control: no-store`.
- **Verification command:** `bun run test:dom -- compliance-privacy-status-lookup`.
- **Manual/browser/provider proof:** none (route-handler unit); URL-token leakage reasoning is static (see `21`).
- **Rollback/recovery:** delete the route file.
- **Stop/blocker:** none.
- **Done criteria:** PC-08 green.
- **Complexity:** Small.

### P0-T5 — `verifyPrivacyRequest` Server Action (identity verification loop)
- **Unit ID:** P0-T5. **Req IDs:** IDENT-1.
- **Goal:** the verify surface that consumes the emailed token.
- **User/system outcome:** an anonymous requester who clicks the emailed link verifies their identity, enabling `in_triage→in_progress`.
- **Scope:** `"use server"` action `verifyPrivacyRequest(formData)` in a new `src/lib/compliance/privacy-request-actions.ts`; reads `requestId`+`token` from `formData`; calls `consumeVerificationToken`; on success sets `identity_verified=1` and redirects to the status lookup with `?verified=1`; raw token travels in the **formData body, never a URL query param**.
- **Non-goals:** no operator gate (token-bearer); no transition here (that is P1-T3).
- **Files:** new `src/lib/compliance/privacy-request-actions.ts` (`"use server"`); the intake route's `after(...)` (P1-T5) will email a link to this action's route.
- **Patterns to follow:** `src/lib/auth/beta-allowlist-admin-actions.ts` (`"use server"`, `formData`, `redirect`); `consumeVerificationToken` from P0-T2.
- **Dependencies/sequencing:** after P0-T2; the emailed link is produced in P1-T5.
- **Implications:** Server Actions are directly reachable by crafted POST → `consumeVerificationToken` re-validates (hash + single-use + TTL) on every call; 404 uniform for unknown id; 410 expired; 409 reused.
- **Detailed test scenarios:** (a) valid token → `identity_verified=1`, token `consumed_at` set, redirect; (b) reuse → 409; (c) expired → 410; (d) unknown id → 404; (e) raw token never in URL or log fixture.
- **Verification command:** `bun run test:dom -- compliance-privacy-verification`.
- **Manual/browser/provider proof:** none (action unit).
- **Rollback/recovery:** delete the action file; `identity_verified` stays 0 (no false verification).
- **Stop/blocker:** none.
- **Done criteria:** PC-04 green; raw-token-not-in-URL assertion passes.
- **Complexity:** Small-Medium.

---

## Phase P1 — Operator queue, lifecycle actions, confirmation/status email (CONDITIONALLY READY — gated on `OPEN-OPS-01`)

**Durable-goal contract**
- **Goal ID:** `P1-OPS`
- **Objective:** Ship the operator queue UI + the actions that drive the lifecycle + confirmation/status emails.
- **Scope:** operator gate; GET list/detail routes; transition + note Server Actions (verify is in P0-T5); queue + detail UI; confirmation + status email templates.
- **Requirements covered:** FR-3, OPS-1, OPS-2, EMAIL-1, EMAIL-2, EVID-1, A11Y-1, ARCH-1, SEC-1.
- **Required evidence:** PC-06, PC-07, PC-14, PC-15, PC-16, PC-18; Cloudflare Email deliverability proof.
- **Completion audit:** operator can triage a seeded request end-to-end; non-operator denied everywhere; confirmation email sent (proof).
- **Stop condition:** P1 tests green + email proof recorded.
- **Blocker condition:** **`OPEN-OPS-01` (operator role) unresolved → this phase is `CONDITIONALLY READY`, not implementation-ready.** `OPEN-LEGAL-01` (email copy) unresolved → ship with generic copy + ledger note.
- **Review gate:** focused tests + DOM tests.
- **QA gate:** denial test suite (PC-07) green.

### P1-T1 — Operator gate helper
- **Unit ID:** P1-T1. **Req IDs:** OPS-1, SEC-1.
- **Goal:** `requirePlatformOperator()` mirroring `beta-allowlist-admin.ts` (`requireCurrentUserContext` + `isPlatformAdminRole`).
- **Target path:** `src/lib/compliance/privacy-request-admin.ts` (new).
- **Tests/val:** PC-07.
- **Complexity:** Small.

### P1-T2 — GET list + detail routes
- **Req IDs:** FR-3, OPS-1.
- **Objective:** `GET /api/compliance/privacy-requests` + `[id]` (operator-gated, redacted, no-store).
- **Target path:** extend `route.ts` with `GET`; new `[id]/route.ts`.
- **Tests/val:** PC-07, PC-15.
- **Complexity:** Small-Medium.

### P1-T3 — Transition + note Server Actions
- **Unit ID:** P1-T3. **Req IDs:** FR-2, OPS-2, EVID-1.
- **Goal:** operator mutations for lifecycle + notes. (Verify moved to P0-T5.)
- **User/system outcome:** operator advances a request through the state machine; every move is audited.
- **Scope:** `transitionPrivacyRequest(formData)` + `appendPrivacyRequestNote(formData)` in `src/lib/compliance/privacy-request-actions.ts`; both `requirePlatformOperator()` + state-machine guard; `revalidatePath` operator paths.
- **Non-goals:** no verify (P0-T5); no fulfillment (P2/P3).
- **Files:** extend `src/lib/compliance/privacy-request-actions.ts` (started in P0-T5).
- **Patterns to follow:** `beta-allowlist-admin-actions.ts` (`"use server"`, `formData`, `revalidatePath`, `redirect`).
- **Dependencies/sequencing:** after P1-T1 (gate) + P1-T2 (routes feed the UI).
- **Implications:** Server Action direct-POST → `requirePlatformOperator()` re-runs every call; 409 illegal/unverified.
- **Detailed test scenarios:** (a) legal transition → row updated + event row; (b) illegal → 409; (c) unverified → `in_progress` blocked 409; (d) note appended (append-only); (e) non-operator → 403.
- **Verification command:** `bun run test:dom -- compliance-privacy-request-repository` (transition repo) + operator-gate test (denial).
- **Manual/browser/provider proof:** none (action unit).
- **Rollback/recovery:** delete the actions; transitions revert to no-op.
- **Stop/blocker:** `OPEN-OPS-01`.
- **Done criteria:** PC-05, PC-06, PC-07, PC-16 green.
- **Complexity:** Medium.

### P1-T4 — Queue + detail UI (Server Components + small client island)
- **Req IDs:** FR-3, A11Y-1, ARCH-1.
- **Objective:** `src/app/workshop/settings/privacy-requests/page.tsx` + `[id]/page.tsx`; reuse `src/components/ui/`; keyboard operable; live-region status.
- **Tests/val:** DOM tests (a11y assertions); browser proof for dialog focus + responsive collapse (`05` §11).
- **Complexity:** Medium.

### P1-T5 — Confirmation + status email
- **Req IDs:** EMAIL-1, EMAIL-2.
- **Objective:** in the intake `after(...)` hook, call `sendEmail` with generic copy (gated on `OPEN-LEGAL-01` for final wording); on `completed`/`rejected` send status email if opt-in.
- **Target path:** `route.ts` (after hook); new inline template builder (no new template dir; match existing pattern).
- **Tests/val:** PC-14 (email invoked; circuit-breaker degrade).
- **Complexity:** Small-Medium.

---

## Phase P2 — Export fulfillment + evidence package

**Durable-goal contract**
- **Goal ID:** `P2-EXPORT`
- **Objective:** Non-destructive fulfillment for access/portability requests.
- **Requirements covered:** FR-4, EVID-1.
- **Required evidence:** PC-09, PC-10; R2 write proof.
- **Stop condition:** export generates package + evidence; cross-user leak test green.
- **Blocker condition:** R2 binding unavailable.

### P2-T1 — Export action + repository function
- **Req IDs:** FR-4, EVID-1.
- **Objective:** gather requester's data (scoped by `requester_user_id`); write JSON to R2 `privacy-exports/<requestId>/<uuid>.json`; record evidence pointer (`evidence_json`: r2 key, sha256, generated_at, generated_by).
- **Target path:** new action module + repository `recordExportEvidence`.
- **Tests/val:** PC-09 (export) + PC-10 (no cross-user leak; assert scope).
- **Complexity:** Medium.

---

## Phase P3 — Erasure/anonymization fulfillment (GATED on OPEN-ERASE-01)

**Durable-goal contract**
- **Goal ID:** `P3-ERASE`
- **Objective:** Two-step destructive fulfillment for erasure requests.
- **Requirements covered:** FR-5, EVID-1, SEC-08.
- **Required evidence:** PC-11, PC-12; dry-run/confirm denial tests; backup snapshot timestamp.
- **Stop condition:** dry-run + confirm work on seeded data; scope assertion green; `data_retention_events` written.
- **Blocker condition:** **`OPEN-ERASE-01` unresolved** → this phase is `NOT READY`.

### P3-T1 — Erasure scope module (BLOCKED on OPEN-ERASE-01)
- **Req IDs:** FR-5, SEC-08.
- **Objective:** a counsel-approved scope list (tables/columns/conditions) consumed by dry-run + confirm; `legal_hold` flag respected.
- **Status:** `BLOCKED-EXTERNAL` until owner/legal approve the scope.
- **Options:** (a) ship a minimal scope (user profile + owned estimates) as owner-delegated default; (b) wait for full counsel list. **Recommendation:** (a) with explicit ledger note + `OPEN-ERASE-01` acceptance.
- **Complexity:** Large.

### P3-T2 — Dry-run + confirm actions
- **Req IDs:** FR-5, EVID-1.
- **Objective:** dry-run returns per-table counts + single-use `dryRunToken`; confirm consumes token (re-auth), deletes/anonymizes per scope, writes `data_retention_events` + evidence.
- **Target path:** new action module; reuse retention-core delete discipline.
- **Tests/val:** PC-11 (dry-run), PC-12 (confirm + scope assertion).
- **Complexity:** Large.

---

## Phase P4 — SLA breach detection + escalation (GATED on OPEN-LEGAL-02)

**Durable-goal contract**
- **Goal ID:** `P4-SLA`
- **Objective:** Detect SLA breaches and notify the escalation owner.
- **Requirements covered:** SLA-1 (compute), SLA-2.
- **Required evidence:** PC-17; alert + runbook named.
- **Stop condition:** breach flagged + notification audit row.
- **Blocker condition:** **`OPEN-LEGAL-02` unresolved** → `NOT READY`.

### P4-T1 — SLA compute on triage
- **Req IDs:** SLA-1.
- **Objective:** set `sla_due_at` on `submitted→in_triage` using the owner-confirmed target (default 30d).
- **Target path:** repository `transitionStatus`.
- **Complexity:** Small. (Can ship with P0-T2 if the default target is accepted as owner-delegated.)

### P4-T2 — Breach detection + escalation (BLOCKED on OPEN-LEGAL-02)
- **Req IDs:** SLA-2.
- **Objective:** daily check flags `breached`; notification to escalation owner; alert threshold + runbook named.
- **Status:** `BLOCKED-EXTERNAL`.
- **Complexity:** Medium.

---

## Parallelization classification

| Task | Classification |
|---|---|
| P0-T1 | sequential (foundation) |
| P0-T2 | sequential after T1 |
| P0-T3 | sequential after T2 |
| P0-T4 | parallel with T3 |
| P1-T1..T3 | sequential (gate → routes → actions) |
| P1-T4 | parallel with T1-T3 (UI can build against the route contract) |
| P1-T5 | parallel with T3-T4 (email is independent) |
| P2-T1 | sequential after P1 |
| P3-T1/T2 | sequential; gated |
| P4-T1 | can fold into P0-T2 |
| P4-T2 | gated |

## Updated dependency graph

See `10` mermaid graph.

## Risks / rollback per phase

- P0: migration additive → safe; rollback drops new cols (lifecycle data loss acceptable).
- P1: actions are reversible (status can be re-transitioned via a new legal transition if needed; but terminal states are terminal by design — mitigate with a `reopened` event only if owner asks).
- P2: export is non-destructive; R2 object lifecycle follows retention.
- P3: destructive → backup snapshot + dry-run token + re-auth + fix-forward via retention cron.
- P4: read-only breach flag; safe.

## Documentation updates

- `src/app/privacy/page.tsx` (gated `OPEN-LEGAL-01`).
- `.ai/10_state/current-state.md` (closeout).
