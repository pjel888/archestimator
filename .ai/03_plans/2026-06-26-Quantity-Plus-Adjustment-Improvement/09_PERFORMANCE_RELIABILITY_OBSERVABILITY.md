# 09 — Performance, Reliability, And Observability

## Performance

### Performance budgets
| Budget | Target | Measurement |
|---|---|---|
| Parser single invocation | <0.1ms | `performance.now()` microbenchmark in unit test |
| Parser 1000-row bulk parse | <100ms total | `performance.now()` over 1000 invocations |
| QTY cell re-render (single row) | <16ms (1 frame) | React profiler / React DevTools |
| Full sheet re-render (100 rows) | <200ms | React profiler |
| QTY expression commit → DB persist | <300ms p95 | Server action latency |
| Realtime broadcast receive → UI update | <50ms | `Date.now()` delta on receiving client |

### Parser cost
`parseQuantityExpression()` is a pure string operation: whitespace normalization, one invalid-character check, one `split`, and up to two `Number()` calls followed by finite/non-negative validation. <0.1ms per parse. For a 1000-row estimate sheet, worst-case initial parse is <100ms. Per-edit: <0.1ms (single row).

Benchmark test (add to parser test file):
```
it("executes <0.1ms for typical input", () => {
  const start = performance.now();
  for (let i = 0; i < 1000; i++) parseQuantityExpression("100." + i + "+" + (i % 50));
  const elapsed = performance.now() - start;
  expect(elapsed / 1000).toBeLessThan(0.1);
});
```

### Memory impact
- New `EditableRowValue` fields: 3 additional string properties per row (~180 bytes per row)
- `FlattenedEstimateRow` fields: 2 additional `number?` properties per row (~16 bytes)
- 1000-row estimate: ~200KB additional memory — negligible
- No new component mounts (chip reuses existing `Chip`); no new JS module singletons

### Rerender scope
`EstimateRowItemTableRow` is `memo`-wrapped with a custom comparator. Adding fields to `EditableRowValue` does not change memoization — the comparator checks `prev.editableRows[item.id] !== next.editableRows[item.id]`. Only the edited row re-renders.

### Virtualization
Existing `@tanstack/react-virtual` covers row table. Chip renders inside virtualized rows.

### DB query impact
No new queries. New columns are fetched via existing SELECT. Migration adds ~16 bytes per row.

### Bundle size
No new dependencies. Parser is ~40 lines of vanilla TS. Chip reuses existing `Chip`. Net increase: <1KB gzipped.

## Reliability

| Failure | Impact | Recovery |
|---|---|---|
| Parser rejects valid expression | Stuck in edit mode | Escape reverts to previous value |
| Parser accepts invalid expression | Bad data committed | Server-side validation rejects inconsistent, non-finite, negative, or out-of-range values |
| DB write fails | Optimistic rollback | TanStack Query `onError` → `restore()` → toast |
| Broadcast drops structured fields | Other clients stale | Ignore malformed broadcast; next server fetch corrects local state |
| Concurrent edits (two users) | Last write wins | Existing optimistic mutation pattern; next fetch authoritative |

### Graceful degradation
- `quantityBase` NULL → legacy mode, no chip
- `quantityContingencyAmount` NULL but `quantityBase` set → zero contingency
- Parser module fails to load → keep the cell in legacy single-number mode and block quantity expression commits until the module is available

## Observability

- No new logging endpoints. Existing `estimate_sheet_events` table captures row-level diffs.
- Parser errors surfaced as inline validation chips.
- Server-side validation errors go to existing error paths.

## Feature flag
Optional: `NEXT_PUBLIC_QTY_EXPRESSION_ENABLED`. Default `true` for initial implementation (user explicitly requested). Add flag only if phased rollout needed.

## Rollback
Code rollback: revert commit. New columns are nullable — reverted code ignores them.
Data rollback (only with fresh approval and backup): fold `quantityBase + quantityContingencyAmount` into `quantity`, then remove additive objects. Normal recovery is code rollback, feature flag disablement, or fix-forward with the nullable columns/table left in place.
