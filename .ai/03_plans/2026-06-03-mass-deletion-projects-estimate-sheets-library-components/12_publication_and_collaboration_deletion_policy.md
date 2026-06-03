# 12 Publication And Collaboration Deletion Policy

## Purpose

Mass deletion touches public receiver records and private collaboration records. This document defines what must block, cascade, null-reference, or remain immutable.

## Receiver Truth Model

`project_publications.snapshot_json` is the rendered receiver payload. `selected_estimate_ids` is source-selection metadata used by manager actions and republish flows. It is not an FK and is not sufficient to rewrite public receiver content after a source estimate is deleted.

Implementation consequence:

- do not remove ids from `selected_estimate_ids` as the default estimate-delete behavior;
- do not mutate `snapshot_json` to hide deleted source estimates;
- block deletion while an affected publication is active, then ask the user to revoke/update the publication through publication-specific controls.

## Active Publication Definition

A publication is active for deletion blockers when:

```text
status = 'published'
and revoked_at is null
and (expires_at is null or expires_at > now())
```

Project delete blocks if the project owns any active publication. Estimate sheet delete blocks if any selected estimate id is present in an active publication's `selected_estimate_ids`.

## Project Delete Policy

| Publication state | Project delete behavior | Reason |
|---|---|---|
| No publication | Allow if actor has delete authority. | No receiver surface to break. |
| Draft/expired/revoked publication | Allow only after preview shows cascade counts. | User already removed active receiver access. |
| Active publication | Block. | Avoid deleting recipient comments, responses, events, and password/open audit trails behind a generic project delete. |

Preview must show:

- active publication count;
- publication labels safe for manager display;
- recipient/comment/response/event counts;
- recommended action: revoke or update publication first.

## Estimate Sheet Delete Policy

| Publication impact | Estimate delete behavior | Reason |
|---|---|---|
| Selected estimate not in active publication metadata | Allow if actor can edit estimate. | No active receiver selection impact. |
| Selected estimate appears in active publication metadata | Block. | Public recipient context would silently diverge from source state. |
| Snapshot still contains the estimate but publication is revoked/expired | Allow after preview. | Receiver access is no longer active. |

The UI must not say the public link will update automatically. If product later chooses detach-and-republish behavior, that must be a separate publication action with its own preview.

## Shared-Link Child Retention

| Record | Current role | Deletion rule |
|---|---|---|
| `shared_link_recipients` | Recipient identity/session/delivery metadata. | Keep while publication remains; cascade only when publication is explicitly deleted/revoked and then removed. |
| `shared_link_comments` | Receiver/owner comments on snapshot targets. | Historical receiver record; preserve by blocking active source deletion. |
| `shared_link_responses` | Accept/decline/revision decisions. | Historical receiver record; preserve by blocking active source deletion. |
| `shared_link_events` | Open/comment/decision/password activity. | Historical event record; preserve by blocking active source deletion. |
| `project_publication_events` | Open/password/download events. | Include `password_attempt` in impact counts. |

Public activity routes intentionally filter internal events for recipients. Owner-side manager actions may include internal traces. Deletion previews should use owner/server-side counts, not public receiver filtering.

## Collaboration Operational Rows

| Record | Delete behavior |
|---|---|
| `project_members` | Cascade with project. |
| `estimate_sheet_access_settings` | Cascade with estimate. |
| `estimate_sheet_members` | Cascade with estimate. |
| `collaboration_invitations` | Cascade with project/estimate. |
| `collaboration_invitation_tokens` | Cascade with invitation. |

These are operational access rows. Once a project or estimate is deleted, access rows for that deleted target have no active meaning.

## Collaboration Audit Rows

`collaboration_audit_events` are historical and should remain. Current migrations use nullable target references for durable audit behavior. Do not explicitly delete these rows during mass deletion.

Preview should count affected audit rows as retained/null-referenced, not as deleted records.

## Invite/Token Safety

Do not revoke or delete unrelated pending invitations outside the selected targets. A project delete can cascade project-scoped invitations. An estimate delete can cascade estimate-scoped invitations. Workspace-wide or unrelated project invitations stay untouched.

Raw invitation tokens and recipient tokens must never be returned in preview, execution results, audit rows, or logs.

## Open Decision

| Decision | Recommended default | Owner | Risk if wrong | Implementation impact | Blocking |
|---|---|---|---|---|---|
| Whether to add a publication-specific "detach estimate and republish" action later | Defer; block active affected publications for this release. | Product owner + backend implementer | Silent public context drift and confused receiver decisions. | Keeps delete RPCs simple and publication-safe. | Non-blocking for Phases 1-5 because default is block. |
