# 03 — Findings: Commenting + Decision + Activity UX

> Severity legend: **P0/P1/P2/P3**. All citations `file:line` vs `2dab33405d`.
> The owner's headline ask (per-area/per-component commenting) is covered in
> `06-AREA-BRANCH-COMMENTING-DESIGN.md`; this doc covers the broader commenting,
> decision, and activity surface.

## 1. How commenting works today

- **Composer:** permanently-mounted inline `<textarea>` at the foot of the discussion
  card (`SharePageComments.tsx:708-721`). Not a modal or sidebar.
- **Submit:** `submitComment` (`:497-580`) → optimistic insert (temp id) →
  `postWithRetry` (3 attempts, backoff `[0,2000,5000]`) → confirm-in-place or
  revert+offline-queue. Cmd/Ctrl+Enter or Send button.
- **Targets:** proposal / estimate / row only. The target is **implicit** — whatever
  the workspace holds when the reviewer types. No per-comment target picker in the
  composer. To change scope, scroll up, click "review" on a row/sheet, scroll back.
- **Draft persistence:** sessionStorage `shared-link-comment-draft-${token}`
  (`:326-334`). Offline queue: sessionStorage (`:287,407-438`).
- **Query:** `["share-comments", token]`, `staleTime: 30_000`, `refetchOnWindowFocus`
  (`:359-365`).
- **Circuit breaker** on the POST (`comment/route.ts:26-79`); 429 surfaced as
  "Rate limit reached…" (`:528,558-560`).

## 2. Comment threading — NONE

- **Flat list.** A single `<ul>` of `<li>` (`SharePageComments.tsx:649-665`).
- **No `parent_id`, no `is_resolved`, no `edited_at`, no `deleted_at`** in the schema
  (`migrations/0066…sql:213-228`).
- Ordering: server newest-first then `.reverse()` (`public-repository.ts:905`) →
  oldest→newest on page. Optimistic items appended at end.

## 3. Commenting gaps (UX/feature)

### GAP-1 — No per-area/per-component/per-node commenting [P1, headline]
**Evidence:** `ShareReviewTargetKind = "proposal" | "estimate" | "row"` only
(`share-review-target.ts:1`). Tree node headers fire `onToggle` only
(`ShareEstimateTreeView.tsx:212-218`); inline rows in the tree are non-interactive
`<div>`s (`:148-188`). The opaque `node_*` id namespace exists and is reversible
(`snapshot.ts:160-166`) but no comment API consumes it.
→ Full design in `06-AREA-BRANCH-COMMENTING-DESIGN.md`. Implemented via UNIT-1/2/3.

### GAP-2 — No row-level commenting from inside the tree view [P1]
**Evidence:** Row-level commenting works in the **collated** table (row click →
`handleRowReview`, `SharePageTabs.tsx:848`) but tree-view rows are non-interactive
(`<div>`, `ShareEstimateTreeView.tsx:148-188`). A reviewer using the default "Summary"
tree view cannot comment on a row without switching to "Details."
→ UNIT-3.

### UX-1 — Implicit target is easy to miss [P2]
The composer shows a small "Applies to {label}" banner (`SharePageComments.tsx:704-706`).
A reviewer who scrolled away from a selected row may not realize their next comment is
scoped to that row. No "change target" control in the composer.

### UX-2 — No threading / replies [P2]
Cannot reply to a specific comment. Everything is flat broadcast. (Schema lacks
`parent_id`.)

### UX-3 — No resolve/unresolve [P2]
No way to mark a question answered or hide resolved threads.

### UX-4 — No edit/delete [P2]
Comments are write-once, immutable. Typos are permanent.

### UX-5 — No @mentions [P2]
No way to direct a question at the estimator or a specific teammate.

### UX-6 — No attachments / rich text / markdown [P2]
Plaintext, 1000-char cap. No images, no formatting.

### UX-7 — No comment filtering or sorting [P2]
Cannot filter by target (row/sheet/proposal), author, or open/resolved. Cannot sort
newest-first vs oldest-first. Single flat list, oldest-first always.

### UX-8 — No inline/pinned comment affordance [P2]
Despite row/estimate targeting at the data layer, there's no inline "comment on this
row" affordance rendered next to rows — the reviewer must use the global target flow.

### UX-9 — No unread / "new since last visit" indicator [P3]
The activity feed has a primitive version; comments do not.

### UX-10 — No notifications of replies/owner responses [P2]
Only an async owner email digest. Recipient gets nothing on reply.

## 4. Decision flow

- **Buttons:** Approve (primary) / Request changes (secondary) / Decline (plain)
  (`SharePageDecision.tsx:396-427`). Each → `openConfirm`.
- **Confirm dialog:** native `<dialog>` (`SharePageDecisionConfirmDialog.tsx`),
  manual focus trap (`:52-76`), Escape-to-close. Signer name required for
  accepted/declined (`:123`); optional for revision_requested. Note optional ≤2000.
- **Submit:** `confirmDecision` (`:277-348`) → POST → local reducer update (no server
  refetch). 409-already-submitted → reload saved decision. 409-stale → preserve draft
  + ask refresh.
- **Locked state:** `:350-377` — badge with decision label, target, note, signer, date.
  **No undo.**
- **Sticky bar:** `StickyDecisionBar.tsx` — desktop only (`sm:block`), appears after
  320px scroll, dispatches `share:request-decision` `window` CustomEvent → opens the
  same dialog. Loosely-coupled event bus.

## 5. Decision gaps

### DEC-1 — No undo / change response [P1]
See BUG-3 (`02-FINDINGS-PERF-AND-BUGS.md`).

### DEC-2 — Decision drafts not persisted [P1]
See BUG-3. Comment drafts survive reload; decision drafts do not.

### DEC-3 — Asymmetric signer-name requirement [P2]
`revision_requested` does not capture a name (`SharePageDecision.tsx:290`,
`SharePageDecisionConfirmDialog.tsx:123`). The team receives a change request with no
author identity beyond the recipient email.

### DEC-4 — No multi-stakeholder workflow [P2]
Decision enum is exactly `accepted | declined | revision_requested`. No "approved with
conditions," conditional approval, counter-sign, or per-section approval.

### DEC-5 — No RFI / question-as-first-class [P2]
Questions are plain comments, not a distinct trackable artifact.

### DEC-6 — No mark-as-reviewed per section/sheet [P2]
Only one global decision per recipient.

### DEC-7 — Signature not surfaced [P3]
`signature_intent_hash` is stored (`public-repository.ts:959`,
`migrations/0066…sql:269-275`) but never shown in the UI. Could reinforce audit
trust.

## 6. Activity feed

- `SharedLinkActivityFeed` (`:183-264`) merges comments + decisions + events
  server-side (`activity/route.ts:149-210`). TanStack Query, `staleTime: 30_000`,
  `refetchOnWindowFocus`, + manual focus/visibility listener + Refresh button + cursor
  pagination.
- **NOT rendered on the recipient page.** `ShareReviewWorkspace` imports only
  `SharePageComments` + `SharePageDecision`. So a reviewer has no activity history —
  only the flat comment list and their own decision badge.
- **No realtime** anywhere in `src/components/share`.

### ACT-1 — Activity feed absent from recipient page [P1]
Either wire it in (it already exists) or decide it's owner-only. If recipient-facing,
filter to what the recipient should see (their own comments/decisions + owner replies).

### ACT-2 — No realtime updates [P2]
No `refetchInterval`, no SSE, no WebSocket. A reviewer won't see a teammate's comment
or an owner's reply without refocus/reload. (Cloudflare Durable Objects `COLLAB_ROOMS`
+ `GLOBAL_PRESENCE` exist in `wrangler.jsonc` but are not wired to share.)

## 7. State management observations

- **Dual source of truth** (TanStack Query + local reducer) in comments and activity:
  a `useEffect` mirrors query results into the reducer (`SharePageComments.tsx:371-389`,
  `SharedLinkActivityFeed.tsx:213-248`). Brittle — reducer can briefly disagree with
  the query.
- **No `useMutation`** — hand-rolled `fetch` + retry for both comments and decisions.
- **Giant components:** `SharePageTabs` (933) and `SharePageComments` (744) each carry
  a `react-doctor-disable-next-line react-doctor/no-giant-component`
  (`SharePageTabs.tsx:246`, `SharePageComments.tsx:254`).

## 8. Accessibility

Good: `aria-live="polite"` announcement regions; native `<dialog>` with focus trap;
`role="alert"` on errors; `role="tree"/"treeitem"/"group"` from `WorkshopTree`;
roving `tabIndex`; Enter/Space toggle.

Gaps:
- Optimistic comments marked "(sending...)" as plain text (`:654`), not `aria-busy`.
- Mobile bottom nav is anchor jumps, no `aria-current` / active-section tracking.
- `StickyDecisionBar` buttons lack `aria-label` (`:34-36`).
- Tree rows inside `WorkshopTreeNode` are bare `<li>` without `role="none"` /
  `aria-level` / `aria-posinset` / `aria-setsize`; no arrow-key navigation between
  tree items (only Enter/Space toggle). "Good enough ARIA," not full APG treeview
  keyboard nav.

## 9. Mobile / responsiveness

- Mobile bottom nav (`ShareReviewWorkspace.tsx:68-77`, `sm:hidden`) + desktop sticky
  bar (`sm:block`) — never co-occur, good.
- Comment list capped `max-h-[420px] overflow-y-auto` (`:630`) — can feel cramped with
  the on-screen keyboard + inline composer. No dynamic viewport height handling.
- Decision button row switches `grid` → `sm:flex` with `min-h-11` thumb targets — good.
- Currency/date formatters hardcoded `en-PH` (`SharePageSummaryCard.tsx:7,18,27`;
  `SharePageDecision.tsx:39`). No i18n.
