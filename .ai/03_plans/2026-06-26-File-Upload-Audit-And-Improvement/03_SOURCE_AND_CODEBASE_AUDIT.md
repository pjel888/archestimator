# Source And Codebase Audit

## Evidence Scope

Read-only audit covered upload routes, client upload controls, server actions, URL normalization, storage cleanup, migrations, tests, roadmap docs, design/product docs, and official external documentation.

## Current Upload Surfaces

| Surface | Code evidence | Current behavior |
|---|---|---|
| Project cover image upload | `src/app/api/projects/images/route.ts:217` | Authenticated multipart POST, 12 MB max, image MIME allowlist, magic sniff, Sharp decode, 24 MP cap, WebP + thumbnail, private bucket, route URL response. |
| Project cover image GET | `src/app/api/projects/images/route.ts:177` | Auth/terms checked, project row checked, storage object downloaded, `private, max-age=86400, immutable` response. |
| Project image client | `src/components/workshop/project-image-client.ts:17` | XHR upload progress, progress capped at 95, no abort/timeout/retry contract. |
| Project create UI | `src/components/workshop/NewProjectForm.tsx:304` | Project is created first, image uploads after, then image metadata is patched; rollback cleanup is best effort. |
| Project edit UI | `src/components/workshop/ProjectDetailsModal.tsx:294` | Immediate upload on file select; hidden form fields persist image metadata on save. Save button at `ProjectDetailsModal.tsx:618` is disabled by save state, not image-upload state. |
| Component image route | `src/app/api/component-library/images/route.ts:141` | Authenticated POST, 12 MB max, Sharp WebP + thumbnail, public `component-images` URL response. |
| Component image UI | `src/components/workshop/component-library-manager/AddComponentModal.tsx:1642` | Client canvas WebP optimization, then server Sharp processing; no progress/abort/timeout for fetch. |
| Estimate-row project-component image modal | `src/components/workshop/estimate-sheet/rows/cells.tsx:49`, `src/components/workshop/estimate-sheet/rows/cells.tsx:373` | Inline row editor opens a `Reference image` modal; selected files POST to `/api/component-library/images`, show only busy/error text, and return a public URL. |
| Estimate-row project-component image persistence | `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts:446`, `src/lib/estimates/estimate-row-tree-patch.ts:67`, `src/lib/component-library/project-component-projection.ts:146` | Uploaded or pasted image URLs are merged into `estimate_row_items.source_snapshot.imageUrl`, patched into row state, and projected back into the project-level component list. |
| Component attachments route | `src/app/api/component-library/attachments/route.ts:129` | Authenticated POST, 20 MB max, PDF/XLS/XLSX magic sniff, raw object storage, no scan/quarantine. |
| Component attachments UI | `src/components/workshop/component-library-manager/AddComponentModal.tsx:1184` | File input and attachment list; rows show filename/size/remove, not review/download/scan state. |
| Legacy component image path | `src/components/workshop/component-library/NewComponentForm.tsx:37` | Reads file to base64 data URL without explicit size/type policy in handler. |
| Shared upload primitive | `src/components/ui/file-upload.tsx:24` | Presentation-only drag/drop selector with max-size check; no policy, transport, progress, abort, or status contract. |

## Storage And Data Surface

| Area | Evidence | Audit result |
|---|---|---|
| Project images bucket | `supabase/migrations/20260603222628_private_project_image_storage.sql` | Private WebP bucket, 12 MB cap, RLS policies later qualified. Strongest current privacy posture. |
| Component images bucket | `supabase/migrations/20260524062000_component_image_storage.sql:5` | Public WebP bucket with authenticated workspace/user path write policies. Good for public assets, risky for proprietary client photos. |
| Estimate row image snapshot | `src/lib/estimates/actions.ts:2712` | Row updates merge caller-provided `sourceSnapshot` patches into `estimate_row_items.source_snapshot`, so uploaded image URL finality is not currently represented as an asset reference. |
| Component attachments bucket | `supabase/migrations/20260524131204_component_variant_assets_cost_entries.sql:133` | Private PDF/XLS/XLSX bucket, 20 MB cap. Direct storage update/delete policies remain at lines 797 and 812. |
| Attachment table | `supabase/migrations/20260524131204_component_variant_assets_cost_entries.sql:151` | Stores text bucket/path with uniqueness but no storage FK or exact ownership/finality proof. |
| Attachment RPC insertion | `supabase/migrations/20260524131204_component_variant_assets_cost_entries.sql:614` | Inserts caller-provided JSON bucket/path metadata. |
| Trust governance | `supabase/migrations/20260622143000_library_trust_governance.sql:32` | Adds review statuses/events, current-approved constraints, admin RPCs, and review queue indexes. |
| Approval validation | `supabase/migrations/20260622143000_library_trust_governance.sql:873` | Checks bucket, loose path regex, and MIME; does not prove object existence, scan state, or exact owner binding. |
| Cleanup utility | `src/lib/mass-deletion/storage-cleanup.ts:72` | Chunks removals and reports removed/rejected/failed; good model for durable cleanup, but draft cleanup is best effort. |
| Component archive storage targets | `supabase/migrations/20260603160000_mass_deletion_governance.sql:384` | Returns empty `storageTargets`, so library assets are retained or orphaned without explicit policy. |

## Existing Security Controls

- Image routes sniff magic bytes, reject unsupported encoding, enforce dimensions, and re-encode through Sharp.
- Attachment route checks magic bytes and declared MIME consistency.
- Generated names and random UUIDs avoid raw filename object-key control.
- Project image public exposure is blocked by publication normalizer: `src/lib/publication/image-url.ts:42`.
- Delete routes filter owned path prefixes before storage removal.
- Existing security audit already identified missing malware scanning: `.ai/03_plans/2026-06-01-security-owasp-compliance-audit/13-file-upload-and-storage.md:63`.

## Production Gaps

| Severity | Gap | Evidence |
|---|---|---|
| High | Service-role storage writes require explicit app-layer edit authorization before write/delete. | `src/app/api/projects/images/route.ts:223`, `route.ts:274`; storage policy expects `can_edit_project` in `20260603224800_qualify_project_image_storage_policies.sql`. |
| High | Direct storage write policies can bypass server validation/transcoding/scanning. | `20260524062000_component_image_storage.sql`, `20260524131204_component_variant_assets_cost_entries.sql:788`. |
| High | Attachments lack malware scan, quarantine, macro/active-content policy, and download gate. | `src/app/api/component-library/attachments/route.ts:142`, `route.ts:159`. |
| High | Storage-denial tests are planned but absent. | `.ai/01_roadmap/32-test-infrastructure-execution-spec.md:430`. |
| Medium | Upload metadata is persisted from client-provided hidden fields/JSON. | `src/lib/projects/actions.ts:297`, `src/lib/component-library/actions.ts:676`. |
| Medium | Estimate-row project-component images are hidden behind the row editor and persist public URLs rather than row/entity-bound asset records. | `src/components/workshop/estimate-sheet/rows/cells.tsx:287`, `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts:446`. |
| Medium | Upload UI lacks unified progress/cancel/retry semantics. | `project-image-client.ts:47`, `AddComponentModal.tsx:281`, `file-upload.tsx:24`. |
| Medium | Server image processing repeats full-buffer decode/resize work and can exceed memory budgets with concurrency. | `src/app/api/projects/images/route.ts:243`, `route.ts:253`, `src/app/api/component-library/images/route.ts:155`. |
| Medium | Component images are public and URL shapes are Supabase-specific. | `src/lib/publication/image-url.ts:4`, `next.config.ts:61`. |

## Existing Test Coverage

- `tests/vitest/auth-sensitive-api-boundaries.test.ts` checks auth-before-body parsing, owned delete filtering, private project image fail-closed behavior, storage error sanitization, and reviewed attachment delete blocking.
- `tests/vitest/storage-cleanup-allowlist.test.ts` checks cleanup target filtering and dedupe.
- `tests/vitest/component-library-attachment-lifecycle.test.ts` checks migration text and attachment governance expectations.
- `tests/vitest/estimate-image-url.test.ts` checks public component image URL normalization and unsafe URL stripping.
- `tests/vitest/project-creation-ui.test.ts` and nearby form tests cover UI structure, not full upload state behavior.
- No focused test currently covers the estimate-row `Reference image` modal upload, row `sourceSnapshot.imageUrl` update, or project-component projection render path.

## Official External Constraints

As of 2026-06-26:

- Supabase Storage authorization is governed by `storage.objects` RLS and uploads require explicit policies: https://supabase.com/docs/guides/storage/security/access-control
- Private buckets require authenticated download or signed URL access; public buckets expose objects by URL: https://supabase.com/docs/guides/storage/buckets/fundamentals and https://supabase.com/docs/guides/storage/serving/downloads
- Supabase recommends resumable uploads for larger or unstable uploads; standard uploads are suited to small files: https://supabase.com/docs/guides/storage/uploads/standard-uploads and https://supabase.com/docs/guides/storage/uploads/resumable-uploads
- Supabase S3 access keys bypass RLS and are server-side only: https://supabase.com/docs/guides/storage/s3/authentication
- OWASP file upload guidance requires allowlists, server-side validation, generated names, size limits, authz, storage isolation, and malware/sandbox/CDR where needed: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
