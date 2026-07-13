# 19 — Research, Review, and QA Evidence

## 19.1 Research questions and sources

| # | Question | Primary source | Date visible | Decision it shaped |
|---|---|---|---|---|
| RQ-1 | Do Workers Logs and Traces share a free-tier quota? | developers.cloudflare.com/workers/observability/logs/workers-logs + /traces/ | accessed Jul 2026; "as of March 1, 2026, traces share the same usage quota as Workers Logs" | DEC-02 (disable traces pre-launch); OBS-02 |
| RQ-2 | What are free-tier ceilings for CPU/subrequest/memory/D1/DO/Queue/AE? | developers.cloudflare.com/workers/platform/limits, /d1/platform/limits, /durable-objects/platform/limits, /queues/platform/limits, /analytics/analytics-engine/limits | accessed Jul 2026 | REL-01 budget table (`09_…`) |
| RQ-3 | Is `cf-ray` shareable across cron/queue/DO? | developers.cloudflare.com/fundamentals/reference/http-headers + /workers/observability/logs/workers-logs | accessed Jul 2026 — cron/queue get fresh invocations | DEC-01 (app-level id) |
| RQ-4 | Is Analytics Engine free-tier sufficient? | developers.cloudflare.com/analytics/analytics-engine/pricing + /limits | 100k writes/day, 10k reads/day, 250/invocation | DEC-03 (AE for KPIs) |
| RQ-5 | How to query a specific request by id? | developers.cloudflare.com/workers/observability/query-builder + observability-query-language changelog 2026-02-24 | accessed Jul 2026 | OBS-03 (Query Builder `WHERE "cf-ray" = ...`) |
| RQ-6 | Native Worker alerting on Free? | developers.cloudflare.com/notifications + community thread | native weak on Free; Enterprise for rich | RISK-15; honest gap; self-poll GraphQL path |
| RQ-7 | `persist: true` works on Free? | developers.cloudflare.com/workers/observability/logs/workers-logs | yes — gates 200k/day + 3-day | OBS-02 keep persist |
| RQ-8 | Workers Logs GA? Query Builder GA? | changelog 2025-04-09 (QB GA); "logs, metrics, queries" blog | GA | OBS-03 stable tooling |

**Sources (URLs):**
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/workers/observability/logs/workers-logs/
- https://developers.cloudflare.com/workers/observability/traces/
- https://developers.cloudflare.com/workers/observability/query-builder/
- https://developers.cloudflare.com/changelog/post/2026-02-24-observability-query-language/
- https://developers.cloudflare.com/changelog/post/2025-11-07-automatic-tracing/
- https://developers.cloudflare.com/workers/observability/metrics-and-analytics/
- https://developers.cloudflare.com/d1/platform/limits/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/durable-objects/platform/limits/
- https://developers.cloudflare.com/queues/platform/limits/
- https://developers.cloudflare.com/queues/configuration/batching-retries/
- https://developers.cloudflare.com/analytics/analytics-engine/limits/
- https://developers.cloudflare.com/analytics/analytics-engine/pricing/
- https://developers.cloudflare.com/analytics/analytics-engine/get-started/
- https://developers.cloudflare.com/fundamentals/reference/http-headers/
- https://developers.cloudflare.com/notifications/get-started/
- https://developers.cloudflare.com/notifications/notification-available/
- https://blog.cloudflare.com/workers-tracing-now-in-open-beta/
- https://blog.cloudflare.com/introducing-workers-observability-logs-metrics-and-queries-all-in-one-place/

**Currency note:** "July 2026" research window. Re-confirm at implementation if a
Cloudflare product changes (especially Tracing GA and any D1 quota change).

## 19.2 Skills and workflows used / unavailable

| Skill/workflow | Used? | Why | Substitute if unavailable |
|---|---|---|---|
| `archestimator-plan-pack` | Yes | confirms dated-folder + exhaustive trigger + loop shape | n/a |
| Explore subagents (native) | Yes (×2) | codebase mapping (routes/middleware/telemetry + D1/DO/retention/uploads) | `rg`/reads |
| general-purpose subagent (native) | Yes (×1) | official-docs research | WebSearch + webReader |
| `gitnexus` impact | No | proportional policy: narrow read-only planning; `rg`/reads sufficient | n/a |
| `ultrawork`/`ultragoal`/`ultraqa`/`autopilot` | Conceptual contracts only | documented for future impl loop | n/a |
| `cloudflare`/`wrangler`/`workers-best-practices` | Consulted via research subagent | free-tier limits, config | official docs |
| Independent verifier | **Unavailable** | n/a | emulated pass (cap 97) |

No skill fabricated. No reusable skill created.

## 19.3 Specialist workstream outputs (summary)

- **Source/codebase analyst:** `03_…` (full file:line map of observability
  surfaces, gaps, budget var non-enforcement, DO/retention/upload flows).
- **Backend/API planner:** `06_…`, `07_…` (contracts, access-path matrix,
  per-flow shadow paths).
- **Data planner:** `07_…` (proof of no schema change; budget reduces writes).
- **Performance/reliability reviewer:** `09_…` (budget table + evaluator contract).
- **Security/privacy reviewer:** `08_…` (threat model, taxonomy, allowlists).
- **Test/QA strategist:** `12_…` (test matrix + adversarial matrix).
- **Operations planner:** `13_…` (rollout/rollback/runbook/queries).
- **Adversarial reviewer:** AQ-1..12 + `14_…` risk register.

## 19.4 Critique-and-revision cycles (emulated)

**Cycle 1 (after first draft of 01-12):**
- Found: budget vars never enforced (`03_…` §3.12) — initially written as if they
  were. **Fix:** split into REL-01 (define) + OPEN-04 (enforcing is a separate
  owner decision, out of scope).
- Found: traces share logs quota (RQ-1) — initial draft kept traces at 0.05.
  **Fix:** DEC-02 disable pre-launch; OBS-02 walk-down.
- Found: `correlationId` ≠ `requestId` conflation risk. **Fix:** DEC-06 explicit.
- Found: `Server-Timing` cache-pollution risk. **Fix:** DEC-08 gate + suppress.
- Found: missing credential-material taxonomy. **Fix:** added in `08_…`.

**Cycle 2 (after draft of 13-19):**
- Found: alerting gap understated. **Fix:** RISK-15 + honest `13_…` section.
- Found: RISK-07 (export CPU) had no fix-forward path. **Fix:** documented Queue+email defer.
- Found: AE binding name unspecified. **Fix:** DEC-07 + OPEN-01.
- Found: hosted-proof claims could be mistaken for local-proof. **Fix:** explicit
  evidence-class separation in `12_…`/`13_…`/`17_…`.

**Cycle 3 (final consistency):**
- Cross-doc consistency: every requirement traced (`16_…`); every task maps to req;
  every score < 100 has a deficiency + owner (`17_…`).
- No remaining vague task, approximate path, or placeholder TODO without owner.

Total meaningful cycles: **3** (within the suite cap of 6 for exhaustive).

## 19.5 UltraQA-style adversarial scenario matrix

(Implementation-time matrix; see `12_…` §12.3 AQ-1..12 for the full table with
commands.) Summary of hostile/edge coverage:

- Header injection (CRLF, script, oversized, Unicode) → rejected.
- PII in metric dimension → rejected.
- CRLF in Server-Timing → rejected.
- Oversized WS message / 300-socket broadcast → capped/closed.
- Retention backlog → budget_reached.
- Dispatch throw → 500 + logged + id.
- Fast-path 308 → header present.
- Queue duplicate → ack("duplicate").
- AE binding missing → swallowed, no request fail.
- Cache-pollution via Server-Timing on cacheable response → suppressed.

For this **docs-only planning task**, dynamic adversarial QA is not applicable to
the planning task itself (no runtime behavior changed); the matrix above
specifies the adversarial QA required for the future **implementation**, per the
suite rule.

## 19.6 Performance evaluator contract evidence

See `09_…` §9.2 table. Each evaluator names: baseline, target, measurement
command, fixture, runs, threshold, related tests, evidence location. Passing
ordinary tests is insufficient; the declared evaluator tests are required.

## 19.7 Independent final verifier evidence

**verification_mode: emulated.** The verifier pass is documented in `17_…`
(searches performed, findings, scores, gaps). No separate independent agent
output exists. This is the honest state; the cap is applied.

## 19.8 Explicit validation gaps (honest)

| Gap | Why | Risk | Strongest substitute | Unblock action |
|---|---|---|---|---|
| Hosted Workers Logs query proof | requires deployed Worker + dashboard access | cannot prove find-by-id locally | documented query (`13_…`) | operator runs it post-deploy |
| AE GraphQL readback proof | requires AE binding live | cannot prove KPI emission locally | unit test of `writeMetric` shape | operator confirms in dashboard |
| `exceededCpu` on export | requires real prod load | export may fail under load | document watch + fix-forward | monitor post-deploy |
| Native alerting | weak on Free | breach may go unnoticed | self-poll GraphQL (separate task) | build GH Actions poller |
| Independent verifier | none available | emulated cap at 97 | separated same-agent pass | owner/agent review |

## 19.9 Redaction `console.*` audit (placeholder — fill at implementation T-9.1)

At planning time, the known ad-hoc `console.*` sites (from `03_…` §3.13):
- `worker.ts:104,112,125` — summary logs (user-data-free) — OK.
- `worker-route-optimizations.ts:352` — cache-write-failed (user-data-free) — OK.
- `collaboration/actions.ts:750,1031,1153` — `[collaboration]` warns — **audit at impl**.
- `retention-core.ts:250-254` — error.name only — OK.
- `instrumentation.ts` edge branch — routed data (method/path) — **wrap in redact at impl (T-3.3)**.
- `realtime-telemetry.ts`, `express-components-telemetry.ts` — non-prod console.warn — **audit at impl**.
- `direct-upload/route.ts:350,445` — config error — OK.

The full `rg "console\.(log|warn|error|info|debug)" src/` artifact will be
attached here at implementation closeout (T-9.1).

## 19.10 Final verification matrix (independent subagent, post-revision)

Requirement-by-requirement audit of the brief's 9 deliverables + 3 constraints +
stop condition, re-run after the P0/P1/P2 fixes. Verdict legend:
✅ Proven · ❌ Contradicted · ⚠️ Incomplete · ◑ Weak · ⬜ Missing · NA.

| Brief item | Where covered | Verdict | Evidence |
|---|---|---|---|
| 1. request IDs | FR-01; T-1.1/1.2/1.3/2.1/2.2; P-01/02/04 | ✅ Proven | `worker.ts:60-95` has no id (confirmed); plan defines gen/validate/ALS/echo + isolation |
| 2. job IDs | FR-02; T-2.3/4.1/4.2; P-05 | ✅ Proven | `cronRunId` (worker.ts:111), `idempotencyKey` (upload-job-queue.ts:21,138) confirmed; plan adds `batchId` |
| 3. error taxonomy | FR-05; T-3.1/3.2/3.3; P-03/08 | ✅ Proven | AppError hierarchy in app-error.ts; `with-action-errors.ts:53-57` gap confirmed + fixed |
| 4. CPU/duration/subrequest/memory budgets | REL-01; 09 §9.1 | ✅ Proven | 15-row budget table with all 5 fields; ceilings cited from official docs |
| 5. log sampling | OBS-02; T-7.1 | ✅ Proven | **P0-2 fixed**: all 3 wrangler keys addressed; shared-quota Mar 2026 cited |
| 6. privacy redaction | SEC-01/02/03; T-9.1/3.3/8.1/8.3; P-13/14/15 | ✅ Proven | **P1-2 fixed**: instrumentation path redaction; inbound-id isolation (P1-5) |
| 7. dashboard/alert expectations | OBS-03; 13 §13.5 | ✅ Proven | copy-paste queries; **P1-3 fixed**: x-request-id lookup; honest free-tier alerting gap |
| 8. evidence scripts | SEC-02; 09 §9.5; cf:* scripts | ✅ Proven | R2 receipts, cf:provider-proof, hosted-verify scripts exist in package.json |
| 9. free-tier-safe monitoring | DEC-03/09; 13 §13.5 | ✅ Proven | AE (100k/day free) + GraphQL self-poll; no paid add-on |
| C1. no paid observability assumed | DEC-09 | ✅ Proven | none recommended |
| C2. no production claim from local logs | 12 §12.6; 13 §13.7 | ✅ Proven | evidence-class separation maintained (§19.11) |
| C3. sensitive payloads out of logs/evidence | SEC-01/02/03; 08 | ✅ Proven | allowlists + redaction + isolation |
| STOP: executor can implement | Phases 1-10; matrix | ✅ Proven | every budget has enforcement; every req traced to task+proof |

**All 9 deliverables + 3 constraints + stop condition: PROVEN.** No ❌/⬜ remains.

## 19.11 Evidence-class table (suite-required)

Distinguishes local-static / local-automated / browser-manual / provider-backed / hosted-production / inferred.

| Major claim | Evidence class | Justification |
|---|---|---|
| worker.ts has no try/catch / id / header echo | **local-static** (file read) | confirmed worker.ts:60-129 |
| AppError taxonomy + redact.ts coverage | **local-static** | confirmed app-error.ts, redact.ts |
| Retention unbounded; 7 rules; error-only log | **local-static** | confirmed retention-core.ts:180-268 |
| DO re-encodes bytes (:108); O(N) fan-out; no logging | **local-static** | confirmed collaboration-room.ts:108 |
| Budget vars never enforced (only echoed) | **local-static** | confirmed wrangler.jsonc:98-104 + grep |
| `with-action-errors.ts` logs without requestId | **local-static** | confirmed with-action-errors.ts:53-57 |
| wrangler has 3 sampling keys; traces currently ON | **local-static** | confirmed wrangler.jsonc:83-96 |
| `test` script = bun-native; `test:dom` = vitest | **local-static** | confirmed package.json + vitest.config.ts |
| request-id helper works (gen/validate/ALS) | **local-automated** (planned P-01) | not yet run |
| worker dispatch try/catch + header echo | **local-automated** (planned P-04) | not yet run |
| streaming mid-stream throw handled | **local-automated** (planned P-06) | not yet run |
| retention `budget_reached` guard fires | **local-automated** (planned P-09) | not yet run |
| DO broadcast cap truncates | **local-automated** (planned P-10) | not yet run |
| metrics allowlist rejects PII dims | **local-automated** (planned P-11) | not yet run |
| SA ALS propagation works | **local-automated** (planned P-03) | **riskiest** — not yet run; gated |
| instrumentation path redaction | **local-automated** (planned P-13) | not yet run |
| inbound id NOT persisted to D1 | **local-automated** (planned P-15) | not yet run |
| `x-request-id` on production 200/308/500 | **hosted-production** (manual curl) | deferred — 13_… |
| Workers Logs find-by-id / error-rate-by-route | **provider-backed** (dashboard) | manual — 12_… §12.6 |
| AE dataset readback | **provider-backed** | manual |
| `exceededCpu` on proposal export | **provider-backed** (operational watch) | residual RISK-07 |
| free-tier ceilings (10ms CPU, 50 subreq, 128MB, 100k D1, 200k logs, 100k AE) | **inferred** (from cited CF docs, Jul 2026 window) | 19.1 RQ-2; stale-checklist flags re-confirm |
| ALS visible in Server Actions (ASSUMP-01) | **inferred / unverified** | **gated by P-03**; fallback documented |
| native CF alerting weak on Free | **inferred** (docs + community) | RQ-6; RISK-15 |

## 19.12 Items handed back to authoring (from independent verifier)

| Item | Class | Severity | Status after revision |
|---|---|---|---|
| Test commands (12_… §12.2) | ❌ Contradicted | HIGH | ✅ fixed (P0-1) |
| Server-Action ALS propagation (ASSUMP-01) | ◑ Weak | MED-HIGH | ✅ promoted to gating P-03 (P1-1) |
| `Buffer.byteLength` in Worker (ASSUMP-07) | ◑ Weak | LOW | acceptable — gated by T-6.1 |
| Free-tier ceiling recency | ◑ Weak (inferred) | LOW | acceptable — stale-checklist |
| top-level sampling key duplicate | ⚠️ Incomplete | LOW → was P0 | ✅ fixed (P0-2) |

No item remains ❌ Contradicted or ⬜ Missing.

## 19.13 Cycle count

- Original authoring: 3 emulated critique-and-revision cycles (within 6-cap).
- This improvement task: 1 independent-adversarial + 1 independent-verification
  pass + 1 revision pass = 3 more meaningful cycles. **Total: 6 cycles** (at the
  suite cap). Remaining residuals are genuinely external (OPEN-01..05) or
  hosted-proof-deferred, not internally resolvable.

