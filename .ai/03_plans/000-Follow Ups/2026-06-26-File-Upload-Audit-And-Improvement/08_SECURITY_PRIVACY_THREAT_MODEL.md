# Security Privacy Threat Model

## Assets To Protect

- Project cover images that may reveal client/site information.
- Component images that may reveal proprietary supplier/client selections.
- Estimate-row project-component reference images that may reveal client-specific selections before a component is promoted to the shared library.
- Supplier PDFs, quotes, spreadsheets, and evidence attachments.
- Future proposal assets and import files.
- Workspace membership, project membership, and library governance state.
- Provider credentials, signed URLs, object keys, and scan results.

## Trust Boundaries

| Boundary | Risk | Required control |
|---|---|---|
| Browser to app route | User controls file name, type, content, size, entity IDs | Authz, size cap before body parse, policy registry, validation, idempotency. |
| App route to storage provider | Service-role credentials can bypass storage RLS | Explicit app-layer authz before write/delete; provider adapter hides credentials. |
| Browser to storage direct upload | Direct path can bypass server validation | No broad direct writes; only short-lived, single-object session URLs with server finalization, object-head validation, and scan gate where required. |
| Storage object to domain row | Raw path can point to arbitrary object | Server-issued asset IDs and object-head/finality proof. |
| Attachment to reviewer/client | Malware/active content can propagate | Quarantine, scan, macro/active-content policy, safe download headers. |
| Public URL to publication/estimate | Provider URL can leak private objects or tracking URLs | URL resolver and allowlist; no durable provider URL truth. |
| Upload metadata tables to browser/RPC | Object keys, actor IDs, checksums, filenames, scan results, and events can leak across tenants | RLS on upload tables, least-privilege grants, scoped RPCs, service-only mutations. |

## Threats And Requirements

### Unauthorized Upload Or Replacement

Threat: a viewer or unrelated workspace member uploads/replaces objects through service-role route or direct storage policy.

Controls:

- Enforce `can_edit_project` or equivalent before project image POST/DELETE.
- Enforce component/library edit authority before component image/attachment writes.
- Enforce estimate row edit authority and row/project/estimate ownership before estimate-row project-component image writes or replacement.
- Treat broad component image/attachment direct writes as a Phase 0 production blocker: disable them, or restrict them to a documented temporary signed-session path that cannot attach objects without server finalization.
- Add denial tests for viewer, cross-workspace, wrong user prefix, wrong project, stale session, expired session, and duplicate finalization with a changed checksum.

### Malicious File Upload

Threat: user uploads executable, polyglot, decompression bomb, fake XLSX, macro-enabled active document, or content that exploits preview/download clients.

Controls:

- Extension allowlist plus declared MIME plus magic/content detection.
- Image decode through Sharp with pixel cap, dimensions cap, re-encode, EXIF stripping.
- Attachment quarantine and AV scan before approval/download.
- OOXML zip bomb limits and macro/active-content policy.
- Scanner statuses are explicit: `pending`, `clean`, `infected`, `failed_transient`, `failed_permanent`, `unsupported`, and `override_approved`.
- Scanner failure semantics fail closed. Approval, current-use, proposal use, and download require `clean`, except for a named admin/security override that records reason, expiry, actor, asset hash, and audit event.
- Generated object keys; raw filename stored only as display metadata after sanitization.
- Safe response headers: `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`, private/no-store where appropriate.

### Authenticated Abuse And Cost Exhaustion

Threat: an authenticated user repeatedly submits maximum-size images/documents, starts many concurrent sessions, or fills scanner queues to consume CPU, storage, provider quota, or reviewer time.

Controls:

- Per-actor, per-workspace, and per-IP upload rate limits.
- Max active upload sessions per actor/workspace.
- Rolling byte/object quotas per surface.
- Scanner queue backpressure and explicit retry-after semantics.
- Alert thresholds for upload rejection spikes, scanner backlog age, orphan cleanup backlog, and repeated validation failures.
- Privileged bypasses, if any, must be scoped to admin/security/system roles and audited.

### Upload Metadata Exposure

Threat: new upload tables expose object keys, actor/workspace relationships, raw display filenames, checksums, scan metadata, or audit events to unrelated tenants or lower-privilege users.

Controls:

- RLS and least-privilege grants are created with the upload tables.
- Anon has no access.
- Authenticated direct table reads are denied unless a scoped read policy/RPC is intentionally required.
- Mutation paths validate app-layer authorization and state transitions server-side.
- Audit events are append-only and readable only by workspace admin/security or platform roles.
- Tests cover anon, viewer, editor, cross-workspace, admin/security, and service-role access paths.

### Public Data Exposure

Threat: component images or signed URLs leak sensitive client/supplier data.

Controls:

- Private-by-default storage for user uploads.
- Component images default to private/proxied render URLs unless a written product/security exception approves public-read behavior for that surface or derivative.
- Estimate-row project-component images inherit the component-image privacy default, but public-derivative exceptions must explicitly include row-snapshot, project-component projection, and publication/share exposure, not only reusable library component forms.
- Short TTL signed URLs, never stored durably. Revocation relies on expiry or object removal; the system must not promise immediate revocation for already-issued URLs.
- Public derivatives only after sanitization and intentional publication.

### Metadata Tampering

Threat: hidden form fields or JSON payload persist a path that the actor does not own.

Controls:

- Domain actions accept `assetId` or `uploadSessionId`, not raw bucket/path from clients.
- Server validates exact workspace, actor, surface, entity, object existence, content type, size, checksum, and scan status.
- One-time finalization prevents replaying draft paths into other entities.
- Finalization locks the session/domain target, rejects expired sessions, rejects mismatched object keys or checksums, and returns the same result only for an idempotent retry with the same key/checksum.

### Orphaned Or Missing Objects

Threat: failed cleanup leaves private files retained forever, or direct delete leaves approved metadata pointing to missing files.

Controls:

- Durable upload sessions with TTL and scheduled GC.
- Cleanup audit events and retry queue.
- Remove direct delete policies for reviewed attachments.
- Approval/download checks object existence.

## Privacy Rules

- Project images are private because they can contain client/site context.
- Attachments are private and require audited access.
- Component images are treated as sensitive until product explicitly decides otherwise.
- Estimate-row project-component images are treated as sensitive because they can represent project-specific/client-specific selections before library promotion.
- Logs and metrics must not include raw filenames, signed URLs, secrets, file contents, or provider tokens.
- Scan results can store reason codes and hashes but not document text.
- Upload event retention and legal hold rules must preserve investigation evidence without exposing raw file contents or signed URLs.

## Security Decision Gates

- Phase 0 must close broad direct storage writes before implementation proceeds to new upload features. If a temporary direct-upload compatibility path is unavoidable, Phase 0 must also implement the full signed-session/finalization/proof minimum; static migration review is not enough.
- Component image privacy is a production gate. The default implementation path is private/proxied; public-read behavior requires a written exception, migration/backfill plan, and cache exposure assessment.
- Scanner/CDR provider, retry policy, override authority, and failure semantics must be chosen before attachment approval/download enforcement is enabled.
- Signed direct or resumable upload is not allowed for current caps until the plan includes TTL, single-object scope, generated object key, max bytes, content type, checksum, expiry, idempotency, and final object-head verification.
- Upload table RLS/grants and abuse-prevention quotas are production gates, not optional observability enhancements.

## Security Test Requirements

- Route tests for auth-before-body parsing, edit-authority denial, cross-workspace paths, and stale sessions.
- Malicious fixtures for fake MIME, bad magic, truncated image, excessive dimensions, fake XLSX zip, zip bomb, macro-active document policy, empty file, and content-length oversize.
- Storage RLS proof for direct read/write/update/delete denial.
- Attachment download denial when scan is pending/failed/infected/unsupported or review state is not allowed.
- Scanner fixtures for EICAR or equivalent harmless malware signature, macro/active-content policy, zip bomb simulation, transient failure, permanent failure, unsupported file, and override audit.
- Metadata tamper tests for wrong bucket, wrong path prefix, missing object, checksum mismatch, duplicate finalization, changed-checksum retry, expired session, and replayed session.
- Postgres RLS/grant tests for `upload_sessions`, `upload_assets`, and `upload_events`.
- Abuse-prevention tests for rate limits, active-session caps, rolling byte/object quotas, scanner backpressure, and retry-after classification.
