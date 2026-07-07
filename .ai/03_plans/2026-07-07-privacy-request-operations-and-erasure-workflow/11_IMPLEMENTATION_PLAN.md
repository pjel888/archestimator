# 11 — Implementation Plan

> The authoritative execution guide. Each phase is a **durable-goal contract**. Tasks carry exact repo-relative paths and symbols. `P0`–`P2` are implementation-ready; `P3`/`P4` are gated on owner decisions. **The executor must re-read each target file before editing** (concurrent-repo safety).

Phase order: **P0 → P1 → P2 → P3 → P4**. Files off-limits to this implementation: anything outside the compliance surface described in `03` (do not touch retention rules, account-audit hashing, or the worker cron unless a task explicitly says so).

---

## Phase P0 — Repository lifecycle, identity verification, intake hardening

**Durable-goal contract**
- **Goal ID:** `P0-LIFECYCLE`
- **Objective:** Turn the intake-only surface into one with a state machine, identity verification, and abuse protection.
- **Scope:** migration `0037`; repository lifecycle + verify + rate-limit functions; intake route hardening; requester status lookup; (public form copy gated on `OPEN-LEGAL-01`).
- **Requirements covered:** FR-1, FR-2, IDENT-1, IDENT-2, ABUSE-1, EVID-2, UX-1 (lookup endpoint).
- **Required evidence:** PC-01…PC-05, PC-13; local D1 apply + `EXPLAIN`; `type-check` green.
- **Completion audit:** every P0 requirement maps to a green test; no raw token/email in storage (PC-13).
- **Checkpoint artifacts:** `evidence/p0-*.txt` (local D1 apply, EXPLAIN, test output).
- **Stop condition:** all P0 tasks pass their validation; `OPEN-LEGAL-01` isolated to P0-T4 copy only.
- **Blocker condition:** D1 binding unavailable; pepper missing in prod.
- **Review gate:** focused tests + `git diff --check`.
- **QA gate:** denial tests (PC-04, PC-13) green.

### P0-T1 — Migration `0037_privacy_request_lifecycle.sql`
- **Req IDs:** FR-2, IDENT-1, SLA-1, EVID-1, OPS-2.
- **Objective:** add `identity_verified`, `sla_due_at`, `evidence_json`, `legal_hold` to `privacy_requests`; create `privacy_request_events` and `privacy_request_verification_tokens` tables.
- **Why:** the schema lacks lifecycle/verification/evidence/SLA columns.
- **Target path:** `migrations/0037_privacy_request_lifecycle.sql` (new).
- **Steps:** author per the blueprint in `07`; additive only; include CHECK + indexes.
- **Expected output:** migration applies cleanly to local D1.
- **Failure cases:** CHECK constraint rejects bad JSON; index create fails (fix forward).
- **Tests/val:** apply via `cf:d1-*` local; `EXPLAIN QUERY PLAN` on new SELECTs.
- **Completion evidence:** local apply log + EXPLAIN output.
- **Parallelization:** sequential (all later P0 tasks depend on it).
- **Complexity:** Small.

### P0-T2 — Repository lifecycle + verify + rate-limit functions
- **Req IDs:** FR-2, IDENT-1, IDENT-2, EVID-1, ABUSE-1.
- **Objective:** add `transitionStatus`, `getById`, `createVerificationToken`+`consumeVerificationToken`, `markVerifiedAtIntake` (authenticated fast path), `appendNote`, `recordEvent`, and a `checkPrivacyRequestRateLimit` helper mirroring `ai/rate-limit.ts`.
- **Why:** the repository has only create/list today.
- **Target path:** `src/lib/compliance/privacy-request-repository.ts` (extend).
- **Steps:** implement guards per the state machine in `04`; store only token hash; rate-limit key = SHA-256(ip (+ email-hash)).
- **Expected output:** exported functions; types updated; `"server-only"` preserved.
- **Failure cases:** illegal transition → `ConflictError`; expired/reused token → `410`/`409`; rate limit → `RateLimitError(429)`.
- **Tests/val:** extend `tests/vitest/compliance-privacy-request-repository.test.ts` (PC-04, PC-05, PC-06, PC-13).
- **Completion evidence:** tests green.
- **Parallelization:** sequential after P0-T1.
- **Complexity:** Medium-Large.

### P0-T3 — Intake route hardening (rate limit + authenticated fast path + response field)
- **Req IDs:** FR-1, IDENT-2, ABUSE-1.
- **Objective:** resolve optional session (`getCurrentUserContext`); set `requester_user_id` + `identity_verified=true` when present; call rate limit; add `identityVerified` to the 201 response.
- **Target path:** `src/app/api/compliance/privacy-requests/route.ts` (modify).
- **Steps:** import session + rate-limit helper; branch on session; keep anonymous path; preserve opaque errors.
- **Tests/val:** route-handler tests (PC-01, PC-02, PC-03).
- **Completion evidence:** tests green; intake still returns 201 fast.
- **Parallelization:** sequential after P0-T2.
- **Complexity:** Small-Medium.

### P0-T4 — Requester status lookup endpoint + (gated) public form copy
- **Req IDs:** UX-1, DOC-1 (gated).
- **Objective:** `GET /api/compliance/privacy-requests/[id]/status?token=...` (token-bearer; 404 unknown; 403 bad token). Public-form/privacy-page copy is **blocked on `OPEN-LEGAL-01`** — ship the lookup only.
- **Target path:** new `src/app/api/compliance/privacy-requests/[id]/status/route.ts`.
- **Tests/val:** PC-08.
- **Completion evidence:** lookup tests green; copy deferred (ledger note).
- **Parallelization:** parallel with P0-T3 (different file).
- **Complexity:** Small.

---

## Phase P1 — Operator queue, lifecycle actions, confirmation/status email

**Durable-goal contract**
- **Goal ID:** `P1-OPS`
- **Objective:** Ship the operator queue UI + the actions that drive the lifecycle + confirmation/status emails.
- **Scope:** operator gate; GET list/detail routes; transition + verify + note Server Actions; queue + detail UI; confirmation + status email templates.
- **Requirements covered:** FR-3, OPS-1, OPS-2, EMAIL-1, EMAIL-2, EVID-1, A11Y-1, ARCH-1, SEC-1.
- **Required evidence:** PC-06, PC-07, PC-14, PC-15, PC-16; Cloudflare Email deliverability proof.
- **Completion audit:** operator can triage a seeded request end-to-end; non-operator denied everywhere; confirmation email sent (proof).
- **Stop condition:** P1 tests green + email proof recorded.
- **Blocker condition:** `OPEN-OPS-01` (gate role) unresolved; `OPEN-LEGAL-01` (email copy) unresolved → ship with generic copy + ledger note.
- **Review gate:** focused tests + DOM tests.
- **QA gate:** denial test suite (PC-07) green.

### P1-T1 — Operator gate helper
- **Req IDs:** OPS-1, SEC-1.
- **Objective:** `requirePlatformOperator()` mirroring `beta-allowlist-admin.ts` (`requireCurrentUserContext` + `isPlatformAdminRole`).
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
- **Req IDs:** FR-2, OPS-2, EVID-1.
- **Objective:** actions call `transitionStatus`/`appendNote`; write `privacy_request_events`.
- **Target path:** new `src/app/api/compliance/privacy-requests/[id]/actions.ts` (or server-action module co-located).
- **Tests/val:** PC-06, PC-16.
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
