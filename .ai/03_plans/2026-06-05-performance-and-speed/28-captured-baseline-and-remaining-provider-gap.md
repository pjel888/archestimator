<!-- Docs-only performance planning pack. Added 2026-06-05. No application code implementation in this folder. -->

# Captured Baseline and Remaining Provider Gap

## Captured project/deployment context

Source: Vercel connector, 2026-06-05, with later 2026-06-06 production deployment proof noted separately.

| Field | Value |
| --- | --- |
| Vercel project | `archestimator` |
| Project id | `prj_QTjX1WrMb7b0ZxmMIRAL96ILRY9E` |
| Account/team | `team_eRuwqQwhMbYYDmvgIgpQW1GS` / `philipjonlewis-projects` |
| Framework | Next.js |
| Node version | `24.x` |
| Baseline production deployment for initial public-route and Speed Insights window proof | `dpl_4bMoArwC32Tup4dKK67wtKoBf2jv` |
| Baseline deployment URL | `archestimator-lz829v0ad-philipjonlewis-projects.vercel.app` |
| Current production deployment after 2026-06-06 post-fix proof | `dpl_3F9cagsB27x8iuEjYQ5nkCCfqecR` |
| Current production URL after 2026-06-06 post-fix proof | `archestimator-6mwjrwhnk-philipjonlewis-projects.vercel.app`, aliased to `www.archestimator.com` |
| Production domains | `www.archestimator.com`, `archestimator.com`, `archestimator.vercel.app` |
| Baseline production commit | `2d9e12d4d8b3f08a6da686bcb06f753474590511` |
| Baseline commit message | `Record shared-link clickthrough proof` |
| Current production proof commit | `207babf` |
| Bundler metadata | `turbopack` |
| Runtime metadata | `{"nodejs":2}` |

## Captured hosted public header/timing evidence

Evidence file:

- `evidence/2026-06-05-hosted-public-header-timing-baseline.md`

Summary from curl on public marketing routes:

| Route | HTTP | Cache header | x-vercel-cache | time_starttransfer | size_download |
| --- | ---: | --- | --- | ---: | ---: |
| `/` | 200 | `private, no-cache, no-store, max-age=0, must-revalidate` | MISS | 0.534s | 133,076 bytes |
| `/features` | 200 | `private, no-cache, no-store, max-age=0, must-revalidate` | MISS | 0.481s | 92,316 bytes |
| `/pricing` | 200 | `private, no-cache, no-store, max-age=0, must-revalidate` | MISS | 0.544s | 64,205 bytes |
| `/contact` | 200 | `private, no-cache, no-store, max-age=0, must-revalidate` | MISS | 0.467s | 55,410 bytes |

Observed headers also preload four font files and the logo image on these public routes.

## Vercel httpstat status

Evidence files:

- `evidence/2026-06-05-vercel-httpstat-attempt.md`
- `evidence/2026-06-05-vercel-httpstat-production-baseline.md`

Status: toolchain attempted but not usable in this environment. Vercel CLI `54.6.1` is installed, but `vercel httpstat` failed in the shell with `env: node: No such file or directory` from the child invocation even when Node’s bin directory was added to `PATH`. Curl timing was used as the safe substitute.

## Speed Insights CLI p75 capture and remaining dashboard/window gap

The original connector/browser attempts did not expose Speed Insights values, but the later Vercel CLI `vercel metrics` surface does expose `vercel.speed_insights_metric.*` p75 metrics. Evidence now exists at:

- `evidence/vercel-speed-insights-cli-2026-06-06/vercel-speed-insights-cli-baseline.md`
- `evidence/vercel-speed-insights-cli-2026-06-06/current-*-overall.json`
- `evidence/vercel-speed-insights-cli-2026-06-06/current-*-route-device.json`

Captured current 7-day provider p75 values:

| Metric | Overall p75 | Worst captured route/device note |
| --- | ---: | --- |
| LCP | 1447ms | `/` desktop 3484ms |
| INP | 59,404,496ms | `/` desktop anomalous 59,404,496ms; `/` mobile 32ms |
| CLS | null | `/` desktop and `/login` desktop 0 |
| FCP | 1380ms | `/` desktop 3216ms |
| TTFB | 299ms | `/` mobile 721ms |

Remaining gaps:

- Dashboard overview score/screenshot and recommendation cards remain unavailable because Computer Use timed out and protected fetch could not create a shareable dashboard URL.
- Previous 7-day and previous-3-day route/device windows returned empty summaries, so Workstream 7.2 still lacks comparable traffic cohorts.
- Final performance-impact proof still requires before/after provider windows after a deployed change; the current CLI capture is a baseline, not a completion claim.

## 2026-06-06 refresh

Additional evidence files:

- `evidence/2026-06-06-pr0a-vercel-connector-and-public-route-timing.md`
- `evidence/2026-06-06-bundle-analyzer-baseline.md`

Current status:

- Deployment context for the baseline public-route/Speed Insights window points to production deployment `dpl_4bMoArwC32Tup4dKK67wtKoBf2jv`; later post-fix cache proof points to production deployment `dpl_3F9cagsB27x8iuEjYQ5nkCCfqecR`.
- Public hosted route timing/header evidence now includes `/about`, `/privacy`, and `/terms` in addition to the earlier public routes.
- Bundle analyzer baseline is captured through a clean webpack analyzer build.
- Speed Insights p75 metrics are captured via Vercel CLI; dashboard overview/recommendation cards and comparable prior windows remain open.
