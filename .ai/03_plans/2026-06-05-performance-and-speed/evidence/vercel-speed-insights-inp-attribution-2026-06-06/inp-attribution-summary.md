# Vercel Speed Insights INP attribution — 2026-06-06

Status: **ANOMALOUS INP OUTLIER ATTRIBUTED TO OLD DEPLOYMENT / CURRENT DEPLOYMENT DATA OPEN**.

## Key finding

The 7-day `/` desktop INP p75/max value `59,404,496ms` is isolated to old production deployment `dpl_Cxeq5ATpif6Yk1zn4FmNmnX7nzhT`, not current production deployment `dpl_3F9cagsB27x8iuEjYQ5nkCCfqecR`. Vercel connector metadata identifies the old deployment as main commit `2cddb0e0d23b21b013c66d0a1c086d129cfbd499` with commit message `docs(ai): refine agentic framework phase 1 readiness plan`.

## Attribution

| Dimension | `/` desktop outlier cohort | Other observed cohorts |
| --- | --- | --- |
| deployment | `dpl_Cxeq5ATpif6Yk1zn4FmNmnX7nzhT` => INP p75 `59,404,496ms` | Same deployment also has `/` mobile INP `32ms`; `/login` desktop INP `null`. |
| browser | Chrome desktop => INP p75 `59,404,496ms` | Chrome Mobile iOS mobile => `32ms`; Chrome `/login` desktop => `null`. |
| OS | Mac desktop => INP p75 `59,404,496ms` | iOS mobile => `32ms`; Mac `/login` desktop => `null`. |
| country | PH desktop => INP p75 `59,404,496ms` | PH mobile => `32ms`; PH `/login` desktop => `null`. |
| hostname | `archestimator.com` desktop => INP p75 `59,404,496ms` | `archestimator.com` mobile => `32ms`; `archestimator.com` `/login` desktop => `null`. |

## Interpretation

- Current production commit `207babf` has no filtered Speed Insights rows yet, so the dashboard/RES target cannot be verified by current real-user data today.
- The old outlier should not drive new speculative code work; local and production Lighthouse for current production are good, and the provider gap is now a traffic/window issue.
- Continue monitoring same route/device cohorts after current production receives enough hard-navigation data points.
