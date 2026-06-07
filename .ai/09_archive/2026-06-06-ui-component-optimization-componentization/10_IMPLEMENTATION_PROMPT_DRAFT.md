# Implementation Prompt Draft

Use this only after Philip approves package/dependency gates.

```text
You are Codex working in /Users/philiplewis/archestimator.

Goal:
Implement the Storybook-first ArchEstimator UI Component Library MVP from:
.ai/03_plans/2026-06-06-ui-component-optimization-componentization/

Hard scope:
- Build Storybook configuration, stories, fixtures, and reusable library components only.
- Do not migrate production app screens/routes in this MVP.
- Do not use live Supabase/provider data in stories.
- Do not publish Storybook unless Philip separately approves.

Required reading before edits:
1. AGENTS.md
2. DESIGN.md
3. .ai/README.md
4. .ai/10_state/current-state.md
5. .ai/10_state/decisions.md
6. .ai/03_plans/2026-06-06-ui-component-optimization-componentization/README.md
7. .ai/03_plans/2026-06-06-ui-component-optimization-componentization/CURRENT_CANONICAL_PLAN.md
8. .ai/03_plans/2026-06-06-ui-component-optimization-componentization/15_COMPONENT_INVENTORY_MATRIX.md
9. .ai/03_plans/2026-06-06-ui-component-optimization-componentization/16_STORYBOOK_INSTALLATION_AND_CONFIGURATION_PLAN.md
10. .ai/03_plans/2026-06-06-ui-component-optimization-componentization/17_STORYBOOK_STORY_COVERAGE_MATRIX.md
11. .ai/03_plans/2026-06-06-ui-component-optimization-componentization/29_COMPONENT_DEPENDENCY_AND_PACKAGE_PLAN.md
12. .ai/03_plans/2026-06-06-ui-component-optimization-componentization/32_SOURCE_ADOPTION_CROSSWALK.md
13. .ai/03_plans/2026-06-06-ui-component-optimization-componentization/33_STORYBOOK_CONFIG_SKELETONS.md
14. .ai/03_plans/2026-06-06-ui-component-optimization-componentization/34_FIXTURE_AND_DECORATOR_CONTRACTS.md
15. .ai/03_plans/2026-06-06-ui-component-optimization-componentization/35_COMPONENT_API_REFERENCE_MATRIX.md
16. .ai/03_plans/2026-06-06-ui-component-optimization-componentization/36_P0_P1_IMPLEMENTATION_BACKLOG.md
17. .ai/03_plans/2026-06-06-ui-component-optimization-componentization/37_PHILIP_STORYBOOK_REVIEW_PACKET.md
18. .ai/03_plans/2026-06-06-ui-component-optimization-componentization/38_VALIDATION_COMMAND_MATRIX.md

Before editing:
- Verify branch/worktree state with git commands.
- Read the relevant Next.js 16 docs in node_modules/next/dist/docs/ before Next/Storybook config changes.
- Run code-review graph impact on intended UI/package/config files.
- Run GitNexus impact before editing any function, class, or method.
- Re-check official Storybook, shadcn/ui, Flowbite, Aceternity, and Tailwind v4 docs for current guidance.

Implementation phases:
1. Package-approved Storybook install/config for Next.js + React + Tailwind v4.
2. Storybook shell, preview styles, decorators, aliases, and static fixture policy from docs `33` and `34`.
3. Foundations: tokens, typography, icon gallery, spacing/radius/color stories.
4. P0 primitives: Button/IconButton, Field/Input, Badge/Pill, Tooltip, Dialog/Modal, Menu, Card/Panel, Empty/Loading/Error states.
5. P1 components: combobox/select, tabs, toolbar, table basics, tree shell, toast/status, layout/app shell pieces.
6. Domain stories with static fixtures: project card/table, estimate tree/sheet row states, component library manager/tree, share review, notifications, release modal.
7. Governance: component checklist, story coverage matrix, agent usage rules draft, and Philip review packet.

Validation:
- bun install after package edits.
- bun run storybook
- bun run build-storybook
- bun run validate
- bun run build
- bun run lint:design-system
- bun run type-check
- focused tests for changed primitives/domain surfaces
- git diff --check

Completion:
- Report exact files changed.
- Report Storybook local URL and build-storybook status.
- Report components/stories completed vs deferred.
- Report any unresolved owner decisions.
- Report Philip review status: approved, rejected, or needs revisions.
- Do not claim app migration complete.
```
