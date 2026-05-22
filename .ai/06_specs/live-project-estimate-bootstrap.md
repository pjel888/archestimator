# Live Project + Estimate Bootstrap Spec

**Status:** Active implementation slice  
**Last updated:** 2026-05-20
**Routes:** `/workshop/projects`, `/workshop/projects/[projectId]`, `/workshop/projects/[projectId]/estimates`, `/workshop/projects/[projectId]/estimates/[nodeId]`

## Purpose

This feature turns the protected workshop from sample-only project cards into a live Supabase-backed project and estimate bootstrap flow.

The current goal is intentionally narrow:

1. authenticated user enters `/workshop/projects`;
2. app ensures a default workspace exists;
3. user creates a project;
4. user opens the project dashboard;
5. user creates a draft estimate;
6. app creates the first durable hierarchy nodes: lot → structure → level → area;
7. user lands in the estimate workspace route for the first area node.

## Implemented behavior

### `/workshop/projects/[projectId]/estimates/[nodeId]`

- Calls `getProjectEstimateTreeByNode(projectId, nodeId)`.
- Validates that the selected node belongs to an estimate under the requested project through a project-scoped Supabase join.
- If `nodeId` is not a node id, falls back to treating it as an estimate id via `getProjectEstimateTreeByEstimate(projectId, nodeId)` so empty estimates can still open.
- Returns `notFound()` only when the project/estimate relationship is invalid.
- Builds the estimate tree from live `estimate_nodes` and `estimate_row_items` records.
- Passes live tree data into `EstimateSheetTree` and `EstimateSheetContent`.
- Empty estimates render an empty tree/sheet state instead of redirecting back to the estimate list or 404ing.
- Keeps the existing component-library sidebar and local row-editing behavior as a temporary client-side interaction layer until the row mutation slice persists edits.

- `src/lib/estimates/actions.ts` now includes `insertEstimateRowItemFromLibrary()` for component-library inserts.
- The action validates project ownership, estimate ownership, and `kind = area` before insertion.
- Client insert remains optimistic for fast editing, then calls the server action and reconciles through the shared TanStack Query area-tree cache.
- Inserted row ids are UUIDs. The client generates UUIDs for optimistic insert rows, and the server action normalizes stale/non-UUID client row ids to server-generated UUIDs before inserting. Static UI library ids such as `lib-sofa` are persisted through `source_snapshot`, not the `source_library_item_id` UUID foreign key; database-backed UUID library rows use `link_state = linked-clean`, while static/manual/project rows use `unlinked`.
- Estimate area drop zones support both drag/drop library insertion and click/keyboard activation. Activating the drop zone appends an optimistic manual row whose component cell remains "Drag or add a component here" until a library component is dropped/replaced into that row.
- Replace, delete, and inline quantity/cost edits persist through project-scoped server actions. Discipline is component-library metadata, and designation is not editable on estimate row items in the current slice.
- Mutations validate row ownership through estimate/node/project joins before modifying Supabase.
- Client interactions remain optimistic; the live tree is hydrated into an `estimate/{id}/area-tree` TanStack Query cache, selected-node interaction state is held in scoped Zustand UI state keyed by estimate id, failed mutations call local rollback, and successful mutations invalidate the active tree query so the client can reconcile with server state instead of relying on route `initialData` only. Quantity and Misc Cost commits patch the area-tree cache immediately, persist through `updateEstimateRowItem()`, then reconcile from the Supabase-returned canonical row fields. Row mutation state remains internal and must not render row-level Saving/Saved/Unsaved pills in the estimate sheet.

## Current behavior

### `/workshop/projects`

- Protected by `src/proxy.ts`.
- Calls `listCurrentWorkspaceProjects()`.
- Reads only the authenticated profile's default workspace. Remote seed data is attached to Philip's profile UUID `4e23801d-6fc2-4886-b980-d15ca2b164b8`; another email should receive an empty default workspace unless it creates records.
- Shows `NewProjectForm`.
- Creates project through `createProject` server action.
- Project status is not part of the project data model; `projects.status` was removed and estimate status remains scoped to estimates only.
- Project details can be updated or deleted through the project details modal. Budget and project image URL are stored in project metadata until dedicated columns are introduced.
- Shows live Supabase project cards with `LiveProjectCard`.
- Shows sample references only when no live projects exist.

### `/workshop/projects/[projectId]`

- Calls `getCurrentWorkspaceProject(projectId)`.
- Shows live project code and source.
- Provides a compact `ButtonLink` action to `/workshop/projects/[projectId]/estimates`.
- Keeps sample fallback only for current reset-era sample routes.

### `/workshop/projects/[projectId]/estimates`

- Calls `listProjectEstimates(projectId)`.
- Shows `NewEstimateForm`.
- Creates estimates through `createEstimate(projectId, formData)`.
- Estimate creation inserts:
  - one `estimates` row;
  - Group Nodes for project scope, general requirements, site works, the project/building scope, and ground floor;
  - one `area` node named `Project-wide`.
- Redirects to `/workshop/projects/{projectId}/estimates/{areaNodeId}` after creation.
- Shows `EstimateListCard` for live estimates.
- If an estimate has no nodes, `EstimateListCard` links to `/workshop/projects/{projectId}/estimates/{estimateId}` so the empty estimate workspace opens.

## Data boundaries

- Screens do not call Supabase directly.
- Reads go through `src/lib/repositories/workspace-repository.ts`.
- Mutations go through server actions:
  - `src/lib/projects/actions.ts`
  - `src/lib/estimates/actions.ts`
- Estimate-tree editing is limited to hierarchy creation and navigation. The durable product hierarchy has two concepts: Group Nodes organize the tree and Area Nodes own rows. New organizing nodes use `kind: "group"`; existing `lot`, `general`, `structure`, and `level` storage values remain compatibility Group Nodes. Group Nodes may contain other Group Nodes and Area Nodes; Area Nodes are leaves for row ownership. Estimate-tree drag/drop reorganization, the project-scoped `moveEstimateNode` server action, and the `public.move_estimate_nodes` RPC have been removed from the active code/database path. The removed single-pointer `Move` modal/button must not be restored as-is; tree movement has no current UI path pending a replacement design.

## Shared UI primitives

Mandatory primitives used:

- `Button`
- `ButtonLink`
- `ControlInput`

No feature-local raw search input/button/icon-button pattern should be introduced for this flow. Any repeated action link should reuse `ButtonLink` or extend it.

## Typography and density

This is app/workshop UI, not landing-page UI.

- Strong titles: max `text-[12px]`.
- Body/control text: around `text-[10px]`.
- Eyebrows/meta: `text-[8px]` to `text-[9px]`.
- Buttons/links styled as buttons: forced `!text-[10px] !font-bold` through shared primitives.

## Tests and gates

Current coverage:

- `tests/vitest/project-creation-ui.test.ts`
  - verifies project creation UI uses shared primitives.
  - verifies live project card wiring.
- Estimate bootstrap tests should verify `NewEstimateForm`, `EstimateListCard`, and `ButtonLink` primitive usage.
- `tests/vitest/live-estimate-node-route.test.ts`
  - verifies the node route loads project-scoped live Supabase tree data.
  - verifies live tree nodes are passed into the tree/content components.
  - verifies repository ownership checks use the project-scoped estimate join.

Required gates after edits:

- `bun run validate`
- `bun run build`
- `bun run test:e2e`
- `git diff --check`

## Known limitations

- Hosted Supabase redirect URLs still require Dashboard verification.
- Estimate detail route now reads live Supabase tree/rows with project-scoped node validation; node selection updates immediately through scoped Zustand UI state while route navigation reconciles in the background; Group Nodes can nest under other Group Nodes while Area Nodes remain row-owning leaves; row CRUD and inline edits persist through project-scoped server actions with optimistic local/cache updates, internal dirty/saving/saved/failed mutation state, rollback on failure, and canonical row patch reconciliation after success. Visible row save-state pills are intentionally absent so editing behaves like a stable spreadsheet.
- Estimate totals, proposal exports, recent activity, and estimate row CRUD UI are not in this slice.

## Next slice

Implement row creation affordances for adding new blank/manual rows, then add proposal totals/export coverage once the row mutation UX is stable.
