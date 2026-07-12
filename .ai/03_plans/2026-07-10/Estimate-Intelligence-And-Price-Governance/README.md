# Estimate Intelligence And Price Governance - Plan Pack

> **Current execution contract:** Read AGENTIC_EXECUTION_PROFILE.md before
> implementation. It applies the current lean agent workflow and User Test
> Authorization Gate to all older execution, testing, browser, validation, and
> reviewer language in this pack without changing product scope or status.
>
> **Freshness:** CURRENT_SOURCE_AND_READINESS_AUDIT.md is the authoritative
> 2026-07-12 source-drift and individual readiness verdict. Older line numbers,
> migration tails, and active-pack locations are historical navigation only.

Status tuple: `package_status=IMPLEMENTATION_READY`,
`implementation_status=NOT_STARTED`, `release_status=NOT_EVALUATED`,
`plan_lifecycle=ACTIVE`, `terminal_status=ACTIVE`.

## Goal Capsule

Turn the existing estimate and component-library data into a decision surface that
tells an estimator what is incomplete, risky, stale, expensive, or materially
changed, and leads directly to the affected rows. The pack owns:

- `BETA-P1-01` Estimate Health cockpit;
- `BETA-P1-02` analytics drill-through;
- `BETA-P1-03` revision intelligence;
- `BETA-P1-08` price freshness governance; and
- a capability-extraction receipt for the program-owned `BETA-P1-10` evidence
  gate, limited to the analytics files this work touches.

The before-state already has a strong estimate tree, price provenance fields,
library freshness chips, budget presentation, project charts, and activity
history. The missing contract is a single, deterministic health model backed by
typed project inputs and repository-owned analytics. Current rules are spread
across UI and repository files, price thresholds are fixed constants, the Data
route is primarily totals and composition, and warnings do not have a canonical
row-query contract.

## Target Outcome

After implementation:

1. A project stores typed analytical inputs instead of hiding them in JSON.
2. Workspace/category price-freshness policy is explicit and validated.
3. One pure health engine classifies rows and estimates with deterministic rule
   IDs, severities, counts, totals, and row references.
4. The project Data surface presents KPI health, a prioritized risk table, cost
   drivers, budget state, and revision comparisons.
5. Every KPI, warning, and chart drills into the exact estimate/row set that
   produced it.
6. Revision intelligence consumes normalized activity/history data without
   changing the Activity History pack or duplicating its event vocabulary.
7. Focused capabilities are extracted from large analytics components so this
   Beta work does not increase regression concentration.

## Scope And Non-Goals

In scope:

- D1 migration and repository/action changes for typed project analytical fields;
- D1-backed workspace/category price-freshness policy;
- pure health and revision domain modules with typed DTOs;
- repository aggregation and drill-through contracts;
- Project Data/estimate health UX, states, accessibility, and capability extraction;
- local migration, unit, DOM, type, lint, build, performance, and error-handling proof;
- rollout, compatibility, fix-forward, cleanup, and final audit instructions.

Out of scope:

- screen/share/XLSX calculation parity, owned by
  `../Calculation-And-Output-Parity/`;
- Publisher funnel, recipient analytics, proposal issue identity, shared-page UX,
  or publication snapshot identity, owned by `../Publisher-And-Shared-Pages/`;
- rewriting the Activity History taxonomy or restoration behavior, owned by
  `../Activity-History-Mapping/`;
- portfolio benchmarking, cost-per-area benchmarking, schedules, cash flow,
  machine-learned anomaly detection, or immutable issued records;
- production deployment or provider mutation during local implementation.

## Constraints

- Existing component provenance, source/date/confidence fields, lifecycle state,
  version/link state, and trust chips are implementation assets, not missing
  features to rebuild.
- D1 is authoritative. Legacy Supabase migrations are archaeology and must not be
  read as the active schema.
- The current `estimates.project_budget` remains a per-estimate override. New
  project target budget is a project-level fallback; the two values must not be
  silently collapsed.
- Health calculations remain pure and server-authoritative. UI components render
  DTOs and route filters; they do not own competing formulas.
- No new dependency is required.
- Migration numbering, shared repository files, and Activity History integration
  require lead-owned leases in the shared worktree.

## Proof Boundary And Stop Condition

Planning stops when the manifest is validator-clean, all ordinary choices are
closed, every unit is runnable from bounded context, the ready slice is
dependency-closed, `UNIT-001..008` are READY, and `UNIT-001` is the exact
restart point. This does not claim
implementation or release readiness.

Implementation stops only after every unit is `VERIFIED`, all acceptance criteria
and gates pass with fresh evidence, the D1 migration has local clean/apply/replay
proof, focused and broad checks are green, and the final audit finds no orphaned
rule, filter, requirement, temporary resource, or stale evidence receipt.

## Authority And Artifact Map

1. `AGENTS.md` and the Frontier planning suite.
2. `plan-pack.json` for status, IDs, hashes, traceability, and DAG truth.
3. `IMPLEMENTATION_PLAN.md` for executable unit packets.
4. Supporting artifacts for audit, decisions, proof, rollout, and resume context.

| Artifact | Purpose |
|---|---|
| `plan-pack.json` | Machine-readable state and traceability; intentionally not listed as its own artifact |
| `README.md` | Goal capsule, boundaries, stop condition, handoff |
| `SOURCE_AND_CODEBASE_AUDIT.md` | Current source, data/control flow, contradictions, red baseline |
| `REQUIREMENTS_AND_DECISIONS.md` | Stable requirements, criteria, decisions, risks, traceability, and artifact index |
| `IMPLEMENTATION_PLAN.md` | Canonical DAG, leases, executable units, checkpoints |
| `VERIFICATION_ROLLOUT_AND_FINAL_AUDIT.md` | Stable applicability/test/gate records, evidence commands, and review indexes |
| `LOOP_LEDGER.md` | Append-only run state, resume packet, cleanup and invalidation log |
| `HEALTH_DOMAIN_RULES_AND_ISSUE_TAXONOMY.md` | Health result, stable rules, provenance/policy precedence, deterministic grade |
| `PRICE_POLICY_DATA_AND_MIGRATION_PLAN.md` | Typed D1 inputs, policy/origin/facts, five-owner lease, replay and fix-forward |
| `REPOSITORY_DTO_AUTHORIZATION_AND_QUERY_CONTRACTS.md` | RSC/DTO boundary, authorization, query, cache, pagination and errors |
| `COCKPIT_UX_DRILL_THROUGH_AND_ACCESSIBILITY.md` | User journey, states, URL round trip, focus, semantics and reflow |
| `ACTIVITY_REVISION_INTEGRATION_CONTRACT.md` | Activity receipt, atomic forward facts, high-water reconstruction and denial |
| `PERFORMANCE_RELIABILITY_AND_OBSERVABILITY.md` | Measured budgets, truncation/retry reliability, structured signals and triage |
| `TEST_AND_ADVERSARIAL_QA.md` | Fixture families, negative matrix, red-first receipts and maker/checker handback |
| `ROLLOUT_FIX_FORWARD_AND_COMPLETION_GATE.md` | Staged adoption, cross-pack receipts, fix-forward, release boundary and completion gate |

The added artifacts split independently reviewable high-blast risks. They are
supporting context only; they add no execution or evidence authority.

## Handoff

- Completed units: none.
- Ready slice: `SLICE-001`, containing only dependency-closed `UNIT-001` and
  `UNIT-003`. `UNIT-002` is migration-receipt dependent; `UNIT-004` through
  `UNIT-008` remain `PLANNED` behind migration, Activity, Publisher, or prior-unit
  dependencies.
- Exact next unit: `UNIT-001`.
- Critical path: `UNIT-001 -> UNIT-003 -> UNIT-004 -> UNIT-005 -> UNIT-007 -> UNIT-008`.
- Parallel lane after `UNIT-001`: only pure-domain `UNIT-003` is independently
  ready. `UNIT-002` may start only after consuming a current Program migration
  generation receipt for `0055`.
- External pack dependency: `UNIT-006` reads Activity History contracts but may
  not edit that pack or its owned normalization files without an explicit lease.
- Resume command:
  `bun run validate:plan-pack -- .ai/03_plans/2026-07-10/Estimate-Intelligence-And-Price-Governance`.
