# 11 - UX/UI Screen And Copy Spec

## Design Principle

Invitation entry is a product utility screen, not a landing page. It must be calm, compact, and immediate. It answers:

```txt
Who invited me, what am I joining, and what is my next safe action?
```

It must not sell the product, ask profile questions, or create a workspace setup decision.

## Shared UI Rules

- Use the existing Archestimator protected/product visual language.
- Use a compact centered invite panel or product shell section, not a hero page.
- Do not nest cards inside cards.
- Text sizes follow workshop density: compact headings, 8-12px meta and badges where appropriate.
- Use text role badges, not color-only indicators.
- Keep button labels short and action-oriented.
- Do not show country, company, team size, phone, currency, or setup questions.
- Do not present `/workshop/settings` as required.

## Screen: Signed-Out Valid Invite

Route:

```txt
/invite/[token]
```

Header:

```txt
Project invitation
```

Primary line:

```txt
Philip invited you to Lewis Residence
```

Role line:

```txt
Join as Viewer
```

For estimate-scope invite:

```txt
Philip shared Estimate A
```

Details:

- `Project: LR-001`
- `Invited by: Philip`
- `Access: Sheet-only Viewer` for estimate-scope invites;
- `Expires: Jun 10, 2026`

Primary CTA:

```txt
Continue to Archestimator
```

Secondary text link:

```txt
Already have an account? Log in
```

Behavior:

- primary action sets pending invite bridge and routes to `/login`;
- secondary action also routes to `/login` with safe invite context;
- for signed-out users, clicking the primary action is the acceptance consent event;
- after matching auth, `/workshop` auto-accepts and shows a non-blocking banner;
- no private project details render unless token is valid.

## Screen: Signed-In Correct Account

Header:

```txt
Project invitation
```

Primary line:

```txt
Philip invited you to Lewis Residence
```

Primary CTA:

```txt
Accept project invite
```

For estimate-scope invite:

```txt
Accept estimate invite
```

Secondary CTA:

```txt
Back to workshop
```

Success after action:

```txt
Project added
```

Primary success CTA:

```txt
Open project
```

For sheet-only:

```txt
Sheet shared
```

Primary sheet success CTA:

```txt
Open sheet
```

## Screen: Signed-In Wrong Account

Header:

```txt
Different account needed
```

Body:

```txt
This invite was sent to invitee@example.com. You are signed in as wrong@example.com.
```

Primary CTA:

```txt
Sign out and continue
```

Secondary CTA:

```txt
Back to workshop
```

Rules:

- show this only after a valid token hash match;
- no membership write;
- do not expose details for malformed or unknown tokens.

## Screen: Already Has Access

Header:

```txt
You already have access
```

Body:

```txt
Lewis Residence is already available in your workshop.
```

Primary CTA:

```txt
Open project
```

For sheet-only:

```txt
Open sheet
```

Secondary CTA:

```txt
Back to projects
```

Direct-granted existing user behavior:

- if this invite already granted access through manager direct grant, opening the matching token confirms recipient acceptance in the background;
- visible copy can remain `You already have access`;
- audit event is `collaboration_invite_accepted`, not only `collaboration_invite_already_member`.

## Screen: Invalid Or Unavailable Invite

Header:

```txt
Invite link unavailable
```

Body:

```txt
This invite link is invalid or no longer available. Ask the sender to invite this email again.
```

Primary CTA:

```txt
Go to workshop
```

Secondary CTA:

```txt
Log in with another account
```

Rules:

- use the same visible message for malformed and unknown tokens;
- revoked, already-used, and wrong-user replay reuse this same message for anti-enumeration;
- expired uses `Invite expired` only after a valid token hash match;
- precise reason stays in audit metadata.

Expired copy:

```txt
Invite expired
```

Expired body:

```txt
Ask the sender to send a new invite for this email.
```

## Screen: `/workshop` Invite Banner

Placement:

- first bento row or top utility row, above normal workshop tiles;
- compact height;
- dismissible only after terminal state is handled or user chooses to ignore.

Accepted copy:

```txt
Project added: Lewis Residence
```

CTA:

```txt
Open project
```

No confirmation banner:

This state is not part of v1 for signed-out users. `/workshop` auto-accepts after matching auth because the user already clicked `Continue to Archestimator`.

Failure copy:

```txt
Could not accept the invite. Review the invite link or ask the sender to send it again.
```

CTA:

```txt
Review invite
```

Rules:

- banner is non-blocking;
- workshop tiles remain usable;
- no modal or required setup screen appears.

## Screen: `/workshop/projects` Shared Project Cards

Shared project-member card:

- same card layout and media treatment as owned projects;
- subtle left accent or inset border;
- text badge: `Shared project`;
- role badge: `Viewer`, `Editor`, or `Admin`;
- meta line: `Shared by Philip's workspace`;
- primary action remains `Open`.

Sheet-only card:

- same card shell;
- text badge: `Sheet-only`;
- meta line: `1 shared sheet` or `N shared sheets`;
- primary action `Open sheet` when exactly one sheet is shared;
- primary action `Open project` when multiple sheets are shared;
- one shared sheet opens `/workshop/projects/[projectId]/estimates/[nodeId]`;
- multiple shared sheets open `/workshop/projects/[projectId]` limited dashboard.

Owned/workspace card:

- existing visual treatment remains default;
- no extra badge is required unless a future owner/admin filter needs it.

Density placement:

| Mode | Shared project placement | Sheet-only placement |
| --- | --- | --- |
| Large card | badge near project meta; role chip on metadata row; subtle left accent | `Sheet-only` badge near project meta; `Shared sheets: N` line |
| Medium card | badge and role chip in bottom metadata stack | badge and sheet count in bottom metadata stack |
| Small card | compact badge after project name; role in accessible label | compact `Sheet-only` after project name; sheet count in accessible label |
| List row | dedicated access column or inline badge after title | dedicated access column or inline badge after title |

Filters:

- when at least one shared or sheet-only project exists, use compact segmented control:

```txt
All | Owned | Shared
```

Default selection is `All`.

Accessibility:

- card accessible label includes project name and access kind;
- badge text is present in DOM;
- accent border is supplementary.

## Sheet-Only Limited Dashboard

When a sheet-only user opens `/workshop/projects/[projectId]`, show:

- project title;
- compact `Sheet-only access` badge;
- list of accessible estimate sheets;
- no manager-only Teamspaces controls;
- no project settings mutation controls;
- no project-wide charts CTA.

Copy:

```txt
You have access to selected estimate sheets in this project.
```

This copy is informational, not a gate.

## Teamspaces Invite Controls

Pending invite row actions:

- `Copy invite link`;
- `Resend`;
- `Revoke`.

Project link action:

- `Copy project link`.

Rules:

- `Copy project link` copies `/workshop/projects/[projectId]` and is useful only for users who already have access.
- `Copy invite link` copies `/invite/[token]` for the selected pending email.
- The UI must not label the invite link as "public" or "anyone can join".

## Email And Copy-Link UX

Email subject:

```txt
Philip invited you to Lewis Residence on Archestimator
```

Sheet-only subject:

```txt
Philip shared Estimate A on Archestimator
```

Email CTA:

```txt
Open invite
```

Email body must include:

- inviter label;
- project name;
- estimate name for sheet-only invites;
- role label;
- expiration date;
- one CTA pointing to `/invite/[token]`.

Copy-link success toast:

```txt
Invite link copied
```

Copy-link disabled state:

```txt
Create an invite before copying a link
```

Resend behavior:

- `Resend` sends the existing active token link when the token is still valid;
- `Refresh link` explicitly revokes the prior active token and creates a new one;
- `Copy invite link` does not rotate tokens.
