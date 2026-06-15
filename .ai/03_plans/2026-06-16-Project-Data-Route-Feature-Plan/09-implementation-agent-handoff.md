---
title: Implementation Agent Handoff
date: 2026-06-16
status: copy-ready implementation prompt
type: implementation-handoff
scope: /workshop/projects/[projectId]/data
---

# 09 — Implementation Agent Handoff

Use this when handing the plan to the next codebase AI. The plan pack is the source of truth; this document compresses it into an execution contract.

## Copy-ready `/goal` prompt

```text
/goal Implement the Archestimator Project Data Route Feature Plan at:
.ai/03_plans/2026-06-16-Project-Data-Route-Feature-Plan/

Read in this order before editing:
1. AGENTS.md
2. .ai/README.md
3. .ai/00_system/ai-folder-canonical-map.md
4. .ai/00_system/AGENT_OPERATING_PROTOCOL.md
5. .ai/00_system/AGENT_FRAMEWORK_PROTOCOL.md
6. .ai/10_state/current-state.md
7. .ai/10_state/decisions.md
8. DESIGN.md
9. .ai/03_plans/2026-06-16-Project-Data-Route-Feature-Plan/00-README.md
10. .ai/03_plans/2026-06-16-Project-Data-Route-Feature-Plan/06-recommended-design.md
11. .ai/03_plans/2026-06-16-Project-Data-Route-Feature-Plan/07-implementation-roadmap.md
12. .ai/03_plans/2026-06-16-Project-Data-Route-Feature-Plan/08-verification-and-open-questions.md
13. Supporting docs 01-05 when implementing their referenced surfaces.

Target result:
Replace the current `/workshop/projects/[projectId]/data` comparison-heavy page with a calm cost-data page:
- Section 1: per-estimate-sheet Cost Breakdown donut, full-callout labeled mode, table-backed a11y, sheet dropdown synced to `?sheet=`, grouping synced to `?mode=`.
- Section 2: cross-sheet Cost Across Sheets stacked bars over discrete estimate sheets, total-descending order, absolute cost domain, table-backed a11y.
- Optional/light KPI header: selected-sheet total and sheet count by default; top category only if browser proof shows it adds signal.
- Permanent `/workshop/projects/:projectId/charts` -> `/workshop/projects/:projectId/data` redirect. Static redirect preserves query; legacy `?left=` fallback lives in the `/data` page param reader with the same project-scoped IDOR check.

Hard constraints:
- No new charting/UI dependency.
- No Supabase schema/provider change in v1.
- No true time-series/snapshot work.
- No pairwise comparison tool in v1.
- No broad internal rename from `project-charts` to `project-data`.
- No new shared UI abstraction unless existing code makes it strictly cheaper than local composition.
- Do not modify `/share`, `/api/share`, invite routes, collaboration presence semantics, Supabase schema/RLS, publication snapshots, proposal exports, or public link rendering. Only verify they still compile/import if touched through shared chart utilities.
- Do not delete `src/lib/project-charts/{format,types,bucket-color,aggregate-project-charts,project-comparison-view}.ts`; gut comparison-only exports only after impact analysis proves dashboard, `/data`, and AI read-context remain safe.
- Break `tests/vitest/project-dashboard-ui-fixtures.ts` `readFileSync` coupling before deleting comparison components.
- Preserve unrelated dirty work; inspect any touched file before editing.

Implementation sequence:
1. U1: Break fixture coupling and repoint `/data` away from `ProjectChartsClient`; reshape `data/loading.tsx`.
2. U2: Build Cost Breakdown using `getProjectDashboardSummary` as the preferred loader. Render `CostDonutChart` in full-callout labeled mode, extend it for controlled selection and 11px callout text if needed, cap at 6 + Other, default selected sheet to most-recently-updated (`estimates[0]`), default grouping to Category, and use the exact microcopy/formatting in 06.
3. U9: Repoint live dashboard compare/deep links from `?left/right` to canonical `?sheet=` before deleting comparison semantics.
4. U3: Create `src/lib/repositories/project-data-repository.ts` with `getProjectDataRouteSummary(projectId, { selectedEstimateId, groupingMode })`; build Cost Across Sheets from that surviving boundary, not from a soon-deleted comparison repository.
5. U4: Add the restrained KPI header.
6. U5: Delete route-exclusive comparison components and gut shared lib comparison exports only after graph/impact checks are clean, U9 is done, and one cheap usage signal for pairwise compare is recorded. If usage is nonzero, stop for user decision before hard-delete.
7. U6: Add the `/charts` -> `/data` redirect. Prove the redirect Location preserves `left/right`, then prove the `/data` page reader maps `sheet ?? left`.
8. U7: Retarget/delete comparison tests and the comparison Storybook story.
9. U8: Run accessibility and reduced-motion pass.

Required verification:
- `bun run type-check`
- `bunx vitest run tests/vitest/project-data-cost-breakdown-ui.test.tsx tests/vitest/project-data-cost-across-sheets-ui.test.tsx tests/vitest/project-data-a11y.test.tsx --maxWorkers=1`
- `bun test tests/unit/compare-href.test.ts`
- Targeted dashboard/route suites touched by U1/U6/U7/U9
- `git diff --check`
- Graph/impact check before and after U5 to prove deleted/gutted symbols do not break dashboard, `/data`, or AI read-context flows.
- Browser/manual proof: page reads as calm cost data; sheet swap works under the v1 router-backed mechanism; grouping works; mixed-currency Section 2 gate works; `/charts?left=X&right=Y&mode=category` redirects to `/data?left=X&right=Y&mode=category` and then renders sheet X; foreign `?sheet=`/`?left=` does not leak data; mobile/narrow controls fit.
- UltraQA-style scenario matrix covering normal path, stale `/charts` link, legacy `?left/right`, malformed `?sheet`, foreign estimate ID, mixed currency, no sheets, one sheet, more than 20 sheets, deleted component imports, formatting consistency, presence disclosure, and misleading success output.

Completion condition:
Claim implementation complete only when every U1-U9 acceptance item and the readiness gate in 08 are proven with fresh evidence. If auth/browser proof is blocked, record `AUTH-BLOCKED` with the exact blocker and strongest substitute evidence; do not call it browser proof.
```

## File ownership

Primary expected source files:

- `src/app/workshop/projects/[projectId]/data/page.tsx`
- `src/app/workshop/projects/[projectId]/data/loading.tsx`
- `src/components/workshop/project-data/ProjectDataClient.tsx`
- `src/components/workshop/project-data/CostBreakdownSection.tsx`
- `src/components/workshop/project-data/CostAcrossSheetsSection.tsx`
- `src/components/workshop/project-data/ProjectDataKpiHeader.tsx`
- `src/lib/repositories/project-data-repository.ts`
- `next.config.ts`
- `src/lib/workshop/compare-href.ts`
- Dashboard compare-link callers named in [07](07-implementation-roadmap.md) U9
- Shared project-charts lib files named in [06](06-recommended-design.md), gut-only
- Tests/stories named in [07](07-implementation-roadmap.md)

## Fixture and browser proof notes

The QA matrix needs fixtures or seeded states for 0, 1, 2, 5, and 21 sheets, a mixed-currency project, and a foreign estimate id. If no seeded browser fixture exists, create a local test fixture or document the exact blocked proof boundary before claiming browser completion.

## Final report shape

The implementation agent should report:

- Units completed: U1-U9, with any intentional deferrals.
- Files changed grouped by unit.
- Commands run and pass/fail evidence.
- Browser/manual/provider proof boundary.
- UltraQA scenario matrix summary.
- Graph/impact result for U5.
- Remaining risks, especially auth-blocked browser proof or owner product decisions.
