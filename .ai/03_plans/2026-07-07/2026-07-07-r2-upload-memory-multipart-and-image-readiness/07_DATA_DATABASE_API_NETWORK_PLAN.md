# 07 — Data, Database, API, and Network Plan

## Data ownership

| Data | Owner | Store | Lifecycle |
|---|---|---|---|
| Upload session (reserved/pending/finalized/failed/expired/deleted/aborted) | `upload_sessions` | D1 `ARCH_DB` | retention cutoffs (expired 1d) |
| Upload asset (finalized + scan status + storage path + thumbnail) | `upload_assets` | D1 | deleted 30d; failed 7d |
| Upload audit events | `upload_events` | D1 | 365d |
| File bytes | R2 `ARCH_UPLOADS_R2` (single bucket, logical-bucket prefix) | R2 | D1-driven cleanup + 3rd-cron retention + orphan reconcile |
| Component attachment review sidecar | `cost_library_item_variant_attachments` | D1 | review workflow |
| Retention audit | `data_retention_events` | D1 | `uploads_orphaned` / `sessions_expired` classes |

## Schema changes

**DATA-01:** FR-01/02/04/05/06/07 require **no migration**. Existing schema suffices.

**DATA-02 (conditional on DEC-03):** If multipart needs durable part-tracking, add one additive
migration `0041_upload_multipart_parts.sql` (see Database Change Blueprint below). Otherwise none.

> Note: `0040_operational_incidents.sql` is owned by a concurrent lane (observability hardening);
> the multipart migration therefore sequences as `0041`. Re-confirm the next free migration number
> at implementation time — this is a shared live worktree.

## Database Change Blueprint — `0041_upload_multipart_parts.sql` (conditional)

- **Filename pattern:** `migrations/0041_upload_multipart_parts.sql` (next free after `0039_project_status.sql` and the concurrent `0040_operational_incidents.sql`; re-confirm at impl time).
- **Tables/columns/indexes affected:** new table only.
- **SQL sketch (structured pseudocode):**
  ```sql
  CREATE TABLE upload_multipart_parts (
    id TEXT PRIMARY KEY,
    upload_session_id TEXT NOT NULL REFERENCES upload_sessions(id) ON DELETE CASCADE,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    part_number INTEGER NOT NULL CHECK (part_number BETWEEN 1 AND 10000),
    etag TEXT NOT NULL,
    size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(upload_session_id, part_number)
  );
  CREATE INDEX idx_upload_multipart_parts_session ON upload_multipart_parts(upload_session_id);
  ```
- **Backfill:** none (new table).
- **Data-volume assumptions:** ≤ a few hundred active part rows per workspace at a time; cleaned on
  finalize/abort.
- **Concurrency/locks:** `UNIQUE(upload_session_id, part_number)` handles concurrent part uploads;
  no global lock.
- **Expected query count per route:** `uploadPart` = 1 INSERT; `complete` = 1 SELECT (parts by
  session) + R2 `complete`; `abort` = 1 DELETE.
- **Cardinality:** current ~1–10; 10× ~10–100; 100× ~100–1k; 1000× ~1k–10k part rows — all trivial
  for D1.
- **Index selectivity:** `idx_upload_multipart_parts_session` is highly selective.
- **Pagination/limits:** parts listed by session, bounded by part count (≤10,000).
- **D1 cost:** negligible; additive; no hot path.
- **Generated type impact:** `bun run cf:typegen` not required (D1 rows, not Worker Env bindings);
  but run if the implementation touches `cloudflare-env.d.ts` for other reasons.
- **Rollback/fix-forward:** `DROP TABLE upload_multipart_parts;` (additive, safe).
- **Local proof:** `cf:inventory` shows the new migration; `bun run cf:d1-runtime-proof` if extended.
- **Linked-provider proof boundary:** bound D1 `ARCH_DB` only.
- **EXPLAIN expectation:** deferred (trivial table); documented reason: low cardinality.

## R2 object lifecycle blueprint

- **Object key policy:** unchanged structure (`${logicalBucket}/${workspaceId}/${userId}/…`); validators
  retained (`assertSafeStoragePath`, `assertSafeLogicalBucket`).
- **customMetadata (FR-04):** every `put` writes `{workspace_id, actor_user_id, surface,
  upload_session_id, checksum_sha256_prefix, content_type, created_at}`. R2 metadata size limit is
  generous (2 KB/user metadata); fields fit easily.
- **list (FR-05):** bounded `list({prefix, limit: 1000, cursor})`; used by cleanup reconciliation
  (dry-run default). Class B operation cost — cap reconciliation frequency (e.g. daily, in cleanup
  cron) and bound total `list` calls.
- **Deletion:** `removeObjects` (existing) + retention pass (FR-06) + orphan reconcile (FR-05).
- **R2 bucket lifecycle rules:** not configured in `wrangler.jsonc`; lifecycle stays app-driven
  (cron). Future option: R2 lifecycle rules for `expired/` prefix — recorded, not recommended now
  (adds a second source of truth).
- **Single physical bucket:** `archestimator-proof-uploads`. Never write outside the three logical
  buckets (`project-images`, `component-images`, `component-attachments`) + `provider-proof/`.

## Access-path matrix (data sources)

| Source | Chosen path | Runtime role | Authorization check | Latest schema/policy posture | Proof source | Fallback |
|---|---|---|---|---|---|---|
| Upload file bytes | `UploadStorageProvider` → R2 `ARCH_UPLOADS_R2` | route (user) | `canEdit*`/`canManageLibrary` | validators + path ownership | `verify-cloudflare-hosted-upload-lifecycle-proof` | 503 storage |
| Direct upload session | D1 `upload_sessions` + R2 | route (user, owner-checked) | `profile.id === userId` + durable capacity | `idx_upload_sessions_active_capacity` | `upload-signed-route.test` | 403/429 |
| Upload asset metadata | D1 `upload_assets` | route/job | per-surface authz | scan-status CHECK | `recordUploadAsset` tests | n/a |
| Scan result | D1 `upload_assets.scan_*` | scan job (bearer) | `CRON_SECRET`/`UPLOAD_SCAN_JOB_SECRET` | scan-status transitions | `verify-hosted-upload-operations` | DLQ |
| R2 orphan reconcile | `provider.list` + D1 | cleanup job (bearer) | `CRON_SECRET`/`UPLOAD_CLEANUP_JOB_SECRET` | dry-run default | `upload-cleanup-job.test` | skip |
| Retention | `runRetentionPassInD1` + R2 | cron (system) | cron trigger | `data_retention_events` | `cloudflare-scheduled-upload-jobs.test` | D1-only (current gap) |

No chosen path is blocked by current D1 migrations, app-authz, or object policies. The one gap —
retention lacks R2 delete — is FR-06.

## API contracts (upload routes — target)

| Route | Method | Request | Success response | Error responses |
|---|---|---|---|---|
| `/api/projects/images` | POST | `formData(file)` | 200 `{imageAsset}` | 400 no/empty file; 403 authz; 413 oversize; 415 bad type; 503 storage |
| `/api/projects/images` | GET | `?id=` | 200 image bytes (streamed) | 403; 404 |
| `/api/projects/images` | DELETE | `{id}` | 200 `{deleted:true}` | 403; 404 |
| `/api/estimate-row-images` | POST | `formData(file, estimateId)` | 200 `{imageAsset}` | same as above |
| `/api/component-library/images` | POST/GET/DELETE | same shape | same | same |
| `/api/component-library/attachments` | POST | `formData(file)` | 200 `{attachmentAsset, scanStatus:"pending"}` | + 415 PDF/XLS/XLSX only |
| `/api/component-library/attachments` | GET | `?id=` | 200 bytes (streamed) if scan `clean`/`override_approved` | 403; 404; 409 scan pending/blocked |
| `/api/component-library/attachments` | DELETE | `{id}` | 200 | 403; 404; 409 if reviewed/approved |
| `/api/component-library/attachments/direct-upload` | POST `create` | `{fileName, contentType, sizeBytes}` | 200 `{uploadUrl, uploadSessionId, strategy}` | 403; 413 >cap; 429 capacity |
| `/api/component-library/attachments/direct-upload` | POST `finalize` | `{uploadSessionId}` | 200 `{attachmentAsset}` | 403; 409 mismatch; 410 expired |
| `/api/component-library/attachments/direct-upload` | PUT | body stream + `?uploadSessionId=` | 200 | 403; 413; 415; 501 multipart (if DEC-03 deferred) |

DTOs: typed (`UploadAssetDescriptor`/`ImageAssetDescriptor`); error body `{code: string, message: string}`;
no raw bytes/paths/checksums in responses beyond prefixes.

## Network behavior

- **Body size:** enforced at env cap (FR-02); Cloudflare platform ceiling 100 MB far above.
- **Streaming:** `request.body`/`file.stream()` → R2 `put(stream)`; backpressure native.
- **Timeouts:** route duration env `…ROUTE_DURATION_MS` (30000); client 45 s (`client-upload.ts`).
- **Retries:** finalize idempotent; scan/cleanup jobs retry via queue (`max_retries:3`, DLQ).
- **Cancellation:** client abort → stream errors → R2 put fails atomically (single PUT) or abort
  multipart.
- **Idempotency:** finalize by `upload_session_id`; jobs by per-minute idempotency key.
- **Pagination:** `list` cursor-based; bounded page size.
- **Rate limits:** admission (in-process advisory) + durable direct-upload capacity (D1).
- **Third-party:** clamd (optional) over `node:net`; Cloudflare Images binding (optional).
- **Provider quota:** R2 Class A/B ops, Images transforms (5,000/month free) — see `20`.

## Backward compatibility

- Streaming + customMetadata + list + retention-fix are backward-compatible (same DTOs, same keys).
- Enforced env cap (FR-02) is a **behavior change** for images (12→4 MiB) — OPEN-01 owner ack.
- Multipart (DEC-03) is additive (new strategy path); 501 retained only if deferred.
- Images binding flip (DEC-07) preserves webp output; verify thumbnail parity.
