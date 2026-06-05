<!-- Docs-only performance planning pack. Added 2026-06-05. No application code implementation in this folder. -->

# Evidence Index

This file is the registry for future baseline and before/after artifacts. Evidence files belong under `evidence/` unless they are too large or provider-only.

## Required baseline evidence records

| Evidence id | Surface | File/link | Status | Notes |
| --- | --- | --- | --- | --- |
| EVID-SI-001 | Speed Insights overview | provider dashboard screenshot/export | open | Must include route/device p75 and time window. |
| EVID-DEPLOY-001 | Vercel deployment context | `28-captured-baseline-and-remaining-provider-gap.md` | captured | deployment id, URL, commit, framework, runtime captured via connector. |
| EVID-PR0A-SUBSTITUTE-001 | PR-0A connector/timing substitute evidence | `evidence/2026-06-06-pr0a-vercel-connector-and-public-route-timing.md` | captured | Vercel connector deployment refresh plus hosted curl timing/header checks; not Core Web Vitals p75 proof. |
| EVID-BUNDLE-001 | Bundle analyzer baseline | `evidence/2026-06-06-bundle-analyzer-baseline.md` | captured | `ANALYZE=true bun run build` completed without reports under Turbopack; `ANALYZE=true bunx next build --webpack` emitted `client.html`, `nodejs.html`, `edge.html` and passed after route export contract repair. |
| EVID-TELEMETRY-PR1A-001 | Telemetry privacy decision | `20-telemetry-privacy-decision-record.md`, `tests/vitest/vercel-web-analytics-integration.test.ts` | captured | PR-1A chose dashboard/provider-only Speed Insights with no package change; provider p75 proof remains open. |
| EVID-PUBLIC-TRACE-001 | Public Lighthouse/Chrome trace | `evidence/public-lighthouse-2026-06-06/public-lighthouse-mobile-baseline.md`, `evidence/public-lighthouse-2026-06-06/public-lighthouse-mobile-summary.json`, `evidence/public-lighthouse-2026-06-06/*-mobile-consent-*.report.{json,html}`, `evidence/public-lighthouse-2026-06-06/*-mobile-consent-*-0.trace.json.gz` | local captured | Local `next start` mobile Lighthouse for `/`, `/features`, `/pricing`, `/contact` with consent off/on; provider p75 and hosted analytics proof remain open. |
| EVID-NEAT-001 | Neat mobile fallback after-trace | `evidence/neat-mobile-fallback-2026-06-06/neat-mobile-fallback-summary.md`, `evidence/neat-mobile-fallback-2026-06-06/home-lighthouse-after-summary.json`, `evidence/neat-mobile-fallback-2026-06-06/home-mobile-consent-*-after.report.{json,html}`, `evidence/neat-mobile-fallback-2026-06-06/home-mobile-consent-*-after-0.trace.json.gz`, `evidence/neat-mobile-fallback-2026-06-06/visual-comparison/*.jpg` | local captured | Local `next start` home mobile after-trace for the Neat static/mobile fallback. TBT improved, visual layout preserved, consent-off LCP/Speed Index mixed; provider p75 and hosted analytics proof remain open. |
| EVID-LENIS-001 | Lenis non-home scope after-trace | `evidence/lenis-non-home-scope-2026-06-06/lenis-non-home-scope-summary.md`, `evidence/lenis-non-home-scope-2026-06-06/lenis-after-summary.json`, `evidence/lenis-non-home-scope-2026-06-06/*-mobile-consent-*-after.report.{json,html}`, `evidence/lenis-non-home-scope-2026-06-06/*-mobile-consent-*-after-0.trace.json.gz` | local captured | Local `next start` mobile after-traces for `/features`, `/pricing`, and `/contact` after removing Lenis from non-home `PublicPageShell`; provider p75 and hosted analytics proof remain open. |
| EVID-HTTP-001 | Hosted timing/cache headers | `evidence/2026-06-05-hosted-public-header-timing-baseline.md` | captured | public route `curl -I` and timing captured; `x-vercel-cache: MISS`. |
| EVID-CACHE-PR0B-001 | Public personalization/cache-safety harness | `evidence/2026-06-06-public-cache-safety-harness.md` | captured | PR-0B harness covered `/`, `/about`, `/features`, `/pricing`, `/contact`, `/privacy`, `/terms`; all remain incompatible with broad shared HTML cache today because hosted headers are private/no-store/no-cache, `/` body varies under consent/A-B scenarios, and logged-in CTA output is source-proven to vary. |
| EVID-HTTPSTAT-001 | Vercel httpstat tool attempt | `evidence/2026-06-05-vercel-httpstat-attempt.md`, `evidence/2026-06-05-vercel-httpstat-production-baseline.md` | blocked | CLI available but child invocation could not find node; curl timing used as substitute. |
| EVID-COMPUTER-001 | Computer Use Speed Insights attempts | `evidence/2026-06-05-computer-use-speed-insights-attempt.md`, `evidence/2026-06-06-speed-insights-chrome-retry.md` | blocked | Google Chrome state capture timed out after 120s on both attempts; dashboard metrics remain UI/provider gap. |
| EVID-AUTH-001 | Auth/proxy hosted proof | `evidence/YYYY-MM-DD-auth-hosted-before.md` | open | requires safe auth fixture. |
| EVID-ESTIMATE-001 | Local estimate peak-load profiler | `evidence/2026-06-06-estimate-peak-load-profile.md`, `evidence/2026-06-06-estimate-peak-load-profile.json` | captured | jsdom profile only: 50 project estimates and 200 estimate rows; browser React Profiler and provider INP proof remain open. |
| EVID-QUERY-001 | Supabase EXPLAIN/query inventory | `evidence/2026-06-06-query-inventory-repo-only.md` | repo-only captured | Local scanner captured 262 query references and 103 migration index statements; live EXPLAIN/provider metrics and per-route payload sizing remain open. |
| EVID-SHARE-001 | Redacted share timing/security | `evidence/YYYY-MM-DD-share-redacted-before.md` | open | no raw tokens. |
| EVID-EXPORT-001 | Proposal export benchmark | `evidence/2026-06-06-proposal-workbook-benchmark.md`, `evidence/2026-06-06-proposal-workbook-benchmark.json` | local captured | Synthetic local workbook benchmark: 500/1000/2500 rows; hosted export route latency/memory proof remains open. |
| EVID-IMAGE-001 | Image/attachment waterfall | `evidence/YYYY-MM-DD-image-attachment-waterfall-before.md` | open | project/component/share media routes; no raw private media. |
| EVID-ROUTE-001 | Route-transition public baseline | `evidence/2026-06-06-route-transition-public-baseline.md`, `evidence/2026-06-06-route-transition-public-baseline.json`, `evidence/2026-06-06-route-transition-public-readiness.json` | captured | `test:e2e:perf` passed 6 with 2 authenticated skips; public `perf:measure-routes` and `perf:check-routes` passed. |
| EVID-ROUTE-AUTH-001 | Authenticated route transition | `evidence/YYYY-MM-DD-route-transition-auth.json` | open | requires safe authenticated fixture/storage state; links to existing route-transition plan. |

## Evidence status values

- `open`: not captured yet.
- `captured`: raw evidence exists.
- `reviewed`: evidence interpreted and linked to a scorecard hypothesis.
- `superseded`: newer evidence replaces it.
- `blocked`: evidence cannot be captured safely; explain substitute.

## Evidence hygiene

- Never commit secrets, raw tokens, session cookies, password values, or personal customer data.
- Prefer markdown summaries plus redacted screenshots/JSON.
- Large trace files can be stored outside git if linked with path and retention note.
- Every future performance PR should update this index.
