# Phase 0 Baseline Evidence

Date: 2026-06-22
Branch: `codex/estimate-sheet-loading-performance`
Base commit: `356564497f101ba9cfe5c822775ceadb27214b81`

## Workspace State

Initial branch check:

```text
## codex/estimate-sheet-loading-performance
```

At baseline capture, no implementation files had been changed yet. The first generated evidence artifacts were:

- `evidence/query-inventory-phase-0.md`
- `evidence/query-inventory-phase-0.json`

## Route Facts Confirmed

- Sheet route page exists at `src/app/workshop/projects/[projectId]/estimates/[nodeId]/page.tsx`.
- Before Phase 1 edits, `src/app/workshop/projects/[projectId]/estimates/[nodeId]/loading.tsx` did not exist.
- Parent estimate-list loading existed at `src/app/workshop/projects/[projectId]/estimates/loading.tsx` and used `ProjectEstimatesListSkeleton`.
- The sheet page had separate perf trace scopes:
  - `workshop.estimate-sheet`
  - `workshop.estimate-sheet-tail`
  - `estimate-sheet.route-context`
  - `estimate-sheet.current-user`
- `EstimateWorkspaceClient` already dynamically imported `EstimateSheetTree` and `EstimateSheetContent`.
- `EstimateSheetContent` statically imported `EstimateRightSidebar` and enabled the lazy component-library query when `renderSidebar || showCommandPalette`.

## Static Query Inventory

Command:

```bash
MARKDOWN_FILE=.ai/03_plans/2026-06-21-Estimate-Sheet-Loading-Performance/evidence/query-inventory-phase-0.md OUTPUT_FILE=.ai/03_plans/2026-06-21-Estimate-Sheet-Loading-Performance/evidence/query-inventory-phase-0.json bun scripts/build-performance-query-inventory.ts
```

Result:

```text
Wrote query inventory JSON: .ai/03_plans/2026-06-21-Estimate-Sheet-Loading-Performance/evidence/query-inventory-phase-0.json
Wrote query inventory markdown: .ai/03_plans/2026-06-21-Estimate-Sheet-Loading-Performance/evidence/query-inventory-phase-0.md
```

Inventory summary:

- Buckets: 8
- References: 326
- `workshop-projects-estimates`: 90 query refs, 20 tables, 5 RPCs, 58 explicit selects, 11 wildcard selects, 4 mutations, max selected columns 14.
- `component-library`: 39 query refs, 15 tables, 0 RPCs, 17 explicit selects, 21 wildcard selects, 1 mutation, max selected columns 7.

Scope note: this is repo-static evidence only. It does not prove provider latency, row counts, RLS cost, payload bytes, or live EXPLAIN plans.

## Open Validation Gaps

- No live provider timing captured yet; do not claim Supabase/provider latency improvements from local source checks.
- Browser route-transition skeleton proof was captured later in `browser-smoke.md`; no route timing/profile proof was captured.
- Broad `bun run validate` is not the gate for this plan because current project state documents unrelated pre-existing reds and possible all-DOM hangs.
