# IMPLEMENTATION AGENT INSTRUCTIONS — Route Transition Performance

**Status:** Authoritative — read FIRST before any implementation  
**Date:** 2026-05-30  

---

## Read These First (Mandatory)

| Order | Document | Why |
|-------|----------|-----|
| 1 | `CURRENT_CANONICAL_PLAN.md` | Single source of truth. All corrected assumptions, phased plan, guardrails. |
| 2 | `ADR_UPDATES.md` | All 14 architecture decisions, corrected against codebase. |
| 3 | `IMPLEMENTATION_MATRIX.md` | Task-by-task: current code status, plan status, corrected recommendation, risk, validation, rollback. |
| 4 | `CODEBASE_AUDIT.md` | Route-by-route verified facts about the live codebase. |
| 5 | `BENCHMARK_PROTOCOL.md` | Exact measurement protocol. Must be filled BEFORE Phase 1. |
| 6 | `PLAN_REPAIR_LOG.md` | What was wrong in the old plan and what was fixed. |
| 7 | `README.md` | Document inventory and implementer warning. |

---

## Treat These As SUPERSEDED

The following legacy documents contain stale/dangerous instructions and have been marked with SUPERSEDED banners. **Do not implement from them** unless `CURRENT_CANONICAL_PLAN.md` explicitly references a specific section:

| Doc | Reason SUPERSEDED |
|-----|------------------|
| `04-implementation-plan.md` | Task 1.5.1 (create middleware.ts) is WRONG. Task 2.2 uses fake React Query keys. Dynamic import examples use wrong syntax. |
| `06-strategy-adrs.md` | ADR-006 (150ms overlay delay) and ADR-013 (middleware migration + getSession()) contain errors. Use `ADR_UPDATES.md`. |
| `09-handoff-next-steps.md` | References "proxy.ts is dead code" — FALSE. |
| `11-prefetch-wiring-map.md` | Uses fake React Query keys. RSC wiring section still valid. |
| `12-overlay-fallback-strategy.md` | §6 (150ms show delay + remove min display) contradicts current implementation. |
| `17-server-side-optimization-strategy.md` | Claims proxy.ts is dead code. Recommends getSession() — SECURITY RISK. |
| `31-auth-optimization-middleware-migration.md` | Entire premise is wrong for Next.js 16. Recommends getSession(). |
| `01-performance-audit.md` | "Zero loading.tsx" (now have 6). "proxy.ts does not guard routes" (it does). |
| `03-readiness-assessment.md` | "No middleware exists" — FALSE. |
| `08-risks-and-mitigations.md` | R12 assumes 150ms overlay delay. R21 references middleware.ts creation. |
| `13-verified-codebase-facts.md` | Two stale claims: "Zero loading.tsx" and "proxy.ts does not guard routes." Export/query facts still accurate. |
| `22–25, 28–29` | Various | Contain fake function references (fetchProjects) or stale timing assumptions. |

---

## First Implementation Prompt (Phase 0 — Baseline Only)

```
I am implementing Phase 0 of the route transition performance plan
from .ai/03_plans/route-transition-performance-optimization/.

My task: Establish a quantitative baseline before ANY optimization.

Steps:
1. Read CURRENT_CANONICAL_PLAN.md, BENCHMARK_PROTOCOL.md, and CODEBASE_AUDIT.md.
2. Verify proxy.ts is running in Next.js 16:
   - ✅ CONFIRMED via node_modules/next/dist/build/utils.d.ts and Next 16 upgrade guide
   - No verification needed — skip the console.log step
3. Run "bun run build" and record per-route First Load JS sizes
4. Record route transition times manually (Chrome DevTools, Fast 3G throttle):
   - Cold navigations (incognito): / → /workshop → /workshop/projects → project detail → estimates
   - Warm navigations (cached): revisit each route
   - bfcache: back/forward timing
5. Fill all tables in BENCHMARK_PROTOCOL.md with actual measurements
6. Verify bfcache works: Chrome DevTools → Application → Back/forward cache → Test

Do NOT implement any optimization code.
Do NOT modify any production behavior.
Report all findings inline in BENCHMARK_PROTOCOL.md.
```

---

## Validation Commands (After Every Phase)

```bash
bun run type-check          # Must pass
bun run lint                # Must pass
bun run lint:design-system  # Must pass
bun run test                # Must pass (or note pre-existing failures)
bun run test:dom            # Must pass
bun run build               # Must pass
bun run test:e2e            # Must pass (especially auth-related specs)
```

**Manual verification checklist (Phases 2+):**
- [ ] Auth redirect: visit `/workshop/projects` while logged out → redirects to `/login`
- [ ] OAuth callback: Google login → redirects to `/workshop`
- [ ] Invite flow: `/invite/[token]` → accept → joins workspace
- [ ] Share route: `/share/[token]` → view shared estimate
- [ ] bfcache restore: back button → instant restore, no overlay
- [ ] Slow 3G: skeleton within 100ms, content within 3s
- [ ] Keyboard navigation: Tab through sidebar, Enter to navigate
- [ ] Screen reader: "Loading page" announced when overlay shows

---

## Rollback Expectations

- **Every task must have a documented rollback path** (see IMPLEMENTATION_MATRIX.md)
- Phase 1 tasks (loading.tsx fixes, error.tsx, staleTime, prefetch wiring): revert individual files via `git checkout`
- Phase 2 tasks (proxy.ts changes): revert the early-return addition. Do NOT delete proxy.ts.
- Phase 4 tasks (dynamic imports): revert to static imports
- **Never delete proxy.ts** — it is the active middleware
- **Never switch to getSession()** — revert to getUser()
- Run full validation suite after ANY rollback

---

## STOP If Contradiction Found

**Rule:** If you encounter an instruction in ANY document (canonical or legacy) that:

1. Recommends creating `src/middleware.ts` — **STOP.** This is wrong for Next 16.
2. Recommends using `getSession()` in proxy/auth code — **STOP.** Security risk.
3. Recommends adding 150ms overlay show delay before baseline — **STOP.** Premature.
4. Uses fake React Query keys like `["projects"]`, `["library"]` — **STOP.** They don't exist.
5. Uses `dynamic(() => import("..."))` without `.then(mod => mod.Name)` for named exports — **STOP.** Will fail at build.
6. Contradicts CURRENT_CANONICAL_PLAN.md or ADR_UPDATES.md — **STOP.** Canonical docs take precedence.

**If stopped:** Report the contradiction to the plan owner with the conflicting document reference and ask for clarification before proceeding.

---

## Quick Reference: Key Files

| What | Where |
|------|-------|
| Active middleware | `src/proxy.ts` (NOT middleware.ts) |
| Navigation store | `src/stores/navigation-ui-store.ts` |
| Loading overlay | `src/components/ui/route-loading-overlay.tsx` |
| Bfcache handler | `src/components/bfcache-handler.tsx` |
| Prefetch hook | `src/hooks/use-prefetch-on-hover.ts` |
| Loading skeletons | `src/app/workshop/**/loading.tsx` (6 files) |
| App providers | `src/app/providers.tsx` |
| Workshop shell | `src/components/workshop/WorkshopPageShell.tsx` |
| React Query keys | Only `["estimate", id]` and `["estimate", id, "area-tree"]` in `src/hooks/use-estimate-query.ts` |
