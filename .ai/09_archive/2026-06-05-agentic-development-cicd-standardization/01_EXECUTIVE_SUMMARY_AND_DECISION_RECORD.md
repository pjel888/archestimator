# 01 — Executive Summary and Decision Record

**Plan date:** 2026-06-05
**Upgrade pass:** 2026-06-05 14:45 PHT / 06:45 UTC
**Scope:** planning/documentation only
**Proof boundary:** repo/provider audit evidence plus future implementation contract; no GitHub, Vercel, Supabase, Resend, Notion, or production settings were changed by this plan.
**Canonical source:** this folder is a future implementation plan. Current truth remains source/config/tests/provider evidence plus `.ai/10_state/*`.
**Readiness target:** 98-100% implementation-planning readiness; not an implementation/enforcement completion claim.

## Decision

Keep `main` as the production source of truth, introduce `staging` as the closed-beta/pre-production integration branch, keep AI work on scoped `codex/*`/feature branches, and use GitHub Actions plus GitHub branch protection/rulesets as the merge gate before Vercel production promotion.

## Why not a separate `production` branch

Do not create a separate `production` branch now. `main` is already the default branch, Vercel and docs align with `main`, and an extra production branch would add drift/backmerge risk before governance is stable.

## Why GitHub Actions + Vercel

GitHub Actions is closest to PRs, checks, branch protection, PR templates, and code ownership. Vercel is already the hosting platform and supports staged production deployment and promotion. Alternative CI platforms would add another secrets/status/billing surface without solving disabled CI, missing PR governance, or unavailable branch protection.

## Recommended phases

1. Reactivate CI visibility.
2. Harden CI in code: permissions, concurrency, split jobs, artifacts, action policy.
3. Add PR governance: template, CODEOWNERS, agent receipt, proof boundary.
4. Resolve the GitHub private-repo protection/ruleset capability blocker.
5. Protect `main`, then create/protect `staging`.
6. Add manual GitHub Environment-gated production release workflow to Vercel.
7. Decide later whether Vercel Git auto-deploy can be re-enabled behind protected `main`.

## Owner decisions required before future implementation

| Decision | Recommended answer |
|---|---|
| Keep `main` production? | Yes |
| Create `staging`? | Yes, after CI is restored |
| Allow future AI direct pushes to `main`? | No |
| Treat `codex/*` as first-class branch pattern? | Yes |
| Upgrade/enable GitHub private branch protection/rulesets? | Yes if still blocked |
| Keep Vercel Git auto-deploy disabled now? | Yes |

## Success definition

A future AI task cannot update production by accident: it must branch, PR, pass CI, gather staging proof, merge through protected branch rules, create a staged production deployment, pass smoke checks, and receive explicit owner promotion authority.
<!-- 98-100-UPGRADE:START -->
## Adopt / defer / reject matrix

| Decision | Verdict | Rationale | Evidence dependency |
|---|---|---|---|
| GitHub Actions as CI control plane | Adopt | Native required checks, branch protection, CODEOWNERS, PR receipts | current disabled workflow id `277898857` |
| Vercel as deployment platform | Adopt | Current production and aliases already live on Vercel | `dpl_4bMoArwC32Tup4dKK67wtKoBf2jv` inspect proof |
| Separate `production` branch | Reject now | Adds drift/backmerge risk while `main` is already default/production source | GitHub default branch and Vercel production alignment |
| `staging` branch | Defer until CI visible | Staging without CI is theater | CI currently disabled |
| Direct AI pushes to `main` | Reject after this plan | Production changes need PR/check/proof path | `main protected:false` makes current state unsafe |
| Advisory governance first | Adopt | Lean beta velocity; avoid brittle blockers until dry-runs pass | audit's plan-action-gap warning |
| CI vendor migration | Reject now | Would add status/secrets/billing surface without fixing GitHub enforcement | bottleneck is disabled CI + protection capability |
| Full Vercel Git auto-deploy | Defer | Unsafe while `main` unprotected | `git.deploymentEnabled:false` current config |

## Failure definition

This plan fails if a future report claims `IMPLEMENTED_AND_ENFORCED` while any of these remain true: CI disabled, current-SHA CI missing, `main` unprotected, rulesets/protection 403, PR template/CODEOWNERS absent, governance only advisory, Vercel promotion lacks owner approval/smoke, or provider proof is missing.
<!-- 98-100-UPGRADE:END -->
