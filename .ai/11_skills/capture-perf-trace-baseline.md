---
status: active
last_updated: 2026-07-05
plan_reference: .ai/09_archive/store/2026-07-05-Performance-Optimization/02_IMPLEMENTATION_PLAN.md
work_package: WP-P4-02
---

# Capture PERF_TRACE baseline

> **Use when:** you need to measure D1 round-trip count or server-action waterfall depth on a specific route. Required by Phase 2 WP-P2-01 before any Promise.all refactor work.

PERF_TRACE is the repo's dormant perf instrumentation. It's live in source (`src/lib/perf/server-timing.ts`) but only emits when `PERF_TRACE=1` is set in the request environment. This skill walks through capturing a baseline.

## Prerequisites

- `bun install` is up to date
- The Cloudflare preview environment is configured (`.env` has the required `AUTH_SECRET`, `BETTER_AUTH_*`, D1 bindings) OR you have a valid authenticated session for the route under test
- The PERF_TRACE scripts exist: `scripts/measure-workshop-dashboard-query-count.ts` and friends

## Steps

### 1. Start the OpenNext preview with PERF_TRACE=1

```bash
PERF_TRACE=1 bun run cf:preview
```

This builds the OpenNext-for-Cloudflare bundle and starts `wrangler preview`. Wait for the "Ready" log line. The Worker listens on http://localhost:8787 by default.

### 2. Drive the route under test with Playwright

For an authenticated route (`/workshop`), use an authenticated Playwright session:

```bash
# Set env vars for the test session
export PERF_TRACE=1
export PERF_TRACE_OUTPUT_DIR=.ai/03_plans/<plan-slug>/_evidence/phase-2/<route-slug>-<YYYYMMDD>/
mkdir -p "$PERF_TRACE_OUTPUT_DIR"

# Run an existing Playwright spec that hits the route
bun run test:e2e -- e2e/authenticated-route-smoke.spec.ts
```

Or use a one-off Playwright script:

```ts
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://localhost:8787/login");
// log in via the test-id flow, then:
await page.goto("http://localhost:8787/workshop");
await page.waitForLoadState("networkidle");
const trace = await page.evaluate(() => (window as any).__PERF_TRACE__);
console.log(JSON.stringify(trace, null, 2));
await browser.close();
```

### 3. Capture the trace

PERF_TRACE writes to the response `Server-Timing` header AND to a `window.__PERF_TRACE__` global if `NEXT_PUBLIC_PERF_TRACE=1` is also set. Use either:

```bash
# Capture Server-Timing from curl
curl -sI -H "Cookie: $AUTH_COOKIE" http://localhost:8787/workshop | grep -i 'server-timing'

# Capture the client-side global via Playwright (above)
```

Save the raw output to `_evidence/phase-2/<route-slug>-<YYYYMMDD>/raw-trace.json`.

### 4. Run the per-surface analyzer

For the workshop dashboard:

```bash
bun run perf:dashboard-query-count PERF_TRACE_INPUT=_evidence/phase-2/<route-slug>-<YYYYMMDD>/raw-trace.json
```

This produces a structured report listing every D1 query, its round-trip count, and total wall-clock time. Save the report next to the raw trace.

### 5. Commit the baseline

Add both files to the plan's evidence directory. Update the plan README §6 readiness status to reflect that the baseline is captured.

## What to look for

- **D1 round-trip count per render** — target ≤ 6 for the workshop dashboard (per README §2). The plan's standing hypothesis is that the N+1 authz loop dominated this number; verify with the post-fix baseline.
- **Sequential `await` chains** — these are the Promise.all opportunities flagged by WP-P2-02. Each sequential chain of independent D1 calls is a candidate.
- **Slowest query** — the longest single D1 round-trip in the trace. If one query dominates, an index or projection optimization may help more than a Promise.all refactor.

## Common pitfalls

- **PERF_TRACE without NEXT_PUBLIC_PERF_TRACE** — server-side trace is emitted but the client-side global is undefined. Set both for full coverage.
- **Unauthenticated session** — the trace shows the unauthenticated redirect, not the route's actual queries. Always log in first.
- **Stale fixture data** — the trace is only meaningful against realistic data volumes. Use `bun run perf:seed-fixture` to seed a 100-row estimate before measuring the estimate editor.
- **Cold-start noise** — the first request after `bun run cf:preview` includes Worker initialization. Discard the first trace and use the second.

## Cross-references

- Plan (archived): `.ai/09_archive/store/2026-07-05-Performance-Optimization/02_IMPLEMENTATION_PLAN.md` WP-P2-01
- Existing scripts: `scripts/measure-workshop-dashboard-query-count.ts`, `scripts/measure-route-transitions.ts`, `scripts/measure-library-performance-baseline.ts`
- Server-timing source: `src/lib/perf/server-timing.ts`
- Web vitals probe: `src/components/workshop/WebVitalsProbe.tsx`
