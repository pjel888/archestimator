# Product Northstar And Happy Paths

**Date:** 2026-05-27
**Status:** Implemented V1 product contract. Public-link wording supersedes older publish/settings labels where they conflict.

## Product Northstar

Archestimator users can publish a client-safe project package, control access, and know whether the receiver opened it, without granting internal workspace membership or exposing the internal Workshop surface.

## Jobs To Be Done

Manager job:

> I need to send a client a clean project or estimate package without inviting them into our internal workspace.

Receiver job:

> I need to open the link, understand the project package, and review the numbers without learning the internal tool.

Control job:

> I need to revoke, protect, expire, rotate, or republish a link when the audience or commercial context changes.

Audit job:

> I need lightweight confidence that the link was opened, without pretending this is legal proof of review or acceptance.

## Actors And V1 Permissions

| Actor | Description | V1 capability |
| --- | --- | --- |
| Project owner/admin | Authenticated internal manager | Create, update, password-protect, expire, revoke, rotate, republish, preview, copy link, view open summary |
| Project editor | Authenticated collaborator with edit access | View publication status only if already visible in project header; cannot manage publication in V1 |
| Project viewer | Internal read-only collaborator | Cannot manage publication; publication status visibility is optional but no controls |
| External receiver | Unauthenticated or password-gated visitor with link | View only the published snapshot payload |
| Unknown visitor | Wrong/missing token or blocked request | See generic unavailable state only |
| Support/admin | Future platform role | Investigate metadata through a separate audited support path, not V1 manager UI |

## V1 Product Cut

Ship the smallest complete publication loop:

- one project-level publication record per project;
- selected estimate sheets included in the snapshot;
- optional password;
- optional expiry;
- owner/admin management only;
- immutable sanitized snapshot at publish time;
- explicit republish to refresh client-facing content;
- copyable `/share/[token]` link;
- metadata-only open count and latest-open timestamp;
- revoke and rotate controls;
- no downloads;
- no comments, approvals, signatures, client accounts, or negotiation workflow.

## Happy Path A: Publish A Project Package

1. Owner/admin opens `/workshop/projects/[projectId]`.
2. Header shows compact `Publish` group immediately left of `Teamspaces`.
3. Owner/admin opens `Public client link`.
4. Empty state says no client link exists.
5. Owner/admin selects estimate sheets to include.
6. Owner/admin optionally sets password and expiry.
7. Owner/admin clicks `Generate public link`.
8. Server creates sanitized snapshot payload and high-entropy token.
9. UI shows receiver URL, copy action, status, snapshot timestamp, and `Not opened yet`.
10. Owner/admin sends the link externally.
11. Receiver opens `/share/[token]`.
12. Receiver sees the published package outside Workshop.
13. Owner/admin returns later and sees latest-open timestamp and open count.

## Happy Path B: Update Public Page After Internal Edits

1. Owner/admin edits estimate/project data internally.
2. Public client link settings show the current publication snapshot timestamp.
3. UI indicates the receiver sees the last published snapshot, not silent live edits.
4. Owner/admin clicks `Update public page`.
5. Server creates a new snapshot version for the same publication.
6. Existing link resolves to the latest active snapshot version.
7. Event history records republish metadata.

## Happy Path C: Password-Protected Client Link

1. Owner/admin toggles password protection.
2. Owner/admin enters and confirms a password.
3. Server stores only a password hash and algorithm metadata.
4. Receiver opens the link and sees a password gate with no project data.
5. Correct password creates a short-lived receiver session cookie.
6. Receiver content loads.
7. Wrong password returns generic copy, increments attempt counters, and does not leak project existence.

## Happy Path D: Revoke Access

1. Owner/admin opens `Public client link`.
2. Owner/admin clicks `Turn off link`.
3. UI confirms that external links will stop working.
4. Server revokes the publication.
5. Receiver route immediately returns a generic unavailable page.
6. Open/download/password routes reject the token.
7. Event log records revocation metadata.

## Happy Path E: Create A New Public Link

1. Owner/admin suspects the link was forwarded.
2. Owner/admin opens `Public client link`.
3. Owner/admin clicks `New link`.
4. Server invalidates the old token hash and issues a new raw token once.
5. Old URL returns generic unavailable.
6. New URL works under the same publication settings and latest snapshot.

## Receiver Experience Principles

- Receiver UI is document-like and calm.
- No internal sidebar, project mini sidebar, library panel, Teamspaces, Ask Flip, Workshop breadcrumbs, or internal top chrome.
- No raw database ids, workspace ids, estimate node ids, member ids, role names, realtime channels, or private route ids in visible UI.
- Project name, project code, client name, location, totals, estimate rows, media, and notes appear only when included in the snapshot whitelist.
- Receiver copy says `Published` and `Opened`, not `reviewed`, `approved`, `accepted`, or `issued`.

## Open Tracking Principles

- Track "opened" as a best-effort product signal.
- Store metadata-only event facts.
- Hash IP and user-agent values.
- Store referrer origin only, no query string.
- Retain raw event rows for 90 days unless legal/privacy review changes that value.
- Show `Open tracking unavailable` when the event write or summary cannot be trusted.
- Do not claim "client reviewed" until explicit review/approval is implemented.

## Success Criteria

Product:

- Owner/admin can create and copy one client-safe link.
- Receiver can open the link without an Archestimator account.
- Owner/admin can see open count and latest-open timestamp.
- Owner/admin can revoke, rotate, expire, and republish.

Security:

- Public receiver access never creates membership.
- Anonymous access cannot query core app tables directly.
- Revoked, expired, missing, invalid, and wrong-password states do not reveal project existence.
- Password validation is server-side and rate-limited.

UX:

- `Publish` sits left of `Teamspaces`.
- Teamspaces remains internal collaboration.
- Receiver UI is visually separate from Workshop.
- Empty, loading, password, expired, revoked, invalid, opened, tracking-unavailable, and no-permission states are designed before implementation.
