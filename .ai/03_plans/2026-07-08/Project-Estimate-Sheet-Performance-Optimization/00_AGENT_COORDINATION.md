# 00 - Agent Coordination

## Leadership And Authority

The lead owns scope, integration, the canonical pack, validation, and the final claim. Workers receive one bounded `UNIT-*` packet from `IMPLEMENTATION_PLAN.md` and do not re-plan globally.

Execution authority order:

1. `AGENTS.md`
2. `plan-pack.json`
3. `IMPLEMENTATION_PLAN.md`
4. Supporting numbered documents

## Shared-Worktree Rules

- Stay on the current branch/worktree.
- Re-run `git status --short -- <owned paths>` immediately before editing.
- Never revert or overwrite existing unrelated changes.
- Report unexpected owned-path changes to the lead and integrate them deliberately.
- Only the lead edits `README.md`, `IMPLEMENTATION_PLAN.md`, `plan-pack.json`, `LOOP_LEDGER.md`, `package.json`, and the final evidence index.
- Browser and D1 evidence paths are unique per run/source/input hash; agents do not overwrite each other's receipts.

## Worker Packet

Every dispatch includes:

- goal/run ID and exact unit ID;
- role (`explore`, `executor`, `test-engineer`, `verifier`, `architect`, or `critic`);
- owned paths and forbidden shared paths;
- baseline HEAD plus owned-scope status/diff hashes;
- dependencies and activation predicate;
- commands, evidence path, exit/failure/cleanup/resume conditions;
- lease start, expiry, and release state.

Workers stay within the packet. Scope expansion, shared-file conflict, missing authority, or technical impasse is escalated to the lead.

## Safe Parallel Layers

- After `UNIT-001`, `UNIT-002` (browser/UX/interop) and `UNIT-003` (local D1/query proof) may run in parallel because their write scopes and evidence files are disjoint.
- After `UNIT-004`, `UNIT-005` (route/D1) and `UNIT-006` (client graph) may run in parallel when both are activated and their owned paths remain disjoint.
- `UNIT-007`, `UNIT-008`, `UNIT-009`, `UNIT-010`, and `UNIT-011` follow the dependency edges in the canonical DAG.

## Maker/Checker Separation

An independent checker grades a unit when practical. Reviewer identity is recorded as provenance and does not impose an arbitrary readiness cap. The checker verifies:

- source/input hashes match the evidence;
- owned paths stayed within scope;
- tests/metrics use the exact packet contract;
- failures were not hidden by retries, skips, or stale artifacts;
- cleanup and resume state are complete.

## Durable State

`LOOP_LEDGER.md` is the task-local durable ledger. It records leases, current unit, baseline hashes, evidence fingerprints, invalidations, failures, recovery, and final reviewer receipts.

The existing `.omx/ultragoal` runtime state belongs to an unrelated stale goal and must not be overwritten. Native goal/run `019f4a04-dc75-7222-8bd2-020b35b1e415` owns this planning repair.
