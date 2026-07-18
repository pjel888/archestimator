# Unit 017 — Invite Preview Leaks PII To Any Signed-In Token-Holder (MEDIUM)

**Finding:** F-17 · **Severity:** MEDIUM · **Priority:** P2 · **Effort:** S · **Risk:** LOW
**Requirement:** `REQ-010` (item) · **Status:** TODO · **Depends on:** 009 · **Test:** NOT_REQUIRED

## Problem

The invite page renders the preview (project name, project code, estimate name,
and `invited_email`) for any signed-in user who possesses the raw token,
regardless of whether they are the intended recipient. Possession of the token
(forwardable/leakable) is the only authz for this PII preview.

## Evidence

`src/app/invite/[token]/page.tsx:193-219` renders `InvitePreview` / wrong-account
copy from `state.row` for any signed-in user holding the token URL.

## Fix Direction

Only render the full preview (and especially `invited_email`) when the signed-in
email matches `row.invited_email`. For a mismatched signed-in user, show a generic
"this invite is for another account — sign out and continue" message without
echoing the recipient's email or the project/estimate specifics.

```tsx
const isIntendedRecipient = !!currentUser?.email && row.invited_email
  && normalizeEmail(currentUser.email) === normalizeEmail(row.invited_email);
{isIntendedRecipient ? <InvitePreview row={row} /> : <GenericWrongAccountNotice />}
```

The wrong-account CTA can stay; just don't leak `invited_email` / project name to
the wrong user.

### Owned paths
- `src/app/invite/[token]/page.tsx`

### Prohibited
- Do not change the underlying acceptance RPC (it correctly enforces email match
  and audits `collaboration_invite_wrong_account`).
- Do not block the token-holder from seeing *that* the invite is for another
  account — just redact the PII.

## Acceptance Evidence

- `AC-001`: a signed-in user whose email ≠ `invited_email` does not see
  `invited_email`, project name, or estimate name in the rendered HTML.

## Recovery

None needed.

## Notes

Land after unit 009. Pairs with unit 031 (redirect trusts form-body display
fields).
