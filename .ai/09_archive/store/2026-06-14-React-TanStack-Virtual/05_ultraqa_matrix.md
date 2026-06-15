# UltraQA Matrix

## Acceptance gates

| Gate | Requirement | Evidence |
| --- | --- | --- |
| UQA-001 | Flag off preserves current behavior | targeted tests pass with flags unset |
| UQA-002 | Enabled surface renders bounded mounted rows | DOM test or browser check counts mounted rows below full dataset |
| UQA-003 | Browser metric improves | before/after trace shows lower initial render, long-task time, or scroll jank |
| UQA-004 | Small fixtures do not regress | normal-size tests and browser smoke pass |
| UQA-005 | Edit/focus contract preserved | cost-input tests plus manual top/middle/bottom edit QA |
| UQA-006 | Tree contract preserved | tree keyboard, DnD, context menu, selection, search tests |
| UQA-007 | Collaboration contract preserved | cursor isolation tests pass; offscreen cursor fallback proven |
| UQA-008 | Rollback is safe | feature flag disables virtual path without code revert |
| UQA-009 | Virtual-path activation is proven | tests assert the virtual wrapper/probe/path is active before mounted row counts |
| UQA-010 | Browser-only behavior is not overclaimed | scroll gaps, sticky overlap, and narrow layout are proven in browser, not jsdom alone |

Detailed second-pass scenarios live in `09_second_pass_scenario_catalog.md`.

## Normal user scenarios

| Scenario | Action | Expected result |
| --- | --- | --- |
| Estimator opens a large sheet | Load route with many rows | initial mount improves or at least does not worsen; no blank main sheet |
| Estimator edits a long row table | Type quantity in middle and bottom rows | focus and typed value persist; blur-save fires once |
| Estimator navigates cells | Arrow up/down across virtual boundary | row scrolls into view and target cell receives focus |
| Estimator searches left tree | Search term with many matches | expanded search reveal works; row count remains windowed |
| Estimator browses project sources | Expand project -> estimate -> tab -> node | hierarchy and indentation stay correct |
| Estimator drags component | Drag from right library into center row table | mounted drop target accepts copy; no wrong row insert |
| Estimator bulk selects | Select visible row, scroll away, select another | offscreen selected ids persist |

## Edge scenarios

| Scenario | Risk | Expected result |
| --- | --- | --- |
| Empty tree | virtualizer count zero bugs | existing empty state renders |
| Short tree/table | overhead larger than benefit | non-virtual path remains active |
| Variable-height template rows | scroll drift or clipping | measured rows or conservative estimate prevents overlap |
| Context menu opens on virtual row | row remount closes menu | menu stays open and rails stay pinned |
| Inline rename row virtualizes away | lost draft | focused/editing row remains mounted or virtualization pauses while editing |
| DnD at viewport edge | wrong before/after target | drop target is the logical row under pointer |
| Search while scrolled deep | stale virtual indexes | search recomputes logical rows and resets/keeps scroll intentionally |
| Collapse parent with focused child | focus on unmounted row | focus moves to collapsed parent |

## Malicious or hostile inputs

| Scenario | Expected result |
| --- | --- |
| row id contains selector-like text | cursor/focus selector safety remains guarded by safe ids or escaped selectors |
| search query contains long control text | filter tests still pass; no thrown errors |
| drag payload has wrong MIME type | ignored as today |
| external drop over virtual spacer | no insert unless a valid row/root drop zone resolves |

## Regression checks

Run before completion of any implementation PR:

```bash
bunx vitest run tests/vitest/ui-tree.test.tsx tests/vitest/tree-external-drop.test.tsx --maxWorkers=1
bunx vitest run tests/vitest/estimate-sheet-tree-dnd.test.tsx tests/vitest/estimate-tree-context-menu.test.tsx tests/vitest/estimate-tree-filter.test.tsx --maxWorkers=1
bunx vitest run tests/vitest/component-library-ui.test.tsx tests/vitest/templates-tree-performance.test.ts --maxWorkers=1
bunx vitest run tests/vitest/perf/estimate-sheet-render-relief.test.tsx tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx tests/vitest/estimate-sheet-cost-inputs.test.tsx --maxWorkers=1
bun run type-check
git diff --check
```

## Browser proof checklist

Use the real Estimate Sheet Page, not only jsdom:

- [ ] Chrome Performance trace for before/after
- [ ] React Profiler commit comparison if possible
- [ ] DOM row count comparison for enabled surface
- [ ] scroll through large tree and table with normal trackpad speed
- [ ] no obvious blank gaps during scroll
- [ ] no sticky header overlap
- [ ] no console warnings from React 19 `flushSync`
- [ ] no hydration warnings
- [ ] no accessibility role/name regressions in the changed tree/table surface

## Failure response

If any of these happen, disable the relevant flag and do not ship the virtual path:

- edit focus is lost during normal typing
- blur-save does not persist edits
- tree DnD inserts in the wrong location
- context menu opens for the wrong row
- remote cursor traffic re-renders sheet rows
- browser trace shows worse long-task time on normal fixtures
- row/table visual overlap appears on mobile or narrow panels
- a windowing test passes without proving the virtual path is active
