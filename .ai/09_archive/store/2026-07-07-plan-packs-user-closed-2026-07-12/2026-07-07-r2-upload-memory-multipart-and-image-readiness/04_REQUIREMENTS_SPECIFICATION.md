# 04 — Requirements Specification

Stable IDs. Categories: FR (functional), ARCH (architecture), DATA (database/storage), API
(network), SEC (security), PERF (performance), REL (reliability), OPS (operational), TEST
(testing), DOC (documentation). Priority: P0 launch-blocking / P1 important / P2 future. Source
strength tags: `brief`, `repo evidence`, `official docs`, `provider proof`, `assumption`,
`derived`, `owner-delegated decision`.

## File-size classes (first-user → future)

| Class | Example | Current cap | Target first-user cap | Future cap |
|---|---|---|---|---|
| Tiny image | project/estimate/component thumbnail | 12 MiB (hardcoded) | 4 MiB (`ARCH_UPLOAD_HOSTED_BODY_LIMIT_BYTES`) | unchanged |
| Document attachment | component PDF/XLS/XLSX | 20 MiB (hardcoded) | 4 MiB (single enforced) or owner-set | unchanged |
| Direct signed single-part | resumable attachment | 64 MiB − 1 (buffered) | stream ≤ 4 MiB first-user; multipart path for larger | multipart 5 GiB (single PUT) / 5 TiB (multipart) |
| Large file | future BIM/CAD export | n/a (501) | out of first-user scope | DEC-03 multipart |

## Requirement list

### FR-01 — Stream upload bodies to R2 (memory safety) [P0]
- **Statement:** Every inbound file-upload route writes the request body to R2 via
  `ReadableStream` (or `file.stream()` from a minimal `formData()`), not via
  `Buffer.from(await file.arrayBuffer())`, except where image processing genuinely requires bytes.
- **Rationale:** 128 MB isolate is shared across concurrent requests; buffering whole bodies causes
  isolate eviction (`Memory limit would be exceeded before EOF`). Official streaming pattern
  (`env.BUCKET.put(key, request.body)`) is free-tier-supported (`19`).
- **Source:** `brief` ("upload memory safety") + `official docs` (Workers Limits 2026-07-05; R2
  Workers API ref) + `repo evidence` (§D buffering sites).
- **Acceptance criteria:**
  - AC-FR-01a: `UploadStorageProvider.uploadObject` accepts `ReadableStream | Buffer | Uint8Array`.
  - AC-FR-01b: Each of the 5 upload routes passes a stream to `uploadObject` for the primary write.
  - AC-FR-01c: A unit/DOM test asserts no `arrayBuffer()`/`text()`/`Buffer.from(await …arrayBuffer())`
    on the request body in the streaming paths (grep-deny or behavior test).
  - AC-FR-01d: Image routes may buffer only the bytes needed for transformation, and the max buffered
    bytes ≤ `ARCH_UPLOAD_HOSTED_BODY_LIMIT_BYTES`.
- **Validation:** vitest on streaming provider + route; `bun run type-check`; see `12` TEST-FR-01.
- **Affected code:** `storage-provider.ts`, `r2-storage-provider.ts`, all 5 routes in §B.
- **Risks:** `formData()`-consumes-body trap; image-transform needs bytes; client abort semantics.
- **Status:** Resolved (recommended).

### FR-02 — Single enforced body-limit source of truth [P1]
- **Statement:** `ARCH_UPLOAD_HOSTED_BODY_LIMIT_BYTES`,
  `ARCH_UPLOAD_HOSTED_MEMORY_MB`, `ARCH_UPLOAD_HOSTED_ROUTE_DURATION_MS`,
  `ARCH_UPLOAD_HOSTED_CONCURRENT_UPLOADS`, `ARCH_UPLOAD_STORAGE_LATENCY_P95_MS` are the single
  enforced source of truth on all real upload routes, replacing hardcoded `12/20/64 MiB`.
- **Rationale:** Today the proof-declared 4 MiB ≠ enforced 12/20/64 MiB; first-user "max upload"
  has three answers.
- **Source:** `repo evidence` (§E) + `derived`.
- **Acceptance criteria:**
  - AC-FR-02a: Each route reads the cap from env (with a safe fallback) and rejects oversize before
    buffering (content-length pre-check + post-stream size check).
  - AC-FR-02b: A test proves changing the env var changes the enforced cap.
  - AC-FR-02c: Admission concurrency uses the env `…CONCURRENT_UPLOADS` value.
- **Validation:** vitest parametrized over env values; see `12` TEST-FR-02.
- **Affected code:** all 5 routes, `admission-control.ts`, `policy.ts`.
- **Risks:** Lowering images from 12 MiB to 4 MiB is a behavior change — must be owner-acknowledged
  (OPEN-01).
- **Status:** Resolved (recommended); OPEN-01 owner ack for the image-cap delta.

### FR-03 — Real R2 multipart for direct uploads [P1, owner-delegated]
- **Statement:** The direct-upload path implements real R2 multipart
  (`createMultipartUpload`/`uploadPart`/`complete`/`abort`/`resumeMultipartUpload`) above a
  documented size threshold, replacing the current 501 for `multipart_resumable`.
- **Rationale:** Free-tier-supported; raises ceiling from 5 GiB (single PUT) to 5 TiB; enables
  resumable large uploads. `provider-portability.ts` already models the session shape.
- **Source:** `brief` ("multipart/large-file strategy") + `official docs` (R2 Limits 2026-06-08;
  R2 workers-multipart-usage) + `repo evidence` (session-strategy 501).
- **Acceptance criteria (if owner enables, DEC-03):**
  - AC-FR-03a: `R2UploadStorageProvider` implements `createMultipartUpload`/`uploadPart`/`complete`.
  - AC-FR-03b: `chooseUploadSessionStrategy` returns `multipart_resumable` above threshold and the
    route executes it (no 501).
  - AC-FR-03c: Part size within 5 MiB–5 GiB; parts ≤ 10,000; object ≤ 5 TiB.
  - AC-FR-03d: Abort on client cancel/finalize-failure removes partial parts (or documents
    retention).
  - AC-FR-03e: Operation-count budget vs free-tier Class A quota modeled (`20`).
- **Validation:** vitest multipart harness; `12` TEST-FR-03.
- **Affected code:** `r2-storage-provider.ts`, `provider-portability.ts`, `session-strategy.ts`,
  `direct-upload/route.ts`, `direct-upload-records.ts`, `component-attachment-client.ts`.
- **Risks:** Operation-count cost; partial-upload cleanup; client complexity.
- **Status:** Owner-delegated (DEC-03). If owner defers, retain 501 with honest message + cap
  first-user files at single-PUT ceiling.

### FR-04 — R2 `customMetadata` on every object [P2]
- **Statement:** Every R2 `put` writes `customMetadata` (workspace_id, actor_user_id, surface,
  upload_session_id, checksum_sha256 prefix, content_type, created_at).
- **Rationale:** Object-level audit/lifecycle hooks; enables list-based orphan reconciliation.
- **Source:** `repo evidence` (§H no customMetadata) + `derived`.
- **Acceptance criteria:**
  - AC-FR-04a: `CloudflareR2UploadBucket.put` options type models `customMetadata`.
  - AC-FR-04b: Every `put` call site passes the documented metadata fields.
  - AC-FR-04c: Test asserts metadata present on a written object (provider proof).
- **Validation:** vitest provider test; `12` TEST-FR-04.
- **Affected code:** `r2-storage-provider.ts`, `upload-records.ts`, all routes.
- **Risks:** Metadata size limits (R2 allows generous but finite).
- **Status:** Resolved (recommended).

### FR-05 — Bounded R2 `list` for orphan reconciliation [P2]
- **Statement:** `UploadStorageProvider` gains a bounded `list({ prefix, limit, cursor })` used by
  the cleanup job to reconcile R2 objects against D1 truth and delete orphans.
- **Rationale:** Today orphan cleanup relies on D1 row truth; if D1/R2 drift, objects leak silently.
- **Source:** `repo evidence` (§H no list) + `derived`.
- **Acceptance criteria:**
  - AC-FR-05a: `list` returns keys + metadata, paginated, capped at a safe page size.
  - AC-FR-05b: Cleanup job has a reconciliation mode that flags R2 objects with no matching D1 row.
  - AC-FR-05c: Reconciliation is dry-run-by-default with explicit enable to delete.
- **Validation:** vitest cleanup test; `12` TEST-FR-05.
- **Affected code:** `storage-provider.ts`, `r2-storage-provider.ts`, `cleanup-job.ts`.
- **Risks:** Class B operation cost on large buckets; must cap frequency.
- **Status:** Resolved (recommended).

### FR-06 — Reconcile 3rd-cron retention with R2 deletion [P1]
- **Statement:** The `30 3 * * *` retention pass deletes the R2 objects for `uploads_orphaned` /
  `sessions_expired` classes, not just D1 rows.
- **Rationale:** Today `runRetentionPassInD1(env.ARCH_DB, undefined, …)` passes `undefined` storage
  provider — D1 tombstones but R2 objects leak.
- **Source:** `repo evidence` (§I) + `derived`.
- **Acceptance criteria:**
  - AC-FR-06a: `worker.ts` scheduled `30 3` passes a real storage provider to the retention pass.
  - AC-FR-06b: Retention pass deletes R2 objects for purged rows and records the outcome in
    `data_retention_events`.
  - AC-FR-06c: Dry-run mode still available via `CLOUDFLARE_UPLOAD_JOBS_DRY_RUN`.
- **Validation:** vitest on scheduled path; `12` TEST-FR-06.
- **Affected code:** `worker.ts`, `src/lib/cloudflare/scheduled-upload-jobs.ts`,
  `src/lib/compliance/retention-core` (read-only confirm).
- **Risks:** Destructive; must stay dry-run-default and bound by retention cutoffs.
- **Status:** Resolved (recommended).

### FR-07 — Scanner posture documented honestly [P1]
- **Statement:** The default policy scanner is documented as a first-user content-validation floor
  (EICAR + content-type + macro rejection), **not** antivirus. ClamAV is the documented upgrade
  (`UPLOAD_SCAN_PROVIDER=clamd`). Cloudflare CDR is recorded as a future paid option.
- **Rationale:** Default must not be presented as malware protection; trust posture must be honest.
- **Source:** `repo evidence` (§F) + `official docs` (ClamAV; Cloudflare CDR product page).
- **Acceptance criteria:**
  - AC-FR-07a: `08_SECURITY_PRIVACY_THREAT_MODEL.md` and `18_STACK_CONTRACT` state the default is
    not real AV.
  - AC-FR-07b: An operational doc/runbook records how to enable ClamAV (host, port, secret) within
    free-tier Worker constraints (clamd over `node:net` to a reachable endpoint).
  - AC-FR-07c: Scan-gating remains attachment-only by policy; images stay `not_required` (decision
    documented) unless owner widens.
- **Validation:** doc review + existing `upload-scan-*` tests stay green; `12` TEST-FR-07.
- **Affected code:** none (doc) + optional env note in `wrangler.jsonc` comments.
- **Risks:** ClamAV reachability from Workers isolate (network egress); Cloudflare CDR is paid.
- **Status:** Resolved (recommended); ClamAV enablement is owner decision (OPEN-02).

### FR-08 — Cloudflare Images production readiness decision [P2, owner-delegated]
- **Statement:** Decide (owner) whether production image processing uses the `IMAGES` binding
  (`ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER=cloudflare-images`) or keeps `sharp`. If binding: stream
  output to R2; honor 20 MB input cap and 5,000 transforms/month free quota.
- **Rationale:** Binding declared but unused at runtime; `sharp` stubbed in Workers proof build →
  first-user image uploads may 501 unless provider set or sharp restored.
- **Source:** `brief` ("Cloudflare Images readiness") + `repo evidence` (§G) + `official docs`
  (Images binding 2026-06-16).
- **Acceptance criteria (if owner flips to binding, DEC-07):**
  - AC-FR-08a: `server-image-processing.ts` streams the binding `Response` body to R2 `put(stream)`.
  - AC-FR-08b: Input > 20 MB rejected before binding call.
  - AC-FR-08c: Transform quota monitor (count transforms/day) with alert near free quota.
  - AC-FR-08d: `sharp` removed or retained only as documented fallback.
- **Acceptance criteria (if owner keeps sharp):**
  - AC-FR-08e: sharp restored for Workers runtime (or a documented Workers-compatible image lib),
    and `sharp-cloudflare-stub.ts` no longer 501s first-user image uploads.
- **Validation:** `cf:provider-proof` Images path; vitest on processing; `12` TEST-FR-08.
- **Affected code:** `server-image-processing.ts`, `sharp-cloudflare-stub.ts`, `next.config.ts`,
  `wrangler.jsonc` (var), possibly `package.json` (sharp dep).
- **Risks:** Images free-quota exhaustion; sharp Workers-compat; bundle size (sharp is heavy).
- **Status:** Owner-delegated (DEC-07).

### ARCH-01 — Server/Client boundary unchanged on upload routes [P0]
- **Statement:** Upload routes stay `runtime = "nodejs"` Route Handlers (Server); no upload logic
  moves to Client Components. `"use client"` boundaries unchanged.
- **Rationale:** Routes need R2/D1/server secrets; client only orchestrates via `client-upload.ts`.
- **Source:** `repo evidence` (§B) + `derived`.
- **Acceptance criteria:** AC-ARCH-01a: No new `"use client"` on upload server code; secrets stay
  server-only.
- **Validation:** static review; `12` TEST-ARCH-01.
- **Status:** Resolved (constraint).

### ARCH-02 — Storage-provider port widened, not forked [P0]
- **Statement:** `UploadStorageProvider` is widened (stream input, optional `list`, `customMetadata`,
  optional multipart) without forking a second provider. R2 remains the only runtime provider.
- **Rationale:** Single port keeps provider-portability tests meaningful; avoids abstraction sprawl.
- **Source:** `repo evidence` (`runtime-storage-provider.ts` R2-only) + Karpathy simplicity overlay.
- **Acceptance criteria:** AC-ARCH-02a: One `UploadStorageProvider` interface; R2 implements all
  relevant optional methods.
- **Validation:** type-check + provider-portability tests; `12` TEST-ARCH-02.
- **Status:** Resolved (recommended).

### DATA-01 — No schema change required for FR-01/02/04/05/06/07 [P0]
- **Statement:** Streaming, enforced limits, customMetadata, list, retention reconciliation, and
  scanner-posture docs require **no D1 migration**. Existing `upload_sessions/assets/events` +
  `data_retention_events` schema suffices.
- **Rationale:** Minimize blast radius; schema already models scan status, retention classes,
  metadata_json.
- **Source:** `repo evidence` (§J).
- **Acceptance criteria:** AC-DATA-01a: No new migration file introduced by FR-01/02/04/05/06/07.
- **Validation:** `git status` after implementation shows no new `migrations/0041_*` (or whichever next-free number is confirmed at impl time).
- **Status:** Resolved (constraint).

### DATA-02 — Optional migration `0041` only if FR-03 multipart part rows needed [P1, conditional]
- **Statement:** If DEC-03 enables multipart and the implementation needs durable part-tracking, a
  single additive migration `0041_upload_multipart_parts.sql` (next free number; `0040_operational_incidents.sql`
  is owned by a concurrent lane — re-confirm at impl time) may add an `upload_multipart_parts`
  table (upload_session_id, part_number, etag, size_bytes, uploaded_at). Otherwise none.
- **Rationale:** Multipart part state must survive isolate restarts for resume.
- **Source:** `derived` + `official docs` (R2 multipart resume).
- **Acceptance criteria:** AC-DATA-02a: If added, migration is additive, ordered after `0039`,
  reversible (DROP TABLE), with rollback documented.
- **Validation:** `cf:inventory`; migration dry-run; `07` blueprint.
- **Status:** Conditional on DEC-03.

### API-01 — Upload route DTOs and error contracts [P1]
- **Statement:** Each upload route returns a typed DTO with explicit error statuses (413 oversize,
  415 unsupported type, 409 scan-pending/denied, 501 unsupported-strategy, 503 storage/backpressure).
- **Rationale:** First-user error UX must be unambiguous.
- **Source:** `derived` + `repo evidence` (existing 409 scan gate).
- **Acceptance criteria:** AC-API-01a: Error responses include a stable code string + safe message;
  no raw bytes/paths leaked.
- **Validation:** vitest route tests; `12` TEST-API-01.
- **Status:** Resolved (recommended).

### SEC-01 — Upload authz at server boundary, every route [P0]
- **Statement:** Every upload POST/PUT/GET/DELETE authorizes via existing `d1-access.ts` predicates
  (project/estimate/library/workspace) before any R2 read/write. Direct-upload sessions verify
  `profile.id === currentUser.userId` + durable capacity.
- **Rationale:** Server boundary enforcement; no client-trusted ownership.
- **Source:** `repo evidence` (§K).
- **Acceptance criteria:** AC-SEC-01a: Denial tests prove cross-workspace/cross-project upload
  rejected; direct-upload session hijack rejected.
- **Validation:** vitest role-matrix; `12` TEST-SEC-01.
- **Status:** Resolved (constraint; mostly already implemented — verify, don't regress).

### SEC-02 — Content-type + magic-byte + scan gating consistent [P1]
- **Statement:** Inline magic-byte sniff + declared content-type cross-check retained; scan gate
  (attachment-only) retained; scan-override path (platform-admin) retained.
- **Source:** `repo evidence` (§F).
- **Acceptance criteria:** AC-SEC-02a: Existing `upload-attachment-scan-freeze`,
  `uploads-policy-scanner-eicar` tests stay green.
- **Validation:** existing tests; `12` TEST-SEC-02.
- **Status:** Resolved (constraint).

### SEC-03 — Path-traversal and object-key safety retained [P0]
- **Statement:** `assertSafeStoragePath` + `assertSafeLogicalBucket` + per-route path ownership
  checks retained; streaming/multipart paths pass through the same validators.
- **Source:** `repo evidence` (§H).
- **Acceptance criteria:** AC-SEC-03a: Existing `cloudflare-r2-storage-provider` unsafe-identifier
  tests stay green; new stream/multipart paths reuse validators.
- **Validation:** existing tests; `12` TEST-SEC-03.
- **Status:** Resolved (constraint).

### PERF-01 — Upload memory budget ≤ env-declared [P0]
- **Statement:** Peak buffered bytes per upload request ≤ `ARCH_UPLOAD_HOSTED_BODY_LIMIT_BYTES`
  (after FR-01/02), so concurrent uploads cannot exceed isolate memory under admission caps.
- **Source:** `official docs` (128 MB isolate) + `derived`.
- **Acceptance criteria:** AC-PERF-01a: A memory-pressure test/harness asserts peak buffered bytes.
- **Validation:** vitest/profiling; `09` evaluator; `12` TEST-PERF-01.
- **Status:** Resolved (recommended).

### PERF-02 — Storage latency P95 ≤ env-declared [P1]
- **Statement:** R2 put/get P95 ≤ `ARCH_UPLOAD_STORAGE_LATENCY_P95_MS` (250 ms) under first-user
  load; monitored via `cf:verify-hosted-performance` or Workers Observability.
- **Source:** `repo evidence` (`wrangler.jsonc` var) + `official docs`.
- **Acceptance criteria:** AC-PERF-02a: Perf evaluator names baseline/target/harness/regression
  threshold (`09`).
- **Validation:** hosted perf script; `12` TEST-PERF-02.
- **Status:** Resolved (recommended); hosted proof gap recorded.

### REL-01 — Upload retry/idempotency/dedup [P1]
- **Statement:** Upload finalize is idempotent (same upload_session_id → same asset, no duplicate
  R2 object); retries safe; DLQ handles poison messages; client-abort cleans up partial state.
- **Source:** `repo evidence` (§I queue idempotency) + `derived`.
- **Acceptance criteria:** AC-REL-01a: Duplicate finalize returns existing asset; aborted direct
  upload leaves no orphan R2 object after retention window (or sooner via abort).
- **Validation:** vitest concurrency/dedup; `12` TEST-REL-01.
- **Status:** Resolved (recommended).

### OPS-01 — Upload operational runbook [P1]
- **Statement:** Runbook documents: how to enable ClamAV, how to enable multipart, how to run orphan
  reconciliation, how to read `data_retention_events`, rollback for each phase.
- **Source:** `derived` + `repo evidence`.
- **Acceptance criteria:** AC-OPS-01a: `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` contains the runbook.
- **Validation:** doc review.
- **Status:** Resolved (recommended).

### TEST-01 — Upload test coverage matrix complete [P0]
- **Statement:** Every FR/SEC/PERF requirement maps to a named test in `12` Test Execution Matrix.
- **Source:** `Creating-Plan-Prompt.md` §8A.
- **Acceptance criteria:** AC-TEST-01a: `12` matrix has no "manual QA only" rows without steps.
- **Validation:** `12` completeness.
- **Status:** Resolved (recommended).

### DOC-01 — Stack contract + research evidence complete [P1]
- **Statement:** `18_STACK_CONTRACT` + `19_RESEARCH` capture all stack/provider decisions and
  research citations.
- **Source:** `Creating-Plan-Prompt.md` §9.
- **Acceptance criteria:** AC-DOC-01a: Both docs complete with citations.
- **Validation:** doc review.
- **Status:** Resolved (recommended).

## Shadow path matrix — upload flows

Applies to: image upload (POST `/api/projects/images`, `/api/estimate-row-images`,
`/api/component-library/images`); attachment upload (POST
`/api/component-library/attachments`); direct upload (POST create/finalize + PUT
`/api/component-library/attachments/direct-upload`).

| Flow | Happy path | Nil/missing input | Empty input/result | Invalid input | Auth denied | Upstream/network error | Concurrency/race | Retry/idempotency | User-visible result | Test |
|---|---|---|---|---|---|---|---|---|---|---|
| Image upload (stream) | stream→R2→asset→webp+thumb | 400 no file | 400 empty file | 415 bad magic-byte/MIME | 403 `canEdit*` | 503 storage/backpressure (admission) | admission cap 429; isolate mem OK after FR-01 | re-POST creates new asset | success card / inline image | TEST-FR-01 |
| Attachment upload (stream + scan) | stream→R2→asset(scan pending)→cron scan→clean→downloadable | 400 no file | 400 empty | 415 bad magic-byte | 403 `canManageLibrary` | 503 storage; scan job retry | admission cap 429 | re-POST new asset; scan idempotent by checksum | pending → ready (or blocked) | TEST-FR-07/SEC-02 |
| Direct single-part PUT (stream) | create session→PUT stream→finalize | 400 no session | 400 empty | 413 >cap; 415 type mismatch | 403 not owner | 503 storage; session expiry | durable capacity D1 INSERT; concurrent PUT same session rejected | finalize idempotent | success card | TEST-FR-02/REL-01 |
| Direct multipart (if DEC-03) | create→uploadPart×n→complete | 400 no session | 400 empty part | 413 part>5GiB/obj>5TiB; too many parts | 403 not owner | 503 storage; abort on failure | per-session capacity; part resume by etag | complete idempotent | progress → success | TEST-FR-03 |
| Scan job | list pending→download stream→scan→write status | n/a | 0 pending | scanner error → `failed_transient`/`failed_permanent` | bearer secret 401 | clamd unreachable → transient + DLQ | per-minute idempotency key | dedup by idempotency key | asset clean/blocked/override | TEST-FR-07/REL-01 |
| Cleanup/retention | cron→list eligible→delete R2→events | 0 eligible | n/a | unsafe target rejected | bearer secret 401 | R2 delete fail → failed event | chunked 100; idempotency key | re-run safe | R2+D1 reconciled | TEST-FR-05/FR-06 |

## Credential material taxonomy (upload-adjacent)

| Material | Raw/hash/encrypted/derived/public marker | Created by | Stored in | Read by | Client-visible? | Used for URL/cookie/session? | Rotation/revocation | Proof |
|---|---|---|---|---|---|---|---|---|
| Upload session id | public marker (UUID) | `recordPendingUploadSession` | `upload_sessions.id` | finalize route, scan job | yes (client orchestrator) | URL `?uploadSessionId=` | expires_at | route tests |
| Scan override token | n/a (platform-admin auth-gated action, no new token) | `approveUploadScanOverrideInD1` | `upload_assets.scan_override_*` | admin route | no | no | `scan_override_expires_at` | `upload-scan-override-route.test.ts` |
| Direct upload signed URL | app-owned (points back to same route, not a raw R2 presign) | `createSignedUpload` | returned in DTO | client PUT | yes | URL | session expiry 300s | `upload-signed-route.test.ts` |
| Cron bearer secrets | raw secret (env) | operator | Workers secrets | internal routes | no | bearer header | operator rotation | `verify-hosted-upload-operations` |

No raw R2 presigned URLs are issued (the "signed" URL is app-owned, re-entering the Worker). No
raw file bytes, checksums beyond prefixes, or PII appear in this pack.
