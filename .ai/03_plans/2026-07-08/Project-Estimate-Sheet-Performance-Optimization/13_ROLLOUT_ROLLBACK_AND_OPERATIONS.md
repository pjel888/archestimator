# 13 - Rollout, Rollback, And Operations

`IMPLEMENTATION_PLAN.md` is the canonical execution authority. This document expands the operational contracts for `UNIT-005` through `UNIT-011`.

## Rollout Modes

Every evidence-activated optimized path uses a server-resolved deployment mode:

- `off`: current implementation is authoritative.
- `shadow`: execute/compare the optimized read or selector, record parity and cost, but return the current result.
- `on`: optimized path is authoritative; current path remains a rollback oracle during the plan lifecycle.

Planned mode names:

- `ESTIMATE_ROUTE_FAST_PATH_MODE`
- `ESTIMATE_GRAPH_MODE`
- `ESTIMATE_INCREMENTAL_DERIVATION_MODE`
- `ESTIMATE_ENTITY_PATCH_MODE`

The route resolves these server-only values and passes a typed mode snapshot to the client. They are deployment-scoped configuration, not live per-estimate flags. `NEXT_PUBLIC_*` values are not used for kill-switch claims because installed Next.js guidance says public values are inlined/frozen at build time.

## Rollout Sequence

1. `off`: capture the pre-change baseline on the current implementation.
2. `shadow`: prove parity on deterministic fixtures and record cost without changing returned data.
3. `on` in local/staging-like proof: run focused tests and browser/D1 budgets.
4. `off`: rehearse rollback through a configuration change and redeploy/restart; prove current behavior and data are unchanged.
5. `on`: collect the final integrated local proof.
6. Run hosted D1 proof against the bound resource. This plan does not deploy the application to production.

## Rollback Contract

- Route fast path falls back to `resolveEstimateTabRouteContext`'s current path.
- Additive proven indexes may remain; query selection returns to the prior statement shape.
- Graph selectors fall back to the nested-tree oracle.
- Incremental totals/selectors fall back to recursive current helpers.
- Entity inverse patches fall back to the current mutation/refetch recovery path.
- Rollback must not change persisted entity shape or discard confirmed writes.
- A rollback rehearsal passes only when post-rollback functional output matches the pre-change fixture and measured budgets return within the recorded tolerance. The evidence path is the owning unit's canonical JSON, not a separate ambiguous artifact family.

## Hosted Proof Data Contract

Hosted proof stays inside the D1 `ARCH_DB` binding named in `wrangler.jsonc` and under free-tier/bundled limits.

### Preflight

1. Confirm secret/proof env gates without printing values.
2. Confirm the Worker and D1 binding match `wrangler.jsonc`.
3. Generate a cryptographically unique run UUID.
4. Generate synthetic IDs for `estimates`, `estimate_tabs`, `estimate_nodes`, and `estimate_row_items` and store the exact arrays in an ignored temporary cleanup manifest.
5. Project the run's reads/writes against the current Cloudflare free-tier limits; abort before seeding if the run would cross the pack's 50% safety threshold.

### Seed And Measure

1. Seed only synthetic names, costs, suppliers, components, and image markers.
2. Record seeded counts per table, not a single aggregate count.
3. Measure route, tab tree, subtree, row update, move, bulk delete, and project-component fan-out shapes.
4. Capture normalized SQL hash, query/statement count, available D1 duration/rows metrics, and `EXPLAIN QUERY PLAN` without raw IDs or credentials.

### Cleanup In `finally`

1. Delete the exact recorded IDs in row -> node -> tab -> estimate order using the strongest supported transaction/batch boundary.
2. Compare deleted count to seeded count independently for every table.
3. Query every exact ID set and require zero remaining matches.
4. Delete the raw cleanup manifest only after all four zero-count checks pass.

Cleanup does not depend on a metadata-prefix predicate. Active schema uses `metadata_json` for rows/nodes and `metadata` for tabs/estimates, so a shared predicate would be invalid. A date-static prefix is also forbidden because concurrent runs could collide.

### Fail-Closed Recovery

- Any timeout, command failure, count mismatch, or remaining ID makes hosted proof `FAIL`.
- Do not start another seed while a cleanup manifest is unresolved.
- Re-run cleanup by exact IDs; if a runtime/provider failure needs operator tracking, use the redacted incident/debug path from `AGENTS.md`.
- Evidence stores run UUID, counts, hashes, and safe plan summaries only. It never stores cookies, bearer values, proof secrets, raw customer-shaped IDs, or sensitive URLs.

## Monitoring And Release Evaluation

Required signals for the proof/release evaluation:

- Route context duration, query/statement count, and rows read.
- Tab/subtree query count versus requested depth.
- Mounted branch/row counts.
- Event Timing, Long Animation Frame/long-task, edit, scroll, and search metrics.
- Graph entity/index counts and retained memory delta.
- Mutation rollback, revision-conflict, stale-broadcast, and fan-out counts.
- Current deployment mode snapshot.
- D1 daily read/write/storage projection against the current official free-tier limits.
- Error-handling gate result and any skipped proof with residual risk.

Alert/replan thresholds are the hard budgets in `IMPLEMENTATION_PLAN.md`; there are no undocumented exceptions. Production support/monitoring and deployment readiness require their own hosted evidence and are not claimed by this plan-only revision.
