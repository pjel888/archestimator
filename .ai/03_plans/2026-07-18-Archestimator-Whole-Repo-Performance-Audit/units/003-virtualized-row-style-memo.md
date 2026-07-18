# UNIT-003 — Virtualized Estimate-Row `style` Prop Rebuilt Per Render · PERF-FE-001

**Finding:** PERF-FE-001 · **Priority:** P2 · **Wave:** 1 (W1-2 / QW-3) · **Effort:** S · **Risk:** Low
**Roadmap item:** W1-2 · **Test decision:** `NOT_REQUIRED`
**local_implementation:** `NOT_STARTED` · **external_lifecycle:** `NOT_STARTED`

## Outcome

Visible virtual rows in `EstimateRowItemsTable` re-render only when their own
`item` or focus/selection state changes, not on every parent re-render (scroll,
focus change, selection change, `scrollMargin` update). Inline `style` object
identity stops churning.

## Affected surface

- `src/components/workshop/estimate-sheet/rows/row-table.tsx`
  - `:1309-1315` inline `style` object literal inside `virtualItems.map(...)`
  - `:307` `EstimateRowItemTableRow` is `memo()`'d with default shallow compare
  - `:619` second spread concern inside the row component
  - `:120-156` custom outer comparator (mitigates parent re-renders but does
    not protect the inner row)

## Dependencies

- None for the static change.
- **Extends existing `/improve` Plan 022** — that plan identified the same
  issue; this audit confirms it persists at HEAD and adds the inner-row memo
  gap. Pick exactly one pack to execute to avoid duplicate work; this unit
  owns the canonical fix.
- Full React-Profiler verification needs the browser gate (W0-7 baseline).

## Implementation intent

Smallest coherent change — pick option (1) or (2) from PERF-FE-001
"Recommendation"; (1) is preferred (single edit, lower risk):

1. **Preferred:** move the style object to a `useMemo` keyed on
   `[virtualRow.start, scrollMargin, virtualEnabled]` so the object identity is
   stable across parent re-renders when those inputs are unchanged.
2. **Alternative:** add a custom comparator to `EstimateRowItemTableRow`'s
   `memo` at `:307` that explicitly compares `style.transform` and the shallow
   style fields.

Constraints: preserve virtualization correctness; preserve the `style` semantic
(translateY, absolute positioning). Do not change the row's data flow.

## Expected evidence

Verification command from PERF-FE-001 "Verification":

```
# React Profiler with reportEstimateRowItemRender probe (already exists)
# during typing and scroll — count row renders before/after
```

Evidence class: `NOT_REQUIRED` for the static change (diff showing `useMemo`
around the style literal at `:1309-1315`, or a custom comparator at `:307`, is
the decisive non-test signal). React-Profiler quantitative proof of reduced
commit count is browser-gated and recorded as a follow-up (per the finding,
the magnitude is HYPOTHESIS until W0-7).

## Completion signal

`row-table.tsx:1309-1315` no longer constructs an inline object literal inside
the `virtualItems.map` callback un-memoized — either a `useMemo` wraps the
style construction, or `EstimateRowItemTableRow`'s `memo` has a custom
comparator covering `style.transform` and shallow fields.

## Recovery path

Not required (Risk: Low). Revert to the inline literal; behavior is identical
absent profiling, just slower.
