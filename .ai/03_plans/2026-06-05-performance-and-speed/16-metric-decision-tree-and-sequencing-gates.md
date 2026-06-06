<!-- Docs-only performance planning pack. Added 2026-06-05. No application code implementation in this folder. -->

# Metric Decision Tree and Sequencing Gates

Use this document after Vercel Speed Insights and local baseline evidence are captured. It prevents the implementation phase from scattering effort across unrelated optimizations.

## Hard gate before implementation

Optimization code work should not claim completion until `01-vercel-speed-insights-and-metrics-intake.md` has a captured baseline and comparable proof plan for:

- overall score if dashboard UI is available,
- p75 LCP,
- p75 INP,
- p75 CLS,
- p75 FCP,
- p75 TTFB,
- route/path breakdown,
- device split,
- time window,
- production deployment id/commit.

If dashboard UI cannot provide a route/device breakdown, use the Vercel CLI `vercel metrics` route/device p75 data as the provider baseline and keep dashboard overview/recommendation cards as optional/manual evidence. If neither dashboard nor CLI can provide route/device data, the first slice is observability/attribution.

## Metric-to-workstream decision tree

| If the worst signal is... | And the worst route bucket is... | Start with | Do not start with | Required proof before code |
| --- | --- | --- | --- | --- |
| LCP high | public marketing | Scorecard H1/H3/H4; Blueprint A | data/index work, estimate refactors | Lighthouse mobile, bundle analyzer, Speed Insights route/device p75 |
| LCP high | share page | Blueprint E | marketing cache/provider split | redacted share `httpstat`, no-store headers, share snapshot load timing |
| LCP high | protected/workshop | Blueprint C/D | landing animation work | auth route timing, route transition baseline, query inventory |
| INP high | public marketing | H1/H3; Blueprint A | database/index work | Chrome long-task trace, consent off/on, bundle analyzer |
| INP high | estimate workspace | H5; Blueprint D | public cache/header work | React Profiler with large fixture, `perf:profile-peak-load` |
| TTFB high | public marketing | H2; Blueprint A | component memoization | `httpstat`, cache headers, `x-vercel-cache`, Speed Insights route TTFB |
| TTFB high | protected/workshop | H6; Blueprint B/C | marketing canvas work | hosted timing, auth verifier, query inventory, Supabase EXPLAIN |
| TTFB high | share/API | H7; Blueprint E | CDN cache for token routes | route/API timing, no-store proof, publication tests |
| CLS high | any page | image/font/layout audit in the specific route blueprint | query/caching work | Lighthouse element diagnostics, screenshots |
| FCP high with low TTFB | bundle/font/script attribution | H1/H3/H4/H10 | proxy/query work | bundle analyzer, network waterfall |
| Export latency/timeouts | XLSX route | H8; Blueprint F | public CWV work | workbook benchmark and hosted export verifier |

## Sequencing gates

- **Gate 0 — Baseline selected:** One route bucket and one primary metric are selected from provider/local evidence.
- **Gate 1 — Hypothesis selected:** One scorecard row is chosen and documented.
- **Gate 2 — Implementation packet complete:** Matching blueprint, acceptance criteria, fixture, tests, rollback, and signoff are listed.
- **Gate 3 — Local proof:** Build/test/trace/profile evidence supports the change.
- **Gate 4 — Hosted proof:** Preview/production request/cache/function evidence supports the change where relevant.
- **Gate 5 — Real-user proof:** Vercel Speed Insights confirms route/device p75 improvement or remains explicitly `PROVIDER PROOF OPEN` due insufficient traffic/window.

## Parallelism rule

Parallel workers may collect evidence for multiple hypotheses, but code implementation must proceed one route bucket / metric hypothesis at a time unless two changes are inseparable and proven by the same measurement.
