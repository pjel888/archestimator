# Release, rollback, and readiness-language audit — 2026-06-06

Status: **LOCAL RELEASE MATRIX CAPTURED / SPEED INSIGHTS WINDOW PROOF OPEN**.

## Purpose

This artifact closes the locally provable parts of Workstream 7 for the PR-0B performance branch: each shipped or explicitly-deferred surface has before/after evidence, focused verification, rollback guidance, and conservative readiness language.

It does **not** close provider proof. Vercel Speed Insights p75 windows, hosted authenticated route timing, Supabase EXPLAIN/provider metrics, and production impact comparison remain open.

## Surface-by-surface release matrix

| Surface | Status language | Evidence | Verification | Rollback / reopen note |
| --- | --- | --- | --- | --- |
| Vercel Speed Insights intake | PROVIDER-OPEN | `evidence/2026-06-06-pr0a-vercel-connector-and-public-route-timing.md` | Vercel connector/read-only timing only | Reopen with dashboard p75 LCP/INP/CLS/FCP/TTFB, route/device split, and window. |
| Bundle analyzer baseline | LOCAL CAPTURED | `evidence/2026-06-06-bundle-analyzer-baseline.md` | `ANALYZE=true bunx next build --webpack` | Re-run analyzer after major route/provider changes. |
| Speed Insights package decision | PROVIDER-ONLY / NO PACKAGE CHANGE | `evidence/2026-06-06-speed-insights-package-decision.md` | `tests/vitest/vercel-web-analytics-integration.test.ts` | Reopen only if product chooses client package and privacy tests are updated intentionally. |
| Public Neat mobile fallback | IMPLEMENTED LOCALLY / PROVIDER PROOF OPEN | `evidence/neat-mobile-fallback-2026-06-06/neat-mobile-fallback-summary.md` | local Lighthouse after-runs and related tests | Revert `NeatWireframeBackground` if hosted traces show no benefit or visual regressions. |
| Non-home Lenis scope | IMPLEMENTED LOCALLY / PROVIDER PROOF OPEN | `evidence/lenis-non-home-scope-2026-06-06/lenis-non-home-scope-summary.md` | local Lighthouse after-runs and navigation guardrails | Restore non-home smooth-scroll provider only if UX requires it and perf budget remains acceptable. |
| Root font audit | IMPLEMENTED LOCALLY / PROVIDER PROOF OPEN | `evidence/public-image-font-lcp-audit-2026-06-06/public-image-font-lcp-summary.md` | local Lighthouse after-runs, build/type checks | Re-add removed root font aliases only with measured route need. |
| Public cache policy | NO CACHE RELAXATION / PERSONALIZATION PROOF OPEN | `evidence/2026-06-06-public-cache-safety-harness.md`, `24-cache-safety-and-public-personalization-matrix.md` | cache-safety tests/harness | Do not loosen `MARKETING_PAGE_CACHE_CONTROL` until personalization and variants are isolated/proven cache-safe. |
| Estimate peak-load baseline | LOCAL CAPTURED / BROWSER PROFILER PROOF OPEN | `evidence/2026-06-06-estimate-peak-load-profile.md` | `bun run perf:profile-peak-load` | Reopen with browser React Profiler/Playwright trace before broad render rewrites. |
| Estimate cursor pressure | IMPLEMENTED LOCALLY / PROVIDER PROOF OPEN | `evidence/2026-06-06-estimate-cursor-broadcast-pressure.md` | `tests/vitest/estimate-cursor-broadcast-throttle.test.ts` plus type/build checks | Remove or tune the 6px same-cell gate if multi-user Realtime proof shows stale cursor UX. |
| Lazy boundary / virtualization | NOT JUSTIFIED FROM LOCAL BASELINE / BROWSER PROFILER PROOF OPEN | `evidence/2026-06-06-estimate-lazy-boundary-virtualization-decision.md` | docs-only decision and prior peak-load profile | Reopen only when profiler identifies a specific modal/sidebar/preview/chart/tree bottleneck. |
| Query inventory | REPO-ONLY CAPTURED / LIVE PROVIDER PROOF OPEN | `evidence/2026-06-06-per-route-query-inventory.md` | `tests/vitest/performance-query-inventory.test.ts` | Re-run after repository or route data-access changes. |
| Query consolidation | CONSOLIDATION NOT JUSTIFIED / LIVE PROVIDER PROOF OPEN | `evidence/2026-06-06-query-consolidation-decision.md` | docs-only decision and local query/share benchmarks | No RPC/index/query consolidation until live EXPLAIN/provider proof exists. |
| Share no-store invariants | LOCAL SECURITY INVARIANT CAPTURED | `evidence/2026-06-06-share-no-store-invariants.md` | `tests/vitest/share-no-store-invariants.test.ts` | Do not cache tokenized share routes without separate security review. |
| Share activity benchmark | LOCAL CAPTURED / HOSTED SUPABASE PROOF OPEN | `evidence/2026-06-06-shared-link-activity-benchmark.md` | `tests/vitest/shared-link-activity-benchmark.test.ts` | Reopen with hosted latency/RLS/EXPLAIN evidence before pagination/RPC/index changes. |
| Proposal workbook/export | LOCAL BENCHMARK + HOSTED HARNESS READY / HOSTED AUTH PROOF OPEN | `evidence/2026-06-06-proposal-workbook-benchmark.md`, `evidence/2026-06-06-hosted-proposal-export-benchmark-readiness.md` | proposal export route/workbook tests and hosted verifier tests | Reopen when a safe authenticated hosted fixture is available; queue/stream only if route exceeds budgets. |

## Readiness-language audit

Current branch language is intentionally conservative:

- local implementation packets use `IMPLEMENTED LOCALLY / PROVIDER PROOF OPEN`;
- local-only baselines use `LOCAL CAPTURED`, `REPO-ONLY CAPTURED`, or `LOCAL BENCHMARK`;
- deferred/no-change decisions use `NOT JUSTIFIED`, `NO CACHE RELAXATION`, or `CONSOLIDATION NOT JUSTIFIED`;
- provider-dependent gates remain explicitly open for Speed Insights, hosted authenticated timings, Supabase EXPLAIN/provider metrics, and production window comparison.

## Remaining Workstream 7 gate

Workstream 7.2 remains open because comparing Speed Insights windows requires the Vercel Speed Insights dashboard/export and enough comparable production traffic. This branch must not claim production Core Web Vitals improvement until that provider evidence is attached.
