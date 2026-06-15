# 06 — GitHub Protection, Rulesets, and Required Checks Plan

**Plan date:** 2026-06-05
**Upgrade pass:** 2026-06-05 14:45 PHT / 06:45 UTC
**Scope:** planning/documentation only
**Proof boundary:** repo/provider audit evidence plus future implementation contract; no GitHub, Vercel, Supabase, Resend, Notion, or production settings were changed by this plan.
**Canonical source:** this folder is a future implementation plan. Current truth remains source/config/tests/provider evidence plus `.ai/10_state/*`.
**Readiness target:** 98-100% implementation-planning readiness; not an implementation/enforcement completion claim.

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

## Required-check topology decision before enforcement

Before enabling required checks, decide which jobs are always-present blockers and which jobs are advisory or release-only. Required branch-protection checks must not depend on path filters or event filters that leave a required context missing.

Recommended lean topology:

- Always-present PR blockers after dry-run: `governance`, `quality-validate`, `quality-build`.
- Always-present aggregator/no-op gate before requiring route-specific checks: `quality-gate` summarizes optional/advisory jobs and fails only when a required-for-this-PR job failed or was expected but missing.
- Advisory until stable: `docs-health`, `e2e-smoke`, `perf-smoke`.
- Release workflow only: `release-staged-deploy`, `release-hosted-smoke`.

If GitHub branch protection can require only individual job names, require only the always-present blockers until the aggregator/no-op pattern is implemented and proven on docs-only, source, route, and release PR fixtures.

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
<!-- 98-100-UPGRADE:START -->
## API/UI proof checklist

Capture fresh evidence after configuration:

```bash
gh api repos/pjel888/archestimator/branches/main --jq '{protected,protection}'
gh api repos/pjel888/archestimator/rulesets --jq '.[] | {name,enforcement,conditions}'
gh run list --repo pjel888/archestimator --limit 10 --json workflowName,headBranch,headSha,status,conclusion,url
```

If API proof is incomplete, record a redacted UI transcript/screenshot. Do not include tokens or private provider payloads.

## Advisory-only fallback

If GitHub capability remains blocked, permitted statuses are only `CI_RESTORED_ADVISORY_GOVERNANCE` or `PROTECTION_BLOCKED_BY_GITHUB_PLAN_CAPABILITY`. Do not claim required checks are platform-enforced.
<!-- 98-100-UPGRADE:END -->
