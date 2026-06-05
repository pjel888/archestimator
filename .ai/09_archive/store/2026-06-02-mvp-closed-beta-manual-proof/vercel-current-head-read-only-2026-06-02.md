# Vercel Current-Head Read-Only Evidence - 2026-06-02

Scope: read-only Vercel deployment, environment, alias, and public health checks after commit `3beda01`.

Result: partial/blocked. The latest `main` preview deployment is Ready and protected health works through `vercel curl`, but Vercel env vars are still absent, public preview health is deployment-protected, and production/custom domains still point to the older coming-soon deployment.

## Commands

```bash
vercel whoami
vercel env ls --non-interactive
vercel list --status READY --format json
vercel inspect VERCEL_DEPLOYMENT_URL_PLACEHOLDER
vercel curl https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/api/health
vercel curl https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/api/health
curl -I -sS https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/api/health
curl -I -sS https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/api/health
vercel domains ls
vercel alias ls --non-interactive
vercel inspect VERCEL_DEPLOYMENT_URL_PLACEHOLDER
curl -L -I -sS https://archestimator.com/api/health
curl -L -I -sS https://www.archestimator.com/api/health
curl -L -I -sS https://archestimator.vercel.app/api/health
curl -L -sS https://archestimator.com/
curl -L -sS https://www.archestimator.com/
curl -L -sS https://archestimator.vercel.app/
```

## Deployment Evidence

- Vercel CLI: `54.6.1`.
- `vercel whoami` returned `OWNER_HANDLE_PLACEHOLDER`.
- Latest listed Ready deployment for `main`: `VERCEL_DEPLOYMENT_URL_PLACEHOLDER`.
- Deployment commit: `3beda01e6e70651fdb3f8fe14b6c6eeffcaccd22`.
- Deployment id: `DEPLOYMENT_ID_PLACEHOLDER`.
- Deployment target/status: `preview`, `Ready`.
- Created: `Tue Jun 02 2026 09:26:02 GMT+0800`.
- Branch alias: `VERCEL_DEPLOYMENT_URL_PLACEHOLDER`.

## Environment And Health Evidence

- `vercel env ls --non-interactive` returned `No Environment Variables found for VERCEL_SCOPE_PLACEHOLDER/archestimator`.
- `vercel curl https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/api/health` returned `{"ok":true,"service":"archestimator"}`.
- `vercel curl https://VERCEL_DEPLOYMENT_URL_PLACEHOLDER/api/health` returned `{"ok":true,"service":"archestimator"}`.
- Plain public `curl -I` to the preview health route returned HTTP `401` with Vercel authentication required.
- Plain public `curl -I` to the `git-main` branch alias health route returned HTTP `401` with Vercel authentication required.

## Domain And Alias Evidence

- `vercel domains ls` found `archestimator.com` under `VERCEL_SCOPE_PLACEHOLDER`.
- `vercel alias ls --non-interactive` maps `VERCEL_DEPLOYMENT_URL_PLACEHOLDER` to the current `VERCEL_DEPLOYMENT_URL_PLACEHOLDER` deployment.
- `vercel alias ls --non-interactive` still maps `archestimator.com`, `www.archestimator.com`, `archestimator.vercel.app`, `archestimator-VERCEL_SCOPE_PLACEHOLDER.vercel.app`, and `VERCEL_DEPLOYMENT_URL_PLACEHOLDER` to `VERCEL_DEPLOYMENT_URL_PLACEHOLDER`.
- `vercel inspect VERCEL_DEPLOYMENT_URL_PLACEHOLDER` reported production deployment id `DEPLOYMENT_ID_PLACEHOLDER`, target `production`, status `Ready`, created `Sat May 30 2026 21:09:26 GMT+0800`.

## Public Custom-Domain Evidence

- `https://archestimator.com/api/health` returned HTTP `307` to `https://www.archestimator.com/api/health`, then HTTP `404`.
- `https://www.archestimator.com/api/health` returned HTTP `404` with `x-matched-path: /404`.
- `https://archestimator.vercel.app/api/health` returned HTTP `404` with `x-matched-path: /404`.
- `https://archestimator.com/`, `https://www.archestimator.com/`, and `https://archestimator.vercel.app/` returned page title `Archestimator - Coming Soon`.

## Launch Meaning

This refresh improves proof that the current `main` commit has a Ready preview and a protected health route reachable by authenticated Vercel tooling. It does not prove external closed-beta readiness because hosted environment variables are absent, public health is deployment-protected, custom domains still point at the older coming-soon production deployment, rollback is unrehearsed, hosted auth allowlist behavior is untested, and linked Supabase launch migrations remain unapplied.
