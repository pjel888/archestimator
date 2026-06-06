# Implementation Prompt: Storybook And Library Only

```text
Implement only the Storybook-first UI Component Library MVP for ArchEstimator.

Repository:
/Users/philiplewis/archestimator

Plan pack:
.ai/03_plans/2026-06-06-ui-component-optimization-componentization/

Hard boundaries:
- Do not migrate production app routes.
- Do not change Supabase/provider/server-action behavior.
- Do not use live data in Storybook.
- Do not publish Storybook.
- Do not add unapproved dependencies.

Start by verifying:
- git status --short --branch
- git worktree list
- package.json currently has no Storybook scripts/deps unless another branch changed it
- DESIGN.md app/workshop rules
- code-review graph and GitNexus impact before symbol edits
- current official Storybook/Next/Tailwind/shadcn/Flowbite/Aceternity docs
- docs `32_SOURCE_ADOPTION_CROSSWALK.md` through `38_VALIDATION_COMMAND_MATRIX.md`

Build:
1. Install/configure Storybook after package approval.
2. Load Tailwind v4/app globals in Storybook.
3. Add static fixture policy and story-only decorators.
4. Add foundation stories.
5. Add P0 primitive stories/components.
6. Add P1 composition/domain stories.
7. Add governance/checklist stories or docs.
8. Prepare the Philip Storybook review packet and stop before app migration.

Validate:
- bun run storybook
- bun run build-storybook
- bun run validate
- bun run build
- bun run lint:design-system
- bun run type-check
- focused tests for changed components
- git diff --check

Completion report:
- Storybook URL and static build status.
- Component/story coverage by P0/P1/P2.
- Files changed.
- Package changes.
- Validation evidence.
- Philip review status and any requested revisions.
- Deferred migration note.
```
