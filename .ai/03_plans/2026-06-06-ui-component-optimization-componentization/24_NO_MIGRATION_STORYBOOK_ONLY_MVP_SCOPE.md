# No-Migration Storybook-Only MVP Scope

## Hard Boundary

The MVP ends with Storybook and the component library review surface. It does not include migrating current production app routes, workshop flows, share pages, estimate sheets, notifications, auth gates, provider integrations, or live data workflows.

## Allowed In MVP

- Storybook install/config after package approval.
- Story files.
- Static fixtures.
- Story-only decorators.
- New reusable components that are not adopted by production app routes yet.
- Documentation and governance updates.
- Tests for new shared components.

## Not Allowed In MVP

- Replacing existing app/workshop route UI.
- Refactoring `EstimateSheetContent` or editable estimate mutations.
- Changing Supabase migrations, RLS, provider clients, server actions, or generated types.
- Adding Storybook to production deployment automatically.
- Publishing Storybook.
- Importing live provider data into stories.
- Changing auth or route middleware.

## Why This Boundary Exists

- Shared primitives and tree/workshop surfaces have high or critical impact.
- Philip needs visual approval before migration.
- App/workshop workflows are production-sensitive for closed beta.
- Storybook can prove design quality without changing user-facing behavior.

## Migration Gate

Production migration is unlocked only by:

1. Storybook implementation complete.
2. P0/P1 visual and a11y review complete.
3. Philip approval recorded.
4. Separate route-by-route migration plan written.
5. Graph/GitNexus impact rerun for exact app files.
