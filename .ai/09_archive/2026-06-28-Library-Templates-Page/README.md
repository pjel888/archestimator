# Library Templates Page Transition Plan

Date: 2026-06-28
Status: IMPLEMENTATION-READY (conservative track)
Scope: planning and audit only; no application code, tests, migrations, provider state, or runtime data changed.

## Target Result

Plan the next implementation pass for `/workshop/library/templates` so the surface adopts the estimate editor's dense workspace grammar without copying estimate-only information architecture.

The corrected product direction is:

- Keep `/workshop/library/templates` as the Library Templates browse/manage workbench under the Library parent tabs.
- Use an estimate-family three-zone layout: template inventory on the left, selected-template work surface in the center, source dock on the right.
- Do not put a `Templates` tab inside the right dock on this route. The route itself is the template surface.
- Treat `/workshop/library/templates/[templateId]` as the full template editor route and harden it before claiming estimate-editor parity.
- Render exactly two right-dock tabs: `Library` and `Project`. `Project` must be visible in v1; when no project context is selected, it shows an intentional project selector or unavailable state, not an empty or misleading tree.

## Package Map

- `00_AGENT_COORDINATION.md` - master goal, councils, constraints, and workflow routing.
- `01_SOURCE_AUDIT.md` - current code, route, data, IA, and test inventory.
- `02_UX_UI_AUDIT_AND_DIRECTION.md` - product/design audit and corrected target UX.
- `03_REQUIREMENTS_SPEC.md` - stable requirement IDs and acceptance criteria.
- `04_ARCHITECTURE_AND_DATA_PLAN.md` - route/component/data seams and integrity decisions.
- `05_ROUTE_STATE_SECURITY_AND_ACCESSIBILITY_CONTRACTS.md` - App Router, state, a11y, security, performance, and evidence-class contracts.
- `06_TEST_QA_AND_ULTRAQA_PLAN.md` - test plan, adversarial QA, browser-proof gate.
- `07_RISKS_DECISIONS_AND_ALTERNATIVES.md` - decisions, rejected options, risks.
- `11_IMPLEMENTATION_PLAN.md` - phased implementation plan with ultragoal-style contracts.
- `12_IMPLEMENTATION_UNITS_AND_PROOF_CONTRACT.md` - implementation-unit packets and proof-contract rows.
- `13_ROLLOUT_ROLLBACK_AND_OPERATIONS.md` - rollout, rollback, monitoring, and performance gates.
- `16_REQUIREMENTS_TRACEABILITY_MATRIX.md` - requirement-to-source-to-test traceability.
- `17_FINAL_READINESS_REVIEW.md` - readiness verdict and open conditions.
- `18_STACK_CONTRACT_AND_PRODUCTION_STANDARDS.md` - Next/React/Supabase/design-system constraints.
- `19_RESEARCH_REVIEW_AND_QA_EVIDENCE.md` - research, council, skill/plugin, and verification evidence.
- `20_FINAL_AUDIT_SCORECARD_AND_VERIFICATION.md` - inventory, scorecard, evidence classes, and final verification matrix.

## Stop Condition

This plan is complete when an implementer can make the transition without re-litigating the UX premise, knows which route owns browse vs edit behavior, knows that the right dock may not include `Templates`, and has a targeted verification path.
