# UNIT-017 — `useEstimateRowUpdateBroadcast` Is Dead Code (No Receive-Side Consumer) · PERF-FE-003

**Finding:** PERF-FE-003 · **Priority:** P3 · **Wave:** Deferred (per `07-OPTIMIZATION-ROADMAP.md` "Deferred") · **Effort:** XS (delete) / L (complete) · **Risk:** Low
**Roadmap item:** Deferred — "Realtime row-update broadcast wiring (PERF-FE-003) | L effort, product-not-required-yet. Delete the dead hook now if cleanup is preferred." · **Test decision:** `NOT_REQUIRED`
**local_implementation:** `NOT_STARTED` · **external_lifecycle:** `NOT_STARTED`

## Outcome

The dead `useEstimateRowUpdateBroadcast` module is **either** deleted from
the bundle (preferred cleanup, XS effort), **or** the receive side is wired
into `useEstimateRowMutations` for live multi-collaborator row updates (L
effort, product-gated). The choice is the owner's; the roadmap defers this
until realtime row updates are product-required.

## Affected surface

- `src/hooks/use-estimate-row-update-broadcast.ts`
  - `:77` exports `shouldApplyEstimateRowUpdateBroadcast`
  - `:91` exports `useEstimateRowUpdateBroadcast`
- No callers in `src/` (grep-confirmed per finding)

## Dependencies

- None for the delete option.
- The complete option depends on realtime row updates being product-required
  (deferred per roadmap).
- No AUTH_BOUNDARY items.

## Implementation intent

From PERF-FE-003 "Recommendation" (owner picks one):

**Option A — delete (preferred if cleanup is wanted, XS):**
- Remove `src/hooks/use-estimate-row-update-broadcast.ts`.
- Grep confirms no callers, so no other file changes.

**Option B — complete (L effort, defer unless product-required):**
- Wire the receive side into `useEstimateRowMutations` for live
  multi-collaborator row updates.
- Requires a characterization of the broadcast protocol and a product
  decision that realtime row updates are in scope.

Do not pick option B until product prompts. Option A is the safe default.

## Expected evidence

Verification command from PERF-FE-003 "Verification":

```
# Option A: grep for callers after change — returns zero
grep -rn 'useEstimateRowUpdateBroadcast\|shouldApplyEstimateRowUpdateBroadcast' src/
# Option B: grep finds the new consumer in useEstimateRowMutations
```

Evidence class: `NOT_REQUIRED` (the grep returning zero hits after deletion,
or the new consumer after completion, is the decisive non-test signal).

## Completion signal

**Option A:** `src/hooks/use-estimate-row-update-broadcast.ts` no longer
exists; `grep -rn 'useEstimateRowUpdateBroadcast' src/` returns zero hits.

**Option B:** the hook has at least one consumer in
`useEstimateRowMutations` and the realtime row-update path is observable.

## Recovery path

Not required (Risk: Low). Option A: restore the file from git history if a
caller surfaces (unlikely — grep confirmed none). Option B: revert the wiring;
the hook returns to dead-but-exported state.
