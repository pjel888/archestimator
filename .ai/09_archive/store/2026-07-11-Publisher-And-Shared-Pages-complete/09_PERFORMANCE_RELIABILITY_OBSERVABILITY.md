# 09 — Performance, Reliability, And Observability

## Performance Budgets

### Publisher roster page

| Metric | Budget | Current | Target |
|---|---|---|---|
| TTFB (roster) | < 300ms | ~varies (100 pubs + 4×1000 child rows) | < 250ms after GROUP BY optimization |
| Search debounce | 300ms | 0ms (per keystroke) | 300ms |
| Roster re-render | 1 per filter change | 1 per keystroke | 1 per debounce window |
| Mutation → refresh | < 1s | `router.refresh()` (full RSC) | < 800ms (unchanged mechanism) |

### Shared link page

| Metric | Budget | Current | Target |
|---|---|---|---|
| TTFB (first paint) | < 400ms | `React.cache` memoized | Preserved |
| LCP (hero image) | < 1.5s | `priority` on hero | Preserved |
| Comment post latency | < 500ms | Rate-limited + sanitized | Preserved |
| Print package mount | < 200ms | `flushSync` on `beforeprint` | Preserved |

### D1 query evaluator (PERF-002)

A focused evaluator measures the roster query at three scale points:
- **10 publications:** baseline (small workspace)
- **50 publications:** medium workspace
- **100 publications:** at the scan cap (large workspace)

The evaluator:
1. Seeds a local D1 test database with N publications + child rows.
2. Runs `readWorkspacePublicationsRoster` and measures wall time.
3. Asserts the optimized query (GROUP BY) is faster than or equal to the current
   row-scan approach at each scale point.
4. Reports query time, rows shipped, and aggregation method.

**Location:** `tests/vitest/perf/publisher-roster-evaluator.test.ts`.

## Performance Optimizations (In Scope)

### OPT-1: Roster GROUP BY aggregation (DATA-002)

**Before:** `readRecipientCountsByPublicationId` ships up to 1000 rows, counts in JS.
**After:** `SELECT publication_id, COUNT(*) ... GROUP BY publication_id` returns
N rows (one per publication). Reduces row transfer from 1000 → ≤100.

Same for latest-comment/latest-response: `MAX(created_at) ... GROUP BY` instead of
shipping all rows.

**Expected impact:** For a 100-publication workspace, reduces child-row transfer
from up to 4000 rows (4 × 1000) to ~400 aggregated rows. ~10× reduction in D1
data transfer for the roster.

### OPT-2: Debounced search (PERF-001)

**Before:** Every keystroke triggers `router.replace` in `startTransition`.
**After:** 300ms debounce. Only one `router.replace` after typing stops.

**Implementation:** `useDebouncedCallback` or `useDeferredValue` in
`PublisherRosterClient`.

### OPT-3: SQL-level pagination (DATA-002)

**Before:** 100 pubs fetched, JS slices a page of 25.
**After:** `LIMIT 25 OFFSET ?` at SQL level when filters allow.

Note: Stale-snapshot derivation requires the estimate-updated-at join, so full
SQL pagination may not be possible for all filter combinations. Use a hybrid:
SQL LIMIT/OFFSET for the publication scan, JS-side enrichment for derived fields.

## Reliability

### Existing reliability mechanisms (preserved)

- **Graceful degradation:** Activity feed wraps each source query in
  `runPublisherActivityQuery` — a missing table returns `unavailableSources`
  instead of throwing.
- **React.cache per-request:** Prevents redundant D1 queries across page render
  + metadata generation.
- **Deferred telemetry:** `after()` for analytics, password attempts, digest
  emails — failures don't block the response.
- **Optimistic concurrency:** Comment/decision writes carry
  `expectedSnapshotVersion`; rotation/resend carry `expected_encrypted_token`.
- **Best-effort local shedding:** Comment POST may shed within one isolate under error flood.
- **Bot filtering:** Open count excludes bots.

### New reliability mechanisms (in scope)

- **Durable decision admission** (SEC-003): D1-backed limiter is authoritative.
- **Runtime/provider secret readiness** (SEC-006): explicit pre-release gate plus
  request-time fail-closed readers.
- **All-or-nothing fix** (UX-012): recipient proposals repository skips bad rows
  instead of failing the entire inbox.

## Observability

### Existing observability (preserved)

- **Structured logging:** `logStructured` with IP hash throughout publication routes.
- **Audit events:** `recordPublisherAuditEvent` for publish/rotate/revoke/recipient
  mutations.
- **Publication events:** `project_publication_events` for access/telemetry.
- **Digest log:** `publication_digest_log` for owner email delivery.
- **Rate-limit events:** `security_rate_limit_events` for durable rate limiting.

### New observability (in scope)

- **Preview-mode event:** Record a `preview_started` event when a manager uses
  preview mode (lightweight, for adoption tracking).
- **Wizard funnel:** Optionally record wizard step progression for UX analytics
  (non-critical; can use existing event infrastructure).

No new Cloudflare Analytics or paid observability add-ons. All observability uses
existing D1 tables and structured logging.

## Performance Regression Thresholds

| Metric | Regression threshold | Action |
|---|---|---|
| Roster TTFB at 100 pubs | > 350ms (40% over budget) | Investigate query plan |
| Search re-render count | > 1 per 300ms | Verify debounce |
| Share page TTFB | > 500ms | Check React.cache memoization |
| Comment POST latency | > 1s | Check rate limiter + sanitizer |

These thresholds are checked by the performance evaluator (PERF-002) and by
manual browser verification during implementation.
