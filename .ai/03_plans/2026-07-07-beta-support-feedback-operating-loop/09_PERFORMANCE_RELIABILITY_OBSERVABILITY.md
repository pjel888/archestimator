# 09 — Performance, Reliability, and Observability

## Performance posture

This is a **low-traffic, beta-scale** feature. Free-tier Cloudflare limits apply (do not enable paid add-ons without owner approval — `AGENTS.md`). The loop must stay well within D1 row-read/write daily budgets and the Worker CPU budget.

## Performance evaluator contract

Per the Creating-Plan-Prompt performance-goal contract, define an evaluator **only where performance is a real risk**. For this loop, the only performance-sensitive surface is the **SLA sweep** (reads all non-archived rows on a cron). Submission and status-update are O(1) and need no evaluator beyond unit tests.

### Evaluator: SLA sweep latency

| Field | Value |
|---|---|
| Baseline metric | sweep wall-time over N non-archived rows |
| Target / budget | < 500ms p95 at 1000 rows; < 5s p95 at 100k rows |
| Measurement command | `bun test tests/vitest/beta-feedback-sla-sweep.perf.test.ts` (a focused perf test with synthetic fixtures) OR a manual `wrangler` local cron invocation with seeded rows |
| Fixture size | {10, 100, 1000, 10000} synthetic rows |
| Runs / flake | 5 runs, report p50/p95; tolerate 1 flaky outlier |
| Regression threshold | > 2x the recorded baseline at 1000 rows |
| Related functional tests | `beta-feedback-sla-sweep.test.ts` |
| Evidence artifact | `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` records the recorded numbers |

Submission/queue routes do not get a perf evaluator: they are O(1) indexed queries proven by existing unit tests. (Proportional verification policy.)

## Latency / bundle / payload budgets

| Surface | Target | Justification |
|---|---|---|
| `/workshop/feedback` TTFB | no regression vs. today | no new fetch on the page; copy/a11y edits only |
| Inline submit p95 | +<50ms vs. today (notify is fire-and-forget, non-awaited or awaited-with-timeout) | notify must not block the response |
| Queue page render | <300ms p95 at 1000 rows | paginated 50/page, indexed |
| RSC payload | unchanged | no new client DTO |
| Client JS | unchanged | no new client module; `BetaFeedbackForm` edits are in-bundle |

**Notify-blocking decision**: the operator notify on submit is `await`ed so the send result can be logged, but it is wrapped in a `Promise.race` with a **2s timeout** so a slow/dead email path cannot hang the submit. On timeout, log + treat as non-fatal. (This is stricter than "fire-and-forget" but bounded.)

## Reliability / failure modes

| Failure | Detection | Recovery |
|---|---|---|
| `sendEmail` returns `ok:false` (EMAIL_NOT_CONFIGURED/CIRCUIT_OPEN) | logged `event:"feedback_operator_notified"` with code | user unaffected; operator relies on queue + cron badge; readiness check flags config |
| Webhook 4xx/5xx | `sendFeedbackAlert` returns `webhook_rejected` | logged; sweep still sets `alerted_at` (one alert per breach is the contract); operator sees breach in queue |
| Webhook **hangs** (no response) | `AbortSignal.timeout(5000)` on the fetch (see T-10) — **the clone template lacks this; add it** | on timeout: log + skip setting `alerted_at` (retry next run); do not hang the sweep row |
| D1 read fails on sweep | `try/catch` + `emitLogRecord` error + non-zero cron exit | next-day retry; idempotent |
| Sweep timeout (overall) | `ctx.waitUntil` + per-row `AbortSignal.timeout(5000)` cap | partial progress logged; breached-but-unalerted rows retry next day |
| Migration `0039` **partial apply** | `ALTER TABLE ADD COLUMN` is NOT idempotent (SQLite has no `IF NOT EXISTS`); Wrangler's `d1_migrations` tracker may be inconsistent after a partial apply | fix-forward: `ALTER TABLE` only the missing columns individually + manually reconcile the tracker; do NOT re-run the file (see `21` DB-01 idempotency note) |
| Duplicate submit | two rows | client `inlinePending` disables button + post-redirect-get; no dedupe at beta |
| **Browser back-button after redirect submit** | back → re-POST → duplicate row | redirect mode uses POST→redirect→GET (PRG), so back-button lands on the GET `?saved=1` URL, not a re-POST; BUT if the browser re-submits the cached POST, a duplicate row is created. Mitigation: set `Cache-Control: no-store` on the action response + rely on client button disable. Acceptable at beta; document. |
| **Status update on a row just purged by retention** | `updateBetaFeedbackReviewStatusInD1` hits 0 rows → throws → `?error=save` | distinguish "row archived/purged" from "never existed": if 0 rows AND a `beta_feedback_status_events` lookup finds the id absent, show operator "This feedback was removed by retention." instead of a generic save error. (Enhancement; the generic `?error=save` is the fallback.) |
| Status update race | last-write-wins on `status`; `first_response_at`/`responded_at` set with `WHERE col IS NULL` guard → set once | set-once semantics |

## Observability

| Event | Sink | Fields (redacted) | Threshold/Alert |
|---|---|---|---|
| `feedback_received` | `emitLogRecord` | user_id, type, severity, page_path (no message) | n/a |
| `feedback_operator_notified` | `emitLogRecord` | feedback_id, severity, sendResult code | alert if `code != ok` sustained |
| `feedback_sla_breached` | `emitLogRecord` + `sendFeedbackAlert` | feedback_id, severity, which-clock breached, age_days | webhook to operator |
| `feedback_sla_swept` | `emitLogRecord` | {processed, breached, alerted} summary | n/a |
| `feedback_reporter_followup` | `emitLogRecord` | feedback_id, sendResult code | alert if sustained failure |
| `feedback_retention_purged` | `emitLogRecord` | {purged_count, oldest_kept} | n/a |

**Dashboards**: Workers Logs (platform) + D1 readback. No new dashboard built at beta; operator relies on the queue page (which shows SLA badges + breach filter). A simple count query on `status` / `alerted_at IS NOT NULL` is the manual metrics path.

**Redaction**: all `emitLogRecord` calls pass `message` through `redactForLog` or omit it entirely (SEC-DATA-01).

## Rollout / rollback (operations hooks)

- Feature flag: optional `FEEDBACK_LOOP_ENABLED` env (default on) to disable notify/sweep without code change if needed. Recommended for a safe beta toggle.
- Rollback: remove cron branch + set flag off; `alerted_at`/timestamps simply stop updating; migration rollback is `DROP COLUMN` (safe).
- Rollback trigger: sustained `sendEmail` `CIRCUIT_OPEN` or webhook failure storm → flip flag, investigate.
- Post-release verification: readiness check passes; first real beta feedback flows through the loop end-to-end (operator notified → triaged → resolved → reporter follow-up).
