# Workshop Pages — Coordination Ledger

**Pack:** `.ai/03_plans/2026-07-09/Workshop-Pages`  
**Status:** `CONDITIONALLY READY` → executing Phases 0–3  
**Checkout:** stay on current `main` (shared worktree; no branch ops)

## Master execution goal

Make workshop cross-page navigation shell-stable: persistent chrome mounts once in `workshop/layout.tsx` via `WorkshopShell`; pages own `WorkshopRouteHeader` + content; loading files are content-only; auth/terms gate stays synchronous-first.

### In scope
- Phase 0 baseline artifact (best-effort)
- Phase 1 WP-1.1 … WP-1.7
- Phase 2 WP-2.1 (gate comment)
- Phase 3 WP-3.1 (leaf content skeletons)

### Non-goals
- Phase 4 cacheComponents (owner-gated)
- Flatten URLs (DEC-01: keep nested — **owner acked 2026-07-10, Option 1**)
- D1/R2/DO/migrations, middleware auth logic, Git branch/push/commit

### OPEN-1 (impl lead)
`sidebarStatus.projectsBadgeCount` → client store sync from home page.

### DEC-01 (impl lead, owner-delegated)
**RESOLVED 2026-07-10** — Philip acked Option 1 (keep nested `/workshop/*` URLs; fix chrome ownership via Phase 1 `WorkshopShell`). No longer a residual gate.

## File ownership (this execution)

| Path | Intent |
|---|---|
| `src/components/workshop/WorkshopShell.tsx` | NEW persistent chrome |
| `src/components/workshop/WorkshopRouteHeader.tsx` | NEW page header |
| `src/components/workshop/WorkshopContentSkeleton.tsx` | NEW content fallback |
| `src/components/workshop/WorkshopCanvasWash.tsx` | NEW wash sync to shell root |
| `src/components/workshop/WorkshopSidebarStatusSync.tsx` | NEW badge sync |
| `src/stores/workshop-sidebar-status-store.ts` | NEW store |
| `src/app/workshop/layout.tsx` | gate + WorkshopShell + SEC comment |
| `src/app/workshop/**` pages/layouts/loading | migrate off WorkshopPageShell |
| `src/components/workshop/WorkshopPageShell.tsx` | delete after migrate |
| `src/components/workshop/StaticWorkshopLoadingShell.tsx` | content-only |
| `tests/**` shell governance | retarget |

## Loop log

| Time | Phase | Note |
|---|---|---|
| 2026-07-10 | DISCOVER | WorkshopShell missing; consumers confirmed; cacheComponents OFF; gate sync-first |
| 2026-07-10 | PLAN | Phases 0–3; OPEN-1 client store; DEC-01 keep nested |
| 2026-07-10 | EXECUTE | Implementing WP-1.1+ |
| 2026-07-10 | E2E BLOCKED | e2e-runner: `authenticatedWorkshopTransition` blocked — sandbox syscall restriction + missing auth bypass env vars; `perf-baseline.md` updated with blockers + owner unblock commands |
| 2026-07-10 | I-6 CLOSEOUT | DEC-01 cleared; e2e re-run with `all` perms → 1 skipped (auth fixtures still ABSENT); type-check + focused unit/DOM green; Phase 4 deferred; **not archived** per pack policy |


## Evidence (VERIFY — 2026-07-10)

| Check | Result |
|---|---|
| `bun run type-check` | exit 0 |
| `bun test tests/unit/reset-baseline.test.ts` | 3 pass, exit 0 |
| `bun run test:dom` (shell governance + reset + cost-inputs + notification + auth-settings + support + proposals gate + estimate loading) | all green |
| `git diff --check` | exit 0 |
| `bun run doctor -- --verbose --scope changed` | exit 0; 1 warning (proposals sequential awaits → fixed with Promise.all) |
| Prod e2e `authenticatedWorkshopTransition` | **proven** — I-7 (2026-07-10): 1 passed (29.2s); transitionMs=**3661ms** (budget ≤10000), prefetchRsc=**1** (budget ≥1), overlayCount=**0**, authMode=dev-auth; auth bypass provisioned in git-ignored `.env.local`, local D1 profile seeded |
| DOC-1 | **proven** — `current-state.md` chrome-ownership entry + rules routing conventions updated |
| WP-3.1 estimates list skeleton | **proven** via page-local Suspense (segment `loading.tsx` intentionally absent — governance) |
| Phase 4 cacheComponents | **deferred_with_rationale** owner-gated (DEC-04); formally classified out-of-scope for this pack's archive criterion on 2026-07-10; Phases 0–3 proven |
| Archive | **ready** — all gates cleared (DEC-01 ack + authenticated e2e numbers proven + DEC-04 deferred) |
| DEC-01 owner ack | **proven** — Philip acked Option 1 (keep nested) 2026-07-10; implementation proceeds on the recommended path |
| I-6 type-check / unit / DOM | **proven** — type-check 0; reset-baseline 3/3; focused DOM 19/19 |
| Archive | **ready** — e2e numbers proven I-7; all archive gates cleared; proceeding to move under `.ai/09_archive/store/` |

### Perf review lanes
- `performance-optimizer` (independent): no P0; applied skeleton `<div>`, noted badge flash tradeoff; YAGNI footer redesign
- `ce-performance-oracle` (independent): P0 wash FOUC → applied SSR `:has()` marker; removed layout content Suspense; footer/badge → `useLayoutEffect`; keep gate blocking (SEC)

### Applied vs YAGNI
| Item | Decision |
|---|---|
| SSR canvas wash via `:has()` | Applied |
| Drop WorkshopShell content Suspense | Applied |
| Footer/badge useLayoutEffect | Applied |
| Skeleton semantic div | Applied |
| Proposals Promise.all | **Skipped** — auth-first ordering required by recipient-proposals-route-gate (doctor warning is intentional fail-closed) |
| Defer auth gate / Suspense gate | YAGNI/unsafe — skipped |
| Seed favorites from home into shell | YAGNI |
| Phase 4 cacheComponents | Owner-gated skip |

