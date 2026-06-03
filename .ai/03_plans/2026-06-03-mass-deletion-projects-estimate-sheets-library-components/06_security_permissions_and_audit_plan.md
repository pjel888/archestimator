# 06 Security Permissions And Audit Plan

## Purpose

This document defines the security model for future implementation. The feature is destructive and must fail closed.

## Threat Model

| Threat | Example | Mitigation |
|---|---|---|
| Cross-workspace deletion | Client sends project ids from another workspace. | RPC classifies as not found/forbidden without returning raw rows; workspace/project joins enforced. |
| Privilege escalation through `SECURITY DEFINER` | Authenticated viewer calls delete RPC directly. | RPC re-checks actor, ACL functions, batch caps, and target ownership. |
| Over-broad existing RLS delete | Current `deleteProject` relies on RLS and current `can_edit_project` is broad. | New project delete RPC uses stricter manager threshold and single delete is hardened. |
| Active shared-link corruption | User deletes source project/estimate while receiver comments/decisions exist. | Block active publications by default. |
| Orphaned or malicious storage deletion | Client supplies arbitrary storage path. | Cleanup uses DB-derived paths and bucket/path allow lists only. |
| Replay/double submit | User double-clicks execute. | Correlation id and idempotent audit lookup. |
| Stale preview | Data changes between preview and confirm. | Execution reruns preview and compares preview hash/blockers. |
| Batch abuse | Huge arrays cause lock/timeouts. | TypeScript and SQL batch caps. |
| UI-only permission hiding | User calls server action manually. | Server action and RPC both enforce permissions. |

## Roles And Allowed Actions

| Role / access | Preview project delete | Execute project delete | Preview estimate delete | Execute estimate delete | Archive components | Hard delete components |
|---|---|---|---|---|---|---|
| Platform admin | yes | yes | yes | yes | yes | yes |
| Workspace owner/admin | yes | yes | yes | yes if estimate editable | yes | yes |
| Workspace member | yes for accessible projects | no project delete by default | yes for accessible estimates | yes if `can_edit_estimate` | yes if `is_workspace_editor` | no |
| Project owner/admin | yes | yes | yes | yes | no unless workspace editor | no |
| Project editor | yes | no project delete by default | yes | yes | no unless workspace editor | no |
| Project viewer | yes | no | yes | no | no | no |
| Sheet-only editor | no project delete | no | yes for sheet | yes for sheet | no | no |
| Pending invite | no | no | no | no | no | no |
| Public share recipient | no | no | no | no | no | no |

## Workspace Scoping Rules

- Project ids must be resolved through `projects.workspace_id`.
- Estimate ids must be joined through `estimates.project_id` and project workspace.
- Component ids must be joined through `cost_library_items.workspace_id`.
- Never accept client-provided `workspaceId` as authority unless it matches `ensureDefaultWorkspace()` and RPC validation.
- Return cross-workspace ids as `notFoundIds` or grouped `forbiddenIds`; do not reveal names/codes.

## Server-Side Authorization Rules

Project delete:

- preview: `can_access_project(id)`;
- execute: `can_manage_project_access(id)` or platform admin;
- reject sheet-only access even though `can_access_project` can include sheet members.

Estimate sheet delete:

- preview: `can_access_estimate(id)`;
- execute: `can_edit_estimate(id)`;
- target estimate must belong to provided project id.

Library archive:

- preview: `is_workspace_member(workspace_id)`;
- execute: `is_workspace_editor(workspace_id)` or platform admin.

Library hard delete:

- preview/execute: `is_workspace_admin(workspace_id)` or platform admin;
- zero references required.

## RLS And RPC Interaction

RLS remains the baseline for ordinary table operations. Bulk destructive RPCs may use `SECURITY DEFINER` because they need controlled cross-table counts and set-based operations. Therefore each RPC must re-implement authorization checks internally.

Do not write a `SECURITY DEFINER` function that simply deletes rows selected by client ids.

## Security Definer Risk Mitigation

Required for each RPC:

- `SET search_path = public`.
- `revoke all on function ... from public, anon, authenticated` followed by explicit `grant execute ... to authenticated`.
- Actor validation: `acting_user_id = auth.uid()`.
- ACL validation for every target id.
- Batch cap validation.
- Target ids normalized/deduped inside SQL.
- No dynamic SQL from client input.
- No returning secret/token/password/hash fields.

## CSRF / Server Action Considerations

- Server actions use POST semantics and Next action protections.
- Do not expose GET route handlers for destructive execution.
- Modal confirmation text is not security; it is an accident-prevention layer.
- Execution still validates correlation id, actor id, preview hash, and permissions.

## Batch And Rate Limits

- Enforce batch caps from `04_backend_rpcs_server_actions_and_storage.md`.
- Consider writing metadata-only rate-limit rows to existing `security_rate_limit_events` if implementation sees repeated destructive attempts.
- Deny repeated failures with the same actor/target type if abuse becomes visible.

## Audit Data Model

Recommended table: `mass_deletion_events`.

Mandatory contents:

- actor user id;
- workspace id;
- target type;
- target ids;
- target labels snapshot where safe;
- preview counts;
- blockers at preview;
- execution counts;
- correlation id;
- storage cleanup result;
- status;
- timestamp.

Sensitive fields prohibited:

- raw publication tokens;
- invite raw tokens;
- password hashes;
- service-role keys;
- raw AI prompts;
- file contents from attachments.

## Immutable Historical Data Policy

Retain:

- `collaboration_audit_events` with null target refs;
- AI audit/access/tool records with null target refs where schema supports it;
- beta feedback with project id set null;
- shared-link comments/responses/events while publication remains active or retained.

Delete:

- operational collaboration memberships/settings/invitations/tokens by cascade when target is deleted;
- estimate Activity/version rows by cascade when estimate is hard-deleted;
- publication records only if user explicitly revokes/deletes publication or project delete is allowed after blocker resolution.

## Current Security Concerns In Existing Delete Code

`src/lib/projects/actions.ts` currently has `deleteProject(formData)`:

- no direct `requireCurrentUserContext()` call;
- no explicit strict delete-authority check; future delete execution must be stricter than `can_edit_project`;
- no preview;
- uses `window.confirm` in `ProjectDetailsModal.tsx`;
- deletes project by raw id and relies on RLS;
- does not audit deletion;
- cleanup happens after DB delete and failures are not surfaced.

Future implementation must harden this path, not leave it as a bypass around the new bulk workflow.

## Abuse Cases And Mitigations

| Abuse case | Mitigation |
|---|---|
| User selects 10 valid ids and 1 hidden id to test existence. | Return generic forbidden/not-found grouped ids without names for inaccessible rows. |
| Viewer calls execution RPC from console. | RPC checks `can_manage_project_access` / `can_edit_estimate` / workspace editor/admin. |
| User confirms stale preview after another collaborator publishes a link. | Execute reruns preview and blocks on active publication. |
| User archives every library component accidentally. | Preview + typed `ARCHIVE`; batch cap; future "show archived" can recover. |
| User hard deletes referenced components. | Preview blocks any reference count > 0. |
| Storage cleanup path traversal. | DB-derived path only; allow-list validators reject traversal/double slashes. |
| Double-submit creates duplicate audit rows. | Correlation id idempotency. |

## Security Acceptance Criteria

- No future destructive action succeeds from UI-only authorization.
- Every execute RPC has internal permission checks and actor validation.
- Existing single project delete cannot bypass preview-first governance.
- Active publication blockers are enforced server-side.
- Storage cleanup never uses raw client path input.
- Audit rows exist for every successful execution.
