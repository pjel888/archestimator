# 07 — Vercel Deployment, Promotion, and Rollback Plan

**Plan date:** 2026-06-05
**Scope:** planning/documentation only
**Proof boundary:** repo/provider audit evidence plus future implementation contract; no GitHub, Vercel, Supabase, Resend, Notion, or production settings were changed by this plan.
**Canonical source:** this folder is a future implementation plan. Current truth remains source/config/tests/provider evidence plus `.ai/10_state/*`.

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
