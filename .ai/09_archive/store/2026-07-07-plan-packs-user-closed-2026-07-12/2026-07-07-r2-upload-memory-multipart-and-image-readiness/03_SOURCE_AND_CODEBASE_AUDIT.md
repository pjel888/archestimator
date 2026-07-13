# 03 — Source and Codebase Audit

Evidence base: read-only `Explore` subagent passes over the upload/R2/Images/queue surfaces and
the DB/migrations/tests surfaces, plus direct reads of `wrangler.jsonc`, `package.json`, and the
fast-path state. All references are `repo-relative path:line`. "Must modify" / "must extend" /
"reuse unchanged" judgments are planning judgments, not edits.

## A. Infrastructure and config

| Path | Symbol / field | Responsibility | Relevance | Judgment |
|---|---|---|---|---|
| `wrangler.jsonc:1-5` | `name: archestimator-proof`, `main: worker.ts`, `compatibility_date: 2026-06-29` | Worker identity | Bounds the runtime | Reuse unchanged |
| `wrangler.jsonc:6` | `compatibility_flags: ["nodejs_compat"]` | Enables `Buffer`/`node:net` (clamd) | Justifies `runtime = "nodejs"` on upload routes | Reuse unchanged |
| `wrangler.jsonc:22-24` | `images.binding: "IMAGES"` | Cloudflare Images binding | Unused at upload runtime today; DEC-07 | Possibly extend (provider var) |
| `wrangler.jsonc:30-36` | `r2_buckets[].ARCH_UPLOADS_R2` (`archestimator-proof-uploads`, preview `…-dev`) | Single physical R2 bucket, namespaced by logical-bucket prefix | Core storage | Reuse unchanged |
| `wrangler.jsonc:37-44` | `d1_databases[].ARCH_DB` | Upload metadata store | `upload_sessions/assets/events` | Reuse unchanged |
| `wrangler.jsonc:45-58` | `durable_objects.COLLAB_ROOMS` + migration `v1` | Out of scope (sibling pack) | — | Unaffected |
| `wrangler.jsonc:59-65` | `triggers.crons` `0 3 / 15 3 / 30 3 * * *` | Three cron triggers | `30 3` retention pass lacks R2 delete (gap) | Possibly extend (worker scheduled) |
| `wrangler.jsonc:66-82` | `queues` producer `UPLOAD_JOBS_QUEUE` + consumer (`max_batch_size:5`, `max_retries:3`, DLQ `…-dlq`) | Upload job queue | Scan + cleanup jobs | Reuse unchanged |
| `wrangler.jsonc:83-97` | `observability` (head sampling 0.1 logs / 0.05 traces, persist) | Workers Observability | Free-tier; see `09` | Reuse unchanged |
| `wrangler.jsonc:98-104` | `vars`: `ARCH_UPLOAD_HOSTED_MEMORY_MB=128`, `…BODY_LIMIT_BYTES=4194304`, `…ROUTE_DURATION_MS=30000`, `…CONCURRENT_UPLOADS=3`, `ARCH_UPLOAD_STORAGE_LATENCY_P95_MS=250` | Declared upload limits | **Only read by dry-run proof route, not enforced** (DEC-02) | Must extend (enforce on real routes) |
| `cloudflare-env.d.ts` | `CloudflareEnv` generated types | Binding typings | Refresh after any binding/var change via `bun run cf:typegen` | Must extend on change |
| `next.config.ts:65,107-119` | `localPatterns` (`/api/projects/images`), image loader (`useCloudflareImageLoader`), `unoptimized: true` | next/image config | Many components hard-set `unoptimized` | Possibly extend (DEC-07) |

## B. Upload API routes (file-bearing)

| Route | Method(s) | Body read | In-memory buffer | Cap | Scan | Authz | Judgment |
|---|---|---|---|---|---|---|---|
| `src/app/api/projects/images/route.ts` | POST:270 / GET:209 / DELETE:440 | `formData()` (293); GET streams `object.body` (261) | `Buffer.from(await file.arrayBuffer())` (328) + optimized + thumb | `MAX_UPLOAD_BYTES=12MiB` (35); pre-body content-length (271); post-parse `file.size` (301) | not_required | `canAccessProjectInD1`/`canEditProjectInD1` + sentinel pre-body admission (280) | Must extend (stream) |
| `src/app/api/estimate-row-images/route.ts` | POST:138 | `formData()` (161) | `Buffer.from(await file.arrayBuffer())` (223) | `12MiB` (29) | not_required | `canAccessEstimateInD1`/`canEditEstimateInD1` | Must extend (stream) |
| `src/app/api/component-library/images/route.ts` | POST:188 / GET:167 / DELETE:305 | `formData()` (205) | `Buffer.from(await file.arrayBuffer())` (212) | `12MiB` (lines 29-32) | not_required | `canManageLibrary()`→`isWorkspaceEditorInD1` | Must extend (stream) |
| `src/app/api/component-library/attachments/route.ts` | POST:407 / GET:360 / DELETE:500 | `formData()` (426) | `Buffer.from(await file.arrayBuffer())` (432) | `20MiB` (17); pre-body content-length (408) | `scanStatus: pending` (471); magic-byte `readMagicMime` (80) PDF/XLS/XLSX; download gated by `decideUploadScanGate` (290) | `canManageLibrary()` (192) | Must extend (stream + scan posture) |
| `src/app/api/component-library/attachments/direct-upload/route.ts` | POST create/finalize:466 / PUT:479 | PUT: `new Uint8Array(await request.arrayBuffer())` (439) | **Up to 64 MiB − 1** (`SIGNED_SINGLE_PART_MAX_BYTES`, 29/440) | strategy `chooseUploadSessionStrategy` (216); multipart **501** (231-233) | finalize writes asset | `profile.id === currentUser.userId` (469-471, 482-484) + durable D1 session capacity (134-164) | Must extend (multipart + stream) |

All five routes declare `export const runtime = "nodejs"`. AI routes (`src/app/api/ai/ask/handler.ts:109`,
`src/app/api/ai/package-builder/handler.ts:182`) read `request.json()` only — out of scope.

## C. `src/lib/uploads/` module map

| File | Key exports | Responsibility | Judgment |
|---|---|---|---|
| `policy.ts` | `UPLOAD_POLICIES`, `getUploadPolicy`, `safeUploadName`, `UploadSurface`/`UploadPolicy` | Per-surface config (bucket, maxBytes, maxPixels, keyPrefix, scanRequired, allowedMimeTypes) | Possibly extend (streaming policy) |
| `object-keys.ts` | `buildUploadObjectKey` | `${workspaceId}/${userId}[/${keyPrefix}/${targetEntityId}]/${baseName}.${ext}` | Reuse unchanged |
| `storage-provider.ts` | `UploadStorageProvider` interface (`uploadObject(Buffer|Uint8Array)`, `removeObjects`, `downloadObject`, `headObject?`, `createSignedReadUrl`, `getPublicUrl`) | Storage port | **Must extend** (`ReadableStream` input, optional `list`, `customMetadata`) |
| `r2-storage-provider.ts` | `createCloudflareR2UploadStorageProvider`, `buildCloudflareR2ObjectKey`, `assertSafeLogicalBucket`, `assertSafeStoragePath` | R2 wrapper; `put` writes only `contentType`+`cacheControl` (66-73); no `customMetadata`; no `list`; no multipart | **Must extend** (stream put, customMetadata, list, multipart) |
| `runtime-storage-provider.ts` | `createRuntimeUploadStorageProvider`, `readRuntimeUploadStorageProvider` | Selects R2 via `ARCHESTIMATOR_UPLOAD_STORAGE_PROVIDER` (default `cloudflare-r2`); loads `ARCH_UPLOADS_R2` via `getCloudflareContext` | Reuse unchanged (R2-only) |
| `admission-control.ts` | `reserveUploadAdmission`, `resetUploadAdmissionStateForTests` | **In-process module-global** rate/concurrency gate: `MAX_REQUESTS_PER_WINDOW=12/60s`, `MAX_ACTIVE_PER_ACTOR=3`, `MAX_ACTIVE_PER_WORKSPACE=6` | **Advisory only** — not distributed; see DEC-02 |
| `session-strategy.ts` | `chooseUploadSessionStrategy`, `buildUploadSessionFinalizeRequirements` | Computes `server_mediated` / `signed_single_part` / `multipart_resumable` / `rejected`; thresholds 64 MiB single-part, 512 MiB resumable cap | Must extend (wire multipart) |
| `provider-portability.ts` | `validateProviderObjectHead`, `validateMultipartUploadedParts`, `SignedSinglePartUploadSession`, `TusResumableUploadSession`, `MultipartUploadSession`, `DirectUploadProvider` | Models intended-but-unbuilt multipart/Tus surface | Must extend (R2 impl) |
| `upload-records.ts` | `recordUploadAsset` | Inserts `upload_sessions`+`upload_assets`+`upload_events`; computes SHA-256 | Possibly extend (customMetadata echo) |
| `direct-upload-records.ts` | `recordPendingUploadSession`, `readActiveUploadSessionCapacity`, `readUploadSessionForFinalize`, `finalizeUploadSessionAsset`, `UploadSessionCapacityExceededError` | Durable D1 session reservation + finalize (atomic conditional INSERT) | Possibly extend (multipart part rows) |
| `scanning.ts` | `UploadScanStatus`, `getUploadScanPolicy`, `decideUploadScanGate`, `canTransitionUploadScanStatus`, `evaluateUploadScanBackpressure`, `scanStatusFromProviderOutcome` | Scan policy **attachment-only** (`required: surface === "component-attachment"`, 54) | Reuse unchanged (posture doc) |
| `scan-job.ts` | `runUploadScanJob`, `listUploadScanJobRecords`, `createUploadScanStorageFromProvider`, `createUploadScanResultWriter`, `UploadScannerProvider` | Downloads full object → `bytesFromDownload` materializes bytes (93-111) → `scanner.scan` | Possibly extend (stream scan) |
| `clamd-scanner.ts` | `createClamdUploadScannerProvider`, `createConfiguredUploadScannerProvider` | Real ClamAV `zINSTREAM` over `node:net` (1 MiB length-prefixed chunks); selected when `UPLOAD_SCAN_PROVIDER=clamd` | Reuse unchanged (documented upgrade) |
| `policy-scanner.ts` | `createUploadPolicyScannerProvider` | **Default** — empty file, macro-enabled reject, content-type/extension allowlist, EICAR ASCII substring. Not real AV. | Reuse unchanged (document as floor) |
| `scan-override.ts` / `scan-override-review.ts` | `approveUploadScanOverride(InD1)`, `canApproveUploadScanOverride` (platform-admin), review-queue helpers | `failed_permanent`/`unsupported` → `override_approved` with expiry | Reuse unchanged |
| `cleanup.ts` | `planUploadStorageCleanup`, `summarizeUploadCleanup`, `buildUploadRetentionCutoffs`, `buildUploadCleanupOperationalSnapshot`, `DEFAULT_UPLOAD_RETENTION_POLICY` (failed 7d / deleted 30d / expired session 1d / audit events 365d, 83-88) | App-level retention policy | Possibly extend (R2 reconciliation) |
| `cleanup-job.ts` | `runUploadCleanupJob`, `listUploadCleanupJobRecords`, `createUploadCleanupStorageFromProvider`, `createUploadCleanupEventWriter`, `summarizeUploadCleanupJobResult` | Reads D1, chunks deletes at 100 (`STORAGE_REMOVE_CHUNK_SIZE`, 20), writes cleanup events | Possibly extend (list-based reconciliation) |
| `server-image-processing.ts` | `processUploadImageToWebp`, `isCloudflareWorkersProofBuild`, `CLOUDFLARE_IMAGE_PROCESSING_UNAVAILABLE_MESSAGE`, `CloudflareImagesBindingLike`, `loadCloudflareImagesBinding` | sharp-on-Node OR Cloudflare Images binding (`ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER=cloudflare-images`); outputs re-buffered via `arrayBuffer()` (97,101,104) | **Must extend** (DEC-07; stream output) |
| `sharp-cloudflare-stub.ts` | `sharpCloudflareStub` | Throws when sharp imported in Workers proof build | Possibly extend (DEC-07) |
| `operational-telemetry.ts` | `reportUploadCleanupJobTelemetry`, `reportUploadScanJobTelemetry`, `reportUploadAdmissionRejected`, `sendUploadOperationalAlert`, `setUploadOperationalTelemetrySink` | Webhook alerts via `UPLOAD_OPERATIONS_ALERT_*` | Reuse unchanged |
| `operations-dashboard.ts` | Server-only dashboard aggregation (pending/failed/blocked scans, retention cutoffs) | Ops view | Reuse unchanged |
| `client-upload.ts` | `postUploadFormData`, `UploadClientError` | Browser fetch wrapper, 45 s default timeout/abort linking | Possibly extend (multipart client) |
| `client-state.ts` | `UploadClientState`/`UploadClientAction` reducer | Upload UI state machine | Possibly extend (multipart progress) |
| `component-attachment-client.ts` | `UploadedComponentAttachment`, `UploadComponentAttachmentOptions` | Signed direct + server-mediated client orchestration | Possibly extend (multipart client) |
| `component-image-backfill.ts` / `asset-descriptor-migration.ts` | `classifyUploadImageReference`, `UploadAssetDescriptorV1` + migration | Image-ref classification / migration | Reuse unchanged |

## D. Memory/buffering reality (core P0)

Every inbound file upload fully materializes the body in a Node `Buffer` before R2 `put`. Sites:

- `src/app/api/projects/images/route.ts:328`
- `src/app/api/estimate-row-images/route.ts:223`
- `src/app/api/component-library/images/route.ts:212`
- `src/app/api/component-library/attachments/route.ts:432`
- `src/app/api/component-library/attachments/direct-upload/route.ts:439` (largest: 64 MiB − 1)

Read-back also buffers: `src/lib/uploads/r2-storage-provider.ts:81` `downloadObject` does
`await object.arrayBuffer()` then returns `{ body }`, so scan + finalize materialize whole objects
even though GET streams `object.body` to the client. Image processing adds concurrent
source+optimized+thumbnail buffers (`server-image-processing.ts:206-222`).

`UploadStorageProvider.uploadObject` (`storage-provider.ts:2-4`) accepts `Buffer | Uint8Array`
only; the underlying `R2Bucket.put` accepts `ReadableStream | string | Blob | ArrayBuffer |
ArrayBufferView` but no caller passes a stream. Streaming to R2 requires widening the provider
interface and updating every handler.

## E. Body/size limit enforcement (P1)

`ARCH_UPLOAD_HOSTED_*` vars are read **only** in `src/app/api/internal/upload-runtime/route.ts:91-99`
(`configuredRuntimeLimits`), surfaced to proof JSON (220), behind a secret-gated non-mutating
dry-run route (auth 201-203). Real routes use hardcoded constants (`12MiB`/`20MiB`/`64MiB−1`).
The proof-declared 4 MiB body limit is descriptive, not enforced.

Admission control (`admission-control.ts`) is in-process module-global counters
(`requestBuckets`/`activeByActor`/`activeByWorkspace`, 30-32) — **not distributed, not
isolate-surviving**. Durable concurrency for direct-upload sessions is separately enforced in D1
(`direct-upload-records.ts:216-300`).

## F. Scanner / content validation

- **Inline magic-byte sniffing** (type verification, before R2 put): images
  (`projects/images/route.ts:81-118` JPEG/PNG/WebP/AVIF via ISO BMFF `ftyp`); attachments
  (`attachments/route.ts:80-111` PDF `%PDF-`, XLSX ZIP+`[Content_Types].xml`+`xl/workbook.xml`,
  XLS OLE2).
- **Post-upload scan** (async via scan job): `createConfiguredUploadScannerProvider`
  (`clamd-scanner.ts:158-169`) → ClamAV if `UPLOAD_SCAN_PROVIDER=clamd`, **else**
  `createUploadPolicyScannerProvider` (`policy-scanner.ts:39`). Default deployment has no
  `UPLOAD_SCAN_PROVIDER` in `wrangler.jsonc` vars → **policy scanner**.
- **Scan gating** on download: `decideUploadScanGate` (`scanning.ts:64`) — only
  `component-attachment` requires scan (`scanning.ts:54`); images are `not_required`. Attachment
  downloads 409 until `clean`/`override_approved` (`attachments/route.ts:290-295,387`).
- **Override**: platform-admin `failed_permanent`/`unsupported` → `override_approved` with expiry
  (`scan-override.ts:128`).
- **No VirusTotal.** No Cloudflare CDR. ClamAV wired but not selected by default env.

## G. Cloudflare Images binding (`IMAGES`)

- Declared `wrangler.jsonc:22-24`. **Unused by upload subsystem at runtime** —
  `ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER` is unset.
- `server-image-processing.ts:45` selects binding when `=== "cloudflare-images"`: `images.info`
  (144), `images.input(stream).transform(...).output({format:"image/webp",quality,anim:false})`
  (149-156). Outputs re-buffered (`arrayBuffer()` 97,101,104).
- Workers proof build gate `isCloudflareWorkersProofBuild` (52): when true, `loadSharp` returns
  null (120); sharp stubbed (`sharp-cloudflare-stub.ts`). Without the `cloudflare-images` provider
  set, image uploads 501 (`CLOUDFLARE_IMAGE_PROCESSING_UNAVAILABLE_MESSAGE`, 49).
- Provider proof route `src/lib/cloudflare/provider-proof-router.ts:122-159` `runImagesProof`
  exercises `env.IMAGES.info` + `.input().transform().output()` at `/__cloudflare/provider-proof`
  (guarded by `CRON_SECRET`). R2 round-trip proof `runR2Proof` (161).
- `next.config.ts:107-119`: conditional Cloudflare loader (`image-loader.ts` → `/cdn-cgi/image/…`)
  when `useCloudflareImageLoader`; `unoptimized: true`. Many components hard-set `unoptimized`
  (`ProjectCardThumbnail.tsx:60,71`, `ComponentLibraryManager.tsx:803`, `MainSidebar.tsx:306`).
- No `dangerouslyAllowSVG`; SVG not in allowed MIME set.

## H. R2 object key / metadata / lifecycle

- **Single physical bucket** `archestimator-proof-uploads`, namespaced by logical-bucket prefix:
  `project-images` / `component-images` / `component-attachments`. Keys
  `${logicalBucket}/${workspaceId}/${userId}[/${keyPrefix}/${targetEntityId}]/${baseName}.${ext}`.
- **`httpMetadata`**: only `contentType` + `cacheControl` (31536000 default; `no-store` for proof
  receipts). **No `customMetadata` ever written** — the `CloudflareR2UploadBucket.put` type
  (`r2-storage-provider.ts:24-32`) does not model it.
- **Validation**: `assertSafeStoragePath` (`r2-storage-provider.ts:124-133`) rejects leading `/`,
  `\\`, `//`, `.`, `..`, empty segments; bucket `/^[a-z0-9][a-z0-9-]{1,62}$/` (50). Per-route path
  ownership (`isOwnedAttachmentPath` `attachments/route.ts:113`,
  `parseProjectImageStoragePath` `projects/images/route.ts:135`).
- **Listing**: only `r2.list` in dry-run proof route (`upload-runtime/route.ts:177`).
  `UploadStorageProvider` has **no `list` method**.
- **Deletion**: `removeObjects` (`r2-storage-provider.ts:74-77`) per-key `r2.delete` via
  `Promise.all`; called from DELETE routes + cleanup job (chunked 100, `cleanup-job.ts:20`) +
  mass-deletion (`src/lib/mass-deletion/storage-cleanup.ts:91`,
  `src/lib/projects/actions.ts:225,957-963,1219-1221`).
- **Retention**: app-level (`cleanup.ts:83-88`); enforced by cleanup job reading D1 past cutoffs.
  **No R2 bucket lifecycle/expiration rules** in `wrangler.jsonc`.

## I. Queue consumer and crons

- **Worker scheduled** `worker.ts:97-116`: crons `0 3` (cleanup) / `15 3` (scan) /
  `30 3` (retention).
  - `0 3 * * *` → `/api/internal/upload-cleanup` → `runUploadCleanupJob` (delete R2 for
    deleted/expired/failed + events).
  - `15 3 * * *` → `/api/internal/upload-scan` → `runUploadScanJob` (download pending attachments,
    scan, persist status).
  - `30 3 * * *` → `runRetentionPassInD1(env.ARCH_DB, undefined, …)` (`worker.ts:111`) — **D1
    tombstone/purge only; `undefined` storage provider means no R2 delete** for
    `uploads_orphaned`/`sessions_expired` classes.
- **Queue consumer** `worker.ts:118-128` → `runCloudflareUploadJobQueueBatch`
  (`src/lib/cloudflare/upload-job-queue.ts:329`). Message `version:1`, `jobName`, `cron`,
  `idempotencyKey` (per-minute), `source: "cloudflare-cron"`. Idempotency set
  (`upload-job-queue.ts:338,348-352`); retry delay 60 s; DLQ at `max_retries`. Proof receipts to
  `provider-proof/jobs/${proofId}.json`.
- **Gating**: jobs require `UPLOAD_JOBS_ENABLED=1` to execute non-dry-run
  (`upload-scan/route.ts:57-59`, `upload-cleanup/route.ts:62-64`); `shouldDryRun`
  (`scheduled-upload-jobs.ts:63-65`) defaults dry-run unless `UPLOAD_JOBS_ENABLED=1` AND
  `CLOUDFLARE_UPLOAD_JOBS_DRY_RUN=0`.

## J. D1 schema (upload-relevant)

Latest migration: `0039_project_status.sql`. Upload schema lives primarily in `0010_upload_metadata.sql`:

- `upload_sessions` (status `reserved`/`pending`/`finalized`/`failed`/`expired`/`deleted`/`aborted`;
  `surface` CHECK `project-image`/`component-image`/`component-attachment`; `size_bytes>=0`;
  `checksum_sha256` 64-hex-lowercase or NULL; `metadata_json` object). Indexes:
  `idx_upload_sessions_workspace_created`, `idx_upload_sessions_active_capacity` (partial
  `status='reserved'`).
- `upload_assets` (status superset incl. `removed`; full scan block: `scan_status`, `scan_provider`,
  `scan_result_json`, `scanned_at`, `scan_override_*`; `storage_bucket`, `storage_path`,
  `thumbnail_path`). Cross-field CHECK enforces override fields when
  `scan_status='override_approved'`. Indexes: `idx_upload_assets_scan_override_queue` (partial),
  `idx_upload_assets_workspace_created`, `idx_upload_assets_project_created` (partial).
- `upload_events` (audit; `event_type`, `metadata_json`).
- `cost_library_item_variant_attachments` (`0022_…`) — review/approval sidecar, `storage_bucket`
  hardcoded `component-attachments`, content-type CHECK PDF/XLS/XLSX, path traversal guards,
  `review_status`, `superseded_by` self-FK.
- `mass_deletion_events` (`0023_…`) + `mass_deletion_storage_cleanup_results` (`0012_…`).
- `data_retention_events` (`0034_…`) — `class_name` CHECK includes `uploads_orphaned`,
  `sessions_expired`.

No `src/lib/repositories/upload-*` file exists; upload data-access lives in `src/lib/uploads/`
(`upload-records.ts`, `direct-upload-records.ts`, `cleanup-job.ts`, `scan-job.ts`). Mass-deletion
glue in `src/lib/projects/actions.ts` + `src/lib/mass-deletion/storage-cleanup.ts`.

## K. App authorization

`src/lib/authz/d1-access.ts`: `canAccessProjectInD1` (99), `canAccessWholeProjectInD1` (140),
`canEditProjectInD1` (175), `canAccessEstimateInD1` (212), `canEditEstimateInD1` (261),
`isWorkspaceEditorInD1` (313), `isWorkspaceMemberInD1` (336), `readProjectInWorkspaceFromD1` (54).
Used per-route (see §B). Internal cron routes use bearer-secret auth (`CRON_SECRET`/
`UPLOAD_CLEANUP_JOB_SECRET`/`UPLOAD_SCAN_JOB_SECRET`), not user authz.

## L. Tests and proof scripts

~55 vitest files under `tests/vitest/` cover R2 provider, admission, cleanup, scanning, session
strategy, signed/direct upload, proof-script wrappers, asset-descriptor migration, client state,
operational alerts, release gates, requirement coverage audit, domain contracts. Hosted proof
scripts:

- `scripts/verify-hosted-upload-runtime.ts` — `/api/internal/upload-runtime` probes (fail-closed,
  dry-run, 4 MB body, concurrency); **does not prove** real upload UX, scanner/CDR execution,
  memory exhaustion, multipart.
- `scripts/verify-hosted-upload-operations.ts` — dry-run cleanup/scan; **does not prove** real
  storage delete, scan-result writes, body/memory/duration proof.
- `scripts/verify-cloudflare-hosted-upload-lifecycle-proof.ts` — R2 write/read, D1 asset, scanner
  queue, scan result, attachment download eligibility, cleanup-to-zero; `productionCutoverReady`
  hardcoded `false`; synthetic single small PDF.
- `scripts/verify-cloudflare-hosted-upload-ui-proof.ts` — Playwright end-to-end through hosted UI,
  seeds Better Auth D1 session, uploads tiny PDF, verifies D1 + R2 bytes + checksum, DELETE;
  **does not prove** multipart/large-file, memory safety, scan-override, image surfaces,
  concurrent load.

## M. Document impact

| Document | Relevant section | Accuracy | Update needed? |
|---|---|---|---|
| `AGENTS.md` (Cloudflare bindings, cost posture) | Active bindings list, free-tier posture | Accurate | No (planning-only) |
| `.ai/10_state/current-state.md` | Upload/queue/scanner entries | Accurate | No (planning-only) |
| `DESIGN.md` | (UI/visual only) | n/a | No |
| `next.config.ts` comments | Image loader | Accurate | No |
| `wrangler.jsonc` | `vars` block | Declared limits not enforced | Captured by DEC-02 |

No contradiction between source material and the brief was found. The one tension —
"proof-declared 4 MiB vs runtime 12/20/64 MiB" — is recorded as a P1 finding driving DEC-02, not
silenced.
