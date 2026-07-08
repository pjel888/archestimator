# 05 - UX, UI, And Accessibility Plan

## UX Principle

The sheet must feel like a stable workstation, not a page that periodically rebuilds itself. Optimization must preserve focus, scroll, selection, and spatial memory.

## Perceived Performance

Required behaviors:
- Keep route skeleton meaningful and immediate.
- Avoid parent fallback flashes during internal estimate transitions.
- Keep visible rows stable during background refresh.
- Show pending state for expensive non-urgent transitions without blocking typing.
- Preserve previous visible results during deferred search/filter recompute.

## Interaction-Specific Plan

### Typing In Row Cells

Target:
- Input echo is immediate.
- Only the edited row, owning table, and ancestor totals update.
- Remote cursor layer does not invalidate row/table render.

Future implementation:
- Use graph row patches and incremental total propagation.
- Keep row editor state local or row-scoped.
- Use stable row selectors so sibling rows do not receive changed prop references.

### Search And Facets

Current risk:
- `filterEstimateSheetNode`, `filterEstimateSheetNodeByFacets`, `collectSheetFacetOptions`, and `reorderEstimateSheetNodeRows` traverse and clone selected subtrees.

Plan:
- Defer search result rendering with `useDeferredValue`.
- Use `startTransition` for filter/group changes.
- Replace array `includes` facet checks with `Set`-backed selectors when active.
- Build facet option indexes incrementally from loaded rows.
- Define incomplete-subtree search behavior before server-assisted search:
  - Phase 1: loaded-tree-only, clearly scoped.
  - Later: optional server-assisted search if product requires global search across unloaded branches.

### Move Row Dialog

Current risk:
- `collectRowMoveNodeOptions` walks the full tree.
- Position select can create an option per row in the target node.

Plan:
- Target area picker becomes searchable and virtualized when option count exceeds threshold.
- Position picker becomes semantic:
  - top
  - bottom
  - before visible row
  - after visible row
  - type row number or search row label
- Do not render thousands of `<option>` elements.

### Expansion And Collapse

Plan:
- Keep expansion state separate from node data.
- Deduplicate in-flight subtree requests.
- On expansion, preserve scroll anchor and focused element.
- When data loads, insert measured virtual rows without blank gaps.

### Express Editor

Current behavior:
- Row virtualization disables for the table containing an active express editor.

Risk:
- A large single-area table can mount all rows while editor is open.

Plan:
- Keep focus-safe behavior initially.
- Add browser proof for active editor in a 5,000-row table.
- If the proof fails, isolate the express editor in a portal or pinned detail surface so virtualization can remain active.

## Accessibility Requirements

- All virtualized rows must retain correct accessible names and interactive controls.
- Focus restoration after virtualization scroll must be tested.
- Search/filter pending states must not be announced excessively.
- Row move controls must remain keyboard-operable after replacing huge selects.
- Loading/truncation states must be visible and programmatically discoverable.
- Virtualization must not cause screen-reader-only duplicate rows.

## Visual Stability Requirements

- No overlapping sticky headers.
- No blank virtual gaps during scroll.
- Column resize must keep header/body alignment.
- Long labels must truncate or wrap within constraints.
- Collaboration cursors must not obscure active text inputs.
- Bulk action toolbar must not cover focused rows without scroll padding.

## UX Acceptance Tests

- Type in first, middle, and last visible row at stress size.
- Open express editor at stress size and type without unmounting.
- Search with 2,500 rows and clear search without losing selected node.
- Toggle supplier/category facets with long option names.
- Move a row to a node with 1,000 existing rows.
- Expand/collapse deep branches while scrolled.
- Resize columns while rows are virtualized.
- Trigger remote cursor updates during typing.

