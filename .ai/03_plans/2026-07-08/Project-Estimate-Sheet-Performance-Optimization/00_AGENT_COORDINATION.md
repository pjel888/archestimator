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
- Producers write unique immutable paths under `evidence/runtime/runs/<unit>/<run-key>/`; the 14 stable names are index-owned current projections. Agents never write projections or overwrite run artifacts.

## Worker Packet

Every dispatch includes:

- goal/run ID and exact unit ID;
- role (`explore`, `executor`, `test-engineer`, `verifier`, `architect`, or `critic`);
- owned paths and forbidden shared paths;
- pre-UNIT-001 planning-admission HEAD/status/diff receipt when applicable, plus current application and producer content fingerprints. `UNIT-001` verifies the planning receipt before its first edit, then the typed/reference helpers must match current dual output; later packets receive the predecessor output digest rather than the historical planning hash;
- dependencies and activation predicate;
- commands, evidence path, exit/failure/cleanup/resume conditions;
- lease start, expiry, and release state.

Workers stay within the packet. Scope expansion, shared-file conflict, missing authority, or technical impasse is escalated to the lead.

## Safe Parallel Layers

- No maker units run in parallel. `UNIT-001` creates the complete shared evaluator/E2E/D1/decision/hosted/release producer surface and all package entries before measuring; Units 002-004 execute that frozen cohort without producer edits. Activated Units 005-009 may add only packet-owned product regression tests and must record application and producer before/after deltas; every admission matches both predecessor outputs. Units 010-011 change neither scope and share the final dual identity.
- Maker/checker roles remain separate within each unit, and read-only reviewers may work concurrently only against one frozen candidate. `UNIT-005` through `UNIT-011` also stay serialized because source ownership and shared `.next`/`.open-next` outputs feed source/build evidence hashes.

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
