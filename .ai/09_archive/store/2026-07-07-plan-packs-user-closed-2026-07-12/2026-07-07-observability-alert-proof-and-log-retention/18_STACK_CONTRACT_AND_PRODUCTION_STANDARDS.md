# 18 — Stack Contract and Production Standards

Consolidates the cross-cutting stack decisions for this plan. Baseline: Next.js 16, React 19, Bun,
TypeScript, Tailwind v4, OpenNext on Cloudflare Workers, D1, R2, Durable Objects, Queues/Cron,
Cloudflare Email, Better Auth, TanStack Query, Zustand, repository boundaries.

## Cloudflare Workers / OpenNext
- Worker `archestimator-proof`; observability enabled (`persist:true`); 3 crons; `UPLOAD_JOBS_QUEUE`
  + DLQ. This plan adds **no new binding** by default (no `analytics_engine`, no `tail_consumers`,
  no `logpush`). The sibling observability pack owns AE/sampling; this plan consumes.
- `main: worker.ts` — this plan may add an *optional* cron-failure alert hook **after** the
  sibling pack's try/catch + cron-summary logging lands, coordinated via `LOOP_LEDGER`. No other
  `worker.ts` change.

## D1
- Binding `ARCH_DB`. Migration `0040` (new tables + CHECK ALTER) within the standing Cloudflare
  mandate. `data_retention_events` already accepts the 7 new rule classes (no CHECK change needed
  for DATA-02; only for DATA-01 incidents). Retention rules are code (no schema); dry-run default.

## R2
- Binding `ARCH_UPLOADS_R2`. This plan does **not** change R2 policies. Evidence artifacts default
  to gitignored-local; R2 proof store is `OPEN-EVID-01` and would reuse the bucket under a redacted
  key namespace — no paid tier.

## Queues / Cron
- 3 cron slots occupied; this plan adds **no new cron**. Evidence-artifact pruning (DATA-04) reuses
  the retention pass or a scripts/ manual step. Queue DLQ depth is an alert signal (S-04), read via
  metadata API, not a new consumer.

## Cloudflare Email
- Binding `EMAIL`. Operational alert email is a **new use** of the existing binding + existing
  `TransactionalEmailClient` (circuit breaker). No new binding; deliverability proven via
  `check-cloudflare-email-readiness.ts` + FR-04 email proof.

## Better Auth
- This plan does not change auth. It *reads* the `session` table for the `sessions_expired`
  retention rule (DISCOVERY-REQUIRED to confirm shape). Incident declare/close is an admin Server
  Action behind Better Auth admin authz.

## Next.js / React / TypeScript
- **No new `"use client"` boundary** (no end-user UI). New server-only modules
  (`incident-record.ts`, `alert-events.ts`) stay server-side. Admin actions are Server Actions
  (POST-shaped, authz-gated). TypeScript: typed receipts/events/rows; no `any`; runtime validation
  at the receipt boundary (`validateReceipt`).

## Observability standards (this plan's contribution)
- Structured log events (`operational_alert_*`, `incident_*`) via the existing logger →
  `redactForLog`. No AE metrics emitted by this plan (sibling owns AE).
- Receipts are the proof unit; `proofClass` distinguishes local-automated from provider-backed.
- Free-tier ceilings respected (Workers Logs ~3d / 200k/day shared; D1 100k rows-written/day).

## Security standards
- Every artifact redacted (`redactForLog`) + secret-scanned (TEST-02). No raw bearer/email/URL in
  any artifact, log event, or D1 row. Credential material taxonomy in `08_…`. Admin-only incident
  writes. HTTPS-only webhooks. Idempotent receipts.

## Performance standards
- Alert-latency budget per `09_…`. Retention-pass cost bounded by sibling REL-02 options (local
  defaults if sibling not landed). No per-request runtime cost added by this plan (proof scripts
  are operator-run; incident writes are rare).

## Design-system
- Not applicable (no UI). Runbook follows repo doc conventions.

## Repository-boundary patterns
- New code lives under `src/lib/observability/` (catalog/schema/events/incident) and `scripts/`
  (verifiers). Repository-boundary discipline: incident writes go through a repository helper, not
  raw D1 in the action.

## Free-tier posture (no paid add-on)
- No Logpush, no Workers Paid, no D1 paid, no PagerDuty/Datadog. Paid upgrades are `OPEN-ALERT-02`
  / `OPEN-RET-01` with documented traffic triggers.
