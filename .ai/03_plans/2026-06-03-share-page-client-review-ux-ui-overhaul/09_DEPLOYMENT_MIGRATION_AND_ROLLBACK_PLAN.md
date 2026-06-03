# 09 — Deployment, Migration & Rollback Plan

**Plan:** Share Page Client Review UX/UI Overhaul  
**Date:** 2026-06-03  

---

## Deployment Considerations

### No Database Migration
This plan is a **UI/UX-only change**. There are no database migrations, no schema changes, and no data migrations. The `supabase/migrations/` directory is untouched.

### No Infrastructure Changes
- No changes to Vercel configuration
- No changes to environment variables
- No changes to Supabase project configuration
- No changes to DNS, domains, or SSL
- No changes to build configuration (`next.config.ts` untouched)
- No changes to `package.json` (no new dependencies)

### Deployment Type
**Standard Next.js deployment** — no special deployment steps required beyond the normal build + deploy pipeline.

---

## Pre-Deployment Checklist

| Step | Command / Action | Expected |
|------|-----------------|----------|
| 1. All tests pass | `bun run validate` | Exit 0 |
| 2. Build succeeds | `bun run build` | Exit 0, all pages generated |
| 3. Design lint passes | `bun run lint:design-system` | Exit 0 |
| 4. No whitespace issues | `git diff --check` | Exit 0 |
| 5. Manual QA on dev server | `bun run dev` → navigate to share URL | Zero hydration warnings, clean UX |
| 6. Manual QA on production build | `bun run build && bun run start` → navigate to share URL | Same as dev |
| 7. Existing share tokens still work | Test with known good token | Page renders correctly |
| 8. Feature branch created | `git checkout -b feat/share-page-client-review-ux-ui-overhaul` | Branch created |
| 9. Changes committed | `git add` + `git commit` | Clean commit |

---

## Deployment Steps

1. **Create feature branch**: `feat/share-page-client-review-ux-ui-overhaul`
2. **Implement changes** following `04_IMPLEMENTATION_SEQUENCE.md`
3. **Run full validation**:
   ```bash
   bun run validate
   bun run build
   bun run lint:design-system
   git diff --check
   ```
4. **Manual QA** on local production build
5. **Commit and push** to feature branch
6. **Create PR** to `main` (per repo policy: feature branches/PRs, no automatic main merge)
7. **Deploy preview** on Vercel (automatic with PR)
8. **Verify preview**: Navigate to preview share URL, confirm zero hydration warnings
9. **Merge to main** (requires Philip approval per repo policy)
10. **Deploy to production** (Vercel auto-deploys from `main`)

---

## Post-Deploy Checks

| Check | How |
|-------|-----|
| Share page loads | Navigate to known share URL |
| Zero hydration warnings | Browser console |
| Password gate works | Navigate to password-protected share URL |
| Comments work | Submit comment as recipient |
| Decisions work | Submit decision as recipient |
| Mobile layout | Test on phone/tablet viewport |
| No 500 errors | Vercel logs / monitoring |
| Build health | Vercel deployment dashboard |

---

## Rollback Plan

### Option 1: Git Revert (Recommended)
```bash
git revert <merge-commit-hash>
git push origin main
```
Vercel auto-deploys the revert. All share pages return to pre-overhaul state.

**Time to rollback:** ~2 minutes (git + Vercel deploy)

### Option 2: Rollback to Previous Deployment
In Vercel dashboard:
1. Go to Deployments
2. Find the last deployment before the overhaul
3. Click "Promote to Production"

**Time to rollback:** ~30 seconds (Vercel instant rollback)

### Option 3: Partial Rollback
If only a specific component causes issues:
- Revert the specific file changes
- Push hotfix
- Vercel deploys

### Rollback Implications
| If... | Then... |
|-------|---------|
| New components deleted (`SharePageProposalHeader`, `SharePageDecisionBar`) | Import errors — revert page.tsx to use inline components |
| Chart rounding reverted | Hydration warnings return (acceptable temporarily) |
| Layout reverted | Old layout returns (functional, just not pretty) |
| Copy changes reverted | Old language returns ("View-only", "Visits are logged") |
| Comment GET route removed | Comments still work (just no history loading) |
| Decision GET route removed | Decisions still work (just no state loading on reload) |

---

## Feature Flags

No feature flags are used in this plan. All changes are direct replacements — there is no need for gradual rollout or A/B testing of the share page.

If feature flags are desired in the future:
- Could use `NEXT_PUBLIC_SHARE_PAGE_V2=true` environment variable
- Would require maintaining both old and new component trees
- **Not recommended** — the share page is a single public surface, not a user-configurable feature

---

## SEO / First Paint Impact

### If Chart Becomes Client-Only Rendered (Approach B - Fallback)
- Donut chart would not appear in SSR HTML
- Minor impact on social media preview cards (which show text-only OG tags)
- No impact on search engine indexing (share pages are not indexed)
- **Approach A (deterministic rounding) avoids this entirely**

---

## Migration Steps

**None.** This is a pure UI/UX change with no data migration requirements.

---

## Backward Compatibility

| Surface | Compatibility |
|---------|--------------|
| Existing share tokens | ✅ Fully compatible — token resolution unchanged |
| Existing password hashes | ✅ Fully compatible — password verification unchanged |
| Existing recipient sessions | ✅ Fully compatible — cookie format unchanged |
| Existing comments | ✅ Fully compatible — comment table unchanged |
| Existing decisions | ✅ Fully compatible — decision table unchanged |
| Existing API consumers | ✅ Fully compatible — API routes unchanged |
| Workshop charts | ✅ Must verify — `CostDonutChart` shared between share page and workshop |
