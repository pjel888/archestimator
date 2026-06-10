# U0 Characterization Baseline — 2026-06-11

**Branch**: perf/path-to-estimate-sheet @ 626d44a (+ baseline harness)
**Command**: `bun run test:dom -- <9 estimate-path suites>`

## Result

- 100 tests across 9 suites: **99 passed, 1 failed**.
- Suites: estimate-sheet-cost-inputs, estimate-sheet-tree-dom, estimate-tree-context-menu, estimate-tree-bulk-selection, estimate-cursor-broadcast-throttle, proposal-export-preview, estimate-template-drop-zones, tree-external-drop, estimate-sheet-library-insert.

## Failure classification

| Test | Status | Classification |
|------|--------|----------------|
| `estimate-tree-bulk-selection.test.tsx` › "1 node selected" toolbar text | FAIL | **Pre-existing, caused by unrelated dirty work.** Working tree has uncommitted templates-panel edits; `EstimateSheetTree.tsx` currently reads `selectedLabel={bulkSelectionCount === 1 ? "n" : ...}` while HEAD (626d44a:1369) reads `"node selected"`. Not caused by this performance work; dirty file preserved untouched per QA-DIRTY-001. |

## Behavior coverage map (existing, all green)

| Plan behavior | Covering test |
|---------------|---------------|
| Quantity/misc/unit-cost edit, focus preserved | estimate-sheet-cost-inputs ("misc cost input as pesos … keeps focused typing uninterrupted", "commits row cells on Enter/blur") |
| Contingency adds / discount subtracts | estimate-sheet-cost-inputs (327, 339) |
| Row add (button, drop zone, keyboard) | estimate-sheet-cost-inputs (170, 183, 197) |
| Component replace/delete/move on rows | estimate-sheet-cost-inputs (575–681) |
| Template insert + drop zones | estimate-template-drop-zones, estimate-sheet-tree-dom (273, 310) |
| Drag/drop tree moves | estimate-sheet-tree-dom, tree-external-drop |
| Bulk selection + toolbar | estimate-tree-bulk-selection (1 pre-existing fail above) |
| Remote cursor broadcast throttle | estimate-cursor-broadcast-throttle |
| Proposal preview signature/stale refresh | proposal-export-preview |
| Activity scope open | estimate-sheet-cost-inputs (274) |
| Library insert path | estimate-sheet-library-insert |

## New harness added (this run)

- `src/components/workshop/estimate-sheet-render-probe.ts` — null-by-default render probe.
- `tests/vitest/perf/estimate-sheet-render-baseline.test.tsx` — 50/200/500-row keystroke + render-count profile; characterization asserts typed value survives and focus is retained.

## jsdom render/keystroke baseline (BEFORE optimization)

Artifact: `baseline/jsdom-render-baseline-before.json`

| Scenario | Initial render | Keystroke avg | Keystroke worst | Non-edited table renders (10 keystrokes) |
|----------|----------------|---------------|------------------|------------------------------------------|
| 50 rows (5 areas) | 176.7ms | 19.6ms | 36.7ms | 45 (all 4 other tables re-render every keystroke + dirty-state render) |
| 200 rows (10 areas) | 287.3ms | 82.0ms | 197.0ms | 90 (all 9 other tables, every keystroke) |
| 500 rows (10 areas) | 1119.3ms | 212.8ms | 314.0ms | 90 (all 9 other tables, every keystroke) |

**Conclusion (render cascade proven):** every keystroke re-renders every `EstimateRowItemsTable` in the sheet, not just the edited one. jsdom timings are relative-comparison only, but 82–213ms scripting per keystroke at 200–500 rows confirms the U1 hypothesis and far exceeds the 16ms budget.

## Browser baseline status

BLOCKED for authenticated routes this run: workshop requires real auth (dev-auth bypass disabled), local Supabase unavailable (no Docker), hosted SQL access denied by permission classifier. Recorded in `environment-status.md`. Anonymous `/` HTTP measurement is captured separately in U6 evidence.
