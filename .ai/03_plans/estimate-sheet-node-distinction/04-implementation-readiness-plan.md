# 04 — Implementation Readiness Plan

**Date:** 2026-05-21
**Scope:** `EstimateSheetContent.tsx` header-bar styling, node code display, area breadcrumbs, related markup adjustments, and the Activity History modal's hierarchy scope tree. Includes optional future DB migration for user-defined codes.
**Estimated implementation size:** Medium (2–3 files, ~150 lines changed; optional DB migration adds 1 migration file + repository updates)

---

## 1. Implementation phases

### 2026-05-25 correction — Unified Activity History modal

**Goal:** Replace separate right-slideout activity surfaces with one modal whose left tree includes the whole sheet, Group Nodes, Area Nodes, and row items.

**Files:**
- `src/components/workshop/EstimateSheetContent.tsx`
- `tests/vitest/estimate-sheet-version-control-ui.test.tsx`
- `.ai/03_plans/estimate-sheet-version-control/18-current-activity-contract.md`

**Changes:**
1. Remove the separate `Node Activity` header action.
2. Replace the right-side activity/version inspector with a centered `Activity History` modal.
3. Build a modal-local scope tree from the loaded estimate tree plus row items.
4. Map sheet, node, and row selections onto the existing scoped `fetchEstimateSheetVersionControl()` API.
5. Use descendant node scope for Group Nodes and direct node scope for Area Nodes.
6. Keep row scopes selectable in the `Activity History` modal tree, while row-originated controls open the `Row item details` modal: 3-dot row action to Details, component-card detail action to Component, and row Activity action to the Activity tab.
7. Preserve pagination, filters, stale response guards, audit-card rendering, and placeholder-row audit labeling.

**Validation:**
```bash
bunx vitest run tests/vitest/estimate-sheet-version-control-ui.test.tsx --maxWorkers=1
bun run validate
bun run build
```

**Current evidence:** Implemented and re-verified on 2026-05-25. Browser evidence lives under `.omx/artifacts/visual-ralph/estimate-sheet-version-control/20260525-activity-modal/`.

### Phase 1 — Core distinction (must have)

**Goal:** Apply the background, border, and typography differentiation from `03-ui-plan.md`.

**Files:**
- `src/components/workshop/EstimateSheetContent.tsx`

**Changes:**
1. Replace the single `groupTint()` function with a `nodeHeaderClasses(kind, depth)` function that returns conditional classes:
   - `group`: `border border-hairline bg-surfaceMuted border-l-2 border-l-divider hover:bg-[#EAEEF3]`
   - `area`: `border-b border-hairline bg-white hover:bg-surfaceMuted/60`
2. Replace the single name-style class with conditional weight/color:
   - `group`: `text-[10px] font-semibold text-ink`
   - `area`: `text-[10px] font-normal text-secondary`
3. Add total weight distinction (roll-up cue):
   - `group` total: `text-[10px] font-semibold tabular-nums text-ink`
   - `area` total: `text-[10px] font-normal tabular-nums text-ink`
4. Update `aria-label` on the `<section>` and collapse button to include the kind:
   - `"${node.name}, group"` / `"${node.name}, area"`
   - `"Collapse ${node.name} group"` / `"Expand ${node.name} area"`
5. Remove or adjust `groupTint()` calls so only the branch header uses the new logic.
6. Pass `path` prop through recursive `EstimateSheetBranch` calls so breadcrumbs can be derived.

**Validation:**
```bash
bun run validate
bun run build
```

---

### Phase 2 — Node codes (must have)

**Goal:** Display an auto-generated hierarchical code for every group and area header.

**Files:**
- `src/components/workshop/EstimateSheetContent.tsx`
- `src/components/workshop/estimate-tree-data.ts` (type update if needed)

**Changes:**
1. Add a `getNodeCode(path: string[], siblingIndex: number): string` helper that generates hierarchical position codes:
   - Root: `01`, `02`, `03`...
   - Child: `01.01`, `01.02`...
   - Deeper: `01.01.01`...
2. Pass `siblingIndex` and `path` through the recursive `EstimateSheetBranch` so each node knows its position.
3. Render the code inline before the name using the exact spec from `03-ui-plan.md`:
   ```tsx
   <span className="text-[9px] font-mono tabular-nums text-tertiary mr-1.5">{code}</span>
   ```
4. Ensure truncation behavior handles `name + code + total` competition gracefully. If the header is too narrow, the name truncates first (`truncate` on name wrapper), then the code can be hidden via `hidden` at very narrow widths.

**Decision gate:** If the code feels noisy at deep nesting (e.g., `01.01.03.02`), consider shortening to the last segment (`.02`) or using a condensed format.

---

### Phase 3 — Row numbers (should have)

**Goal:** Add sequential row numbers within each area's row table.

**Files:**
- `src/components/workshop/EstimateSheetContent.tsx`

**Changes:**
1. Add a `24px` number column to the grid template.
2. Render `String(index + 1).padStart(2, "0")` in each row.
3. Style: `text-[9px] font-mono tabular-nums text-tertiary`.

---

### Phase 4 — Area breadcrumbs (must have)

**Goal:** Show a subtle ancestor path below every area header.

**Files:**
- `src/components/workshop/EstimateSheetContent.tsx`

**Changes:**
1. In `EstimateSheetBranch`, when `node.kind === "area"` and `path.length > 0`, render a breadcrumb bar between the header and the table/drop zone:
   ```tsx
   <div className="truncate text-[9px] text-tertiary" style={{ paddingLeft: `${leftIndent + 8}px` }}>
     {path.map((ancestor, i) => (
       <span key={ancestor.id}>
         {i > 0 && <span className="mx-0.5 text-hairline">›</span>}
         {ancestor.name}
       </span>
     ))}
   </div>
   ```
2. Ensure the breadcrumb uses the same `leftIndent` as the header so text columns align.
3. Do not render breadcrumbs for group nodes.

---

### Phase 5 — Empty area indicator (should have)

**Goal:** Make zero-row areas instantly identifiable.

**Files:**
- `src/components/workshop/EstimateSheetContent.tsx`

**Changes:**
1. In `EstimateSheetBranch`, when `node.kind === "area"` and `estimateRowItems.length === 0`, render `(0 items)` after the name:
   ```tsx
   <span className="ml-1.5 text-[9px] text-tertiary">(0 items)</span>
   ```

---

### Phase 6 — Kind badge (optional fallback)

**Goal:** Only if user testing reveals confusion after distinction + codes + icons are live.

**Files:**
- `src/components/workshop/EstimateSheetContent.tsx`

**Changes:**
1. Insert a hover-only badge:
   ```tsx
   <span className="opacity-0 transition-opacity group-hover:opacity-100 shrink-0 rounded-sm border border-hairline bg-white px-1 py-0 text-[8px] font-bold uppercase tracking-[0.08em] text-tertiary">
     {node.kind === "group" ? "Group" : "Area"}
   </span>
   ```

**Decision gate:** Skip this phase unless testing explicitly requests it.

---

### Phase 7 — Dead control cleanup (should have)

**Goal:** Prevent false expectations from unwired header controls.

**Files:**
- `src/components/workshop/EstimateSheetContent.tsx`

**Changes:**
1. In `EstimateSheetHeader`, disable `SearchInput`, Filter button, and View button.
2. Add `disabled` prop and `title="Coming soon"` tooltip to each.

---

### Phase 8 — Empty area & table adjacency polish (nice to have)

**Goal:** Fix visual seams between area headers, empty drop zones, and the row table.

**Files:**
- `src/components/workshop/EstimateSheetContent.tsx`

**Changes:**
1. In `EmptyAreaMessage`, remove the outer `bg-surfaceWarm/80` from `EstimateDropZone` when rendered inside an area context; keep the drop zone white.
2. If the double border between area header bottom and table top border feels heavy, pass a prop or adjust the table wrapper to suppress its top border (`border-t-0`).

---

### Phase 9 — Visual regression verification (required before merge)

**Goal:** Confirm the changes render correctly across nesting depths and node-type mixtures.

**Steps:**
1. Run the local dev server and navigate to:
   `http://localhost:3000/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/77777777-7777-4777-8777-777777777704`
2. Expand all nodes (use the tree "Expand all" tool).
3. Capture screenshots at:
   - Root level (top-level groups)
   - Mid-depth (groups inside groups)
   - Leaf areas (with rows and without rows)
   - Areas with breadcrumbs (verify path accuracy)
   - Headers with codes (verify no truncation overflow)
4. Verify:
   - Group headers look like muted containers.
   - Area headers look like white sheet dividers.
   - Codes are readable and do not push totals off-screen.
   - Breadcrumbs are subtle and accurate.
   - Deep nesting is still readable.
   - No layout shift or broken borders.

---

### Phase 7 — DB-backed user-defined codes (future, not immediate)

**Goal:** Persist user-defined codes in the database, with auto-generated fallback.

**Files:**
- `supabase/migrations/2026XXXXXX_add_estimate_node_code.sql`
- `src/lib/supabase/types.ts`
- `src/lib/repositories/workspace-repository.ts`
- `src/lib/estimates/actions.ts` (rename/update action)
- `src/components/workshop/EstimateSheetContent.tsx`

**Changes:**
1. Migration: `alter table public.estimate_nodes add column code text;`
2. Repository: Include `code` in `buildEstimateTree` and `toUiNode`.
3. UI: If `node.code` exists, display it; otherwise fall back to auto-generated position code.
4. Tree: Optionally display codes in `EstimateSheetTree` as well (decision needed).

**Note:** This phase is **out of scope for the immediate implementation** unless Philip explicitly requests DB persistence now. The frontend auto-generated codes in Phase 2 provide 90% of the value with zero migration risk.

---

## 2. Test plan

### Unit / helper tests

1. Code generation helper:
   ```ts
   expect(getNodeCode([], 0)).toBe("01");
   expect(getNodeCode(["01"], 2)).toBe("01.03");
   expect(getNodeCode(["01", "02"], 0)).toBe("01.02.01");
   ```

2. Existing tests in `tests/vitest/estimate-tree-data.test.ts` should still pass.

### Component / DOM tests (add if not present)

1. **Kind-specific rendering:**
   ```ts
   expect(groupHeader).toHaveClass("bg-surfaceMuted");
   expect(areaHeader).toHaveClass("bg-white");
   ```

2. **Accessibility labels:**
   ```ts
   expect(groupSection).toHaveAttribute("aria-label", expect.stringContaining("group"));
   expect(areaSection).toHaveAttribute("aria-label", expect.stringContaining("area"));
   ```

3. **No visual regression on row table:**
   - The `EstimateRowItemsTable` wrapper classes remain unchanged unless Phase 3 is implemented.
   - Material cells still show `bg-[#EFF6FF]` and `border-l-accent/70`.

### E2E / manual

- Playwright or manual screenshot comparison of the estimate workspace.
- Check at different tree widths (drag the left panel to min and max).

---

## 3. Risk matrix

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Badge feels cluttered at small widths | Medium | Low | Switch to hover-only or remove badge. |
| Double border (area header + table) looks heavy | Medium | Low | Apply `border-t-0` to table wrapper in Phase 8. |
| `bg-[#EAEEF3]` hover on groups feels too dark | Low | Low | Lighten to `#EFF1F5` or use `hover:bg-surfaceMuted/80`. |
| Accessibility tests fail due to changed `aria-label` | Low | Medium | Update test expectations to include kind suffix. |
| Merge conflict with concurrent `EstimateSheetContent` work | Medium | Medium | Keep change footprint tiny; rebase early and often. |
| User confuses white area headers with "inactive/disabled" | Low | Medium | The `Cube` icon, row table below, and `text-secondary` name (not grayed-out) prevent this. |
| Node code pushes total off-screen at narrow widths | Medium | Medium | Name truncates first; code hides at very narrow widths. |
| Breadcrumb path incorrect after tree reorder | Low | High | Path is computed from live tree structure, not cached. |

---

## 4. Rollback plan

Because Phases 1–6 are purely presentational and frontend-only, rollback is immediate:

1. Revert `EstimateSheetContent.tsx` to the previous `groupTint()` implementation.
2. Remove the `path` prop from `EstimateSheetBranch`.
3. No data-model, route, or persistence changes are involved for Phases 1–6.

**DB Phase 7 rollback:** If the `code` column migration is applied, a reverse migration can drop the column. Because `code` is nullable and non-critical, rollback is safe even with data in the column.

---

## 5. Definition of done

- [ ] `EstimateSheetBranch` renders group headers with `bg-surfaceMuted`, full border, left divider accent, semibold name, and semibold total.
- [ ] `EstimateSheetBranch` renders area headers with `bg-white`, bottom-border-only, normal-weight `text-secondary` name, and normal-weight total.
- [ ] Group and area headers display an auto-generated hierarchical code prefix (e.g., `01`, `01.01`).
- [ ] Area headers display a breadcrumb trail of ancestor names below the header bar.
- [ ] Row table includes sequential `#01`, `#02` numbers per area.
- [ ] Empty areas show `(0 items)` indicator on the header.
- [ ] Unwired header controls (Search, Filter, View) are disabled with "Coming soon" tooltip.
- [ ] `aria-label` on branch sections and collapse buttons includes the node kind.
- [ ] Hover states are present on both header types without competing with row-cell hover states.
- [x] Activity History is one modal with a left scope tree for sheet, Group Nodes, Area Nodes, and row items.
- [x] Row controls no longer open a separate row Version History slideout; row-originated actions resolve inside `Row item details`, with Activity as a tab and global row scopes still available from the Activity History tree.
- [x] `bun run validate` passes (type-check, lint, font-size lint, unit tests, vitest).
- [x] `bun run build` passes.
- [ ] Screenshots of root, mid-depth, and leaf nodes are attached to the task for review.
- [ ] Screenshots verify codes are readable, breadcrumbs are accurate, row numbers are visible, and empty indicators are clear.
- [ ] No raw `<button>` or `<input>` strings are introduced outside existing shared primitives.
- [x] Plan documents in `.ai/03_plans/estimate-sheet-node-distinction/` are updated if implementation reality diverges from the plan.

---

## 6. Future work (not this plan)

- **DB-backed user-defined node codes (Phase 7):** Add `code text` to `estimate_nodes`, update repository/queries, allow inline editing.
- Vertical connector lines for deep nesting (Strategy E in `02-ux-plan.md`).
- Inline rename in the sheet (currently tree-only).
- Selected-node highlight in the sheet (currently only the tree shows selection).
- Area-node drop-zone styling refresh (the dashed zone can be refined later).
