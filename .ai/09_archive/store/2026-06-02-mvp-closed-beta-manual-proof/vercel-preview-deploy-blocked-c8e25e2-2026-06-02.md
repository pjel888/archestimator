# Vercel Preview Deploy Blocked at c8e25e2 - 2026-06-02

Status: deployment blocked before hosted recheck; external closed beta remains **NO-GO**.

## Scope

- Commit intended for preview recheck: `c8e25e2ce63dd3004db8085480432ba847900e10`.
- Main branch push: succeeded (`6cc9f03..c8e25e2 main -> main`).
- Production mutations: none.

## Finding

After pushing `c8e25e2`, `vercel ls --non-interactive` still showed the pre-fix preview `VERCEL_DEPLOYMENT_URL_PLACEHOLDER` / `DEPLOYMENT_ID_PLACEHOLDER` as the newest Ready deployment and branch alias target. No new Git-triggered preview for `c8e25e2` appeared during the polling window.

## Clean Preview Deploy Attempt

To avoid packaging unrelated dirty files from the main checkout, a detached clean worktree was created at `c8e25e2` under `/tmp/archestimator-c8e25e2`, with the existing Vercel project link copied into `.vercel/project.json`.

The first `vercel deploy --yes --non-interactive` attempt failed before creating a deployment because the upload bundle exceeded Vercel's file-size limit. The clean worktree contained large non-runtime evidence/deck folders, so a temporary `.vercelignore` was added only in the detached worktree to exclude `.ai`, `archestimator_pitch deck`, tests, and local report folders.

The retry uploaded the reduced bundle but failed before deployment with:

```txt
Resource is limited - try again in 24 hours (more than 100, code: "api-deployments-free-per-day").
```

## Launch Meaning

The local fail-closed auth fix is committed and pushed, but hosted proof remains blocked because Vercel did not provide a new `c8e25e2` deployment and manual preview deployment hit the daily deployment limit. Do not treat the fix as hosted-proven until a fresh Vercel deployment for `c8e25e2` or later is Ready and `vercel curl <deployment>/workshop -I` proves the route no longer returns HTTP `500`.
