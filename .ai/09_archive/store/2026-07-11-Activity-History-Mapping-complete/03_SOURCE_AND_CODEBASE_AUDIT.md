# 03 - Source And Codebase Audit

File:line-grounded inventory of the source artifacts that constitute activity
history.

## Scoped Baseline Fingerprint

Apply `PLAN-PACK-SCOPED-BASELINE-v1` from `Plan-Pack-Schema.md` to these ordered
literal repo-relative pathspecs:

1. `migrations`
2. `src/lib/activity`
3. `src/lib/estimates`
4. `src/lib/repositories/project-activity-repository.ts`
5. `src/lib/repositories/project-activity-feed-repository.ts`
6. `src/lib/publisher`
7. `src/lib/publication`
8. `src/lib/cloudflare/estimate-history-proof-router.ts`
9. `src/lib/reusable-sources`
10. `src/lib/ai/package-builder`
11. `src/lib/compliance`
12. `src/app/api/projects`
13. `src/app/api/share`
14. `src/app/workshop/projects`
15. `src/components/workshop/estimate-sheet`
16. `src/components/workshop/project-activity`
17. `src/components/workshop/publisher`
18. `src/components/share`
19. `src/stores/estimate-ui-store.ts`
20. `worker.ts`
21. `tests/vitest`

The fingerprint binds the current source/migration worktree, including matching
untracked files. It is provenance only; it does not promote any implementation,
browser, hosted, or authorization claim.

## Audit Method

The audit mapped four surfaces:
1. The data layer (migrations, repositories, server actions, API routes).
2. The UI/component layer (React components, hooks, panels, modals).
3. The shared-link/client-collaboration surface (routes, auth, comments, approvals).
4. The mutation surface (every `*_with_history` action, event types, INSERT sites).

Direct source reads verified the critical claims, especially the naming split.

## 1. D1 Migrations

### 1a. Core activity table: `estimate_sheet_events`
- **File:** `migrations/0025_reusable_source_insert_support.sql:8-51`
- **Purpose:** THE activity/audit log for all estimate mutations.
- **Columns:** `id`, `estimate_id`, `workspace_id`, `project_id` (FKs CASCADE), `estimate_node_id`, `estimate_tab_id`, `target_row_id` (nullable targeting), `event_type`, `event_source` (default `'server_action'`), `correlation_id` (idempotency key), `actor_user_id`, `changed_fields` (JSON array), `row_context` (JSON object), `old_snapshot` / `new_snapshot` (nullable per-row JSON), `payload` (JSON object), `metadata` (JSON object), `total_delta` (REAL), `created_at`.
- **Indexes (lines 41-51):**
  - `idx_estimate_sheet_events_correlation` — UNIQUE on `(estimate_id, correlation_id)` — idempotency enforcement.
  - `idx_estimate_sheet_events_project_created` — `(project_id, created_at DESC, id DESC)`.
  - `idx_estimate_sheet_events_workspace_project_created` — `(workspace_id, project_id, created_at DESC, id DESC)`.
  - `idx_estimate_sheet_events_estimate_created` — `(estimate_id, created_at DESC, id DESC)`.

### 1b. Cost-library history tables (separate from project activity)
- **File:** `migrations/0028_component_library_action_support.sql`
- `cost_library_item_price_history` (lines 92-107).
- `cost_library_item_state_history` (lines 110-124).
- These are cost-library audit trails, NOT project activity.

### 1c. Shared-link / publication tables
- **File:** `migrations/0014_publication_shared_links.sql`
- `project_publications` (lines 1-39) — includes `snapshot_json`, `snapshot_version`, `status`.
- `project_publication_events` (lines 41-67) — open/view analytics.
- `shared_link_recipients` (lines 69-93) — per-recipient tokens, `recipient_token_hash`.
- `shared_link_comments` (lines 95-112) — `is_internal`, `target_kind`, `snapshot_version_at_comment`.
- `shared_link_responses` (lines 122-146) — decisions: `accepted`/`declined`/`revision_requested`, `signature_intent_hash`.
- `shared_link_events` (lines 164-182) — `open`, `comment_add`, `accept_decision`, `decline_decision`, `password_attempt`.
- `publication_digest_log` (lines 186-197) — email delivery audit.
- Partial unique index: one published publication per project (lines 30-32).

### 1d. Collaboration audit table
- **File:** `migrations/0007_collaboration_invitations.sql:109-119`
- `collaboration_audit_events` — invite/role/member activity.

### 1e. Retention
- **File:** `migrations/0034_data_retention_events.sql`
- `estimate_sheet_events` is an enumerated retention class.
- Enforcement code: `src/lib/compliance/retention-core.ts:38,121-127`.
- Cron entrypoint: `worker.ts:182-208` invokes `runRetentionPassInD1`; privacy
  export/erasure consumers live in
  `src/lib/compliance/privacy-request-repository.ts:222-229`.

### 1f. Estimate data tables (source of truth, not event-sourced)
- `estimate_row_items`, `estimate_nodes`, `estimate_tabs`, `estimates` — created in `migrations/0015_publication_admin_sidecars.sql` and later migrations. These hold canonical state; events are an audit trail alongside them.

## 2. Repository Layer (Read Side)

### 2a. `src/lib/repositories/project-activity-repository.ts` (308 lines) — SIMPLE dashboard feed
- `listProjectActivityPage` (lines 242-308) — cached, reads `estimate_sheet_events` joined to `estimates`, excludes dormant named-version types (line 63), keyset paginates by `(created_at, id)`.
- `createEmptyProjectActivityPage` (82-87) — graceful table-missing fallback.
- `resolveProjectActivityActorLabels` (173-197) — joins `profiles`.
- `readActorEmailLabel` (153-167) — **hardcodes `"philipjonlewis@gmail.com" → "Philip Lewis"` (line 156)** — code smell.
- `isProjectActivitySchemaUnavailable` (71-76) — catches `no such table` and returns empty.

### 2b. `src/lib/repositories/project-activity-feed-repository.ts` (1296 lines) — FULL multi-source feed
- `readProjectActivityFeed` (lines 1091-1221) — fans out to 5 parallel source queries + publication rows, merges/sorts by `(created_at, id)`, supports counts, `partial`/`unavailableSources` flags, base64url multi-source cursor (line 266).
- `ProjectActivityFeedSourceName` (lines 28-34) — 6 sources: `estimate_sheet_events`, `project_publications`, `shared_link_comments`, `shared_link_responses`, `shared_link_events`, `collaboration_audit_events`.
- Per-source readers: `readEstimateRows` (598-634), `readSharedCommentRows` (636-665), `readSharedResponseRows` (667-696), `readSharedEventRows` (698-726), `readCollaborationRows` (728-767), `readProjectPublications` (514-527).
- Count functions: lines 879-1014, orchestrated by `readExactCounts` (1024-1089).
- `estimateBucketEventTypes` (159-165) — maps 5 filter buckets to concrete event types (non-prefixed names).
- Dropdown helpers: `listProjectEstimatesForDropdown` (1223), `listProjectMembersForDropdown` (1243), `listProjectRecipientsForDropdown` (1268).

### 2c. `src/lib/publisher/activity-repository.ts` — workspace-scoped publisher feed
- `PublisherActivitySource` — same 6 sources.
- `readPublisherWorkspaceActivity` (line 246) — mirrors project feed at workspace scope.

### 2d. D1-backed estimate-history read path — `src/lib/estimates/actions.ts`
- `fetchEstimateSheetVersionControl` (line 2029-2173) constructs `createEstimateActionsD1Client` and reads through the active D1 substrate. It is imported by `activity-history.tsx`; this is not a Supabase/PostgREST path.
- `normalizeHistoryEvent` (951-971) — sets `eventType: row.event_type` **verbatim, no rename**.
- Types: `EstimateSheetHistoryEvent` (430), `EstimateSheetHistoryCursor` (406).
- Dormant-version filtering: `isDormantNamedVersionEventType` (992), filtered at 997, 1008.

## 3. Write Layer

### 3a. Primary D1 writer — `src/lib/estimates/d1-action-client.ts`
- `ESTIMATE_EDIT_ACTIONS` allowlist (957-982) — 24 `*_with_history` RPC names.
- `callEstimateAction` dispatcher (2362-2407) — authorization gate at 2357-2360 (`canEditEstimateInD1`).
- `prepareHistoryEventInsert` (437-505) — idempotent: SELECTs by `(estimate_id, correlation_id)`; if found returns `statement: null`; otherwise builds 19-column INSERT.
- `insertHistoryEvent` (507-511) — wrapper.
- `readExistingHistoryEvent` (513-526) — replay path for read-then-write idempotency.
- Full handler inventory in `04_EVENT_TAXONOMY_AND_NAMING_AUDIT.md`.

### 3b. Additional INSERT sites
- `src/lib/reusable-sources/actions.ts:748` — raw INSERT for `project_source_inserted` (17 columns, NOT through `prepareHistoryEventInsert`).
- `src/lib/estimates/express-promotion-actions.ts:455` — raw INSERT for `row_promoted_to_library` (19 columns, idempotency via separate `readExistingPromotionResult`).
- `src/lib/ai/package-builder/apply.ts:937-1004` — local `insertEstimateEvent` helper, raw INSERT, no idempotency check (callers dedup via `readCommittedEstimateEvent`). Emits variant spellings (`estimate_row_inserted`, etc.).

### 3c. Proof/test writer — `src/lib/cloudflare/estimate-history-proof-router.ts`
- Secret-gated (`CRON_SECRET`) endpoint exercising idempotency (416-443), cross-workspace denial (445-495), transaction-rollback (497-629). Mounted at `/api/internal/estimate-history-proof`.

## 4. Presentation Layer — `src/lib/activity/`

Pure view-model composition (no DB access):
- `types.ts` (135 lines) — `ActivityViewModel` (69-87), `ActivityAction` union (4-23, 17 verbs), input types.
- `activity-composer.ts` (543 lines) — `composeEstimateActivity` (345-372), `composeSharedLinkActivity` (411-471), `composeCollaborationActivity` (515-542). XSS-safe via `sanitizeViewModel` (325-335).
- `activity-copy-dictionary.ts` — `ESTIMATE_EVENT_ACTIONS` (3-28), `DECISION_ACTIONS` (30-34). Uses non-prefixed event-type names.
- `activity-formatters.ts`, `activity-fallback.ts`, `activity-visibility.ts`, `index.ts`.

## 5. API Routes

### Owner/authenticated
- `src/app/api/projects/[projectId]/activity/route.ts` (72 lines) — `GET`, auth via `requireCurrentUserContext` + `canEditProjectInD1`, no-store.

### Public/client-facing
- `src/app/api/share/[token]/activity/route.ts` (233 lines) — `GET`, rate-limited, optional recipient session, filters `is_internal`.
- `src/app/api/share/[token]/comment/route.ts` — `GET`/`POST`, CSRF, rate-limited.
- `src/app/api/share/[token]/decision/route.ts` — `GET`/`POST`, CSRF, snapshot lock (409).
- `src/app/api/share/[token]/events/route.ts` — `POST`, records open/password/download_attempt_blocked.
- `src/app/api/share/[token]/session/route.ts` — recipient session management.
- `src/app/api/share/[token]/password/route.ts` — password verification.
- `src/app/api/share/[token]/unsubscribe/route.ts` — unsubscribe.

## 6. UI Components

### Estimate-sheet Activity History (the crown jewel)
- `src/components/workshop/estimate-sheet/activity-history.tsx` (1773 lines) — `ActivityHistoryModal` (1613), `RowDetailsModal` (1202), `EventList` (921), `AuditEventCard` (694), `AuditEventGroup` (879).
- `src/components/workshop/estimate-sheet/activity-history-model.ts` — types, filter helpers.
- `src/components/workshop/estimate-sheet/activity-scope-tree.ts` — scope tree builder (sheet/area/row).
- `src/components/workshop/estimate-sheet/use-estimate-history-panel.ts` — orchestrator hook (reads only, no restore).
- Data source: `fetchEstimateSheetVersionControl` called directly (NOT TanStack Query).

### Project Activity Page
- Route: `src/app/workshop/projects/[projectId]/activity/page.tsx` — server component, initial load via `readProjectActivityFeed`.
- Client: `src/components/workshop/project-activity/ProjectActivityClient.tsx` (614 lines) — cursor pagination via `fetch('/api/projects/.../activity')`, URL state sync.
- Helpers: `action-classes.ts`, `url-state.ts`.
- Data source: server-side initial + client-side cursor fetch (NOT TanStack Query).

### Shared-link Activity Feed
- `src/components/share/SharedLinkActivityFeed.tsx` (362 lines) — TanStack Query key `["share-activity", token, isOwner, loadActivity]`.
- `src/components/workshop/publisher/PublisherActivityFeed.tsx` — thin wrapper for owners.

### Dashboard Activity Panel
- `src/components/workshop/ProjectDashboardClient.tsx:528` — `ProjectActivityFeedPanel`, lightweight summary, no filters/pagination.

### Comments & Decisions
- `src/components/share/SharePageComments.tsx` (655 lines) — TanStack Query key `["share-comments", token]`, optimistic posting, offline queue.
- `src/components/share/SharePageDecision.tsx` + `SharePageDecisionConfirmDialog.tsx` — approve/decline/request changes.

### Restore UI
- Activity modal: `getDeletedHistoryRestoreAction` (`activity-history.tsx:526`) — restore buttons on delete events.
- Toast undo: `use-estimate-row-handlers.ts:1301,1368` — undo buttons on destructive operations.

### Zustand store
- `src/stores/estimate-ui-store.ts:11` — `activityScopeDirectOnly` preference (scope only, not history data).

### Admin audit (STUB)
- `src/components/admin/AdminAuditTable.tsx` — hardcoded 3-row stub, "Audit repository wiring is pending."
- Repositories exist (`src/lib/admin/audit-repository.ts`, `src/lib/admin/audit.ts`) but are not wired.

### Unused primitive
- `src/components/ui/timeline.tsx` — generic `Timeline` component with Storybook story. NOT used by any activity surface.

## 7. Restore Wiring (verified end-to-end)

### Node restore — FULLY WIRED
```
getDeletedHistoryRestoreAction (activity-history.tsx:551)
  → onRestoreDeletedNodes prop (activity-history.tsx:1765)
  → restoreDeletedNodesFromHistory handler (EstimateSheetContent.tsx:1855-1913)
  → restoreDeletedEstimateNodes server action (actions.ts:3703-3733)
  → dataStore.call("restore_deleted_estimate_nodes_with_history") (actions.ts:3718)
  → restoreDeletedEstimateNodes D1 impl (d1-action-client.ts:1515-1628)
  → Batch INSERT nodes + rows + history event
  → setEstimateTree(() => restoreResult.tree)
  → reloadVersionControl()
```
- **Read-only gating:** `onRestoreDeletedNodes={canEditEstimate ? restoreDeletedNodesFromHistory : undefined}` (EstimateSheetContent.tsx:2333).

### Row restore — WIRED via different path
- `restoreDeletedRowsMutation` (`use-estimate-row-mutations.ts:1044`) — React Query mutation.
- Calls `restoreDeletedEstimateRows` server action.
- **D1 `restore_deleted_estimate_rows_with_history` is a hard-coded throw** (`d1-action-client.ts:2404-2406`).

## 8. AI Context Integration
- `src/lib/ai/read-context.ts:967` — `readAskCurrentEstimateActivityHistory` — feeds activity history into Copilot context via `fetchEstimateSheetVersionControl`.

## 9. Collaboration (ephemeral, distinct from history)
- `useEstimateCursorCollaboration`, `use-project-presence.ts`, `use-estimate-cursor-broadcast.ts`, `use-estimate-row-update-broadcast.ts` — live cursors/presence.
- Durable collaboration events (invites, role changes) surface via `collaboration_audit_events` → activity feed.

## 10. Existing Plan-Pack History

| Pack | Location | Status |
|---|---|---|
| Activity History V1 Overhaul | `.ai/09_archive/store/2026-06-03-activity-history-overhaul-v1/` | COMPLETED/MERGED |
| Project Activity Page | `.ai/09_archive/2026-06-28-Project-Activity-Page/` | IMPLEMENTATION-READY (archived) |
| Project Activity UX/UI Improvement | `.ai/09_archive/2026-07-06-Project-Activity-UX-UI-Improvement/` | COMPLETE |
| Estimate Sheet Version Control | `.ai/09_archive/store/2026-05-29-estimate-sheet-version-control-complete/` | COMPLETED |
| Shared Link Overhaul V2 | `.ai/09_archive/store/2026-05-29-project-shared-link-overhaul-complete/` | COMPLETED |
| Public Share Activity Minimization | `.ai/03_plans/2026-07-07/2026-07-07-public-share-activity-minimization/` | CONDITIONALLY READY |
| Publisher-And-Shared-Pages | `.ai/03_plans/2026-07-10/Publisher-And-Shared-Pages/` | Active implementation plan; owns public comment/decision mutations and Publisher/shared-page UI |

## 11. Active Constraints

- **`VALIDATION_MATRIX.md:289`:** "Do not reintroduce sheet `Versions`, `Compare`, restore-as-copy, or named-version actions without a new approved slice." — Named-version snapshots are DORMANT and PROHIBITED.
- **`decisions.md:900`:** "Estimate activity history is one sheet-level modal, not separate slideovers."
- **V1 expansion roadmap:** Undo/redo is an explicit non-goal; the event log is audit history, not a reversible command stack.
- **Production telemetry default-off:** `isProjectPublicationAccessTelemetryEnabled` returns false unless both `ARCHESTIMATOR_ACCESS_TELEMETRY_ENABLED` and `ARCHESTIMATOR_ACCESS_TELEMETRY_PRODUCTION_READY` are `"true"`.

## 12. 2026-07-10 Freshness Recheck

- Current HEAD `e373bc865b978e237deb1d92011c96b0a3639fb4` recheck confirmed
  no Activity-owned source path changed since the prior audit and the D1 action
  client remains the estimate-history
  read/write substrate; the earlier Supabase label was stale and is superseded.
- Publisher now exclusively owns public comment/decision mutation routes,
  publication actions/repository changes, and shared-page interaction UI.
- This pack owns activity vocabulary, immutable event facts, activity readers,
  restore behavior, activity presentation, isolation, retention integration, and
  evidence. Cross-pack integration requires a validated manifest/hash receipt.
