# 15 Red Team Failure Modes And Safeguards

## Purpose

This document records hostile-review findings. Future implementation is not ready unless each safeguard is either implemented or explicitly deferred with owner approval.

## Failure Matrix

| Failure mode | How it happens | Safeguard |
|---|---|---|
| Cross-workspace preview leak | RPC joins ids to target rows before checking actor scope and returns names for forbidden ids. | Resolve target ids through workspace/project access first; return names only for eligible ids. |
| Unauthorized project delete | Existing `can_edit_project` is treated as delete authority. | Require `can_manage_project_access`, workspace owner/admin, platform admin, or a new stricter delete RPC policy. |
| Sheet-only collaborator deletes project | `can_access_project` includes sheet-only context and UI exposes project checkbox. | UI disables project selection for `sheet-member`; execution rejects sheet-only actors. |
| Current `deleteProject` bypass remains | Bulk UI is safe, but details modal still submits old action. | Replace or wrap the single-project path through preview/execute before shipping project deletion. |
| Active public link disappears | Project delete cascades active `project_publications` and shared-link child rows. | Block active publications and show revoke/update action. |
| Estimate delete silently changes receiver context | Implementation removes ids from `selected_estimate_ids` and leaves old snapshot/comments ambiguous. | Block active affected publications; publication update is separate. |
| Shared-link history loss | Comments/responses/events are treated as disposable child rows. | Treat active shared-link records as historical receiver data; block source delete while active. |
| Storage path abuse | Client sends a crafted path or stale metadata includes traversal. | DB-derived paths only; strict bucket/path allow-list; record rejection. |
| Partial DB/object cleanup is called atomic | DB delete succeeds, storage cleanup fails, UI says complete without warning. | Report storage warnings and store failed paths in audit. |
| Hard delete breaks historical estimates | Referenced component has source rows; FK sets null and traceability becomes weaker. | Hard delete blocks any estimate/template reference; archive remains default. |
| Archived component remains insertable | Archive updates state but queries/search ignore lifecycle state. | Ship archive with default filters in library and estimate insertion paths. |
| Row-by-row delete timeouts | React/server action loops over selected ids. | One set-based RPC per operation; batch caps. |
| Project and estimate deletes race | Separate advisory lock keys let project hard delete and estimate sheet delete mutate the same graph at once. | Use one project-id-derived project-graph lock for both operations. |
| Stale preview executes | A publication or permission change happens after preview. | Execution reruns preview and compares hash/blockers. |
| Double-submit duplicate mutation | User clicks execute twice or browser retries. | Correlation id idempotency with target-id match. |
| Overbroad route revalidation hides bugs | `revalidatePath("/")` masks stale route needs and slows app. | Revalidate only affected project/list/chart/library routes. |
| Destructive E2E touches seed data | Test uses shared demo rows or missing cleanup. | Env-gated isolated fixtures, service-role cleanup, residue checks. |

## Red-Team Acceptance Checklist

- Cross-workspace ids are grouped without labels.
- Every execution RPC validates actor id equals `auth.uid()`.
- Every execution RPC validates every target id against authority.
- Every execution RPC has a batch cap.
- Every execution RPC blocks stale preview hashes.
- Project delete rejects actors who only satisfy `can_edit_project` through broad workspace membership if they lack manage/admin delete authority.
- Component hard delete requires `is_workspace_admin(workspace_id)` or platform admin.
- Project delete and estimate sheet delete share a project-graph advisory lock.
- Publication blockers are enforced in SQL, not only UI.
- Storage cleanup is post-commit and warning-aware.
- Archived components are hidden from default insert/search.
- Final E2E fixtures leave zero target, child, storage, and audit-residue surprises outside intentionally retained audit rows.

## Stop Conditions For Future Implementation

Stop and return to planning if:

- active publication policy changes from block to detach/update;
- project delete authority changes below manager/admin;
- component hard delete is requested before archive is shipped;
- schema drift invalidates FK/index assumptions in `11`;
- storage cleanup needs a durable worker before beta scale is known;
- graph/GitNexus impact reports high or critical risk and no reviewer has approved the blast radius.
