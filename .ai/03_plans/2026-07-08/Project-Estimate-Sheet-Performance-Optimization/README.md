# Project Estimate Sheet Performance Optimization Plan Pack

Status: **CONDITIONALLY READY** — Phase 0 and Phase 0.5 verification may begin; optimization coding requires Phase 0 evidence.

Created: 2026-07-08 | Last improved: 2026-07-08

Scope: planning only. No source, test, migration, provider, or runtime implementation changes are authorized by this pack except Phase 0 measurement artifacts.

## Mission

Make the project estimate sheet safe for first-user MVP use where a single estimate can contain thousands of components, thousands of areas or branches, and thousands of row items. Ensure the two component types — **Project Level Component** and **Library Level Component** — interoperate correctly across Add Component Modal, Edit Component Modal, and Inline Row Item editing, with full variant support.

## Executive Answer

The current sheet is partly performant, not fully scalable by proof. Component interoperability is implemented in source code and passing local tests but lacks browser/scale verification.

**Already good:**
- Server route seeds the first tab tree and keeps the component library lazy.
- TanStack Query is used with seeded initial data and five-minute `staleTime`.
- Tree, branch, and row virtualization gates exist.
- Render probe tests cover keystroke and memoization isolation in jsdom.
- Component Add/Edit/Inline surfaces support both component types.
- Duplicate-name suppression, image URL normalization, variant persistence, and project-component fan-out are implemented.

**Primary gaps:**
- The D1 route fast path `readEstimateNodeRouteContextD1FastPath` is currently a null stub.
- Initial route payloads still cap but materialize a nested tree up to 1,500 nodes and 5,000 rows.
- Edit, totals, filtering, grouping, move dialogs, and optimistic patches still rely on recursive whole-tree scans in several hot paths.
- No estimate-sheet-specific Chrome performance proof at 1,000-5,000 rows.
- No estimate-sheet-specific D1 query-plan proof.
- No browser proof for component interop scenarios.
- Project-component fan-out is currently a tree-walk (O(N)), not O(1) graph index.

## Plan Pack Index

| # | Document | Purpose |
|---|---|---|
| 00 | `00_AGENT_COORDINATION.md` | Agent coordination, skills, evidence lanes, review loop |
| 01 | `01_EXECUTIVE_SUMMARY.md` | Decision summary, readiness, top priorities |
| 02 | `02_FEATURE_BRIEF_AND_SCOPE.md` | Goals, non-goals, users, scenarios, scale targets — includes component interop |
| 03 | `03_SOURCE_AND_CODEBASE_AUDIT.md` | Current code findings with exact files |
| 04 | `04_REQUIREMENTS_SPECIFICATION.md` | Functional, performance, reliability, test requirements — includes REQ-CI-01 through CI-11 |
| 05 | `05_UX_UI_ACCESSIBILITY_PLAN.md` | Interaction, a11y, perceived performance |
| 06 | `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` | Normalized graph target, alternatives, ADR — includes componentInstanceNodeIds |
| 07 | `07_DATA_DATABASE_API_NETWORK_PLAN.md` | D1, query keys, route, network design |
| 08 | `08_SECURITY_PRIVACY_THREAT_MODEL.md` | Auth, data exposure, proof redaction, abuse risks |
| 09 | `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | Budgets, telemetry, reliability gates |
| 10 | `10_BLAST_RADIUS_AND_DEPENDENCIES.md` | Affected modules, dependency posture |
| 11 | `11_IMPLEMENTATION_PLAN.md` | 7-phase staged execution units — includes Phase 0.5 component-interop verification |
| 12 | `12_TEST_AND_VALIDATION_STRATEGY.md` | Test matrix, commands, fixtures, evidence artifacts |
| 13 | `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | Rollout, rollback, feature flags, operational proof |
| 14 | `14_RISK_REGISTER.md` | 18 risks with severity, mitigations, owners |
| 15 | `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | ADR-style decisions and rejected paths |
| 16 | `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` | REQ-to-unit-to-evidence map |
| 17 | `17_FINAL_READINESS_REVIEW.md` | Readiness verdict, go/no-go — includes component-interop gates |
| 18 | `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` | Official docs, stack constraints |
| 19 | `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` | Subagent, GitNexus, research, critique evidence |
| 20 | `20_PERFORMANCE_EVALUATOR_SPEC.md` | Evaluator contract, metric artifacts |
| 21 | `21_EXECUTION_HANDOFF.md` | Ready-to-run implementation handoff |
| 22 | `22_COMPONENT_INTEROPERABILITY_SPEC.md` | **NEW** Component type interop: identity contract, surface matrix, variants, QA matrix |
| 23 | `23_FINAL_SCORECARD_AND_READINESS.md` | **NEW** Full scored audit against Improve-Plan-Prompt methodology |
| — | `LOOP_LEDGER.md` | Durable planning loop ledger |
| — | `evidence/` | Phase evidence artifacts |

## Required Stop Condition Before Coding

Before any optimization code is written, Phase 0 must produce:
- A route benchmark artifact for the target estimate route.
- A Chrome sheet interaction artifact for scroll, edit, search, expand/collapse, and move flows.
- A D1 query-plan artifact for the exact estimate sheet route and subtree query shapes.
- A baseline decision memo that ranks bottlenecks by measured impact.

Before Phase 0.5 completion, browser verification must pass for:
- Component interop scenarios CI-QA-01 through CI-QA-14 (see doc 22).
- Add Component Modal, Edit Component Modal, Inline editing for both component types.
- Variant selection, persistence, and fan-out.

## Scorecard

Pre-improvement: ~80/100 | Post-improvement: ~85/100 | Target: 95+ (requires browser proof + independent verifier)

See `23_FINAL_SCORECARD_AND_READINESS.md` for full scored audit.

## Related Plans

- `.ai/03_plans/2026-07-08/component-interoperability/` — **ARCHIVED**. Implemented work superseded by doc 22 in this pack.
- `.ai/09_archive/store/2026-07-08-component-interoperability/` — Archive destination.
