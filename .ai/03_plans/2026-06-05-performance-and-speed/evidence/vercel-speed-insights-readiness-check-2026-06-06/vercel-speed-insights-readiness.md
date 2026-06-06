# Vercel Speed Insights readiness check — 2026-06-06T04:10:11.362Z

Status: **CURRENT DEPLOYMENT PROVIDER DATA OPEN**.

## Target

- Project: `archestimator` under `philipjonlewis-projects`
- Production URL: `https://www.archestimator.com`
- Current deployment: `dpl_3F9cagsB27x8iuEjYQ5nkCCfqecR`
- Window: `7d`
- Target RES: `95`
- Dashboard RES supplied: `not supplied`

## Metric readiness

| Metric | Current-deployment p75/worst value | Vercel good threshold | Has rows | Threshold met | Data points |
| --- | ---: | ---: | --- | --- | ---: |
| FCP | missing | 1800 | no | no | 0 |
| LCP | missing | 2500 | no | no | 0 |
| INP | missing | 200 | no | no | 0 |
| CLS | missing | 0.1 | no | no | 0 |
| TTFB | missing | 800 | no | no | 0 |

## Completion gates

- Current-deployment data ready: **no**
- Core Vitals good: **no**
- Dashboard RES target met: **no**
- RES completion ready: **no**

## Missing

- current-deployment Speed Insights rows for FCP/LCP/INP/CLS
- current-deployment FCP/LCP/INP/CLS all within Vercel good thresholds
- dashboard/RES score >= 95

## Note

Read-only Vercel Speed Insights readiness check. It queries current-deployment p75 Speed Insights metrics via Vercel CLI, compares FCP/LCP/INP/CLS to Vercel good thresholds, and fails closed for exact RES completion unless a dashboard RES score is supplied. It does not submit vitals, create traffic, deploy, promote, mutate provider settings, or infer RES from lab data.
