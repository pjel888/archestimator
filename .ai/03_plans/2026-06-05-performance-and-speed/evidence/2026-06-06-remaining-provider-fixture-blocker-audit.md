# Remaining provider/fixture blocker audit — 2026-06-06

Status: **EXTERNAL PROVIDER/FIXTURE INPUTS REQUIRED**.

## Purpose

Re-audit the remaining open performance-plan gates after the hosted-auth timing harness update at commit `23db6aa`. This artifact records what was checked in the current worktree/session and why the remaining gates cannot be honestly closed without external dashboard or authenticated fixture inputs.

## Current branch state

- Branch: `feat/performance-and-speed-pr-0b-cache-safety`
- Head before this audit: `23db6aa`
- Worktree before this audit: clean

## Inputs checked

### Vercel provider access

- Vercel connector `_get_project` still reaches project `prj_QTjX1WrMb7b0ZxmMIRAL96ILRY9E` on team `team_eRuwqQwhMbYYDmvgIgpQW1GS`.
- Latest production deployment remains `dpl_4bMoArwC32Tup4dKK67wtKoBf2jv`, URL `archestimator-lz829v0ad-philipjonlewis-projects.vercel.app`, commit `2d9e12d4d8b3f08a6da686bcb06f753474590511`.
- Vercel connector `_list_deployments` returns deployment history and metadata, but not Speed Insights p75 values, route/device breakdown, or dashboard export data.
- Vercel protected fetch for `https://vercel.com/philipjonlewis-projects/archestimator/speed-insights` failed with: `Unable to create shareable URL for https://vercel.com/philipjonlewis-projects/archestimator/speed-insights.`

### Local fixture inputs

Checked process environment and repo env files for the following variable families, with values redacted and no secrets printed:

- `HOSTED_AUTH_*`
- `HOSTED_EXPORT_*`
- `PLAYWRIGHT_STORAGE_STATE`
- `VERCEL_*`
- `SUPABASE_*`
- `ARCHESTIMATOR_DEV_AUTH_*`
- `NEXT_PUBLIC_SUPABASE_*`
- `CLOSED_BETA_*`

Result: no safe hosted auth/export fixture variables or Playwright storage state were available in the current session/worktree.

Potential auth JSON files found under user tooling directories were not treated as Archestimator hosted session fixtures because they are generic tool auth files, not owner-approved closed-beta app storage state for `/workshop` or proposal export.

## Remaining gates and required external evidence

| Gate | Current evidence | Why not complete | Required external input/evidence |
| --- | --- | --- | --- |
| Step 0.1 Speed Insights dashboard values | Vercel deployment/project metadata plus public timing substitutes exist. | No p75 Core Web Vitals, route/device breakdown, dashboard screenshot, or export is accessible from current connector/fetch/browser attempts. | Owner/browser/dashboard export or a Vercel API/tool surface that exposes Speed Insights p75 by route/device/window. |
| Step 3.1 signed-in auth/proxy waterfall | Signed-out hosted `/workshop` redirect timing captured; beta RPC EXPLAIN captured; hosted auth harness supports repeated samples. | Allowed/denied/revoked/expired hosted session cookies or storage state are unavailable. | Owner-approved `HOSTED_AUTH_ALLOWED_COOKIE`, `HOSTED_AUTH_DENIED_COOKIE`, `HOSTED_AUTH_REVOKED_COOKIE`, `HOSTED_AUTH_EXPIRED_COOKIE`, or equivalent Playwright storage state. |
| Step 6.3 hosted proposal export benchmark | Local workbook benchmark and hosted export benchmark harness exist. | Hosted export route requires auth material plus project/estimate IDs; none are available. | `HOSTED_EXPORT_BASE_URL`, `HOSTED_EXPORT_PROJECT_ID`, `HOSTED_EXPORT_ESTIMATE_ID`, and `HOSTED_EXPORT_AUTH_COOKIE` or `HOSTED_EXPORT_AUTH_HEADER` for a safe representative fixture. |
| Step 7.2 Speed Insights window comparison | Local/provider-open release matrix exists. | Depends on Step 0.1 and comparable Speed Insights windows/traffic cohorts. | Two comparable Speed Insights windows for the same route bucket and device class. |

## Decision

The remaining gates are not locally implementable without external provider/dashboard or authenticated fixture inputs. The branch should remain at **IMPLEMENTED LOCALLY / PROVIDER PROOF OPEN** rather than `COMPLETE`.

Do not fabricate provider proof from local tests, curl timing, Vercel deployment metadata, signed-out redirects, or generic tool auth files.
