# Traceability Matrix

## Requirements To Plans And Verification

| Requirement | Source | Plan docs | Story coverage | Verification |
|---|---|---|---|---|
| Storybook-first UI library MVP | User prompt, current plan | `14`, `16`, `17`, `24` | All P0/P1 groups | `bun run storybook`, `bun run build-storybook` |
| No production app migration in MVP | User prompt | `09`, `24`, `25` | Migration status labels | Git diff confirms no route/app edits |
| Preserve `DESIGN.md` density | `DESIGN.md` | `07`, `18`, `19`, `20` | Foundation and primitive stories | visual review, `bun run lint:design-system` |
| Static provider-free stories | Security boundary | `08`, `16`, `20` | Domain fixtures | import audit, build, story review |
| Include shadcn/ui research | User prompt | `21`, `29` | Primitive/adaptation notes | official-doc link recorded |
| Include Flowbite research | User prompt | `21`, `29` | Block/category references | public/paid boundary recorded |
| Include Aceternity research | User prompt | `21`, `29` | landing-only/motion notes | dependency gate recorded |
| Include Tailwind v4 strategy | Stack baseline | `16`, `18`, `21` | token/theme stories | Storybook style load, build |
| Cover broad component inventory | User prompt | `15`, `17` | P0/P1/P2 matrix | story coverage checklist |
| Cover accessibility/keyboard | Product quality | `07`, `22`, `27` | per-component a11y notes | keyboard walkthrough, addon if approved |
| Cover package/dependency gates | Repo safety | `12`, `29` | N/A | package diff and owner approval |
| Cover visual QA workflow | Owner review | `23`, `27` | review stories | screenshot/story review evidence |
| Cover future migration plan | User prompt | `25` | migration status stories | separate future plan only |

## Component To Storybook Groups

| Component group | Inventory doc | Story matrix | A11y matrix | Acceptance checklist |
|---|---|---|---|---|
| Foundations/tokens | `15`, `18` | `17` | `22` | `27` |
| Icons/assets | `15`, `19` | `17` | `22` | `27` |
| Actions/buttons | `15`, `20` | `17` | `22` | `27` |
| Forms | `15`, `20` | `17` | `22` | `27` |
| Menus/overlays | `15`, `20` | `17` | `22` | `27` |
| Navigation/layout | `15`, `20` | `17` | `22` | `27` |
| Tables/grids | `15`, `20` | `17` | `22` | `27` |
| Trees/domain | `15`, old tree docs | `17` | `22` | `27` |
| Feedback/status | `15`, `20` | `17` | `22` | `27` |
| Motion/blocks | `15`, `21` | `17` | `22` | `27` |
