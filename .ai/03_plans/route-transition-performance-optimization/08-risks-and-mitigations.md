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
| R16 | **`EstimateSheetContent` code split breaks dynamic import** | Medium | High | **VERIFIED (2026-05-29): ALL 5 code-splitting targets use NAMED exports, not default.** The original plan examples would fail at build. Fix: use `.then(mod => mod.ComponentName)` pattern. All 5 targets confirmed: `EstimateSheetContent` (`EstimateSheetContent.tsx:3278`), `EstimateSheetTree` (`:204`), `AddComponentModal` (`:679`), `LibraryFolderTree` (`:334`), `ComponentLibraryManager` (`:786`). See `14-code-splitting-named-exports.md` for correct patterns. | Developer |
| R17 | **WorkshopPageShell `cookies()` read prevents any caching strategy** | Low | Low | Architectural constraint — all workshop pages are forced dynamic. This is acceptable for now. Future: extract side-panel width to client-side localStorage to unlock server caching. | Architect |
| R18 | **No middleware means auth redirect latency** | Low | Medium | Every workshop page SSR runs `requireCurrentUserContext()` → Supabase auth check. This adds ~50-100ms per request. Future: add middleware for auth guard to avoid per-page auth round-trip. | Architect |
| R19 | **Phosphor icon import inconsistency pulls full client bundle** | Low | Low | 3 files import from `@phosphor-icons/react` instead of `/dist/ssr`. The `optimizePackageImports` config helps but doesn't guarantee tree-shaking. Fix import paths. | Developer |
| R20 | **`getCurrentWorkspaceProject()` called in both layout and page without deduplication** | Low | Medium | Layout and page both call this function, resulting in 2 identical Supabase queries. `React.cache()` (Task 1.4) will fix this. | Developer |
| R21 | **Proxy.ts → Middleware migration breaks auth flows** | Medium | **CRITICAL** | Migration affects all protected routes (16+). Edge runtime has limitations. Comprehensive E2E testing required. Rollback plan: restore `proxy.ts` and revert page imports. Test: login, logout, session refresh, OAuth callback, email verification. | Developer |
| R22 | **React.memo ineffective due to unstable props** | Medium | Medium | If props are not memoized (objects/arrays/functions), `React.memo` has no effect. Must audit all memoized components to ensure props are stable. Test: React DevTools Profiler shows skipped renders. Mitigation: use `useMemo` for objects, `useCallback` for functions. | Developer |
| R23 | **Three.js dynamic import causes hydration mismatch** | Low | Medium | Dynamic import with `ssr: false` may cause hydration warnings if component renders differently on server vs client. Test: check console for hydration errors. Mitigation: use `ssr: false` in dynamic import, provide static fallback gradient. | Developer |
| R24 | **Font loading optimization causes missing fonts on pages** | Medium | High | If font usage is not audited correctly, pages may render with fallback fonts or invisible text (FOIT). Test: verify all pages render correctly with new font strategy. Mitigation: audit font usage per route, use `font-display: swap`. | Developer |
| R25 | **Error boundary infinite loop** | Low | High | If error boundary re-renders and throws again, user sees infinite retry loop. Test: intentionally throw error, verify retry UI works, limit retries to 3. Mitigation: show "contact support" after 3 retries. | Developer |
| R26 | **Project layout caching serves stale data** | Medium | High | If `unstable_cache` is not invalidated on mutations, users see outdated project data. Test: update project, navigate to layout, verify fresh data. Mitigation: add `revalidateTag` to all mutation actions, document invalidation points. | Developer |
| R27 | **N+1 query fixes change query logic incorrectly** | Medium | Medium | Batching queries changes data retrieval logic. If not tested thoroughly, may return incorrect data. Test: verify all list pages return correct data with 10+ items. Mitigation: incremental rollout, comprehensive E2E testing. | Developer |
| R28 | **Production monitoring alert fatigue** | Medium | Low | If thresholds are too aggressive, team receives too many alerts and ignores them. Test: review alert frequency after 1 week. Mitigation: start with conservative thresholds, adjust based on real data. | DevOps |

---

## Critical Path Risks (Must Resolve Before Phase 2)

These risks are blocking for Phase 2 (Strategic Investments) and must be resolved during Phase 1 or Phase 1.5:

| Risk | Why Critical | Resolution Check |
|------|-------------|-----------------|
| R5: Auth + streaming | Auth is at data-fetching layer (`requireCurrentUserContext()` → `cookies()` + `headers()`), not middleware. Streaming HTML may send content before auth redirect completes. | Test: manually navigate protected route with streaming enabled. Verify redirect works before any content is rendered. |
| R8: bfcache blockers | **Audit complete: Zero blockers found.** No `beforeunload`/`unload` listeners. No `Cache-Control: no-store` on workshop pages. Only need `pageshow` handler in NavigationListener. | Test: Chrome DevTools → Application → Back/forward cache → "Test". All workshop routes must pass. |
| R2: CLS from skeletons | High CLS negates any perceived speed improvement | Test: Lighthouse on each route with `loading.tsx` / Suspense. CLS must be < 0.1. |
| R21: Proxy.ts migration | **CRITICAL:** Migration affects all 16+ protected routes. Auth flow breakage would block all users from accessing workshop. Edge runtime has API limitations. | Test: comprehensive E2E suite covering login, logout, signup, session refresh, OAuth, email verification. Rollback plan ready. |
| R26: Layout cache staleness | If cache invalidation is incomplete, users see outdated project data after mutations, causing confusion and potential data loss. | Test: perform all mutation actions (update project, create estimate, delete sheet), verify layout refreshes. Audit all mutation files for `revalidateTag`. |

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
