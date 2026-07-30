# Plan Pack — Material Assemblies and Accessories

## Status Tuple

- Profile: `Q2_CRITICAL_CHANGE_GATE` / high blast radius.
- Run scope: `PLAN_ONLY`; this pack changes no product code, tests, or migrations.
- Package status: `CONDITIONALLY_READY`.
- Implementation status: `NOT_STARTED`.
- Ready work: `UNIT-001` only. It may reconcile dependency candidates and establish red evidence; it may not implement product behavior.
- Hard prerequisites: completed and freshly evidenced governance, `Material-Variants-And-Value-Engineering`, and `Commercial-Remarks-Quotations-And-VAT` packs.
- Reserved migration after those prerequisites: `migrations/0129_material_assemblies_accessories.sql`.
- Sequenced ownership: governance `0126`, variants/value engineering `0127`, Commercial remarks/quotation/VAT `0128`, assemblies/accessories `0129` at the observed baseline.
- First unit: `UNIT-001`.

### Current-source refresh — 2026-07-30

The current hierarchy treats node kind as vestigial and presents every node as
an Area. Therefore every same-area invariant in this pack means equality of the
canonical estimate-tree `node_id`, in addition to workspace/project/estimate/tab
ownership. No assembly schema or product implementation exists yet.

## Outcome

Keep estimate rows flat under their current areas while adding durable same-area assembly/accessory relationships, bounded bill-of-material quantity rules, atomic graph mutations, and presentation rollups. The completed value-engineering resolver remains the single source of effective pre-tax contribution so parent rollups never become a second cost and excluded or unselected roots suppress every descendant.

## Task Contract

### Objective

Deliver an executable implementation plan for assembly/accessory D1 relations, invariants, quantity-rule evaluation, mutation/collaboration behavior, copy/template remapping, deletion/move semantics, UI, totals, and exports.

### In scope

- Persist additive parent-child accessory edges, required or optional.
- Enforce at most one parent, the same workspace/project/estimate/tab and exact canonical `node_id`, no self edge, no cycle, and revision-checked atomic graph mutation.
- Reuse the contribution-scope revision and pure effective-contribution resolver created by the variants pack.
- Add a bounded typed quantity-rule evaluator for fixed, per-parent, area, edge-length, and restricted AST rules; never evaluate source text.
- Preserve flat area rows, keep every closure in one estimate area, and derive assembly hierarchy only as a relation-backed presentation view.
- Make direct row cost contribute once; make assembly rollup presentation-only.
- Zero descendants when an alternative root is unselected or an optional root/accessory is excluded.
- Restrict alternative members and optional items to assembly roots.
- Integrate history, receipts, collaboration, deletion, move, row/assembly duplication, tab copy, templates, exports, accessibility, and performance.

### Non-goals

- No second option model, alternative model, optional model, contribution resolver, row-total oracle, receipt system, or collaboration channel.
- No VAT, tax treatment/rate/rounding, remarks, quotation status, or quotation attachment field; Commercial `0128` owns them.
- No use of `scopeStatus` as optional, alternative, accessory, or assembly state.
- No free-form JavaScript, `eval`, `Function`, dynamic import, SQL expression, or unbounded parser for formulas.
- No area-tree reparenting to simulate assemblies; rows remain flat under one shared area per assembly closure.
- No deployment, remote D1 apply, feature flag, dual path, compatibility layer, rollout ceremony, or hosted claim.

### Authoritative inputs

- The assignment and latest migration corrections in this task.
- Root `AGENTS.md`, `.ai/AGENTS.md`, canonical Plan Pack suite/schema/directive, BETA protocol, and Validation Matrix.
- Sanitized raw client input: `.ai/03_plans/2026-07-28/Client-Feedback-Resolution-Program/evidence/client-feedback.md:1`, with accessory feedback at `:28`, value-engineering feedback at `:33`, and the Commercial remarks/VAT boundary at `:41`; per `:8`, it is product input rather than technical root-cause proof.
- The governance, variants, and `.ai/03_plans/2026-07-28/Commercial-Remarks-Quotations-And-VAT/00-PLAN.md` plans, current source/diff, migration inventory, and validated incident-pack manifest shape.

### Constraints and authority

- Do not make `UNIT-002` ready until all three prerequisite manifests say implementation `COMPLETE`, required gates/reviews are fresh `PASS`, and their exact candidate hashes are recorded by `UNIT-001`.
- Preserve unfamiliar shared-worktree changes. Reread every shared source immediately before patching.
- Run GitNexus upstream impact before editing any existing function/class; if the index is unavailable/stale, use current-source callers and focused tests and record the degraded evidence.
- Local implementation and D1 fixtures are authorized. Remote apply, deployment, destructive data loss, and unrelated resources are not.

### Acceptance and stop

- Successful stop requires every unit `VERIFIED`, every criterion/test/gate fresh `PASS`, Q2 aggregate `PASS`, an independent read-only quality approval, a distinct security/data-boundary approval, and no unresolved high/critical issue.
- Missing, skipped, flaky, malformed, stale, or inherited-but-unattributed evidence fails closed.
- An invalid graph or invalid rule blocks mutation/totals/exports; it never silently drops descendants or returns a partial cost.

## Current Source Evidence

1. `src/lib/estimates/types.ts:96` models flat estimate rows with no assembly parent/edge fields. Rows remain attached to area nodes rather than becoming tree nodes.
2. `src/components/workshop/estimate-sheet/rows/editable-row-model.ts:391`-`:423` recursively totals area nodes by summing every flat row; it has no relation-aware effective-contribution input.
3. `src/lib/estimates/estimate-row-total.ts:199` computes one row's direct cost and `:266` sums rows. These direct-cost rules remain canonical; assembly code must not recreate them.
4. `src/lib/estimates/parse-quantity-expression.ts:45`-`:90` accepts one numeric base with at most one `+` or `-`. It is intentionally too narrow for BOM rules and must remain the row quantity editor parser.
5. `src/lib/estimates/estimate-tree-read-repository.ts:949`-`:978` loads nodes/rows per tab and `:935`-`:945` groups flat rows by tab. Accessory edges should load as a scoped sidecar.
6. `src/lib/estimates/d1-intents/rows.ts:2079` duplicates one row, `:2537` deletes one row, `:2647` bulk deletes rows, and `:2764` moves rows. The move path already rejects cross-tab targets at `:2840`-`:2842`.
7. `src/lib/estimates/d1-intents/tabs.ts:521`-`:689` atomically duplicates a tab with `nodeIdBySource` and `rowIdBySource`, a source fingerprint, history/outbox, publication revision, and receipt.
8. `src/lib/estimates/d1-intents/templates.ts:499`-`:735` and `:983`-`:1453` copy and instantiate template rows with ID maps. Template authoring writes rows at `src/lib/component-library/template-editor-actions.ts:866`; linked propagation maps rows at `src/lib/component-library/template-propagation-d1.ts:347`.
9. `src/lib/estimates/d1-intents/history-events.ts:328` prepares scoped history/outbox statements and `src/lib/estimates/mutation-receipts.ts:1` owns stable mutation receipts. Assembly mutations reuse them.
10. `src/lib/collaboration/estimate-tree-realtime-contract.ts:3` exposes branch/full-refetch events; `src/hooks/use-estimate-row-update-broadcast.ts:91` is row-scoped. The variants pack adds a contribution-scope revision event that this pack must extend, not duplicate.
11. `src/lib/proposal-export/build-proposal-export-model.ts:92`-`:151` and `src/lib/proposal-export/create-proposal-workbook.ts:334`-`:415` currently project direct rows independently. Completed variants and Commercial packs must already have routed these through one contribution-then-tax pipeline.
12. `src/lib/proposal-export/types.ts:6` defines proposal `scopeStatus`; this pack must not reinterpret it.
13. `migrations/0015_publication_admin_sidecars.sql:11` and the current rebuild at `migrations/0082_estimate_row_integrity_constraints.sql:4` show flat row persistence. `migrations/0024_estimate_templates.sql:37` shows flat template rows.
14. The active migration inventory ends at unfamiliar `0125_client_portal_cutover_barrier_lease.sql`. Governance reserves `0126`; variants now reserve `0127`; Commercial must reserve `0128`; this pack reserves `0129`.
15. At this planning baseline, the governance, variants, and Commercial manifests are conditional with implementation `NOT_STARTED`. Therefore this pack must remain conditional and only `UNIT-001` may be ready.

## Integrated Architecture Decisions

### `DEC-AUTO-001` — Relation sidecar, flat rows

An assembly is not a new row/node kind and does not reparent rows out of areas. `estimate_accessory_edges` relates existing row IDs. Read models return flat rows plus a scoped contribution graph; UI derives indentation, badges, and rollups.

### `DEC-AUTO-002` — Separate ontology feeding one resolver

- Variant: one canonical option for one row; Variants pack.
- Alternative: root group with exactly one selected member; Variants pack.
- Optional item: top-level include/exclude root; Variants pack.
- Accessory: additive parent-child edge, required or optional; this pack.
- `scopeStatus`: proposal/publication scope only.

These records remain independently persisted. They converge only at `resolveEffectiveContributions`; this pack may supply additive edges and rule results but may not fork or replace the resolver.

### `DEC-AUTO-003` — `0129` schema ownership

`migrations/0129_material_assemblies_accessories.sql` owns:

- `estimate_accessory_edges` with scoped IDs, parent row ID, unique child row ID, required/optional mode, optional inclusion state, typed rule JSON, edge revision, actor/timestamps, and indexes.
- `estimate_template_accessory_edges` with equivalent template-row relationships/rules.
- Checks/triggers for no self edge, one parent, valid mode/state, valid JSON envelope/version, same workspace/project/estimate/tab and equal canonical `node_id`, and no cycles using a bounded recursive CTE.
- Root guards that prevent an accessory child from being an alternative member or optional root, and prevent an existing alternative/optional root from becoming a child unless its root record is removed in the same guarded command order.

It reuses the variants pack's `estimate_contribution_scopes`, alternative/optional tables, history/outbox, receipts, and publication revision. It never claims `0127` or Commercial's `0128`.

### `DEC-AUTO-004` — Defense-in-depth graph mutation

The server validates a complete tab-scoped graph before writing. The D1 batch then checks expected contribution-scope revision, expected affected row/edge revisions, row/tab/workspace ownership, parent existence, child uniqueness, equal canonical `node_id`, and a no-cycle trigger. One batch writes edge changes, increments the scope revision, writes history/outbox/publication revision, and commits one receipt. Concurrent reparenting has one winner; stale requests fail without partial writes.

### `DEC-AUTO-005` — One-parent and root semantics

- A row has at most one incoming accessory edge, enforced by unique child identity.
- Parent and child must share workspace, project, estimate, tab, and the exact canonical estimate-tree `node_id`. Cross-node edges are invalid rather than implicitly reattributed, regardless of vestigial node kind.
- Nested accessories are allowed while acyclic.
- Alternative groups accept only roots. Optional items are roots. A root cannot be both alternative member and optional item.
- Excluded optional accessories remain persisted but do not contribute.

### `DEC-AUTO-006` — Bounded typed quantity rules

Create `src/lib/estimates/accessory-quantity-rule.ts:1`; do not expand `parseQuantityExpression` into a general parser.

```text
fixed       -> explicit finite child quantity
per-parent  -> finite factor × effective parent quantity
area        -> finite measured area × finite factor
edge-length -> finite measured edge length × finite factor
formula     -> versioned restricted AST over parentQuantity, area, edgeLength, and numeric literals
```

The AST allows only literal, named-variable, add, subtract, multiply, and divide nodes. Validation limits depth to 8 and total nodes to 32, requires finite safe decimal operands/results, rejects missing variables and division by zero, and rounds the final quantity to six decimal places before the existing money oracle. UI persists structured JSON from typed controls; no text is evaluated. Area/edge measurements and their units are explicit rule operands, not inferred from free-form row text.

### `DEC-AUTO-007` — Effective quantity and no double counting

Traverse roots in stable row order and edges in stable ID order. A child rule receives its parent's effective quantity. The resolver emits each included row's direct-cost contribution once. A root's assembly rollup is a derived presentation sum of its included closure and is never fed back into project totals. An unselected alternative root or excluded optional root zeros its entire closure; an excluded optional edge zeros that child closure.

Any missing row, missing required rule input, duplicate parent, cycle, unsafe number, or inconsistent root role returns typed invalidity and blocks totals/export.

### `DEC-AUTO-008` — Direct cost and Commercial ordering

`computeEstimateRowCostParts` remains the direct row money oracle. The processing order is:

```text
row direct cost -> effective inclusion/quantity graph -> pre-tax contributions -> Commercial 0128 tax treatment -> summaries/exports
```

Assembly code defines no VAT field and never applies tax. It preserves Commercial's contribution consumer and rounding contract.

### `DEC-AUTO-009` — Copy and template ID remap

- Tab duplication remaps every in-tab edge through `rowIdBySource` and includes edges in the source fingerprint/statement limit/history/receipt.
- Template authoring stores template edges only when both endpoints are selected template rows.
- Template insertion and linked propagation remap both endpoints through template-to-estimate row maps in the same atomic batch.
- External/dangling edges are rejected rather than silently omitted.
- Single-row duplicate remains a standalone root. A new explicit `duplicate assembly` command copies one root closure and remaps all internal edges/rules atomically.

### `DEC-AUTO-010` — Delete and move semantics

- Deleting a child removes its incoming edge and row atomically.
- Deleting a parent with descendants is rejected unless the command explicitly chooses `delete_closure` or `dissolve_and_delete_parent`.
- `delete_closure` deletes the root, descendants, root alternative/optional records, all edges, and history snapshots in one revision-checked mutation.
- `dissolve_and_delete_parent` deletes outgoing edges, promotes direct children to roots, and deletes the parent. If the parent is selected in an alternative or marked optional, the caller must provide an explicit replacement/root-record action; no implicit reassignment occurs.
- A single-row area move is rejected while that row has an incoming or outgoing assembly edge; it never strands a cross-area relation.
- A dedicated `move assembly` command moves one root and its complete closure to a target area in one revision-checked batch, preserves every edge/rule, updates all row area parents, and emits one history/receipt/broadcast event. Partial closure moves fail with zero writes.
- Reparenting is allowed only inside the current area. Cross-area reparenting and every cross-tab move remain rejected.
- Area subtotal attribution never follows a presentation rollup: every direct row remains in the common area and contributes there once.

### `DEC-AUTO-011` — Collaboration and audit

Extend the variants contribution-scope event with changed edge/root IDs and the new monotonic revision. Clients apply only the next revision; duplicates are idempotent and gaps/future versions trigger authoritative refetch. History payloads record before/after parent, mode, inclusion, rule version/body, affected closure IDs, and expected/committed revisions without storing private attachment content.

### `DEC-AUTO-012` — Migration serialization

Immediately before execution, inspect actual migration files and all active reservations. Governance `0126`, variants `0127`, Commercial `0128`, and assemblies `0129` are one serialized baseline. Any drift makes the plan stale and requires immediate cross-pack rebaseline before editing. This pack never takes `0127` or `0128`.

## Requirements

### `OPS-001` — Prerequisite candidate integrity

Governance, variants, and Commercial implementations, migrations, Q2 evidence, reviews, resolver API, contribution-scope revision, and tax-consumer contract are complete and bound to recorded hashes before assembly implementation begins.

### `DATA-001` — Scoped acyclic edge persistence

`0129` persists estimate/template accessory edges with one parent, same-scope and same-area endpoints, no-self, no-cycle, valid root role, revision, history, receipt, and collaboration invariants.

### `REQ-001` — Bounded quantity rules

Fixed, per-parent, area, edge-length, and restricted AST rules evaluate deterministically without source evaluation, unbounded recursion, unsafe numbers, or silent missing-input coercion.

### `REQ-002` — One effective contribution

Assemblies feed the existing pure resolver; each direct row contributes at most once, rollups are presentation-only, and every excluded/unselected ancestor zeros descendants.

### `REQ-003` — Mutation and lifecycle semantics

Create/reparent/mode/include/rule/delete/dissolve/duplicate/move/copy/template operations are authorized, idempotent, revision checked, atomic, auditable, and collaboration-safe.

### `REQ-004` — UI and export truth

The authenticated sheet and proposal/workbook exports disclose hierarchy, required/optional state, rule basis, inclusion reason, direct amount, and rollup without adding rollup cost or duplicating Commercial tax.

### `OPS-002` — Q2 evidence

Red-before-green migration, rule, graph, property, mutation, concurrency, collaboration, browser, accessibility, performance, full relevant suite, and two independent reviews bind the exact candidate.

## Acceptance Criteria

### `AC-001` — Dependency gate and migration order

Recorded prerequisite candidates are complete/fresh; `0129` follows governance `0126`, variants `0127`, and Commercial `0128`; empty/legacy/corrupt fixtures prove schema and triggers without modifying earlier migrations.

### `AC-002` — Graph invariants and concurrency

Self, cycle, second-parent, cross-workspace/project/estimate/tab/area, non-root alternative/optional, stale revision, partial closure move, and concurrent reparent attempts fail with zero partial writes; valid nested same-area graphs replay one receipt/event.

### `AC-003` — Quantity evaluator

Every rule kind, variable combination, boundary, rounding case, invalid AST, missing metric, division by zero, depth/node limit, NaN/infinity/overflow, and deterministic serialization case has passing example and mutation evidence.

### `AC-004` — No-double-count contribution parity

Generated and hand-authored nested same-area assemblies prove each direct cost contributes once in its owning area, rollup is display-only, exclusion propagates, order does not matter, malformed/cross-area graphs fail closed, and tree/live/proposal/XLSX totals reconcile through Commercial.

### `AC-005` — Lifecycle, collaboration, and accessible UX

Copy/template/delete/dissolve/duplicate/whole-assembly-area-move/reparent/reload/concurrent-client journeys preserve exact same-area graph semantics; partial/cross-area moves fail closed; controls are keyboard/screen-reader/focus safe and current performance budgets pass.

### `AC-006` — Exact-candidate Q2 closeout

All focused/full commands pass without skips/flakes, critical coverage/mutation pass, independent quality and distinct security/data reviews approve the same hash, and `quality:critical` reports `PASS`.

## Dependency DAG

```text
UNIT-001 Dependency reconciliation + red contracts
    -> governance COMPLETE + 0126 PASS
    -> variants COMPLETE + 0127 PASS
    -> Commercial COMPLETE + 0128 PASS
        -> UNIT-002 0129 edge schema + graph adapter
            -> UNIT-003 Bounded quantity evaluator
                -> UNIT-004 Atomic lifecycle, copy/template, collaboration
                    -> UNIT-005 Resolver/UI/export integration
                        -> UNIT-006 Q2 reconciliation and reviews
```

Only `UNIT-001` is currently `READY`. `UNIT-002` through `UNIT-006` remain `PLANNED`. After `UNIT-001`, promote only `UNIT-002` when all three prerequisite manifests/evidence are complete and current, `0126`-`0128` exist in the expected order, `0129` remains unallocated, and the shared resolver/Commercial contracts have been reread.

## Execution Units

### `UNIT-001` — Reconcile dependencies and establish red evidence

- Status: `READY`.
- Depends on: none.
- Exact ownership during execution: new tests only — `tests/vitest/material-assemblies-accessories-migration.test.ts:1`, `tests/vitest/accessory-quantity-rule.test.ts:1`, `tests/vitest/estimate-assembly-graph-d1.test.ts:1`, `tests/property/assembly-contribution-graph.property.test.ts:1`, `tests/vitest/estimate-assembly-export-parity.test.ts:1`, and `e2e/material-assemblies-accessories.spec.ts:1`.
- Work: capture HEAD/status/diff/migration reservations; bind governance/variants/Commercial manifests, candidate hashes, gates, and resolver/tax contracts; write focused tests first and run them to an expected behavioral red state.
- Dependency gate: do not edit product source or migrations. If any prerequisite is absent/incomplete/stale or `0129` ownership is ambiguous, retain all downstream units as `PLANNED` and stop with exact findings.
- Evidence: `TEST-001`; JSON contains only named absent assembly/rule behavior failures with zero skipped/malformed tests.
- Recovery: repair test harness/fixture defects; never weaken cycle, double-count, or ordering assertions to manufacture red.

### `UNIT-002` — Author `0129` and graph read adapter

- Status: `PLANNED`.
- Depends on: `UNIT-001` plus all three completed prerequisite packs.
- Exact ownership: `migrations/0129_material_assemblies_accessories.sql:1`, new `src/lib/estimates/assembly-graph.ts:1`, `src/lib/estimates/types.ts:96`, `src/lib/estimates/estimate-tree-read-repository.ts:949`, `src/lib/component-library/template-editor-actions.ts:866`, and the migration test from `UNIT-001`.
- Work: create estimate/template edge tables, constraints/triggers/indexes; extend read result with a sidecar graph; validate same-scope/same-area/root roles/cycles; keep flat rows unchanged.
- Migration boundary: re-resolve inventory immediately before edit. Before any bound apply, repair `0129` in place. After any apply, never edit it; use the next free fix-forward migration after cross-pack rebaseline. Never claim `0127` or `0128`.
- Evidence: empty/legacy/corrupt/idempotency fixtures and migration checker prove ordering, triggers, root guards, and no row-tree rewrite.
- Recovery: local failures patch forward. Any bound-apply defect requires a new migration and refreshed plan; no rollback/renumbering.

### `UNIT-003` — Implement the bounded typed rule evaluator

- Status: `PLANNED`.
- Depends on: `UNIT-002`.
- Exact ownership: new `src/lib/estimates/accessory-quantity-rule.ts:1`, new `src/lib/estimates/accessory-quantity-rule-schema.ts:1`, `src/lib/estimates/parse-quantity-expression.ts:45` only for explicit non-regression boundaries, and evaluator/property tests from `UNIT-001`.
- Work: define versioned discriminated rule/AST types, schema validation, deterministic evaluator, unit normalization, finite/safe bounds, six-decimal quantity rounding, typed errors, and serialization. Do not parse/evaluate code or modify the row quantity parser's grammar.
- Evidence: examples, generated ASTs, mutation operators, round-trip serialization, depth/node/number/division/missing-variable rejection, and no-eval source scans pass.
- Recovery: invalid persisted rule blocks mutation/read totals with a typed repair error; it never becomes zero or raw text execution.

### `UNIT-004` — Add atomic graph lifecycle and remapping

- Status: `PLANNED`.
- Depends on: `UNIT-003`.
- Exact ownership: new `src/lib/estimates/d1-intents/assemblies.ts:1`, `src/lib/estimates/actions.ts:1`, `src/lib/estimates/d1-intents/history-events.ts:328`, `src/lib/estimates/d1-intents/rows.ts:2079`, `src/lib/estimates/d1-intents/rows.ts:2537`, `src/lib/estimates/d1-intents/rows.ts:2647`, `src/lib/estimates/d1-intents/rows.ts:2764`, `src/lib/estimates/d1-intents/tabs.ts:521`, `src/lib/estimates/d1-intents/templates.ts:499`, `src/lib/component-library/template-editor-actions.ts:866`, `src/lib/component-library/template-propagation-d1.ts:347`, `src/lib/collaboration/estimate-tree-realtime-contract.ts:3`, and `src/hooks/use-estimate-row-update-broadcast.ts:91`.
- Work: create/reparent/mode/include/rule/duplicate-assembly/delete-closure/dissolve/move-assembly commands; deny incident-edge single-row moves and cross-area reparenting; atomically move complete closures; add expected revisions/fingerprints, history/outbox/receipt, tab/template remap/source guards/statement limits, collaboration revision events, and refetch gaps.
- Evidence: auth/scope, concurrent race, replay, cycle/second-parent/cross-area denial, copy/template dangling-edge rejection, delete/dissolve, duplicate closure, complete area move, partial move denial, cross-tab denial, history, and collaboration tests pass with zero partial writes.
- Recovery: ambiguous failure reads receipt; stale conflict refetches full graph and requires a new explicit command. No last-write-wins graph merge.

### `UNIT-005` — Feed resolver and add UI/export presentation

- Status: `PLANNED`.
- Depends on: `UNIT-004`.
- Exact ownership: completed `src/lib/estimates/effective-contribution.ts:1` adapter boundary only, `src/lib/estimates/estimate-row-total.ts:199`, `src/components/workshop/estimate-sheet/rows/editable-row-model.ts:289`, new `src/components/workshop/estimate-sheet/assembly-controls.tsx:1`, `src/components/workshop/estimate-sheet/rows/cells.tsx:365`, `src/components/workshop/EstimateSheetContent.tsx:2609`, `src/lib/proposal-export/build-proposal-export-model.ts:92`, `src/lib/proposal-export/create-proposal-workbook.ts:334`, and `src/lib/proposal-export/types.ts:6`.
- Work: evaluate rules into generic additive edges; feed the existing resolver; render same-area flat-row hierarchy and presentation rollups; keep each direct contribution in the common owning area; add required/optional/reparent/rule/whole-assembly-move controls and invalid-state UX; export hierarchy/direct/rollup/inclusion/rule basis through the existing contribution-then-Commercial pipeline.
- Ownership guard: do not fork the resolver or tax calculator. If their completed APIs cannot support this adapter, stop stale and revise the dependency contract before editing them.
- Evidence: example/property parity, live/summary/proposal/XLSX reconciliation, keyboard/a11y/browser journeys, collaboration reload, and performance/bundle budgets pass.
- Recovery: invalid graph/rule blocks totals and export with actionable state; UI refetches authoritative graph and restores focus after failed mutation.

### `UNIT-006` — Reconcile exact-candidate Q2 evidence

- Status: `PLANNED`.
- Depends on: `UNIT-005`.
- Exact ownership: implementation-created machine-readable files under `artifacts/quality/`; product edits only for failures proven task-owned.
- Work: run focused-to-broad evidence serially; inspect SQL/test/export artifacts; run property and mutation gates; run collaboration/browser/a11y/performance/full relevant suite; obtain independent read-only quality and distinct security/data reviews; run graph/diff reconciliation and Q2 aggregate.
- Evidence: `TEST-006` and `GATE-Q2` become `PASS` only from fresh exact-candidate artifacts.
- Recovery: repair narrowly; rerun invalidated layers and both reviews when candidate hash changes. Never convert missing or inherited red evidence to `PASS`.

## Adversarial Evidence Matrix

| Challenge | Required signal |
| --- | --- |
| Self edge | Server and D1 reject before commit; no revision/history/receipt mutation |
| Two concurrent parents | One CAS winner; loser receives stale conflict; unique child remains |
| Deep cycle insertion | Server preflight and recursive trigger reject; existing graph unchanged |
| Cross-area relation | Rejected even when workspace/project/estimate/tab match |
| Single-row area move with assembly edges | Rejected; no row or edge changes |
| Whole assembly area move | Root and complete closure move atomically; all edges persist and old/new area subtotals reconcile |
| Cross-tab relation | Rejected even when workspace/estimate match |
| Alternative member becomes child | Rejected unless root membership is explicitly removed in the same guarded command |
| Excluded/unselected root | Every descendant effective quantity/contribution is zero while persisted graph remains |
| Nested per-parent rule | Child uses effective parent quantity exactly once and remains deterministic across row order |
| Invalid formula | Missing variable, divide by zero, depth/node overflow, unsafe number, or malformed JSON blocks totals/export |
| Presentation rollup | Root display includes descendants; project total sums direct included rows only |
| Area attribution | Every direct row remains in the assembly's common area and contributes to that recursive area subtotal exactly once |
| Tab/template copy | Both endpoints remap to destination IDs; dangling/external edges reject atomically |
| Parent deletion | Default rejects; explicit closure delete and dissolve have distinct audited results |
| Collaboration gap | Revision gap causes full graph refetch, not partial edge merge |
| Commercial parity | Pre-tax graph output flows into existing tax stage; no assembly VAT field or duplicate tax |

## Tests and Exact Evidence Commands

Run serially from the repository root after confirming no other heavy command is active.

### `TEST-001` — Dependency-bound red baseline

```powershell
bun x vitest run tests/vitest/material-assemblies-accessories-migration.test.ts tests/vitest/accessory-quantity-rule.test.ts tests/vitest/estimate-assembly-graph-d1.test.ts tests/vitest/estimate-assembly-export-parity.test.ts --maxWorkers=1 --reporter=json --outputFile=artifacts/quality/material-assemblies-red.json
```

Expected before green: nonzero exit caused only by named absent assembly/rule behavior, zero skipped/malformed tests. Do not progress while prerequisite manifests/evidence are incomplete. After `UNIT-002`-`UNIT-005`: exit `0`.

### `TEST-002` — Migration, graph mutation, copy, and templates

```powershell
bun x vitest run tests/vitest/material-assemblies-accessories-migration.test.ts tests/vitest/estimate-assembly-graph-d1.test.ts tests/vitest/estimate-actions-d1-reorder-history.test.ts tests/vitest/estimate-template-trusted-insert.test.ts tests/vitest/template-editor-actions-authz.test.ts --maxWorkers=1 --reporter=json --outputFile=artifacts/quality/material-assemblies-d1.json
bun run dev:check-d1-migrations
```

Expected: exit `0`; no-self/cycle/one-parent/scope/same-area/CAS/replay/delete/dissolve/remap, incident-edge single-row move denial, and atomic whole-closure area move cases pass; migration inventory orders `0129_material_assemblies_accessories.sql` after Commercial `0128`.

### `TEST-003` — Rule and property evidence

```powershell
bun x vitest run tests/vitest/accessory-quantity-rule.test.ts tests/vitest/effective-contribution-resolver.test.ts tests/vitest/estimate-row-total.test.ts tests/vitest/calculation-output-parity.test.ts --maxWorkers=1 --reporter=json --outputFile=artifacts/quality/material-assemblies-calculation.json
bun run test:property
rg -n "eval\(|new Function|Function\(" src/lib/estimates/accessory-quantity-rule.ts src/lib/estimates/accessory-quantity-rule-schema.ts
```

Expected: tests/property command exit `0`; generated graphs prove acyclicity/no-double-count/order invariance/descendant zeroing and rule bounds. The source scan exits `1` with no matches.

### `TEST-004` — Collaboration, UI, and accessibility

```powershell
bun x vitest run tests/vitest/project-collaboration-tree-contract.test.ts tests/vitest/estimate-row-update-broadcast.test.ts tests/vitest/estimate-assemblies-ui.test.tsx tests/vitest/activity-accessibility.test.tsx --maxWorkers=1 --reporter=json --outputFile=artifacts/quality/material-assemblies-ui.json
bun run test:a11y
```

Expected: exit `0`; revision races/gaps/refetch, keyboard hierarchy/rule controls, focus restoration, labels, announcements, and invalid-state disclosure pass.

### `TEST-005` — Browser, export, and performance

```powershell
bun x playwright test e2e/material-assemblies-accessories.spec.ts --workers=1 --reporter=json > artifacts/quality/material-assemblies-playwright.json
bun x vitest run tests/vitest/estimate-assembly-export-parity.test.ts --maxWorkers=1 --reporter=json --outputFile=artifacts/quality/material-assemblies-export.json
bun run perf:profile-peak-load
bun run test:e2e:perf
bun run quality:bundle-budget
```

Expected: browser/export commands pass without retries/skips; create/reparent/rule/include/reload/copy/template/delete/whole-assembly-area-move/export journeys reconcile; cross-area and partial moves fail; old/new recursive area totals, project totals, and exports count each direct contribution once; current route, interaction, resolver, and bundle budgets remain green.

### `TEST-006` — Full relevant Q2 candidate

```powershell
bun run type-check
bun run lint -- src/lib/estimates/assembly-graph.ts src/lib/estimates/accessory-quantity-rule.ts src/lib/estimates/accessory-quantity-rule-schema.ts src/lib/estimates/effective-contribution.ts src/lib/estimates/estimate-row-total.ts src/lib/estimates/d1-intents/assemblies.ts src/lib/estimates/d1-intents/rows.ts src/lib/estimates/d1-intents/tabs.ts src/lib/estimates/d1-intents/templates.ts src/lib/estimates/d1-intents/history-events.ts src/lib/estimates/estimate-tree-read-repository.ts src/lib/estimates/actions.ts src/lib/component-library/template-editor-actions.ts src/lib/component-library/template-propagation-d1.ts src/lib/collaboration/estimate-tree-realtime-contract.ts src/hooks/use-estimate-row-update-broadcast.ts src/components/workshop/estimate-sheet/assembly-controls.tsx src/components/workshop/estimate-sheet/rows/editable-row-model.ts src/components/workshop/estimate-sheet/rows/cells.tsx src/components/workshop/EstimateSheetContent.tsx src/lib/proposal-export/build-proposal-export-model.ts src/lib/proposal-export/create-proposal-workbook.ts src/lib/proposal-export/types.ts
bun run build
bun run quality:diff-coverage
bun run test:mutation:changed
bun run test:mutation:critical
bun run test:e2e:smoke
bun run test:e2e:matrix
bun run quality:reviews
bun run quality:security
bun run quality:critical
git diff --check
```

Expected: every command exits `0`; artifacts name `Q2_CRITICAL_CHANGE_GATE`; critical coverage and mutation pass; independent quality and distinct security/data reviewers approve the exact candidate; aggregate is `PASS`; diff check is empty.

Before each existing-symbol edit run upstream impact. Before closeout run `detect_changes({scope: "compare", base_ref: "main"})`; only planned assembly/rule/migration/copy/template/collaboration/UI/export/evidence flows may appear.

## Risks

| ID | Risk | Mitigation |
| --- | --- | --- |
| `RISK-001` | An executor skips incomplete prerequisite packs | Conditional manifest exposes only `UNIT-001`; downstream remains `PLANNED` until exact prerequisite hashes/gates are bound |
| `RISK-002` | Migration inventory shifts | Re-resolve all four owners immediately before execution; never take `0127` or `0128` |
| `RISK-003` | Cycle/second-parent race bypasses app validation | Full-graph preflight plus D1 unique child, recursive trigger, scope CAS, and concurrency tests |
| `RISK-004` | Rollup is added as a second cost | Existing resolver remains sole contribution oracle; rollup has presentation-only type/API and property/mutation/export parity |
| `RISK-005` | Formula evaluator becomes code execution or unbounded | Structured discriminated JSON, restricted AST, fixed depth/node/number limits, no parser/eval, source scan and mutations |
| `RISK-006` | Root inclusion semantics conflict | Durable root guards and explicit atomic conversion order; no implicit alternative/optional reassignment |
| `RISK-007` | Copy/template leaves dangling source IDs | Require both endpoints in source closure, remap through existing maps, fingerprint relations, reject external edges |
| `RISK-008` | Delete/move silently changes graph meaning or shifts cost between areas | Typed delete-closure/dissolve/reparent/move-assembly commands; incident-edge single-row and cross-area moves fail; whole closures move atomically; tree/export area parity passes |
| `RISK-009` | Collaboration clients calculate different graphs | Monotonic contribution revision, duplicate idempotency, gap refetch, canonical server graph |
| `RISK-010` | Commercial tax is duplicated or bypassed | Explicit contribution-before-tax dependency, no assembly tax fields, integrated parity tests after Commercial |

## Recovery and Resume

1. Resume at `UNIT-001`; record HEAD, status, scoped diff hashes, migration inventory/reservations, host health, and governance/variants/Commercial candidate hashes.
2. Write/run red contracts first. Syntax/import/fixture failures are not acceptable behavioral red evidence.
3. If any prerequisite is absent, incomplete, stale, failing, or contract-incompatible, leave `UNIT-002`-`UNIT-006` `PLANNED` and stop with the exact dependency finding. Do not bypass or manually mark ready.
4. After all prerequisites complete, reread their final migrations, resolver, contribution revision, Commercial consumer/rounding, exports, and shared diffs; refresh this plan/manifest and promote only `UNIT-002`.
5. Before local/bound apply, repair unissued `0129` in place. After any bound apply, use a new fix-forward migration and rebaseline; never edit/renumber issued SQL.
6. On ambiguous D1 failure, read the receipt. On revision conflict, refetch the full graph and require a new explicit mutation.
7. On invalid persisted graph/rule, block totals/export and use an audited repair command; never drop an edge or coerce a value silently.
8. After candidate changes, invalidate affected evidence and both reviews, rerun narrowly, then rerun Q2 aggregate.

## Stale Triggers

1. Migration inventory/reservations no longer serialize governance `0126`, variants `0127`, Commercial `0128`, assemblies `0129`.
2. `migrations/0129_material_assemblies_accessories.sql` exists from another owner, or an earlier prerequisite migration is renumbered/fix-forwarded.
3. Governance, variants, or Commercial manifest status, evidence, candidate hash, migration, or stop contract changes.
4. The variants contribution-scope schema/resolver/additive-edge port changes or lacks required invalidity/no-double-count semantics.
5. Commercial changes contribution ordering, tax ownership, or export rounding contract.
6. Row/tree/read/mutation/history/receipt/copy/template/collaboration/export source or unfamiliar diffs change.
7. D1 recursive-trigger support or migration checker behavior changes.
8. Current HEAD, source anchors, or scoped diff no longer matches the recorded baseline.

On any trigger, stop, reread source/diff and prerequisite candidates, re-resolve migration numbers immediately, refresh the DAG/units/evidence/manifest hashes, and revalidate. Never continue with stale `0129` or claim `0127`/`0128`.

## Stop Condition

Stop only when rows remain flat under one common area per assembly; durable required/optional edges satisfy one-parent/same-scope/same-area/no-self/no-cycle/revision invariants; bounded typed rules run without evaluation; alternative/optional roots and descendant suppression remain correct; each direct cost contributes once to its owning area while rollups stay presentation-only; single-row/cross-area moves fail and whole-assembly moves are atomic; lifecycle/copy/template/collaboration/tree/export behavior is auditable; Commercial remains the sole tax owner; and fresh Q2 evidence plus both independent reviews pass. Do not deploy or claim hosted behavior.
