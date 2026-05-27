# Teamspace Collaboration Header Design

Date: 2026-05-26
Project: Archestimator
Status: Approved direction from visual selection: project-scoped sharing with estimate-sheet inheritance, followed by sheet-level overrides.

## Decision

Build the collaboration surface in two compatible layers:

1. Project-scoped sharing is the base authority model. A project has collaborators and roles; estimate sheets inherit the project role by default.
2. Estimate-sheet access is the override layer. A sheet can narrow or adjust access for specific collaborators without changing the project membership.

This keeps the first implementation understandable while supporting the requested per-sheet access path.

## Design Direction

Archestimator is a dense contractor workspace, not a social app. The collaboration UI should feel like a compact operations control: quiet, precise, and always subordinate to the estimate sheet.

- Tone: restrained, secure, work-focused.
- Layout: add a right-aligned collaboration cluster to the existing project workspace header row.
- Typography: use the current app scale, with 8-12px SF Pro text and no negative letter spacing.
- Color: neutral white/gray surfaces with small status accents only for roles or live presence.
- Motion: modal open/close only; live cursors should move smoothly but be throttled.
- Signature differentiator: a compact "Teamspaces | avatars | settings" rail that exposes collaboration without changing the estimate geometry.

## UI Architecture

Use the existing `ProjectWorkspaceHeaderRow` as the seam. Add a right-side header slot as a sibling of both existing header regions:

- Preserve `ProjectWorkspaceProjectCode` and its absolute left width.
- Preserve `EstimateCenterColumnBoundary` and the estimate metadata strip.
- Render the collaboration cluster in the right reserved area of the header row, not inside the center-column boundary.

The cluster contains:

- `Teamspaces` label.
- Thin divider.
- Avatar stack of project collaborators.
- Settings icon button.

The settings icon opens a modal with:

- Project access summary.
- Estimate sheet access summary.
- Role list with Owner, Admin, Editor, Viewer labels.
- Share-page section showing the current route/page scope.
- Realtime status section explaining active collaborators and cursor visibility.

Initial implementation renders real collaborator summaries from repository data and keeps invite controls out of scope until invitation delivery is implemented. The modal is shaped like the real feature and does not use marketing copy.

## Data Model

Keep `workspace_members` as the accepted workspace membership table.

Add or plan these collaboration tables:

- `profiles.avatar_url`: durable profile picture source.
- `project_members`: project-scoped collaboration roles.
- `estimate_sheet_members`: optional sheet-level overrides keyed to estimates.
- `workspace_invitations` or `project_invitations`: invitation lifecycle records.

Recommended roles:

- `owner`: manages access and destructive actions.
- `admin`: manages access and most project settings.
- `editor`: edits estimates and library-linked project data.
- `viewer`: reads project and estimate data without mutation rights.

For v1, project members inherit workspace members where needed, but project membership becomes the primary route authorization for project sharing. Sheet members inherit project access unless an override exists.

## RLS And Authorization

Split current broad workspace-member write policies into capability-specific helpers:

- `is_workspace_member(workspace_id)` for read membership.
- `is_workspace_editor(workspace_id)` for workspace write access.
- `can_access_project(project_id)` for project read access.
- `can_edit_project(project_id)` for project write access.
- `can_access_estimate(estimate_id)` for inherited or sheet-specific read access.
- `can_edit_estimate(estimate_id)` for inherited or sheet-specific write access.

Viewers must not get write access. Role logic must live in database helpers and RLS policies, not mutable client state or user metadata.

## Realtime Architecture

Use private Supabase Realtime channels:

- `project:<project_id>` for project-level presence.
- `estimate:<estimate_id>` for sheet-level presence and cursors.

Presence is for slow-changing online state:

- user id
- display name
- avatar url
- active route
- active estimate id
- focused row/cell on estimate sheet routes

Broadcast is for high-frequency cursor and selection messages:

- cursor x/y or sheet-relative coordinates
- active cell/row selection
- timestamp

Do not call Presence `track()` on every pointer move. Cursor movement should be throttled Broadcast messages. Realtime channel authorization should use RLS on `realtime.messages` and private channel configuration.

## Data Flow

Server route layout fetches project collaboration facts with the project:

1. Resolve current user and workspace.
2. Resolve project and role.
3. Fetch project collaborators and sheet override summaries.
4. Pass serializable collaborator data into the client header component.

Client header behavior:

1. Render the avatar stack from server data.
2. Open the modal locally.
3. Subscribe to Realtime presence only when the route is a project or estimate route and the user is authenticated.
4. Add live users to the avatar stack visually, without trusting presence for authorization.

## Error Handling

- If collaboration fetch fails, keep the estimate workspace usable and show a compact "Teamspaces unavailable" state in the modal.
- If Realtime fails to subscribe, keep durable access management visible and show live presence as offline/unavailable.
- If a user lacks access, server route authorization should block before rendering private project data.
- If an invite or role update fails in the role-management phase, keep the modal open and show row-level failure text.

## Testing Strategy

TDD-first tests before production changes:

- Header structure test: right-side collaboration slot is a sibling of the center metadata boundary.
- UI test: `Teamspaces`, avatar stack, and settings icon render without changing the project-code component.
- Modal test: settings icon opens a modal with project access, estimate sheet access, roles, sharing, and realtime/cursor sections.
- Schema test: project and estimate-sheet collaboration migrations include RLS and role helpers.
- Policy test: viewer read access is distinct from editor write access.
- Realtime design test: source contains private-channel naming and uses Presence for online state plus Broadcast for cursors.

## Implementation Phases

Phase 1: Header and read-only modal

- Add static/server-fed collaborator summary.
- Add avatar stack and settings modal.
- Preserve layout geometry.

Phase 2: Durable collaboration model

- Add avatar URL and collaboration membership tables.
- Split RLS helpers so viewer/editor access is enforced.
- Expose repository reads for project members and sheet overrides.

Phase 3: Realtime collaboration

- Add private Realtime authorization policies.
- Add presence avatar updates.
- Add throttled cursor Broadcast on estimate sheets.

Phase 4: Invite and role management

- Add invite lifecycle.
- Add role update actions.
- Add audit/activity entries for access changes.

## Acceptance Criteria

- Existing project-info/project-code vertical area remains visually and structurally unchanged.
- Header right side shows `Teamspaces`, collaborator avatars, and a settings icon.
- Settings icon opens an accessible modal.
- The modal distinguishes project access from estimate-sheet access.
- Sheet-level access is included in schema and repository planning from the start.
- Viewer roles cannot mutate project or estimate data.
- Realtime presence and cursors are authorized through private channels.
- Validation includes targeted UI/schema tests, typecheck, lint, design-system lint, and affected DOM tests.
