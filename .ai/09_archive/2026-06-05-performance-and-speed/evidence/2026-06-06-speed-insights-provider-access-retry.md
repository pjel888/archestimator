# Speed Insights provider access retry — 2026-06-06

Status: **SPEED INSIGHTS PROVIDER ACCESS BLOCKED / P75 METRICS OPEN**.

## Goal

Attempt to capture Vercel Speed Insights dashboard/export values for Workstream 0.1 and Workstream 7.2 without mutating Vercel settings or application code.

Target dashboard URL:

- `https://vercel.com/philipjonlewis-projects/archestimator/speed-insights`

## Vercel connector refresh

Connector calls succeeded for team/project/deployments:

- Team: `philipjonlewis-projects` / `team_eRuwqQwhMbYYDmvgIgpQW1GS`
- Project: `archestimator` / `prj_QTjX1WrMb7b0ZxmMIRAL96ILRY9E`
- Latest production deployment: `dpl_4bMoArwC32Tup4dKK67wtKoBf2jv`
- Latest production URL: `archestimator-lz829v0ad-philipjonlewis-projects.vercel.app`
- Latest production commit: `2d9e12d4d8b3f08a6da686bcb06f753474590511`
- Framework: `nextjs`; project Node version: `24.x`; bundler metadata: `turbopack`

The connector tools exposed project/deployment/build-log/documentation surfaces, but no direct Speed Insights p75 metric/export endpoint.

## Vercel documentation check

Vercel documentation search returned Speed Insights ingestion/drain references, including:

- Speed Insights API `POST /v1/vitals` for sending web-vital data;
- Speed Insights drains/reference payload shape for exported/drained metric events;
- package configuration (`@vercel/speed-insights`) and sample-rate guidance.

This confirms the docs surface available in-session is not a dashboard p75 read API. It does not provide the required project-level p75 values, route/device breakdown, or comparable dashboard windows.

## Protected Vercel fetch attempt

Tool: Vercel `_web_fetch_vercel_url`.

Input:

```text
https://vercel.com/philipjonlewis-projects/archestimator/speed-insights
```

Result:

```json
{
  "success": false,
  "info": "Unable to create shareable URL for https://vercel.com/philipjonlewis-projects/archestimator/speed-insights."
}
```

## Chrome/Computer Use retry

Tool: Computer Use `get_app_state` for `Google Chrome`.

Result:

```text
tool call error: tool call failed for `computer-use/get_app_state`

Caused by:
    timed out awaiting tools/call after 120s
```

This is the same access blocker already recorded in `evidence/2026-06-05-computer-use-speed-insights-attempt.md` and `evidence/2026-06-06-speed-insights-chrome-retry.md`.

## Decision

Workstream 0.1 and 7.2 remain open. Do not substitute connector deployment metadata, curl/httpstat timings, or local Lighthouse traces for Speed Insights p75 dashboard/export proof.

Still required:

- overall score;
- p75 LCP, INP, CLS, FCP, and TTFB;
- route/path breakdown;
- mobile/desktop split;
- 7-day and 30-day or otherwise comparable windows;
- confirmation whether deployment `dpl_4bMoArwC32Tup4dKK67wtKoBf2jv` is included in the selected window.
