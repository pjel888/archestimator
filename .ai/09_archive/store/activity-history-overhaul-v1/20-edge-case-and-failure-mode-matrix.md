# 20 — Edge Case and Failure Mode Matrix

**Date:** 2026-06-02  
**Status:** Second-pass proposed

---

## Purpose

Enumerate every edge case and failure mode the composer, routes, and components must handle gracefully. Each entry maps to a required test case and defines the expected user-facing behavior.

---

## 1. Actor Edge Cases

| Edge case | User-facing behavior | Audit behavior | Test required | Risk |
|----------|---------------------|---------------|--------------|------|
| Missing actor (null actor_user_id) | Primary sentence uses "System/backfill" or omits actor | Raw field shows null actor_user_id | Unit test: `formatActivityActor(null, null, "owner")` → "System/backfill" | LOW |
| Unknown actor (non-null but unresolved actor_user_id) | "Unknown user changed..." | Raw field shows the uuid | Unit test: `formatActivityActor("uuid", null, "owner")` → "Unknown user" | LOW |
| Actor deleted from profiles | "Unknown user" (profiles join returns null) | Raw field shows uuid | Integration test with orphaned actor_user_id | LOW |
| Client-visible actor anonymization | "Client" or recipient display name. Never email. Never UUID. | N/A (client gets no raw field) | Unit test: `formatActivityActor("uuid", "maria@example.com", "client")` → "Client" | MEDIUM |
| System-generated events (backfill, migration) | "Sheet code was changed from X to Y." (no actor) | System source, null actor | Unit test: null actor + system event | LOW |
| Multiple actors in correlation group | Primary sentence uses first actor | Audit shows each sub-event's actor | Component test: correlation group with different actors | LOW |

---

## 2. Snapshot Edge Cases

| Edge case | User-facing behavior | Audit behavior | Test required | Risk |
|----------|---------------------|---------------|--------------|------|
| Missing old_snapshot | "changed {field} to {new}." (no "from" clause) | Old value shows "—" | Unit test: null oldSnapshot | MEDIUM |
| Missing new_snapshot | "changed {field} from {old}." (no "to" clause) | New value shows "—" | Unit test: null newSnapshot | MEDIUM |
| Both snapshots missing | "changed {field}." (no from/to clause) | Both show "—" | Unit test: both null | MEDIUM |
| Corrupted JSONB snapshot (malformed JSON) | "Activity recorded." (composer catches parse error) | Raw field preserved; try/catch returns safe fallback | Unit test: malformed JSONB | LOW |
| Snapshot has unexpected field types (e.g., string where number expected) | Composer formats best-effort; unknown fields show "—" | Raw field preserved | Unit test: wrong type in snapshot | LOW |
| Snapshot has null values for expected fields | "—" shown for that field | Raw value is null | Unit test: null field value in snapshot | LOW |
| Snapshot has zero values (0 quantity, 0 cost) | "0 sqm", "₱ 0.00" — don't suppress | Shows 0 values | Unit test: zero values | LOW |
| Snapshot has very large numbers | Formatted with commas: "₱ 9,999,999.99" | Raw value preserved | Unit test: large values | LOW |

---

## 3. Target/Row Edge Cases

| Edge case | User-facing behavior | Audit behavior | Test required | Risk |
|----------|---------------------|---------------|--------------|------|
| Deleted row (target_row_id = NULL) | "{material} (removed)" from row_context | row_context JSONB preserved | Unit test: deleted row | MEDIUM |
| Deleted row with no row_context | "Unknown item (removed)" | No context available | Unit test: null row_context | LOW |
| Blank placeholder row | "an empty row slot" not material name | Special `isBlankEstimateRowAuditEvent()` detection | Unit test: blank row event | LOW |
| Row with very long material name (>100 chars) | Truncated in primary copy with ellipsis; full name in audit | Full name preserved | Unit test: long material name | LOW |
| Row with HTML/script in material name | Rendered safely (React escaping); composer produces plain text | Preserved as-is in DB (defense in depth: sanitize on insert) | Unit test: HTML in material name | LOW |
| Row with null/empty material name | "Unnamed item" or generic label | null/empty material | Unit test: empty material name | LOW |

---

## 4. Field Change Edge Cases

| Edge case | User-facing behavior | Audit behavior | Test required | Risk |
|----------|---------------------|---------------|--------------|------|
| Multiple fields changed (2-3) | "changed quantity, unit cost, and misc cost for {material}" | Each field in facts array | Unit test: 3 changed_fields | LOW |
| Many fields changed (4+) | "changed {count} fields for {material}" with expandable list | All fields in facts | Unit test: 5+ fields | MEDIUM |
| Single field, no before/after available | "changed {field} for {material}." (no from/to) | "—" values in facts | Unit test: single field, null snapshots | MEDIUM |
| Changed field name not in dictionary | "Unknown field" or generic "changed values" | Raw field name preserved | Unit test: unknown field name | LOW |
| Zero total delta (net cost change = 0) | Delta badge suppressed | total_delta = 0 in raw | Unit test: zero delta | LOW |
| Negative total delta | Red "-₱ 7,200.00" badge | Negative total_delta | Unit test: negative delta | LOW |
| Discount vs contingency confusion | "changed adjustment from X% to Y%" or "changed discount from X% to Y%" | field label distinguishes | Unit test: contingency vs discount | LOW |
| Currency field missing | Format without symbol: "1,200.00" or "—" | Raw value shown | Unit test: missing currency | LOW |
| Unit field missing | Quantity without unit: "5 (unknown unit)" or "5" | Raw unit shown | Unit test: missing unit | LOW |

---

## 5. Event Type Edge Cases

| Edge case | User-facing behavior | Audit behavior | Test required | Risk |
|----------|---------------------|---------------|--------------|------|
| Unknown event type (new DB value, not in composer) | "Activity recorded." with expandable raw type | Raw event_type visible in audit facts | Unit test: unknown event type | LOW |
| Sheet version events (filtered from activity feed) | Not shown (existing filter) | Exists in DB but not returned by activity query | Component test: filtered events not rendered | LOW |
| `row_inserted` filter selected (bug — no events match) | Zero results (currently unfixed) | N/A | Component test: confirm bug, then fix | MEDIUM |
| `node_deleted_with_children` with missing node name in payload | "an area" or "a section" instead of specific name | payload inspected; fallback | Unit test: missing node name in delete event | MEDIUM |
| `sheet_metadata_updated` with unknown metadata fields | "updated the estimate sheet." (generic fallback) | changed_fields listed | Unit test: unknown metadata fields | LOW |

---

## 6. Comment/Decision Edge Cases

| Edge case | User-facing behavior | Audit behavior | Test required | Risk |
|----------|---------------------|---------------|--------------|------|
| Empty comment body | No secondary text rendered; only primary sentence | body is null/empty | Unit test: empty body | LOW |
| Very long comment body (1000 chars) | Displayed in full with `whitespace-pre-wrap` | Full body stored | Unit test: max-length comment body | LOW |
| Very long decision note (2000 chars) | Displayed in full as secondary text | Full note stored | Unit test: max-length note | LOW |
| HTML/script in comment body | Rendered safely via React escaping (defense-in-depth: sanitized on insert) | Raw body stored but display-safe | Unit test: XSS in comment body | CRITICAL |
| Duplicate decision submission | 409 "Decision already submitted." | DB constraint prevents duplicate | Route test: 409 response | MEDIUM |
| Decision with no note | Primary sentence only; no secondary text | note is null | Unit test: decision without note | LOW |
| Client comment without location context (no estimate_id/row_id) | "commented on the proposal." (generic location) | estimate_id/row_id are null | Unit test: comment without location | LOW |
| Internal comment visible in owner view | Shows with amber "Internal" badge | is_internal = true | Component test: internal badge exists | CRITICAL |
| Internal comment accidentally visible in client view | Must NOT appear | Filtered at query + composer + API level | Route test: public API has no internal comments | CRITICAL |
| Client comment visible to other clients | Currently: only own email shown; other clients' emails should NOT be visible | Author filtering needed for multi-recipient | Security test: cross-recipient visibility | MEDIUM |

---

## 7. Shared-Link Event Edge Cases

| Edge case | User-facing behavior | Audit behavior | Test required | Risk |
|----------|---------------------|---------------|--------------|------|
| `open` event with no recipient context | "Client viewed the proposal." | recipient_id null | Unit test: open event without recipient | LOW |
| `open` event with known recipient | "{name} viewed the proposal." | recipient_id resolved | Unit test: open event with recipient | LOW |
| `open` event with empty metadata | "Client viewed the proposal." (no extra detail) | metadata_json = {} | Unit test: open event with empty metadata | LOW |
| `password_attempt` event in activity feed | If surfaced: "Client entered the shared link password." or filtered (TBD) | event_type = password_attempt | Verify: is password_attempt inserted into shared_link_events? | LOW |
| `comment_add`/`accept_decision`/`decline_decision` events (defined in CHECK, never inserted) | Not rendered (no data) | No rows exist | Verify: are these ever inserted? | N/A (no data) |

---

## 8. Publication Lifecycle Edge Cases

| Edge case | User-facing behavior | Audit behavior | Test required | Risk |
|----------|---------------------|---------------|--------------|------|
| Expired publication | 404 on public API route | Events remain but unreachable | Route test: expired publication returns 404 | MEDIUM |
| Revoked publication | 404 on public API route | Events remain but unreachable | Route test: revoked publication returns 404 | MEDIUM |
| Republished (new publication, same project) | New publication has new token; old events stay with old publication | Old publication's events preserved under old pubId | Route test: new token + old events | LOW |
| Rate-limited request | 429 with Retry-After header | Rate limit event recorded | Route test: 429 response | LOW |
| Rate limit key collision | Different users hitting same rate limit window | Per key_hash scoping | Route test: concurrent requests from different IPs | LOW |

---

## 9. Pagination Edge Cases

| Edge case | User-facing behavior | Audit behavior | Test required | Risk |
|----------|---------------------|---------------|--------------|------|
| Cursor invalid (malformed timestamp) | All events returned (treat as no cursor) or first page | Fallback to first page | Unit test: invalid cursor string | LOW |
| Cursor points beyond all events | Empty page, hasMore = false | No events returned | Unit test: cursor past last event | LOW |
| Cursor points to exact boundary (timestamp matches multiple events) | Composite cursor (created_at, id) handles ties | All events at boundary handled | Unit test: cursor at timestamp tie | MEDIUM |
| Load-more returns fewer than limit events (last page) | hasMore = false, last events shown | Limit+1 pattern catches this | Unit test: last page | LOW |
| Load-more with shared-link owner pagination (current bug: per-table limit before merge) | May miss older events from some tables | Bug — needs query-level cursor | Integration test: deep pagination with mixed sources | HIGH |

---

## 10. Realtime Edge Cases

| Edge case | User-facing behavior | Audit behavior | Test required | Risk |
|----------|---------------------|---------------|--------------|------|
| Realtime subscription fails to connect | Activity feed still loads via initial fetch; no live updates | No refresh on new events | Component test: subscription error state | MEDIUM |
| Realtime channel disconnected | "Connection lost" indicator or silent retry | No data loss (events stored in DB) | Component test: disconnect/reconnect | MEDIUM |
| Realtime fires for wrong publication (current bug) | Unnecessary refetch — wasteful but not breaking | No data leak (refetch still scoped to current publication) | Verify: fix filter so it doesn't fire for other publications | HIGH |
| Multiple Realtime events in rapid succession (burst) | Debounce refetches to prevent excessive queries | All events eventually loaded | Component test: rapid insert burst | MEDIUM |
| Realtime fires while user is scrolled down | "New activity" banner appears at top; no auto-scroll | Preserves scroll position | Component test: scroll position after realtime | MEDIUM |

---

## 11. Search/Filter Edge Cases

| Edge case | User-facing behavior | Audit behavior | Test required | Risk |
|----------|---------------------|---------------|--------------|------|
| Search with no results | "No activity matches your search." | Query returns 0 rows | Component test: search with no matches | LOW |
| Search with special characters (SQL injection) | Parameterized query prevents injection | Search term escaped | Security test: SQL injection attempt | CRITICAL |
| Search with very long string | Truncated or returns 0 results gracefully | Query safe | Unit test: long search string | LOW |
| Filter combination returns no results | "No activity events match your filter." + Clear filters | Intersection returns 0 | Component test: empty filter combination | LOW |
| Filter with `row_inserted` value (bug) | Zero results — never matches any events | Filter applied, no events match | Component test: row_inserted filter → fix | MEDIUM |
| Date range filter spanning DST change | Events correctly filtered by UTC timestamps | timestamptz handles DST | Unit test: DST boundary | LOW |

---

## 12. Visibility / Privacy Edge Cases

| Edge case | User-facing behavior | Audit behavior | Test required | Risk |
|----------|---------------------|---------------|--------------|------|
| Public API accidentally receives internal item | Filtered at query level (`is_internal=false`), composer level, and response level | Never reaches client | Security test: defense in depth | CRITICAL |
| Owner accidentally sees client-only data | N/A — owner has full access by design | All data accessible to owner | N/A | NONE |
| Public API returns `raw` field | Must not — stripped by composer for visibility="client" | Field absent from response | Security test: no raw field | CRITICAL |
| Public API returns raw UUID | Must not — no UUIDs in any string field of response | No UUIDs in response | Security test: no UUID pattern | CRITICAL |
| Public API returns internal email (other than submitter's own) | Must not — only submitter's own email | No unrelated emails | Security test: no cross-recipient email leak | HIGH |
| Client session expired but page still loaded | 401 on new requests; cached data may remain visible briefly | Session check on each request | Security test: expired session | MEDIUM |

---

## 13. Timezone/Date Edge Cases

| Edge case | User-facing behavior | Audit behavior | Test required | Risk |
|----------|---------------------|---------------|--------------|------|
| Events close to midnight across timezones | Grouped by local day; boundary events may appear in adjacent day group | UTC timestamp preserved | Unit test: timezone edge | LOW |
| Day grouping with no events on a day | No day group rendered for that day | Day skipped | Component test: empty day | LOW |
| Same timestamp across multiple events | Composite cursor handles ties; card order stable | (created_at, id) ensures deterministic order | Unit test: same timestamp events | LOW |
| Date range filter "from" after "to" | Prevented by UI validation or returns empty results | Invalid range → no results | Component test: invalid date range | LOW |

---

## 14. Composer Failure Edge Cases

| Edge case | User-facing behavior | Audit behavior | Test required | Risk |
|----------|---------------------|---------------|--------------|------|
| Composer throws unhandled exception | "Activity recorded." (safe fallback per event) | Error logged; event shown with fallback | Unit test: forced exception in composer | MEDIUM |
| Composer produces empty title string | Fallback: "Activity recorded." | Event type visible in facts | Unit test: empty title | LOW |
| Composer receives malformed input (wrong type shape) | Graceful degradation; fallback copy | Input logged for debugging | Unit test: wrong input type | LOW |
| Public API composer failure (server-side) | Individual event shows fallback; rest of feed unaffected | Error logged; partial response returned | Route test: partial compose failure | MEDIUM |

---

## Cross-References

- See `02-activity-copywriting-system.md` for copy fallback rules
- See `08-test-strategy.md` for required test cases per edge case
- See `18-manual-qa-and-acceptance-matrix.md` for manual verification of edge cases
