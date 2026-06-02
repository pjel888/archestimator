# Vercel Current-Head Read-Only Evidence - 165e4a3 - 2026-06-02

Scope: read-only Vercel deployment, environment, alias, and public health checks after commit `165e4a3ecf612c6196e4f2bfd1bd4d459fbea9fc`.

Result: partial/blocked. The latest `main` preview deployment is Ready and protected health works through `vercel curl`, but Vercel env vars are still absent, public preview health is deployment-protected, and production/custom domains still point to the older coming-soon deployment.

## Commands

```bash
vercel whoami
vercel env ls --non-interactive
vercel list --status READY --format json
vercel inspect archestimator-7wb28vtv2-philipjonlewis-projects.vercel.app
vercel curl https://archestimator-7wb28vtv2-philipjonlewis-projects.vercel.app/api/health
vercel curl https://archestimator-git-main-philipjonlewis-projects.vercel.app/api/health
curl -I -sS https://archestimator-7wb28vtv2-philipjonlewis-projects.vercel.app/api/health
curl -I -sS https://archestimator-git-main-philipjonlewis-projects.vercel.app/api/health
vercel alias ls --non-interactive
vercel inspect archestimator-3ser9ty2w-philipjonlewis-projects.vercel.app
curl -L -I -sS https://archestimator.com/api/health
curl -L -I -sS https://www.archestimator.com/api/health
curl -L -I -sS https://archestimator.vercel.app/api/health
curl -L -sS https://www.archestimator.com/
```

## Deployment Evidence

- Vercel CLI: `54.6.1`.
- `vercel whoami` returned `philipjonlewis`.
- Latest listed Ready deployment for `main`: `archestimator-7wb28vtv2-philipjonlewis-projects.vercel.app`.
- Deployment commit: `165e4a3ecf612c6196e4f2bfd1bd4d459fbea9fc`.
- Deployment id: `dpl_BebUf77ozLLxqpNYHroCErRZwBf9`.
- Deployment target/status: `preview`, `Ready`.
- Created: `Tue Jun 02 2026 09:35:59 GMT+0800`.
- Branch alias: `archestimator-git-main-philipjonlewis-projects.vercel.app`.

## Environment And Health Evidence

- `vercel env ls --non-interactive` returned `No Environment Variables found for philipjonlewis-projects/archestimator`.
- `vercel curl https://archestimator-7wb28vtv2-philipjonlewis-projects.vercel.app/api/health` returned `{"ok":true,"service":"archestimator"}`.
- `vercel curl https://archestimator-git-main-philipjonlewis-projects.vercel.app/api/health` returned `{"ok":true,"service":"archestimator"}`.
- Plain public `curl -I` to the preview health route returned HTTP `401` with Vercel authentication required.
- Plain public `curl -I` to the `git-main` branch alias health route returned HTTP `401` with Vercel authentication required.

## Domain And Alias Evidence

- `vercel alias ls --non-interactive` maps `archestimator-git-main-philipjonlewis-projects.vercel.app` to the current `archestimator-7wb28vtv2-philipjonlewis-projects.vercel.app` deployment.
- `vercel alias ls --non-interactive` still maps `archestimator.com`, `www.archestimator.com`, `archestimator.vercel.app`, `archestimator-philipjonlewis-projects.vercel.app`, and `archestimator-git-teaser-prelaunch-philipjonlewis-projects.vercel.app` to `archestimator-3ser9ty2w-philipjonlewis-projects.vercel.app`.
- `vercel inspect archestimator-3ser9ty2w-philipjonlewis-projects.vercel.app` reported production deployment id `dpl_FwfHexBsB1xSHDqHqFwHSYpCYTVH`, target `production`, status `Ready`, created `Sat May 30 2026 21:09:26 GMT+0800`.

## Public Custom-Domain Evidence

- `https://archestimator.com/api/health` returned HTTP `307` to `https://www.archestimator.com/api/health`, then HTTP `404`.
- `https://www.archestimator.com/api/health` returned HTTP `404` with `x-matched-path: /404`.
- `https://archestimator.vercel.app/api/health` returned HTTP `404` with `x-matched-path: /404`.
- `https://www.archestimator.com/` returned the `Archestimator` coming-soon page title.

## Launch Meaning

This refresh improves proof that the current `main` commit has a Ready preview and a protected health route reachable by authenticated Vercel tooling. It does not prove external closed-beta readiness because hosted environment variables are absent, public health is deployment-protected, custom domains still point at the older coming-soon production deployment, rollback is unrehearsed, hosted auth allowlist behavior is untested, and linked Supabase launch migrations remain unapplied.
