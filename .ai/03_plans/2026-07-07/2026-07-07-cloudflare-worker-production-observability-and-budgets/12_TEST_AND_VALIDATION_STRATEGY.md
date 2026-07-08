# 12 — Test and Validation Strategy

> **Revision 2 (post-adversarial).** Corrected the test-runner commands
> (P0-1): this repo has **two** test runners — `bun run test` (bun-native, over
> `tests/unit/`) and `bun run test:dom` (vitest, over `tests/vitest/**` per
> `vitest.config.ts`, jsdom env, `@` alias). All new observability tests are
> vitest files under `tests/vitest/` and **must** be invoked with
> `bun run test:dom <file>` (or `bunx vitest run <file>`). Using `bun run test`
> for them is wrong. Promoted to the required proof-contract schema (P1-7).
> Added streaming/SSE proof (P1-4), Server-Action ALS gating proof (P1-1),
> instrumentation-path redaction proof (P1-2), and inbound-id-not-persisted
> proof (P1-5).

## 12.1 Approach

Lightest proof that proves the claim (`AGENTS.md` proportional verification).
Most observability code is **pure logic or thin wrappers** → unit tests suffice.
The Worker dispatch + header echo needs an **integration test** (a real
`Request` through the wrapped `fetch`). Browser proof is **not required** (no UI
change). Provider proof (Workers Logs, AE, D1) is **hosted** and documented as a
manual/operational step, not claimed from local.

**Runner contract (verified from `package.json` + `vitest.config.ts`):**

| Runner | Script | Scope | Globals/env |
|---|---|---|---|
| bun-native | `bun run test` → `bun test tests/unit` | `tests/unit/**/*.test.ts` | bun test globals; **no** jsdom |
| vitest | `bun run test:dom` → `vitest run --maxWorkers=1` | `tests/vitest/**/*.test.{ts,tsx}` | jsdom, `globals:true`, `@→./src` alias, `vi` from `"vitest"` |

**Never cross the runners.** New observability tests are vitest files → use
`bun run test:dom <file>` (the existing `perf:profile-peak-load` script confirms
this pattern: `vitest run tests/vitest/<file>`).

## 12.2 Proof-contract table (required schema)

`Proof ID | Requirement IDs | Implementation unit | Layer | Fixture/input | Assertion | File target | Command/evidence | Red/green expectation | Cleanup/skip rule`

| Proof ID | Req IDs | Impl unit | Layer | Fixture/input | Assertion | File target | Command | Red/green | Cleanup/skip |
|---|---|---|---|---|---|---|---|---|---|
| **P-01** | FR-01 | T-1.1 request-id | unit | valid id (`wsh_abc`), invalid (CRLF, `<script>`, 200-char, Unicode) | valid reused; invalid → fresh UUIDv4; regex `^[A-Za-z0-9._:-]{1,128}$` enforced | `tests/vitest/request-id.test.ts` | `bun run test:dom tests/vitest/request-id.test.ts` | red: no validation; green: validation rejects | none |
| **P-02** | FR-01 | T-1.1 ALS | unit | nested async via `withRequestContext` | `getRequestContext()` returns ctx inside, `null` outside | same file | same | red: context leaks/null inside; green: scoped correctly | none |
| **P-03** | FR-01/FR-05 | T-1.1+T-3.2 **SA ALS gating** | integration | invoke a `with-action-errors`-wrapped fn inside `withRequestContext({requestId:"req_123"})` | logged `request_id === "req_123"` inside context; `null` outside | `tests/vitest/server-action-context.test.ts` (new) | `bun run test:dom tests/vitest/server-action-context.test.ts` | **red blocks Phase 3**: if ALS is lost across OpenNext SA boundary, this fails → invoke fallback (SA derives id from RSC POST headers) | none; **if red, escalate to architecture fallback before T-3.2 lands** |
| **P-04** | FR-01/03 | T-2.1+T-2.2 header echo | integration | synthetic `Request` through wrapped `fetch`, incl. 308 fast-path + throwing route | every response (200/308/4xx/5xx, fast-path or not) has `x-request-id` header; throw → 500 + logged | `tests/vitest/worker-dispatch.test.ts` | `bun run test:dom tests/vitest/worker-dispatch.test.ts` | red: header missing on 308 or no log on throw; green: all paths | none |
| **P-05** | FR-02 | T-2.3+T-4.1+T-4.2 cron/queue | unit | mock `ctx`/`batch`/`ScheduledControllerLike` | `cron.start`/`cron.complete` + `queue.batch.start`/`queue.batch.complete` emitted with `cronRunId`/`batchId` | `tests/vitest/worker-cron-queue.test.ts` | `bun run test:dom tests/vitest/worker-cron-queue.test.ts` | red: missing events; green: all 4 events w/ ids | none |
| **P-06** | FR-03 | T-2.1 **streaming/SSE mid-stream throw** | integration | a route returning `new Response(ReadableStream)` that throws after first chunk | error caught inside stream, logged with `request_id`; stream closes cleanly (no raw 200+garbage) | `tests/vitest/worker-stream-error.test.ts` (new) | `bun run test:dom tests/vitest/worker-stream-error.test.ts` | red: client gets truncated 200 + no log; green: clean close + correlated log | none |
| **P-07** | FR-04 | T-8.1 Server-Timing | unit | labels incl. CRLF (`total;dur=1\r\nEvil:1`), `Cache-Control: public`/`no-store` response | allowlist `^(total\|db\|r2\|upstream\|do\|queue\|cron)$` enforced; CRLF rejected; suppressed on cacheable/auth | `tests/vitest/server-timing.test.ts` | `bun run test:dom tests/vitest/server-timing.test.ts` | red: CRLF injected / header on cacheable; green: rejected + suppressed | none |
| **P-08** | FR-05 | T-3.1 route-error id | unit | error thrown inside `withRequestContext` | `trace_id` === context `requestId` | extend `tests/vitest/route-error.test.ts` | `bun run test:dom tests/vitest/route-error.test.ts` | red: `err_*` used instead of context id; green: context id | none |
| **P-09** | REL-02 | T-5.1 retention budget | unit | mock D1 SELECT loop returning 50k rows; `maxDurationMs:50, maxRowsDeletedPerTick:1000` | stops with `budget_reached`; per-rule `retention.rule` events logged | `tests/vitest/retention-budget.test.ts` | `bun run test:dom tests/vitest/retention-budget.test.ts` | red: runs unbounded; green: stops at budget | none |
| **P-10** | REL-03 | T-6.1 DO cap + byteLength | unit | 300 mock sockets; 4097-byte message | broadcast truncated at `MAX_BROADCAST_TARGETS`, `broadcast_truncated` logged; oversized → 1011 `message_too_large` | `tests/vitest/collaboration-room-broadcast.test.ts` | `bun run test:dom tests/vitest/collaboration-room-broadcast.test.ts` | red: all 300 sent / double-encode; green: capped + single length | none |
| **P-11** | OBS-01 | T-8.3 metrics allowlist | unit | dims: `philip@example.com`, `eyJ...`, `/share/abc`, 256-char string; valid enums | PII-shaped rejected (no AE write); enums accepted; AE write error swallowed | `tests/vitest/metrics.test.ts` | `bun run test:dom tests/vitest/metrics.test.ts` | red: PII written to AE; green: rejected + swallowed | none |
| **P-12** | OBS-01 | T-8.3 AE binding absent | unit | env without `ARCH_METRICS` binding | `writeMetric` no-ops/swallows; request unaffected | `tests/vitest/metrics.test.ts` (add case) | same | red: throws to request path; green: swallowed | none |
| **P-13** | SEC-01 | T-9.1+T-3.3 **instrumentation path redaction** | unit | simulate edge `onRequestError` with `path:"/api/share/<TOKEN>"`, `path:"/invite/<TOKEN>"` | emitted line does NOT contain the raw token; token replaced with `[REDACTED_TOKEN]` | `tests/vitest/instrumentation-redaction.test.ts` (new) | `bun run test:dom tests/vitest/instrumentation-redaction.test.ts` | red: raw token in `console.error` line; green: redacted | none |
| **P-14** | SEC-01 | redact.ts regression corpus | unit | corpus: emails, share/invite paths, JWT (eyJ), Bearer, hex≥32, prompt-injection, query secrets | all redacted; existing assertions still pass | extend `tests/vitest/redact.test.ts` | `bun run test:dom tests/vitest/redact.test.ts` | red: any token/PII passes through; green: all redacted | none |
| **P-15** | SEC-01 (T-06) | **inbound id not persisted to D1 audit** | integration | attacker sends `x-request-id: "evil-tracking-id"`; action triggers `recordAccountSecurityEvent` | D1 audit row `request_id` column does NOT contain `"evil-tracking-id"` (uses internal generated id) | `tests/vitest/inbound-id-isolation.test.ts` (new) | `bun run test:dom tests/vitest/inbound-id-isolation.test.ts` | red: attacker id persisted; green: internal id persisted | none |
| **P-16** | TEST (perf) | per `09_…` §9.2 | unit bench | id/dispatch/metrics | p99 thresholds met (id <0.5ms, dispatch <1ms added, metrics <0.5ms) | `tests/vitest/observability-perf.test.ts` (new) | `bun run test:dom tests/vitest/observability-perf.test.ts` | red: over threshold; green: under | none |
| **P-17** | SEC-01 | T-9.1 console.\* audit artifact | static | `rg` over `src/` | artifact table classifies every `console.*` as logger-routed or user-data-free | n/a (artifact in `19_…` §19.9) | `rg -n "console\.(log\|warn\|error\|info\|debug)" src/` | n/a (artifact, not red/green) | none |

## 12.3 Adversarial scenario matrix (ultraqa-style, for the implementation)

| ID | User/attacker model | Scenario | Setup | Command/harness | Expected signal | Status target | Evidence | Cleanup |
|---|---|---|---|---|---|---|---|---|
| AQ-1 | anonymous | inject `x-request-id: <script>` | curl bad header | P-01 | rejected, fresh id | pass | unit | none |
| AQ-2 | anonymous | CRLF in inbound id | curl | P-01 | rejected | pass | unit | none |
| AQ-3 | anonymous | oversized inbound id (200 chars) | curl | P-01 | rejected | pass | unit | none |
| AQ-4 | internal | PII in metric dimension | `writeMetric` w/ email | P-11 | rejected, no AE write | pass | unit | none |
| AQ-5 | internal | CRLF in Server-Timing label | `buildServerTimingHeader` | P-07 | rejected | pass | unit | none |
| AQ-6 | collab member | oversized WS message | mock 4097-byte msg | P-10 | 1011 / `message_too_large` | pass | unit | none |
| AQ-7 | collab member | 300 sockets broadcast | 300 mock sockets | P-10 | truncated at cap, logged | pass | unit | none |
| AQ-8 | cron | backlog 50k rows | mock D1 SELECT loop | P-09 | `budget_reached` at cap | pass | unit | none |
| AQ-9 | anonymous | error on a route | throw in dispatch | P-04 | 500 + `trace_id` + logged | pass | unit | none |
| AQ-10 | anonymous | fast-path 308 redirect | curl `www.archestimator.com` | integration (manual dev) | header present on 308 | pass | manual | none |
| AQ-11 | attacker | retry-idempotency dup in queue | duplicate message | extend P-05 | `ack("duplicate")` | pass | unit | none |
| AQ-12 | internal | AE binding missing | env without `ARCH_METRICS` | P-12 | swallowed, no request fail | pass | unit | none |
| **AQ-13** | attacker | **inbound id persisted to D1 audit** | attacker-chosen valid id | **P-15** | **attacker id NOT in D1 row** | pass | unit | none |
| **AQ-14** | anonymous | **error on `/api/share/<token>` → `onRequestError`** | induced error | **P-13** | **token redacted in log** | pass | unit | none |
| **AQ-15** | anonymous | **SSE/AI stream throws mid-stream** | stream throws after first chunk | **P-06** | **clean close + correlated log, no raw 200** | pass | unit | none |
| **AQ-16** | collab member | Server Action error → log correlation | SA throws inside context | **P-03** | **`request_id` non-null in log** | pass | unit | none |

## 12.4 Validation commands (verified against `package.json`)

- `bun run type-check` — TypeScript (`tsc --noEmit`)
- `bun run lint` — eslint
- **`bun run test`** — bun-native over `tests/unit/` (for any unit tests placed there)
- **`bun run test:dom`** — vitest over `tests/vitest/**` (for all new observability tests; use `bun run test:dom <file>` to focus)
- `bun run validate` — full gate (`type-check && lint && lint:design-system && lint:design && test && test:dom`); use only when broad regression is justified
- `bun run cf:typegen` — regenerate `cloudflare-env.d.ts` after the AE binding (T-7.2)
- `wrangler deploy --dry-run` — config validity (local only; not a production claim)
- `wrangler tail` — manual, dev, for cron/queue log proof
- `bun run cf:release-gates` / `bun run cf:check-readiness` — existing release-gate scripts (consult before production)

**Known broad-command posture:** none of these are known-red for the
observability scope. If `bun run validate` is slow/heavy, the focused
`type-check + test:dom <file>` is the proportional substitute (per `AGENTS.md`).

**Hosted/production proof is NOT claimed from these.** Workers Logs, AE, and D1
analytics are queried in the hosted dashboard (manual, documented in `13_…`).

## 12.5 Performance evaluator evidence location

- Bench artifacts: console output captured in CI/test logs (P-16).
- Duration measurements: `performance.now()` deltas in unit tests.
- No browser/Playwright artifacts (no UI change — per proportional policy).

## 12.6 Known gaps / deferred proof

- **Hosted Workers Logs query** (find-by-`x-request-id`, error-rate-by-route):
  manual operator step post-deploy; documented in `13_…`. Cannot be proven locally.
- **AE GraphQL readback**: manual operator step.
- **`exceededCpu`/`exceededMemory` outcome** on proposal export: operational
  watch post-deploy (RISK-07).
- **Native Cloudflare alerting**: weak on Free; realistic path is self-poll
  GraphQL from a free external cron (separate task, not blocking — see `13_…` §13.5).
