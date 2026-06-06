# Release Checklist

## Pre-implementation

- [ ] Current repo state verified.
- [ ] Legal copy approved by qualified lawyer or implementation limited to infrastructure.
- [ ] Philip decisions resolved or documented as intentionally deferred.
- [ ] Supabase/Next docs checked.
- [ ] Impact analysis run before symbol edits.

## Pre-merge

- [ ] Terms content version/effective date/hash present.
- [ ] Acceptance table/RLS/grants/types implemented if persistence required.
- [ ] Acceptance save/read paths derive user/time/version server-side.
- [ ] UI meets design system and accessibility.
- [ ] Existing users and old-version re-acceptance tested.
- [ ] RLS denial tests pass.
- [ ] `git diff --check` passes.
- [ ] `bun run validate` passes.
- [ ] `bun run build` passes.
- [ ] `bun run test:e2e` passes for auth/protected-route flow changes.
- [ ] `.ai` state/tasks/logs/bugs updated.

## Pre-production

- [ ] Linked Supabase migration proof captured if schema changed.
- [ ] Vercel deployment proof captured if deployed.
- [ ] Owner/internal accepted-user smoke captured.
- [ ] Missing/old-version user smoke captured.
- [ ] Legal/support contact monitored.
- [ ] Privacy Notice covers acceptance metadata.
- [ ] No billing copy implies active subscriptions unless billing is live and reviewed.

## Post-production

- [ ] Monitor support/auth errors.
- [ ] Confirm no all-user lockout.
- [ ] Confirm `/terms` and `/privacy` are public.
- [ ] Confirm accepted current-version user can access `/workshop`.
- [ ] Archive plan and evidence if successful.
