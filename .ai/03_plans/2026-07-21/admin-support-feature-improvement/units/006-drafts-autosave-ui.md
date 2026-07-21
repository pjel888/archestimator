# UNIT-006 — Draft autosave action + Drafts folder UI

## Goal
Autosave compose to `support_drafts`, resume/discard drafts, and list them in the
Drafts folder.

## Status
`READY` · depends on: UNIT-005 · requirements: DATA-003 · risks: (none)

## Owned paths
- `src/app/api/admin/support/drafts/route.ts` (new, write) — or a server action in `support-actions.ts`
- `src/components/admin/support/SupportRichComposer.tsx` (write — **reread**, after UNIT-004)
- `src/components/admin/AdminSupportInbox.tsx` (write — **reread**, after UNIT-002/004)

## Implementation boundary
1. Add a debounced autosave (admin-gated) calling `upsertSupportDraft`; on
   successful send, `deleteSupportDraft` for the matching key.
2. Composer: hydrate from an existing draft (reply + new-email); debounce saves.
3. Inbox: Drafts folder lists standalone + per-thread drafts (from UNIT-001's
   drafts predicate, now backed by the real table); selecting a draft opens the
   composer prefilled; discard removes it.
4. Reread shared files before editing (edited by earlier units).

## Verification
- `bun run type-check`, `bun run lint`. GATE-UX-01 (autosave status/empty states).

## Scope
In: draft autosave + Drafts UI. Out: forward/reply-all (UNIT-007).

## Done criteria
- [ ] Compose autosaves and survives reload; send clears the draft.
- [ ] Drafts folder lists/opens/discards drafts.
- [ ] type-check + lint clean; no regression to send/identity flows.

## Recovery
Revert the three files (serialized after UNIT-004/005).
