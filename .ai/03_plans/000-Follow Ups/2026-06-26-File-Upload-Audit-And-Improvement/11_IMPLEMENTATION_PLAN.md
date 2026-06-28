# Implementation Plan

## Phase 0 - Lock Current Behavior And Close Immediate P0 Gaps

Goal: prevent regressions before refactor.

Tasks:

1. Add route contract tests for current project image, component image, estimate-row image caller, and attachment success/failure responses.
2. Add malicious fixture tests for MIME/magic mismatch, fake XLSX, oversized content-length, empty file, bad image dimensions, and traversal paths.
3. Add explicit project edit authorization to project image POST/DELETE before service-role storage access.
4. Add explicit component/library edit authorization before component image and attachment storage writes.
5. Add focused coverage for the estimate-row `Reference image` modal using `/api/component-library/images`, including row `sourceSnapshot.imageUrl` update and project-component projection render.
6. Add tests for viewer/project-member denial, cross-workspace denial, stale row/session denial, and stale/expired upload-session denial.
7. Disable broad direct storage write/update/delete capability for `component-images` and `component-attachments`. If disabling is impossible because a live path depends on direct upload, stop Phase 0 until the full signed-session/finalization/proof minimum from `06_ARCHITECTURE...` is implemented for that path.
8. Run provider-backed storage proof for direct write/update/delete denial. If provider proof cannot run locally, mark the release gate blocked rather than treating static migration review as proof.
9. Capture the runtime profile for current upload routes: deployment memory, CPU, body-size limit, route-duration limit, Sharp concurrency/cache settings, expected concurrent uploads, and storage latency.
10. Run a small Sharp/upload smoke benchmark for representative image and attachment fixtures before committing to broad server-mediated rollout.
11. Freeze or fail-close attachment approval, download, and use while scan status is missing. If scanner implementation is not yet available, closed beta may store attachments as pending evidence but must not approve/download/use them.
12. Define temporary closed-beta rate limits and active-upload caps based on the runtime profile; enforce them before expensive work where possible.

Exit evidence:

- Targeted upload route tests pass.
- Authz denial tests pass.
- Direct storage bypass is closed, or a temporary direct-upload path has the full signed-session/finalization/proof controls already implemented.
- Provider-backed storage proof is captured or listed as a release blocker.
- Runtime profile and smoke benchmark are recorded; broad rollout is blocked if current caps exceed memory, duration, or concurrency limits.
- Estimate-row image modal upload/update/projection path is locked by tests before refactor.
- Attachment approval/download/use cannot proceed for unscanned files unless an audited override path already exists.
- Temporary rate limits and active-upload caps exist or production upload enablement is blocked.
- No existing UI response shape breaks.

## Phase 1 - Upload Domain Contracts

Goal: introduce shared contracts without changing UI behavior.

Tasks:

1. Create upload policy registry.
2. Create provider-neutral object key builder.
3. Create validator modules for images and attachments.
4. Create `StorageProvider` interface and Supabase adapter for current server-mediated routes only: put, head, remove, private/proxied read URL, checksum/head metadata, overwrite semantics, and error taxonomy.
5. Add upload asset/session types and tests.
6. Add lightweight fake-provider tests for the Phase 1 adapter contract before any dual-write migration depends on the adapter.

Exit evidence:

- Policy registry tests pass.
- Provider adapter tests pass.
- Existing routes can call shared validators behind feature flag or internal switch.

## Phase 2 - Data Model And Dual Write

Goal: make server-owned upload records canonical.

Tasks:

1. Add `upload_sessions`, `upload_assets`, `upload_events`.
2. Add nullable asset references to attachment rows and project/component/estimate-row image metadata path.
3. Dual-write asset records from existing upload routes.
4. Backfill existing objects where object-head verification is possible.
5. Add scan status fields as nullable/default-pending first; do not enforce `scan_status = clean` until scanner/backfill exists.
6. Add constraints after object-head backfill and scan/backfill readiness.
7. Enable RLS on upload-domain tables, revoke anon/public defaults, grant only least-privilege scoped access, and route mutations through app/server or security-definer paths with state-transition checks.
8. Add component-image asset target columns: variant/price-option `image_asset_id`, `thumbnail_asset_id`, and item-level thumbnail asset reference; keep legacy path fields during dual-write.
9. Add estimate-row project-component image asset target or descriptor path; keep row `sourceSnapshot.imageUrl` as resolver-produced compatibility data until readers migrate.

Exit evidence:

- Migration applies locally.
- Existing UI still works.
- Asset rows exist for new uploads.
- Backfill report lists verified, missing, and skipped objects.
- Upload table RLS/grant tests deny anon, viewer, direct client mutation, and cross-workspace access.
- Component image asset IDs and legacy path fields dual-read through the compatibility resolver.

## Phase 3 - Brokered Routes

Goal: move all current route logic through the broker.

Tasks:

1. Refactor `/api/projects/images` into broker-backed upload/download/delete.
2. Refactor `/api/component-library/images` into broker-backed upload/delete.
3. Refactor `/api/component-library/attachments` into broker-backed upload/delete.
4. Preserve current JSON fields while adding `assetId`, `sessionId`, and status fields.
5. Move project/component domain actions away from raw bucket/path inputs; accept `assetId` or `sessionId` and perform server-side finality checks.
6. Introduce a URL resolver compatibility layer that can render both legacy Supabase URL/path data and new asset descriptors.
7. Add partial failure cleanup tests.
8. For legacy clients that do not send session or idempotency data, compatibility routes server-generate sessions/idempotency keys and return the generated identifiers without breaking response shape.

Exit evidence:

- Existing route/UI tests pass.
- New contract tests pass.
- Orphan cleanup tests pass.

## Phase 4 - Shared Upload UX

Goal: align user-visible upload behavior.

Tasks:

1. Build shared upload state machine and components.
2. Add abort/timeout/retry to project image client and component upload clients.
3. Replace project create/edit image controls.
4. Replace component image, estimate-row project-component image, and attachment controls.
5. Add attachment scan/review/download badges and blocked-state copy.
6. Remove or harden legacy `NewComponentForm` FileReader path.
7. Keep real Download/Approve actions disabled or feature-flagged until Phase 5 scan/download gates exist; Phase 4 may only render unavailable states and copy.

Exit evidence:

- DOM tests cover state transitions, semantic progress, retry/cancel, stale-save guard, and attachment status rows.
- Keyboard and screen-reader status associations are covered.
- 360px/mobile layout, reduced-motion, non-color status, and tab-order proof are covered by DOM/static checks or targeted browser proof when required.

## Phase 5 - Scanning, Quarantine, And Audited Downloads

Goal: make documents safe before use.

Tasks:

1. Choose scanner/CDR strategy with documented tradeoffs.
2. Add scan queue/job and `scan_status` transitions.
3. Block approval/current/download until clean.
4. Add attachment download route with short-TTL signed URL or streaming.
5. Emit `download_url_issued` event.
6. Add safe headers and filename sanitization.
7. Implement fail-closed scanner statuses: pending, clean, infected, failed_transient, failed_permanent, unsupported, and override_approved.
8. Implement admin/security override only with actor, reason, expiry, asset hash, and audit event.
9. Backfill existing attachment scan state or quarantine/block legacy approved attachments until clean or audited override-approved.

Exit evidence:

- Scan-gate tests pass.
- Download route tests pass.
- Pending, infected, failed_transient, failed_permanent, and unsupported attachments cannot be approved/downloaded.
- Scanner failure and override tests pass.
- Legacy approved/current attachments cannot be downloaded or used unless clean or audited override-approved.

## Phase 6 - Storage Policy Tightening And Cleanup

Goal: close direct-provider bypass and orphan risks.

Tasks:

1. Finish policy tightening for `component-images` and `component-attachments` after Phase 0 direct-write closure and broker route migration.
2. Add env-gated storage RLS proof.
3. Add upload session TTL cleanup job.
4. Extend bulk cleanup/reporting to upload assets.
5. Decide and implement component archive retention policy.
6. Prove the URL resolver renders both legacy and asset-backed component images, including estimate-row project-component images, in estimates/publications.
7. Migrate component image render path to private/proxied by default unless a written product/security exception keeps a public derivative.

Exit evidence:

- Storage proof shows cross-workspace and direct-write denial.
- Component image privacy migration has resolver/backfill proof before public URLs are withdrawn.
- Cleanup dashboard/test shows failed cleanup is retried and audited.

## Phase 7 - Provider Portability And Performance Proof

Goal: prove storage provider can be swapped at the adapter boundary.

Tasks:

1. Add extended adapter contract tests for Supabase and fake S3-like provider, including signed upload URL semantics and multipart/resumable behavior where supported.
2. Run provider migration dry-run against asset descriptors created by earlier phases.
3. Add metrics/dashboard emission.
4. Add Sharp/memory/latency evaluator.
5. Decide resumable upload threshold and implement signed/resumable session flow where needed, with TTL, generated key, one-object scope, max bytes, content type, checksum, idempotent finalize, expired-session rejection, and object-head verification.

Exit evidence:

- Adapter tests pass.
- URL resolver no longer requires Supabase public URL strings as canonical data.
- Performance budgets are measured and documented.

## Implementation Order Rules

- Do not proceed past Phase 0 while broad direct storage writes can bypass app validation/scanning. Final tightening can wait for brokered routes, but bypass containment cannot.
- Do not allow attachment download before scanning/quarantine exists.
- Do not allow attachment approval/current-use before scan-clean or audited override exists; if scanner is not implemented, freeze/disable those actions.
- Do not migrate component images private without a URL resolver/backfill plan.
- Do not add scanning dependency without a documented operational runbook and failure mode.
- Do not enable signed/resumable direct upload until server finalization and provider-backed storage proof pass.
- Do not broadly roll out server-mediated upload routes until the early runtime profile and smoke benchmark fit deployment limits.
- Do not create upload-domain tables without RLS/grants in the same migration.
- Do not production-enable uploads without rate limits, active-session caps, quota alerts, and scanner backpressure.
