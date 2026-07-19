# UNIT-011 — Recipient Invitation Emails Block The Publication Request Path · PERF-PUB-001

**Finding:** PERF-PUB-001 · **Priority:** P2 · **Wave:** 2 (W2-2 / HL-4) · **Effort:** M · **Risk:** Medium
**Roadmap item:** W2-2 · **Test decision:** `NOT_REQUIRED`
**local_implementation:** `NOT_STARTED` · **external_lifecycle:** `NOT_STARTED`

## Outcome

A 50-recipient publication returns in <500 ms regardless of recipient count.
Per-recipient email sends route through the existing
`CLIENT_PORTAL_NOTIFICATION_QUEUE` (lease-token + state machine + DLQ), and
each recipient row is inserted as "pending send" then flipped to `sent` /
`failed` by the queue consumer. Partial-commit risk on mid-loop failure is
eliminated.

## Affected surface

- `src/lib/publication/actions.ts:1453,1552,1586,1655,1712,1896`
  - `:1552` `mapWithBoundedConcurrency(allowedRecipients, SHARED_LINK_RECIPIENT_ADD_CONCURRENCY, ...)`
  - `:1586` `await sendSharedLinkRecipientInvitationEmail({...})` inside the
    iteration (inline await on request path)
  - `:1712` same pattern in `resendSharedLinkRecipientEmail`
  - `:1896` digest path
- `src/lib/publication/recipient-limits.ts:1` — `SHARED_LINK_RECIPIENT_ACTION_LIMIT = 50`
- **Exemplar durable consumer (already built):**
  `src/lib/cloudflare/client-portal-notification-queue.ts`

## Dependencies

- None for the code change (the queue already exists).
- **Confirms existing `/improve` Plan 021** — that plan identified the exact
  issue and is the canonical executor doc. PERF-PUB-001 verified it is still
  current at HEAD. Execute via Plan 021; this unit is the cross-reference.
- No AUTH_BOUNDARY items (queue infrastructure is standing).

## Implementation intent

From PERF-PUB-001 "Recommendation" (execute existing Plan 021 as written):

1. In `addSharedLinkRecipients`, insert recipients as "pending send" (the
   idempotent INSERT is already there — unique pub+email).
2. Enqueue per-recipient send jobs to `CLIENT_PORTAL_NOTIFICATION_QUEUE`
   instead of awaiting `sendSharedLinkRecipientInvitationEmail` inline at
   `:1586`.
3. The existing consumer (see `client-portal-notification-queue.ts` exemplar)
   calls `sendSharedLinkRecipientInvitationEmail` and flips
   `delivery_status` to `sent` / `failed`.
4. Apply the same pattern to `resendSharedLinkRecipientEmail` (`:1712`) and
   the digest path (`:1896`).

Constraints (from finding): preserve per-recipient token hashing; preserve
idempotent insert (unique pub+email); preserve partial-failure UI feedback
(the recipient list must surface `pending` / `sent` / `failed` states
correctly).

## Expected evidence

Verification command from PERF-PUB-001 "Verification":

```
# Worker tail during a 50-recipient publish; observe response latency and
# queue depth
wrangler tail --env staging
```

Evidence class: `NOT_REQUIRED` for the static change (diff showing the inline
`await sendSharedLinkRecipientInvitationEmail` replaced by an enqueue call,
plus the consumer calling the same email fn and flipping `delivery_status`,
is the decisive non-test signal). The 50-recipient latency probe is
hosted-gated follow-up.

## Completion signal

- `actions.ts:1586` no longer awaits the email send inline; it enqueues to
  `CLIENT_PORTAL_NOTIFICATION_QUEUE`.
- `:1712` (resend) and `:1896` (digest) follow the same pattern.
- The recipient row's `delivery_status` transitions `pending → sent | failed`
  via the consumer.

## Recovery path

**Required (Risk: Medium — publication surface).** If the queue path surfaces
a delivery-drop (a recipient enqueued but never consumed), revert to the
inline await at `:1586`/`:1712`/`:1896`. The idempotent INSERT and per-recipient
token hashing are independent of the send mechanism, so a revert does not
lose data — only the latency characteristic regresses. Before reverting,
inspect the DLQ for the dropped messages.
