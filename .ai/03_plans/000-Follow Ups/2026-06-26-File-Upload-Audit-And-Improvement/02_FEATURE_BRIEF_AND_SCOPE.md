# Feature Brief And Scope

## Problem Statement

Archestimator accepts user-controlled files in several places: project cover images, component/library images, estimate-sheet inline project-component reference images, and component attachments such as PDFs and spreadsheets. These uploads are scattered across bespoke UI controls, route handlers, storage bucket policies, domain actions, cleanup code, migrations, and older roadmap docs. Production upload behavior needs to be coherent, secure, observable, performant, and portable enough to change storage providers without rewriting every consumer.

## Users And Jobs

- **Estimator or workspace editor**: add project cover images and component reference images, including project-level components created inline from estimate rows, without waiting through unclear progress or losing work.
- **Cost library maintainer**: attach supplier PDFs, quotations, and spreadsheets as evidence while knowing whether files are pending scan/review, approved, rejected, or superseded.
- **Reviewer/admin**: trust that attachments used for estimates/proposals are scanned, approved, auditable, and immutable enough for later reference.
- **Future implementation agent**: add a new upload surface by registering a policy and reusing the upload broker/UI, not by copying a route.

## In Scope

- Project cover image selection, preview, upload, replacement, private rendering, and deletion.
- Component/library image selection, optimization, upload, rendering, replacement, and deletion.
- Estimate-sheet inline row/project-component reference image upload, row snapshot persistence, project-component projection rendering, replacement, and deletion/cleanup.
- Component PDF/XLS/XLSX attachment upload, scan/quarantine, review, approval, download, supersession, deletion, and retention.
- Future upload surfaces such as proposal assets, supplier evidence, workspace logos, import files, generated PDFs, and package exports.
- Provider-portable object metadata and adapter interfaces.
- Storage policy posture, RLS proof, direct-write restrictions, signed URLs, and resumable/multipart upload strategy.
- UX states, progress, retry, cancel, accessibility, mobile layout risk, and error copy.
- Performance, reliability, observability, cleanup, rollout, rollback, and tests.

## Out Of Scope For This Planning Task

- Implementing code.
- Editing migrations, schema, tests, UI, provider settings, or infrastructure.
- Choosing or buying a malware-scanning vendor.
- Changing Supabase PITR/cost posture.
- Claiming staging or production provider proof from local-only inspection.
- Solving unrelated proposal/package generation outside upload/file architecture.

## Success Metrics

- Upload success rate by surface: `>= 99%` excluding user validation rejects.
- Upload validation reject reasons are classified and visible in telemetry.
- Closed-beta first-user uploads: at least one project cover replacement, one library component image upload, one estimate-row project-component reference image upload, and one component evidence attachment can complete or fail with recoverable, supportable UX in an internal smoke run.
- Reviewer trust workflow: attachment approval/download/use is either cleanly scan-gated or explicitly frozen; there is no ambiguous "approved but unscanned" state.
- Recovery metric: retryable upload failures show retry/cancel/removal affordances and do not leave unreported orphaned objects.
- Support metric: upload failures can be grouped by reason code without exposing filenames, signed URLs, file contents, or provider credentials.
- P95 server image route duration under the budget in `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md`.
- Zero successful cross-workspace upload/read/delete attempts in storage-denial proof.
- Zero approved/downloadable attachments with `scan_status != clean`.
- Orphan cleanup backlog stays below defined threshold and has no silent failures.
- New upload surface can be added by registering policy, tests, and UI state mapping without creating a bespoke storage client.

Measurement windows:

- Closed-beta smoke metrics are per release candidate.
- Upload success rate is measured by completed upload attempts per surface over a rolling 7-day window, excluding deliberate client aborts, local validation rejects, and unsupported-file rejections.
- Security metrics are pass/fail release gates, not rolling averages.

## Readiness Cutlines

### Closed-Beta Safety Gate

Minimum to unblock first users:

- Current project image, library component image, estimate-row project-component image, and component attachment surfaces cannot bypass app-layer authz.
- Broad direct storage writes are disabled or replaced by server-issued upload sessions with finalization proof.
- Attachment approval/download/use is either scan-clean or frozen/disabled until scanning is implemented.
- Current routes keep response compatibility and have malicious-file, denial, cleanup, and storage-proof coverage.
- Users see retryable failure and cleanup states instead of silent progress stalls or orphaned uploads.

Non-goal for closed beta: building new future upload surfaces or proving full provider portability.

### Production Readiness Gate

Minimum before production rollout:

- Upload broker, asset/session records, RLS/grants, scan/download gate, cleanup jobs, dashboards, and runbooks are implemented and verified.
- Component image privacy decision and migration/backfill proof are complete.
- Abuse-prevention limits, queue backpressure, and quota alerts are active.
- Provider-backed storage/RLS proof and staging runtime proof pass.

### Platform Completion Gate

Longer-term completion:

- Provider adapter parity, migration dry-run, signed/resumable threshold, and future upload-surface policy registration are proven.
- New upload surfaces can be added without bespoke storage clients or raw provider URLs.

## Non-Functional Priorities

Priority order:

1. Tenant isolation and malicious-file controls.
2. User-visible reliability and recoverability.
3. Performance and memory safety.
4. Provider portability.
5. Implementation simplicity and reuse.

## Current Business Decision Points

- Whether a written product/security exception should keep any component image derivative public. Without that exception, the target posture is private/proxied rendering.
- Which malware-scanning/CDR provider to use for PDFs and spreadsheets.
- Whether uploads above current image/document limits should use resumable direct-to-storage sessions in beta or later.
- Retention policy for archived library component images and reviewed attachments.
- Exact closed-beta upload quota values after runtime profiling.
