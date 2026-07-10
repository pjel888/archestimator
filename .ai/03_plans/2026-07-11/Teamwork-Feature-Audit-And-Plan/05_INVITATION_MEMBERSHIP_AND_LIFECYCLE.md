# Invitation, Membership, and Lifecycle

## Product Contract

Adding a known member and inviting an email address are different operations.

- **Add member:** manager selects a known eligible profile and explicitly grants a role immediately. The target profile must exist. The operation is audited as a direct grant.
- **Invite by email:** creates a pending scoped offer. Access is not granted until the exact recipient explicitly accepts by POST, regardless of whether an account already exists.
- **Change role:** explicit before/after mutation for an existing direct membership. Re-invitation never acts as a hidden role change.
- **Remove access:** explicit scope selection with honest retained-access preview.

This replaces the current split semantics where an existing profile may receive immediate membership while a new recipient accepts a token.

## Invitation Identity

An invitation is uniquely identified by:

```text
tenant/workspace + project + normalized email + scope(project|estimate) + estimate_id|null
```

Only one active pending invitation may exist for that identity. A resend/reissue rotates its active token instead of inserting a competing pending invitation.

## State Machine

```text
DRAFT (UI only)
  -> PENDING_DELIVERY
  -> PENDING_DELIVERED | PENDING_DELIVERY_FAILED
  -> ACCEPTED | REVOKED | EXPIRED | SUPERSEDED
```

Rules:

- Creation persists invitation, active token hash, lifecycle fact, and delivery-outbox intent atomically.
- Raw token material exists only in the returned URL/email payload and is never stored or logged.
- Email delivery is an external side effect. Sent/failed status is recorded after the attempt without rolling back a valid pending invite.
- Copy link rotates or reuses the active token according to an explicit command; it cannot resurrect revoked/expired invitations.
- Resend validates exact scope, pending status, expiry, actor capability, and rate limit before rotating.
- Revoke invalidates all active tokens in the same transaction and emits a durable fact.
- Expiry is materialized deterministically on resolution or scheduled cleanup; expired tokens cannot be reissued without creating a new invitation.
- Acceptance consumes exactly one active token, grants/escalates direct membership, finalizes lifecycle, and emits an audit fact atomically.
- Acceptance never lowers an existing role. If the existing role is higher, record `accepted_no_role_change`.
- Token replay returns an idempotent accepted result without repeating grant or event.
- Wrong-account attempts never reveal more recipient data than the bearer preview policy permits.

## Consent and Authentication

- No membership mutation occurs on GET.
- The invite GET may render a bounded bearer preview, but link scanners can only record non-security-critical open telemetry.
- Signed-out recipients authenticate, then return to a confirmation page through the signed pending-invite bridge.
- The bridge carries intent only. The user must submit an explicit same-origin POST to accept.
- The accepted account email must exactly match the normalized invited email.
- Next.js 16 server-action and origin behavior must be re-read from `node_modules/next/dist/docs/` during implementation; the route-level same-origin check remains explicit for direct route handlers.

## Bearer Preview Policy

Before authentication, a valid bearer token may show:

- project display name;
- estimate display name only for estimate-scoped invitations;
- offered role;
- inviter display label;
- expiry date.

It must not show member lists, internal IDs, recipient email, estimates outside scope, unpublished data, or current access state. A revoked or expired token returns a generic state without project detail.

After authentication with the wrong account, show a generic account-mismatch instruction. Do not print the invited email; provide a switch-account action.

## Rate and Abuse Controls

Apply durable D1 rate limits for:

- create by actor, tenant, email, and project;
- copy/reissue/resend by invitation and actor;
- resolve/open by token fingerprint and IP-derived privacy-safe key;
- accept by token, account, and project;
- wrong-account failures.

Multi-scope reservations must be atomic or roll back earlier reservations when a later scope denies.

## Membership Changes

### Project removal

The confirmation surface offers two explicit choices:

1. remove project membership only and retain direct sheet grants; or
2. remove project membership and all direct grants in that project.

The default destructive choice is the second only when the preview lists every affected sheet and the actor confirms it. The server command receives an explicit removal mode and emits one root event plus per-scope child facts as needed.

### Estimate removal

Removing a direct estimate membership may leave inherited access. The server returns an effective-access preview and the UI says whether access will remain and why. It never claims complete removal when workspace/project inheritance still applies.

### Role changes

- Separate project and estimate role-change commands.
- Stable before/after audit fields.
- Profile existence, actor capability, target dominance, self-action rules, and manager floor checked inside the transaction.
- No owner option in generic menus.
- Same-role changes are idempotent and do not emit duplicate facts.

## Failure Policy

- Authorization, manager-floor, uniqueness, token-consumption, membership, and lifecycle-fact persistence failures are fail-closed.
- Email send failures preserve the pending invite and surface a copy-link fallback to authorized managers.
- Structured logs record stable event/error codes and redacted IDs; raw email, token, URL, request ID, owner label, and stack are not exposed in UI or plan evidence.
- Retries use idempotency keys and cannot create duplicate grants or facts.

## Required Lifecycle Proof

- new account, existing account, already-member-higher-role, already-member-lower-role;
- signed out -> auth -> explicit POST;
- wrong account, replay, revoked, expired, superseded, copied, resent;
- concurrent create, accept, revoke, resend, and role change;
- failure after each statement boundary;
- rate-limit exhaustion and rollback;
- project removal with retain/cascade modes;
- estimate removal with inherited access retained;
- no raw token/email leakage in structured logs or artifacts.
