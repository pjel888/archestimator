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
- Therefore exact dashboard values are **provider proof open**.
- The plan treats the owner report “scoring so low” as the problem trigger, not as a measured numeric baseline.


## Captured Vercel project/deployment context — 2026-06-05

See `28-captured-baseline-and-remaining-provider-gap.md` for verified Vercel project/deployment context and public hosted header/timing evidence. Exact Speed Insights p75 dashboard metrics remain provider-open because the exposed connector has no Speed Insights metrics endpoint and Computer Use timed out.

## PR-0A substitute evidence refresh — 2026-06-06

Evidence: `evidence/2026-06-06-pr0a-vercel-connector-and-public-route-timing.md`.

- Read-only Vercel connector refresh confirmed latest production deployment `dpl_4bMoArwC32Tup4dKK67wtKoBf2jv`, created `2026-06-04T18:04:02.727Z`, at commit `2d9e12d4d8b3f08a6da686bcb06f753474590511`.
- Hosted public-route curl timing/header refresh covered `/`, `/about`, `/features`, `/pricing`, `/contact`, `/privacy`, and `/terms`.
- All checked public routes still returned `private, no-cache, no-store, max-age=0, must-revalidate` and `x-vercel-cache: MISS`.
- This is **not** Speed Insights/Core Web Vitals proof. The p75 dashboard/export values below remain provider-open.

## Captured baseline record

Status: **open / provider proof required**. Fill this table before implementation.

| Field | Value | Evidence file/link | Notes |
| --- | --- | --- | --- |
| Capture date/time | provider-open for Speed Insights; connector/timing refresh on 2026-06-06 | `evidence/2026-06-06-pr0a-vercel-connector-and-public-route-timing.md` | substitute timing only |
| Vercel project/deployment | `dpl_4bMoArwC32Tup4dKK67wtKoBf2jv` / `2d9e12d4d8b3f08a6da686bcb06f753474590511` | `evidence/2026-06-06-pr0a-vercel-connector-and-public-route-timing.md` | deployment context captured; Speed Insights time-window inclusion still needs dashboard |
| Time window | provider-open |  | use comparable future window |
| Device split | provider-open |  | mobile/desktop p75 required |
| Worst route bucket | provider-open |  | public / protected / estimate / share / export |
| Worst metric | provider-open |  | LCP / INP / CLS / FCP / TTFB |
| Overall score | provider-open |  |  |
| p75 LCP | provider-open |  |  |
| p75 INP | provider-open |  |  |
| p75 CLS | provider-open |  |  |
| p75 FCP | provider-open |  |  |
| p75 TTFB | provider-open |  |  |

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
| Overall score | provider-open | improve by >= 20 points or reach Vercel good threshold | provider-open | mobile + desktop | last 7 and 30 days | capture screenshot |
| LCP | provider-open | <= 2.5s | provider-open | mobile first | same window | route-specific attribution required |
| INP | provider-open | <= 200ms | provider-open | mobile first | same window | likely client JS/render work |
| CLS | provider-open | <= 0.1 | provider-open | mobile + desktop | same window | check fonts/images/skeleton shifts |
| FCP | provider-open | <= 1.8s | provider-open | mobile first | same window | correlate with fonts/scripts |
| TTFB | provider-open | <= 800ms for dynamic routes; lower for static marketing | provider-open | mobile + desktop | same window | correlate with proxy/Supabase/cache |

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
- [ ] Screenshot or export metric breakdown by LCP, INP, CLS, FCP, TTFB.
- [ ] Capture top failing route/path list.
- [ ] Capture mobile vs desktop split.
- [ ] Capture last 7 days and last 30 days.
- [ ] Note whether latest production deployment `dpl_4bMoArwC32Tup4dKK67wtKoBf2jv` is inside the selected window.
- [ ] Attach any Vercel recommendation cards to this folder as evidence files or short summaries.
