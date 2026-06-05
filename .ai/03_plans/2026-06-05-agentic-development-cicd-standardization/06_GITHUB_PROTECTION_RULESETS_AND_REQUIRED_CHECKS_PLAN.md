# 06 — GitHub Protection, Rulesets, and Required Checks Plan

**Plan date:** 2026-06-05
**Scope:** planning/documentation only
**Proof boundary:** repo/provider audit evidence plus future implementation contract; no GitHub, Vercel, Supabase, Resend, Notion, or production settings were changed by this plan.
**Canonical source:** this folder is a future implementation plan. Current truth remains source/config/tests/provider evidence plus `.ai/10_state/*`.

## Current blocker

Read-only API returned `main protected:false`, and protection/rulesets endpoints return a 403 saying to upgrade to GitHub Pro or make the repository public.

## Required owner decision

Choose one before full implementation:

1. Upgrade/enable private branch protection/rulesets.
2. Make the repo public later if acceptable.
3. Accept advisory-only governance with no platform block.

Recommended: keep repo private and enable the needed GitHub plan/capability.

## `main` protection target

- Require pull request before merge.
- Require review and CODEOWNERS review.
- Require conversation resolution.
- Require status checks: `governance`, `quality-validate`, `quality-build`, and relevant e2e/release checks.
- Block force pushes and deletion.
- Apply to admins after emergency bypass is documented.

## `staging` protection target

- Require PR.
- Require `governance`, `quality-validate`, `quality-build`, and relevant e2e.
- Block force pushes/deletion.
- Require AI evidence in PR body.

## Rulesets target

If rulesets are available, create rulesets such as `protect-production-main`, `protect-staging`, `ai-branch-policy`, and `release-hotfix-policy`.

## Required check naming discipline

Do not rename required jobs casually. Use stable names: `governance`, `quality-validate`, `quality-build`, `e2e-smoke`, `perf-smoke`, `release-staged-deploy`, `release-hosted-smoke`.

## Emergency bypass record

```txt
BYPASS_RECORD:
date=
branch=
reason=
rules bypassed=
validation run=
production impact=
restore time=
owner approval=
```

Do not claim `main` is protected unless fresh API/UI evidence proves it.
