# Unit 023 — Proposal Preview Signature Omits Contingency Fields (CONFIRMED, MED)

**Finding:** F-23 · **Original severity:** LOW · **Re-verdict (2026-07-19):** **CONFIRMED (narrowed → MED)** · **Status:** TODO (P3)
**Depends on:** nothing (the `laborUnitCost` part is dropped — labor was removed 2026-07-18)

## Problem

`createProposalPreviewSignature` builds the preview-cache signature from `item.itemCost`,
`editableRow.quantity`, `contingencyMode`, `contingencyPercentage`, `adjustmentPercentage`, and
`miscCost` — but omits `editableRow.quantityBase` and `editableRow.quantityContingencyAmount`.
Both fields are editable in the UI (`row-table.tsx:542-543` commits them via
`commitQuantityFields`; `buildEditableQuantityContingencyPatch` at `editable-row-model.ts:266`
edits base/contingency independently). When a user edits only the base/contingency breakdown in
a way that leaves the rolled-up `quantity` unchanged (e.g. `100+10=110` → `90+20=110`), the
signature string is identical → stale preview persists per `isProposalPreviewStale`.

## Original claim correction

The original also listed `laborUnitCost` as a missing signature input. **Moot** — labor was
ripped out of the codebase entirely on 2026-07-18 (unit 001). The `quantityBase` /
`quantityContingencyAmount` claim is the live one.

## Fix

Add the two fields to the signature parts array (`proposal-preview-model.ts:36-53`):

```ts
parts.push(
  item.itemCost,
  editableRow.quantity,
  editableRow.quantityBase,              // add
  editableRow.quantityContingencyAmount, // add
  editableRow.contingencyMode,
  editableRow.contingencyPercentage,
  editableRow.adjustmentPercentage,
  editableRow.miscCost,
);
```

## Acceptance

Changing `quantityBase`/`quantityContingencyAmount` invalidates the preview cache. Verified by
diff. Severity MED (user sees stale cost preview until another field perturbs the signature).
