# V1 Decision Record

**Date:** 2026-05-27
**Status:** V1 implementation authority and hardening record. Update this file first if Philip changes the V1 scope.

## Decision Summary

Archestimator V1 client publication ships as a project-level `Public link` workflow that creates an immutable, sanitized receiver snapshot at publish time. The receiver opens a `/share/[token]` route outside `/workshop`. The link is open by default, may be password-protected, may expire, can be turned off or replaced with a new public link by a project owner/admin, and records metadata-only open events.

## Locked Defaults

| Topic | Decision | Implementation effect |
| --- | --- | --- |
| Product label | Header `Public link`; field `Public link`; modal `Public client link`; code/schema noun `publication` | Avoids confusing Teamspaces with receiver links and avoids snapshot/publication jargon in manager UI |
| Route | `/share/[token]` | One receiver route family outside protected Workshop |
| Token model | Server-generated high-entropy raw token with keyed lookup hash plus encrypted owner-recopy envelope | Receiver lookup stays hash-based while owner/admin can copy the URL later without storing plaintext |
| Scope | Project publication with selected estimate sheets | V1 does not create separate estimate-only route family |
| Content mode | Immutable sanitized snapshot | Receiver does not silently see later internal edits |
| Update model | Explicit `Update public page` creates a new snapshot version for the same publication URL | Current/internal edits require owner action before receiver sees them |
| Permissions | Owner/admin can create, update, turn off, create a new link URL, and view event summary | Editors/viewers cannot publish in V1 |
| Password | Optional per-publication password, verified server-side | Browser-only password gates are forbidden |
| Expiry | Optional `expires_at`; checked on every receiver/API request | Expired links return generic unavailable |
| Downloads | Disabled in V1 | Current private XLSX export remains private |
| Tracking | Open count and latest-open timestamp only | No review/approval/acceptance claims |
| Event retention | 90 days raw event rows, aggregate count retained on publication summary | Must be disclosed and implemented before launch |
| Legal/privacy | Reviewed Privacy Notice and Terms required before public launch | Pending-review pages block release |
| SEO/cache | `noindex`, `X-Robots-Tag: noindex`, `Referrer-Policy`, and `Cache-Control: no-store` on receiver/API responses | Public URLs must not be indexed or cached while revocation is active |

## Explicit Non-Decisions For V1

- No client account system.
- No comments, approvals, signatures, negotiation, or acceptance workflow.
- No email-bound recipient links unless a later plan adds that scope.
- No PDF/XLSX downloads or public proposal export.
- No public project search indexing.
- No public access to Teamspaces, private Realtime channels, member emails, collaborator roles, or internal audit metadata.
- No automatic publication when an estimate changes.

## Owner-Gated Changes

These changes require this record to be updated before implementation continues:

- Switching from snapshot to live read-through.
- Allowing editors to publish.
- Adding downloads.
- Adding estimate-only links as a separate V1 path.
- Storing receiver emails or recipient-specific tracking.
- Changing the receiver route family.
- Launching before reviewed Privacy/Terms are in place.

## Stop Condition

If an implementation task conflicts with this record, stop and revise the plan pack before editing product code. Do not resolve conflicts ad hoc in code.
