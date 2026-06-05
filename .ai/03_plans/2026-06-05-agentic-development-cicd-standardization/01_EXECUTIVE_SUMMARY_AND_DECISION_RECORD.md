# 01 — Executive Summary and Decision Record

**Plan date:** 2026-06-05
**Scope:** planning/documentation only
**Proof boundary:** repo/provider audit evidence plus future implementation contract; no GitHub, Vercel, Supabase, Resend, Notion, or production settings were changed by this plan.
**Canonical source:** this folder is a future implementation plan. Current truth remains source/config/tests/provider evidence plus `.ai/10_state/*`.

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
