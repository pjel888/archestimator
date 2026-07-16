# Plan UNIT-016: Replace the `json_tree` reference scan with a denormalized reference table

> **Drift check:** `git diff --stat 9a821b51a..HEAD -- src/lib/uploads/removal-claims.ts src/lib/uploads/cleanup-job.ts migrations/`.

## Status
- **Priority:** P3 · **Effort:** L · **Risk:** MED · **Depends on:** UNIT-007 · **Category:** perf
- **Planned at:** `9a821b51a`, 2026-07-16 · **Test decision:** TEST_PROPOSAL (trigger tests + parity vs `json_tree`)

## Why this matters
`uploadAssetAcceptedReferencePredicate` (`removal-claims.ts:47-169`) runs `json_tree(...)` over JSON columns of ~10 tables per asset evaluated — a table-valued function no B-tree index can help, so each evaluation is `O(Σ rows × payload_size)`. It runs in the removal UPDATE (`:257`) **and** the diagnostic (`:287`), and again per purge candidate in `cleanup-job.ts:477`. At alpha scale it is acceptable and (confirmed during vetting) *correct*; it is the first thing to break as upload × estimate volume grows. This unit replaces it with an indexed denormalized table. **Land UNIT-007 first** (it refactors the predicate this table replaces).

## Current state
- `src/lib/uploads/removal-claims.ts:47-169` — the `json_tree` predicate over projects, cost_library_items (+ price_options/versions/price_history), estimate_row_items, estimate_template_row_items, estimate_sheet_events (5 JSON cols), project_publications.
- `:257` (claim UPDATE), `:287` (diagnostic), `cleanup-job.ts:477` (per-candidate) all call it.
- Storage backstop: `cleanup-job.ts:469-498` re-checks before purge.

## Commands
| Purpose | Command | Expected |
|--------|---------|----------|
| Typecheck | `bun run type-check` | exit 0 |
| Lint | `bun run lint` | exit 0 |
| Shadow-D1 apply | `wrangler d1 migrations apply ARCH_DB --local` (or repo wrapper) | new table + triggers apply |
| (TEST_PROPOSAL) trigger + parity tests | `bun run test:dom -- tests/vitest/upload-reference-tracking.test.ts` (if authorized) | pass |

## Scope
**In scope:** a new migration creating `upload_asset_references` + triggers on the consuming tables; `removal-claims.ts` predicate swap to an indexed `EXISTS`; backfill of existing references.
**Out of scope:** the cleanup-job final re-check (keep it as the storage backstop). Changing which tables count as "referencing." The removal-result contract from UNIT-007 (preserve it).

## Steps
### Step 1 — Design the reference table
`upload_asset_references(upload_asset_id, source_table, source_id, referenced_at, released_at, PRIMARY KEY(upload_asset_id, source_table, source_id))` (confirm column names against the consuming tables at edit time). Indexed on `upload_asset_id`.
### Step 2 — Maintain it via triggers (or in-mutation)
Add triggers on the consuming tables (insert → upsert a reference row; delete/clear → remove it) **or** maintain the rows in the same mutation batches that write the JSON columns. Triggers are more robust against ad-hoc writes; in-mutation is more testable. Choose triggers for coverage, keep the cleanup-job re-check.
### Step 3 — Backfill existing references
One-time migration that runs the current `json_tree` predicate once to seed `upload_asset_references` for existing rows, then asserts parity (no asset is "referenced" by the old predicate but missing from the table).
### Step 4 — Swap the predicate
Replace the `json_tree` predicate with `EXISTS (SELECT 1 FROM upload_asset_references WHERE upload_asset_id = candidate.id AND released_at IS NULL)`. Preserve UNIT-007's per-row eligibility + distinct-result contract.
### Step 5 — (TEST_PROPOSAL) trigger + parity tests
Insert/delete a referencing row → reference row flips; the new predicate returns identical results to the `json_tree` version for a fixture workspace; a golden purge dry-run is unchanged.
**Verify:** `bun run type-check` + `bun run lint` exit 0; migration applies to shadow D1; parity holds.

## Done criteria
- [ ] `bun run type-check` exit 0 · `bun run lint` exit 0
- [ ] `upload_asset_references` + maintenance triggers apply (replay-safe, per UNIT-001 idiom)
- [ ] Removal predicate uses indexed `EXISTS`, not `json_tree`
- [ ] Parity test: identical referenced-set vs the old `json_tree` predicate (if authorized)
- [ ] Cleanup-job storage backstop unchanged
- [ ] No files outside scope modified
- [ ] `plan-pack.json` / `README.md` / `LOOP_LEDGER.md` updated

## STOP conditions
- A consuming table writes references in a way triggers can't observe (e.g. bulk JSON merges) — add in-mutation maintenance for that path; don't leave a gap.
- Parity test finds an asset the old predicate flagged but the table misses — backfill is incomplete; fix before swapping.
- The trigger write-cost on hot estimate mutations is unacceptable — measure; if so, maintain in-mutation instead.

## Maintenance notes
- New tables that store upload references in JSON must add a trigger (or in-mutation write) to maintain `upload_asset_references`.
- The cleanup-job re-check stays as defense-in-depth even after this swap.
- This is the scaling fix behind UNIT-007; do it when upload volume grows, not urgently.
