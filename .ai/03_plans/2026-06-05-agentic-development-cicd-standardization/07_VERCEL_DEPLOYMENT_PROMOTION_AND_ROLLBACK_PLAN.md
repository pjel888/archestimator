# 07 — Vercel Deployment, Promotion, and Rollback Plan

**Plan date:** 2026-06-05
**Upgrade pass:** 2026-06-05 14:45 PHT / 06:45 UTC
**Scope:** planning/documentation only
**Proof boundary:** repo/provider audit evidence plus future implementation contract; no GitHub, Vercel, Supabase, Resend, Notion, or production settings were changed by this plan.
**Canonical source:** this folder is a future implementation plan. Current truth remains source/config/tests/provider evidence plus `.ai/10_state/*`.
**Readiness target:** 98-100% implementation-planning readiness; not an implementation/enforcement completion claim.

## Current posture

`vercel.json` disables Git-triggered deployments for all branches. This is safer while `main` is unprotected and GitHub CI is disabled.

## Near-term release model

```txt
PR checks pass
  ↓
merge to staging
  ↓
staging/preview deployment + smoke proof
  ↓
PR staging → main
  ↓
manual GitHub Environment approval
  ↓
vercel --prod --skip-domain
  ↓
hosted smoke against staged production URL
  ↓
vercel promote <deployment-url>
  ↓
post-promote smoke + rollback evidence
```

## Required future workflow

Future `release-production.yml` should use `workflow_dispatch`, production environment approval, verify target SHA is on `main`, verify CI checks, run staged deployment (`vercel --prod --skip-domain --yes`), store deployment URL, run staged smoke, then require explicit promote (`vercel promote <deployment-url> --yes`).

## Minimum hosted smoke

- `/api/health`
- `/`
- `/login`
- `/workshop` auth redirect/protection
- safe invalid share-token response
- Vercel error-log check

## Rollback

Identify last known-good deployment, promote/rollback it, verify aliases, run smoke, and record evidence.

## Later Git auto-deploy option

Only after protected `main`, required checks, stable PR governance, staging proof, and owner approval. If re-enabled, prefer branch-specific `deploymentEnabled` rules, not blind full auto-deploy.

## Hard stops

Do not enable Vercel Git auto-deploy while `main` is unprotected. Do not promote a non-main deployment unless following an explicit hotfix/release procedure.
<!-- 98-100-UPGRADE:START -->
## Deployment invariants

- Never promote an unreviewed branch deployment to production aliases.
- Staged production deploy URL must be smoked before promotion.
- The deployed SHA must match the approved `main` commit unless following a documented hotfix path.
- Vercel tokens stay in secure local/provider/GitHub environment secret storage; never in docs or artifacts.
- Keep `git.deploymentEnabled:false` until `main` protection and required checks are proven.

## Expanded smoke requirements

In addition to `/api/health`, `/`, `/login`, `/workshop`, invalid share-token response, and log checks, route-specific smoke is required for auth/email/share/export changes before a production promote.

## Cost/authority boundary

Do not enable paid Vercel/GitHub features or deployment protection that changes cost without explicit owner re-approval.
<!-- 98-100-UPGRADE:END -->
