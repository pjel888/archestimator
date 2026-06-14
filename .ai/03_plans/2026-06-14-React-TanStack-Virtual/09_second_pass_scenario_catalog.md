# Second-Pass Scenario Catalog

Status: second-pass UltraQA expansion. These are planning scenarios, not implemented tests yet.

## Priority order

1. Add virtual-path activation assertions before DOM-count assertions.
2. Extend keyboard/focus tests before DnD tests.
3. Add collaboration offscreen cursor tests before shipping row-table virtualization.
4. Keep browser proof mandatory for scroll gaps, sticky overlap, and narrow-panel layout.

## Scenario matrix

| Category | Scenario | Expected proof | Existing tests to extend | New test name |
| --- | --- | --- | --- | --- |
| Normal | Large shared `Tree` renders windowed rows while preserving logical metadata | mounted `[data-tree-row]` count is below logical visible row count; logical ARIA metadata remains correct | `tests/vitest/ui-tree.test.tsx`, `tests/vitest/estimate-sheet-tree-dom.test.tsx` | `virtual mode renders a bounded row window while preserving logical treeitem metadata` |
| Normal | Large row table renders only visible estimate rows | mounted `data-estimate-row-id` count is bounded; header remains present; row ids remain stable | `tests/vitest/perf/estimate-sheet-render-baseline.test.tsx`, `tests/vitest/perf/estimate-sheet-render-relief.test.tsx` | `virtual row table mounts only the visible row window for a large area` |
| Edge | Small trees stay non-virtual | no virtual wrapper/probe event below threshold | `tests/vitest/ui-tree.test.tsx` | `keeps the non-virtual tree path below the virtualization threshold` |
| Edge | Small row tables stay native | no virtual wrapper/probe event below threshold | `tests/vitest/estimate-sheet-cost-inputs.test.tsx` | `keeps the native table body below the row virtualization threshold` |
| Edge | Empty tree/table does not initialize broken virtualizer count | empty state renders; no spacer-only blank panel | `tests/vitest/component-library-ui.test.tsx`, `tests/vitest/estimate-sheet-cost-inputs.test.tsx` | `renders the empty tree state when virtual mode receives zero rows` |
| Hostile | Selector-like ids do not break focus/cursor queries | lookup escapes ids or avoids raw selector interpolation | `tests/vitest/ui-tree.test.tsx`, `tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx` | `focuses virtual tree rows whose ids contain selector syntax` |
| Hostile | Selector-like row ids do not break remote cursor fallback | cursor fallback does not throw and does not force scroll | `tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx` | `falls back safely for remote cursors with selector-like row ids` |
| Hostile | External drag payload over virtual spacer is ignored | no insert, no drop callback, no stale highlight | `tests/vitest/tree-external-drop.test.tsx`, `tests/vitest/estimate-sheet-tree-dom.test.tsx` | `ignores external drops that land on virtual spacer space instead of a row or root zone` |
| Accessibility | Virtual tree reports logical position, not mounted-window position | offscreen siblings still reflected in `aria-posinset` and `aria-setsize` | `tests/vitest/estimate-sheet-tree-dom.test.tsx` | `reports logical aria positions for virtualized tree rows` |
| Accessibility | Virtual row table keeps usable row/cell names | rows and inputs remain discoverable; labels are not duplicated | `tests/vitest/estimate-sheet-cost-inputs.test.tsx` | `keeps estimate row inputs accessible when the virtual body is enabled` |
| Keyboard | ArrowDown crosses a virtual boundary | target logical row scrolls into view, mounts, then receives focus | `tests/vitest/estimate-sheet-tree-dom.test.tsx` | `scrolls and focuses the next logical tree row when ArrowDown targets an unmounted row` |
| Keyboard | Home/End target first/last logical row | first/last logical row mounts and becomes roving target | `tests/vitest/ui-tree.test.tsx` | `scrolls Home and End targets into view before moving tree focus` |
| Keyboard | Estimate cell ArrowUp/ArrowDown uses row id | focus lands on correct row after virtual scroll | `tests/vitest/estimate-sheet-cost-inputs.test.tsx` | `moves estimate cell focus by stable row id across an unmounted virtual row boundary` |
| DnD | First rendered virtual row computes before target correctly | drop callback receives logical target id and before band | `tests/vitest/ui-tree.test.tsx` | `reports the correct before drop target on the first rendered virtual row` |
| DnD | Last rendered virtual row computes after target correctly | drop callback receives logical target id and after band | `tests/vitest/ui-tree.test.tsx` | `reports the correct after drop target on the last rendered virtual row` |
| DnD | Root drop zones stay outside virtual body | top/bottom root zones remain hittable while rows are windowed | `tests/vitest/estimate-sheet-tree-dom.test.tsx` | `keeps root drop zones mounted outside the virtual tree window` |
| Collaboration | Remote cursor for offscreen row does not force local scroll | fallback or edge indicator renders; row tables do not re-render | `tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx` | `renders an offscreen remote cursor fallback without scrolling or re-rendering row tables` |
| Collaboration | Remote cursor for mounted virtual row anchors to DOM | cursor resolves against mounted row/cell | `tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx` | `anchors a remote cursor to a mounted virtual row cell` |
| Search/filter | Search while scrolled deep recomputes logical rows | search reveal resets or intentionally preserves scroll; no stale index | `tests/vitest/estimate-tree-filter.test.tsx`, `tests/vitest/component-library-ui.test.tsx` | `recomputes the virtual tree window after search reveals new logical rows` |
| Search/filter | Component/template search stays windowed | source ancestors remain visible without mounting every match above threshold | `tests/vitest/component-library-ui.test.tsx`, `tests/vitest/templates-tree-performance.test.ts` | `keeps template search results virtualized while preserving source ancestors` |
| Mobile/narrow | Narrow panel does not clip variable-height template rows | no overlapping rows; measured height updates total size | browser/E2E | `does not overlap variable-height template rows in a narrow right panel` |
| Mobile/narrow | Center sheet virtual body does not hide active input under sticky areas | focused middle/bottom row remains visible after scroll-to-focus | browser/E2E | `keeps a focused virtual estimate row visible in a narrow viewport` |
| Performance | Window changes do not create row-table churn | probe reports mounted/total counts; cursor frames do not increase row renders | `tests/vitest/perf/estimate-sheet-render-relief.test.tsx`, `tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx` | `reports virtual window changes without re-rendering unrelated row tables` |
| Performance | Medium fixture does not enable virtualization too early | threshold prevents virtual path for realistic medium data | `tests/vitest/templates-tree-performance.test.ts` | `does not enable tree virtualization for medium project-source fixtures below threshold` |
| Misleading success | Test fails if virtualization silently falls back | force `minRows: 0` or assert virtual wrapper/probe marker exists | new shared tests | `proves the virtual tree path is active before asserting mounted row counts` |
| Misleading success | DOM count cannot pass from collapsed tree | fixture expands all nodes and asserts logical visible count first | `tests/vitest/ui-tree.test.tsx`, `tests/vitest/component-library-ui.test.tsx` | `counts only after proving the large tree fixture is fully expanded` |
| Misleading success | jsdom scroll tests do not pretend to prove browser smoothness | jsdom marked contract-only; browser metric gate remains mandatory | Phase 0 and browser QA docs | `records mounted DOM count and no blank gaps while scrolling a large estimate` |
| Misleading success | Row edit test only covers mounted rows | top/middle/bottom rows each get focus/edit proof after scroll | `tests/vitest/estimate-sheet-library-insert.test.tsx` | `keeps a bottom virtual row edit focused and committed after scroll remount` |

## Scenario bundles by route

### Tree route bundle

Required before enabling `NEXT_PUBLIC_TREE_VIRTUALIZATION=true`:

- virtual-path activation
- large expanded tree mounted-count proof
- Arrow/Home/End across virtual boundaries
- logical ARIA metadata
- first/last rendered-row DnD bands
- root drop zones outside virtual body
- context menu and inline rename on virtual rows
- search while deeply scrolled
- right-panel search after consumer rollout

### Row-table route bundle

Required before enabling `NEXT_PUBLIC_ESTIMATE_ROW_VIRTUALIZATION=true`:

- virtual-path activation
- large row table mounted-count proof
- native/table accessibility proof
- row-id focus across unmounted boundary
- top/middle/bottom edit and blur-save
- pending focus after adding a blank row near the bottom
- selected ids persist while rows unmount
- mounted and offscreen cursor behavior
- browser proof for sticky header and narrow viewport

### Browser-only bundle

These cannot be proven by jsdom alone:

- no blank scroll gaps during fast trackpad scroll
- no sticky header or sidebar overlap
- variable-height templates do not clip
- active input remains visible in narrow viewport
- before/after long-task and initial-render metrics improve

