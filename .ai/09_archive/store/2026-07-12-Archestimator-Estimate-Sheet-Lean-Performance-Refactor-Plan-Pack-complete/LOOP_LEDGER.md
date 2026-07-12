# Loop Ledger

This is the only durable execution log required by this pack.

Do not add generated run directories, command receipts, fingerprints, or evidence indices.

## Status

| Unit | State | Result |
|---|---|---|
| UNIT-001 | COMPLETE | Snapshot-scoped exact-row index and grouped structural patch/rollback |
| UNIT-002 | COMPLETE | Per-row drafts and index-backed ancestor total deltas; structural reconciliation retained |
| UNIT-003 | COMPLETE | Closed derivations gated; selected-node lookup indexed; draft-map props/comparators removed from sheet render path |
| UNIT-004 | COMPLETE | Inert mode/evidence framework removed |
| UNIT-005 | NOT_ACTIVATED | Route metric not established |
| UNIT-006 | NOT_ACTIVATED | Mount/virtualization bottleneck not established |
| UNIT-007 | PLANNED | Final integration |

## Entry template

### UNIT-XXX — YYYY-MM-DD

- **State:** STARTED / COMPLETE / REVERTED / NOT_ACTIVATED
- **Symptom:**
- **Metric:**
- **Hypothesis:**
- **Files:**
- **Before:**
- **Change:**
- **After:**
- **Behavior evidence:**
- **Test requirement:** NOT_REQUIRED / TEST_PROPOSAL / TEST_TASK
- **Validation gap:**
- **Complexity removed/added:**
- **Next decision:**

## Coordination rule

- One lead owns the active hot path.
- A reviewer adds a separate short subsection only when assigned a named correctness risk.
- Do not edit prior entries except to correct an objective typo.

### UNIT-001 — 2026-07-12

- **State:** COMPLETE
- **Symptom:** Shared project-component mutations scanned unrelated rows and replayed rollback one full-tree patch at a time.
- **Metric:** Exact component row IDs and indexed node locations replace per-mutation identity scans; affected node paths are cloned once.
- **Hypothesis:** A snapshot-scoped index removes unrelated component identity work and groups rollback writes without changing shared/local patch semantics.
- **Files:** `src/lib/estimates/estimate-tree-index.ts`, `src/lib/estimates/estimate-row-tree-patch.ts`, `src/hooks/use-estimate-row-mutations.ts`.
- **Before:** Recursive component identity traversal plus one recursive patch traversal per rollback row.
- **Change:** Build row-location and component-ID indexes once for the optimistic snapshot; patch and restore exact rows through grouped affected paths.
- **After:** Mutation fan-out resolves row IDs directly; rollback updates all saved row patches in one grouped pass.
- **Behavior evidence:** Source/path inspection confirms shared patch selection is unchanged, initiating-row patches remain full, and no unrelated path is traversed below index build.
- **Test requirement:** TEST_PROPOSAL — shared fan-out and rollback correctness need explicit owner authorization before `bun run test -- tests/unit/estimate-row-tree-patch.test.ts`.
- **Validation gap:** No automated test, browser trace, or full typecheck was run under the User Test Authorization Gate.
- **Complexity removed/added:** Removed recursive identity scans and repeated rollback tree patches; added one narrow tree index.
- **Next decision:** Proceed to transient draft-state isolation in UNIT-002.

### UNIT-004 — 2026-07-12

- **State:** COMPLETE
- **Symptom:** All-off performance mode plumbing and its evidence pipeline added route, client, package, config, script, and test overhead without activating a product optimization.
- **Metric:** No non-archive source/package references to the retired mode/framework remain.
- **Hypothesis:** Deleting the dead framework after a production optimization reduces maintenance and route/client work without changing estimate behavior.
- **Files:** Estimate route/client, `package.json`, `vitest.config.ts`, retired mode/framework scripts/configs/tests.
- **Before:** Route mode resolution, client provider/data attributes, 16 package scripts, custom reporter wiring, and dedicated harness artifacts.
- **Change:** Removed the inert production plumbing and dedicated framework-only scripts/configs/tests; retained normal server timing and product code.
- **After:** Static repository search finds no non-archive `estimate-performance`, `ESTIMATE_PERF_`, or `perf:estimate:` references.
- **Behavior evidence:** `package.json` parses; focused repository reference scan and `git diff --check` pass.
- **Test requirement:** NOT_REQUIRED — removal is proven by static import/package evidence; product tests remain user-gated.
- **Validation gap:** No automated test, browser proof, or build was run under the User Test Authorization Gate.
- **Complexity removed/added:** Substantial framework deletion; no replacement framework.
- **Next decision:** Complete UNIT-002 before further render simplification.

### UNIT-002 — 2026-07-12

- **State:** STARTED
- **Symptom:** Row-input updates clone the root `editableRows` record and invalidate sheet-level totals/render comparators.
- **Metric:** The new store updates only the changed row value; the root no longer needs a record clone as the primitive update operation.
- **Hypothesis:** A per-estimate external store can supply row-level subscriptions while confirmed query tree data remains in TanStack Query.
- **Files:** `src/components/workshop/estimate-sheet/rows/editable-row-model.ts`, `src/components/workshop/estimate-sheet/rows/editable-row-store.ts`.
- **Before:** `updateEditableRowValue` always cloned the complete draft record.
- **Change:** Split single-row value construction from the legacy record helper; added a keyed mutable-store update operation for subsequent row/table migration.
- **After:** Mutation handlers and row-table rows now share the per-estimate store; a row subscribes to its own draft and writes back only to that store during editing.
- **Behavior evidence:** Static source inspection confirms mutation paths read the current store snapshot and `EstimateRowItemTableRow` selects `rows[item.id]` directly.
- **Test requirement:** TEST_PROPOSAL — draft/rollback/total parity needs explicit authorization before the focused commands declared by UNIT-002.
- **Validation gap:** No automated test, browser trace, or build ran under the User Test Authorization Gate.
- **Complexity removed/added:** One small store boundary; no dependency added.
- **Next decision:** Migrate row/table subscriptions with a current draft snapshot supplied to mutation handlers, then replace full-tree totals.

### UNIT-003 — 2026-07-12

- **State:** PARTIAL
- **Symptom:** Selected-node breadcrumb and code each recursively traversed the entire estimate tree.
- **Metric:** Selected-node presentation now reads one indexed location per confirmed tree reference.
- **Hypothesis:** Extending the narrow tree index with node paths/codes removes duplicate presentation traversals without changing selected-node output.
- **Files:** `src/lib/estimates/estimate-tree-index.ts`, `src/components/workshop/EstimateSheetContent.tsx`.
- **Before:** Two recursive helpers independently traversed the tree for each selected-node presentation update.
- **Change:** The index records node location, ancestor nodes, and display code; the sheet derives breadcrumb/code from that entry.
- **After:** No selected-node recursive presentation helper remains in the sheet.
- **Behavior evidence:** Static search confirms removal of both recursive helpers and their probe calls; `git diff --check` passes.
- **Test requirement:** NOT_REQUIRED — direct source/data-flow inspection covers the isolated lookup replacement; broader interaction proof remains user-gated.
- **Validation gap:** No automated test, browser trace, or build ran under the User Test Authorization Gate.
- **Complexity removed/added:** Reused the existing index rather than adding a presentation-specific cache.
- **Next decision:** Finish UNIT-002 draft/subscription and totals migration before comparator cleanup.

### UNIT-002 — 2026-07-12 (completion)

- **State:** COMPLETE
- **Symptom:** Every editable keystroke cloned and propagated the complete draft map, while node totals rescanned the tree.
- **Metric:** Row writes are keyed by row ID; total updates touch only the row's indexed ancestor chain.
- **Hypothesis:** A per-estimate store can preserve controlled-input behavior while separating row subscriptions from structural reconciliation.
- **Files:** `src/components/workshop/EstimateSheetContent.tsx`, `src/components/workshop/estimate-sheet/rows/editable-row-store.ts`, `src/components/workshop/estimate-sheet/rows/row-table.tsx`, `src/components/workshop/estimate-sheet/rows/branch.tsx`, `src/lib/estimates/estimate-tree-index.ts`, `src/components/workshop/estimate-sheet/use-estimate-proposal-preview.ts`.
- **Before:** Each cell update used a full `editableRows` record clone, broad branch/table props, and full-tree totals derived from that record.
- **Change:** Added one estimate-scoped draft store with per-row subscriptions, O(depth) ancestor-total deltas, tree replacement reconciliation, and direct snapshot reads for preview creation. Removed broad draft props from branch/table comparators; structural operations retain the existing full replacement path.
- **After:** Editable row updates replace only their row value, active rows and node headers subscribe to exact store values, project total is store-backed, and proposal preview materializes the current store snapshot only when opened or refreshed.
- **Behavior evidence:** Static inspection finds no `updateEditableRowValue` or `setEditableRows` row-edit call site in `row-table.tsx`; `git diff --check` passes; `package.json` parses.
- **Test requirement:** TEST_PROPOSAL — draft/rollback/total parity and render isolation require explicit authorization before `bun run test:dom -- tests/vitest/estimate-sheet-row-editing.test.tsx` and `bun run test -- tests/unit/estimate-edit-store.test.ts`.
- **Validation gap:** No automated test, browser trace, build, or typecheck ran under the User Test Authorization Gate.
- **Complexity removed/added:** Removed draft-map propagation from the render path; added one small store plus narrow snapshot index reuse.
- **Next decision:** Complete UNIT-003 comparator/render cleanup audit, then close UNIT-007 with static evidence and the declared test proposal.

### UNIT-003 — 2026-07-12 (completion)

- **State:** COMPLETE
- **Symptom:** Closed move/catalogue surfaces and broad draft-map props still caused unnecessary derived work or comparator scans.
- **Metric:** Closed move/catalogue derivations return shared empty values; rows and headers read exact store slices; inactive filters keep the selected-node reference.
- **Hypothesis:** Gating closed work, reusing the tree index, and subscribing only active derived surfaces to store revisions removes avoidable sheet-wide work without changing interaction semantics.
- **Files:** `src/components/workshop/EstimateSheetContent.tsx`, `src/components/workshop/estimate-sheet/rows/branch.tsx`, `src/components/workshop/estimate-sheet/rows/row-table.tsx`.
- **Before:** Move options and catalogue inputs ran while closed; selected-node code/path used duplicate recursive traversals; branch/table props and comparators carried the full draft map.
- **Change:** Gated closed derivations, indexed selected-node presentation, removed broad draft-map props/comparator checks, and made value-sensitive display/detail derivations subscribe to the store only while active.
- **After:** A cell edit reaches its row, indexed ancestor headers, and active detail/filter consumers only; inactive branch/table props remain draft-map free.
- **Behavior evidence:** Static search finds no `editableRows=`/`setEditableRows=` propagation or row-table `updateEditableRowValue` call site; `git diff --check` passes.
- **Test requirement:** TEST_PROPOSAL — authorize focused selected-node/search-filter and row-isolation proof before running the Unit-002 commands.
- **Validation gap:** No automated test, browser trace, build, or typecheck ran under the User Test Authorization Gate.
- **Complexity removed/added:** Removed recursive presentation helpers and broad render props; reused the existing index/store boundaries.
- **Next decision:** UNIT-007 may report static implementation evidence and the pending owner-gated behavior proof.

### UNIT-007 — 2026-07-12

- **State:** COMPLETE
- **Result:** Local implementation is complete and this pack is archived at `.ai/09_archive/store/2026-07-12-Archestimator-Estimate-Sheet-Lean-Performance-Refactor-Plan-Pack-complete`.
- **Behavior evidence:** Production slices UNIT-001 through UNIT-004 are complete; UNIT-005 and UNIT-006 remain not activated; static source/reference searches, `git diff --check`, and `package.json` parsing passed.
- **Test requirement:** TEST_PROPOSAL — focused row draft/total and render-isolation commands remain owner-gated.
- **Validation gap:** No automated test, typecheck, build, browser, or provider proof ran under the User Test Authorization Gate.
- **Complexity removed/added:** The obsolete mode/evidence framework was removed; the retained production boundary is the narrow indexed draft store.
- **Next decision:** No active implementation work remains. Authorize the recorded focused tests separately if behavior proof is required.
