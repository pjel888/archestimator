# Deployment, Migration, and Rollback Plan

## Deployment considerations

- Current repo decision keeps CI/CD deferred and Vercel Git deployments disabled; production deploy is controlled/manual until Philip reopens CI/CD.
- Terms implementation should ship through scoped branch/PR by default, not automatic main merge, unless Philip explicitly authorizes otherwise.
- Legal copy approval is a production release gate.
- Provider state proof must remain separate from local code proof.

## Migration steps if acceptance table is needed

1. Create migration with `supabase migration new terms_acceptance` after checking CLI help.
2. Add tables, indexes, constraints, grants, RLS, policies, comments.
3. Apply locally if local Supabase is available.
4. Generate/update `src/lib/supabase/types.ts` under repo convention.
5. Run SQL/RLS tests.
6. Apply linked migration only after backup/safety checks and only to ArchEstimator project `ebxxqidacheyapmmzavr`.
7. Record local vs linked migration evidence separately.

## Safe deploy ordering

1. **Database first:** create acceptance table/RLS/grants/indexes without app gate.
2. **App content second:** deploy versioned Terms page and legal links.
3. **Server persistence/status third:** deploy write/read paths unused or feature-flagged.
4. **Soft UI fourth:** show settings/legal status and optional non-blocking prompt.
5. **Gate last:** enable hard protected-route gate only after migration/read/write/e2e proof.

## Backfill/default behavior for existing users

- Do not fabricate acceptance records for existing users unless legal counsel explicitly approves a migration/backfill basis.
- Recommended: existing users must accept current version on next protected app access or during a defined grace period.
- Closed beta can coordinate known users manually before hard gate.

## Feature flags

- Strongly consider `NEXT_PUBLIC_TERMS_ACCEPTANCE_REQUIRED` only if needed for UI display; server enforcement must use server-side config, not browser flag.
- Prefer server-only `TERMS_ACCEPTANCE_ENFORCEMENT=off|soft|hard` if phased rollout is needed.
- Any env var changes require separate provider documentation; do not put secret values in `.ai`.

## Rollback process

| Scenario | Rollback |
| --- | --- |
| UI deploy fails before gate | Revert UI commit; table remains unused. |
| Migration succeeds but app fails | Roll back app; leave table/RLS in place for future fix unless counsel requires removal. |
| Hard gate locks users out | Flip enforcement off or revert gate; keep Terms page and table. |
| Legal copy issue | Restore previous copy/version; consult counsel on whether re-acceptance is required. |
| RLS leak discovered | Immediately revoke/grant lock down, disable admin/support retrieval, hotfix policies. |
| Privacy metadata concern | Stop collecting raw metadata, switch to hash/omit, consult counsel on existing records. |

## Post-deploy checks

- `/terms` and `/privacy` render public content and correct version/effective dates.
- Signed-out `/workshop` redirects to `/login` as before.
- Signed-in unaccepted test user sees acceptance gate.
- Accepted current-version user enters workshop.
- Old-version acceptance prompts re-acceptance if policy says hard gate.
- RLS denial proof for cross-user acceptance records.
- Admin/support retrieval only works for authorized role/path.
- No billing UI exists/changed unless separately scoped.

## Manual/provider evidence required

- Linked Supabase migration history and RLS/grant proof if schema changes.
- Vercel deployment proof if production deployed.
- Browser proof for login/callback/acceptance/protected route.
- Legal copy approval reference.
- Support/legal contact monitoring proof if support flow changes.

## Legal copy approval gate

Production release must not proceed unless:

- Final Terms copy is counsel-reviewed.
- Privacy Notice covers collected metadata/processors/retention.
- Company/entity/contact/governing-law/dispute placeholders are resolved or intentionally marked beta-only and owner-approved.
- Terms do not claim absolute zero liability.
- Terms clearly state ArchEstimator is only a software tool and users verify outputs.
