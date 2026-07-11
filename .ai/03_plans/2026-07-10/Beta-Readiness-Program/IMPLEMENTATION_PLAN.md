# Implementation Plan

This is the sole canonical execution artifact. All units modify only this pack's
coordination artifacts. Separately leased owner packs consume delta receipts;
product/source changes are prohibited in this lane.

## Execution DAG

```text
UNIT-001 owner registry and dependency receipts [READY]
  -> UNIT-002 serialized Publisher/Activity integration deltas [PLANNED]
  -> UNIT-003 phase integration and maintainability receipts [PLANNED]
  -> UNIT-004 release evidence assembly and checker audit [PLANNED]
  -> UNIT-005 authorized external-Beta decision [BLOCKED]
```

Critical path: `UNIT-001 -> UNIT-002 -> UNIT-003 -> UNIT-004 -> UNIT-005`.
`SLICE-001` contains only `UNIT-001`; it is independently executable now.

## Lease and ownership protocol

- Program lead owns only `Beta-Readiness-Program/**`.
- Each capability lead owns its plan folder and named product paths.
- A dependency receipt includes pack path/package ID, manifest and manifest-self
  hashes, artifact-set and scoped-diff hashes, status tuple, baseline SHA,
  exported contract versions, validator command/result, observation timestamp,
  and canonical receipt hash.
- First writer keeps a file lease. A conflicting lane stops and reports upward.
- The program never rewrites another pack. A delta is integrated only when the
  target receipt lists its delta ID and all content hashes recheck.
- Re-read shared paths immediately before any integration edit.
- The program maintains one durable aggregate generation receipt for Publisher `0055`,
  Activation `0056`, Estimate Intelligence `0057`, and Calculation Parity
  `0058`, plus Activity History `0059`. Every writer consumes the current generation/hash before its first
  edit. Consumption, collision, or tail/manifest drift stales the generation;
  Program preserves consumed facts and reissues all unconsumed allocations.

## UNIT-001 - pin registry, dependency receipts, and migration generation

Status: `READY`. Owner: program lead. Dependencies: none.

Goal: make backlog ownership and upstream state deterministic before any
cross-pack integration.

Actions:

1. Run an exact-once check over the owner table in `README.md` for
   `BETA-P0-01..10` and `BETA-P1-01..10`.
2. Read and validate every current owner-pack `plan-pack.json`.
3. Record manifest/artifact/diff hashes, tuple, lifecycle, next unit, validator
   result, and file-scope owner in `LOOP_LEDGER.md`.
4. Accept Publisher or Activity integration only when the scoped diff hash is
   identical before and after validation and every receipt hash rechecks.
5. Validate and, after any consumption or drift, reissue the durable
   `MIGRATION_LEASE_GENERATION.json` 0055..0059 receipt. Include monotonic
   generation, sorted migration-tail hash, five owner package IDs and manifest
   file/self hashes, allocation rows/hash, and canonical receipt hash; omit the
   Program manifest digest so the artifact has no hash cycle.
6. Reject any implementation unit whose primary audit ID is owned elsewhere.

Commands and expected signals:

```bash
awk '/^\| `BETA-P0-01`/{inside=1} inside{print} /^\| `BETA-P1-10`/{exit}' \
  .ai/03_plans/2026-07-10/Beta-Readiness-Program/README.md \
  | rg -o 'BETA-P[01]-[0-9]{2}' | sort | uniq -c
# Expected: exactly 20 rows and every count is 1.

find migrations -maxdepth 1 -type f -name '*.sql' -print \
  | LC_ALL=C sort \
  | while IFS= read -r path; do shasum -a 256 "$path"; done \
  | shasum -a 256
shasum -a 256 \
  .ai/03_plans/2026-07-10/Publisher-And-Shared-Pages/plan-pack.json \
  .ai/03_plans/2026-07-10/First-User-Activation-And-Cohort-Operations/plan-pack.json \
  .ai/03_plans/2026-07-10/Estimate-Intelligence-And-Price-Governance/plan-pack.json \
  .ai/03_plans/2026-07-10/Calculation-And-Output-Parity/plan-pack.json \
  .ai/03_plans/2026-07-10/Activity-History-Mapping/plan-pack.json
RECEIPT=".ai/03_plans/2026-07-10/Beta-Readiness-Program/MIGRATION_LEASE_GENERATION.json"
jq -S -c 'del(.receipt_sha256)' "$RECEIPT" | tr -d '\n' | shasum -a 256
# Expected: recorded hashes equal the receipt and all five slots are unique.

bun run validate:plan-pack -- \
  .ai/03_plans/2026-07-10/Beta-Readiness-Program
# Expected: validator success.
```

Postcondition: `AC-001` can pass, the migration owners have one consumable
generation/hash receipt, and `UNIT-002` has deterministic hash preconditions.
Evidence destination: `VERIFICATION_ROLLOUT_AND_FINAL_AUDIT.md` plus ledger receipt.
Rollback: restore the prior registry artifact hash and invalidate dependent
receipts; no product rollback is possible because this unit is coordination-only.

## UNIT-002 - serialized Publisher and Activity integration deltas

Status: `PLANNED`. Owner: program lead; Publisher and Activity retain their own
pack write scopes. Dependency: `UNIT-001`.

Precondition: current Publisher and Activity integration receipts both pass
manifest, manifest-self, artifact-set, scoped-diff, contract-version, validator,
and canonical receipt-hash checks. If only one receipt passes, issue only its
non-cross-dependent delta; `PUB-DELTA-02` requires both.

Actions:

1. Compare current pack content to `PUB-DELTA-01..04` and `ACT-DELTA-01..02`.
2. Delete delta clauses already covered with equivalent accepted requirements;
   retain trace links rather than duplicate prose.
3. Record proposed deltas with exact requirement/unit/test/file ownership.
4. Require a target receipt containing incorporated delta IDs plus updated
   manifest, artifact-set, scoped-diff, contract, and canonical receipt hashes.
5. Keep both packs' implementation status truthful; a plan delta does not move
   `NOT_STARTED` to complete.

Expected signal: no overlapping write lease, both pack validators pass, and
Publisher traceability links Activity for follow-up primitives.
Failure signal: hash drift during integration, conflicting migration/path
ownership, or any claim that plan readiness proves implementation. Recovery:
invalidate the receipt, recompute the delta against current content, and retry
only after a new validator-clean receipt exists.

## UNIT-003 - phase integration and P1-10 receipts

Status: `PLANNED`. Owner: program lead plus checker. Dependency: `UNIT-002`.

Actions:

1. Build phase receipts for all nine exact packs in the README contributor
   matrix using audit slices at `:793-848`.
2. Verify every cross-pack milestone has a typed producer/consumer contract and
   one owner for failure semantics.
3. Evaluate every matrix row exactly once. `REQUIRED` rows must report caller
   map, pre-change characterization, extraction/retention decision, changed
   files, regression owner, exact tests, and verifier result. `N/A` rows must
   provide the stated changed-file/caller scan and justification. Missing rows
   or implicit N/A fail `AC-004`.
4. Confirm Activation produces cohort data while `Beta-Operating-Contract`
   owns dashboard presentation, telemetry governance, and operating response.
5. Confirm Publisher consumes Activity primitives without duplicating routes.
6. Validate `ACT-RECEIPT-ESTIMATE-HEALTH-v1`,
   `ACT-RECEIPT-PUBLISHER-v1`, and
   `ACT-RECEIPT-COHORT-CONSUMER-v1` against the frozen Activation contract,
   producer/consumer manifest and contract hashes, paths/tests,
   transaction/outbox or safe-consumer guarantees, and explicit unavailable
   behavior. Missing, stale, mismatched, or unsafe receipts remain
   `not_available` and block their integration/release rows.
7. Emit this coordination-only pack's `BETA-P1-10` explicit `N/A` receipt with
   the scoped changed-file/caller scan, justification, changed artifacts, exact
   matrix/checker commands, regression owner, and independent verifier result.

Expected signal: all non-release owner packs are validator-clean with current
receipts and no ambiguous ownership. Rollback: invalidate only the affected
phase receipt and keep independent phases available.

## UNIT-004 - assemble release evidence and independent final audit

Status: `PLANNED`. Owner: verifier distinct from capability makers. Dependency:
`UNIT-003`.

Actions:

1. Run every applicable local gate in
   `VERIFICATION_ROLLOUT_AND_FINAL_AUDIT.md`.
2. Read provider/hosted receipts; never substitute local mocks for them. For the
   Release pack, consume `UNIT-007` read-only discovery separately from Release
   `UNIT-008` GitHub, `UNIT-009` isolated staging, and `UNIT-010`
   production-or-no-release receipts.
3. Map the 20 backlog IDs and release-gate rows at audit `:1000-1040` to fresh
   receipts, open risks, and rollback owners.
4. Re-run owner-pack validators, targeted tests, broad release checks, and
   evidence freshness checks from one version-pinned candidate SHA.
5. Produce a checker verdict: `GO_CANDIDATE`, `NO_GO`, or
   `AUTHORIZATION_PENDING`. Any missing P0 proof is `NO_GO`.

Expected signal: all autonomous local/read-only engineering gates pass. Any
unresolved external boundary is listed separately as Program `AUTH-001` backed
only by Release `AUTH-001`/`UNIT-008` GitHub readback, Release `AUTH-002`/
   `UNIT-009` isolated-staging proof, Release `AUTH-003`/`UNIT-010` production or
   no-release proof, or Program `AUTH-002` strict consumption of the Operating
   `AUTH-003`/`UNIT-009` cohort/legal decision receipt. Rollback: mark the truth
   packet stale on any source/config/provider/receipt drift and return to the
   earliest invalidated owner unit.

## UNIT-005 - authorized external-Beta decision

Status: `BLOCKED`. Owner: authorized final release decision maker, with a
distinct verifier. Dependency: `UNIT-004`. Program boundaries: `AUTH-001` and
receipt-consumer `AUTH-002`; required Release boundary receipts remain
independently governed by Release `AUTH-001`, `AUTH-002`, and `AUTH-003`, while
the limited-cohort/legal decision remains solely governed and produced by Beta
Operating `AUTH-003`/`UNIT-009`.

The unit cannot be promoted until:

- Program `AUTH-001` is resolved by the Release `AUTH-001`/`UNIT-008` hosted
  GitHub readback for controls and passed-SHA provenance;
- Release `AUTH-002`/`UNIT-009` supplies the isolated-staging Chromium/WebKit,
  foreign-canary, and cleanup receipt;
- Release `AUTH-003`/`UNIT-010` supplies the production deploy/smoke/rollback
  receipt or an explicit fail-closed no-release receipt;
- Program `AUTH-002` strictly validates and consumes the current Beta Operating
  `AUTH-003`/`UNIT-009`
  `LIMITED-COHORT-LEGAL-DECISION-RECEIPT-v1`; and
- the independent audit packet is current at the exact release SHA.

For every receipt, record its pack-qualified boundary, actor, scope, timestamp,
artifact versions, commit SHA, environment, rollout cohort where applicable,
rollback owner, and next review date. Unit 005 records only the aggregate
`GO`/`NO_GO`/`AUTHORIZATION_PENDING` release decision; it does not record or amend
the GitHub, staging, production, auth-risk, or cohort/legal decisions. If an
upstream authority declines or narrows scope, record `NO_GO` or the narrower
allowed cohort. Do not convert absence of one receipt into approval for another.

## Integration and restart receipt

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
