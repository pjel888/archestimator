# 01 - Readiness And Current State Audit

Controlling note: `00-quality-recovery-and-controlling-map.md` and documents `09` through `15` are the decision-grade authority. This file records current-state evidence and no longer contains open product decisions.

## Current Product Contract

- `/login` is the canonical auth entry.
- `/auth/callback` exchanges the Supabase code and resolves every successful auth callback to `/workshop`.
- `/workshop/onboarding` is only a stale-link compatibility route and redirects to `/workshop/settings`.
- Optional user and workspace details live under `/workshop/settings`; no profile, country, or workspace intake can block app use.
- Teamspaces is already active on project routes and can invite by email, manage project roles, manage estimate-sheet access, and copy the current project share link.

## Current Collaboration Foundation

Existing implemented surfaces:

- `src/components/workshop/ProjectTeamspaceHeader.tsx` renders the Teamspaces rail, invite-by-email form, pending invitations, share-link field, role controls, and sheet access controls.
- `src/lib/collaboration/actions.ts` contains `inviteProjectCollaborator`, `inviteEstimateSheetCollaborator`, role mutation actions, sheet access actions, server-side manager checks, and Supabase Auth invitation delivery.
- `src/lib/collaboration/types.ts` defines project/sheet collaboration summary types.
- `src/lib/repositories/workspace-repository.ts` reads current workspace projects, project details, and project collaboration summaries.
- `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql` defines `project_members`, `estimate_sheet_members`, `estimate_sheet_access_settings`, `collaboration_invitations`, RLS helpers, and `apply_pending_collaboration_invitations`.
- `src/lib/auth/account-membership.ts` already checks workspace, project, and estimate membership before fallback workspace creation.

## Current Gaps

- Current Teamspaces copy link is the project URL, not an invitation-entry URL.
- `collaboration_invitations` is email-scoped and does not yet include an app-owned opaque token suitable for `/invite/[token]`.
- Current Supabase Auth invite redirect points at the project route, but successful auth now lands on `/workshop`, so there is no intentional invite handoff UI after auth.
- `listCurrentWorkspaceProjects()` only lists projects in the resolved workspace. It does not intentionally merge cross-workspace shared projects where access comes from `project_members` or sheet membership.
- `/workshop/projects` cards do not show whether a project is owned/managed through the user's workspace or shared through project membership.
- Existing tests prove current Teamspaces wiring, but not invite-entry routes, pending invite cookies, wrong-account states, or shared-project card indicators.

## Blast Radius

Graph and GitNexus planning evidence:

- Code-review graph minimal context reported medium task risk because affected flows include `createProject`, `signInWithEmail`, and `signInWithGoogle`.
- GitNexus impact for `inviteProjectCollaborator`: LOW, direct caller `handleInviteSubmit` in `ProjectTeamspaceHeader`.
- GitNexus impact for `upsertInvitation`: LOW, 5 impacted nodes across project invite, sheet invite, and `ProjectTeamspaceHeader`.
- GitNexus impact for `ProjectTeamspaceHeader`: LOW upstream in the index, but actual product risk remains higher because it is mounted into all project header routes.
- GitNexus impact for `src/app/auth/callback/route.ts::GET`: LOW upstream, but any change to the callback must preserve the `/workshop` landing contract.
- GitNexus impact for `ProjectsPage`: LOW upstream, but user-facing risk is medium because project visibility and ownership semantics change.
- GitNexus impact for `ensureDefaultWorkspace`: CRITICAL, with 79 impacted symbols, 25 direct callers, and 30 affected processes across workshop, estimates, component library, charts, exports, and media APIs.

Planning conclusion: implementation should be treated as **medium risk** despite low per-symbol graph impact, because the feature crosses auth, public routing, RLS, invitation lifecycle, project list data shape, and user acquisition UX.

Implementation constraint: avoid changing `ensureDefaultWorkspace` for invite entry unless a smaller boundary cannot work. Prefer adding a new invite-specific resolver and a decorated project-list loader over widening default workspace bootstrap behavior.

## Readiness Blockers Before Implementation

- Implement the locked child token table from `12-security-data-rpc-threat-model.md`: store only hashed invite tokens, never raw tokens.
- Keep the v1 copy URL model email-bound; do not implement generic anyone-with-link access.
- Harden `apply_pending_collaboration_invitations`: it must be trigger/service-only or protected by explicit revoke/grant policy, not callable by normal `anon` or `authenticated` clients with arbitrary `target_user_id` and `target_email`.
- Render accepted invite state on `/workshop` as a compact non-blocking banner. Do not add an interstitial or required setup screen.
- Add the red-first tests named in `14-red-first-tests-rollout-readiness.md` before production code.
- Browser QA must be run after implementation and recorded against `e2e/project-invite-entry.spec.ts`.
