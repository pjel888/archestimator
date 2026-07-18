# UNIT-004 — Restore-Replay Issues N `readRowById` Calls (Up To 100) · PERF-D1-001

**Finding:** PERF-D1-001 · **Priority:** P2 · **Wave:** 1 (W1-3 / QW-2) · **Effort:** S · **Risk:** Low
**Roadmap item:** W1-3 · **Test decision:** `NOT_REQUIRED`
**local_implementation:** `NOT_STARTED` · **external_lifecycle:** `NOT_STARTED`

## Outcome

The idempotent restore-replay path (the second+ attempt of a restore after a
network blip) issues one batched `WHERE id IN (...)` SELECT instead of up to
100 single-row `readRowById` calls, mirroring the fresh-restore re-read already
present in the same file. Latency on restore retry drops accordingly.

## Affected surface

- `src/lib/estimates/d1-intents/rows.ts:3187-3191` — the
  `Promise.all(restoredRowIds.map(rowId => readRowById(...)))` loop in the
  idempotent-replay branch
- `src/lib/estimates/d1-intents/rows.ts:1697-1704` — `readRowById` (single-row
  `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND id = ? LIMIT 1`)
- **Mirror target (already correct):** `rows.ts:3281-3285` — fresh-restore
  re-read: `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND id IN
  (${placeholders(restoredRowIds)}) ORDER BY id`
- `rows.ts:198` — `MAX_RESTORABLE_ROW_BATCH_SIZE = 100`

## Dependencies

- None for the code change.
- **Extends existing `/improve` Plan 023** (`023-batch-restore-row-reads.md`)
  — that plan is the canonical executor doc with drift-check, branch name,
  and step-by-step. This unit confirms PERF-D1-001 verified it still current
  at HEAD (commit `a41a07d014`). Execute via Plan 023; this unit is the
  cross-reference.
- No AUTH_BOUNDARY items.

## Implementation intent

Replace `Promise.all(restoredRowIds.map(rowId => readRowById(...)))` at
`:3187-3191` with one batched read mirroring `:3281-3285`:

```ts
const restoredRows = (await allD1Rows<Record<string, unknown>>(
  database,
  `SELECT * FROM estimate_row_items WHERE estimate_id = ? AND id IN (${placeholders(restoredRowIds)}) ORDER BY id`,
  [input.estimateId, ...restoredRowIds],
)).map(serializeRow);
const rowsById = new Map(restoredRows.map((row) => [row.id, row]));
for (const rowId of restoredRowIds) {
  const row = rowsById.get(rowId);
  if (!row) throw new Error("Idempotent row restore event exists but restored rows are missing.");
  // ... rowItemHistoryResult(row, existingEvent.id).row ...
}
```

Constraints (from finding): preserve idempotency semantics (matching
`existingEvent.id`); preserve the throw on missing rows (the existing throw at
`:3189`); use the same column projection (`SELECT *`) and `serializeRow`
mapping as the fresh-restore re-read.

## Variants

The memory note "the variants should be accommodated as well" was checked
against this unit. **Conclusion: no extra variant handling is needed for the
batch fix itself.** Verification:

- `estimate_row_items` stores variant data inline in `source_snapshot_json` /
  `metadata_json` JSON columns (single selected variant per row — see
  `serializeRow` at `rows.ts:725-755` which reads `metadata_json` and
  `source_snapshot_json`).
- There is **no separate `estimate_row_variant` child table** — `grep
  "CREATE TABLE.*variant" migrations/` returns only `cost_library_item_variant_*`
  and `component_variant_attachments` (library/attachment tables, not estimate
  rows).
- The batched `SELECT *` via `serializeRow` therefore captures the full row
  including all variant JSON transparently. Multi-variant rows are restored
  byte-for-byte identical to the per-row path.

The variant handling that *does* matter for this domain lives in
**`src/lib/estimates/d1-intents/templates.ts`** (template snapshot source
resolution at `:240-311`, including `variantDescription`/`variantSortOrder`)
and **`src/lib/component-library/template-propagation-d1.ts`** (variant
selection at `:182-192`, `selectedVariantId` fallback). Those surfaces are
covered by a **different finding** — UNIT-014 / PERF-D1-004 (component-source
guard `json_extract` correlations) and the sibling pack's UNIT-002
(`selectedVariantId` deletion fallback). This unit does not touch either
file; coordinate cross-references there, not here.

## Expected evidence

Verification command from PERF-D1-001 "Verification":

```
# Add EXPLAIN QUERY PLAN for the new query against idx_estimate_row_items_*
wrangler d1 execute ARCH_DB --local --command \
  "EXPLAIN QUERY PLAN SELECT * FROM estimate_row_items WHERE estimate_id = 'x' AND id IN ('a','b') ORDER BY id"
# Instrument statement count via assertD1MutationStatementLimit (read-side equivalent)
```

Evidence class: `NOT_REQUIRED` for the static change (diff showing the
`Promise.all(map(readRowById))` replaced by one `allD1Rows(... WHERE id IN
(...))` is the decisive non-test signal; the existing fresh-restore re-read at
`:3281-3285` proves the query is correct). The `EXPLAIN QUERY PLAN` and
statement-count probes are hosted-gated follow-ups.

## Completion signal

`rows.ts:3187-3191` no longer contains `Promise.all(restoredRowIds.map(...
readRowById ...))`. The idempotent-replay branch uses one batched `WHERE id IN
(...)` SELECT and throws on any missing row, matching the fresh-restore
re-read semantics. `readRowById` itself is unchanged (other paths may use it).

## Recovery path

Not required (Risk: Low). Revert to the per-row `Promise.all` — behavior is
identical, just N× the round-trips. The existing `/improve` Plan 023 STOP
conditions (loop body beyond fetch-then-use, or column projection mismatch)
apply if encountered during execution.
