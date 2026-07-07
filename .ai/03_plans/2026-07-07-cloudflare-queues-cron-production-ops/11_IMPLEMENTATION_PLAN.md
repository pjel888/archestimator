# 11 — Implementation Plan (authoritative execution guide)

> Planning-only pack. These are the tasks a **future executor** performs.
> Each task has an exact path/symbol or an explicit blocker classification.
> Implementation must NOT begin until the owner approves this pack (see README
> status). DB-INDEX and hosted-proof tasks are scoped inside the bound
> Cloudflare resources under standing authorization.

## Phase ordering

```
Phase 0 (decisions)  ──► Phase 1 (docs + guard test) ──► Phase 2 (test gaps)
                                                          │
Phase 3 (DB-INDEX, independent) ─────────────────────────┤
                                                          ▼
                                             Phase 4 (runbook)
                                                          │
Phase 5 (hosted proof, owner-gated) ◄─────────────────────┘
                                                          │
                                                          ▼
                                             Phase 6 (observation gate)
```

---

## Phase 1 — Documentation consistency + cron guard (FR-001, DOC-002, DOC-001 start)

### Implementation Unit T-001 — Fix AGENTS.md cron drift
- **Unit ID:** T-001
- **Requirement IDs:** FR-001, DOC-002
- **Goal:** Resolve the "two vs three cron triggers" documentation drift.
- **User/system outcome:** Agents/operators read a binding summary that matches the deployed cron config, so retention isn't silently invisible.
- **Scope:** One sentence in `AGENTS.md`.
- **Non-goals:** do not rewrite the binding-summary block; do not touch other docs here (`retention-schedule.md`, `current-state.md` are separate appends).
- **Files to modify:** `AGENTS.md` (line 40, binding-summary sentence ending "Two cron triggers (`0 3 * * *`, `15 3 * * *`).").
- **Existing patterns to follow:** the surrounding sentence already names bindings parenthetically; mirror that style.
- **Dependencies/sequencing:** none; parallel-safe (no file overlap with tests/migrations/runbook).
- **Data/API/security/perf implications:** none (docs-only).
- **Detailed test scenarios:** n/a (doc); verification is grep-based.
- **Verification command/evidence:** `git diff --check`; `rg -c "Two cron" AGENTS.md` → 0; `rg -c "Three cron" AGENTS.md` → 1.
- **Rollback/recovery:** `git revert` the one-line edit.
- **Stop/blocker condition:** none.
- **Done criteria:** sentence lists three triggers + DLQ name; grep checks pass.
- **Complexity:** Small.

### Implementation Unit T-002 — Cron union guard test
- **Unit ID:** T-002
- **Requirement IDs:** FR-001
- **Goal:** Pin the cron source of truth so future drift fails the test suite.
- **User/system outcome:** any edit that desynchronizes `wrangler.jsonc` from the code constants is caught in CI.
- **Scope:** one new (or extended) vitest.
- **Non-goals:** do not test cron *firing* (hosted); only the static union.
- **Files to create/modify:** `tests/vitest/cloudflare-cron-source-of-truth.test.ts` (new) OR extend `tests/vitest/cloudflare-scheduled-upload-jobs.test.ts`.
- **Existing patterns:** `cloudflare-scheduled-upload-jobs.test.ts` already reads `wrangler.jsonc` from disk (L31) — mirror that read.
- **Dependencies/sequencing:** none; parallel-safe.
- **Implications:** none (test-only).
- **Test scenarios:** (1) `new Set(wranglerCrons) === {CLOUDFLARE_UPLOAD_CLEANUP_CRON, CLOUDFLARE_UPLOAD_SCAN_CRON, "30 3 * * *"}`; (2) `worker.ts` source contains the literal `"30 3 * * *"` in the retention branch.
- **Verification:** `bun run test:dom -- cloudflare-cron-source-of-truth`.
- **Manual red-check (during impl):** temporarily edit `wrangler.jsonc` to 2 crons → test red; restore.
- **Rollback:** delete the test file.
- **Stop/blocker:** none.
- **Done criteria:** test green; manual red-check confirms it bites.
- **Complexity:** Small.

---

## Phase 2 — Close test gaps (TEST-001, TEST-002, FR-003, FR-004)

### Implementation Unit T-003 — Consumer exception + DLQ-boundary + minute-key + consumer-skip tests
- **Unit ID:** T-003
- **Requirement IDs:** TEST-001, FR-003, FR-004, API-001
- **Goal:** Close the untested branches of `runCloudflareUploadJobQueueBatch`.
- **User/system outcome:** the queue consumer's idempotency, retry, DLQ, and skip decisions are regression-protected.
- **Scope:** add cases (a)–(g) to one existing test file.
- **Non-goals:** do not change source behavior; do not test the worker `queue()` wrapper (that's T-004).
- **Files to modify:** `tests/vitest/cloudflare-upload-job-queue.test.ts`.
- **Existing patterns:** the file already uses `FakeQueueMessage` + `runCloudflareUploadJobQueueBatch` (L81+) — extend it.
- **Dependencies/sequencing:** none; parallel-safe (owns the file).
- **Implications:** none (test-only).
- **Detailed test scenarios:**
  - (a) **exception:** fetcher `throw`s → outcome `reason:"exception"`, `action:"retry"`, `message.retried===true`. (PROOF-EXC)
  - (b) **DLQ low boundary:** failed job at `attempts=2` (< `MAX_RETRIES=3`) → `deadLetterExpected===false`. (PROOF-DLQLO)
  - (c) **minute key boundary:** via `buildCloudflareUploadJobQueueMessages` with `enqueuedAt` `03:00:59Z` vs `03:01:00Z` → different `idempotencyKey`; same minute → same key. (PROOF-IDEMPMIN) — avoid exporting `buildIdempotencyKey`; test through the public builder.
  - (d) **cross-batch no-dedup:** two separate `runCloudflareUploadJobQueueBatch` calls with the same key → both execute (assert the per-batch `seenIdempotencyKeys` Set does not leak across calls). (PROOF-IDEMPXBAT)
  - (e) **missing-secret through consumer:** route-side skip → ack reason `"missing-secret"`. (PROOF-CONSNODSEC)
  - (f) **unmatched-cron through consumer:** body cron `99 9 * * *` → ack reason `"unmatched-cron"`. (PROOF-CONSUNMATCH)
  - (g) **malformed proof id:** `providerProof.id="x"` → `safeProviderProofId` rejects, no R2 receipt written. (PROOF-IDVALID)
- **Verification command/evidence:** `bun run test:dom -- cloudflare-upload-job-queue`.
- **Rollback:** delete the added `it` blocks.
- **Stop/blocker:** none.
- **Done criteria:** all 7 cases green; `bun run test:dom` overall green.
- **Complexity:** Medium.

### Implementation Unit T-004 — Worker handler invocation test
- **Unit ID:** T-004
- **Requirement IDs:** TEST-002
- **Goal:** Invoke the real `scheduled()` and `queue()` handlers (not source-grep).
- **User/system outcome:** a refactor that breaks cron/queue dispatch is caught.
- **Scope:** one new test file.
- **Non-goals:** do not test OpenNext fetch internals; mock the fetcher.
- **Files to create:** `tests/vitest/worker-handlers.test.ts`.
- **Existing patterns:** none directly (no existing worker.ts import test); use vitest `vi.mock`.
- **Dependencies/sequencing:** **DISCOVERY-REQUIRED sub-step** — before writing assertions, verify whether `.open-next/worker.js` exists at test time. Scope: `ls .open-next/worker.js` + check `cf:build` output. Stop condition: confirm presence OR confirm `vi.mock("./.open-next/worker.js", ...)` resolves the import. Expected evidence: the import either resolves or the mock is in place. No code change beyond the test. If discovery finds the file is always generated by `cf:build` and absent in a fresh `test:dom` run, the mock is the required path.
- **Implications:** none (test-only).
- **Test scenarios:**
  - `scheduled({cron:"0 3 * * *"}, env, fakeCtx)` → `fakeCtx.waitUntil` called; awaited promise resolves.
  - `scheduled({cron:"30 3 * * *"}, env, fakeCtx)` → retention branch hits the D1 spy (`runRetentionPassInD1` called with `env.ARCH_DB`).
  - `queue(fakeBatch, env, fakeCtx)` → `waitUntil` called; `runCloudflareUploadJobQueueBatch` summary shape returned.
- **Verification:** `bun run test:dom -- worker-handlers`.
- **Rollback:** delete the file.
- **Stop/blocker:** if the generated-import mock proves infeasible, fall back to a focused test of `runCloudflareScheduledUploadJobs`/`runRetentionPassInD1` dispatch wiring via a thin wrapper — record the fallback.
- **Done criteria:** `scheduled()` retention branch asserted; `queue()` wrapper asserted.
- **Complexity:** Medium (the mock is the hard part).

### Implementation Unit T-005 — Retention branch tests
- **Unit ID:** T-005
- **Requirement IDs:** TEST-001
- **Goal:** Cover the retention engine's untested branches.
- **User/system outcome:** a retention rule error or empty result set is correctly skipped without aborting the pass.
- **Scope:** extend one existing test file with (a)–(c).
- **Non-goals:** do not change retention rules (OPEN-DEC-007 is separate).
- **Files to modify:** `tests/vitest/compliance-retention-repository.test.ts`.
- **Existing patterns:** the file uses a `FakeD1` (L59+); extend it to throw / return empty.
- **Dependencies/sequencing:** none; parallel-safe.
- **Implications:** none (test-only).
- **Test scenarios:**
  - (a) **no-rows-skip:** `selectResult.results=[]` → `notes:"no rows past cutoff"`, `skipped:true`, no DELETE, no audit INSERT. (PROOF-RETNOROWS)
  - (b) **per-rule error:** `FakeD1.prepare` throws for one rule → that rule `skipped:true, notes:"error:*"`, other rules still apply+audit. (PROOF-RETRERR)
  - (c) **all 7 rules:** run `DEFAULT_RETENTION_RULES` through a seeded FakeD1 → 7 results, each with correct cutoff. (PROOF-RETALL7)
- **Verification:** `bun run test:dom -- compliance-retention-repository`.
- **Rollback:** delete added cases.
- **Stop/blocker:** none.
- **Done criteria:** (a)(b)(c) green.
- **Complexity:** Medium.

---

## Phase 3 — Retention `created_at` indexes (DATA-001, DB-INDEX)

### Implementation Unit T-006 — Migration 0039 + EXPLAIN proof
- **Unit ID:** T-006
- **Requirement IDs:** DATA-001 (decision D-INDEX, owner-approved-pending)
- **Goal:** Make retention purges use range scans instead of full scans.
- **User/system outcome:** the daily 03:30 UTC retention pass stays cheap as audit tables grow, avoiding a free-tier row-read spike.
- **Scope:** one additive migration (4 indexes) + EXPLAIN proof on preview + readback on remote.
- **Non-goals:** do NOT index `privacy_requests` (its existing `(status,created_at)`/`(request_kind,created_at)` indexes already cover the retention query); do not change retention SQL.
- **Files to create:** `migrations/0039_retention_created_at_indexes.sql`.
- **Existing patterns:** migrations are plain SQL, `IF NOT EXISTS`, header comment citing the requirement/plan (`0034` style).
- **Dependencies/sequencing:** sequential wrt deploy (apply before relying on it); independent of Phases 1–2. Preview → readback → remote under standing Cloudflare authorization.
- **Data implications:** additive only; no data change; reversible. See DB blueprint in `07`.
- **API/security implications:** none.
- **Performance implications:** retention SELECT rows-read drops full-scan→range; write cost on the 4 tables negligible (append-heavy audit tables, once-daily off-peak read).
- **Test scenarios / proof:**
  - PROOF-EXPLAIN: `EXPLAIN QUERY PLAN SELECT id FROM account_security_events WHERE created_at < ? LIMIT 500` on preview D1 → shows `USING INDEX idx_account_security_events_retention_created` (range), not `SCAN`. Same for the other 3 tables.
  - PROOF-IDXREADBACK: `PRAGMA index_list(account_security_events)` etc. on remote → 4 indexes present.
- **Verification command/evidence:** `bun run cf:build` (type); `wrangler d1 execute ARCH_DB --preview --command "EXPLAIN QUERY PLAN ..."`; `wrangler d1 execute ARCH_DB --remote --command "PRAGMA index_list(...)"`; write `evidence/retention-index-explain.json`.
- **Rollback/recovery:** `DROP INDEX IF EXISTS idx_*_retention_created;` (migration `0040` or manual remote SQL) — fully reversible, no data loss; SELECTs work without the index (just slower at scale).
- **Stop/blocker:** if EXPLAIN shows a full scan despite the index → investigate D1 stats/`ANALYZE`; do not claim success.
- **Done criteria:** EXPLAIN range-scan on preview + applied to remote + readback shows 4 indexes.
- **Complexity:** Small.
- **DB blueprint:** see `07` DB-INDEX (full).

---

## Phase 4 — Operator runbook (DOC-001, FR-002/005/006/008, REL-001/002, SEC-001)

### Task T-007 — Write OPERATIONS_RUNBOOK.md
- **Req:** DOC-001, FR-002, FR-005, FR-006, FR-008, REL-001, REL-002, SEC-001, ARCH-001/003, API-002.
- **Objective:** Single operator doc. **Target file:**
  `.ai/10_state/runbooks/queues-cron-retention-operations.md` (new; create the
  `runbooks/` dir if absent) — OR keep a copy in this plan pack and link from
  `13`. **Recommendation:** canonical live doc in `.ai/10_state/runbooks/`, with
  `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` in this pack summarizing + linking.
- **Sections (required):**
  1. Cron routing table (3 crons → what runs).
  2. Queue job taxonomy + message schema v1 + versioning rule.
  3. Idempotency contract (per-batch, minute key, cross-batch re-run).
  4. Retry & DLQ policy (3/60s/DLQ; DLQ moved by infra; `deadLetterExpected` is app flag).
  5. Dry-run & live-enable sequence.
  6. Secrets (names, fallback, rotation via `cf:sync-worker-secrets` with overlap).
  7. Backlog checks (SQL + thresholds).
  8. Alert thresholds table.
  9. DLQ operations (peek/inspect/replay/discard, idempotency check before replay, destructive discard needs owner sign-off).
  10. Failure recovery matrix.
  11. Hosted proof command sequence (FR-008).
  12. Retention schedule pointer + OPEN-DEC-004 note.
- **Validation:** doc review; cross-link check; no raw secrets.
- **Parallelization:** depends on decisions (Phase 0); can draft sections 1–6 in parallel with Phase 2.
- **Complexity:** Medium-Large (breadth, not depth).

---

## Phase 5 — Hosted provider proof (FR-008) — OWNER-GATED

### Task T-008 — Execute hosted proof sequence
- **Req:** FR-008, REL-003.
- **Objective:** Move `productionJobsMessagingReady` false→true.
- **Steps (runbook §11):**
  1. Confirm `CRON_SECRET` (+ route-specific secrets) present on the deployed Worker.
  2. `bun run cf:jobs-proof` → captures hosted JobsProof receipt, writes evidence JSON+MD.
  3. Confirm R2 `provider-proof/jobs/<id>.json` receipt written (consumer side).
  4. `bun run cf:queues-cron-proof` → merges jobs-runtime-proof; flips `productionJobsMessagingReady` if all sub-flags true.
  5. `bun run cf:release-gates` → confirm queues/cron/DLQ gate green.
- **Classification:** `BLOCKED-EXTERNAL` until owner authorizes a deploy/proof run against hosted (it touches hosted Worker state observation, not mutation — but proof execution against production is owner-gated per repo policy).
- **Validation:** hosted/provider-backed evidence (explicitly NOT local).
- **Parallelization:** sequential after deploy; owner-gated.
- **Complexity:** Medium.

---

## Phase 6 — Observation gate (REL-003) — TIME-BOXED

### Task T-009 — 30-day hosted observation
- **Req:** REL-003.
- **Objective:** Observe 30 days of hosted cron/D1 behavior; confirm retention ran daily, no over-deletion, DLQ stayed empty (or was drained), alert thresholds calibrated.
- **Classification:** `BLOCKED-EXTERNAL` (calendar time + hosted observation).
- **Validation:** `data_retention_events` rows for 30 consecutive UTC days; upload-ops dashboard stable.
- **Complexity:** n/a (waiting).

---

## Optional / decision-gated tasks (not on critical path)

### T-010 (D-RETDRY) — Retention dry-run env gate
- If approved: add `RETENTION_DRY_RUN` env check in `worker.ts:109-115` (or `retention-core.ts` call site) so retention can be forced to dry-run without a redeploy. Target: `worker.ts` scheduled() or `runRetentionPassInD1` options.
- Complexity: Small. Rollback: revert.

### T-011 (ARCH-002) — Shared job-auth helper
- If approved: extract `requireJobSecret(request, ...secretNames)` into `src/lib/cloudflare/internal-job-auth.ts`; update `upload-cleanup`, `upload-scan`, and proof routers. Add unit test for the helper.
- Complexity: Medium. Rollback: revert (routes keep their inline copy).

### T-012 (OPEN-DEC-007) — Retention registry completeness
- Owner decision per FR-009: implement missing 7 classes, mark platform-managed, or defer. If implement: add rules + migration CHECK enum already supports them (0034 enum has all 14). Complexity: Medium per class.

---

## Per-task durable-goal contract (representative; applies to all phases)

For Phase 3 (T-006) as the example:
- **Goal ID:** G-DBINDEX.
- **Objective:** retention purges use range scans.
- **Scope:** 4 indexes, preview→remote.
- **Requirements covered:** DATA-001.
- **Required evidence:** `EXPLAIN` range scan on preview; `PRAGMA index_list` readback on remote.
- **Completion audit:** EXPLAIN shows `USING INDEX`; audit table unaffected.
- **Checkpoint artifacts:** `evidence/retention-index-explain.json`.
- **Stop condition:** EXPLAIN proven on preview + applied to remote + readback.
- **Blocker condition:** EXPLAIN shows full scan despite index → investigate stats/ANALYZE.
- **Review gate:** `bun run cf:build`.
- **QA gate:** `bun run test:dom` (retention tests still green).

(Other phases follow the same shape; the executor expands each.)

## Files off-limits to this plan's tasks

- `wrangler.jsonc` cron/queue config (SoT; not modified).
- `.open-next/*` (generated).
- `supabase/migrations/*` (legacy).
- Unrelated source/tests/components.

## New files proposed (exact paths)

- `migrations/0039_retention_created_at_indexes.sql` (T-006)
- `.ai/10_state/runbooks/queues-cron-retention-operations.md` (T-007)
- `tests/vitest/worker-handlers.test.ts` (T-004) — if DISCOVERY resolves the import
- Optionally `src/lib/cloudflare/internal-job-auth.ts` (T-011)
- Optionally `tests/vitest/cloudflare-cron-source-of-truth.test.ts` (T-002 alt)
