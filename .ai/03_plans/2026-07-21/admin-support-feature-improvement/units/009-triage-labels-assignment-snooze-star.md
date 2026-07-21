# UNIT-009 — Triage: labels / assignment / snooze / star

## Goal
Add labels, self-assignment, snooze, and star as additive metadata and fold them
into the folder query + rail. Promoted from former non-goal N1.

## Status
`READY` · depends on: UNIT-001, UNIT-002, UNIT-008 · requirements: DATA-005,
UX-003 · risks: RISK-007

## Owned paths
- `migrations/0097_support_triage.sql` (new, write) — next after 0096
- `src/lib/repositories/support-conversations-d1.ts` (write — **reread**, after UNIT-001)
- `src/app/admin/support/page.tsx` (write — **reread**, after UNIT-002)
- `src/components/admin/AdminSupportInbox.tsx` (write — **reread**, after UNIT-008)

## Implementation boundary
1. Migration `0097` (additive, never edit ≤0096): add nullable
   `labels_json`, `assignee_user_id` (FK profiles ON DELETE SET NULL),
   `snoozed_until`, `starred_for_admin INTEGER NOT NULL DEFAULT 0`; add indexes
   `idx_support_conv_assignee`, `idx_support_conv_snooze`.
2. Repository: extend `listSupportConversations` filters (label, assignee,
   starred) and folder predicate (Starred view; Snoozed view; snoozed hidden
   from Inbox until `snoozed_until <= now`). Add parameterized mutators
   (set labels / assign self / snooze / star). Extend counts.
3. UI: label chips, assign-to-me, snooze menu, star toggle in the rail/thread
   header; reuse `src/components/ui/*` per DESIGN.md.

## Verification
- `bun run type-check`, `bun run lint`; migration inspection.
- GATE-DATA-01 (additive schema + authz + folder predicate composition).

## Scope
In: triage metadata + rail/filters. Out: multi-agent assignment queues.

## Done criteria
- [ ] `0097` adds columns/indexes additively; no data rewrite.
- [ ] Label/assignee/star filters + Snoozed/Starred views work with counts.
- [ ] type-check + lint clean; no regression to Sent/folders/chat.

## Recovery
Local rollback = drop the added columns/indexes; revert files.
