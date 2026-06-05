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

- [ ] **Step 0.4: Run route-transition baseline**
  - Commands after dependencies and auth fixtures are available:
    ```bash
    bun run test:e2e:perf
    bun run perf:check-routes
    ```
  - Expected: route-transition budget results are attached, with skipped auth scenarios clearly explained.

## Workstream 1: Root shell and global bundle containment

- [x] **Step 1.1: Prove whether global CSS/fonts dominate first load**
  - Inspect analyzer output for font CSS, `react-complex-tree`, Lenis, root providers, and analytics chunks.
  - Expected: a before/after hypothesis names a specific chunk or route, not a generic “reduce JS” claim.
  - 2026-06-06 result: analyzer names candidates but does not justify a root-shell/provider split yet. Root provider code is small; larger candidates include public Lenis/Neat chunks, icon footprint, `d3`, and workshop estimate surfaces. Route/device p75 evidence is still needed before selecting a runtime optimization.

- [ ] **Step 1.2: Plan root provider split only if analyzer shows public-route cost**
  - Candidate change: separate public-only providers from workshop-only QueryClient/navigation/overlay providers.
  - Required tests before implementation:
    ```bash
    bun run test:dom -- tests/vitest/route-transition-peak-load-profile.test.tsx
    bun run test:dom -- tests/vitest/vercel-web-analytics-integration.test.ts
    bun run test:e2e:perf
    ```
  - Acceptance: public pages keep consent/analytics behavior; workshop keeps route overlay/query/bfcache behavior.

- [ ] **Step 1.3: Preserve analytics privacy**
  - If adding `@vercel/speed-insights`, update `tests/vitest/vercel-web-analytics-integration.test.ts:24-30` intentionally and add privacy tests for tokenized/share/auth routes.
  - If keeping Web Analytics-only, document that Speed Insights dashboard data is provider-side and code remains unchanged.

## Workstream 2: Public/landing LCP and INP

- [ ] **Step 2.1: Profile public routes with consent off and on**
  - Test `/`, `/features`, `/pricing`, `/contact` in mobile throttle.
  - Expected: compare LCP/INP with analytics consent false vs true.

- [ ] **Step 2.2: Evaluate Neat canvas fallback**
  - Candidate: static fallback for mobile/reduced-motion/low-end devices or lazy activation after LCP.
  - Guardrails: visual screenshot comparison and no broken hero layout.

- [ ] **Step 2.3: Evaluate Lenis scope**
  - Candidate: remove from non-home pages or lazy-load after interaction.
  - Guardrails: anchor scrolling, reduced-motion, and navigation behavior tests.

- [ ] **Step 2.4: Audit image/font LCP**
  - Ensure hero/marketing media use optimized dimensions, priority only where measured, and no unnecessary font family on first paint.


## Cache-safety matrix for public-route work

Before Workstream 3 changes cache headers, apply `24-cache-safety-and-public-personalization-matrix.md`. Public marketing pages may be cacheable only after logged-in header state, consent state, and A/B variants are separated or proven cache-safe. Tokenized share/invite, auth, protected, and password/session routes remain non-cache candidates unless a separate security review proves otherwise.

Treat `cacheComponents`, `inlineCss`, `cssChunking`, and React Compiler changes as controlled spikes requiring route-by-route proof, not quick fixes.

## Workstream 3: Protected route TTFB without auth regression

- [ ] **Step 3.1: Measure proxy/auth waterfall**
  - Use production/preview request timing and local logs to separate proxy, auth, route server render, and Supabase query time.
  - Do not replace `supabase.auth.getUser()` with `getSession()` in proxy auth.

- [ ] **Step 3.2: Public-route cache review**
  - Review `MARKETING_PAGE_CACHE_CONTROL = "private, no-cache, max-age=0, must-revalidate"` in `src/proxy.ts`.
  - Candidate: public marketing cache policy only, not protected/share routes.
  - Guardrails: closed-beta access behavior, public pages, and CSP tests.

- [ ] **Step 3.3: Beta access optimization spike**
  - Because `getClosedBetaAccessForEmail` is CRITICAL blast radius, any caching/optimization needs auth/security review.
  - Required tests: auth proxy, beta allowlist, hosted auth verification, invite-entry proof.

## Workstream 4: Estimate workspace INP and render cost

- [ ] **Step 4.1: Run React Profiler on large seeded estimate**
  - Measure selecting nodes, editing costs, opening history, opening proposal preview, dragging tree nodes, and cursor movement.
  - Expected: top render stacks identify exact components/functions.

- [ ] **Step 4.2: Split lazy UI boundaries only where measured**
  - Candidate boundaries: activity history modal, row details modal, proposal preview dialog, command palette/right sidebar, chart-heavy panels.
  - Guardrails: tests for cost inputs, version control UI, library insert, context menu, DnD, proposal preview.

- [ ] **Step 4.3: Reduce pointer-move/collaboration pressure**
  - Candidate: throttle `handleSheetPointerMove` broadcasts in `EstimateSheetContent` after measuring cursor update cost.
  - Guardrails: collaboration cursor behavior and no stale cursor indicators.

- [ ] **Step 4.4: Tree virtualization/windowing spike**
  - Only after profiler shows tree row render as a bottleneck.
  - Guardrails: drag/drop, keyboard navigation, selection, context menus, search, and accessibility.

## Workstream 5: Data/query performance

- [ ] **Step 5.1: Build per-route query inventory**
  - For each route bucket, count Supabase reads/writes and payload size.
  - Start from `workspace-repository.ts`, `component-library-repository.ts`, `project-charts-repository.ts`, and publication repositories.

- [ ] **Step 5.2: Run live EXPLAIN/provider proof before migration proposals**
  - Use the existing database-indexing plan as canonical input.
  - Do not add indexes or RPC rewrites without staging/live EXPLAIN and owner-approved migration plan.

- [ ] **Step 5.3: Consolidate only proven query fan-out**
  - Candidate: project publication summary helper reads, share activity recipient display-name lookup, estimate tree load limits.
  - Guardrails: RLS, role checks, collaboration/publication tests.

## Workstream 6: Share/publication and proposal export

- [ ] **Step 6.1: Keep no-store/security invariants**
  - Public share APIs must keep token/password/session/rate-limit protections.
  - Cache only public, non-sensitive, non-tokenized assets.

- [ ] **Step 6.2: Benchmark share activity endpoint**
  - Measure query count and latency for comments/responses/events/recipient-name lookup.
  - Candidate: tighter pagination/cursors or server-side RPC only with security proof.

- [ ] **Step 6.3: Benchmark proposal export**
  - Use `scripts/benchmark-proposal-workbook.ts` and hosted export route script.
  - Candidate: streaming/worker queue only if current Node route exceeds latency/memory budgets.

## Workstream 7: Release, monitoring, and rollback

- [ ] **Step 7.1: Ship one performance surface at a time**
  - Each PR should include before/after metrics, focused tests, and rollback notes.

- [ ] **Step 7.2: Compare Speed Insights windows**
  - Do not judge immediately after deploy if traffic is too low; compare consistent windows and route cohorts.

- [ ] **Step 7.3: Preserve closed-beta readiness language**
  - Mark improvements as `IMPLEMENTED LOCALLY` until production Speed Insights/provider proof confirms impact.
