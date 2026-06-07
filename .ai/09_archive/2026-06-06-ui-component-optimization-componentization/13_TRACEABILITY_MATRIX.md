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
| Cover source adoption decisions | User prompt | `21`, `29`, `32` | Adapt/copy/defer labels | owner package/license approval |
| Cover config skeletons | Implementation readiness | `16`, `33` | N/A | future `.storybook` diff matches skeleton intent |
| Cover fixtures/decorators | Security/data boundary | `08`, `34` | fixture labels in `17` | provider-env-unset Storybook smoke |
| Cover component APIs | Implementation readiness | `20`, `35` | controls/args in `17` | TypeScript props and Storybook docs |
| Cover P0/P1 backlog | Implementation readiness | `04`, `36` | P0/P1 rows in `17` | per-slice validation evidence |
| Cover Philip review packet | Owner review | `23`, `37` | owner review labels in `17` | explicit approve/reject/revise outcome |
| Cover validation commands | Verification | `06`, `38` | N/A | current docs-only and future implementation command evidence |
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

## Supplemental Handoff Trace

| Supplemental doc | Requirement closed | Downstream use |
|---|---|---|
| `32_SOURCE_ADOPTION_CROSSWALK.md` | Prevents external-source ambiguity across shadcn/ui, Flowbite, Aceternity, Tailwind v4, and Storybook. | Future implementers can decide copy/adapt/defer per component family without importing external defaults blindly. |
| `33_STORYBOOK_CONFIG_SKELETONS.md` | Converts package/config research into implementation skeletons without touching source in this docs pass. | Future `.storybook` implementation can be reviewed against known constraints. |
| `34_FIXTURE_AND_DECORATOR_CONTRACTS.md` | Makes provider-free story data and decorator mocks explicit. | Future story review can reject Supabase/auth/server-action imports. |
| `35_COMPONENT_API_REFERENCE_MATRIX.md` | Gives P0/P1 API/export expectations before code. | Future TypeScript and Storybook controls align to documented API contracts. |
| `36_P0_P1_IMPLEMENTATION_BACKLOG.md` | Converts matrix coverage into ordered, reversible slices. | Future commits can stay small and validation-backed. |
| `37_PHILIP_STORYBOOK_REVIEW_PACKET.md` | Makes owner review actionable rather than implied. | Philip can inspect, approve, reject, or request revision before migration. |
| `38_VALIDATION_COMMAND_MATRIX.md` | Separates docs-only verification from future build/test/storybook verification. | Prevents overclaiming and keeps E2E outside MVP unless routes are touched. |
