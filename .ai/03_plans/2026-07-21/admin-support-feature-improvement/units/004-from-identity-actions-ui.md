# UNIT-004 — From-picker UI + action persistence of chosen identity

## Goal
Let compose/reply choose a From identity; persist it and send from it.

## Status
`READY` · depends on: UNIT-003 · requirements: DATA-002, SEC-001 · risks: (none)

## Owned paths
- `src/lib/admin/support-actions.ts` (write — first editor)
- `src/components/admin/support/SupportRichComposer.tsx` (write — first editor)
- `src/components/admin/AdminSupportInbox.tsx` (write — **reread first**, after UNIT-002)

## Implementation boundary
1. Actions: add optional `fromIdentityId` to `sendSupportReply` and
   `createSupportEmailConversationAndSend`. Replace `resolveSupportSendIdentity()`
   with `resolveSupportSendIdentity(fromIdentityId)` from UNIT-003; persist
   chosen `from_address`/`from_name` on the message (columns exist) and set the
   conversation `mailbox_address` to the identity mailbox. Reply-To stays
   `buildPlusAddress(identity.mailbox, routing_token)`. Preserve idempotency,
   audit, and send-status lifecycle unchanged.
2. Composer: add a From `<select>` (identities from a prop), default = thread's
   last identity or registry default.
3. `AdminSupportInbox`: pass identities + selected id through to composer and
   the two submit handlers; replace the hardcoded "Sends from … only" copy.
   Reread the file (UNIT-002 edited it) before editing.

## Verification
- `bun run type-check`, `bun run lint`. GATE-SEC-01 (server validates id).

## Scope
In: identity selection end-to-end. Out: drafts/forward.

## Done criteria
- [ ] User can pick From (incl. `support@` default and `philip@`); chosen
      identity is server-validated and persisted.
- [ ] Unknown/unverified id rejected server-side.
- [ ] Existing send/retry/audit behavior preserved.
- [ ] type-check + lint clean.

## Recovery
Revert the three files (serialized after UNIT-002).
