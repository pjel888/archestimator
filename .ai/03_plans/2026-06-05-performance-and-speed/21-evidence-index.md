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
| EVID-PUBLIC-TRACE-001 | Public Lighthouse/Chrome trace | `evidence/YYYY-MM-DD-public-lighthouse-mobile-before.*` | open | consent off/on if analytics enabled. |
| EVID-HTTP-001 | Hosted timing/cache headers | `evidence/2026-06-05-hosted-public-header-timing-baseline.md` | captured | public route `curl -I` and timing captured; `x-vercel-cache: MISS`. |
| EVID-CACHE-PR0B-001 | Public personalization/cache-safety harness | `evidence/2026-06-06-public-cache-safety-harness.md` | captured | PR-0B harness covered `/`, `/about`, `/features`, `/pricing`, `/contact`, `/privacy`, `/terms`; all remain incompatible with broad shared HTML cache today because hosted headers are private/no-store/no-cache, `/` body varies under consent/A-B scenarios, and logged-in CTA output is source-proven to vary. |
| EVID-HTTPSTAT-001 | Vercel httpstat tool attempt | `evidence/2026-06-05-vercel-httpstat-attempt.md`, `evidence/2026-06-05-vercel-httpstat-production-baseline.md` | blocked | CLI available but child invocation could not find node; curl timing used as substitute. |
| EVID-COMPUTER-001 | Computer Use Speed Insights attempts | `evidence/2026-06-05-computer-use-speed-insights-attempt.md`, `evidence/2026-06-06-speed-insights-chrome-retry.md` | blocked | Google Chrome state capture timed out after 120s on both attempts; dashboard metrics remain UI/provider gap. |
| EVID-AUTH-001 | Auth/proxy hosted proof | `evidence/YYYY-MM-DD-auth-hosted-before.md` | open | requires safe auth fixture. |
| EVID-ESTIMATE-001 | Large estimate profiler | `evidence/YYYY-MM-DD-estimate-profiler-before.*` | open | requires fixture spec. |
| EVID-QUERY-001 | Supabase EXPLAIN/query inventory | `evidence/YYYY-MM-DD-query-inventory-before.md` | open | no unrelated provider projects. |
| EVID-SHARE-001 | Redacted share timing/security | `evidence/YYYY-MM-DD-share-redacted-before.md` | open | no raw tokens. |
| EVID-EXPORT-001 | Proposal export benchmark | `evidence/YYYY-MM-DD-proposal-export-benchmark-before.md` | open | representative + near-limit fixtures. |
| EVID-IMAGE-001 | Image/attachment waterfall | `evidence/YYYY-MM-DD-image-attachment-waterfall-before.md` | open | project/component/share media routes; no raw private media. |
| EVID-ROUTE-001 | Authenticated route transition | `evidence/YYYY-MM-DD-route-transition-auth.json` | open | links to existing route-transition plan. |

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
