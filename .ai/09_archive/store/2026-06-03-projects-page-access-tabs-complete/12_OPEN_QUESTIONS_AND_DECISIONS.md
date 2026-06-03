# 12 Open Questions and Decisions

## Decisions made

| Decision | Outcome | Evidence / reasoning |
|---|---|---|
| Number of tabs | Exactly two: `Your Projects` and `Projects shared to you`. | Direct user requirement. Current `All / Owned / Shared` filter is not aligned. |
| Owned grouping | `item.accessKind === "owned"`. | Existing resolver and client type already expose access kind. |
| Shared grouping | `item.accessKind !== "owned"`, including `project-member`, `sheet-member`, and `pending-invite`. | Existing card/data model treats all non-owned access as shared/invited access. |
| Data source | Reuse `listCurrentWorkspaceProjects()`. | It already returns owned workspace projects, project memberships, sheet memberships, and pending invites. |
| Tab placement | Use `WorkshopCollectionLayout.toolbarPanel`. | Existing layout renders `toolbarPanel` above scroll content, which fits primary page tabs better than current inline filter. |
| Default active tab | `Your Projects` when owned projects exist; `Projects shared to you` when owned count is zero and shared count is greater than zero. | Prevents shared-only invited users from landing on a blank owned view. |
| Search behavior | Search filters active tab only and is preserved when switching tabs. | Avoids hidden cross-tab result mixing while enabling users to check both contexts with one query. |
| Empty shared tab action | No Create Project action in shared empty state. | Creating a project does not solve “no projects shared to you.” |
| Favorites in shared tab | Suppress favorite controls for non-owned cards in this task unless a separate shared-favorites data model is explicitly approved. | Current `setProjectFavorite()` is current-workspace-bound and will reject externally owned shared projects. |
| Database migration | None. | Tabs are a client categorization of existing server-returned data. |
| Feature flag | None. | Small, reversible UI change with no dependency/migration. |

## Open questions

No implementation-blocking open questions remain based on current repo evidence.

## Non-blocking product follow-ups

| Question | Why it is not blocking |
|---|---|
| Should there eventually be an `All projects` aggregate view? | User specifically requested two tabs. Add only after feedback. |
| Should users be able to favorite projects shared to them? | Existing schema/action do not safely support it. This is a separate data-model decision. |
| Should pending invites be a third tab or badge? | Current product request says shared projects through invitations; pending invites fit the shared tab for now. |
| Should tab state persist across visits? | Not necessary for MVP; current smart default handles shared-only users. |
| Should counts include expired pending invites? | Recommended yes if the card is visible; implementation can count visible records. Expired invite display already exists. |

## Assumptions

| Assumption | Implementation handling |
|---|---|
| `pending-invite` belongs under `Projects shared to you`. | Implement as shared now; easy to split later if product asks. |
| Current `ProjectListItem.accessKind` is the source of truth for grouping. | Do not rederive from workspace IDs on the client. |
| Favorite suppression for shared cards is acceptable. | Documented bug plan; if Philip wants shared favorites now, stop and create a data/security migration plan. |
| No route query param for active tab. | Keep local state; add URL state only if deep-linking becomes a product requirement. |

## Items that require human confirmation later

Only one future product decision needs Philip if it is brought into scope:

**Shared project favorites:** Should collaborators be able to favorite projects shared to them? If yes, define whether the favorite belongs to the viewer user only, the viewer's workspace, or the owner workspace, and update schema/RLS/action/query semantics accordingly.

This decision does not block the requested tabs. The safe behavior is to hide non-owned favorite controls now.

## Refinement-era decisions (2026-06-03)

| Decision | Outcome | Evidence |
|---|---|---|
| Bulk delete selection scoping | Single `selectedProjectIds` Set persists globally across tab switches. `selectedVisibleProjectIds` scoped to active tab for BulkActionToolbar display. `openProjectDeletePreview()` uses full `projectItems` (not `displayProjects`) to authorize deletion of all selected projects. | Current code already uses `selectedProjectIds` Set and `selectedVisibleProjectIds` derived from `displayProjects`. After tab filtering, `displayProjects` becomes active-tab only, so visible selections naturally scope to active tab. Delete preview must use `projectItems` for full authorization. |
| "Select all visible" behavior | Selects only active-tab visible eligible projects (via `selectableDisplayProjectIds` which is tab-scoped). | Existing behavior, correct after tab filtering. |
| "Clear selection" behavior | Clears ALL selections across both tabs (resets `selectedProjectIds` Set). | Existing behavior, correct. |
| Plan folder naming | All references use `2026-06-03-projects-page-access-tabs-plan` (with `-plan` suffix). | Stale refs without `-plan` were fixed during refinement. |
