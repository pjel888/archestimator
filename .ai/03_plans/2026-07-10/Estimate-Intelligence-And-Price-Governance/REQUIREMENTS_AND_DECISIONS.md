# Requirements And Decisions

## Outcome Requirements

| ID | Backlog owner | Outcome | Source IDs | Units | Criteria |
|---|---|---|---|---|---|
| REQ-001 | BETA-P1-01 | A canonical health engine and repository DTO expose deterministic estimate health, completeness, budget state, and exact issue references | SRC-001, SRC-002, SRC-004 | UNIT-001, UNIT-003, UNIT-004, UNIT-007 | AC-001, AC-002 |
| REQ-002 | BETA-P1-02 | Every KPI, risk, and applicable chart can open the exact estimate/row set that produced it through stable URL state | SRC-001, SRC-002, SRC-004 | UNIT-001, UNIT-004, UNIT-005, UNIT-007 | AC-003, AC-004 |
| REQ-003 | BETA-P1-03 | Revision comparison uses an explicit same-estimate Activity event boundary plus complete forward-only revision facts to explain quantity, rate, adjustment, misc, and scope deltas with traceable event references; legacy incomplete ranges are unavailable | SRC-001, SRC-003 | UNIT-001, UNIT-006, UNIT-007 | AC-005, AC-006 |
| DATA-001 | BETA-P1-01/03 | Projects persist typed analytical inputs with additive migration, validation, authorization, compatibility, and no invented backfill values | SRC-001 | UNIT-001, UNIT-002, UNIT-004 | AC-007, AC-008 |
| DATA-002 | BETA-P1-08 | Every runtime estimate-row insert/copy/restore/AI producer durably preserves truthful provenance origin before display fallback, and workspace/category freshness policies drive library and estimate health from one evaluator while retaining 90/180 fallback | SRC-002 | UNIT-001, UNIT-002, UNIT-003, UNIT-004 | AC-007, AC-009, AC-010 |
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
| AC-005 | Every forward row insert/update/replace/move/delete/restore, sheet adjustment, template/subtree copy, and AI package mutation writes an event plus complete normalized revision facts atomically; a same-estimate baseline and captured current high-water reconstruct deterministically and reconcile to current total with zero residual or explicit `unclassified` residual | TEST-006 | producer/unit receipt |
| AC-006 | Any legacy event without complete facts, missing before/after/tombstone data, ordinal/event gap, late fact, duplicate ID, cross-estimate boundary, or high-water drift returns typed `unavailable` and never fabricates a cause or named version | TEST-006 | unit/repository receipt |
| AC-007 | Clean local D1 apply, existing-project read, new-project write, edit, and migration replay preserve nullable typed fields and authorization | TEST-002 | local D1 receipt |
| AC-008 | Effective budget is estimate override, else project target, else missing; basis date and source are visible in the DTO | TEST-002, TEST-004 | repository receipt |
| AC-009 | Library inserts, estimate/tab/template/reusable-source copies, deleted-subtree restores, AI row/template/package inserts and replacements, and supported row restores persist or preserve the exact pre-fallback provenance origin; unsupported row restore remains unavailable, legacy null remains missing, and non-product proof/seed writers are explicitly synthetic or legacy-null fixtures | TEST-003 | producer/local D1 receipt |
| AC-010 | Library overview, source-trust chips, and estimate health classify the same price date and durable provenance origin under the same effective policy | TEST-003, TEST-004 | cross-consumer contract receipt |
| AC-011 | All named UX states, focus behavior, semantic labels, live announcements, reflow, and keyboard drill-through pass focused DOM tests; browser proof is limited to real route/focus/reflow claims | TEST-005, TEST-008 | DOM/browser receipt |
| AC-012 | At 5,000 evaluated rows, D1 fact reads stay within the recorded query budget, payload remains bounded, and pure evaluation stays within the committed benchmark; 50,000-row reasoning proves deterministic truncation/pagination | TEST-007 | benchmark/query receipt |
| AC-013 | Capability extraction preserves existing project-data/chart golden masters and leaves no duplicate health/revision formulas in touched UI files | TEST-009 | regression/static receipt |
| AC-014 | Targeted tests, typecheck, lint, error-handling gate, local migration proof, Cloudflare build, diff check, evidence freshness, cleanup, and final traceability audit pass | TEST-010 | final audit receipt |

All criteria begin `FAIL` because implementation has not started. Their linked
tests and evidence producers are fully specified in
`VERIFICATION_ROLLOUT_AND_FINAL_AUDIT.md`.

## Domain, Data, Integration, And State Index

The stable requirements, criteria, decisions, and risks remain in this file.
Their high-blast review contracts are split by independently testable boundary:

- `HEALTH_DOMAIN_RULES_AND_ISSUE_TAXONOMY.md` owns health rules, grade, origin,
  policy, and deterministic issue identity.
- `PRICE_POLICY_DATA_AND_MIGRATION_PLAN.md` owns typed D1 inputs, policy rows,
  provenance/fact producers, migration lease, replay, and fix-forward.
- `REPOSITORY_DTO_AUTHORIZATION_AND_QUERY_CONTRACTS.md` owns server/client DTO,
  authorization, query, cache, pagination, and failure behavior.
- `COCKPIT_UX_DRILL_THROUGH_AND_ACCESSIBILITY.md` owns the user/system state
  matrix, route journey, semantics, focus, and responsive behavior.
- `ACTIVITY_REVISION_INTEGRATION_CONTRACT.md` owns the Activity receipt boundary,
  atomic forward facts, high-water reconstruction, and typed unavailable states.

These supporting artifacts create no new stable record or execution authority.
If they conflict, this file's stable records, `plan-pack.json`, and the canonical
unit packets control in that order.

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

Options: duplicate the event taxonomy; block unrelated health work on the entire
neighboring pack; or consume the Activity boundary through an adapter and extend
forward producers only after a content-addressed compatibility receipt validates.

Decision: Own the analytical adapter and forward revision-fact sidecar in this
pack. Before shared event-path edits, validate the Activity manifest/diff/contract
receipt and acquire its named lease; do not edit Activity-owned files by default.
The user selects a prior same-estimate event boundary. The repository captures
the current `(occurred_at,event_id)` high-water, reads complete facts by event and
ordinal, and rechecks the high-water. A legacy event without complete facts,
cross-estimate boundary, ordinal gap, incomplete tombstone/before state,
duplicate or late fact, or changed high-water returns typed `unavailable`. The
adapter does not create, restore, or imply named versions.

Why: It reuses Activity vocabulary without making transient process state or
legacy partial events a source of truth.

Rejected alternatives: duplication creates drift; whole-pack blocking stalls
independent health work.

Confidence: medium-high.

Consequences: Unknown but complete event shapes may yield an explicit
`unclassified` residual; incomplete or unstable reconstruction yields
`unavailable`, never invented causes.

Rollback/revision trigger: Revalidate and revise the adapter if the Activity
contract hash changes before UNIT-006 begins.

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
| RISK-002 | OPEN | `0055` generation receipt becomes stale through collision, consumption, tail drift, or owner-manifest drift | UNIT-002 | Validate generation/tail/owner/allocation/receipt hashes immediately before write; prohibit edit and require Program reissue on mismatch |
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
