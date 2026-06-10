# Path-to-Estimate-Sheet Performance Audit — Executive Summary

**Date**: 2026-06-11
**Scope**: Full rendering path from landing page (`/`) to estimate sheet (`/workshop/projects/[projectId]/estimates/[nodeId]`)
**Target URL**: `/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/77777777-7777-4777-8777-777777777720`
**Severity Scale**: CRITICAL > HIGH > MEDIUM > LOW
**Prior Oracle Review**: Recorded (ses_14d7fd71bffeTjzSxp7XMF1sQk) - 5 blind spots found, priorities corrected
**Prior Oracle Verification**: Recorded (ses_14d75f97cffe6OZJiSGoRHgEk6) - landing page + estimate list gaps filled
**Current Evidence Posture**: Source-audited; runtime baseline and provider evidence pending

---

## Summary

This audit covers the **north-star path** of Archestimator — the main feature route from landing page to estimate sheet. The path involves 30+ client components, 15+ database tables, 3 realtime subscriptions, and multiple proxy (`src/proxy.ts`)/layout auth gates. Four major bottleneck categories were identified.

The pack should be read as an implementation-planning artifact, not a completed performance result. The strongest findings are grounded in current source inspection. The percentage and millisecond improvement claims are hypotheses until the baseline table in [08-measurement-protocol.md](./08-measurement-protocol.md) is filled and compared against post-change measurements.

## Top 5 Findings (Ranked by Impact)

| # | Finding | Severity | Impact | Evidence |
|---|---------|----------|--------|----------|
| 1 | **Estimate sheet is NOT virtualized** — renders entire DOM tree of rows; every keystroke triggers full re-render + recursive tree traversal for totals. Current source snapshot has **4,336 lines** and uses 14 `useEffect`, 23 `useMemo`, 33 `useState`, 32 `useCallback`, and 7 `useRef` occurrences, with no `useDeferredValue`, `useOptimistic`, or `useTransition`. | **CRITICAL** | Input lag risk on sheets with 100+ rows; CPU spikes must be measured before and after fixes | Current source: `EstimateSheetContent.tsx:3416,3559-3571` |
| 2 | **Widespread `select('*')` on tables with large JSONB columns** — current worktree has 15 hits in `workspace-repository.ts`, 11 in `component-library-repository.ts`, 29 across repository files, and 48 across all `src`. Includes `source_snapshot` and `metadata` in estimate-sheet tree loads. | **CRITICAL** | Estimated 50-300KB wasted payload per estimate-sheet load, measurement pending | Current command: `rg -n '\.select\("\*"\)' src` |
| 3 | **Sequential waterfall in data fetching** — getUser → workspace → project → Promise.all → estimate tree. Each step blocks the next. | **HIGH** | Estimated 30-50% TTFB reduction possible by parallelizing (unmeasured — based on structural analysis) | Source: `layout.tsx:24-30`, `workspace-repository.ts:1077-1102` |
| 4 | **Component library fetches 8+ tables on every page load** — entire taxonomy, suppliers, brands, items, prices, versions, history, and templates. | **HIGH** | Unnecessary payload for users who never open the library sidebar | Source: `page.tsx:32-36`, `component-library-repository.ts:516-729` |
| 5 | **Real-time cursor broadcast re-renders entire sheet** at 80ms throttle — triggers React reconciliation in the 4,336-line sheet component. 3 active Supabase Realtime channels. | **HIGH** | Degraded collaboration experience during multi-user editing | Source: `use-estimate-cursor-broadcast.ts:83,137`, `EstimateSheetContent.tsx:3433,4240-4242` |

## Bottleneck Categories

| Category | Issues Found | Severity Spread |
|----------|-------------|-----------------|
| **Client-Side Rendering** | Non-virtualized sheet, keystroke-driven re-renders, client-side formula calculations, large component files (4,336 lines in current snapshot) | 2 CRITICAL, 3 HIGH, 4 MEDIUM |
| **Data Fetching** | Waterfall chains, `select('*')` over-fetching, component library eager-load, missing composite indexes | 1 CRITICAL, 3 HIGH, 5 MEDIUM |
| **Database** | Missing composite indexes on critical query patterns, RLS function overhead, trigger-based calculations | 0 CRITICAL, 2 HIGH, 3 MEDIUM |
| **Infrastructure** | Proxy auth round-trip per request, realtime channel overhead, no CDN caching for API routes | 0 CRITICAL, 1 HIGH, 3 MEDIUM |

## Oracle-Discovered Blind Spots

The initial audit missed 5 critical findings, uncovered by Oracle review:

| # | Blind Spot | Location | Severity |
|---|-----------|----------|----------|
| 1 | **`projectTotal` is NOT memoized** — bare variable in render body, recalculates on EVERY state change (even cursor movement, modal open) | `EstimateSheetContent.tsx:3488` | **CRITICAL** |
| 2 | **No React 19 concurrent features used** — `useDeferredValue`, `useOptimistic`, `startTransition`, `use()` all unused. Manual patterns replicate what React 19 provides natively. | Throughout | HIGH |
| 3 | **`computedRows` does 500+ object spreads per keystroke** — pure computation waste independent of DOM count | `EstimateRowItemsTable` | HIGH |
| 4 | **No `React.memo` on `EstimateRowItemsTable`** — every keystroke in ANY row re-renders ALL row table instances | `EstimateSheetContent.tsx` | HIGH |
| 5 | **Pointer-move handler traverses DOM at 60fps** — in addition to the 80ms-throttled cursor broadcast, `onPointerMove` does DOM hit-testing every frame | `use-estimate-cursor-broadcast.ts` | MEDIUM |

## Corrected Implementation Order

The Oracle review found that **R1 (virtualization) is NOT the right first priority** — it fixes DOM count but not the computation storm that causes keystroke lag. The corrected order:

```
Baseline (0.5-1d): create 50/200/500-row fixtures and capture load, payload, and keystroke traces
Sprint 0 (0.5-1d): characterization tests + React.memo row-table guard + projectTotal memo
Sprint 1 (2-3d): column selection + estimate-list aggregate query + composite indexes with EXPLAIN
Sprint 2 (2-4d): useDeferredValue refactor + useOptimistic evaluation + cursor isolation + lazy-load library
Sprint 3 (4-6d): split 4,336-line component, then virtualize grid if profiling still proves DOM pressure
```

## Quick Wins (Low Effort, High Impact)

1. **Characterize sheet behavior before optimization** — current source touches bulk selection, drag/drop, cursors, row editing, proposal export, and activity scope in one component.
2. **Replace estimate-sheet `select('*')` calls with explicit column selections** — estimated 60-80% payload reduction on JSONB-heavy tree loads, measurement pending.
3. **Defer component library fetch until sidebar open** — remove 8+ table reads from the initial estimate-sheet load.
4. **Add composite indexes with EXPLAIN proof**: `(workspace_id, item_id)` on cost library child tables and `(workspace_id, lifecycle_state)` on cost library items, only after a migration plan proves linked/local safety.

## Document Index

| Document | Content |
|----------|---------|
| [01-rendering-path-audit.md](./01-rendering-path-audit.md) | Full component hierarchy, Suspense boundaries, render depth, layout waterfalls |
| [02-data-fetching-audit.md](./02-data-fetching-audit.md) | All data fetches with file:line, waterfall analysis, over-fetching audit, realtime channels |
| [03-client-side-bundle-ux-audit.md](./03-client-side-bundle-ux-audit.md) | Client component audit, re-render patterns, virtualization gap, formula calculation analysis |
| [04-infrastructure-audit.md](./04-infrastructure-audit.md) | Proxy flow, auth check patterns, RLS policy audit, caching headers, Next.js config |
| [05-database-optimization-audit.md](./05-database-optimization-audit.md) | Schema review, index analysis, RPC/trigger audit, query pattern analysis |
| [06-prioritized-recommendations.md](./06-prioritized-recommendations.md) | Ranked action items with estimated effort, impact sizing, and implementation approach |
| [07-oracle-review-notes.md](./07-oracle-review-notes.md) | Full Oracle analysis, 5 blind spots, edge cases, emergency relief path |
| [08-measurement-protocol.md](./08-measurement-protocol.md) | Reproducible before/after benchmarks, per-sprint measurement gates, regression checkpoints |
| [09-code-pattern-analysis.md](./09-code-pattern-analysis.md) | Exact code patterns with line numbers, fix examples for all critical bottlenecks |
| [10-landing-page-audit.md](./10-landing-page-audit.md) | Landing page (`/`): 31 components, WebGL (Neat), Lenis smooth scroll, analytics scripts, A/B testing |
| [11-estimate-list-audit.md](./11-estimate-list-audit.md) | Estimate list page: `listProjectEstimates()` aggregate query cost, row computation, navigation gateway |
| [12-current-evidence-and-gap-audit.md](./12-current-evidence-and-gap-audit.md) | Current source snapshot, corrected facts, and evidence classification |
| [13-implementation-readiness-plan.md](./13-implementation-readiness-plan.md) | Requirements, decisions, implementation units, gates, and rollout notes |
| [14-adversarial-qa-matrix.md](./14-adversarial-qa-matrix.md) | Scenario matrix for future implementation QA |
| [15-readiness-scorecard.md](./15-readiness-scorecard.md) | Current readiness score and remaining blockers |
| [16-dependency-cache-image-decision-matrix.md](./16-dependency-cache-image-decision-matrix.md) | Redis/remote cache, `next/image`, package, and dependency decision gates |
| [17-blast-radius-and-impact-analysis-plan.md](./17-blast-radius-and-impact-analysis-plan.md) | Impact-analysis workflow, blast-radius matrix, and post-diff receipt template |

---

## Cross-Cutting Decision Findings

| # | Finding | Severity |
|---|---------|----------|
| C1 | Redis/Upstash/KV is not present in `package.json` and is not a default answer for protected estimate-sheet data. Remote cache requires measured cross-request pressure, safe non-secret data, invalidation design, and cost approval. | **HIGH** |
| C2 | Component thumbnails still use inline `backgroundImage` in sheet and library surfaces. `next/image` should be used where Supabase public image URLs match `next.config.ts` `remotePatterns`, with `fill` + `sizes` and no layout shift. | **HIGH** |
| C3 | Local Next 16 docs deprecate `next/image` `priority` in favor of `preload`; landing hero work should use `preload` only for the single true LCP candidate and avoid preloading carousel slides. | **MEDIUM** |
| C4 | Package/config changes need analyzer proof. `optimizePackageImports` currently covers `@phosphor-icons/react`; TanStack/Zustand additions should be measured before and after. | **MEDIUM** |
| C5 | Blast radius must be explicit per unit. The path crosses auth/proxy, repositories, realtime cursors, component library, tree mutation, and optional database migrations. | **CRITICAL** |

---

## Landing Page Key Findings (NEW)

| # | Finding | Severity |
|---|---------|----------|
| L1 | `getLandingAuthState()` does Supabase Auth HTTP round-trip on every `/` visit (50-150ms) — even for unauthenticated users | **HIGH** |
| L2 | `react-complex-tree/lib/style-modern.css` (6,824 bytes measured) loaded on landing page despite no tree component | **MEDIUM** |
| L3 | `NeatWireframeBackground` uses `@firecms/neat` (Three.js WebGL) — well-optimized (dynamic import, idle activation, prefers-reduced-motion fallback) | **LOW** |
| L4 | `AnimatedProposalRecordSection` (834 lines) — 7 ResizeObservers, rAF redraw, but below-fold activation via IntersectionObserver | **LOW** |

## Estimate List Key Findings (NEW)

| # | Finding | Severity |
|---|---------|----------|
| E1 | `listProjectEstimates()` still uses `estimates.select("*")` and computes row totals in JavaScript, but the current row-item query already selects only `estimate_id, quantity, unit_cost, contingency_percentage, misc_cost`. The older `source_snapshot` estimate-list overfetch claim is stale. | **MEDIUM** |
| E2 | Row-level cost computation (quantity x unitCost + misc + contingency) runs on the server for every row item across all estimates - O(n) per page load. | **MEDIUM** |
| E3 | A Postgres aggregate query or RPC can replace row transfer plus JavaScript aggregation: `SUM(quantity * unit_cost + misc_cost + ...) GROUP BY estimate_id`, with EXPLAIN and parity tests required. | **HIGH**

---

**Next Step**: Review [06-prioritized-recommendations.md](./06-prioritized-recommendations.md) for the ranked implementation plan.
