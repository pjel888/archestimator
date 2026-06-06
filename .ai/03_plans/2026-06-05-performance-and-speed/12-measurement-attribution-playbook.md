<!-- Docs-only performance planning pack. Added 2026-06-05. No application code implementation in this folder. -->

# Measurement and Attribution Playbook

This playbook turns the performance plan into proof. Every future optimization needs before/after evidence from the same route bucket, similar traffic/window, and a named hypothesis from `11-performance-hypothesis-scorecard.md`.

## Evidence ladder

| Level | Evidence | Use when | Completion power |
| --- | --- | --- | --- |
| L0 | Static repo evidence and graph/blast-radius analysis | Choosing what to measure | Directional only; never enough for completion. |
| L1 | Local bundle/build/test evidence | Proving a code path or dependency changed | Good for local implementation proof. |
| L2 | Local browser trace / Lighthouse / Playwright route timing | Proving user-visible behavior under controlled setup | Good for PR validation. |
| L3 | Preview/production request timing via Vercel (`httpstat`, headers, logs) | Proving hosted TTFB/cache/function behavior | Required for hosted latency claims. |
| L4 | Vercel Speed Insights route/device p75 over a comparable window | Proving real-user Core Web Vitals impact | Required for `COMPLETE` performance claims. |

## Required baseline package

Before any code optimization PR, create an evidence bundle under:

```text
.ai/03_plans/2026-06-05-performance-and-speed/evidence/YYYY-MM-DD-<hypothesis>-baseline/
```

Include:

1. **Vercel Speed Insights**
   - overall score
   - p75 LCP, INP, CLS, FCP, TTFB
   - device split
   - route/path breakdown
   - time window
   - latest production deployment id/commit matched to the metric window
2. **Hosted route timing**
   - `vercel httpstat` or equivalent timing for the target route(s)
   - response headers including `Cache-Control`, `CDN-Cache-Control`, `Vercel-CDN-Cache-Control`, and `x-vercel-cache` when relevant
3. **Local/browser trace**
   - Lighthouse mobile JSON/HTML or Chrome trace
   - Playwright trace for route transitions when authenticated flows are involved
4. **Bundle attribution**
   - `ANALYZE=true bun run build`
   - route chunk/first-load JS notes
   - large dependency list and whether the dependency is global or route-local
5. **Surface-specific proof**
   - React Profiler for estimate workspace INP/render work
   - Supabase EXPLAIN/provider logs for query work
   - export benchmark for proposal XLSX work

## Command checklist

Run only the commands relevant to the target surface.

```bash
# General repo safety
bun run type-check
bun run lint
bun run lint:design-system
bun run test
bun run test:dom

# Existing performance harnesses
bun run test:e2e:perf
bun run perf:measure-routes
bun run perf:check-routes
bun run perf:profile-peak-load

# Bundle attribution
ANALYZE=true bun run build

# Hosted/export verification when credentials/env are available
bun run launch:verify-hosted-auth
bun run launch:verify-hosted-export

# Vercel-hosted timing examples; use exact production/preview URL and target route
vercel httpstat https://www.archestimator.com/
vercel httpstat https://www.archestimator.com/features
curl -I https://www.archestimator.com/
curl -I https://www.archestimator.com/share/<redacted-token>
```

Do not paste raw share/invite tokens into docs. Use redacted route labels.

## Route timing matrix

| Bucket | Minimum routes | Required metrics | Required local proof | Required hosted proof |
| --- | --- | --- | --- | --- |
| Public marketing | `/`, `/features`, `/pricing`, `/contact` | LCP, INP, CLS, TTFB, first-load JS | Lighthouse mobile, bundle analyzer, consent off/on trace | Speed Insights route p75, `httpstat`, cache headers |
| Auth/proxy | `/login`, `/workshop`, protected redirect path | TTFB, redirect time, auth correctness | auth proxy tests, hosted auth verifier | `httpstat`, redirect headers, no cache leak |
| Workshop shell | `/workshop`, `/workshop/projects`, library/templates | route transition, TTFB, query count | Playwright perf, route-transition scripts | hosted route timing if auth fixture available |
| Estimate workspace | estimate node/sheet route | INP, render duration, heap, route transition | React Profiler, `perf:profile-peak-load`, DOM tests | Speed Insights if route has enough traffic |
| Public share | `/share/<redacted>` and activity/comment APIs | TTFB, API latency, security headers | publication tests, API harness | `httpstat`, no-store/header proof |
| Proposal export | XLSX route | latency, memory, success/error shape | workbook benchmark, route test | hosted export verifier |


## Additional route/export/query commands from second-pass repo audit

Use these when the selected hypothesis involves authenticated route transitions, share cold-load, proposal export, or DB query work. Adjust ports, tokens, cookies, and output paths safely; never commit raw secrets or tokens.

```bash
# Authenticated production-like route transitions
BASE_URL=http://127.0.0.1:3064 \
PLAYWRIGHT_STORAGE_STATE=/tmp/archestimator-auth.json \
INCLUDE_AUTHENTICATED=1 RUNS=5 NETWORK_PROFILE="No throttle" \
OUTPUT_FILE=.ai/03_plans/2026-06-05-performance-and-speed/evidence/YYYY-MM-DD-route-transition-auth.json \
bun run perf:measure-routes

# Check a route-transition benchmark artifact
ROUTE_TRANSITION_BENCHMARK_FILE=.ai/03_plans/2026-06-05-performance-and-speed/evidence/YYYY-MM-DD-route-transition-auth.json \
bun run perf:check-routes

# Bundle analyzer; if Turbopack output does not produce analyzer artifacts, force webpack for attribution
ANALYZE=true bun run build
ANALYZE=true bunx next build --webpack

# Redacted share receiver Lighthouse/FMP evidence
npx lighthouse http://127.0.0.1:3064/share/<redacted-token> \
  --preset=desktop \
  --output=json \
  --output-path=.ai/03_plans/2026-06-05-performance-and-speed/evidence/YYYY-MM-DD-share-lighthouse.json

# Proposal workbook local scale benchmark
PROPOSAL_WORKBOOK_BENCHMARK_ROWS=100,500,1000,2500 \
OUTPUT_FILE=.ai/03_plans/2026-06-05-performance-and-speed/evidence/YYYY-MM-DD-proposal-workbook-benchmark.json \
bun run scripts/benchmark-proposal-workbook.ts

# Hosted export route smoke; values must come from a safe fixture, not docs
HOSTED_EXPORT_BASE_URL=https://example.com \
HOSTED_EXPORT_PROJECT_ID=$PROJECT_ID \
HOSTED_EXPORT_ESTIMATE_ID=$ESTIMATE_ID \
HOSTED_EXPORT_AUTH_COOKIE="$COOKIE" \
OUTPUT_FILE=.ai/03_plans/2026-06-05-performance-and-speed/evidence/YYYY-MM-DD-hosted-export.json \
bun run launch:verify-hosted-export
```

Database/query work must follow the linked database-indexing plan: production `EXPLAIN` is acceptable for planning; `EXPLAIN (ANALYZE, BUFFERS)` belongs in staging or a safe representative environment unless the owner explicitly approves production analysis.

## Before/after comparison rules

- Use the same route, device class, throttling profile, and auth fixture.
- For local/browser traces, take at least three runs and compare median plus worst outlier.
- For Speed Insights, compare p75 for the same route bucket and device class over a comparable window.
- If production traffic is too low, mark provider proof as `PROVIDER PROOF OPEN` and keep local evidence separate.
- Do not call a change successful if it merely shifts cost from one critical route to another.

## Official-doc anchors used by this playbook

- Next.js 16 docs: `cacheComponents` enables the Partial Prerendering model in Next 16; dynamic components should be isolated with Suspense when static shell can be served early.
- Next.js docs: App Router `useReportWebVitals` should live in a separate client component to confine the client boundary; custom metrics include hydration, route-change-to-render, and render timing.
- Next.js docs: `@next/bundle-analyzer` can be enabled with `ANALYZE=true` to attribute bundle size.
- Vercel docs: Speed Insights reports Core Web Vitals from real-user data and dashboard route/device breakdown; CDN cache and `x-vercel-cache` headers are the hosted proof for cache behavior.
- React docs: memoization should be measured; React Compiler can handle many memoization cases, while `useMemo`/`useCallback` remain escape hatches where identity control matters.
