# 26 — Performance Budget

> Closes the audit-prompt gap: "Performance budgets and scalability assumptions."
> Concrete, measurable budgets per operation. [14-PERFORMANCE-AUDIT.md](./14-PERFORMANCE-AUDIT.md) gives loose observations; this doc gives enforceable limits.

## Budget principles

1. Budgets are **enforced in CI** where possible (bundle size, payload size) and **monitored in production** where measurement is dynamic (latency).
2. Breaches are visible: dashboard panel + alert on sustained breach.
3. Budgets are revisited at each release milestone. They are not stretch goals; they are ceilings.

## Per-operation latency budget

All latencies measured from user action to first paint of result. P50/P95/P99 over a 7-day rolling window. Production only (dev mode excludes).

| Operation | P50 | P95 | P99 | Ceiling | Source |
|---|---|---|---|---|---|
| Sidebar chunk load (dynamic import) | 200ms | 500ms | 800ms | 1200ms | Network + parse |
| Library lite data load | 300ms | 800ms | 1500ms | 2500ms | Server action `loadProjectComponentLibraryLite` |
| Templates list load | 250ms | 700ms | 1200ms | 2000ms | Query `workspace-estimate-templates` |
| Reusable project sources list | 300ms | 800ms | 1500ms | 2500ms | Server action `listReusableProjectSources` |
| Project expand (load estimates) | 250ms | 700ms | 1200ms | 2000ms | `listReusableProjectEstimateSources` |
| Estimate expand (load outline) | 400ms | 1000ms | 1800ms | 3000ms | `getReusableEstimateOutline` |
| Reusable-source search | 400ms | 1200ms | 2500ms | 4000ms | `searchReusableProjectSources` (capped by PERF-1 ILIKE pre-filter) |
| Library search (client filter) | 50ms | 150ms | 300ms | 500ms | `useDeferredValue` + `searchComponents` |
| Component create (modal save) | 500ms | 1500ms | 3000ms | 5000ms | `createCostLibraryComponent` + image upload (excluded from budget) |
| Component edit save (Phase 1 Task 1.2) | 400ms | 1200ms | 2500ms | 4000ms | `updateCostLibraryComponent` |
| Component duplicate save (Phase 1 Task 1.3) | 500ms | 1500ms | 3000ms | 5000ms | `createCostLibraryComponent` |
| Component archive (Phase 1 Task 1.1) | 300ms | 900ms | 1800ms | 3000ms | `executeBulkArchiveLibraryComponents` |
| Component restore | 300ms | 900ms | 1800ms | 3000ms | `changeCostLibraryComponentLifecycleState` |
| Folder create | 250ms | 700ms | 1200ms | 2000ms | `createLibraryFolder` |
| Folder rename | 250ms | 700ms | 1200ms | 2000ms | `renameLibraryFolder` |
| Folder reorder | 300ms | 800ms | 1500ms | 2500ms | `reorderLibraryFolders` RPC |
| Template create from node | 600ms | 1800ms | 3500ms | 6000ms | Multi-statement insert + cascade |
| Template create from tab | 800ms | 2500ms | 5000ms | 8000ms | Multi-statement insert + cascade (larger) |
| Template rename | 250ms | 700ms | 1200ms | 2000ms | `renameEstimateTemplate` |
| Template delete | 300ms | 900ms | 1800ms | 3000ms | Cascade delete |
| Template insert into estimate | 500ms | 1500ms | 3000ms | 5000ms | RPC `insert_estimate_template_into_estimate` |
| Project source insert | 600ms | 1800ms | 3500ms | 6000ms | RPC `insert_estimate_subtree_into_estimate_with_history` |

## Render budget

| Interaction | Budget | Measurement |
|---|---|---|
| Search keystroke to painted filter | 100ms | `performance.mark` from `keydown` to next paint |
| Tab switch | 150ms | Click to first paint of new tab content |
| Tree expand/collapse | 50ms | Click to painted state change |
| Bulk-select toggle | 50ms | Click to dock visibility change |
| Modal open (Add Component / New Template) | 100ms | Click to modal painted |
| Preview panel update | 80ms | Row click to preview painted |

## Bundle size budget

| Asset | Budget | Measurement | Enforcement |
|---|---|---|---|
| Sidebar dynamic chunk (gzipped) | 60KB | `next build` output | CI check: `bun run build` + parse `.next/static/chunks/` |
| AddComponentModal nested chunk (gzipped) | 30KB | same | same |
| Shared `Tree` component (gzipped) | 15KB | same | same |
| Initial JS for `/workshop/projects/[id]/estimates/[nodeId]` route (gzipped) | 250KB | same | same |
| Per-route total (gzipped) | 350KB | same | same |

If a chunk exceeds budget, CI fails with a message naming the chunk and the delta. Eng must either reduce the chunk or document an exception in the PR description with Philip's approval.

## Network payload budget

| Payload | Budget | Source |
|---|---|---|
| Library lite dataset | 150KB JSON | `loadProjectComponentLibraryLite` |
| Templates list | 150KB JSON | `workspace-estimate-templates` |
| Reusable project sources (initial) | 50KB JSON | `listReusableProjectSources` |
| Project expand (estimates) | 30KB JSON | `listReusableProjectEstimateSources` |
| Estimate expand (outline) | 200KB JSON | `getReusableEstimateOutline` |
| Search response | 250KB JSON (ceiling, not target) | `searchReusableProjectSources` materialization caps |
| Image thumbnail | 5KB | Currently broken — see F-13 in doc 14 and Phase 3 Task 3.2 |

## Memory ceiling

| Metric | Ceiling | Measurement |
|---|---|---|
| Sidebar JS heap after load | 25MB | Chrome DevTools Memory snapshot |
| Sidebar JS heap after 5 min active use | 50MB | Same |
| Long-lived vnode count | 5000 | React DevTools Profiler |

## Scalability assumptions

| Dimension | Current ceiling | Tested at | Notes |
|---|---|---|---|
| Components per workspace | 10,000 (`LIBRARY_COMPONENT_CAP`) | Sidebar capped at 100 most-recent | Components page handles full dataset |
| Templates per workspace | 2,000 (`LIBRARY_TEMPLATE_CAP`) | Tested at 50 in doc 14 | Verify at 500 before public launch |
| Folders per workspace | N/S — gap | Unverified | Add to scalability test plan |
| Concurrent sidebar users per estimate | Bounded by Realtime channel capacity | Unverified | Out of scope; covered by collaboration infra |
| Reusable-source search project scan | 50 (`REUSABLE_SOURCE_SEARCH_PROJECT_SCAN_LIMIT`) | Static | Bound by static cap |
| Reusable-source search estimate scan | 200 (`ESTIMATE_SCAN_LIMIT`) | Static | Bound by static cap |
| Reusable-source search materialization | 25 estimates | Static | Bound by static cap |

## Monitoring

All budgets feed the dashboard described in [24-OBSERVABILITY-PLAN.md](./24-OBSERVABILITY-PLAN.md). Breach response:

| Breach | Response time | Action |
|---|---|---|
| Bundle size in CI | Immediate | Fail build |
| Payload size (server log) | 24h | Investigate; cap or paginate |
| P99 latency > ceiling for 1h | 1h | Investigate root cause; consider flag flip for the affected operation |
| Memory ceiling | 24h | Profile and remediate |

## Open dependencies

- Bundle-size CI check requires a small script: parse `.next/static/chunks/*.js` sizes after build, compare to budget table. Eng adds this to `scripts/` and to the `validate` script.
- Latency budgets require the telemetry events from [24-OBSERVABILITY-PLAN.md](./24-OBSERVABILITY-PLAN.md) to be wired first.
- Memory ceilings require a one-time manual capture (Chrome DevTools) per release — not automated.

## Revisiting budgets

- At each release milestone (Phase 1 ship, Phase 2 ship, public launch): review actuals vs budgets.
- Tighten budgets where actuals are well below (don't waste ceiling).
- Loosen budgets only with written justification and Philip's approval.
