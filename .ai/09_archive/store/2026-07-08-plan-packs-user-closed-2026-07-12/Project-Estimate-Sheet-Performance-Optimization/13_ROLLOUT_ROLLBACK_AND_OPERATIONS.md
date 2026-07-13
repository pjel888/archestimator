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

The planned route contract resolves these server-only values and passes a typed mode snapshot to the client. They are deployment-scoped configuration, not live per-estimate flags. `NEXT_PUBLIC_*` values are not used for kill-switch claims because installed Next.js guidance says public values are inlined/frozen at build time.

`UNIT-001` creates the client-safe snapshot/all-off contract, server-only resolver, and mode context. Its planned `loadEstimatePerformanceModeSnapshot` reads the five keys from `(await getCloudflareContext({ async: true })).env`; injected input or `process.env` is the Node/test fallback. Missing values resolve silently to `off`; invalid values resolve to `off` with a redacted structured configuration error. The route resolves the immutable, versioned `EstimatePerformanceModeSnapshot` once, passes it unchanged into `EstimateWorkspaceClient`, and exposes only deterministic non-secret schema/source/mode metadata at the workspace root. This inert all-off wiring exists before UNIT-002; later activated units own behavior, not the bridge.

## Rollout Sequence

1. `off`: capture the post-edit legacy-path baseline from a fresh OpenNext build.
2. `shadow`: prove parity on deterministic fixtures and record cost without changing returned data or issuing a second write/rate reservation.
3. `on` in local/staging-like proof: run focused tests and browser/D1 budgets.
4. `rollback`: begin a delayed read plus an idempotent revision-guarded mutation under `on`, restart with the target mode `off`, then prove behavior in both the still-open old tab and a new tab.
5. `on`: collect the final integrated local proof.
6. Run direct remote D1 proof against the bound resource with Wrangler. This plan does not add a route or deploy the application to production.

`bun run perf:estimate:modes -- --unit=<unit> --target=<mode-key> --phases=off,shadow,on,rollback --final-state=on --fixture-role=mode` is the only single-target mode producer. It records the server-returned snapshot and process outcome for every phase and fails when a target or predecessor mode differs from the deterministic decision mapping. `UNIT-010` uses `--matrix=all-activated --final-state=all-activated --fixture-role=mode` to cover individual modes, pairwise activated combinations, all activated modes `on`, all modes `off` after rollback, then one fresh final all-activated preview.

For every phase, the producer atomically replaces the run-scoped mode-`0600` `runtime.env`, validates its owner/hash and exact allowlist, appends/fsyncs the role/phase/ordinal/PID/snapshot/port process entry before readiness, and starts a fresh OpenNext preview with Wrangler `--env-file <run>/runtime.env`. It stops/drains the exact process, records one exit-code/signal outcome, proves the port closed, and fsyncs that outcome before the next launch. After rollback it starts the explicit final state and leaves only that verified preview active. UNIT-005, UNIT-007, UNIT-008, UNIT-009, and UNIT-010 each run exactly one fixture-bound Playwright command against that preview to co-produce the fixed-scope local-browser artifact and E2E receipt; no second preview is launched and no browser namespace is reused. The allowlist is the Better Auth provider/secret/base/trusted-origin set plus exactly the five mode keys above; `ARCH_DB` remains the binding. Raw secrets never enter commands, logs, manifests, or evidence.

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
3. Scan `.ai/99_scratch/estimate-sheet-d1-proof/runs/`; list every unresolved run by redacted UUID/hash and refuse a new seed while any exists. Empty UUID directories lacking `cleanup.json` may be removed and parent-fsynced because the contract forbids seed dispatch before that file; a nonempty unknown directory fails closed.
4. Starting at durable `.ai/`, create each missing `99_scratch`, `estimate-sheet-d1-proof`, `runs`, and UUID directory separately, fsync the child, and fsync its parent before descending. Generate exact keys for the eleven tables. `cleanup.json` is the single lease and exact-ID journal: temp-write, file-fsync, rename in `CLEANUP_PREPARED`, and fsync the UUID directory before any seed. There is no second lease-file rename to orphan.
5. Project the run's reads/writes against the current Cloudflare free-tier limits; abort before seeding if the run would cross the pack's 50% safety threshold.

### Seed And Measure

1. Seed a run-scoped synthetic profile/workspace/project/sheet membership tenant, then only synthetic names, costs, suppliers, components, and image markers beneath it. Do not use an existing profile, project, or membership.
2. Record seeded counts per table, not a single aggregate count.
3. Measure route, tab tree, subtree, row update, move, bulk delete, and project-component fan-out shapes.
4. Capture normalized SQL hash, query/statement count, available D1 duration/rows metrics, and `EXPLAIN QUERY PLAN` without raw IDs or credentials.

### Cleanup In `finally`

1. Before dispatch, atomically replace/fsync `cleanup.json` and its parent directory in state `DELETE_DISPATCHED`; it retains exact keys, seeded counts, input/source hashes, and the prior state.
2. Delete exact recorded keys in row -> node -> tab -> sheet access -> sheet member -> estimate -> project member -> project -> workspace member -> workspace -> profile order in one generated SQL transaction. Persist/fsync `DELETE_ACKED` plus per-table deleted counts only when the Wrangler response is observed.
3. Query every exact ID/key set and require zero remaining matches. An acknowledged uninterrupted attempt also requires deleted count to equal seeded count independently for all eleven tables.
4. If deletion committed but its response/process was lost, `--cleanup-only --run-id=<uuid>` may use that fsynced manifest plus exact zero to classify cleanup `RECOVERED_ALREADY_ABSENT`; write `estimate-sheet-hosted-cleanup-recovery.v1` to the ignored UUID root, invalidate the interrupted producer/release artifact, and release that lease. If IDs remain, reissue the named run's exact idempotent transaction and recheck. Recovery never writes/projects `hosted-d1-proof.json` or turns the failed run into `PASS`.
5. Persist/fsync `CLEANUP_VERIFIED` and the redacted receipt before deleting the raw manifest. Unlink and fsync the parent directory only after an uninterrupted valid receipt or explicit invalidation of the failed producer.

Hosted proof is a no-deploy script contract. Each stage uses `bunx wrangler d1 execute ARCH_DB --remote --file <uuid-root>/<stage>.sql --json`; SQL files and IDs are generated internally from the UUID/profile, and no caller-supplied SQL, database, URL, or credential enters the report. Wrangler JSON metadata plus separate `EXPLAIN QUERY PLAN` results provide hosted provider evidence. No Worker route, bearer secret, request body, CSRF surface, or rate-limited endpoint is introduced.

Cleanup does not depend on a metadata-prefix predicate. Active schema uses `metadata_json` for rows/nodes and `metadata` for tabs/estimates, so a shared predicate would be invalid. A date-static prefix is also forbidden because concurrent runs could collide.

### Fail-Closed Recovery

- Any timeout, command failure, count mismatch, or remaining ID makes hosted proof `FAIL`.
- Do not start another seed while a cleanup manifest is unresolved.
- Re-run cleanup by exact IDs with `--cleanup-only --run-id=<uuid> --manifest-root=.ai/99_scratch/estimate-sheet-d1-proof/runs --receipt-output=<uuid-root>/hosted-cleanup-recovery.json`. Omission/unknown UUID fails without mutation; multiple unresolved runs are handled one explicitly named run at a time. Tests cover every root mkdir/fsync plus crash after seed before `DELETE_DISPATCHED`, response loss, and crash before receipt. If a runtime/provider failure needs operator tracking, use the redacted incident/debug path from `AGENTS.md`.
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

## Cleanup And Evidence Commit

For local-run units, each complete browser/D1/mode artifact finalizes before cleanup and therefore contains no final cleanup claim. Prepare seeds distinct `mode`, `browser`, and/or `d1` ID namespaces from one logical checkpoint; each mutating child records pre/post state and may not reuse another command's namespace. A `local-preview` cleanup persists/fsyncs `CLEANUP_PREPARED`, stops traffic, terminates/drains every live journaled preview, requires an exit/signal plus closed-port outcome for every launched process, and persists `PREVIEWS_STOPPED`; only then may it delete every role namespace and prove role/table zero counts. A `local-d1` cleanup has no process/port fields. Response-loss exact-zero recovery writes an invalidating `RECOVERED_ALREADY_ABSENT` receipt and cannot request `VERIFIED`. Uninterrupted cleanup writes/fsyncs the matching receipt and marks `CLEANUP_VERIFIED`/`awaiting_index`. Indexing recursively reopens the envelope, all `{role,schemaId,immutablePath,sha256}` children, separate browser/E2E receipts, command/mode receipts, and cleanup receipt, then stores their ordered `dependencySources[]`; deletion or mutation before commit fails. Failure retains the lease; index failure retains the cleaned run without reseeding. A UNIT-002 source-changing repair is different from operational resume: clean and invalidate the pre-repair browser manifest, finalize the exact refreeze receipt, replace the UNIT-001 cohort, and prepare a fresh browser run. Resuming the old manifest against new hashes is forbidden.

Producers write once under immutable `evidence/runtime/runs/<unit>/<run-key>/`; 13 fixed evidence names are current projections, while `evidence-index.json` is a current registry projected from a no-overwrite immutable snapshot. The registry lists only the 13 evidence projections; its own immutable path/hash lives in the journal and `plan-pack.json`. Starting from durable `evidence/`, every missing directory is child-fsynced then parent-fsynced. The exclusive transition journal stores immutable source hashes, every evidence/registry projection target, created directories, and `oldProjection:{exists,sha256,bytesBase64}`. Before the `plan-pack.json` commit point, recovery restores old bytes or unlinks a formerly absent projection and parent-fsyncs it, then prunes only journal-created empty directories deepest-first. After commit it recopies only verified immutable bytes and rebuilds manifest projection records, never inventing immutable bytes. First-transition tests fault every mkdir/fsync/temp/rename boundary. An unresolved journal blocks all work except `perf:estimate:index -- --recover`.
