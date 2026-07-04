# Cloudflare Latest Deploy Source Smoke

Status: **OPEN / NOT READY**

Generated: `2026-07-03T22:30:57.328Z`

Deploy evidence: `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-02-cloudflare-main-worker-current-source-deploy.json`

## Summary

| Check | Result |
| --- | --- |
| Deploy evidence present | PASS |
| Deploy evidence parse error | none |
| Runtime source paths clean | OPEN |
| 100% production Worker version with deployment time recorded | PASS |
| Deployed source commit recorded | PASS |
| Deployed source commit matches current HEAD | PASS |
| Deployment is not older than current commit | PASS |
| Hosted route smoke passed | PASS |
| Release gates passed after deploy | PASS |

## Current Git

| Field | Value |
| --- | --- |
| commit | 230930b39ffed927cb397aec4d9dde161f8169b0 |
| committedAt | 2026-07-04T01:29:30+08:00 |
| subject | Fix D1 creator ownership before deploy proof |

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
- `M src/app/api/estimate-row-images/route.ts`
- `M src/app/api/projects/images/route.ts`
- `M src/lib/component-library/actions.ts`
- `M src/lib/projects/actions.ts`
- `M src/lib/repositories/estimate-favorites-repository.ts`
- `M src/lib/repositories/workspace-repository.ts`
- `M src/lib/uploads/upload-records.ts`
- `M src/lib/workshop/actions.ts`

## Deployment

| Field | Value |
| --- | --- |
| worker | archestimator-proof |
| productionVersionId | 01c577ee-ab6a-4da7-bcaf-ddab7baea524 |
| productionVersionNumber | 95 |
| trafficPercent | 100 |
| deployedAt | 2026-07-03T17:34:08.169674Z |
| deployedSourceCommit | 230930b39ffed927cb397aec4d9dde161f8169b0 |

## Open Blockers

- Runtime source paths have uncommitted changes and cannot be claimed deployed.

## Boundary

Non-destructive latest deploy/source-smoke evidence check. This script reads sanitized deployment evidence and local git metadata only. It does not read .env files, print secrets, deploy Workers, change DNS, rotate secrets, cancel providers, mutate data, or prove browser/manual/provider-exit gates.
