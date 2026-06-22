# Rollout, Rollback, And Stop Conditions

## Rollout Shape

Closed-beta context supports a direct UI switch if focused tests pass. A feature flag is not required for v1 unless implementation touches shared provider/cache behavior beyond the sidebar view split.

Recommended rollout:

1. Add tab/item partition helper and tests.
2. Add Project tab branch using existing sidebar UI primitives.
3. Remove project-projected rows from Library tab.
4. Preserve Templates behavior and update overloaded copy.
5. Run focused test matrix.
6. Record evidence in this plan pack or current-state.

## Rollback

Rollback is simple if the change stays view-local:

- remove the `project` tab definition
- route all component rows back through the current Library/Components branch
- restore previous Templates filter copy if tests require it
- keep projection helper tests if they still describe current behavior

No database rollback should be needed.

## Stop Conditions

Stop implementation and reassess if any of these occur:

- The Project tab needs source-less manual rows but the current projection model cannot identify them safely.
- The split requires a new query/action/cache shape beyond filtering the existing lite dataset.
- Templates project-source behavior regresses.
- Project rows appear in Library under any view mode.
- Project tab needs destructive edit/delete semantics for estimate rows.
- Full validation failures appear outside known baseline and cannot be isolated to targeted tests.

## Default Decisions For Momentum

Use these defaults unless the owner changes direction:

- Label top tabs as `Library`, `Project`, `Templates`.
- Keep Project tab as projected project-owned rows only.
- Do not show source-less manual rows in Project tab v1 unless projection metadata exists.
- Do not allow Project tab delete/folder management v1.
- Reuse `loadProjectComponentLibraryLite(projectId)`.
- Do not add a feature flag.

## Evidence To Record After Implementation

Record:

- changed files
- focused tests run
- known skipped browser proof and why
- any unresolved product decisions
- whether Templates project sources still passed
- whether no database migration was needed

