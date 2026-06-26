# Performance Reliability Observability

## Current Bottlenecks

- Image routes read the full file into memory and run metadata plus two Sharp pipelines for full image and thumbnail.
- Component images may resize in the browser, then server still performs full Sharp decode/resize.
- Attachment route reads up to 20 MB into memory and scans the whole buffer for XLSX markers.
- Project upload progress reports browser upload bytes only, caps at 95, and does not reflect server processing/storage upload.
- Fetch-based component uploads have no progress, abort, timeout, or retry behavior.
- Estimate-row project-component image uploads use the same fetch-based component image route from a modal, so row edits can show only busy/error copy while server processing and cleanup remain invisible.
- Draft cleanup is best effort and can silently leave orphaned objects.

## Execution Environment Assumptions To Confirm

Before implementation sets hard budgets or rollout flags, capture the real runtime profile:

- deployment target, memory limit, CPU allocation, max request body size, and max route duration for upload routes;
- expected concurrent uploads per instance and per workspace;
- Supabase Storage regional latency from the app runtime;
- Sharp concurrency/cache settings, libvips memory behavior, and whether image transforms run in-process or in a worker/job;
- attachment scanner runtime limits, queue concurrency, and max retry age;
- provider rate limits and error classes for put/head/delete/signed URL operations.

Until those facts are recorded, the budgets below are acceptance targets, not proof that the current deployment can safely absorb peak upload load.

## Performance Budgets

| Metric | Budget | Notes |
|---|---:|---|
| Client preflight reject invalid type/size | p95 `<50 ms` | No network call. |
| First upload progress update | `<250 ms` | For network-uploading flows. |
| Client image resize 12 MP | p95 `<750 ms` | Visible processing state. |
| Client image resize 24 MP | p95 `<1.5 s` | Consider worker/off-main-thread if exceeded. |
| Server image route duration | p95 `<2.5 s`, p99 `<5 s` | 12 MB/24 MP max source. |
| Server image hard timeout | `<15 s` | Return retryable/server busy where safe. |
| Per-upload server memory | `<150 MB` peak target | Cap Sharp concurrency per instance. |
| Attachment upload route | p95 `<2 s` for 20 MB server-mediated store excluding network | If exceeded, move to signed upload + finalize. |
| Project thumbnail proxy TTFB | warm p95 `<300 ms`, cold p95 `<800 ms` | Private cache and storage dependency. |
| Stalled upload timeout | `30 s` no progress | Surface retry/cancel. |
| Total client upload timeout | `60 s` for current file caps | Larger flows should be resumable. |
| Cleanup retry latency | first retry `<5 min` | Orphan cleanup cannot be silent. |

## Abuse And Backpressure Budgets

Exact values are set after Phase 0 runtime profiling, but production rollout must define conservative limits for:

- maximum active upload sessions per actor;
- maximum active upload sessions per workspace;
- per-actor and per-workspace rolling bytes uploaded per hour/day;
- per-surface object count per hour/day;
- per-IP request rate before body parsing;
- scanner queue max age and max queued bytes;
- cleanup backlog max age and max failed deletes.

When limits are hit, routes return a classified retryable response such as `429` with retry guidance where safe. They must not continue reading large request bodies, running Sharp, writing storage objects, or enqueueing scanner work after a quota/backpressure denial.

## Reliability Requirements

- Upload requests have idempotency keys.
- Client helpers expose `abort`, `timeout`, retryable error classification, and finalization status.
- Server validation failures are non-retryable; transient storage/network failures are retryable once by the client and then queued for cleanup if needed.
- Sharp decode/validation failures never retry automatically.
- Cleanup is idempotent and durable through session/asset records.
- Storage provider outages return clear retryable errors and do not attach incomplete assets.
- Signed URLs have short TTL and can be reissued by authorized routes.
- Direct upload sessions expire quickly and are not finalizable after expiry.
- Finalization uses object-head checks before domain attachment; retries are idempotent only when key/checksum/session match.
- Upload rate-limit and quota decisions are made before expensive body parsing/transforms where possible.
- Scanner queue backpressure freezes approval/download/use instead of accepting unbounded pending files.

## Observability Events

Emit structured events without secrets or file contents:

- `upload_session_created`
- `upload_validation_rejected`
- `upload_started`
- `upload_client_aborted`
- `upload_client_timeout`
- `upload_server_processing_started`
- `upload_server_processing_finished`
- `upload_storage_put_finished`
- `upload_finalized`
- `upload_scan_started`
- `upload_scan_finished`
- `upload_download_issued`
- `upload_cleanup_queued`
- `upload_cleanup_failed`
- `upload_cleanup_succeeded`
- `upload_rate_limited`
- `upload_quota_exceeded`
- `upload_backpressure_rejected`

Required dimensions:

- `surface`
- `workspace_id` hash or safe internal ID
- `content_type`
- `size_bucket`
- `duration_ms`
- `original_bytes`
- `stored_bytes`
- `status`
- `reject_reason`
- `provider`
- `retry_count`
- `scan_status`
- `quota_class`
- `backpressure_reason`

Do not log:

- signed URLs
- provider credentials
- raw file content
- unredacted filenames when they may contain client data
- user-supplied path strings except sanitized hash/key IDs

## Dashboards

Minimum dashboards:

- Upload success/failure/reject rate by surface.
- P50/P95/P99 upload, processing, storage, scan, and download durations.
- Storage cleanup backlog and failures.
- Scan queue backlog, failures, and infected/rejected count.
- Private image proxy TTFB and error rate.
- Direct storage policy denial proof status from staging/local proof runs.
- Rate-limit/quota denials by actor/workspace/surface.
- Active upload session counts and scanner backpressure events.

## Performance Test Strategy

- Unit tests assert limits: 12 MB image, 24 MP image, 1600 max edge, 512 thumbnail, 20 MB attachments, `cacheControl: "31536000"` where retained.
- Route tests assert content-length oversize rejects before body parsing.
- Microbench/evaluator scripts measure Sharp duration and memory against fixture sizes.
- DOM tests check progress state transitions; browser proof only when verifying real progress/cancel behavior.
- Provider adapter tests simulate transient storage failure and cleanup retry.
- Staging/provider proof is separate from local/fake-provider tests and must include concurrent upload and cleanup scenarios before production rollout.
- Abuse tests simulate repeated max-size uploads, concurrent session creation, scanner backlog, and quota reset windows.
