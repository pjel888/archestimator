# 08 - Test Coverage And Gaps

This document maps every test covering activity history behavior and identifies coverage gaps.

## Test Inventory

### A. `fetchEstimateSheetVersionControl` — WELL COVERED

**File:** `tests/vitest/estimate-sheet-version-control-actions.test.ts` (unit/integration, mocked D1)

| Test area | Lines |
|---|---|
| Cursor keyset pagination + limit-plus-one | 898-970 |
| Cursor timestamp precision | 972-998 |
| Filters dormant named-version events | 1000-1071 |
| Row-only reads | 1073-1098 |
| Node-scoped direct reads | 1100-1127 |
| Descendant node-scoped reads | 1129-1166 |
| Event/date/search filters | 1168-1196 |
| Unsafe search rejection | 1198-1215 |
| Actor-label enrichment from profiles | 1217-1309 |
| Retention metrics | 1311-1337 |
| Invalid cursor rejection | 1339-1359 |

### B. Activity History Modal UI — COVERED (component level)

**File:** `tests/vitest/estimate-sheet-activity-history-ui.test.tsx`

| Test area | Lines |
|---|---|
| Filter dropdown | 110-125 |
| Escape/listbox/modal backdrop interactions | 127-159 |
| Row restore button calls `onRestoreDeletedRows` | 162-188 |
| Node restore button calls `onRestoreDeletedNodes` (mock handler only) | 190-218 |
| Omits restore when no handler passed | 220-238 |
| Row details Activity tab | 241-265 |

### C. EstimateSheetContent Integration (reads) — COVERED, restore NOT

**File:** `tests/vitest/estimate-sheet-version-control-ui.test.tsx`

| Test area | Notes |
|---|---|
| Opens sheet/node activity, scope tree, load-more | Covered |
| Stale-response isolation | Covered |
| Filters, composer copy | Covered |
| Restore button in non-delete scenario | Line 115 asserts ABSENCE only |

### D. `restoreDeletedEstimateNodes` server action — COVERED (happy path only)

**File:** `tests/vitest/estimate-node-reorder-action.test.ts:903-960`
- Asserts RPC name, result shape, tab-tree refresh.
- **Does NOT test** error branches.

### E. Node restore D1 client — PARTIALLY COVERED

**File:** `tests/vitest/estimate-actions-d1-reorder-history.test.ts:570-628`
- Calls RPC, checks `old_snapshot` shape.
- **Does NOT test** collision, BFS subtree, inferred roots, batch oversize.

**Required focused row-restore proof:** UNIT-002 adds
`tests/vitest/estimate-actions-d1-row-restore-history.test.ts`, exercising direct
D1 success/readback, injected atomic write failure, row-ID collision,
malformed/missing `old_snapshot`, cross-workspace denial, explicit batch cap, and
idempotent replay. This production contract is not delegated to the tests-only
UNIT-005 lane.

### F. Other node-restore tests (DIFFERENT entrypoint)

**Files:** `tests/vitest/estimate-tree-bulk-selection.test.tsx`, `tests/vitest/estimate-tree-context-menu.test.tsx`
- Exercise `use-estimate-tree-crud.ts`, NOT the activity-history restore path.

### G. Row restore — COVERED

**File:** `tests/vitest/estimate-sheet-version-control-actions.test.ts:694-722` (server action) + UI button test.

### H. Activity Composer — WELL COVERED

| File | Coverage |
|---|---|
| `tests/vitest/activity-composer.test.ts` | Never-throws for unknown events |
| `tests/vitest/activity-view-model.test.ts` | Formats fields/values/actors, owner vs client visibility, node-deletion summaries |
| `tests/vitest/activity-security.test.ts` | Strips raw UUIDs/IDs, internal filtering, IP/UA hash stripping, `safeCompose` fallback |
| `tests/vitest/activity-copy-regression.test.ts` | Copy regression across event types |

### I. `readProjectActivityFeed` — COVERED

| File | Coverage |
|---|---|
| `tests/vitest/project-activity-page/repository-behavior.test.ts` | Repository calls |
| `tests/vitest/project-activity-page/route-contract.test.ts` | Route wiring contract |
| `tests/vitest/project-activity-repository.test.ts` | Empty page, missing table, redacted page, keyset cursor pagination, no-duplicate windows, invalid cursor rejection |

### J. Shared-link comment posting — COVERED

**File:** `tests/vitest/project-publication-comments.test.tsx` (integration, route-level)

| Test area | Lines |
|---|---|
| CSRF | 101 |
| Recipient session | 109 |
| Rate limit 5/min 20/hour | 122 |
| Durable rate limiting | 142 |
| Password cookie | 167 |
| Stale credential | 196 |
| Malformed target UUIDs | 240 |
| HTML sanitization + >1000 truncation | 297 |
| `insert_client_comment` RPC | 318 |
| Canonical return | 338 |
| Target-not-in-snapshot 400 | 386 |
| No raw error echo | 522 |
| Stale/tampered rendered-view snapshot | 438-493 |
| Recipient-aware copy | 553 |

### K. Shared-link decision/approval — COVERED

**File:** `tests/vitest/project-publication-decision.test.tsx` (integration, route-level)

| Test area | Lines |
|---|---|
| CSRF, invalid values | — |
| 409 duplicate via snapshot_version unique | 146 |
| Valid 201 | 233 |
| Wrong-estimate 400 | 264 |
| Malformed target/row UUIDs | — |
| Sanitization/truncation | — |
| Snapshot lock | — |
| Rate limiting | — |
| 403 mapping | — |
| No raw error echo | 514 |
| `composeSharedLinkActivity` for accepted/declined/revision | 548-551 |

**Additional:**
- `tests/vitest/share/duplicate-decision-race.provider.test.ts:89` — **SKIPPED** (pending safe Supabase harness, line 178).
- `tests/vitest/share/share-page-decision-bar-copy-contract.test.tsx:38-48` — decision bar renders 3 actions.
- `tests/vitest/share/share-page-decision-anonymous.test.tsx` — anonymous read-only states.

### L. Shared-link activity feed — COVERED

**File:** `tests/vitest/project-publication-activity.test.tsx` (integration)

| Test area | Lines |
|---|---|
| Same-origin GET | — |
| Compact target labels | — |
| Cross-origin reject | — |
| `is_internal` filtering for unauth | — |
| Password cookie | — |
| No comment bodies/decisions without session | — |
| Durable rate limiting | — |
| `ActivityViewModel` shape | — |
| Opaque cursor pagination | — |
| Malformed cursor reject | — |
| Owner/manager full visibility | 466-740 |

### M. Schema/idempotency contracts — COVERED (SQL string level)

**File:** `tests/vitest/estimate-sheet-version-control-schema.test.ts`
- Migration contracts for events, versions, row revisions, RLS, idempotency helper, node/row restore RPC definitions (140-153, 297).

### N. E2E — MINIMAL

**File:** `e2e/shared-link-receiver.spec.ts`

| Scenario | Line |
|---|---|
| Owner generates link | 25 |
| Client opens, views tabs, accepts, posts comment + decision | 46-48 |
| Password lockout after 5 fails | 54 |
| Mobile decision bar visibility | 63-69 |
| Keyboard tab a11y | 75 |

## Coverage Gap Analysis

### P0 Gaps (critical for MVP)

| Gap | Why critical | Affected unit |
|---|---|---|
| **Event-type naming split is not caught by any test** | No test asserts that a written event_type matches the UI-expected vocabulary. The split exists because no integration test cross-references write and read. | `UNIT-001` |
| **No test verifies filter dropdown returns results for each filter option** | If tested, the empty-list result for "Node created" would have caught the naming mismatch. | `UNIT-001`, `UNIT-005` |
| **Bulk-delete restore is not tested** | `rows_deleted` vs `rows_bulk_deleted` mismatch is invisible without a test that creates a bulk-delete event and checks for the restore button. | `UNIT-002`, `UNIT-005` |

### P1 Gaps

| Gap | Details | Affected unit |
|---|---|---|
| **Activity-history node-restore end-to-end** | No test renders `EstimateSheetContent` with a delete event and clicks "Restore" to assert `restoreDeletedEstimateNodes` is called, tree is swapped, `reloadVersionControl` fires. The existing test uses a `vi.fn()` mock. | `UNIT-005` |
| **`restoreDeletedNodesFromHistory` handler** | The callback at `EstimateSheetContent.tsx:1855-1913` has no direct test (toast, tree swap, reload, error path). | `UNIT-005` |
| **`restoreDeletedEstimateNodes` server action error branches** | Not tested: project-not-found, edit-access denied, RPC error mapping, refreshed-estimate-missing throw. | `UNIT-005` |
| **D1 node-restore error/edge branches** | Not tested: collision throw, empty-snapshot throw, wrong-event-type throw, `D1_MAX_BATCH_STATEMENTS` oversize throw, inferred-roots branch. | `UNIT-005` |
| **`prepareHistoryEventInsert` idempotency at runtime for node restore** | No runtime test of correlation_id dedup for `estimate_nodes_restored`. | `UNIT-005` |
| **Read-only user restore gating** | `canEditEstimate ? restoreDeletedNodesFromHistory : undefined` branch has no test. | `UNIT-005` |
| **Activity-history restore error UX** | Error toast paths untested at integration level. | `UNIT-005` |
| **Duplicate-decision race test skipped** | `tests/vitest/share/duplicate-decision-race.provider.test.ts:178` — pending safe harness. | `UNIT-005` |

### P2 Gaps

| Gap | Details |
|---|---|
| **No e2e for workshop activity panel** | Only shared-link receiver flow has e2e. No Playwright for activity modal, filtering, load-more, restore. |
| **No e2e for shared-link comment validation** | Route-level tests cover it, but no browser-driven flow. |
| **No e2e for decision 409 duplicate** | Route-level tests cover it, but no browser-driven flow. |
| **No test for AI package-builder event types** | The variant spellings (`estimate_row_inserted`, etc.) are never asserted against the UI vocabulary. |
| **`reloadVersionControl` post-restore** | No assertion that after restore, the feed reloads and shows the new event. |

## Recommended Test Additions (UNIT-005)

1. **Event-type vocabulary integration test:** Write events through each mutation handler, read them back through `fetchEstimateSheetVersionControl`, assert the `eventType` matches what the composer/dictionary/filter list expects.
2. **Filter-dropdown exhaustiveness test:** For each entry in `ACTIVITY_FILTER_EVENT_TYPES`, create an event of that type and assert the filter returns it.
3. **Bulk-delete restore test:** Create a bulk-delete event, open the activity modal, assert the restore button appears.
4. **Node-restore integration test:** Render `EstimateSheetContent` with a delete event, click restore, assert `restoreDeletedEstimateNodes` is called, tree updates, feed reloads.
5. **Restore error-branch tests:** Collision, empty snapshot, wrong event type, batch oversize.
6. **Read-only gating test:** Assert restore buttons don't render when `canEditEstimate` is false.
