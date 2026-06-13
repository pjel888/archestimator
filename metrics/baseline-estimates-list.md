# Baseline — /workshop/projects/[projectId]/estimates (pre-optimization)

Captured: 2026-06-14, branch `2026-06-14-Estimates-List-Page-Performance-Optimization` (from `main` @ 6e02e061).
Audited project: `22222222-2222-4222-8222-222222222222` (Lewis Residence — 1 estimate / 47 nodes / 5 row-items).

## Environment constraint (why live RUM is session-gated)

Per project memory: the dev-auth bypass is disabled, workshop pages suspend when
the tab is hidden, and a second `next dev` will not start. Live Web-Vitals / HAR /
"create→visible" capture therefore runs **through the user's already-authenticated
Chrome session** against the running dev server. The scaffolding for that capture
ships in this branch (dormant unless flagged):

- `src/lib/perf/server-timing.ts` — `traced()` wraps `listProjectEstimates` (estimates/nodes/rowItems) and `ProjectLayout.summaries`. `PERF_TRACE=1 bun run dev` → one `[perf]` line per server hop.
- `src/components/workshop/WebVitalsProbe.tsx` — mounted in `WorkshopPageShell`. `NEXT_PUBLIC_PERF_TRACE=1` → `[vitals]` lines for FCP/LCP/INP/CLS/TTFB.

Repro commands (run in the user's session):
```
PERF_TRACE=1 NEXT_PUBLIC_PERF_TRACE=1 bun run dev | tee metrics/dev-baseline.log
grep -c '^\[perf\]' metrics/dev-baseline.log            # round-trip count
grep '^\[perf\]' metrics/dev-baseline.log | awk '{s+=$3} END {print s}'  # server think time
```

## Code-derived baseline (audit 01/03 — verifiable without a browser)

| Dimension | Baseline | Evidence |
|-----------|----------|----------|
| Supabase round-trips / cold load | ~22–28 | `01_AUDIT_PERFORMANCE_AND_WATERFALL.md` §b; layout fan-out re-runs `ensureDefaultWorkspace` 3× (F6) + collaboration/publication re-query projects/workspace_members (F7) + page 3 queries |
| Overlay on every in-place CRUD | YES, ≥250 ms min, dismissed by timer not content | `navigation-ui-store.ts` MIN_DISPLAY_MS=250; `useNavigationRouter.refresh()` calls `show("refresh")`; create/duplicate/inline-edit/delete/reset-widths all call `router.refresh()` (F1/F3) |
| Optimistic UI | NONE — every mutation round-trips + full layout+page re-render before visible | `estimates` is an immutable server prop (F2) |
| List query column projection | `select("*")` ships `metadata`/`created_by` to client | `workspace-repository.ts` listProjectEstimates (F9) |
| Summary aggregation | all nodes + all row-items of every estimate folded in JS | listProjectEstimates (F8) — O(all rows), flat-RPC fix in P2 |
| Loading skeleton shape | wrong: sidebar + 2-col grid + right rail (node-route shape) | `loading.tsx` → `ProjectRouteContentFallback` (F4) |
| RLS `auth.uid()` initplan caching | not applied (bare `auth.uid()` per row) | `02_AUDIT_DATABASE.md` §D (F10) |

## Acceptance targets (from 05_MEASUREMENT_METHODOLOGY.md)

round-trips ≤ 8 · server think ↓≥50% · TTFB ↓≥40% · LCP < 2.5s · INP < 200ms ·
CLS < 0.1 · create→visible < 400ms (optimistic) · **no overlay on in-place edits** ·
reset-widths = local only · RSC payload flat in row count · EXPLAIN aggregate/fewer buffers.

After-phase captures: `metrics/p0-*`, `metrics/p2-explain-*.txt`, `metrics/after-*`.
