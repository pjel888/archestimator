# State Inventory And Shadow Paths

## Purpose

This file is the canonical state inventory for the July 6, 2026 plan revision. It prevents the plan from treating `EstimateSheetTree` as only a reorder widget. Future implementation should keep this inventory open while changing the tree, because reorder, context-menu actions, inline editing, optimistic creation, delete/restore, external drops, query state, and permissions all share the same component state surface.

## Source Hierarchy

1. Current repository source and tests are the highest authority.
2. Active Cloudflare D1 code and `wrangler.jsonc` bindings are the provider authority.
3. Official React, Next.js, Cloudflare, and WAI-ARIA docs are supporting constraints for future implementation.
4. This plan is an execution guide, not proof that a code change has landed.

## Evidence Classes

| Class | Meaning | Examples |
| --- | --- | --- |
| Proven current behavior | Source or an existing test directly shows the behavior. | Context menu state, rename rollback, delete undo UI, D1 reorder payload omission. |
| Current coverage | Existing tests cover the behavior enough to preserve it. | Context-menu CRUD basics, rename lifecycle, delete optimistic rollback, bulk delete/restore success, pointer DnD optimistic rollback. |
| Expected RED | Source shows the target is not implemented yet. | Move dialog before/after/root placement, disabled radio reason reachability, handle-only drag activation. |
| Provider-unproven | UI/action tests exist, but active D1/provider behavior is not proven or currently throws. | Node/row restore calls in `d1-action-client.ts:2014-2019`. |
| Planned proof | No current implementation claim; future tests must prove it. | Permission-gated tree controls, remote D1 proof, browser geometry proof if visual geometry changes. |

## Current State Inventory

| ID | State surface | Current behavior | Current coverage | Residual gap |
| --- | --- | --- | --- | --- |
| SRC-STATE-001 | Context menu | Right-click and keyboard menu are first-class state via `contextMenuNode` and `contextMenuOpen`; actions are Add area, Save as template, Rename, Move, Delete. | `estimate-tree-context-menu.test.tsx` covers pointer open, F2, Shift+F10, CRUD basics, template event, portaled menu, and primary click preservation. | Disabled reasons mostly flow through `title`; make reasons reliably keyboard/screen-reader reachable. |
| SRC-STATE-002 | Inline rename | Rename has draft, error, save, cancel, empty-name validation, optimistic rollback, and focus handoff. | Context-menu rename tests cover focus, cancel, check, blur, empty-name validation, failure rollback. | Rename controls suppress visible focus outlines; preserve route/focus and improve visible focus. |
| SRC-STATE-003 | Optimistic create | Add Area inserts optimistic "New Area", selects it, opens rename, tracks optimistic-to-server id resolution. | Existing DnD and create-empty-tree coverage exercises optimistic add path. | Drops touching optimistic IDs are blocked but need explicit reason/status tests. |
| SRC-STATE-004 | Single delete | Delete modal removes optimistically, repairs route/selection, rolls back on failure, and shows Undo on success. | Context-menu delete tests cover modal, optimistic delete, route repair, undo success, and delete failure rollback. | Restore failure after an Undo click is not covered. |
| SRC-STATE-005 | Bulk delete | Bulk toolbar selects descendants, dedupes root selections, deletes optimistically, clears selection, and repairs route. | Bulk-selection tests cover selection, indeterminate parent, optimistic delete, success restore, and dedupe. | Bulk restore failure path is not covered. |
| SRC-STATE-006 | Restore/undo | UI/action wrapper calls `restoreDeletedEstimateNodes` and passes `target_project_id`; active D1 adapter currently throws for node/row restore. | Action-wrapper tests assert restore payload shape; DOM tests cover successful mocked restore. | Treat restore as UI/action-tested but provider-unproven until a D1 adapter/provider test proves success or the plan intentionally removes restore. |
| SRC-STATE-007 | Move dialog | Keyboard Move dialog is containment-only: destination node id plus `position: "inside"`. | Context-menu test covers inside move. | Before/after/root placement is a deliberate scope expansion; disabled native radios skip invalid reasons. |
| SRC-STATE-008 | Pointer DnD | Shared `Tree` maps row bands to before/inside/after; estimate tree enables inside on leaves and bottom root drop zone. | DnD/DOM tests cover optimistic success, rollback, stale completion, row-edit preservation, root top/bottom, and shared tree mechanics. | Handle-only activation and clearer invalid/inside feedback are not current behavior. |
| SRC-STATE-009 | Search/filter | Search and Hide empty areas compose before UI-tree build; active search expands matches and blocks drag/drop. | Filter tests cover toolbar and pruning. | Empty search/filter results reuse "No areas yet" copy; reorder-disabled reason needs DOM coverage. |
| SRC-STATE-010 | Active tab/navigation | Tree query switches between legacy area tree and active tab tree; selection uses shallow `history.replaceState`. | DnD tests cover no route refresh, stale prop protection, and tab-scoped action payloads in related cases. | Preserve active-tab scoping in every new reorder/move/delete/restore test. |
| SRC-STATE-011 | Lazy subtree loading | Row suffixes show Loading/Load failed; failures toast. | Lazy hydration tests exist. | Drops during subtree loading need an explicit non-regression decision: block, allow only loaded branch, or show reason. |
| SRC-STATE-012 | External drops | Template, project source, and row-item MIME drops are accepted only for inside placement and dispatch domain events. | DOM tests cover template and template-node drops; source confirms project/row events. | Keep external drops as inside-only unless a separate plan expands them; avoid confusing them with reorder placement parity. |
| SRC-STATE-013 | Read-only/permissions | Parent content has `canEditEstimate`; `EstimateSheetTree` itself has no permission prop and exposes mutating controls locally. | Server action authz tests exist. | Add UI permission-gating requirement or explicitly accept server-only gating for first users. |
| SRC-STATE-014 | Status/toast/live region | `reorderStatus` is reused for create/rename/delete/reorder; saving/saved are sr-only; errors go through toast. | DnD tests cover success/error text in parts. | Do not claim errors are announced by the same live region; add visible compact status and explicit aria-live tests. |

## Shadow Path Matrix

| Path | Steps | Must preserve | Evidence target |
| --- | --- | --- | --- |
| Reorder hotfix | Drag any node before/inside/after another node | RPC payload includes `target_project_id`; no workspace-resolution error; history event is scoped | Action-wrapper payload test plus real D1 adapter/provider proof |
| Branch move | Move non-empty branch before sibling, after sibling, inside another branch, and back to root | Descendants stay attached; readback order uses `sort_order ASC, id ASC` | Planner, DOM DnD, repository/action readback tests |
| Keyboard move | Open context menu with Shift+F10, choose Move | Before/inside/after/root options; invalid options focusable with reasons | Context-menu dialog tests |
| Rename while navigating | Start rename, type, blur/check/escape/fail | Route/selection stable; focus visible; rollback keeps draft/error | Existing context-menu tests plus focus-outline test |
| Create then reorder | Add Area creates optimistic node, then user attempts drag/drop | Optimistic ids never reach server; reason shown | DnD/context-menu disabled reason test |
| Single delete undo | Delete node, route repairs, click Undo | UI restores mocked success; D1 restore provider behavior is separately proven or blocked | Context-menu restore success plus D1 adapter restore decision |
| Bulk delete undo | Select parent/child mix, bulk delete, click Undo | Deduped roots, selection restoration, route repair | Bulk-selection success plus restore-failure tests |
| Search/filter | Search or hide empty areas, then try drag or Move | Reorder disabled with explanation; empty-results copy is not "No areas yet" | Filter/context-menu tests |
| Lazy load | Expand unloaded branch and reorder around it | Loading/failure status remains stable; drop behavior is explicitly defined | Lazy hydration plus DnD non-regression test |
| External drops | Drop template/project source/row item into tree | Domain insert/move events still fire inside-only; reorder parity changes do not alter them | Existing DOM tests plus source-only review for project/row events |
| Permission boundary | Viewer opens tree | Mutating controls are disabled/hidden or server-only gating is documented as accepted | UI permission test or explicit product decision |
| Provider proof | Run local D1 and optional remote D1 proof | Local proof is not called hosted proof; remote proof uses bound `ARCH_DB` only | Wrangler/Miniflare command transcript in implementation closeout |

## Plan Accuracy Corrections

- The plan must not say context-menu, rename, delete, bulk delete, or optimistic rollback are broadly untested. They have meaningful existing coverage; new tests should target the precise gaps above.
- The plan must not say undo is generally absent. Delete and bulk delete already have Undo UI/action paths; reorder undo is absent, and D1 restore provider support is currently unproven/throwing.
- The plan must not claim the Move dialog has parity today. It is an inside-only containment dialog.
- The plan must not claim disabled reasons are accessible today. Menu item reasons are mostly title-only, and Move dialog disabled radios are skipped by keyboard.
- The plan must not claim the `aria-live` region reports all errors today. Current error reporting primarily uses toast.
- The plan must not claim mocked action tests prove D1 history persistence. Payload tests and D1 adapter/provider tests are separate evidence classes.
