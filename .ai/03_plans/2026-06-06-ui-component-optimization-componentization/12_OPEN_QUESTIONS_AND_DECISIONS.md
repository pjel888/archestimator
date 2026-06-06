# Open Questions And Decisions

## Owner Decisions

| ID | Decision | Default until decided | Blocks |
|---|---|---|---|
| D1 | Approve Storybook package installation. | Do not install. | Any implementation. |
| D2 | Choose Storybook Next framework package after current docs check. | Prefer official Next.js Vite path if compatible. | Storybook config. |
| D3 | Allow or disallow Flowbite Pro content/reference. | Public Flowbite docs only. | Paid block adoption. |
| D4 | Allow or disallow new motion dependency. | CSS-only/reduced-motion-safe ideas. | Motion components/effects. |
| D5 | Allow or disallow new Radix packages beyond current dependency set. | Reuse existing primitives and plan only. | Dialog/select/tooltip/popover package choices. |
| D6 | Decide whether Storybook should ever be hosted. | Local only. | Deployment/public docs. |
| D7 | Approve Storybook library before app migration. | Migration blocked. | Any production route migration. |
| D8 | Decide whether Storybook static output may be committed, archived, or hosted. | Treat `storybook-static` as generated/local output only. | Static-build artifact handling. |
| D9 | Decide whether a11y addon/interactions/test-runner packages are included in the first Storybook install. | Plan them, but install only after package approval. | Automated Storybook QA. |
| D10 | Decide whether any app/workshop Aceternity-inspired effect can graduate beyond landing/proposal contexts. | Landing/proposal-only; app/workshop CSS-only and reduced-motion safe. | Motion stories and future app adoption. |

## Implementation-Agent Decisions

These can be decided by a future implementation agent if evidence supports them:

| ID | Decision | Evidence required |
|---|---|---|
| I1 | Exact story folder layout. | Current repo conventions and Storybook config. |
| I2 | Exact fixture builder structure. | Type reuse and provider-isolation check. |
| I3 | Whether to wrap existing primitives or create new library folders first. | Graph impact, test coverage, and import boundaries. |
| I4 | Which P2/P3 components move into MVP if capacity allows. | P0/P1 completion and no scope drift. |
| I5 | Whether accessibility addon is part of first install. | Package compatibility and owner-approved dependency list. |
| I6 | Exact static fixture module layout. | Type reuse, provider-isolation scan, and story ergonomics. |
| I7 | Whether P2 Flowbite blocks are represented as static story references or deferred entirely. | Owner/license gate and P0/P1 completion. |

## Rejected Decisions

| Rejected option | Reason |
|---|---|
| Migrate app while building Storybook MVP. | Violates explicit no-migration boundary and increases production regression risk. |
| Use external library defaults without adaptation. | Violates `DESIGN.md` and app/workshop density. |
| Use live Supabase data in stories. | Security/privacy boundary violation. |
| Publish Storybook automatically. | Requires owner/provider/access decision. |
| Treat old tree componentization plan as the whole UI plan. | Too narrow for requested component library scope. |

## Decisions Already Made In This Handoff

| Decision | Rationale |
|---|---|
| Score the docs package 100/100 only for planning handoff. | The package now includes inventory, story coverage, source adoption, config skeletons, fixture contracts, API reference, backlog, review packet, and validation commands. |
| Keep production migration readiness low. | Migration is intentionally not part of the Storybook-only MVP and remains blocked by Philip's Storybook review. |
| Treat external sources as inputs, not authorities. | `DESIGN.md` and existing app/workshop density rules override external visual defaults. |
| Use static fixtures as the default story data model. | This keeps stories provider-free, secret-safe, deterministic, and reviewable. |
