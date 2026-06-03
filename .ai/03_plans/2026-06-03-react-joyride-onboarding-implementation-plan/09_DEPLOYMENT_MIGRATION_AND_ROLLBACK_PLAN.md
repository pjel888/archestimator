# 09 — Deployment, Migration & Rollback Plan

**Date:** 2026-06-03 (refined)
**Source:** Enhanced from `16_rollout_and_readiness_plan.md`

---

## Deployment Considerations

### Feature Flag

**`NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED`** — environment variable, build-time evaluated.

- **Default:** `false`
- **Staging:** `true` (for QA)
- **Production:** `false` initially, enabled gradually

Because `NEXT_PUBLIC_*` variables are inlined at build time, changing the flag requires a redeploy. This is acceptable — onboarding is not a "hotfix" feature.

### Deployment Order

1. **Phase 1-6:** Deploy with flag `false` — zero user impact
2. **Phase 7:** Deploy with flag `true` in staging → QA → deploy to production with flag `false` → enable flag → monitor

### Backward Compatibility

- **Users without tour rows:** Automatically eligible for first tour. Graceful handling — no migration needed for existing users.
- **Users with existing sessions:** Tour state fetched on page load. If no rows exist, tour eligible.
- **No breaking changes to existing APIs, routes, or components.** Onboarding is purely additive.

---

## Migration Steps (Phase 4)

### 1. Local Migration Creation

```bash
# Generate migration from local schema changes
npx supabase db diff --linked -f user_onboarding_tours

# Verify migration file
cat supabase/migrations/*_user_onboarding_tours.sql
```

### 2. Local Testing

```bash
# Reset local Supabase and apply all migrations
npx supabase db reset

# Verify table exists
npx supabase db query "SELECT * FROM user_onboarding_tours LIMIT 0"

# Run Vitest RLS tests
bun run test:dom -- tests/vitest/onboarding-persistence.test.ts
```

### 3. Linked Remote Push

```bash
# Push ONLY after local verification + backup
npx supabase db push

# Verify remote
npx supabase db query "SELECT tablename FROM pg_tables WHERE tablename = 'user_onboarding_tours'"
```

### 4. Generated Types Update

```bash
# Regenerate Supabase types (if project uses type generation)
bun run db:types  # if this script exists, otherwise:
npx supabase gen types typescript --linked > src/lib/supabase/types.ts
```

---

## Rollback Process

### Tier 1 — Feature Flag (Instant, No Redeploy Needed After Initial)

If onboarding causes issues in production AFTER flag was `true`:

1. Set `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=false` in Vercel environment
2. Redeploy (required because `NEXT_PUBLIC_*` is build-time)
3. All onboarding runtime removed from client bundle
4. Tour data in `user_onboarding_tours` becomes dormant — no reads occur

**Recovery time:** ~2-3 minutes (Vercel deploy)

### Tier 2 — Code Revert (1 Commit)

If code changes introduced a bug not related to the flag:

```bash
git revert <feature-branch-merge-commit>
git push origin main
```

Removes all onboarding code, `data-tour` attributes, and dynamic imports. App returns to pre-onboarding state.

### Tier 3 — Database Revert

If `user_onboarding_tours` table causes issues:

```sql
-- Drop table (data loss is acceptable — tour state is non-critical)
DROP TABLE IF EXISTS user_onboarding_tours CASCADE;

-- Create revert migration
npx supabase db diff --linked -f revert_user_onboarding_tours
npx supabase db push
```

**Impact:** Users who completed tours will see them again on next login. Minor UX annoyance, not a data loss crisis.

---

## Partial Rollout Path

### Closed Beta (Current State)

- Flag `false` by default
- Enable for internal team only
- Manually set flag for specific preview deployments
- No external user impact

### Gradual Production Rollout

1. **Week 1:** Flag `true` in staging. Internal QA. Fix issues.
2. **Week 2:** Deploy to production with flag `false`. Verify zero impact (bundle analysis, Lighthouse, smoke tests).
3. **Week 3:** Enable flag `true` for 10% of users (if Vercel supports percentage-based env vars, or via separate preview deployment for beta users).
4. **Week 4:** Monitor. If no issues, enable for 100%.

### Kill Switch

At any point: set `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=false`, redeploy. All tours stop immediately.

---

## Post-Deploy Checks

### Immediately After Deploy (Flag `false`)

- [ ] `bun run build` on production branch passes
- [ ] Bundle analyzer: Joyride NOT in public page chunks
- [ ] Dev server: `/workshop` renders identically to pre-deploy state
- [ ] Dev server: `/login` loads zero onboarding JS
- [ ] Dev server: `/share/[token]` loads zero onboarding JS
- [ ] All existing E2E tests pass (no regressions)

### After Enabling Flag (Staging)

- [ ] Workspace Orientation tour auto-starts on fresh account
- [ ] All 5 steps display correct targets
- [ ] Skip button dismisses tour and persists
- [ ] Tour does not restart on page refresh after completion
- [ ] Replay from Settings works
- [ ] No console errors through complete tour lifecycle
- [ ] Public routes unaffected
- [ ] Design-system linter passes

### After Enabling Flag (Production)

- [ ] Monitor Vercel deployment health
- [ ] Monitor Supabase query performance (no spike in `user_onboarding_tours` queries)
- [ ] Check error tracking (Sentry or equivalent, if configured)
- [ ] User feedback channels monitored for onboarding complaints

---

## Database Rollback

### Migration Revert Procedure

```sql
-- If table was pushed to linked remote:
DROP TABLE IF EXISTS user_onboarding_tours CASCADE;
```

### Impact Assessment

| What Breaks | Severity | Fix |
|-------------|----------|-----|
| Tour completion queries return error | MEDIUM | OnboardingRuntime catches query errors, renders null — no tour, no crash |
| New users see tour repeatedly | LOW | Without persistence, tour shows every login. Set flag to `false` as immediate mitigation. |
| Existing completed users lose state | LOW | Tour state is non-critical. Users re-complete or skip. |

---

## Feature Flag Disable Path

```
Production issue reported
  ↓
Set NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED=false in Vercel
  ↓
Redeploy (git push or manual deploy)
  ↓
Verify: all tours stopped, no Joyride in bundle
  ↓
Investigate root cause
  ↓
Fix → re-enable flag → redeploy
```

---

## Closed Beta Integration

- Onboarding system is independent of closed-beta allowlist (`closed_beta_allowed_emails`)
- Both systems can coexist: beta-gated users see tours when onboarding flag is enabled
- No dependency between onboarding and beta access gates
- Onboarding does not bypass or interact with beta restrictions

---

## Manual/Provider Evidence Required

| Evidence | Phase | Owner |
|----------|-------|-------|
| Vercel env var: `NEXT_PUBLIC_ONBOARDING_TOURS_ENABLED` set in all environments | Phase 1 | Philip |
| Vercel deploy succeeds with flag `false` | Phase 1 | Implementer |
| Vercel deploy succeeds with flag `true` (staging) | Phase 7 | Philip |
| Bundle analyzer report: Joyride absent from public chunks | Phase 1 | Implementer |
| Bundle analyzer report: Joyride present in workspace chunks (flag=true) | Phase 3 | Implementer |
| Lighthouse audit before/after | Phase 6 | Implementer |
| Migration applied to linked Supabase | Phase 4 | Philip |
| RLS policies verified on linked remote | Phase 4 | Implementer |
| Manual QA: full tour on fresh staging account | Phase 7 | Philip/QA |
