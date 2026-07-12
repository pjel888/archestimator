# Rollout, Fix-Forward, And Completion Gate

This supporting operations artifact expands `OPS-001`, `UNIT-007`, and the final
audit portion of `VERIFICATION_ROLLOUT_AND_FINAL_AUDIT.md`. `plan-pack.json` is
the sole live status authority; this file neither duplicates nor changes its
tuple.

## Staged Rollout

1. Apply the additive migration to local/test only after the current Program
   lease validates; prove constraints, privacy lifecycle, and query plans.
2. Ship repository/action seams dark. Readers tolerate no progress row; writers
   atomically enqueue outbox intents; reconciliation/dead repair is observable.
3. Enable true-zero and path choices for an internal seeded account. Verify
   partial recovery and sample labeling before wider exposure.
4. Enable checklist derivation/reopen; leave external owner milestones honestly
   unavailable until Program validates their receipts.
5. Expose the cohort DTO/query only through the platform-admin caller. Beta
   Operating separately decides presentation/outreach and release composition.

## Stop, Rollback, And Fix-Forward

| Failure | Immediate action | Recovery proof |
|---|---|---|
| Migration or FK/index mismatch | Do not enable readers/writers | Correct additive migration under a revalidated lease; rerun `TEST-001` |
| Outbox duplicates/loss/dead backlog | Disable claimers, preserve canonical rows | Repair idempotently; prove one event/max stage and bounded attempts |
| Partial path setup | Keep explicit recovery state | Resume/retry/delete owned partial project; prove no duplicate |
| Privacy leak or unbounded cohort query | Disable cohort consumer | DTO snapshot, denial, query-plan, and pagination tests pass |
| UI regression | Disable new zero/checklist island only | Existing filtered-empty and project-list tests plus focused DOM proof |
| Receipt drift/missing owner | Preserve `not_available`; do not fabricate | Program validates fresh matching receipt and fixture digest |

D1 rollback is never a destructive down migration. Preserve additive data,
disable affected code paths, and fix forward. Release Integrity owns the later
cross-domain browser/release decision.

## Final Audit Matrix

| Contract | Required implementation evidence | Planning baseline only |
|---|---|---|
| `UX-001` | `UNIT-002`, `TEST-002`, routed focus/reflow receipt | Planned, not proven |
| `REQ-001` | `UNIT-003`, `TEST-003`, idempotent recovery receipt | Planned, not proven |
| `UX-002` | `UNIT-004`, `TEST-004`, reopen/persistence receipt | Planned, not proven |
| `DATA-001` | `UNIT-001`, `TEST-001`, migration/outbox/lifecycle receipt | Planned, not proven |
| `SEC-001` | Direct actor/resource denials and privacy snapshot | Planned, not proven |
| `REQ-002` | Producer contract and all receipt schemas/fixtures | Planned, not proven |
| `PERF-001` | 10k query plan, <=100 rows, stable pages, no N+1 | Planned, not proven |
| `OPS-001` | Threshold/support states, rollout/fix-forward, final verifier | Planned, not proven |

Implementation may become complete only after every unit is `VERIFIED`, every
test/gate has current evidence, the Program receipt integration is truthfully
reported, and a distinct verifier records the final result. Hosted/provider and
external release proof remain outside this pack.

## Resume Packet

Record exact unit, current source hashes, migration generation/allocation,
last red/green command, temp D1/outbox/retention fixture state, open risk,
external receipt status, cleanup state, and one next command. Resume at the
earliest stale dependency; never continue a partial setup against assumed state.
