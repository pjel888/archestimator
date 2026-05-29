# Teamspaces Collaboration Spec

**Status:** Implemented (MVP slice)
**Last updated:** 2026-05-29
**Source files:** `src/lib/collaboration/`, `src/components/workshop/ProjectTeamspaceHeader.tsx`, `src/hooks/use-project-presence.ts`, `src/hooks/use-estimate-cursor-broadcast.ts`

## Overview

Teamspaces provides project-scoped collaboration for Archestimator workspaces. It enables workspace owners and admins to invite collaborators to projects, manage role-based access, and share real-time presence/cursor information during estimate editing.

## Architecture

### Access Model

```
Workspace
  └── Project
        ├── project_members (role: owner | admin | editor | viewer)
        ├── estimate_sheet_access_settings (inherits-project | sheet-overrides | restricted)
        └── estimate_sheet_members (per-sheet overrides)
```

- **Project-scoped by default**: Members added to a project inherit access to all estimate sheets.
- **Sheet-level overrides**: Managers can restrict individual sheets or add sheet-specific members.
- **Role hierarchy**: `owner (40) > admin (30) > editor (20) > viewer (10)`
- **Manager threshold**: `admin` rank and above can manage access, invite members, and modify sheet settings.

### Invitation Flow

1. **Manager issues invitation** via `/workshop/projects/[projectId]` → Teamspaces modal
   - Enter invitee email, select role, choose project or sheet scope
   - Server creates `collaboration_invitations` row + peppered-hashed `collaboration_invitation_tokens` entry
   - App-owned `/invite/[token]` URL is generated

2. **Invitee receives invite** (via email or shared link)
   - `/invite/[token]` resolves token hash against pepper
   - Shows project/sheet preview, role, and inviter context
   - Signed-out users authenticate, then return via signed `archestimator_pending_invite` bridge cookie

3. **Acceptance**
   - Authenticated matching-email user accepts → RPC applies membership
   - Wrong-account users get sign-out-and-continue recovery
   - Expired, revoked, or already-used tokens show safe error states

4. **Post-acceptance**
   - `/workshop` shows non-blocking "Project added" / "Sheet shared" banner
   - `/workshop/projects` labels shared projects with "Shared project" or "Sheet-only" badges
   - Existing workspace/project/sheet memberships reused before default workspace insertion

### Security

- **Token hashing**: `sha256(v1:{pepper}:{rawToken})` with server-side pepper from `ARCHESTIMATOR_INVITE_TOKEN_PEPPER`
- **Pepper verification**: Both `PROJECT_INVITE_ENTRY_ENABLED=true` and `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` required
- **Expiration**: 14-day invitation window
- **RLS-gated RPCs**: `anon` can resolve only; `authenticated` can resolve/accept/issue/revoke/record delivery; lifecycle materialization is service-owned
- **No raw token storage**: Only pepper-hashed values stored; no email-based auto-accept on signup (`apply_pending_collaboration_invitations` is overridden)

## Real-time Collaboration

### Presence (slow state)
- **Channel**: `project:{projectId}` (private, RLS-authorized)
- **Transport**: Supabase Presence
- **Data**: Online/offline status, display name, avatar URL, profile color
- **Hook**: `useProjectPresence(projectId)` in `src/hooks/use-project-presence.ts`

### Cursor Broadcast (high-frequency)
- **Channel**: `estimate:{estimateId}` (private, RLS-authorized)
- **Transport**: Supabase Broadcast
- **Data**: Throttled cursor position (x, y), selected node context
- **Hook**: `useEstimateCursorBroadcast(estimateId)` in `src/hooks/use-estimate-cursor-broadcast.ts`
- **Render**: Stable per-user colored remote cursor labels in estimate workspace
- **QA**: Non-visual attributes for cursor channel/send status verification

### Authorization
- Private Supabase channels authorized through `realtime.messages` RLS
- Not a table-wide Postgres Changes feed or Activity feed
- Distinct from estimate sheet Activity History (which uses `estimate_sheet_events`)

## UI Surface

### Project Header (right rail)
- **Location**: `ProjectWorkspaceHeaderRow` right library-width slot
- **Components**: Teamspaces avatars | settings gear
- **Modal**: Full Teamspaces management dialog with:
  - Current collaborators list (with roles, online status, profile avatars)
  - Pending invitations list
  - Email invite form (with role selector)
  - Copy readonly project share link
  - Estimate sheet access controls (per-sheet inherited/restricted toggles)

### Project List
- `/workshop/projects` shows owned/shared/sheet-only labels
- Shared project cards: role badge, owner workspace name, sheet context
- Filter tabs: All | Owned | Shared

## Data Model

### Core Tables
- `project_members` — project-scoped role assignments with RLS
- `estimate_sheet_access_settings` — per-sheet access mode (inherits-project | sheet-overrides | restricted)
- `estimate_sheet_members` — per-sheet member overrides
- `collaboration_invitations` — pending invitations with email, role, scope
- `collaboration_invitation_tokens` — pepper-hashed tokens for invite entry URLs
- `user_onboarding_profiles` — profile display names and avatar URLs
- `workspace_account_settings` — workspace-level org details

### Key Migrations
- `20260526142913_project_sheet_collaboration_access.sql` — RBAC, avatars, invitations, RLS, private Realtime auth
- `20260527115342_project_invite_entry_tokens.sql` — Hashed tokens, invite lifecycle RPCs, auth override
- `20260527072220_auth_account_data.sql` — User profiles, workspace settings, account security events

## Known Limitations

- Presence and Broadcast are in-memory per-session; no persistent realtime state across restarts
- Invite emails use Resend (requires `RESEND_API_KEY`); Resend client has graceful fallback
- No workspace-level collaboration (project-scoped only in MVP)
- No notification system beyond invite emails and `/workshop` banner
- Cursor broadcast is throttled client-side; high-frequency updates are batched

## Future Considerations

- Workspace-level role management
- Notification center (in-app + email)
- Real-time collaborative editing (CRDT/OT)
- Activity feed integration with estimate sheet events
- Bulk invite and team/group management
- SAML/SSO enterprise auth integration
