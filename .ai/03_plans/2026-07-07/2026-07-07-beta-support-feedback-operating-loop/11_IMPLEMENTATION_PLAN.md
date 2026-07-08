# 11 — Implementation Plan

This is the authoritative execution guide for the future implementation AI. Phase order is dependency-aware. Each phase has a durable-goal contract. **Verify current files before editing** — paths are accurate as of 2026-07-07 but the repo may have moved.

Implementation bias: **minimal**. Honor the brief's "do not overbuild a CRM." Every task is independently landable.

---

## Phase P0 — Acknowledgement, input-preservation fallback, operator notify

**Objective**: Close the reporter-facing honesty gap (ack + payload-preserving fallback) and wire operator notification for blocker/high feedback.
**Requirements**: FR-ACK-01, FR-ACK-02, FR-NOTIFY-01, UX-A11Y-02 (partial), SEC-DATA-02, REL-01, ARCH-02.
**Prerequisites**: none (email plumbing exists).
**Parallelizable**: P0-T1, P0-T2 are independent (different files); P0-T3 depends on the copy/notify modules from P0-T1/T2.

### P0-T1 — Acknowledgement copy + a11y (Small)
- **Req IDs**: FR-ACK-01, UX-A11Y-02.
- **Objective**: Add status-expectation copy + `aria-live`/focus to the acknowledgement.
- **Target files**: `src/app/workshop/feedback/page.tsx`, `src/components/workshop/BetaFeedbackForm.tsx`, `src/lib/workshop/beta-feedback.ts` (copy constants) or a new `beta-feedback-copy.ts`.
- **Symbols**: `feedbackErrorMessage` (note: this is a **non-exported module function** in `page.tsx:6` — either export it or move ack copy to the constants module and import), `BetaFeedbackForm`, new `ACK_COPY`/`STATUS_EXPECTATION` constants.
- **Instructions**: add severity-aware ack text; wrap success `<output>` with `role="status"`/`aria-live="polite"`; error with `role="alert"`; on inline state change, move focus to the output (`outputRef.current.focus()`).
- **Output**: ack region renders promise text; focus moves.
- **Failure cases**: copy drift between modes; focus not moving in headless test.
- **Tests**: extend `tests/vitest/beta-feedback-form-ui.test.tsx` (RTL) — assert ack text + `role` + `activeElement`.
- **Validation**: `bun run test:dom -- beta-feedback-form-ui`; `bun run type-check`.
- **Completion evidence**: DOM test assertions pass.
- **Complexity**: Small.

### P0-T2 — Payload-preserving mailto fallback (Small→Medium)
- **Req IDs**: FR-ACK-02, SEC-DATA-02.
- **Objective**: Wire `buildBetaFeedbackMailto(payload)` into the fallback so the user's message is preserved.
- **Target files**: `src/lib/workshop/beta-feedback-actions.ts` (`feedbackRedirect`/`submitBetaFeedbackInline`), `src/lib/workshop/beta-feedback.ts`, `src/app/workshop/feedback/page.tsx:21` (static mailto).
- **Symbols**: `feedbackRedirect`, `buildBetaFeedbackMailto`, `submitBetaFeedbackInline` (inline fallback at `:64`).
- **Instructions**:
  - **Inline mode (preferred, no URL-length limit):** call `buildBetaFeedbackMailto(payload)` server-side and return the built `mailto:` URL string in `BetaFeedbackInlineState` (add a `mailtoHref?: string` field) so the modal renders a real link carrying the message. No redirect, no URL limit.
  - **Redirect mode (URL-length constrained):** a 4000-char message URL-encodes to up to ~12k chars, exceeding browser/server URL limits (~2000 browser / ~8k server). **Do NOT pass the full message via redirect params.** Instead: pass only `type`/`severity` (short enums) + a truncated message (e.g. first 280 chars) via params, OR (cleaner) write a short-lived signed fallback token to D1 (`beta_feedback_submissions`-adjacent or a `feedback_fallback_drafts` lightweight row) keyed by a random id, pass only `?fallback=<id>`, and have the page read+render the mailto from that id then delete it. **Recommended (smallest):** inline-mode carries full payload; redirect-mode truncates to 280 chars with an explicit "(message truncated — full text preserved in the inline path or email)" note. Pick one at impl; document the choice.
  - Do not log the raw message.
- **Output**: fallback mailto carries (full or truncated-with-note) message/type/severity.
- **Failure cases**: truncation loses tail of long message (mitigated by inline path + note); signed-token variant adds a table (rejected as CRM-adjacent — prefer truncation).
- **Tests**: unit test on `buildBetaFeedbackMailto`; action test asserting inline fallback returns a payload-bearing `mailtoHref`; redirect-mode truncation test (message >280 → truncated + note).
- **Validation**: focused vitest.
- **Complexity**: Medium (URL-length handling).

### P0-T3 — Operator notify on new blocker/high (Medium)
- **Req IDs**: FR-NOTIFY-01, SEC-DATA-01, REL-01, ARCH-02.
- **Objective**: New `beta-feedback-notify.ts` with `notifyOperatorOnNewFeedback(payload, {severity})` called from `saveBetaFeedback` for blocker/high.
- **Target files**: new `src/lib/workshop/beta-feedback-notify.ts`; extend `src/lib/workshop/beta-feedback-actions.ts`.
- **Symbols**: `notifyOperatorOnNewFeedback` (new), `saveBetaFeedback` (extend), reuses `sendEmail`, `emitLogRecord`, `redactForLog`.
- **Instructions**: read operator email from env (`FEEDBACK_OPERATOR_EMAIL` or fallback `CLOUDFLARE_EMAIL_REPLY_TO`); build app-controlled subject/text with the `message` as plain text (HTML-escape if html body); `await Promise.race([sendEmail(...), timeout(2000)])`; log `event:"feedback_operator_notified"` with redacted context + send result; never throw.
- **Output**: blocker/high → operator email attempted + logged.
- **Failure cases**: email not configured (`ok:false` logged, submit still succeeds); timeout (logged, non-fatal).
- **Tests**: `tests/vitest/beta-feedback-notify.test.ts` — assert `sendEmail` called for blocker/high, not for medium/low; mocked-fail keeps submit succeeding; timeout path logged.
- **Validation**: focused vitest.
- **Complexity**: Medium.

**P0 durable-goal contract**:
- Goal ID: `BF-P0`.
- Objective: honesty + notify gap closed.
- Required evidence: P0-T1/T2/T3 tests green; `bun run type-check` clean.
- Stop condition: a blocker/high submission triggers a logged operator notify and shows an honest ack; a D1 failure preserves the payload in the mailto.
- Blocker condition: email env cannot be configured locally (then mark notify as `CONDITIONALLY READY`, keep ack/fallback `READY`).

---

## Phase P1 — SLA columns, sweep, queue pagination

**Objective**: Define + track + detect SLA breaches; remove the latest-50 loss.
**Requirements**: FR-SLA-01, FR-SLA-02, FR-QUEUE-01, UX-A11Y-01, UX-QUEUE-01, DATA-01, ARCH-01, ARCH-03, SEC-AUTHZ-01, OPS-02.
**Prerequisites**: P0 (notify module reused for breach alerting wrapper).
**Sequence**: P1-T1 (migration) → P1-T2 (SLA math) → P1-T3 (store + actions) → P1-T4 (sweep + cron) → P1-T5 (queue UI). P1-T2 and P1-T3 can overlap once T1 lands.

### P1-T1 — Migration 0039 additive columns (Small)
- **Req IDs**: DATA-01, ARCH-01.
- **Objective**: Add `first_response_at`, `responded_at`, `alerted_at` + sweep index.
- **Target files**: new `migrations/0039_beta_feedback_sla_columns.sql`.
- **Instructions**: see `21_DATABASE_CHANGE_BLUEPRINTS.md` for the SQL sketch.
- **Validation**: apply locally via `bunx wrangler d1 migrations apply ARCH_DB --local` (no custom migrate script exists in the repo — verified); readback via `bun run cf:d1-beta-feedback-proof` (`scripts/generate-cloudflare-d1-beta-feedback-proof.ts`, extend to assert the 3 new columns + `idx_beta_feedback_sla_sweep`). See `21` DB-01 for the partial-apply idempotency note (`ALTER TABLE ADD COLUMN` is not idempotent in SQLite).
- **Rollback**: `DROP COLUMN` ×3 + `DROP INDEX`.
- **Complexity**: Small.

### P1-T2 — SLA math module (Medium)
- **Req IDs**: FR-SLA-01.
- **Objective**: new `beta-feedback-sla.ts` with `computeSlaStatus(row, now, config)` (business-day math) + badge classification (on-track/due-soon/breached) + SLA config constants.
- **Target files**: new `src/lib/workshop/beta-feedback-sla.ts`.
- **Config source**: `OPEN-SLA-01` recommended values — first-response ≤1 business day (blocker/high), ≤3 (medium/low); resolution ≤5 business days.
- **Business-day rule**: Mon–Fri, UTC-anchored `created_at`; weekends excluded; no public-holiday calendar at beta (document this).
- **Tests**: `tests/vitest/beta-feedback-sla.test.ts` — fixed-time fixtures incl. weekend spanning, already-responded, null timestamps.
- **Complexity**: Medium.

### P1-T3 — Store + actions timestamp setters (Medium)
- **Req IDs**: FR-SLA-01.
- **Objective**: set `first_response_at` (when status leaves `new`, `IS NULL` guard) and `responded_at` (on `resolved`, `IS NULL` guard) in `updateBetaFeedbackReviewStatusInD1`; add pagination to `readBetaFeedbackReviewQueueFromD1` (LIMIT/OFFSET + page param).
- **Target files**: `src/lib/workshop/beta-feedback-d1-store.ts`, `src/lib/workshop/beta-feedback-review.ts`, `beta-feedback-review-actions.ts`.
- **Tests**: store tests (pagination returns >50; timestamps set once).
- **Complexity**: Medium.

### P1-T4 — SLA sweep + cron + alert (Medium)
- **Req IDs**: FR-SLA-02, ARCH-03, SEC-DATA-01.
- **Objective**: new `beta-feedback-sla-sweep.ts` `runFeedbackSlaSweep(env)` + new `beta-feedback-alert.ts` `sendFeedbackAlert` (clone of `sendUploadOperationalAlert`) + new `worker.ts` cron branch (e.g. `45 3 * * *`) + `wrangler.jsonc` cron entry.
- **Instructions**: sweep reads non-archived rows; for each breached row with `alerted_at IS NULL`, fire `sendFeedbackAlert` (+ `AbortSignal.timeout(5000)` on its fetch — template lacks it, T-10) + `UPDATE alerted_at` + `emitLogRecord("feedback_sla_breached")`; emit summary `feedback_sla_swept`. Wrap in try/catch; non-fatal. **CRITICAL cron gate:** add the branch as `if (controller.cron === "45 3 * * *") { ctx.waitUntil(runFeedbackSlaSweep(env)); }` in `worker.ts scheduled()` — mirroring the retention-pass gate at `worker.ts:109`. Do NOT add it to the ungated `runCloudflareScheduledUploadJobs` `ctx.waitUntil` (which runs on every cron).
- **Tests**: `tests/vitest/beta-feedback-sla-sweep.test.ts` — fixed fixtures; idempotency (`alerted_at` guard); alert called once; perf test variant at 1000 rows (evaluator).
- **Complexity**: Medium.

### P1-T5 — Queue UI: pagination + SLA badge + breach filter (Medium)
- **Req IDs**: FR-QUEUE-01, UX-A11Y-01, UX-QUEUE-01.
- **Objective**: `settings/feedback/page.tsx` — paginated table, per-row badge (icon+text, non-color), breach filter. Fix Type/Severity labels in `BetaFeedbackForm` (UX-A11Y-01) if `DropdownSelect` supports label passthrough; else add minimal prop.
- **Target files**: `src/app/workshop/settings/feedback/page.tsx`, `src/components/workshop/BetaFeedbackForm.tsx`, `src/components/ui/dropdown-select.tsx` (if needed).
- **Tests**: DOM test for pagination control + badge render; axe-oriented assertion for label association.
- **Complexity**: Medium.

**P1 durable-goal contract**:
- Goal ID: `BF-P1`.
- Objective: SLA tracked + breaches auto-detected/alerted; queue paginated with no loss.
- Required evidence: P1-T1..T5 tests green; perf evaluator recorded; migration readback.
- Stop condition: a seeded overdue row is flagged + alerted exactly once; queue paginates beyond 50.
- Review gate: code-review on the sweep + cron branch.
- QA gate: denial test (non-admin cannot trigger sweep-touching actions).

---

## Phase P2 — Reporter follow-up email

**Objective**: Close the loop to the reporter on resolve.
**Requirements**: FR-FOLLOWUP-01, SEC-DATA-01, REL-01.
**Prerequisites**: P1-T3 (`responded_at`).

### P2-T1 — Reporter follow-up on resolve (Small)
- **Req IDs**: FR-FOLLOWUP-01.
- **Objective**: in `updateBetaFeedbackReviewStatus`, when status → `resolved` and `responded_at` was null (first resolve), call `sendReporterFollowupEmail` (new, in `beta-feedback-notify.ts`); guard against re-send.
- **Target files**: `src/lib/workshop/beta-feedback-review-actions.ts`, `src/lib/workshop/beta-feedback-notify.ts`.
- **Tests**: action test asserting `sendEmail` called on first resolve; re-resolve does not re-send; mocked-fail keeps update.
- **Complexity**: Small.

---

## Phase P3 — Retention TTL + DSAR reachability (CONDITIONALLY READY)

**Objective**: Privacy-compliant retention; feedback reachable by erasure.
**Requirements**: DATA-02, T-11.
**Prerequisites**: P1-T1 (columns not strictly required, but coordinate with retention registry).
**Blocker**: `OPEN-RET-01` / `OPEN-DEC-004` retention-schedule ratification (partially external).

### P3-T1 — Retention registry entry + sweep rule (Small)
- **Req IDs**: DATA-02.
- **Objective**: add `beta_feedback_submissions` to the retention registry (TTL 365d, archived-only purge) and to `runRetentionPassInD1` rules.
- **Target files**: retention registry (`retention-core.ts` or equivalent — discover exact path at implementation time; `DISCOVERY-REQUIRED` if not located by `rg "DEFAULT_RETENTION_RULES"`).
- **Purge SQL**: `DELETE FROM beta_feedback_submissions WHERE status='archived' AND created_at < ?`.
- **Tests**: retention test asserting archived+old purged, non-archived never purged.
- **Status**: `CONDITIONALLY READY` — couples to `OPEN-DEC-004`.
- **Complexity**: Small.

### P3-T2 — DSAR reachability (Small, coupled)
- **Objective**: ensure the privacy-request erasure/export path includes `beta_feedback_submissions` by `user_id`.
- **Target files**: privacy-request pack's erasure/export module (coordinate with that pack).
- **Status**: `CONDITIONALLY READY` — owned by the privacy-request pack; this pack records the requirement.
- **Complexity**: Small.

---

## Phase P4 — Readiness proof (CONDITIONALLY READY)

**Objective**: prove the loop is live before beta widens.
**Requirements**: OPS-01.
**Blocker**: `OPEN-MON-01` (hosted inbox + alert delivery proof is external).

### P4-T1 — Loop readiness check (Small)
- **Req IDs**: OPS-01.
- **Objective**: new `scripts/check-beta-feedback-loop-readiness.ts` — checks (a) operator email env set, (b) alert webhook reachable OR explicitly operator-email-only (flag), (c) queue live (probe insert+read+delete or readback), (d) sweep cron registered in `wrangler.jsonc`.
- **Model on**: `scripts/check-support-monitoring-readiness.ts`, `scripts/verify-upload-alert-delivery.ts`.
- **Exit codes**: 0 only when all hold or operator-attested via flag.
- **Status**: `CONDITIONALLY READY` — `OPEN-MON-01`.
- **Complexity**: Small.

---

## Files explicitly off-limits during implementation
- `migrations/supabase/*` (legacy; never run/extend).
- `src/app/contact/*`, `src/components/landing/ContactForm.tsx` (deferred funnel).
- Better Auth core (`src/lib/auth/better-auth-cloudflare.ts`) — reuse, do not modify.
- Durable Objects / Queue consumer internals (`upload-job-queue.ts` consumer) — do not widen `jobName`.

## Commands to run before the first edit
- `git status` (concurrent-agent safety).
- `rg "DEFAULT_RETENTION_RULES|retention-core" src/` (locate retention registry for P3).
- `rg "isPlatformAdminRole" src/` (confirm gate).
- Read current `worker.ts scheduled()` and `wrangler.jsonc` crons (they may have changed).
- `bun run type-check` baseline.

## Implementation order summary
P0 (T1‖T2 → T3) → P1 (T1 → T2‖T3 → T4 → T5) → P2 → P3 → P4. P0/P1 slices are `IMPLEMENTATION-READY`; P3/P4 are `CONDITIONALLY READY`.
