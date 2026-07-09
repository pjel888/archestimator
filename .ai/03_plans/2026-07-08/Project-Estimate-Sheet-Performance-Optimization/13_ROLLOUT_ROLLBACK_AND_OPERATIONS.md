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

## Hosted Proof Runbook (Pass-3 addition)

Concrete operational runbook for hosted D1 proof. Closes R24 mitigation (cleanup failure leaves seeded rows).

### Pre-conditions

- All env gates set: `CLOUDFLARE_D1_PROOF_ENABLED=1`, scoped `CLOUDFLARE_D1_PROOF_TOKEN`, `ARCH_DB` binding available.
- Hosted proof endpoint is secret-gated and rejects unauthenticated requests (REQ-R03).
- Working on the bound Cloudflare account/project only (per AGENTS.md cost posture).

### Phase A — Seed

1. Generate deterministic stress fixture locally (`perf:seed-fixture` style).
2. Sanitize fixture: replace any real customer-shaped data with synthetic IDs, costs, suppliers.
3. Tag every seeded row with `metadata.proof_fixture_prefix = 'estimate-sheet-perf-2026-07-09'` (date-stable, unique to this proof run).
4. Insert seeded rows via the hosted proof endpoint with `OP=seed`, capturing `seeded_count` to a local JSON.

### Phase B — Measure

1. Run the proof body (route/subtree/row-update/move/bulk-delete query shapes).
2. Capture per-query `EXPLAIN QUERY PLAN`, `rows_read`, `rows_written`, duration, index used.
3. Redact: hash all IDs, strip raw cookies/tokens/URLs, replace project names with `project-<n>`.
4. Write redacted JSON + Markdown to `evidence/hosted-estimate-sheet-d1-proof.{json,md}`.

### Phase C — Cleanup (mandatory, even if Phase B fails)

1. Run cleanup pass: `DELETE FROM estimate_row_items WHERE metadata_json LIKE '%proof_fixture_prefix%"estimate-sheet-perf-2026-07-09"%';`
2. Same for `estimate_nodes`, `estimate_tabs`, `estimates` (in dependency order: rows → nodes → tabs → estimates).
3. Capture `cleaned_count` per table.
4. **Fail-closed assertion**: for each table, `cleaned_count === seeded_count` must hold. If any mismatch:
   - Mark proof as FAILED in evidence.
   - Do not commit evidence artifacts.
   - Trigger ops incident (`ops:incident --dry-run` first).
   - Manual reconciliation required before retry.

### Phase D — Verify

1. Sanity query: `SELECT COUNT(*) FROM estimate_row_items WHERE metadata_json LIKE '%proof_fixture_prefix%"estimate-sheet-perf-2026-07-09"%';` → must return 0.
2. If non-zero, escalation per Phase C fail-closed.

### Out-of-band safeguards

- Use a dedicated fixture prefix per proof run (date-stamped). Never reuse a prefix across days.
- Cleanup runs even if Phase B aborts. Wrap Phase B in try/finally semantics.
- Hosted proof endpoint enforces proof mode timeout (recommended 5 min). On timeout, run cleanup.
- All hosted proof output is redacted. No raw env var values, bearer tokens, or cookies in artifacts.
- Hosted proof cost: estimate ~10k D1 rows written + ~50k rows read for stress tier. Confirm against doc 09 free-tier budget table before running.

### Rollback rehearsal (Pass-3 addition)

Each phase must publish a rollback rehearsal result before broad rollout. The rehearsal is:

1. With feature flag OFF, capture baseline metric (e.g., route median, edit p95).
2. Enable feature flag ON for a single test estimate (not all).
3. Capture metric.
4. Disable feature flag.
5. Capture metric. Must match baseline within tolerance.
6. If metric does not return to baseline, the flag is not safe to roll out broadly.

Rehearsal evidence goes in `evidence/rollback-rehearsal-<phase>.json`.

## Operator Monitoring Checklist (Pass-3 addition)

Daily / weekly operator checks during staged rollout:

- [ ] D1 rows read/day is below 50% of free-tier cap (per doc 09 budget).
- [ ] D1 rows written/day is below 50% of free-tier cap.
- [ ] D1 storage is below 50% of free-tier cap.
- [ ] Workers requests/day is below 60% of free-tier cap.
- [ ] No new severe local error logs (`logs:tail -- --error --last 20`).
- [ ] No operational incidents open (`ops:check-incidents`).
- [ ] Feature flag state matches expected rollout stage.
- [ ] Last 24h rollback rehearsal (if stage changed) is in evidence.

If any check fails, pause rollout, investigate, and document residual risk.

