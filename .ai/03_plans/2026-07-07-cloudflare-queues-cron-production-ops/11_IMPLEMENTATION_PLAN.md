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

### Task T-002 — Add cron union guard test
- **Req:** FR-001.
- **Objective:** Pin the cron SoT so future drift fails CI.
- **Target file:** `tests/vitest/cloudflare-scheduled-upload-jobs.test.ts` (extend existing) OR a new `tests/vitest/cloudflare-cron-source-of-truth.test.ts`.
- **What it asserts:** `new Set([...wranglerCrons]) === new Set([CLOUDFLARE_UPLOAD_CLEANUP_CRON, CLOUDFLARE_UPLOAD_SCAN_CRON, "30 3 * * *"])` AND the worker.ts retention branch references `"30 3 * * *"`.
- **Validation:** `bun run test:dom`.
- **Acceptance:** test green; temporarily editing `wrangler.jsonc` to 2 crons makes it red (manual check during implementation).
- **Parallelization:** parallel-safe.
- **Complexity:** Small.

---

## Phase 2 — Close test gaps (TEST-001, TEST-002, FR-003, FR-004)

### Task T-003 — Consumer exception + DLQ-boundary + minute-key tests
- **Req:** TEST-001, FR-003, FR-004.
- **Objective:** Add focused vitest cases to `tests/vitest/cloudflare-upload-job-queue.test.ts`:
  - (a) fetcher `throw`s → outcome `reason:"exception"`, `action:"retry"`, message.retried true.
  - (b) failed job at `attempts=2` (< MAX_RETRIES) → `deadLetterExpected=false`.
  - (c) `buildIdempotencyKey` at `03:00:59Z` vs `03:01:00Z` → different keys; same minute → same key.
  - (d) two same-key messages in **separate** `runCloudflareUploadJobQueueBatch` calls → both execute (no cross-batch dedup), asserting the per-batch Set is reset.
  - (e) consumer with no secret → ack reason `"missing-secret"` (route-side skip).
  - (f) consumer with unmatched cron body → ack reason `"unmatched-cron"`.
- **Target file:** `tests/vitest/cloudflare-upload-job-queue.test.ts`.
- **Target symbols:** `runCloudflareUploadJobQueueBatch`, `buildCloudflareUploadJobQueueMessages`, `buildIdempotencyKey` (export it or test via `buildCloudflareUploadJobQueueMessages` with controlled `enqueuedAt`).
- **Validation:** `bun run test:dom`.
- **Parallelization:** parallel-safe (test file owned by this task).
- **Complexity:** Medium.
- **Risks:** exposing `buildIdempotencyKey` if not exported — prefer testing through `buildCloudflareUploadJobQueueMessages` to avoid changing source exports.

### Task T-004 — Worker handler invocation test
- **Req:** TEST-002.
- **Objective:** Import `worker.ts` default export; invoke `scheduled({cron:"0 3 * * *"}, env, fakeCtx)` and `scheduled({cron:"30 3 * * *"}, ...)` and `queue(fakeBatch, env, fakeCtx)`; assert `fakeCtx.waitUntil` was called and the awaited promise resolves with the expected summary shape.
- **Target file:** new `tests/vitest/worker-handlers.test.ts`.
- **Challenge (executor note):** `worker.ts` imports `./.open-next/worker.js` which is generated by `cf:build`. The test must either (a) mock/stub that import via vitest `vi.mock`, or (b) guard the import. **DISCOVERY-REQUIRED** if the generated file is absent in the test env — the executor must first verify whether `.open-next/worker.js` exists at test time or needs a build step. Stop condition: a test that imports the default export and invokes the handlers without a real OpenNext fetch (mock the fetcher path).
- **Validation:** `bun run test:dom`.
- **Acceptance:** `scheduled()` retention branch (cron `30 3`) is asserted to call `runRetentionPassInD1` (mock the D1 binding to a spy).
- **Parallelization:** parallel-safe.
- **Complexity:** Medium (mocking the generated import is the hard part).

### Task T-005 — Retention branch tests
- **Req:** TEST-001.
- **Objective:** Extend `tests/vitest/compliance-retention-repository.test.ts`:
  - (a) no-rows-skip branch (`selectResult.results=[]` → `notes:"no rows past cutoff"`, `skipped:true`, no DELETE, no audit).
  - (b) per-rule error branch (FakeD1.prepare throws for one rule) → that rule `skipped:true, notes:"error:*"`, other rules still apply.
  - (c) run `DEFAULT_RETENTION_RULES` (all 7) through a FakeD1 and assert each produces a result (currently only a synthetic `testRule` is run).
- **Target file:** `tests/vitest/compliance-retention-repository.test.ts`.
- **Validation:** `bun run test:dom`.
- **Parallelization:** parallel-safe.
- **Complexity:** Medium.

---

## Phase 3 — Retention `created_at` indexes (DATA-001, DB-INDEX)

### Task T-006 — Create migration 0039
- **Req:** DATA-001. Decision: D-INDEX (assumed approved).
- **Objective:** Add standalone `created_at` indexes for the 4 tables that need them (per `07` revision: NOT `privacy_requests`).
- **Target file:** `migrations/0039_retention_created_at_indexes.sql`.
- **SQL:** as in `07` DB-INDEX (4 `CREATE INDEX IF NOT EXISTS`), with a header comment citing DATA-001 / DB-INDEX.
- **Validation:** `bun run cf:build` (type); apply to preview D1; `EXPLAIN QUERY PLAN` shows range scan; readback `PRAGMA index_list`.
- **Apply to remote:** under standing Cloudflare authorization, after preview proof.
- **Rollback:** `DROP INDEX IF EXISTS idx_*_retention_created;` (migration `0040` if needed, or manual).
- **Parallelization:** sequential wrt deploy (must be applied before a deploy that relies on it); independent of Phases 1–2.
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
