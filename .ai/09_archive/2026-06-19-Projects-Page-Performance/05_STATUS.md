# Projects Page Performance Status

Date: 2026-06-19. Canonical status for the `/workshop/projects` performance pack.
**Pack closed** by the verify-then-finish loop (see `LOOP_LEDGER.md` →
"Verify-then-finish loop (2026-06-19)"). Every row below is DONE (with a labelled
proof boundary) or DEFERRED (with a one-line reason). Re-verified on HEAD
`2905993a`; the follow-up edits then landed in commits `4e30669d` / `6c8e32f8`
(swept in by a concurrent agent's auto-commit — verified coherent, no work lost).

## Current verdict

Phases 1–3 are implemented, measured, and re-verified. Follow-up hardening and the
owner-authorized lower-value items are now resolved. This pack is **not** a
launch-readiness blocker unless the owner separately makes `/workshop/projects`
LCP a release gate (the one open owner decision — see bottom).

## Status table

| Area | Status | Proof / caveat (label) |
|---|---|---|
| Server data tail (4→2 round-trips) + `cache()` | DONE | `tests/vitest/perf/projects-page-server-parallelism.test.ts` 1/1 on the dom runner (208ms vs ~300ms serial). `local-only`. |
| Card image bandwidth (512px thumbnail + lazy/async) | DONE | Live authed prod capture: 3/3 `<img>` at `naturalWidth=512`, ~15–57 kB each (was ~414 kB). `browser-proven` (local prod build). |
| `next/image` for private covers | REJECTED (correct) | Auth-gated proxy needs the browser cookie; server optimizer fetch can't carry the session. |
| Client render cost (`memo` + `useDeferredValue` + stable callbacks) | DONE | `projects-page-render-baseline` 5/5 — search/sort cause 0 card re-renders. `local-only`. |
| Group-organize memo (`ProjectCardRow`) | DONE + GATED | Already shipped (`projects-page-client.tsx:547`); now regression-gated by render-baseline test `(e)` (one move < N re-renders). `local-only`. |
| `content-visibility:auto` (cards + list rows) | DONE | type-check/build/tests green. Large-list visual spot-check → `manual-proof-pending` (no 100+ fixture; RISK-15). |
| Suspense streaming shell + skeleton parity | DONE | `src/app/workshop/projects/loading.tsx` + `ProjectsListSkeleton`. |
| Modal/popover code-splitting (`next/dynamic ssr:false`) | DONE | `04_FURTHER_OPTIMIZATIONS.md`. |
| `traced()` spans on the 3 query waves | DONE | `workspace-repository.ts:893/991/1072`; no-op unless `PERF_TRACE=1`. Maker/checker: correctness + security clean. `local-only` (type-check + build exit 0). |
| Sidebar favorites `staleTime` 0 → 30s | DONE | `use-sidebar-favorites-query.ts:37` = `30_000`; toggle `invalidateQueries` keeps instant reflect. `local-only`. |
| First-row image `priority`/`fetchpriority` | N/A | LCP element is **text**, not an image (`03_METRICS.md` §4/§7) — shipping it would risk deprioritizing the real LCP element. |
| `select('*')` client-payload trim | DEFERRED | List query already uses explicit `WORKSHOP_PROJECT_LIST_COLUMNS` + strips `workspace_id`/`created_by` client-side; remaining columns' client usage inconclusive and payload win ~20–40 B < drop risk. |
| New speculative DB indexes | REJECTED (correct) | Primary query covered by `projects_workspace_updated_at_idx`; prove-before-apply honored. |
| CI route-transition harness | DONE (patch) | `e2e/route-transition-performance.spec.ts` now injects the dev-auth bypass cookie via guarded `beforeEach`. Live run → `manual-proof-pending` (needs dev server + real secret). |
| Production-representative authed Lighthouse | MEASURED (single run) | §7: prod build + real Supabase session. LCP 4.4–4.9s. `local production-build proof` (NOT hosted). Multi-run → `manual-proof-pending`. |
| Slow-3G | SKIPPED (justified) | Optional; not needed to pick the next lever (LCP is text, so image-priority is N/A regardless). |

## Remaining follow-ups (all resolved/closed)

1. Route-transition spec — DONE (cookie injected); live CI run is `manual-proof-pending`.
2. Slow-3G — SKIPPED (does not decide the next lever).
3. Large-list `content-visibility` spot-check — `manual-proof-pending` (no 100+ fixture; RISK-15).
4. LCP < 3s deep work (main-thread/hydration + serial image-proxy fetches) — out of this
   pack's scope; only actionable if the owner makes LCP a release gate (see below).

## Source-sensitive invariant

P1.1 parallelized authenticated reads. The `traced()` follow-up did **not** touch any
query filter/scope; correctness + security maker/checker review confirmed the RLS/authz
guard in `06_PERCEIVED_PERFORMANCE_ACCEPTANCE.md` still holds (sharedProjects scope,
publication rows, pending-invite scope, favorites/group empty-input behavior all unchanged).

## Open owner decision (the only one)

**Is `/workshop/projects` warm LCP (~4.4s, local prod build) a release gate?** If yes,
the next levers are main-thread/hydration work (TBT ~440ms) and the serial auth-gated
image-proxy fetches (Speed Index ~11s) — a new pack, not this one. If no, this pack is
closed as-is.
