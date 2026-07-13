# 11 — Implementation Plan

> **This is the implementation start document.** Phased, dependency-aware.
> Every task has a stable ID, exact target paths/symbols, validation, and
> parallelization classification. **Nothing here is implemented by the planning
> task** — this is the guide for a future executor.

## Phase order and parallelization

| Phase | Objective | Parallelizable? | Depends on |
|---|---|---|---|
| 1 | D1 restore target isolation + provider-backed rehearsal harness | Phase 1 & 2 are **parallel-safe** (disjoint file scopes) | `wrangler.jsonc` (read) |
| 2 | R2 object inventory + reconciliation | parallel with 1 | `r2-storage-provider.ts` (reuse), `migrations/0010` (read) |
| 3 | Selective R2 export/restore drill | sequential | 2 |
| 4 | RTO/RPO contract + failure drill matrix | sequential | 1, 3 |
| 5 | Operator runbook + evidence ledger + local-vs-provider boundary | sequential | 1–4 |

## Cross-cutting rules for every task

- **No env reads for secrets**; rely on wrangler auth (`cf:check-wrangler-auth`
  already verifies scoped access).
- **Redact** account ids to prefixes, sample object keys, never persist raw
  object bytes beyond the drill.
- **Mirror the existing report shape** (`{ generatedAt, mode, sources,
  commands, …Ready gates, blockers, note }`) for consistency.
- **Reuse** `assertSafeLogicalBucket` / `assertSafeStoragePath` from
  `r2-storage-provider.ts` for any R2 key handling.
- **Clean up** all temp artifacts (`mkdtempSync` + `rmSync`), as the existing
  rehearsal does.
- **No branch/worktree** creation; coordinate via file-scope ownership in a
  ledger; re-`git status` before edits.

---

## Phase 1 — D1 restore target isolation + provider-backed rehearsal harness

**Objective**: Make destructive-restore-against-production impossible
(assertion), and define (optionally run, OPEN-01) a provider-backed
export→reimport drill into an isolated D1 DB.

**Requirements addressed**: REQ-D1-01, REQ-D1-02, REQ-D1-03, REQ-D1-04,
REQ-SEC-02.

### TASK-101 — Target-isolation pre-flight script
- **Requirement IDs**: REQ-D1-02, REQ-SEC-02.
- **Objective**: A CLI script that parses `wrangler.jsonc`, reads the operator-
  supplied destination `database_id`, and hard-aborts if it equals the
  production id `9bdb29bb-…`.
- **Why**: the catastrophic failure mode is a destructive restore/import into
  prod. This must be a script-level assertion, not advice.
- **Target path (new)**: `scripts/generate-cloudflare-d1-restore-target-isolation.ts`.
- **Target symbols (new)**: `parseWranglerD1Ids()`, `assertTargetIsolated()`,
  exported `buildTargetIsolationReport()`.
- **Reuses**: `wrangler.jsonc` (read-only); no existing symbol changed.
- **Inputs/dependencies**: a destination id (env or arg), `wrangler.jsonc`.
- **Instructions**: parse `wrangler.jsonc` JSONC (strip comments) → extract
  `d1_databases[0].database_id` (prod) and `preview_database_id`. Compare to
  the operator-supplied destination. Emit
  `{ prodId: <prefix>, destId: <prefix>, isolated: boolean, aborted: boolean }`.
  Exit non-zero if `destId === prodId`.
- **Failure cases**: missing/malformed `wrangler.jsonc`, missing destination
  arg, dest == prod (abort), dest unknown (warn).
- **Tests to add**: `scripts/__tests__/d1-restore-target-isolation.test.ts` —
  feeds prod id (assert abort), preview id (assert ok), unknown id (assert
  warn), malformed config (assert error).
- **Validation**: `bun test scripts/__tests__/d1-restore-target-isolation.test.ts`;
  `bun run type-check`.
- **Completion evidence**: test green + a sample report JSON in `evidence/`.
- **Parallelization**: parallel-safe (disjoint file).
- **Complexity**: Small.

### TASK-102 — Provider-backed D1 rehearsal variant (OPEN-01 gated, do not execute in plan)
- **Requirement IDs**: REQ-D1-04.
- **Objective**: Extend `generate-cloudflare-d1-restore-rehearsal.ts` with an
  optional provider-backed path: export from an isolated staging DB → reimport
  into a second isolated DB → verify. Default stays local-only.
- **Why**: hosted readiness cannot be proven locally; but the provider path
  must be owner-approved (OPEN-01).
- **Target path (modify)**: `scripts/generate-cloudflare-d1-restore-rehearsal.ts`.
- **Target symbols**: add `buildProviderBackedRehearsal(opts)` gated by
  `DRILL_PROVIDER_BACKED=1` + `OPEN01_APPROVED=1`; keep
  `buildLocalSqliteRehearsal()` as the default.
- **Inputs**: staging DB name, second isolated DB name, both ≠ prod.
- **Instructions**: reuse the target-isolation assertion (TASK-101); run
  `wrangler d1 export <STAGING> --remote --output=…` →
  `wrangler d1 execute <TARGET> --remote --file=…` → run the same
  row/checksum/FK/authz-denial gates; set `providerBacked: true` only on this
  path.
- **Failure cases**: wrangler 401/403, partial import (drop target + restart,
  never resume), quota throttle.
- **Tests to add**: the local path test stays; the provider path is gated and
  not run in CI (documented skip).
- **Validation**: `bun run cf:d1-restore-rehearsal` (local) must still pass;
  provider path validated only when OPEN-01 is approved.
- **Completion evidence**: when OPEN-01 closes — a provider-backed report JSON
  in `evidence/` with `providerBacked: true`.
- **Parallelization**: sequential after TASK-101 (reuses the assertion).
- **Complexization**: Medium.
- **Gate**: this task's provider path is `BLOCKED-EXTERNAL` (OPEN-01) until
  owner approval. The local path is unblocked and stays the default.

### TASK-103 — Full-schema fixture option
- **Requirement IDs**: REQ-D1-03.
- **Objective**: Optionally expand the rehearsal fixture from 5 tables to cover
  all D1 tables (or export a sanitized real subset) so the round-trip covers
  the whole schema.
- **Target path (modify)**: `scripts/generate-cloudflare-d1-restore-rehearsal.ts`
  `FIXTURE_SQL` constant.
- **Instructions**: either generate the fixture from `migrations/*.sql`
  (schema only) + sanitized inserts, or document a "sanitize a real export"
  procedure. Keep the 5-table fixture as the fast default; add a
  `DRILL_FULL_SCHEMA=1` option.
- **Validation**: local rehearsal still passes; full-schema variant passes.
- **Complexity**: Medium.

**Phase 1 exit criteria**: TASK-101 + TASK-103 done (local); TASK-102 spec
done and gated on OPEN-01. Acceptance: `bun run cf:d1-restore-rehearsal`
passes; the target-isolation test denies the prod id.

---

## Phase 2 — R2 object inventory + reconciliation

**Objective**: List objects in the physical bucket `archestimator-proof-uploads`
and reconcile against the composite `(storage_bucket, storage_path)` of **both**
`upload_assets` and `cost_library_item_variant_attachments`.

**Requirements addressed**: REQ-R2-01, REQ-R2-02.

### TASK-201 — R2 inventory script
- **Requirement IDs**: REQ-R2-02.
- **Objective**: CLI tool that paginates R2 objects in the physical bucket
  (REST `/objects/list` or S3 `ListObjectsV2`), collects key/size/etag/sha256
  across **both** logical-bucket populations (`project-images`/`component-images`/
  `component-attachments`), and emits an inventory JSON.
- **Target path (new)**: `scripts/generate-cloudflare-r2-inventory.ts`.
- **Target symbols (new)**: `listR2ObjectsPaginated()`,
  `parseLogicalBucketAndPath()`, `buildR2InventoryReport()`.
- **Reuses**: `assertSafeLogicalBucket`, `assertSafeStoragePath` from
  `r2-storage-provider.ts` (import; do not duplicate).
- **Inputs**: bucket name (default `archestimator-proof-uploads`), optional
  logical-bucket filter, max-iterations cap.
- **Instructions**: call REST `POST /accounts/{aid}/r2/buckets/{bucket}/objects/list`
  with cursor until exhausted (or cap hit); parse each listed key into
  `(logicalBucket, path)` by splitting on the first `/`; validate both segments
  (`assertSafeLogicalBucket` + `assertSafeStoragePath`); redact/sample keys in
  output; record total count + bytes + headroom vs free-tier.
- **Failure cases**: 401/403, cursor hang (cap + timeout), traversal-shaped key
  (reject), quota throttle, key without `/` (skip + report).
- **Tests to add**: `scripts/__tests__/r2-inventory.test.ts` — mock the REST
  response (empty, paginated, traversal key, oversized, both logical buckets,
  malformed key).
- **Validation**: `bun test scripts/__tests__/r2-inventory.test.ts`; provider
  run deferred to implementation.
- **Completion evidence**: test green + sample inventory JSON (mocked).
- **Parallelization**: parallel-safe with Phase 1.
- **Complexity**: Medium.

### TASK-202 — Reconciliation against both D1 tables
- **Requirement IDs**: REQ-R2-02.
- **Objective**: Diff the bucket list against the composite
  `(storage_bucket, storage_path)` of **both** tables; report orphans +
  dangling; de-duplicate `component-attachments/…` keys present in both tables.
- **Target path**: same script `generate-cloudflare-r2-inventory.ts` (add
  `reconcileInventoryAgainstTables()`).
- **Inputs**: inventory JSON + read-only D1 queries (corrected SQL in `07_…`
  "Reconciliation predicate"):
  - `SELECT storage_bucket, storage_path, checksum_sha256 FROM upload_assets WHERE storage_bucket IS NOT NULL AND storage_path IS NOT NULL AND status NOT IN ('deleted','removed','aborted','failed')`
  - `SELECT storage_bucket, storage_path, checksum_sha256 FROM cost_library_item_variant_attachments WHERE is_current_approved = 1`
- **Instructions**: build the set of DB object keys
  `${storage_bucket}/${storage_path}` from both tables (tag each with source);
  set-difference against the bucket list both ways; de-duplicate keys present
  in both tables (count as "covered", not twice); sample 5 orphans + 5 dangling
  (redacted); emit counts + coverage.
- **Failure cases**: D1 read fails, NULL `storage_bucket`/`storage_path` rows
  (filtered by the query), join key mismatch, `component-attachments` key in
  both tables (de-dup, not double-count).
- **Tests to add**: extend `r2-inventory.test.ts` with mock rows from both
  tables, including a `component-attachments` key present in both (assert
  counted once).
- **Validation**: unit test green.
- **Complexity**: Medium.

**Phase 2 exit criteria**: inventory script + reconciliation test green;
provider-backed inventory deferred to implementation execution.

---

## Phase 3 — Selective R2 export/restore drill

**Objective**: Prove a single object get→put round-trip with sha256/etag match.

**Requirements addressed**: REQ-R2-03, REQ-R2-04.

### TASK-301 — R2 restore rehearsal script
- **Requirement IDs**: REQ-R2-03.
- **Objective**: Sample one non-orphan object (a key present in the bucket and
  in at least one reconciliation table), `wrangler r2 object get --remote` to a
  temp file, `wrangler r2 object put --remote` into a **drill-namespaced key**
  in the **preview** bucket, verify sha256/etag, clean up.
- **Target path (new)**: `scripts/generate-cloudflare-r2-restore-rehearsal.ts`.
- **Reuses**: `assertSafeLogicalBucket`, `assertSafeStoragePath`; the
  inventory's sample selection (TASK-201/202).
- **Instructions**: deterministic sample (e.g., median non-orphan key); temp
  dir via `mkdtempSync`; `get` the source object; `put` into the preview bucket
  under a **`_drill/`-prefixed key**
  (`archestimator-proof-uploads-dev/_drill/<original-key>`) so a live preview
  object can never be overwritten (R2 has no versioning); **hard-assert the
  destination key starts with `_drill/`** before the put; re-head the
  `_drill/…` object; compare `checksums.toJSON().sha256` + `etag` to source;
  emit report `{ sampledKey: <redacted>, drillKey: <redacted>, sourceSha256, restoredSha256, match, durationMs }`;
  `rmSync` temp dir; delete the `_drill/…` preview object.
- **Failure cases**: 404 (dangling → sample another), checksum mismatch (retry
  put, then fail), partial upload, drill-key assertion failure (abort).
- **Tests to add**: `scripts/__tests__/r2-restore-rehearsal.test.ts` — mock
  get/put/head; assert match path + mismatch path + cleanup.
- **Validation**: unit test green; provider run deferred (needs the preview
  bucket).
- **Complexity**: Medium.

**Phase 3 exit criteria**: restore rehearsal script + test green.

---

## Phase 4 — RTO/RPO contract + failure drill matrix

**Objective**: Codify the RTO/RPO targets and the failure drill matrix as
executable/documented artifacts.

**Requirements addressed**: REQ-PERF-01, REQ-OPS-02.

### TASK-401 — RTO/RPO contract doc + duration capture
- **Requirement IDs**: REQ-PERF-01.
- **Objective**: The `09_…` table becomes the canonical contract; the drills
  (TASK-102/301) capture `durationMs` into evidence.
- **Target path**: docs in this pack + the drill reports' `durationMs` field.
- **Complexity**: Small.

### TASK-402 — Failure drill matrix
- **Requirement IDs**: REQ-OPS-02.
- **Objective**: The `12_…` matrix becomes the executed drill checklist; each
  row maps to a command + expected signal.
- **Complexity**: Small (mostly documentary; execution is the drill scripts).

**Phase 4 exit criteria**: RTO/RPO table + failure matrix complete; drills
emit duration evidence.

---

## Phase 5 — Operator runbook + evidence ledger + boundary

**Objective**: The operator-facing closeout — runbook, cadence, local-vs-provider
proof boundary.

**Requirements addressed**: REQ-OPS-01, REQ-OPS-03, REQ-OPS-04, REQ-SEC-03.

### TASK-501 — Operator runbook (13_…)
- Numbered procedure for each drill + pre-flight + rollback + DSAR re-erasure
  check (REQ-SEC-03).
- **Complexity**: Small.

### TASK-502 — Evidence ledger + local-vs-provider boundary (19_…)
- The boundary table (what's provable locally vs provider-backed) + the
  evidence folder convention.
- **Complexity**: Small.

### TASK-503 — `package.json` script entries
- **Requirement IDs**: all tool tasks.
- **Objective**: Add `cf:r2-inventory`, `cf:r2-restore-rehearsal`,
  `cf:d1-restore-target-isolation` to `package.json` (additive).
- **Complexity**: Small.

**Phase 5 exit criteria**: runbook + ledger + boundary + package entries done.

---

## Summary of new/modified files (for the future executor)

| Path | Action | Phase |
|---|---|---|
| `scripts/generate-cloudflare-d1-restore-target-isolation.ts` | new | 1 |
| `scripts/generate-cloudflare-d1-restore-rehearsal.ts` | extend (provider path gated; full-schema option) | 1 |
| `scripts/generate-cloudflare-r2-inventory.ts` | new | 2 |
| `scripts/generate-cloudflare-r2-restore-rehearsal.ts` | new | 3 |
| `scripts/__tests__/d1-restore-target-isolation.test.ts` | new | 1 |
| `scripts/__tests__/r2-inventory.test.ts` | new | 2 |
| `scripts/__tests__/r2-restore-rehearsal.test.ts` | new | 3 |
| `package.json` | add 3 scripts | 5 |
| (this pack) `evidence/*.json` | new (drill outputs, redacted) | 1–5 |

No `src/**`, `migrations/**`, `wrangler.jsonc`, or provider state is modified.

## Files off-limits to the implementation

- `wrangler.jsonc` (read-only).
- `migrations/*` (no schema change).
- `supabase/migrations/*` (legacy; never extend).
- `src/**` (app runtime unaffected).
- Provider state outside the bound resources.

## Blocked / discovery-required tasks

- TASK-102 provider path: **`BLOCKED-EXTERNAL`** (OPEN-01) until owner approves
  a provider-backed drill. The local path and the spec are unblocked.
- All R2 provider-backed runs (TASK-201/202/301 against the real bucket):
  implementation execution requires wrangler auth + the preview bucket; not
  blocked by an owner decision, but not runnable in this planning task.
- No task is `BLOCKED-ARCHITECTURE` or `BLOCKED-EVIDENCE` — the design is
  settled and the evidence sources are identified.

## Performance measurement / rollback gates per phase

- Phase 1: rehearsal duration captured; assertion test must abort on prod id.
- Phase 2/3: inventory/restore emit counts + duration; no quota breach.
- Phase 4: RTO measured (< 30 min target) at the provider-backed run (OPEN-01).
- Phase 5: runbook reviewable end-to-end.

Rollback of the whole implementation: delete the new scripts + revert
`package.json` entries. No migration, no provider state to undo.
