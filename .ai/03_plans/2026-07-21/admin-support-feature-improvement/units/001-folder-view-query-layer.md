# UNIT-001 — Folder/view query layer (Sent + counts) over persisted messages

## Goal
Make Sent (and Inbox/Archive/All) queryable over already-persisted rows, with
one batched counts call. No schema change.

## Status
`READY` · depends on: (none) · requirements: DATA-001 · risks: RISK-001

## Why
Outbound is persisted (`support_messages.direction='outbound'`) but never
queried as a view. This unit adds the missing predicate + counts.

## Owned paths
- `src/lib/repositories/support-conversations-d1.ts` (write)
- `src/lib/repositories/support-conversations-repository.ts` (re-export only if new symbols added)

## Implementation boundary
1. Add `SupportFolder = 'inbox'|'sent'|'drafts'|'archive'|'all'`.
2. Extend `listSupportConversations` input with `folder?: SupportFolder`.
   Predicates:
   - `sent`: `EXISTS (SELECT 1 FROM support_messages m WHERE m.conversation_id=c.id AND m.direction='outbound')`, order by max outbound `created_at`.
   - `inbox`: `c.status != 'archived' AND (c.unread_for_admin=1 OR NOT EXISTS(outbound-after-latest-inbound))` — pragmatically: not archived and last message inbound OR unread.
   - `archive`: `c.status='archived'`.
   - `drafts`: placeholder returning empty until UNIT-005 lands (documented TODO), or `EXISTS support_drafts` guarded by table existence (`isMissingOptionalTable`).
   - `all`: unchanged. Unknown value → behave as `all` (fail-open, safe).
3. Add correlated selects `has_outbound`, `last_direction` to `CONVERSATION_SELECT`
   (or a widened select used only by the list) — keep existing `SupportConversationRow`
   backward compatible by making new fields optional.
4. Add `listSupportFolderCounts(): { inbox; sent; drafts; archive; unread }`
   using a single batched query (or `UNION ALL` of `COUNT(*)`), parameterized.
5. Keep all SQL parameterized; reuse existing indexes; do not change existing
   query signatures' behavior when `folder` is omitted.

## Verification
- `bun run type-check`, `bun run lint`.
- Manual SQL reasoning: Sent predicate selects only outbound-bearing threads.

## Scope
In: query layer. Out: UI (UNIT-002), drafts table (UNIT-005).

## Done criteria
- [ ] `folder` param implemented for inbox/sent/archive/all (drafts stubbed).
- [ ] `listSupportFolderCounts` returns 5 counts in ≤1 batched call.
- [ ] Omitting `folder` reproduces current behavior (no regression).
- [ ] type-check + lint clean.

## Recovery
Additive; revert file to roll back.
