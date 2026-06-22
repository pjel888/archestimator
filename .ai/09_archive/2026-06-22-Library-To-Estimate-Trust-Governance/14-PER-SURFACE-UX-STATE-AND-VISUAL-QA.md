# Per-Surface UX State And Visual QA Contract

This document makes the UX/UI plan deterministic enough for implementation.
Every interactive surface must define visible copy, enabled actions, focus
behavior, mobile layout, and evidence before a phase can close.

## Global State Rules

| State | Required visible copy | Enabled actions | Disabled behavior | Focus and announcement |
| --- | --- | --- | --- | --- |
| Loading | `Loading sources...` or surface-specific loading copy. | Cancel/close only when safe. | Insert/replace/approve actions disabled. | Loading region has accessible name. |
| Empty | `No sources found` plus the active filter/scope. | Clear search/filter, switch tab, create/manage where allowed. | Insert/replace disabled with reason. | Focus remains in source surface. |
| Failed refresh | `Could not refresh sources` | Retry, close, keep current draft. | Submit disabled unless existing source was already validated. | Error announced; retry receives focus only on user action. |
| Stale cache | `Source data may be out of date` | Refresh, continue only through compare/warn path. | Silent insert/replace disabled. | Warning is visible text, not color alone. |
| Permission loss | `You no longer have access` | Refetch, close. | Mutating action disabled. | Focus returns to initiating source/row after close. |
| Target invalid | `Estimate target changed` | Refetch estimate, choose target again, cancel. | Submit disabled. | Error identifies target category, not raw IDs. |
| Pending | `Saving...` | Cancel only if the operation is cancellable. | Duplicate submit disabled. | Pending state is announced once. |
| Saved | `Saved` | Continue editing. | None. | Saved state clears after a short, non-blocking confirmation. |
| Failed mutation | `Could not save` | Retry, refetch source, cancel. | Duplicate submit disabled until retry starts. | Focus moves to retry summary or remains on error region. |
| Retrying | `Retrying...` | Cancel only if cancellable. | Duplicate retry disabled. | Original source/target summary remains visible. |
| Partial success | `Some files did not upload` | Retry failed files, remove failed draft, continue with successful drafts. | Approve unavailable for failed files. | Failed file rows are reachable by keyboard. |

## Sidebar Source Matrix

| Surface | Default priority | Loading/empty | Error/retry | Permission/source deletion | Mobile layout |
| --- | --- | --- | --- | --- | --- |
| `Library` tab | Current workspace reusable Library components; accepted/current cost indicator before secondary metadata. | Show skeleton/list placeholder; empty copy names Library scope. | Retry refresh; stale cache warning stays above list. | Deleted/archived sources remain visible only as non-fresh warnings in compare; insert blocks or requires explicit project-specific path. | Drawer width uses full viewport on mobile; source cards have at least 44px interactive targets. |
| `Project` tab | Project-specific, detached, and express/project rows; provenance before Library identity. | Empty copy names selected project. | Retry refresh and show selected target summary. | Wrong project/source deleted blocks insert and offers refetch. | Source provenance wraps before actions; no horizontal scroll. |
| `Templates` tab | Template name, scope, dependency health, target resolution. | Empty copy names template scope. | Retry dependency resolution. | Missing target/dependency conflict blocks insert. | Insert action remains visible at drawer bottom. |

Sidebar acceptance:

- The default selected tab is `Library` unless the user enters from a project or
  template action that explicitly targets another tab.
- Search/filter input remains above the list and does not scroll away on mobile.
- Long source names, supplier labels, and warnings wrap before action buttons.
- At 5,000 Library items, virtualization/windowing rules in `11` apply before a
  browser responsiveness claim can pass.

## Compare Dialog Matrix

Canonical action labels:

- `Insert as new row` adds another eligible linked row under the selected
  target.
- `Insert as project-specific` is the explicit warning path for missing source,
  accepted-cost-missing, archived non-fresh, or detached/project-specific reuse.
  It does not create reviewed Library trust.
- `Replace selected row` replaces the current row only after the compare branch
  has passed its required warning or block decision.

| Branch | Required copy/action | Default decision |
| --- | --- | --- |
| Stale price only | `Stale price` warning; actions: refresh, replace with warning, insert as new, cancel. | Confirm. |
| Very stale price | `Very stale price` warning; refresh is primary. | Confirm; no silent replace. |
| Missing source | `Missing price source`; U1-U3 may continue only through the explicit `Insert as project-specific` warning action, and full governance cannot mark the cost reviewed. | Confirm for beta reuse foundation; block reviewed-governance claims. |
| Accepted cost missing | `Cost needs review`; user may insert as project-specific warning in U1-U3, but cannot label it accepted. | Confirm for beta reuse, block for full governance claim. |
| Archived source | `Archived component`; no fresh insert. | Block fresh insert; project-specific path requires explicit action and evidence. |
| Discontinued source | `Discontinued component`; explain reuse risk. | Confirm unless product lifecycle policy blocks. |
| Source changed | `Source changed`; show previous and incoming source summary. | Confirm. |
| Row changed after dialog opened | `Estimate row changed`; action: refetch and compare again. | Block submit. |
| Source archived after dialog opened | `Source is no longer reusable`; action: refetch/source review. | Block fresh insert. |

If multiple warnings apply, show one blocking headline, then secondary warnings
in this order: authorization/target, lifecycle, row revision, accepted cost,
pricing freshness, source link state, thumbnail, attachment.

## Governance Queue Flow

Entry points:

- Library manager stale-cost banner.
- Component inspector accepted-cost panel.
- Estimate compare warning that links to source review only for authorized
  admins.

Flow:

1. Queue defaults to `needs_review` and stale/very-stale costs first.
2. Filter chips expose `Needs review`, `Assigned to me`, `Unassigned`,
   `Accepted`, `Locked`, `Rejected`, and `Superseded`.
3. Assignment validates the assignee is in the same workspace.
4. Accept requires current row revision and one accepted/current cost per price
   option.
5. Reject preserves history and visible reason for authorized admins.
6. Supersede requires same workspace and price option.
7. Lock/unlock applies only to accepted costs.
8. Exit returns to the queue row with the updated status.

Required states:

| State | Required behavior |
| --- | --- |
| No results | Show active filters and clear-filter action. |
| Assigned to someone else | Show assignee label; mutating controls depend on admin authority. |
| Stale assignment | Submit rejects by revision and offers refresh. |
| Duplicate accepted conflict | Loser sees conflict; previous accepted state remains visible. |
| Unauthorized accept/lock/reject | Controls are hidden or disabled; direct call denial is tested. |

## Attachment Review Flow

Entry points:

- Component inspector attachment panel.
- Add/edit component modal after upload.
- Governance queue item where cost evidence needs a spec sheet.

Flow and states:

1. Upload shows per-file progress; after 2 seconds, progress/cancel copy is
   visible.
2. Failed upload keeps successful drafts visible and failed files retryable.
3. Approve validates workspace, bucket, path grammar, MIME, review revision, and
   optional cost-entry applicability.
4. Reject records private reason for authorized admins only.
5. Supersede marks the prior approved file superseded and keeps storage/audit.
6. Download requires signed URL authz; denial does not reveal bucket/path
   existence.
7. Audit history shows status, reviewer, date, and safe file kind/size; raw
   storage path is never displayed.

Current-approved display:

- One current approved file is shown per item/price-option/applicable-cost scope.
- If the current-approved file is missing or deleted, show `Approved file
  unavailable` and block public/proposal exposure.
- Prior revisions are visible only to authorized private users.

## Recovered Edit Placement

`Recovered edit` must appear on a durable surface near the affected user intent.
A toast may supplement it, but a toast alone does not satisfy QA-011.

| Origin | Required placement |
| --- | --- |
| Existing row replace | Inline row status on the affected row, plus compare dialog restore if the dialog was open. |
| Sidebar insert with known target | Inline or area-level status near the inserted or intended row, plus sidebar source summary while retrying. |
| Sidebar insert with unknown or invalid target | Sidebar banner above the source list and target-invalid inline copy where the user chooses the target. |
| Template insert | Template tab/banner state plus resolved target summary. |
| Governance or attachment action | Queue row or attachment row status, not only a global notification. |

## Responsive And Visual QA Readiness

| Viewport | Required proof when UI layout changes | Pass condition |
| --- | --- | --- |
| Desktop 1280x900 | Static/DOM proof unless interaction geometry changes; browser screenshot for drag/drop, portal, focus trap, or 5,000-row responsiveness. | No overlap; source actions visible; compare dialog centered and scrollable. |
| Mobile 390x844 | Browser proof if drawer/dialog layout, touch behavior, or mobile resume is changed. | Drawer uses full viewport safely, primary actions remain reachable, no horizontal scroll. |
| Narrow 320px | Static or browser proof for long-copy changes. | Long words wrap or truncate with accessible full label; buttons do not overflow. |
| RTL/high contrast | Required only if touched by the implementation phase or release claim. | Direction and contrast do not hide source/warning labels. |

Visual QA must assert user-observable outcomes, not visual preference:

- No text overlaps action buttons.
- Touch targets are at least 44px where practical for mobile controls.
- Dialog/drawer actions remain reachable after keyboard navigation.
- Escape/cancel returns focus to the initiating row or source card.
- Unsafe links are not clickable and are visibly explained.
