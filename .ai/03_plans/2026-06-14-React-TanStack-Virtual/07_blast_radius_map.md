# Blast Radius Map

Status: second-pass planning with 2026-06-15 product-scale correction. This document maps what can break if `@tanstack/react-virtual` is introduced.

## Executive blast-radius verdict

The blast radius is not the package install. The blast radius is the moment mounted DOM stops matching logical data.

Virtualization changes these assumptions:

- a focused tree row or estimate row may not exist in the DOM yet
- `querySelector`-based focus and cursor code can miss valid logical targets
- row counts in tests can become mounted-window counts instead of dataset counts
- DnD can land on spacer space instead of a real row
- native table semantics can fight absolute positioning or virtual row wrappers

The safest plan is still split-route delivery:

1. plan shared Tree virtualization for expected production-scale nested BOQs
2. plan EMC branch/section virtualization for expected production-scale center BOQs
3. ship no runtime behavior change with flags off
4. enable only one surface/consumer at a time
5. keep non-virtual render paths intact until after closed-beta proof
6. keep EMC row-table body virtualization separately flagged from EMC branch virtualization

Architectural status: `PROCEED WITH SHARED TREE AND EMC PLANS`. The plan is structurally sound for planning and default-off implementation. The flags are not safe to turn on by default until offscreen focus/scroll handling is explicit and browser proof covers Tree, EMC branch sections, and row-table behavior.

## Asymmetric risk summary

| Area | Risk shape | Practical meaning |
| --- | --- | --- |
| Shared `Tree` | broadest integration risk | one primitive change touches left tree, right library tree, and templates tree |
| Left `EstimateSheetTree` | best first consumer proof | combines rename, rails, context menu, DnD, selection, and current-row behavior |
| Right library/templates trees | moderate integration risk with height risk | mixed-height rows, skeletons, and search-expanded hierarchies may need `measureElement` or larger estimates |
| EMC branch/section stream | high layout and interaction risk | mixed-content ordering, collapse/search, drop zones, sticky header, and dynamic section heights cross the virtual boundary |
| Center row table | highest editing correctness risk | editing, blur-save, index focus, pending focus, sticky geometry, and remote cursors all cross the virtual boundary |

## Blast-radius boundaries

| Boundary | In scope | Out of scope for first implementation PR |
| --- | --- | --- |
| Shared tree rendering | `Tree` virtual mode behind prop/flag | replacing all tree rendering with a new tree component |
| EMC branch sections | center branch/section virtual mode behind flag | deleting the recursive fallback before proof |
| Estimate row tables | row-body virtual mode behind prop/flag | coupling table body virtualization to EMC branch virtualization without separate proof |
| Focus recovery | scroll-to-logical-row before DOM focus | broad keyboard navigation rewrite |
| Collaboration cursors | mounted-row anchor plus offscreen fallback | forcing local scroll to remote cursor locations |
| Performance evidence | browser trace plus mounted DOM counts | relying on jsdom timing alone |
| Rollout | local/staging flags | default-on behavior without rollback proof |

## Surface map

| Surface | Primary files | Current assumption | Virtualization risk | Required proof |
| --- | --- | --- | --- | --- |
| Shared tree primitive | `src/components/ui/tree.tsx` | `flatNodes.map(...)` renders every visible logical row | every consumer inherits focus, DnD, ARIA, and context-menu regressions | shared virtual/non-virtual tests with virtual-path activation assertions |
| Left sheet tree | `src/components/workshop/EstimateSheetTree.tsx` | mounted row exists for current item, context menu item, DnD item, and inline rename | lost rename draft, wrong drop target, wrong current-row rail | browser proof on the estimate route plus tree DnD/context-menu tests |
| Right library tree | `src/components/workshop/component-library/tree/LibraryTree.tsx` | search-expanded project sources render as normal tree rows | search can reveal many logical rows while only a window mounts | search + drag-to-sheet proof with bounded mounted row count |
| Right templates tree | `src/components/workshop/component-library/tree/TemplatesTree.tsx` | template rows can be taller and source hierarchy remains visible | variable row height can clip or drift during scroll | narrow-panel browser proof; `measureElement` if clipping appears |
| Library folder manager tree | `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` | folder/component rows are always mounted after filtering | folder management can inherit shared focus, DnD, and selection regressions | include in Tier 3 rollout after left/right panel proof |
| Templates browse manager tree | `src/components/workshop/library/templates-browse/TemplatesBrowseManager.tsx` | custom template trees render every expanded row | lower-traffic route can still regress context menu and reorder | Tier 3 browser/test proof |
| Template editor structure tree | `src/components/workshop/library/template-editor/TemplateStructureTree.tsx` | editing tree rows are mounted synchronously | reorder/delete context menu can target an unmounted row | Tier 3 browser/test proof |
| EMC branch/section hierarchy | `src/components/workshop/EstimateSheetContent.tsx`, `src/components/workshop/estimate-sheet/rows/branch.tsx` | recursive branch rendering mounts every expanded visible node section | rows-first order, collapse/search, sticky header, drop targets, and dynamic section heights can regress | branch-stream activation tests, mixed-content tests, browser scroll/drop proof |
| Center row table | `src/components/workshop/estimate-sheet/rows/row-table.tsx` | native table body maps every row item | absolute rows or wrappers can break table semantics, sticky columns, and row heights | spike before main route; accessibility and visual proof |
| Cell focus helpers | `src/components/workshop/estimate-sheet/rows/cells.tsx` | focus can query by `data-estimate-row-index` | stale index or unmounted target loses edit focus | row-id focus helper; top/middle/bottom edit proof |
| Sheet content cursor/focus | `src/components/workshop/EstimateSheetContent.tsx` | pending focus and cursor anchoring can query mounted row DOM | offscreen target can fail or retry without mounting | offscreen fallback test; no forced local scroll |
| Render probes | `src/components/workshop/estimate-sheet-render-probe.ts` | probe tracks render churn, not window activation | tests can pass while the virtual path is never active | mounted/total virtual-window probe or explicit virtual wrapper marker |

## Sequencing pressure points

1. Solve Tree scroll-to-target before focusing offscreen rows. The current Tree focus model is mount-dependent; virtualization will expose that immediately.
2. Prove left `EstimateSheetTree` first if the tree route wins Gate 0. It is the strongest consumer because it exercises rename, DnD, rails, context menu, and selection together.
3. Treat right trees as a separate consumer rollout even though they share `Tree`. Their row content is mixed-height and can include loading skeletons, so a fixed `28px` estimate may be too optimistic.
4. Plan EMC branch/section virtualization as its own center-surface route; do not assume shared Tree virtualization solves the center sheet.
5. Keep EMC row-table virtualization separately proven unless a large single-node row fixture proves it is needed. It already uses `content-visibility: auto` and intrinsic sizing, so row count alone is not enough proof.
6. Do not enable row-table virtualization until row-id-based scroll/focus and offscreen cursor fallback are designed.

## Contract map

### Data identity

Required invariant: logical identity is row id or node id, not mounted index.

Risk:

- `getItemKey` must use stable ids.
- Estimate cell focus must stop relying on row index as the only address.
- Tests must assert the logical fixture count before asserting the mounted count.

Proof:

- virtual tree rows preserve `data-tree-row`
- virtual EMC sections preserve node ids and section labels
- virtual estimate rows preserve `data-estimate-row-id`
- selected ids survive row unmount/remount

### Focus and keyboard

Required invariant: keyboard navigation moves through logical rows, then scrolls/mounts the target before DOM focus.

Risk:

- Arrow/Home/End can target an unmounted tree node.
- ArrowUp/ArrowDown in cells can target an unmounted estimate row.
- Collapse/search can remove the focused row.

Proof:

- tree focus tests cross virtual boundaries
- EMC branch focus/drop tests cross virtual boundaries
- estimate cell focus tests edit top, middle, and bottom rows after scroll
- collapse moves focus to the surviving logical parent

### DnD and drop zones

Required invariant: drops resolve to logical targets, never virtual spacer pixels.

Risk:

- first rendered row may not be the first logical row
- last rendered row may not be the last logical row
- root drop zones can disappear if placed inside the virtual row window
- external payloads over spacer space can create stale hover state

Proof:

- before/after/inside tests on first and last rendered rows
- root zones mounted outside the virtual body
- invalid payload over spacer is ignored

### Accessibility

Required invariant: assistive metadata describes the logical tree/table, not only mounted rows.

Risk:

- `aria-posinset` and `aria-setsize` can accidentally become window-local
- row/table role names can duplicate or disappear if table markup changes
- virtual wrappers can add noisy roles

Proof:

- virtual tree rows retain logical `aria-level`, `aria-posinset`, and `aria-setsize`
- estimate row inputs remain discoverable by accessible name
- browser spot-check with the actual route

### Collaboration and pending focus

Required invariant: remote or pending focus state cannot force disruptive local scrolling or re-render all row tables.

Risk:

- offscreen remote cursor target has no DOM anchor
- retry loops can spin against unmounted rows
- cursor traffic can defeat render-isolation wins

Proof:

- mounted cursor anchors correctly
- offscreen cursor uses fallback without scrolling the local user
- row render counters stay isolated during cursor movement

### Browser performance

Required invariant: the chosen route improves the failing browser metric without making normal fixtures worse.

Risk:

- medium data sets get slower from measurement overhead
- overscan too low creates blank gaps
- dynamic heights create scroll drift
- jsdom tests do not prove real scroll smoothness

Proof:

- before/after trace on the real route
- DOM count for enabled surface
- no blank gaps during fast trackpad scroll
- threshold tests keep normal fixtures non-virtual

## Do-not-touch list for first implementation

- Do not replace the shared `Tree` API with a separate virtual-tree-only component.
- Do not virtualize shared Tree, EMC branch sections, and EMC row-table bodies in the same implementation PR unless explicitly scoped with separate flags and proof.
- Do not remove non-virtual row rendering until flags have survived closed-beta proof.
- Do not make virtualization default-on in the first PR.
- Do not use jsdom timing as the main performance proof.
- Do not force local scroll for remote cursors.

## Watchlist during implementation

| Watch item | Why it matters | Stop condition |
| --- | --- | --- |
| row/table visual overlap | virtual tables are structurally fragile | any overlap in browser on narrow or normal viewport |
| lost edit focus | estimator data entry is core workflow | focus lost during normal top/middle/bottom edits |
| wrong DnD insertion | can corrupt estimate structure | wrong logical target or stale hover band |
| false DOM-count proof | can ship no-op virtualization | test lacks virtual-path activation assertion |
| cursor retry loops | can reintroduce render churn | cursor traffic re-renders row bodies |
| medium fixture regression | users may mostly have medium sheets | browser trace worsens when below threshold |

## Implementation order bias

Default bias after the 2026-06-15 product-scale correction:

1. shared Tree primitive
2. left `EstimateSheetTree` consumer
3. EMC branch/section virtual route
4. right library/templates consumers with row-height proof
5. lower-traffic shared Tree consumers
6. EMC row-table only after a table/focus spike

The current plan should not exclude EMC merely because the sample project is small. EMC branch/section virtualization is planned; EMC row-table virtualization needs the additional table/focus spike because it is the highest editing correctness-risk surface.
