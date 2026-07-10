# Implementation Plan

This is the sole canonical execution artifact. All units modify only this pack's
coordination artifacts unless they hand a delta packet to the separately leased
owner pack. Product/source changes are prohibited in this lane.

## Execution DAG

```text
UNIT-001 owner registry and dependency receipts [READY]
  -> UNIT-002 serialized Publisher/Activity delta handoff [PLANNED]
  -> UNIT-003 phase integration and maintainability receipts [PLANNED]
  -> UNIT-004 release evidence assembly and checker audit [PLANNED]
  -> UNIT-005 authorized external-Beta decision [BLOCKED]
```

Critical path: `UNIT-001 -> UNIT-002 -> UNIT-003 -> UNIT-004 -> UNIT-005`.
`SLICE-001` contains only `UNIT-001`; it is independently executable now.

## Lease and ownership protocol

- Program lead owns only `Beta-Readiness-Program/**`.
- Each capability lead owns its plan folder and named product paths.
- A dependency receipt includes pack path, manifest self-hash, status tuple,
  baseline SHA, validator command/result, freeze timestamp, and lead identity.
- First writer keeps a file lease. A conflicting lane stops and reports upward.
- The program never rewrites another pack. A circle-back delta is a handoff
  packet until that pack's owner accepts it.
- Re-read shared paths immediately before any accepted handoff edit.
- The program serializes provisional migration leases as Publisher `0050`,
  Activation `0051`, Estimate Intelligence `0052`, and Calculation Parity
  `0053`. Every writer must re-scan
  the migration tail and active ledgers immediately before its first edit; a
  collision invalidates and reissues every later slot.

## UNIT-001 - freeze registry and dependency receipts

Status: `READY`. Owner: program lead. Dependencies: none.

Goal: make backlog ownership and upstream state deterministic before any
cross-pack integration.

Actions:

1. Run an exact-once check over the owner table in `README.md` for
   `BETA-P0-01..10` and `BETA-P1-01..10`.
2. Read and validate every current owner-pack `plan-pack.json`.
3. Record manifest hash, tuple, lifecycle, next unit, dirty/frozen state, and
   file-scope owner in `LOOP_LEDGER.md`.
4. Mark Publisher and Activity unfrozen while their current agents are active.
5. Reject any implementation unit whose primary audit ID is owned elsewhere.

Commands and expected signals:

```bash
rg -o 'BETA-P[01]-[0-9]{2}' \
  .ai/03_plans/2026-07-10/Beta-Readiness-Program/README.md \
  | sort | uniq -c
# Expected: exactly 20 rows and every count is 1.

bun run validate:plan-pack -- \
  .ai/03_plans/2026-07-10/Beta-Readiness-Program
# Expected: validator success.
```

Postcondition: `AC-001` can pass and `UNIT-002` has explicit freeze preconditions.
Evidence destination: `VERIFICATION_ROLLOUT_AND_FINAL_AUDIT.md` plus ledger receipt.
Rollback: restore the prior registry artifact hash and invalidate dependent
receipts; no product rollback is possible because this unit is coordination-only.

## UNIT-002 - serialized Publisher and Activity delta handoff

Status: `PLANNED`. Owner: program lead with Publisher and Activity leads as
acceptors. Dependency: `UNIT-001`.

Precondition: both existing agents have completed their current turn, frozen
their packs, and supplied validator-clean manifest hashes. If only one freezes,
issue only its non-cross-dependent packet; `PUB-DELTA-02` waits for both.

Actions:

1. Compare current pack content to `PUB-DELTA-01..04` and `ACT-DELTA-01..02`.
2. Delete delta clauses already covered with equivalent accepted requirements;
   retain trace links rather than duplicate prose.
3. Hand packets to pack owners with exact requirement/unit/test/file ownership.
4. Require owner acknowledgement and updated manifest self-hash.
5. Keep both packs' implementation status truthful; a plan delta does not move
   `NOT_STARTED` to complete.

Expected signal: no overlapping write lease, both pack validators pass, and
Publisher traceability links Activity for follow-up primitives.
Failure signal: hash drift during handoff, conflicting migration/path ownership,
or any claim that current NOT_READY plans are implemented. Recovery: invalidate
the receipt, re-freeze, recompute the delta, and retry once ownership is stable.

## UNIT-003 - phase integration and P1-10 receipts

Status: `PLANNED`. Owner: program lead plus checker. Dependency: `UNIT-002`.

Actions:

1. Build phase receipts for Release Integrity, Hosted D1 Recovery, Activation,
   Calculation Parity, Estimate Intelligence, Beta Operations, and Client
   Handoff using audit slices at `:793-848`.
2. Verify every cross-pack milestone has a typed producer/consumer contract and
   one owner for failure semantics.
3. Collect each capability pack's contribution receipt for the program-owned
   `BETA-P1-10` gate: extracted, retained-with-characterization, or
   deferred-with-risk. Require caller map, regression owner, and exact file
   evidence; the capability pack is a receipt contributor, not a second backlog
   owner.
4. Confirm Activation produces cohort data while `Beta-Operating-Contract`
   owns dashboard presentation, telemetry governance, and operating response.
5. Confirm Publisher consumes Activity primitives without duplicating routes.

Expected signal: all non-release owner packs are validator-clean with current
receipts and no ambiguous ownership. Rollback: invalidate only the affected
phase receipt and keep independent phases available.

## UNIT-004 - assemble release evidence and independent final audit

Status: `PLANNED`. Owner: verifier distinct from capability makers. Dependency:
`UNIT-003`.

Actions:

1. Run every applicable local gate in
   `VERIFICATION_ROLLOUT_AND_FINAL_AUDIT.md`.
2. Read provider/hosted receipts; never substitute local mocks for them.
3. Map the 20 backlog IDs and release-gate rows at audit `:1000-1040` to fresh
   receipts, open risks, and rollback owners.
4. Re-run owner-pack validators, targeted tests, broad release checks, and
   evidence freshness checks from a frozen SHA.
5. Produce a checker verdict: `GO_CANDIDATE`, `NO_GO`, or
   `AUTHORIZATION_PENDING`. Any missing P0 proof is `NO_GO`.

Expected signal: all autonomous engineering gates pass and only `AUTH-001` and
`AUTH-002` remain. Rollback: mark the truth packet stale on any source/config/
provider drift and return to the earliest invalidated owner unit.

## UNIT-005 - authorized external-Beta decision

Status: `BLOCKED`. Owner: authorized repository/product/legal decision makers.
Dependency: `UNIT-004`. Boundaries: `AUTH-001`, `AUTH-002`.

The unit cannot be promoted until:

- hosted GitHub controls and passed-SHA deploy provenance are read back by an
  authorized administrator;
- limited-cohort Terms/Privacy/telemetry scope is explicitly approved; and
- the independent audit packet is current at the exact release SHA.

On authorization, record actors, scope, timestamps, artifact versions, commit
SHA, rollout cohort, rollback owner, and next review date. If either authority
declines or narrows scope, record `NO_GO` or the narrower allowed cohort. Do not
convert absence of a response into approval.

## Handoff and restart packet

At every unit boundary record:

- unit/status/owner and current pack self-hash;
- upstream receipts and their hashes;
- commands run with exit status and evidence paths;
- open risks/boundaries and the earliest invalidated dependency;
- exact next unit and first command;
- leases released or retained.

After interruption, re-run `supermemory:ensure`, read the FAST PATH in current
state, this file, the last ledger entry, and every receipt newer than baseline.
Resume only if hashes still match; otherwise return to `UNIT-001` reconciliation.
