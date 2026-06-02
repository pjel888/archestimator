# 06 — Performance Analysis Plan

**Date:** 2026-06-02 (second pass: 2026-06-02)

---

## 13. Second-Pass Corrections (from `12-second-pass-verification-audit.md`)

### 13.1 Shared-Link Owner Pagination Is Flawed

**Verified:** `loadSharedLinkActivity()` in `actions.ts`:
1. Queries `limit + 1` from each of 3 tables independently (no cursor filter)
2. Merges and sorts in memory
3. Applies cursor filter AFTER merging

**Problem:** If the first page is dominated by comments, responses/events with timestamps between the initial page and the cursor cutoff are never fetched.

**Required fix:** Apply cursor filter `WHERE created_at < cursor` at the DB query level for each table independently BEFORE `limit`. Use composite cursor `(created_at, id)`. Each table independently fetches `limit + 1`.

### 13.2 Decision Digest Already Exists

**Verified:** Both `comment/route.ts` and `decision/route.ts` call `maybeTriggerSharedLinkActivityDigest()`. Performance plan should focus on improving digest copy, not creating new digest functionality. No performance impact.

### 13.3 Realtime Filter Fix Has No Performance Degradation

Fixing the filter to use actual `publicationId` instead of empty string will IMPROVE performance by preventing unnecessary `load()` calls from other publications' activity. No additional index needed.

## 1. Current Activity Fetch Patterns

### Estimate History (`fetchEstimateSheetVersionControl`)

**File:** `src/lib/estimates/actions.ts`

- Cursor-based keyset pagination using `(created_at, id)` composite
- Default page size: 20 events per scope (sheet, row, node)
- Limit+1 pattern for hasMore detection
- Can return up to 3 independent scopes: sheet events, row events, node events
- Actor label resolution: single batch query to `profiles` table for all unique `actor_user_id` values
- Node scope resolution: joins `estimate_nodes` to determine descendant node IDs and row IDs
- Event type / date / search filters applied at query level (text[] containment for event types)
- JSONB `row_context->>'material'` used for search (GIN index recommended)
- Maximum 32KB payload per row (enforced by CHECK constraint)

**Performance profile:**
- 3 parallel queries (sheet + row + node events), each with cursor + filter
- 1 profiles query (actor labels)
- 1 node scope query (descendant resolution)
- Total: ~5 queries per page load

### Shared Link Activity (Owner — `loadSharedLinkActivity`)

**File:** `src/lib/publication/actions.ts`

- 3 parallel queries: comments, responses, events — all filtered by `publication_id`
- Ordered by `created_at DESC`, limit+1 pattern
- In-memory merge + sort + cursor filter
- No join to recipient profiles for actor labels

**Performance profile:**
- 3 parallel queries + 1 publication lookup
- Total: ~4 queries per page load

### Shared Link Activity (Public — `GET /api/share/[token]/activity`)

**File:** `src/app/api/share/[token]/activity/route.ts`

- 3 parallel queries: comments, responses, events — all filtered by `publication_id`
- Comments filtered by `is_internal = false`
- No cursor pagination — hard limit of 100
- In-memory merge + sort
- Rate-limited (durable rate limiter check before queries)

**Performance profile:**
- 1 rate limit check + 1 publication lookup + 3 queries
- Total: ~5 queries per request

---

## 2. Current Pagination Behavior

| Surface | Pagination | Cursor Type | Has More |
|---------|-----------|-------------|----------|
| Estimate History (sheet) | ✅ Cursor-based | `(created_at, id)` composite | ✅ hasMore |
| Estimate History (row) | ✅ Cursor-based | `(created_at, id)` composite | ✅ hasMore |
| Estimate History (node) | ✅ Cursor-based | `(created_at, id)` composite | ✅ hasMore |
| Shared Link (owner) | ✅ Cursor-based | `created_at` timestamp | ✅ hasMore |
| Shared Link (public) | ❌ No pagination | N/A | ❌ Fixed limit 100 |

---

## 3. Current Sorting Behavior

| Surface | Sort | Implementation |
|---------|------|---------------|
| Estimate History | `created_at DESC` | Database ORDER BY |
| Shared Link (owner) | `created_at DESC` per table, merged in-memory | Database ORDER BY + JS sort |
| Shared Link (public) | `created_at DESC` per table, merged in-memory | Database ORDER BY + JS sort |

---

## 4. Current Search/Filter Behavior

| Surface | Search | Filter |
|---------|--------|--------|
| Estimate History | Text search on `row_context->>'material'` using `ilike` | Event type filter (text[] containment), date range filter |
| Shared Link (owner) | None | None |
| Shared Link (public) | None | `is_internal = false` for comments |

---

## 5. Current Realtime Behavior

| Surface | Realtime | Implementation |
|---------|----------|---------------|
| Estimate History | ❌ None | Manual refresh via load-more or scope change |
| Shared Link (owner) | ✅ Supabase Realtime | Inserts on `shared_link_comments`, `shared_link_responses`, `shared_link_events` → full refetch via `load()` |

**Issue:** Realtime triggers a full `load()` which re-runs 3 parallel queries — no incremental merge.

---

## 6. Potential Risks

### N+1 Risks
- **Actor label resolution:** Already batched (single query for all unique actor_user_ids) — **no N+1**
- **Node scope resolution:** Single query with `node_id` + descendant lookup — **no N+1**
- **Estimate sheet event details:** All fields come from the `estimate_sheet_events` row — **no N+1**

**Verdict:** No N+1 risks identified in current implementation.

### Payload Size Risks

| Source | Payload Concern | Size Estimate |
|--------|----------------|---------------|
| `estimate_sheet_events` | `old_snapshot` + `new_snapshot` JSONB columns — up to 16KB each (constrained to 32KB total per row) | 20 events × ~10KB avg = ~200KB |
| `shared_link_comments` | Comment body (max 1000 chars) | 50 comments × ~2KB = ~100KB |
| `shared_link_responses` | Decision + note (small text) | Negligible |
| `shared_link_events` | `metadata_json` (small object) | Negligible |
| Composed `ActivityViewModel` | Added `title`, `summary`, `meta`, `changes`, `facts` fields | ~2KB per event additional |

**Risk:** Estimate history with many events could load 200KB+ of JSONB snapshots. This is already constrained by the 32KB per-row CHECK constraint and pagination (20 per page). The proposed composer adds ~2KB of formatted text per event but does not increase JSONB payload.

### Client Rendering Risks

| Surface | Concern | Current Protection |
|---------|---------|-------------------|
| Estimate History | 1000s of events over many pages | Cursor pagination (20 per page), day grouping, correlation grouping |
| Shared Link | Up to 100 events in one render | Hard limit of 100, but no pagination for client view |

**Risk:** Shared-link public view could load 100 events in one render. With composer output, this could be 100 × ~2KB = 200KB of formatted text. This is acceptable for a single page but would benefit from pagination.

### Index/Query Risks

| Query | Recommended Index | Current Status |
|-------|------------------|----------------|
| `estimate_sheet_events` by `estimate_id` + `created_at` | Composite index `(estimate_id, created_at DESC, id)` | Needs verification |
| `estimate_sheet_events` by `target_row_id` + `created_at` | Composite index `(target_row_id, created_at DESC, id)` | Needs verification |
| `estimate_sheet_events` by `estimate_node_id` + `created_at` | Composite index `(estimate_node_id, created_at DESC, id)` | Needs verification |
| `estimate_sheet_events` material search | GIN index on `row_context` | Needs verification |
| `shared_link_comments` by `publication_id` + `created_at` | Composite index `(publication_id, created_at DESC)` | Needs verification |
| `shared_link_responses` by `publication_id` + `created_at` | Composite index `(publication_id, created_at DESC)` | Needs verification |
| `shared_link_events` by `publication_id` + `created_at` | Composite index `(publication_id, created_at DESC)` | Needs verification |

**Risk:** Without proper indexes, activity queries could degrade on large datasets. Index analysis should be done in Phase 6.

---

## 7. Cache/No-Store Tradeoffs

| Surface | Current Cache | Recommendation |
|---------|-------------|---------------|
| Estimate History (server action) | Not cached (server action) | Keep — activity data is frequently changing |
| Shared Link (public API) | `Cache-Control: no-store` | Keep — activity is real-time; stale cache would confuse clients |
| Shared Link (owner server action) | Not cached | Keep — owner needs fresh data |

---

## 8. Rate-Limit Implications

| Endpoint | Current Rate Limit | Phase 3 Impact |
|----------|-------------------|----------------|
| `GET /api/share/[token]/activity` | Durable rate limiter (`checkProjectPublicationActivityRateLimit`) | Same limit — no change |
| `POST /api/share/[token]/comment` | 5/min in-memory + durable rate limit | No change |
| `POST /api/share/[token]/decision` | Durable rate limit | No change |

The composer adds formatting CPU overhead but no additional database queries — rate limit behavior is unchanged.

---

## 9. Email Digest Implications

| Aspect | Current | Phase 6 Change |
|--------|---------|---------------|
| Digest trigger events | Comment only | Add decision events |
| Digest rate limit | 15 minutes | No change |
| Digest content | Plain text + HTML with basic copy | Improved human-readable copy from composer |
| Digest payload size | Small (one-line summary) | Small — unchanged |

---

## 10. Target Performance Standards

| Standard | Target | Measurement |
|----------|--------|------------|
| First page load (estimate history) | <1s for 20 events | Server timing header or manual profiling |
| First page load (shared link activity) | <500ms for 50 items | Server timing header |
| Composer overhead per event | <1ms per event | Unit test benchmark |
| Realtime refetch | <1s for delta load | Manual profiling |
| Memory for 100 composed events | <500KB | DevTools heap snapshot |
| Timeline render (200 events) | <500ms to interactive | React Profiler |

---

## 11. Test/Measurement Recommendations

1. **Phase 1:** Benchmark `composeEstimateActivity()` — call it 1000 times, measure total time. Should be <100ms total.
2. **Phase 2:** Profile Activity History modal with 200 events — React Profiler in DevTools.
3. **Phase 3:** Profile public activity API route — response time for 100 composed items.
4. **Phase 6:** Verify indexes exist with `EXPLAIN ANALYZE` on all activity queries.
5. **Phase 6:** Load test public activity API with 50 concurrent requests — verify rate limiting works.
6. **Phase 6:** Measure payload size of composed view model vs. raw data — ensure no bloat.

---

## 12. Performance Risk Mitigation During Composition

1. **Memoize `formatActivityFieldLabel()`** — field labels are static, no need to re-format per event
2. **Memoize `formatActivityValue()`** — values with the same field type share format patterns
3. **Lazy-fill `raw` field** — only populate when `visibility !== "client"` and audit facts are expanded
4. **Pre-compute `title`** at composition time, not at render time — avoids re-computation during React re-renders
5. **Keep JSONB snapshots in `raw` (optional)** — don't parse them unless expanding audit facts
