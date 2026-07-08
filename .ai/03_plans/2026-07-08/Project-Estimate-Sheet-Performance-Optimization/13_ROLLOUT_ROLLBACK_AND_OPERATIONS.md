# 13 - Rollout, Rollback, And Operations

## Rollout Strategy

Use staged feature flags:

- `NEXT_PUBLIC_ESTIMATE_GRAPH_STORE_ENABLED`
- `NEXT_PUBLIC_ESTIMATE_INCREMENTAL_TOTALS_ENABLED`
- `NEXT_PUBLIC_ESTIMATE_SELECTOR_SEARCH_ENABLED`
- `NEXT_PUBLIC_ESTIMATE_SUBTREE_DEDUP_ENABLED`
- `NEXT_PUBLIC_ESTIMATE_ENTITY_PATCH_MUTATIONS_ENABLED`

Default:
- Off in first implementation PR unless the PR is proof-only.
- Enable in development/staging-like environments first.
- Enable one phase at a time.

## Rollback Strategy

Each phase must retain a fallback:

- Route fast path: fall back to existing route resolver.
- New D1 indexes: additive indexes can remain, but query path can fall back; destructive removal is not part of rollback.
- Graph store: fall back to nested `EstimateTreeNode[]`.
- Incremental totals: fall back to recursive `computeNodeTotals`.
- Selector search: fall back to current subtree filters.
- Entity patch mutations: fall back to current nested optimistic patch/refetch recovery.

## Operations

Local operations:
- Store artifacts under this pack's `evidence/` folder.
- Keep provider secrets out of artifacts.
- Use structured local logs only to investigate failures.

Hosted operations:
- Hosted D1 proof requires explicit env gates.
- Hosted proof must seed sanitized fixture data, run measured reads/writes, then clean up.
- Hosted proof fails if cleanup count mismatches seed count.
- Hosted proof output is redacted.

## Release Gates

Do not enable graph-backed implementation for users until:
- Existing estimate focused tests pass.
- New large-fixture DOM tests pass.
- Browser performance spec passes.
- D1 query proof passes.
- React Doctor passes after React changes.
- No severe local error logs are introduced during smoke testing.
- Rollback flags are documented and tested.

## Monitoring

Recommended metrics:
- Route context duration.
- Route context query count.
- D1 rows read per route/subtree query.
- Subtree fetch count and dedupe hit rate.
- Graph entity count.
- Mounted row/branch count.
- Edit duration.
- Search/filter transition duration.
- Long task count during sheet interactions.
- Mutation rollback count.
- Feature flag state.

## Incident Response

If performance regresses after rollout:

1. Disable the newest feature flag.
2. Capture route/browser/D1 artifact for regression case.
3. Check local/hosted logs for route/action failures.
4. Compare rows read and mounted DOM counts against baseline.
5. Re-enable only after a targeted fix and evidence update.

