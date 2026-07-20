# 10 — Blocked Evidence and Authorization Needed

Each blocked item names the gate, the exact command/prerequisite, the expected output, and the decision it would unlock. Per AGENTS.md, the user controls test/browser/build gates; hosted credentials are out of scope without explicit approval.

## Build gate (AGENTS.md: "Do not create, expand, repair, or run automated tests, test suites, builds as test gates...")

| # | Blocked evidence | Exact command | Expected output | Decision unlocked |
|---|---|---|---|---|
| B-1 | Production Next build time + peak memory | `/usr/bin/time -v bun run build` | wall time, peak RSS, exit 0, `.next/BUILD_ID` written | baseline for build-budget gate (W4) |
| B-2 | OpenNext Cloudflare build time + output sizes | `/usr/bin/time -v bun run cf:build` | wall time, peak RSS, `.open-next/worker.js` updated, server-functions bundle size | Wave 0 bundle baseline; Worker bundle size |
| B-3 | Bundle treemap (route-by-route) | `ANALYZE=true bunx next build --webpack` | treemap HTML; per-route gzip byte counts under `artifacts/bundles/` | Validates PERF-FE-002 (AppProviders split), PERF-DOC-001, PERF-DOC-002; gates W4-1 |
| B-4 | `.open-next/` artifact freshness | (consequence of B-2) | mtime of `.open-next/worker.js` ≥ audit date | Confirms bundle claims reflect current HEAD |

## Test gate (AGENTS.md: user-controlled test authorization)

| # | Blocked evidence | Exact command | Expected output | Decision unlocked |
|---|---|---|---|---|
| B-5 | Unit tests (`bun test tests/unit`) | `bun test tests/unit` | pass/fail count; exit 0 | characterization baseline for refactors (Plan 025, 026) |
| B-6 | DOM tests (vitest) | `bun run test:dom` | pass/fail; exit 0 | same |
| B-7 | Peak-load profile | `bun run perf:profile-peak-load` | commit durations; rendered-component counts | React Profiler baseline (W0-7) |
| B-8 | Library baseline | `bun run perf:library-baseline` | p50/p95 read/render times | Validates 1,000-item library budget |
| B-9 | Route-transition Playwright | `bun run test:e2e:perf` | per-route transition medians | validates workshop transition budget |

## Browser gate (AGENTS.md: browser/visual QA is user-gated)

| # | Blocked evidence | Exact command | Expected output | Decision unlocked |
|---|---|---|---|---|
| B-10 | Public marketing LCP/CLS/INP (Lighthouse) | `npx lighthouse https://archestimator.com --output json --output-path artifacts/profiles/public-lighthouse.json` (or local prod: `next start` first) | LCP, CLS, INP, FCP, TTFB, JS bytes | Ratifies public budgets; validates PERF-OBS-001 improvement |
| B-11 | Estimate editor rapid-typing React Profiler | manual DevTools: mount EstimateSheetContent, type in a cell, capture Profiler | commit durations; `reportEstimateRowItemRender` probe counts | Validates PERF-FE-001 before/after |
| B-12 | Scroll FPS in virtualized sheet | manual DevTools Performance trace while scrolling | FPS, long tasks | Validates PERF-FE-001 |
| B-13 | Restore after delete latency | manual: delete row → undo → restore; measure | end-to-end latency | Validates PERF-D1-001 |
| B-14 | 50-recipient publish latency | manual: publish with 50 recipients; observe UI stall | request latency | Validates PERF-PUB-001 before/after |
| B-15 | Multi-row select-all + bulk delete | manual | comparator walk time | Confirms PERF-FE-002 sub-concern |
| B-16 | bfcache `pageshow.persisted` proof | manual DevTools on a two-page control | persisted=true on back/forward | Required by `27-...md:11` (existing blocker) |
| B-17 | Production Chrome React Profiler proof | manual | profiler export | Same |

## Hosted-credentials gate (Cloudflare account access)

| # | Blocked evidence | Exact command | Expected output | Decision unlocked |
|---|---|---|---|---|
| B-18 | Hosted route performance | `bun run cf:verify-hosted-performance` | route TTFB p50/p95 | Validates hosted performance claims |
| B-19 | Hosted D1 runtime proof (existing synthetic) | `bun run cf:d1-runtime-proof` | query-count + p95 on 5 synthetic surfaces | K-09 proof boundary |
| B-20 | Hosted D1 EXPLAIN campaign (6 queries) | `wrangler d1 execute ARCH_DB --remote --command "EXPLAIN QUERY PLAN SELECT ..."` per candidate | query plans under `artifacts/query-plans/` | W0-6; confirms index coverage; catches full scans |
| B-21 | Hosted D1 query count per route | extend `cf:d1-runtime-proof` to authenticated workshop surfaces + representative fixtures | per-route statement count | W0-5; converts PERF-AUTH-001, PERF-D1-001 to MEASURED |
| B-22 | Cloudflare billing data | dashboard or API | actual Worker/D1/DO/R2 spend | Cost baseline |
| B-23 | Wrangler tail on staging during cron | `wrangler tail` while 5-min drain fires | console output, hibernation events | Validates PERF-CRON-001, PERF-CRON-002 |
| B-24 | Hosted collaboration load test (100 connections × 30 fps) | multi-session test rig with WS clients | outbound/s, bufferedAmount, close codes | Validates K-12 ceiling; tunes W1-6 threshold |
| B-25 | Hosted linked-Template fanout proof | seed 50/500 linked instances; trigger version update; observe | convergence time, D1 writes, memory | Validates K-10 at scale (W3-2) |

## Representative-data gate

Required before B-19 through B-25 produce real evidence. The existing `cf:d1-runtime-proof` uses synthetic proof tables (`workspaces`, `projects`, etc.) with formulas like `100000 + (i * 12500)`. To produce **real-Archestimator-shape** evidence, generate fixtures from the scale matrix (§7 of the prompt):

| Tier | Generation command (once authorized) |
|---|---|
| Small (5 projects × 20 estimates × 100 rows) | extend `scripts/seed-performance-test-data.ts` (`perf:seed-fixture`) |
| Medium (20 × 200 × 500) | same |
| Large (50 × 1,500 × 3,000) | same |
| Stress (50,000 library items, 100 collaborators) | same + multi-session rig |

Without representative data, hosted proof stays at K-09's boundary: provider plumbing only, not real query/cardinality behavior.

## What this audit completed WITHOUT these gates

The audit produced a complete, evidence-grounded findings register and roadmap using only:
- source reading (3,803-line god component, 3,361-line rows.ts, 783-line propagation code, etc.);
- complexity analysis (N+1, write amplification, missing cleanup);
- configuration analysis (`wrangler.jsonc`, `next.config.ts`, `open-next.config.ts`);
- baseline timing (`type-check` 11.7 s, `lint` 63.2 s with 12 errors);
- drift detection (`git diff 0a2667db9..HEAD`, README vs `.github/workflows/`);
- existing plan reconciliation (33 plans re-checked).

Every STATIC-CONFIRMED finding identifies an exact mechanism. The BLOCKED items above would convert HYPOTHESIS-tagged estimates into MEASURED deltas — they do not block the audit's conclusions about what is wrong.
