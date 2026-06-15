# Remaining provider/fixture blocker audit — 2026-06-06

Status: **PARTIALLY SUPERSEDED / FIXTURE AND COMPARABLE-WINDOW INPUTS REQUIRED**.

> 2026-06-06 supersession note: this audit was accurate when captured after commit `23db6aa`, but it is superseded for Speed Insights p75 values by `evidence/vercel-speed-insights-cli-2026-06-06/vercel-speed-insights-cli-baseline.md`. It remains current for missing signed-in hosted auth fixtures, missing hosted export fixture/auth inputs, dashboard overview screenshot/recommendation cards, and comparable Speed Insights windows.

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
| Step 0.1 Speed Insights dashboard values | Vercel deployment/project metadata plus public timing substitutes exist; later `vercel metrics` CLI evidence captures p75 Core Web Vitals and route/device breakdown. | Dashboard overview screenshot/recommendation cards remain unavailable from connector/fetch/browser attempts. | Owner/browser/dashboard export if visual overview/recommendation cards are required. |
| Step 3.1 signed-in auth/proxy waterfall | Signed-out hosted `/workshop` redirect timing captured; beta RPC EXPLAIN captured; hosted auth harness supports repeated samples. | Allowed/denied/revoked/expired hosted session cookies or storage state are unavailable. | Owner-approved `HOSTED_AUTH_ALLOWED_COOKIE`, `HOSTED_AUTH_DENIED_COOKIE`, `HOSTED_AUTH_REVOKED_COOKIE`, `HOSTED_AUTH_EXPIRED_COOKIE`, or equivalent Playwright storage state. |
| Step 6.3 hosted proposal export benchmark | Local workbook benchmark and hosted export benchmark harness exist. | Hosted export route requires auth material plus project/estimate IDs; none are available. | `HOSTED_EXPORT_BASE_URL`, `HOSTED_EXPORT_PROJECT_ID`, `HOSTED_EXPORT_ESTIMATE_ID`, and `HOSTED_EXPORT_AUTH_COOKIE` or `HOSTED_EXPORT_AUTH_HEADER` for a safe representative fixture. |
| Step 7.2 Speed Insights window comparison | Current 7-day and last-3-day route/device p75 windows exist via Vercel CLI. | Previous 7-day and previous-3-day route/device windows returned empty summaries, so no comparable prior cohort exists. | Two comparable Speed Insights windows for the same route bucket and device class. |

## Decision

The remaining gates are not locally implementable without external dashboard, deployed/post-deploy provider windows, or authenticated fixture inputs. The branch should remain at **IMPLEMENTED LOCALLY / PROVIDER PROOF OPEN** rather than `COMPLETE`.

Do not fabricate provider proof from local tests, curl timing, Vercel deployment metadata, signed-out redirects, or generic tool auth files.
