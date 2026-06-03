# 17 — Observability, Analytics, and Quality Plan

**Date:** 2026-06-02  
**Status:** Second-pass proposed

---

## Purpose

Define how to measure whether the Activity History system works after implementation — runtime monitoring, copy quality tracking, performance monitoring, and manual QA workflows. Do not implement analytics yet; this is a planning document.

---

## 1. Runtime Error Monitoring

### Composer Failures

The Activity Composer must never throw uncaught exceptions that break the activity feed.

| Signal | How to measure | Alert threshold |
|--------|---------------|-----------------|
| `composeEstimateActivity()` throws | try/catch wrapper + fallback rendering | >0 per deploy |
| `composeSharedLinkActivity()` throws | try/catch wrapper + fallback rendering | >0 per deploy |
| Public API route returns 500 for activity request | HTTP status logging | >1% of requests |
| Owner server action throws on activity load | Error boundary in UI + error state rendering | >0 per deploy |

### Implementation recommendation:
```ts
// Wrap all compose calls in safe fallback
function safeCompose<T extends ActivityViewModel>(composer: () => T): T {
  try {
    return composer();
  } catch (e) {
    console.error("[activity-composer] fallback used", e);
    return createFallbackActivityViewModel();
  }
}
```

---

## 2. Copy Quality Monitoring

### Unknown Event Type Count

Track how often the "Activity recorded." fallback is rendered — this indicates:
- A new event type was added to the DB but not mapped in the composer
- The event type value is malformed
- A migration introduced an event type without updating the composer

| Metric | How to measure | Target |
|--------|---------------|--------|
| Unknown event types rendered | Counter per event_type value | 0 for all known types |
| New unknown event types in last 24h | Alert on first occurrence of new type | Immediate investigation |

### Internal Comment Leak Sentinel

Automated tests that run on every deploy + periodic manual verification.

| Test | Frequency | Target |
|------|-----------|--------|
| Public API returns no internal comments | Every deploy (CI) | 0 leaks |
| Client view renders no internal comments | Every deploy (CI) | 0 leaks |
| Email digest contains no internal comment bodies | Manual QA per deploy | 0 leaks |

### Copy Regression Tracking

Every deploy runs a banned-term test suite against all compose functions.

| Test suite | Scope | Failure action |
|-----------|-------|---------------|
| `activity-copy-regression.test.ts` | All compose output strings | Block merge |
| Banned terms in primary title | All event types × all locales | Block merge |
| Raw UUID in client-visible strings | All public API responses | Block merge |
| Raw event_type in primary title | All compose output | Block merge |

---

## 3. Performance Monitoring

### Public API Latency

| Metric | Target | Measurement |
|--------|--------|------------|
| `GET /api/share/[token]/activity` p50 latency | <200ms | Server timing header or APM |
| `GET /api/share/[token]/activity` p95 latency | <500ms | Server timing header or APM |
| `GET /api/share/[token]/activity` p99 latency | <1s | Server timing header or APM |

### Composer Overhead

| Metric | Target | Measurement |
|--------|--------|------------|
| `composeEstimateActivity()` per event | <1ms | Unit test benchmark |
| `composeSharedLinkActivity()` per item | <1ms | Unit test benchmark |
| 100 events composed total | <100ms | Unit test benchmark |

### Activity Feed Load Time

| Surface | Target | Measurement |
|---------|--------|------------|
| Estimate Activity History modal (20 events) | <1s to interactive | React Profiler |
| Estimate Activity History modal (200 events) | <2s to interactive | React Profiler |
| Shared-link Activity (50 items, client) | <500ms to interactive | React Profiler |
| Shared-link Activity (50 items, owner) | <700ms to interactive (extra queries) | React Profiler |

---

## 4. Realtime Refresh Monitoring

| Metric | Target | Measurement |
|--------|--------|------------|
| Realtime subscription connects successfully | >99% success rate | Log on channel error |
| Realtime refresh triggers correctly on new comment | 100% of comment inserts trigger refresh | Manual QA + integration test |
| Realtime refresh triggers correctly on new decision | 100% of decision inserts trigger refresh | Manual QA + integration test |
| Realtime refresh does NOT fire for other publications (fix filter) | 0 cross-publication triggers | Verify filter fix |
| Realtime channel disconnect rate | <1% per hour | Supabase Realtime logs |

---

## 5. Proposed Observability Events (Do NOT implement in V1)

These are events/metrics to plan for, not implement. Use for future analytics infrastructure.

### Activity Feed Usage Events

```
activity_feed_opened           — User opened any activity feed
activity_feed_opened_estimate  — User opened estimate activity history
activity_feed_opened_share     — User opened shared-link activity
activity_filter_used           — User applied a filter (which type?)
activity_search_used           — User searched activity
activity_details_expanded      — User expanded audit facts on a card
activity_details_collapsed     — User collapsed audit facts
activity_load_more             — User clicked "load more"
activity_scope_changed         — User changed scope tree selection
```

### Copy Quality Events

```
activity_unknown_event_rendered  — Composer used fallback for unknown event type
activity_copy_fallback_used      — Composer used generic fallback for missing data
activity_composer_error          — Composer threw an exception
```

### Performance Events

```
activity_public_api_latency_ms   — p50/p95/p99 latency for public activity API
activity_owner_load_latency_ms   — p50/p95/p99 latency for owner activity load
activity_realtime_refresh_failed — Realtime subscription error or disconnect
activity_realtime_refresh_success — Realtime refresh completed successfully
```

### Security Events (for audit)

```
activity_internal_comment_leaked — Should never fire (sentinel). Log alert if it does.
activity_public_api_raw_field_leaked — Should never fire (sentinel).
```

---

## 6. Manual QA Reporting Template

For each QA session, record:

```markdown
## QA Session — [date]

**Tester:** [name]
**Build:** [commit SHA]
**Browser/Device:** [browser, version, OS]

### Surfaces Tested
- [ ] Estimate Activity History modal
- [ ] Row Activity tab
- [ ] Shared Link Activity (owner)
- [ ] Shared Link Activity (client)
- [ ] Email digest

### Events Tested
- [ ] row_updated (quantity, unit cost, misc cost, contingency, discount)
- [ ] row_added
- [ ] row_blank_added
- [ ] row_deleted
- [ ] row_replaced
- [ ] sheet_code_updated
- [ ] sheet_metadata_updated
- [ ] node_created
- [ ] node_renamed
- [ ] node_deleted_with_children
- [ ] tree_reordered
- [ ] template_inserted
- [ ] Comment (public)
- [ ] Comment (internal)
- [ ] Decision (accepted)
- [ ] Decision (declined)
- [ ] Decision (revision_requested)
- [ ] Shared-link open event
- [ ] Unknown event type fallback

### Issues Found
| ID | Surface | Event | Issue | Severity |
|----|---------|-------|-------|----------|
| QA-1 | ... | ... | ... | ... |

### Regressions
- [ ] No regression into technical copy
- [ ] No internal comment leak
- [ ] Realtime still works
- [ ] Pagination still works
```

---

## 7. Support/Debug Workflow

When a user reports an activity history issue:

1. **Get event ID** from UI (expandable audit facts, owner-only) or from DB query.
2. **Query the raw event:**
   ```sql
   SELECT * FROM estimate_sheet_events WHERE id = '<event-id>';
   -- or
   SELECT * FROM shared_link_comments WHERE id = '<id>';
   SELECT * FROM shared_link_responses WHERE id = '<id>';
   SELECT * FROM shared_link_events WHERE id = '<id>';
   ```
3. **Run through composer manually** (if available via debug tooling) to see what human-readable copy was produced.
4. **Check correlation_id** to find related events.
5. **Verify visibility** — is the user supposed to see this event?
   - Owner estimate events → owner only
   - Shared-link internal comments → owner only
   - Shared-link public comments → owner + client
   - Shared-link decisions → owner + client

---

## 8. Cross-References

- See `06-performance-analysis-plan.md` for detailed performance targets
- See `08-test-strategy.md` for automated test plan
- See `18-manual-qa-and-acceptance-matrix.md` for QA scripts
- See `20-edge-case-and-failure-mode-matrix.md` for failure modes to monitor
