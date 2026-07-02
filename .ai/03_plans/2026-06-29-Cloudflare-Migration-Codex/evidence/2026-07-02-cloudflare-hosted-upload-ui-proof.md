# Cloudflare Hosted Upload UI Proof

Status: **PASSED**

Generated: `2026-07-02T09:29:24.991Z`

Base URL: `https://archestimator.com`

Route: `/workshop/library/components`

D1 database: `archestimator-proof-db`

R2 physical bucket: `archestimator-proof-uploads`

R2 logical bucket: `component-attachments`

Workspace fixture: `258b50ee-3fde-4f6a-a9d9-c360ec44cd0b`

Drives the real hosted Add Component browser UI with a synthetic Better Auth D1 session, uploads a tiny PDF through /api/component-library/attachments, verifies D1 upload metadata and R2 bytes, proves app-level R2 cleanup through DELETE /api/component-library/attachments, then removes exact synthetic D1 rows. Raw session cookies, signatures, R2 object paths, provider tokens, and customer data are not written to evidence.

## Summary

| Gate | Ready |
| --- | --- |
| browserRouteReady | yes |
| syntheticBetterAuthSessionReady | yes |
| componentLibraryWorkspaceVisible | yes |
| addComponentModalReady | yes |
| variantAttachmentInputReady | yes |
| uiUploadRequestObserved | yes |
| uploadResponseReady | yes |
| d1UploadSessionRecorded | yes |
| d1UploadAssetRecorded | yes |
| d1ScanPendingEventRecorded | yes |
| r2ObjectReadable | yes |
| r2ChecksumMatchesFixture | yes |
| appCleanupRemovedR2Object | yes |
| d1CleanupReady | yes |
| hostedUploadUiReady | yes |
| productionCutoverReady | no |

## Sanitized Browser Upload

- File name: `codex-browser-upload-proof-20260702092924991.pdf`
- File size bytes: `133`
- Fixture checksum: `89483c3badbbf9dadc73d52a65f710eced0891ab54275be6a865d735cc9e4a32`
- Route status: `200`
- Final route path: `/workshop/library/components`
- Upload API status: `200`
- Upload API bucket: `component-attachments`
- Upload API content type: `application/pdf`
- Upload API scan status: `pending`
- Upload session id present: `yes`
- Upload asset id present: `yes`
- Object path shape: `{workspaceId}/{userId}/{safeUploadName}-{uuid}.pdf`
- Object path hash: `c1f39518176728d01291a3aeaa13658a90f16af8a081eb488a75a8cce4a8feb0`
- D1 event types: `scan_pending`
- R2 bytes readable: `yes`
- R2 checksum matches: `yes`
- App cleanup DELETE status: `200`
- App cleanup removed count: `1`
- Cleanup counts after proof: `{"users":0,"sessions":0,"profiles":0,"memberships":0,"closedBetaRows":0,"legalTermsRows":0,"uploadSessions":0,"uploadAssets":0,"uploadEvents":0,"attachments":0}`

## Blockers

- (none)
