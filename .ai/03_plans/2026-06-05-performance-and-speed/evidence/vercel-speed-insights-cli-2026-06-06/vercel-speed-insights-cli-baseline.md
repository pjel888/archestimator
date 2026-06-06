# Vercel Speed Insights CLI baseline — 2026-06-06

Status: **SPEED INSIGHTS P75 METRICS CAPTURED VIA VERCEL CLI / COMPARABLE PRIOR WINDOW OPEN**.

## Source

- Tool: `vercel metrics` CLI 54.6.1, read-only queries.
- Project: `archestimator` (`prj_QTjX1WrMb7b0ZxmMIRAL96ILRY9E`) under scope `philipjonlewis-projects`.
- Metric prefix confirmed by `vercel metrics schema vercel.speed_insights_metric`: `lcp`, `inp`, `cls`, `fcp`, `fid`, `ttfb_ms`; shared dimensions include `route` and `device_type`.
- Raw JSON folder: `evidence/vercel-speed-insights-cli-2026-06-06/`.
- No provider mutation, deploy, environment change, or Supabase access was performed.

## Current 7-day overall p75

| Metric | p75 | Window | Notes |
| --- | ---: | --- | --- |
| LCP | 1447ms | `2026-05-30T00:00:00.000Z` → `2026-06-06T04:00:00.000Z` | `vercel.speed_insights_metric.lcp` p75 |
| INP | 5.94045e+07ms | `2026-05-30T00:00:00.000Z` → `2026-06-06T04:00:00.000Z` | `vercel.speed_insights_metric.inp` p75 |
| CLS | null | `2026-05-30T00:00:00.000Z` → `2026-06-06T04:00:00.000Z` | `vercel.speed_insights_metric.cls` p75 |
| FCP | 1380ms | `2026-05-30T00:00:00.000Z` → `2026-06-06T04:00:00.000Z` | `vercel.speed_insights_metric.fcp` p75 |
| TTFB | 299ms | `2026-05-30T00:00:00.000Z` → `2026-06-06T04:00:00.000Z` | `vercel.speed_insights_metric.ttfb_ms` p75 |

## Current 7-day route/device p75 highlights

| Metric | Route | Device | p75 |
| --- | --- | --- | ---: |
| LCP | `/` | `desktop` | 3484ms |
| LCP | `/` | `mobile` | 1447ms |
| LCP | `/login` | `desktop` | 800ms |
| INP | `/` | `desktop` | 5.94045e+07ms |
| INP | `/` | `mobile` | 32ms |
| CLS | `/` | `desktop` | 0 |
| CLS | `/login` | `desktop` | 0 |
| FCP | `/` | `desktop` | 3216ms |
| FCP | `/` | `mobile` | 1380ms |
| FCP | `/login` | `desktop` | 800ms |
| TTFB | `/` | `mobile` | 721ms |
| TTFB | `/` | `desktop` | 257ms |
| TTFB | `/login` | `desktop` | 62ms |

## Comparable-window attempt

| Window | Result |
| --- | --- |
| Previous 7d (`--since 14d --until 7d`) | LCP=0, INP=0, CLS=0, FCP=0, TTFB=0 |
| Previous 3d (`--since 6d --until 3d`) | LCP=0, INP=0, CLS=0, FCP=0, TTFB=0 |
| Last 3d (`--since 3d`) | LCP=3, INP=3, CLS=3, FCP=3, TTFB=3 |

Interpretation: the current 7-day and last-3-day windows have Speed Insights route/device data, but the previous 7-day and previous-3-day windows returned empty summaries. Step 7.2 therefore has current-window evidence but still lacks a comparable prior traffic cohort.

## Manual trace for flagged route

- Speed Insights route/device p75 highlights flag `/` desktop as the highest LCP/FCP outlier and an anomalous INP outlier in this capture.
- Bounded production Lighthouse desktop trace captured `https://www.archestimator.com/`: `prod-home-desktop-speed-insights-flagged.report.json` and `.html`.
- Lighthouse desktop result: performance score `0.99`, FCP `467ms`, LCP `756ms`, CLS `0`, TBT `1ms`, Speed Index `1084ms`.

## Caveats

- The Vercel dashboard overview score/screenshot is still not exposed by this CLI evidence; the numeric Core Web Vitals p75 values and route/device breakdown are captured by the provider CLI instead.
- INP contains an anomalously large desktop `/` value in the provider output; keep the raw JSON and treat route/device interpretation conservatively until the Vercel dashboard can be visually inspected.
- This evidence closes the earlier provider-data access gap for p75 metrics, but not the need for future comparable-window monitoring after new deployments/traffic.
