# Unit 015 — `acceptInvite` POST Forwards A Null User To The Acceptance RPC (MEDIUM)

**Finding:** F-15 · **Severity:** MEDIUM · **Priority:** P3 · **Effort:** S · **Risk:** LOW
**Requirement:** `REQ-010` (item) · **Status:** TODO · **Depends on:** 009 · **Test:** NOT_REQUIRED

## Problem

The invite-accept handler calls `getCurrentUserContext()` (nullable) and forwards
a null user to `acceptInvitationTokenForUser`, which currently returns `invalid`
without mutating — safe today. But there is no server-side enforcement that the
caller is authenticated before invoking the RPC. If the underlying RPC's
null-actor guard were ever relaxed, an unsigned POST would mutate state.

## Evidence

`src/app/invite/[token]/accept/route.ts:102-127`:
```ts
const currentUser = await getCurrentUserContext();
...
const { data } = await acceptInvitationTokenForUser({ ..., user: currentUser }); // no null check
```

## Fix Direction

Explicitly 401 when `currentUser` is null before calling the RPC:

```ts
const currentUser = await getCurrentUserContext();
if (!currentUser) {
  return Response.json({ error: "Sign in required to accept this invite." }, { status: 401 });
}
```

Keep the RPC's null-actor guard as defense-in-depth.

### Owned paths
- `src/app/invite/[token]/accept/route.ts`

### Prohibited
- Do not relax the RPC guard — it stays as the second layer.

## Acceptance Evidence

- `AC-001`: an unauthenticated POST to the accept route returns 401 without calling
  the RPC.

## Recovery

None needed.

## Notes

Land after unit 009 (closed-beta centralization) so the auth surface is stable.
