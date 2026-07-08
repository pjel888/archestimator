# 02 — Feature Brief and Scope

## Source brief (verbatim from PROMPT.md)

> Create a production observability and runtime-budget plan for the Cloudflare
> Worker, OpenNext runtime, API routes, background work, and critical user flows.
>
> **Evidence To Start From**
> - `wrangler.jsonc` enables observability but the app-level request/job
>   correlation model is not complete.
> - `worker.ts`, `src/instrumentation.ts`, `src/lib/perf/server-timing.ts`, and
>   `src/lib/observability/logger.ts` show partial runtime/error telemetry.
> - `src/instrumentation.ts` explicitly defers Sentry/provider registration.
> - Current logs are mostly console/local proof surfaces, not an end-to-end
>   production incident model.
>
> **Required Plan Pack** — Define request IDs, job IDs, error taxonomy, CPU/
>   duration/subrequest/memory budgets, log sampling, privacy redaction,
>   dashboard/alert expectations, evidence scripts, and free-tier-safe monitoring
>   options.
>
> **Constraints** — Do not assume paid observability. Do not claim production
> monitoring from local logs. Keep sensitive payloads out of logs and evidence.
>
> **Stop Condition** — The pack is complete when an executor can implement
> runtime budgets and observability proof for Cloudflare production behavior.

## Scope (in)

- **Worker edge** (`worker.ts`): inbound request-id generation, header echo,
  try/catch dispatch boundaries, cron/queue handler first-log correlation id.
- **OpenNext runtime / Next.js request lifecycle**: propagation of the request
  id into Server Components, Server Actions, Route Handlers, and
  `onRequestError` instrumentation.
- **API routes** (`src/app/api/**` + `src/app/**/route.ts`): structured
  request-lifecycle logging, `Server-Timing` emission, error taxonomy adherence.
- **Background work**: cron handlers (`scheduled-upload-jobs.ts`, retention pass),
  the upload-job Queue consumer (`upload-job-queue.ts`), and the DO
  (`collaboration-room.ts`).
- **Runtime budgets**: CPU, wall-clock duration, subrequests, memory, D1
  rows-read/written, DO connections/messages — each with evaluator + ceiling +
  regression threshold + rollback trigger.
- **Logging/redaction**: canonical NDJSON schema, sampling, redaction applied to
  every emit path including Analytics Engine dimensions.
- **Metrics**: free-tier Analytics Engine binding for KPIs.
- **Dashboards/alerts**: Query Builder + GraphQL query definitions, free-tier
  alert-polling options, runbook hooks.
- **Evidence scripts**: provider-proof routes and `cf:*` package scripts.
- **Config**: `wrangler.jsonc` observability/vars tuning.

## Scope (out / non-goals)

- **Implementing the feature.** This is planning only.
- **Enabling any paid Cloudflare add-on** (Workers Paid, D1 paid, R2 paid, Smart
  Placement paid, Workers Analytics paid, Logpush, dedicated egress).
- **Sentry/Clarity/Datadog wiring beyond a swappable sink contract.** The plan
  defines the sink interface (already stubbed in `realtime-telemetry.ts`) and
  leaves provider registration deferred, matching the existing
  `instrumentation.ts` posture.
- **Changing the auth/data model, D1 schema, or app-authorization paths.**
- **Touching legacy Supabase** (`ebxxqidacheyapmmzavr`) or the unrelated
  `archestimator` provider project.
- **Modifying `wrangler.jsonc` bindings** (D1/R2/DO/Queue/Email/Images stay).
- **Frontend visual/UX changes.** The plan is backend/observability-only.
- **Broad refactors** unrelated to observability.

## Critical user flows the observability must cover

Derived from the route map (`03_…`). Each must produce a correlated request-lifecycle
log line and respect runtime budgets:

| Flow | Critical path | Why it matters for observability |
|---|---|---|
| Auth sign-in/callback | `src/app/api/auth/[...all]/route.ts`, `src/app/auth/callback/route.ts`, `src/lib/auth/actions.ts` | Security audit events (`account_security_events`) already write `request_id`; must unify with edge id |
| Direct file upload (R2) | `src/app/api/component-library/attachments/direct-upload/route.ts` (POST reserve → PUT bytes → POST finalize) | Longest user-facing route; memory/body/duration budget critical; admission control already rate-limits |
| Upload maintenance cron + queue | `worker.ts` `scheduled()`/`queue()`, `scheduled-upload-jobs.ts`, `upload-job-queue.ts` | Background; needs job-id correlation across HTTP→cron→queue→DO; DLQ path must be observable |
| Retention/compliance pass | `worker.ts` 3rd cron, `retention-core.ts` | Unbounded today; must be budgeted |
| Estimate mutation (Server Actions) | `src/lib/estimates/actions.ts` (~30 `correlation_id` sites), `with-action-errors.ts` | Highest-mutation surface; needs request id in error logs + budget on D1 writes |
| Collaboration (DO + WebSockets) | `collaboration-room-router.ts`, `collaboration-room.ts` | Realtime; needs room-level metrics + bounded fan-out |
| Share/invite token flows | `src/app/api/share/[token]/**`, `src/app/invite/[token]/**` | Security-sensitive; token redaction already in `redact.ts`; must keep |
| AI flows | `src/app/api/ai/ask/route.ts`, `package-builder` | Upstream LLM call; needs correlation id + timeout/outcome logging |
| Proposal export | `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts` | CPU-bound xlsx generation; CPU budget critical on 10ms free tier |

## Constraints (carried from brief + repo policy)

1. No paid observability. No paid add-ons.
2. No claim of production monitoring from local logs — separate evidence classes.
3. No sensitive payloads in logs or evidence artifacts.
4. Standing Cloudflare-resource authorization applies (only bound resources).
5. Proportional verification (per `AGENTS.md`).
6. Free-tier cost posture per `AGENTS.md`: rely on daily D1 backups +
   `cf:d1-restore-rehearsal`, no paid add-ons without owner approval.

## Success metrics (planning success, not product)

- An executor can implement each requirement without rediscovery.
- Every budget names an evaluator, ceiling, threshold, rollback trigger.
- Every log/metric path names a redaction rule.
- The package is `IMPLEMENTATION-READY` or `CONDITIONALLY READY`.
- No application code changed by this planning task.
