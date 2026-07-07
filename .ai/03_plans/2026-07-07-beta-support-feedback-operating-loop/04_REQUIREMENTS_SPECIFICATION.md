# 04 — Requirements Specification

Stable IDs are used throughout the pack (`FR-*`, `UX-*`, `A11Y-*`, `ARCH-*`, `DATA-*`, `SEC-*`, `REL-*`, `OPS-*`, `TEST-*`, `DOC-*`). Priority: P0 (beta blocker), P1 (beta), P2 (post-beta polish), P3 (deferred/coupled). Source strength: `brief`, `repo evidence`, `derived`, `official docs`, `provider proof`, `owner-delegated`.

## FR — Functional requirements

### FR-ACK-01 — Honest reporter acknowledgement (P0)
- **Statement**: On successful submission, the reporter sees an acknowledgement that (a) confirms the feedback was received, (b) states the status-expectation promise tied to severity, and (c) does not imply guaranteed resolution.
- **Rationale**: Brief ("acknowledgement UX", "status expectations"); persona `SUPPORT-002`; honesty requirement in `decisions.md:871`.
- **Source**: `brief`, `repo evidence` (`page.tsx` `<output>` boxes).
- **Priority**: P0.
- **Dependencies**: none (works on existing redirect/inline success path).
- **Acceptance criteria**:
  - AC1: After a successful submit, an acknowledgement region is rendered/announced with the promise text.
  - AC2: The text differs by severity (blocker/high vs. medium/low) or is a single honest statement that covers the slowest case.
  - AC3: No copy promises a guaranteed fix or a specific clock-time resolution.
- **Validation**: DOM test asserting the acknowledgement text renders on `?saved=1`; inline `useActionState` success → output text assertion.
- **Affected code**: `src/app/workshop/feedback/page.tsx`, `src/components/workshop/BetaFeedbackForm.tsx`, copy module (e.g. extend `beta-feedback.ts` constants).
- **Risks**: over-promising in copy; copy drift between the two modes.
- **Status**: ready.

### FR-ACK-02 — Input preservation on D1 write failure (P0)
- **Statement**: If the D1 write fails, the reporter is offered a mailto/email fallback that **carries their typed message, type, and severity** (not a bare static mailto link).
- **Rationale**: `buildBetaFeedbackMailto` is dead code today; the redirect-mode fallback drops the payload (`03` audit §B). Persona `SUPPORT-002`.
- **Source**: `repo evidence`, `derived`.
- **Priority**: P0.
- **Dependencies**: FR-ACK-01.
- **Acceptance criteria**:
  - AC1: The fallback mailto subject/body includes the user's `message`, `feedbackType`, `severity` (via `buildBetaFeedbackMailto` or redirect-passed payload).
  - AC2: Inline mode fallback message offers the email path and preserves payload in the draft.
- **Validation**: unit test on `buildBetaFeedbackMailto` output; action test asserting fallback path constructs a payload-bearing mailto.
- **Affected code**: `src/lib/workshop/beta-feedback-actions.ts` (wire `buildBetaFeedbackMailto` into `feedbackRedirect` fallback), `src/lib/workshop/beta-feedback.ts`.
- **Status**: ready.

### FR-NOTIFY-01 — Operator notification on new blocker/high feedback (P0)
- **Statement**: When a new `blocker` or `high` severity submission is saved, an operator notification is attempted (email and/or webhook) within the same request lifecycle, with the send result logged.
- **Rationale**: Brief ("support alert integration"); today the operator must visit the queue manually.
- **Source**: `brief`, `repo evidence` (`sendEmail`, `sendUploadOperationalAlert` exist).
- **Priority**: P0.
- **Dependencies**: email env configured (`OPEN-MON-01` for proof).
- **Acceptance criteria**:
  - AC1: A new blocker/high submission triggers a `sendEmail` to the operator address (configurable).
  - AC2: The send result (`ok`/`code`) is logged via `emitLogRecord` with `event:"feedback_operator_notified"`.
  - AC3: A failed/disabled send does **not** fail the user's submission (graceful degradation; `code:"EMAIL_NOT_CONFIGURED"`/`CIRCUIT_OPEN` are non-fatal).
  - AC4: Idempotency — re-saving the same submission (retry) does not double-notify beyond a bounded dedupe window.
- **Validation**: action unit test asserting `sendEmail` is called for blocker/high and not for medium/low; mocked-send returns `ok:false` and the submission still succeeds.
- **Affected code**: `src/lib/workshop/beta-feedback-actions.ts` (`saveBetaFeedback`), new `src/lib/workshop/beta-feedback-notify.ts`.
- **Status**: ready (env proof is `OPEN-MON-01`).

### FR-SLA-01 — Triage SLA definition & tracking (P1)
- **Statement**: Each submission carries SLA tracking timestamps (`first_response_at`, `responded_at`, `alerted_at`) and a defined business-day SLA (first-response ≤1 business day for blocker/high; ≤3 business days for medium/low; resolution target ≤5 business days).
- **Rationale**: Persona open question `OPEN-SLA-01`; brief ("triage SLA").
- **Source**: `owner-delegated planning decision` (SLA values), `repo evidence` (additive columns).
- **Priority**: P1.
- **Dependencies**: migration `0039` (additive columns); `OPEN-OPS-01`.
- **Acceptance criteria**:
  - AC1: `first_response_at` is set when the submission first leaves `new` (status → `reviewing`/`resolved`).
  - AC2: `responded_at` is set when status reaches `resolved`.
  - AC3: SLA thresholds are derived from a single config source (constants, not magic numbers in queries).
  - AC4: SLA math uses business days (Mon–Fri), UTC-anchored timestamps, with a documented weekend/holiday handling rule.
- **Validation**: unit tests for the SLA-clock computation function over fixed timestamps (incl. weekends).
- **Affected code**: migration `0039`, `src/lib/workshop/beta-feedback-sla.ts` (new), `beta-feedback-d1-store.ts`, `beta-feedback-review-actions.ts`.
- **Status**: ready (SLA values are owner-delegated; recommended defaults recorded).

### FR-SLA-02 — Daily SLA breach sweep + alert (P1)
- **Statement**: A daily cron sweep computes SLA status for every non-archived submission, flags breaches, and fires `sendFeedbackAlert` + `emitLogRecord` on breach (once per submission via `alerted_at` idempotency).
- **Rationale**: Brief ("triage SLA", "support alert integration"); prevents silent SLA misses.
- **Source**: `derived`, `repo evidence` (cron + alert template).
- **Priority**: P1.
- **Dependencies**: FR-SLA-01; `worker.ts` cron branch; `sendFeedbackAlert`.
- **Acceptance criteria**:
  - AC1: The sweep runs on a cron and processes all non-archived rows.
  - AC2: A breached row (first-response or resolution overdue) sets `alerted_at` and fires one alert + one log.
  - AC3: Re-running the sweep the next day does not re-alert the same already-`alerted_at` row unless re-breached on a different clock.
  - AC4: Sweep duration stays well under the cron budget at 10x/100x beta volume (see `09`).
- **Validation**: unit test on the sweep function with fixed-time fixtures; cron-handler test; alert idempotency test.
- **Affected code**: new `src/lib/workshop/beta-feedback-sla-sweep.ts`, `worker.ts scheduled()` (new cron branch), `sendFeedbackAlert` (clone of `sendUploadOperationalAlert`).
- **Status**: ready.

### FR-FOLLOWUP-01 — Reporter follow-up email on resolve (P2)
- **Statement**: When a submission moves to `resolved`, the reporter receives a follow-up email (send result logged; gracefully degraded if email not configured or reporter email is invalid).
- **Rationale**: Brief ("followed up"); closes the loop back to the user.
- **Source**: `brief`, `repo evidence`.
- **Priority**: P2.
- **Dependencies**: `sendEmail`; `responded_at`.
- **Acceptance criteria**:
  - AC1: Status → `resolved` triggers a `sendEmail` to the reporter's `user_email`.
  - AC2: Send result logged via `emitLogRecord` `event:"feedback_reporter_followup"`.
  - AC3: A failed send does not block the status update (graceful).
  - AC4: A re-resolve (status already resolved, re-saved) does not double-send within an idempotency window.
- **Validation**: action unit test asserting `sendEmail` called on resolve; mocked-fail path keeps the update.
- **Affected code**: `beta-feedback-review-actions.ts`, `beta-feedback-notify.ts`.
- **Status**: ready.

### FR-QUEUE-01 — Paginated review queue (P1)
- **Statement**: The operator review queue paginates beyond the current hard `LIMIT 50` and never silently drops older feedback.
- **Rationale**: Persona `SUPPORT-001` gap ("avoid losing feedback beyond latest 50").
- **Source**: `repo evidence` (`readBetaFeedbackReviewQueueFromD1` hard `LIMIT 50`).
- **Priority**: P1.
- **Dependencies**: none.
- **Acceptance criteria**:
  - AC1: Queue accepts a page/cursor param and returns the next page.
  - AC2: UI shows a "Next page"/"Load more" control when more rows exist.
  - AC3: No page returns more than the page-size cap; total is bounded by a sane maximum (e.g. 1000) for beta.
  - AC4: Status filter still applies across pages.
- **Validation**: store test returning >50 rows paginated; DOM test for the pagination control.
- **Affected code**: `beta-feedback-d1-store.ts` (`readBetaFeedbackReviewQueueFromD1`), `beta-feedback-review.ts`, `src/app/workshop/settings/feedback/page.tsx`.
- **Status**: ready.

## UX / A11Y requirements

### UX-A11Y-01 — Proper label association for Type/Severity (P1)
- **Statement**: `feedbackType` and `severity` controls use a real `<label htmlFor>` (or equivalent accessible-name association), not a bare `aria-label` on `DropdownSelect`.
- **Rationale**: `03` audit §A found weak label pairing.
- **Source**: `repo evidence`.
- **Priority**: P1.
- **Acceptance**: axe/DOM assertion that each control has an associated `<label>` or `aria-labelledby`.
- **Affected code**: `BetaFeedbackForm.tsx`, `src/components/ui/dropdown-select.tsx` (if it lacks label support).

### UX-A11Y-02 — Acknowledgement live region + focus management (P1)
- **Statement**: The inline success/error/fallback `<output>` region is announced (role/live region) and focus moves to it after inline submit.
- **Rationale**: `03` audit §A — no `aria-live`, no focus return.
- **Source**: `repo evidence`, `official docs` (WAI-ARIA).
- **Priority**: P1.
- **Acceptance**: DOM test asserting `aria-live`/`role` and that focus is moved programmatically on state change.
- **Affected code**: `BetaFeedbackForm.tsx`.

### UX-QUEUE-01 — SLA badge + breach flag in queue (P1)
- **Statement**: The review queue shows an SLA status badge per row (on-track / due-soon / breached) and a breach flag/filter.
- **Rationale**: makes the SLA loop operator-visible.
- **Source**: `derived`.
- **Priority**: P1.
- **Acceptance**: queue renders a badge computed from timestamps + SLA config; breach filter returns only breached rows.
- **Affected code**: `settings/feedback/page.tsx`, `beta-feedback-sla.ts`.

## ARCH requirements

### ARCH-01 — No new tables; additive columns only (P0)
- **Statement**: SLA tracking uses additive nullable columns on `beta_feedback_submissions`; no new tickets/threads/SLA-violations tables.
- **Rationale**: Brief ("do not overbuild a CRM").
- **Source**: `brief`, `derived`.
- **Priority**: P0 (governs data design).
- **Acceptance**: migration `0039` is additive-only; rollback is `DROP COLUMN`.

### ARCH-02 — Reuse existing email + alert clients (P0)
- **Statement**: Operator notification and reporter follow-up use `sendEmail`; breach alerting clones `sendUploadOperationalAlert` as `sendFeedbackAlert` (same env-triplet contract).
- **Rationale**: avoid duplicate plumbing.
- **Source**: `repo evidence`.
- **Priority**: P0.
- **Acceptance**: no new email/alert client modules beyond the thin feedback-specific wrappers.

### ARCH-03 — Daily cron sweep, not a queue job (P1)
- **Statement**: The SLA sweep is a cron branch in `worker.ts scheduled()`, not a `UPLOAD_JOBS_QUEUE` job (event frequency is low at beta scale).
- **Rationale**: simpler, matches the retention-pass precedent; avoids widening the queue `jobName` union.
- **Source**: `derived`, `repo evidence`.
- **Priority**: P1.
- **Acceptance**: sweep runs under `scheduled()`; no queue producer for feedback.

## DATA requirements

### DATA-01 — Migration 0039 additive columns (P1)
- **Statement**: Add `first_response_at`, `responded_at`, `alerted_at` (nullable TEXT ISO-UTC) to `beta_feedback_submissions`.
- **Acceptance**: migration applies cleanly; rollback drops columns; existing rows → null.
- **Affected**: `migrations/0039_beta_feedback_sla_columns.sql`.
- See `21_DATABASE_CHANGE_BLUEPRINTS.md`.

### DATA-02 — Retention TTL entry (P3, coupled)
- **Statement**: Add `beta_feedback_submissions` to the retention registry: TTL 365 days, **purge only `archived` rows**, action = hard delete (or R2 archive), rationale = consent + legitimate-interest support data.
- **Acceptance**: retention sweep purges archived rows older than TTL; non-archived rows are never purged; DSAR/erasure reaches feedback rows.
- **Affected**: retention registry (`retention-core.ts` or equivalent), `runRetentionPassInD1` rule.
- **Status**: `CONDITIONALLY READY` (couples to `OPEN-DEC-004` retention-schedule ratification).

## SEC requirements

### SEC-AUTHZ-01 — Operator actions gated by `isPlatformAdminRole` (P0)
- **Statement**: All operator actions (status update, follow-up trigger, breach ack) enforce `isPlatformAdminRole(context.role)` server-side.
- **Acceptance**: denial test — non-admin role cannot trigger any operator action (extend `beta-admin-action-boundaries.test.ts`).
- **Affected**: `beta-feedback-review-actions.ts`, new operator actions.

### SEC-DATA-01 — PII redaction in logs (P0)
- **Statement**: Feedback `message` (potential PII) is redacted before logging; only length/type/severity/status/user_id/page_path are logged in cleartext.
- **Acceptance**: log assertions show `message` is `tainted_fields`/redacted.
- **Affected**: logging call sites in notify/sla/notify modules; `redact.ts` usage.

### SEC-DATA-02 — Fallback does not leak payload to client logs (P0)
- **Statement**: The mailto fallback URL is built server-side; the client receives only the link, and the link is not logged with full message beyond what mailto requires.
- **Acceptance**: no server log writes the raw message in cleartext.

## REL / OPS requirements

### REL-01 — Email/alert failures are non-fatal (P0)
- **Statement**: A failed operator-notify or follow-up send never fails the user's submission or the operator's status update.
- **Acceptance**: graceful-degradation tests.
- **Affected**: notify module wraps sends in try/catch + logs.

### OPS-01 — Readiness check for the loop (P4, coupled)
- **Statement**: A readiness check proves (a) operator email env is configured, (b) alert webhook is reachable (or explicitly operator-email-only), (c) the queue is live (a probe submission is readable), (d) the SLA sweep cron is registered.
- **Acceptance**: check exits 0 only when all four hold (or when explicitly operator-attested with a flag).
- **Affected**: new `scripts/check-beta-feedback-loop-readiness.ts`.
- **Status**: `CONDITIONALLY READY` (hosted inbox monitoring proof is `OPEN-MON-01`, external).

### OPS-02 — Structured logging for every loop event (P1)
- **Statement**: Events emitted: `feedback_received`, `feedback_operator_notified`, `feedback_sla_breached`, `feedback_sla_swept`, `feedback_reporter_followup`, `feedback_retention_purged`.
- **Acceptance**: each event has a stable `event` name and redaction-safe context.

## TEST requirements

### TEST-01 — Shadow-path coverage for submission (P0)
See shadow matrices below. Cover happy, nil/empty message, too-short/long message, invalid type/severity, invalid project UUID, auth-denied, D1-failure→fallback, duplicate-submit.
### TEST-02 — SLA computation + sweep tests (P1)
### TEST-03 — Operator action denial matrix (P0)
### TEST-04 — Email/alert graceful-degradation tests (P0)

## DOC requirements

### DOC-01 — Status-expectation copy is documented (P0)
### DOC-02 — SLA values + business-day rule documented in this pack + an operator runbook note (P1)

---

## Shadow Path Matrices

### Matrix 1 — Feedback submission flow (`submitBetaFeedback` / `submitBetaFeedbackInline`)

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Submit | saved → acknowledgement + status-expectation | `message` absent → blocked by HTML `required` + server `message_too_short` | empty trim → `message_too_short` | bad type/severity/UUID → `?error=<code>` | no session → `requireAuth` redirects `/login` | D1 write fails → `?fallback=1` + payload-bearing mailto (FR-ACK-02) | two rapid submits → DB unique not enforced (no natural key); acceptable at beta, log both | browser refresh re-submit → duplicate row possible; mitigate via client `pending` disable + post-redirect-get | acknowledgement / fallback / login redirect | TEST-01 |
| Notify operator (new blocker/high) | sendEmail ok → log `ok` | n/a (severity-driven) | n/a | n/a | n/a (server-side, post-auth) | sendEmail `ok:false` (EMAIL_NOT_CONFIGURED/CIRCUIT_OPEN) → log + continue; user unaffected | two near-simultaneous saves → possible double-send within window; dedupe by `alerted_at`-style marker is for SLA, not new-notify — accept ≤2 at beta | retry of save → bounded double-notify; acceptable | none to user | TEST-04 |

### Matrix 2 — Operator status update (`updateBetaFeedbackReviewStatus`)

| Flow | Happy | Nil/missing | Empty | Invalid | Auth denied | Upstream error | Concurrency | Retry/idempotency | User-visible | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Update status | status changed → `first_response_at`/`responded_at` set → follow-up email on resolve | missing id/status → `parseBetaFeedbackStatusUpdate` `{ok:false}` | n/a | bad status enum → `{ok:false}` | non-admin → `authorized:false` → notice "Only platform admins…" | DB update 0 rows → store throws → `?error=save` | two admins update same row → last-write-wins on `status`; timestamps set once (guard) | re-save same status → `UNIQUE(feedback_id,status) DO NOTHING` on event; follow-up email guarded by `responded_at` null-check | notice saved / error / forbidden | TEST-03 |

### Matrix 3 — SLA breach sweep (cron)

| Flow | Happy | Nil/missing | Empty | Invalid | Auth denied | Upstream error | Concurrency | Retry/idempotency | User-visible | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Sweep | computes SLA for non-archived rows; alerts + logs breached; sets `alerted_at` | no rows → no-op summary | n/a | row with null `created_at` → skip + log warn | n/a (cron secret-bearer route) | D1 read fails → catch + log + exit non-zero (cron logs it) | two sweep runs same day → `alerted_at` guard prevents re-alert | next-day re-run → only newly-breached alert | none (operator sees alert + queue flag) | TEST-02 |

### Matrix 4 — Retention purge (cron, P3)

| Flow | Happy | Nil/missing | Empty | Invalid | Auth denied | Upstream error | Concurrency | Retry/idempotency | User-visible | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Purge | deletes `archived` rows older than TTL | no rows → no-op | n/a | non-archived row past TTL → **not purged** (guarded) | n/a (cron secret-bearer) | D1 delete fails → catch + log + retry next day | two runs → idempotent (deleted rows gone) | re-run → no-op | none | TEST (P3) |

All applicable shadow-path cells are answered; N/A cells are marked with reason. No requirement is left without a failure-mode answer.
