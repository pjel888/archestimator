# 00 — Readiness Assessment

**Date:** 2026-05-29
**Status:** Complete

---

## 1. Infrastructure Readiness

### 1.1 Share Page Infrastructure (V2 Overhaul — COMPLETE)

The V2 Shared Link Overhaul (P0–P13, completed 2026-05-28) provides a solid foundation:

| Component | Status | Notes |
|-----------|--------|-------|
| `/share/[token]` server page | **Ready** | Resolves snapshot, handles password gate, recipient sessions, records opens. |
| `SharePageTabs` | **Ready** | Client component with horizontal estimate sheet tab bar, sessionStorage persistence, keyboard navigation (roving tabindex). Current panel renders flat table. |
| `PublicationSnapshotEstimate` type | **Ready** | Contains `id`, `name`, `sheetCode`, `rowCount`, `totalCost`, `rows: PublicationSnapshotRow[]`. |
| `PublicationSnapshotRow` type | **Ready** | Contains `description`, `designation`, `discipline`, `material`, `quantity`, `unit`, `unitCost`, `miscCost`, `contingencyPercentage`, `rowTotal`, `imageUrl`. |
| Password gate | **Ready** | No changes needed for view enhancement. |
| Recipient sessions | **Ready** | No changes needed. |
| Comments/decisions sidebar | **Ready** | No changes needed. |

**Verdict**: The share page infrastructure is **fully ready** for the view enhancement. Changes are scoped to `SharePageTabs.tsx` and new components only.

### 1.2 Chart System Infrastructure

| Component | Status | Notes |
|-----------|--------|-------|
| D3 dependency | **Installed** | `d3` is already in `package.json` and used by `ProjectCostDonutChart`. |
| `ProjectCostDonutChart` | **Ready for extraction** | 237-line self-contained D3 donut chart with hover interactions, callout labels, empty center. Coupled to `ProjectChartBucket` type. |
| `ProjectChartBucket` type | **Ready for reuse** | `{ id, label, total, share, rowCount, color, isOther? }`. Can be reused for share page donuts. |
| `ProjectChartsClient` | **Not needed** | Workshop-only comparison chart board. Not relevant for receiver page. |
| `buildProjectChartSeries()` | **Not directly usable** | Aggregates from `ProjectChartRowFact[]` which requires DB-level joins. Share page needs client-side aggregation from `PublicationSnapshotRow[]`. |

**Verdict**: Chart infrastructure is **ready**. D3 is installed. `ProjectCostDonutChart` can be extracted into a shared primitive. A new lightweight client-side aggregation utility is needed.

### 1.3 Design System Readiness

| Element | Status | Notes |
|---------|--------|-------|
| SF Pro typography (≤12px) | **Ready** | Applied throughout product surfaces. |
| Color tokens | **Ready** | Neutral palette defined in `DESIGN.md`. Chart uses `PROJECT_CHART_COLORS` array. |
| Border radius (xs) | **Ready** | `rounded-xs` used throughout. |
| Hairline borders | **Ready** | `border-hairline` token available. |
| `proposalPaper` background | **Ready** | `#FFFDF8` — already the receiver page background. |
| Tab/toggle patterns | **Partial** | No shared `TabList`/`TabButton` primitives exist. `SharePageTabs` implements its own tab bar. Sub-tabs should follow the same pattern. |

**Verdict**: Design system is **ready**. Sub-tab styling should mirror the existing `SharePageTabs` tab bar pattern.

### 1.4 Dependency Check

| Dependency | Version | Status | Needed For |
|------------|---------|--------|------------|
| `d3` | Already installed | **Ready** | Donut chart rendering |
| `react-complex-tree` | 2.6.1 | **Not needed** | NOT required for receiver Tree View. Receiver is read-only. A simpler recursive component renders the tree. |
| `next/image` | Already used | **Ready** | Row image thumbnails (already in Grid Preview) |
| `zustand` | Already installed | **Not needed** | Receiver state is simple React state. No global store needed. |
| `@phosphor-icons/react` | Already installed | **Ready** | Tree View icons (FolderSimple, Cube, CaretDown) |

**Verdict**: **Zero new dependencies needed**. All required libraries are already installed.

---

## 2. Data Model Readiness

### 2.1 Current Snapshot Structure

```
ProjectPublicationSnapshot
├── project: { id, name, projectCode, clientName, location, currencyCode, coverImageUrl }
├── estimateCount, rowCount, totalCost
└── estimates: PublicationSnapshotEstimate[]
    ├── id, name, sheetCode, updatedAt, rowCount, totalCost
    └── rows: PublicationSnapshotRow[]
        ├── id, description, designation, discipline, material
        ├── quantity, unit, unitCost, miscCost
        ├── contingencyPercentage, rowTotal
        └── imageUrl?
```

### 2.2 What's Available for Donut Chart Aggregation

From `PublicationSnapshotRow`:
- `discipline` — **Primary grouping field** (e.g., "Architectural", "Structural", "Electrical", "Plumbing")
- `rowTotal` — Cost value per row
- Each row has exactly one row → bucket mapping

### 2.3 What's Available for Tree Reconstruction

The snapshot rows are **flat** — no parent/child/node hierarchy is preserved. Available grouping fields:
- `designation` — May contain node-like labels (e.g., "Living Room", "Bedroom 1")
- `discipline` — Category-level grouping
- `description` — Row-level text

### 2.4 Gap Analysis

| Gap | Impact | Mitigation |
|-----|--------|------------|
| **No tree hierarchy in snapshot** | Tree View cannot show the exact workshop tree structure. | Group rows by `designation` field. If `designation` is populated with Area Node names, rows can be grouped under virtual Area-like headers. Group Nodes (e.g., "Lot", "House") are not available. |
| **No category/space metadata** | Donut chart grouping is limited to `discipline` field. | Discipline-based grouping provides useful cost breakdown (clients care about "how much for Electrical vs. Finishes"). Space/category grouping can be added later by enhancing the snapshot schema. |
| **No sort order** | Tree View rows cannot preserve original tree ordering. | Sort alphabetically by designation, then by description within each group. |

**Verdict**: Data model is **adequate for V1**. Discipline-based donut charts work well. Tree View with designation-based grouping provides useful hierarchy even without full tree metadata. Snapshot enhancement for full tree data is a V2 consideration.

---

## 3. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Snapshot rows lack sufficient grouping metadata | Medium | Medium | Designation-based grouping covers most cases. If `designation` is empty/null, fall back to flat list grouped by discipline. |
| `ProjectCostDonutChart` extraction causes regression in workshop charts | Low | High | Extract donut chart as a shared component with zero behavioral changes. Run workshop chart tests before and after extraction. |
| Sub-tab + main-tab state management complexity | Low | Medium | Keep state local to `SharePageTabs`. No global store. Simple `useState` for `activeView: 'tree' | 'grid'` per sheet. |
| Mobile Tree View usability | Medium | Low | Collapse tree by default on mobile. Show flat list with expandable groups. Floating tree hidden on mobile. |
| Performance with many rows | Low | Low | Snapshot rows are typically < 100 per sheet. Client-side aggregation and tree rendering are O(n) and fast. |

---

## 4. Team & Process Readiness

| Factor | Status |
|--------|--------|
| **Codebase familiarity** | V2 Shared Link Overhaul is well-documented. `SharePageTabs.tsx` is 264 lines and straightforward. |
| **Chart expertise** | `ProjectCostDonutChart` is well-written, well-tested D3 code. Extraction scope is clear. |
| **Design system** | Enforced SF Pro compact scale. No ambiguity in visual direction. |
| **Testing infrastructure** | Vitest + Playwright available. Existing share page tests cover tab navigation. |
| **GitNexus / MCP graph** | Code-review-graph MCP tools available for pre/post-edit impact analysis. |

---

## 5. Go/No-Go Recommendation

**RECOMMENDATION: GO** — All infrastructure is ready. Zero new dependencies. Changes are additive and scoped to the receiver page only. No database migration required. Primary risk is tree reconstruction fidelity from flat snapshot rows, which is mitigated by designation-based grouping.

### Pre-Implementation Checklist

- [ ] Owner approves this readiness assessment
- [ ] Owner approves the UX/UI spec (document 03)
- [ ] Owner approves the component architecture plan (document 05)
- [ ] `code-review-graph detect_changes` run before any edits on `SharePageTabs.tsx`
- [ ] Snapshot test data verified to include `designation` field values

---

## Post-Audit Updates (2026-05-29)

**Supplementary audit completed** — see `00-POST-AUDIT-STRATEGY-ASSESSMENT-AND-IMPROVEMENT-PLAN.md` for full evidence.

### Corrections Applied
- `SharePageTabs.tsx` line count corrected: 273 → **264** (verified via direct file read)
- `ProjectCostDonutChart.tsx` line count corrected: 236 → **237** (verified via direct file read)

### Key Graph Evidence (Additive)
- **code-review-graph get_minimal_context**: 3018 nodes, 43334 edges, 340 files. Task risk: **medium (0.55)**.
- **query_graph (callers_of SharePageTabs)**: Exactly **1 production caller** (`ProjectPublicationView` in `/share/[token]/page.tsx`). 9 additional test callers.
- **Architecture overview**: workshop-estimate community (37 nodes, cohesion 0.3137) signals coupling risk for tree/chart maintenance, not runtime breakage.
- **GitNexus (fresh)**: 9,106 nodes, 16,881 edges, 403 clusters, 300 flows.

### Additional Readiness Findings
- **WorkshopTree<TNode> generic component** exists in `workshop-tree.tsx` (lines 116–195) — a reusable recursive tree renderer that could serve the receiver Tree View. Not referenced in original readiness. See 01-audit §4.3 and 09-primitive-reuse.
- **New documents created**: 08 (security), 09 (primitive reuse), 10 (fidelity audit), 11 (test fixtures), 12 (assumptions log), 13 (readiness gate), IMPLEMENTATION-MASTER-PROMPT, COMPLETION-CRITERIA.
- **Go/No-Go remains GO** with additional gates in 13-readiness-gate.md.
