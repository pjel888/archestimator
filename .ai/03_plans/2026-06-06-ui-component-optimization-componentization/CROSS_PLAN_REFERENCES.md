# Cross-Plan References

**Primary related plan:** `.ai/03_plans/route-transition-performance-optimization/`
**Coordination requirement:** Any route-level performance, memoization, code-splitting, Suspense, or bundle work must reconcile with that plan before implementation.

## Conflict And Coordination Map

| Overlap | UI component plan posture | Route-transition plan authority | Risk | Deconfliction rule |
| --- | --- | --- | --- | --- |
| React.memo | Use only for stable row/shell boundaries after profiling. | `19-react-memo-strategy.md` records current memo absence and strategic target areas. | High | UI implementation must defer to doc 19 and record why each memo boundary is justified. |
| `next/dynamic` | Possible later split for modals/heavy islands. | `14-code-splitting-named-exports.md` defines named-export pattern and target map. | High | Any dynamic import in UI phases must use the route-transition named-export pattern. |
| Bundle optimization | Future heavy component splitting may reduce route chunk pressure. | `CURRENT_CANONICAL_PLAN.md` and route bundle docs own route-level targets. | Medium | UI plan may propose extraction; route plan owns route chunk acceptance. |
| Suspense boundaries | May be needed around dynamic modal/tree islands. | Route-transition error/Suspense strategy owns user-visible loading behavior. | Medium | Do not add new loading UX without route-plan alignment. |
| Measurement | Tree interactions need Profiler/row counts. | Route transitions need route benchmark protocol and bfcache/Speed evidence. | Medium | Record tree interaction metrics here; route timings in route-transition artifacts. |
| Virtual rows | Deferred until `> 500` visible rows and Profiler proof. | Route plan mentions memo first and virtualization only after measurement. | Low | No virtualization dependency until both plans agree and owner approves. |

## Route-Transition Documents To Read

1. `.ai/03_plans/route-transition-performance-optimization/CURRENT_CANONICAL_PLAN.md`
2. `.ai/03_plans/route-transition-performance-optimization/14-code-splitting-named-exports.md`
3. `.ai/03_plans/route-transition-performance-optimization/19-react-memo-strategy.md`
4. `.ai/03_plans/route-transition-performance-optimization/BENCHMARK_PROTOCOL.md`

## Decisions

- This UI plan owns tree-core contracts and component seams.
- The route-transition plan owns route-level performance targets and code-splitting conventions.
- If both plans propose a change to `EstimateSheetContent.tsx` or `EstimateWorkspaceClient.tsx`, the future implementer must split the work by concern and commit separately.
- Do not combine tree-core extraction with route dynamic import changes in one commit.
