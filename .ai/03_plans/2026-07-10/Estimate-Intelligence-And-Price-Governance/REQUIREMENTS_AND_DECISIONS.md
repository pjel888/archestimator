# Requirements And Decisions

## Outcome Requirements

| ID | Backlog owner | Outcome | Source IDs | Units | Criteria |
|---|---|---|---|---|---|
| REQ-001 | BETA-P1-01 | A canonical health engine and repository DTO expose deterministic estimate health, completeness, budget state, and exact issue references | SRC-001, SRC-002, SRC-004 | UNIT-001, UNIT-003, UNIT-004, UNIT-007 | AC-001, AC-002 |
| REQ-002 | BETA-P1-02 | Every KPI, risk, and applicable chart can open the exact estimate/row set that produced it through stable URL state | SRC-001, SRC-002, SRC-004 | UNIT-001, UNIT-004, UNIT-005, UNIT-007 | AC-003, AC-004 |
| REQ-003 | BETA-P1-03 | Revision comparison uses an explicit same-estimate Activity event boundary and deterministic as-of reconstruction to explain total change through quantity, rate, adjustment, misc, and scope deltas with traceable event references | SRC-001, SRC-003 | UNIT-001, UNIT-006, UNIT-007 | AC-005, AC-006 |
| DATA-001 | BETA-P1-01/03 | Projects persist typed analytical inputs with additive migration, validation, authorization, compatibility, and no invented backfill values | SRC-001 | UNIT-001, UNIT-002, UNIT-004 | AC-007, AC-008 |
| DATA-002 | BETA-P1-08 | Estimate-row producers durably preserve truthful provenance origin before display fallback, and workspace/category freshness policies drive library and estimate health from one evaluator while retaining 90/180 fallback | SRC-002 | UNIT-001, UNIT-002, UNIT-003, UNIT-004 | AC-009, AC-010 |
| UX-001 | BETA-P1-01/02/03 | The Data surface presents usable loading, empty, healthy, warning, error, truncated, mixed-currency, unavailable, keyboard, screen-reader, mobile, and recovery states | SRC-001, SRC-004 | UNIT-005, UNIT-007 | AC-011 |
| PERF-001 | BETA-P1-01/02 | Health and drill-through stay bounded at Beta-scale cardinality with measured query/payload/render budgets and fail-closed truncation | SRC-001, SRC-004 | UNIT-004, UNIT-005, UNIT-008 | AC-012 |
| REQ-004 | Program-owned BETA-P1-10 contribution | Touched analytics capabilities are extracted behind typed boundaries without changing unrelated chart behavior, and this pack emits one receipt to the umbrella evidence gate | SRC-001, SRC-003, SRC-004 | UNIT-006, UNIT-007, UNIT-008 | AC-013 |
| OPS-001 | Beta operations | Rollout, observability, compatibility, fix-forward, evidence freshness, cleanup, and final audit are explicit and executable | SRC-001 | UNIT-008 | AC-014 |

## Acceptance Criteria

| ID | Observable criterion | Test | Evidence class |
|---|---|---|---|
| AC-001 | The same normalized fixture produces byte-stable issue IDs, severities, counts, totals, ratios, and grade across repeated runs | TEST-001 | unit receipt |
| AC-002 | Empty, healthy, warning, and error estimates are distinguishable; each issue references only authorized estimate/row IDs | TEST-001, TEST-004 | unit and repository receipt |
| AC-003 | A drill-through URL round-trips rule, estimate, row, category, supplier, and revision selection without invalid values entering the DTO | TEST-005 | unit/DOM receipt |
| AC-004 | Selecting a KPI/risk opens the exact fixture rows; clearing the filter restores the prior comparison state | TEST-005 | DOM receipt |
| AC-005 | An explicit same-estimate baseline event and captured current high-water mark reconstruct deterministically; deltas reconcile exactly to current total minus baseline total with zero residual or an explicit `unclassified` residual | TEST-006 | unit receipt |
| AC-006 | Missing/partial/late/out-of-order events, cross-estimate boundaries, absent before-state, or an unstable current high-water mark degrade to unavailable and never fabricate a cause or named version | TEST-006 | unit/repository receipt |
| AC-007 | Clean local D1 apply, existing-project read, new-project write, edit, and migration replay preserve nullable typed fields and authorization | TEST-002 | local D1 receipt |
| AC-008 | Effective budget is estimate override, else project target, else missing; basis date and source are visible in the DTO | TEST-002, TEST-004 | repository receipt |
| AC-009 | New library/component inserts persist their pre-fallback provenance origin exactly; legacy rows without an origin marker remain missing, while workspace/category policy resolution rejects invalid thresholds and preserves 90/180 fallback | TEST-003 | producer/local D1 receipt |
| AC-010 | Library overview, source-trust chips, and estimate health classify the same price date and durable provenance origin under the same effective policy | TEST-003, TEST-004 | cross-consumer contract receipt |
| AC-011 | All named UX states, focus behavior, semantic labels, live announcements, reflow, and keyboard drill-through pass focused DOM tests; browser proof is limited to real route/focus/reflow claims | TEST-005, TEST-008 | DOM/browser receipt |
| AC-012 | At 5,000 evaluated rows, D1 fact reads stay within the recorded query budget, payload remains bounded, and pure evaluation stays within the committed benchmark; 50,000-row reasoning proves deterministic truncation/pagination | TEST-007 | benchmark/query receipt |
| AC-013 | Capability extraction preserves existing project-data/chart golden masters and leaves no duplicate health/revision formulas in touched UI files | TEST-009 | regression/static receipt |
| AC-014 | Targeted tests, typecheck, lint, error-handling gate, local migration proof, Cloudflare build, diff check, evidence freshness, cleanup, and final traceability audit pass | TEST-010 | final audit receipt |

All criteria begin `FAIL` because implementation has not started. Their linked
tests and evidence producers are fully specified in
`VERIFICATION_ROLLOUT_AND_FINAL_AUDIT.md`.

## Domain Invariants

1. Health evaluates only rows the authorized repository returned.
2. Rule IDs and filter values are stable contracts; display copy may change.
3. Missing evidence never becomes a healthy signal.
4. Provenance origin is captured and persisted before display fallback; reads
   never infer `recorded` from normalized source/date. Invalid dates and
   `missing` or `synthesized_fallback` provenance origins are
   `provenance-missing`, never fresh or verified. Display fallback values cannot
   upgrade evidence origin.
5. Category policy overrides workspace default; workspace default overrides the
   code fallback; fallback is 90 stale and 180 very stale days.
6. Policy revision is included in the DTO and cache key.
7. Estimate budget overrides project target budget. Neither is currency-converted.
8. Mixed-currency estimates are not aggregated into a comparable monetary KPI.
9. Revision deltas must reconcile, or expose the residual as unclassified.
10. Activity History owns event vocabulary and restoration. This pack owns the
    read adapter and analytical decomposition only.
11. UI never recalculates server-owned health counts or severity.
12. Health logs contain rule IDs, counts, duration, truncation, and request ID,
    not project names, row descriptions, raw prices, or actor identifiers.
13. Revision intelligence never revives named-version snapshots, compare, or
    version restore. A baseline is an explicit persisted Activity event boundary.
14. Revision range order is `(occurred_at, event_id)` within one workspace and
    estimate; reconstruction uses `(baseline, current_high_water]` only. Missing
    before/after facts, duplicate IDs, late events, or a changed high-water mark
    produce `unavailable`, not inferred history.

## User And System State Matrix

| State | Expected behavior | Recovery/action |
|---|---|---|
| No estimates | Empty cockpit, no warning grade | Create/open estimate |
| Estimate with zero rows | `empty`, budget may be shown separately | Add area/component/template |
| Healthy | Green/passive summary with last evaluated policy revision | Continue to export/share |
| Warnings | Prioritized warning KPI and exact row drill-through | Open affected rows |
| Errors | Strong error state; sharing warning integration remains outside this pack | Correct affected rows |
| Missing typed project inputs | Explicit incomplete inputs, not zeros | Edit project analytics fields |
| Mixed currency | Per-estimate health only; comparison deltas disabled | Select same-currency estimates |
| Truncated | Summary marked incomplete; row drill-through paginates | Narrow scope or load next page |
| Revision evidence unavailable | Current health remains usable; revision explanation says unavailable | Refresh or inspect Activity History |
| D1/repository failure | Structured route error; no cached healthy fallback | Retry with request ID |
| Stale client data | Query invalidation refreshes policy revision and health | Retry/refresh |
| Unauthorized | Existing not-found/denial behavior; no IDs or counts leak | Request appropriate access |

## Autonomous Decisions

### DEC-AUTO-001 - One pure health domain boundary

Question: Where should health formulas and rule classification live?

Affected IDs: REQ-001, REQ-002, DATA-002, PERF-001, REQ-004.

Evidence and freshness: Current Data UI derives presentation from totals/charts,
while library freshness and budget behavior live in separate modules.

Options: derive in React; derive independently in each repository; create one
pure `src/lib/estimate-health/` boundary with adapters.

Decision: Create one pure typed boundary and make repository/UI/library adapters
consume it.

Why: It gives unit determinism, prevents formula drift, supports server and test
use, and keeps React presentation-only.

Rejected alternatives: React derivation duplicates server facts; repository-
specific formulas cannot guarantee cross-consumer policy parity.

Confidence: high.

Consequences: Existing source-trust exports may delegate to the new evaluator;
component/estimate insert producers persist origin before fallback, legacy
unmarked rows stay missing, and compatibility wrappers remain until consumers
migrate.

Rollback/revision trigger: If bundle analysis proves server code enters a client
chunk, split shared primitive evaluators from server-only repository adapters.

Responsible role: architect/executor integrator.

### DEC-AUTO-002 - Typed project columns, not JSON metadata

Question: How should analytical project inputs be persisted?

Affected IDs: DATA-001, REQ-001, REQ-003.

Evidence and freshness: `projects.metadata` currently holds image metadata and
the audit explicitly requires typed analytical inputs.

Options: extend generic metadata; add typed project columns; add a separate
project-analytics table.

Decision: Add nullable typed columns to `projects`.

Why: The fields are one-to-one project facts used in filters and DTOs. Columns
make validation, indexes, migration inspection, and authorization explicit.

Rejected alternatives: JSON repeats the current gap; a one-to-one table adds a
join and lifecycle surface without isolation benefit.

Confidence: high.

Consequences: `ProjectRow`, select lists, create/edit actions, forms, and fixtures
must evolve together.

Rollback/revision trigger: Fix forward with nullable columns and stop reading
them; D1 destructive column removal is not the first rollback.

Responsible role: data executor.

### DEC-AUTO-003 - Budget precedence is estimate override then project fallback

Question: How do existing `estimates.project_budget` and new project target
budget interact?

Affected IDs: DATA-001, REQ-001.

Options: replace estimate budget; sum budgets; explicit precedence.

Decision: Estimate budget overrides project target budget for that sheet;
project target is fallback only.

Why: It preserves existing behavior and supports sheet-specific alternates.

Rejected alternatives: replacement breaks existing estimates; summing has no
business meaning.

Confidence: high.

Consequences: DTO includes effective value, source, and basis date.

Rollback/revision trigger: Revisit only with an explicit multi-estimate budgeting
product requirement.

Responsible role: domain executor.

### DEC-AUTO-004 - Price policy uses a normalized D1 table

Question: Where should configurable price thresholds live?

Affected IDs: DATA-002, REQ-001, REQ-002.

Options: environment constants; workspace JSON; normalized policy table.

Decision: Use `workspace_price_freshness_policies` with workspace default and
optional category override.

Why: It is queryable, constrained, revisioned, and authorizable without adding a
dependency.

Rejected alternatives: environment values cannot vary by tenant/category;
workspace JSON is untyped and difficult to index/audit.

Confidence: high.

Consequences: Default resolver returns 90/180 when no row exists.

Rollback/revision trigger: If policy editing is deferred, retain table/read path
and expose only the default row; do not restore duplicated constants.

Responsible role: data executor.

### DEC-AUTO-005 - Stable issue IDs and explicit drill-through URL state

Question: How do analytics controls identify rows without coupling copy to logic?

Affected IDs: REQ-001, REQ-002, UX-001.

Options: UI-local filter closures; free-form query text; typed rule/filter schema.

Decision: Use stable rule IDs and a versioned typed query schema parsed at the
route-state boundary.

Why: Links are reproducible, testable, and safe to share inside authorized routes.

Rejected alternatives: closures do not survive navigation; free-form filters are
not validatable.

Confidence: high.

Consequences: Unknown values are ignored with canonical URL repair.

Rollback/revision trigger: Version the schema if filter semantics change; never
reinterpret an old token silently.

Responsible role: UX/contract executor.

### DEC-AUTO-006 - Revision decomposition consumes Activity History through an adapter

Question: How should revision intelligence depend on the neighboring Activity
History pack?

Affected IDs: REQ-003, REQ-004.

Options: duplicate event taxonomy; wait for the entire neighboring pack; consume
existing events through a compatibility adapter and revalidate after its changes.

Decision: Own a read-only analytical adapter in this pack, serialize any shared
event-type files, and re-run characterization after Activity History integration.
The user selects a prior normalized event boundary for the same estimate; the
repository captures the current persisted rows plus an event high-water mark,
then reads the deterministic range `(baseline_order, current_order]`, ordered by
`occurred_at` then stable event ID. It reconstructs the baseline by applying
complete normalized `before` facts backward from current state. No selection,
cross-estimate events, incomplete tombstones/before facts, duplicate/late events,
or a high-water change during the read returns `unavailable`. This is analytical
readback only and does not create, restore, or imply named versions.

Why: It avoids duplicate vocabulary while keeping this unit independently
implementable against current events.

Rejected alternatives: duplication creates drift; a hard wait blocks unrelated
health work and is unnecessary.

Confidence: medium-high.

Consequences: Unknown but complete event shapes may yield an explicit
`unclassified` residual; incomplete or unstable reconstruction yields
`unavailable`, never invented causes.

Rollback/revision trigger: Rebase the adapter if Activity History publishes a
canonical typed delta API before UNIT-006 begins.

Responsible role: shared-contract integrator.

### DEC-AUTO-007 - Repository returns facts and issue references, UI owns copy

Question: What crosses the server/client boundary?

Affected IDs: REQ-001, REQ-002, UX-001, PERF-001.

Options: raw rows; localized copy; compact typed DTO.

Decision: Return a compact serializable DTO with rule IDs, counts, amounts, row
references, policy revision, and pagination metadata. UI maps copy/icons.

Why: It limits payload, avoids leaking internal fields, and preserves localization
and presentation flexibility.

Rejected alternatives: raw rows widen exposure/payload; server copy couples UI
language to repository contracts.

Confidence: high.

Consequences: Drill-through details load only for the selected issue/page.

Rollback/revision trigger: Tighten pagination if measured payload exceeds budget.

Responsible role: repository integrator.

### DEC-AUTO-008 - Capability extraction follows domain boundaries

Question: How should BETA-P1-10 reduce regression concentration?

Affected IDs: REQ-004, UX-001.

Options: broad file split by line count; no extraction; extract pure/domain and
bounded presentation capabilities as they are introduced.

Decision: Extract health summary, risk table, driver view, revision view, and URL
state into focused modules; avoid unrelated cleanup.

Why: It reduces ownership contention and leaves existing chart composition intact.

Rejected alternatives: line-count refactors expand blast radius; no extraction
would further enlarge `CostComparisonBoard`.

Confidence: high.

Consequences: Existing tests remain characterization gates.

Rollback/revision trigger: Collapse an extraction only if it adds forwarding
layers without independent behavior or tests.

Responsible role: code-simplifier after functional implementation.

## Risk Register

| ID | Status | Risk | Units | Mitigation and trigger |
|---|---|---|---|---|
| RISK-001 | OPEN | Health formulas drift from totals or library policy | UNIT-001, UNIT-003, UNIT-004 | Cross-consumer golden fixtures; stop on any classification mismatch |
| RISK-002 | OPEN | Provisional `0052` migration slot conflicts with concurrent work | UNIT-002 | Re-scan the current tail and all owner ledgers immediately before write; reissue every affected slot on collision |
| RISK-003 | OPEN | New fields create false certainty from null/default backfills | UNIT-002, UNIT-004 | Nullable columns, explicit missing states, no synthetic values |
| RISK-004 | OPEN | Health queries scan too many rows or leak unauthorized IDs | UNIT-004, UNIT-005 | Authorized project predicate, query budget, pagination, payload audit |
| RISK-005 | OPEN | Activity History changes invalidate revision decomposition | UNIT-006, UNIT-008 | Compatibility adapter, shared-file lease, post-integration replay |
| RISK-006 | OPEN | UI becomes another oversized analytics component | UNIT-005, UNIT-007 | Capability ownership map and extraction criterion |
| RISK-007 | OPEN | Policy changes unexpectedly reclassify cached health | UNIT-003, UNIT-004, UNIT-008 | Policy revision in cache key/DTO, invalidation test, staged rollout |

## Authorization Boundary

There is no active `AUTH-*` record. The package action ceiling is local
implementation. Applying a migration to hosted D1 or deploying production is not
required to complete this plan's local implementation units and cannot be used
as a substitute for local proof.
