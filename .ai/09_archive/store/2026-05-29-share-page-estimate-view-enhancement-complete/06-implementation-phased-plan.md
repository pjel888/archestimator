# 06 — Implementation Phased Plan

**Date:** 2026-05-29
**Status:** Complete — ready for owner review

---

## Phase Overview

| Phase | Name | Est. Effort | Dependencies | Risk |
|-------|------|-------------|--------------|------|
| **P1** | Donut Chart Extraction + Integration | 2–3 hours | None | Low |
| **P2** | Sub-Tab System | 1–2 hours | P1 | Low |
| **P3** | Tree View Component | 3–4 hours | P2 | Medium |
| **P4** | Floating Navigation Tree | 1–2 hours | P3 | Low |
| **P5** | Polish, Mobile, A11y, QA | 2–3 hours | P3, P4 | Low |

**Total estimated effort:** 9–14 hours

---

## Phase 1: Donut Chart Extraction + Integration

### Goal
Extract `ProjectCostDonutChart` into a shared `CostDonutChart`, create chart aggregation utility, and render donut charts above the estimate sheet tab bar in `SharePageTabs`.

### Tasks

| # | Task | File(s) | Verification |
|---|------|---------|-------------|
| 1.1 | Create `src/lib/charts/types.ts` with `CostBucket` type | New file | `bun run type-check` |
| 1.2 | Create `src/components/charts/CostDonutChart.tsx` (copy from `ProjectCostDonutChart`, adapt imports) | New file | Visual: render in isolation with test data |
| 1.3 | Update `ProjectCostDonutChart.tsx` to re-export from new location | Modified | Workshop chart page still renders correctly |
| 1.4 | Create `src/lib/share/aggregate-share-chart-buckets.ts` with `aggregateRowsByDiscipline()` | New file | Unit test: input rows → expected buckets |
| 1.5 | Add donut chart section to `SharePageTabs.tsx` (above tab bar) | Modified | Visual: donut renders per sheet, changes on tab switch |
| 1.6 | Run `bun run validate` + workshop chart smoke test | Full project | All existing tests pass |

### Exit Gate
- [ ] `CostDonutChart` renders correctly in share page
- [ ] Donut chart changes when estimate sheet tab switches
- [ ] Workshop charts page unchanged (no regression)
- [ ] `bun run type-check` passes
- [ ] No new lint errors

---

## Phase 2: Sub-Tab System

### Goal
Add a "Tree View" / "Grid Preview" sub-tab bar under each estimate sheet panel. Grid Preview preserves existing flat table. Tree View renders a placeholder.

### Tasks

| # | Task | File(s) | Verification |
|---|------|---------|-------------|
| 2.1 | Add `sheetViews` state to `SharePageTabs` | `SharePageTabs.tsx` | State toggles correctly |
| 2.2 | Render sub-tab bar (Tree View | Grid Preview) below main tab bar | `SharePageTabs.tsx` | Visual: sub-tabs render, toggle works |
| 2.3 | Add keyboard navigation for sub-tabs (ArrowLeft/Right) | `SharePageTabs.tsx` | Keyboard: Arrow keys switch view |
| 2.4 | Wire Grid Preview to existing table code (no changes to table) | `SharePageTabs.tsx` | Grid Preview works as before |
| 2.5 | Add Tree View placeholder ("Tree View coming in Phase 3") | `SharePageTabs.tsx` | Placeholder renders when Tree View selected |
| 2.6 | Update ARIA attributes for sub-tab bar | `SharePageTabs.tsx` | `role="tablist"`, `aria-selected`, `aria-controls` |

### Exit Gate
- [ ] Sub-tabs render below main tab bar
- [ ] Toggling between Tree View and Grid Preview works
- [ ] Grid Preview shows existing flat table (unchanged)
- [ ] View mode persists per sheet within session
- [ ] Keyboard navigation works for sub-tabs
- [ ] No visual regression on mobile

---

## Phase 3: Tree View Component

### Goal
Create `ShareEstimateTreeView` — a read-only recursive tree component for the receiver page. Integrate into `SharePageTabs`.

### Tasks

| # | Task | File(s) | Verification |
|---|------|---------|-------------|
| 3.1 | Create `src/lib/share/reconstruct-share-tree.ts` with `reconstructTreeFromRows()` and `reconstructTreeByDiscipline()` | New file | Unit test: flat rows → tree nodes |
| 3.2 | Add `treeNodes` useMemo to `SharePageTabs` | `SharePageTabs.tsx` | Correct tree structure derived from rows |
| 3.3 | Create `ShareEstimateTreeView.tsx` component | New file | Visual: render test tree data |
| 3.4 | Implement Group Node rows (with FolderSimple icon, bg-surfaceMuted) | `ShareEstimateTreeView.tsx` | Visual: matches workshop group styling |
| 3.5 | Implement Area Node rows (with Cube icon) | `ShareEstimateTreeView.tsx` | Visual: matches workshop area styling |
| 3.6 | Implement row items under Area Nodes (description + qty + unit + total) | `ShareEstimateTreeView.tsx` | Visual: rows render under areas |
| 3.7 | Implement expand/collapse (CaretDown rotation, React state) | `ShareEstimateTreeView.tsx` | Click toggles expand, default expanded |
| 3.8 | Integrate into `SharePageTabs` (replace placeholder) | `SharePageTabs.tsx` | Tree View renders actual tree |
| 3.9 | Handle edge cases: empty rows, no designation, single row | `ShareEstimateTreeView.tsx` | Empty state, flat mode, single node all render correctly |

### Exit Gate
- [ ] Tree View renders hierarchical estimate structure
- [ ] Group nodes visually distinct from Area nodes
- [ ] Row items show description, quantity, unit, total
- [ ] Expand/collapse works
- [ ] Switching sheets updates the tree
- [ ] Empty state renders correctly
- [ ] Discipline-based fallback works when designation is missing
- [ ] Design system compliant (SF Pro, ≤12px, hairline borders)

---

## Phase 4: Floating Navigation Tree

### Goal
Create `ShareFloatingTreeNav` — a compact floating sidebar for quick tree navigation. Visible only on lg+ screens, only in Tree View mode.

### Tasks

| # | Task | File(s) | Verification |
|---|------|---------|-------------|
| 4.1 | Create `ShareFloatingTreeNav.tsx` component | New file | Renders flattened node list |
| 4.2 | Implement scroll-to-section on click (`scrollIntoView`) | `ShareFloatingTreeNav.tsx` | Click navigates to correct tree section |
| 4.3 | Implement IntersectionObserver for active section highlighting | `ShareFloatingTreeNav.tsx` | Active section updates on scroll |
| 4.4 | Integrate into `SharePageTabs` (conditional: lg+ and Tree View) | `SharePageTabs.tsx` | Visible on desktop Tree View, hidden otherwise |
| 4.5 | Style: compact (140px), sticky, outside main content panel | `ShareFloatingTreeNav.tsx` | Floats left of Tree View panel |

### Exit Gate
- [ ] Floating nav renders node list correctly
- [ ] Click scrolls to correct position
- [ ] Active section highlights on scroll
- [ ] Hidden on mobile (< 1024px)
- [ ] Hidden when Grid Preview active
- [ ] `role="navigation"` + `aria-label` present

---

## Phase 5: Polish, Mobile, Accessibility, QA

### Goal
Final polish: mobile adaptation, accessibility audit, visual QA, cross-browser verification.

### Tasks

| # | Task | File(s) | Verification |
|---|------|---------|-------------|
| 5.1 | Mobile Tree View: collapse by default, reduce indentation (12px), simplify rows | `ShareEstimateTreeView.tsx` | Mobile layout functional |
| 5.2 | Mobile donut chart: verify scaling on 320px–428px viewports | `CostDonutChart.tsx` / `SharePageTabs.tsx` | Chart readable on mobile |
| 5.3 | Accessibility audit: ARIA roles, keyboard navigation, screen reader labels | All modified/new files | Tab, arrow keys, screen reader test |
| 5.4 | Color contrast check: chart colors vs white background | `CostDonutChart.tsx` | WCAG AA compliance |
| 5.5 | Run full validation: `bun run validate` | Full project | TypeScript, ESLint, tests all pass |
| 5.6 | Run build: `bun run build` | Full project | Production build succeeds |
| 5.7 | MCP graph impact analysis: `code-review-graph detect_changes` | Full project | Risk ≤ 0.30, no critical flows affected |
| 5.8 | Manual QA: share page with multi-estimate snapshot, switch tabs, toggle views | Browser | All features work end-to-end |
| 5.9 | Cross-browser test: Chrome, Firefox, Safari | Browser | Consistent rendering |

### Exit Gate (FINAL)
- [ ] All Phase 1–5 exit gates satisfied
- [ ] `bun run validate` passes (0 errors from share/chart/tree code)
- [ ] `bun run build` succeeds
- [ ] MCP graph shows low risk, no critical flow impact
- [ ] Manual QA: all user stories verified
- [ ] Mobile responsive on all target viewports
- [ ] Accessibility: keyboard + screen reader verified

---

## 6. Dependency Graph

```
P1 (Donut Chart)
 │
 ├──► P2 (Sub-Tabs)
 │      │
 │      ├──► P3 (Tree View)
 │      │      │
 │      │      ├──► P4 (Floating Nav)
 │      │      │
 │      │      └──► P5 (Polish/QA)
 │      │
 │      └──► P5 (Polish/QA)
 │
 └──► P5 (Polish/QA)
```

---

## 7. Rollback Triggers

If any of the following occur, **stop and roll back to last working phase**:

1. `ProjectCostDonutChart` extraction breaks workshop charts (visual regression)
2. `SharePageTabs` grows beyond 500 lines (extract more sub-components)
3. Tree reconstruction produces misleading/flat-out-wrong hierarchy
4. Mobile layout completely breaks (donut + tree + tabs)
5. Build or type-check fails with >5 new errors from share/chart code
6. Any existing share page test fails

---

## 8. Task Packet Location

After owner approval, open individual task packets under:
```
.ai/04_tasks/share-estimate-view-enhancement/
├── P1-donut-chart-extraction.md
├── P2-sub-tab-system.md
├── P3-tree-view-component.md
├── P4-floating-navigation.md
└── P5-polish-qa.md
```

---

## Post-Audit Updates (2026-05-29)

**Supplementary audit completed** — see `00-POST-AUDIT-STRATEGY-ASSESSMENT-AND-IMPROVEMENT-PLAN.md` for full evidence.

### Phase Additions (Additive)

**P0.5 — Fidelity Audit Gate (NEW — Blocking for P3):**
Insert before P3 begins. Execute the fidelity audit defined in `10-fidelity-audit-and-tree-reconstruction-spec.md`:
- Run reconstruction on Lewis Residence seeded data
- Compare virtual tree vs actual estimate_nodes hierarchy
- Capture structural match %, ordering correlation, total accuracy
- Record decision: "Good enough with labeling" / "Needs snapshot enhancement" / "Use discipline fallback only"
- Create test fixtures per `11-test-data-fixture-spec.md`

**P0 — Primitive Decision Gate (NEW — Blocking for P2/P3):**
Before P2 begins, execute the primitive decisions from `09-ui-primitive-reuse-audit-and-extension-plan.md` §4:
- Run primitive inventory pass (grep/graph for all tab/tree/row patterns)
- Record A9a decision: Tab primitive extraction vs temporary duplication
- Record A9b decision: WorkshopTree<TNode> extraction vs standalone implementation
- Record in `12-assumptions-decisions-log.md`

### Per-Phase Graph Checkpoints (Additive)
Every phase must include these checks at START and END:

```bash
# At phase start
code-review-graph get_minimal_context_tool(task="share estimate view enhancement P{N}")

# At phase end
code-review-graph detect_changes_tool(base="HEAD~1")
bun run type-check && bun run lint && bun run test
```

### Rollback Triggers (Additive)
Added to existing §7:
7. Fidelity audit proves designation-based reconstruction is systematically misleading → switch to discipline-only fallback or flat view
8. Primitive duplication causes repeated design lint failures → revert to flat Grid Preview while primitive work completes

### Cross-References
- `13-implementation-readiness-and-owner-review-gate.md` — Non-negotiable gates
- `IMPLEMENTATION-MASTER-PROMPT.md` — Authoritative implementation instructions
