# 08 — Test Strategy

**Date:** 2026-06-02

---

## Test Pyramid

```
        /\
       /E2E\         Manual QA + visual regression
      /------\
     /  Route  \      API route integration tests
    /----------\
   /  Component \     UI component tests (React Testing Library)
  /--------------\
 /  Unit (Composer) \ Unit tests for formatter/composer functions
/--------------------\
```

---

## 1. Unit Tests — Activity Composer

**File:** `tests/vitest/activity-composer.test.ts`

All tests use shared fixtures from `tests/vitest/fixtures/activity-events.ts`.

### 1.1 Field/Value Formatting

```
✅ formatActivityFieldLabel("quantity") returns "Quantity"
✅ formatActivityFieldLabel("unitCost") returns "Unit cost"
✅ formatActivityFieldLabel("contingencyPercentage") returns "Adjustment"
✅ formatActivityFieldLabel("discountPercentage") returns "Discount"
✅ formatActivityFieldLabel("miscCost") returns "Misc cost"
✅ formatActivityFieldLabel("linkState") returns "Library status"
✅ formatActivityFieldLabel("sheetCode") returns "Sheet code"
✅ formatActivityFieldLabel("unknownField") returns "Unknown field" (graceful fallback)

✅ formatActivityValue("quantity", 5, { unit: "sqm" }) returns "5 sqm"
✅ formatActivityValue("unitCost", 1200, {}) returns "₱ 1,200.00"
✅ formatActivityValue("contingencyPercentage", 10, {}) returns "10%"
✅ formatActivityValue("contingencyPercentage", -5, {}) returns "-5%"
✅ formatActivityValue("miscCost", 500, {}) returns "₱ 500.00"
✅ formatActivityValue("linkState", "linked-clean", {}) returns "Using library values"
✅ formatActivityValue("material", "Hardwood Oak", {}) returns "Hardwood Oak"
✅ formatActivityValue("quantity", null, {}) returns "—"
✅ formatActivityValue("quantity", undefined, {}) returns "—"
✅ formatActivityValue("quantity", "", {}) returns "—"
✅ formatActivityValue("unitCost", 0, {}) returns "₱ 0.00"
✅ formatActivityValue("contingencyPercentage", 0, {}) returns "0%"
```

### 1.2 Actor Formatting

```
✅ formatActivityActor(uuid, "Philip Lewis", "owner") returns "Philip Lewis"
✅ formatActivityActor(uuid, null, "owner") returns "Unknown user"
✅ formatActivityActor(null, null, "owner") returns "System/backfill"
✅ formatActivityActor(uuid, "Philip Lewis", "client") returns "Client"
✅ formatActivityActor(null, null, "client") returns "System"
✅ formatActivityActor(uuid, "maria@example.com", "client") returns "Client" (never email)
✅ formatActivityActor(uuid, "Maria", "client") returns "Maria" (safe name)
```

### 1.3 composeEstimateActivity

```
✅ composeEstimateActivity(row_updated quantity event) returns view model with title "Philip changed quantity for Hardwood Oak Flooring from 5 sqm to 10 sqm."
✅ composeEstimateActivity(row_updated unitCost event) returns title "Philip changed unit cost for Chroma Sink from ₱ 3,500.00 to ₱ 4,200.00."
✅ composeEstimateActivity(row_updated contingency event) returns title "Philip changed adjustment for Transport Allowance from 0% to 10%."
✅ composeEstimateActivity(row_updated miscCost event) returns title "Philip changed misc cost for Delivery Charge from ₱ 0.00 to ₱ 500.00."
✅ composeEstimateActivity(row_updated single field, no prev value) returns title "Philip changed unit cost for Hardwood Oak Flooring to ₱ 1,500.00."
✅ composeEstimateActivity(row_updated single field, no curr value) returns title "Philip changed unit cost for Hardwood Oak Flooring from ₱ 1,200.00."
✅ composeEstimateActivity(row_updated both values null) returns title "Philip changed unit cost for Hardwood Oak Flooring."
✅ composeEstimateActivity(row_updated multiple fields) returns title "Philip changed quantity, unit cost, and misc cost for Hardwood Oak Flooring."
✅ composeEstimateActivity(row_added from library) returns title "Philip added Hardwood Oak Flooring to the estimate."
✅ composeEstimateActivity(row_blank_added) returns title "Philip added an empty row slot."
✅ composeEstimateActivity(row_deleted) returns title "Philip removed Hardwood Oak Flooring from the estimate."
✅ composeEstimateActivity(row_deleted blank) returns title "Philip removed an empty row slot."
✅ composeEstimateActivity(row_replaced) returns title "Philip replaced Hardwood Oak Flooring with HEMLINGBY Loveseat."
✅ composeEstimateActivity(sheet_code_updated) returns title "Philip changed sheet code from ES-001 to ES-002."
✅ composeEstimateActivity(sheet_metadata_updated with name) returns title "Philip changed estimate name from 'Kitchen Renovation' to 'Kitchen & Dining Renovation'."
✅ composeEstimateActivity(sheet_metadata_updated budget) returns title "Philip changed project budget from ₱ 500,000.00 to ₱ 750,000.00."
✅ composeEstimateActivity(sheet_metadata_updated unknown) returns title "Philip updated the estimate sheet."
✅ composeEstimateActivity(node_created) returns title "Philip created area 'Kitchen'."
✅ composeEstimateActivity(node_renamed) returns title "Philip renamed 'Kitchen' to 'Master Kitchen'."
✅ composeEstimateActivity(node_deleted_with_children) returns title "Philip deleted area 'Kitchen' and its contents."
✅ composeEstimateActivity(tree_reordered) returns title "Philip reorganized the estimate tree."
✅ composeEstimateActivity(template_inserted) returns title "Philip inserted template rows."
✅ composeEstimateActivity(unknown event type) returns title "Activity recorded."
✅ composeEstimateActivity(null oldSnapshot) returns title gracefully (no "from X to Y" clause)
✅ composeEstimateActivity(null newSnapshot) returns title gracefully (no "to Y" clause)
✅ composeEstimateActivity(null actor) returns title "Unknown user changed quantity..."
✅ composeEstimateActivity(deleted target row) returns title "Unknown user changed quantity for Hardwood Oak Flooring (removed)..."
✅ composeEstimateActivity with visibility "client" strips raw field
✅ composeEstimateActivity with visibility "owner" includes raw field
```

### 1.4 composeSharedLinkActivity

```
✅ composeSharedLinkActivity(comment, client view) returns title "Client commented on Living Area."
✅ composeSharedLinkActivity(internal comment, owner view) returns title "...added an internal note..." with visibility "internal"
✅ composeSharedLinkActivity(decision accepted, client view) returns title "Maria approved the proposal."
✅ composeSharedLinkActivity(decision declined, client view) returns title "Maria declined the proposal."
✅ composeSharedLinkActivity(decision revision_requested, client view) returns title "Maria requested revisions."
✅ composeSharedLinkActivity(event open, client view) returns title "Client viewed the proposal."
✅ composeSharedLinkActivity(unknown event type, client view) returns title "Activity recorded."
✅ composeSharedLinkActivity with visibility "client" strips raw field
```

### 1.5 filterActivityForVisibility

```
✅ filterActivityForVisibility(events with mixed visibility, "client") returns only non-internal items
✅ filterActivityForVisibility(events, "client") strips raw field from all items
✅ filterActivityForVisibility(events, "owner") returns all items including internal
✅ filterActivityForVisibility(events, "owner") preserves raw field
```

### 1.6 mergeActivityFeeds

```
✅ mergeActivityFeeds(estimateEvents, shareActivity) returns combined list sorted by occurredAt DESC
✅ mergeActivityFeeds handles empty arrays
✅ mergeActivityFeeds interleaves correctly (estimate event at 10:00, comment at 10:01, node event at 09:59)
```

---

## 2. Copy Regression Tests — Banned Terms

**File:** `tests/vitest/activity-copy-regression.test.ts`

```
✅ Primary title never contains "row_updated"
✅ Primary title never contains "row_replaced"
✅ Primary title never contains "revision_requested"
✅ Primary title never contains "accepted"
✅ Primary title never contains "declined"
✅ Primary title never contains "server_action"
✅ Primary title never contains "metadata_json"
✅ Primary title never contains "linked-overridden"
✅ Primary title never contains "detached"
✅ Primary title never contains raw UUID pattern
✅ Primary title never contains "COMMENT" or "DECISION" or "EVENT" in uppercase

✅ Client-visible title never contains "row_updated", "revision_requested", etc. (same as above)
✅ Owner-visible title may contain field labels but not raw event types

✅ Changes array labels never contain raw field names (unitCost → "Unit cost")
✅ Changes array values never contain raw link states (linked-clean → "Using library values")
✅ Badges array never contains raw event types
✅ Meta string never contains raw UUIDs
✅ Actor label (client) never contains "@" (no email addresses)
✅ Actor label (client) never contains UUID pattern
```

---

## 3. Component Tests — Estimate Activity Timeline

**File:** `tests/vitest/estimate-sheet-version-control-ui.test.tsx` (modified)

Existing tests must continue to pass. Add:

```
✅ Activity card renders human-readable title instead of "Row updated · quantity"
✅ Activity card title is a complete sentence with actor name
✅ Activity card title does not contain raw event type
✅ Activity card for row_updated shows "Changed {fields} for {material}" pattern
✅ Activity card for row_replaced shows "Replaced {old} with {new}" pattern
✅ Activity card for row_added/row_deleted shows "Added/Removed {material}" pattern
✅ Activity card for node_deleted_with_children shows node name in title
✅ Activity card for sheet_code_updated shows old and new code
✅ Activity card for sheet_metadata_updated shows what changed specifically
✅ Activity card for tree_reordered shows human-readable reorder copy
✅ Activity card for template_inserted shows human-readable insert copy
✅ Activity card for unknown event type renders "Activity recorded."
✅ Activity card handles missing oldSnapshot gracefully
✅ Activity card handles missing newSnapshot gracefully
✅ Activity card handles deleted target row (shows "(removed)" label)
✅ AuditEventGroup title does not contain raw event types
✅ Load more preserves cursor behavior
✅ Day groups remain stable after composer change
✅ Correlation grouping remains stable after composer change
✅ Scope tree interactions unchanged
✅ Filter dropdown unchanged
```

---

## 4. Component Tests — Shared Link Activity Feed

**File:** `tests/vitest/project-publication-activity.test.tsx` (modified)

```
✅ Public view renders human-readable decision copy instead of "Decision: revision_requested"
✅ Public view renders human-readable event copy instead of "EVENT · date"
✅ Public view renders "COMMENT" badge as human-readable type label
✅ Public view does not render internal comments
✅ Public view does not render raw UUIDs anywhere in output
✅ Public view does not render "server_action" anywhere in output
✅ Owner view renders internal comments with "Internal" badge
✅ Owner view renders human-readable title for all activity types
✅ Owner view shows actor names (not "Client" anonymization)
✅ New activity banner appears on Realtime-triggered refresh
✅ Loading skeleton renders correctly
✅ Empty state copy is helpful (not just "No activity yet.")
```

---

## 5. Route Tests — Public Activity API

**File:** `tests/vitest/project-publication-activity.test.tsx` (modified)

```
✅ GET /api/share/[token]/activity returns ActivityViewModel[] (not PublicActivityItem[])
✅ Response items have title field with human-readable sentence
✅ Response items do not have raw field
✅ Response items do not contain internal comments (is_internal = true filtered)
✅ Response items do not contain raw UUIDs in any field
✅ Response items do not contain raw event types in any field
✅ Response items do not contain "server_action" in any field
✅ Response items have client-safe actor labels ("Client", not email)
✅ Rate limiting still functions (429 response)
✅ Invalid token returns 404
✅ Expired publication returns 404
✅ Expired/revoked publication returns 404 with safe error message (no internals)
```

---

## 6. Accessibility Tests

**File:** `tests/vitest/activity-accessibility.test.tsx` (new)

```
✅ Activity feed has role="feed"
✅ Activity cards have role="article"
✅ Activity cards have accessible aria-label with human-readable title
✅ Day groups have accessible section labels
✅ Audit expand/collapse is keyboard-operable (Enter/Space)
✅ Load more button is keyboard-focusable
✅ New activity indicator is announced via aria-live
✅ Search input has accessible label
✅ Filter dropdown has accessible label
✅ Empty state text is readable by screen reader
```

---

## 7. Security/Privacy Tests

**File:** `tests/vitest/activity-security.test.ts` (new)

```
✅ Public API response has no "raw" field (if returned, it's empty/absent)
✅ Public API response has no "server_action" in any string field
✅ Public API response has no "metadata_json" in any string field
✅ Public API response has no raw UUID pattern in any string field
✅ Public API response has no "row_updated", "row_replaced" etc. in title
✅ Public API response has no "revision_requested", "accepted", "declined" in title
✅ Public API response has no "@" in client actor labels
✅ Public API response has no is_internal = true comments
✅ filterActivityForVisibility("client") never includes visibility "internal"
✅ composeEstimateActivity(_, { visibility: "client" }) has no raw field
✅ composeSharedLinkActivity(_, { visibility: "client" }) has no raw field
✅ Error responses don't leak SQL messages, stack traces, or internal paths
```

---

## 8. Mandatory Test Cases (from Brief)

```
✅ "changed quantity from 5 to 10" → composeEstimateActivity test
✅ "changed quantity from 5 sqm to 10 sqm" → formatActivityValue with unit test
✅ "changed unit cost from ₱ 1,200.00 to ₱ 1,500.00" → composeEstimateActivity test
✅ "changed contingency from 0% to 10%" → composeEstimateActivity test
✅ "changed discount from 0% to 5%" → composeEstimateActivity test
✅ "replaced Hardwood Oak Flooring with HEMLINGBY Loveseat" → composeEstimateActivity test
✅ "changed sheet code from ES-001 to ES-002" → composeEstimateActivity test
✅ "approved proposal" → composeSharedLinkActivity test
✅ "declined proposal with note" → composeSharedLinkActivity test
✅ "requested revisions" → composeSharedLinkActivity test
✅ client comment visible to owner and client → visibility filter test
✅ internal comment visible to owner only → visibility filter test
✅ public route does not return internal comment → API route test
✅ public route does not return raw UUID → security test
✅ public route does not return server_action → security test
✅ activity card does not render revision_requested → copy regression test
✅ activity card does not render linked-overridden → copy regression test
✅ activity card handles missing oldSnapshot → composer test
✅ activity card handles missing newSnapshot → composer test
✅ unknown actor renders Unknown user or Client, never User <uuid> → actor formatting test
✅ load more preserves cursor → component pagination test
✅ search filters human-readable target labels → component filter test
✅ date grouping remains stable → component grouping test
✅ screen reader receives new activity status → accessibility test
```

---

## 9. Test Fixtures

**File:** `tests/vitest/fixtures/activity-events.ts`

```ts
// Shared fixtures for all activity tests

export const mockEstimateRowUpdatedEvent: EstimateSheetHistoryEvent = { ... };
export const mockEstimateRowAddedEvent: EstimateSheetHistoryEvent = { ... };
export const mockEstimateRowBlankAddedEvent: EstimateSheetHistoryEvent = { ... };
export const mockEstimateRowDeletedEvent: EstimateSheetHistoryEvent = { ... };
export const mockEstimateRowReplacedEvent: EstimateSheetHistoryEvent = { ... };
export const mockEstimateSheetCodeUpdatedEvent: EstimateSheetHistoryEvent = { ... };
export const mockEstimateSheetMetadataUpdatedEvent: EstimateSheetHistoryEvent = { ... };
export const mockEstimateNodeCreatedEvent: EstimateSheetHistoryEvent = { ... };
export const mockEstimateNodeRenamedEvent: EstimateSheetHistoryEvent = { ... };
export const mockEstimateNodeDeletedEvent: EstimateSheetHistoryEvent = { ... };
export const mockEstimateTreeReorderedEvent: EstimateSheetHistoryEvent = { ... };
export const mockEstimateTemplateInsertedEvent: EstimateSheetHistoryEvent = { ... };
export const mockEstimateUnknownEventType: EstimateSheetHistoryEvent = { ... };

export const mockSharedLinkComment: ActivityItem = { ... };
export const mockSharedLinkInternalComment: ActivityItem = { ... };
export const mockSharedLinkDecisionAccepted: ActivityItem = { ... };
export const mockSharedLinkDecisionDeclined: ActivityItem = { ... };
export const mockSharedLinkDecisionRevisionRequested: ActivityItem = { ... };
export const mockSharedLinkEventOpen: ActivityItem = { ... };
export const mockSharedLinkUnknownItem: ActivityItem = { ... };
```

---

## 10. What's NOT Tested (Known Gaps)

1. **Realtime subscription actual behavior** — Deferred (requires Supabase local/CI integration)
2. **Live DB integration** — Always skipped unless `RUN_SUPABASE_INTEGRATION=1`
3. **Offline/retry behavior** — Soft-pass placeholders in existing tests
4. **Deep pagination (>100 pages)** — Not tested
5. **Performance/stress (1000+ events)** — Not tested in CI; manual profiling only
6. **Mobile responsive layout** — Visual QA only
7. **Dark mode rendering** — Visual QA only
8. **Screen reader announcement of new activity** — Requires real screen reader (manual testing)
