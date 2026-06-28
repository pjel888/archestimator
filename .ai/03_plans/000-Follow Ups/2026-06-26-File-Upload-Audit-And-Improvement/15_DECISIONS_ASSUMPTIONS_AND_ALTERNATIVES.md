# Decisions Assumptions And Alternatives

## Decisions

### DEC-001 - Use An Upload Broker

Decision: Introduce a central upload broker and policy registry instead of continuing route-specific upload logic.

Rationale: Current behavior is duplicated across routes/UI, and future upload surfaces need reusable validation, authz, telemetry, cleanup, and provider portability.

Rejected: Keep bespoke route handlers. Reason: it preserves inconsistent UX/security and makes provider changes expensive.

### DEC-002 - Private By Default

Decision: Treat user uploads as private unless product/security explicitly marks a surface or derivative public in writing.

Rationale: Project images and attachments can contain client-sensitive data. Component images may also contain proprietary supplier/client references.

Rejected: Public storage as default. Reason: public URLs bypass retrieval controls and are hard to retract once shared/cached.

### DEC-003 - Asset Descriptors, Not Provider URLs, Are Canonical

Decision: Store provider-neutral asset/object descriptors as durable data. Resolve render/download URLs at read time.

Rationale: Supabase public URL paths currently leak into publication/image logic; provider portability requires the domain not to depend on those URL strings.

Rejected: Store public/signed URLs directly. Reason: signed URLs expire and public URLs encode provider-specific assumptions.

### DEC-004 - Scanning Required For Documents

Decision: PDF/XLS/XLSX attachments require quarantine and scanning before approval, download, or publication.

Rationale: Magic-byte sniffing is not malware detection, and documents can carry active content.

Rejected: Scan only before proposal export. Reason: reviewers/downloaders may access files earlier.

### DEC-005 - Direct Storage Writes Must Be Session-Bound Or Disabled

Decision: Browser direct storage writes are not a general capability. Broad direct writes must be closed in Phase 0 unless the full signed-session/finalization/proof minimum already exists. Browser direct upload is allowed only through short-lived upload sessions finalized by server validation.

Rationale: Supabase Storage RLS protects paths but cannot perform app-specific Sharp re-encode, scan, or domain finality checks by itself.

Rejected: Trust bucket MIME/file-size policies alone. Reason: bucket policy cannot replace content validation and scan lifecycle.

### DEC-006 - Scanner Gate Must Be Fail-Closed

Decision: Attachment approval, current use, proposal use, and download require a clean scanner state unless a named admin/security override is recorded.

Rationale: PDF/XLS/XLSX attachments can contain malware or active content, and magic-byte sniffing is not a malware control.

Rejected: Allow downloads while scan is pending or failed. Reason: this exposes reviewers/clients before the trust decision is complete.

### DEC-007 - Upload Tables Are Not Client-Managed Tables

Decision: `upload_sessions`, `upload_assets`, and `upload_events` must be created with RLS and least-privilege grants. Browser clients may not mutate them directly.

Rationale: These tables contain object keys, actor/workspace IDs, filenames, checksums, scan metadata, and audit events.

Rejected: Add upload tables first and tighten grants later. Reason: a migration window with broad table access would expose sensitive cross-tenant metadata.

### DEC-008 - Abuse Prevention Is A Production Gate

Decision: Rate limits, active-session caps, rolling byte/object quotas, scanner backpressure, and alert thresholds are required before production upload enablement.

Rationale: Authenticated users can otherwise consume CPU, memory, storage, scanner capacity, and reviewer attention with repeated maximum-size uploads.

Rejected: Treat quotas as post-launch observability. Reason: once user uploads are enabled, abuse controls are part of tenant-isolation and cost containment.

## Assumptions

- Supabase remains the current provider for the next implementation pass.
- File caps remain 12 MB for images and 20 MB for attachments until product explicitly changes them.
- Component image public-read behavior is historical/product-convenience, not yet a settled privacy decision. The implementation default is private/proxied unless a written exception keeps a public derivative, and that exception must explicitly say whether estimate-row project-component images are included.
- Malware scanning/CDR provider is not chosen in this planning task.
- No provider/staging proof was run during this planning-only task.
- Signed direct or resumable upload is a future optimization, not required for current 12 MB image and 20 MB attachment caps unless performance evidence requires it.
- Future implementation can add migrations under the standing Archestimator Supabase authorization, but must stay in project `ebxxqidacheyapmmzavr`.

## Decision Gates

| Gate | Default if undecided | Owner | Blocks |
|---|---|---|---|
| Component image public derivative exception | Private/proxied rendering, including estimate-row project-component images | Product/security owner | Phase 6 privacy migration and production rollout |
| Scanner/CDR provider and macro/active-content policy | Freeze approval/download/use for unscanned attachments | Security/product owner | Phase 5 scan/download enablement |
| Reviewed attachment and archive retention | Preserve current-approved/attached assets; delete only verified orphan drafts | Product/data owner | Phase 6 cleanup automation |
| Resumable upload threshold | Keep current caps server-mediated | Performance/backend owner | Phase 7 signed/resumable implementation |
| Project image metadata shape | Dual-write asset IDs inside current metadata JSON before normalizing | Backend/data owner | Phase 2/3 migration detail |
| Upload quota values | Conservative closed-beta caps from Phase 0 runtime profile | Performance/security owner | Production upload enablement |
| Upload event retention/legal hold | Retain append-only security events until explicit retention policy exists | Security/ops owner | Production audit dashboard/runbook |

## Alternatives Considered

### Alternative A - Direct Browser Uploads To Supabase With RLS

Pros:

- Lower app-server bandwidth.
- Better for large files and progress.

Cons:

- Hard to enforce image re-encode, document scan, checksum/finality, and domain ownership before object exists.
- Supabase S3 keys bypass RLS and cannot be exposed to browser.

Use only as signed/session-bound flow with server finalization.

### Alternative B - Keep All Uploads Server-Mediated

Pros:

- Strongest server-side validation and transformation control.
- Simpler current implementation.

Cons:

- App server pays bandwidth/CPU/memory cost.
- Less reliable for larger files and unstable networks.

Use for current small image/document caps until performance budgets prove otherwise.

### Alternative C - Make Component Images Private Immediately

Pros:

- Strong privacy posture.
- Consistent with project images and attachments.

Cons:

- Requires URL resolver and migration/backfill for existing public URLs.
- Could affect estimates/publication snapshots.

Plan as recommended target if component images can contain sensitive content, but execute with migration proof.

### Alternative D - Full Third-Party Upload Platform

Pros:

- May provide scanning, transformations, CDN, resumable uploads.

Cons:

- New dependency, cost, lock-in, and migration effort.
- Not required to fix immediate P0 security gaps.

Do not add until broker abstraction exists and requirements justify it.

## Official Reference Notes

- Supabase private/public bucket and download behavior: https://supabase.com/docs/guides/storage/buckets/fundamentals and https://supabase.com/docs/guides/storage/serving/downloads
- Supabase Storage RLS and upload permissions: https://supabase.com/docs/guides/storage/security/access-control
- Supabase resumable uploads and S3 compatibility: https://supabase.com/docs/guides/storage/uploads/resumable-uploads and https://supabase.com/docs/guides/storage/s3/compatibility
- OWASP File Upload Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
- AWS S3 presigned URLs and multipart concepts: https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html and https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html
