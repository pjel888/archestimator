# Teamspaces Coexistence And Naming

**Date:** 2026-05-27
**Status:** Implemented V1 naming authority. Keep this file aligned with the live manager UI and tests.

## Product Distinction

Teamspaces answers:

> Who inside our workspace can collaborate on this project or estimate?

Publication answers:

> What external client-safe snapshot can someone open from a link?

These must stay separate in UI, data, routes, tests, copy, and permissions.

## Side-By-Side Header Model

```txt
[Public link] [Teamspaces]
```

Publication sits left. Teamspaces remains right.

Do not:

- move Teamspaces;
- replace Teamspaces;
- add publication as a Teamspaces tab;
- show external receivers as collaborators;
- create memberships from publication opens;
- expose project Presence or estimate Broadcast channel names to receivers.

## Locked Naming

Use:

- Header group: `Public link`
- Modal title: `Public client link`
- Modal description: `View-only project page`
- Primary action: `Generate public link`
- URL field: `Public link`
- Snapshot refresh action: `Update public page`
- Revoke action: `Turn off link`
- Token rotation action: `New link`
- Receiver noun in docs/code: `receiver`
- Schema/code noun: `publication`

Avoid:

- `Share` alone;
- `Invite`;
- `Public access`;
- `Client portal`;
- `Proposal approval`;
- `Review complete`;
- `Accepted`.

## Teamspaces Private Link Cleanup

Current Teamspaces UI has a naming collision:

- section label: `Share page`;
- textbox: `Project share link`;
- button: `Copy share link`;
- copied URL: `/workshop/projects/{projectId}`.

Implementation must rename this internal collaboration affordance before or during the first publication UI slice.

Recommended copy:

- Section label: `Private project link`
- Textbox label: `Private project link`
- Button aria-label: `Copy private project link`
- Helper: `Only signed-in collaborators with access can open this route.`
- Status: `Private link copied.`

Tests must prove the private Teamspaces URL still points to `/workshop/projects/[projectId]` and the publication URL points to `/share/[token]`.

## Permission Split

| Capability | Owner/admin | Editor | Viewer | External receiver |
| --- | --- | --- | --- | --- |
| View internal Teamspaces members | yes | role-dependent existing behavior | role-dependent existing behavior | no |
| Invite collaborators | yes | existing Teamspaces rules only | no | no |
| View publication status | yes | read-only if exposed | no by default | no |
| Create publication | yes | no | no | no |
| Change password/expiry | yes | no | no | no |
| Turn off / new link / update public page | yes | no | no | no |
| View open summary | yes | no by default | no | no |
| Open published snapshot | only through receiver route | only through receiver route | only through receiver route | yes with valid token/password |

Publication actions can reuse role-rank helpers only if those helpers remain generic and do not merge publication into collaboration actions.

## Data Split

Teamspaces tables:

- `project_members`;
- `estimate_sheet_members`;
- `estimate_sheet_access_settings`;
- `collaboration_invitations`.

Publication tables:

- `project_publications`;
- `project_publication_events`.

Snapshots are stored in `project_publications.snapshot_json` for the implemented V1 instead of a separate snapshot table. Password/access attempts are recorded through metadata-only publication events and signed access cookies instead of a separate access-attempt table.

No receiver should be inserted into Teamspaces tables by opening or password-validating a publication link.

## UI Coexistence Test Cases

Required tests:

- Header renders `Public link` to the left of `Teamspaces`.
- Teamspaces remains rightmost.
- Opening `Public link` does not open Teamspaces settings.
- Opening Teamspaces does not show publication password/tracking controls.
- Teamspaces private link copy points to `/workshop/projects/[projectId]`.
- Publication link copy points to `/share/[token]`.
- Teamspaces modal language uses `Private project link`.
- Publication modal language uses `Public link` and `Public client link`.
- External receiver page never renders collaborator avatars, roles, invite forms, or private realtime labels.

## Coexistence Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| Users send protected `/workshop` link externally | Rename Teamspaces private link and add helper copy |
| Users think publication invites clients into workspace | Separate modal, route, schema, and copy |
| Users think Teamspaces members can edit public links | Permission matrix and test coverage |
| Receivers appear in collaborator avatars | Separate event tracking from membership |
| Publication implies issued proposal truth | Snapshot copy says `Published snapshot`, not issued/final |
| Open count implies review | Copy says opened, not reviewed/approved/accepted |
