# Plan Pack — Admin Support Operations Console

Canonical entrypoint: **`00-PLAN.md`**. Manifest: `plan-pack.json`.

## What this pack delivers
Upgrades `/admin/support` into an industry-standard support console: Sent +
folder views over the existing ledger, multi-From identities (`support@` +
`philip@`), persisted drafts, reply-all/forward, **bidirectional in-app live
chat** (user ↔ admin over the `SUPPORT_INBOX` DO), and **triage** (labels /
assignment / snooze / star) — on the current Next 16 / Workers / D1 / R2 /
`SUPPORT_INBOX` / Cloudflare Email stack.

## Root cause (Sent folder)
Outbound admin messages are already persisted (`support_messages.direction='outbound'`,
see `src/lib/admin/support-actions.ts`). The inbox never queries or shows them —
it lists conversations with only status/channel/unread filters. **UI/query gap,
not a data gap.** Drafts are simply not modeled yet.

## Units (DAG)
- UNIT-001 Folder/view query layer (Sent, counts) — `units/001-folder-view-query-layer.md`
- UNIT-002 Folder rail UI + wiring — `units/002-folder-rail-ui.md`
- UNIT-003 Multi-From identity registry + validation (`support@` + `philip@`) — `units/003-send-identity-registry.md`
- UNIT-004 From-picker UI + action persistence — `units/004-from-identity-actions-ui.md`
- UNIT-005 Drafts schema (`0096`) + repository — `units/005-drafts-schema-repository.md`
- UNIT-006 Draft autosave + Drafts folder — `units/006-drafts-autosave-ui.md`
- UNIT-007 Reply-all / forward + keyboard triage — `units/007-reply-all-forward-triage.md`
- UNIT-008 In-app live chat (bidirectional user ↔ admin over `SUPPORT_INBOX`) — `units/008-live-chat.md`
- UNIT-009 Triage: labels / assignment / snooze / star (`0097`) — `units/009-triage-labels-assignment-snooze-star.md`

## Phases (independently mergeable)
1. Sent/folders: UNIT-001 → UNIT-002 (next_unit UNIT-001)
2. Identities: UNIT-003 → UNIT-004
3. Drafts: UNIT-005 → UNIT-006
4. Polish: UNIT-007
5. Live chat: UNIT-008 (after 004/006/007)
6. Triage: UNIT-009 (after 001/002/008)

## Test gate
Default `NOT_REQUIRED`; `TEST_PROPOSAL`s recorded in `00-PLAN.md` §14; `TEST_TASK`
only on Philip's explicit request.

## Constraints
Plan-only. Stay on current branch; preserve the dirty worktree; no secrets;
`wrangler.jsonc` is provider truth; admin route → `DESIGN.md` alpha guidance.
