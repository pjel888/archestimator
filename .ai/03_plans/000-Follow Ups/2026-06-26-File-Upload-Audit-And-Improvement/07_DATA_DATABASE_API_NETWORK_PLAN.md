# Data Database API Network Plan

## Proposed Data Model

Add upload-domain tables in a future migration:

### `upload_sessions`

Purpose: server-owned lifecycle for selected or direct-uploaded files before domain attachment.

Columns:

- `id uuid primary key`
- `workspace_id uuid not null`
- `actor_user_id uuid not null`
- `surface text not null`
- `entity_type text not null`
- `entity_id uuid null`
- `idempotency_key text not null`
- `status text not null` (`created`, `uploading`, `uploaded`, `finalizing`, `attached`, `cancelled`, `expired`, `failed`)
- `provider text not null`
- `bucket text not null`
- `object_key text not null`
- `allowed_content_types text[] not null`
- `max_size_bytes bigint not null`
- `expires_at timestamptz not null`
- `created_at`, `updated_at`, `finalized_at`
- unique `(workspace_id, actor_user_id, surface, idempotency_key)`

### `upload_assets`

Purpose: durable canonical object/derivative record.

Columns:

- `id uuid primary key`
- `session_id uuid references upload_sessions(id)`
- `workspace_id uuid not null`
- `owner_user_id uuid not null`
- `surface text not null`
- `entity_type text not null`
- `entity_id uuid null`
- `provider text not null`
- `bucket text not null`
- `object_key text not null`
- `original_file_name text`
- `content_type text not null`
- `detected_content_type text not null`
- `size_bytes bigint not null`
- `checksum_sha256 text not null`
- `width integer null`
- `height integer null`
- `visibility text not null`
- `status text not null` (`pending`, `stored`, `quarantined`, `attached`, `superseded`, `orphaned`, `deleted`, `rejected`)
- `scan_status text not null` (`not_required`, `pending`, `clean`, `infected`, `failed_transient`, `failed_permanent`, `unsupported`, `override_approved`)
- `scan_provider text null`
- `scan_result jsonb not null default '{}'`
- `derivative_of uuid null references upload_assets(id)`
- `metadata jsonb not null default '{}'`
- `created_at`, `finalized_at`, `deleted_at`
- unique `(provider, bucket, object_key)`

### `upload_events`

Purpose: audit and observability.

Events:

- `session_created`
- `validation_failed`
- `object_stored`
- `scan_started`
- `scan_passed`
- `scan_failed`
- `asset_attached`
- `download_url_issued`
- `cleanup_queued`
- `cleanup_succeeded`
- `cleanup_failed`
- `asset_deleted`

Required columns:

- `id uuid primary key`
- `workspace_id uuid not null`
- `actor_user_id uuid null`
- `asset_id uuid null`
- `session_id uuid null`
- `surface text not null`
- `entity_type text null`
- `entity_id uuid null`
- `event_type text not null`
- `request_id text null`
- `ip_hash text null`
- `user_agent_hash text null`
- `old_status text null`
- `new_status text null`
- `reason_code text null`
- `provider text null`
- `bucket text null`
- `object_key_hash text null`
- `checksum_sha256 text null`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

Events are append-only for investigation. Never store signed URLs, provider tokens, raw file contents, or raw filenames in event rows.

## Postgres RLS And Grants

All upload-domain tables are sensitive because they contain object keys, actor IDs, workspace IDs, checksums, filenames, scan result metadata, and lifecycle history.

Required migration posture:

- Enable RLS on `upload_sessions`, `upload_assets`, and `upload_events` in the same migration that creates each table.
- Revoke all default privileges from `public` and `anon`.
- Authenticated browser clients do not receive direct mutation grants on upload-domain tables.
- Reads are exposed only through scoped RPCs or app routes that validate workspace membership, project/library visibility, and surface-specific policy.
- Writes use server-side app routes, service role, or security-definer RPCs that validate actor, workspace, surface, entity, session, idempotency key, status transition, and ownership before mutation.
- `upload_events` is append-only: no client update/delete grants; admin/security reads are scoped by workspace or platform role.
- Audit event retention and legal hold rules must be documented before production rollout.

RLS proof must cover anon, authenticated viewer, workspace member without edit authority, cross-workspace actor, admin/security role, and service-role paths. Static migration text is not enough for provider proof.

## Canonical Status Sets

- `upload_sessions.status`: `created`, `uploading`, `uploaded`, `finalizing`, `attached`, `cancelled`, `expired`, `failed`.
- `upload_assets.status`: `pending`, `stored`, `quarantined`, `attached`, `superseded`, `orphaned`, `deleted`, `rejected`.
- `upload_assets.scan_status`: `not_required`, `pending`, `clean`, `infected`, `failed_transient`, `failed_permanent`, `unsupported`, `override_approved`.
- Attachment review state remains on the attachment/domain row: `uploaded`, `pending_review`, `approved`, `rejected`, `superseded`. It must not be collapsed into scan or asset status.

## Authorization Matrix

| Surface | Operation | Required authority | Entity binding | Denial tests |
|---|---|---|---|---|
| `project_cover_image` | `create_session` / POST | Actor can edit target project in workspace. | `project_id` belongs to current workspace. | viewer, sheet-only member, cross-workspace project, missing project. |
| `project_cover_image` | `finalize` / attach | Same actor/session or workspace editor with project edit authority. | Session surface/entity matches target project. | replayed session, wrong project, expired session. |
| `project_cover_image` | replace/delete | Actor can edit target project. | Existing asset belongs to project/workspace. | viewer delete, wrong path prefix, stale metadata. |
| `project_cover_image` | render/read | Actor can read target project and has accepted terms. | Path/asset maps to project/workspace. | unauth, terms block, cross-workspace, malformed path. |
| `component_image` | `create_session` / POST | Workspace editor or library editor/admin. | Target component/variant is in workspace when known; draft sessions bind to actor/workspace. | viewer/member without edit, wrong workspace, wrong user prefix. |
| `component_image` | finalize/attach/replace/delete | Workspace editor or library editor/admin. | Asset surface/workspace/entity matches component/variant. | replayed asset, wrong component, direct storage path tamper. |
| `component_image` | render/read | Private target: workspace member or signed/proxy authorization. Public exception: explicit decision record. | Resolver checks asset visibility and entity. | public URL blocked when private target enabled. |
| `estimate_row_project_component_image` | `create_session` / POST | Actor can edit target estimate row in the project workspace. | Project, estimate, node where available, and row belong to current workspace; draft binds to actor/workspace. | viewer, read-only project member, wrong estimate, cross-workspace row, wrong user prefix. |
| `estimate_row_project_component_image` | finalize/attach/replace/delete | Same actor/session or estimate editor with row edit authority. | Asset surface/workspace/entity matches the estimate row and project-component projection. | replayed asset, wrong row, stale row revision, direct storage path tamper. |
| `estimate_row_project_component_image` | render/read | Actor can read the estimate/project, or authorized publication/share resolver permits it. | Resolver checks row/project scope and image visibility. | public/private mismatch, share-token overexposure, cross-project URL. |
| `component_attachment` | `create_session` / POST | Workspace editor or library editor/admin. | Draft session binds to workspace/actor and later variant/cost entry. | viewer/member without edit, wrong workspace. |
| `component_attachment` | finalize/attach | Workspace editor or library editor/admin. | Asset cleanly binds to variant/cost entry before domain persistence. | wrong bucket/path, missing object, wrong checksum, expired session. |
| `component_attachment` | approve/reject/supersede | Workspace admin, platform admin, or named governance role. | Attachment, item, option, cost entry share workspace and scan is clean for approval. | non-admin, stale revision, scan pending/failed. |
| `component_attachment` | download | Workspace member with item visibility and attachment permitted state; stricter role if product decides. | Approved/current/clean asset unless explicit audited override. | pending scan, rejected, superseded, wrong workspace. |
| all | cleanup | System job/service role through cleanup RPC, never browser direct delete for finalized assets. | Asset/session status allows deletion. | attached/current-approved deletion, wrong workspace, duplicate cleanup. |

## Existing Domain Migrations

- Project metadata currently stores `projectImageUrl`, `projectImagePath`, `projectImageThumbnailPath`. Migrate to `projectImageAssetId` and derived display fields.
- Component image data currently stores bucket/path/thumbnail metadata in variant inputs. Migrate to asset references.
- Estimate row project-component images currently mirror `sourceSnapshot.imageUrl` into row state and project-component projection. Add an asset reference or validated asset descriptor for row-owned component images, then keep `sourceSnapshot.imageUrl` only as compatibility output from the resolver until all readers are migrated.
- `cost_library_item_variant_attachments` currently stores bucket/path/file metadata. Add `upload_asset_id` and scan/finality constraints, then backfill.

Component image asset target:

- Add nullable `image_asset_id` and `thumbnail_asset_id` references for `cost_library_item_price_options` where `image_bucket`, `image_path`, and `thumbnail_path` currently live.
- Add nullable item-level thumbnail asset reference for the canonical `cost_library_items.thumbnail_path` or equivalent current item-level thumbnail field.
- During dual-write, keep legacy bucket/path/thumbnail fields for existing RPC response compatibility.
- Backfill variant-level image assets first, thumbnail derivatives second, and item-level thumbnails last so default-image selection can continue to resolve.
- RPC snapshots should include both legacy path fields and asset IDs until all readers use the resolver.
- Constraints tying asset workspace/surface/entity to library item/price option are added `not valid`, then validated after backfill.

## API Contracts

### `POST /api/uploads/sessions`

Input:

- `surface`
- `entityType`
- `entityId`
- `fileName`
- `contentType`
- `sizeBytes`
- `idempotencyKey`

Output:

- `sessionId`
- `uploadMode`: `server_mediated` or `signed_resumable`
- `acceptedTypes`
- `maxSizeBytes`
- `objectKey`
- `expiresAt`
- direct upload instructions only when applicable

### `POST /api/uploads/{sessionId}/finalize`

Input:

- checksum where available
- client-observed size/content type
- derivative intent if relevant

Output:

- asset descriptor
- render URL/download eligibility
- scan status
- retryable/non-retryable error classification

### Compatibility Routes

Existing routes should initially delegate to the broker:

- `/api/projects/images`
- `/api/component-library/images`
- `/api/component-library/attachments`

Keep current response fields while adding asset fields.

`/api/component-library/images` has at least two current callers: the library/component modal and the estimate-row `Reference image` modal. Broker migration must distinguish them by surface and entity binding even if the compatibility URL remains shared in the first pass.

Legacy compatibility rule:

- Existing clients may continue posting only `file` plus the current entity field during Phase 2/3 dual-write.
- Compatibility routes server-generate the upload session, object key, and idempotency key when the client does not provide one.
- If an optional `Idempotency-Key` header is introduced before Phase 4, it is additive and must not break legacy callers.
- Phase 4 shared clients should send explicit idempotency/session data, but server-side finalization remains authoritative.

`POST /api/projects/images` current-compatible response:

```json
{
  "bucket": "project-images",
  "path": "string",
  "thumbnailPath": "string",
  "url": "/api/projects/images?path=...",
  "thumbnailUrl": "/api/projects/images?path=...",
  "width": 1600,
  "height": 1200,
  "thumbnailWidth": 512,
  "thumbnailHeight": 384,
  "originalBytes": 123,
  "optimizedBytes": 45,
  "contentType": "image/webp",
  "assetId": "uuid",
  "thumbnailAssetId": "uuid",
  "sessionId": "uuid",
  "provider": "supabase"
}
```

`POST /api/component-library/images` current-compatible response:

```json
{
  "bucket": "component-images",
  "path": "string",
  "thumbnailPath": "string",
  "url": "derived render URL",
  "thumbnailUrl": "derived render URL",
  "width": 1600,
  "height": 1200,
  "thumbnailWidth": 512,
  "thumbnailHeight": 384,
  "originalBytes": 123,
  "optimizedBytes": 45,
  "contentType": "image/webp",
  "assetId": "uuid",
  "thumbnailAssetId": "uuid",
  "sessionId": "uuid",
  "provider": "supabase"
}
```

`POST /api/component-library/attachments` current-compatible response:

```json
{
  "bucket": "component-attachments",
  "path": "string",
  "fileName": "quote.pdf",
  "contentType": "application/pdf",
  "sizeBytes": 123,
  "assetId": "uuid",
  "sessionId": "uuid",
  "provider": "supabase",
  "scanStatus": "pending"
}
```

Additional fields:

- `assetId`
- `sessionId`
- `provider`
- `bucket`
- `path`
- `url`
- `thumbnailAssetId`
- `thumbnailPath`
- `scanStatus` for attachments

## Upload Session State Transitions

| From | To | Allowed by | Notes |
|---|---|---|---|
| `created` | `uploading` | broker/client upload start | Session not expired; object key fixed. |
| `uploading` | `uploaded` | provider head/upload success | Object exists at expected key. |
| `uploaded` | `finalizing` | finalize request | Lock session row `for update`; reject expired sessions. |
| `finalizing` | `attached` | finalization succeeds | Domain update and asset attach occur in one transaction where possible. Attachment download/use still depends on scan/review gates. |
| any non-terminal | `cancelled` | actor/system | Cleanup queued if object exists. |
| any non-terminal | `failed` | broker/system | Reason code required. |
| `created/uploading/uploaded` | `expired` | system | Non-finalizable; cleanup queued. |

## Upload Asset State Transitions

| From | To | Allowed by | Notes |
|---|---|---|---|
| `pending` | `stored` | provider put/head success | Object exists at expected key. |
| `stored` | `quarantined` | scan required | Asset exists but approval/download/use fail closed. |
| `stored` | `attached` | no scan required and domain attach succeeds | Typical image path. |
| `quarantined` | `attached` | scan clean or audited override plus domain attach | Domain review state can still block attachment use. |
| `attached` | `superseded` | replace/review lifecycle | Old object retained or cleanup policy applied. |
| `pending/stored/quarantined` | `orphaned` | failed/cancelled/expired session | Cleanup queued. |
| any non-terminal | `rejected` | validation/scan/review failure | Reason code required. |
| `attached/superseded/orphaned/rejected` | `deleted` | cleanup/delete job | Audit event required. |

Finalization contract:

- Finalize locks the `upload_sessions` row and the target domain row when attaching.
- It checks idempotency key, session actor/workspace/surface/entity, expiry, object key, size, content type, checksum, and scan policy.
- Checksum mismatch marks the session failed and queues cleanup.
- Concurrent finalize for the same session returns the existing finalized asset only if checksum and idempotency match.
- Replayed finalize with different target, checksum, or actor fails.
- Domain actions must accept `assetId`/`sessionId`, validate server-side, and then deprecate raw bucket/path persistence.

## Scanner Contract

Scanner implementation is a pre-Phase-5 decision gate. Vendor can vary, but the interface and failure semantics cannot.

Statuses:

- `pending`
- `clean`
- `infected`
- `failed_transient`
- `failed_permanent`
- `unsupported`
- `override_approved`

Rules:

- Approval, download, and publication fail closed unless status is `clean` or a tightly audited `override_approved`.
- Transient failures retry with backoff and a max age.
- Permanent/unsupported failures require replacement or explicit security/admin override.
- Override requires named admin/security role, reason, expiry, asset hash, and audit event.
- XLS/XLSX/PDF policy must define macro, embedded file, JavaScript, and active-content behavior before implementation.

## Network And Upload Mode Rules

- Keep server-mediated image uploads while files are <= 12 MB and transforms are required.
- Use signed/resumable upload for files above the small-file threshold, unstable networks, or future large imports.
- Attachments stay server-mediated until scanning/finality is in place, then may use signed upload plus server finalize/scan.
- All uploads have idempotency keys so retry does not create duplicate domain attachments.
- Client cancellation aborts the request and marks session cancelled or cleanup pending.
- Rate limits and active-upload caps are checked before accepting upload body bytes whenever possible.
- Scanner queue backpressure returns a retryable, explicit `429` or equivalent classified response before unbounded storage/scan work accumulates.

## Database Constraints

Future migrations should enforce:

- upload asset workspace matches domain entity workspace.
- Phase 2 adds scan fields as non-enforcing/nullable or default `pending`; enforcing `scan_status = clean` for approval/download waits until scanner contract and backfill are implemented.
- current approved attachment cannot reference missing/unfinalized asset.
- object key is immutable after finalization.
- deletion/supersession does not erase audit history.

## Migration Safety

- Add nullable asset-reference columns first.
- Backfill from existing paths with object-head verification where provider access is available.
- Dual-write before read switch.
- Add constraints `not valid`, validate after backfill.
- Broad direct storage writes must be closed in Phase 0 unless the full signed-session/finalization/proof minimum already exists for the direct path. Later migrations may refine policies, but production rollout cannot proceed while direct write/update/delete bypass remains open.
- For large existing tables, use separate migrations and concurrent indexes where supported.
