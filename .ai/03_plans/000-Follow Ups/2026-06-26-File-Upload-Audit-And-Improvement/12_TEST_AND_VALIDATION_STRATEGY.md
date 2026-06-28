# Test And Validation Strategy

## Current Test Assessment

Existing tests are useful but insufficient for production upload readiness.

Covered today:

- Auth-before-body parsing and owned delete filters in `auth-sensitive-api-boundaries.test.ts`.
- Static migration/governance expectations in `component-library-attachment-lifecycle.test.ts`.
- Cleanup allowlists in `storage-cleanup-allowlist.test.ts`.
- URL normalization in `estimate-image-url.test.ts`.
- Some project UI structure.

Missing today:

- Behavioral successful POST contracts for each upload route.
- Malicious file fixtures against route handlers.
- Partial-failure orphan cleanup assertions.
- Real storage RLS/direct-write denial proof.
- Upload progress/cancel/retry DOM behavior.
- Estimate-row `Reference image` modal upload, row update, and project-component projection coverage.
- Provider adapter contract tests.
- Performance budget evaluators.
- Upload-domain table RLS/grant tests.
- Rate-limit, quota, active-session cap, and scanner-backpressure tests.

## Required Test Layers

### Unit Tests

- object key builder rejects traversal and generates expected surface/entity keys.
- policy registry validates allowed types, sizes, visibility, scan requirement, and max dimensions.
- image validator handles magic MIME, Sharp metadata, dimensions, and unsupported encodings.
- attachment validator handles PDF/XLS/XLSX signatures, fake ZIP/XLSX, declared MIME mismatch, empty file, size cap.
- URL resolver derives route/signed/public URLs and rejects raw unsafe URLs.

### Route Contract Tests

Add `tests/vitest/upload-route-contracts.test.ts`:

- project image success returns bucket/path/thumb/url/dimensions/bytes/content type/asset fields.
- component image success returns public or derived render URL as configured.
- attachment success returns bucket/path/name/contentType/size/scan status/session.
- validation errors are sanitized and classify retryable vs non-retryable.
- oversized `content-length` rejects before `formData()`.

### Malicious Fixture Tests

Add `tests/vitest/upload-malicious-file-validation.test.ts`:

- fake MIME with bad magic.
- polyglot payload.
- truncated image.
- oversized image dimensions.
- mismatched declared vs detected MIME.
- fake XLSX zip missing workbook markers.
- OOXML zip bomb fixture or simulated detector.
- macro/active-content policy fixture where supported.
- empty file.
- path traversal and encoded traversal.

### Cleanup Tests

Add `tests/vitest/upload-orphan-cleanup.test.ts`:

- first image derivative upload succeeds and thumbnail upload fails, cleanup removes first object.
- cleanup failure records retry/audit state.
- draft discard queues cleanup and can be retried.
- reviewed/current attachment cannot be deleted by draft cleanup.

### UI DOM Tests

Add focused tests in nearby suites:

- project image XHR progress transitions and final processing state.
- project edit stale-save guard while image upload active.
- component image `optimizing -> uploading -> uploaded/error`.
- estimate-row project-component image modal `selected -> uploading -> saved/error`, row `sourceSnapshot.imageUrl` update, and projection render.
- attachment `uploading -> scanning -> pending review`.
- retry/cancel/remove controls and announcements.
- `aria-describedby`, role status/alert, semantic progress.

### Storage/RLS Proof

Add env-gated proof script or test:

- anon cannot upload.
- workspace B cannot read/write workspace A objects.
- authenticated user cannot write another user's path.
- viewer cannot upload project images.
- direct update/delete of reviewed attachments is denied.
- public component image read behavior matches explicit privacy decision.
- signed upload URLs, if used, are short-lived, single-object, non-overwriting, generated-key only, and cannot be finalized after expiry.
- anon and authenticated browser clients cannot select, insert, update, or delete upload-domain table rows outside intentionally scoped RPCs/routes.
- viewers and cross-workspace actors cannot read upload sessions, assets, event metadata, object keys, scan results, or checksums.
- admin/security roles can read audit events only within their authorized workspace/platform scope.

Skip loudly when provider/local Supabase env is absent. Do not claim provider proof from static tests.

### Abuse-Prevention Tests

- repeated max-size uploads hit per-actor/workspace/IP rate limits before expensive processing;
- concurrent session creation stops at the active-session cap;
- rolling byte/object quotas return classified retryable or blocking errors;
- scanner queue backpressure rejects or freezes new scan-dependent work with retry guidance;
- privileged bypass paths, if any, require admin/security/system role and emit audit events;
- quota reset windows do not allow duplicate domain attachments for the same idempotency key.

### Provider Adapter Tests

- fake provider satisfies `StorageProvider` contract.
- Supabase adapter uses server-only credentials and `persistSession: false`.
- signed URL expiry and metadata are generated from upload session only.
- S3-compatible provider can store/head/delete/read through the same interface.
- finalize verifies object head, size, content type, checksum, actor, workspace, surface, entity, and session expiry before domain attachment.

### Finalization Race Tests

- concurrent finalize calls for the same session return one attached result or one success plus same-result idempotent retry;
- duplicate finalize with a changed checksum/key is rejected and audited;
- expired sessions cannot finalize even if the object exists;
- failed finalization queues cleanup without attaching the object;
- replaying an asset/session into another entity or workspace is denied.

### Scanner Contract Tests

- `pending`, `infected`, `failed_transient`, `failed_permanent`, and `unsupported` statuses block approval/download/use;
- missing scan status or legacy approved/current attachment blocks approval/download/use until clean, quarantined, frozen, or audited override-approved;
- transient failures retry with bounded backoff and max age;
- permanent failures and unsupported files require reupload or documented override;
- override requires named admin/security role, reason, expiry, asset hash, and audit event;
- harmless malware signature, macro-active document, zip bomb simulation, and scanner outage fixtures are covered.

### Performance Validation

- Early Phase 0/1 smoke gate records deployment memory/body/route-duration limits and runs representative Sharp/upload fixtures before broad broker rollout.
- Microbench Sharp transforms with representative 2 MP, 12 MP, and 24 MP images.
- Route tests assert pre-body size rejection.
- Metrics tests assert events include duration/bytes/reject reason without secrets.
- Browser or E2E proof only for real progress/cancel behavior when implementation reaches UI.

### Accessibility And Responsive Proof

- DOM/static tests assert helper/status/error `aria-describedby` links.
- Keyboard tests cover choose/change/cancel/retry/remove/download/approve order.
- Progress/status tests cover non-error `role="status"` or semantic progress and blocking `role="alert"`.
- State badge tests prove text/icon label exists beyond color.
- Reduced-motion checks prove animations are disabled or nonessential.
- 360px/mobile layout proof is required for upload rows with long filenames and visible controls; use browser proof if DOM/static inspection cannot prove no clipping.

## Local Vs Provider Proof

- Local/fake-provider tests prove business rules, idempotency, cleanup, and adapter shape.
- Provider-backed Supabase proof proves Storage RLS/policy behavior, signed URL behavior, bucket visibility, object-head metadata, and direct write/update/delete denial.
- Staging proof proves deployment limits, concurrent uploads, scanner queue behavior, and dashboard telemetry.
- Production release notes must distinguish all three evidence types; one cannot stand in for another.

## Release Gate

Minimum pass before production rollout:

- All P0 requirements have route/unit/DB proof.
- Storage RLS/direct-write proof passes against the real Supabase provider in staging or an explicitly equivalent local provider harness, then is repeated in staging before production rollout.
- Attachment scan/download gate tests pass.
- Upload UX state tests pass.
- Cleanup retry/audit tests pass.
- Performance budgets are measured and either pass or have documented exception.
- Upload-domain table RLS/grant proof passes.
- Abuse-prevention, quota, active-session, and scanner-backpressure tests pass.
- Closed-beta release review explicitly distinguishes beta safety, production readiness, and platform completion gates.
