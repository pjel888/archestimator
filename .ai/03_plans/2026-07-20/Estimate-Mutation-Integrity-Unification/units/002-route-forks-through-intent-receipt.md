# UNIT-002 — Route forks through prepareEstimateMutationIntent + receipt

## Goal

Route the forks that skip the intent/receipt/fingerprint flow
(`apply.ts`, `express-promotion-actions.ts`, `component-permanent-delete.ts`)
through the existing `prepareEstimateMutationIntent` +
`buildEstimateMutationReceiptStatement` primitives, so they gain idempotent
replay and request-fingerprint conflict detection.

## Status

`READY` · depends on: `UNIT-001`, Pack A UNIT-006 · requirement: `DATA-002` · risks: `RISK-002`

## Why this matters

The canonical mutation flow (in `rows.ts:1918`, `nodes.ts`, `tabs.ts`) calls
`prepareEstimateMutationIntent` to (a) verify access, (b) resolve context,
(c) compute a request fingerprint, and (d) read any committed receipt for
idempotent replay. If a replay is found, the mutation short-circuits and
returns the prior committed result. The receipt is then written with
`buildEstimateMutationReceiptStatement` so the NEXT replay finds it.

Three forks skip this entirely:

| Fork | Replay mechanism today | Conflict detection |
|------|------------------------|--------------------|
| `apply.ts` | local `readCommittedEstimateEvent` keys on the event row (not the receipt) | none — a changed request body silently re-applies |
| `express-promotion-actions.ts` | none | none |
| `component-permanent-delete.ts` | none | none |

Result: a retried AI apply with a different payload re-executes; an express
promotion retried after the user edited the row double-applies. The
`MutationIntentConflictError` ("This action changed after it was submitted")
that the canonical path raises on fingerprint mismatch never fires.

## Current state

The primitives to consume (from `src/lib/estimates/d1-intents/intent-context.ts`):

```ts
// Composed: access check + context + fingerprint + idempotent receipt read
export async function prepareEstimateMutationIntent<T>(
  database, actor, { projectId, estimateId, correlationId, commandKind, request }
): Promise<{ context: EstimateMutationIntentContext, committedResult: T | null }>

// Write the receipt after the mutation commits
export function buildEstimateMutationReceiptStatement(
  context, resourceType, resourceId, result, timestamp
): D1IntentStatement
```

The `request` parameter is the canonicalized-JSON input whose sha256 becomes
the fingerprint. `commandKind` is a stable string (e.g.
`"estimate.row.update"`, `"ai.package.apply"`) namespacing the receipt.

The canonical consumption pattern (`rows.ts:1918-1950`):

```ts
const { context, committedResult } = await prepareEstimateMutationIntent<ResultType>(
  database, actor, { projectId, estimateId, correlationId, commandKind: "estimate.row.update", request: rowPatch }
);
if (committedResult) return committedResult; // idempotent replay
// ... do the mutation ...
const receiptStatement = buildEstimateMutationReceiptStatement(context, "estimate_row", rowId, result, timestamp);
await runD1Batch(database, [...mutationStatements, receiptStatement, ...historyStatements]);
return result;
```

## Owned paths / resources

- `src/lib/ai/package-builder/apply.ts`
- `src/lib/estimates/express-promotion-actions.ts`
- `src/lib/component-library/component-permanent-delete.ts`

## Implementation boundary

For **each** fork:

1. Identify the mutation entrypoint(s) that need replay protection. Not every
   site does — a bulk delete keyed by a project-scoped predicate may not need
   per-row receipts. Apply judgment: if the user could retry the operation and
   get a different result, it needs a receipt.
2. Wrap the entrypoint with `prepareEstimateMutationIntent`. Pass the fork's
   existing `correlationId`/`commandKind` (or define a new `commandKind` like
   `"ai.package.apply"`, `"estimate.express.promote"`,
   `"library.component.permanent_delete"`).
3. If `committedResult` is non-null, return it (idempotent replay).
4. After the mutation, compose `buildEstimateMutationReceiptStatement` into
   the batch alongside the history statements (from UNIT-001).
5. **RISK-002 mitigation for `apply.ts`:** the existing local replay reader
   (`readCommittedEstimateEvent`) keys on the event row. After this change,
   the receipt is the authoritative replay key. DELETE the local replay reader
   and rely on `prepareEstimateMutationIntent`'s `committedResult`. The event
   row (from UNIT-001) still records that the mutation happened, but it is no
   longer the replay oracle.
6. Do NOT change the mutation SQL or the observable result shape.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Type-check | `bun run type-check` | exit 0 |
| Lint | `bun run lint` | exit 0 |
| Characterization | `bunx vitest run tests/vitest/estimate-d1-intents-rows-sql.test.tsx --maxWorkers=1` | passes |
| Receipt audit | `rg -n "prepareEstimateMutationIntent\|buildEstimateMutationReceiptStatement" src/lib/ai/package-builder/apply.ts src/lib/estimates/express-promotion-actions.ts src/lib/component-library/component-permanent-delete.ts` | each fork imports and calls both |

## Scope

**In scope:** the 3 forks above.

**Out of scope:**
- Forks that already consume the primitives (`template-instance-actions.ts`,
  `reusable-sources/actions.ts` — confirmed in trace).
- `template-lifecycle-actions.ts` (consumes fingerprint only, not full
  receipt — defer until UNIT-001 lands and revisit; it may need a
  lifecycle-scoped commandKind that doesn't fit the row-mutation model).
- The canonical paths.
- New tests (gate is `NOT_REQUIRED`; the characterization suite is the net).

## Done criteria

- [ ] `bun run type-check` exits 0
- [ ] `bun run lint` exits 0
- [ ] The 3 forks import and call `prepareEstimateMutationIntent` and
      `buildEstimateMutationReceiptStatement`
- [ ] `apply.ts`'s local `readCommittedEstimateEvent` replay reader is removed
      (the receipt is now the replay oracle)
- [ ] The characterization suite passes
- [ ] No mutation SQL or result shape changed

## Acceptance evidence

- The receipt audit shows both primitives imported in all 3 forks.
- `git diff` shows the entrypoints wrapped; the local replay reader in
  `apply.ts` deleted.

## STOP conditions

- A fork's entrypoint cannot supply a stable `request` object for
  fingerprinting (e.g. it accepts a stream or unstructured input). Surface it;
  the fingerprint requires canonicalizable JSON.
- A fork runs in a context without an actor (background job). Surface it; the
  intent primitive requires an actor — the fork may need a system-actor model
  (defer to a design decision, don't force-fit).
- The characterization suite fails — the wrapping changed canonical SQL.
  Revert and reconcile.

## Recovery

Each fork is independent. Revert and reconcile per fork.

## Maintenance notes

- After this unit, the 3 forks have idempotent replay and conflict detection.
- A reviewer should confirm the `commandKind` strings are stable and
  namespaced (they key the receipt table).
- The deleted `readCommittedEstimateEvent` in `apply.ts` is the load-bearing
  change — confirm no other caller imports it before deletion.
- UNIT-003 (revision guard) and UNIT-004 (access) build on the intent context
  this unit establishes.
