# Cloudflare Latest Deploy Source Smoke

Status: **READY**

Generated: `2026-07-05T05:07:08.584Z`

Deploy evidence: `.ai/03_plans/2026-06-29-Cloudflare-Migration-Codex/evidence/2026-07-02-cloudflare-main-worker-current-source-deploy.json`

## Summary

| Check | Result |
| --- | --- |
| Deploy evidence present | PASS |
| Deploy evidence parse error | none |
| Runtime source paths clean | PASS |
| 100% production Worker version with deployment time recorded | PASS |
| Deployed source commit recorded | PASS |
| Deployed source commit matches current HEAD | PASS |
| Deployment is not older than current commit | PASS |
| Hosted route smoke passed | PASS |
| Release gates passed after deploy | PASS |

## Current Git

| Field | Value |
| --- | --- |
| commit | fd2a164553ad9820390a7641240f177cb338171d |
| committedAt | 2026-07-05T12:54:07+08:00 |
| subject | Keep project-group deploy work inside React Doctor gates |

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
| productionVersionId | a57a03a7-af11-4310-a55e-73c87188bba2 |
| productionVersionNumber | 96 |
| trafficPercent | 100 |
| deployedAt | 2026-07-05T05:04:34.644159Z |
| deployedSourceCommit | fd2a164553ad9820390a7641240f177cb338171d |

## Open Blockers

- none

## Boundary

Non-destructive latest deploy/source-smoke evidence check. This script reads sanitized deployment evidence and local git metadata only. It does not read .env files, print secrets, deploy Workers, change DNS, rotate secrets, cancel providers, mutate data, or prove browser/manual/provider-exit gates.
