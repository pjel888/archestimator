# Proposals Inbox — Implementation Plan

Status: `IMPLEMENTATION_READY / NOT_STARTED / NOT_EVALUATED / ACTIVE`.

This is the execution contract for `/workshop/proposals`. It merges the
2026-07-11 `Proposals-Feature` plan into the newer 2026-07-12 source audit.
The predecessor is archived only after this receipt and its unit mapping exist.

## Ordered slices

1. **Slice 1 — row resilience and decision typing:** execute A1+A2 together in
   `recipient-proposals-repository.ts`. Drop and log unmappable rows, preserve
   the result contract, and use the `"unknown"` decision sentinel.
2. **Slice 2 — response delivery status:** execute A3 in
   `src/lib/publication/d1-store.ts`; atomically write `delivery_status='responded'`
   when a recipient response is submitted.
3. **Slice 3 — bounded inbox signal:** execute A4 with `LIMIT 51`, a boolean
   `truncated` result, and a bounded UI notice. Do not add a count query or
   pagination in V1.
4. **Slice 4 — collection shell:** execute B1, then B2–B5. Retain the existing
   TanStack Query key, cache lifetime, focus refetch, and action contracts.
5. **Slice 5 — presentation:** execute B6+B7, then B8+B9. Extract shared
   proposal state helpers once; provide card and list modes only.
6. **Slice 6 — bounded follow-ups:** audit the XLSX contractor-name risk,
   expiry behavior, stale selectors, and reconciliation only after Slices 1–5.
   Do not duplicate completed publisher or shared-page work.

## V1 scope decisions

- No grouping, owner-side controls, new server actions, new D1 columns,
  immutable snapshots, or PDF work.
- `clientName` is optional and deferred unless a current implementation need
  proves it useful; do not widen the query merely to preserve an old plan item.
- Existing publisher/share work is treated as completed elsewhere; only current
  defects affecting this inbox remain in scope.

## Evidence and stop condition

No automated tests, builds, typechecks, or browser proof are authorized by this
planning task. Each code slice must apply the User Test Authorization Gate and
record any named `TEST_PROPOSAL` before running tests. This plan is complete
when every slice has either implementation evidence or an explicit, current
deferral in `LOOP_LEDGER.md` and the final reconciliation is recorded.
