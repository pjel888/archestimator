# 14 - Accessibility Audit (GATE-UX-01)

Manifest source: `SRC-009`. Requirement: `REQ-011`. Criterion: `AC-020`.
Execution: `UNIT-010`. Proof: `TEST-017`.

Audit scope: keyboard order and shortcuts, focus entry/return, semantic
names/roles/states, screen-reader announcements, contrast, zoom/reflow, motion,
touch targets, and responsive behavior across activity-history UI surfaces.

## Surface 1: Activity History Modal

**File:** `src/components/workshop/estimate-sheet/activity-history.tsx` (1613-1773)
**Focus/Escape wiring:** `src/components/workshop/estimate-sheet/use-estimate-history-panel.ts` (187-219, 369-393)

### Implemented
- **Native `<dialog>` via `showModal()`** — `useNativeModalDialog` hook (1105-1138). Browser-native focus trap and inert backdrop.
- **Accessible name** — `aria-label="Activity History"` on `<dialog>` (1672).
- **Escape to close** — `onCancel` handler (1674-1677) plus window keydown listener (`use-estimate-history-panel.ts:372-378`).
- **Focus return on close** — `closeInspector` restores focus to opener (use-estimate-history-panel.ts:191).
- **Scope tree is real ARIA tree** — `role="tree"` (1547), `role="treeitem"` with `aria-selected`/`aria-level`/`aria-expanded` (1554-1559). ArrowLeft/Right expand/collapse (1565-1575).
- **Event list uses `role="feed"`** with `aria-label` (983). Day groups are `role`-labeled `<section>` (985).
- **Event cards announced** — each `<article>` has rich `aria-label` (714, 730-732).
- **Filter dropdown labeled** — `role="group"` with `aria-label` (586-587), event-type select labeled (594), date inputs labeled (607, 615).
- **Search input labeled** — `aria-label="Search activity"` (1705).
- **Grouped events use native `<details>/<summary>`** (893-917).
- **Icon-only controls labeled** — close button (1684), restore button (760), decorative icons `aria-hidden`.

### Gaps

| Severity | Gap | Location | Fix |
|---|---|---|---|
| **P0** | No explicit focus move INTO modal on open | `useNativeModalDialog` (1105-1138) | Add `node.focus()` or focus first focusable after `showModal()`. Mirror `SharePageDecisionConfirmDialog` pattern (95-98). |
| **P1** | Scope tree lacks roving `tabIndex` + ArrowUp/Down | 1565-1575 | Add `tabIndex={selected ? 0 : -1}` to treeitems. Implement ArrowUp/Down to move focus. Only one tab stop per tree. |
| **P1** | Backdrop click via raw `mousedown` without SR parity | 1108-1114 | Acceptable since Escape works, but document the gesture. |
| **P2** | Peso delta badge contrast borderline (~4.0:1 for #7f7f7f) | `getAuditDeltaClassName` (456) | Use `--secondary` (#5d5d5d) instead of `--tertiary` for zero deltas. |
| **P2** | Sub-10px font sizes (text-[8px], text-[9px]) | 738, 655, 773 | Minimum 10px for body text per zoom/reflow. |

## Surface 2: Row Details Modal

**Ownership:** Audit observation only for this pack revision. It is not in the
named UNIT-010 write lease and needs a separately assigned owner before editing.

**File:** `src/components/workshop/estimate-sheet/activity-history.tsx` (1202-1388)

### Implemented
- Native `<dialog>` with `aria-label` (1282-1285).
- Escape + focus return (use-estimate-history-panel.ts:216-219, 385-389).
- Full ARIA tabs via shared `TabStrip`: `role="tablist"`, `role="tab"` with roving tabindex, arrow nav + Home/End (tab-strip.tsx:78-105).
- Tab panel labeled (1348).
- Close button labeled (1296).

### Gaps

| Severity | Gap | Location | Fix |
|---|---|---|---|
| **P0** | No explicit focus move into modal on open | Same as Surface 1 | Same fix. |
| **P1** | Tab/tabpanel `idBase` not passed | 1301-1306 | Pass `idBase="row-details"` to `TabStrip` to wire `aria-controls`/`id`/`aria-labelledby`. |
| **P1** | Focus not moved to tab panel on tab switch | 1348 | Add `tabIndex={0}` to tabpanel, focus on activation. |
| **P2** | Sub-10px font in RowDetailField label | 1097 | Minimum 10px. |

## Surface 3: Project Activity Page

**File:** `src/components/workshop/project-activity/ProjectActivityClient.tsx`

### Implemented
- Keyboard-accessible filters with `aria-expanded`/`aria-controls` (516-517).
- Filter dropdowns labeled: scope (505), actor (544), client (545), "Edited by me" toggle `aria-pressed` (551).
- Status announced via `aria-live="polite"` (490) + `role="status"` (529) + `role="alert"` for errors (599).
- Feed semantics: `role="feed"` with `aria-label` and `aria-busy` (580). Articles with `aria-posinset`/`aria-setsize` (265-266).
- `<time dateTime={activity.occurredAt}>` (273) — machine-readable.
- Empty/permission/error states all present (444-466, 572-578).
- Load more button accessible (602-604).
- URL state via `router.replace` (377).

### Gaps

| Severity | Gap | Location | Fix |
|---|---|---|---|
| **P1** | Ledger is NOT a real `<table>` — divs with column headers `aria-hidden` | 232-246, 261-267 | Use `<table role="presentation">` or add `role="row"`/`role="columnheader"` wiring, or relabel each cell with its column name. |
| **P2** | Filter summary text unlabeled | 508-510 | Mark `aria-hidden="true"` to avoid SR redundancy. |

## Surface 4: Shared-Link Activity Feed

**File:** `src/components/share/SharedLinkActivityFeed.tsx`

### Implemented
- `role="feed"` with `aria-label` (309). Articles with `aria-label`, `aria-posinset`, `aria-setsize`, `tabIndex={0}` (314-317).
- "New activity" notice in `aria-live` region (292-295).
- Loading/error/empty states all semantically marked (269, 280, 307).
- Load-more button labeled (346-348).
- Collapsible details via native `<details>`/`<dl>` (329-339).

### Gaps

| Severity | Gap | Location | Fix |
|---|---|---|---|
| **P1** | Partial-activity banner not in a live region | 301-305 | Add `role="status"` or `aria-live="polite"`. |
| **P2** | Refresh button below 24×24 CSS px target | 290 | Increase `h-5` to `h-6` minimum. |

## Surface 5: Share Page Comments

**Ownership:** Audit observation only. `Publisher-And-Shared-Pages` exclusively
owns this component and carries any fix plus proof in its incorporated-delta receipt.

**File:** `src/components/share/SharePageComments.tsx`

### Implemented
- Comment form inputs labeled (634). Character counter (637-640).
- Optimistic posting announced via `aria-live="polite"` (591) with contextual messages (445, 464, 488).
- Offline queue status via `<output aria-live="polite">` (612-616).
- Errors as `role="alert"` (563, 597).
- Expand/collapse with `aria-expanded`/`aria-controls` (542-544).
- Cmd/Ctrl+Enter to submit (506-511).

### Gaps

| Severity | Gap | Location | Fix |
|---|---|---|---|
| **P1** | Wrapping whole `<ul>` in `aria-live="polite"` re-announces entire list on each change | 551-555 | Remove wrapper live region; rely on discrete `lastAnnouncement` region (591). |
| **P2** | No `aria-label` per comment `<li>` | 572-585 | Add per-comment label for SR skim-ability. |

## Surface 6: Share Page Decision

**Ownership:** Audit observation only. `Publisher-And-Shared-Pages` exclusively
owns public decision UI and carries any fix plus proof in its incorporated-delta receipt.

**Files:** `src/components/share/SharePageDecision.tsx` + `SharePageDecisionConfirmDialog.tsx`

### Implemented (strongest surface)
- Decision buttons with `aria-label` (391, 400, 409). Mobile min-h-11 (44px).
- Confirmation dialog: native `<dialog>` + `showModal()` with `aria-labelledby` (106-107).
- Manual focus trap (60-76). Initial focus to first focusable (95-98).
- Escape + focus return to trigger (233-236, 109-112).
- Locked state announced (348-350, 362).
- Form fields with `<label htmlFor>` (125-129, 143-146). Validation `role="alert"` (159).

### Gaps

| Severity | Gap | Location | Fix |
|---|---|---|---|
| **P2** | Post-decision focus may target detached node (buttons unmount) | 338 | Acceptable since `role="status"` announces outcome. |

## Summary By Severity

**P0 (blocking — 3 instances, 2 files):**
- Activity History Modal and Row Details Modal: no explicit focus into modal on open. Fix: mirror SharePageDecisionConfirmDialog's first-focusable pattern.

**P1 (significant — 6 instances):**
- Scope tree lacks full ARIA tree keyboard pattern (Up/Down + roving tabindex).
- Row Details tab/tabpanel idBase not passed.
- Project activity ledger headers `aria-hidden` (no programmatic column association).
- Shared-link partial-activity banner not in live region.
- Comments `<ul>` in `aria-live` re-announces whole list.
- Tab panel focus not moved on tab switch.

**P2 (polish — 8+ instances):**
- Contrast (#7f7f7f below 4.5:1), sub-10px fonts, refresh button target size, per-item labels.

## UNIT-010 (new): Accessibility Hardening For Activity Surfaces

**Priority:** P1 for Activity-owned surfaces 1 and 3, plus the Activity-owned
shared feed in surface 4. Surfaces 5-6 are Publisher handoff observations and are
not in UNIT-010's write scope.

**Scope:**
1. Add explicit focus management to `useNativeModalDialog` for P0.
2. Add roving tabindex + ArrowUp/Down to scope tree for P1.
3. Add `role="columnheader"`/`role="row"` to project activity ledger (or use real `<table>`).
4. Add `role="status"` to shared-link partial-activity banner.
5. Upgrade contrast and minimum font sizes within those three owned surfaces.

The RowDetailsModal observation remains documented but outside the named UNIT-010
write lease. The comments and decision observations transfer to Publisher; its
delta/receipt is the proof boundary and Activity must not duplicate those edits.
