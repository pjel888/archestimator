# UNIT-004 — Identity-aware send, retry, persistence, and composer UI

## Goal and status

`READY` · dependencies: UNIT-003 · requirements: DATA-002, SEC-001 · risks: RISK-002

Ensure the identity selected in the UI is the identity persisted, dispatched,
audited, displayed, and reused for retry.

## Owned paths

- `src/lib/admin/support-actions.ts`
- `src/components/admin/support/SupportRichComposer.tsx`
- `src/components/admin/AdminSupportInbox.tsx` (reread after UNIT-002)
- `src/app/admin/support/page.tsx` (reread after UNIT-002)

## Implementation boundary

1. Pass `fromIdentityId` through reply/new-email inputs and resolve server-side.
2. Make email dispatch receive the resolved identity explicitly; remove its
   internal default lookup so persisted and provider From cannot diverge.
3. Persist From address/name. Keep conversation mailbox/Reply-To on the canonical
   plus-addressed routing mailbox from DEC-AUTO-003.
4. Retry resolves the original message's persisted From against the current
   allowlist. If disabled, return an explicit operator failure; never switch From.
5. Idempotent duplicate client-message attempts return the original persisted
   identity/result even if the UI selection changed.
6. Add an accessible From selector for reply/new compose, defaulting from the
   last outbound identity when allowed, otherwise the registry default.
7. Preserve send-status lifecycle, attachment materialization, audit semantics,
   and provider-acceptance wording.

## Acceptance evidence

- Source traces selected id to persisted/provider/retry identity without a second resolver.
- Unknown/disabled identities fail before provider send.
- Type/static/lint checks are clean when implementation executes.

## Recovery and completion

Serialized shared-file edit. Complete when AC-002 and identity parts of AC-005
are source-proven and UNIT-006/007 can carry the identity in drafts/recipients.

