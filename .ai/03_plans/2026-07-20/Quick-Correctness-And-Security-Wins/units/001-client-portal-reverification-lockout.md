# UNIT-001 — Fix Client Portal recipient re-verification lockout

> **Historical provenance only — do not execute.** This unit is `SUPERSEDED`
> without implementation here and absorbed by successor `UNIT-002` in
> `.ai/03_plans/2026-07-31/Code-Improvement/`.

## Goal

Stop permanently locking Client Portal recipients out after their first
magic-link login. Today the second login always fails silently because the
recipient-row verification `UPDATE` requires `last_verified_at IS NULL`, so it
matches zero rows once a recipient has verified once, and
`resolveClientPortalRecipientActor` returns null forever.

## Status

`SUPERSEDED` · historical dependency: (none) · requirement: `SEC-001` · risks: (none)

## Why this matters

A portal recipient who logs in once can never log in again until an admin
manually resets `last_verified_at` to NULL. This is a silent, permanent lockout
on a public-facing surface — the single highest user-impact bug in the audit.
The replay protection is already provided by the credential-token `status='used'`
claim in the same batch (statement at index 0); the recipient-row `UPDATE` is
only a denormalized `verification_state` flag and must not gate the login.

## Current state

File: `src/lib/client-portal/public-repository.ts`, function
`resolveClientPortalRecipientActor` (starts ~line 207).

The batch at lines 219–223 issues three statements:

```ts
const verificationResults = await database.batch([
  // [0] credential claim — the real idempotency guard
  database.prepare("UPDATE client_portal_recipient_credentials SET status = 'used' WHERE id = ? AND recipient_id = ? AND token_hash = ? AND status = 'active' AND (expires_at IS NULL OR expires_at > ?)")
    .bind(recipient.credential_id, recipient.id, tokenHash, timestamp),
  // [1] recipient verification flag — CONDITIONAL on last_verified_at IS NULL
  database.prepare("UPDATE client_portal_recipients SET verification_state = 'verified', last_verified_at = ?, updated_at = ? WHERE id = ? AND portal_id = ? AND status = 'active' AND last_verified_at IS NULL AND EXISTS (SELECT 1 FROM client_portal_recipient_credentials c WHERE c.id = ? AND c.recipient_id = client_portal_recipients.id AND c.status = 'used')")
    .bind(timestamp, timestamp, recipient.id, portal.id, recipient.credential_id),
  // [2] audit event insert — also conditional on last_verified_at = ? (matches only when [1] just set it)
  database.prepare("INSERT INTO client_portal_audit_events (...) SELECT ?, ?, ?, ?, 'recipient', ?, 'portal.recipient.verified', 'security', ?, ?, ? FROM client_portal_recipients WHERE id = ? AND portal_id = ? AND last_verified_at = ?")
    .bind(`audit_${randomUUID()}`, portal.workspace_id, portal.id, issueId, recipient.id, JSON.stringify({recipientCredentialVersion:recipient.recipient_credential_version}), timestamp, timestamp, recipient.id, portal.id, timestamp),
]);
```

Line 224 then asserts:

```ts
if (verificationResults.some((result) => result.success === false)
    || (verificationResults[0]?.meta?.changes ?? 0) !== 1
    || (verificationResults[1]?.meta?.changes ?? 0) !== 1) return null;
```

On the second login, statement [1] matches 0 rows (because
`last_verified_at IS NULL` is false), so `(verificationResults[1]?.meta?.changes ?? 0) !== 1`
is true, and the function returns null. Lockout.

## Owned paths / resources

- `src/lib/client-portal/public-repository.ts` — the only file to edit.

## Implementation boundary

1. Confirm the file matches the excerpt above (reread before edit — shared worktree).
2. Relax the assertion on line 224: require statement [0] (the credential claim)
   to change exactly 1 row — that is the real replay guard — but accept
   **0 or 1** changes from statement [1] (the recipient verification flag).
   Statement [2] (the audit insert) will naturally follow [1]; accept 0 or 1
   there too.
3. The WHERE clauses on statements [1] and [2] can stay as-is (they remain
   idempotent: a second login simply no-ops them). The bug is in the assertion,
   not the SQL.
4. Do **not** remove the `last_verified_at IS NULL` condition from statement [1]
   — that would cause the audit event to fire on every subsequent login. The
   current SQL correctly records the audit event only on the first verification;
   keep that behavior.

Target shape for the assertion:

```ts
if (verificationResults.some((result) => result.success === false)
    || (verificationResults[0]?.meta?.changes ?? 0) !== 1) return null;
```

(Drop the `verificationResults[1]` term. The credential claim at index 0 is the
authoritative idempotency guard; once it has consumed the one-time token, the
recipient is authenticated regardless of whether the denormalized flag needed
updating.)

## Commands you will need

| Purpose    | Command              | Expected on success |
|------------|----------------------|---------------------|
| Type-check | `bun run type-check` | exit 0, no errors   |
| Lint       | `bun run lint`       | exit 0              |

## Scope

**In scope:** `src/lib/client-portal/public-repository.ts` only.

**Out of scope:**
- Any other file in `src/lib/client-portal/`.
- The recipient session reader `readClientPortalRecipientSession` (~line 230) —
  it already correctly checks `verification_state === "verified"` on the row, so
  once the first login sets it, subsequent logins (which now succeed) flow
  through the session path correctly.
- Database migrations. No schema change is needed.
- Tests (gate is `NOT_REQUIRED`).

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run lint` exits 0
- [ ] The assertion on `verificationResults[1]?.meta?.changes` is removed
- [ ] The credential-claim assertion on `verificationResults[0]` is preserved
- [ ] No files outside `src/lib/client-portal/public-repository.ts` are modified
      (`git status --short` shows exactly one file)

## Acceptance evidence

- Read the edited assertion and confirm it requires exactly 1 change on
  statement [0] and does not assert on statement [1] or [2].
- `git diff src/lib/client-portal/public-repository.ts` shows only the assertion
  line(s) changed.

## STOP conditions

- The code at lines 219–224 does not match the "Current state" excerpt (drift).
- Statement [0] (the credential claim) is not the real idempotency guard you
  expected — if its WHERE clause does not include `status = 'active'`, STOP and
  report; the replay protection model has changed.
- The function signature or return type has changed.

## Recovery

The fix is one assertion edit. The only failure mode is editing the wrong line
or dropping the credential-claim guard by mistake. If type-check fails, re-read
the file and confirm the edit is scoped to the assertion only.

## Maintenance notes

- Future changes to the verification batch (e.g. adding a fourth statement) must
  preserve the invariant: **the credential-token `status='used'` claim is the
  authoritative replay guard; the recipient-row flag is denormalized.**
- A reviewer should confirm the credential-claim statement (index 0) still
  includes `status = 'active'` in its WHERE — that is what makes it a one-time
  consumable token.
