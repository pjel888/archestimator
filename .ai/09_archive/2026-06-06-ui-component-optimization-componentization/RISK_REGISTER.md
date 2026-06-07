# Risk Register

| ID | Risk | Phase | Likelihood | Impact | Mitigation | Contingency |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | `EstimateSheetContent` decomposition breaks optimistic row updates or rollback. | 6 | Medium | Critical | Add regression tests around scalar edits, insertion, rollback, and row revision before extraction. | Revert Phase 6 commit; keep extracted helpers private or delete them. |
| R2 | React Complex Tree state desyncs after hook extraction in `EstimateSheetTree`. | 5 | Medium | High | Preserve RCT controlled environment wiring; extract pure tree model first. | Stop at pure helpers; leave RCT state inline. |
| R3 | Tree-core adapter pattern does not fit share snapshot shape. | 3 | Low | Medium | Prototype against fixed share snapshot fixtures before live wiring. | Keep a share-specific adapter; do not force genericity. |
| R4 | Virtualization decision blocks indefinitely. | 8 | High | Medium | Use `MEASUREMENT_BASELINE.md` row thresholds and set a decision deadline. | Close Phase 8 as "not justified"; keep recursive/flattened rendering. |
| R5 | Concurrent branch conflicts with notification, Terms, or beta work. | All | Medium | Medium | Start future work from fresh branch, fetch/prune, check `git worktree list`, and keep phases separate commits. | Rebase or pause phase; never overwrite unrelated dirty files. |
| R6 | Design-system drift from new shells or rows. | 2-7 | Medium | High | Use existing primitives, Phosphor icons, SF Pro sizing, xs radius, and `bun run lint:design-system`. | Revert shell styling and restore existing row renderers. |
| R7 | Missing aspirational tests give false readiness. | 1-8 | High | High | Treat only existing tests as validation until new tests are written and passing. | Do not advance phase; create tests first. |
| R8 | Scope creep turns a tree extraction into a new component library. | All | High | High | Keep MVP to Phases 0-3; owner approval before broad editable-tree work. | Split later work into separate implementation packs. |
| R9 | Multiple agents edit shared files simultaneously. | 5-7 | Medium | High | Use scoped branches and one owner per shared source file. | Stop, reconcile manually, and rerun impacted tests. |
| R10 | Estimate editing regression corrupts user data. | 5-6 | Low | Critical | Test optimistic mutation, rollback, rename, delete, DnD, insertion, and revision guards. | Revert phase; do not ship partial editable-tree refactor. |
| R11 | React.memo or dynamic-import choices conflict with route-transition plan. | 2, 6, 8 | Medium | High | Defer to route-transition docs 14 and 19; record cross-plan decision in `CROSS_PLAN_REFERENCES.md`. | Remove conflicting memo/dynamic imports. |
| R12 | Measurement fixture is too small to support performance conclusions. | 0, 8 | High | Medium | Record seed limits and require realistic benchmark fixture before performance claims. | Treat phase as structural-only; no performance claim. |
| R13 | New tree-core contracts leak domain data into UI primitives. | 1-3 | Medium | Medium | Keep adapters generic and domain mapping at surface boundary. | Split domain adapter from generic utility package. |
| R14 | Visual regression in compact tree rows. | 2-7 | Medium | Medium | Capture screenshots and inspect labels, icons, hover, keyboard focus, empty states. | Revert row shell; keep logic extraction only. |
| R15 | New dependency for virtualization increases maintenance burden. | 8 | Low | High | Owner approval required; compare native flattening, CSS containment, IntersectionObserver, and TanStack Virtual. | Do not add dependency; keep measured non-virtual path. |

## Highest-Risk Decision Gates

1. `WorkshopTree` has `HIGH` GitNexus risk despite modest line count.
2. `EstimateSheetContent` owns optimistic estimate-sheet behavior and has partial GitNexus traversal evidence.
3. Virtualization has no current Archestimator row-count proof.
