# 12 — Test and Validation Strategy

## 12.1 Approach

Lightest proof that proves the claim (`AGENTS.md` proportional verification).
Most observability code is **pure logic or thin wrappers** → unit tests suffice.
The Worker dispatch + header echo needs an **integration test** (a real
`Request` through the wrapped `fetch`). Browser proof is **not required** (no UI
change). Provider proof (Workers Logs, AE, D1) is **hosted** and documented as a
manual/operational step, not claimed from local.

## 12.2 Test Execution Matrix

| Requirement | Test file path | Test type | Existing/new | Fixture/data setup | Command | Expected evidence | Known pre-existing reds | Owner |
|---|---|---|---|---|---|---|---|---|
| FR-01 (id gen/validate/reuse) | `tests/vitest/request-id.test.ts` | unit | new | id samples incl. CRLF, oversized, Unicode | `bun run test tests/vitest/request-id.test.ts` | valid id reused; invalid → fresh UUID; header injection rejected | none | impl |
| FR-01 (ALS context) | `tests/vitest/request-id.test.ts` | unit | new | nested async | same | `getRequestContext()` returns ctx inside `withRequestContext`, null outside | none | impl |
| FR-01/03 (header echo + try/catch) | `tests/vitest/worker-dispatch.test.ts` | integration | new | synthetic `Request` + throwing dispatch | `bun run test tests/vitest/worker-dispatch.test.ts` | every response has `x-request-id`; throw → 500 + logged | none | impl |
| FR-02 (cron/queue logs) | `tests/vitest/worker-cron-queue.test.ts` | unit | new | mock `ctx`/`batch` | `bun run test tests/vitest/worker-cron-queue.test.ts` | `cron.start`/`complete` + `queue.batch.start`/`complete` emitted | none | impl |
| FR-03 (dispatch unhandled) | covered by `worker-dispatch.test.ts` | integration | new | throwing route | same | `logAppError({event:"worker.fetch.unhandled"})` | none | impl |
| FR-04 (Server-Timing build/gate) | `tests/vitest/server-timing.test.ts` | unit | new | label samples incl. CRLF | `bun run test tests/vitest/server-timing.test.ts` | allowlist enforced; CRLF rejected; suppressed on `Cache-Control: public` | none | impl |
| FR-05 (route-error id) | extend `tests/vitest/route-error.test.ts` | unit | extend | error + context | `bun run test tests/vitest/route-error.test.ts` | `trace_id` equals context id | none | impl |
| FR-05 (action-error id) | extend `tests/vitest/with-action-errors.test.ts` (create if absent) | unit | new/extend | action throwing | same | log carries `request_id` | none | impl |
| REL-02 (retention budget) | `tests/vitest/retention-budget.test.ts` | unit | new | 50k-row fixture (mock D1) | `bun run test tests/vitest/retention-budget.test.ts` | stops at `maxDurationMs`/`maxRowsDeletedPerTick` with `budget_reached` | none | impl |
| REL-03 (DO cap + byteLength) | `tests/vitest/collaboration-room-broadcast.test.ts` | unit | new | 300 mock sockets | `bun run test tests/vitest/collaboration-room-broadcast.test.ts` | cap truncates; oversized → 1011; broadcast logs | none | impl |
| OBS-01 (metrics allowlist) | `tests/vitest/metrics.test.ts` | unit | new | PII-shaped dims | `bun run test tests/vitest/metrics.test.ts` | email/token/path rejected; enum accepted; AE error swallowed | none | impl |
| SEC-01 (redaction regression corpus) | extend `tests/vitest/redact.test.ts` | unit | extend | corpus of share/invite/token/email/jwt/bearer/hex/prompt-injection | `bun run test tests/vitest/redact.test.ts` | all redacted; existing assertions still pass | none | impl |
| SEC-01 (console.* audit) | n/a (artifact) | static | new | `rg` over `src/` | `rg "console\.(log|warn|error|info|debug)" src/` | artifact table in `19_…` | none | impl |
| TEST (perf evaluators) | per `09_…` table | unit bench | new | id/dispatch/metrics | `bun run test ...` | p99 thresholds met | none | impl |

## 12.3 Adversarial scenario matrix (ultraqa-style, for the implementation)

| ID | User/attacker model | Scenario | Setup | Command/harness | Expected signal | Status target | Evidence | Cleanup |
|---|---|---|---|---|---|---|---|---|
| AQ-1 | anonymous | inject `x-request-id: <script>` | curl with bad header | `request-id.test.ts` | rejected, fresh id | pass | unit | none |
| AQ-2 | anonymous | CRLF in inbound id | curl | `request-id.test.ts` | rejected | pass | unit | none |
| AQ-3 | anonymous | oversized inbound id (200 chars) | curl | `request-id.test.ts` | rejected | pass | unit | none |
| AQ-4 | internal | PII in metric dimension | call `writeMetric` w/ email | `metrics.test.ts` | throws/rejected, no AE write | pass | unit | none |
| AQ-5 | internal | CRLF in Server-Timing label | call `buildServerTimingHeader` | `server-timing.test.ts` | rejected | pass | unit | none |
| AQ-6 | collab member | oversized WS message | mock 4097-byte msg | `collaboration-room-broadcast.test.ts` | 1011 / `message_too_large` | pass | unit | none |
| AQ-7 | collab member | 300 sockets broadcast | 300 mock sockets | `collaboration-room-broadcast.test.ts` | truncated at cap, logged | pass | unit | none |
| AQ-8 | cron | backlog 50k rows | mock D1 SELECT loop | `retention-budget.test.ts` | `budget_reached` at cap | pass | unit | none |
| AQ-9 | anonymous | error on a route | throw in dispatch | `worker-dispatch.test.ts` | 500 + `trace_id` + logged | pass | unit | none |
| AQ-10 | anonymous | fast-path 308 redirect | curl `www.archestimator.com` | integration | header present on 308 | pass | manual (dev) | none |
| AQ-11 | attacker | retry-idempotency dup in queue | duplicate message | extend queue test | `ack("duplicate")` | pass | unit | none |
| AQ-12 | internal | AE binding missing | env without `ARCH_METRICS` | `metrics.test.ts` | swallowed, no request fail | pass | unit | none |

## 12.4 Validation commands (verify against actual `package.json` before running)

- `bun run type-check`
- `bun run lint`
- `bun run test` (full) or focused `bun run test tests/vitest/<file>`
- `bun run validate:agents` (if agent surfaces touched — not expected here)
- `bun run cf:typegen` (after AE binding)
- `wrangler deploy --dry-run` (config validity) — local only, not a production claim
- `wrangler tail` (manual, dev) — for cron/queue log proof

**Hosted/production proof is NOT claimed from these.** Workers Logs, AE, and D1
analytics are queried in the hosted dashboard (manual, documented in `13_…`).

## 12.5 Performance evaluator evidence location

- Bench artifacts: console output captured in CI/test logs.
- Duration measurements: `performance.now()` deltas in unit tests.
- No browser/Playwright artifacts (no UI change — per proportional policy).

## 12.6 Known gaps / deferred proof

- **Hosted Workers Logs query** (find-by-`x-request-id`, error-rate-by-route):
  manual operator step post-deploy; documented in `13_…`. Cannot be proven locally.
- **AE GraphQL readback**: manual operator step.
- **`exceededCpu`/`exceededMemory` outcome** on proposal export: operational
  watch post-deploy.
- **Native Cloudflare alerting**: weak on Free; realistic path is self-poll
  GraphQL from a free external cron (separate task, not blocking).
