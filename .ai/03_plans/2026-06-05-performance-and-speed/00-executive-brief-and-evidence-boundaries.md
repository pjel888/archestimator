<!-- Docs-only performance planning pack. Created 2026-06-05. No application code implementation in this folder. -->


# Executive Brief and Evidence Boundaries

## One-line diagnosis

Archestimator likely has a mixed performance problem: root-level client providers/analytics/scripts load broadly, marketing pages include animation/smooth-scroll/canvas effects, protected workshop routes have auth/proxy and Supabase query costs, estimate-sheet surfaces ship large client islands, and share/proposal routes are intentionally dynamic/no-store with heavy data/export behavior.

## Evidence boundaries

### Verified in this planning pass

- Vercel connector confirmed project `archestimator` on team `philipjonlewis-projects`, framework `nextjs`, Node `24.x`, baseline production deployment `dpl_4bMoArwC32Tup4dKK67wtKoBf2jv`, deployment URL `archestimator-lz829v0ad-philipjonlewis-projects.vercel.app`, and domains including `www.archestimator.com` and `archestimator.com`; later owner-authorized production deployment `dpl_3F9cagsB27x8iuEjYQ5nkCCfqecR` now serves the branch for post-fix cache proof.
- Computer Use was attempted against Chrome twice and timed out after 120s each; live Speed Insights UI values were not captured by tool.
- User-reported source of truth for the problem statement: “we are scoring so low” on Vercel Speed Insights.
- Current repo does not include `@vercel/speed-insights` and explicitly tests that `SpeedInsights` remains absent: `tests/vitest/vercel-web-analytics-integration.test.ts:24-30`.
- Root layout imports four Google font families and global CSS for `react-complex-tree` and `lenis`: `src/app/layout.tsx:2-7`, `src/app/layout.tsx:32-33`.
- Root client provider runs React Query, toast, bfcache handler, performance monitor, navigation listener, and route overlay for all routes: `src/app/providers.tsx:1-41`.
- Landing analytics are consent-gated, but GA/Clarity can still affect post-consent INP/LCP: `src/components/landing/LandingAnalyticsLoader.tsx:7-21`, `src/components/landing/ClarityScript.tsx:5-20`.
- Landing includes Lenis smooth scrolling and a Neat canvas/scroll animation path: `src/components/landing/LandingSmoothScrollProvider.tsx:20-41`, `src/components/landing/NeatWireframeBackground.tsx:52-111`.
- Estimate sheet client body is large and state-heavy: `src/components/workshop/EstimateSheetContent.tsx:3239-4071`; full file is 4,071 lines.
- Estimate tree client body is large and DnD/state-heavy: `src/components/workshop/EstimateSheetTree.tsx:219-1575`; full file is 1,576 lines.
- Proposal export is Node/dynamic/no-store and uses ExcelJS: `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts:9-10`, `src/lib/proposal-export/create-proposal-workbook.ts:1`, `src/lib/proposal-export/create-proposal-workbook.ts:383-400`.
- Public share activity API is force-dynamic/no-store and merges multiple Supabase reads before sorting/composing activity: `src/app/api/share/[token]/activity/route.ts:29`, `src/app/api/share/[token]/activity/route.ts:111-263`.
- Existing route-transition performance e2e coverage captures hover-prefetch and transition budgets: `e2e/route-transition-performance.spec.ts:327-449`.
- GitNexus was indexed for this worktree: 12,551 nodes, 22,754 edges, 561 clusters, 300 flows.

### Blocked / not verified in this planning pass

- Speed Insights dashboard overview score/screenshot, recommendation cards, geography, and comparable before/after provider windows remain unavailable. Numeric p75 values, route/device breakdown, and the current 7-day window were later captured via Vercel CLI.
- Live Supabase EXPLAIN, `pg_stat_statements`, and provider advisor proof were later captured; no DB migration is justified from current beta rows.
- Local build/typecheck/test evidence was later captured in the implementation worktree.
- Production Lighthouse/Chrome trace for the `/` desktop Speed Insights outlier was later captured; broader provider/dashboard comparison remains open.

## Planning posture

Use conservative language:

- Say **candidate bottleneck** unless measured by Speed Insights, Lighthouse, trace, bundle analyzer, or database EXPLAIN.
- Say **verified repo risk** when backed by source lines or GitNexus impact.
- Say **provider proof open** for Vercel dashboard metrics and Supabase live query evidence.
- Do not archive prior route-transition performance work as complete until its production/manual evidence gates are satisfied.

## Priority order

1. **Measurement first:** capture Speed Insights p75 values and route/device breakdown.
2. **Bundle attribution:** run bundle analyzer and identify largest first-load/client chunks.
3. **Public/landing LCP + INP:** isolate fonts, canvas, smooth scroll, third-party scripts, and image/render effects.
4. **Protected-route TTFB:** measure proxy/auth/Supabase waterfall without weakening `getUser()` security.
5. **Estimate workspace INP:** reduce render/state cost in `EstimateSheetContent` and `EstimateSheetTree` with profiling gates.
6. **Share/proposal dynamic routes:** preserve no-store/security while reducing redundant reads and heavy export latency.
