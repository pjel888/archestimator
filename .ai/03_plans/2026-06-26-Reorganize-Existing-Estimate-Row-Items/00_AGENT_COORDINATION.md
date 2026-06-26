# Agent Coordination

## Target Result

Create a comprehensive implementation plan for reorganizing existing estimate row items from `src/components/workshop/EstimateSheetContent.tsx`. The feature must cover:

- Row movement between estimate areas or branches in the middle estimate sheet.
- Row drops onto the left sidebar sheet tree.
- Row reordering within the same branch or area.
- A drag handle above the hover-revealed selection checkbox.
- Persistence, authorization, optimistic UI, accessibility, tests, and rollback.

## Constraints

- Planning only. Do not edit product code, migrations, tests, or generated types in this phase.
- Put every planning artifact in `.ai/03_plans/2026-06-26-Reorganize-Existing-Estimate-Row-Items`.
- Preserve existing worktree changes outside the plan folder.
- Use existing project stack and patterns: Next.js 16, React 19, Bun, TypeScript, Tailwind v4, Supabase/Postgres.
- Respect the project database boundary: Archestimator Supabase project `ebxxqidacheyapmmzavr` only during future implementation.
- Avoid new dependencies unless implementation evidence later proves the native pattern is insufficient.
- Browser automation is not required for this planning-only task.

## Routing And Surfaces Used

The prompt named GitNexus, OMX, Superpowers, and Compound Engineering surfaces. The planning pass used their local skill guidance where available and used repo inspection plus code-review-graph as the graph substitute because GitNexus MCP tools were not directly exposed in this session.

| Surface | Use In This Plan | Result |
| --- | --- | --- |
| GitNexus exploring, impact-analysis, refactoring | Graph-style audit expectations and blast-radius framing | Reflected in audit, blast-radius, and implementation sequence |
| `code_review_graph` | Importer and test adjacency checks | Confirmed row table importers and tree-related tests |
| OMX plan, ultragoal, ultraqa, ultrawork, autopilot | Loop, critique, and verification expectations | Reflected in loop ledger and review cycles |
| Superpowers writing-plans | Plan artifact rigor | Reflected in doc structure and traceability |
| Compound Engineering ce-plan | Plan sections and markdown expectations | Reflected in required plan documents |
| Archestimator plan-pack skill | Project-specific plan pack contract | Reflected in required files, ledger, and review cycles |

## Specialist Lanes

| Lane | Assignment | Evidence Integrated |
| --- | --- | --- |
| Row architecture explorer | Map `EstimateSheetContent`, branch/table row seams, and existing row mutation paths | `03_SOURCE_AND_CODEBASE_AUDIT.md`, `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` |
| Left tree explorer | Map `EstimateSheetTree`, `TreeExternalDropOptions`, and tree DnD constraints | `03_SOURCE_AND_CODEBASE_AUDIT.md`, `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` |
| UX and accessibility reviewer | Define handle placement, keyboard, touch, and live-region expectations | `05_UX_UI_ACCESSIBILITY_PLAN.md` |
| Architect | Define content-layer ownership, event handoff, and persistence boundaries | `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md` |
| Test engineer | Define targeted unit, DOM, action, and e2e coverage | `12_TEST_AND_VALIDATION_STRATEGY.md` |
| Critic | Challenge filtered views, virtualization, false affordances, and optimistic consistency | `14_RISK_REGISTER.md`, `18_REVIEW_CYCLES.md` |
| Data integrity reviewer | Define atomic final-order update contract and uniqueness constraints | `07_DATA_DATABASE_API_NETWORK_PLAN.md` |
| Security reviewer | Define server-side trust boundary and authorization checks | `08_SECURITY_PRIVACY_THREAT_MODEL.md` |
| Performance and reliability reviewer | Define dragover budget, virtualization, and cache convergence risks | `09_PERFORMANCE_RELIABILITY_OBSERVABILITY.md` |
| Product audit reviewer | Challenge user value, do-nothing cost, and success metrics | `02_FEATURE_BRIEF_AND_SCOPE.md`, `19_PLAN_AUDIT_SCORECARD.md` |
| Design/a11y audit reviewer | Challenge touch targets, keyboard fallback, and lifecycle states | `05_UX_UI_ACCESSIBILITY_PLAN.md`, `12_TEST_AND_VALIDATION_STRATEGY.md` |
| Coherence reviewer | Map authority, contradictions, traceability, and scorecard gaps | `16_REQUIREMENTS_TRACEABILITY_MATRIX.md`, `17_FINAL_READINESS_REVIEW.md`, `19_PLAN_AUDIT_SCORECARD.md` |
| Security audit reviewer | Challenge RPC privilege, actor derivation, and idempotency | `07_DATA_DATABASE_API_NETWORK_PLAN.md`, `08_SECURITY_PRIVACY_THREAT_MODEL.md` |
| Feasibility/adversarial reviewer | Challenge helper shape, sort policy, proof strength, and rollback evidence | `06_ARCHITECTURE_AND_TECHNICAL_DESIGN.md`, `12_TEST_AND_VALIDATION_STRATEGY.md`, `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` |

## Stop Condition

The planning task is complete when the plan folder contains every required document, includes two critique/revision cycles, explicitly supports same-branch row reordering, and passes document verification:

- Required files exist.
- `git diff --check` passes for the plan folder.
- No unresolved planning markers remain.
- Final report states that no product code was changed.
- Independent review lanes find no unresolved critical or high planning blocker after revisions.
