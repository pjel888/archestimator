# Executive Summary

## Recommendation

Archestimator should move from route-specific uploads to a central upload broker with private-by-default storage, server-issued upload sessions, exact object finalization, malware scanning for document attachments, durable cleanup, and provider-neutral object metadata. The current system has useful controls, but it is not production-ready for user files.

The immediate closed-beta objective is narrower than the long-term platform objective: current upload surfaces must become safe, observable, recoverable, and fail-closed before first-user exposure. Provider portability and future upload surfaces remain staged follow-on work, not blockers for Phase 0 safety hardening.

## Current Posture

What is already strong:

- Project images and component images use server-side magic-byte sniffing, Sharp decode, pixel limits, WebP conversion, thumbnails, generated object keys, and `upsert: false`.
- Estimate-sheet inline project-component reference images currently reuse the component-image route validation path.
- Project images are stored in a private bucket and served through `/api/projects/images`.
- Component attachments are private, size-limited, and checked for PDF/XLS/XLSX magic bytes.
- Path cleanup allowlists and some auth-boundary tests already exist.

What blocks production readiness:

- Project image uploads use a service-role-capable storage client after checking project existence, but the route must explicitly enforce project edit authority before storage writes.
- Direct Supabase Storage policies still allow client writes to `component-images` and `component-attachments`, bypassing app-route validation, image re-encoding, and attachment scanning.
- PDF/XLS/XLSX attachments are stored raw with no quarantine, malware scan, macro/active-content policy, or audited download route.
- Component attachment metadata can persist caller-provided bucket/path data without final object ownership and existence proof.
- Estimate-sheet inline project-component image uploads persist a public component-image URL into `estimate_row_items.source_snapshot.imageUrl`; they lack a distinct upload-surface policy, row/entity-bound asset finalization, progress/cancel semantics, and durable orphan cleanup.
- Upload UX is fragmented and lacks a shared cancel/retry/timeout/progress contract.
- Current upload tests are mostly static and boundary-focused; malicious payload, successful route contract, storage RLS, and UX-state coverage is missing.
- Component images are public by design today; this must be an explicit privacy decision before production.
- Future upload-domain tables need explicit Postgres RLS/grants, and upload endpoints need quotas/backpressure so authenticated users cannot exhaust CPU, storage, scanner, or cleanup capacity.

## Target Architecture

The target is a two-layer design:

1. **Upload broker and session layer**: validates actor authority, creates an upload session, owns object keys, applies file policy, records lifecycle status, and returns only narrow upload/read capabilities.
2. **Storage provider layer**: hides Supabase-specific public URLs and storage client calls behind provider-neutral object primitives: provider, bucket, key, metadata, checksum, read URL, signed URL, multipart/resumable upload, delete, and head.

Uploads should not be persisted from hidden form fields or public URLs. Domain rows should reference server-finalized upload asset records, and render/download URLs should be derived at read time.

## Production Readiness Bar

This plan is implementation-ready only when future work satisfies these non-negotiables:

- All service-role storage writes are preceded by explicit app-layer authorization.
- No direct client write path can bypass validation/scanning unless it is a short-lived, single-object signed session finalized by the server.
- Attachments cannot be approved, used in proposals, downloaded, or shared until scan/quarantine state passes.
- Upload metadata tables deny anon/viewer/cross-workspace access and expose only least-privilege scoped reads/mutations.
- Upload routes enforce rate limits, active-session caps, rolling byte/object quotas, and scanner backpressure before production rollout.
- Every upload surface has consistent states: selected, validating, processing, uploading, uploaded draft, saved, retryable error, blocking error, cancelled, removing, remove failed.
- Performance budgets and telemetry exist for client preflight, client resize, server transform, storage upload, download/proxy TTFB, cleanup failures, aborts, and timeouts.
- Tests cover route contracts, malicious fixtures, direct storage denial, cross-workspace path tampering, orphan cleanup, upload UI states, and provider adapter behavior.

## Implementation Shape

Implementation should be phased:

1. Lock current behavior and add missing denial/route/UX tests.
2. Add upload domain records, upload sessions, asset finalization, and provider adapter contracts.
3. Move current routes to shared validators/storage service without changing user-facing behavior.
4. Add shared upload UI primitives with progress, abort, retry, and semantic accessibility.
5. Add scanning/quarantine and audited attachment download.
6. Finish storage RLS/direct-write tightening after Phase 0 bypass containment, backfill metadata, and add durable cleanup.
7. Add provider-portability proof and performance instrumentation.

## Stop Condition For Future Implementation

Do not call the future implementation complete until project images, component images, estimate-row project-component images, and component attachments all use the broker model, all high-risk direct storage bypasses are closed, scan/download/cleanup lifecycle is tested, upload-domain table RLS/grants and quota/backpressure controls are proven, and production dashboards can show success rate, reject reasons, p95/p99 upload durations, cleanup failures, rate-limit/quota denials, and scan backlog.
