# Measurement Baseline

**Status:** Baseline procedure created; runtime measurements not yet collected.
**Blocker:** No React Profiler traces, bundle deltas, or realistic 500+ row fixtures are recorded in this plan as of 2026-06-06.

## Verified Static Data

| Evidence | Result | Implication |
| --- | --- | --- |
| `data/local/seed.json` exists | Yes | Can be parsed for smoke-level row counts. |
| Seed estimates | 1 estimate (`estimate_initial_sample`) | Not a performance fixture. |
| Seed sections | 2 | Too small for large-tree thresholds. |
| Seed line items | 2 | Cannot justify virtualization. |
| Seed floors/spaces | 2 floors, 2 spaces | Useful only for shape checks. |
| Seed cost library items | 2 | Not enough for catalogue benchmarks. |

The current local seed data is not a valid baseline for the `200-500` or `>500` visible-row thresholds. A future implementer must use realistic data or generate an approved local-only benchmark fixture before making performance claims.

## Profiler Collection Table

Fill this table before Phases 5-8 and before claiming any performance improvement.

| Surface | Primary file | Route/screen | Mount actualDuration | Expand/collapse actualDuration | Search/filter actualDuration | Select/edit actualDuration | Visible rows | Total nodes | Fixture |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Estimate sheet content | `src/components/workshop/EstimateSheetContent.tsx` | `/workshop/projects/[projectId]/estimates/[nodeId]` | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| Estimate sheet tree | `src/components/workshop/EstimateSheetTree.tsx` | Same estimate route | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| Library folder tree | `src/components/workshop/component-library-manager/LibraryFolderTree.tsx` | `/workshop/library` | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| Workshop tree | `src/components/workshop/workshop-tree.tsx` | share/library/template/embed surfaces | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| Share tree panel | `src/components/share/ShareEstimateTreePanel.tsx` | `/share/[token]` | TBD | TBD | N/A | TBD | TBD | TBD | TBD |
| Share tree view | `src/components/share/ShareEstimateTreeView.tsx` | `/share/[token]` | TBD | TBD | N/A | TBD | TBD | TBD | TBD |

## Row Count Collection Procedure

1. Start from realistic local or provider-approved beta data. Do not use production secrets or raw private customer payloads.
2. For `data/local/seed.json`, use a read-only parser and record counts only as smoke evidence.
3. For Supabase-backed local data, use owner-approved local or throwaway data only.
4. Count:
   - total estimate nodes
   - visible expanded rows
   - collapsed top-level rows
   - area rows with line items
   - library folders/items
   - share snapshot nodes
5. Record the fixture name, data source, date, and whether the fixture is synthetic.

## Thresholds

The thresholds from `02_TREE_PERFORMANCE_RESEARCH.md` are retained as decision prompts, not proven Archestimator facts:

| Visible rows | Default action | Evidence state |
| ---: | --- | --- |
| `< 200` | Keep recursive rendering; optimize indexes and memo boundaries only if profiler shows repeated work. | Unverified against realistic data. |
| `200-500` | Prioritize tree indexes, filtered/visible row flattening, and stable row props. | Unverified against realistic data. |
| `> 500` | Evaluate virtualization or windowing only after owner approval and measured bottleneck proof. | Unverified; not MVP. |

## Provisional Targets

No numeric before/after target is final until baseline values are collected. Future implementation should set targets as deltas from measured baseline:

| Metric | Target rule |
| --- | --- |
| Mount actualDuration | Improve by at least 20 percent for the touched surface or document why the phase is structural-only. |
| Expand/collapse update | Keep p95 under the baseline by at least 20 percent after tree-core/index extraction. |
| Search/filter update | Avoid full-surface recomputation when query changes. Target is set after baseline. |
| Bundle size | Any dynamic import must follow route-transition plan doc 14 and record before/after route chunk sizes. |
| Visual regression | No visible layout/text/control regression in the surfaces listed in `VISUAL_REGRESSION_STRATEGY.md`. |
