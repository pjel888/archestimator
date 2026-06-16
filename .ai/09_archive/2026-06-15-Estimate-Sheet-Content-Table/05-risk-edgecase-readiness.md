# 05 — Risk, Edge-Case & Readiness Audit: Resizable-Column Estimate Sheet

Date: 2026-06-15 · Type: **planning / audit only (no code changes)** · Scope: everything that could break BESIDES core rendering/state mechanics and the TanStack API surface (those are deferred to sibling docs 01–04, 06).

This document answers one question: **if we make the estimate sheet's columns user-resizable and sync the widths across every node group, what else breaks, and are we ready to ship it?**

---

## 0. Orientation — what the estimate sheet actually is today

The estimate sheet is **not one table**. Each node (Area / sub-area) renders its **own** `EstimateRowItemsTable` instance via `EstimateSheetBranch` (`src/components/workshop/estimate-sheet/rows/branch.tsx:370`), and a single scrolling tab can contain **many** such tables stacked vertically inside one `[data-estimate-pointer-surface]` scroll container (`EstimateSheetContent.tsx:2705-2707`). "Resizable columns synced across all node groups" therefore means **N independent `<table>` elements must agree on column widths** — there is no shared table instance to lean on.

Columns today are a **fixed CSS grid template**, identical on header and every row, hard-coded as a Tailwind class:

```
const ROW_COLUMNS = "grid-cols-[36px_32px_minmax(160px,1fr)_58px_92px_106px_92px_108px_30px]";
```
(`row-table.tsx:96`, applied at `:243` on each `<tr>` and `:626` on the `<thead>` row.)

Note this is **`display: grid` on `<tr>`/`<thead>` rows, not native table layout** — cells are flex/grid children, *not* `<td>` participating in table column sizing. Nine tracks: `#` (36px), select (32px), Materials (`minmax(160px,1fr)` — the only flexible one), Qty (58px), Subtotal (92px), Adjustment (106px), Misc (92px), Total (108px), actions (30px). Total fixed width ≈ 554px + flexible Materials.

**Critical pre-existing asset:** the codebase **already has a complete, accessible TanStack-Table column-resize implementation** in `ProjectEstimatesTable.tsx` — `@tanstack/react-table@^8.21.3` is installed (`package.json`), it uses `<colgroup>` + `col.getSize()` (`:100-104`), `columnSizing` state persisted to `localStorage` (`COLUMN_WIDTH_STORAGE_KEY_PREFIX`, `:71`, `:755-801`), and a keyboard-accessible resize handle with `role="separator"` (`:723-740`). **This is the reference implementation to mine.** The blast-radius below is almost entirely about the *estimate-sheet-specific* features that `ProjectEstimatesTable` does not have to contend with.

---

## 1. Integration Risk Register

Severity scale: **S1 = blocks ship / silent data or UX corruption**, **S2 = visible regression**, **S3 = polish/edge**.

| # | Feature | How resizable columns could break it | Sev | Mitigation / Test |
|---|---------|--------------------------------------|-----|-------------------|
| R-1 | **Collaboration cursor horizontal anchoring** (`resolveCursorTarget`, `EstimateSheetContent.tsx:838-855`) | Cursor X is reconstructed as `anchorBounds.left + fracX * anchorBounds.width`. `fracX` is captured on the **sender's** cell width (`:897`). If the receiver has resized that column to a different width, the marker lands at the wrong horizontal offset *within* the correct cell — proportional, so usually <½ cell, but visibly off. Cursors stay on the **correct logical cell** (anchor is by `data-estimate-cell-index`, which resize does not change). | S2 | Per-user widths are inherently divergent — accept proportional drift as the documented contract (already the case across viewport/zoom differences). Add an e2e assertion: resize a column on receiver, confirm the remote marker still resolves *inside* the same `data-estimate-cell-index` element (cell identity), not pixel-exact. Do **not** broadcast column widths. |
| R-2 | **Cursor cell-index anchoring survives resize** (good news, verify it) | Anchoring keys on `data-estimate-cell-index` / `data-estimate-row-id` (`cells.tsx:25-43`, `row-table.tsx:326-328`, `:382-384`, `:417-419`). Because the overlay **re-resolves every rAF frame** against live `getBoundingClientRect` (`:954-963`), a resize *self-heals* the marker on the next frame — no stale geometry. This is the single biggest reason resize is safer than it looks. **Risk:** a TanStack migration that drops or renames these data attributes silently breaks anchoring. | S1 | **Hard requirement: preserve `data-estimate-cell-index`, `data-estimate-cell-active`, `data-estimate-row-id`, `data-estimate-row-index` byte-for-byte** through the refactor. Add a render-probe/DOM test asserting every editable cell still carries its `data-estimate-cell-index`. |
| R-3 | **Resize-handle drag vs row/component drag pointer ownership** | Component drag uses native HTML5 DnD (`draggable` grip, `cells.tsx:514-519`, `dataTransfer` MIME types). TanStack resize uses **pointer/mouse/touch** events (`getResizeHandler`, see `ProjectEstimatesTable.tsx:737-738`). These are different event systems, but the resize handle lives in the **header**; if the header gains any `draggable` affordance, or if `onMouseDown` on the handle bubbles to a draggable ancestor, a resize gesture can initiate a ghost drag. Also `useDragEdgeAutoScroll` listens on `dragover` at the surface (`use-drag-edge-autoscroll.ts:79`) — a resize is *not* a drag, so it won't trigger autoscroll (fine), but a resize that drags the pointer to the viewport edge will **not** autoscroll horizontally (gap, see R-9). | S2 | Resize handle must `event.stopPropagation()` on `pointerdown`/`mousedown` and carry `touch-none select-none` (the reference handle already does: `ProjectEstimatesTable.tsx:730`). Header must not be `draggable`. Test: start a resize that overlaps a drag-grip region — assert no `dragstart` fires and the drag store (`useEstimateWorkshopDragState`) stays `null`. |
| R-4 | **Cross-group width sync** (the headline feature) | There is no shared table instance; N `EstimateRowItemsTable` mounts each own layout. Naive per-table state → columns desync between groups in the same tab; the user resizes group A and group B is untouched — looks broken. | S1 | Make `[data-estimate-pointer-surface]` the single CSS-variable source of truth. Live drag writes `--est-col-*` vars on that ancestor; every group row/header reads the same var-driven grid template. Commit final widths to a shared store only on drag end. Test: resize in group A/shared header, assert group B's computed grid track widths update in the same animation frame without row renders. |
| R-5 | **Express inline editor / `getActiveExpressEditorRowId`** (`EstimateSheetContent.tsx:445-451`; editor `cells.tsx:171-365`) | The express editor is a **card layout inside the Materials cell**, not column-bound (`EstimateMaterialCardFrame`, fixed `pr-[92px]`, `w-[84px]` cost, `cells.tsx:106`, `:306`). It reads no column geometry, so resizing other columns is safe. **But** resizing **Materials very narrow** squeezes the card; the hard-coded `pr-[92px]`/`w-[84px]`/`size-14` image can overflow or clip the inline inputs. Also virtualization is **force-disabled while an express editor is active** (`row-table.tsx:493`, `:522-529`) — a resize during active editing must not remount/blur the focused input. | S2 | The plan default/min remains 160 for byte-identical Phase 0; before user-visible resize, measure the express-card floor (56px image + gap + `pr-[92px]` + `w-[84px]` cost + unit/edit controls). If the measured floor is higher, raise default and min together. Test: open express editor, resize Materials to the chosen min, assert all `data-express-field` inputs remain visible and focus is retained (no remount). |
| R-6 | **Bulk selection toolbar & header "select all"** (`row-table.tsx:628-642`, toolbar `:2745`) | Select-all checkbox lives in the fixed 32px column; bottom-dock `BulkActionToolbar` docks to the **container** (`placement="bottom-dock" dockTo="container"`, `:2746-2747`), not to columns — no geometry coupling. Low risk. Edge: if select column becomes resizable to 0, checkbox is unreachable. | S3 | Mark `#`, select, and actions columns **non-resizable** (`enableResizing: false`) — only data columns resize. Test: assert resize handles are absent on gutter/action columns. |
| R-7 | **Inline edit keyboard navigation** (`handleEstimateCellKeyDown`, `cells.tsx:45-73`; arrow-key cell traversal by `data-estimate-cell-index`) | Navigation is index-based, not geometry-based — resize cannot break it. **But** after Arrow-Up/Down into a virtualized row, `focusEstimateCellByRowId` + `scrollToIndex` runs (`row-table.tsx:506-539`); width changes that alter row height (e.g. narrow Materials wrapping more text) can perturb the virtualizer's `estimateSize` (96px assumption, `:498`) → focus-restore scroll math drifts. | S2 | Keep row min-height stable (`min-h-24`, `:240`) regardless of column width; avoid width-driven wrapping in the data columns (numeric, fixed). Test: virtualized table, narrow a column, arrow-navigate across the viewport boundary, assert focus lands on the right cell. |
| R-8 | **Filtering / grouping / search** (`displayedSheetNode`, `EstimateSheetContent.tsx:1272`, `:606`) | These recompute the **node tree fed to tables**; they never touch column geometry. When search yields a different (referentially new) `displayedSheetNode`, all tables re-render — column widths must **persist across this re-render**. If sizing lived in per-table component state it would survive; if it's keyed by node id and the node set changes, widths could reset. | S2 | Store widths **per estimate, not per node or per tab** (widths are a sheet-level preference, shared across groups and tabs per R-4). Test: apply a search filter and switch tabs, assert column widths unchanged before/after. |
| R-9 | **Horizontal scroll / total width > viewport** | Today the table is `overflow-hidden` and the **parent surface is `overflow-auto`** (`:2706`, `row-table.tsx:619`) but the grid uses `minmax(160px,1fr)` so it **never exceeds the viewport** — Materials flexes down. Once columns are user-fixed via px widths, total width can exceed the viewport → horizontal scroll appears. Then: (a) `<thead>` is **not sticky horizontally**; (b) the `#`/select columns are **not sticky-left**, so they scroll away; (c) `useDragEdgeAutoScroll` only handles **vertical** (`scrollTop`, `use-drag-edge-autoscroll.ts:58`) — no horizontal drag-autoscroll; (d) cursor X math adds `surface.scrollLeft` (`:849`, `:901`) — already handles horizontal scroll, good. | S2 | Decide the **flex-vs-fixed contract** (see Edge Cases §2.2). Recommended: keep Materials flexible (`1fr`/min) and let total width track viewport so horizontal scroll is rare; if a column is widened past viewport, accept horizontal scroll on the surface (`scrollLeft` already in cursor math). Consider sticky-left for `#`/select if horizontal scroll becomes common (later phase). Test: set widths summing > viewport, assert surface scrolls horizontally and remote cursors still resolve. |
| R-10 | **Proposal export / preview** (`ProposalExportPreviewDialog.tsx`) | Export preview uses its **own** layout (`grid grid-cols-3`, `:394`) and reads `estimateNodeTotals`/signatures, **not** the sheet's column widths. Confirmed independent — **no risk**. Resizable widths are a screen-only preference and must **not** leak into export. | S3 | Document that column widths are presentation-only. Test: snapshot proposal export, assert it ignores the estimate column-width store and CSS vars. |
| R-11 | **Print / PDF view** | If any print stylesheet or html2canvas-style capture targets the live sheet DOM, user-narrowed columns would clip content in print. (Export uses its own dialog, so likely N/A, but verify no `@media print` rule renders the live sheet.) | S3 | Grep for `@media print` over the sheet; if present, reset to default grid template in print. Otherwise mark N/A. |
| R-12 | **Render probe / perf budget** (`estimate-sheet-render-probe.ts`; comparator `row-table.tsx:66-94`) | `areEstimateRowItemsTablePropsEqual` is a hand-rolled memo that re-renders a table only on its own slice changes. A shared `columnSizing` store, if passed as a prop or read via a non-selective hook, can **re-render every table on every resize tick** (resize fires many times/sec during a drag) — perf regression, and the probe will catch a render storm. | S1 | Required path: live drag applies widths through CSS custom properties on the shared ancestor outside React's render path; the store updates only on commit. Add render-probe assertions: resize pointer moves must produce **zero row renders, zero branch renders, zero content renders, and zero storage writes**; commit may produce at most one content/surface update and zero row renders. |
| R-13 | **RTL / i18n** | Resize handle is positioned `right-0` (`ProjectEstimatesTable.tsx:730`) — in RTL the handle should sit on the inline-end, and the `#`/actions gutters flip. Peso formatting (`pesoFormatter`) and `tabular-nums` are LTR-numeric and unaffected. Arrow-key resize semantics (Left shrinks/grows) invert in RTL. | S3 | Use logical properties (`inset-inline-end`) for the handle; confirm the app's RTL support status before investing (likely LTR-only today — verify). Defer unless RTL is a shipped locale. |
| R-14 | **Touch / mobile resize** | Reference handle binds `onTouchStart` + `touch-none` (`ProjectEstimatesTable.tsx:738`, `:730`), so touch resize works, but a 2px/8px handle is below the 44px touch-target guideline; on a horizontally-scrolling sheet a touch-drag near a column edge competes with scroll. | S3 | Widen the touch hit-area (handle wrapper ≥ 24px) without widening the visual line; `touch-none` on the handle only. Test on a real touch device or Playwright touch emulation. Consider disabling resize entirely below a breakpoint (mobile uses default grid). |
| R-15 | **Drop zones & replace-on-drop targets** (`drop-zones.tsx`, `cells.tsx:404-436`) | Drop zones (`ComponentDropTarget`, `TemplateDropZone`) are full-width bands below tables, not column-bound — resize-safe. The **replace-on-drop** target is the Materials cell (`cells.tsx:450-461`); its ring highlight (`ring-2 ring-inset`) scales with the resized cell automatically. Low risk; just confirm the drop hit-target stays usable at Materials `minSize`. | S3 | Covered by R-5's Materials `minSize`. Test: drag-replace into a min-width Materials cell. |
| R-16 | **Favorites recent work** (commit `39401cd` "Surface favorite estimate sheets on project cards") | Touches `ProjectCard`/project-card surfaces and favorites schema — **no column-width assumptions** in the sheet. Confirmed orthogonal. | — | No action. |
| R-17 | **Proposal export / workbook package / public share** | Column widths are a private screen preference. If export, workbook, or shared/public views accidentally consume the live sheet CSS vars, user-specific layout choices could leak into deliverables or read-only receivers. | S2 | Treat widths as workshop-only presentation state. Export/workbook/public-share renderers must ignore the column-width store and use their own document layouts. Add snapshot/DOM assertions in the surfaces listed in `08-execution-and-traceability.md`. |
| R-18 | **Feature-flag rollback** | A partial rollout can leave persisted widths, CSS vars, or handles active after the feature is disabled, causing hard-to-debug geometry changes. | S1 | Gate the full resize surface behind `NEXT_PUBLIC_ESTIMATE_COLUMN_RESIZE_ENABLED=false` by default. Flag-off behavior must render the current hardcoded grid, hide handles, skip hydration/persistence, and ignore stored widths. |
| R-19 | **Template / project-source insertion flows** | Inserted rows from templates or project source reuse the row table. If the refactor changes row keys, cell attributes, or width assumptions, newly inserted rows can align differently from existing rows. | S2 | Include template insert, project-source insert, and manual component insert in the blast-radius test matrix. New rows must inherit the same ancestor CSS vars with no per-row width state. |
| R-20 | **Storybook / isolated harnesses** | Isolated stories may mount row tables without the workshop pointer surface. A CSS-var-only implementation can render with missing variables or skip resize evidence if stories are not updated. | S3 | Provide default CSS var fallbacks in `COLUMN_TEMPLATE`; update or add a Storybook/demo harness with the shared surface wrapper for visual regression and manual QA. |

---

## 2. Edge Cases

### 2.1 Min / max width clamping
- Reference impl clamps in `resizeBy` and via `columnDef.minSize/maxSize` (`ProjectEstimatesTable.tsx:702-704`, per-column `minSize`/`maxSize` at `:906-1021`). **Adopt per-column clamps.** Required clamps for the estimate sheet: Materials default/min is 160 for Phase 0, then must be revalidated by the express-card floor measurement before user-visible resize; numeric columns `minSize ≥ 48` (must still show a peso value + `tabular-nums`); `maxSize` to keep a single column from pushing all others off-screen.
- Edge: a saved width below a *newly raised* `minSize` (after a future redesign) — clamp on read, not just on write.

### 2.2 Flexible vs fixed column interaction (the hard one)
- Today exactly **one** column flexes (`minmax(160px,1fr)` Materials); the rest are fixed. TanStack column sizing is **all-px** — there is no native `1fr`. Three options:
  1. **All columns fixed px, Materials gets the largest default + grows on resize** — simplest, but the table no longer fills the viewport when narrow (trailing gap) and can under/overflow.
  2. **Keep Materials as a flex track via `minmax(var(--est-col-material), 1fr)` + the rest px vars** — Materials absorbs slack; resizing a *fixed* column steals from Materials. Closest to today's behavior. **Recommended.**
  3. **Fluid mode (TanStack `columnResizeMode`) with `1fr`-like distribution** — most complex.
- Edge: if the user shrinks every fixed column, Materials grows unbounded; if they widen everything, Materials hits its `minSize` then the table overflows → horizontal scroll (R-9). The contract must be explicit and tested at both extremes.

### 2.3 Total width exceeds viewport + horizontal scroll + sticky columns
- See R-9. Decisions needed: (a) does horizontal scroll live on the per-table element or the shared surface? **The surface** (`scrollLeft` is already in cursor math, `:849`); per-table horizontal scroll would desync widths visually across groups. (b) Sticky-left `#`/select? Nice-to-have, defer. (c) Shared ruler/header on horizontal scroll is an **S2 risk**, not polish: once fixed px widths exceed the viewport, labels and handles must stay aligned with body tracks. The ruler must either participate in the same horizontally scrolling content flow or mirror `surface.scrollLeft`, as specified in `07`.

### 2.4 Touch devices
See R-14. Plus: pinch-zoom must not be hijacked by `touch-none` on anything but the handle itself.

### 2.5 Very long content
- Materials name/description already `truncate` (`cells.tsx:133`, `:137`). Narrowing Materials → more truncation (acceptable, `title` tooltips exist). Numeric columns use `tabular-nums` + `truncate` on adjustment value (`:391`); at `minSize` a large peso value could clip — assert the formatted total fits at `minSize` or `truncate`s gracefully.
- Supplier/source meta currently uses `text-tertiary`; when it is load-bearing at a narrow `Materials` width, move to an AA-safe treatment such as `secondary #5D5D5D` or expose the full text through the row inspector/accessible description. `title` alone is not enough for touch and screen reader users.

### 2.6 Reset behavior
- Reference impl supports **double-click** and **Home key** → `resetSize()` (`ProjectEstimatesTable.tsx:719`, `:735`). Adopt both. Add a "Reset columns" affordance (menu item) to reset *all* columns, since cross-group sync means one reset should restore the whole sheet.

### 2.7 Collaboration cursor re-anchoring after resize
- The rAF overlay re-resolves anchors every frame against live geometry (`:954-963`), so a local resize re-anchors **local** remote-cursor markers automatically within one frame — **no special handling needed** (this is the strongest safety property; verify it doesn't regress, R-2). The only residual is the proportional `fracX` drift of R-1, which is inherent and accepted.

### 2.8 Persistence edge cases (when added)
- Mirror `ProjectEstimatesTable`'s storage hygiene: empty sizing → `removeItem` (`:88-89`), try/catch around `localStorage` (private mode / quota). Key by estimate id only — **not** per tab and **not** per node (R-8). Schema-version the key (`...:v1`) for future column changes.

---

## 3. Accessibility Requirements

The project's a11y bar (per `DESIGN.md` / decisions and the AA memory note) requires keyboard operability, visible focus, ARIA roles, and AA contrast. The **reference handle already meets most of this** (`ProjectEstimatesTable.tsx:723-740`) — replicate it:

- **Role & semantics:** `role="separator"` + `aria-orientation="vertical"` + descriptive `aria-label="Resize {column} column"`. (Reference: `:725-728`.) Consider adding `aria-valuenow/min/max` (the current px width) so AT announces the size during keyboard resize — the reference omits this; **upgrade here** to clear the bar for a denser, multi-table surface.
- **Keyboard resize:** `tabIndex={0}`; ArrowLeft/ArrowRight to grow/shrink by a fixed step (reference uses ±16px, `:711`/`:715`); **Home** to reset (`:719`). Add **Enter/Space** to no-op or toggle a "fit" if desired. Step must be clamped to min/max (R-2.1).
- **Focus management:** handle must be in tab order *after* its header label, not interleaved with cell inputs (which use a separate index-based navigation, `cells.tsx:45-73`). A resize must **never steal focus** from an active cell/express input (R-5).
- **Visible focus:** reference uses `focus:after:bg-accent focus:after:w-0.5` (`:732`) — a visible accent line. The current accent token is `#3D3D3D` per `DESIGN.md`, about 10.4:1 on white, so it passes AA. Use the token; do not hardcode blue.
- **aria-live:** the sheet has live regions (`:667` express/SR polite region, `:999` cursor SR region). **Do not** announce every resize tick (spam). If announcing at all, debounce to the **final** width on `pointerup`/blur via a polite region: "{column} column resized to {N} pixels." Keyboard resize may announce per keypress via `aria-valuenow` instead.
- **Hit target / pointer:** `cursor-col-resize`, `touch-none select-none` (`:730`). Widen touch target (R-14) without shrinking visible focus ring.
- **Reduced motion:** resize has no animation; the cursor overlay already honors `prefers-reduced-motion` (`:947-950`) — unaffected.
- **RTL:** logical `inset-inline-end` for the handle (R-13).

**A11y acceptance gate:** every data-column header exposes a focusable `role="separator"`; full keyboard resize + reset works with no mouse; screen reader announces column name and (ideally) size; no focus theft from cell editing; AA contrast on the focus indicator.

---

## 4. Testing Strategy

### 4.1 Unit (Vitest)
- `resizeBy` clamping at min/max (port from reference logic).
- Shared width-store reducer: one write → all readers see it (R-4).
- Storage read/write hygiene (empty→remove, malformed JSON→default, quota throw swallowed) — mirror `ProjectEstimatesTable` tests.
- Flex-vs-fixed width derivation for the chosen contract (§2.2) at extremes.

### 4.2 Component (Vitest + Testing Library)
Existing relevant coverage to extend (all under `tests/vitest/`): `estimate-row-table-virtualization.test.tsx`, `estimate-sheet-cost-inputs.test.tsx`, `estimate-sheet-row-details-crud.test.tsx`, `estimate-component-drag.test.tsx`, `estimate-tree-bulk-selection.test.tsx`, `estimate-mixed-content.test.tsx`. New tests:
- **Data-attribute preservation (R-2, S1):** render a table, assert every editable cell still has `data-estimate-cell-index` and `data-estimate-row-id` after the refactor. **This is the single most important new test** — it's the contract the collaboration layer depends on.
- **Resize handle a11y:** present only on data columns (R-6), absent on gutter/actions; `role="separator"`, keyboard ArrowLeft/Right changes width, Home resets.
- **Express editor at Materials minSize (R-5):** open editor, set Materials to min, assert inputs visible + focus retained (no remount).
- **Filter/search width persistence (R-8):** apply filter, assert widths unchanged.
- **Cross-group sync (R-4):** mount two tables, resize one, assert the other's `<col>`/grid widths update.

### 4.3 Render-probe assertions (the perf gate, R-12)
The probe (`estimate-sheet-render-probe.ts`) already counts table/row/branch renders. Add:
- Resizing a column produces **zero `reportEstimateRowItemRender` calls** (rows must not re-render on resize) and **zero branch/content renders during pointer movement** because widths apply via ancestor CSS vars outside React render. Commit may produce at most the bounded surface/store update defined in `09-performance-measurement-plan.md`. Failing this assertion = the resize re-render storm of R-12.
- Cross-group sync does not trigger `reportEstimateSheetContentRender` cascades.

### 4.4 E2E (Playwright)
Existing: `e2e/estimate-tree-dnd.spec.ts`, `estimate-tabs.spec.ts`, `estimates-crud-latency.spec.ts`, `estimates-shell-streaming.spec.ts`. New specs:
- **Resize vs drag pointer ownership (R-3):** initiate a resize near a drag grip; assert no `dragstart`, drag store stays null, width changes.
- **Collaboration re-anchor (R-1/R-2):** two browser contexts; user A moves cursor; user B resizes a column; assert B's remote marker for A still resolves inside the same `data-estimate-cell-index` element (cell identity, not pixel-exact).
- **Horizontal scroll + cursor (R-9):** widen columns past viewport; assert surface scrolls horizontally and cursor markers track (scrollLeft math).
- **Touch resize (R-14):** Playwright touch emulation, resize via touch-drag.
- **Persistence (phase 3):** resize, reload, assert widths restored; reset clears them.

### 4.5 Cross-group sync — how to test specifically
Render a `displayedSheetNode` with ≥2 child areas (multiple `EstimateRowItemsTable` mounts). Drive a resize on group A's handle. Assert (a) group B's column track width equals A's within the same animation frame (DOM read), and (b) the render probe shows no row re-renders. This is the definitive proof the "synced across all node groups" requirement is met without a perf regression.

---

## 5. Readiness Verdict & Phased Rollout

### Verdict: **GO, with conditions — Medium readiness, Low-to-Medium risk.**

The decisive factors:
1. **A proven in-repo implementation exists** (`ProjectEstimatesTable.tsx`: TanStack v8 resize, persistence, accessible handle). We are porting a known-good pattern, not inventing one. This collapses most of the technical and a11y risk.
2. **The collaboration cursor layer is structurally resize-safe** — it anchors by cell *index* (not geometry) and re-resolves every frame, so resize self-heals (R-2/§2.7). The feared "cursors break on resize" is largely a non-issue *provided the data attributes survive the refactor*.
3. The genuinely **new** hard problems are (a) **cross-group width sync** with N independent tables (R-4) and (b) **avoiding a resize re-render storm** across many memoized tables (R-12). Both are solvable with ancestor CSS vars plus a commit-on-end shared store, but they are the make-or-break engineering risks and must be gated.

The non-obvious blockers are S1: R-2 (data-attribute preservation), R-4 (sync), R-12 (perf). Everything else is S2/S3 polish.

### Phased rollout with go/no-go gates

**Phase 0 — Headless refactor behind a flag (no user-visible resize).**
Migrate `EstimateRowItemsTable` from the hard-coded `grid-cols-[...]` (`row-table.tsx:96`) to a column-model-driven layout (TanStack headless or an equivalent width model) that renders **identical** output at the current default widths. Behind a flag (mirror `WORKSHOP_ESTIMATE_ROW_VIRTUALIZATION`, `row-table.tsx:13`).
- **Go criteria:** pixel-identical render; **all** `data-estimate-*` attributes preserved (R-2 test green); render probe shows no new renders; full existing estimate-sheet suite green; collaboration e2e green.
- **No-go:** any data-attribute drops, any probe regression.

**Phase 1 — Private resize proof, shared-surface CSS vars, no persistence.**
Add the accessible shared header/ruler handle (port `ProjectEstimatesTable.tsx:723-740`) to data columns only (R-6); per-column min/max from `04` after U0 express-card measurement. Pointer movement mutates CSS vars on `[data-estimate-pointer-surface]`; no React state or persistence writes during drag. Flag-gated and not product-complete until Phase 2 proves all mounted groups sync.
- **Go:** keyboard + mouse + touch resize works; a11y gate (§3) passes; resize produces **zero row re-renders** (R-12 probe); express-editor-at-min test green (R-5); drag-vs-resize test green (R-3).
- **No-go:** focus theft from cell editing; render storm; drag conflict.

**Phase 2 — Shared cross-group sync (the headline).**
Commit final widths to a shared store on drag end; all tables continue reading the same ancestor CSS vars. Hydration derives surface vars from the committed store, but live pointer movement stays outside React.
- **Go:** cross-group sync test green (§4.5); render probe shows O(1) table renders, zero row renders on resize (R-12); filter/search width-persistence test green (R-8); collaboration re-anchor e2e green across resize (R-1/R-2); horizontal-scroll + cursor e2e green (R-9).
- **No-go:** any cross-group desync, any per-resize-tick render of rows, cursor anchoring off-cell.

**Phase 3 — Persistence + reset UX.**
Persist shared widths per estimate (schema-versioned key; storage hygiene per §2.8); add per-column reset (Home/double-click) and a "Reset all columns" affordance.
- **Go:** reload-restores-widths e2e green; clamp-on-read for stale widths; private-mode/quota throw swallowed; reset restores defaults across all groups.
- **No-go:** widths leak into proposal export/print (R-10/R-11); persistence keyed per-node instead of per-estimate (R-8).

**Cross-phase guardrails:** the flag stays until Phase 3 ships clean; every phase keeps the render-probe perf assertions and the full estimate-sheet regression suite green; the collaboration two-context e2e runs at Phases 1–3.

### Explicit non-broadcast / non-leak contracts (decide before Phase 0)
- Column widths are a **per-user, screen-only presentation preference**: **never broadcast** over the collaboration channel (R-1), **never** influence proposal export (R-10) or print (R-11).
- `data-estimate-cell-index` / `data-estimate-row-id` / `data-estimate-cell-active` / `data-estimate-row-index` are a **frozen DOM contract** consumed by the collaboration layer and keyboard nav — preserved verbatim (R-2).
- Gutter (`#`, select) and actions columns are **non-resizable** (R-6).

---

## Appendix — Key file:line index
- Fixed column template: `row-table.tsx:96` (`ROW_COLUMNS`), applied `:243` (rows), `:626` (header).
- Per-node table mount (N tables/tab): `src/components/workshop/estimate-sheet/rows/branch.tsx:370`; scroll surface `EstimateSheetContent.tsx:2705-2707`.
- Cell data attributes: `cells.tsx:25-43`, `row-table.tsx:326-328`, `:382-384`, `:417-419`.
- Cursor anchoring: `EstimateSheetContent.tsx:838-855` (resolve), `:885-908` (broadcast/fracX), `:954-963` (rAF re-resolve).
- Express editor & active-id: `cells.tsx:171-365`, `EstimateSheetContent.tsx:445-451`; virtualization-disable `row-table.tsx:493`, `:522-529`.
- Drag systems: native DnD `cells.tsx:404-442`, `:514-519`; drag store `estimate-workshop-drag.ts`; vertical autoscroll `use-drag-edge-autoscroll.ts:47-93`.
- Memo comparator / probe: `row-table.tsx:66-94`; `estimate-sheet-render-probe.ts`.
- Filter/search node feed: `EstimateSheetContent.tsx:1272` (`displayedSheetNode`), `:606`.
- Proposal export (independent layout): `ProposalExportPreviewDialog.tsx:394`.
- **Reference resize implementation to port:** `ProjectEstimatesTable.tsx` — `<colgroup>`/`getSize` `:100-104`, storage `:71`/`:755-801`, accessible handle `:699-742`, per-column min/max `:906-1021`.
