# Implementation Agent Prompt

Copy this prompt into a future implementation agent when product-code work is approved.

```text
You are working in /Users/philiplewis/archestimator.

Implement the tree selection, visible drag affordance, and safe bulk destructive workflow described by:

.ai/03_plans/2026-06-03-tree-selection-drag-affordance-bulk-delete-plan/

Read the package first in this order:
1. README.md
2. 01-current-codebase-audit.md
3. 04-data-permissions-and-delete-contracts.md
4. 02-ux-ui-behavior-spec.md
5. 03-technical-architecture.md
6. 05-implementation-sequence.md
7. 06-test-and-validation-plan.md
8. 07-risk-register-and-open-decisions.md
9. 10-final-planning-report-template.md

Scope boundary:
Related but separate workstream. This plan does not supersede, replace, or modify .ai/03_plans/2026-06-03-mass-deletion-projects-estimate-sheets-library-components.md.

Implement in phases. Do not make one broad rewrite. Use the ten phases in 05-implementation-sequence.md. Commit after coherent milestones.

Non-negotiable behavior:
1. Respect the separate mass-deletion plan boundary.
2. Preserve existing right-click rename/delete behavior.
3. Preserve existing React Complex Tree drag/drop reorder behavior.
4. Preserve route/current/focused selection separately from checkbox bulk selection.
5. Avoid invalid nested interactive markup. Rows with checkboxes/buttons must not render as native buttons containing interactive children.
6. Keep the visible drag handle as a visual affordance unless you prove true handle-only RCT drag with tests.
7. Do not hard-delete referenced library components. Archive is the default safe bulk operation. Hard delete requires server-side zero-reference proof and permission.
8. Select visible/rendered filtered items by default. Do not implement global select-all across the database without a server-side preview design.
9. Projects and estimate sheets require typed confirmation.
10. Bulk destructive operations must be server-side. Do not loop over single-delete actions from the client.
11. Validate all server actions by workspace/project/estimate permissions and reject cross-workspace IDs.
12. Preserve design-system constraints from DESIGN.md and scripts/enforce-app-design-system.mjs.
13. Stop and update the planning package if implementation evidence contradicts any planning assumption.

Start with Phase 1:
- Harden src/components/workshop/workshop-tree.tsx and src/components/workshop/tree-row-affordances.tsx.
- Add tests/vitest/workshop-tree-row-affordances.test.tsx.
- Run focused tests and bun run lint:design-system.

Then proceed phase-by-phase:
- Phase 2: shared pure selection utilities.
- Phase 3: estimate tree handle/checkbox selection.
- Phase 4: estimate tree bulk delete.
- Phase 5: library folder tree handle/selection/delete.
- Phase 6: estimate sheet table select-visible and bulk delete.
- Phase 7: projects card selection and bulk delete.
- Phase 8: component catalogue archive/default hard-delete gate.
- Phase 9: cross-surface accessibility and design polish.
- Phase 10: final validation and release report.

Testing expectations:
- Run focused tests after each phase, using 06-test-and-validation-plan.md.
- Preserve existing tests listed there.
- Add unit, DOM, server action, and Playwright tests where the phase requires them.
- Run design-system lint after UI phases.
- Do not claim e2e/linked-db proof if required env vars or fixtures are unavailable.

Data safety:
- Before destructive server/RPC implementation, verify current migrations and, if available, live DB schema/RLS behavior.
- Use transactions/RPCs for bulk destructive operations where consistency/history matters.
- Validate storage paths before deletion and report partial cleanup failures.

Final report:
- Use 10-final-planning-report-template.md.
- Include changed files, tests run, skipped validation with reasons, git status, commit SHA, pushed status, remaining risks, and recommended next step.
```
