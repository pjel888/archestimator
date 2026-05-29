# Implementation Master Prompt — Share Page Estimate View Enhancement

**Date:** 2026-05-29
**Status:** Active — must be read by any implementer before starting work.
**Plan Pack:** `.ai/03_plans/share-page-estimate-view-enhancement/`

---

## Your Mission

You are implementing the Share Page Estimate View Enhancement for Archestimator. This feature transforms the `/share/[token]` receiver page from a flat table view into a rich analytical experience with per-sheet donut charts, a hierarchical tree view, and sub-tab navigation.

**Read these documents IN ORDER before writing any code:**

1. `README.md` — North Star, scope, key decisions
2. `00-readiness-assessment.md` — Infrastructure readiness
3. `00-POST-AUDIT-STRATEGY-ASSESSMENT-AND-IMPROVEMENT-PLAN.md` — Audit findings and graph evidence
4. `01-current-implementation-audit.md` — Current code analysis (including WorkshopTree<TNode> reuse finding)
5. `02-blast-radius-analysis.md` — Risk register and rollback plan
6. `03-ux-ui-spec.md` — Visual layouts, interaction states, accessibility
7. `04-data-model-and-chart-aggregation-plan.md` — Type definitions, aggregation, tree reconstruction
8. `05-component-architecture-plan.md` — Component tree, extraction plan, state management
9. `06-implementation-phased-plan.md` — Phase breakdown with exit gates
10. `07-validation-and-testing-plan.md` — Test scenarios, browser matrix, performance budget
11. `08-security-threat-model-for-receiver-ui.md` — Security mitigations
12. `09-ui-primitive-reuse-audit-and-extension-plan.md` — Primitive reuse contract
13. `10-fidelity-audit-and-tree-reconstruction-spec.md` — Blocking fidelity gate for P3
14. `11-test-data-fixture-spec.md` — Test fixture requirements
15. `12-assumptions-decisions-log.md` — All assumptions and decisions
16. `13-implementation-readiness-and-owner-review-gate.md` — Pre-implementation gates

---

## Non-Negotiable Rules

These rules CANNOT be violated. If you find a conflict, STOP and ask for guidance.

### Rule 1: Preserve Everything Existing
All current SharePageTabs functionality MUST work exactly as before:
- Tab bar with horizontal scroll and keyboard navigation (ArrowLeft/Right, Home/End, Enter/Space)
- Roving tabindex (only active tab has tabIndex={0})
- Scroll fade masks (left/right gradients)
- sessionStorage persistence for active sheet (`share-tab:{token}`)
- Active estimate summary header (name + total)
- Recipient session guard banner
- Flat table with Description | Discipline | Qty | Unit | Total columns
- Row image thumbnails (32px)

### Rule 2: No New Dependencies
D3 is already installed. Do NOT add chart.js, recharts, visx, react-complex-tree (for receiver), or any other chart/tree libraries.

### Rule 3: No Database Changes
No migrations, no schema changes, no new RPCs. Tree reconstruction and chart aggregation are purely client-side from existing `PublicationSnapshotRow[]` data.

### Rule 4: Shared Primitive Contract
Before creating ANY new UI component, check `src/components/ui/` first:
- Reuse existing primitive if it fits
- Extend shared primitive if one use case is missing
- Create new shared primitive only if no reusable primitive exists AND pattern will repeat
- Feature-local markup is ONLY for genuinely unique layout composition

**Critical:** Review `WorkshopTree<TNode>` in `src/components/workshop/workshop-tree.tsx` before implementing tree recursion. See `09-ui-primitive-reuse-audit-and-extension-plan.md` §3 for the reuse analysis.

### Rule 5: Design System Compliance
- SF Pro system stack, regular/medium weights only
- Maximum 12px for visible text (~10px for body/controls, 8-9px for meta)
- `rounded-xs` (3px) only
- `border-hairline` for all borders
- Zero letter spacing
- `@phosphor-icons/react` regular weight icons only
- `proposalPaper` background (#FFFDF8) for receiver surface

### Rule 6: XSS Safety
All snapshot field values (description, designation, discipline, material) MUST be rendered as React JSX children (text nodes). NEVER use:
- `dangerouslySetInnerHTML`
- `innerHTML`
- Raw HTML construction from snapshot data

Add a unit test with malicious strings (`<script>alert(1)</script>`) to verify labels render as literal text.

### Rule 7: Performance Budget
- Initial render: < 2s
- Tab/View switch: < 200ms
- Tree expand/collapse: < 50ms
- Donut chart render: < 100ms
- Bundle size increase: < 10KB gzipped

### Rule 8: Accessibility
All interactive elements MUST be keyboard accessible:
- Tab bars: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, roving tabindex
- Tree: `role="tree"`, `role="treeitem"`, `aria-expanded`
- Donut slices: `role="img"`, `aria-label`, `tabIndex={0}`
- Floating nav: `role="navigation"`, `aria-label`
- ARIA live regions for dynamic content updates

---

## Verified Technical Parameters

These values are verified against the actual codebase (2026-05-29). Use these EXACTLY:

| Parameter | Value | Source |
|-----------|-------|--------|
| SharePageTabs line count | 264 | `src/components/share/SharePageTabs.tsx` |
| ProjectCostDonutChart line count | 237 | `src/components/workshop/project-charts/ProjectCostDonutChart.tsx` |
| Tree indent step | 20px | `WORKSHOP_TREE_INDENT_STEP` in `tree-visual-style.ts` |
| Tree max indent | 140px | `WORKSHOP_TREE_MAX_INDENT` in `tree-visual-style.ts` |
| FolderSimple icon size (tree) | 12px, regular | `EstimateSheetTree.tsx` line 83 |
| Cube icon size (tree) | 12px, regular | `EstimateSheetTree.tsx` line 84 |
| CaretDown icon size | 11px, regular | `EstimateSheetTree.tsx` line 1051 |
| Chart colors | 12-color `PROJECT_CHART_COLORS` | `aggregate-project-charts.ts` line 17 |
| Top bucket limit | 8 | `aggregate-project-charts.ts` |
| TreeRow min height | `min-h-7` | `tree-visual-style.ts` |
| formatMoney | Local function (not shared) | `SharePageTabs.tsx` line 26 |

---

## Phase Execution Order

Follow `06-implementation-phased-plan.md` strictly:

### P1: Donut Chart Extraction + Integration
- Create `src/lib/charts/types.ts` with `CostBucket` type
- Extract `ProjectCostDonutChart` → `CostDonutChart` (shared)
- Create `src/lib/share/aggregate-share-chart-buckets.ts`
- Add donut chart to `SharePageTabs`
- **Exit gate:** Workshop charts page regression test passes

### P2: Sub-Tab System
- Add `sheetViews` state to SharePageTabs
- Render sub-tab bar (Tree View | Grid Preview)
- Wire Grid Preview to existing table
- Tree View placeholder
- **Exit gate:** Keyboard nav works, view mode persists per sheet

### P3: Tree View Component
- **BLOCKING:** Must complete fidelity audit (10-) first
- Create `src/lib/share/reconstruct-share-tree.ts`
- Create or reuse tree component (see 09 decision)
- Integrate into SharePageTabs
- **Exit gate:** Tree renders correctly, expand/collapse works, empty state handled

### P4: Floating Navigation Tree
- Create `ShareFloatingTreeNav.tsx`
- Implement scroll-to and IntersectionObserver
- **Exit gate:** Hidden on mobile, hidden in Grid Preview

### P5: Polish, Mobile, Accessibility, QA
- Mobile adaptation (collapsed tree, reduced indent, simplified rows)
- Accessibility audit
- Cross-browser testing
- Performance measurement
- **Exit gate:** All gates pass, build succeeds

---

## Graph Checkpoints (Mandatory per AGENTS.md)

### Before ANY file edit:
```bash
code-review-graph get_minimal_context_tool(task="share estimate view enhancement P{N}")
npx gitnexus analyze  # if stale
```

### After EACH phase:
```bash
code-review-graph detect_changes_tool(base="HEAD~1")
code-review-graph get_impact_radius_tool(changed_files=[...])
bun run validate
bun run build
```

### Before commit:
```bash
npx gitnexus analyze  # ensure fresh
gitnexus detect_changes  # verify scope
```

---

## File Placement Map

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
    └── publication-snapshots.ts               ← NEW: test fixtures
```

---

## Rollback Triggers

STOP and roll back to last working phase if:
1. `ProjectCostDonutChart` extraction breaks workshop charts (visual regression)
2. `SharePageTabs` grows beyond 500 lines (extract more sub-components)
3. Tree reconstruction produces misleading/flat-out-wrong hierarchy
4. Mobile layout completely breaks
5. Build or type-check fails with >5 new errors from share/chart code
6. Any existing share page test fails
7. Design lint violations increase

---

## Completion

After all phases pass their exit gates, run the COMPLETION-CRITERIA-AND-STATE-UPDATE-PLAYBOOK.md protocol to close out the feature and update `.ai/` project state.

---

*This prompt is the authoritative implementation contract. When in doubt, refer back to the specific plan document for the phase you're working on. All technical parameters are verified against the live codebase as of 2026-05-29.*
