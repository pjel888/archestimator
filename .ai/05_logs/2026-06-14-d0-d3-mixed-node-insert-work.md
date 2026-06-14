# D0-D3 Mixed-Node Insert Work

**Date:** 2026-06-14
**Branch:** `feat/estimate-sheet-uxui`
**Mode:** implementation / provider-proof
**Scope:** Archestimator Supabase project `ebxxqidacheyapmmzavr`, P6 insert RPC parity, fresh-env migration, prove harness, and remaining client/server kind gates.
**Proof boundary:** provider-proven for live RPC state and rollback-only RPC smoke; local PG17-proven for fresh migration chain; local static/TypeScript proven for client gates.

## Goal

Complete the deferred D0-D3 mixed-node insert work:

- D0: Confirm the three live insert RPC bodies are relaxed and identify the exact hosted migration version.
- D2: Commit an idempotent, version-matched migration so fresh environments match hosted P6 behavior, and update the prove harness from "still rejected" to "accepted."
- D1/D3: Lift the remaining client kind gates for component row insertion and batched template insertion, plus the adjacent server-action kind gate for direct template-node insertion.

## Source Of Truth Read

- `.ai/README.md`
- `.ai/00_system/ai-folder-canonical-map.md`
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md`
- `.ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md`
- `.ai/10_state/current-state.md`
- `.ai/10_state/decisions.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
- `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`
- Supabase changelog index scanned for relevant breaking-change notes.

## D0 Provider Evidence

Supabase MCP was callable for project `ebxxqidacheyapmmzavr`.

- `list_migrations` returned hosted version `20260614013638` named `enable_estimate_node_mixed_writes_p6`.
- `execute_sql` fetched `pg_get_functiondef` for:
  - `public.insert_estimate_row_item_with_history`
  - `public.insert_estimate_subtree_into_estimate`
  - `public.insert_estimate_template_into_estimate`
- Follow-up guard scan returned `has_target_kind_guard=false` for all three functions.

Security advisors after the check returned existing INFO/WARN findings only in the captured output; no scoped D0-D3 DDL was applied to hosted in this run.

## Changes

- Added `supabase/migrations/20260614013638_enable_estimate_node_mixed_writes_p6.sql`.
  - Created through `supabase migration new enable_estimate_node_mixed_writes_p6`.
  - Renamed to the hosted migration version for schema-history parity.
  - Idempotent: replaces function bodies only when the stale target kind guard exists; already-relaxed functions are skipped.
  - Verifies no remaining `and node.kind = 'area'|'group'` target guards in the three insert RPCs.
- Updated `scripts/prove-unify-estimate-node-kinds-postgres.mjs`.
  - Splits the local migration chain at P5.
  - Keeps pre-P5 rejection proof for mixed writes.
  - Applies P5 onward, including P6.
  - Proves the row insert RPC now accepts a row-owning/former-group node.
  - Proves the template and subtree history wrappers now accept insertion into a row-owning node.
- Updated `src/components/workshop/EstimateSheetContent.tsx`.
  - `insertLibraryItem` now only requires the target node to exist.
  - batched `insertTemplatesIntoParent` now only requires the target parent node to exist.
- Updated `src/lib/estimates/actions.ts`.
  - `insertEstimateTemplateNodeIntoEstimate` no longer filters target parents by `kind = group`.
  - Project/estimate scoping and edit authorization remain intact.
- Updated `tests/vitest/live-estimate-node-route.test.ts`.
  - Static regression assertions now guard against reintroducing stale client/server kind gates.

## RED Evidence

- `bun x vitest run tests/vitest/live-estimate-node-route.test.ts --maxWorkers=1`
  - Failed before the client edit because `EstimateSheetContent.tsx` still contained `targetNode?.kind !== "area"`.
- `POSTGRES_BIN_DIR=/opt/homebrew/opt/postgresql@17/bin node scripts/prove-unify-estimate-node-kinds-postgres.mjs`
  - Failed before the harness/migration fix because the harness applied the whole local chain before its PRE assertions, exposing that local P5 was already committed and the harness needed a P5 split.

## GREEN Evidence

- `bun x vitest run tests/vitest/live-estimate-node-route.test.ts --maxWorkers=1`
  - 1 file passed, 8 tests passed.
- `POSTGRES_BIN_DIR=/opt/homebrew/opt/postgresql@17/bin node scripts/prove-unify-estimate-node-kinds-postgres.mjs`
  - Pre-P5: all-area tree validates; row on group and child under area reject.
  - Post-P5/P6: child under former-area accepted; row on former-group accepted; tree validates.
  - Preserved: cycle, cross-tab, missing-parent, and orphan-row rejection.
  - RPC: `insert_estimate_row_item_with_history` into a row-owning/former-group node accepted.
  - RPC wrappers: `insert_estimate_template_into_estimate_with_history` and `insert_estimate_subtree_into_estimate_with_history` into a row-owning node accepted.
- Live Supabase rollback smoke:
  - `insert_estimate_row_item_with_history` accepted a row into a `group` node inside a transaction.
  - Follow-up count for material `P6 rollback smoke` returned `0`, confirming no smoke row persisted.
- `bun run type-check`
  - Passed.
- `bun x vitest run tests/vitest/live-estimate-node-route.test.ts tests/vitest/estimate-node-reorder-action.test.ts --maxWorkers=1`
  - 2 files passed, 34 tests passed.
- `bun run lint -- src/components/workshop/EstimateSheetContent.tsx src/lib/estimates/actions.ts tests/vitest/live-estimate-node-route.test.ts tests/vitest/estimate-node-reorder-action.test.ts scripts/prove-unify-estimate-node-kinds-postgres.mjs`
  - Passed.
- `git diff --check`
  - Passed.
- Migration file CRLF/final-newline check
  - Passed.

## Notes

- `src/components/workshop/EstimateSheetContent.tsx` remains oversized at roughly 2,138 pure LOC. This run did not split it because the scoped client change deletes stale behavior gates and does not add a new abstraction.
- A first Vitest rerun exposed a stale static expectation for the neutral tree icon (`Circle` vs the current `Log` import). The assertion was updated to current implementation so the same route test can prove the new kind-gate contract.
- No production data mutation persisted; the only live write-shape proof ran inside an explicit rollback transaction.
- No hosted migration was applied in this run because hosted already records the exact P6 migration version.
