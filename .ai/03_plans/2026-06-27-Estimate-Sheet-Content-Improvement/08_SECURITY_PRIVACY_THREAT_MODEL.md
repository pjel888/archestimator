# Security Privacy Threat Model

## Security Posture

This work is not release-ready until direct RPC, history, image, and source snapshot risks are closed or explicitly accepted. App-layer checks are useful but insufficient when DB RPCs are granted to authenticated users.

## Threats

| ID | Threat | Risk | Current Evidence | Mitigation |
|---|---|---:|---|---|
| SEC-T01 | Authenticated user calls mutation RPC directly and bypasses app-layer edit checks. | High | Security audit flagged `update_estimate_row_item_with_history` and `replace_estimate_row_item_with_history` as missing internal `assert_can_edit_estimate_for_history`. | Patch every authenticated mutation RPC to enforce DB-level edit access; add static and integration tests. |
| SEC-T02 | Broad workspace member reads estimate history snapshots without estimate/project access. | Medium/High | `estimate_sheet_events` and `estimate_sheet_versions` can contain row snapshots, source metadata, supplier/material descriptions. | RLS must require `can_access_estimate` or equivalent project/sheet access. |
| SEC-T03 | Authenticated user reads private project/estimate image through leaked route URL. | High | `/api/projects/images` audit found auth/project workspace checks but not full current-user resource access. | Enforce workspace membership plus project/estimate/row access. |
| SEC-T04 | Client persists arbitrary `sourceSnapshot` keys or unsafe URLs. | Medium | `updateEstimateRowItem` merges client sourceSnapshot patches; only `imageAsset` receives strong validation. | Persistence-time allowlist, size limits, URL scheme/host checks, signed/private URL rejection. |
| SEC-T05 | Legacy browser repository writes bypass history and validation. | Medium | `estimate-repository.ts:232-268` contains browser `upsert`, `insert`, `delete` paths. | Remove, gate to test-only, or prove unreachable; keep RLS as defense-in-depth only. |
| SEC-T06 | Row image upload uses project edit rights to bypass estimate-specific ACL. | Medium | Audit found `canEditProject OR canEditEstimate` policy. | Decide ACL precedence; require `can_edit_estimate` unless product explicitly says project editors override. |
| SEC-T07 | Authenticated mutating routes rely only on cookies. | Medium | Route handlers need explicit same-origin/CSRF posture. | Document and test same-origin/CSRF expectations for mutating APIs. |
| SEC-T08 | Telemetry/logging leaks row descriptions, source URLs, signed URLs, raw emails, or image metadata. | Medium | Existing console/event logging should be audited for payload contents. | Define telemetry allowlist; redact or hash sensitive fields. |
| SEC-T09 | Server Actions are called by direct POST with malformed or unauthorized payloads. | High | Next Server Functions are reachable outside the rendered UI; `actions.ts` is the main mutation entry point. | Inventory every exported mutation action and test authn/authz/validation/DTO/cache behavior through direct action invocation. |
| SEC-T10 | Public share/proposal/export routes expose private row/source/history data. | High | Share, activity/comment, publication, and proposal export surfaces are part of the estimate workflow and can leave the authenticated app boundary. | Public DTO allowlists, no-store headers, token/revocation tests, export redaction tests. |
| SEC-T11 | Mutation/upload/export loops create cost, availability, or brute-force abuse. | Medium/High | Direct RPC attempts, bulk delete/restore, image routes, retries, and export/comment endpoints can be repeatedly invoked. | Rate limits, retry caps, backoff, anomaly metrics, and testable thresholds per surface. |
| SEC-T12 | DTO over-return leaks private source metadata or signed URLs to client/public contexts. | High | History/activity/source snapshots and proposal exports can carry rich row metadata. | Safe DTO adapters for actions, snapshots, history/activity, private images, public share, and export models. |
| SEC-T13 | Secret or server-only env leaks into client bundle through boundary drift. | High | Next Server/Client boundary changes and public route work can accidentally import server-only modules client-side. | Env inventory, server-only import guards, bundle/source proof, and no new env without documentation. |

## Access Matrix

| Actor | Row CRUD | Row Move | History Read | Private Images | Public Share |
|---|---|---|---|---|---|
| Owner/admin/editor with estimate edit | Allowed | Allowed | Allowed | Allowed | N/A |
| Estimate viewer | Denied mutation; read allowed where product permits | Denied | Read only if estimate access grants it | Read if estimate/project access grants it | N/A |
| Workspace member without project/estimate access | Denied | Denied | Denied | Denied | N/A |
| Unrelated authenticated user | Denied | Denied | Denied | Denied | N/A |
| Public share recipient | Denied mutation except approved comments/decisions | Denied | Denied private history | Only public/redacted media | Scoped share snapshot only |

ACL precedence rule to resolve before implementation: decide whether project editors override estimate-specific collaboration constraints for every mutation/read surface, not only row images. The decision must cover Server Actions, DB RPCs, component promote/replace, template/source insert, history/activity, public snapshots, and exports.

## Attack Surface Gates

| Surface | Required Gate |
|---|---|
| Server Actions | Arguments, actor, ownership check, validation, DTO, cache invalidation, direct-POST behavior, and rate/abuse posture are recorded before implementation. |
| DB RPCs/RLS | Authenticated direct RPC callers cannot mutate/read outside their estimate/project access; same-estimate/tab/node constraints are tested. |
| Public/share/export | Token/session scope, revocation, no-store/cache headers, redacted DTOs, and actor matrix tests exist. |
| Upload/private images | Path validation, file limits, ACL precedence, DTO minimization, and unauthorized actor tests exist. |
| Activity/history | Read access, redaction, pagination limits, and logging redaction are tested. |

## Required Security Tests

| Gate | Proof |
|---|---|
| Direct row RPC authz | Direct PostgREST RPC as viewer/workspace-only/unrelated user fails for `insert_estimate_row_item_with_history`, `update_estimate_row_item_with_history`, `replace_estimate_row_item_with_history`, `delete_estimate_row_item_with_history`, `move_estimate_row_component_with_history`, `move_estimate_row_item_with_history`, `delete_estimate_row_items_bulk_with_history`, and `restore_deleted_estimate_rows_with_history`. |
| Direct tree/tab RPC authz | Direct PostgREST RPC as viewer/workspace-only/unrelated user fails for `create_estimate_tab_with_history`, `rename_estimate_tab_with_history`, `reorder_estimate_tabs_with_history`, `duplicate_estimate_tab_with_history`, `delete_estimate_tab_with_history`, `create_estimate_node_with_history`, `rename_estimate_node_with_history`, `reorder_estimate_nodes_with_history`, `delete_estimate_node_with_history`, `delete_estimate_nodes_bulk_with_history`, and `restore_deleted_estimate_nodes_with_history`. |
| Server-action-only authz | Any tree/tab/sheet mutation that is not exposed as a named DB RPC gets server-action or route tests proving unauthorized actors are rejected before persistence. |
| History RLS | `estimate_sheet_events` and `estimate_sheet_versions` deny workspace-only/unrelated users and allow only authorized estimate/project users. |
| Image route authz | `/api/projects/images?path=...` denies unrelated authenticated users, workspace non-members, revoked collaborators, and viewers where policy requires edit. |
| Source snapshot | Malicious `imageUrl`, `sourceUrl`, `signedUrl`, storage paths, unknown keys, oversized metadata, and control characters are rejected/stripped. |
| Legacy repository | Production UI cannot reach direct browser row writes; tests fail if direct write methods are imported into app mutation paths. |
| CSRF/same-origin | Authenticated mutating routes document same-origin protections and tests cover cross-origin or missing token expectations where applicable. |
| Server Action direct POST | Direct invocation tests cover malformed args, viewer/workspace-only/unrelated actors, missing mutation ID, and stale expected revision where applicable. |
| Public/export DTO redaction | Share/publication/proposal export tests prove private source URLs, raw signed URLs, hidden history fields, and unrelated project data are absent. |
| Abuse/rate limit | Repeated direct RPC/action/upload/export/comment attempts trigger documented rate/backoff/alert behavior without corrupting data. |
| DTO minimization | Contract tests fail if mutation/public/history/export DTOs add raw DB rows or unsafe snapshot fields. |
| Secret boundary | Source/bundle tests or static checks prove service role/storage/provider secrets remain server-only and `NEXT_PUBLIC_*` exposure is intentional. |

## Privacy Rules

- Do not store raw signed URLs in row snapshots or history.
- Do not expose supplier/source metadata in public/publication snapshots unless intentionally redacted and approved.
- Do not log row descriptions, source URLs, raw user emails, or image metadata outside approved IDs/hashes.
- Treat path secrecy as insufficient authorization for private images.
- Treat DTO minimization as a security control, not only a payload-size optimization.

## Release Blockers

The following are release blockers for first-user readiness:

- Missing DB-level edit checks inside authenticated mutation RPCs.
- Private image route access not tied to project/estimate access.
- Estimate history readable by workspace-only users.
- `sourceSnapshot` persistence without allowlist/size/URL restrictions.
- Unproven or reachable direct browser row writes.
- Missing Server Action direct-POST inventory for estimate mutations.
- Missing public/share/proposal/export redaction and token/revocation proof.
- Missing DTO minimization for history/activity/public/export/action responses.
