# 06 - UI Component Surface Map

This document maps every UI surface that displays or interacts with activity history.

## Surface 1: Estimate-Sheet Activity History Modal (COMPLETE & RICH)

The primary in-editor activity inspector.

### Files
- `src/components/workshop/estimate-sheet/activity-history.tsx` (1773 lines) — UI
- `src/components/workshop/estimate-sheet/activity-history-model.ts` — types + filter helpers
- `src/components/workshop/estimate-sheet/activity-scope-tree.ts` — scope tree builder
- `src/components/workshop/estimate-sheet/use-estimate-history-panel.ts` — orchestrator hook (reads only)

### Data Source
**NOT TanStack Query.** Calls `fetchEstimateSheetVersionControl` server action directly (`use-estimate-history-panel.ts:246,317`). Results held in component `useState`. Staleness guarded by `historyRequestGenerationRef` (lines 105, 243, 313).

### Components

| Component | Line | Purpose |
|---|---|---|
| `ActivityHistoryModal` | 1613 | Full inspector — native `<dialog>`, scope tree rail, search + filter header, timeline |
| `RowDetailsModal` | 1202 | Per-row detail dialog with Details/Activity tab strip |
| `EventList` | 921 | Timeline rendering with day grouping (854), correlation grouping (823) |
| `AuditEventCard` | 694 | Single event card — actor, timestamp, title, peso delta, audit facts |
| `AuditEventGroup` | 879 | Group of events by correlation ID |
| `AuditComponentSnapshotCard` | 630 | Component snapshot evidence images |

### Features
- **Scope tree:** sheet → area group → area → row navigation (`buildActivityScopeTreeItems`, `activity-scope-tree.ts:13`). "Direct only vs include descendants" preference in Zustand `useEstimateUiStore.activityScopeDirectOnly`.
- **Filters:** event type dropdown (`ACTIVITY_FILTER_EVENT_TYPES`, 40-60), search input, date range. `ActivityFilterState = {eventType, search, dateFrom, dateTo}` (`activity-history-model.ts:22`).
- **Restore:** `getDeletedHistoryRestoreAction` (526) builds restore buttons on delete events. Restorable types: `RESTORABLE_ROW_DELETE_EVENT_TYPES` (220), `RESTORABLE_NODE_DELETE_EVENT_TYPES` (221). **Both sets use wrong names — see naming audit.**
- **Load-more:** cursor pagination via `nextCursor`/`onLoadMore`.
- **Entry point:** header action `openActivity` (`EstimateSheetContent.tsx:2202-2211`) via `use-estimate-header-actions-store`.

### RowDetailsModal Activity Tab
- Renders `EventList` fed by its own `rowActivity` reducer (1140-1200).
- Independently calls `fetchEstimateSheetVersionControl` with `scope: "row"` (1239).
- Opened from `row-table.tsx:964` via `onOpenRowDetails`.

## Surface 2: Project Activity Page (COMPLETE, separate stack)

### Route
- `src/app/workshop/projects/[projectId]/activity/page.tsx` — server component, initial load via `readProjectActivityFeed` (line 104).
- `src/app/workshop/projects/[projectId]/activity/loading.tsx` — skeleton.

### Client
- `src/components/workshop/project-activity/ProjectActivityClient.tsx` (614 lines).

### Data Source
Server-side initial load + client-side cursor pagination via `fetch('/api/projects/.../activity')` (line 420). **No TanStack Query** — pure `useState` append state (343-354). URL state sync via `router.replace` (376-403).

### Features
- **Ledger table:** `ActivityLedgerColumnHeader` + `ActivityRow` (232-317), day-grouped (`groupActivities`, 120).
- **Columns:** Time & Source, Actor, Event, Details (2 fact slots), Status (visibility + badge).
- **Sources:** estimate, comment, decision, share, system (`sourceLabel`, 94).
- **Action buckets:** created, edited, deleted, reordered, shared, commented, decided, invited, viewed, versioned, system (`deriveActionBucket`, `action-classes.ts:122`).
- **Filters:** scope (whole project / project only / per-estimate), action, actor, client.
- **Access:** editor-only (`ProjectActivityClient.tsx:444`).

## Surface 3: Shared-Link Activity Feed (COMPLETE, TanStack Query)

### Files
- `src/components/share/SharedLinkActivityFeed.tsx` (362 lines) — shared feed primitive.
- `src/components/workshop/publisher/PublisherActivityFeed.tsx` — owner wrapper.
- Used in `PublisherDrawer.tsx:515` (Publisher activity tab) and `ShareReviewWorkspace.tsx`.

### Data Source
**TanStack Query** key `["share-activity", publicationToken, isOwner, Boolean(loadActivity)]` (line 184). Three fetch paths (188-210): injected loader, owner via `loadSharedLinkActivity`, public via `GET /api/share/[token]/activity`. Window-focus + visibilitychange refetch (251-264).

### Features
- `ActivityItem[]` rendering with title/summary/body/badges/facts.
- Internal-visibility gating (owner sees internal, client doesn't — line 327).
- Manual cursor pagination reducer (121-180).
- "New activity" notice.

## Surface 4: Project Dashboard Activity Panel (PARTIAL / simplified)

### Files
- `src/components/workshop/ProjectDashboardClient.tsx:528` — `ProjectActivityFeedPanel`.
- Data: `src/lib/repositories/project-activity-repository.ts` (the SIMPLE repo, not the full feed repo).
- Fed server-side by `listProjectActivityPage` (page.tsx:67, cached).

### Features
- Collapsed day groups with one-line items (`summarizeProjectActivityItem`, 322).
- Read-only, no filters, no pagination (limit 16 at page layer), no restore, no drill-down.

**Note:** Uses a different repository than the full project activity page. Two parallel repos for "project activity" is tech debt.

## Surface 5: Comments & Decisions (COMPLETE, share-page-only)

### Comments
- `src/components/share/SharePageComments.tsx` (655 lines) — TanStack Query key `["share-comments", token]` (288), `staleTime: 30_000`, optimistic posting, sessionStorage offline queue (`QUEUE_KEY`, 238), review-target aware.
- API: `POST /api/share/[token]/comment` — CSRF, rate-limited (5/min, 20/hr), sanitization, snapshot lock.
- Repository: `insertSharedLinkComment` (`public-repository.ts:942-1013`).

### Decisions
- `src/components/share/SharePageDecision.tsx` + `SharePageDecisionConfirmDialog.tsx` — 3 buttons: Approve / Request changes / Decline. Locked badge after decision.
- API: `POST /api/share/[token]/decision` — CSRF, snapshot lock (409 duplicate), rate-limited.
- Repository: `submitSharedLinkDecision` (`public-repository.ts:1025-1091`).
- Unique index `(recipient_id, publication_id)` — one decision per recipient.

### Gaps
- No owner reply to client comments on public surface.
- No comment edit/delete.
- No decision retraction/reset by owner.
- `signature_intent_hash` never computed on submit.
- No real-time update (client must reload).

## Surface 6: Undo/Redo UI (TOAST-ACTION ONLY)

- No `useHistory`/`useUndo`/`useRedo` hook, no `undoStore`/`historyStore`, no redo stack.
- Undo exists only as:
  - Toast action buttons on destructive row/node operations (`use-estimate-row-handlers.ts:1301,1368`).
  - "Restore row(s)/Area(s)" buttons inside Activity History inspector.
- **No redo** anywhere.

## Surface 7: Admin Audit Table (STUB)

- `src/components/admin/AdminAuditTable.tsx` — hardcoded 3-row stub array. Empty-state says "Audit repository wiring is pending." (line 35).
- Route: `/admin/audit` (`src/app/admin/audit/page.tsx:13`).
- Repositories exist (`src/lib/admin/audit-repository.ts`, `src/lib/admin/audit.ts`) but not wired.

## Supporting Infrastructure

### Zustand Store
- `src/stores/estimate-ui-store.ts:11` — `activityScopeDirectOnly` (scope preference only).

### Header Actions Store
- `src/components/workshop/use-estimate-header-actions-store.ts` — carries `openActivity` across React tree.

### AI Context
- `src/lib/ai/read-context.ts:967` — `readAskCurrentEstimateActivityHistory` feeds activity into Copilot context.

### Collaboration (ephemeral, NOT persistent history)
- `useEstimateCursorCollaboration`, `use-project-presence.ts`, `use-estimate-cursor-broadcast.ts`, `use-estimate-row-update-broadcast.ts` — live cursors/presence.
- Durable collaboration events surface via `collaboration_audit_events` → activity feed.

### Unused Asset
- `src/components/ui/timeline.tsx` — generic `Timeline` component with Storybook story. NOT used by any activity surface.

## Client-State Strategy Summary

| Surface | State strategy | Data fetch |
|---|---|---|
| Estimate-sheet modal | Component `useState` | Server action (direct) |
| Row details activity | Component `useState` reducer | Server action (direct) |
| Project activity page | Component `useState` + URL state | Server initial + `fetch()` cursor |
| Shared-link activity | TanStack Query | API route |
| Comments | TanStack Query | API route |
| Decisions | Component state | API route |
| Dashboard panel | Server-rendered props | Cached server function |

**Observation:** No two surfaces share the same state/fetch strategy. Consolidation is a P2 improvement opportunity.
