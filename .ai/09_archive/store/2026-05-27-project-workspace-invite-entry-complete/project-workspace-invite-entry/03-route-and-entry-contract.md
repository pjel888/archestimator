# 03 - Route And Entry Contract

Controlling note: `10-state-machine-and-route-spec.md` is the route/state authority. This file is first-pass route context.

## Route Recommendation

Use:

```txt
/invite/[token]
```

Do not put the first invitation screen under `/workshop` because invitees may be signed out or not signed up. Do not make the email/copy link point directly to `/workshop/projects/[projectId]`; that path lacks invitation context and creates a confusing auth bounce.

The existing direct project URL can remain a private project link for users who already have access. It is not the invitation-entry route.

## Route Responsibilities

`/invite/[token]` must:

- validate token shape before database lookup;
- hash the raw token and compare to stored hash;
- distinguish valid, invalid, expired, revoked, accepted, and already-member states;
- show a minimal invite preview for valid tokens;
- avoid exposing private project details for invalid tokens;
- set a short-lived pending invite bridge before sending signed-out users to `/login`;
- accept or confirm membership for signed-in matching users;
- give wrong-account users a sign-out path;
- never require optional account details.

## Auth Handoff

The 2026-05-27 auth contract stays intact:

```txt
successful auth -> /workshop
```

Implementation must not special-case the auth callback to deep-link into a project. Instead:

1. `/invite/[token]` sets an httpOnly, sameSite Lax, short-lived pending invite cookie before routing to `/login`.
2. `/login` can still receive `next=/invite/[token]` for messaging and safe retry, but callback success still resolves to `/workshop`.
3. `/workshop` reads the pending invite cookie server-side.
4. `/workshop` resolves the invitation for the authenticated user:
   - auto-accept if the email-bound invite matches and the token is still valid;
   - render a success or failure banner without blocking the workshop.
5. `/workshop` clears the pending invite cookie after success, failure, expiration, or user dismissal.

## Pending Invite Bridge

Required cookie:

```txt
archestimator_pending_invite
```

Properties:

- httpOnly;
- sameSite Lax;
- secure outside localhost;
- max age 30 minutes;
- signed or encrypted value;
- stores only a nonce or invitation token reference, not project data.

The cookie is a UX bridge, not an authorization source. The database token and authenticated user remain the authority.

## Server-Side Route States

The route resolves to one of these view models:

```ts
type InviteEntryState =
  | { kind: "invalid" }
  | { kind: "expired"; expiredAt: string }
  | { kind: "revoked" }
  | { kind: "accepted"; projectHref?: string }
  | { kind: "already-member"; projectHref: string }
  | { kind: "signed-out-preview"; preview: InvitePreview }
  | { kind: "wrong-account"; invitedEmail: string; currentEmail: string }
  | { kind: "signed-in-preview"; preview: InvitePreview }
  | { kind: "accepted-now"; projectHref: string };
```

`InvitePreview` is minimal:

```ts
type InvitePreview = {
  inviterLabel: string;
  projectName: string;
  projectCode: string | null;
  role: "owner" | "admin" | "editor" | "viewer";
  scope: "project" | "estimate";
  estimateName?: string;
  expiresAt: string;
};
```

Public copy collapses invalid, revoked, wrong-email, already-used, and unknown-token states for anti-enumeration:

```txt
This invite link is invalid or no longer available. Ask the sender to invite this email again.
```

Precise reason codes belong in server-side audit metadata only.

## Route Allowlist And Protection

- `/invite/[token]` must be public in route protection, but the token lookup must be server-only.
- `/workshop` remains protected.
- `/workshop/projects/[projectId]` remains protected by RLS and route data loading.
- `/workshop/onboarding` remains a settings redirect only.

## Retry And Recovery

- If a signed-out user closes the auth flow and returns to `/invite/[token]`, the route shows the same preview if the token is still valid.
- If the pending cookie expires but the token is still valid, the route can set a fresh pending cookie.
- If auth succeeds but invite acceptance fails because of a transient database error, `/workshop` shows a retry action that posts to a server action, not a new sign-in requirement.
