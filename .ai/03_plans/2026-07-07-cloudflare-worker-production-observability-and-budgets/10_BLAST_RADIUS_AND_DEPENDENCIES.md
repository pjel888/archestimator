# 10 — Blast Radius and Dependencies

## 10.1 Affected surfaces (direct)

| Surface | File | Impact | Classification |
|---|---|---|---|
| Worker fetch entry | `worker.ts` | wrap dispatch in id + try/catch + header echo | Required change |
| Worker scheduled entry | `worker.ts` | add cronRunId logs + try/catch + retention budget opts | Required change |
| Worker queue entry | `worker.ts` | add batchId logs + try/catch | Required change |
| Edge fast-paths | `src/lib/cloudflare/worker-route-optimizations.ts` | each short-circuit attaches `x-request-id` | Required change |
| Request id module (new) | `src/lib/observability/request-id.ts` | new pure helpers + ALS | Required change (new file) |
| Route error | `src/lib/observability/route-error.ts` | `readTraceId` prefers `getRequestContext()` | Required change |
| Action error wrapper | `src/lib/observability/with-action-errors.ts` | pull id from context, pass to log | Required change |
| Logger | `src/lib/observability/logger.ts` | (minor) ensure `request_id` from context when not passed | Probable change |
| Instrumentation | `src/instrumentation.ts` | pull id from context for `onRequestError` edge branch | Probable change |
| Server-Timing header (new) | `src/lib/observability/server-timing-header.ts` | new builder | Required change (new file, P1) |
| Perf module | `src/lib/perf/server-timing.ts` | reuse `request-id.ts`; keep dev-only trace | Probable change |
| Metrics (new) | `src/lib/observability/metrics.ts` | new AE wrapper | Required change (new file, P1) |
| Retention core | `src/lib/compliance/retention-core.ts` | add `maxDurationMs`/`maxRowsDeletedPerTick` + per-rule log | Required change |
| DO class | `src/lib/cloudflare/collaboration-room.ts` | fan-out cap + byteLength + metrics + log | Required change (P1) |
| Queue consumer | `src/lib/cloudflare/upload-job-queue.ts` | add `batchId` to logs + receipt JSON | Probable change |
| Scheduled jobs | `src/lib/cloudflare/scheduled-upload-jobs.ts` | thread correlation id into internal fetch | Probable change |
| wrangler config | `wrangler.jsonc` | tune sampling; add AE binding | Required change |
| Worker Env type | `cloudflare-env.d.ts` | regenerate after AE binding (`bun run cf:typegen`) | Required change (generated) |
| Proof/evidence routes | `src/app/api/internal/*` | add redaction to any request-sample emit | Probable change (audit) |
| Tests | `tests/vitest/*` | new test files per `12_…` | Required change |

## 10.2 Affected surfaces (transitive / verification-only)

| Surface | Why | Classification |
|---|---|---|
| ~28 Server Action files (`src/lib/**/actions.ts`) | inherit request id via context; no body change unless they bypass `withActionErrors` | Verification only (grep proof) |
| ~35 API routes (`src/app/api/**`) | inherit id; error path uses `errorResponse`/`problemDetailsResponse` already | Verification only |
| D1 repositories (`src/lib/repositories/**`) | optional `traced()` wrap; no SQL change | Explicitly unaffected (unless perf slice adds wrap) |
| `src/proxy.ts` / `request-proxy.ts` | runs after Worker; reads context if needed | Verification only |
| Client components | receive `trace_id` in error envelope (unchanged shape) | Explicitly unaffected |
| Better-Auth runtime | unchanged auth path | Explicitly unaffected |
| R2 storage provider | unchanged | Explicitly unaffected |
| Legacy Supabase | out of scope | Explicitly unaffected |

## 10.3 Direct impact by user/role

| Actor | Impact |
|---|---|
| Anonymous visitor (marketing pages) | none visible (header added; cached pages unaffected) |
| Authenticated estimator | error toast may show the real request id (was `err_*`); otherwise none |
| Collaborator (DO) | more reliable room under load (fan-out cap); none visible |
| Share/invite recipient | none visible (redaction unchanged) |
| Operator/owner | new dashboards/alerts/logs; faster incident triage |
| Attacker | no new surface (id is non-secret; redaction extended) |

## 10.4 Backward compatibility

- `x-request-id` header is **additive**; clients that ignore headers are unaffected.
- Error envelope shape is **unchanged**; the id value is more stable.
- Proof receipt JSON gains `batchId` field — **non-breaking** for defensive readers.
- Sampling config change (traces off) is **operational**, not a contract change.
- AE binding addition requires `wrangler.jsonc` + typegen; **no runtime contract** change for app code that doesn't use it.
- Retention budget options are **opt-in** (defaults supplied by `worker.ts`); existing callers unaffected.

## 10.5 Dependencies

| Dependency | Type | Status |
|---|---|---|
| `@opennextjs/cloudflare` (getCloudflareContext) | existing | used by `d1.ts`; ALS reuse depends on same-isolate assumption (verify in impl) |
| Cloudflare Workers Observability | platform | already enabled |
| Cloudflare Analytics Engine | platform (new binding) | free; DEC-07 name |
| Cloudflare Workers Logs (GA) | platform | GA |
| Cloudflare Workers Tracing (Open Beta) | platform | defer (quota-shared) |
| `node:async_hooks` (AsyncLocalStorage) | existing (used in `server-timing.ts`) | already in repo |
| `crypto.randomUUID()` | Web API | available in Worker |
| `gitnexus` | tool | not required (proportional policy) |

## 10.6 Compatibility flags / runtime notes

- `compatibility_date: 2026-06-29`, `nodejs_compat` — `AsyncLocalStorage` and
  `crypto.randomUUID()` are supported. No flag change needed.
- AsyncLocalStorage persistence across the OpenNext boundary should be verified
  in implementation (the belt-and-suspenders header propagation covers any gap).
- AE binding requires no special compatibility flag.

## 10.7 Documentation impact

| Doc | Update needed? |
|---|---|
| `AGENTS.md` | No (already documents Cloudflare posture) |
| `DESIGN.md` | No (no UI) |
| `.ai/10_state/current-state.md` | Yes, append entry at implementation closeout |
| `.ai/03_plans/<this pack>/README.md` | This pack |
| New ops runbook | Yes (DOC-01) |

## 10.8 Concurrent-work / other-active-development risk

- The repo has many in-flight 2026-07-07 plan packs and modified files. The
  implementation slice should declare file ownership in
  `00_COORDINATION_LEDGER.md` (per Multi-Agent Execution Directive §6) and
  re-read files before each edit.
- `worker.ts`, `wrangler.jsonc`, and `src/lib/observability/*` are the highest
  contention risk; serialize edits there.
- Tests under `tests/vitest/` are shared; new test files in unique names avoid
  collisions.
