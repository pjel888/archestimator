# 12 — Test and Validation Strategy

## Proof tiers (proportional)

| Claim class | Proof |
|---|---|
| DO lifecycle/branch behavior | real DO under `@cloudflare/vitest-pool-workers` (FR-01/02) |
| Presence keying/rehydrate | workers-pool test (FR-03) |
| Cap/rate-limit | workers-pool flood test (FR-04/05, SEC-02) |
| Reconnect/refresh | DOM test with fake timers (FR-06) |
| Cold-start/deploy-disconnect | workers-pool test (REL-01) |
| Telemetry redaction | unit test (REL-02) |
| Fanout/latency | synthetic Miniflare harness (TEST-01/PERF-01) — `inferred` |
| Hosted presence/reconnect/expiry | Playwright vs prod Worker (TEST-02) — only if OPEN-02 |
| Authz/identity preservation | existing tests stay green (SEC-01) |

## Known-red / flake ledger (mandatory format)

| Command | Date | Branch/source | Failure class | Narrower proof that replaces it |
|---|---|---|---|---|
| `bun run type-check` (default Node heap) | recorded 2026-07-06 in `.ai/03_plans/2026-07-06-Transition-And-Loading-UX-And-UI/22_PROOF_CONTRACTS_AND_KNOWN_RED_LEDGER.md`; still current 2026-07-07 | `main` | Node heap exhaustion (OOM) on the full project type-graph | `NODE_OPTIONS=--max-old-space-size=8192 bun run type-check` (heap workaround) — this is a **heap workaround**, not a known-red test; the command passes with the flag |
| `bun run test:dom` (whole suite) | recurring; `.ai/10_state/current-state.md` notes slow/hanging runs | `main` | occasionally slow/hanging (jsdom suite, `fileParallelism:false`, `testTimeout:30_000`) | run the realtime **subset** only: `bunx vitest run tests/vitest/*collab* tests/vitest/*realtime* --maxWorkers=1`; the new `test:do` project is invoked separately |

This plan adds `bun run test:do` (new, workers-pool) — run separately from `test:dom` to keep
timings predictable (respect the `2026-07-07-test-harness-stability-and-flake-budget` sibling
pack's quarantine policy if any new test flakes).

## Proof-contract rows (mandatory — one per planned proof)

| Proof ID | Req IDs | Impl unit | Layer | Fixture/input | Assertion | File target | Command/evidence | Red/green | Cleanup/skip |
|---|---|---|---|---|---|---|---|---|---|
| P-01 | FR-01 | T-1.2.1 | DO integration (workerd) | wrangler.test.jsonc binding; authorize+presence+close cycle | lifecycle runs green; rehydrate after wake | `tests/vitest/do/collaboration-room.lifecycle.test.ts` | `bun run test:do` | red before pool-workers wired; green after | none |
| P-02 | FR-02 | T-1.3.1 | DO integration | oversized msg, binary, bad json, long event, non-WS | each error code asserted | same/sibling file | `bun run test:do` | red on untested branches; green after | none |
| P-03 | FR-03 | T-2.1.1/T-2.3.1 | DO integration | two sockets same `sub`; hibernate→wake; untrack-while-auth | collapse + rehydrate + `hasOwn` invariant (AC-FR-03a/b/c) | `tests/vitest/do/presence-rehydrate.test.ts` | `bun run test:do` | red today; green after | none |
| P-04 | FR-04, SEC-02 | T-3.1.1 | DO integration | N+1 sockets | N+1th rejected pre-handshake (503, no HMAC) | `tests/vitest/do/cap-reject.test.ts` | `bun run test:do` | red today (no cap); green after | none |
| P-05 | FR-05 | T-4.1.1 | DO integration | spam broadcast + presence-track; rotate claimed userId | `rate_limited` under one verified `sub` (AC-FR-05a/b/c) | `tests/vitest/do/rate-cap.test.ts` | `bun run test:do` | red today; green after | none |
| P-06 | FR-06 | T-5.1.1/T-5.4.1/T-5.5.1 | DOM (fake timers) | virtual clock >300s; forced close | no `auth_failed`; reconnect+reauthz for all 3 hooks (AC-FR-06a/b/c) | extend `tests/vitest/project-collaboration-realtime.test.ts` + sibling | `bun run test:dom` (subset) | red today; green after | none |
| P-07 | FR-07 | T-6.1.1 | DO integration | silent socket + alarm advance | pruned; alarm cleared when empty (AC-FR-07a/b) | `tests/vitest/do/prune-alarm.test.ts` | `bun run test:do` | red today; green after | none |
| P-08 | REL-01 | T-10.1.1 (+T-5.5.1) | DO integration + DOM | eviction→msg; forced close | cold-start rehydrates; deploy-disconnect recovers (AC-REL-01a/b) | `tests/vitest/do/cold-start.test.ts`, `deploy-disconnect.test.ts` | `bun run test:do`, `bun run test:dom` | red today; green after | none |
| P-09 | REL-02 | T-7.1.1 | unit | synthesized `auth_refresh_failed` event | no secret/raw-path/token substring in output (AC-REL-02b) | `tests/vitest/realtime-telemetry-sink.test.ts` | `bun run test:dom` | red if PII leaks; green after redaction | none |
| P-10 | PERF-01, TEST-01 | T-8.1.1 | synthetic perf | N=cap sockets; 1000 broadcasts; 5 runs | p95 < budget; all N receive; >2× regression gate | `scripts/benchmark-realtime-fanout.ts` | `bun run perf:realtime-fanout` | red if p95>budget or N-receive fails | report gitignored; label `inferred` |
| P-11 | TEST-02 | T-9.1.1 | hosted browser (BLOCKED OPEN-02) | prod Worker; 2 clients; >300s | presence sync + reconnect + survive-expiry (AC-TEST-02a/b) | `scripts/verify-cloudflare-hosted-realtime-proof.ts` | `cf:verify-hosted-realtime` | red on scenario fail | skip if OPEN-02 declined; evidence redacted |
| P-12 | SEC-01 | (existing) | unit | unauthorized broadcast/presence; tampered envelope | `auth_required`/reject (AC-SEC-01a/b) | existing `cloudflare-collaboration-room-auth.test.ts`, `realtime-identity.test.ts` | `bun run test:dom` | **must stay green** (regression guard) | none |
| P-13 | SEC-02 | T-3.1.1 | DO integration | flood upgrades | no per-msg HMAC cost on rejected (AC-SEC-02a) | `tests/vitest/do/cap-before-authz.test.ts` | `bun run test:do` | red today; green after | none |
| P-14 | FR-04 (rollback) | T-3.3.1 | config review | `vars.ARCH_REALTIME_ROOM_CAP` present after impl | knob in `wrangler.jsonc`; `cloudflare-env.d.ts` regenerated | `wrangler.jsonc`, `cloudflare-env.d.ts` | `bun run cf:typegen` + review | red if knob absent | none |

## Test Execution Matrix

| Requirement | Test file path | Test type | Existing/new | Fixture/data setup | Command | Expected evidence | Known pre-existing reds | Owner |
|---|---|---|---|---|---|---|---|---|
| FR-01 | `tests/vitest/do/collaboration-room.lifecycle.test.ts` | DO integration (workerd) | new | wrangler.test.jsonc binding | `bun run test:do` | lifecycle green | pool-workers compat (R1) | impl |
| FR-02 | same | DO integration | new | n/a | `bun run test:do` | each error code asserted | none | impl |
| FR-03 | same + `tests/vitest/do/presence-rehydrate.test.ts` | DO integration | new | two sockets same user; hibernate/wake | `bun run test:do` | collapse + rehydrate | none | impl |
| FR-04 | `tests/vitest/do/cap-reject.test.ts` | DO integration | new | N+1 sockets | `bun run test:do` | 1013 on N+1 | none | impl |
| FR-05 | `tests/vitest/do/rate-cap.test.ts` | DO integration | new | spam broadcast + presence-track | `bun run test:do` | `rate_limited` on excess | none | impl |
| FR-06 | `tests/vitest/project-collaboration-realtime.test.ts` (extend) + sibling | DOM (fake timers) | extend | >300s virtual clock; forced close | `bun run test:dom` | no auth_failed; reconnect re-authz | none | impl |
| FR-07 | `tests/vitest/do/prune-alarm.test.ts` | DO integration | new | silent socket + alarm advance | `bun run test:do` | pruned; alarm cleared when empty | none | impl |
| FR-08 | (doc) | doc review | new | n/a | review | decision recorded | none | impl |
| REL-01 | `tests/vitest/do/cold-start.test.ts`, `tests/vitest/do/deploy-disconnect.test.ts` | DO integration + DOM | new | eviction; forced close | `bun run test:do`, `bun run test:dom` | recover | none | impl |
| REL-02 | `tests/vitest/realtime-telemetry-sink.test.ts` | unit | new | synthesized event | `bun run test:dom` | no secret/path in output | none | impl |
| PERF-01 | `scripts/benchmark-realtime-fanout.ts` (or vitest) | synthetic perf | new | N clients at cap | `bun run perf:realtime-fanout` (new) | p50/p95 report | R8 (Miniflare) | impl |
| TEST-01 | same harness | synthetic load | new | N clients | same | all N receive within budget | none | impl |
| TEST-02 | `scripts/verify-cloudflare-hosted-realtime-proof.ts` | hosted browser | new (BLOCKED OPEN-02) | prod Worker; 2 clients | `cf:verify-hosted-realtime` (new) | presence/reconnect/expiry pass | R11 | impl |
| SEC-01 | existing `cloudflare-collaboration-room-auth.test.ts`, `realtime-identity.test.ts`, `realtime-identity-actions-authz.test.ts` | unit | existing green | n/a | `bun run test:dom` | still green | none | impl |
| SEC-02 | `tests/vitest/do/cap-before-authz.test.ts` | DO integration | new | flood | `bun run test:do` | no HMAC cost on rejected | none | impl |
| OPS-01 | (doc/knob) | doc + config review | new | n/a | review | knob + runbook | none | impl |
| DOC-01 | (doc) | doc review | new | n/a | review | comments + decision | none | impl |

## Adversarial / UltraQA-style scenario matrix (full version in `19_…`)

Preview rows (full matrix with cleanup in `19_…`):

| ID | Scenario | Expected | Test |
|---|---|---|---|
| AQ-01 | unauthorized socket broadcasts | `auth_required`; no fanout | SEC-01 |
| AQ-02 | expired token mid-session | refresh; no `auth_failed` | FR-06 |
| AQ-03 | wrong-topic token | `auth_failed` | SEC-01 |
| AQ-04 | tampered envelope | receiver rejects | SEC-01 |
| AQ-05 | flood upgrades beyond cap | 1013 before authz | SEC-02 |
| AQ-06 | spam broadcast | `rate_limited` | FR-05 |
| AQ-07 | spam presence-track | `rate_limited` (R-SEC-04) | FR-05 |
| AQ-08 | hibernate→wake mid-session | presence rehydrates | FR-03 |
| AQ-09 | deploy disconnect | reconnect + re-authz | FR-06/REL-01 |
| AQ-10 | half-open socket | pruned by alarm | FR-07 |
| AQ-11 | two sockets same user | one presence entry | FR-03 |
| AQ-12 | cross-room presence leak | none | R-SEC-03 |
| AQ-13 | telemetry PII | redacted | REL-02 |
| AQ-14 | transport disabled in dev | no sockets | existing |

## Commands (verified against `package.json`)

- `bun run test:dom` → `vitest run --maxWorkers=1` (existing; runs all jsdom tests).
- `bun run test:do` → **new** (workers-pool project).
- `bun run type-check` → use `NODE_OPTIONS=--max-old-space-size=8192` (known-red ledger).
- `bun run perf:realtime-fanout` → **new**.
- `cf:verify-hosted-realtime` → **new** (only if OPEN-02).
- `git diff --check` for whitespace/conflicts.

## Known-red / flake considerations

- `bun run type-check` needs the heap flag (known-red ledger).
- `bun run test:dom` is documented as occasionally slow/hanging; the new `test:do` project
  should be invoked separately to keep timings predictable (respect the
  `2026-07-07-test-harness-stability-and-flake-budget` sibling pack).

## Manual QA

Only required for TEST-02 (hosted) and only if OPEN-02. Otherwise the matrix above is
automatable.
