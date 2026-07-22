# UNIT-003: Build secure user message, context, and screenshot intake

## Goal and status

`READY` after UNIT-002 | dependencies: UNIT-002 | requirements: UX-001, SEC-001,
SEC-002, DATA-002 | risks: RISK-003, RISK-004, RISK-005

Create one owner-scoped multipart mutation path that persists a support message,
safe context, optional screenshot, unread/status change, and idempotency before
realtime fanout.

## Owned paths

- `src/app/api/support/conversations/route.ts`
- `src/app/api/support/conversations/[id]/messages/route.ts`
- new `src/app/api/support/attachments/[id]/route.ts`
- new `src/lib/support/user-support-intake.ts`
- new `src/lib/support/support-screenshot.ts`
- new `src/lib/support/support-rate-limits.ts`
- `src/lib/repositories/support-conversations-d1.ts` after UNIT-002
- `src/lib/cloudflare/support-inbox-fanout.ts` only for insertion-result handling
- existing R2/email attachment utilities only when reuse does not import admin or
  Node-only boundaries into user/Worker code

## Implementation boundary

1. Replace current user JSON mutations with one multipart `FormData` contract in
   the same implementation slice; no dual active write contract remains.
2. Derive session actor, assert same origin, apply durable user-scoped rate limits,
   validate body/client ID, and normalize context before R2 work.
3. Enforce no file or exactly one PNG/JPEG/WebP screenshot up to 3 MiB. Validate
   extension, claimed type, and magic bytes; reject SVG/HTML and multiple files.
4. Compute message/file fingerprints, reserve the actor-scoped
   `support_user_intake_claims` row, and assign stable winning
   conversation/message IDs before uploading. A retry with the same fingerprint
   resumes or returns the winner; a changed fingerprint returns conflict.
5. Compute the stable private R2 key from server-owned actor/client identity and
   digest, never the raw filename, then upload only for the winning claim.
6. Use one D1 batch for message/conversation, attachment row, context,
   unread/status, reopen-on-reply semantics, and transition of that exact claim
   to `committed`. Unique message and attachment ownership constraints must agree
   with the claim.
7. If the D1 batch fails after R2 upload, leave a discoverable reserved claim for
   bounded recovery. Compensation may delete only after proving the same claim
   owns the key and no committed attachment references it; otherwise repair or
   mark the claim abandoned without touching another request's object.
8. Return 201 for insertion and 200 for idempotent recovery. Fan out only when a
   new message was inserted. D1 success remains success if fanout degrades.
9. Add owner/admin screenshot read through attachment -> message -> conversation
   authorization, no-store/private headers, safe image type, `nosniff`, and
   defensive CSP. Never return R2 keys.
10. Do not add a post-send attachment DELETE endpoint in MVP. Users may remove a
    local preview before send; after send, the screenshot follows authorized
    admin lifecycle or privacy erasure rather than a hide-only action.
11. Cap message/context so complete multipart input remains below the hosted
    Worker ceiling. Keep email/inbound attachment limits separate.

## Failure semantics

- offline before request: no server state, retain local draft;
- rejected file: message not sent until the user removes/replaces it;
- D1 committed, fanout failed: success with `realtimeDegraded`;
- response lost after commit: claim lookup returns the original
  message/attachment;
- R2 written, D1 failed: reserved claim remains discoverable for safe repair or
  reference-aware compensation and the user receives a retryable error;
- owner check fails: generic 404 with no existence leak.

## Acceptance evidence

- Source trace proves auth/origin/rate-limit -> validation -> actor-scoped claim
  reservation -> R2 -> D1 batch/claim commit -> response -> optional fanout.
- Prohibited context and unsafe file types have no persistence path.
- A retry cannot create a second canonical message or delete another request's
  screenshot, including after a lost response or partial storage failure.
- Owner/admin attachment authorization is joined through D1.
- No new binding, signing credential, upload dependency, or public R2 access.
- No post-send hide-only or DELETE surface exists in MVP.
- Execute and retain the UNIT-003 static-QA receipt from `00-PLAN.md` section 20.
- TEST_PROPOSAL only: user intake/security/compensation tests.

## Recovery and stop condition

Feature code remains unreachable until UNIT-004 cuts over the UI. Recovery is
removing the new route behavior/modules while leaving additive schema inert.
Stop when AC-003/004/005/007 server contracts are ready for both user clients.
