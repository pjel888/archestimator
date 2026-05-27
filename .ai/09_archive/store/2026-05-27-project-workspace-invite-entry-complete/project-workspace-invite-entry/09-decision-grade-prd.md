# 09 - Decision-Grade PRD

## Product Problem

Project collaboration is now part of the protected workshop. A manager can invite collaborators, but a not-yet-signed-up invitee does not yet have a clear app-owned entry point. The current behavior can push an invitee through auth and then leave them in the app without a clear "you were invited to this project" handoff.

The invitation path must feel immediate and low-friction. A user who signs up or logs in from an invite must be able to use the app immediately from `/workshop`.

## Primary Job

User A invites User B to a project workspace. User B opens a link, understands what they were invited to, signs up or logs in if needed, lands on `/workshop`, and can open the shared project or sheet without completing optional account setup.

## Personas

User A:

- existing authenticated project owner or admin;
- manages collaborators from Teamspaces;
- sends either an email invite or a copied invite URL;
- needs pending, resend/copy, revoke, and role visibility.

User B:

- may not have an account;
- may already have an account but be signed out;
- may be signed in with the wrong account;
- may be invited to the whole project or only one estimate sheet;
- needs a clear first screen and no onboarding gate.

System:

- must protect project data and token integrity;
- must preserve the central auth redirect contract;
- must leave RLS as the final permission authority.

## Scope

V1 includes:

- public route `/invite/[token]`;
- valid-token invite preview before auth;
- signed-out handoff to `/login`;
- post-auth landing on `/workshop`;
- non-blocking invite resolution banner on `/workshop`;
- signed-in correct-account acceptance;
- signed-in wrong-account state;
- already-member and already-accepted states;
- expired, revoked, malformed, and unknown token states;
- email-bound copied invite links;
- separate `Copy project link` and `Copy invite link` actions in Teamspaces;
- shared project and sheet-only project visibility on `/workshop/projects`;
- token hashing, atomic acceptance, audit events, RLS and RPC hardening;
- red-first tests and browser QA for the full journey.

## Non-Goals

V1 excludes:

- organization-wide workspace invitations;
- generic anyone-with-link auto-join URLs;
- owner approval queues for generic join requests;
- required profile or company onboarding;
- changing successful auth destination away from `/workshop`;
- adding `/signup` as a canonical route;
- public project detail previews outside a valid token;
- replacing Teamspaces with a new collaboration surface;
- changing the default workspace bootstrap semantics.

## User Stories And Acceptance Criteria

### Email Invite To New User

Given User A is a project owner/admin, when they invite User B by email, then User B receives a link to `/invite/[token]`.

Acceptance:

- the first screen shows inviter, project, role, and expiration for valid tokens;
- the first screen does not show profile or country fields;
- continuing while signed out sends User B to `/login`;
- successful sign-up lands User B on `/workshop`;
- `/workshop` auto-accepts the invite after matching auth and shows `Project added` or `Sheet shared`;
- User B can open the project after acceptance.

### Copied Invite URL To New User

Given User A creates a pending email-bound invite, when they copy the invite URL, then the copied URL is a tokenized `/invite/[token]` link bound to the invited email.

Acceptance:

- the copied link cannot be accepted by a different signed-in email;
- opening the copied URL follows the same route and auth handoff as the email link;
- copying the readonly project URL remains a separate action for existing members.

### Signed-In Correct Account

Given User B is signed in with the invited email, when they open `/invite/[token]`, then they see the invite preview and can accept.

Acceptance:

- accepting creates or confirms the correct membership;
- role upgrades preserve the higher role;
- acceptance marks the invitation lifecycle;
- success offers `Open project`.

### Signed-In Wrong Account

Given User B is signed in with a different email, when they open a valid invite token, then they see an account mismatch state.

Acceptance:

- the page says the invite is for another email after token validation;
- the primary action is `Sign out and continue`;
- no membership is created;
- audit records a wrong-account attempt without raw token data.

### Already Has Independent Access

Given User B already had sufficient project or sheet access before this invite lifecycle, when they open the invite token, then the app does not create duplicate access.

Acceptance:

- the screen says `You already have access`;
- the primary action is `Open project` or `Open sheet`;
- audit records an already-member open attempt;
- the invitation is not counted as recipient-click acceptance unless the invite token belongs to a direct-granted pending invite for that same email.

### Existing User Direct Grant Confirmation

Given User A invited an email that already has a profile and the manager direct-granted access, when User B later opens the matching invite token, then the app confirms recipient acceptance without duplicating membership.

Acceptance:

- existing membership is preserved and not downgraded;
- the invite moves from `direct_granted_existing_user` to `accepted_by_recipient`;
- `accepted_at`, `invited_user_id`, and `accepted_via = 'invite_route'` are set;
- the screen can say `You already have access`;
- the primary action is `Open project` or `Open sheet`;
- audit records recipient confirmation, not a generic already-member attempt.

### Terminal Token States

Given the token is malformed, unknown, expired, revoked, or already used by another user, when the route opens, then the app shows a safe terminal state.

Acceptance:

- malformed and unknown tokens do not reveal project, email, or invitation existence;
- expired and revoked tokens cannot be accepted;
- already-used tokens cannot be replayed;
- copy directs the user to ask the sender to invite the email again.

### Shared Project Discovery

Given User B has project-member or sheet-only access, when they open `/workshop/projects`, then the shared project appears without workspace switching.

Acceptance:

- shared cards have a text badge and subtle visual signal;
- sheet-only cards identify limited access;
- search includes shared projects;
- empty state does not show when only shared projects exist;
- RLS, not UI state, remains the permission source.

## Product Metrics

Implementation success is measured by:

- invite link open to accepted membership conversion;
- auth success to `/workshop` with invite banner visible;
- number of wrong-account attempts resolved by sign-out path;
- invite acceptance failures by reason code;
- revoked/expired/reused token attempts;
- shared-project open rate from `/workshop/projects`.

Metrics must not include raw tokens or service-role details.
