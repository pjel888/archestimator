# Target UX And Product Spec

## Product Intent

The estimate tree is an organizing tool for work breakdown. Moving a branch is high consequence because it changes estimate structure, row context, totals, and proposal organization. The interaction must feel precise, reversible, and understandable.

**Phase 0 note (added 2026-07-06):** Phase 0 is a backend-only fix and does not change UX. It removes the workspace-resolution error so the existing UX actually works. Every interaction described below assumes Phase 0 has landed.

## Pointer Interaction

- EstimateSheetTree uses handle-only pointer drag activation. The grip starts drag; the row body keeps click, context-menu, selection, and keyboard focus behavior.
- The shared `Tree` exposes this as an opt-in activation mode so existing row-drag consumers keep default behavior.
- Before, inside, and after are visually different:
  - Before/after: insertion line between rows.
  - Inside: contained target treatment plus compact label such as "Move inside".
  - Invalid: no insertion line; optional reason after hover dwell.
- Root top and root bottom placements are discoverable. Today only bottom root edge is configured by the estimate tree.
- Search, rename, save, and optimistic-create disabled states explain why dragging is unavailable.

## Keyboard Interaction

- Context menu keeps "Move..." but the dialog becomes a placement dialog, not only a containment dialog.
- Destination selection supports:
  - Before selected destination.
  - Inside selected destination.
  - After selected destination.
  - Root top.
  - Root bottom.
- Invalid placements remain visible with focusable, `aria-disabled` option rows and a reachable reason.
- Focus returns to the moved branch, or to the original branch after error rollback.

## Move Dialog Target Model

Use this shape for state and tests:

```ts
type EstimateTreeMoveSelection =
  | { kind: "node"; targetNodeId: string; position: "before" | "inside" | "after" }
  | { kind: "root"; edge: "top" | "bottom" };
```

Root mapping:

- `root/top` resolves to `{ targetNodeId: firstRootId, position: "before" }` after excluding no-op placement for the source.
- `root/bottom` resolves to `{ targetNodeId: lastRootId, position: "after" }` after excluding no-op placement for the source.
- If the source is already the only possible root placement, keep the option visible and disabled with a no-op reason.

Rendering:

- Use focusable option rows with `role="radio"`, `aria-checked`, and `aria-disabled`; do not use native disabled radios for invalid options because keyboard users need to reach the reason text.

## Status And Recovery

- Saving and saved status remains announced through an `aria-live` region.
- Add a compact visible tree-rail status for sighted users, aligned with component-library tree behavior.
- Error keeps toast/live alert behavior and rolls back optimistic state.
- Delete and bulk delete already have Undo restore UI. Reorder undo/time-limited rollback remains a separate UX-012 ambition. Active D1 restore support is provider-unproven today, so the implementation must either prove restore on D1 or explicitly keep Undo as mocked/local-only evidence until fixed.

**Recovery from workspace-resolution error (post-Phase-0):** this error must never fire. If it does, the production-fire recovery play in `14_ROLLOUT_ROLLBACK_AND_OBSERVABILITY.md` kicks in. Users should never see "Estimate history event workspace could not be resolved." in production after Phase 0 ships.

## Visual Constraints

- Follow app/workshop density from `DESIGN.md`: neutral colors, compact SF Pro, 12px maximum app text, visible focus, no color-only state.
- Avoid ornamental redesign. This is a dense work surface.
- Active route, keyboard focus, drag source, and drop target must not share the same visual cue.

## State Matrix (added 2026-07-06)

| State | Visual | Live region | Disabled reason |
| --- | --- | --- | --- |
| Idle | Drag handle visible on hover/focus; active route distinct from focus | silent | n/a |
| Dragging source | Source row marked | "Moving <name>" announcement | n/a |
| Valid drop target (before) | Insertion line above | silent | n/a |
| Valid drop target (after) | Insertion line below | silent | n/a |
| Valid drop target (inside) | Contained target treatment | silent | n/a |
| Invalid drop target | No insertion line | optional reason on hover dwell | visible on hover dwell |
| Saving | Compact visible status | "Saving tree order" via aria-live | drag disabled |
| Saved | Brief non-disruptive status | "Tree order saved" via aria-live | n/a |
| Error | Rollback + toast | alert | focus returns to source |
| Search active | Search field highlighted | silent | "Clear tree search before moving areas." |
| Inline rename active | Rename input visible | silent | "Finish renaming before moving areas." |
| Optimistic create in flight | Saving indicator | silent | "Wait for this new area to finish saving first." |
| Subtree loading | "Loading..." suffix on node | polite | n/a |
| Subtree load failed | "Load failed" suffix on node | polite | n/a |
| Context menu open | Row action rail remains stable; menu is portaled | silent | disabled items expose reason beyond title |
| Rename saving | Input and confirm controls show busy/focus state | "Saving..." or status text | drag/move/delete disabled with reason |
| Delete pending | Modal action busy; row removal optimistic after confirm | status/toast | other mutations disabled |
| Bulk selection active | Dock toolbar visible; selected/indeterminate rows clear | silent | Delete disabled while saving or no deletable root |
| Restore Undo pending | Toast action or fallback UI | alert/status on failure | provider support must be proven |
| Search/filter empty | Empty-result copy distinguishes no matches from true empty | silent | clear search/filter affordance |
| Active tab switch | Tree content scoped to active tab | silent | pending mutations keep tab target |
| External drop hover | Inside-only affordance for template/project/row item | optional status | before/after/root not offered unless separately designed |
| Read-only/viewer | Mutating controls disabled/hidden if permission prop is added | silent | server-only enforcement must be explicit if UI remains ungated |

See `20_STATE_INVENTORY_AND_SHADOW_PATHS.md` for the canonical state inventory and shadow paths.
