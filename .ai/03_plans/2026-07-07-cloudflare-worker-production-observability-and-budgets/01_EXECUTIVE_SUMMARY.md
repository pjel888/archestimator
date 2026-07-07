# 01 — Executive Summary

## What this plan delivers

A production observability and runtime-budget plan for the Archestimator
Cloudflare Worker (`archestimator-proof`) that an implementation AI can execute
**entirely within the free tier**. It defines: request IDs, job IDs, error
taxonomy, CPU/duration/subrequest/memory/D1 budgets, log sampling, privacy
redaction, dashboard/alert expectations, evidence scripts, and free-tier-safe
monitoring options.

## Current state (verified from source)

| Surface | Current behavior | File evidence |
|---|---|---|
| Workers Observability config | Enabled; logs head-sampled 0.1, traces 0.05, both `persist: true` | `wrangler.jsonc:83-96` |
| End-to-end request id | **None.** `cf-ray` read in 2 auth paths only; `wsh_*` (perf) dev-only; `err_*` (route-error) on-error only | `src/lib/perf/server-timing.ts:37`, `src/lib/observability/route-error.ts:28`, `src/app/auth/callback/route.ts:19`, `src/lib/auth/actions.ts:31` |
| `Server-Timing` header | **Never emitted** despite module name; perf data only reaches `console.log` in dev | `src/lib/perf/server-timing.ts` (all) |
| Production metrics sink | **None.** Realtime/express telemetry sinks stubbed but unregistered | `src/lib/collaboration/realtime-telemetry.ts`, `src/lib/estimates/express-components-telemetry.ts` |
| Worker handler error capture | **No try/catch** around the `fetch`/`scheduled`/`queue` dispatch chain | `worker.ts:60-129` |
| Runtime-budget vars | 5 vars declared but **never enforced**; only echoed by a proof route | `wrangler.jsonc:98-104`, `src/app/api/internal/upload-runtime/route.ts:91-99` |
| Retention pass duration/row budget | **Unbounded** in a single `ctx.waitUntil`; per-rule LIMIT but no total time/row cap | `src/lib/compliance/retention-core.ts:180-268`, `worker.ts:109-115` |
| CollaborationRoom DO | No logging, no metrics, O(N) fan-out per presence event, re-encodes message bytes for length | `src/lib/cloudflare/collaboration-room.ts:94-225` |
| `cf.colo` / `request.cf` capture | None anywhere in `src/` | n/a |

## Target state

1. **One end-to-end correlation id** generated at the Worker edge on every
   `fetch`, propagated into OpenNext (header + `AsyncLocalStorage`), echoed on
   every HTTP response (`x-request-id`), and embedded in cron/queue handler
   first-log-lines and queue message payloads.
2. **Structured request lifecycle logging** — one NDJSON line per HTTP request,
   cron tick, and queue batch — with a single canonical schema and full redaction.
3. **Error taxonomy** unified through the existing `AppError` hierarchy and
   emitted with `outcome`/`code`/`kind` so the Cloudflare Query Builder can slice
   by `exceededCpu` / `exception` / status.
4. **`Server-Timing` header** on HTTP responses carrying safe labels + duration
   (no ids/SQL/cookies), gated so it never leaks on auth/share/error responses.
5. **Runtime budgets** — CPU, duration, subrequest, memory, D1 rows-read/written,
   DO connections — each with an **evaluator** (command/harness), a **free-tier
   ceiling**, a **regression threshold**, and a **rollback trigger**.
6. **Free-tier-safe metrics** via an `analytics_engine` binding (100k points/day,
   10k queries/day, 250 points/invocation — all free) for 3–5 KPIs, never
   including PII in dimensions.
7. **Sampling config** tuned for pre-launch (logs near 100%, traces disabled or
   0.01) because traces share the logs quota since 2026-03-01.
8. **Dashboard + alert expectations** documented as Query Builder / GraphQL
   queries, with the explicit gap that Cloudflare native Worker alerting is weak
   on Free and the realistic free-tier alert path is self-polling GraphQL from a
   free external cron.

## Major findings

- **The free tier is sufficient** for pre-launch observability if sampling is
  tuned and traces are deferred. The tightest ceilings are: 10 ms CPU/request,
  50 subrequests/request, 128 MB memory, 100k D1 rows-written/day, 200k Workers
  Logs events/day (shared logs+traces), 3-day log retention, 100k Analytics
  Engine points/day.
- **The biggest correctness gap** is not cost — it is that Worker edge failures
  (`worker.ts` fetch/scheduled/queue) have no try/catch, so the only signal is a
  Cloudflare invocation error with no app-level context. Fixing this is P0.
- **The biggest budget risk** is the retention pass: unbounded in a single
  `ctx.waitUntil` against the 15-minute cron wall-clock and the 100k D1
  rows-written/day ceiling.
- **Privacy is largely handled** (`redact.ts` is thorough), but redaction is
  applied to structured app logs only — `console.*` calls outside the logger and
  any Analytics Engine dimensions are not covered. The plan closes both.

## Major decisions (summary — full rationale in `15_…`)

| ID | Decision | Rejected alternative |
|---|---|---|
| DEC-01 | Generate `x-request-id` at the Worker edge via `crypto.randomUUID()`, fall back to `cf-ray` | Trust `cf-ray` as the sole id (crons/queues get fresh cf-ray; not shareable) |
| DEC-02 | Disable traces on free tier; keep logs near 100% pre-launch | Keep traces at 0.05 (eats shared quota, Open Beta) |
| DEC-03 | Use Analytics Engine for custom KPIs (free 100k/day) | Self-host metrics in D1 (costs rows-written quota) |
| DEC-04 | Add try/catch at Worker dispatch boundary | Rely solely on Cloudflare invocation logs |
| DEC-05 | Bound retention pass by time + rows per tick | Leave unbounded (risk of cron CPU/rows blowout) |
| DEC-06 | Keep domain `correlationId` separate from request `requestId` | Unify (different lifecycles: idempotency vs trace) |

## Readiness

- **Profile:** `exhaustive`.
- **Verification mode:** `emulated` (no independent verifier available).
- **Status:** **`CONDITIONALLY READY`**. All internally resolvable planning gaps
  are closed. The package is capped at 97 by the emulated verification mode and
  by a small set of owner-delegated decisions (Analytics Engine binding name,
  exact KPI set, alert-polling destination) that do not block implementation of
  the well-scoped slices but should be confirmed before merge.

## Cost posture

Stays on free-tier/bundled limits. **No paid add-on is recommended.** The plan
defers Logpush, Workers Paid, D1 paid, and re-enabling traces until traffic
justifies it, and names the trigger for each upgrade.
