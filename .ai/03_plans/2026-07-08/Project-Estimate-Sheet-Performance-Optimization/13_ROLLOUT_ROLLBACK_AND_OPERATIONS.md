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
- `ESTIMATE_RENDER_BOUNDARY_MODE`
- `ESTIMATE_ENTITY_PATCH_MODE`

The route resolves these server-only values and passes a typed mode snapshot to the client. They are deployment-scoped configuration, not live per-estimate flags. `NEXT_PUBLIC_*` values are not used for kill-switch claims because installed Next.js guidance says public values are inlined/frozen at build time.

The shared resolver is `src/lib/estimates/estimate-performance-modes.server.ts`: `loadEstimatePerformanceModeSnapshot` reads the five keys from `(await getCloudflareContext({ async: true })).env`; injected input or `process.env` is the Node/test fallback. Missing values resolve silently to `off`; invalid values resolve to `off` with a redacted structured configuration error. The immutable, versioned `EstimatePerformanceModeSnapshot` includes its source revision and is the only value passed to client code.

## Rollout Sequence

1. `off`: capture the post-edit legacy-path baseline from a fresh OpenNext build.
2. `shadow`: prove parity on deterministic fixtures and record cost without changing returned data or issuing a second write/rate reservation.
3. `on` in local/staging-like proof: run focused tests and browser/D1 budgets.
4. `rollback`: begin a delayed read plus an idempotent revision-guarded mutation under `on`, restart with the target mode `off`, then prove behavior in both the still-open old tab and a new tab.
5. `on`: collect the final integrated local proof.
6. Run direct remote D1 proof against the bound resource with Wrangler. This plan does not add a route or deploy the application to production.

`bun run perf:estimate:modes -- --unit=<unit> --target=<mode-key> --phases=off,shadow,on,rollback` is the only per-unit mode producer. It records the server-returned mode snapshot for every phase and fails when a target or predecessor mode differs from the deterministic decision mapping. `UNIT-010` runs `--matrix=all-activated` to cover individual modes, pairwise activated combinations, all activated modes `on`, and all modes `off` after rollback.

## Rollback Contract

- Route fast path falls back to `resolveEstimateTabRouteContext`'s current path.
- Additive proven indexes may remain; query selection returns to the prior statement shape.
- Graph selectors fall back to the nested-tree oracle.
- Incremental totals/selectors fall back to recursive current helpers.
- Entity inverse patches fall back to the current mutation/refetch recovery path.
- Rollback must not change persisted entity shape or discard confirmed writes.
- An old/unknown client snapshot forces reload before another optimized action. A late read is discarded when its mode source revision no longer matches the active query key. An already accepted write completes once and is reconciled by operation ID plus monotonic revision; configuration rollback never pretends to cancel it.
- Mutation shadow mode computes candidate patches only on a cloned in-memory graph and performs exactly one legacy server write. Duplicate side effects or rate-limit reservations fail the unit.
- A rollback rehearsal passes only when post-rollback functional output matches the pre-change fixture and measured budgets return within the recorded tolerance. The evidence path is the owning unit's canonical JSON, not a separate ambiguous artifact family.

## Hosted Proof Data Contract

Hosted proof stays inside the D1 `ARCH_DB` binding named in `wrangler.jsonc` and under free-tier/bundled limits.

### Preflight

1. Run `bun run cf:check-wrangler-auth` and `bun run cf:check-provider-resources` without printing credentials.
2. Confirm the `ARCH_DB` binding and database ID match `wrangler.jsonc` exactly.
3. Refuse when any unresolved manifest exists under `.ai/99_scratch/estimate-sheet-d1-proof/runs/`, then atomically lease a cryptographically unique run UUID.
4. Generate synthetic exact keys for `profiles`, `workspaces`, `workspace_members`, `projects`, `project_members`, `estimates`, `estimate_sheet_access_settings`, `estimate_sheet_members`, `estimate_tabs`, `estimate_nodes`, and `estimate_row_items` in the UUID directory.
5. Project the run's reads/writes against the current Cloudflare free-tier limits; abort before seeding if the run would cross the pack's 50% safety threshold.

### Seed And Measure

1. Seed a run-scoped synthetic profile/workspace/project/sheet membership tenant, then only synthetic names, costs, suppliers, components, and image markers beneath it. Do not use an existing profile, project, or membership.
2. Record seeded counts per table, not a single aggregate count.
3. Measure route, tab tree, subtree, row update, move, bulk delete, and project-component fan-out shapes.
4. Capture normalized SQL hash, query/statement count, available D1 duration/rows metrics, and `EXPLAIN QUERY PLAN` without raw IDs or credentials.

### Cleanup In `finally`

1. Delete exact recorded keys in row -> node -> tab -> sheet access -> sheet member -> estimate -> project member -> project -> workspace member -> workspace -> profile order in one generated SQL transaction.
2. Compare deleted count to seeded count independently for all eleven tables.
3. Query every exact ID/key set and require zero remaining matches.
4. Delete the raw cleanup manifest only after all eleven zero-count checks pass.

Hosted proof is a no-deploy script contract. Each stage uses `bunx wrangler d1 execute ARCH_DB --remote --file <uuid-root>/<stage>.sql --json`; SQL files and IDs are generated internally from the UUID/profile, and no caller-supplied SQL, database, URL, or credential enters the report. Wrangler JSON metadata plus separate `EXPLAIN QUERY PLAN` results provide hosted provider evidence. No Worker route, bearer secret, request body, CSRF surface, or rate-limited endpoint is introduced.

Cleanup does not depend on a metadata-prefix predicate. Active schema uses `metadata_json` for rows/nodes and `metadata` for tabs/estimates, so a shared predicate would be invalid. A date-static prefix is also forbidden because concurrent runs could collide.

### Fail-Closed Recovery

- Any timeout, command failure, count mismatch, or remaining ID makes hosted proof `FAIL`.
- Do not start another seed while a cleanup manifest is unresolved.
- Re-run cleanup by exact IDs with `--cleanup-only --manifest-root=.ai/99_scratch/estimate-sheet-d1-proof/runs`; the command fails when zero or multiple unresolved manifests exist. If a runtime/provider failure needs operator tracking, use the redacted incident/debug path from `AGENTS.md`.
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
