# Vercel Speed Insights refresh — 2026-06-06 post-closeout

Status: **CURRENT DEPLOYMENT SPEED INSIGHTS DATA OPEN / STALE OUTLIER ATTRIBUTED**.

## Source

- Tool: `vercel metrics` CLI 54.6.1, read-only.
- Project: `archestimator` / `prj_QTjX1WrMb7b0ZxmMIRAL96ILRY9E` under `philipjonlewis-projects`.
- Current production deployment from Vercel inspect/connector: `dpl_3F9cagsB27x8iuEjYQ5nkCCfqecR`, commit `207babf7343d2d2508e1d0fb6bc98b1313522224`.
- Raw JSON in this folder captures 1h, 6h, 24h, and 7d windows for LCP, INP, CLS, FCP, and TTFB, both overall and route/device.

## Window summaries

| Window | LCP | INP | CLS | FCP | TTFB | Interpretation |
| --- | --- | --- | --- | --- | --- | --- |
| 1h | empty | empty | empty | empty | empty | No recent Speed Insights data points yet for this window. |
| 6h | empty | empty | empty | empty | empty | No recent Speed Insights data points yet for this window. |
| 24h | empty | empty | empty | empty | empty | No recent Speed Insights data points yet for this window. |
| 7d | 1447 | 59404496 | empty | 1380 | 299 | Only stale 7-day provider data exists; route/device data is attributed separately. |

## Deployment-filtered result

- Current production deployment `dpl_3F9cagsB27x8iuEjYQ5nkCCfqecR` returned **empty** 7-day summaries for every Speed Insights metric when filtered by `deployment_id`.
- Older production deployment `dpl_Cxeq5ATpif6Yk1zn4FmNmnX7nzhT` owns the non-empty 7-day provider rows, including the anomalous desktop `/` INP value.
- Therefore RES cannot be claimed complete yet: the current deployment needs real-user data after the deployed performance changes.
