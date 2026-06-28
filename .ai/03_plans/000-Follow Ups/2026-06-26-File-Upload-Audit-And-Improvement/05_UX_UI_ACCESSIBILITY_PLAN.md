# UX UI Accessibility Plan

## Current UX Findings

- Project create image flow starts upload after project creation and shows footer progress, but no explicit cancel/retry control.
- Project edit uploads immediately on selection and shows progress near the image panel, but save can be pressed while upload is in flight unless implementation confirms otherwise.
- Component image upload includes local preview and client optimization, but it has custom state/copy and no progress/cancel.
- Estimate-row project-component image upload opens a row-local `Reference image` modal with preview, file input, URL input, and busy/error text, but no semantic progress, cancel/abort, timeout, cleanup, or finalization state.
- Component attachment rows show filename, size, and remove, but not review, scan, approval, download, or blocked reasons.
- `src/components/ui/file-upload.tsx` exists but is only a generic selector; feature flows use custom upload controls.
- Progress bars are not consistently semantic; some status text lacks input association.

## Target State Vocabulary

All upload surfaces use this base state model:

| State | Meaning | Required UI |
|---|---|---|
| `empty` | No file selected. | Choose/drop affordance and allowed file copy. |
| `selected-local` | File selected locally, not uploaded. | Preview/name/size and remove. |
| `validating` | Client/server preflight running. | Non-blocking status. |
| `optimizing` | Image resize/re-encode or document inspection. | Processing status and cancel where possible. |
| `uploading` | Bytes moving to app/storage. | Semantic progress, cancel, elapsed/retry policy. |
| `finalizing` | Server validates, stores metadata, creates derivatives. | Processing status, disabled destructive controls. |
| `uploaded-draft` | Object exists but is not attached to domain row. | Save/attach pending indicator and cleanup on discard. |
| `scanning` | Document scan/quarantine running. | Pending scan badge and blocked download/use copy. |
| `saved` | Asset is attached to domain entity. | Stable preview/row, replace/remove controls by permission. |
| `error-retryable` | Network/storage/transient failure. | Retry and remove/cancel. |
| `error-blocking` | Validation/auth/scan reject. | Reason and replacement path; no retry without new file. |
| `cancelled` | User cancelled before finalization. | Restore prior state and cleanup queued. |
| `removing` | Delete/cleanup in progress. | Disabled row/control and status. |
| `remove-error` | Cleanup failed. | Restore row and show retry/remove later. |

Attachment governance adds:

- `uploaded / pending review`
- `scan pending`
- `scan failed`
- `approved / current`
- `rejected`
- `superseded`
- `download preparing`
- `download ready`
- `download blocked`
- `download failed`

## Per-Surface Journey Matrix

| Surface | Entry | Main transition | Save/attach rule | Cancel/discard rule | Error rule |
|---|---|---|---|---|---|
| Project create cover image | User selects image before or during project creation. | `empty -> selected-local -> validating -> uploading -> finalizing -> uploaded-draft -> saved`. | Project can be created first, but image metadata is attached only after server finalization; failure keeps the project and explains image retry. | Cancelling before finalization restores no-image state; discard queues draft cleanup if an object exists. | Previous saved image does not exist; retryable upload errors offer retry/remove. |
| Project edit cover image | User selects replacement on existing project. | `saved -> selected-local -> validating -> uploading -> finalizing -> uploaded-draft -> saved`. | Save is blocked while upload/finalization is active; old image remains canonical until replacement asset finalizes and metadata save succeeds. | Cancel restores prior saved preview; replacement draft cleanup is queued. | Retryable failure restores old image and offers retry; blocking validation requires new file. |
| Component image | User selects image on component/variant form. | `empty/saved -> selected-local -> optimizing -> uploading -> finalizing -> uploaded-draft -> saved`. | Component submit is blocked while upload is active; draft asset must bind to variant/cost-entry scope before persistence. | Close/discard is blocked while active or queues cleanup after user confirms discard. | Client resize failure may fall back to original file; server validation remains authoritative. |
| Estimate-row project-component image | User clicks the inline row image tile and opens `Reference image`. | `empty/saved -> selected-local/url-draft -> validating -> uploading -> finalizing -> uploaded-draft -> saved`. | Row `imageUrl` commit occurs only after broker finalization; compatibility can still mirror a derived URL into the row snapshot until asset-backed render is complete. | Cancel restores the previous row preview; uploaded-but-unattached drafts queue cleanup. | Retryable failure keeps the modal open with retry/remove; blocking validation requires a new file or valid URL. |
| Component attachment | User selects PDF/XLS/XLSX evidence. | `empty -> selected-local -> validating -> uploading -> finalizing -> scanning/pending-review`. | Attachment may be attached as quarantined/pending review, but approval/download/use remains blocked until scan-clean or audited override. | Remove before persistence queues draft cleanup; remove after review follows governance rules. | Scan pending/failed/infected/unsupported states explain why approval/download/use is blocked. |

## Phase 4 And Phase 5 UX Split

Phase 4 shared-upload UX may render scan and download states, but it must not enable real download or approval actions before Phase 5 scan/download gates exist.

- Before scanner implementation: attachments show `scan pending` or `scan unavailable` and download/approval/use actions are disabled or the workflow is frozen.
- After scanner implementation: clean/current attachments enable Download; pending, failed, infected, unsupported, rejected, and superseded states show a disabled action with reason copy.
- If product chooses to freeze attachment approval/download during closed beta, the UI must state that evidence files are stored for later review and not yet downloadable.
- Placeholder statuses must be backed by server fields or explicit feature flags, not client-only optimism.

## Shared Components

Implement a shared upload field system rather than continuing bespoke controls:

- `UploadField`: file picker/drop target, helper/error/status associations, disabled/busy contract.
- `UploadPreview`: image preview or file row with name, size, type, state badges.
- `UploadProgress`: semantic progress with current phase, not only byte percentage.
- `UploadActions`: choose/change, cancel, retry, remove, download, approve/reject where applicable.
- `useUploadController`: state machine wrapper around upload broker client calls.

The shared primitive should extend `src/components/ui/file-upload.tsx` or replace it with a policy-aware wrapper. It must reuse project UI primitives per `DESIGN.md:467`.

## Accessibility Requirements

- File inputs must reference helper, status, and error text via `aria-describedby`.
- Progress must use `<progress>` or the shared `Progress` primitive with accessible value/label.
- State changes use `role="status"` for non-error progress and `role="alert"` for validation/blocking errors.
- Buttons are real buttons with icon plus accessible label; retry/cancel/remove/download must be keyboard reachable.
- Information is not conveyed by color alone. Badges need text and/or icon.
- Mobile 360px, tablet 768px, and desktop layouts must keep controls and status text visible without clipping.
- Reduced-motion users get non-animated progress/state transitions.

## Accessibility Proof Matrix

| Concern | Required proof |
|---|---|
| Keyboard order | Tab through choose/change/cancel/retry/remove/download/approve controls in logical order; no hidden file input trap. |
| Screen-reader status | Non-error progress uses `role="status"` or semantic progress; blocking errors use `role="alert"`; repeated progress announcements are throttled. |
| Helper/error association | File input references helper, current status, and error text with `aria-describedby`. |
| Non-color status | Every state badge includes text or icon plus accessible label; color never carries the only meaning. |
| Reduced motion | Progress and processing transitions respect reduced-motion settings. |
| 360px layout | File name, status, and primary controls remain visible or wrap without clipping at 360px. |
| Touch targets | Destructive and retry controls keep accessible hit area on mobile. |
| Browser/manual trigger | Run browser proof when testing real upload progress/cancel, drag/drop pointer behavior, authenticated download, or mobile clipping risk. |

## UX Acceptance Criteria

- Project create, project edit, component image, estimate-row project-component image, and component attachment uploads show consistent visible states and controls.
- Edit project cannot save stale image metadata while a new upload is in progress.
- Component image copy matches effective server limits, e.g. "up to 20 MB before browser optimization; final upload must be 12 MB or less" if that behavior remains.
- Estimate-row image modal copy must state the same effective image limits and whether pasted URLs are accepted as legacy compatibility or broker-resolved assets.
- Attachment rows display scan/review/current-approved status and blocked removal/download reasons.
- Approved/current clean attachments have a Download action; pending/rejected/superseded/scan-failed attachments explain why download is unavailable.
- Retry is explicit after retryable failure; cancel aborts in-flight uploads and restores local state.
- Remove failure restores the row and announces the failure.

## Error Copy Taxonomy

| Reason class | User-facing behavior |
|---|---|
| File too large | State the limit and ask for a smaller file; no retry without a new file. |
| Unsupported type or bad magic | State allowed types; no retry without a new file. |
| Authz/permission denied | State that the user lacks permission for this project/library item; do not expose provider details. |
| Network/storage transient | Offer retry and cancel/remove; preserve prior saved asset. |
| Timeout/stalled upload | Offer retry and cancel; mark cleanup pending if an object may exist. |
| Scan pending | Explain that review/download/use is waiting for file safety checks. |
| Scan failed/infected/unsupported | Block approval/download/use and request replacement or audited admin/security override. |
| Superseded/rejected attachment | Explain historical status and hide or disable Download unless policy allows audit-only access. |
| Cleanup failed | Restore visible row/control, mark retry needed, and avoid claiming deletion. |

## Future UX Proof

Implementation should use focused DOM/a11y tests first. Browser proof is needed only for:

- real XHR/progress/cancel behavior that DOM tests cannot simulate,
- mobile layout clipping risk,
- drag/drop pointer behavior,
- or end-to-end authenticated upload/download behavior.
