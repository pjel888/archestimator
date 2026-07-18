# Plan 023: Batch the per-row reads in the estimate row-restore idempotent-replay path

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0a2667db9..HEAD -- src/lib/estimates/d1-intents/rows.ts`
> If it changed since this plan was written, compare "Current state" against
> the live code; on a mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `0a2667db9`, 2026-07-17

## Why this matters

In `src/lib/estimates/d1-intents/rows.ts:3069-3073`, the estimate row-restore
**idempotent-replay** path issues one `readRowById` query per restored row:
`await Promise.all(restoredRowIds.map(async (rowId) => { const row = await readRowById(database, input.estimateId, rowId); ... }))`,
and `readRowById` (lines 1697-1704) runs its own `SELECT ... WHERE estimate_id = ? AND id = ? LIMIT 1`
per call. Up to `MAX_RESTORABLE_ROW_BATCH_SIZE = 100` rows (lines 198, 3039) →
up to 100 round-trips. The **non-idempotent** branch right below (lines
3163-3167) already does the correct single batched `WHERE id IN (placeholders)`
query — so this is an inconsistency, not a design choice. This plan makes the
idempotent-replay path use the same batched query.

## Current state

`src/lib/estimates/d1-intents/rows.ts:3069-3073` (verified shape):

```ts
await Promise.all(restoredRowIds.map(async (rowId) => {
  const row = await readRowById(database, input.estimateId, rowId);
  // ... use row ...
}));
```

`readRowById` (lines 1697-1704):

```ts
async function readRowById(database, estimateId, rowId) {
  return firstD1Row(database, `SELECT ... FROM estimate_row_items WHERE estimate_id = ? AND id = ? LIMIT 1`, [estimateId, rowId]);
}
```

The non-idempotent branch (lines 3163-3174) already does it right — one
`allD1Rows(... WHERE id IN (${placeholders(restoredRowIds)}))` then maps by id.
That's the pattern to mirror.

`MAX_RESTORABLE_ROW_BATCH_SIZE = 100` (lines 198, 3039).

## Commands you will need

| Purpose   | Command                | Expected on success |
|-----------|------------------------|---------------------|
| Typecheck | `bun run type-check`   | exit 0              |
| Tests     | `bun run verify`       | all pass            |

## Scope

**In scope** (the only file you should modify):
- `src/lib/estimates/d1-intents/rows.ts` — replace the `Promise.all(map(readRowById))`
  with one batched `allD1Rows(... WHERE id IN (placeholders))` call, then map
  over the result keyed by id, mirroring lines 3163-3174.

**Out of scope**:
- `readRowById` itself — keep it (other paths may use it).
- The non-idempotent branch — already correct.
- `MAX_RESTORABLE_ROW_BATCH_SIZE` — unchanged.

## Git workflow

- Branch: `advisor/023-batch-restore-row-reads`.
- Commit message: `perf(estimates): batch row reads in restore idempotent-replay path`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Replace the per-row loop with a batched read

Read lines 3163-3174 (the non-idempotent branch's batched read) as the template.
Then in the idempotent-replay path (around lines 3069-3073), replace:

```ts
await Promise.all(restoredRowIds.map(async (rowId) => {
  const row = await readRowById(database, input.estimateId, rowId);
  // ... use row ...
}));
```

with a single batched fetch plus a map keyed by id:

```ts
const restoredRows = await allD1Rows<...>(
  database,
  `SELECT ${ESTIMATE_ROW_ITEM_COLUMNS} FROM estimate_row_items WHERE estimate_id = ? AND id IN (${placeholders(restoredRowIds)})`,
  [input.estimateId, ...restoredRowIds],
);
const rowsById = new Map(restoredRows.map((row) => [row.id, row]));
for (const rowId of restoredRowIds) {
  const row = rowsById.get(rowId);
  if (!row) continue; // mirror whatever the old per-row null-handling did
  // ... use row ...
}
```

Notes:
- Use the exact column constant and row type the non-idempotent branch uses at
  3163-3174 (e.g. `ESTIMATE_ROW_ITEM_COLUMNS` and the same `Row` type). Do not
  invent a new SELECT list.
- Preserve the existing per-row null/missing handling. If the old code skipped
  missing rows silently, keep that; if it threw, keep that. Match the surrounding
  semantics exactly.
- Use `placeholders(restoredRowIds)` from the shared helper (the non-idempotent
  branch already uses it).

**Verify**: `bun run type-check` → exit 0.

### Step 2: Run the gate

**Verify**: `bun run verify` → exit 0.

Existing restore tests (`grep -rln "restoreEstimateRows\|MAX_RESTORABLE_ROW_BATCH_SIZE\|restoredRowIds" tests/`)
must still pass — the behavior is identical, only the query count changes. If a
test asserted on the number of queries (e.g. a spy on `readRowById`), update it
to assert on the single batched query.

## Test plan

- Update query-count assertions if any (above).
- If authorized (TEST_TASK), add: restoring 100 rows issues exactly 1 read
  query (not 100) on the idempotent-replay path. Model on existing restore
  tests in `tests/vitest/`.

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run verify` exits 0
- [ ] The idempotent-replay path uses a single `WHERE id IN (...)` read
      (read the code: no `Promise.all(map(readRowById))` for restored rows)
- [ ] The non-idempotent branch is unchanged
- [ ] No files outside the in-scope list (plus updated tests) are modified
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

- The per-row loop body does something beyond "fetch then use" that can't be
  expressed as a post-fetch loop (e.g. it writes per-row and depends on the
  write before the next read) — report; the batch may need to be split.
- The row type or column constant the non-idempotent branch uses isn't
  applicable to the idempotent path (different projection) — report and use the
  idempotent path's own column list.

## Maintenance notes

- Both restore branches now use the same batched-read pattern. Any future
  restore-path change should keep them consistent.
- Reviewer: confirm the query count dropped from N to 1, and that missing-row
  handling matches the old semantics exactly.
