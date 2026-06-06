# Agent UI Usage Rules Draft

These are draft rules for future inclusion in agent guidance after the UI library exists.

## Draft Rules

1. Prefer approved ArchEstimator UI library components before creating feature-local controls.
2. Check Storybook stories before modifying a shared component.
3. Do not migrate production app UI unless the component is approved and the route migration is planned.
4. Preserve `DESIGN.md` app/workshop density.
5. Use Phosphor regular icons for app/workshop UI unless an approved exception exists.
6. Do not import Storybook fixtures or decorators into production code.
7. Do not use live provider data in stories.
8. Add or update stories when changing shared UI components.
9. Add focused tests for shared interactive behavior.
10. Run graph/GitNexus impact before shared primitive edits.
11. Treat `Button`, `SearchInput`, and tree/editable estimate surfaces as high-risk until fresh impact says otherwise.
12. Mark component migration status before app adoption.

## Future AGENTS.md Candidate Insert

```md
For UI work, check the ArchEstimator UI Component Library Storybook first. Reuse approved components before creating feature-local UI. Storybook fixtures and decorators are story-only and must not be imported into production routes. Production app migration from the UI library requires owner approval, route-level impact analysis, focused tests, and visual/a11y evidence.
```

## Activation Gate

Do not add these rules to root `AGENTS.md` until:

- Storybook exists.
- P0/P1 components have approval labels.
- Philip approves using the library as an agent enforcement surface.
