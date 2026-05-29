# 07 — Validation & Testing Plan

**Date:** 2026-05-29
**Status:** Complete

---

## 1. Verification Gates

### Gate 1: Pre-Implementation

| Check | Command/Tool | Expected |
|-------|-------------|----------|
| Graph impact baseline | `code-review-graph get_minimal_context_tool(task="share estimate view enhancement")` | Documented blast radius |
| Current type-check | `bun run type-check` | 0 new errors |
| Current lint | `bun run lint` | 0 new errors |
| Current tests | `bun run test` | All pass |
| Share page loads | Browser: `/share/{valid-token}` | Page renders correctly |
| Workshop charts work | Browser: `/workshop/projects/{id}/charts` | Charts render |

### Gate 2: Per-Phase Verification

Run after EACH phase:

| Check | Command |
|-------|---------|
| Type-check | `bun run type-check` |
| Lint (changed files) | Check lsp_diagnostics on changed files |
| Test (if applicable) | `bun run test` |

### Gate 3: Post-Implementation (FINAL)

| Check | Command/Tool | Expected |
|-------|-------------|----------|
| Full type-check | `bun run type-check` | 0 errors from share/chart code |
| Full lint | `bun run lint` | 0 errors from share/chart code |
| All tests | `bun run test` | All pass |
| Build | `bun run build` | Success |
| MCP graph impact | `code-review-graph detect_changes --base HEAD~1` | Risk ≤ 0.30, 0 critical flows |
| Design lint | `DESIGN.md` compliance check | 0 violations |

---

## 2. Test Scenarios

### 2.1 Unit Tests

#### Chart Aggregation (`aggregate-share-chart-buckets.ts`)

```

---

## Post-Audit Updates (2026-05-29)

**Supplementary audit completed** — see `00-POST-AUDIT-STRATEGY-ASSESSMENT-AND-IMPROVEMENT-PLAN.md` for full evidence.

### Pre-Implementation Graph-Driven Test Audit (NEW — Before Any Tests Written)

Before writing new tests, run these graph queries to understand existing test coverage:

```bash
# Find existing tests for share page components
code-review-graph query_graph_tool(pattern="tests_for", target="src/components/share/SharePageTabs.tsx")

# Find existing tests for chart component
code-review-graph query_graph_tool(pattern="tests_for", target="src/components/workshop/project-charts/ProjectCostDonutChart.tsx")

# Get review context for publication/chart test files
code-review-graph get_review_context_tool(changed_files=["tests/vitest/project-publication-page.test.tsx"])
```

Record findings: which behaviors are already tested, which gaps exist, which new tests are needed.

### Additional Test Cases (Additive to §2)

#### Security & Injection Tests (NEW)
```typescript
describe("Security — label rendering", () => {
  it("renders malicious discipline label as literal text (not HTML)", () => {
    // Input: { discipline: "<script>alert(1)</script>", rowTotal: 100 }
    // Expected: Text node contains literal "<script>..." string
  });

  it("renders malicious designation label as literal text", () => {
    // Input: { designation: "<img onerror=alert(1)>", rowTotal: 100 }
    // Expected: Text node contains literal string
  });

  it("handles very long designation strings without overflow", () => {
    // Input: designation = "A".repeat(500)
    // Expected: Truncated display, no layout breakage
  });
});
```

#### Fidelity Evidence Tests (NEW — Blocking for P3)
```typescript
describe("Tree reconstruction fidelity", () => {
  it("produces correct hierarchy from Lewis Residence representative fixture");
  it("matches expected node count and structure for rich hierarchical fixture");
  it("preserves all rows in correct groups (no data loss)");
  it("calculates correct rolled-up totals (100% accuracy)");
  it("handles inconsistent delimiters gracefully");
});
```

#### Workshop Chart Extraction Regression Matrix (NEW)
```typescript
describe("CostDonutChart extraction regression", () => {
  it("renders identical SVG output for same input buckets (snapshot test)");
  it("workshop ProjectChartsClient still imports and renders correctly");
  it("ProjectChartBucket type is backward compatible with CostBucket");
});
```

### Test Fixture Module (NEW)
See `11-test-data-fixture-spec.md` for the required 7 fixture categories. Tests must import from a central fixture module (e.g., `tests/fixtures/publication-snapshots.ts`), not use ad-hoc inline data.

### Performance Budget Measurements (Additive to §5)
In addition to the targets in §5, measure:
- `aggregateRowsByDiscipline` execution time for 100, 300, 500 rows
- `reconstructTreeFromRows` execution time for 100, 300, 500 rows
- Tree component render time with 500 rows (P5 stress test)
- Large snapshot DoS guard: if rows > 500, should show fallback message

### E2E Limitation (Caveat)
Current E2E testing (Playwright) is limited to sims (simulated Supabase environment) per V2 P13/P14 constraints in `current-state.md`. Full real-DB E2E for tree/donut interactions is not available in the current test infrastructure. This is an accepted limitation for V1.

### Cross-References
- `10-fidelity-audit-and-tree-reconstruction-spec.md` — Fidelity test requirements
- `11-test-data-fixture-spec.md` — Test fixture specifications
- `08-security-threat-model-for-receiver-ui.md` — Security test requirementstypescript
describe("aggregateRowsByDiscipline", () => {
  it("aggregates rows by discipline with correct totals");
  it("handles empty rows array (returns empty buckets)");
  it("handles null/empty discipline (groups as 'Unassigned')");
  it("collapses beyond 8 buckets into 'Other'");
  it("calculates correct share percentages");
  it("handles single row (one bucket, 100% share)");
  it("handles zero rowTotal (zero share)");
  it("handles negative rowTotal (preserves value)");
});
```

#### Tree Reconstruction (`reconstruct-share-tree.ts`)

```typescript
describe("reconstructTreeFromRows", () => {
  it("groups rows by designation into area nodes");
  it("creates hierarchy from ' > ' delimited designations");
  it("handles empty designation (groups as 'Unassigned')");
  it("handles empty rows array (returns empty tree)");
  it("sorts nodes: groups before areas, alphabetical within");
  it("calculates correct node totals from row totals");
  it("preserves all rows in correct groups");
});

describe("reconstructTreeByDiscipline", () => {
  it("groups rows by discipline into area nodes");
  it("handles all null designations (fallback mode)");
  it("sorts discipline groups alphabetically");
});
```

### 2.2 Component Tests

#### CostDonutChart

```typescript
describe("CostDonutChart", () => {
  it("renders SVG donut with correct number of slices");
  it("shows 'No cost rows' placeholder when buckets empty");
  it("shows 'No cost rows' placeholder when total is 0");
  it("renders callout labels for each bucket");
  it("center is blank by default (empty figcaption)");
  it("center shows detail on slice hover (activeDatum)");
  it("updates when buckets prop changes");
  it("applies correct aria-label");
});
```

#### ShareEstimateTreeView

```typescript
describe("ShareEstimateTreeView", () => {
  it("renders group nodes with FolderSimple icon");
  it("renders area nodes with Cube icon");
  it("renders row items under area nodes");
  it("toggles expand/collapse on click");
  it("defaults to expanded state");
  it("shows correct totals per node");
  it("applies correct indentation per depth");
  it("handles empty nodes array (no render)");
  it("applies role='tree' and role='treeitem'");
});
```

#### ShareFloatingTreeNav

```typescript
describe("ShareFloatingTreeNav", () => {
  it("renders flattened node list");
  it("highlights active section");
  it("calls scrollIntoView on click");
  it("hides on mobile (applies hidden class)");
  it("has role='navigation' and aria-label");
});
```

### 2.3 Integration Tests (SharePageTabs)

```typescript
describe("SharePageTabs (enhanced)", () => {
  describe("Donut Chart", () => {
    it("renders donut chart above tab bar");
    it("updates chart when estimate sheet tab changes");
    it("chart aria-label includes sheet name");
    it("shows placeholder when sheet has no rows");
  });

  describe("Sub-Tab System", () => {
    it("renders Tree View and Grid Preview sub-tabs");
    it("defaults to Tree View");
    it("switches between Tree View and Grid Preview");
    it("Grid Preview shows existing flat table");
    it("Tree View shows hierarchical estimate structure");
    it("view mode persists per sheet within session");
    it("ArrowLeft/Right keyboard navigation works");
    it("ARIA roles correct (tablist, tab, tabpanel)");
  });

  describe("Main Tab Bar (existing, regression)", () => {
    it("still switches between estimate sheets");
    it("keyboard navigation intact");
    it("sessionStorage persistence intact");
    it("scroll fade masks intact");
  });
});
```

### 2.4 Manual QA Scenarios

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| M1 | **Multi-sheet with donut** | Open share page with 2+ estimate sheets. Switch tabs. | Donut chart updates per sheet. Correct totals match sheet header. |
| M2 | **Tree View navigation** | Switch to Tree View. Expand/collapse groups. | Hierarchy renders correctly. Totals match. Rows display under correct areas. |
| M3 | **Toggle views per sheet** | Switch to Grid Preview on Sheet 1. Switch to Sheet 2 (defaults Tree View). Switch back to Sheet 1. | Sheet 1 stays Grid Preview, Sheet 2 stays Tree View. |
| M4 | **Floating nav** | Desktop: open Tree View. Click nav item. | Scrolls to correct section. Active section highlights. |
| M5 | **Mobile Tree View** | Mobile viewport (< 768px). Open share page. | Tree View nodes collapsed. Floating nav hidden. Grid Preview functional. |
| M6 | **Empty sheet** | Share page with an estimate sheet that has 0 rows. | Donut shows "No cost rows". Tree View shows empty state. |
| M7 | **Single discipline** | Sheet with all rows in one discipline. | Donut renders single full-circle slice. |
| M8 | **Workshop charts regression** | Open workshop charts page. | Donut and bubble charts render as before. |
| M9 | **Password-gated share** | Open password-protected share link. Enter password. | Donut + tree + sub-tabs render after auth. |

---

## 3. Accessibility Checklist

| # | Requirement | Status |
|---|-------------|--------|
| A1 | Main tab bar: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls` | Verify |
| A2 | Sub-tab bar: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls` | Verify |
| A3 | Tab panels: `role="tabpanel"`, `aria-labelledby` | Verify |
| A4 | Donut chart: `role="img"`, `aria-label`, slice `aria-label` | Verify |
| A5 | Donut chart slices: focusable (`tabIndex={0}`), keyboard activation | Verify |
| A6 | Tree View: `role="tree"`, `role="treeitem"`, `aria-expanded` | Verify |
| A7 | Tree View: Arrow keys for navigation, Enter/Space for toggle | Verify |
| A8 | Floating nav: `role="navigation"`, `aria-label` | Verify |
| A9 | All interactive elements: keyboard accessible | Verify |
| A10 | Color contrast: chart colors meet WCAG AA (4.5:1 minimum for text, 3:1 for graphics) | Verify |
| A11 | Screen reader: dynamic content announced (tab switches, chart updates) | Verify |
| A12 | Focus management: tab switches move focus logically | Verify |

---

## 4. Browser Matrix

| Browser | OS | Version | Status |
|---------|-----|---------|--------|
| Chrome | macOS | Latest | To test |
| Chrome | Windows | Latest | To test |
| Firefox | macOS | Latest | To test |
| Safari | macOS | Latest | To test |
| Safari | iOS | Latest | To test |
| Chrome | Android | Latest | To test |

---

## 5. Performance Budget

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial render (share page) | < 2s | Lighthouse / DevTools |
| Tab switch (donut + tree) | < 200ms | React DevTools profiler |
| Tree expand/collapse | < 50ms | React DevTools profiler |
| Donut chart render | < 100ms | React DevTools profiler |
| Bundle size increase | < 10KB gzipped | `bun run build` output |

---

## 6. Regression Test Suite

### Before merging, verify:

```bash
# 1. Workshop estimate page still works
# Manual: open /workshop/projects/{id}/estimates/{nodeId}
# - Tree navigates correctly
# - Rows edit and save
# - Drag/drop works
# - Activity history modal works

# 2. Workshop charts page still works
# Manual: open /workshop/projects/{id}/charts
# - Donut chart renders
# - Bubble chart renders
# - Group By / View By toggles work
# - Add/remove chart columns works

# 3. Share page core functions still work
# Manual: open /share/{token}
# - Password gate works (if applicable)
# - Comments sidebar works
# - Decision button works
# - Activity feed works

# 4. Automated gates
bun run validate    # TypeScript + ESLint + tests
bun run build       # Production build
bun run test:e2e    # Playwright E2E (if configured)
```
