<!-- Docs-only performance planning pack. Added 2026-06-05. No application code implementation in this folder. -->

# Performance Hypothesis Scorecard

Use this scorecard to pick implementation order. Do **not** implement a lower-ranked hypothesis before proving that higher-ranked hypotheses are irrelevant, already solved, or unsafe for the current release slice.

## Scoring rubric

- **Impact:** expected ability to move Vercel Speed Insights / Core Web Vitals for a meaningful route cohort.
- **Confidence:** how strongly current repo evidence supports the bottleneck before provider metrics are captured.
- **Risk:** product/security blast radius if implemented incorrectly.
- **First proof:** the smallest measurement that can validate or kill the hypothesis.

## Ranked hypotheses

| Rank | Hypothesis | Route bucket | Metric likely affected | Impact | Confidence | Risk | First proof | First safe implementation slice | Stop/rollback trigger |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Public pages inherit global client/provider and global CSS cost from `src/app/layout.tsx` + `src/app/providers.tsx` even when they do not need workshop-only behavior. | `/`, `/about`, `/features`, `/pricing`, `/contact` | LCP, INP, FCP, JS execution | Very high | High | Medium | `ANALYZE=true bun run build`; compare first-load JS and route chunks; Lighthouse mobile long tasks. | Split or conditionally scope workshop-only providers/CSS after proving public-route cost. | If analyzer shows public routes are not carrying meaningful provider/CSS/chunk cost. |
| 2 | Marketing pages are explicitly marked `private, no-cache`, preventing CDN-level wins for static-ish public pages. | public marketing pages | TTFB, LCP | Very high | High | Medium/high | `curl -I` and `vercel httpstat` on public routes; inspect `Cache-Control`, `CDN-Cache-Control`, `x-vercel-cache`. | Change cache policy only for non-sensitive marketing routes; keep invite/share/protected APIs untouched. | Any sign that auth, beta access, cookies, or user-specific content can leak/cache. |
| 3 | Landing canvas/Lenis/third-party analytics create main-thread and input cost on mobile. | `/` and marketing pages | INP, LCP, long tasks | High | High | Low/medium | Lighthouse mobile trace with consent off/on; Chrome Performance trace; bundle attribution for `@firecms/neat` and `lenis`. | Lazy/idle-load or reduced-motion/mobile fallback for canvas/Lenis; preserve visual fallback. | Visual regression, broken anchors, reduced-motion regression, or no long-task attribution. |
| 4 | Root font loading applies four font families globally, increasing CSS/font work for routes that may not need all families above the fold. | all routes, especially public | LCP, FCP, CLS if font swap changes | Medium/high | Medium | Low/medium | Lighthouse font diagnostics; network waterfall; route CSS/font timing. | Scope non-critical font variables or reduce above-the-fold font usage only after visual review. | Brand/design regression or no font timing contribution. |
| 5 | Estimate workspace INP is dominated by large `EstimateSheetContent` and `EstimateSheetTree` render/update paths. | `/workshop/projects/.../estimates/...` | INP, route transition, JS heap | Very high for authenticated users | High | High | React Profiler on large seeded estimate; existing `perf:profile-peak-load`. | Lazy heavy panels/modals, stabilize props/callbacks, measured cursor throttling, then tree virtualization only if proven. | DnD, keyboard nav, editing, version history, collaboration, or proposal preview regressions. |
| 6 | Supabase repository fan-out and payload size dominate protected route TTFB and workshop data readiness. | dashboard, projects, estimate nodes, library/templates | TTFB, route ready time | High | Medium/high | High | Query inventory per route; Supabase EXPLAIN/provider logs; payload-size snapshots. | Add limits/select narrowing/query consolidation with RLS tests; index/RPC work only after EXPLAIN proof. | RLS/role regression, stale data, or EXPLAIN does not identify the query as a bottleneck. |
| 7 | Public share page/API do sequential security/event/snapshot/activity work that may dominate TTFB but cannot be solved with naive caching. | `/share/[token]`, `/api/share/[token]/*` | TTFB, API latency | Medium/high | Medium | High | `vercel httpstat`; server timing/logs; query count for password/session and activity flows. | Pagination/cursor/query consolidation; keep no-store/token security. | Any cache leak, password/session bypass, analytics/privacy regression. |
| 8 | Proposal export is synchronous Node/ExcelJS buffer work and may exceed latency/memory budgets on large estimates. | XLSX export route | route latency, memory, timeouts | Medium/high | Medium | Medium | `scripts/benchmark-proposal-workbook.ts`; hosted export verifier; memory/time fixture matrix. | Optimize workbook generation or add bounded async/streaming path only if benchmark demands it. | Export file content regression, memory limit risk, or no benchmark failure. |
| 9 | Missing or incomplete Speed Insights instrumentation may reduce observability and route attribution. | all public/client routes | observability, not direct CWV | Medium indirect | Medium | Medium/privacy | Confirm dashboard route data exists; inspect absence of `@vercel/speed-insights`; verify privacy expectations. | Add `@vercel/speed-insights` only if provider dashboard lacks needed data and privacy tests are updated. | Sensitive route labels/tokens could be emitted, or Vercel dashboard already gives enough route data. |
| 10 | Package import optimization may be incomplete beyond `@phosphor-icons/react`. | client routes | JS size | Medium | Low/medium | Low | Bundle analyzer large dependency report. | Extend `optimizePackageImports` only for packages recommended/safe by Next docs and verified by build. | Build regression or no route chunk reduction. |
| 11 | Image/attachment APIs and project/component media may affect LCP/payloads on image-heavy pages. | project cards, component library, share hero | LCP, transfer size | Medium | Low/medium | Medium | image waterfall and CDN/header proof. | Optimize image dimensions/cache/access only after route evidence. | Upload/access regression or no media contribution. |

## Major-gain thesis

A massive improvement is most likely if the first implementation batch proves and addresses **one or more** of these bottleneck classes:

1. public-route first-load JS/main-thread cost,
2. public-route cache/TTFB restrictions,
3. landing animation/third-party long tasks,
4. estimate workspace render storms,
5. Supabase query fan-out.

Cosmetic cleanup, generic memoization, dependency churn, or unmeasured refactors should be treated as low-confidence until tied to this scorecard.
