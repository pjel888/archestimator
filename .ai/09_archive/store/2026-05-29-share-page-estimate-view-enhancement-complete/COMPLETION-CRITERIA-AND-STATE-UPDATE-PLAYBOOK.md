# Completion Criteria & State Update Playbook

**Date:** 2026-05-29
**Status:** Active — execute when all implementation phases are complete.
**Purpose:** Defines exact completion criteria and the protocol for updating `.ai/` project state after successful delivery.

---

## 1. Completion Criteria (ALL Must Pass)

### 1.1 Functional Criteria
- [ ] Donut chart renders per estimate sheet, updates on tab switch
- [ ] Sub-tab system (Tree View | Grid Preview) works per sheet
- [ ] Tree View renders hierarchical structure from designation-based reconstruction
- [ ] Tree View handles edge cases: empty rows, no designation, single row
- [ ] Discipline-based fallback works when designation is missing for all rows
- [ ] Floating navigation tree works on desktop (lg+), hidden on mobile
- [ ] Grid Preview preserves existing flat table behavior exactly
- [ ] View mode persists per sheet within session (not across reloads)
- [ ] Empty state renders correctly for sheets with no rows

### 1.2 Technical Criteria
- [ ] `bun run type-check` — 0 errors from share/chart code
- [ ] `bun run lint` — 0 errors from share/chart code
- [ ] `bun run test` — all pass (existing + new)
- [ ] `bun run build` — production build succeeds
- [ ] `bun run lint:design-system` — 0 new violations
- [ ] `code-review-graph detect_changes` — risk ≤ 0.30, 0 critical flows
- [ ] Bundle size increase < 10KB gzipped

### 1.3 Accessibility Criteria
- [ ] All tab bars: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`
- [ ] Tree: `role="tree"`, `role="treeitem"`, `aria-expanded`
- [ ] Donut chart: `role="img"`, `aria-label`, focusable slices
- [ ] Floating nav: `role="navigation"`, `aria-label`
- [ ] Keyboard navigation works for all interactive elements
- [ ] Screen reader tested (VoiceOver or equivalent)

### 1.4 Regression Criteria
- [ ] Workshop charts page renders correctly (donut + bubble + table)
- [ ] Workshop estimate tree navigates correctly
- [ ] Share page password gate works
- [ ] Share page comments sidebar works
- [ ] Share page decision button works
- [ ] Share page activity feed works

### 1.5 Security Criteria
- [ ] No `dangerouslySetInnerHTML` or `innerHTML` in new code
- [ ] All snapshot fields rendered as React text children
- [ ] Unit test with malicious label strings passes
- [ ] Image thumbnails use existing `next/image` + `remotePatterns`

---

## 2. Completion Checklist

When all criteria in §1 pass, execute this checklist:

### Step 1: Final Verification
```bash
# Full validation pipeline
bun run type-check
bun run lint
bun run test
bun run build
bun run validate  # if available

# Graph verification
code-review-graph detect_changes_tool(base="HEAD~1")
code-review-graph get_impact_radius_tool(changed_files=[...all changed files...])

# GitNexus verification
npx gitnexus analyze
npx gitnexus detect_changes
```

### Step 2: Documentation Update
Update the following files in `.ai/`:

#### `.ai/10_state/current-state.md`
Add a new section under the Shared Link / Phase 5A area:

```markdown
### Share Page Estimate View Enhancement (P1–P5) — COMPLETE
**Completed:** [DATE]
**Plan Pack:** `.ai/03_plans/share-page-estimate-view-enhancement/`

**Delivered Features:**
- Per-sheet donut chart (D3, discipline-based aggregation)
- Sub-tab system (Tree View | Grid Preview toggle per sheet)
- Tree View with designation-based hierarchy reconstruction
- Floating navigation tree (desktop only)
- Extracted shared CostDonutChart component

**Key Decisions:**
- Client-side reconstruction from flat snapshot rows (no DB changes)
- Discipline-based donut grouping (V1)
- Designation-based tree hierarchy with discipline fallback
- [Primitive decision: extracted/shared or documented exception]

**Files Modified:**
- `src/components/share/SharePageTabs.tsx`
- `src/components/workshop/project-charts/ProjectCostDonutChart.tsx` (re-export)

**Files Created:**
- `src/lib/charts/types.ts`
- `src/lib/share/aggregate-share-chart-buckets.ts`
- `src/lib/share/reconstruct-share-tree.ts`
- `src/components/charts/CostDonutChart.tsx`
- `src/components/share/ShareEstimateTreeView.tsx`
- `src/components/share/ShareFloatingTreeNav.tsx`
```

#### `.ai/10_state/decisions.md`
Add new decision entries:

```markdown
### [DATE] Share Page Estimate View Enhancement — Implementation Decisions

**Decision 1: Client-side tree reconstruction**
- Context: Flat snapshot rows lack tree hierarchy metadata
- Decision: Reconstruct virtual tree from `designation` field using " > " delimiter splitting
- Rationale: No DB migration needed, fast V1 delivery, pragmatic
- Reversal trigger: Fidelity audit proves systematic mismatch; snapshot schema enhanced
- Plan reference: 04 §2, 10-fidelity-audit

**Decision 2: Chart aggregation approach**
- Context: Snapshot rows have `discipline` and `rowTotal` fields
- Decision: Client-side O(n) aggregation into CostBucket[] grouped by discipline
- Rationale: Rows typically <100, no API/DB cost, same data already resolved
- Reversal trigger: Performance issues at scale; need for server-side aggregation
- Plan reference: 04 §1

**Decision 3: Component extraction strategy**
- Context: ProjectCostDonutChart is workshop-coupled but self-contained
- Decision: Extract to shared CostDonutChart with re-export from original path
- Rationale: Avoid duplicating 237 lines of D3 code; backward compatible
- Reversal trigger: Visual or behavioral divergence detected
- Plan reference: 05 §4

**Decision 4: [Primitive decision — A9a/A9b outcome]**
- Context: Sub-tab bar and tree row patterns duplicate workshop patterns
- Decision: [To be recorded after owner decision]
- Rationale: [To be recorded]
- Plan reference: 09, 12-assumptions-log A9a/A9b
```

#### `.ai/10_state/roadmap.md` (if exists)
Mark the share page estimate view enhancement as complete and note any follow-up items:
- Snapshot schema enhancement for full tree metadata (future)
- Space/category/supplier grouping modes (future)
- Cross-estimate chart comparison (future)
- Proposal-package integration (future)

### Step 3: Create Completion Report
Create a completion report in the plan pack directory:

```markdown
# Share Page Estimate View Enhancement — Completion Report

**Date:** [DATE]
**Phases Completed:** P1–P5
**Total Implementation Time:** [TIME]

## Summary
[2-3 sentence summary of what was delivered]

## Metrics
- Files modified: [N]
- Files created: [N]
- Tests added: [N]
- Bundle size change: [N]KB gzipped
- Design lint violations: 0
- Accessibility issues: 0

## Decisions Made
[Reference to decisions.md entries]

## Follow-up Items
[Any deferred work or technical debt]

## Verification
[Links to test results, build output, graph analysis]
```

### Step 4: Git Commit
```bash
git add -A
git commit -F - <<'EOF'
feat: share page estimate view enhancement (P1-P5)

- Per-sheet donut chart with discipline-based aggregation
- Sub-tab system (Tree View / Grid Preview)
- Tree View with designation-based hierarchy reconstruction
- Floating navigation tree (desktop only)
- Extracted shared CostDonutChart component

Plan pack: .ai/03_plans/share-page-estimate-view-enhancement/

Co-authored-by: CommandCodeBot <noreply@commandcode.ai>
EOF
```

---

## 3. Post-Delivery Monitoring

After merge, monitor for:
- Client-side performance issues (tree rendering with large snapshots)
- User feedback on tree hierarchy accuracy
- Any visual regressions on workshop charts page
- Bundle size impact in production builds

---

*This playbook ensures clean closeout and proper `.ai/` state maintenance per AGENTS.md requirements.*
