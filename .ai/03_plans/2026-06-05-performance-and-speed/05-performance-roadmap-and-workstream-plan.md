<!-- Docs-only performance planning pack. Created 2026-06-05. No application code implementation in this folder. -->


# Performance and Speed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve Archestimator’s Vercel Speed Insights/Core Web Vitals and user-perceived performance without breaking closed-beta auth, estimating workflows, share/publication, proposal export, analytics privacy, or existing performance gates.

**Architecture:** Measurement-first optimization. Each change must be tied to a Speed Insights metric or local/prod trace, scoped to one surface, and protected by focused tests plus before/after evidence.

**Tech Stack:** Next.js 16.2.6, React 19.2.6, Bun, TypeScript, Tailwind v4, Supabase/Postgres, Vercel, Playwright, Vitest, GitNexus.

---


## Required implementation order after the second-pass quality audit

Before future code work, use these docs in this order:

1. Start with `10-quality-verdict-and-gap-audit.md` to understand why the first-pass plan was not enough.
2. Pick the highest-ranked still-valid hypothesis in `11-performance-hypothesis-scorecard.md`.
3. Capture baseline proof using `12-measurement-attribution-playbook.md`.
4. Execute the matching route bucket in `13-route-by-route-optimization-blueprints.md`.
5. Follow PR slicing and rollback rules in `14-safe-implementation-and-rollback-plan.md`.
6. Use `15-ultraqa-doc-quality-gate.md` plus `07-ultraqa-scenario-matrix.md` before claiming readiness.

A future worker must not start with broad refactors, generic memoization, dependency churn, or vague “reduce JS” work. Every implementation slice needs a named hypothesis, before/after proof, surface-specific tests, and conservative provider-proof language.

## File/surface map for future implementation

| Surface | Candidate files | Responsibility |
| --- | --- | --- |
| Metrics and evidence | `e2e/route-transition-performance.spec.ts`, `scripts/measure-route-transitions.ts`, `scripts/check-route-transition-readiness.ts`, new evidence files under this plan folder | Establish before/after route and Core Web Vitals proof. |
| Root shell/provider | `src/app/layout.tsx`, `src/app/providers.tsx`, `src/components/analytics/VercelWebAnalytics.tsx`, `tests/vitest/vercel-web-analytics-integration.test.ts` | Control global fonts, CSS, client providers, analytics privacy. |
| Public landing | `src/app/page.tsx`, `src/components/landing/*`, especially `LandingSmoothScrollProvider.tsx`, `NeatWireframeBackground.tsx`, `LandingAnalyticsLoader.tsx`, `ClarityScript.tsx` | Improve public LCP/INP without breaking marketing UX/consent. |
| Protected auth/proxy | `src/proxy.ts`, `src/lib/auth/closed-beta-access.ts`, auth tests | Improve public fast path and protected-route TTFB without weakening beta auth. |
| Estimate workspace | `src/components/workshop/EstimateSheetContent.tsx`, `EstimateSheetTree.tsx`, hooks under `src/hooks`, estimate tests | Improve INP/render cost on large estimates. |
| Data/query | `src/lib/repositories/workspace-repository.ts`, `component-library-repository.ts`, `project-charts-repository.ts`, Supabase plans | Reduce query fan-out and payload size with EXPLAIN/provider proof. |
| Share/publication | `src/app/share/[token]/page.tsx`, `src/app/api/share/[token]/*`, `src/lib/publication/*`, publication tests | Improve public share latency while preserving no-store/security. |
| Proposal export | `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`, `src/lib/proposal-export/*`, benchmark scripts | Keep heavy XLSX work server-only and benchmark route latency/memory. |

## Workstream 0: Capture baseline evidence

- [ ] **Step 0.1: Capture Vercel Speed Insights dashboard values**
  - Open `https://vercel.com/philipjonlewis-projects/archestimator/speed-insights`.
  - Capture overall score, p75 LCP, INP, CLS, FCP, TTFB, device split, route/path breakdown, and time window.
  - Save screenshots or summarized values into `01-vercel-speed-insights-and-metrics-intake.md`.
  - Expected: the table has numeric values instead of `provider-open`.
  - 2026-06-06 status: still provider-open. Read-only Vercel connector and hosted curl timing substitutes are captured in `evidence/2026-06-06-pr0a-vercel-connector-and-public-route-timing.md`, but they are not p75 Core Web Vitals proof.

- [x] **Step 0.2: Confirm production deployment context**
  - Run or record Vercel connector output for project `archestimator` and latest production deployment.
  - Expected: deployment id, URL, commit, and time window are documented.
  - 2026-06-06 evidence: `dpl_4bMoArwC32Tup4dKK67wtKoBf2jv` / commit `2d9e12d4d8b3f08a6da686bcb06f753474590511` captured in `evidence/2026-06-06-pr0a-vercel-connector-and-public-route-timing.md`.

- [x] **Step 0.3: Run bundle attribution**
  - Command after dependencies are available:
    ```bash
    ANALYZE=true bun run build
    ```
  - Expected: bundle analyzer artifacts identify first-load JS, route chunks, and large dependencies.
  - Evidence: save analyzer screenshots or HTML summaries under a future `evidence/` subfolder.
  - 2026-06-06 evidence: `evidence/2026-06-06-bundle-analyzer-baseline.md`; clean `ANALYZE=true bunx next build --webpack` emitted `client.html`, `nodejs.html`, and `edge.html`.

- [x] **Step 0.4: Run route-transition baseline**
  - Commands after dependencies and auth fixtures are available:
    ```bash
    bun run test:e2e:perf
    bun run perf:check-routes
    ```
  - Expected: route-transition budget results are attached, with skipped auth scenarios clearly explained.
  - 2026-06-06 evidence: `evidence/2026-06-06-route-transition-public-baseline.md`, `evidence/2026-06-06-route-transition-public-baseline.json`, and `evidence/2026-06-06-route-transition-public-readiness.json`. Public route-transition baseline passed; authenticated scenarios remain fixture-open.

## Workstream 1: Root shell and global bundle containment

- [x] **Step 1.1: Prove whether global CSS/fonts dominate first load**
  - Inspect analyzer output for font CSS, `react-complex-tree`, Lenis, root providers, and analytics chunks.
  - Expected: a before/after hypothesis names a specific chunk or route, not a generic “reduce JS” claim.
  - 2026-06-06 result: analyzer names candidates but does not justify a root-shell/provider split yet. Root provider code is small; larger candidates include public Lenis/Neat chunks, icon footprint, `d3`, and workshop estimate surfaces. Route/device p75 evidence is still needed before selecting a runtime optimization.

- [x] **Step 1.2: Plan root provider split only if analyzer shows public-route cost**
  - Candidate change: separate public-only providers from workshop-only QueryClient/navigation/overlay providers.
  - Required tests before implementation:
    ```bash
    bun run test:dom -- tests/vitest/route-transition-peak-load-profile.test.tsx
    bun run test:dom -- tests/vitest/vercel-web-analytics-integration.test.ts
    bun run test:e2e:perf
    ```
  - Acceptance: public pages keep consent/analytics behavior; workshop keeps route overlay/query/bfcache behavior.
  - 2026-06-06 decision: analyzer and local public-route evidence did **not** justify a root provider split. Keep `AppProviders` unchanged and prefer narrower route-local mitigations already captured for Neat, non-home Lenis, and unused root fonts. Reopen only if Speed Insights/hosted traces or analyzer evidence attributes material public-route cost to the root provider stack.

- [x] **Step 1.3: Preserve analytics privacy**
  - If adding `@vercel/speed-insights`, update `tests/vitest/vercel-web-analytics-integration.test.ts:24-30` intentionally and add privacy tests for tokenized/share/auth routes.
  - If keeping Web Analytics-only, document that Speed Insights dashboard data is provider-side and code remains unchanged.
  - 2026-06-06 status: PR-1A chose dashboard/provider-only Speed Insights with no package change. `tests/vitest/vercel-web-analytics-integration.test.ts` locks Speed Insights absence, Web Analytics redaction, sensitive-route drops, and the no-package decision record. Provider p75 proof remains open.

## Workstream 2: Public/landing LCP and INP

- [x] **Step 2.1: Profile public routes with consent off and on**
  - Test `/`, `/features`, `/pricing`, `/contact` in mobile throttle.
  - Expected: compare LCP/INP with analytics consent false vs true.
  - 2026-06-06 local evidence: `evidence/public-lighthouse-2026-06-06/public-lighthouse-mobile-baseline.md` plus JSON/HTML/trace/devtools assets. Home is weakest locally (score 80 consent-off, TBT 378.48ms); provider Speed Insights p75 and hosted analytics proof remain open.

- [x] **Step 2.2: Evaluate Neat canvas fallback**
  - Candidate: static fallback for mobile/reduced-motion/low-end devices or lazy activation after LCP.
  - Guardrails: visual screenshot comparison and no broken hero layout.
  - 2026-06-06 local implementation: `NeatWireframeBackground` now keeps a static fallback for mobile, coarse-pointer, and reduced-motion clients and dynamically imports/activates `@firecms/neat` after idle for eligible desktop clients. Evidence: `evidence/neat-mobile-fallback-2026-06-06/neat-mobile-fallback-summary.md`. Local TBT improved in both home mobile Lighthouse after-runs, but consent-off LCP/Speed Index regressed in this single local run; provider p75 and hosted proof remain open before claiming production improvement.

- [x] **Step 2.3: Evaluate Lenis scope**
  - Candidate: remove from non-home pages or lazy-load after interaction.
  - Guardrails: anchor scrolling, reduced-motion, and navigation behavior tests.
  - 2026-06-06 local implementation: `PublicPageShell` no longer wraps non-home marketing pages in `LandingSmoothScrollProvider`; home still uses the reduced-motion-aware provider. Evidence: `evidence/lenis-non-home-scope-2026-06-06/lenis-non-home-scope-summary.md`. Local Lighthouse after-traces are improved for `/features` and `/pricing` and mixed/stable for `/contact`; provider p75 and hosted proof remain open before claiming production improvement.

- [x] **Step 2.4: Audit image/font LCP**
  - Ensure hero/marketing media use optimized dimensions, priority only where measured, and no unnecessary font family on first paint.
  - 2026-06-06 local implementation: source and Lighthouse evidence did not justify image preload/media changes; public image requests remain tiny logo SVGs while LCP is text-based. `RootLayout` now imports only `Inter` and `Roboto_Mono`, with unused `Poppins` and `Source Serif 4` root aliases removed. Evidence: `evidence/public-image-font-lcp-audit-2026-06-06/public-image-font-lcp-summary.md`. Local `/features` consent-off score improved 89 -> 92 and LCP 3782.31ms -> 3322.06ms; `/` score improved 80 -> 89 with LCP roughly stable (3802.40ms -> 3752.86ms). Provider p75 and hosted waterfall proof remain open.


## Cache-safety matrix for public-route work

Before Workstream 3 changes cache headers, apply `24-cache-safety-and-public-personalization-matrix.md`. Public marketing pages may be cacheable only after logged-in header state, consent state, and A/B variants are separated or proven cache-safe. Tokenized share/invite, auth, protected, and password/session routes remain non-cache candidates unless a separate security review proves otherwise.

Treat `cacheComponents`, `inlineCss`, `cssChunking`, and React Compiler changes as controlled spikes requiring route-by-route proof, not quick fixes.

## Workstream 3: Protected route TTFB without auth regression

- [ ] **Step 3.1: Measure proxy/auth waterfall**
  - Use production/preview request timing and local logs to separate proxy, auth, route server render, and Supabase query time.
  - Do not replace `supabase.auth.getUser()` with `getSession()` in proxy auth.

- [x] **Step 3.2: Public-route cache review**
  - Review `MARKETING_PAGE_CACHE_CONTROL = "private, no-cache, max-age=0, must-revalidate"` in `src/proxy.ts`.
  - Candidate: public marketing cache policy only, not protected/share routes.
  - Guardrails: closed-beta access behavior, public pages, and CSP tests.
  - 2026-06-06 evidence: `evidence/2026-06-06-public-cache-safety-harness.md` and `24-cache-safety-and-public-personalization-matrix.md` conclude public marketing routes are not safe for broad shared HTML caching today; keep `MARKETING_PAGE_CACHE_CONTROL` unchanged until personalization is isolated/proven.

- [ ] **Step 3.3: Beta access optimization spike**
  - Because `getClosedBetaAccessForEmail` is CRITICAL blast radius, any caching/optimization needs auth/security review.
  - Required tests: auth proxy, beta allowlist, hosted auth verification, invite-entry proof.

## Workstream 4: Estimate workspace INP and render cost

- [x] **Step 4.1: Run local peak-load profile for large estimate fixture**
  - Measure selecting nodes, editing costs, opening history, opening proposal preview, dragging tree nodes, and cursor movement.
  - Expected: top render stacks identify exact components/functions.

  - 2026-06-06 local evidence: `evidence/2026-06-06-estimate-peak-load-profile.md` and `.json` from `bun run perf:profile-peak-load`; browser React Profiler and provider INP proof remain open.

- [ ] **Step 4.2: Split lazy UI boundaries only where measured**
  - Candidate boundaries: activity history modal, row details modal, proposal preview dialog, command palette/right sidebar, chart-heavy panels.
  - Guardrails: tests for cost inputs, version control UI, library insert, context menu, DnD, proposal preview.

- [x] **Step 4.3: Reduce pointer-move/collaboration pressure**
  - Candidate: throttle `handleSheetPointerMove` broadcasts in `EstimateSheetContent` after measuring cursor update cost.
  - Guardrails: collaboration cursor behavior and no stale cursor indicators.
  - 2026-06-06 local implementation: `useEstimateCursorCollaboration` now keeps the existing timed throttle and adds a 6px same-cell distance gate before queueing cursor broadcasts; row/column target changes still queue immediately. Evidence: `evidence/2026-06-06-estimate-cursor-broadcast-pressure.md` / `.json` and `tests/vitest/estimate-cursor-broadcast-throttle.test.ts`. Synthetic same-cell pointer queue events dropped 120 -> 20 (83%) in the local guard benchmark; provider Realtime throughput and multi-user INP proof remain open.

- [ ] **Step 4.4: Tree virtualization/windowing spike**
  - Only after profiler shows tree row render as a bottleneck.
  - Guardrails: drag/drop, keyboard navigation, selection, context menus, search, and accessibility.

## Workstream 5: Data/query performance

- [x] **Step 5.1: Build per-route query inventory**
  - For each route bucket, count Supabase reads/writes and payload size.
  - Start from `workspace-repository.ts`, `component-library-repository.ts`, `project-charts-repository.ts`, and publication repositories.
  - 2026-06-06 local evidence: `evidence/2026-06-06-query-inventory-repo-only.md` from `bun run dbidx:audit-repo` captured 262 repo query references and 103 migration index statements. Follow-up per-route inventory evidence at `evidence/2026-06-06-per-route-query-inventory.md` / `.json` groups the same 262 table/RPC references into 7 route buckets and records selected-column payload shape/counts. Live/provider metrics, row counts, RLS cost, and EXPLAIN remain open for Step 5.2.

- [ ] **Step 5.2: Run live EXPLAIN/provider proof before migration proposals**
  - Use the existing database-indexing plan as canonical input.
  - Do not add indexes or RPC rewrites without staging/live EXPLAIN and owner-approved migration plan.

- [ ] **Step 5.3: Consolidate only proven query fan-out**
  - Candidate: project publication summary helper reads, share activity recipient display-name lookup, estimate tree load limits.
  - Guardrails: RLS, role checks, collaboration/publication tests.

## Workstream 6: Share/publication and proposal export

- [x] **Step 6.1: Keep no-store/security invariants**
  - Public share APIs must keep token/password/session/rate-limit protections.
  - Cache only public, non-sensitive, non-tokenized assets.
  - 2026-06-06 local coverage: `tests/vitest/share-no-store-invariants.test.ts` locks `force-dynamic` plus `Cache-Control: no-store` across all `/api/share/[token]` routes and keeps `/share/[token]` force-dynamic with no numeric `revalidate`/`unstable_cache`. Evidence: `evidence/2026-06-06-share-no-store-invariants.md`.

- [x] **Step 6.2: Benchmark share activity endpoint**
  - Measure query count and latency for comments/responses/events/recipient-name lookup.
  - Candidate: tighter pagination/cursors or server-side RPC only with security proof.
  - 2026-06-06 local evidence: `evidence/2026-06-06-shared-link-activity-benchmark.md` and `.json` from `bun run scripts/benchmark-shared-link-activity.ts`; current fan-out is 3 public anonymous queries, 5 public recipient-session queries, and 6 owner/include-telemetry activity-table queries before auth/RBAC overhead. Synthetic local composition stayed under 12ms for 2500 activity rows in this run; hosted Supabase latency, EXPLAIN, RLS cost, and function duration proof remain open before RPC/index/pagination rewrites.

- [ ] **Step 6.3: Benchmark proposal export**
  - Use `scripts/benchmark-proposal-workbook.ts` and hosted export route script.
  - Candidate: streaming/worker queue only if current Node route exceeds latency/memory budgets.
  - 2026-06-06 local evidence: `evidence/2026-06-06-proposal-workbook-benchmark.md` and `.json` from `bun run scripts/benchmark-proposal-workbook.ts`; hosted export route latency/memory proof remains open.
  - 2026-06-06 hosted benchmark harness readiness: `scripts/verify-hosted-export-route.ts` now supports repeated sanitized benchmark samples via `HOSTED_EXPORT_RUNS` and `MARKDOWN_FILE`; evidence at `evidence/2026-06-06-hosted-proposal-export-benchmark-readiness.md` records that a safe authenticated hosted fixture/cookie/header is still required before proof can be captured.

## Workstream 7: Release, monitoring, and rollback

- [ ] **Step 7.1: Ship one performance surface at a time**
  - Each PR should include before/after metrics, focused tests, and rollback notes.

- [ ] **Step 7.2: Compare Speed Insights windows**
  - Do not judge immediately after deploy if traffic is too low; compare consistent windows and route cohorts.

- [ ] **Step 7.3: Preserve closed-beta readiness language**
  - Mark improvements as `IMPLEMENTED LOCALLY` until production Speed Insights/provider proof confirms impact.
