# UNIT-009 Execution Addendum

This addendum is the current execution source for `DATA-001`, `RISK-009`, `UNIT-009`, `AC-009`, and `TEST-009`. It narrows one classification ambiguity discovered during implementation preflight. Where this addendum conflicts with the `UNIT-009` section of `IMPLEMENTATION_PLAN.md`, this addendum controls; all other units and frozen receipts remain unchanged.

## DATA-001 / UNIT-009 — Category-Qualified Per-Asset Removal

**Status:** `READY`

Make removal eligibility independent per asset and return disjoint truthful claimed, blocked, and already-removed path sets without changing the final purge backstop.

### Exact change

1. Define `matched_assets` as rows that can enter exactly one public result category: active `pending`/`finalized` rows, `removed`/`deleted` rows, or rows whose purge state is no longer `active`.
2. Keep active `reserved` and failed rows outside that category-qualified match set. They retain the current outward `not_found` behavior; this unit does not invent another public status.
3. Correlate the reference predicate to the row being updated (`candidate.id = asset.id`) so one referenced candidate cannot block an unrelated free candidate.
4. Return six exact, globally disjoint arrays: `claimedAssetIds`/`claimedPaths`, `blockedAssetIds`/`blockedPaths`, and `alreadyRemovedAssetIds`/`alreadyRemovedPaths`. Use claimed > blocked > already removed as the deterministic deduplication priority.
5. After the atomic claim, classify only unmatched category-qualified rows in one diagnostic query. Exclude claimed IDs from that query.
6. Derive status deterministically: claimed-only is `claimed`; any claim plus blocked/already-removed is `partial`; zero claims plus any blocked is `referenced`; zero claims/blocked plus already-removed is `already_claimed`; zero category-qualified matches is `not_found`.
7. In all three DELETE routes, return `409` only for `referenced`, `404` only for `not_found`, and `200` otherwise. Always map `removedPaths` from `claimedPaths`; also return `blockedPaths` and `alreadyRemovedPaths` without substituting requested paths.
8. Do not change migrations, indexes, the cleanup job, storage deletion, claim delay, workspace/actor/surface/bucket scoping, or final reference protection.

### AC-009

Pass only when category-qualified assets are independently classified into disjoint sets, category-ineligible active assets preserve `not_found`, and every route reports only actually claimed paths as removed.

### TEST-009

Run:

```sh
bunx vitest run tests/vitest/upload-removal-claims.test.ts
```

The focused contract must cover mixed `[referenced, free, already removed]`, all-referenced, all-free, and zero-match inputs. It must also assert the category-qualified CTE, row-correlated reference guard, claimed-ID diagnostic exclusion, two statements for non-empty input, and absence of the old whole-set guard. Route response coverage remains static source evidence in this unit.

### RISK-009 mitigation

The fixed mitigation is the category-qualified matched set, row-correlated claim predicate, globally disjoint result arrays, unchanged cleanup-job backstop, and no migration.

### Completion evidence

- Fresh `TEST-009` passes.
- Scoped TypeScript/lint/static checks pass for the five owned paths.
- All three routes use the same status and result-set vocabulary.
- Static residue scans prove no route substitutes requested paths for `removedPaths`.
- `src/lib/uploads/cleanup-job.ts` and `migrations/` remain unchanged.
