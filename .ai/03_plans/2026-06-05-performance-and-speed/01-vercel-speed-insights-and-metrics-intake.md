<!-- Docs-only performance planning pack. Created 2026-06-05. No application code implementation in this folder. -->


# Vercel Speed Insights and Metrics Intake

## Current provider evidence

The Vercel connector returned:

| Field | Value |
| --- | --- |
| Team slug | `philipjonlewis-projects` |
| Project | `archestimator` |
| Project id | `prj_QTjX1WrMb7b0ZxmMIRAL96ILRY9E` |
| Framework | `nextjs` |
| Node version | `24.x` |
| Latest production deployment | `dpl_4bMoArwC32Tup4dKK67wtKoBf2jv` |
| Latest production URL | `archestimator-lz829v0ad-philipjonlewis-projects.vercel.app` |
| Latest commit message | `Record shared-link clickthrough proof` |
| Bundler metadata | `turbopack` |
| Domains | `www.archestimator.com`, `archestimator.com`, `archestimator.vercel.app`, Vercel preview aliases |

## Live Speed Insights UI capture status

- Requested URL: `https://vercel.com/philipjonlewis-projects/archestimator/speed-insights`.
- Computer Use attempts:
  - `Google Chrome` app state: timed out after 120s.
  - `com.google.Chrome` app state: timed out after 120s.
- Computer Use dashboard capture still times out, but `vercel metrics` now provides provider-side Speed Insights p75 metric values and route/device breakdown.
- The dashboard overview score/screenshot remains unavailable; provider CLI p75 values are the measured numeric baseline.


## Captured Vercel project/deployment context — 2026-06-05

See `28-captured-baseline-and-remaining-provider-gap.md` for verified Vercel project/deployment context, public hosted header/timing evidence, and the later Vercel CLI p75 capture. Dashboard overview score/screenshot remains unavailable, but the numeric Speed Insights p75 baseline is now captured via `vercel metrics`.

## PR-0A substitute evidence refresh — 2026-06-06

Evidence: `evidence/2026-06-06-pr0a-vercel-connector-and-public-route-timing.md`.

- Read-only Vercel connector refresh confirmed latest production deployment `dpl_4bMoArwC32Tup4dKK67wtKoBf2jv`, created `2026-06-04T18:04:02.727Z`, at commit `2d9e12d4d8b3f08a6da686bcb06f753474590511`.
- Hosted public-route curl timing/header refresh covered `/`, `/about`, `/features`, `/pricing`, `/contact`, `/privacy`, and `/terms`.
- All checked public routes still returned `private, no-cache, no-store, max-age=0, must-revalidate` and `x-vercel-cache: MISS`.
- This is **not** Speed Insights/Core Web Vitals proof by itself. The later Vercel CLI capture below supplies provider p75 values; dashboard overview score/screenshot remains unavailable.


## Speed Insights Chrome retry — 2026-06-06

Evidence: `evidence/2026-06-06-speed-insights-chrome-retry.md`. Computer Use `get_app_state` for `Google Chrome` timed out after 120s again, so visual dashboard overview/recommendation cards remain unavailable; numeric p75 values were captured later via CLI.


## Speed Insights provider access retry — 2026-06-06

Evidence: `evidence/2026-06-06-speed-insights-provider-access-retry.md`.

- Vercel connector refreshed team/project/deployment context but did not expose Speed Insights p75 dashboard/export metrics.
- Vercel documentation search surfaced Speed Insights ingestion/drain/package references, not a dashboard p75 read API for this session.
- Vercel protected fetch helper returned `Unable to create shareable URL` for the Speed Insights dashboard.
- Computer Use `Google Chrome` state capture timed out after 120s again.
- Previous connector/fetch/browser surfaces did not expose metrics, but the later `vercel metrics` CLI capture below now provides provider p75 Core Web Vitals values. Dashboard overview score/screenshot remains unavailable.

## Captured baseline record

Status: **provider p75 metrics captured via Vercel CLI / comparable prior window open**.

| Field | Value | Evidence file/link | Notes |
| --- | --- | --- | --- |
| Capture date/time | 2026-06-06 CLI capture | `evidence/vercel-speed-insights-cli-2026-06-06/vercel-speed-insights-cli-baseline.md` | read-only `vercel metrics` queries |
| Vercel project/deployment | `dpl_4bMoArwC32Tup4dKK67wtKoBf2jv` / `2d9e12d4d8b3f08a6da686bcb06f753474590511` | `evidence/2026-06-06-pr0a-vercel-connector-and-public-route-timing.md` | deployment context captured |
| Time window | `2026-05-30T00:00:00.000Z` → `2026-06-06T04:00:00.000Z` | `current-*-overall.json`, `current-*-route-device.json` | current 7-day provider window |
| Device split | desktop + mobile route/device p75 | `current-*-route-device.json` | `route`, `device_type` dimensions |
| Worst route bucket | public landing `/` desktop | `vercel-speed-insights-cli-baseline.md` | highest LCP/FCP outlier; anomalous INP outlier |
| Worst metric | INP anomaly on `/` desktop; LCP/FCP also public desktop | `current-inp-route-device.json`, `current-lcp-route-device.json`, `current-fcp-route-device.json` | INP value requires conservative interpretation |
| Overall score | dashboard-only/unavailable |  | CLI exposes p75 metrics, not dashboard overview score |
| p75 LCP | 1447ms overall; `/` desktop 3484ms; `/` mobile 1447ms | `current-lcp-overall.json`, `current-lcp-route-device.json` | provider CLI p75 |
| p75 INP | 59,404,496ms overall; `/` desktop 59,404,496ms; `/` mobile 32ms | `current-inp-overall.json`, `current-inp-route-device.json` | anomalous desktop value preserved in raw JSON |
| p75 CLS | overall null; `/` desktop 0; `/login` desktop 0 | `current-cls-overall.json`, `current-cls-route-device.json` | provider CLI p75 |
| p75 FCP | 1380ms overall; `/` desktop 3216ms; `/` mobile 1380ms | `current-fcp-overall.json`, `current-fcp-route-device.json` | provider CLI p75 |
| p75 TTFB | 299ms overall; `/` mobile 721ms; `/` desktop 257ms | `current-ttfb_ms-overall.json`, `current-ttfb_ms-route-device.json` | provider CLI p75 |

## Top bottleneck selection decision

After filling the baseline record, choose exactly one initial bottleneck path:

| Selected? | Bottleneck path | Next document |
| --- | --- | --- |
| [ ] | Public LCP/INP/TTFB | `11-performance-hypothesis-scorecard.md` H1-H4, then Blueprint A |
| [ ] | Protected/workshop TTFB | H6, then Blueprint B/C |
| [ ] | Estimate workspace INP | H5, then Blueprint D |
| [ ] | Share/API TTFB | H7, then Blueprint E |
| [ ] | Proposal export latency | H8, then Blueprint F |
| [ ] | Observability gap/no route data | `20-telemetry-privacy-decision-record.md` before optimization |

If no box can be selected, implementation is blocked.

## Metrics that must be captured before implementation

Fill this table from Vercel Speed Insights before code changes:

| Metric | Current p75 | Target p75 | Worst route/path | Device | Time window | Notes |
| --- | ---: | ---: | --- | --- | --- | --- |
| Overall score | dashboard-unavailable | improve by >= 20 points or reach Vercel good threshold | dashboard-unavailable | mobile + desktop | dashboard-dependent | CLI exposes p75 metrics, not overview score |
| LCP | 1447ms overall | <= 2.5s | `/` 3484ms | desktop | 2026-05-30 → 2026-06-06 | provider CLI p75 route/device captured |
| INP | 59,404,496ms overall | <= 200ms | `/` 59,404,496ms | desktop | 2026-05-30 → 2026-06-06 | anomalous provider value; `/` mobile is 32ms |
| CLS | null overall | <= 0.1 | `/` and `/login` 0 | desktop | 2026-05-30 → 2026-06-06 | null overall but route/device p75 values captured |
| FCP | 1380ms overall | <= 1.8s | `/` 3216ms | desktop | 2026-05-30 → 2026-06-06 | provider CLI p75 route/device captured |
| TTFB | 299ms overall | <= 800ms for dynamic routes; lower for static marketing | `/` 721ms | mobile | 2026-05-30 → 2026-06-06 | provider CLI p75 route/device captured |

## Route buckets to tag in Speed Insights

| Bucket | Candidate paths | Why it matters |
| --- | --- | --- |
| Public landing | `/`, `/features`, `/pricing`, `/about`, `/contact` | LCP/INP may be affected by fonts, animation, smooth scroll, canvas, analytics, and marketing sections. |
| Auth entry | `/login`, `/auth/callback`, `/invite/[token]` | Must not weaken beta auth; TTFB and redirect timing matter. |
| Protected workshop | `/workshop`, `/workshop/projects`, `/workshop/projects/[projectId]` | Proxy auth + Supabase queries + client dashboard costs. |
| Estimate workspace | `/workshop/projects/[projectId]/estimates/[nodeId]` | Largest client island and tree/table interaction risk. |
| Public share | `/share/[token]`, `/api/share/[token]/*` | Dynamic/no-store security, public recipient UX, activity polling. |
| Proposal export | `/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx` | Node runtime ExcelJS work; latency and memory, not Core Web Vitals directly. |

## Instrumentation decision gate

Current code intentionally has Web Analytics but not Speed Insights:

- `@vercel/analytics` is present and used through `src/components/analytics/VercelWebAnalytics.tsx:1-8`.
- `@vercel/speed-insights` is absent and tested absent in `tests/vitest/vercel-web-analytics-integration.test.ts:24-30`.

Before adding Speed Insights instrumentation, decide one of these paths:

1. **Dashboard-only path:** keep current privacy posture; use Vercel dashboard data already available for the project.
2. **Explicit Speed Insights package path:** add `@vercel/speed-insights` and a privacy/redaction test plan, then update the existing test that currently asserts absence.
3. **Drain/export path:** use Vercel Speed Insights drains/reference data if account plan supports it, so route/path metrics can be analyzed without adding client code.

## Exact evidence capture checklist

- [ ] Screenshot Speed Insights overview with date/time and deployment context.
- [x] Screenshot or export metric breakdown by LCP, INP, CLS, FCP, TTFB. 2026-06-06: captured via `vercel metrics` raw JSON.
- [x] Capture top failing route/path list. 2026-06-06: `/` desktop is the LCP/FCP and anomalous INP outlier in CLI output.
- [x] Capture mobile vs desktop split. 2026-06-06: captured via `device_type` dimension.
- [ ] Capture last 7 days and last 30 days. 2026-06-06: current 7-day captured; previous 7-day/3-day comparison windows returned empty summaries, and 30-day comparable data remains unavailable.
- [x] Note whether latest production deployment `dpl_4bMoArwC32Tup4dKK67wtKoBf2jv` is inside the selected window. 2026-06-06: selected window ends 2026-06-06T04:00:00Z and includes the 2026-06-04 production deployment.
- [ ] Attach any Vercel recommendation cards to this folder as evidence files or short summaries.
