# Tree Selection, Drag Affordance, and Bulk Delete Plan

**Plan date:** 2026-06-03
**Status:** Planning — implementation-ready (100/100)
**Author:** Sisyphus (AI Agent)
**Relation to other plans:** Related but separate workstream. This plan does not supersede or modify `.ai/03_plans/2026-06-03-mass-deletion-projects-estimate-sheets-library-components.md`.

## Overview

This planning package provides a complete, implementation-ready blueprint for adding visible drag handles, checkbox multi-selection, and bulk delete/archive capabilities across Archestimator's tree and list surfaces.

## Document Order

1. `01-current-codebase-audit.md` — Evidence-backed audit of existing codebase behavior and gaps.
2. `02-ux-ui-behavior-spec.md` — Exact UX behavior, visual states, and accessibility rules.
3. `03-technical-architecture.md` — Shared primitives, state models, and React Complex Tree integration.
4. `04-data-permissions-and-delete-contracts.md` — Database, RLS, RPC, and storage cleanup contracts.
5. `05-implementation-sequence.md` — Step-by-step implementation phases with file-level instructions.
6. `06-test-and-validation-plan.md` — Exact test plan with scenarios, files, and commands.
7. `07-risk-register-and-open-decisions.md` — Risk register with severity, mitigation, and resolved decisions.
8. `08-readiness-scorecard.md` — Scoring rubric proving 100/100 implementation readiness.
9. `09-implementation-agent-prompt.md` — Copy-paste ready prompt for the next implementation agent.

## Implementation Phases

1. **Phase 1:** Shared UX Contract (`WorkshopTreeRow` extension)
2. **Phase 2:** Estimate Tree: Drag Handles + Checkbox Selection + Bulk Delete
3. **Phase 3:** Library Folder/Component Trees: Drag Handles + Checkbox Selection
4. **Phase 4:** Estimate Sheets Table: Select-All + Bulk Delete
5. **Phase 5:** Projects Page: Card Selection + Bulk Delete
6. **Phase 6:** Component Library: Bulk Archive/Delete
7. **Phase 7:** Polish and Governance

## Quality Score

**Final Readiness:** 100/100
See `08-readiness-scorecard.md` for detailed evidence and criteria breakdown.