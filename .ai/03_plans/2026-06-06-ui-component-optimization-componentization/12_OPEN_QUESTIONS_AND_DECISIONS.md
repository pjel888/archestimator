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

## Implementation-Agent Decisions

These can be decided by a future implementation agent if evidence supports them:

| ID | Decision | Evidence required |
|---|---|---|
| I1 | Exact story folder layout. | Current repo conventions and Storybook config. |
| I2 | Exact fixture builder structure. | Type reuse and provider-isolation check. |
| I3 | Whether to wrap existing primitives or create new library folders first. | Graph impact, test coverage, and import boundaries. |
| I4 | Which P2/P3 components move into MVP if capacity allows. | P0/P1 completion and no scope drift. |
| I5 | Whether accessibility addon is part of first install. | Package compatibility and owner-approved dependency list. |

## Rejected Decisions

| Rejected option | Reason |
|---|---|
| Migrate app while building Storybook MVP. | Violates explicit no-migration boundary and increases production regression risk. |
| Use external library defaults without adaptation. | Violates `DESIGN.md` and app/workshop density. |
| Use live Supabase data in stories. | Security/privacy boundary violation. |
| Publish Storybook automatically. | Requires owner/provider/access decision. |
| Treat old tree componentization plan as the whole UI plan. | Too narrow for requested component library scope. |
