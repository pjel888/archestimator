# Project Estimate Sheet Performance Optimization

Status tuple: `package_status=IMPLEMENTATION_READY`, `implementation_status=NOT_STARTED`, `release_status=NOT_EVALUATED`, `plan_lifecycle=ACTIVE`, `terminal_status=ACTIVE`.

Current run: planning only. Future package ceiling: local implementation plus scoped hosted proof against the Cloudflare resources bound in `wrangler.jsonc`. This pack does not authorize or perform a production deploy.

Canonical execution artifact: [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md)

Machine-readable contract: [`plan-pack.json`](plan-pack.json)

Exact next unit: `UNIT-001`, which locks current behavior, repairs stale contract tests, creates deterministic fixtures, and implements the strict evaluator contract before any optimization code.

## Mission

Prove and then remove the dominant route, derivation, render, and mutation bottlenecks while preserving all estimate-sheet behavior at the supported ceiling of 1,500 nodes and 5,000 loaded rows.

`IMPLEMENTATION_READY` describes the quality of this execution plan. The product implementation and runtime performance evidence are not complete; those are produced by `UNIT-001` through `UNIT-011`.

## Authority Order

1. `AGENTS.md` and the current planning-prompt suite.
2. `plan-pack.json` for IDs, statuses, hashes, and DAG truth.
3. `IMPLEMENTATION_PLAN.md` for execution packets and acceptance contracts.
4. Numbered documents for detailed analysis and historical context.

Docs `11_IMPLEMENTATION_PLAN.md` and `21_EXECUTION_HANDOFF.md` are superseded as execution authorities. They remain available to explain the earlier phase model, but an executor must follow the canonical artifact above.

## Current Findings

- The route uses Suspense and capped tree loading, but its D1 fast path is still a null stub.
- Nested tree derivations, mutation snapshots, and client project-component fan-out still have full-tree work in hot paths.
- Virtualization bounds DOM work but does not bound all derivation work, and row virtualization is disabled during express editing.
- Existing jsdom performance coverage reaches 500 rows, not the 5,000-row ceiling.
- Current direct tests exist for bulk-delete partial failure, realtime broadcast filtering, and tree DnD; older missing-test claims were stale.
- Historical route and generic D1 artifacts do not prove the current Cloudflare/D1 estimate path.

## Execution Shape

```text
UNIT-001 evaluator/fixtures/characterization
  -> UNIT-002 local browser and 19 interop scenarios
  -> UNIT-003 local D1/query proof
  -> UNIT-004 deterministic bottleneck decision
  -> UNIT-005..009 evidence-activated optimizations or supersession receipts
  -> UNIT-010 integrated local proof
  -> UNIT-011 scoped hosted D1 proof and release evaluation
```

The browser, hosted, and implementation evidence is deliberately deferred to those execution units. It is not a condition for declaring the plan itself implementation-ready.

## Pack Index

| Artifact | Purpose |
|---|---|
| `plan-pack.json` | Versioned manifest, hashes, reciprocal traceability, DAG, ready slice, exact next unit |
| `IMPLEMENTATION_PLAN.md` | Sole canonical implementation plan and unit packets |
| `00_AGENT_COORDINATION.md` | Earlier coordination model; canonical coordination rules are now in the implementation plan |
| `01_EXECUTIVE_SUMMARY.md` | Problem summary and staged direction |
| `02_FEATURE_BRIEF_AND_SCOPE.md` | Scope and non-goals |
| `03_SOURCE_AND_CODEBASE_AUDIT.md` | Source inventory; freshness corrections are recorded in the canonical plan/evidence |
| `04_REQUIREMENTS_SPECIFICATION.md` | Original 66 accepted obligations and aliases |
| `05_UX_UI_ACCESSIBILITY_PLAN.md` | UX and accessibility source requirements |
| `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` | Candidate graph and architecture detail |
| `07_DATA_DATABASE_API_NETWORK_PLAN.md` | D1/API/network analysis |
| `08_SECURITY_PRIVACY_THREAT_MODEL.md` | Threat analysis; canonical security matrix is in the implementation plan |
| `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` | Budgets and observability context |
| `10_BLAST_RADIUS_AND_DEPENDENCIES.md` | Dependency surface |
| `11_IMPLEMENTATION_PLAN.md` | Superseded phase-oriented draft |
| `12_TEST_AND_VALIDATION_STRATEGY.md` | Test strategy source |
| `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` | Corrected deployment-mode and hosted-cleanup runbook |
| `14_RISK_REGISTER.md` | Risk source |
| `15_DECISIONS_ASSUMPTIONS_AND_ALTERNATIVES.md` | Resolved `DEC-AUTO-*` decision record |
| `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` | Legacy alias/test map; canonical reciprocal graph is in `plan-pack.json` |
| `17_FINAL_READINESS_REVIEW.md` | Current plan-readiness verdict and runtime-proof distinction |
| `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` | Stack/source contract |
| `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` | Research history |
| `20_PERFORMANCE_EVALUATOR_SPEC.md` | Strict evaluator contract aligned with the canonical plan |
| `21_EXECUTION_HANDOFF.md` | Superseded first-PR draft |
| `22_COMPONENT_INTEROPERABILITY_SPEC.md` | Correct 19-scenario interop contract |
| `23_FINAL_SCORECARD_AND_READINESS.md` | Historical scorecard with current manifest status note |
| `24_DOMAIN_MODEL_AND_DATA_FLOW.md` | Domain/data-flow analysis |
| `25_CRUD_SURFACE_AND_MUTATION_MAP.md` | CRUD/mutation analysis |
| `26_TEMPLATE_COMPOSITION_AND_INSERTION.md` | Template flows |
| `27_DRAG_AND_DROP_AND_CROSS_PANEL_ARCHITECTURE.md` | DnD flows |
| `28_INVENTORY_SOURCE_MAP.md` | Inventory and source history; canonical freshness is manifest-backed |
| `29_ACCESSIBILITY_PROOF_MATRIX.md` | Accessibility source scenarios, limited to requirements traced by the canonical plan |
| `LOOP_LEDGER.md` | Durable task-local planning loop and review receipts |
| `evidence/2026-07-10-frontier-plan-readiness.md` | Fresh research, audit, validator, and reviewer evidence |

## Validation

The pack is complete only when both commands pass on the frozen final artifact set:

```bash
bun run validate:planning-prompts
bun run validate:plan-pack -- .ai/03_plans/2026-07-08/Project-Estimate-Sheet-Performance-Optimization
```

Browser automation is intentionally not part of plan-readiness validation. It is required by `UNIT-002` and `UNIT-010` to prove the later runtime claims.
