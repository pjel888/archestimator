# Plan 021: Move recipient email sending off the request path and into a queue

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 0a2667db9..HEAD -- src/lib/publication/actions.ts src/lib/publication/recipient-limits.ts src/lib/cloudflare/client-portal-notification-queue.ts`
> If any changed since this plan was written, compare "Current state" against
> the live code; on a mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `0a2667db9`, 2026-07-17

## Why this matters

`addSharedLinkRecipients` (`src/lib/publication/actions.ts:1453`) processes up
to `SHARED_LINK_RECIPIENT_ACTION_LIMIT = 50` recipients via
`mapWithBoundedConcurrency(allowedRecipients, SHARED_LINK_RECIPIENT_ADD_CONCURRENCY = 4, ...)`,
and each iteration does an insert AND an `await sendSharedLinkRecipientInvitationEmail(...)`
**inside the request handler**. `resendSharedLinkRecipientEmail` (line 1655) and
the digest path (line 1896) do the same. A slow email provider stalls the
workshop UI for ~13 external round-trips (50/4) plus 50 inserts, risks Workers
wall-clock/CPU limits, and partial-commits failures (some recipients emailed,
some not) with no replay. The repo already has a Cloudflare Queue
(`CLIENT_PORTAL_NOTIFICATIONS_QUEUE` with a D1-backed durable consumer at
`client-portal-notification-queue.ts`) — this plan routes recipient email sends
through it.

## Current state

`src/lib/publication/actions.ts` (verified):
- Line 1453 — `addSharedLinkRecipients`.
- Line 1552-block — `mapWithBoundedConcurrency(...)` with per-iteration insert +
  `await sendSharedLinkRecipientInvitationEmail(...)`.
- Line 1655 — `resendSharedLinkRecipientEmail` (same inline-send pattern).
- Line 1896 — digest path (same).

`src/lib/publication/recipient-limits.ts:1` — `SHARED_LINK_RECIPIENT_ACTION_LIMIT = 50`.

`src/lib/cloudflare/client-portal-notification-queue.ts` — the existing durable
notification queue (D1 lease-token + state machine, cross-attempt idempotency,
`max_batch_size: 20`). This is the exemplar for how to enqueue + consume.

## Commands you will need

| Purpose   | Command                | Expected on success |
|-----------|------------------------|---------------------|
| Typecheck | `bun run type-check`   | exit 0              |
| Tests     | `bun run verify`       | all pass            |

## Scope

**In scope** (the only files you should modify):
- `src/lib/publication/actions.ts` — in `addSharedLinkRecipients`,
  `resendSharedLinkRecipientEmail`, and the digest path: insert recipients as
  "pending send" then enqueue per-recipient send jobs to the notification
  queue, instead of awaiting `sendSharedLinkRecipientInvitationEmail` inline.
- The notification queue producer/consumer (in
  `client-portal-notification-queue.ts` or wherever the consumer dispatches
  sends) — add a recipient-invitation message type that calls
  `sendSharedLinkRecipientInvitationEmail` and flips the recipient's
  `delivery_status` to `sent` / `failed`.

**Out of scope**:
- The recipient insert logic / validation (`quick-add-validation.ts`-style) —
  unchanged.
- The email rendering / content — unchanged.
- Other publication actions — only the three send-bearing paths.

## Git workflow

- Branch: `advisor/021-async-recipient-email`.
- Commit message: `perf(publication): queue recipient invitation emails off the request path`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add a recipient-invitation message type to the queue

Read `client-portal-notification-queue.ts` to understand its message-shape
contract and how the consumer dispatches by type. Add a new message type (e.g.
`recipient-invitation`) carrying the recipient id (or the minimum fields needed
to send — recipient id + publication id; the consumer re-fetches the rest from
D1 to avoid stale payloads). The consumer handler:
1. Loads the recipient row; skip (idempotent ack) if `delivery_status` is
   already `sent`.
2. Calls `sendSharedLinkRecipientInvitationEmail(...)`.
3. On success, `UPDATE ... SET delivery_status='sent', sent_at=...`.
4. On failure, follow the existing retry/DLQ contract (`max_retries: 10`).

Match the existing message-type dispatch style.

**Verify**: `bun run type-check` → exit 0.

### Step 2: Enqueue instead of awaiting inline

In `src/lib/publication/actions.ts`, for each of the three send-bearing paths:

- Keep the recipient insert(s) in the request handler (so the recipient exists
  immediately).
- Replace the inline `await sendSharedLinkRecipientInvitationEmail(...)` with
  an enqueue call to the notification queue (one message per recipient, or a
  batched enqueue if the queue producer supports it).
- Return success to the UI as soon as inserts + enqueues complete — do NOT wait
  for sends.

Surface a "sending..." / "pending" state to the UI via the existing activity
feed or a `delivery_status` field the UI already reads (confirm by reading the
recipient-list UI component). If the UI currently shows "sent" synchronously,
add a "pending" intermediate state so the user sees accurate feedback.

**Verify**: `bun run type-check` → exit 0.

### Step 3: Run the gate

**Verify**: `bun run verify` → exit 0.

Tests that asserted the email was sent synchronously (e.g.
`toHaveBeenCalledWith(sendSharedLinkRecipientInvitationEmail, ...)`) must now
assert the queue received an enqueue, and separately test the consumer sends.
Search: `grep -rln "sendSharedLinkRecipientInvitationEmail\|addSharedLinkRecipients\|resendSharedLinkRecipientEmail" tests/`.

## Test plan

- Update affected tests to the enqueue-then-consume contract.
- If authorized (TEST_TASK), add:
  - A test that `addSharedLinkRecipients` returns immediately after enqueue
    (does not await the send).
  - A consumer test that processes a `recipient-invitation` message, sends, and
    flips `delivery_status` to `sent`; idempotent on re-delivery.
  Model on the existing notification-queue tests.

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run verify` exits 0
- [ ] `addSharedLinkRecipients`, `resendSharedLinkRecipientEmail`, and the
      digest path enqueue instead of `await sendSharedLinkRecipientInvitationEmail`
- [ ] The queue consumer has a `recipient-invitation` handler that sends + flips
      `delivery_status`
- [ ] The UI surfaces a "pending" state (not a false "sent")
- [ ] No files outside the in-scope list (plus updated tests) are modified
- [ ] `README.md` status row updated to DONE

## STOP conditions

- The notification queue consumer can't be extended with a new message type
  without a larger refactor — report.
- The UI has no `delivery_status` read path and adding one is a bigger change
  than this plan covers — report; scope down to enqueue + return "sending" and
  note the UI follow-up.
- A test deliberately asserts synchronous send semantics as a contract — report
  (may need a maintainer decision on the UX change).

## Maintenance notes

- After this lands, the "Add recipients" action returns ~immediately; actual
  delivery is async. Watch the notification queue DLQ (`archestimator-client-portal-notifications-dlq`)
  for send failures.
- The `delivery_status` field is now load-bearing for UX accuracy — make sure
  the recipient-list UI reads it on refetch.
- Reviewer: confirm (a) the request handler does not await the email send,
  (b) the consumer is idempotent, (c) the UI shows "pending" not "sent", (d)
  failures route to the existing DLQ/retry path.
