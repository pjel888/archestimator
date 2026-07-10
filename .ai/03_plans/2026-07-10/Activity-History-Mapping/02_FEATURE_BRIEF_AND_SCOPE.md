# 02 - Feature Brief And Scope

## Product Context

Activity history is the audit-and-transparency backbone of Archestimator. It answers two questions for every project:

1. **"What changed in this estimate?"** — every row item edit, area/group creation, deletion, rename, reorder, tab lifecycle event, template insert, project-source insert, and sheet-level adjustment. Visible to the estimator and project collaborators inside the workshop.

2. **"What did the client do with the shared proposal?"** — every time a client opens a shared link, enters a password, posts a comment, approves/declines/requests revision, and how the publication itself was created, republished, rotated, or revoked. Visible to both the owner (in the workshop) and, in a privacy-narrowed form, to the client on the shared page.

The feature spans the entire estimate mutation surface and the entire shared-link/publication lifecycle. It is a launch-gate MVP feature: first users must trust that every meaningful change is recorded, displayable, and (for deletions) restorable.

## Users And Their Journeys

### Estimator / Architect (workshop)
- Edits row quantities, unit costs, materials, suppliers, categories, descriptions.
- Creates, renames, reorders, and deletes areas/groups (tree nodes).
- Creates, renames, reorders, duplicates, archives, and deletes tabs.
- Inserts blank rows, library components, templates, and project sources.
- **Wants to:** open the Activity History modal, filter by event type or date range, search, scope to a specific row/area/tab/sheet, see who changed what when, read a human-readable summary with diff indicators, and restore deleted rows or areas.

### Project Owner / Manager (workshop)
- Reviews the full project activity page at `/workshop/projects/[projectId]/activity`.
- Filters by source (estimate, comment, decision, share, system), action bucket (created, edited, deleted, shared, commented, decided, invited, viewed), actor, and client.
- **Wants to:** see a unified timeline of everything that happened across all estimates, all client interactions, and all collaboration changes in the project.

### Client / Recipient (shared link)
- Opens a share link (possibly password-protected), views the proposal snapshot.
- Posts comments (optionally targeted at a specific row or area).
- Approves, declines, or requests revision on the proposal.
- Views a privacy-narrowed activity feed (no internal comments, no raw actor emails, no internal metadata).
- **Wants to:** review the estimate, leave feedback, and make a decision.

### Collaborator (workshop, realtime)
- Sees live cursors and presence (ephemeral, NOT persistent activity history).
- Makes edits that are recorded as activity events.
- **Note:** Realtime cursor/presence is a distinct system from persistent activity history. Only durable collaboration events (invites, role changes, member removals) surface in the activity feed.

### AI / Automation (server-side)
- The AI package builder (`src/lib/ai/package-builder/apply.ts`) applies draft estimates and records summary events.
- The AI Copilot reads activity history into its context (`src/lib/ai/read-context.ts:967`).
- **Wants to:** record its actions as activity events with correct, filterable event types.

## Core Workflows Traced Through Activity History

### Estimate editing → activity recording → activity display

```
User edits a row quantity
  → patchRowItem (d1-action-client.ts:1892)
  → INSERT INTO estimate_sheet_events (event_type='row_updated', old_snapshot, new_snapshot, total_delta, ...)
  → User opens Activity History modal
  → fetchEstimateSheetVersionControl (actions.ts:2030)
  → SELECT FROM estimate_sheet_events WHERE estimate_id = ? ORDER BY created_at DESC
  → normalizeHistoryEvent → composeEstimateActivity → ActivityViewModel
  → AuditEventCard renders with title, actor, timestamp, diff, peso delta
```

### Area deletion → snapshot → restore from history

```
User deletes an area group
  → deleteEstimateNodes (d1-action-client.ts:1464)
  → INSERT INTO estimate_sheet_events (event_type='estimate_node_deleted', old_snapshot={nodes, rows}, ...)
  → User opens Activity History, finds the delete event
  → getDeletedHistoryRestoreAction shows "Restore Area" button
  → onRestoreDeletedNodes → restoreDeletedNodesFromHistory (EstimateSheetContent.tsx:1855)
  → restoreDeletedEstimateNodes (actions.ts:3703)
  → restore_deleted_estimate_nodes_with_history RPC
  → restoreDeletedEstimateNodes (d1-action-client.ts:1515)
  → Reads old_snapshot, BFS-walks children, collision-checks, batch-INSERTs nodes + rows
  → setEstimateTree(() => restoreResult.tree)
  → reloadVersionControl()
```

### Share link creation → client opens → client comments → client approves → owner sees activity

```
Owner creates publication
  → createProjectPublication (publication/actions.ts:780)
  → buildSnapshotForProject → replace_project_publication D1 procedure
  → Owner adds recipients (addSharedLinkRecipients)
  → Emails sent via Cloudflare Email

Client opens /share/[token]
  → SharePage (share/[token]/page.tsx:138)
  → Password gate (if set) → recipient session (if personalized link)
  → recordProjectPublicationEvent (open event)
  → ProjectPublicationView renders snapshot

Client posts comment
  → POST /api/share/[token]/comment
  → insertSharedLinkComment (public-repository.ts:942)
  → maybeTriggerSharedLinkActivityDigest → owner digest email

Client approves
  → POST /api/share/[token]/decision
  → submitSharedLinkDecision (public-repository.ts:1025)
  → shared_link_responses row (unique per recipient+publication)

Owner views activity
  → Project activity page / Publisher drawer activity tab
  → readProjectActivityFeed merges estimate + comment + decision + share + publication sources
  → SharedLinkActivityFeed or ProjectActivityClient renders timeline
```

## Component Type Scope

Activity history must correctly record events for both component types:
- **Project-level components** — row-level rows with fan-out to matching instances. Activity must show the propagation delta.
- **Library-linked components** — rows linked to cost-library items. Activity must show replacement (`row_replaced`), unlinking (`row_unlinked`), and promotion (`row_promoted_to_library`) events.

## Success Criteria

The activity history feature is MVP-ready only when ALL are true:

### Recording completeness
- Every estimate mutation (row add/update/replace/unlink/delete/move, node create/rename/reorder/delete/restore, tab create/rename/reorder/duplicate/archive/delete, template insert, project-source insert, sheet adjustment, details update) inserts a correctly-typed event into `estimate_sheet_events`.
- Every client interaction (publication open, comment, decision, password attempt) records to the correct table.
- AI package-builder events use the same event-type vocabulary as manual mutations.

### Display completeness
- Every writable event type renders with a human-readable title and summary (not the generic fallback).
- Every writable event type is filterable in the Activity History modal.
- The project activity page shows all six source types in the unified timeline.
- The shared-link activity feed shows only client-safe information (no internal comments, no raw actor emails).

### Restore correctness
- Single row delete is restorable from history.
- Bulk row delete is restorable from history.
- Single node delete is restorable from history.
- Bulk node delete is restorable from history.
- Restore collision guards prevent duplicate restoration.
- Read-only users cannot see restore buttons.

### Shared-link interaction
- Clients can view, comment, and decide.
- Comments are rate-limited, sanitized, and snapshot-locked.
- Decisions are unique per recipient, with 409 on duplicate.
- Owner sees client activity in the Publisher drawer and project activity page.
- Owner receives digest emails on new client activity (rate-limited).

### Idempotency and data integrity
- History writes are replay-safe via `correlation_id` unique index.
- All write paths use consistent INSERT column shapes (19 columns).
- Cross-workspace isolation is enforced (events cannot leak between workspaces).

## Scope Boundaries

**In scope:**
- All `estimate_sheet_events` write and read paths.
- All activity UI surfaces (estimate-sheet modal, project page, shared-link feed, dashboard panel).
- All shared-link/client-collaboration interactions that produce activity.
- Event-type taxonomy alignment.
- Test coverage gaps.
- Idempotency and INSERT-shape consistency.

**Out of scope:**
- Visual redesign of activity surfaces.
- Named-version snapshots, compare, or version-restore (prohibited without a new approved slice).
- Undo/redo stack (explicit non-goal per V1 expansion roadmap).
- Realtime cursor/presence (distinct ephemeral system, already implemented separately).
- Proposal XLSX export architecture.
- Component library broad search.
- Marketing/public pages.
- Historical Supabase migrations.
- Hosted provider mutations during planning.
- Branch or worktree creation.
