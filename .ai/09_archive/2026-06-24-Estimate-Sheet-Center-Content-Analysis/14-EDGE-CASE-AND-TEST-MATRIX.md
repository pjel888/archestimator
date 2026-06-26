# 14 — Edge Case and Test Matrix

## State-transition combinations (most likely to expose bugs)

| # | Combination | Risk | Existing test |
|---|-------------|------|---------------|
| 1 | Edit then immediately delete row | rollback conflict | none |
| 2 | Edit then immediately replace row | rollback conflict | none |
| 3 | Edit then immediately detach | rollback conflict | none |
| 4 | Edit then immediately promote | save-state guard at l. 2896-2899 | none |
| 5 | Edit then switch tabs | per-tab cache isolation; SAFE | implicit |
| 6 | Edit then change selected area | editableRows persists; reconciliation on remount | none |
| 7 | Edit during project source insert | **ESC-P0-02** — newer edit overwritten | **none — required** |
| 8 | Add blank row then switch tabs | per-tab cache; SAFE | none |
| 9 | Delete failed express draft while insert in flight | orphan server row (P2) | none |
| 10 | Replace while trust review is open | **ESC-P1-05** — stale target | **none — required** |
| 11 | Change selection while trust review open | **ESC-P1-05** | **none — required** |
| 12 | Drop twice rapidly on same cell | per-row queue serializes; SAFE | none |
| 13 | Enter then blur on cell | guard at row-table.tsx:358; SAFE | `estimate-sheet-cost-inputs.test.tsx:604-633` |
| 14 | Save two fields rapidly | per-row queue; SAFE | none |
| 15 | Save two different rows rapidly | independent queues; per-row toast risk **ESC-P1-04** | **none — required** |
| 16 | Delete several rows rapidly | **ESC-P1-03** — non-atomic | **none — required** |
| 17 | Move component while target saving | per-row queue on target serializes; SAFE | none |
| 18 | Move component while source saving | per-row queue on source serializes; SAFE | none |
| 19 | Search while dragging | drag-state store + memoized filter; SAFE | none |
| 20 | Filter while dragging | same | none |
| 21 | Collapse target during drag | drop-zones conditional render; SAFE | none |
| 22 | Tab spring-load during drag | tab strip logic; SAFE | `estimate-tab-strip.test.tsx:245-269` |
| 23 | Drop immediately after tab switch | selectedNode may resolve async; risk | none |
| 24 | Row becomes virtualized while focused | express editor virtualization kill-switch; ESC-P1-06 | none |
| 25 | Column resize while dragging component | independent pointers; SAFE | none |
| 26 | Open row details during save | reads editableRows; OK | none |
| 27 | Export while edits are dirty | **ESC-P3-18** — preview includes drafts | none |
| 28 | Remote delete during local edit | 409 on local save; refetch fires | none |
| 29 | Permission removed while mounted | optimistic UI then server reject; ESC-P1-07 | none |
| 30 | **Move component partial failure** | **ESC-P0-01** | **none — required** |
| 31 | **Project source insert race** | **ESC-P0-02** | **none — required** |
| 32 | Bulk delete partial failure | **ESC-P1-03** | **none — required** |
| 33 | Trust gate opens; user opens second trust gate | first is overwritten silently (one gate at a time) | none |
| 34 | Library source updated between browse and insert | server re-reads via `assertCurrentLibrarySourceForEstimateCommit`; SAFE | none |
| 35 | Library source archived between browse and insert | same; SAFE | none |

## Failure injection matrix

For each row mutation, simulate:

| Failure | Insert | Update | Replace | Delete | Detach | Promote | Move (target) | Move (source) | Bulk delete (1 of N) |
|---------|--------|--------|---------|--------|--------|---------|---------------|---------------|----------------------|
| 400 validation | n/a (validated client) | tested | tested | n/a | n/a | n/a | n/a | n/a | n/a |
| 401 unauthorized | server rejects; client never sees | same | same | same | same | same | same | same | same |
| 403 forbidden (RLS) | optimistic + rollback + toast | same | same | same | same | same | **partial: target ok, source 403** | same | **partial: M of N fail** |
| 404 row gone | n/a | server handles | server handles | idempotent | server handles | server handles | n/a | n/a | n/a |
| 409 revision conflict | refetch + user reviews | tested pattern | same | idempotent | same | same | **partial: target 409, source ok** | same | **per-row 409** |
| 422 express | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| 500 server | rollback + toast | same | same | same | same | same | **partial** | same | **partial** |
| 503 slow | per-row queue; eventual | same | same | same | same | same | **partial if other succeeds** | same | **partial** |
| Timeout | retry available for express | manual retry via re-edit | same | n/a | same | same | **partial** | same | **partial** |
| Duplicate submission (same mutationId) | server dedups via correlation_id | same | same | same | same | same | **two mutations on different queues** | same | **N independent** |
| Reverse response order | operation-id guard | operation-id guard | n/a (no onMutate) | n/a | revision gate | n/a | **two independent queues, no guard** | same | **N independent queues** |
| Server success after local rollback | `patchEstimateRowItemInTree` no-ops if row removed; **orphan** | same risk | same | n/a | same | same | same | same | same |
| Network offline | retry | re-edit | same | re-attempt | same | same | **partial** | same | **partial** |
| Component unmount during mutation | React Query retains cache; mutation resolves; refetch on remount | same | same | same | same | same | **partial** | same | **partial** |

## Reverse-order response testing

Critical for ESC-P0-01 and ESC-P1-03. Pattern:

```ts
// Mock both calls; resolve in reverse order
const targetCall = mockReplaceEstimateRowItem
  .mockResolvedValueOnce(targetResult);
const sourceCall = mockReplaceEstimateRowItem
  .mockResolvedValueOnce(sourceResult);
// Fire moveRowComponent; assert both calls happen
// Manually resolve source first, then target
```

## Non-default tab coverage

| Scenario | Test exists? |
|----------|--------------|
| Insert row into non-default tab | none — needed |
| Update row in non-default tab | none — needed |
| Delete row in non-default tab | none — needed |
| Replace row in non-default tab | implicit in template-insert tests |
| Move component within non-default tab | none — needed |
| Move component across tabs | not supported (center sheet prevents via per-tab cache keys; cross-tab move not in UI) |
| Template insert into non-default tab | none — needed |
| Project source insert into non-default tab | none — needed |
| Bulk delete in non-default tab | none — needed |
| Tab switch while row mutation in flight | none — needed |
| Late response from previous tab | none — needed (query-key isolation should make this safe, but untested) |

## Virtualization tests

| Scenario | Test exists? |
|----------|--------------|
| 75-row area with virtualization on | none |
| 1000-row area scroll perf | none |
| Inline editor pinned when virtualized | none — **needed for ESC-P1-06** |
| Branch virtualization measures during drag | none — **needed for H19** |
| Column resize while virtualized | none |
| Cell focus restoration after virtualization unmounts | none — **needed for ESC-P2-15** |

## Keyboard / screen reader tests

| Scenario | Test exists? |
|----------|--------------|
| Tab navigation across cells | implicit |
| Arrow navigation across cells | `estimate-sheet-cost-inputs.test.tsx:619-633` |
| Enter commits | same |
| Escape reverts | none — needed for express editor |
| Screen reader announces selected rows | none — **needed for ESC-P2-12** |
| Screen reader announces save state | none — **needed for ESC-P1-04** |
| Reduced motion respected | `estimate-tab-strip.test.tsx:555-593` (tab strip only) |

## Large-data tests

| Workload | Test exists? |
|----------|--------------|
| 0 rows | implicit |
| 1 row | many |
| 10 rows | implicit |
| 75 rows (virtualization threshold) | none |
| 100 rows | none |
| 1000 rows | none |
| 10000 rows | none |
| 1 area | many |
| 80 areas (virtualization threshold) | none |
| 500 areas | none |
| Depth 1 | many |
| Depth 10 | none |
| Depth 50 | none |

## Coverage summary

**Of the 40 audit hypotheses** (spec §28):
- H1-H40 — see `15-PRIORITIZED-FINDINGS.md` and per-finding evidence.

**Of the 35 state-combo scenarios above:**
- 9 have existing tests.
- 26 need new tests.

**Of the 14 failure-injection combinations × 12 row operations (168 cells):**
- ~6 cells are covered by existing tests.
- The remaining ~162 are gaps.

**Recommendation:** Phase 6 of `16-IMPLEMENTATION-PLAN.md` prioritizes the highest-risk gaps (atomicity, stale-response, virtualization, a11y).
