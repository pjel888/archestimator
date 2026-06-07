# Effort And MVP Slicing

**Purpose:** Prevent the eight-phase plan from becoming a multi-week all-or-nothing refactor.

## Effort Estimate

| Phase | Effort | Parallelizable? | Notes |
| --- | ---: | --- | --- |
| 0 - baseline and safety | 0.5-1 day | Partly | Test inventory and measurement setup can run beside API contract review. |
| 1 - pure tree utilities | 1-1.5 days | Yes | Can be built/tested without touching live surfaces. |
| 2 - headless hooks/shells | 1-2 days | Partly | Depends on Phase 1 utilities. |
| 3 - share tree unification | 1-2 days | Partly | Depends on Phase 1-2 contracts; read-only surface. |
| 4 - library tree indexing | 1-2 days | Yes after Phase 1 | Avoid touching Add Component modal in same commit. |
| 5 - estimate tree extraction | 2-4 days | No | Shared editable behavior; one owner recommended. |
| 6 - estimate sheet decomposition | 4-7 days | Limited | Split by row table, activity, proposal, and command handlers only after tests. |
| 7 - Add Component modal decomposition | 3-5 days | Yes after Phase 0 | Can run after library tests are stable. |
| 8 - virtualization decision | 1-3 days | No | May be a no-op closeout if data does not justify it. |

## MVP Slice

The MVP is Phases 0-3:

- It creates reusable tree-core utilities and shell contracts.
- It proves the architecture on read-only share surfaces.
- It avoids editable estimate mutations, drag/drop, row revision guards, and data-corruption risk.
- It can be shipped independently.

Estimated effort: 3.5-6.5 focused days including tests and review.

## Full Plan Slice

The full plan includes Phases 0-8. It should not be run as one broad prompt. Future execution should split into:

1. MVP share-tree slice.
2. Library tree slice.
3. Estimate tree editable slice.
4. Estimate sheet content slice.
5. Add Component modal slice.
6. Measurement/virtualization decision slice.

## Done Definitions

| Scope | Done means |
| --- | --- |
| MVP | Phases 0-3 pass targeted tests, share tree visual smoke, `bun run type-check`, and design-system lint; no editable estimate behavior changed. |
| Full editable-tree plan | Estimate tree and sheet behavior pass existing and new regression tests; owner smoke confirms drag/drop, rename, delete, bulk delete, row edit, insert, and rollback behavior. |
| Performance plan | Baseline and post-change Profiler/bundle numbers are recorded. |
