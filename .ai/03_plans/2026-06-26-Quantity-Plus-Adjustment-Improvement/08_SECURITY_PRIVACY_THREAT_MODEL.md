# 08 — Security, Privacy, And Threat Model

## Threat Model

### Trust Boundaries

| Boundary | Trust level | Notes |
|---|---|---|
| QTY cell input | Untrusted | User input is free-form text and must be parsed strictly |
| Parsed row payload | Untrusted | Server action must revalidate numbers and totals |
| Server action to DB/RPC | Trusted after validation | Uses parameterized Supabase/RPC calls |
| `estimate_sheet_adjustments` table | Protected data | Requires explicit RLS plus action-level `canEditEstimate` |
| Realtime row-update broadcast | Untrusted | Client-originated collaboration hints are never authoritative |

## Attack Surface And Mitigations

### 1. Injection via QTY expression

**Vector**: User types HTML, JavaScript, exponent notation, commas, negative signs, or malformed expressions into the QTY text input.

**Severity**: Medium if invalid text is silently converted into a different number; low after strict parsing.

**Mitigation**:

- Strip whitespace only.
- Reject any remaining character outside digits, `.`, and `+`.
- Reject exponent notation, commas, negative signs, multiple `+`, missing operands, and non-finite values.
- Never evaluate the string.
- Never persist the raw expression.
- Render only normalized numeric values in React text nodes; do not introduce `dangerouslySetInnerHTML`.

Client parser shape:

```typescript
function parseQuantityExpression(input: string): QuantityExpressionResult {
  const compact = input.replace(/\s+/g, "");
  if (compact === "") return emptyQuantityExpression();
  if (/[^0-9.+]/.test(compact)) {
    return { isValid: false, error: "Use numbers and one + only" };
  }
  const parts = compact.split("+");
  if (parts.length > 2) return { isValid: false, error: "Use only one +" };
  if (parts.length === 2 && (parts[0] === "" || parts[1] === "")) {
    return { isValid: false, error: "Enter both base and contingency" };
  }
  // parse with Number(), then require Number.isFinite and >= 0
}
```

`+20` is invalid/incomplete. Use `0+20` when the base is intentionally zero.

### 2. Server-side numeric tampering

**Vector**: A malicious client bypasses the parser and sends inconsistent `quantity`, `quantityBase`, and `quantityContingencyAmount`.

**Severity**: High for estimate correctness.

**Mitigation**: The server action mirrors validation and computes authoritative quantity-mode totals.

```typescript
const MAX_QUANTITY = 9999999999.9999;

function validateQuantityFields(input: {
  quantity?: number | null;
  quantityBase?: number | null;
  quantityContingencyAmount?: number | null;
}) {
  const base = input.quantityBase;
  const addOn = input.quantityContingencyAmount;

  for (const [name, value] of Object.entries({ quantity: input.quantity, base, addOn })) {
    if (value != null && (!Number.isFinite(value) || value < 0 || value > MAX_QUANTITY)) {
      throw new Error(`${name} must be a finite non-negative quantity`);
    }
  }

  if (base == null && addOn != null) {
    throw new Error("quantityContingencyAmount requires quantityBase");
  }

  if (base != null) {
    const computedQuantity = base + (addOn ?? 0);
    if (input.quantity != null && Math.abs(input.quantity - computedQuantity) > 0.0001) {
      throw new Error("quantity must equal quantityBase + quantityContingencyAmount");
    }
    return { quantity: computedQuantity, quantityBase: base, quantityContingencyAmount: addOn ?? 0 };
  }

  return { quantity: input.quantity, quantityBase: null, quantityContingencyAmount: null };
}
```

### 3. SQL injection

**Vector**: New fields flow through `update_estimate_row_item_with_history` and `estimate_sheet_adjustments`.

**Severity**: Low after parameterization.

**Mitigation**:

- Use Supabase SDK/RPC parameters; do not concatenate SQL.
- Keep all new fields numeric or allow-listed enum values.
- Add DB `CHECK` constraints for numeric bounds and mode values.
- Add integration tests that invalid payloads fail before persistence.

### 4. Authorization bypass

**Vector**: A user edits a row or totals-area Adjustment for an estimate they cannot edit.

**Severity**: High.

**Mitigation**:

- `updateEstimateRowItem` remains gated by `canEditEstimate`.
- `updateEstimateSheetAdjustment` must call the same `canEditEstimate` authority check before upserting.
- `estimate_sheet_adjustments` has RLS for SELECT plus editor-only INSERT/UPDATE/DELETE.
- Tests must cover viewer and non-member denial for both row quantity fields and sheet adjustment persistence.

### 5. Realtime broadcast tampering

**Vector**: A malicious client broadcasts fake structured row updates.

**Severity**: Medium if trusted as persistence; low when treated as display-only.

**Mitigation**:

- Do not write broadcast payloads to the database.
- Validate `estimateId`, known `rowId`, optional revision/timestamp freshness, numeric bounds, and allowed field names.
- Treat accepted broadcast payloads as optimistic display state only.
- Refetch or ignore on mismatch.

### 6. XSS via chip or error display

**Vector**: Parser error strings or chip text render attacker-controlled input.

**Severity**: Low.

**Mitigation**:

- Error messages are fixed strings, not raw input echoes.
- Chip text is rebuilt from parsed numbers.
- React escaping is sufficient as long as no `dangerouslySetInnerHTML` is introduced.

## Privacy

No PII is introduced. Quantity bases, contingency amounts, and sheet adjustments are estimate data and follow existing estimate retention, sharing, and deletion rules.

## Secret Handling

No new secrets, API keys, or tokens are introduced.

## Logging Safety

The new fields are numeric estimate data. Log validation failures with field names and error codes, not raw user expressions. Activity/history records may include the normalized numeric diff.

## Required Security Tests

- Parser rejects malformed, negative, exponent, comma, HTML, and missing-operand inputs.
- Server action rejects invalid numeric payloads even if the client parser is bypassed.
- Server action rejects inconsistent `quantity` versus `quantityBase + quantityContingencyAmount`.
- Viewer and non-member users cannot update quantity fields.
- Viewer and non-member users cannot insert, update, or delete `estimate_sheet_adjustments`.
- Broadcast receiver ignores mismatched estimate IDs, unknown row IDs, stale revisions, and invalid numeric fields.
