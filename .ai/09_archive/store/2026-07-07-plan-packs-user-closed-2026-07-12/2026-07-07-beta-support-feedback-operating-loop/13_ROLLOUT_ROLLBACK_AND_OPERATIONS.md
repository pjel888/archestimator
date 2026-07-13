# 13 — Rollout, Rollback, and Operations

## Rollout shape

This is an additive, in-process feature on the existing Worker (`archestimator-proof`). No new bindings (alert env read off `process.env` to match precedent). No staged rings needed at beta scale — single deploy.

### Deployment sequence

1. Merge migration `0039` + apply to D1 (local → preview → production via `cf:d1-migrate-*` scripts). Readback via `generate-cloudflare-d1-beta-feedback-proof.ts`.
2. Deploy Worker with: new libs, extended actions, new cron branch, `wrangler.jsonc` cron entry, env vars/secrets.
3. Run `scripts/check-beta-feedback-loop-readiness.ts` (P4) → exit 0.
4. First real beta feedback exercises the loop end-to-end.

## Feature flag (recommended)

`FEEDBACK_LOOP_ENABLED` env (default `on`). When `off`:
- submit skips operator notify (still saves to D1);
- sweep cron no-ops + logs `disabled`;
- follow-up skipped.

This gives a safe beta toggle without redeploy. Recommended for the first deployment.

## Rollout performance gates

The cron + `worker.ts` change touches the Worker entry — justify one full build before merge.

| Metric | Baseline | Target | Source | Gate |
|---|---|---|---|---|
| `/workshop/feedback` TTFB | current | no regression | local route probe / Workers Observability | no >20% regression |
| Inline submit p95 | current | +<50ms | focused test + manual | notify bounded by 2s timeout |
| Sweep latency @1000 rows | n/a | <500ms p95 | perf test | recorded in `19` |
| `bun run build` | green | green | build | merge gate |

## Rollback

| Component | Trigger | Steps |
|---|---|---|
| Notify/follow-up/sweep | sustained `CIRCUIT_OPEN` or webhook storm | set `FEEDBACK_LOOP_ENABLED=off`; redeploy (or Wrangler secret update) |
| Cron branch | sweep mis-behaving | remove `worker.ts` branch + `wrangler.jsonc` cron entry; redeploy |
| Migration `0039` | column corruption (unlikely) | `DROP COLUMN` ×3 + `DROP INDEX` (code tolerates null) |
| Queue pagination | regression | revert to `LIMIT 50` (one-line) |

All rollbacks are fix-forward-safe: the code tolerates missing columns (null guards) and missing hooks.

## Observability during rollout

- Watch `feedback_operator_notified` log rate; alert if sustained `code != ok`.
- Watch `feedback_sla_breached` — should be ~0 at beta unless SLAs are genuinely missed.
- First-deploy sanity: submit a test blocker feedback; confirm operator email + queue row + ack.

## Runbook (operator-facing, condensed)

- **Where is feedback?** `/workshop/settings/feedback` (platform admin).
- **What's the SLA?** first-response ≤1 business day (blocker/high), ≤3 (medium/low); resolution ≤5 business days.
- **A row is flagged "breached"?** The daily sweep already alerted you; triage and update status. The breach clears when `first_response_at`/`responded_at` is set.
- **Email not arriving?** Check `FEEDBACK_LOOP_ENABLED`, `FEEDBACK_OPERATOR_EMAIL`, `ARCHESTIMATOR_EMAIL_DELIVERY_ENABLED`, `CLOUDFLARE_EMAIL_FROM`. Run `check-beta-feedback-loop-readiness.ts`.
- **Need to disable the loop?** Set `FEEDBACK_LOOP_ENABLED=off`; feedback still saves to D1.

## Post-release verification

- Readiness check green.
- At least one end-to-end beta feedback: submit (blocker) → operator notified → triaged → resolved → reporter follow-up received.
- No sustained error logs in the relevant events.
- D1 readback confirms `0039` columns populated as expected.

## Backward compatibility

- Existing feedback rows (pre-`0039`) → null timestamps → excluded from breach detection until they age in (acceptable; they predate the SLA).
- Default queue page-1 behavior matches today's first-50 ordering.
