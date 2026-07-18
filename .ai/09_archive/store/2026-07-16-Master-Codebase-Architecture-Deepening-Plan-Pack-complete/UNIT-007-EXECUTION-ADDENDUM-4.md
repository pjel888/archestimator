# UNIT-007 Execution Addendum 4 — Final Scope and Failure-Semantics Reconciliation

This artifact is the final narrow execution clarification for `UNIT-007`. It preserves the fixed typed-intent family map, public contracts, four checkpoints, exact 21-file `TEST-007` gate, and pass condition in the canonical plan plus Addenda 2 and 3. It authorizes only the two additional paths and final review repairs recorded below.

## Strict authorization probes

`src/lib/authz/d1-access.ts` is additionally owned only to expose strict typed variants of the existing project and Estimate edit probes over the same singular raw SQL. The existing `canEditProjectInD1` and `canEditEstimateInD1` exports retain their signatures and fail-closed `false` behavior for existing callers. The new strict variants propagate D1 preparation and execution failures so typed Estimate intent reads and guarded mutations do not convert infrastructure errors into authorization denials.

The public capability-read action remains the one intentional `false` adapter. It must `await` the typed access probe inside its existing `try` boundary so asynchronous D1 failures are actually adapted. Validation reads and mutations otherwise propagate typed D1 failures.

## Adjustment project-boundary repair

`updateEstimateSheetAdjustmentWithHistory` must reject when the authenticated Estimate context project differs from `input.projectId`. The mismatch check occurs before any adjustment read, write, history, revision, or receipt statement. This preserves the action contract while preventing a caller-supplied project ID from crossing the authenticated Estimate boundary.

## Supplemental history-event contract

`tests/vitest/activity-event-insert-shape.test.ts` is additionally owned only to retarget the reusable-source delegation assertion from the deleted façade to `d1-intents/history-events.ts`. Its existing behavioral claim remains unchanged: activity-event insertion preserves the 19-column statement shape and bind ordering.

This supplemental contract expands the evidence but does not replace or reduce the exact 21-file `TEST-007` command. Both the exact gate and this supplemental test must pass before `UNIT-007` can be verified.

## Final pass condition

`UNIT-007` may advance to `VERIFIED` only when:

- the exact 21-file `TEST-007` gate passes after the strict-probe and project-boundary repairs;
- the supplemental activity-event contract passes;
- the legacy fail-closed authorization-helper contract passes;
- type-check, scoped lint, residue, acyclic dependency, Admin-pointer, and scoped diff checks remain clean;
- independent proof/security and architecture reviewers report no actionable finding.

No other product or test path is authorized by this addendum.
