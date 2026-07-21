# UNIT-007 — Reply-all, forward, recipient contract, and keyboard navigation

## Goal and status

`READY` · dependencies: UNIT-002, UNIT-004, UNIT-006 · requirements: UX-001, SEC-001 · risks: RISK-004

Add safe recipient-aware reply-all and new-thread forward without corrupting
threading, leaking recipients, or capturing editable focus.

## Owned paths

- `src/lib/email/cloudflare-email-client.ts`
- `src/lib/email/transactional-email-client.ts`
- `src/lib/email/support-email-address.ts` or a focused recipient helper
- `src/lib/admin/support-actions.ts` (reread after UNIT-004/006)
- `src/components/admin/support/SupportRichComposer.tsx` (reread)
- `src/components/admin/AdminSupportInbox.tsx` (reread)

## Implementation boundary

1. Extend the internal email contract with explicit CC and a product recipient cap.
2. Normalize/dedupe To/Cc, exclude every configured support From/reply mailbox,
   and reject malformed, empty, or over-limit results before persistence/send.
3. Reply-all remains in-thread and persists `to_json`/`cc_json` actually sent.
4. Forward always creates a new conversation/routing token with `Fwd:` subject
   and safely quoted source content. Do not add reply threading headers.
5. Forward only explicitly selected `stored` attachments after R2 re-read and
   current type/count/size checks; blocked/quarantined/missing objects fail closed.
6. Scope j/k, archive, reply, and search shortcuts to the mailbox. Ignore events
   from inputs, textareas, selects, contenteditable, dialogs, and the composer.

## Acceptance evidence

- Source proves recipient exclusion/dedupe/caps and distinct reply vs forward semantics.
- Cloudflare CC is sent as a first-class API field, not a custom header.
- TEST_PROPOSAL only: `bun x vitest run tests/vitest/support-recipients.test.ts`.

## Recovery and completion

Serialized shared-file edit. Complete when AC-004 and recipient parts of AC-005
are source-proven and existing idempotency/audit/send-status behavior remains.

