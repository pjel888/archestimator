# 02 - UX And UI Journey Map

Controlling note: `11-ux-ui-screen-copy-spec.md` is the screen/copy authority. This file is first-pass journey context.

## Guiding UX Principle

Invitation entry is an acquisition path. It must answer one question quickly:

```txt
Who invited me, what am I joining, and what is the next safe action?
```

It must not ask for country, company size, role details, default currency, profile setup, or workspace setup before the invitee can use the app.

## User A Invites User B By Email

1. User A opens Teamspaces on a project.
2. User A enters User B's email, chooses a role, and sends the invite.
3. The app creates a `collaboration_invitations` row with an app-owned token hash, role, scope, target project, invited email, inviter, expiration, and delivery method.
4. The email link points to `/invite/[token]`.
5. User B opens `/invite/[token]`.
6. User B sees a compact invite preview:
   - inviter display name or email;
   - project name and project code when the token is valid;
   - role offered, such as Viewer or Editor;
   - expiration date;
   - primary action: `Continue to Archestimator`;
   - secondary action: `Use a different account` only when already signed in as the wrong account.
7. If User B is signed out, continuing sets a pending-invite bridge and routes to `/login`.
8. After sign-up or log-in, `/auth/callback` still redirects to `/workshop`.
9. `/workshop` resolves the pending invitation:
   - if the auth email matches the invite, apply or confirm the membership;
   - show a compact success banner with `Open project`;
   - do not block the rest of the workshop.
10. User B opens the project and can work within their assigned role.

## User A Invites User B By Copy URL

V1 copy URL is **email-bound**, not generic.

1. User A creates or refreshes an invite for User B's email in Teamspaces.
2. Teamspaces exposes `Copy invite link` for that pending invite.
3. User A sends the link through any channel.
4. User B follows the same `/invite/[token]` journey as the email path.

Reasoning: this satisfies "copy URL" while avoiding an anyone-with-link auto-join permission model before trust, audit, and revocation semantics are mature.

The existing direct project URL remains useful after access is granted. Teamspaces must distinguish:

- `Copy project link`: private deep link for users who already have access.
- `Copy invite link`: tokenized invite entry for the selected pending invitee.

## Already Signed-In Invitee

### Correct Account

1. User B is already signed in and opens `/invite/[token]`.
2. The route validates the token and current user email.
3. The page shows the invite preview and an `Accept project invite` action.
4. Accepting creates or confirms `project_members` or `estimate_sheet_members`, marks the invitation accepted, clears any pending invite cookie, and redirects or links to the project.

### Already A Member

1. User B opens the token after already having access.
2. The route shows `You already have access`.
3. Primary action: `Open project`.
4. No duplicate membership write is attempted.

### Wrong Account

1. User B is signed in as `wrong@example.com` and opens an invite for `invitee@example.com`.
2. The route does not reveal unnecessary project details beyond what a valid token preview already allowed.
3. The page says the invite is for a different email.
4. Primary action: `Sign out and continue`.
5. Secondary action: `Back to workshop`.

## Not Signed-Up Invitee First Screen

The first screen is a functional invite card, not a marketing page:

- left/top: Archestimator wordmark and `Project invitation`;
- main line: `Philip invited you to Lewis Residence`;
- secondary line: `Join as Viewer` or `Join as Editor`;
- details row: project code, inviter, expiration;
- primary button: `Continue to Archestimator`;
- existing-account link: `Already have an account? Log in`;
- no profile fields;
- no country field;
- no workspace creation language.

## Expired, Revoked, Invalid, And Accepted States

- Invalid token: `Invite link is invalid or no longer available`. Do not confirm project or email.
- Expired token: after a valid token hash match, show `Invite expired`.
- Revoked token: use the generic unavailable copy.
- Accepted token by same user: show `Project already added`.
- Accepted token by another user: show `Invite link was already used`.

## Workshop Homebase After Auth

The invite handoff on `/workshop` is small and non-blocking:

- success state: `Project added: Lewis Residence` with `Open project`;
- signed-out post-auth success state: `Project added` or `Sheet shared` after auto-accept;
- signed-in route state: `Accept project invite` or `Accept sheet invite` before acceptance;
- mismatch/error state: `Could not accept invite` with one clear reason and `Review invite`.

The rest of `/workshop` remains usable in all states.

## `/workshop/projects` Shared Project Signal

Shared projects are visible alongside owned/workspace projects, but visually differentiated:

- access badge: `Shared project` or `Sheet-only`;
- role badge: `Viewer`, `Editor`, or `Admin`;
- subtle left accent or inset border only for shared projects;
- owner/workspace context line, for example `Shared by Philip's Archestimator Workspace`;
- segmented filter when shared projects exist: `All`, `Owned`, `Shared`;
- no bright warning styling for normal membership.

The visual goal is recognition, not stigma. The user understands "this is shared with me" without the card feeling disabled.
