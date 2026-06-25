# 10 — UX, UI, and Accessibility Audit

## Layout and hierarchy

**Three-column shell:** left tree (256-320px) | center sheet (flex) | right sidebar (320-360px). Center column wraps in `<section data-estimate-center-column="sheet">` (EstimateSheetContent.tsx:3268-3273).

**Rows-first area layout:** Each `EstimateSheetBranch` renders in this order (branch.tsx:269-484):
1. Sibling divider (if depth > 0 and siblingIndex > 0).
2. Sticky header (only depth=0 is sticky).
3. Collapsed-state drop target (if collapsed and component drag active).
4. Body (if not collapsed):
   a. Breadcrumbs (if depth > 0).
   b. Own row table.
   c. Add-row strip.
   d. Child sub-areas (recursive).
   e. Template drop zone (if template drag active).
5. Bottom breathing room (depth=0 only).

**Sticky model:** ONLY depth-0 header is sticky (branch.tsx:190 `isStickyHeader = depth === 0`). Nested headers and table `<thead>` are NON-sticky (comment l. 185-189). This avoids the accumulated-offset clipping problem.

**Empty state:** Each empty area shows `ComponentDropTarget` with `empty={!hasContents}` styling (drop-zones.tsx:71-99), painting a wider dashed strip with the brand-orange tint and offering both "Add row" and "Drag and drop" prompts.

## Typography

- Body text: 10px regular.
- Material name: 11px medium.
- Supplier / misc: 10px medium / tertiary.
- Numbers: tabular-nums, 9-10px.
- Column headers: 10px medium uppercase (but the spec's claim of "uppercase" — let me re-check; row-table.tsx:675 `text-left text-[10px] font-medium text-ink` — no uppercase; the "Materials" header is mixed-case).
- Sub-9px text: breadcrumbs at 8px (branch.tsx:367), some labels at 8px (activity-history.tsx:634). **Concern:** 8px is below WCAG's recommended minimum for body text but acceptable for ancillary labels per the design system.

**Color contrast:** Uses design tokens (`text-ink`, `text-secondary`, `text-tertiary`). The design system enforces contrast ratios via `lint:design-system` (per README). Not separately audited here.

## Row density

- Row min-height: `min-h-24` (96px) for normal rows (row-table.tsx:274).
- Express editor rows: same.
- `content-visibility: auto` for library rows (l. 275) — performance optimization that can affect screen-reader virtual-cursor navigation.

## Visual hierarchy

- Source rail (3px colored stripe on left edge of material cell): primary differentiator between library/express/project/manual rows.
- Occupancy dot (branch.tsx:337-341): olive (#6b8e23) if area has direct rows, gray otherwise.
- Breadcrumbs: show path for depth > 0 areas.

## Destructive-action clarity

**ESC-P2-08:** "Clear component" (cells.tsx:499-512) and "Delete row" (row-table.tsx:481-490) both use `<Trash/>` icon with red hover. Adjacent in the row's action cluster. No confirmation for either.

**Recommendation:**
- Clear component → `<Eraser/>` icon, label "Clear component".
- Delete row → keep `<Trash/>`, label "Delete row", add Undo toast (5s window).

## Focus rings

- Native outline removed; replaced with Tailwind `focus-visible:ring-2 focus-visible:ring-accent` (cells.tsx, row-table.tsx, etc.).
- `focus-visible` (not `focus`) means the ring only shows on keyboard navigation, not mouse clicks. **GOOD.**
- Tab strip preserves focus through menu-close dances via dedicated refs (`pendingFocusTabIdRef`, `manageMenuCloseFocusRef`).

## Keyboard behavior

**Numeric cell navigation** (cells-model.ts:27-55):
- Enter → blur (commits).
- ArrowRight/Left/Up/Down → focus neighbor cell.
- Tab/Shift+Tab → native (no custom handler).

**Inline express editor** (cells.tsx:134-155):
- Enter (single-line) → commit.
- Cmd/Ctrl+Enter (multi-line description) → commit.
- Escape → revert field.
- Arrow keys → stopPropagation (text editing, not cell nav).

**Selection checkbox** (row-table.tsx:131-136):
- Space/Enter → toggle.

**Tab strip** (tabs.tsx:93-132):
- ArrowLeft/Right → move focus (manual activation).
- Enter/Space → activate.
- Home/End → first/last.
- Cmd/Ctrl+Shift+Arrow → reorder.

**Global shortcuts** (EstimateSheetContent.tsx:2655-2679):
- Cmd/Ctrl+K → command palette (global).
- `/` → command palette (only when sheet has focus, not typing).
- Escape → close any open modal (per-modal escape listeners).

**ESC-P3-20:** `/` requires sheet focus; Cmd/Ctrl+K does not. Inconsistent.

**ESC hypothesis H22:** Cmd/Ctrl+K may open while typing in an input. Re-read on 2026-06-25: the handler around l. 2655-2679 checks both `isTypingTarget` and `hasBlockingDialog` before handling Cmd/Ctrl+K and `/`. **REFUTED** — shortcut handling is guarded while typing.

## Screen reader semantics

**Tables with CSS Grid:** row-table.tsx renders `<table><thead><tbody><tr><td>`, but each `<tr>` is `display: grid` with `grid-template-columns: var(--est-col-...)` (l. 278, l. 274 className includes `grid`). When virtualization is on, `<tbody>` is `display: block` with absolute-positioned `<tr>`s (l. 732, l. 767-773).

**Impact:** Screen readers may fail to associate cell → row → header because:
1. `display: grid` on `<tr>` overrides the implicit `<tr>` role semantics.
2. `position: absolute` on virtualized `<tr>` may prevent SR from including them in the virtual cursor's row traversal.
3. Column-header associations (`scope="col"` is NOT set on `<th>`) rely on implicit ARIA, which is fragile under Grid.

**ARIA annotations present:**
- `<th aria-label="Row actions" />` (row-table.tsx:722).
- `<output aria-live="polite">` for tab selection announcements (EstimateTabStrip.tsx:765-767).
- `<output aria-live="polite">` for cursor editing announcements (EstimateSheetContent.tsx:1233-1235).
- `aria-label` on every material cell (cells.tsx:457).
- `aria-label` on every action button.
- `aria-expanded` on collapse carets (branch.tsx:317).
- `aria-checked` on selection checkboxes (mixed state supported, selection-checkbox.tsx:52).
- `aria-busy` on download button (ProposalExportPreviewDialog.tsx:285).

**Gaps:**
- `aria-rowindex` / `aria-colindex` NOT set on cells. SR cannot announce "row 5 of 20, column 3 of 9".
- `<th scope="col">` NOT set.
- `aria-live` region for save status NOT present (ESC-P1-04).
- No `role="alert"` for per-row error state.

**Recommendation:**
- Add `scope="col"` to all `<th>`.
- Add `aria-rowindex={rowIndex + 1}` to `<tr>` and `aria-colindex={cellIndex + 1}` to `<td>`.
- Replace the global save toast with a per-row `aria-live="polite"` status chip.

## Virtualized table semantics

When virtualization is active (row-table.tsx:725-734):
- `<tbody>` becomes `display: block` with `height: totalSize`.
- Each virtualized `<tr>` is `position: absolute, top: 0, transform: translateY(start - scrollMargin)`.
- Off-screen rows are unmounted.

**Screen reader behavior:** NVDA/JAWS with virtual cursor may skip unmounted rows. The `aria-rowindex` annotation (recommended above) helps SR announce "rows 1-8 of 1000 visible".

**Browser zoom:** Absolute positioning + transform should handle zoom gracefully; not tested.

## Responsive behavior

- Center column has `min-w-0` (l. 3270) so it shrinks correctly in flex layouts.
- `max-md:` / `max-sm:` breakpoints used in RowDetailsModal (l. 1184) and a few other places.
- No specific mobile/touch handling for the center sheet — it is a desktop-first surface.

## Reduced motion

- Cursor collaboration: `prefers-reduced-motion: reduce` → snap instead of smooth interpolation (EstimateSheetContent.tsx:1180-1183).
- Tab strip scroll: `prefers-reduced-motion` → instant (EstimateTabStrip.tsx:347-348).
- Not applied to row scroll-into-view after insert (l. 2164 `behavior: "smooth"`). **GAP**.

## High contrast / dark mode

- The app has a "glass" surface variant (`useEstimateSurfaceVariant`) used for some surfaces. Center column supports both `paper` and `glass` (estimate-surface-class.ts).
- No explicit high-contrast theme.

## Findings surfaced here

- **ESC-P2-08** — clear vs delete icons indistinct.
- **ESC-P2-12** — silent selection pruning (no aria-live).
- **ESC-P2-15** — focus management for new rows under virtualization.
- **ESC-P3-20** — keyboard shortcut consistency.
- **Virtualized table semantics degrade SR behavior** — probable P1 a11y gap (no test in CI).
