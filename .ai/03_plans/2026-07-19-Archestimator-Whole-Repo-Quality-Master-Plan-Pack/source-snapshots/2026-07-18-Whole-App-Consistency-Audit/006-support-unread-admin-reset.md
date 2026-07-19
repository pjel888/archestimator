# Unit 006 — Support Inbox `unread_for_admin` Never Resets (HIGH)

**Finding:** F-06 · **Severity:** HIGH · **Priority:** P1 · **Effort:** S · **Risk:** LOW
**Requirement:** `REQ-006` · **Status:** TODO · **Depends on:** — · **Test:** `TEST_PROPOSAL`

## Problem

When an admin replies to a support conversation, `unread_for_admin` is explicitly
**preserved** (`THEN unread_for_admin`). There is no "mark read" path when an admin
opens/replies to a thread. The only place `unread_for_admin = 0` is ever written is
`eraseSupportDataForPrivacyRequest`. Result: once a user sends a message, the
conversation is permanently flagged as awaiting admin reply.

Downstream impact (verified): `listOpenSupportConversations` sorts by
`unread_for_admin DESC` (action-inbox triage), `deriveActionItemsFromSources` marks
unread ones `warning` priority 20, and the copilot's `awaitingReplySupport` count
all stay permanently elevated.

## Evidence

`src/lib/repositories/support-conversations-repository.ts:371-376`:
```sql
UPDATE support_conversations
SET last_message_at = ?, updated_at = ?,
    unread_for_admin = CASE WHEN ? = 'admin' THEN unread_for_admin ELSE 1 END,
    unread_for_user   = CASE WHEN ? = 'admin' THEN 1 ELSE unread_for_user END
WHERE id = ?
```

`grep` confirms no other write path zeroes `unread_for_admin` except
`eraseSupportDataForPrivacyRequest` (~line 555).

## Fix Direction

On admin reply, clear `unread_for_admin` (the admin just acted on it):

```sql
unread_for_admin = CASE WHEN ? = 'admin' THEN 0 ELSE 1 END,
```

Additionally (recommended), add a `markSupportConversationReadByAdmin` (or extend
the existing read-marking path) invoked when an admin opens a thread, so the flag
clears on view, not just on reply. Mirror the existing `unread_for_user` clear that
fires when the user opens their thread.

### Owned paths
- `src/lib/repositories/support-conversations-repository.ts`
- (optional) the admin "open thread" handler, for the view-based clear

### Prohibited
- Do not clear `unread_for_user` on admin reply (users must still see the admin's
  new message as unread).
- Do not remove the privacy-erase zeroing.

## Acceptance Evidence

- `AC-001`: admin-reply branch sets `unread_for_admin = 0`.
- `AC-002`: a conversation replied-to by an admin no longer sorts to the top of the
  action inbox / inflates `awaitingReplySupport`.
- `TEST_PROPOSAL`: run the support-repository test to prove the flag clears on
  admin reply.

## Recovery

If the view-based clear is out of scope for this unit, ship the reply-based clear
alone (it covers the common path) and file the view-based clear as a follow-up.
