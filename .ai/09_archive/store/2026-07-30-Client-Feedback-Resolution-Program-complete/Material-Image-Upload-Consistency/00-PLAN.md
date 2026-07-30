# Material Image Upload Consistency Plan

## Status

- Package: `CONDITIONALLY_READY`
- Implementation: `NOT_STARTED`
- Plan-creation evidence: `Q0_CONTRACT_ONLY`; the plan-pack validator must pass before handoff.
- Planned implementation profile: `Q2_CRITICAL_CHANGE_GATE` because the work changes authenticated uploads, authorization/ownership, R2 objects, D1 upload records, component/estimate persistence, and critical UI recovery behavior.
- First ready unit: `UNIT-001`
- Execution model: one lead writer, serial heavy commands, no nested implementation agents. Only `UNIT-001` is initially `READY`; dependency-bound units remain `PLANNED`. Q2 completion requires a distinct read-only quality reviewer and a distinct security/data-boundary reviewer.
- Cross-pack order: non-overlapping server/persistence/controller units may begin
  after their own baseline. `Material-Brand-Supplier-Category-Governance` must
  release `AddComponentModal.tsx`, `EstimateSheetContent.tsx`, and
  `rows/cells.tsx` before this pack's `UNIT-004` or `UNIT-005` edits them.

### Current-source refresh — 2026-07-30

The 20 MiB modal versus 12 MiB inline mismatch, browser-side modal transform,
project-level versus row-level ownership, and full-price-option image-save
coupling remain. `component-image.publicUrlAllowed` is currently true while
`project-image.publicUrlAllowed` is false; this pack now preserves those
ownership-specific serving policies while unifying admission, server
processing, descriptor shape, persistence truth, and errors. Active unfamiliar
edits in upload records/providers must not be overwritten.

## Task Contract

### Objective and intent

Give Page 001 inline material image upload and Edit Component image upload one end-to-end contract for source admission, server processing, errors, policy-correct storage/serving, asset descriptors, ownership, persistence, optimistic state, retry/cancel, and accessibility.

The completed behavior must make the same file produce the same accepted/rejected result and canonical WebP/thumbnail descriptor shape from either entry point. Project-row assets remain privately brokered; reusable component-library assets retain the current component-image serving policy. An upload is not shown as saved until its descriptor is durably attached to the intended estimate row or Library component/variant.

### Scope, inputs, and authority

- In scope: Page 001 inline image editor; Add/Edit Component image control; project and component-library image POST contracts; row-scoped project image ownership; shared client upload state; focused Library image persistence without hydrated price options; current estimate-row image validation; retry/cancel/remove; accessibility; R2/Images/D1 boundaries; cross-entry regression and Q2 evidence.
- Authoritative inputs: `AGENTS.md`,
  `.ai/03_plans/2026-07-28/Client-Feedback-Resolution-Program/evidence/client-feedback.md`,
  current upload policy/routes/processing/storage code, current estimate and
  component mutation code, PP-C-R and its image correction, and this canonical
  plan.
- Current source is authoritative for route consumers and provider bindings. The attachment identifies the mismatch but does not override the observed shared server processing.
- No current product file is changed during plan creation.

### Constraints and dependencies

- Server-side `processUploadImageToWebp` is already the canonical decode/resize/WebP/thumbnail layer for both current routes. This plan retains it as the only transform layer and removes Edit Component's browser WebP transform; it does not add a second compression pass.
- One source-file cap is `12 MiB`, matching current project/component upload policies and Worker route admission. The current modal-only `20 MiB` promise is removed rather than raising route/provider limits without evidence.
- Accepted declared/source formats remain JPEG, PNG, WebP, and AVIF; server magic-byte/decode/pixel validation is authoritative. Client validation is a shared fail-fast mirror, not a security boundary.
- Maximum decoded pixels remain `24,000,000`; maximum optimized edge remains `1600`; thumbnail edge/quality remain the current shared server values unless focused evidence requires a lower safe value.
- Cloudflare `IMAGES` decodes/transforms in Worker runtime; local tests use the current Sharp fallback. `ARCH_UPLOADS_R2` is authoritative object storage. D1 `upload_sessions`/`upload_assets` own lifecycle/metadata. Private broker routes serve bytes. Do not turn Cloudflare Images delivery or a public URL into storage truth.
- Preserve unfamiliar edits. `src/lib/uploads/direct-upload-records.ts`, `r2-storage-provider.ts`, and `upload-records.ts` are currently modified by others and are read-only dependencies for this pack unless a newly proven blocker forces a plan refresh.
- No feature flag, dual endpoint compatibility period, rollout ceremony, hosted proof, deployment, paid service, or external mutation.

### Owner, capabilities, tools, and permissions

- Owner: one lead implementation agent in the current shared worktree.
- Capability class: frontier judgment for upload ownership/security/persistence; ordinary React/TypeScript capability for bounded UI integration.
- Read permission: repository-wide, current diff/status, provider config, local Worker/D1/R2 fixtures, and current GitNexus index.
- Write permission during implementation: only the exact paths assigned to the active unit; one writer per shared path.
- External boundary: none for local code/tests. Production deployment/provider readback and destructive object/data operations remain out of scope.

### Required behavior and artifacts

- Shared upload policy/result/error types consumed by both entry points and both route surfaces.
- One server transform invocation per accepted source; no browser resize/compress path.
- Project material uploads are attached to the persisted estimate row, not only the project.
- Library image persistence validates the finalized component-image asset and updates one targeted variant/component revision without requiring all price options to be hydrated.
- Upload and domain-save phases are separately represented. Save retry reuses the uploaded asset descriptor and does not reupload bytes.
- Provisional assets are either claimed by persistence or explicitly removed/eligible for existing cleanup; no false `Saved` state.
- Machine-readable route, component, browser, accessibility, mutation, coverage, security, and aggregate evidence.

### Acceptance and evidence decision

- All acceptance criteria are currently `FAIL`; no product implementation or executable proof has run.
- Each critical invariant requires `TEST_TASK` evidence under standing local authorization: boundaries, magic/decode/pixels, ownership, persistence, retry/cancel, orphan cleanup, accessibility, and cross-entry parity.
- Red-before-green reproductions are required where feasible for modal `20 MiB`/client transform mismatch, inline-vs-modal route ownership, hydrated-pricing failure, response loss/save retry, and inaccessible status/focus behavior.

### Stop and escalation conditions

- Stop successfully only when every unit is `VERIFIED`, all criteria/tests/gates are fresh `PASS`, Q2 aggregates `PASS`, both independent reviews approve, and there are zero unresolved high/critical findings or high-risk mutants.
- Stop as `QUALITY_BLOCKED`, never `PASS`, if required evidence is prevented solely by protected concurrent work after exact hashes/failures are recorded.
- Escalate only a real destructive, credentialed, paid, external-production, or ownership boundary. Route consolidation, the 12 MiB choice, transform ownership, and persistence timing are decided here.

## Current Source Evidence

Observed against `HEAD 214fd2af3564c6c90d6bb46a7f2f7bd19faa811d` on 2026-07-28. Anchors must be refreshed after C1 or any concurrent edit.

### Inline Page 001 client path

- `src/components/workshop/estimate-sheet/rows/cells.tsx:55`-`:56` sets a `12 MiB` client cap and accepted MIME types.
- `uploadEstimateImage` at `src/components/workshop/estimate-sheet/rows/cells.tsx:163`-`:212` sends Library images to `/api/component-library/images` and Project rows to `/api/estimate-row-images`; Project form data includes persisted row ownership.
- Client admission at `src/components/workshop/estimate-sheet/rows/cells.tsx:214`-`:218` checks declared MIME, non-empty file, and 12 MiB. It performs no browser transform.
- `ExpressMaterialImageEditor` at `src/components/workshop/estimate-sheet/rows/cells.tsx:509`-`:830` already has preview, abort, cancel, retryable errors, and a persisted-row wait state (`:586`-`:645`, `:688`-`:715`).
- End-to-end, inline images are resized and emitted as WebP/thumbnail by the server route; “no client resize” does not mean “never resized.”

### Edit Component client path

- `src/components/workshop/component-library-manager/AddComponentModal.tsx:204` defines the current `20 MiB` source cap, with `1600` edge and quality `0.82` constants nearby.
- `resizeImageForUpload` at `src/components/workshop/component-library-manager/AddComponentModal.tsx:807`-`:828` decodes in the browser, draws to canvas, and emits WebP when beneficial.
- `uploadComponentImage` at `src/components/workshop/component-library-manager/AddComponentModal.tsx:830`-`:839` posts to `/api/projects/images` when a project ID exists and `/api/component-library/images` otherwise.
- The input handler at `src/components/workshop/component-library-manager/AddComponentModal.tsx:1464`-`:1530` accepts 20 MiB, silently falls back to the original after a browser transform failure, and then enters a route that accepts only 12 MiB. The browser-produced WebP is decoded and encoded again by the server.
- Modal image ownership is project-level when `/api/projects/images` is used, while inline Project upload is estimate-row-level.

### Shared client state and transport

- `src/lib/uploads/client-state.ts:1`-`:73` defines selected/processing/uploading/uploaded/retryable/terminal state helpers and status roles; inline uses it and the modal does not.
- `src/lib/uploads/client-upload.ts:3`-`:17` defines typed retryability, `:31` sets timeout, `:37`-`:57` links abort signals, and `:73`-`:133` normalizes route/network/timeout/cancel behavior.

### Server admission and processing

- `/api/estimate-row-images` uses 12 MiB, 24 MP, and 1600 edge at `src/app/api/estimate-row-images/route.ts:29`-`:31`; POST begins at `:138`.
- That route requires a persisted project/estimate/row and edit permission at `src/app/api/estimate-row-images/route.ts:162`-`:209`, invokes `processUploadImageToWebp` at `:231`, records an `estimate-row` target at `:277`-`:303`, and returns the canonical private descriptor at `:305`-`:340`.
- `/api/projects/images` duplicates the same limits at `src/app/api/projects/images/route.ts:42`-`:44`; POST begins at `:308`. It uses the same processor at `:374` but records only a `project` target at `:421`-`:444`.
- `/api/component-library/images` duplicates the same limits at `src/app/api/component-library/images/route.ts:29`-`:31`; POST begins at `:232`, checks workspace-library permission at `:238`-`:240`, uses the same processor at `:262`, and records a provisional component-library asset at `:296`-`:319`.
- `src/lib/uploads/server-image-processing.ts:299` defines `processUploadImageToWebp`; Worker output is WebP quality 82 and thumbnail quality 85 at `:275`-`:279`, while the local Sharp path uses the same intent at `:338`-`:344`.
- `src/lib/uploads/server-image-processing.ts:137`-`:145` reads the `IMAGES` binding; `wrangler.jsonc:25`-`:27` binds `IMAGES`.

### Storage and lifecycle boundaries

- `src/lib/uploads/policy.ts:20`-`:41` gives project-image and component-image the same 12 MiB, 24 MP, and MIME policy, but deliberately differs on public URL allowance (`false` for project images, `true` for component images). Preserve that serving distinction unless a separate security requirement changes it.
- `src/lib/uploads/runtime-storage-provider.ts:24`-`:35` resolves `ARCH_UPLOADS_R2`; `wrangler.jsonc:33`-`:38` binds the `archestimator-proof-uploads` bucket.
- Routes write optimized and thumbnail objects, then call `recordUploadAsset`; brokered `/api/projects/images?path=...` or `/api/component-library/images?path=...` URLs are the readable boundary.
- Existing cleanup/removal claims in `src/lib/uploads/cleanup.ts:125`-`:138` and `src/lib/uploads/removal-claims.ts:67`-`:120` understand component/project image paths and thumbnails.

### Persistence mismatch

- Inline linked-Library persistence builds a full price-option graph at `src/components/workshop/EstimateSheetContent.tsx:221`-`:310`; it hard-fails when `item.priceOptions` is not hydrated at `:229`.
- `commitLinkedLibraryComponentInline` at `src/components/workshop/EstimateSheetContent.tsx:2318`-`:2468` calls the full `updateCostLibraryComponentWithPriceOptions` path, even though the user changed only one image.
- Component mutation already validates a finalized, workspace-owned `component-image` asset at `src/lib/component-library/component-mutation-d1.ts:974`-`:1023` and synchronizes brand/supplier/image/version data to linked estimate rows at `:1931`-`:1947`.
- Estimate-row image persistence validates asset ID/session/project/estimate/row at `src/lib/estimates/actions.ts:1413`-`:1449` using `src/lib/estimates/d1-intents/access.ts:84`-`:108`.
- Project row editing persists source snapshot image URL and `imageAsset` through `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts:489`-`:535` and the row action.

### Direct callers and concurrent edits

- The only product POST caller of `/api/estimate-row-images` is `src/components/workshop/estimate-sheet/rows/cells.tsx:178`; direct replacement with row-targeted `/api/projects/images` is therefore bounded.
- `/api/projects/images` also serves project details/new-project images and client-portal brand assets (`src/components/workshop/project-image-client.ts:41`, `src/app/api/client-portals/[portalId]/brand-assets/route.ts:3`). Its project-level mode must remain valid and use the same canonical result shape.
- Current concurrent modifications in `src/lib/uploads/direct-upload-records.ts`, `src/lib/uploads/r2-storage-provider.ts`, and `src/lib/uploads/upload-records.ts` are unfamiliar. This pack does not own them and must consume their latest interfaces without overwrite.
- GitNexus is stale/partial. Missing process results are `UNKNOWN`, not LOW risk; refresh/impact each edited symbol before implementation.

## Scope

### Included

- Shared 12 MiB/24 MP/JPEG-PNG-WebP-AVIF admission and error contract.
- Server-only decode/orientation/scale/WebP/thumbnail processing through the existing shared processor.
- Canonical upload result and asset descriptor parsing.
- Row-target mode in `/api/projects/images`; deletion of the now-redundant `/api/estimate-row-images` route and its only caller.
- Existing project-level `/api/projects/images` mode for project covers/brand assets.
- Shared client selection/upload/abort/retry/provisional cleanup controller.
- Separate upload and persistence phases with retry-save-without-reupload.
- Focused Library variant image mutation and existing estimate-row image mutation integration.
- Inline persisted/draft row and Edit Component existing/new-item behavior.
- Accessibility and cross-entry browser/Worker/D1/R2 evidence.

### Non-goals

- Raising upload limits above 12 MiB, inventing chunked/resumable image upload, or changing attachment/artifact policies.
- A second client compression algorithm, double-compression tuning, or browser-specific canvas output.
- Public object URLs, Cloudflare Images delivery as source of truth, a new R2 bucket, or external provider migration.
- Editing the unfamiliar upload-record/R2 files unless a fresh blocker causes this pack to be revised.
- A general media library, crop editor, multi-image gallery, CDN redesign, or visual redesign outside the two controls.
- Production upload proof, deployment, paid features, or provider mutations.
- Compatibility forwarding from `/api/estimate-row-images`; current callers are replaced and the route is deleted.

## Requirements

### `REQ-001` - One source admission contract

Both entry points accept the same non-empty JPEG/PNG/WebP/AVIF source up to 12 MiB, use the same messages/codes, and reject the same boundary cases. Client checks mirror shared constants; server magic/decode/pixel checks remain authoritative.

### `PERF-001` - One authoritative transform layer

Accepted bytes are decoded/oriented/scaled to at most 1600 edge and emitted as canonical WebP plus thumbnail exactly once by `processUploadImageToWebp`. Edit Component removes `resizeImageForUpload`; no client canvas/WebP fallback remains.

### `SEC-001` - Ownership and private-provider boundaries

Project material images are uploaded with project+estimate+persisted row ownership and can only be attached/read/deleted by authorized workspace/project actors. Library assets are workspace-scoped and can only be claimed by a component/variant in that workspace. `IMAGES` transforms, R2 stores, D1 tracks, and brokers serve private objects.

### `DATA-001` - One canonical descriptor and claim contract

Both route modes return the same validated top-level result from which one `upload-asset` descriptor is built. Domain persistence verifies asset/session/surface/bucket/path/target and records the target claim before UI reports Saved.

### `DATA-002` - Focused Library persistence does not require hydration

An existing Library component image update requires component ID, price-option ID, asset descriptor, expected revision/impact fingerprint, and intent ID only. It validates and updates that variant/component thumbnail/version and linked rows without submitting unrelated price options.

### `UX-001` - Upload and save state are truthful and recoverable

Both controls share preview, progress/busy status, cancel, upload retry, persistence retry, remove, and cleanup semantics. Upload success enters `Saving`/`Ready to save`; only authoritative domain persistence enters `Saved`. Persistence retry reuses the descriptor and does not upload again.

### `UX-002` - Draft/new target behavior is explicit

A draft estimate row waits until its persisted row ID exists before uploading. A new component may hold a provisional Library asset until Create claims it; closing/removing before Create requests deletion. Existing targets persist immediately after upload and update their authoritative revision.

### `UX-003` - Accessibility is equivalent

Both controls provide a labeled file input/trigger, keyboard operation, `aria-busy`, polite progress/success, assertive error, visible non-color-only state, focus return after close/cancel, and operable Retry/Remove buttons at 200% zoom and configured devices.

### `OPS-001` - Failures do not leak false state or durable orphans

Abort/network/timeout/5xx/conflict/domain-save/remove failures are typed and retryable only where safe. Uploaded-but-unclaimed assets are explicitly removed on discard or remain eligible for existing delayed cleanup. No path marks an asset saved after a failed D1 claim.

## Decisions

### `DEC-AUTO-001` - Server processing is authoritative

Delete the modal's browser decode/canvas/WebP transform. The client validates declared type/size/non-empty and previews locally; the server sniffs, decodes, enforces pixels, orients, scales, emits WebP/thumbnail, and returns dimensions. This removes double compression and browser variability.

### `DEC-AUTO-002` - Standardize on the current 12 MiB source limit

Both controls advertise and enforce 12 MiB. The old modal-only 20 MiB allowance is incorrect because every current route and shared image policy accepts 12 MiB. This pack does not raise Worker/provider limits without measured evidence.

### `DEC-AUTO-003` - Consolidate Project POST through `/api/projects/images`

Add explicit optional `estimateId` and `rowItemId` form fields to the existing project route. When both are present, authorize and record `target_entity_type='estimate-row'`; when neither is present, preserve current project-level ownership for project covers/brand assets. Partial or mismatched target fields fail closed. Replace the sole `/api/estimate-row-images` caller and delete that route without a forwarding shim.

### `DEC-AUTO-004` - Keep two authorization surfaces, one processing/result contract

`/api/projects/images` and `/api/component-library/images` retain their different project/workspace authorization and storage namespaces, but import the same policy, server processor/orchestrator, error envelope, and result type. Unifying security contexts into one route would weaken ownership clarity.

### `DEC-AUTO-005` - Use a focused image mutation for existing Library components

Add `updateCostLibraryComponentVariantImage` using the current component mutation receipt/version/sync machinery. It updates one variant image and derived component thumbnail/version, claims the finalized asset, synchronizes linked estimates, and avoids unrelated hydrated pricing.

### `DEC-AUTO-006` - Persist existing targets immediately; defer only new targets

Inline rows and Edit Component for existing rows/components call domain persistence immediately after upload. The modal absorbs the authoritative new revision so later full Save does not conflict. New component creation holds a provisional descriptor and claims it in Create.

### `DEC-AUTO-007` - Retry save without retrying bytes

Client state stores the accepted descriptor separately from save state. A save conflict/network failure retains the descriptor and local preview. Retry refreshes expected target revision as allowed and repeats only the domain mutation. Upload retry is used only before a descriptor exists.

### `DEC-AUTO-008` - Keep provider roles narrow

`IMAGES`/Sharp are transformation engines, `ARCH_UPLOADS_R2` stores optimized/thumbnail bytes, D1 stores lifecycle/ownership/checksum metadata, and authenticated brokers serve objects. No route returns or persists a public provider URL.

## End-to-End Contract

### Source admission

- `file.size > 0` and `file.size <= 12 * 1024 * 1024`.
- Declared MIME, when present, is one of JPEG/PNG/WebP/AVIF; server magic MIME must be in the same set and must agree sufficiently to decode safely.
- Server decoded pixel count is at most `24,000,000`.
- Client error codes/messages come from the shared contract; server may replace a client-accepted file with a stronger authoritative rejection.
- Exact 12 MiB is accepted subject to other checks; 12 MiB plus one byte is rejected with `413` and non-retryable `too_large`.

### Processing

1. Route authenticates and authorizes target before expensive processing.
2. Route enforces content length/body/file admission and magic bytes.
3. `processUploadImageToWebp` runs once on original source bytes.
4. Processor applies orientation, scale-down only, canonical optimized WebP quality 82, and thumbnail quality 85.
5. Route writes both objects to R2; if either write or D1 record fails, it invokes existing cleanup for written paths and returns no descriptor.
6. Route records the upload asset/session and returns one canonical result.

### Canonical route result

Both routes return the same top-level fields:

- `assetId`, `uploadSessionId`, `bucket`, `path`, `thumbnailPath`;
- brokered `url`, `thumbnailUrl`;
- canonical `contentType: 'image/webp'`, optimized `sizeBytes`, width/height;
- thumbnail width/height, original source bytes/MIME/dimensions when already recorded, checksum, and scan status.

The client builds one `UploadAssetDescriptorV1` from this result. Missing/invalid fields are a retryable protocol error and are never persisted as a URL-only success.

### Domain persistence

- Project estimate row: D1 validation must match asset ID, session, workspace/project, estimate, row target, status, bucket/path, and scan state before source snapshot reference is accepted.
- Library component: focused mutation must match asset/session/workspace, `surface='component-image'`, finalized/not-required scan, bucket/path, component and price-option ownership, and expected component revision/fingerprint.
- Existing target UI state transitions `uploading -> saving -> saved`; a save error transitions to `save-retryable-error` while retaining descriptor.
- Removing a persisted image uses the domain mutation first, then existing removal/cleanup claims. Removing a provisional image uses the route DELETE/cleanup path and clears local state only after an accepted response or explicit cleanup-queued result.

### Error envelope

Routes return `{ error: { code, message, retryable } }` with status aligned to class:

- `400`: empty/unsupported/magic/decode/pixel/partial-target/invalid descriptor; non-retryable.
- `401|403|404`: authentication, authorization, or target ownership; non-retryable and tenant-redacted.
- `409`: stale target revision or asset already claimed incompatibly; persistence retry requires authoritative refresh.
- `408|429|5xx`: retryable transport/admission/provider failure according to current `client-upload` policy.
- Client abort is retryable but announced as canceled, not failed/saved.

## Accessibility and Interaction Contract

- The visible trigger names the target (`Upload material image` or `Replace material image`) and is associated with the file input.
- Preview opens only from an explicit control; dialog has accessible name, close label, focus trap, Escape behavior, and returns focus to its opener.
- Processing/upload/save uses `aria-busy=true` and a polite `role=status` message.
- Validation, transport, ownership, and save errors use `role=alert`; the actionable Retry/Choose another file control follows the message in focus order.
- Cancel is available while transport is active; Retry upload appears only before a descriptor; Retry save appears only after a descriptor.
- Remove remains keyboard reachable and names whether it removes a provisional or saved image.
- No status relies on color, animation, or image preview alone. At 200% zoom and configured narrow devices, controls remain visible without two-dimensional page overflow.

## Dependency DAG

```text
UNIT-001 Shared server policy, route, result
    -> UNIT-002 Focused domain persistence
    -> UNIT-003 Shared client controller/state
C1 shared-file completion/rebaseline + UNIT-002 + UNIT-003
    -> UNIT-004 Page 001 integration
    -> UNIT-005 Edit Component integration
UNIT-004 + UNIT-005
    -> UNIT-006 Cross-entry Q2 evidence and reviews
```

The C1 prerequisite gates only shared UI integration and is executable local
work, not a human approval. All C2 units remain assigned to one lead writer.

## Unit Contracts

### `UNIT-001` - Unify server policy, processing orchestration, and routes

- Goal: make current shared server processing the sole transform and give both authorization surfaces one policy/result/error contract.
- Depends on: a fresh scoped baseline. This unit does not edit C1-owned shared
  UI files.
- Owned paths:
  - `src/lib/uploads/policy.ts`
  - `src/lib/uploads/image-upload-contract.ts` (new)
  - `src/lib/uploads/server-material-image-upload.ts` (new)
  - `src/lib/uploads/server-image-processing.ts`
  - `src/app/api/projects/images/route.ts`
  - `src/app/api/component-library/images/route.ts`
  - `src/app/api/estimate-row-images/route.ts` (delete)
  - `src/components/workshop/project-image-client.ts`
  - `tests/vitest/material-image-upload-routes.test.ts` (new)
  - `tests/vitest/cloudflare-image-processing.test.ts`
  - `tests/vitest/upload-domain-contracts.test.ts`
  - `tests/vitest/auth-sensitive-api-boundaries.test.ts`
  - `tests/vitest/project-creation-ui.test.ts`
- Read-only dependencies: `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`; current dirty `upload-records.ts`, `r2-storage-provider.ts`, and `direct-upload-records.ts`; `runtime-storage-provider.ts`; cleanup/removal claims; client-portal brand-assets forwarding route.
- Implementation boundary: server policy/auth/storage/result plus direct route caller contract. Do not edit modal/inline UI or upload-record internals.
- Acceptance evidence: exact/+1 size, empty/type/magic/decode/pixels, processor call count one, R2 partial-write cleanup, D1 record failure, project vs row target, workspace/project denial, common result, broker URLs, project-cover/brand-asset regression, and no estimate-row route/caller remains.
- Recovery: route failure deletes already-written task objects through current provider cleanup; no descriptor is returned before D1 record success. Preserve unfamiliar upload internals and revise the pack if their changed interface blocks this unit.
- Completion signal: `TEST-001` passes and route/static scans prove one shared server transform path.

### `UNIT-002` - Add focused image persistence

- Goal: attach one accepted descriptor to the intended existing target without unrelated pricing hydration.
- Depends on: `UNIT-001`.
- Owned paths:
  - `src/lib/component-library/actions.ts`
  - `src/lib/component-library/component-mutation-d1.ts`
  - `src/lib/estimates/actions.ts`
  - `src/lib/estimates/d1-intents/access.ts`
  - `tests/vitest/component-library-variant-image-mutation.test.ts` (new)
  - `tests/vitest/estimate-sheet-actions-authz.test.ts`
  - `tests/vitest/component-library-actions-revalidation.test.ts`
- Read-only dependencies: current component update receipt/version/sync helpers, upload asset tables, and removal claims.
- Implementation boundary: focused Library image action plus exact project-row descriptor validation. No UI changes and no broad component mutation rewrite.
- Acceptance evidence: successful claim/version/thumbnail/linked-row sync; missing price option, unhydrated siblings, stale version/fingerprint, wrong workspace/surface/bucket/path/session/row, replay, conflict, remove, and D1 batch failure.
- Recovery: one receipt-backed D1 transaction; failed guards leave component/row/asset/event unchanged. Retry reuses mutation intent and descriptor.
- Completion signal: `TEST-002` passes without constructing a full price-option payload.

### `UNIT-003` - Share client admission and upload state

- Goal: give both controls one lazy client controller built on current transport/state primitives, with no browser transform.
- Depends on: `UNIT-001`.
- Owned paths:
  - `src/lib/uploads/client-image-upload.ts` (new)
  - `src/lib/uploads/client-image-state.ts` (new)
  - `src/lib/uploads/client-state.ts`
  - `src/lib/uploads/client-upload.ts`
  - `src/components/workshop/material-image-upload/use-material-image-upload.ts` (new)
  - `tests/vitest/material-image-upload-client.test.ts` (new)
  - `tests/vitest/upload-client-state.test.ts`
- Implementation boundary: validation, endpoint/form-data selection, canonical result parsing, preview lifecycle, abort/upload retry, save-phase state, and provisional cleanup callbacks. No component/estimate rendering.
- Acceptance evidence: identical errors, exact size boundaries, no decode/canvas call, abort/timeouts/429/5xx, malformed result, object URL cleanup, upload-vs-save retry, and save retry causes zero fetch/upload calls.
- Recovery: abort controller and object URL are disposed on replacement/unmount; descriptor remains until saved/removed; no hidden retry loop.
- Completion signal: `TEST-003` passes and static scan finds no client resize implementation in the shared controller.

### `UNIT-004` - Integrate Page 001 inline upload and persistence

- Goal: use the shared controller, row-target project route, and focused Library mutation from inline Page 001.
- Depends on: `UNIT-002`, `UNIT-003`.
- External dependency: C1 product edits must be complete and the shared
  `rows/cells.tsx` and `EstimateSheetContent.tsx` paths released.
- Owned paths:
  - `src/components/workshop/estimate-sheet/rows/cells.tsx`
  - `src/components/workshop/estimate-sheet/rows/editable-row-model.ts`
  - `src/components/workshop/EstimateSheetContent.tsx`
  - `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts`
  - `tests/vitest/estimate-linked-library-image-upload.test.tsx`
  - `tests/vitest/material-image-upload-entry-points.test.tsx` (new)
  - `tests/vitest/estimate-sheet-library-insert.test.tsx`
  - `tests/vitest/estimate-component-drag.test.tsx`
- Implementation boundary: inline image UI/dispatch only. Brand/Supplier/category portions owned by C1 are preserved. Do not modify shared server/provider internals.
- Acceptance evidence: persisted row target, draft wait, Library focused mutation without price options, optimistic preview, cancel, upload retry, save retry without fetch, authoritative reload, remove/cleanup, and accessible statuses/focus.
- Recovery: draft creation failure never starts upload; upload failure retains file for retry; save failure retains descriptor; row/component conflict refreshes target revision before explicit save retry.
- Completion signal: `TEST-004` passes and inline no longer references `/api/estimate-row-images` or builds hydrated pricing solely for image persistence.

### `UNIT-005` - Integrate Edit Component upload and persistence

- Goal: replace modal-only 20 MiB/client WebP behavior with the same controller/route/persistence contract.
- Depends on: `UNIT-002`, `UNIT-003`.
- External dependency: C1 product edits must be complete and the shared
  `AddComponentModal.tsx` and `EstimateSheetContent.tsx` paths released.
- Owned paths:
  - `src/components/workshop/component-library-manager/AddComponentModal.tsx`
  - `src/components/workshop/EstimateSheetContent.tsx`
  - `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
  - `tests/vitest/library-add-component-modal-a11y.test.tsx`
  - `tests/vitest/material-image-upload-entry-points.test.tsx`
- Implementation boundary: image-specific modal code and callback/revision integration only. Preserve C1 master/category changes and all unrelated variant fields.
- Acceptance evidence: 12 MiB label/error parity, no `resizeImageForUpload`/canvas/WebP transform, existing Project row target, existing Library focused save, new-component provisional claim/discard, save revision refresh, cancel/retry/remove, and accessibility.
- Recovery: existing target image save is authoritative and updates modal revision; later full-form failure does not undo the already-labeled saved image. New-target close removes provisional asset and does not create a component.
- Completion signal: `TEST-005` passes and client-transform/20 MiB scans return no modal matches.

### `UNIT-006` - Reconcile cross-entry Q2 evidence

- Goal: prove both entry points and both ownership surfaces are equivalent, secure, accessible, recoverable, and provider-correct.
- Depends on: `UNIT-004`, `UNIT-005`.
- Owned paths:
  - `e2e/material-image-upload-consistency.spec.ts` (new)
  - focused tests listed in `TEST-001` through `TEST-005` when a missing assertion is exposed
  - task-owned source only for repairs; generated evidence belongs under `artifacts/quality/`
- Implementation boundary: evidence and scoped fixes only; no unrelated upload refactor or gate weakening.
- Acceptance evidence: complete command set, configured browser/device matrix, Worker processing, D1/R2/cleanup faults, critical coverage/mutation, GitNexus/diff reconciliation, independent quality review, distinct security review, and aggregate Q2 `PASS`.
- Recovery: repair the narrowest failing surface, rerun its evidence, then rerun aggregate. Attribute inherited dirty failures exactly.
- Completion signal: `TEST-006`, `GATE-Q2`, and all criteria are `PASS`; every unit is `VERIFIED`.

## Acceptance Criteria

### `AC-001` - Admission and transform parity

Both entry points accept/reject the same boundary fixtures, call no client transform, invoke the server processor exactly once, and return equivalent canonical WebP/thumbnail metadata.

### `AC-002` - Tenant and target ownership

Project/estimate/row and workspace/component authorization, asset/session/surface/path checks, broker access, delete/remove, and redacted denial cases execute without cross-tenant or target substitution.

### `AC-003` - Persistence without hydration

Inline and modal existing-Library image changes persist one variant/component revision and linked-row projection when sibling price options are absent; stale/conflict/replay cases are safe.

### `AC-004` - Truthful optimistic and retry behavior

Preview, busy, cancel, upload error/retry, save error/retry, saved, remove, and cleanup states are distinguishable; save retry performs no upload and authoritative reload retains the image.

### `AC-005` - Accessible cross-entry interaction

Both controls meet labeling, keyboard, live-region, focus, non-color, zoom, and configured device/browser requirements in component and browser evidence.

### `AC-006` - Provider and failure recovery

Worker `IMAGES`/local Sharp processing, R2 optimized+thumbnail storage, D1 lifecycle claims, broker URLs, partial-write/D1 failure cleanup, and provisional cleanup execute with no false success/orphan outside policy.

### `AC-007` - Q2 completion

Static, focused, Worker, D1/R2, browser/device, accessibility, coverage, mutation, independent review, security review, and aggregate artifacts are fresh and `PASS`, with no skipped/flaky/high-risk result.

## Tests and Exact Evidence Commands

Run serially from repository root after a healthy memory sample and with no other heavy command active.

### `TEST-001` - Route, policy, processor, and provider contract

```powershell
bun x vitest run tests/vitest/material-image-upload-routes.test.ts tests/vitest/cloudflare-image-processing.test.ts tests/vitest/upload-domain-contracts.test.ts tests/vitest/auth-sensitive-api-boundaries.test.ts tests/vitest/project-creation-ui.test.ts --maxWorkers=1 --reporter=json --outputFile=artifacts/quality/material-image-routes.json
rg -n "/api/estimate-row-images" src tests e2e
```

Expected: tests exit `0` with no skipped failures; exact/+1, MIME/magic/decode/pixel, one processor call, project/row target, project-cover/brand-asset, partial-write, D1 record, private broker, and cleanup cases pass; route scan exits `1` with no matches.

### `TEST-002` - Focused persistence and denial

```powershell
bun x vitest run tests/vitest/component-library-variant-image-mutation.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts tests/vitest/component-library-actions-revalidation.test.ts --maxWorkers=1 --reporter=json --outputFile=artifacts/quality/material-image-persistence.json
```

Expected: exit `0`; one variant image persists without sibling hydration; row/component/asset/session/workspace/surface/path/revision denial cases make zero partial changes; replay returns one authoritative result.

### `TEST-003` - Shared client state and transport

```powershell
bun x vitest run tests/vitest/material-image-upload-client.test.ts tests/vitest/upload-client-state.test.ts --maxWorkers=1 --reporter=json --outputFile=artifacts/quality/material-image-client.json
```

Expected: exit `0`; both scopes produce identical validation/errors/result parsing; abort/retry/object URL cleanup pass; save retry makes no POST/fetch upload call.

### `TEST-004` - Page 001 integration

```powershell
bun x vitest run tests/vitest/estimate-linked-library-image-upload.test.tsx tests/vitest/material-image-upload-entry-points.test.tsx tests/vitest/estimate-sheet-library-insert.test.tsx tests/vitest/estimate-component-drag.test.tsx --maxWorkers=1 --reporter=json --outputFile=artifacts/quality/material-image-inline.json
```

Expected: exit `0`; draft wait, row target, Library focused persistence without `priceOptions`, retry-save-without-reupload, reload, remove, and accessible inline states pass.

### `TEST-005` - Edit Component integration

```powershell
bun x vitest run tests/vitest/library-add-component-modal-a11y.test.tsx tests/vitest/material-image-upload-entry-points.test.tsx --maxWorkers=1 --reporter=json --outputFile=artifacts/quality/material-image-modal.json
rg -n "resizeImageForUpload|createImageBitmap|canvas\.toBlob|20\s*\*\s*1024\s*\*\s*1024" src/components/workshop/component-library-manager/AddComponentModal.tsx
```

Expected: tests exit `0`; scan exits `1` with no matches; existing Project/Library immediate persistence, new-component provisional claim/discard, 12 MiB messaging, cancel/retry/remove, and accessibility pass.

### `TEST-006` - Cross-entry browser/device journey

```powershell
bun x playwright test e2e/material-image-upload-consistency.spec.ts --workers=1 --reporter=json > artifacts/quality/material-image-playwright.json
```

Expected: every configured browser/device project passes without retries/skips; the same generated JPEG/PNG/WebP/AVIF fixture and invalid boundary fixtures produce equivalent inline/modal outcomes; saved images survive reload/reopen; cancel/save-retry/focus behavior is correct; no public URL is exposed.

### Static, build, mutation, graph, and aggregate gate

```powershell
bun run type-check
bun run lint -- src/lib/uploads/policy.ts src/lib/uploads/image-upload-contract.ts src/lib/uploads/server-material-image-upload.ts src/lib/uploads/server-image-processing.ts src/lib/uploads/client-image-upload.ts src/lib/uploads/client-image-state.ts src/lib/uploads/client-state.ts src/lib/uploads/client-upload.ts src/app/api/projects/images/route.ts src/app/api/component-library/images/route.ts src/components/workshop/project-image-client.ts src/lib/component-library/actions.ts src/lib/component-library/component-mutation-d1.ts src/lib/estimates/actions.ts src/lib/estimates/d1-intents/access.ts src/components/workshop/material-image-upload/use-material-image-upload.ts src/components/workshop/estimate-sheet/rows/cells.tsx src/components/workshop/estimate-sheet/rows/editable-row-model.ts src/components/workshop/EstimateSheetContent.tsx src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts src/components/workshop/component-library-manager/AddComponentModal.tsx src/components/workshop/component-library-manager/ComponentLibraryManager.tsx
bun run test:workers:coverage
bun run build
bun run quality:diff-coverage
bun run test:mutation:changed
bun run quality:reviews
bun run quality:security
bun run quality:critical
git diff --check
```

Expected:

- Commands exit `0`; build succeeds for the configured Next/OpenNext target.
- Worker artifact proves `IMAGES` processing and failure handling; changed critical branches reach 100% and no high-risk mutant survives.
- `artifacts/quality/reviews.json` has an approving independent quality reviewer who is not the author.
- `artifacts/quality/security.json` has an approving distinct upload/data-boundary reviewer and zero unresolved high/critical findings.
- Aggregate selects `Q2_CRITICAL_CHANGE_GATE`, attributes inherited/task-owned paths, and reports final `PASS`.
- `git diff --check` emits no whitespace error.

Before each function/class edit, run GitNexus upstream impact for the exact symbol. Before final reconciliation, run:

```text
detect_changes({scope: "compare", base_ref: "main"})
```

Expected: only planned image policy/route/processor/client/persistence/entry-point/test flows appear. Any HIGH/CRITICAL or unrelated change invalidates the plan until reviewed and incorporated.

## Gates

### `GATE-Q2` - Critical upload gate

- Status now: `FAIL` / not run.
- Requires all six tests, Worker coverage, static/lint/build, route/provider/fault/cleanup evidence, changed critical coverage/mutation, browser/device/a11y evidence, independent quality review, distinct security review, graph/diff reconciliation, and aggregate `PASS`.
- Missing, stale, skipped, flaky, malformed, canceled, or inherited-but-unattributed evidence fails closed.

### Authorization boundaries

- No active `AUTH-*` boundary blocks local implementation or local evidence.
- This pack does not authorize deployment, production object/database mutation, paid Cloudflare changes, public bucket policy, or unbound resources.

## Risks and Controls

### `RISK-001` - Removing client compression rejects files users previously expected at 20 MiB

- Control: truthful 12 MiB copy at both entry points, exact boundary tests, and one server policy. Raising the cap requires separate measured Worker/provider evidence, not silent fallback.

### `RISK-002` - Project route target mode breaks project covers/brand assets

- Control: explicit all-or-none row target fields; unchanged project-level mode; project creation/details and brand-asset regressions in `TEST-001`.

### `RISK-003` - Uploaded object exists but domain save fails

- Control: separate save state, descriptor retention, save-only retry, explicit provisional delete, existing delayed cleanup, and no Saved label before claim.

### `RISK-004` - Focused Library mutation diverges from version/sync rules

- Control: reuse current receipt, expected revision/impact fingerprint, asset guards, component version, active/default thumbnail, linked-row sync, activity/revalidation, and shared tests.

### `RISK-005` - Route/helper refactor weakens tenant isolation

- Control: routes retain separate auth contexts; shared helper receives already-authorized typed ownership; denial and broker tests plus distinct security review.

### `RISK-006` - Browser/object URL/abort state leaks memory or false status

- Control: one controller owns AbortController/object URL cleanup; unmount/replacement/cancel tests; explicit upload and save phases.

### `RISK-007` - Concurrent upload internals change underneath the plan

- Control: treat dirty upload-record/provider files as read-only; capture hashes/reread before `UNIT-001`; stale and revise on incompatible interface rather than overwrite.

### `RISK-008` - C1 shared-file edits are overwritten

- Control: C1-before-C2 sequence, fresh baseline/anchors, one writer per file, image-only patches, and C1 focused tests rerun after C2 shared-file integration.

## Requirement Traceability

| Requirement | Units | Criteria | Planned evidence |
|---|---|---|---|
| `REQ-001` | `UNIT-001`, `UNIT-003`, `UNIT-004`, `UNIT-005` | `AC-001` | `TEST-001`, `TEST-003`, `TEST-004`, `TEST-005`, `TEST-006` |
| `PERF-001` | `UNIT-001`, `UNIT-003` | `AC-001`, `AC-006` | `TEST-001`, Worker coverage, static scan |
| `SEC-001` | `UNIT-001`, `UNIT-002`, `UNIT-006` | `AC-002`, `AC-006`, `AC-007` | `TEST-001`, `TEST-002`, security/Q2 gate |
| `DATA-001` | `UNIT-001`, `UNIT-002` | `AC-002`, `AC-006` | `TEST-001`, `TEST-002` |
| `DATA-002` | `UNIT-002`, `UNIT-004`, `UNIT-005` | `AC-003` | `TEST-002`, `TEST-004`, `TEST-005` |
| `UX-001` | `UNIT-003`, `UNIT-004`, `UNIT-005` | `AC-004` | `TEST-003`, `TEST-004`, `TEST-005`, `TEST-006` |
| `UX-002` | `UNIT-004`, `UNIT-005` | `AC-004`, `AC-006` | `TEST-004`, `TEST-005`, cleanup faults |
| `UX-003` | `UNIT-004`, `UNIT-005`, `UNIT-006` | `AC-005`, `AC-007` | component/browser a11y, Q2 gate |
| `OPS-001` | `UNIT-001`, `UNIT-002`, `UNIT-003`, `UNIT-006` | `AC-004`, `AC-006`, `AC-007` | fault/cleanup/retry/mutation/reviews |

## Recovery and Resume

### Unit checkpoints

- Before `UNIT-001`, record current HEAD, `git status --short`, and dirty upload
  interface hashes. Before `UNIT-004`/`UNIT-005`, confirm C1 completion and
  reread/hash the released shared UI files.
- Record exact GitNexus impact before each edited symbol. Warn/refresh before any HIGH/CRITICAL edit.
- A unit is complete only when its focused JSON artifact is readable and green.

### Failure recovery

- Server processing/storage failure: clean written paths through current provider cleanup and return no descriptor.
- Response/transport failure before descriptor: retain selected file and allow explicit upload retry; existing cleanup handles an unreachable orphan if the server completed without a response.
- Persistence failure after descriptor: retain descriptor/preview and execute save-only retry; do not reupload.
- Stale target: reload authoritative component/row revision, verify the image target remains the same, then require explicit Retry save.
- Discard/remove: delete provisional asset or enqueue existing cleanup; persisted removal must complete domain reference removal before object cleanup.
- Concurrent unfamiliar edit: stop on that file, capture hash/diff, reread, and manually integrate with `apply_patch`; never reset/overwrite.
- Q2 failure: fix root cause, rerun narrowest invalidated evidence, then rerun aggregate; never narrow required browser/security/mutation scope.

### Resume state

- Goal: one server-processed, privately stored, durably claimed material image contract across inline and modal entry points.
- Next unit: `UNIT-001` after its fresh upload-route/provider baseline.
- Active decisions: `DEC-AUTO-001` through `DEC-AUTO-008`.
- Active authorization boundaries: none.
- Read-only concurrent upload dependencies: `direct-upload-records.ts`, `r2-storage-provider.ts`, `upload-records.ts` as observed.

## Stale Triggers

Refresh this pack before implementation if any of these occur:

1. C1 has not completed before `UNIT-004`/`UNIT-005`, or any shared
   modal/estimate/cell path changes after their recorded rebaseline.
2. Project/component image limits, MIME/pixel/edge policy, `processUploadImageToWebp`, route result shape, or broker behavior changes.
3. `upload-records.ts`, R2 provider, cleanup/removal claims, D1 upload schema, `IMAGES`, or `ARCH_UPLOADS_R2` interfaces change incompatibly.
4. Component version/receipt/price-option image guards, estimate-row asset validation, or linked-row sync changes.
5. Another caller of `/api/estimate-row-images` appears.
6. GitNexus refresh reports a HIGH/CRITICAL or previously unknown flow.
7. The Q2 policy, validation matrix, plan-pack schema, or exact evidence commands change.

## Stop Condition

Stop only when both entry points enforce the same 12 MiB source contract, perform no client transform, invoke one authoritative server WebP/thumbnail processor, persist the same validated descriptor shape to the correct row/component target under its serving policy, support truthful cancel/retry/remove/accessibility behavior, and have fresh Q2 `PASS` evidence plus independent approvals. Do not deploy or claim hosted/provider behavior from local evidence.
