# Cloudflare Latest Deploy Source Smoke

Status: **OPEN / NOT READY**

Generated: `2026-07-03T14:46:55.585Z`

Deploy evidence: `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-02-cloudflare-main-worker-current-source-deploy.json`

## Summary

| Check | Result |
| --- | --- |
| Deploy evidence present | PASS |
| Deploy evidence parse error | none |
| Runtime source paths clean | PASS |
| 100% production Worker version with deployment time recorded | PASS |
| Deployed source commit recorded | OPEN |
| Deployed source commit matches current HEAD | OPEN |
| Deployment is not older than current commit | OPEN |
| Hosted route smoke passed | PASS |
| Release gates passed after deploy | PASS |

## Current Git

| Field | Value |
| --- | --- |
| commit | ddbc9ac414c5faa11232fc194ed8094782afaee3 |
| committedAt | 2026-07-03T19:13:24+08:00 |
| subject | docs(cloudflare-migration): add implementation completion audit evidence |

Runtime source status paths:
- `src`
- `worker.ts`
- `package.json`
- `bun.lock`
- `wrangler.jsonc`
- `cloudflare-env.d.ts`
- `next.config.ts`
- `open-next.config.ts`
- `src/middleware.ts`

Dirty runtime source entries:
- none

## Deployment

| Field | Value |
| --- | --- |
| worker | archestimator-proof |
| productionVersionId | 3d3f3873-3232-4591-9436-2e963860ddbb |
| productionVersionNumber | 83 |
| trafficPercent | 100 |
| deployedAt | 2026-07-01T22:46:35.454876Z |
| deployedSourceCommit | (missing) |

## Open Blockers

- Deploy evidence does not record the deployed git source commit.
- Deployment timestamp is older than the current git commit timestamp.

## Boundary

Non-destructive latest deploy/source-smoke evidence check. This script reads sanitized deployment evidence and local git metadata only. It does not read .env files, print secrets, deploy Workers, change DNS, rotate secrets, cancel providers, mutate data, or prove browser/manual/provider-exit gates.
