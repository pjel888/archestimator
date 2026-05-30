# 01 — Current Inventory: Collaboration Invite System

**Date:** 2026-05-30
**Purpose:** Code-level catalog of every file, function, table, RPC, route, hook, and type involved in the collaboration invite flow.

---

## Routes

| Route | File | Purpose | Access |
|-------|------|---------|--------|
| `/workshop/projects/[projectId]` | `src/app/workshop/projects/[projectId]/layout.tsx` | Fetches `getProjectCollaborationSummary()` for the page | Protected (requireCurrentUserContext) |
| `/invite/[token]` | `src/app/invite/[token]/page.tsx` | Public invite landing page (preview/accept/error states) | Public |
| `/invite/[token]/accept` | `src/app/invite/[token]/accept/route.ts` | Calls `accept_collaboration_invitation` RPC, redirects to project | Authenticated |
| `/invite/[token]/continue` | `src/app/invite/[token]/continue/route.ts` | Sets bridge cookie, redirects to login for signed-out invitees | Public |
| `/invite/[token]/sign-out` | `src/app/invite/[token]/sign-out/route.ts` | Signs out wrong-account users, redirects back to invite page | Authenticated |
| `/workshop/pending-invite` | `src/app/workshop/pending-invite/route.ts` | Consumes bridge cookie after auth, calls accept RPC, redirects to workshop | Authenticated |
| `/workshop` | `src/app/workshop/page.tsx` | Detects `archestimator_pending_invite` cookie, redirects to `/workshop/pending-invite` | Protected |

---

## UI Components

| Component | File | Role | States Handled |
|-----------|------|------|----------------|
| `ProjectTeamspaceHeader` | `src/components/workshop/ProjectTeamspaceHeader.tsx` | Header rail (avatars + gear) + Teamspace settings modal | Normal, open modal, invite form, collaborator list, pending invites, sheet access, private link |
| `WorkshopHomebaseClient` | `src/components/workshop/WorkshopHomebaseClient.tsx` | Workshop homebase, renders `InviteResolutionBanner`, favorites, destination tiles | Accept banner, wrong-account banner, unavailable banner |
| `LiveProjectCard` | `src/components/workshop/LiveProjectCard.tsx` | Project card on list page with access badges | Owned, project-member (emerald), sheet-member (sky blue) |
| `ProjectsPageClient` | `src/components/workshop/projects-page-client.tsx` | Project list page with All/Owned/Shared filter tabs | All, Owned, Shared filters; search |
| `MainSidebar` | `src/components/sidebar/MainSidebar.tsx` | Main nav — no collaboration indicators currently | None |
| `ProjectMiniSidebar` | `src/components/workshop/ProjectMiniSidebar.tsx` | Project sub-nav (Dashboard/Estimates/Charts) — no collaboration indicators | None |
| `ProjectDashboardClient` | `src/components/workshop/ProjectDashboardClient.tsx` | Editable project details — no collaboration indicators | None |

---

## Server Actions & Lib Modules

| File | Exports | Purpose |
|------|---------|---------|
| `src/lib/collaboration/actions.ts` | `inviteProjectCollaborator()`, `inviteEstimateSheetCollaborator()`, `copyProjectInviteLink()`, `updateProjectCollaboratorRole()`, `removeProjectCollaborator()`, `setEstimateSheetAccessMode()` | All invite and membership mutation server actions |
| `src/lib/collaboration/invite-entry.ts` | `createInviteToken()`, `hashInviteToken()`, `isProjectInviteEntryEnabled()`, `readInviteEntryConfig()`, `buildInviteEntryUrl()` | Token generation, hashing, feature-flag gating |
| `src/lib/collaboration/pending-invite.ts` | `createPendingInviteBridge()`, `readPendingInviteBridge()`, `PENDING_INVITE_COOKIE`, `PENDING_INVITE_MAX_AGE_SECONDS` | HMAC-signed bridge cookie for signed-out invite flow |
| `src/lib/collaboration/workshop-pending-invite.ts` | `acceptPendingInviteBridge()` | Consumes bridge cookie, calls accept RPC |
| `src/lib/collaboration/types.ts` | `CollaborationRole`, `ProjectCollaborationSummary`, `CollaborationInvitationSummary`, `ProjectCollaboratorSummary`, `EstimateSheetAccessSummary`, `WorkshopInviteBannerState` | All collaboration TypeScript types |
| `src/lib/collaboration/colors.ts` | `getCollaborationColorForUser()`, `collaborationColorPalette` | Deterministic color assignment for avatar bubbles and cursors |
| `src/lib/repositories/workspace-repository.ts` | `getProjectCollaborationSummary()`, `listCurrentWorkspaceProjects()` (partial — shared project classification), `getWorkshopHomebaseData()` | Data fetching for collaboration context |
| `src/lib/auth/session.ts` | `requireCurrentUserContext()` | Auth enforcement for server actions |
| `src/lib/auth/redirects.ts` | `resolveAuthOrigin()`, `DEFAULT_AUTH_DESTINATION` | Origin resolution for invite URLs |
| `src/lib/auth/account-setup.ts` | `resolvePostAuthDestination()` | Hardcodes redirect to `/workshop` after auth callback |
| `src/hooks/use-project-presence.ts` | `useProjectPresence()` | Realtime presence for online collaborator indicators |

---

## Auth Routes (Consumed by Invite Flow)

| Route | File | Role |
|-------|------|------|
| `/login` | `src/app/login/page.tsx` | Supabase Auth UI — no invite context shown |
| `/auth/callback` | `src/app/auth/callback/route.ts` | Exchanges auth code, calls `resolvePostAuthDestination()` → `/workshop` |

---

## Database Tables

| Table | Migration | Columns | RLS |
|-------|-----------|---------|-----|
| `collaboration_invitations` | `20260526142913` + `20260527115342` | id, workspace_id, project_id, estimate_id, scope, email, role, invited_by, invited_user_id, accepted_at, revoked_at, expires_at, lifecycle_state, accepted_via, direct_granted_at, direct_granted_user_id, last_opened_at, created_at, updated_at | Enabled: select by invitee OR manager; insert/update/delete by manager only. Direct insert/update/delete revoked from browser roles. |
| `collaboration_invitation_tokens` | `20260527115342` | id, invitation_id, token_hash, token_hint, delivery_method, created_by, expires_at, last_opened_at, used_at, revoked_at, revoked_by | Enabled: all access revoked from public/anon/authenticated. Token operations through RPCs only. |
| `collaboration_audit_events` | `20260527115342` | id, invitation_id, project_id, estimate_id, actor_user_id, event_type, metadata, created_at | Enabled: insert/update/delete revoked from all roles. Write-only via security definer RPCs. |
| `project_members` | `20260526142913` | project_id, workspace_id, user_id, role, added_by | Target table for accepted invites and direct grants |
| `estimate_sheet_members` | `20260526142913` | estimate_id, project_id, user_id, role, added_by | Target table for sheet-scoped invite acceptance |
| `workspace_members` | base schema | workspace_id, user_id, role | Used for role-rank calculation |
| `project_favorites` | base schema | user_id, project_id, created_at | Not cleaned up on removal (gap) |

---

## RPCs (Security Definer)

| RPC | Migration | Access | Purpose |
|-----|-----------|--------|---------|
| `resolve_collaboration_invitation(token_hash)` | `20260527115342` | `anon`, `authenticated` | Resolve token state for invite landing page |
| `accept_collaboration_invitation(token_hash)` | `20260527115342` | `authenticated` only | Accept invite, insert project/sheet members |
| `issue_collaboration_invitation_token(...)` | `20260527115342` | `authenticated` only | Create new token (requires `can_manage_collaboration_invitation`) |
| `record_collaboration_invitation_delivery(...)` | `20260527115342` | `authenticated` only | Audit: email sent or link copied |
| `revoke_collaboration_invitation(invitation_id)` | `20260527115342` | `authenticated` only | Revoke invitation and all tokens |
| `materialize_expired_collaboration_invitations()` | `20260527115342` | Revoked from all roles | Internal helper: mark expired invites (called by other RPCs) |
| `apply_pending_collaboration_invitations(user_id, email)` | `20260526142913` → neutered in `20260527115342` | Revoked from all roles | **DELIBERATELY NEUTERED**: no-op that only calls `materialize_expired_collaboration_invitations` |
| `can_manage_collaboration_invitation(project_id, estimate_id, role)` | `20260526142913` | Internal (called by other RPCs) | Authorization helper: checks rank |

---

## Env Variables (Consumed by Invite Flow)

| Variable | Where Used | Required For | Set in .env.local? | In .env.example? |
|----------|-----------|-------------|-------------------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `createCollaborationAdminClient()` | All invite operations | ✅ | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | `createCollaborationAdminClient()` | Service-role client for DB writes + email sending | ✅ | ✅ |
| `PROJECT_INVITE_ENTRY_ENABLED` | `invite-entry.ts:isProjectInviteEntryEnabled()` | Token-based `/invite/[token]` pages | ❌ | ❌ |
| `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` | `invite-entry.ts:readInviteEntryConfig()` | Token hashing/signing | ❌ | ❌ |
| `NEXT_PUBLIC_APP_URL` | `redirects.ts:resolveAuthOrigin()` | Origin resolution for invite URLs | ❌ | ❌ |
| `ARCHESTIMATOR_ALLOWED_APP_ORIGINS` | `redirects.ts:getAllowedAppOrigins()` | Origin allowlist fallback | ❌ | ❌ |

---

## Auth Trigger

| Trigger | Migration | Function |
|---------|-----------|----------|
| `on_auth_user_created` | `20260518100000` → overridden in `20260526142913` | `handle_new_auth_user()`: creates `profiles` row, calls `apply_pending_collaboration_invitations` (now a no-op) |

---

## E2E Tests

| File | Gates | Status |
|------|-------|--------|
| `e2e/project-invite-entry.spec.ts` | `ARCHESTIMATOR_E2E_INVITE_ENTRY=1` + `PROJECT_INVITE_ENTRY_ENABLED=true` + `ARCHESTIMATOR_INVITE_TOKEN_PEPPER` | **Skipped** (no gates satisfied) |
| `e2e/teamspace-collaboration.spec.ts` | `ARCHESTIMATOR_E2E_COLLABORATION=1` | **Skipped** |

## Vitest Contract Tests

| File | What It Validates |
|------|-------------------|
| `tests/vitest/project-invite-feature-flag.test.ts` | `isProjectInviteEntryEnabled()` disabled/missing-pepper states |
| `tests/vitest/project-invite-entry-route.test.ts` | `/invite/[token]` page contract, bridge cookie refs, accept route presence |
| `tests/vitest/project-invite-entry-schema.test.ts` | Migration structure: tables, indexes, RPCs, grants, neutered trigger |
| `tests/vitest/pending-invite-cookie.test.ts` | Bridge cookie creation, HMAC verification, expiry enforcement, disabled-gate throw |
| `tests/vitest/project-collaboration-actions.test.ts` | Server actions contract: `inviteUserByEmail` call, `/invite/` path, RPC refs, direct grant flow |
| `tests/vitest/project-collaboration-summary.test.ts` | Types contract: `CollaborationRole`, `ProjectCollaborationSummary`, layout integration |
| `tests/vitest/project-collaboration-schema.test.ts` | Schema contract: enum, table, RPC presence, type alignment |
| `tests/vitest/project-collaboration-realtime.test.ts` | Realtime hook integration: `getCollaborationColorForUser`, channel setup in estimate page |
| `tests/vitest/collaboration-colors.test.ts` | Color palette: deterministic assignment, hash uniqueness, palette size |
| `tests/vitest/auth-onboarding-guard.test.ts` | Invited collaborator workspace reuse during onboarding |
| `tests/vitest/auth-onboarding-contract.test.ts` | Onboarding doesn't trust client-provided invite flag |
| `tests/vitest/auth-settings-ui-contract.test.ts` | Invited-collaborator mode derived server-side |
| `tests/vitest/teamspace-collaboration-header.test.tsx` | Header UI contract: pending invitations rendering, avatar layout, role badges |
