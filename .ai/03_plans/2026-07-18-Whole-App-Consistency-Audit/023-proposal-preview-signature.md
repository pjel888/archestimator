# Unit 023 — Proposal Preview Signature Omits Labor/Contingency Fields (LOW)

**Finding:** F-23 · **Severity:** LOW · **Priority:** P3 · **Effort:** S · **Risk:** LOW
**Requirement:** `REQ-011` (item) · **Status:** TODO · **Depends on:** 001 · **Test:** NOT_REQUIRED

## Problem

`createProposalPreviewSignature` builds the preview cache signature from
`item.itemCost`, `editableRow.quantity`, `contingencyMode`, `contingencyPercentage`,
`adjustmentPercentage`, and `miscCost` — but omits `item.laborUnitCost`,
`editableRow.quantityBase`, and `editableRow.quantityContingencyAmount`. The
preview cache won't invalidate when only labor rate or contingency base changes, so
a stale cached preview can sit next to a freshly computed export (which unit 001
ensures uses labor). This widens the perceived divergence from F-01.

## Evidence

`src/components/workshop/estimate-sheet/proposal-preview-model.ts:36-53` — signature
parts list (confirmed via the audit; re-read before editing).

## Fix Direction

Add the missing fields to the signature parts:

```ts
signatureParts.push(
  item.itemCost,
  item.laborUnitCost,                       // ← add
  editableRow.quantity,
  editableRow.quantityBase,                 // ← add
  editableRow.quantityContingencyAmount,    // ← add
  editableRow.contingencyMode,
  editableRow.contingencyPercentage,
  editableRow.adjustmentPercentage,
  editableRow.miscCost,
);
```

### Owned paths
- `src/components/workshop/estimate-sheet/proposal-preview-model.ts`

### Prohibited
- Do not change the signature hashing scheme — just the inputs.

## Acceptance Evidence

- `AC-001`: changing `laborUnitCost` invalidates the preview cache.

## Recovery

None needed.

## Notes

Land **after** unit 001 (which defines the canonical labor field). Otherwise the
signature references a field that may be renamed.
