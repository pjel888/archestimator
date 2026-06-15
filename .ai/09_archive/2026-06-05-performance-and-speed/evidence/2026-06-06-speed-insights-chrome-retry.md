# Speed Insights Chrome Retry

Date: 2026-06-06 (session local time)
Worktree: `/Users/philiplewis/archestimator.omx-worktrees/impl-performance-and-speed-pr-0b-cache-safety`
Branch: `feat/performance-and-speed-pr-0b-cache-safety`

## Goal

Attempt to capture Vercel Speed Insights dashboard evidence for `archestimator` without mutating Vercel/project settings or application code.

Target dashboard URL from the plan:

- `https://vercel.com/philipjonlewis-projects/archestimator/speed-insights`

## Attempt

Tool: Computer Use `get_app_state` for app `Google Chrome`.

Result:

```text
tool call error: tool call failed for `computer-use/get_app_state`

Caused by:
    timed out awaiting tools/call after 120s
```

## Decision

The Speed Insights dashboard/provider metrics remain unavailable from this session. This retry confirms the same UI-access blocker already recorded in the plan.

Do not treat connector/curl timing evidence as Speed Insights p75 proof. The following remain provider-open:

- overall score,
- p75 LCP,
- p75 INP,
- p75 CLS,
- p75 FCP,
- p75 TTFB,
- route/path breakdown,
- device and geo split,
- 7-day and 30-day windows,
- latest deployment inclusion in the selected Speed Insights window.

Status language: **SPEED INSIGHTS UI RETRY BLOCKED / PROVIDER METRICS OPEN**.
