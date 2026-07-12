# 00 — Executive Decision

## Executive verdict

The existing shared-link foundation is materially stronger than the current page makes visible. It already supports sanitized estimate snapshots, estimate and row targets, recipient sessions, comments, decisions, signer names, password protection, activity events, owner-side management, and issue-like snapshot versions.

The problem is now structural, not cosmetic. The current object combines four different concerns:

- a share URL;
- the current published content;
- the recipient group;
- the proposal issue being reviewed.

That combination cannot cleanly support the owner's intended product. A full client portal needs continuity across revisions, multiple audiences, independent permissions, configurable sections, richer conversations, and client-safe historical records.

## Nine binding product decisions

### DEC-AUTO-001 — Rename the user-facing surface to Client Portals

Keep `/workshop/publisher` as the route for compatibility, but label the product surface **Client Portals**. “Publisher” can remain an engineering/domain term. Owners understand “Create client portal,” “Publish issue,” and “Manage recipients” more readily than “publication.”

### DEC-AUTO-002 — A portal is stable; an issued version is immutable

A portal has one stable URL and recipient roster. Publishing changed estimates creates a new immutable issue beneath the same portal. It does not silently create a new relationship, new recipient group, or unrelated activity history.

Security changes such as revocation can take effect immediately. Financial and scope content changes require a new issue.

### DEC-AUTO-003 — Support multiple portals per project

The current one-live-publication-per-project constraint is too restrictive. The same project may need:

- a client proposal portal;
- an executive financial review;
- a consultant coordination package;
- a procurement comparison;
- an internal-owner review.

Each portal can expose different content, recipients, branding, and decision rules.

### DEC-AUTO-004 — Use a typed section registry, not an arbitrary page builder

Owners can add, remove, reorder, rename, and configure approved section types. The first registry should include:

- Overview;
- Estimates;
- Financial Summary;
- Cost Breakdown;
- Estimate Comparison;
- Assumptions & Exclusions;
- Discussion;
- Activity;
- Decision.

This provides extensibility without arbitrary code, arbitrary formulas, arbitrary CSS, or an untestable widget marketplace.

### DEC-AUTO-005 — Make the portal full-width and context-adaptive

Remove the global centered max-width as the page's controlling layout. The portal should use the whole browser canvas:

- left navigation/outline;
- flexible main content;
- contextual discussion/action rail on large screens.

Only prose blocks receive a local reading-width cap. Tables, trees, financial comparisons, and charts use the available width.

### DEC-AUTO-006 — Build threaded discussion with a chat-like interface

Do not build a free-floating Slack clone. Use durable threads attached to a general portal context or a specific section, chart, estimate, tab, area, row, issue change, or activity event.

Messages can look conversational, but threads remain structured, resolvable, attributable, searchable, version-aware, and deep-linkable.

### DEC-AUTO-007 — Separate discussion targets from decision scope

Selecting a row or chart should target a discussion. It should not silently redefine what a formal approval means.

For the first release, the formal decision applies to the entire immutable issue. The decision bar must say this explicitly. Per-estimate and package-level decisions can be added later through an explicit owner-configured workflow.

### DEC-AUTO-008 — Use role templates with capability and relationship checks

External role templates:

- Viewer;
- Commenter;
- Reviewer;
- Approver;
- Client Admin — later/off by default.

The server evaluates capabilities against the recipient, portal, issue, section, target, and current state. UI role labels alone never authorize access.

### DEC-AUTO-009 — White-label the experience, but defer custom domains

MVP white-labeling includes:

- owner logo;
- client logo;
- owner/client display names;
- co-branding mode;
- approved accent and neutral colors;
- branded email, print, and portal header;
- optional Archestimator attribution policy.

Arbitrary CSS, uploaded JavaScript, and custom domains are not MVP. Custom domains are a later platform feature with DNS validation, certificate lifecycle, domain takeover prevention, support operations, and pricing implications.

## Recommended first-release scope

### Must ship together

1. Stable portal and immutable issue model.
2. Migration/compatibility path for current publications.
3. Full-width adaptive portal shell.
4. Owner-configurable typed sections.
5. Complete access to every published row, with explicit field visibility.
6. At least three client-safe financial views:
   - summary KPIs;
   - cost breakdown;
   - estimate comparison.
7. Owner/client branding profile.
8. Recipient role templates and per-section visibility.
9. Contextual threads, replies, owner response, resolve/reopen, unread state.
10. Issue-wide approve / request changes / decline workflow.
11. Client-safe activity tab as an owner-controlled option.
12. Publisher control center and role preview.
13. Recipient funnel, unresolved-thread queue, and next-action state.
14. Snapshot and totals parity across editor, portal, preview, and XLSX.

### Deliberately later

- live typing indicators;
- private direct messages between individual external recipients;
- arbitrary dashboards and formulas;
- client-created portal sections;
- custom domains;
- advanced ordered/quorum approvals;
- legal e-signature claims;
- payments;
- durable paid client archive;
- AI summarization.

## Non-negotiable invariants

- No private workspace read is performed merely because a public portal is open.
- Every client-visible value comes from the issued snapshot or an explicitly permitted live collaboration record.
- All published rows are reachable; no silent row cap can hide scope.
- Hidden columns stay hidden even if the client manipulates URLs or API payloads.
- A decision names the exact issue, amount, currency, and scope being decided.
- New issues never mutate the content that an earlier decision referenced.
- Internal notes never share a write path, query, or visual control with client-visible replies.
- Revoking one recipient does not erase their historic activity.
- Rotating a portal URL does not erase portal identity, recipients, threads, or issues.
- Deleting a live project cannot silently destroy any record the retention policy requires.
