# Export, XLSX, Print, And Browser Proof

## Review Boundary

This artifact reviews UNIT-005/006 against `REQ-004`, `UX-001`, `PERF-001`,
`AC-010` through `AC-013`, and `DEC-AUTO-006/007`. Execution sequencing remains
in `IMPLEMENTATION_PLAN.md`.

## Frozen Export Model

One export request captures an authorized saved revision, settings, currency,
calculation version, row order, scope, direct-cost basis, charge stages, and final
proposal total. Preview, workbook, and print consume that model or a typed adapter
that proves equivalent bytes/values. They do not independently query or calculate
money after capture.

Excluded rows appear only in the existing exclusions presentation, never in
priced totals. Unknown/mixed currency, stale revision, invalid calculation input,
and authorization failure return typed refusal before artifact allocation.

## Workbook Contract

| Layer | Required proof |
|---|---|
| Model | Exact fixture rows, ordering, bases, charges, currency, direct/final totals |
| Cell map | Stable expected sheet/range/cell ownership; no duplicate row or charge |
| Formula mode | Formulas reference valid ranges and have canonical cached results |
| Scalar mode | Same cached values written without formula drift |
| Recalculation | Automatic/full recalculation metadata present |
| Formatting | Dynamic currency format from canonical metadata; no PHP-only assumption |
| Native artifact | Generated buffer opens through current parser; ZIP/XML and readback agree |
| Customer text | Written as inert text; formula-like prefixes never become executable formulas |

A model-only test cannot pass `AC-011`. The proof producer records the sanitized
buffer hash, byte size, formula/scalar comparison, XML assertion digest, parser
readback, runtime versions, and fixture/diff hashes, then deletes the raw workbook.

## Print Lifecycle Contract

1. The screen/preview model is already green before print proof begins.
2. `beforeprint` mounts one synchronous print package from the captured model.
3. Print media contains every applicable included row/estimate exactly once with
   the same basis, total, currency, and semantic headings.
4. Receiver-only/interactivity chrome is hidden without removing required labels.
5. `afterprint`, cancellation, navigation, and test cleanup unmount temporary UI.
6. Repeated print events do not duplicate rows or leave a hidden persistent tree.

## Evidence Topology

- Unit/model/DOM tests prove model parity, workbook contract, text escaping,
  lifecycle state, and cleanup.
- Native buffer/XML/parser readback proves actual XLSX serialization.
- The single targeted browser test proves only real print media, browser event
  integration, focus/reflow, and chrome visibility.
- No screenshot, desktop spreadsheet certification, or hosted proof is claimed.

## Failure And Recovery

Generation errors send no successful download headers and expose no partial
buffer. Workbook mismatch reopens UNIT-005; print lifecycle/media mismatch reopens
UNIT-006. A stale export request must refetch or fail, never merge revisions.
Temporary ports, server, browser contexts, ZIP/XML extracts, and workbooks are
listed in the unit receipt and removed before handback.

