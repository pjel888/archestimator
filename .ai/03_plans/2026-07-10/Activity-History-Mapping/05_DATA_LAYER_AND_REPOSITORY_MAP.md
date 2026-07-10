# 05 - Data Layer And Repository Map

This document maps every data table, index, repository function, write path, and read path that constitutes the activity history data layer.

## 1. D1 Tables

### Core estimate activity table

**`estimate_sheet_events`** — `migrations/0025_reusable_source_insert_support.sql:8-51`

| Column | Type | Purpose |
|---|---|---|
| `id` | TEXT PK | Event ID (UUID) |
| `estimate_id` | TEXT FK CASCADE | Estimate scope |
| `workspace_id` | TEXT FK CASCADE | Workspace isolation |
| `project_id` | TEXT FK CASCADE | Project scope |
| `estimate_node_id` | TEXT nullable | Node/area/group target |
| `estimate_tab_id` | TEXT nullable | Tab target |
| `target_row_id` | TEXT nullable | Row item target |
| `event_type` | TEXT NOT NULL | Event vocabulary (see naming audit) |
| `event_source` | TEXT DEFAULT 'server_action' | Origin marker |
| `correlation_id` | TEXT NOT NULL | Idempotency key |
| `actor_user_id` | TEXT nullable | Who made the change |
| `changed_fields` | TEXT DEFAULT '[]' | JSON array of changed field names |
| `row_context` | TEXT DEFAULT '{}' | JSON: material, supplier for display |
| `old_snapshot` | TEXT nullable | JSON: pre-change row state |
| `new_snapshot` | TEXT nullable | JSON: post-change row state |
| `payload` | TEXT DEFAULT '{}' | JSON: event-specific data |
| `metadata` | TEXT DEFAULT '{}' | JSON: source/extra info |
| `total_delta` | REAL nullable | Monetary impact of the change |
| `created_at` | TEXT NOT NULL | Timestamp |

**Indexes:**
| Index | Columns | Purpose |
|---|---|---|
| `idx_estimate_sheet_events_correlation` | UNIQUE `(estimate_id, correlation_id)` | Idempotency enforcement |
| `idx_estimate_sheet_events_project_created` | `(project_id, created_at DESC, id DESC)` | Project feed reads |
| `idx_estimate_sheet_events_workspace_project_created` | `(workspace_id, project_id, created_at DESC, id DESC)` | Cross-project workspace reads |
| `idx_estimate_sheet_events_estimate_created` | `(estimate_id, created_at DESC, id DESC)` | Estimate-scoped reads |

### Shared-link / publication tables — `migrations/0014_publication_shared_links.sql`

| Table | Lines | Purpose |
|---|---|---|
| `project_publications` | 1-39 | Publication records with `snapshot_json`, `snapshot_version`, `status` |
| `project_publication_events` | 41-67 | Open/view analytics events |
| `shared_link_recipients` | 69-93 | Per-recipient tokens, `recipient_token_hash`, `last_opened_at` |
| `shared_link_comments` | 95-112 | Client comments, `is_internal`, `target_kind`, `snapshot_version_at_comment` |
| `shared_link_responses` | 122-146 | Decisions: `accepted`/`declined`/`revision_requested`, `signature_intent_hash` |
| `shared_link_events` | 164-182 | `open`, `comment_add`, `accept_decision`, `decline_decision`, `password_attempt` |
| `publication_digest_log` | 186-197 | Owner digest email delivery audit |

### Other activity-adjacent tables

| Table | Migration | Purpose |
|---|---|---|
| `collaboration_audit_events` | `0007:109-119` | Invite/role/member activity |
| `cost_library_item_price_history` | `0028:92-107` | Cost-library price audit (NOT project activity) |
| `cost_library_item_state_history` | `0028:110-124` | Cost-library state audit (NOT project activity) |
| `data_retention_events` | `0034` | Retention purge audit |

## 2. Write Paths

### 2a. Primary path: `prepareHistoryEventInsert` (`d1-action-client.ts:437-505`)

Idempotent INSERT with read-before-write:
1. SELECT by `(estimate_id, correlation_id)`.
2. If found → return existing `eventId` with `statement: null` (no-op).
3. If not found → build 19-column INSERT.

**Used by:** All handlers called through the `*_with_history` dispatch table (`callEstimateAction`, lines 2362-2407).

### 2b. Atomic batch path

`reorderEstimateNodes`, `deleteEstimateNodes`, and `restoreDeletedEstimateNodes` batch the history INSERT with the mutation SQL in the same `runBatch`, providing true atomic dedup.

### 2c. Read-then-write idempotent path

`insertRowItem` (1630), `patchRowItem` (1892), `deleteRowItem` (1939) use `readExistingHistoryEvent` (513-526) as a pre-check, then call `insertHistoryEvent`. This is NOT atomic — a concurrent insert between read and write could theoretically race, but the unique index provides a fallback.

### 2d. Direct `insertHistoryEvent` path

`deleteRowsBulk` (2049), `moveRowItem` (1979), `copyTemplateNodes` (2070), `updateSheetAdjustment` (2009), and all tab/node detail handlers use plain `insertHistoryEvent` with correlation-id dedup inside `prepareHistoryEventInsert`.

### 2e. Raw INSERT paths (NOT through `prepareHistoryEventInsert`)

| Site | Event type | Columns | Idempotency |
|---|---|---|---|
| `reusable-sources/actions.ts:748` | `project_source_inserted` | 17 (omits `target_row_id`, `total_delta`) | Deterministic `correlationId` from SHA-256 + prior check |
| `express-promotion-actions.ts:455` | `row_promoted_to_library` | 19 | `readExistingPromotionResult` |
| `ai/package-builder/apply.ts:939-1004` | 7 event types | 19 | `readCommittedEstimateEvent` (caller-side) |
| `estimate-history-proof-router.ts:557` | `row_inserted` | — | Test/proof only |

**Inconsistency:** The reusable-sources INSERT writes only 17 columns (omits `target_row_id` and `total_delta`), which means project-source-insert events will have NULL for those fields even when the data is available. `UNIT-004` standardizes this.

## 3. Read Paths

### 3a. Estimate-sheet history read — `fetchEstimateSheetVersionControl` (`actions.ts:2029-2173`)

The primary read path for the estimate-sheet Activity History modal:
1. Builds 3 scope queries (sheet/row/node) based on `scope` parameter.
2. Applies event-type, date-range, and search filters.
3. Keyset paginates by `(created_at, id)`.
4. Filters dormant named-version types (`isDormantNamedVersionEventType`, line 992).
5. Enriches actor labels from `profiles`.
6. Returns `EstimateSheetHistoryEvent[]` + cursor.

**Data store:** Uses `dataStore.from("estimate_sheet_events")` — a PostgREST-style client. Whether this points at D1 or a legacy Supabase-compatible client depends on the `dataStore` binding. **This should be verified** (`UNIT-004`).

### 3b. Project activity feed — `readProjectActivityFeed` (`project-activity-feed-repository.ts:1091-1221`)

Multi-source merge for the project activity page:
1. Fans out 5 parallel source queries + publication rows.
2. Each source uses `runSourceQuery` wrapper that swallows errors into `unavailableSource`.
3. Merges and sorts by `(created_at, id)`.
4. Encodes a base64url multi-source cursor (line 266).
5. Returns `partial` + `unavailableSources` flags.

### 3c. Simple dashboard feed — `listProjectActivityPage` (`project-activity-repository.ts:242-308`)

Cached, estimate-only, no multi-source merge. Used by the dashboard panel.

### 3d. Publisher workspace feed — `readPublisherWorkspaceActivity` (`publisher/activity-repository.ts:246`)

Same 6 sources as the project feed, scoped to workspace.

### 3e. Shared-link activity feed — `GET /api/share/[token]/activity` (`share/[token]/activity/route.ts:79-232`)

Public-safe feed for clients:
- Filters `is_internal` (line 181, 218).
- Rate-limited.
- Optional recipient session for richer data.
- Composes with `audience: "client"`.

## 4. Idempotency Model

The `correlation_id` unique index (`(estimate_id, correlation_id)`) is the primary idempotency mechanism. Three patterns exist:

| Pattern | Where | Atomicity | Risk |
|---|---|---|---|
| Atomic batch | `reorderEstimateNodes`, `deleteEstimateNodes`, `restoreDeletedEstimateNodes` | Atomic (same batch) | None |
| Read-then-write | `insertRowItem`, `patchRowItem`, `deleteRowItem` | Non-atomic (read, then write) | Unique index catches races |
| Direct insert | All other handlers, `apply.ts`, `reusable-sources`, `express-promotion` | Non-atomic (just insert) | Unique index catches duplicates |

All three are safe against duplicates because of the unique index. The read-then-write pattern additionally enables early-return for idempotent replays without hitting an insert error.

## 5. Data Retention

- `estimate_sheet_events` is a retention class (`migrations/0034`).
- Purge logic: `src/lib/compliance/retention-core.ts:38,121-127` — SELECT/DELETE by `created_at`.
- Schedule status: described as "a counsel-reviewed draft until OPEN-DEC-004 is signed off" (0034 header). Retention is coded but not necessarily active.

## 6. Schema Tolerance

Both project-activity repositories gracefully handle a missing `estimate_sheet_events` table:
- `isProjectActivitySchemaUnavailable` (`project-activity-repository.ts:71-76`) — catches `no such table`.
- `runSourceQuery` (`project-activity-feed-repository.ts`) — wraps each source in try/catch and marks failures as `unavailableSources`.

This is a deliberate design choice for progressive rollouts where migrations may not have been applied yet.
