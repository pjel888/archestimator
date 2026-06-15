# 09 — Handoff: Next Steps for Implementation

> ⚠️ **SUPERSEDED — DO NOT IMPLEMENT.** This document references `31-auth-optimization-middleware-migration.md` ("proxy.ts is dead code") which is FALSE in Next 16. See `CURRENT_CANONICAL_PLAN.md` for the corrected next steps, `IMPLEMENTATION_AGENT_INSTRUCTIONS.md` for the implementation AI guide, and `IMPLEMENTATION_MATRIX.md` for task status.

**Status:** SUPERSEDED  
**Created:** 2026-05-29

> **⚠️ CRITICAL:** Before ANY implementation, read the six key verification documents:
> - **`13-verified-codebase-facts.md`** — canonical reference for all codebase claims (source file + line numbers)
> - **`14-code-splitting-named-exports.md`** — correct `dynamic()` patterns (all targets use NAMED exports)
> - **`15-server-component-prefetch-reality.md`** — corrected prefetch strategy (most React Query keys don't exist)
> - **`30-dynamic-rendering-analysis.md`** — what forces every route to be dynamic and how to fix it
> - **`31-auth-optimization-middleware-migration.md`** — proxy.ts is dead code (no middleware.ts exists); 3-line fix with outsized impact
> - **`32-bfcache-strategy.md`** — bfcache plan for instant back/forward navigation

---

## Prerequisite: Owner Approval

Before ANY implementation, the plan owner (Philip) must approve:
- [ ] Strategy direction (ADRs in `06-strategy-adrs.md`)
- [ ] Phase prioritization (order in `04-implementation-plan.md`)
- [ ] Peak-load seed data approach
- [ ] Installation of new dependencies (`@tanstack/react-virtual`, `@next/bundle-analyzer`, `@tanstack/react-query-devtools`)

---

## Immediate Next Actions (Phase 0)

### 1. Install Developer Tooling
```bash
bun add -D @next/bundle-analyzer
bun add -D @tanstack/react-query-devtools
```

### 2. Add Performance Monitor
- Copy `src/components/performance-monitor.tsx` from `04-implementation-plan.md` Task 0.2
- Wire into `src/app/providers.tsx`

### 3. Collect Baseline
- Run `bun run build` (note: pre-existing type error in `resend-client.ts` — fix or skip type-check)
- Run `ANALYZE=true bun run build` for bundle analysis
- Start dev server and manually run scenarios from `05-benchmark-scenarios.md`
- Fill in `07-baseline-metrics-template.md` with actual numbers
- Or run `bun run scripts/measure-route-transitions.ts` for automated collection
- Save Chrome DevTools Performance traces to `traces/` directory

### 4. Create Peak-Load Seed Data
- Write `scripts/seed-performance-test-data.ts` that creates N projects/sheets/rows/components
- Test with 50 projects, 200 rows, 500 components

---

## Phase 1 Execution Order (Day 0–1)

Execute in this order (each task is independently shippable):

| Order | Task | File(s) | Verification |
|-------|------|---------|-------------|
| 1 | Increase `staleTime` to 5min | `src/app/providers.tsx:14` | React Query DevTools shows fresh data on revisit |
| 2 | Add `loading.tsx` files (5 files) | `src/app/workshop/**/loading.tsx` | Skeletons appear on cold nav, replaced by content |
| 3 | Code-split modals (5 components — **USE NAMED EXPORT PATTERN, see doc 14**) | Various page files | `ANALYZE=true bun run build` shows new chunks |
| 4 | Add React `cache()` to repositories | `src/lib/repositories/*.ts` | No behavior change; deduplication within request |
| 5 | Add 150ms show delay to overlay | `src/stores/navigation-ui-store.ts` | Fast navs show no overlay; slow navs show after 150ms |
| 6 | Consolidate `useNavigationRouter()` in table (already partially migrated — 5 instances remain) | `ProjectEstimatesTable.tsx` | All 5 navigation scenarios still work |

**After each task:** Run `bun run validate`. If it fails, fix before proceeding.

---

## Documentation Map for Implementers

| If you need to know... | Read... |
|------------------------|---------|
| What the plan is about | `README.md` |
| Verified codebase facts (READ FIRST) | `13-verified-codebase-facts.md` |
| Correct dynamic() patterns | `14-code-splitting-named-exports.md` |
| Corrected prefetch strategy | `15-server-component-prefetch-reality.md` |
| What's slow and why | `01-performance-audit.md` |
| What changes affect what | `02-blast-radius-analysis.md` |
| If we're ready to implement | `03-readiness-assessment.md` |
| Exact implementation steps | `04-implementation-plan.md` |
| How to measure success | `05-benchmark-scenarios.md` |
| Why we chose each approach | `06-strategy-adrs.md` |
| Template for recording metrics | `07-baseline-metrics-template.md` |
| What could go wrong | `08-risks-and-mitigations.md` |
| Skeleton UI patterns | `10-skeleton-design-system.md` |
| Prefetch wiring (RSC only) | `11-prefetch-wiring-map.md` |
| Overlay as rare fallback | `12-overlay-fallback-strategy.md` |

---

## Key Constraints for Implementers

1. **Every task is independently revertible.** If something breaks, `git revert` that specific task.
2. **Do not remove the loading overlay.** It stays as a safety net. Only modify its timing (150ms delay).
3. **Do not change business logic.** Performance optimization should not alter what users see or how features work.
4. **Test auth flows.** Login, callback, invite, share — these must work identically after each phase.
5. **`bun run validate` after every task.** No exceptions. If pre-existing failures exist, document them.
6. **Collect metrics after each phase.** Compare against Phase 0 baseline. Stop if no improvement.
7. **🆕 All code splitting uses `.then(mod => mod.ComponentName)` pattern.** All 5 targets use named exports. Default-import `dynamic()` pattern WILL FAIL at build. See `14-code-splitting-named-exports.md`.
8. **🆕 React Query prefetch ONLY for estimate workspace routes.** `["projects"]`, `["homebase"]`, `["library"]` keys don't exist. Use `router.prefetch()` for RSC payload prefetch on all other routes. See `15-server-component-prefetch-reality.md`.

---

## Success Signal for Next Agent

When Phase 1 is complete, the following should be true:
- [ ] Clicking "Projects" in sidebar shows skeleton within 50ms, project cards within 150ms (Fast 3G)
- [ ] Revisiting Projects within 5 minutes shows cached data instantly (no skeleton, no overlay)
- [ ] The route loading overlay appears only for cold navigations > 150ms
- [ ] `bun run build` shows per-route "First Load JS" reduced by 20–40% vs. Phase 0 baseline
- [ ] All E2E tests pass

---

## Implementation Branch Strategy

```
main
  └── feat/route-transition-perf-phase-0    (instrumentation + baseline)
  └── feat/route-transition-perf-phase-1    (quick wins)
  └── feat/route-transition-perf-phase-2    (strategic investments)
  └── feat/route-transition-perf-phase-3    (peak-load hardening)
```

Each branch merges to `main` after verification. Do not combine phases into one giant PR.
