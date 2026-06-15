# AUTONOMOUS IMPLEMENTATION PROMPT
# Share Page Estimate View Enhancement — Full Autopilot

**Status:** ACTIVE — Execute until complete. Zero errors. No stopping.
**Date:** 2026-05-29
**Plan Pack:** `.ai/03_plans/share-page-estimate-view-enhancement/` (18 documents)
**Branch:** `main` (verify with `git status --short --branch` before any edit)

---

## 0. YOUR MISSION

You are implementing the **Share Page Estimate View Enhancement** for Archestimator. You will work **autonomously in a continuous loop** until every phase (P0 through P5) is delivered, every exit gate passes, every validation command returns 0 errors, and every `.ai/` state document is updated. You do NOT stop until all completion criteria in Section 15 are satisfied.

**What you are building:**
The `/share/[token]` receiver page transforms from a flat table into a rich analytical experience with:
- Per-sheet **donut charts** (D3, discipline-based cost aggregation)
- **Sub-tab system** (Tree View | Grid Preview toggle per sheet)
- **Tree View** with designation-based hierarchy reconstruction (read-only, collapsible Group/Area nodes with row items)
- **Floating navigation tree** (compact sidebar for quick node navigation, desktop only)

**What you are NOT building:**
- No data model changes to the publication snapshot
- No new dependencies (D3 already installed)
- No database migrations, no new RPCs, no server-side changes
- No editing capabilities — receiver remains fully read-only
- No multi-estimate chart comparison
- No real-time collaboration on the receiver page

---

## 1. MANDATORY DOCUMENT READING ORDER

Before writing ANY code, read these documents IN ORDER:

1. `.ai/03_plans/share-page-estimate-view-enhancement/README.md`
2. `.ai/03_plans/share-page-estimate-view-enhancement/00-readiness-assessment.md`
3. `.ai/03_plans/share-page-estimate-view-enhancement/00-POST-AUDIT-STRATEGY-ASSESSMENT-AND-IMPROVEMENT-PLAN.md`
4. `.ai/03_plans/share-page-estimate-view-enhancement/01-current-implementation-audit.md`
5. `.ai/03_plans/share-page-estimate-view-enhancement/02-blast-radius-analysis.md`
6. `.ai/03_plans/share-page-estimate-view-enhancement/03-ux-ui-spec.md`
7. `.ai/03_plans/share-page-estimate-view-enhancement/04-data-model-and-chart-aggregation-plan.md`
8. `.ai/03_plans/share-page-estimate-view-enhancement/05-component-architecture-plan.md`
9. `.ai/03_plans/share-page-estimate-view-enhancement/06-implementation-phased-plan.md`
10. `.ai/03_plans/share-page-estimate-view-enhancement/07-validation-and-testing-plan.md`
11. `.ai/03_plans/share-page-estimate-view-enhancement/08-security-threat-model-for-receiver-ui.md`
12. `.ai/03_plans/share-page-estimate-view-enhancement/09-ui-primitive-reuse-audit-and-extension-plan.md`
13. `.ai/03_plans/share-page-estimate-view-enhancement/10-fidelity-audit-and-tree-reconstruction-spec.md`
14. `.ai/03_plans/share-page-estimate-view-enhancement/11-test-data-fixture-spec.md`
15. `.ai/03_plans/share-page-estimate-view-enhancement/12-assumptions-decisions-log.md`
16. `.ai/03_plans/share-page-estimate-view-enhancement/13-implementation-readiness-and-owner-review-gate.md`
17. `.ai/03_plans/share-page-estimate-view-enhancement/IMPLEMENTATION-MASTER-PROMPT.md`
18. `.ai/03_plans/share-page-estimate-view-enhancement/COMPLETION-CRITERIA-AND-STATE-UPDATE-PLAYBOOK.md`

Also read these project-intelligence files:
- `DESIGN.md` — design system source of truth
- `.ai/10_state/current-state.md` — live surfaces and approved patterns
- `.ai/10_state/decisions.md` — durable decisions
- `.ai/01_roadmap/README.md` — roadmap phases
- `.ai/00_system/AGENT_OPERATING_PROTOCOL.md` — mandatory workflow

---

## 2. PLAN TRACKER — CREATE BEFORE STARTING

**You MUST create and maintain a plan tracker file at `.ai/04_tasks/share-estimate-view-enhancement/TRACKER.md`** before any implementation begins. This tracker is your authoritative progress record. Update it after EVERY phase, after EVERY gate check, and after EVERY validation run.

```markdown
# Share Page Estimate View Enhancement — Implementation Tracker

**Started:** [DATE]
**Last Updated:** [DATE]
**Current Phase:** P0 | P0.5 | P1 | P2 | P3 | P4 | P5 | COMPLETE
**Overall Status:** IN PROGRESS | BLOCKED | COMPLETE

## Phase Progress

| Phase | Name | Status | Started | Completed | Notes |
|-------|------|--------|---------|-----------|-------|
| P0 | Primitive Decision Gate | NOT STARTED | | | |
| P0.5 | Fidelity Audit Gate | NOT STARTED | | | |
| P1 | Donut Chart Extraction + Integration | NOT STARTED | | | |
| P2 | Sub-Tab System | NOT STARTED | | | |
| P3 | Tree View Component | NOT STARTED | | | |
| P4 | Floating Navigation Tree | NOT STARTED | | | |
| P5 | Polish, Mobile, A11y, QA | NOT STARTED | | | |

## Validation Baseline (Pre-Implementation)

| Check | Result | Date |
|-------|--------|------|
| `bun run type-check` | | |
| `bun run lint` | | |
| `bun run test` | | |
| `bun run build` | | |
| Graph baseline (nodes/edges/risk) | | |

## Per-Phase Validation Log

### P0 — Primitive Decision Gate
- [ ] Tab primitive decision (A9a) recorded
- [ ] Tree row primitive decision (A9b) recorded
- [ ] CostDonutChart extraction review confirmed
- Decision A9a: [RECORD HERE]
- Decision A9b: [RECORD HERE]

### P0.5 — Fidelity Audit Gate
- [ ] Fidelity audit report completed
- [ ] Decision recorded: [CHOICE]
- [ ] Test fixtures created (7 categories)
- [ ] Unit tests passing against fixtures

### P1 — Donut Chart Extraction + Integration
- [ ] `src/lib/charts/types.ts` created (CostBucket type)
- [ ] `src/components/charts/CostDonutChart.tsx` created (extracted)
- [ ] `ProjectCostDonutChart.tsx` re-exports from shared
- [ ] `src/lib/share/aggregate-share-chart-buckets.ts` created
- [ ] Donut chart renders in SharePageTabs
- [ ] Workshop charts regression: PASS/FAIL
- [ ] `bun run type-check`: PASS/FAIL
- [ ] `bun run lint`: PASS/FAIL
- [ ] `bun run test`: PASS/FAIL

### P2 — Sub-Tab System
- [ ] `sheetViews` state added to SharePageTabs
- [ ] Sub-tab bar renders (Tree View | Grid Preview)
- [ ] Keyboard navigation works (ArrowLeft/Right, with e.stopPropagation())
- [ ] Grid Preview preserves existing table
- [ ] Tree View placeholder renders
- [ ] ARIA attributes correct (role="tablist", aria-selected, aria-controls)
- [ ] View mode persists per sheet within session
- [ ] `bun run type-check`: PASS/FAIL
- [ ] `bun run lint`: PASS/FAIL
- [ ] `bun run test`: PASS/FAIL

### P3 — Tree View Component
- [ ] `src/lib/share/reconstruct-share-tree.ts` created
- [ ] `ShareEstimateTreeView.tsx` created
- [ ] Group nodes render with FolderSimple icon (12px regular), bg-surfaceMuted
- [ ] Area nodes render with Cube icon (12px regular)
- [ ] Row items render under Area nodes (description + qty + unit + total)
- [ ] Expand/collapse works (CaretDown 11px, rotation, useState<Set<string>>)
- [ ] Empty state renders correctly
- [ ] Discipline-based fallback works
- [ ] XSS safety test passes (malicious strings render as literal text)
- [ ] `bun run type-check`: PASS/FAIL
- [ ] `bun run lint`: PASS/FAIL
- [ ] `bun run test`: PASS/FAIL

### P4 — Floating Navigation Tree
- [ ] `ShareFloatingTreeNav.tsx` created
- [ ] Scroll-to-section on click works (scrollIntoView)
- [ ] IntersectionObserver highlights active section
- [ ] Hidden on mobile (< 1024px)
- [ ] Hidden when Grid Preview active
- [ ] role="navigation" + aria-label present
- [ ] `bun run type-check`: PASS/FAIL
- [ ] `bun run lint`: PASS/FAIL

### P5 — Polish, Mobile, A11y, QA
- [ ] Mobile: tree collapses by default, reduced indent (12px), simplified rows
- [ ] Mobile: donut chart scales on 320px–428px
- [ ] Accessibility audit: all ARIA roles verified
- [ ] Color contrast: WCAG AA compliant
- [ ] `bun run type-check`: 0 errors
- [ ] `bun run lint`: 0 errors
- [ ] `bun run test`: all pass
- [ ] `bun run build`: SUCCESS
- [ ] Graph impact: risk ≤ 0.30, 0 critical flows
- [ ] Manual QA: all user stories verified
- [ ] Cross-browser: Chrome, Firefox, Safari verified

## State Update Log

| Document | Updated | Date | Notes |
|----------|---------|------|-------|
| `.ai/10_state/current-state.md` | NO | | |
| `.ai/10_state/decisions.md` | NO | | |
| `.ai/01_roadmap/README.md` | NO | | |
| `12-assumptions-decisions-log.md` | NO | | |
| Completion report created | NO | | |
```

---

## 3. NON-NEGOTIABLE RULES

Violating any of these rules is a **blocking defect**. Fix immediately.

### R1: Preserve All Existing Functionality
All current `SharePageTabs` (264 lines) functionality MUST work exactly as before:
- Tab bar with horizontal scroll and keyboard navigation (ArrowLeft/Right, Home/End, Enter/Space)
- Roving tabindex (only active tab has tabIndex={0})
- Scroll fade masks (left/right gradients)
- `sessionStorage` persistence for active sheet (`share-tab:{token}`)
- Active estimate summary header (name + total)
- Recipient session guard banner
- Flat table with Description | Discipline | Qty | Unit | Total columns
- Row image thumbnails (32px)
- Comments sidebar, decision button, activity feed

### R2: No New Dependencies
D3 is already installed. Do NOT add chart.js, recharts, visx, react-complex-tree (for receiver), or any other chart/tree libraries.

### R3: No Database Changes
No migrations, no schema changes, no new RPCs. Tree reconstruction and chart aggregation are purely client-side from existing `PublicationSnapshotRow[]` data.

### R4: Shared Primitive Contract
Before creating ANY new UI component:
1. Check `src/components/ui/` first
2. Reuse existing primitive if it fits
3. Extend shared primitive if one use case is missing
4. Create new shared primitive only if no reusable primitive exists AND pattern will repeat
5. Feature-local markup is ONLY for genuinely unique layout composition

**CRITICAL:** Review `WorkshopTree<TNode>` in `src/components/workshop/workshop-tree.tsx` (lines 116-195) before implementing tree recursion. This is a fully generic recursive tree renderer with `renderNode` prop, accessibility, and expand/collapse. Reuse it or document the intentional duplication.

### R5: Design System Compliance
All non-landing product surfaces must follow `DESIGN.md`:
- **Font:** SF Pro system stack, regular/medium weights only
- **Max visible text:** 12px (~10px for body/controls, 8-9px for meta)
- **Radius:** `rounded-xs` (3px) only
- **Borders:** `border-hairline` for all borders
- **Letter spacing:** Zero
- **Icons:** `@phosphor-icons/react` regular weight only
- **Background:** `proposalPaper` (#FFFDF8) for receiver surface
- **Colors:** Use DESIGN.md tokens (primary #292929, secondary #5D5D5D, tertiary #7F7F7F, hairline #F2F2F2, surfaceMuted #F5F5F5, etc.)

### R6: XSS Safety
All snapshot field values (description, designation, discipline, material) MUST be rendered as React JSX children (text nodes). NEVER use:
- `dangerouslySetInnerHTML`
- `innerHTML`
- Raw HTML construction from snapshot data

Add a unit test with malicious strings (`<script>alert(1)</script>`, `<img src=x onerror=alert(1)>`) to verify labels render as literal text.

### R7: Performance Budget
- Initial render: < 2s
- Tab/View switch: < 200ms
- Tree expand/collapse: < 50ms
- Donut chart render: < 100ms
- Bundle size increase: < 10KB gzipped

### R8: Accessibility
All interactive elements MUST be keyboard accessible:
- Tab bars: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, roving tabindex
- Tree: `role="tree"`, `role="treeitem"`, `aria-expanded`
- Donut slices: `role="img"`, `aria-label`, `tabIndex={0}`
- Floating nav: `role="navigation"`, `aria-label`
- ARIA live regions for dynamic content updates
- **Sub-tab ArrowLeft/Right must use `e.stopPropagation()` to prevent propagation to main tab bar**

### R9: Rollback Ready
Every phase must be independently revertable. If a phase exit gate fails, roll back to the last passing phase.

### R10: State Updates Are Mandatory
After EVERY phase completion, you MUST update the tracker AND the `.ai/` state documents. This is not optional.

---

## 4. VERIFIED TECHNICAL PARAMETERS

Use these EXACT values. They are verified against the live codebase (2026-05-29):

| Parameter | Value | Source File |
|-----------|-------|-------------|
| SharePageTabs line count | 264 | `src/components/share/SharePageTabs.tsx` |
| ProjectCostDonutChart line count | 237 | `src/components/workshop/project-charts/ProjectCostDonutChart.tsx` |
| Tree indent step | 20px | `WORKSHOP_TREE_INDENT_STEP` in `tree-visual-style.ts` |
| Tree max indent | 140px | `WORKSHOP_TREE_MAX_INDENT` in `tree-visual-style.ts` |
| FolderSimple icon size (tree) | 12px, regular weight | `EstimateSheetTree.tsx` line 83 |
| Cube icon size (tree) | 12px, regular weight | `EstimateSheetTree.tsx` line 84 |
| CaretDown icon size | 11px, regular weight | `EstimateSheetTree.tsx` line 1051 |
| Chart color palette | 12 colors | `PROJECT_CHART_COLORS` in `aggregate-project-charts.ts` |
| Top bucket limit | 8 | `aggregate-project-charts.ts` |
| TreeRow min height | `min-h-7` | `tree-visual-style.ts` |
| formatMoney | Local function (not shared) | `SharePageTabs.tsx` line 26 |
| ShareTreeNode.collapsed | NOT on type — UI state via `useState<Set<string>>` | Component-level state |
| ShareTreeNode.kind | `"group" \| "area"` only (no "flat-group") | Matches workshop pattern |
| useMemo deps | `[activeEstimate.rows]` (not `[activeEstimate]`) | Prevents unnecessary recomputation |
| WorkshopTree generic | Lines 116-195 in `workshop-tree.tsx` | Reusable `WorkshopTree<TNode>` |
| Receiver background | `proposalPaper` (#FFFDF8) | DESIGN.md |

**Chart Colors (12):**
```typescript
const PROJECT_CHART_COLORS = [
  "#2f5d50", "#d98b3a", "#4c6f9f", "#b84a62",
  "#7a5aa6", "#2f8f9d", "#c9a227", "#5f6b3d",
  "#8a8f98", "#8f5c38", "#4d7c63", "#6b7280",
];
```

---

## 5. FILE PLACEMENT MAP

```
src/
├── lib/
│   ├── charts/
│   │   └── types.ts                          ← NEW: CostBucket type
│   └── share/
│       ├── aggregate-share-chart-buckets.ts   ← NEW: chart aggregation
│       └── reconstruct-share-tree.ts          ← NEW: tree reconstruction
├── components/
│   ├── charts/
│   │   └── CostDonutChart.tsx                 ← NEW: extracted donut chart
│   ├── share/
│   │   ├── SharePageTabs.tsx                  ← MODIFIED: orchestrator
│   │   ├── ShareEstimateTreeView.tsx          ← NEW: tree view
│   │   └── ShareFloatingTreeNav.tsx           ← NEW: floating nav
│   └── workshop/
│       └── project-charts/
│           └── ProjectCostDonutChart.tsx      ← MODIFIED: re-export wrapper
tests/
└── fixtures/
    └── publication-snapshots.ts               ← NEW: test fixtures (7 categories)
```

---

## 6. PHASE EXECUTION — DETAILED

### PHASE P0: Primitive Decision Gate (BEFORE any P1-P3 code)

**This is a BLOCKING gate. Do not proceed to P1 without completing P0.**

1. Run a primitive inventory pass: search for all tab/tree/row patterns in `src/components/`
2. Produce a matrix: "Pattern | Current Owner | Shared? | Notes"
3. **Decision A9a (Tab Primitive):** Record in tracker and `12-assumptions-decisions-log.md`:
   - Option A (preferred): Extract lightweight `TabButton`/`TabList` from existing SharePageTabs main bar as shared primitive
   - Option B: Accept temporary controlled duplication with documented revisit plan
4. **Decision A9b (Tree Row Primitive):** Record in tracker and `12-assumptions-decisions-log.md`:
   - Option A (preferred): Extract `WorkshopTree<TNode>` + `WorkshopTreeRow` to shared primitives, use `WorkshopTree<ShareTreeNode>` with read-only `renderNode`
   - Option B: Create standalone `ShareEstimateTreeView` with documented exception and tech debt ticket
5. Confirm CostDonutChart extraction is pure copy + re-export with zero behavioral divergence

### PHASE P0.5: Fidelity Audit Gate (BLOCKING for P3)

**This is a BLOCKING gate for P3. Run during or after P1/P2 but before P3 code.**

1. Examine the Lewis Residence seeded data and understand what `designation` values look like in real `PublicationSnapshotRow[]`
2. Create `tests/fixtures/publication-snapshots.ts` with all 7 fixture categories:
   - Rich hierarchical ("House > Living Room" patterns)
   - Flat / Area-only (simple room names)
   - Null / Empty / Unassigned
   - Inconsistent delimiters (" > ", ">", " - ", " / ")
   - Lewis-representative (mirrors real published estimate)
   - Large / Stress (300-500 rows)
   - Single-discipline / Edge totals
3. Draft the tree reconstruction utility and test it against fixtures
4. Produce a fidelity report:
   - Structural match % (parent-child, depth)
   - Ordering correlation (alpha sort vs user tree order)
   - Rolled-up total accuracy (should be 100%)
   - Edge case behavior (empty, inconsistent, large)
5. Record decision: "Good enough with labeling" / "Needs snapshot enhancement" / "Use discipline fallback only"
6. Finalize UX copy: "Reconstructed from estimate data (may differ from internal workspace view)"

### PHASE P1: Donut Chart Extraction + Integration

**Tasks:**

| # | Task | File | Verification |
|---|------|------|-------------|
| 1.1 | Create `src/lib/charts/types.ts` with `CostBucket` type: `{ id: string; label: string; total: number; share: number; rowCount: number; color: string; isOther?: boolean }` | New | `bun run type-check` |
| 1.2 | Create `src/components/charts/CostDonutChart.tsx` — copy from `ProjectCostDonutChart`, adapt imports to use shared `CostBucket` | New | Render with test data |
| 1.3 | Update `ProjectCostDonutChart.tsx` to re-export from new shared location — ZERO behavioral changes | Modified | Workshop charts page regression |
| 1.4 | Create `src/lib/share/aggregate-share-chart-buckets.ts` with `aggregateRowsByDiscipline(rows: PublicationSnapshotRow[]): CostBucket[]` — group by discipline, sort desc by total, collapse beyond TOP_BUCKET_LIMIT (8) into "Other" | New | Unit test passes |
| 1.5 | Add donut chart section to `SharePageTabs.tsx` — above sub-tab area, per active sheet, re-aggregate on sheet switch using `useMemo([activeEstimate.rows])` | Modified | Visual: donut renders per sheet |
| 1.6 | Run full validation suite | All | All pass |

**Exit Gate:**
- [ ] CostDonutChart renders in share page
- [ ] Donut updates on sheet tab switch
- [ ] Workshop charts page unchanged (visual regression)
- [ ] `bun run type-check` passes
- [ ] `bun run lint` passes
- [ ] `bun run test` passes
- [ ] Update tracker

### PHASE P2: Sub-Tab System

**Tasks:**

| # | Task | File | Verification |
|---|------|------|-------------|
| 2.1 | Add `sheetViews` state: `Record<string, 'tree' \| 'grid'>` to SharePageTabs (default: `'tree'`) | Modified | State toggles |
| 2.2 | Render sub-tab bar below main tab bar — "Tree View" \| "Grid Preview" — apply design system (10px SF Pro, xs radius, hairline borders) | Modified | Visual |
| 2.3 | Add keyboard navigation: ArrowLeft/Right on sub-tabs with `e.stopPropagation()` to prevent main tab bar interference | Modified | Keyboard test |
| 2.4 | Wire Grid Preview to existing flat table code (no changes to table itself) | Modified | Grid Preview unchanged |
| 2.5 | Add Tree View placeholder ("Tree View — coming in Phase 3") | Modified | Placeholder renders |
| 2.6 | ARIA: `role="tablist"`, `aria-selected`, `aria-controls` on sub-tab bar | Modified | ARIA valid |
| 2.7 | Persist view mode per sheet within session (React state keyed by sheetId) | Modified | Switch sheets, view mode preserved |

**Exit Gate:**
- [ ] Sub-tabs render below main tab bar
- [ ] Toggle between Tree View and Grid Preview works
- [ ] Grid Preview shows existing flat table unchanged
- [ ] View mode persists per sheet within session
- [ ] Keyboard navigation works (ArrowLeft/Right with stopPropagation)
- [ ] No visual regression on mobile
- [ ] `bun run type-check` passes
- [ ] `bun run lint` passes
- [ ] `bun run test` passes
- [ ] Update tracker

### PHASE P3: Tree View Component

**BLOCKING: Must complete P0.5 fidelity audit first.**

**Tasks:**

| # | Task | File | Verification |
|---|------|------|-------------|
| 3.1 | Create `src/lib/share/reconstruct-share-tree.ts`: `reconstructTreeFromRows(rows)` — split `designation` on " > " for nesting, group orphan rows, handle null/empty/whitespace designations, alpha sort within groups. Also `reconstructTreeByDiscipline(rows)` as fallback. | New | Unit tests with all 7 fixture categories |
| 3.2 | Add `treeNodes` useMemo to SharePageTabs: `useMemo(() => reconstructTreeFromRows(activeEstimate.rows), [activeEstimate.rows])` | Modified | Correct tree from rows |
| 3.3 | Create `ShareEstimateTreeView.tsx` — reuse `WorkshopTree<TNode>` if A9b option A, or standalone recursive component with proper ARIA (`role="tree"`, `role="treeitem"`, `aria-expanded`) | New | Renders test tree |
| 3.4 | Group nodes: FolderSimple icon (12px regular), `bg-surfaceMuted`, bold label, right-aligned total (tabular-nums) | Tree component | Matches workshop group style |
| 3.5 | Area nodes: Cube icon (12px regular), label, right-aligned total | Tree component | Matches workshop area style |
| 3.6 | Row items under Area nodes: description, quantity, unit, total — indent 20px per level (max 140px via WORKSHOP_TREE_MAX_INDENT) | Tree component | Rows render correctly |
| 3.7 | Expand/collapse: CaretDown icon (11px), rotates on toggle, `useState<Set<string>>` for collapsed nodes, default expanded | Tree component | Click toggles, default expanded |
| 3.8 | Integrate into SharePageTabs (replace placeholder from P2) | Modified | Tree View renders actual tree |
| 3.9 | Edge cases: empty rows → "No estimate items", no designation → discipline fallback, single row → flat rendering, large sheets (500+) → graceful degradation | Tree component | All edge cases handled |
| 3.10 | XSS safety: add test with `<script>alert(1)</script>` in description/designation/discipline — must render as literal text | Tests | Test passes |
| 3.11 | Add disclaimer text: "Reconstructed from estimate data" (from P0.5 fidelity decision) | Tree component | Visible in UI |

**Exit Gate:**
- [ ] Tree View renders hierarchical estimate structure
- [ ] Group nodes visually distinct from Area nodes
- [ ] Row items show description, quantity, unit, total
- [ ] Expand/collapse works (CaretDown rotation)
- [ ] Switching sheets updates the tree
- [ ] Empty state renders correctly
- [ ] Discipline-based fallback works when designation missing
- [ ] XSS safety test passes
- [ ] Design system compliant (SF Pro ≤12px, hairline borders, xs radius)
- [ ] `bun run type-check` passes
- [ ] `bun run lint` passes
- [ ] `bun run test` passes
- [ ] Update tracker

### PHASE P4: Floating Navigation Tree

**Tasks:**

| # | Task | File | Verification |
|---|------|------|-------------|
| 4.1 | Create `ShareFloatingTreeNav.tsx` — compact node list, 140px wide, sticky position, left of Tree View panel | New | Renders flattened node list |
| 4.2 | Implement scroll-to-section: click node → `scrollIntoView({ behavior: 'smooth', block: 'start' })` with unique IDs on tree sections | New | Click navigates to section |
| 4.3 | Implement IntersectionObserver for active section highlighting — observe all tree section headers, update active state on intersection | New | Active section updates on scroll |
| 4.4 | Integrate into SharePageTabs — conditional: visible only on lg+ screens AND when Tree View is active | Modified | Desktop Tree View only |
| 4.5 | ARIA: `role="navigation"`, `aria-label="Estimate navigation"`, focusable items | New | Accessible |
| 4.6 | Cleanup: remove observers on unmount, handle resize | New | No memory leaks |

**Exit Gate:**
- [ ] Floating nav renders correct node list
- [ ] Click scrolls to correct position
- [ ] Active section highlights on scroll
- [ ] Hidden on mobile (< 1024px)
- [ ] Hidden when Grid Preview active
- [ ] `role="navigation"` + `aria-label` present
- [ ] `bun run type-check` passes
- [ ] `bun run lint` passes
- [ ] Update tracker

### PHASE P5: Polish, Mobile, Accessibility, QA

**Tasks:**

| # | Task | Verification |
|---|------|-------------|
| 5.1 | Mobile Tree View: collapse by default on small screens, reduce indentation (12px), simplify row layout | Mobile layout functional |
| 5.2 | Mobile donut chart: verify scaling on 320px–428px viewports, chart readable | Chart readable |
| 5.3 | Accessibility audit: verify all ARIA roles, keyboard navigation end-to-end, screen reader labels | Tab, arrow, screen reader test |
| 5.4 | Color contrast: chart colors (#2f5d50 etc.) vs white/proposalPaper background — WCAG AA | Contrast check |
| 5.5 | DoS guard: large snapshot (500+ rows) — graceful degradation in aggregation and tree render | No OOM/crash |
| 5.6 | Run `bun run type-check` — 0 errors from all changed/new files | 0 errors |
| 5.7 | Run `bun run lint` — 0 errors from all changed/new files | 0 errors |
| 5.8 | Run `bun run test` — all pass (existing + new) | All pass |
| 5.9 | Run `bun run build` — production build succeeds | Build success |
| 5.10 | Run `bun run validate` if available — all pass | All pass |
| 5.11 | Graph impact analysis: risk ≤ 0.30, 0 critical flows affected | Low risk |
| 5.12 | Design system lint: 0 new violations | 0 violations |
| 5.13 | Manual QA: share page with multi-estimate snapshot, switch tabs, toggle views | All features work |
| 5.14 | Cross-browser test: Chrome, Firefox, Safari — consistent rendering | Consistent |
| 5.15 | Regression check: workshop charts, estimate tree, password gate, comments, decisions, activity | No regression |

**Exit Gate (FINAL):**
- [ ] All Phase 1-5 exit gates satisfied
- [ ] `bun run type-check` — 0 errors
- [ ] `bun run lint` — 0 errors
- [ ] `bun run test` — all pass
- [ ] `bun run build` — SUCCESS
- [ ] `bun run validate` — all pass (if available)
- [ ] Graph risk ≤ 0.30, 0 critical flows affected
- [ ] Design lint: 0 new violations
- [ ] Manual QA: all user stories verified
- [ ] Mobile responsive on all target viewports
- [ ] Accessibility: keyboard + screen reader verified
- [ ] No regressions on any existing feature

---

## 7. AUTONOMOUS LOOP PROTOCOL

You are operating in **autonomous loop mode**. Follow this protocol exactly:

### Loop Structure
```
FOR each phase (P0, P0.5, P1, P2, P3, P4, P5):
  1. Update tracker: mark phase as IN PROGRESS
  2. Read all relevant plan documents for this phase
  3. Read the source files you will modify BEFORE editing
  4. Run pre-phase graph checkpoint (see §8)
  5. Implement all tasks in the phase
  6. Run the phase exit gate validation suite
  7. IF any validation fails:
     a. Diagnose the failure
     b. Fix the issue
     c. Re-run validation
     d. REPEAT until validation passes (no skipping, no "good enough")
  8. Update tracker: mark phase as COMPLETED, record all validation results
  9. Update `.ai/10_state/decisions.md` with any decisions made during this phase
  10. Update `12-assumptions-decisions-log.md` if any assumptions change
  11. Run post-phase graph checkpoint (see §8)
  12. Move to next phase
```

### Error Recovery Protocol
If you encounter ANY error during implementation:
1. **DO NOT skip or ignore it.** Read the full error message.
2. Read the relevant source file to understand context.
3. Fix the root cause (not just the symptom).
4. Re-run the failing command.
5. If the fix introduces new errors, fix those too.
6. Loop until 0 errors.

### Validation Loop (Run After EVERY Phase)
```bash
bun run type-check    # MUST return 0 errors from changed files
bun run lint          # MUST return 0 errors from changed files
bun run test          # MUST all pass
```

After P5 (final phase), additionally run:
```bash
bun run build         # MUST succeed
bun run validate      # MUST all pass (if available)
git diff --check      # MUST return 0 (no whitespace errors)
```

### The Loop Does NOT Stop Until:
- ALL phases P0 through P5 are marked COMPLETED in the tracker
- ALL validation commands return 0 errors
- ALL exit gates for ALL phases are checked off
- ALL `.ai/` state documents are updated (see §10)
- The completion report is created (see §11)

---

## 8. MANDATORY GRAPH CHECKPOINTS

Per `AGENTS.md` and `AGENT_OPERATING_PROTOCOL.md`, you MUST use graph tools before and after edits.

### Before ANY file edit in each phase:
```
1. Run code-review-graph get_minimal_context(task="share estimate view enhancement P{N}")
2. If working on SharePageTabs or chart components: query_graph(callers_of, target)
3. Run npx gitnexus analyze if index is stale
```

### After EACH phase completes:
```
1. code-review-graph detect_changes(base="HEAD~1")
2. code-review-graph get_impact_radius(changed_files=[...all changed files...])
3. Verify: risk ≤ 0.30, 0 critical flows affected
4. If risk exceeds threshold: STOP, investigate, reduce blast radius
```

### Before final commit:
```
1. npx gitnexus analyze (ensure fresh)
2. gitnexus detect_changes (verify scope matches plan)
```

---

## 9. CRITICAL IMPLEMENTATION DETAILS

### 9.1 CostBucket Type (shared)
```typescript
// src/lib/charts/types.ts
export type CostBucket = {
  id: string;
  label: string;
  total: number;
  share: number;
  rowCount: number;
  color: string;
  isOther?: boolean;
};
```

### 9.2 ShareTreeNode Type
```typescript
// Used in reconstruct-share-tree.ts
export type ShareTreeNode = {
  id: string;
  label: string;
  kind: "group" | "area";  // ONLY these two kinds — no "flat-group"
  total: number;
  rowCount: number;
  children: ShareTreeNode[];
  rows: PublicationSnapshotRow[];  // Only populated for "area" nodes
  depth: number;
};
```

### 9.3 Collapsed State (UI only, not on data type)
```typescript
// In ShareEstimateTreeView.tsx — NOT on ShareTreeNode
const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
```

### 9.4 useMemo Dependency Correctness
```typescript
// CORRECT:
const chartBuckets = useMemo(
  () => aggregateRowsByDiscipline(activeEstimate.rows),
  [activeEstimate.rows]  // ← NOT [activeEstimate]
);

const treeNodes = useMemo(
  () => reconstructTreeFromRows(activeEstimate.rows),
  [activeEstimate.rows]  // ← NOT [activeEstimate]
);
```

### 9.5 Sub-Tab Keyboard Navigation (Cross-Tab Isolation)
```typescript
// Sub-tab keydown handler MUST call e.stopPropagation()
// to prevent ArrowLeft/Right from propagating to main tab bar
function handleSubTabKeyDown(e: React.KeyboardEvent) {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.stopPropagation();  // CRITICAL — prevents main tab bar interference
    // ... handle sub-tab switching
  }
}
```

### 9.6 Tree Indentation
```typescript
// Use the verified constants, not custom values
const indent = Math.min(depth * 20, 140); // WORKSHOP_TREE_INDENT_STEP=20, WORKSHOP_TREE_MAX_INDENT=140
```

### 9.7 Icon Sizes (verified)
```typescript
// Group node icon
<FolderSimple size={12} weight="regular" />

// Area node icon
<Cube size={12} weight="regular" />

// Expand/collapse caret
<CaretDown size={11} weight="regular" className={cn("transition-transform", collapsed ? "" : "rotate-180")} />
```

### 9.8 Design System Tokens (verified)
```typescript
// Text sizes
className="text-[10px] font-medium"  // body/controls
className="text-[9px]"               // meta/labels
// Max visible text: 12px

// Surfaces
className="bg-surfaceMuted"  // #F5F5F5 — group node background
className="bg-[#FFFDF8]"     // proposalPaper — receiver page background

// Borders
className="border border-hairline"  // #F2F2F2

// Radius
className="rounded-xs"  // 3px only
```

### 9.9 Security — DoS Guard
```typescript
// In reconstruct-share-tree.ts and aggregate-share-chart-buckets.ts
const MAX_ROWS_FOR_TREE = 500;
const MAX_DEPTH = 20; // Prevent deep recursion from crafted designations

if (rows.length > MAX_ROWS_FOR_TREE) {
  // Return discipline-only flat grouping or "Large sheet" fallback
}
```

---

## 10. STATE UPDATE OBLIGATIONS

### 10.1 After Each Phase — Update Tracker
Update `.ai/04_tasks/share-estimate-view-enhancement/TRACKER.md` with:
- Phase status (COMPLETED)
- All validation results (PASS/FAIL with exact output)
- Decisions made
- Dates

### 10.2 After P1 — Update Decisions Log
Add to `.ai/10_state/decisions.md`:
- CostDonutChart extraction decision
- Chart aggregation approach decision

### 10.3 After P2 — Update Decisions Log
Add to `.ai/10_state/decisions.md`:
- Sub-tab primitive decision (A9a outcome)

### 10.4 After P3 — Update Decisions Log
Add to `.ai/10_state/decisions.md`:
- Tree reconstruction approach decision
- Tree row primitive decision (A9b outcome)
- Fidelity audit outcome

### 10.5 After P5 (FINAL) — Full State Update
Execute the `COMPLETION-CRITERIA-AND-STATE-UPDATE-PLAYBOOK.md` protocol:

1. **Update `.ai/10_state/current-state.md`:**
   Add section under Shared Link / Phase 5A:
   ```
   ### Share Page Estimate View Enhancement (P1–P5) — COMPLETE
   **Completed:** [DATE]
   **Plan Pack:** `.ai/03_plans/share-page-estimate-view-enhancement/`
   **Delivered Features:** [list all features]
   **Key Decisions:** [reference decisions.md]
   **Files Modified:** [list]
   **Files Created:** [list]
   ```

2. **Update `.ai/10_state/decisions.md`:**
   Add all implementation decisions with rationale, context, and reversal triggers.

3. **Update `.ai/01_roadmap/README.md`:**
   Mark the enhancement as complete. Note follow-up items:
   - Snapshot schema enhancement for full tree metadata (future)
   - Space/category/supplier grouping modes (future)
   - Cross-estimate chart comparison (future)

4. **Update `12-assumptions-decisions-log.md`:**
   Record all decisions made during implementation with dates and sign-offs.

5. **Create completion report:**
   `.ai/04_tasks/share-estimate-view-enhancement/COMPLETION-REPORT.md`
   With: summary, metrics (files modified/created, tests added, bundle size change), decisions made, follow-up items, verification evidence.

---

## 11. ROLLBACK TRIGGERS

**STOP and roll back to last working phase if:**
1. `ProjectCostDonutChart` extraction breaks workshop charts (visual regression)
2. `SharePageTabs` grows beyond 500 lines (extract more sub-components)
3. Tree reconstruction produces misleading/flat-out-wrong hierarchy
4. Mobile layout completely breaks
5. Build or type-check fails with >5 new errors from share/chart code
6. Any existing share page test fails
7. Design lint violations increase
8. Fidelity audit proves designation-based reconstruction is systematically misleading → switch to discipline-only fallback or flat view
9. Primitive duplication causes repeated design lint failures → revert to flat Grid Preview while primitive work completes

---

## 12. COMPLETION CRITERIA (ALL Must Pass)

### Functional
- [ ] Donut chart renders per estimate sheet, updates on tab switch
- [ ] Sub-tab system (Tree View | Grid Preview) works per sheet
- [ ] Tree View renders hierarchical structure from designation-based reconstruction
- [ ] Tree View handles edge cases: empty rows, no designation, single row
- [ ] Discipline-based fallback works when designation is missing
- [ ] Floating navigation tree works on desktop (lg+), hidden on mobile
- [ ] Grid Preview preserves existing flat table behavior exactly
- [ ] View mode persists per sheet within session
- [ ] Empty state renders correctly for sheets with no rows

### Technical
- [ ] `bun run type-check` — 0 errors
- [ ] `bun run lint` — 0 errors
- [ ] `bun run test` — all pass
- [ ] `bun run build` — production build succeeds
- [ ] `bun run validate` — all pass (if available)
- [ ] Graph risk ≤ 0.30, 0 critical flows
- [ ] Bundle size increase < 10KB gzipped

### Accessibility
- [ ] All tab bars: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`
- [ ] Tree: `role="tree"`, `role="treeitem"`, `aria-expanded`
- [ ] Donut chart: `role="img"`, `aria-label`, focusable slices
- [ ] Floating nav: `role="navigation"`, `aria-label`
- [ ] Keyboard navigation works for all interactive elements
- [ ] Screen reader tested

### Regression
- [ ] Workshop charts page renders correctly
- [ ] Workshop estimate tree navigates correctly
- [ ] Share page password gate works
- [ ] Share page comments sidebar works
- [ ] Share page decision button works
- [ ] Share page activity feed works

### Security
- [ ] No `dangerouslySetInnerHTML` or `innerHTML` in new code
- [ ] All snapshot fields rendered as React text children
- [ ] Unit test with malicious label strings passes
- [ ] Image thumbnails use existing `next/image` + `remotePatterns`

### State Hygiene
- [ ] `.ai/10_state/current-state.md` updated
- [ ] `.ai/10_state/decisions.md` updated
- [ ] `.ai/01_roadmap/README.md` updated
- [ ] `12-assumptions-decisions-log.md` updated
- [ ] Tracker fully completed
- [ ] Completion report created

---

## 13. AUDIT CORRECTIONS — INCORPORATE THESE

The previous AI auditor identified factual errors. You MUST use the corrected values:

| What | Was (WRONG) | Correct Value | Use This |
|------|-------------|---------------|----------|
| SharePageTabs line count | 273 | **264** | Verified |
| ProjectCostDonutChart line count | 236 | **237** | Verified |
| Tree indent step | 16px | **20px** | `WORKSHOP_TREE_INDENT_STEP` |
| Tree max indent | Not mentioned | **140px** | `WORKSHOP_TREE_MAX_INDENT` |
| FolderSimple/Cube icon size | 13px | **12px** | `EstimateSheetTree.tsx` lines 83-84 |
| Chart color palette | 9 colors | **12 colors** | `PROJECT_CHART_COLORS` |
| ShareTreeNode.collapsed | Boolean on type | **Removed** — `useState<Set<string>>` in component | UI state |
| ShareTreeNode.kind | Includes "flat-group" | **Only "group" \| "area"** | Matches workshop |
| useMemo deps | `[activeEstimate]` | **`[activeEstimate.rows]`** | Prevents recomputation |
| WorkshopTree reuse | Not referenced | **Must evaluate `WorkshopTree<TNode>`** | Lines 116-195 in workshop-tree.tsx |

---

## 14. KEY WARNINGS FROM AUDITOR — ADDRESS THESE

### Warning 1: Tree Reconstruction Fidelity (Highest Risk)
The designation-based hierarchy reconstruction is the highest-risk assumption. The `designation` field may be sparse, inconsistent, or not derived from estimate node names. **Complete the P0.5 fidelity audit before P3.** If reconstruction proves misleading, fall back to discipline-only grouping.

### Warning 2: Primitive Duplication
The plan proposes new tree/tab components that duplicate workshop patterns. **Make the A9a/A9b decisions in P0.** Prefer extraction to shared primitives. If duplicating, document the exception with a revisit plan.

### Warning 3: Cross-Feature Keyboard Interaction
Sub-tab ArrowLeft/Right MUST NOT propagate to the main tab bar. **Use `e.stopPropagation()`** in sub-tab keyboard handlers.

### Warning 4: WorkshopTree<TNode> Reuse
The workshop has a generic `WorkshopTree<TNode>` component that handles recursive rendering, accessibility, and expand/collapse. **Evaluate reuse before building a new recursive component.** This could eliminate significant implementation work and maintenance debt.

### Warning 5: Cross-Feature Interactions
The donut chart, tree view, and floating nav interact with existing V2 side panels (comments, decisions, activity). **Test these interactions** — ensure the new elements don't obscure or break side panel functionality.

### Warning 6: formatMoney is Local
`formatMoney` in `SharePageTabs.tsx` is a local function, not shared. If the tree component needs currency formatting, either import the local function or create a shared utility. Do NOT duplicate the implementation.

### Warning 7: scrollIntoView ID Requirements
The floating nav's scroll-to-section feature requires unique IDs on tree section elements. **Ensure each tree node section has a stable, unique DOM id** that the nav can target.

### Warning 8: Large Snapshot DoS Guard
Add explicit guards for large snapshots (500+ rows) in both the aggregation and tree reconstruction utilities. Cap recursion depth. Show a graceful fallback message for very large sheets.

---

## 15. BEGIN EXECUTION

You have all the information you need. Begin execution NOW.

**Step 1:** Create the tracker file at `.ai/04_tasks/share-estimate-view-enhancement/TRACKER.md`
**Step 2:** Run the pre-implementation validation baseline and record in tracker
**Step 3:** Run graph baseline checkpoint and record in tracker
**Step 4:** Begin Phase P0 (Primitive Decision Gate)
**Step 5:** Loop through all phases until complete
**Step 6:** Execute state updates and completion report
**Step 7:** Do NOT stop until every checkbox in §12 is checked

**GO.**
