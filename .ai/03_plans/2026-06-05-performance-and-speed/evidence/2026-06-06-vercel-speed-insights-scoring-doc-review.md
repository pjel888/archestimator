# Vercel Speed Insights scoring-doc review — 2026-06-06

Status: **OFFICIAL SCORING RULES REVIEWED / COMPLETION GATE REFINED**.

Source reviewed: https://vercel.com/docs/speed-insights/metrics#how-the-scores-are-determined and related Vercel Speed Insights overview/docs via Vercel docs connector.

## Rules that matter for Archestimator

- RES uses real data points collected from visitors' devices; lab Lighthouse cannot prove RES by itself.
- Vercel scores individual metrics on a 0–100 scale using log-normal distributions derived from HTTP Archive real-world data.
- RES is a weighted average: FCP 15%, LCP 30%, INP 30%, CLS 25%.
- Good thresholds are LCP <= 2.5s, INP <= 200ms, CLS <= 0.1, FCP <= 1.8s, TTFB under 800ms.
- Speed Insights defaults to P75; current-dashboard proof must compare the same route/device/time-window cohorts.
- Hard navigations are especially important for Next.js apps because Speed Insights data points are collected for first-page views in a session.

## Resulting completion gate

Do not mark the RES goal complete from local Lighthouse, synthetic probes, or old deployment metrics. Completion requires current-production Speed Insights rows for the deployed performance commit, with RES 90–100/green and preferably 95–100 if enough real-user data exists. Until then, label the state `IMPLEMENTED LOCALLY / CURRENT DEPLOYMENT PROVIDER DATA OPEN`.
