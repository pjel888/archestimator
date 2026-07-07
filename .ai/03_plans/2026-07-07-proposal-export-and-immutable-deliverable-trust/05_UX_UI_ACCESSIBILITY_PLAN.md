# 05 — UX, UI, and Accessibility Plan

This feature is primarily backend/data-trust mechanics, but it introduces a small, high-value UI
surface: an **integrity & staleness panel** in the export preview dialog and a **recipient
staleness notice** on `/share/[token]`. Both reuse existing primitives. No redesign of the
publication UX (DEC-LINK-1).

## Primary user journeys

### Journey 1 — Contractor issues a trustworthy XLSX (Surface A)

1. Contractor opens `ProposalExportPreviewDialog` (existing).
2. **New:** the dialog shows an *Integrity & Source* panel: "Generated from saved data as of
   <source_as_of>; estimate revision <rev>; this file's reference: <hash-prefix>." Staleness badge
   reflects server-derived source state (not just client edit staleness).
3. Contractor downloads. The downloaded file's title block / docProps carries the same provenance.
4. **New:** after download, the dialog/audit shows "Package vN issued (hash …)" — the contractor
   can later prove what was issued.

### Journey 2 — Contractor republishes (Surface B immutability)

1. Manager republishes via Publisher drawer (unchanged UX).
2. **New (non-disruptive):** the activity/summary surface shows version history (v1 superseded by
   v2), each with its hash + date. Prior versions remain queryable.

### Journey 3 — Recipient reviews a stale proposal

1. Recipient opens `/share/[token]` (unchanged access).
2. **New:** if the underlying estimate moved beyond threshold since the deliverable's source_as_of,
   a non-blocking notice: "This proposal was issued on <date>. It may not reflect the latest
   revision. Contact <contractor> for an update."
3. Recipient accepts → their acceptance is bound to the content hash (receipt).

## Component states (Integrity & Source panel)

| State | Trigger | Copy | Visual |
|---|---|---|---|
| Current | `daysBehind <= threshold` | "Issued from current data (as of <date>)." | emerald badge + check icon |
| Stale (workshop edit) | unsaved edits exist | "Preview includes N unsaved row edits. Save before exporting for saved-data-only output." (existing) | amber banner |
| Stale (source) | `daysBehind > threshold` | "Underlying estimate changed since <date>. Consider re-issuing." | amber badge + clock icon |
| Issued (after download) | package row written | "Package vN issued. Reference: <hash-prefix8>." | neutral card with copyable hash prefix |
| Preparing (async) | size > streaming threshold | "Large export — preparing in the background. We'll notify you." | progress + job id |
| Failed | job error | "Export could not be generated. <reason>. Retry." | error alert + retry |
| Hard-cap exceeded | > 1200 nodes / 3000 rows / 50 tabs | "This estimate exceeds the export size limit (N nodes / M rows / K tabs). Split or trim to export." | error alert (existing 413 copy, refined) |

Loading / empty / disabled / offline / degraded states follow existing patterns (`skeleton`,
`empty-state`, `spinner`, `alert`).

## Accessibility

- **Keyboard:** panel is in tab order; copy-hash button is a real `<button>` with accessible name
  "Copy package reference"; focus returns to trigger.
- **Focus:** dialog focus-trap already exists (`ProposalExportPreviewDialog` Esc + initial focus);
  new panel content participates without breaking trap.
- **Screen reader:** staleness uses `role="status"` + `aria-live="polite"` so dynamic staleness
  resolves are announced; hash prefix has `aria-label` "package reference, <digits>".
- **Non-color cue:** staleness always pairs color with icon + text (emerald+check, amber+clock).
- **Contrast:** reuse existing token colors (badge/status-badge already meet contrast).
- **Responsive:** panel stacks below contents manifest on narrow viewports; hash prefix truncates
  with copy affordance (full hash via copy, not visual overflow).
- **Reduced motion:** no animation introduced; existing reduced-motion behavior preserved.

## Recipient staleness notice (a11y)

- Non-blocking (not a modal); region with `role="status"` `aria-live="polite"`.
- Does **not** block comment/decision (recipient may still accept a stale proposal knowingly).
- Copy is neutral, non-alarming; names the deliverable date, not internal estimate details.

## Design-system reuse

- `badge`/`status-badge` for staleness/version states.
- `alert`/`banner` for async-failed/hard-cap.
- `progress` for async job.
- `card`/`panel` for the integrity panel.
- `button` for copy-hash/retry.
- **No new primitive created.** Native `<dialog>` reused (current pattern).
- DESIGN.md is alpha-stage; no design-system change is mandated by this plan. Defer to owner.

## Browser-proof decisions (proportional verification)

- Copy-hash button interaction + focus restoration → browser or DOM test (interaction claim).
- Recipient staleness live-region announcement → DOM test asserting `aria-live` + content.
- Everything else (checksum, immutability, redaction, staleness computation) → unit/integration
  tests, not browser proof. See `12_*.md`.

## UX regressions to avoid

- Do not make the staleness notice alarming or modal (recipients may legitimately accept stale).
- Do not block download on staleness (warn only, as today).
- Do not remove the existing unsaved-edits warning (it is correct).
- Do not change the Publisher drawer's tab structure (DEC-LINK-1).
