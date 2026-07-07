# 12 — Test and Validation Strategy

## Test layers (current, verified from `package.json` + `vitest.config.ts`)

- `bun run test` → `bun test tests/unit` (Bun suite; does NOT cover queue/cron).
- `bun run test:dom` → `vitest run --maxWorkers=1` (jsdom; **this is where all queue/cron/retention tests live**).
- `bun run test:e2e` → Playwright (none cover queue/cron/retention today).
- Proof scripts: `bun run cf:queues-cron-proof`, `cf:jobs-proof`, `cf:release-gates`, `cf:d1-restore-rehearsal` (not unit tests; evidence generators).

## Test Execution Matrix

| Requirement | Test file path | Test type | Existing/new | Fixture/data setup | Command | Expected evidence | Known pre-existing reds | Owner |
|---|---|---|---|---|---|---|---|---|
| FR-001 | `tests/vitest/cloudflare-cron-source-of-truth.test.ts` (or extend `cloudflare-scheduled-upload-jobs.test.ts`) | unit | new (T-002) | reads `wrangler.jsonc` + constants | `bun run test:dom` | set equality 3 crons | none | executor |
| FR-003 minute key | `tests/vitest/cloudflare-upload-job-queue.test.ts` | unit | new (T-003c) | controlled `enqueuedAt` | `bun run test:dom` | keys differ across minute boundary; same within | none | executor |
| FR-003 cross-batch | `tests/vitest/cloudflare-upload-job-queue.test.ts` | unit | new (T-003d) | two batch calls | `bun run test:dom` | both execute | none | executor |
| FR-004 DLQ boundary | `tests/vitest/cloudflare-upload-job-queue.test.ts` | unit | new (T-003b) | attempts=2 fail | `bun run test:dom` | `deadLetterExpected=false` | none | executor |
| FR-004 retry existing | `tests/vitest/cloudflare-upload-job-queue.test.ts` | unit | existing | attempts=3 | `bun run test:dom` | retry + DLQ-expected | none | — |
| TEST-001 exception | `tests/vitest/cloudflare-upload-job-queue.test.ts` | unit | new (T-003a) | throwing fetcher | `bun run test:dom` | reason `exception`, retry | none | executor |
| TEST-001 consumer missing-secret | `tests/vitest/cloudflare-upload-job-queue.test.ts` | unit | new (T-003e) | route returns skip | `bun run test:dom` | ack `missing-secret` | none | executor |
| TEST-001 consumer unmatched-cron | `tests/vitest/cloudflare-upload-job-queue.test.ts` | unit | new (T-003f) | body cron `99 9` | `bun run test:dom` | ack `unmatched-cron` | none | executor |
| TEST-002 worker scheduled | `tests/vitest/worker-handlers.test.ts` | unit | new (T-004) | fake ctx + mocked openNext + D1 spy | `bun run test:dom` | waitUntil called, retention branch hit | generated-import mock needed | executor |
| TEST-001 retention no-rows | `tests/vitest/compliance-retention-repository.test.ts` | unit | new (T-005a) | FakeD1 empty results | `bun run test:dom` | skipped no-rows | none | executor |
| TEST-001 retention per-rule error | `tests/vitest/compliance-retention-repository.test.ts` | unit | new (T-005b) | FakeD1 throws for one rule | `bun run test:dom` | that rule skipped error, others run | none | executor |
| TEST-001 all 7 rules | `tests/vitest/compliance-retention-repository.test.ts` | unit | new (T-005c) | FakeD1 rows | `bun run test:dom` | 7 results | none | executor |
| API-001 cleanup route auth | `tests/vitest/upload-cleanup-route.test.ts` | unit | existing | — | `bun run test:dom` | 503/401 fail-closed | none | — |
| API-001 scan route auth | `tests/vitest/upload-scan-route.test.ts` | unit | existing | — | `bun run test:dom` | 503/401 fail-closed | none | — |
| SEC-002 no secret leak | `tests/vitest/cloudflare-queues-cron-proof-script.test.ts` | unit | existing | — | `bun run test:dom` | no secret in markdown | none | — |
| DATA-001 index | `migrations/0039_*` + manual EXPLAIN | DB/integration | new (T-006) | preview D1 | `wrangler d1 execute --command "EXPLAIN..."` | range scan | none | executor |
| DATA-002 retention audit | `tests/vitest/compliance-retention-repository.test.ts` | unit | existing | — | `bun run test:dom` | audit row written | none | — |
| FR-008 hosted proof | `.ai/.../evidence/*jobs-runtime-proof.json` | provider-backed | existing script, new run | secrets present | `bun run cf:jobs-proof` + `cf:queues-cron-proof` + `cf:release-gates` | `productionJobsMessagingReady=true` | needs hosted access | owner |

## Known-red / flake / unavailable checks

- No known-red `test:dom` for this area (the existing queue/cron/retention tests are green per `current-state.md`).
- T-004 (worker handler test) has a **DISCOVERY-REQUIRED** sub-step: whether `.open-next/worker.js` exists at test time. If the import fails, the executor must add a `vi.mock("./.open-next/worker.js", ...)` before the test can run. This is not a pre-existing red; it's an implementation-time resolution.
- Playwright E2E for queue/cron: intentionally NOT added — there is no browser-only claim; the queue/cron runtime is not user-facing. Per repo verification policy, this is the correct lighter path.

## Validation commands (verified to exist)

- `bun run test:dom` — primary.
- `bun run cf:build` — type/build for migration-touching phases.
- `bun run cf:check-deploy-dry-run` — validates wrangler config (crons/queues/bindings) without uploading.
- `bun run cf:queues-cron-proof` / `cf:jobs-proof` / `cf:release-gates` — evidence generators.
- `wrangler d1 execute ARCH_DB --remote --command "..."` — readback (under standing authz).
- `git diff --check` — for doc tasks.

## Proof-contract rows (required format)

Format (per `Improve-Plan-Prompt.md` §PHASE 3.11):
`Proof ID | Requirement IDs | Implementation unit | Layer | Fixture/input | Assertion | File target | Command/evidence | Red/green expectation | Cleanup/skip rule`

| Proof ID | Req IDs | Impl unit | Layer | Fixture/input | Assertion | File target | Command/evidence | Red/green | Cleanup/skip |
|---|---|---|---|---|---|---|---|---|---|
| PROOF-CRONSOT | FR-001 | T-002 | unit | `wrangler.jsonc` + constants | set equality {0 3,15 3,30 3} | `tests/vitest/cloudflare-cron-source-of-truth.test.ts` | `bun run test:dom` | green; red if wrangler edited to 2 crons | none |
| PROOF-IDEMPMIN | FR-003 | T-003c | unit | `enqueuedAt` 03:00:59 vs 03:01:00 | different keys | `tests/vitest/cloudflare-upload-job-queue.test.ts` | `bun run test:dom` | green | none |
| PROOF-IDEMPXBAT | FR-003 | T-003d | unit | two batch calls, same key | both execute (no cross-batch dedup) | same | `bun run test:dom` | green | in-memory |
| PROOF-DLQLO | FR-004 | T-003b | unit | failed job attempts=2 (<MAX) | `deadLetterExpected=false` | same | `bun run test:dom` | green | in-memory |
| PROOF-DLQHI | FR-004 | T-003b-existing | unit | failed job attempts=3 (==MAX) | `deadLetterExpected=true` | same | `bun run test:dom` | green (existing) | in-memory |
| PROOF-EXC | TEST-001 | T-003a | unit | throwing fetcher | reason `exception`, retry | same | `bun run test:dom` | green | in-memory |
| PROOF-CONSNODSEC | TEST-001 | T-003e | unit | route returns skip (no secret) | ack `missing-secret` | same | `bun run test:dom` | green | in-memory |
| PROOF-CONSUNMATCH | TEST-001 | T-003f | unit | body cron `99 9 * * *` | ack `unmatched-cron` | same | `bun run test:dom` | green | in-memory |
| PROOF-POISON | API-001 | (existing+T-003) | unit | invalid body | ack `invalid-message`, never executes | same | `bun run test:dom` | green (existing) | in-memory |
| PROOF-WORKERSCHED | TEST-002 | T-004 | unit | fake ctx + mocked openNext + D1 spy, cron `30 3` | waitUntil called; retention branch hit | `tests/vitest/worker-handlers.test.ts` | `bun run test:dom` | green | mock; DISCOVERY sub-step for opennext import |
| PROOF-RETNOROWS | TEST-001 | T-005a | unit | FakeD1 empty results | skipped "no rows"; no DELETE/audit | `tests/vitest/compliance-retention-repository.test.ts` | `bun run test:dom` | green | none |
| PROOF-RETRERR | TEST-001 | T-005b | unit | FakeD1 throws for one rule | that rule skipped `error:*`; others run | same | `bun run test:dom` | green | none |
| PROOF-RETALL7 | TEST-001 | T-005c | unit | FakeD1 rows | 7 results from `DEFAULT_RETENTION_RULES` | same | `bun run test:dom` | green | none |
| PROOF-RETAUDIT | DATA-002 | (existing) | unit | rows past cutoff | audit row written; no raw ids | same | `bun run test:dom` | green (existing) | none |
| PROOF-CLEANUPAUTH | API-001 | (existing) | unit | no/wrong Bearer | 503/401 fail-closed | `tests/vitest/upload-cleanup-route.test.ts` | `bun run test:dom` | green (existing) | none |
| PROOF-SCANAUTH | API-001 | (existing) | unit | no/wrong Bearer | 503/401 fail-closed | `tests/vitest/upload-scan-route.test.ts` | `bun run test:dom` | green (existing) | none |
| PROOF-NOLEAK | SEC-002 | (existing) | unit | proof-report build | no secret in markdown | `tests/vitest/cloudflare-queues-cron-proof-script.test.ts` | `bun run test:dom` | green (existing) | none |
| PROOF-IDVALID | API-001 | T-003g (new) | unit | `providerProof.id="x"` | `safeProviderProofId` rejects; no receipt | `tests/vitest/cloudflare-upload-job-queue.test.ts` | `bun run test:dom` | green | none |
| PROOF-EXPLAIN | DATA-001 | T-006 | DB/integration | preview D1, seeded rows | `EXPLAIN` shows `USING INDEX idx_*_retention_created` (range) | `evidence/retention-index-explain.json` | `wrangler d1 execute ARCH_DB --preview --command "EXPLAIN QUERY PLAN ..."` | range scan (not SCAN) | preview DB; reversible |
| PROOF-IDXREADBACK | DATA-001 | T-006 | provider-backed (read-only) | remote `ARCH_DB` post-apply | 4 indexes present in `PRAGMA index_list` | (operator record) | `wrangler d1 execute ARCH_DB --remote --command "PRAGMA index_list(...)"` | 4 indexes listed | none (read-only) |
| PROOF-HOSTEDJOBS | FR-008 | T-008 | provider-backed | secrets present, deployed Worker | `productionJobsMessagingReady=true` | `evidence/*jobs-runtime-proof.json` | `cf:jobs-proof` then `cf:queues-cron-proof` then `cf:release-gates` | true | none; owner-gated |
| PROOF-CRONDIDFIRE | REL-003 | T-009 | production (audit) | daily UTC | `data_retention_events` row for each of 30 days | (observation log) | D1 query daily | 30/30 days | none |

## Known-red / flake / unavailable validation ledger

No broad command is known-red for this area. `bun run test:dom` (vitest
serial, `--maxWorkers=1`) is the primary gate and is green for queue/cron/retention
per `current-state.md`. If it goes red during implementation, the executor must
capture the command, date, branch, failure excerpt, and run the narrower focused
test name instead (e.g. `bun run test:dom -- cloudflare-upload-job-queue`).

Playwright E2E for queue/cron: intentionally NOT added — no browser-only claim;
queue/cron runtime is not user-facing (per repo verification policy). `bun run
validate`/`bun run build` are reserved for the higher-risk slices (migration
apply, shared-auth refactor) per AGENTS.md iteration bias, not required for
doc/test-only tasks.

## Adversarial QA (future implementation)

See `19` UltraQA matrix (UQ-1…UQ-12). Future implementation must cover: poison
messages, DLQ saturation, missing-secret fail-closed through the consumer,
cross-batch duplicate execution, retention per-rule error isolation, oversized
batch LIMIT clamp, malformed proof id rejection, worker-handler refactor break.

## Proof boundary honesty

- Local `cf:queues-cron-proof` proves **local simulation only** (`providerBacked=false`
  until a hosted receipt is merged). It is not provider/production proof.
- `data_retention_events` rows on remote D1 are provider-backed evidence a
  retention pass ran, but not proof of *correctness* (no over-deletion check
  beyond the rule SQL).
- Hosted `cf:jobs-proof` is provider-backed but depends on secrets/deploy —
  owner-gated.
