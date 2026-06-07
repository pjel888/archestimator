# Deployment, Migration, And Rollback Plan

**Scope:** Future Storybook setup and UI library MVP.
**MVP rule:** Storybook-only. No production app migration.

## Deployment Posture

Default future implementation target:

- Local Storybook development.
- Local static Storybook build.
- No public Storybook deployment unless Philip approves it separately.

Because `vercel.json` currently disables Git-triggered deployments, do not assume any branch push deploys Storybook or the app.

## Future Implementation Branch Strategy

1. Create a scoped implementation branch from current remote baseline.
2. Install/configure Storybook only after package approval.
3. Keep production route changes out of the branch.
4. Commit package/config/story/library docs separately from story content if the diff is large.
5. Push the branch; do not merge to `main` automatically.

## Storybook Setup Rollback

If Storybook setup fails:

- Revert only Storybook package/config/script changes.
- Keep docs evidence and blocker notes.
- Do not delete unrelated planning files.
- Do not migrate app code as a workaround.

Rollback targets:

- `.storybook/`
- `package.json`
- `bun.lock`
- story fixture files
- story-only decorators
- any Storybook scripts

## Component Rollback

If a component fails Storybook review:

- Mark the component story as `REJECTED` or `NEEDS_REVISION`.
- Do not remove the whole library.
- Keep passing components intact.
- Record the defect in the component checklist.
- If production app code was touched by mistake, revert that app change before continuing.

## Migration Boundary

Production app migration starts only after:

1. Storybook P0/P1 is inspectable.
2. Philip approves the Storybook result.
3. Visual/a11y QA passes for affected stories.
4. A separate future migration plan is written.
5. Graph/GitNexus impact is rerun for exact app files.

## Future App Migration Rollback

When migration is later approved, every route-level migration should have:

- Before screenshots or visual evidence.
- Focused tests for the route/component.
- Small reversible commits.
- Explicit rollback path per route.
- Manual smoke checklist for protected routes if app behavior changes.

## Stop Conditions

Stop implementation and write a blocker if:

- Package install cannot resolve cleanly.
- Storybook cannot load Tailwind v4 styles.
- Stories require live auth/provider data.
- A future agent attempts app migration before Storybook approval.
- A dependency requires paid/commercial terms not approved by Philip.
