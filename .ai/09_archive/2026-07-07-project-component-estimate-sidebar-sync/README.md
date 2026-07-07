# Project Component Estimate Sidebar Sync

Date: 2026-07-07
Owner: Codex
Status: implemented and archived

## Goal

Make project-level components feel like one live object across the estimate sheet and the right sidebar Project tab:

- Row-level project components created in the sheet appear in the Project tab without a refresh.
- CRUD edits in the sheet update the matching Project tab item immediately.
- Deleting or promoting a project component removes or reclassifies the sidebar projection immediately.
- Dragging a Project tab component into a valid estimate tree/sheet target creates another estimate-row instance of the same project-level component.
- The shared connection stays fast: optimistic UI first, bounded active refetch second, no full-page refresh.

## Current Working Theory

The Project tab rows are projected from `estimate_row_items` into the component-library sidebar dataset. Estimate-row mutations update the sheet tree cache, but the sidebar's lite component-library query is only marked stale for some paths and is not actively updated while open. That leaves the Project tab with old row material/name until a remount or refresh.

## Deliverables

- Component identity/action matrix in `02_COMPONENT_IDENTITY_ACTION_MATRIX.md`.
- Implementation notes and loop ledger in `LOOP_LEDGER.md`.
- Focused tests covering:
  - row rename/update reflects in the sidebar Project tab cache,
  - row deletion removes the projected Project tab item,
  - Project tab component drag/drop or add uses the normal insert row action with the same project row identity metadata.

## Validation Plan

- Targeted Vitest around row mutations/cache and component library UI.
- Focused source checks for drag payload compatibility.
- `bun run doctor -- --verbose --scope changed` after React edits, unless the local doctor surface is blocked by existing repo state.
- Browser smoke on the active estimate route if the local app/browser tool path is usable.

## Implementation Result

- Estimate-row mutation code now patches active Project tab projection caches optimistically for scalar row edits and removes projected rows immediately for delete/replace/promote paths.
- Project projection queries now actively refetch only scoped project lite/rows caches as reconciliation rather than as the user-visible update path.
- Estimate tree rows accept normal library-item drag payloads, including Project-tab project components, and dispatch the shared insert event with the hovered tree node as the target.
- Second-pass review removed duplicate handler-level projection refetches, narrowed optimistic cache patching to exact project keys, and added rollback plus target-node consumer tests.
