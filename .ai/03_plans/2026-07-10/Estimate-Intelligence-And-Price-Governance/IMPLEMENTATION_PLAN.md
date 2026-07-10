# Canonical Implementation Plan

## Execution Contract

This is the sole canonical implementation artifact. Revalidate current source,
git status, migration tail, active leases, and installed Next.js documentation
before editing. Preserve unrelated user/agent changes. Use TDD or an explicit
characterization-red-first sequence for every behavior unit.

All units are `READY` in `SLICE-001`. Readiness means the packet is complete and
dependency-closed in the advertised slice; execution still obeys `depends_on`,
file leases, and fresh-source checks. `UNIT-001` is the only next unit.

## Capability Census

| Capability | Use | Substitution |
|---|---|---|
| `rg`, targeted reads, TypeScript diagnostics | Current anchors and callers | Required baseline |
| Native `executor` | Implementation lanes | Lead executes directly if no child slot exists |
| `test-engineer`/independent verifier | Red tests and final proof | Lead runs maker/checker-separated review if unavailable |
| Local D1 via Wrangler/Bun scripts | Migration and repository proof | No hosted substitution for local tests |
| Vitest/Bun/typecheck/lint/cf:build | Deterministic proof | Narrow checks first, broad gate at UNIT-008 |
| Browser proof | Only route focus/reflow/drill-through claims | DOM/static proof for everything else |

## Ownership And Leases

The lead is the single writer for `plan-pack.json`, `LOOP_LEDGER.md`, migration
number allocation, evidence receipts, and final status transitions.

| Lease | Scope | Owner | Release condition |
|---|---|---|---|
| LEASE-EST-MIGRATION | Umbrella-provisional `0052_estimate_intelligence_inputs.sql`, after Publisher `0050` and Activation `0051`, only if all three leases and the source tail are still current | UNIT-002 data executor | Migration filename fixed and committed to ledger |
| LEASE-EST-DOMAIN | `src/lib/estimate-health/**` | UNIT-003 domain executor | Contract tests green |
| LEASE-EST-PROJECT | project database types/actions/forms and project-data repository DTO | UNIT-002/004 shared integrator | Repository contract integrated |
| LEASE-EST-ROUTE | project-data URL state and UI components | UNIT-005/007 UX executor | DOM tests green |
| LEASE-EST-ACTIVITY | Any current event adapter/shared Activity-owned source | UNIT-006 shared-contract integrator | Activity owner idle; compatibility tests green |
| LEASE-EST-EVIDENCE | `.ai/99_scratch/estimate-intelligence-*` receipts | UNIT-008 verifier | Receipts summarized and temp files cleaned |

Immediately before editing, re-scan `migrations/` plus the Publisher, Activation,
and umbrella ledgers. If `0052` or either earlier provisional lease changed, stop
and have the program lead reissue every later slot; record the actual name before
editing imports/tests. Do not rename another agent's migration.

## DAG

```text
Layer 0: UNIT-001
Layer 1: UNIT-002 || UNIT-003
Layer 2: UNIT-004
Layer 3: UNIT-005 || UNIT-006
Layer 4: UNIT-007
Layer 5: UNIT-008
```

Critical path: `UNIT-001 -> UNIT-003 -> UNIT-004 -> UNIT-005 -> UNIT-007 -> UNIT-008`.

Integration checkpoints:

- CP-1 after UNIT-001: fixtures, types, rules, query/filter schema, and red signals frozen.
- CP-2 after UNIT-002/003: migration and pure policy/health engine integrated.
- CP-3 after UNIT-004: repository DTO is the sole server contract.
- CP-4 after UNIT-005/006: drill-through and revision adapters pass independently.
- CP-5 after UNIT-007: user-facing integration complete.
- CP-6 after UNIT-008: final audit and cleanup complete.

## UNIT-001 - Freeze Domain Contracts And Red Baselines

Unit ID and goal: `UNIT-001`; characterize current behavior and add failing
contracts for typed inputs, policy resolution, health rules, drill-through, and
revision reconciliation.

User/system outcome: Every later lane implements against one stable fixture and
observable failure signal rather than inventing parallel models.

Linked IDs: REQ-001, REQ-002, REQ-003, DATA-001, DATA-002; DEC-AUTO-001 through
DEC-AUTO-007; RISK-001.

Non-goals: Production implementation, UI styling, migration write, Activity
History source edits.

Exact paths and current symbols:

- extend `tests/vitest/fixtures/project-charts-golden-master-fixture.ts` only if
  existing consumers can remain stable; otherwise add
  `tests/vitest/fixtures/estimate-health-golden-fixture.ts`;
- add `tests/vitest/estimate-health-rules.test.ts`;
- add `tests/vitest/estimate-price-policy.test.ts`;
- add `tests/vitest/project-data-health-repository.test.ts`;
- add `tests/vitest/project-data-health-route-state.test.ts`;
- add `tests/vitest/estimate-revision-intelligence.test.ts`;
- characterize `ProjectRow`, `ProjectDataRouteSummary`,
  `getComponentPricingFreshness`, `buildProjectChartSeries`, and current event
  shapes without changing implementation.

Dependencies and preconditions: None. Confirm no concurrent fixture owner before
editing shared fixtures.

Owned scope and role: Test engineer owns new fixture/test files. Lead integrates
any edit to an existing golden fixture.

Approach and invariants:

1. Freeze one deterministic clock and IDs.
2. Include healthy, unpriced, recorded provenance, inherited snapshot,
   synthesized fallback with plausible source/date, missing provenance, stale, very stale,
   low-confidence, source-changed, discontinued, zero-quantity, missing-budget,
   near-budget, and over-budget rows.
3. Include workspace default plus category override policy.
4. Include one explicit same-estimate baseline boundary and current high-water
   range with quantity, rate, adjustment, misc, scope, same-timestamp stable-ID
   ordering, and an unknown-event residual; include missing-range and
   cross-estimate cases that must be unavailable.
5. Add red assertions for typed project round-trip and URL-state validation.
6. Keep existing chart golden outputs unchanged.

Expected postconditions: Tests fail only on absent target contracts; existing
characterization tests remain green.

Proof: TEST-001, TEST-003, TEST-005, TEST-006. Run focused Vitest against the new
files. Expected signal is new assertions failing for missing modules/fields while
existing fixture characterization passes. Store command/result in
`.ai/99_scratch/estimate-intelligence-unit-001.md`.

Failure response: If existing behavior differs from the audit, update the source
audit and DEC-AUTO record before implementation. Do not weaken expected outcomes.

Checkpoint/resume: Commit or ledger the exact fixture hash and failure names;
resume at UNIT-002 and UNIT-003 after CP-1.

## UNIT-002 - Add Typed Project Inputs And Price Policy Schema

Unit ID and goal: `UNIT-002`; add additive D1 schema, typed project contracts,
validated create/edit actions, policy persistence, and durable estimate-row
provenance origin.

User/system outcome: Health inputs and price policy are explicit, authorized,
queryable, and backward-compatible.

Linked IDs: DATA-001, DATA-002, REQ-001; DEC-AUTO-001 through DEC-AUTO-004;
RISK-002, RISK-003.

Non-goals: Health evaluation or cockpit UI.

Exact paths and symbols:

- umbrella-provisional migration
  `migrations/0052_estimate_intelligence_inputs.sql` under lease and mandatory
  current-tail/ledger rescan;
- `src/lib/types/database.ts` `ProjectRow`;
- `src/lib/projects/actions.ts` `createProjectRecord` and update action;
- `src/lib/repositories/workspace-repository.ts` project select/normalization
  paths only where required;
- new `src/lib/repositories/price-freshness-policy-repository.ts`;
- `src/lib/repositories/component-library-repository.ts`
  `normalizeComponentLibraryItem` provenance-origin producer;
- `src/lib/estimates/actions.ts` `getSourceSnapshot` and row-insert mapping,
  plus the internal source-snapshot sanitizer/type;
- `estimate_row_items.pricing_provenance_origin` row/select types;
- `NewProjectForm.tsx` and `ProjectDetailsModal.tsx` only for validated fields;
- migration/repository/action tests.

Dependencies: UNIT-001.

Owned scope and role: Data executor owns migration/repository. UI executor may
edit forms only after DTO names freeze. Lead integrates shared project types.

Approach and invariants:

1. Acquire migration and shared-file leases.
2. Re-scan migrations and D1 helpers.
3. Add nullable project columns, the policy table/indexes/checks, and a nullable
   checked provenance-origin column for legacy-compatible estimate rows.
4. Preserve all existing project reads through explicit column-list updates.
5. Validate finite non-negative numeric values and ISO dates at server boundary.
6. Enforce current workspace/project authorization for reads/writes.
7. Make policy writes idempotent with revision increment and updated timestamp.
8. Compute `recorded | inherited_snapshot | synthesized_fallback | missing` at
   the component/row producer before source/date fallback; persist the marker in
   the estimate row and internal snapshot on every new insert.
9. Treat legacy null origin as `missing`; never infer origin from plausible
   stored source/date, and keep public snapshot sanitization unchanged.
10. Do not backfill guessed project facts or origin; policy absence resolves to
    90/180.

Expected postconditions: Existing projects read with null inputs; new/edit flows
round-trip values; new estimate-row inserts round-trip exact provenance origin;
legacy rows remain missing; cross-workspace policy/project access is denied;
migration replay is safe.

Proof: TEST-002 and TEST-003. Apply to a clean local D1 fixture, rerun migration,
exercise authorized/denied repository tests, then focused typecheck. Expected
signal: zero migration errors, no invented values/origins, exact producer-to-row
origin round-trip, denied rows absent, stable policy revision. Evidence path
`.ai/99_scratch/estimate-intelligence-unit-002.md`.

Failure response: Fix migration forward before dependent repository work. If D1
cannot add a constraint safely, enforce it in a replacement table only after a
fixture-backed migration experiment; record the revised decision.

Checkpoint/resume: Record actual migration filename/hash and schema readback.

## UNIT-003 - Implement Canonical Health And Freshness Domain

Unit ID and goal: `UNIT-003`; implement pure policy resolution, normalization,
health rules, grading, budget precedence, and cost-driver primitives.

User/system outcome: Every consumer gets the same deterministic classification.

Linked IDs: REQ-001, DATA-002; DEC-AUTO-001, DEC-AUTO-003, DEC-AUTO-004;
RISK-001, RISK-007.

Non-goals: D1 queries, React, revision event reads.

Exact paths:

- new `src/lib/estimate-health/types.ts`;
- new `src/lib/estimate-health/normalize.ts`;
- new `src/lib/estimate-health/price-policy.ts`;
- new `src/lib/estimate-health/evaluate-estimate-health.ts`;
- new `src/lib/estimate-health/cost-drivers.ts`;
- adapt `src/components/workshop/library/source-trust-model.ts` through a
  compatibility wrapper after tests prove identical 90/180 behavior;
- update focused health/library tests.

Dependencies: UNIT-001.

Owned scope and role: Domain executor owns the new folder; library source file is
lead-integrated because it is shared.

Approach: Pure functions, explicit clock/policy input, finite-number/date
normalization, stable rule ordering, deterministic tie breaks, no translation or
React dependencies, no raw row text in diagnostics. Normalize provenance origin
before applying display fallbacks; `synthesized_fallback` remains display-only
and evaluates as `provenance-missing`.

Expected postconditions: RED-EST-001 and RED-EST-005 pure-domain failures turn
green; existing library trust tests remain byte-compatible except imports.

Proof: TEST-001 and TEST-003. Run
`bunx vitest run tests/vitest/estimate-health-rules.test.ts tests/vitest/estimate-price-policy.test.ts tests/vitest/library-source-trust.test.ts`.
Expected signal: all rule/policy cases pass with stable snapshots. Evidence path
`.ai/99_scratch/estimate-intelligence-unit-003.md`.

Failure response: If current library classification conflicts, preserve current
90/180 behavior and revise only target-policy adapters, not fixture expectations.

Checkpoint/resume: Public domain exports and fixture snapshot hash.

## UNIT-004 - Build Authorized Repository DTO And Query Budget

Unit ID and goal: `UNIT-004`; fetch bounded normalized facts and return health,
risk, driver, budget, policy, and pagination DTOs from the project Data repository.

User/system outcome: Server-authoritative analytics is complete enough for UI
without shipping internal raw rows.

Linked IDs: REQ-001, REQ-002, DATA-001, DATA-002, PERF-001; DEC-AUTO-007;
RISK-001, RISK-003, RISK-004, RISK-007.

Non-goals: Revision event decomposition or final presentation.

Exact paths and symbols:

- `src/lib/repositories/project-data-repository.ts`
  `ProjectDataRouteSummary` and `getProjectDataRouteSummary`;
- new bounded `src/lib/repositories/estimate-health-repository.ts` if separation
  reduces query ownership;
- current D1 authorization helpers in `src/lib/authz/d1-access.ts`;
- query/cache tests under `tests/vitest/project-data-*`.

Dependencies: UNIT-002, UNIT-003.

Owned scope and role: Repository executor; lead owns the DTO interface.

Approach and invariants:

1. Resolve authorized project/workspace before facts.
2. Fetch required row facts, including the persisted provenance-origin marker,
   with explicit columns and bounded selected estimates.
3. Resolve policy once per workspace/category set.
4. Evaluate health server-side and return compact DTO.
5. Return only issue row IDs needed for the current page; include total count and
   continuation cursor for larger issue sets.
6. Add policy revision and selected estimate IDs to cache key/invalidation.
7. Mark summaries incomplete when current 5,000-row cap truncates facts.
8. Emit redacted duration/query-count/truncation telemetry through existing logger.

Expected postconditions: The route can render complete summary/risk/driver facts,
unauthorized IDs remain indistinguishable from not found, and query/payload
budgets are measured.

Proof: TEST-004 and TEST-007 plus existing project-data/chart repository suites.
Evidence path `.ai/99_scratch/estimate-intelligence-unit-004.md`.

Failure response: If query budget fails, batch policy/category reads and paginate
issue details; do not move raw evaluation into the browser.

Checkpoint/resume: DTO version, query count, payload bytes, and cache key recorded.

## UNIT-005 - Add Stable Drill-Through State And Risk UX

Unit ID and goal: `UNIT-005`; implement validated URL state, KPI/risk selection,
exact row drill-through, and all non-revision UX states.

User/system outcome: A warning is an action path, not a dead statistic.

Linked IDs: REQ-002, UX-001, PERF-001; DEC-AUTO-005, DEC-AUTO-007;
RISK-004, RISK-006.

Non-goals: Publisher/share UI, calculation parity, revision explanation.

Exact paths:

- `src/lib/workshop/project-data-route-state.ts`;
- new `src/components/workshop/project-data/EstimateHealthSummary.tsx`;
- new `src/components/workshop/project-data/EstimateRiskTable.tsx`;
- new `src/components/workshop/project-data/EstimateCostDrivers.tsx`;
- `ProjectDataClient.tsx` and `CostComparisonBoard.tsx` integration only;
- focused route-state, DOM, and accessibility tests.

Dependencies: UNIT-004.

Owned scope and role: UX executor owns new components and route state; lead
integrates `ProjectDataClient`/`CostComparisonBoard`.

Approach: URL values use versioned allowlists; unknown values repair to canonical
state. Summary controls are semantic buttons/links, risk table supports keyboard
row navigation, selection announces result count, focus moves only on explicit
user navigation, and return clears/restores prior comparison. Responsive layout
preserves existing dense operational character.

Expected postconditions: RED-EST-002 turns green; every named state in the matrix
has deterministic rendering and recovery.

Proof: TEST-005 and TEST-008. Run focused DOM/a11y tests; use browser proof only
for actual navigation focus, URL back/forward, and responsive reflow. Evidence
path `.ai/99_scratch/estimate-intelligence-unit-005.md`.

Failure response: If browser-only proof cannot run, keep the criterion failing and
record the exact command/env; do not substitute a screenshot claim.

Checkpoint/resume: Route schema version and DOM fixture snapshots.

## UNIT-006 - Add Revision Intelligence Adapter And Capability

Unit ID and goal: `UNIT-006`; decompose current-versus-baseline change using a
compatibility adapter over current/normalized Activity History evidence.

User/system outcome: Users can explain why an estimate changed without manually
comparing every row.

Linked IDs: REQ-003, REQ-004; DEC-AUTO-006, DEC-AUTO-008; RISK-005.

Non-goals: Event production/restoration changes or Activity pack edits.

Exact paths:

- new `src/lib/estimate-health/revision-intelligence.ts`;
- new `src/lib/estimate-health/activity-delta-adapter.ts`;
- existing event reads in `src/lib/estimates/actions.ts`,
  `src/lib/estimates/d1-action-client.ts`, and Activity pack audit for read-only
  mapping;
- new `EstimateRevisionComparison.tsx`;
- focused revision tests.

Dependencies: UNIT-004. Before any shared source edit, confirm the Activity
History agent has finished and acquire LEASE-EST-ACTIVITY. Default implementation
adds adapters without changing Activity-owned files.

Owned scope and role: Shared-contract integrator owns adapters; UX executor owns
the new component.

Approach: Accept an explicit same-estimate baseline event ID and capture a stable
current event high-water mark with the current persisted row snapshot. Normalize
and dedupe events from `(baseline_order, current_order]`, ordered by
`occurred_at` then stable event ID; reconstruct the baseline backward from
complete `before` facts and tombstones. Classify quantity/rate/adjustment/misc/
scope contributions, sum with canonical money rounding from the output-parity
contract when available, and expose an `unclassified` residual only for complete
unknown changes. Cross-estimate events, missing range entries, partial facts,
late/out-of-order evidence, deleted rows without tombstones, or high-water drift
return unavailable. Do not add named-version UI, snapshots, compare, or restore.

Expected postconditions: RED-EST-003 turns green and current Activity History
tests remain unchanged.

Proof: TEST-006 and relevant Activity History characterization suites. Evidence
path `.ai/99_scratch/estimate-intelligence-unit-006.md`.

Failure response: If Activity pack changes event contracts, re-run UNIT-001
fixtures, update only the adapter, and reopen CP-3 if repository facts changed.

Checkpoint/resume: Adapter compatibility matrix and normalized event fixture hash.

## UNIT-007 - Integrate Cockpit And Extract Touched Capabilities

Unit ID and goal: `UNIT-007`; compose health, risk, drivers, budget, and revision
capabilities into the Data route while reducing touched-component concentration.

User/system outcome: One coherent cockpit supports review and correction without
regressing current charts/comparisons.

Linked IDs: REQ-001, REQ-002, REQ-003, UX-001, REQ-004; DEC-AUTO-008;
RISK-005, RISK-006.

Non-goals: Redesign of unrelated workshop navigation or charts.

Exact paths: `ProjectDataClient.tsx`, `CostComparisonBoard.tsx`, new capability
components from UNIT-005/006, and adjacent tests. Extract orchestration/state from
presentation only where it creates an independently tested boundary.

Dependencies: UNIT-005, UNIT-006.

Owned scope and role: One UI integrator owns the two existing shared components.
Code-simplifier reviews after behavior tests pass and may only change touched
capability boundaries.

Approach: Preserve chart selection and mixed-currency behavior; use compact tabs
or sections appropriate to the existing operational UI; avoid nested cards;
surface incomplete/truncated data; keep health status visible while a risk is
selected; reuse UI primitives and existing route error/loading patterns.

Expected postconditions: Cockpit requirements pass, current chart golden masters
remain green, and no new monolithic state/formula owner appears.

Proof: TEST-004, TEST-005, TEST-008, TEST-009. Evidence path
`.ai/99_scratch/estimate-intelligence-unit-007.md`.

Failure response: Revert only the composition layer if integration regresses
charts; retain verified domain/repository units and replan UI composition.

Checkpoint/resume: Component ownership map, test list, and remaining browser-only
claim if any.

## UNIT-008 - Verify, Roll Out Locally, Audit, And Clean Up

Unit ID and goal: `UNIT-008`; run proportional broad proof, inspect diff/blast
radius, close risks, prepare staged rollout/fix-forward, and perform final audit.

User/system outcome: Implementation is evidence-backed and restartable without
claiming hosted release from local checks.

Linked IDs: PERF-001, REQ-004, OPS-001; all risks.

Non-goals: Hosted D1 migration or production deployment.

Exact scope: All changed source/tests/migration, this pack ledger/manifest, and
temporary evidence paths. Do not edit neighboring packs.

Dependencies: UNIT-007.

Owned scope and role: Independent verifier owns proof and final findings; lead
alone updates statuses/hashes and releases leases.

Approach:

1. Run targeted suites from prior units.
2. Run typecheck, lint on touched files, `validate:error-handling`, local migration
   clean/apply/replay, and `cf:build`.
3. Run query/pure benchmark and compare budgets.
4. Run browser proof only for unresolved browser-only claims.
5. Run `git diff --check`, search for duplicate rule formulas, stale constants,
   temporary logging, and unowned files.
6. Execute the final traceability matrix and close/mitigate every risk.
7. Remove temp D1/evidence/browser resources and release leases.
8. Refresh source/evidence hashes and statuses only from actual receipts.

Expected postconditions: AC-001 through AC-014 and GATE-001 through GATE-005 pass;
all units become VERIFIED; implementation can move to COMPLETE while release
remains separately evaluated.

Proof: TEST-007, TEST-009, TEST-010 and the commands in the verification artifact.
Expected signal: zero failures, clean migration replay, budgets within threshold,
clean diff, no stale receipts or resources. Final receipt
`.ai/99_scratch/estimate-intelligence-final-audit.md`.

Failure response: Reopen the earliest causal unit. Do not mark the package
complete or weaken a gate. Fix forward for applied migration changes.

Checkpoint/resume: Final receipt hashes, actual diff hash, released leases, exact
remaining failed criterion or archive-ready state.
