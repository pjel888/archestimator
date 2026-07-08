# 05 — UX, UI, and Accessibility Plan

This plan is primarily backend/runtime (R2, memory, multipart, scanner, Images). The user-visible
UX surface is the **upload interaction** in the workshop/library. No new screens are introduced.
The UX impact of this plan is to keep the **current** upload UX working reliably under memory
pressure and to make error states honest — not to redesign the upload flow.

## Primary journeys (unchanged)

1. **Project image upload** — user attaches an image to a project card/gallery; thumbnail + optimized
   webp stored; image rendered via private GET route or Cloudflare loader.
2. **Estimate-row image upload** — user attaches an image to an estimate row.
3. **Component-library image upload** — user attaches an image to a library component.
4. **Component-library attachment upload** — user attaches a PDF/XLS/XLSX; async scan; download
   gated until `clean`/`override_approved`.
5. **Direct/resumable attachment upload** — large attachment via signed single-part (today) or
   multipart (DEC-03).

## States this plan must preserve or make honest

| State | Today | After plan | A11y requirement |
|---|---|---|---|
| Loading (upload in progress) | spinner/progress via `client-state.ts` reducer | unchanged; multipart adds part-progress if DEC-03 | live-region announces progress politely |
| Success | asset card / inline image | unchanged | status announced |
| Oversize (413) | per-route message | unified stable code + message from FR-02/API-01 | toast/dialog with role="status"; copy states the limit |
| Unsupported type (415) | per-route | unified | role="alert" |
| Scan pending (attachment) | implicit | explicit "Scanning…" state until `clean` | live-region; not blocking other actions |
| Scan blocked (infected/unsupported) | 409 on download | explicit blocked state + admin override path | role="alert"; copy honest ("could not be verified"), not "virus found" unless scanner says so |
| Storage backpressure (503) | admission 429/503 | unified; retry guidance | role="alert"; non-blocking |
| Network/abort | client timeout 45 s (`client-upload.ts`) | retained; multipart adds resume (DEC-03) | retry affordance |
| Empty | no file selected | unchanged | n/a |
| Permission denied (403) | per-authz | unchanged | role="alert" |

## Component impact (read-only confirm; no new components required)

- `src/lib/uploads/client-upload.ts` — timeout/abort; multipart progress hook if DEC-03.
- `src/lib/uploads/client-state.ts` — reducer; add `multipart-progress` action if DEC-03.
- `src/lib/uploads/component-attachment-client.ts` — orchestration; multipart client if DEC-03.
- Existing UI components that render uploaded images (`ProjectCardThumbnail`, `ComponentLibraryManager`,
  `MainSidebar`, project/estimate galleries) — **unchanged**; they consume the same asset descriptors.

## A11y checklist (applies to any upload-UI change introduced by implementation)

- Keyboard: upload trigger reachable + operable; file picker via native `<input type="file">`
  (keeps platform a11y); no div-button upload triggers.
- Focus: focus restoration to the trigger after success/error; no trap.
- Screen reader: upload status announced via `aria-live="polite"` (progress) / `role="alert"` (error);
  file name announced.
- Contrast/color: error states use non-color cues (icon + text), per repo a11y norm.
- Reduced motion: progress indicators respect `prefers-reduced-motion`.
- Copy: error copy states the actual limit (`ARCH_UPLOAD_HOSTED_BODY_LIMIT_BYTES` humanized) and the
  supported types; never leaks paths/bytes.

## UX regression risks

- **Lowering image cap 12 MiB → 4 MiB** (FR-02/OPEN-01): users with >4 MiB photos hit 413 where they
  didn't before. Mitigation: owner ack (OPEN-01) + clear copy + client-side pre-check.
- **Multipart progress UX** (DEC-03): adds complexity; only if owner enables multipart.
- **Images binding flip** (DEC-07): no UX change if output format (webp) preserved; verify thumbnail
  quality parity.

## Browser proof policy

Per repo proportional verification: upload-UI **interaction** changes (multipart progress, scan
blocked state) need targeted browser proof. Pure runtime/memory/streaming changes do not need
browser proof — they're proven by vitest + hosted route proof. The existing
`verify-cloudflare-hosted-upload-ui-proof.ts` Playwright script already covers the happy path; it
should be extended only for new interactive states (multipart progress, explicit scan-pending).

## Localization

No new strings required for the runtime changes. If implementation adds unified error codes, the
user-facing copy should route through the existing i18n/message layer (confirm during implementation).
