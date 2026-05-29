# 08 — Risks & Mitigations

**Status:** Complete  
**Created:** 2026-05-29  

---

## Risk Matrix

| # | Risk | Likelihood | Impact | Mitigation | Owner |
|---|------|------------|--------|------------|-------|
| R1 | **Increased `staleTime` shows stale data after mutations** | Low | Medium | React Query invalidates relevant queries on every mutation. Auth queries retain low `staleTime`. Per-query override for realtime data. | Developer |
| R2 | **`loading.tsx` skeleton causes CLS (layout shift)** | Medium | Medium | Design skeletons to match final layout dimensions exactly. Use `animate-pulse` with same height/width as content. Test with Lighthouse. | Developer |
| R3 | **Hover prefetch triggers excessive Supabase queries** | Medium | Medium | 200ms debounce on hover. Cancel in-flight prefetches on pointer leave. Deduplicate via React Query. Cap concurrent prefetches at 3. | Developer |
| R4 | **`next/dynamic` breaks SSR/hydration** | Low | High | Use `ssr: true` (default) for most components. Only use `ssr: false` for D3 chart components. Verify hydration mismatch warnings in console. | Developer |
| R5 | **Streaming breaks auth redirects** | Medium | **CRITICAL** | Test auth middleware + streaming before Phase 2. Auth redirects must complete before streaming HTML is sent. Roll back to non-streaming if auth breaks. | Developer |
| R6 | **Virtualized lists break inline editing** | Medium | High | Virtualization preserves row identity via keys. Edit state tracked separately from DOM. Test all inline edit scenarios (quantity, contingency, misc cost) after virtualization. | Developer |
| R7 | **Virtualized lists break drag-and-drop (React Complex Tree)** | High | High | Tree virtualization deferred to Phase 4 or later. RCT does not support virtualization natively. For now, use "load more" pagination for trees with 50+ nodes. | Developer |
| R8 | **bfcache blocked by third-party scripts** | Medium | Medium | Audit all third-party scripts (Lenis, Clarity, analytics). Lenis `unload` handler may need replacement with `pagehide`. Chrome DevTools bfcache tester identifies blockers. | Developer |
| R9 | **`router.prefetch()` causes duplicate data fetches** | Low | Low | Next.js deduplicates prefetch requests internally. React Query also deduplicates identical cache keys. Monitor network tab for duplicates. | Developer |
| R10 | **Phase 3 virtualization regresses E2E tests** | Medium | Medium | Virtualized DOM is different from static DOM. Playwright `page.locator()` may need `{ hasText: ... }` filters instead of direct selectors. Update E2E selectors after virtualization. | Developer |
| R11 | **Performance improvements mask underlying Supabase slowness** | Low | Medium | This plan targets client-side transition UX. Server-side Supabase query optimization is a separate concern. If P95 Supabase latency > 500ms, add server-side optimization plan. | Developer |
| R12 | **Overlay show delay (150ms) introduces perceived stutter** | Low | Low | 150ms is below human perception threshold for a deliberate action. If users report stutter, reduce to 100ms or remove delay entirely. Easy revert. | Developer |
| R13 | **Code splitting increases Time-to-Interactive for modals** | Low | Low | Modals are user-triggered, not time-critical. Skeleton shown during chunk load (< 500ms on 3G). First interaction after page load is when the chunk is needed. | Developer |
| R14 | **Bundle analysis reveals unactionable bloat** | Low | Low | Next.js and Tailwind handle most optimization automatically. If a library (Phosphor, D3) dominates bundle, evaluate lighter alternatives or sprite-sheet approach. | Developer |
| R15 | **Performance degrades after future feature additions** | Medium | High | Phase 4 monitoring (Lighthouse CI, bundle size regression checks) prevents silent regressions. Every major feature release must re-run baseline benchmarks. | DevOps |

---

## Critical Path Risks (Must Resolve Before Phase 2)

These risks are blocking for Phase 2 (Strategic Investments) and must be resolved during Phase 1:

| Risk | Why Critical | Resolution Check |
|------|-------------|-----------------|
| R5: Auth + streaming | Streaming HTML may send content before auth redirect | Test: manually navigate protected route with streaming enabled. Verify redirect works before any content is rendered. |
| R8: bfcache blockers | Without bfcache, back/forward will always be slow | Test: Chrome DevTools → Application → Back/forward cache → "Test". All workshop routes must pass. |
| R2: CLS from skeletons | High CLS negates any perceived speed improvement | Test: Lighthouse on each route with `loading.tsx`. CLS must be < 0.1. |

---

## Risk Acceptance / Deferred Risks

| Risk | Decision | Rationale |
|------|----------|-----------|
| R7: Tree virtualization | **Deferred** | React Complex Tree doesn't support virtualization. Pagination/"load more" is the pragmatic compromise. Tree virtualization requires RCT fork or replacement — out of scope. |
| R11: Supabase slowness | **Separate concern** | This plan is client-side. Server query optimization is tracked separately. |
| R13: Modal chunk load delay | **Accepted** | Modals are triggered by explicit user action. 500ms skeleton is acceptable UX for a complex form that would otherwise bloat the initial bundle by 30KB+. |

---

## Rollback Strategy

Every phase and every task is independently revertible. See `02-blast-radius-analysis.md` for per-technique rollback procedures.

**Global rollback:** If any phase causes a regression:
1. Git revert the phase commit
2. Re-run `bun run validate && bun run build && bun run test:e2e`
3. Document what regressed and why

**Phased safety:** Each phase is independently shippable. If Phase 2 causes issues, Phase 1 improvements remain in production. No all-or-nothing deployment.
