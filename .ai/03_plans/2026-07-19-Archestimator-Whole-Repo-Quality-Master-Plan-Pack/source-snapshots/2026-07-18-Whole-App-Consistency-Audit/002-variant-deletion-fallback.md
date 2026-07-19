# Unit 002 — Variant Deletion Bricking Propagation (REFUTED)

**Finding:** F-02 · **Original severity:** HIGH · **Re-verdict (2026-07-19):** **REFUTED** · **Status:** REJECTED

## Original claim

`selectedVariantId` deletion throws `template_component_unavailable` (non-retryable) during
linked-Template propagation, bricking ALL instances until a manual re-select.

## Why it's refuted (reachability)

The triggering state — "a variant is deleted/inactivated while a Template row still references
it as `selectedVariantId`" — **cannot occur via the canonical delete flow**, because deletion
is guarded upstream:

- `src/lib/component-library/component-mutation-d1.ts:1576-1585` (`buildLinkedEstimateRowSyncPlans`):
  when a variant is removed, the code demands a `removedPriceOptionReplacements[previousSelectedId]`
  mapping for every row still using it. If missing, it throws
  *"Variant X is still used by an estimate row. Choose an explicit replacement before deleting it."*
  The variant is never removed while a live row references it.
- `component-permanent-delete.ts` blocks permanent delete entirely if template rows still
  reference the component (`hasTemplateRows` flag surfaced at line 2199).
- The deactivation `UPDATE ... is_active=0` (line 2028) only runs after `removedPriceOptionIds`
  is computed from rows already migrated to replacements.

So the throw in `template-propagation-d1.ts:182-192` is correct **defensive** code for a state
the rest of the system prevents from arising. The "bricking ALL instances" severity was wrong.

## Narrow residual gap (filed as N-01, unit 032)

`listLinkedEstimateRowTargets` (`component-mutation-d1.ts:485-511`) scans only
`estimate_row_items`, not `estimate_template_row_items`. So a variant could theoretically be
removed while an **unpublished Template definition row** references it (the template-row
`source_snapshot` isn't re-pointed). That surfaces at the next template-version publish as
`template_component_unavailable` — a consistency gap, NOT an instance-bricking bug, and tracked
separately as N-01. This unit (F-02) itself needs no change.

## Disposition

**REJECTED.** No code change. Kept in the register so the claim isn't re-raised.
