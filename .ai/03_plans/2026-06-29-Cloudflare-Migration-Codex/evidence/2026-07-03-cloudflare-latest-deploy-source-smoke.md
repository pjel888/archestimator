# Cloudflare Latest Deploy Source Smoke

Status: **OPEN / NOT READY**

Generated: `2026-07-04T10:22:54.664Z`

Deploy evidence: `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-02-cloudflare-main-worker-current-source-deploy.json`

## Summary

| Check | Result |
| --- | --- |
| Deploy evidence present | PASS |
| Deploy evidence parse error | none |
| Runtime source paths clean | PASS |
| 100% production Worker version with deployment time recorded | PASS |
| Deployed source commit recorded | PASS |
| Deployed source commit matches current HEAD | OPEN |
| Deployment is not older than current commit | OPEN |
| Hosted route smoke passed | PASS |
| Release gates passed after deploy | PASS |

## Current Git

| Field | Value |
| --- | --- |
| commit | 5428375ce225d00a8fd888368d2cdfb348ed6761 |
| committedAt | 2026-07-04T17:57:06+08:00 |
| subject | docs(ai): refresh auth audit executive summary |

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
| productionVersionId | 01c577ee-ab6a-4da7-bcaf-ddab7baea524 |
| productionVersionNumber | 95 |
| trafficPercent | 100 |
| deployedAt | 2026-07-03T17:34:08.169674Z |
| deployedSourceCommit | 230930b39ffed927cb397aec4d9dde161f8169b0 |

## Open Blockers

- Deployed git source commit does not match current HEAD.
- Deployment timestamp is older than the current git commit timestamp.

## Boundary

Non-destructive latest deploy/source-smoke evidence check. This script reads sanitized deployment evidence and local git metadata only. It does not read .env files, print secrets, deploy Workers, change DNS, rotate secrets, cancel providers, mutate data, or prove browser/manual/provider-exit gates.
