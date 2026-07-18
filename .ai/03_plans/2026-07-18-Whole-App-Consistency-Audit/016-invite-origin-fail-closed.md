# Unit 016 — `isAllowedInviteOrigin` Fails Open When Origin + Referer Absent (MEDIUM)

**Finding:** F-16 · **Severity:** MEDIUM · **Priority:** P2 · **Effort:** S · **Risk:** LOW
**Requirement:** `REQ-010` (item) · **Status:** TODO · **Depends on:** 009 · **Test:** NOT_REQUIRED

## Problem

For the invite accept/sign-out CSRF check, if the request omits both `Origin` and
`Referer` headers (trivial for a forged cross-site fetch), `isAllowedInviteOrigin`
returns `true`, allowing the mutation. This weakens the cross-site POST guard that
the route comment claims is the primary defense.

## Evidence

`src/lib/collaboration/invite-origin.ts:22-40`:
```ts
export function isAllowedInviteOrigin(request: Request): boolean {
  const appHost = readAppHost(request, headers);
  if (!appHost) return true; // only this degenerate case should fail open
  const originHost = readUrlHost(headers.get("origin"));
  if (originHost) return originHost === appHost;
  const refererHost = readUrlHost(headers.get("referer"));
  if (refererHost) return refererHost === appHost;
  return true; // ← fails open when both headers absent but appHost is known
}
```

## Fix Direction

Fail closed for state-changing methods when `appHost` is known and neither header
is present. Same-origin browser POSTs always send `Origin` or `Referer`; their
absence on a mutating request is suspicious.

```ts
if (originHost) return originHost === appHost;
if (refererHost) return refererHost === appHost;
return false; // fail closed when appHost is known but no origin/referer
```

Keep the `!appHost` degenerate-environment fallback as-is (can't compare without a
known host). Optionally restrict the closed behavior to non-GET methods.

### Owned paths
- `src/lib/collaboration/invite-origin.ts`

### Prohibited
- Do not change the `!appHost` fallback (legitimate local/test environments).
- Do not break same-origin invite acceptance — verify with the existing invite
  accept/sign-out flows.

## Acceptance Evidence

- `AC-001`: a POST with a known `appHost` but neither `Origin` nor `Referer` is
  rejected.

## Recovery

If legitimate clients (some privacy browsers strip headers) are blocked, gate the
closed behavior behind a feature check or accept a SameSite cookie as an
alternative same-origin signal.

## Notes

Land after unit 009.
