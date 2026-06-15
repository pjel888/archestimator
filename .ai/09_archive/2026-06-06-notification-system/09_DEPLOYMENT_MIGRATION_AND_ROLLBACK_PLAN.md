# Deployment, Migration, And Rollback Plan

Refinement status: `REFINED_READY_FOR_IMPLEMENTATION`. Provider/migration evidence must follow `23_SUPABASE_PROVIDER_AND_MIGRATION_EVIDENCE_PLAN.md`; release operations and content rollback must follow `24_RELEASE_OPERATOR_RUNBOOK.md`.

## Branch Policy

- Continue on `codex/notification-system`.
- Rebase on `origin/main` before implementation begins and before PR.
- PR should target `staging` when the advisory PR workflow is active, not direct-edit `main` or `staging`.
- No force push.

## Migration Plan

1. Create additive migration locally.
2. Run SQL static schema tests.
3. Run local Supabase reset if available.
4. Regenerate `src/lib/supabase/types.ts`.
5. Run targeted RLS/integration tests.
6. Apply to a branch-safe/preview database only after code review.
7. Apply to linked production only through owner-approved deployment process.

## Deployment Sequence

1. Merge code after tests and review.
2. Deploy preview/staging.
3. Apply migration in the matching environment.
4. Seed or create a non-sensitive release announcement for beta test account.
5. Run manual QA from `06_TESTING_AND_VERIFICATION_PLAN.md`.
6. Capture evidence in `.ai/09_archive/store/` only if the owner requests hosted proof.
7. Promote to production only after migration, auth, RLS, UI, and rollback proof are accepted.

## Feature Flag

Prefer a soft gate for UI mounting:

- Server env: `NOTIFICATION_SYSTEM_ENABLED`
- Client-safe derived flag only if needed: `NEXT_PUBLIC_NOTIFICATION_SYSTEM_ENABLED`

Default behavior in code should be safe when unset: provider disabled or fetch returns empty state. Do not require a provider dashboard change during planning.

## Release Announcement Content Rollback

- Set `expires_at = now()` on a bad definition.
- Mark affected delivery rows dismissed if the announcement should disappear.
- Reissue corrected announcement as a new definition only when users should see it again.

## Code Rollback

- UI issue: remove/disable `NotificationProvider` mount and shell bell; keep database rows.
- Server action issue: disable actions via feature flag and keep read-only center hidden.
- Realtime issue: remove/disable Realtime hook; keep polling.
- Schema issue before linked apply: revert migration file.
- Schema issue after linked apply: create forward repair migration; do not drop tables with user state unless owner explicitly approves.

## Post-Deploy Checks

- Signed-in workshop loads.
- No notification UI appears signed out.
- Public share pages still work.
- Release modal appears once.
- Notification center read/dismiss actions work.
- RLS denial proof for cross-user access passes.
- Existing toasts still appear for estimate mutations.
- Realtime channel count is one per tab if enabled.

## Provider Safety

- No Supabase PITR changes.
- No Vercel env/provider change unless implementation explicitly adds feature flag envs and owner approves.
- No Resend changes.
- No DNS changes.
- No secrets in repo or `.ai`.

## Migration Evidence Gates

- Local migration/static SQL proof is required before any branch-safe database apply.
- Branch-safe or preview database proof is required before linked production apply.
- Linked production apply requires explicit owner deployment approval and must name the project ref `ebxxqidacheyapmmzavr`.
- If type generation changes `src/lib/supabase/types.ts`, the implementation report must include the command used and the expected changed table/type names.
- Any rollback after linked apply must be forward-only unless the owner explicitly approves destructive data deletion.
