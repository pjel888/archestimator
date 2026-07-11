# Scope, Non-Goals, and Terminology

## In Scope

- Workspace, project, and estimate-sheet membership semantics as they affect project teamwork.
- Platform, workspace, project, and direct-sheet roles and their effective capabilities.
- Inherited versus restricted estimate access.
- Project and estimate member add, invite, role change, removal, revoke, resend, copy, expiry, and acceptance flows.
- Sheet-only project shell and metadata visibility.
- Team roster identity, email visibility, pending invites, and presence.
- Estimate cursor broadcast and rendering for concurrent editors.
- Durable Object authorization, capability enforcement, schema validation, rate limits, reconnect, and expiry refresh.
- D1 constraints, indexes, transaction boundaries, repository filtering, audit facts, and migration proof.
- Team access UI, accessibility, responsive behavior, loading/empty/error states, and confirmation copy.
- Activity and Publisher cross-pack ownership and receipts.
- Local, hosted-D1, hosted-DO, and release evidence boundaries.
- Cloudflare Platforms and Workers for Platforms feasibility and cost posture.

## Out of Scope

- Public recipient authentication, public comments, public decisions, and `/share/[token]` authority.
- CRDT/OT, shared text cursors, row conflict merging, offline mutation queues, or live co-edit application of estimate row events.
- Project-wide cursor rollout in the first supported slice.
- Cursor trails, stored cursor history, heatmaps, follow mode, or surveillance analytics.
- Per-user deny entries that override broader membership.
- Generic ownership transfer, billing ownership, workspace deletion, or organization-wide provisioning.
- Customer-authored code, tenant-specific Workers, customer custom domains, marketplace extensions, or customer billing metering.
- Paid Cloudflare feature activation or production deployment.
- Historical Supabase schema changes or extensions.

## Canonical Terms

| Term | Meaning |
| --- | --- |
| actor | Authenticated platform profile attempting an action |
| resource | Workspace, project, estimate sheet, invitation, membership, or realtime topic |
| action | A named capability such as read, edit, invite, manage role, remove, or broadcast cursor |
| direct role | Membership stored on the resource itself |
| inherited role | Workspace/project authority applied to a descendant when inheritance is enabled |
| effective role | Highest applicable role after restriction and scope rules are applied |
| capability | Boolean authorization result for one actor-resource-action tuple |
| manager | Owner or admin at the relevant resource scope; never inferred from UI alone |
| restricted sheet | Estimate with project/workspace inheritance disabled; direct sheet membership is required |
| sheet-only actor | Actor with direct access to an estimate but no whole-project membership |
| add member | Explicit direct grant to a known eligible profile; not an email invitation |
| invitation | Pending bearer-linked offer that requires explicit recipient acceptance |
| public recipient | Publisher token/session actor; never an internal Teamwork member |
| presence | Ephemeral coarse online/active-surface state |
| cursor | Ephemeral pointer position for an editable estimate surface |
| durable fact | Redacted immutable lifecycle event consumed by Activity |
| proof receipt | Content-addressed artifact proving a bounded contract or hosted behavior |

## Authority Boundaries

- Teamwork owns internal membership, invitation, presence, and cursor semantics.
- Activity owns durable event vocabulary, readers, history composition, retention, and tombstones; Teamwork owns event production inside its mutations.
- Publisher owns public recipient authority and public collaboration. It may render or link to internal Team access but does not define membership policy.
- Cloudflare D1 is the active relational source. Supabase artifacts are migration archaeology only.
- The Durable Object is the enforcement point for realtime topic capability, not the browser.

## Evidence Vocabulary

- **Static proof:** source, type, lint, contract, or schema inspection.
- **Local runtime proof:** focused Vitest/DOM/SQLite/D1-compatible tests.
- **Browser proof:** interaction, responsive, accessibility, or two-page client behavior that cannot be proven statically.
- **Hosted D1 proof:** deployed Worker plus bound D1 invitation lifecycle.
- **Hosted DO proof:** deployed two-client WebSocket behavior through the bound Durable Object.
- **Release proof:** production observability, support, ownership, and cutover evidence; never inferred from local or hosted feature proof alone.

## Planning Scope

This run is `PLAN_ONLY`. It may add or update only this new plan folder. Application, tests, migrations, configuration, existing packs, provider resources, branches, and worktrees are outside its write scope.
