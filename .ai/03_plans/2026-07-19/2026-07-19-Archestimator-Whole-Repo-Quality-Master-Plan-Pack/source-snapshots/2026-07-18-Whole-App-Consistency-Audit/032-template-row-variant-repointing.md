# Unit 032 (N-01) — Template-Row Variant Re-Pointing Gap (NEW, MED)

**Finding:** N-01 (discovered during F-02 re-verification) · **Severity:** MED · **Priority:** P3 · **Status:** TODO

## Problem

`listLinkedEstimateRowTargets` (`src/lib/component-library/component-mutation-d1.ts:485-511`)
scans only `estimate_row_items` when computing which rows reference a variant being removed. It
does **not** scan `estimate_template_row_items`. So when a Component variant is removed via
component update, *template-definition rows* whose `source_snapshot.priceOptionId` points at the
removed variant are neither re-pointed (via `removedPriceOptionReplacements`) nor blocked.

## Impact

This does NOT brick existing instances (those are guarded — see F-02 refutation). The gap
surfaces at the **next template-version publish**: propagation reads from the version snapshot,
and if the template-definition row still references the removed variant, the publish throws
`template_component_unavailable` with no clear remediation path for the operator. It's a
consistency gap between the component-mutation guard surface and the template-row surface.

## Evidence

- `component-mutation-d1.ts:485-511` — query targets `estimate_row_items` only.
- Contrast with the row guard at `:1576-1585` (`buildLinkedEstimateRowSyncPlans`) which demands
  a replacement for every referencing *estimate* row.
- `template-propagation-d1.ts:182-192` — the throw site that would surface the stale reference.

## Fix direction

Either:
1. Extend `listLinkedEstimateRowTargets` (or add a sibling `listLinkedTemplateRowTargets`) to
   also scan `estimate_template_row_items` and apply the same
   `removedPriceOptionReplacements` demand/block, OR
2. At publish time, if a template-definition row references a removed variant, surface a clear
   actionable error ("re-select a variant for row X in template Y") rather than a generic
   `template_component_unavailable`.

Option 1 is the consistent fix (matches the estimate-row guard). Verify the exact table/column
shape before implementing.

## Acceptance

After removing a variant that a template-definition row references, the mutation either re-points
the template row or blocks with a clear message — no silent stale reference that explodes at
publish.
