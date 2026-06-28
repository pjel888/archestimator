# Blast Radius And Dependencies

## Direct Code Areas

| Area | Current paths | Expected implementation impact |
|---|---|---|
| Project image API | `src/app/api/projects/images/route.ts` | Replace route-local validation/storage with upload broker; add edit authz; preserve response shape during migration. |
| Component image API | `src/app/api/component-library/images/route.ts` | Delegate validation/Sharp/storage to broker; revisit public URL response. |
| Component attachment API | `src/app/api/component-library/attachments/route.ts` | Add session/finality/scan/quarantine/download route; preserve draft cleanup behavior while hardening. |
| Project upload client | `src/components/workshop/project-image-client.ts` | Add abort/timeout/retry/state contract or move to shared client. |
| Project create/edit UI | `NewProjectForm.tsx`, `NewProjectImagePanel.tsx`, `ProjectDetailsModal.tsx` | Replace bespoke controls with shared upload field/state; block stale save. |
| Component modal UI | `src/components/workshop/component-library-manager/AddComponentModal.tsx` | Integrate shared upload field and attachment scan/review/download states. |
| Estimate sheet row image modal | `src/components/workshop/estimate-sheet/rows/cells.tsx`, `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts`, `src/lib/component-library/project-component-projection.ts` | Register row-owned project-component image surface; migrate modal to shared upload field; attach finalized asset to row snapshot/projection. |
| Legacy component form | `src/components/workshop/component-library/NewComponentForm.tsx` | Remove or harden base64 FileReader upload bypass. |
| Domain actions | `src/lib/projects/actions.ts`, `src/lib/component-library/actions.ts` | Accept asset/session references; stop trusting raw hidden fields/JSON paths. |
| URL normalization | `src/lib/publication/image-url.ts`, `src/lib/estimates/image-url.ts`, `next.config.ts` | Move from Supabase public URL allowlist to upload asset resolver. |
| Cleanup | `src/lib/mass-deletion/storage-cleanup.ts` | Extend to upload asset/session cleanup and component archive policy. |

## Database And Migrations

Likely affected:

- New `upload_sessions`, `upload_assets`, `upload_events`.
- RLS policies, grants, scoped RPCs/routes, and admin/security read paths for upload-domain tables.
- Add asset references to projects metadata or normalized project image fields.
- Add `upload_asset_id` to `cost_library_item_variant_attachments`.
- Add component image `image_asset_id` and `thumbnail_asset_id` references for variant/price-option image data, plus an item-level thumbnail asset reference where current thumbnail metadata lives.
- Add estimate row image asset reference or validated descriptor for `estimate_row_items.source_snapshot`/row-owned project-component projection compatibility.
- Add constraints tying asset scan/finality to attachment approval.
- Tighten storage policies for `component-images` and `component-attachments`.
- Backfill existing storage objects where possible.

High-risk migration points:

- Existing `library_trust_governance` added indexes/constraints in one migration; future large-table migration should split backfill, constraints, and index creation.
- Direct storage policy tightening can break any hidden client-direct upload usage.
- Public component image privacy migration affects publication/estimate rendering.
- Upload-domain table grants can accidentally expose object metadata if RLS is not enabled before data writes.
- Rate-limit/quota enforcement can block legitimate beta uploads if caps are set without runtime profiling.

## Tests Impact

Add or update:

- `tests/vitest/upload-route-contracts.test.ts`
- `tests/vitest/upload-malicious-file-validation.test.ts`
- `tests/vitest/upload-orphan-cleanup.test.ts`
- `tests/vitest/upload-provider-adapter.test.ts`
- Upload-domain table RLS/grant tests.
- Upload abuse-prevention tests for rate limits, quotas, active sessions, and scanner backpressure.
- Upload DOM tests in existing project/component UI suites.
- Estimate-sheet row image modal DOM/update/projection tests.
- Env-gated storage proof test/script.
- Existing `auth-sensitive-api-boundaries.test.ts`, `component-library-attachment-lifecycle.test.ts`, `storage-cleanup-allowlist.test.ts`, `estimate-image-url.test.ts`.

## External Dependencies

Current:

- Supabase Storage/Postgres/RLS.
- `sharp` for image validation and transforms.
- Browser APIs: XHR, fetch, File, FormData, canvas, `createImageBitmap`, `URL.createObjectURL`.

Potential:

- Malware/AV scanner or CDR service for attachments.
- Background job/queue for scans and cleanup.
- S3-compatible provider SDK if moving beyond Supabase client abstraction.

No new dependency should be added until a future implementation plan chooses it with explicit tradeoffs.

## Rollout Risk Areas

- Authz tightening may expose existing users who relied on broad workspace membership.
- Removing direct storage writes may break manual or legacy upload paths.
- Moving component images private may require replacing public URLs in stored estimates/publications.
- Moving component images private must include estimate-row `sourceSnapshot.imageUrl` and project-component projection readers, not only reusable library component rows.
- Scan quarantine can delay component availability; UX must explain pending state.
- Cleanup jobs can accidentally delete active assets if finality constraints are incomplete.

## Documentation Impact

Update after implementation:

- `.ai/10_state/current-state.md` fast path.
- `.ai/10_state/decisions.md` for component image privacy, scan provider, direct storage policy, provider abstraction.
- `.ai/01_roadmap/03-supabase-rls-storage-readiness.md` to remove stale direct update/delete claims.
- UX-034 attachment review lifecycle docs to align storage/security impact.
- API/agent docs if new upload broker becomes a reusable subsystem.
