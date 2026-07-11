# 01 — Current Data Model Audit

## Current hierarchy

```
profile (user)
  └── default_workspace_id → workspaces (1 default per user, auto-provisioned)
                              └── projects (workspace-scoped)
                                    └── estimates (project-scoped)
```

Cross-cutting membership tables:
- `workspace_members` (workspace_id, user_id, role) — roles: owner/admin/member/viewer
- `project_members` (project_id, workspace_id, user_id, role)
- `estimate_sheet_members` (estimate_id, project_id, user_id, role)

## Key findings from source audit

### No corporate/organization entity exists
Searched all migrations and src/ for `organization|org_|corporate|enterprise|tenant|company|team_id` — zero matches as a structural entity. The closest is `workspace_account_settings.organization_name` (free-text per workspace, no shared identity).

### workspace_members is write-only by auto-provisioning
`ensureDefaultWorkspace` (`workspace-repository.ts:1385-1451`) is the ONLY runtime writer of `workspace_members`. There is no admin UI, no server action, and no API to add/remove/promote members. The historical backfill (migration 0030) is the only other writer.

### No workspace-level invitations
The collaboration invitation system (`collaboration_invitations` table, `src/lib/collaboration/actions.ts`) is project/estimate-scoped only. Accepting an invite writes to `project_members` — never `workspace_members`.

### Three independent role systems
1. Platform roles (`profiles.role`): ceo/admin/member — global
2. Workspace roles (`workspace_members.role`): owner/admin/member/viewer — per-workspace
3. Project collaboration roles (`project_members.role`): owner/admin/editor/viewer — per-project

No org-level role system exists.

### Access-layer quirk
`isWorkspaceMemberInD1` / `isWorkspaceEditorInD1` (`d1-access.ts:313-356`) filter on `role IN ('owner','admin','member')` — a workspace `viewer` is invisible to the authz layer. Any new role design must account for this.

### Email normalization
`profiles.email` is lowercase + unique + indexed. Domain extraction is feasible to add but no `email_domain` column exists.

### Admin users surface
`AdminUserRow` exposes only `default_workspace_id` — no workspace membership listing, no org membership, no team-leader concept. There is no `/admin/workspaces` or `/admin/accounts` section.

## Gap summary

| Need | Status |
|---|---|
| Corporate account entity (above workspace) | Does not exist |
| Org-level membership with roles (team leader, etc.) | Does not exist |
| Admin UI to create/manage corporate accounts | Does not exist |
| Link workspaces to corporate accounts | Does not exist |
| Admin visibility into org → workspace → user hierarchy | Does not exist |
| Email-domain-based auto-grouping | Does not exist (non-goal for now — manual assignment is the starting point) |
| Workspace member management (admin) | Does not exist |
