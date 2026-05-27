# 10 - State Machine And Route Spec

## Route Inventory

Public:

- `/invite/[token]` - validates token shape, resolves a bounded preview, and starts or completes acceptance.

Protected:

- `/login` - existing auth entry.
- `/auth/callback` - remains the canonical callback and redirects successful auth to `/workshop`.
- `/workshop` - resolves a pending invite bridge and renders a non-blocking banner.
- `/workshop/projects` - lists owned, shared, and sheet-only projects.
- `/workshop/projects/[projectId]` - enforces project route access.
- `/workshop/projects/[projectId]/estimates` - enforces project or sheet-aware access.
- `/workshop/projects/[projectId]/estimates/[nodeId]` - enforces estimate-sheet access.
- `/workshop/projects/[projectId]/charts` - enforces project-level access for aggregated charts.

## Entities

Invitation:

- records sender, invited email, project, optional estimate, role, scope, lifecycle timestamps, and audit-safe metadata.

Invite Token:

- stores only token hash and lifecycle metadata;
- maps to exactly one active invitation;
- can be opened multiple times before acceptance;
- can be accepted exactly once by the matching email.

Pending Invite Bridge:

- short-lived httpOnly cookie set by `/invite/[token]` before auth;
- stores only an opaque nonce or token reference;
- is never an authorization source.

Membership:

- `project_members` for project access;
- `estimate_sheet_members` for sheet-only or restricted sheet access.

## Lifecycle States

| State | Meaning | Terminal |
| --- | --- | --- |
| `pending` | Invite exists, token active, no recipient acceptance yet | No |
| `opened_signed_out` | Valid token preview opened by signed-out visitor | No |
| `opened_matching_user` | Valid token preview opened by matching signed-in user | No |
| `wrong_account` | Valid token opened by a signed-in non-matching email | No |
| `accepted_by_recipient` | Matching recipient accepted through `/invite/[token]` or `/workshop` bridge | Yes |
| `direct_granted_existing_user` | Manager added existing profile directly before recipient clicked | No |
| `already_member` | Recipient already has equal or stronger access | Yes for this token attempt |
| `revoked` | Manager revoked invite or token | Yes |
| `expired` | `expires_at <= now()` | Yes |
| `invalid` | Token malformed or hash not found | Yes |
| `already_used_by_other_user` | Accepted by a different user id | Yes |

`direct_granted_existing_user` is not the same as `accepted_by_recipient`. It is manager-created access and must not be counted as invite-link acceptance unless the recipient later opens and confirms the invite.

## Transition Table

| From | Event | Actor | Guard | Side Effect | Next |
| --- | --- | --- | --- | --- | --- |
| none | create invite | owner/admin | sender can assign role | create invitation and token hash | `pending` |
| `pending` | copy invite link | owner/admin | invite active | audit copied token hint, no token rotation | `pending` |
| `pending` | refresh invite link | owner/admin | invite active | revoke old token, create new token hash | `pending` |
| `pending` | open valid token signed out | invitee | token active | set pending bridge cookie, audit opened | `opened_signed_out` |
| `opened_signed_out` | continue | invitee | token active | redirect to `/login` | `opened_signed_out` |
| `opened_signed_out` | auth callback success | system | any successful auth | redirect to `/workshop` | `opened_signed_out` |
| `opened_signed_out` | workshop bridge resolve | system | auth email matches invite email | atomic accept, clear cookie, show success banner | `accepted_by_recipient` |
| `pending` | open valid token signed in matching | invitee | auth email matches invite email | show accept preview | `opened_matching_user` |
| `opened_matching_user` | accept | invitee | token active, email matches | create/confirm membership, mark accepted | `accepted_by_recipient` |
| `pending` | open valid token signed in wrong email | invitee | auth email mismatch | audit wrong account, no membership | `wrong_account` |
| `wrong_account` | sign out and continue | invitee | token active | sign out, keep route target | `pending` |
| `pending` | manager revoke | owner/admin | sender can manage invite | set revoked timestamp, revoke active token | `revoked` |
| `pending` | expiration reached | system | expires_at <= now() | derive expired state on read; materialize `expired` before reissue | `expired` |
| `pending` | manager adds existing profile directly | owner/admin | profile exists and sender can assign role | create membership, keep invite distinguishable | `direct_granted_existing_user` |
| `direct_granted_existing_user` | recipient opens matching token | invitee | token active, email matches | mark accepted-through-route without duplicate write | `accepted_by_recipient` |

## Route View Model

`/invite/[token]` resolves one of these states:

```ts
type InviteEntryState =
  | { kind: "invalid" }
  | { kind: "expired" }
  | { kind: "revoked" }
  | { kind: "already-used" }
  | { kind: "already-member"; targetHref: string; targetLabel: string }
  | { kind: "signed-out-preview"; preview: InvitePreview }
  | { kind: "signed-in-preview"; preview: InvitePreview }
  | { kind: "wrong-account"; invitedEmail: string; currentEmail: string }
  | { kind: "accepted-now"; targetHref: string; targetLabel: string };
```

```ts
type InvitePreview = {
  inviterLabel: string;
  projectName: string;
  projectCode: string | null;
  roleLabel: "Owner" | "Admin" | "Editor" | "Viewer";
  scopeLabel: "Project" | "Estimate sheet";
  estimateName: string | null;
  expiresAtLabel: string;
};
```

## `/workshop` Bridge View Model

`/workshop` receives no query-string token data after auth. It reads only the pending invite bridge cookie server-side.

```ts
type WorkshopInviteBannerState =
  | { kind: "none" }
  | { kind: "accepted"; targetHref: string; targetLabel: string }
  | { kind: "wrong-account"; invitedEmail: string }
  | { kind: "unavailable"; reason: "expired" | "revoked" | "invalid" | "already-used" | "error" };
```

The banner never blocks the rest of `/workshop`.

Signed-out invitees already clicked `Continue to Archestimator` on the invite preview. That click is the consent event. After matching auth, `/workshop` attempts automatic acceptance and renders either `accepted` or `unavailable`. It does not ask for a second accept click.

Signed-in matching invitees did not cross the signed-out auth handoff. They accept explicitly on `/invite/[token]`.

## Pending Cookie Contract

Name:

```txt
archestimator_pending_invite
```

Required properties:

- httpOnly;
- sameSite Lax;
- secure outside localhost;
- max age 30 minutes;
- signed or encrypted;
- no raw token, project id, email, role, or project name in cleartext.

Allowed payload:

```txt
version + nonce + created_at + token_reference
```

The cookie must be cleared after success, terminal failure, or explicit dismissal.

The cookie stores a server-verifiable token reference, not the raw token. The raw token exists only in the route path and server memory long enough to produce the hash used by the database boundary.

## Access Rules By Route

`/workshop/projects/[projectId]`:

- project owner/admin/editor/viewer can open the dashboard;
- sheet-only user can open a limited dashboard shell that lists accessible sheets and explains limited access in compact copy.

`/workshop/projects/[projectId]/estimates`:

- project members can see all estimates allowed by project role;
- sheet-only users can see only accessible sheets.

`/workshop/projects/[projectId]/estimates/[nodeId]`:

- project members can open if project role permits read;
- sheet-only users can open only specific accessible estimate sheets.

`/workshop/projects/[projectId]/charts`:

- project members can open aggregated charts;
- sheet-only users do not get aggregated project charts in v1 because charts compare project-wide estimate distributions.

## Error Copy Policy

Public terminal states use one safe message for invalid, unknown, revoked, already-used, and wrong-user replay:

```txt
This invite link is invalid or no longer available. Ask the sender to invite this email again.
```

Expired tokens may use this specific copy after a valid token hash match:

```txt
Invite expired. Ask the sender to send a new invite for this email.
```

Precise reason codes for all other terminal states belong in server logs and audit events.
