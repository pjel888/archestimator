# UNIT-002 — Folder rail UI + wiring (Sent visible)

## Goal
Add a folder rail (Inbox / Sent / Drafts / Archive / All) with live counts and
wire it to the `folder` query param, so Sent renders.

## Status
`READY` · depends on: UNIT-001 · requirements: DATA-001, UX-001 · risks: (none)

## Owned paths
- `src/app/admin/support/page.tsx` (write)
- `src/components/admin/AdminSupportInbox.tsx` (write — first editor)
- `src/app/api/admin/support/conversations/route.ts` (write — accept `folder`)

## Implementation boundary
1. `page.tsx`: read `folder` from `searchParams`, pass to
   `listSupportConversations({ folder })` and `listSupportFolderCounts()`; pass
   counts + folder to `AdminSupportInbox`.
2. `AdminSupportInbox.tsx`: add a folder rail above the conversation list using
   `src/components/ui/*` primitives (12px max, xs radius, neutral palette per
   `DESIGN.md`). Each folder shows its count; selecting sets the `folder` URL
   param (mirror the existing `router.replace` param pattern at `:159`).
   Keep the existing channel/unread/status filters as sub-filters within a folder.
3. Sent view lists outbound-bearing threads; the thread pane already renders
   outbound via `SupportMessageCard`.
4. API route: accept + forward `folder`.

## Verification
- `bun run type-check`, `bun run lint`.
- GATE-UX-01: define empty/loading/selected states; folder rail keyboard-focusable.

## Scope
In: folder rail + counts + Sent rendering. Out: identities/drafts/forward.

## Done criteria
- [ ] Folders render with counts; Sent shows outbound threads.
- [ ] `folder` is a shareable URL param (reload reproduces view).
- [ ] No regression to existing filters/compose/reply.
- [ ] type-check + lint clean.

## Recovery
Revert the three files.
