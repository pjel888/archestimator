# Requirements Specification

## Requirement Table

| ID | Priority | Requirement | Acceptance Criteria | Validation |
|---|---:|---|---|---|
| UPLOAD-REQ-001 | P0 | All upload surfaces must use a central upload broker and policy registry. | Project images, library component images, estimate-row project-component images, and attachments call shared policy/validation/storage code; adding a future surface requires registering a policy. | Unit tests for policy registry and route integration. |
| UPLOAD-REQ-002 | P0 | Every service-role storage operation must be preceded by explicit app-layer authz. | Project image POST/DELETE verifies edit authority; library component image/attachment operations verify workspace role and domain ownership; estimate-row project-component images verify row edit authority and project/estimate ownership. | Viewer/editor denial tests and route contract tests. |
| UPLOAD-REQ-003 | P0 | Direct client storage writes must not bypass server validation. | Broad direct write/update/delete policies are disabled before production work proceeds past Phase 0, unless Phase 0 also implements the full signed-session/finalization/proof minimum from `06_ARCHITECTURE...`. Direct writes outside issued, server-finalized sessions fail. | Provider-backed storage RLS proof plus local harness proof. |
| UPLOAD-REQ-004 | P0 | Uploads must be finalized through server-owned upload session records. | Domain rows reference finalized asset IDs or validated asset descriptors, not raw hidden field URLs; object existence and actor/workspace binding are checked. | DB constraints, action tests, path tamper tests. |
| UPLOAD-REQ-005 | P0 | Attachments must be quarantined and scanned before approval, download, or publication. | `scan_status = clean` is required for current-approved/downloadable/use-in-proposal states. Failed/pending scans are blocked with clear UX. | Scan-gate tests and attachment lifecycle tests. |
| UPLOAD-REQ-006 | P0 | Attachments must use audited download brokering. | Download route verifies authz/context, logs `download_url_issued`, returns short-TTL signed URL or streams with safe headers. | Route tests and audit event tests. |
| UPLOAD-REQ-007 | P0 | Object keys must be server-generated and provider-neutral. | Keys include workspace, actor/owner, surface, entity or session, asset ID, variant, and extension; raw filenames are metadata only. | Key-builder tests and traversal tests. |
| UPLOAD-REQ-008 | P0 | File validation must combine extension allowlist, declared MIME, magic/content sniffing, size, dimensions, and re-encoding where applicable. | Images retain Sharp decode/re-encode/dimension limits; documents reject mismatched/fake PDF/XLS/XLSX and zip bombs. | Malicious fixture tests. |
| UPLOAD-REQ-009 | P1 | Storage should be private by default. | Project images and attachments stay private. Component images, including estimate-row project-component images, default to private/proxied rendering unless a written product/security decision explicitly approves public-read behavior. | Decision record, migration/backfill proof, and storage policy proof. |
| UPLOAD-REQ-010 | P1 | Provider URLs must not be the durable source of truth. | Domain data stores asset references/object descriptors; render URLs are derived by resolver. | Persistence tests and URL normalizer tests. |
| UPLOAD-REQ-011 | P1 | Upload UX must expose consistent states and controls. | All current surfaces support selected, validating, processing, uploading, uploaded draft, saved, retryable error, blocking error, cancelled, removing, remove failed. | DOM tests. |
| UPLOAD-REQ-012 | P1 | Uploads must be cancellable and timeout-aware. | Users can cancel in-flight uploads; stalled upload timeout and total timeout are surfaced; cleanup follows cancellation. | Client helper tests and DOM tests. |
| UPLOAD-REQ-013 | P1 | Upload progress must distinguish network upload, server processing, scan, and finalization. | UI does not sit misleadingly at 95%; processing/finalizing/scan states are visible and announced. | DOM tests and state-machine tests. |
| UPLOAD-REQ-014 | P1 | Upload controls must meet WCAG 2.1 AA expectations. | Semantic progress/status, `aria-describedby`, keyboard order, screen-reader state changes, non-color status cues, mobile 360px layout proof. | Accessibility tests and targeted manual/browser proof when implemented. |
| UPLOAD-REQ-015 | P1 | Draft and domain asset cleanup must be durable and idempotent. | Upload sessions transition to attached/deleted/orphaned; scheduled GC retries failed cleanup and records audit events. | Cleanup tests and job/runbook proof. |
| UPLOAD-REQ-016 | P1 | Performance budgets must be instrumented. | Metrics exist for client preflight, resize, route duration, Sharp duration, storage duration, bytes, cleanup failures, scan queue, proxy TTFB. | Metrics tests and dashboard/runbook checks. |
| UPLOAD-REQ-017 | P1 | Current route contracts must be preserved during refactor. | Response shapes for existing UI remain compatible until callers migrate, including the estimate-row modal caller of `/api/component-library/images`; deprecations are explicit. | Contract tests. |
| UPLOAD-REQ-018 | P1 | Future large uploads must support resumable or multipart flow. | Policy can route large files to server-mediated, Supabase signed upload plus finalize, TUS, or S3 multipart without changing domain consumers. Initial implementation stays server-mediated for current caps unless direct-upload session controls are fully specified. | Provider adapter contract tests. |
| UPLOAD-REQ-019 | P2 | Provider migration must be practical. | Switching provider only changes adapter/config/migration scripts, not UI/domain consumers. | Adapter parity tests and migration dry-run plan. |
| UPLOAD-REQ-020 | P2 | Retention and backup behavior must be explicit. | Project image deletion, component archive retention, reviewed attachment retention, and exports are documented and measurable. | Ops checklist and retention tests. |
| UPLOAD-REQ-021 | P0 | Upload-domain Postgres tables must use least-privilege RLS and grants. | `upload_sessions`, `upload_assets`, and `upload_events` enable RLS; anon has no access; authenticated users only access rows through scoped read RPCs or app-mediated routes; service-role/security-definer mutations validate workspace/actor/surface. | Migration contract tests plus anon/viewer/cross-workspace table-access denial proof. |
| UPLOAD-REQ-022 | P0 | Upload endpoints must include abuse-prevention controls. | Per-actor/workspace/IP rate limits, max active uploads, rolling byte/object quotas, scanner queue backpressure, and `429` retry semantics exist before production enablement. | Rate-limit, quota, concurrency, and queue-backpressure tests. |
| UPLOAD-REQ-023 | P1 | Audit events must have access, retention, and tamper-resistance rules. | Audit reads are admin/security scoped; events are append-only; retention/legal hold policy is documented; cleanup never erases investigation history. | RLS/grant tests, append-only tests, and ops checklist. |
| UPLOAD-REQ-024 | P1 | Release gates must distinguish closed-beta, production, and platform completion. | Phase 0 can ship closed-beta safety without future upload surfaces/provider parity; production rollout requires scan/download/cleanup/observability proof; platform completion requires provider-portability proof. | Readiness checklist and release review. |
| UPLOAD-REQ-025 | P0 | Estimate-sheet inline project-component image uploads must be first-class brokered surfaces. | The row `Reference image` modal uses an upload policy bound to project, estimate, node/row, actor, and workspace; finalization persists an asset reference or validated descriptor for the row/project-component projection instead of a raw provider URL. | DOM tests, row update tests, projection resolver tests, and authz denial tests. |

## Surface-Specific Acceptance Criteria

### Project Images

- Upload only allowed for actors who can edit the target project.
- Project images remain private unless a future explicit product decision changes this.
- GET remains fail-closed for malformed path, unauthenticated user, terms block, missing project, cross-workspace path, or unauthorized viewer.
- Replacements preserve old image until new asset is finalized, then queue previous asset cleanup.

### Component Images

- Component images target private/proxied rendering by default. If product/security approves a public derivative, the exception must name the derivative, sensitivity assumption, cache exposure, and migration/backfill impact.
- Client-side resize may remain an optimization, but server validation remains authoritative.
- Public or signed render URLs are derived from asset records and not stored as canonical domain truth.
- Estimate-sheet row/project-component reference images are part of this component-image family but require their own entity binding: project ID, estimate ID, node ID where available, row ID, actor, and workspace.
- Row `sourceSnapshot.imageUrl` compatibility may remain during dual-write, but the canonical future state is a finalized asset reference resolved into both the estimate row and the project-component projection.

### Component Attachments

- Upload creates a quarantined asset/session record.
- Approval requires scan clean, object existence, exact workspace/user/path binding, expected review revision, and admin authority.
- Download requires approved/current with `scan_status = clean`, or a tightly audited `override_approved`, short TTL, audit event, safe headers, and no raw bucket URL exposure.
- Direct storage update/delete must not invalidate approved metadata.

## Future Surface Criteria

Every future upload feature must define:

- Surface ID and owner domain.
- Actor permissions and entity binding.
- Allowed file types, extensions, magic signatures, max bytes, and max dimensions/pages/sheets where relevant.
- Visibility and URL mode: private proxy, signed URL, public derivative, or internal-only.
- Scan policy and quarantine behavior.
- Retention/deletion semantics.
- UX state mapping and telemetry names.
- Tests required before release.

## Closed-Beta Acceptance Criteria

- No current upload route allows a viewer or cross-workspace actor to write, replace, delete, approve, download, or attach another workspace's file.
- Attachment approval/download/use is scan-clean or frozen/disabled until scan-clean or audited override exists.
- Current project, component, estimate-row image, and attachment upload routes/callers preserve response compatibility while emitting enough fields for broker dual-write.
- Estimate-row project-component image upload preserves the current inline modal workflow while gaining broker authz, finality, cleanup, and projection compatibility.
- Users can recover from retryable upload failure without losing the previous saved asset or creating silent orphan storage.
- No future upload surface is required for the closed-beta gate unless it is necessary for first-user workflows.
