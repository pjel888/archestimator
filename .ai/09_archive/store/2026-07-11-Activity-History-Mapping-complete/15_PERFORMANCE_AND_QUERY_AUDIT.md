# 15 - Performance And Query Audit (GATE-PERF-01)

Manifest source: `SRC-010`. Requirement: `REQ-012`. Criterion: `AC-021`.
Execution: `UNIT-011`. Proof: `TEST-018`.

Audit scope: activity-history read/write paths, index coverage, and scale risk.

## Index Inventory (Ground Truth)

The complete index set on `estimate_sheet_events` (`migrations/0025_reusable_source_insert_support.sql:41-51`):

| Index | Columns | Purpose |
|---|---|---|
| `idx_estimate_sheet_events_correlation` | UNIQUE `(estimate_id, correlation_id)` | Idempotency |
| `idx_estimate_sheet_events_project_created` | `(project_id, created_at DESC, id DESC)` | Project reads |
| `idx_estimate_sheet_events_workspace_project_created` | `(workspace_id, project_id, created_at DESC, id DESC)` | Cross-project workspace reads |
| `idx_estimate_sheet_events_estimate_created` | `(estimate_id, created_at DESC, id DESC)` | Estimate reads |

**MISSING indexes:** There are NO indexes on `target_row_id`, `estimate_node_id`, or `actor_user_id` anywhere in the migrations.

## Read Path Analysis

### 1. `fetchEstimateSheetVersionControl` (`actions.ts:2029-2173`)

**Query count:** Up to **6-7 queries** per call (auth + estimate check + 3 scope queries + node resolution + actor labels).

**Index coverage:**

| Scope | WHERE clause | Index | Assessment |
|---|---|---|---|
| sheet | `estimate_id = ?` ORDER BY created_at DESC | `idx_estimate_sheet_events_estimate_created` | ✅ Good |
| row | `estimate_id = ? AND target_row_id = ?` | **No index on target_row_id** | ⚠️ Scan-then-filter within estimate |
| node (single) | `estimate_id = ? AND estimate_node_id = ?` | **No index on estimate_node_id** | ⚠️ Scan-then-filter |
| node (descendants) | `estimate_id = ? OR estimate_node_id.in.(...) OR target_row_id.in.(...)` | **No index** | 🔴 Worst case — large IN list, full scan |

**Pagination:** Keyset cursor, max 100/page (default 50). Each scope fetches `limit + 1` to detect hasMore. Good design.

**Search:** Uses JSON extraction (`row_context->>material.ilike.*`) — **cannot use any index**. Full-scan-within-estimate, bounded by 100-row limit.

**Actor labels:** Batched single `IN(...)` query — no N+1. Good.

**Recommendation:** Add composite indexes on `(estimate_id, target_row_id, created_at DESC, id DESC)` and `(estimate_id, estimate_node_id, created_at DESC, id DESC)`.

### 2. `readProjectActivityFeed` (`project-activity-feed-repository.ts:1091-1221`)

**Query count:** Up to **~15 queries** per filtered load:
- 1 auth
- 1 publication lookup (loads ALL publications, no LIMIT)
- **6-12 COUNT queries** via `readExactCounts`
- 5 source-row queries via `Promise.all`
- 2 label-resolution queries

**Parallelization:** Yes — both source queries and counts use `Promise.all`. Good.

**Merge cost:** 5 sorted lists (≤51 rows each) concatenated and sorted — O(N log N) on ≤306 elements. Negligible.

**Source-table index coverage:**

| Source | Index | Assessment |
|---|---|---|
| `estimate_sheet_events` | `idx_..._workspace_project_created` | ✅ Exact match |
| `shared_link_comments` | `idx_..._publication_created` | ⚠️ Partial — IN list, no `id` in index → TEMP B-TREE |
| `shared_link_responses` | `idx_..._publication_created` | ⚠️ Same |
| `shared_link_events` | `idx_..._publication_created` | ⚠️ Same |
| `collaboration_audit_events` | `idx_..._project_created_at` | ⚠️ Partial — lacks `id` |

**CRITICAL finding:** `readProjectPublications` loads ALL publications with no LIMIT (line 519-526). A project with many revocations could accumulate hundreds.

### 3. Count Queries — `readExactCounts` (1024-1089)

**Runs 6 COUNT queries** on every feed load when `includeCounts` is true (default). **Up to 6 more** when filters are active = **12 COUNT queries per filtered load**.

**Scale risk:** A `COUNT(*)` on `estimate_sheet_events` for a project with 100k events must traverse the entire `(workspace_id, project_id)` index slice. With actor filters, `actor_user_id` is not in any index — full project slice scan.

**Recommendation:** Make counts opt-in on subsequent pages. Cache scope-total counts with short TTL. Consider materialized summary table for filtered counts.

### 4. Shared-link Activity Route (`share/[token]/activity/route.ts`)

**Query count:** Up to **5+ queries** including 2-3 rate-limit DB round-trips before the route even reads the publication.

**Rate-limit overhead:** `checkProjectPublicationActivityRateLimit` runs cleanup + record + count = **3 DB round-trips** per request.

### 5. Frontend Rendering

**Virtualization:** `@tanstack/react-virtual` IS a dependency and IS used in 5 other components. **But NOT used in either activity component:**
- `activity-history.tsx` (1773 lines) — no virtualizer import.
- `ProjectActivityClient.tsx` (614 lines) — no virtualizer import.

**Risk:** Each "Load more" click appends another full DOM subtree for every prior page. A user clicking "Load more" 5 times renders 500+ event cards without virtualization.

**O(N²) computation:** `groupActivityEvents` (823-848) does `events.filter()` inside the outer loop — O(N²) for same-correlation events. Bounded by page size (≤100), so ≤10k comparisons. Acceptable but worth noting.

### 6. Write Path Performance

**`prepareHistoryEventInsert`** (437-505): SELECT-then-INSERT, **not in a transaction**. Two separate D1 statements. The pre-SELECT is covered by the unique index (point-lookup, cheap). Latency cost = 2 round-trips per event.

**Race condition:** The read-then-write is non-atomic. Concurrent same-`correlation_id` writes could both pass the existence check. The UNIQUE index catches the duplicate (second INSERT fails), but the error path is not explicitly handled in `insertHistoryEvent` (507-511).

**Recommendation:** Use `INSERT ... ON CONFLICT(estimate_id, correlation_id) DO NOTHING RETURNING id` to collapse SELECT+INSERT into one statement and remove the race.

## Cardinality Analysis

| Metric | Estimate | Risk |
|---|---|---|
| Events per estimate | 1k-50k+ (each row edit = 1 event) | High at 5000-row sheets |
| Events per project | 10k-500k (multiple estimates) | Very high |
| Events per workspace | Unbounded | Highest |
| Publications per project | 1 (unique index) | Low |
| Comments per publication | Bounded by rate limit | Low |
| Decisions per recipient | 1 (unique index) | Low |

**Pagination prevents loading all events** (all paths cap at 50-100/page). Good.

**BUT:** COUNT queries and `readProjectPublications` are NOT paginated and scan full slices.

## Top Findings Ranked By Scale Impact

| # | Severity | Finding | Recommendation |
|---|---|---|---|
| 1 | **HIGH** | 12 COUNT queries per filtered feed load scanning full project slice | Make counts opt-in; cache; materialized summary |
| 2 | **HIGH** | No indexes on `target_row_id` / `estimate_node_id` | Add composite indexes in new migration |
| 3 | **MEDIUM** | `readProjectPublications` loads ALL publications (no LIMIT) | Add `ORDER BY ... LIMIT 200` |
| 4 | **MEDIUM** | Neither activity frontend virtualizes | Add `useVirtualizer` to timeline lists |
| 5 | **MEDIUM** | Rate-limit adds 2-3 DB round-trips per shared-link activity read | Cache layer or batch the rate-limit check |
| 6 | **MEDIUM** | `groupActivityEvents` is O(N²) | Precompute `Map<correlationId, events[]>` |
| 7 | **LOW** | Write path SELECT-then-INSERT is non-atomic, 2 RTTs | Use `ON CONFLICT DO NOTHING` |
| 8 | **LOW** | `shared_link_comments` has no `estimate_id` index for scoped filters | Add partial index |

## UNIT-011 (new): Performance Hardening For Activity Reads

**Priority:** P1 (scale-dependent — not blocking for first users with small data, but will degrade as data grows).

**Execution status:** PLANNED pending a durable current Program migration-generation
receipt allocating `migrations/0057_activity_history_indexes.sql` to this owner
manifest. Immediately before editing, validate the receipt's migration-tail,
owner-manifest, exact path, unclaimed status, allocation, and receipt digests.
Any missing/stale/consumed/mismatched receipt blocks the unit and requires Program
reissue; this pack does not self-allocate a replacement number.

**Scope:**
1. Add composite indexes on `(estimate_id, target_row_id, ...)` and `(estimate_id, estimate_node_id, ...)` in `migrations/0057_activity_history_indexes.sql`.
2. Make `includeCounts` opt-in after first page load.
3. Cap `readProjectPublications` with LIMIT.
4. Add `useVirtualizer` to activity timeline lists (dependency already installed).
5. Replace O(N²) `groupActivityEvents` with single-pass Map.
6. Use `ON CONFLICT DO NOTHING` for idempotent writes.
