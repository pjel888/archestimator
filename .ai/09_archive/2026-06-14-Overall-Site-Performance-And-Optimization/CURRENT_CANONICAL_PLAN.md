# CURRENT CANONICAL PLAN — Overall Site Performance & Optimization

**This document is the single source of truth for this audit pack.** Where any other file in
this folder (or any older perf plan) conflicts with this one, this one wins.

**Date:** 2026-06-14  ·  **Status:** AUDIT / PLANNING / READINESS ONLY
**Audit basis:** 96 findings, 9 dimensions, live source @ HEAD `3070c46c` (repo advanced to
`4f0ca5ab` mid-session via concurrent agents; key line refs re-verified, unchanged).
**Readiness decision:** **CONDITIONALLY READY FOR CLOSED BETA — not for public launch.**

> ⚠️ **DO NOT implement from stale docs.** Most perceived-speed work in older perf plans is
> already done (route transitions; estimates-list; library; charts; teamspace) or deliberately
> rejected (estimate-editor virtualization). Re-implementing it is negative-value churn. Always
> reconcile against the "Already optimized" section below and `13_RISK_REGISTER_AND_BLAST_RADIUS.md`.
>
> ⚠️ **DO NOT mutate production / provider / database from this plan.** No deploy, promote,
> migration apply, index build, RLS change, env/DNS/secret change, or PITR/Redis enablement may
> happen from this plan without the matching owner gate in `16_OPEN_QUESTIONS_OWNER_GATES.md`.

---

## 1. Executive summary

Archestimator's felt speed is engineered and confirmed; its readiness is asserted from
lab/inference, not proven from field/at-scale evidence. The route-transition layer and the four
2026-06-14 surface plans are landed; production RUM is off (and was removed as a security fix),
the heaviest authed surfaces are unmeasured, the database is unproven at scale, and the only
budgets in the repo are loose smoke tripwires. Closed beta is the correct gate because it
generates the field RUM + at-scale EXPLAIN evidence the lab could not. Full narrative:
`00_EXECUTIVE_SUMMARY.md`.

## 2. Performance posture

**OPTIMIZED (verified landed):** route-transition infra (10 `loading.tsx`, 7 `error.tsx`, 14
`dynamic()` split points, `React.cache` identity/project loaders, hover-intent prefetch); the
four 2026-06-14 surfaces (estimates-list RPC summaries, library dynamic-import JS reduction
618KB→~232KB, charts buckets-only payload, teamspace presence/cursors with `auth.uid`-wrapped
helpers); `proxy.ts` public-route early-return + bfcache `Cache-Control` + share/invite/workshop
hardening headers + CSP (enforced on `/share`); QueryClient tuning (5-min stale/gc, no
refetch-on-focus); `optimizePackageImports` (phosphor) + `experimental.staleTimes`; landing WebGL
(Neat/three) dynamic-gated; analytics single-mount with strong share-link URL redaction;
estimate-sheet keystroke path (profiler-backed; virtualization deliberately rejected).

**UNPROVEN (blocked or unbuilt):** production field RUM (Speed Insights absent + security-removed
— the master gap); all authed/prod live measurement this session (no server, dev-auth off, no
storage state); heavy-route synthetic + at-scale coverage (estimate workspace, charts, project
detail = zero); DB index/RLS benefit (`is_platform_admin` bare `auth.uid()` verified; ~152–182
bare sites; dedicated index plan audit-only; no DB-write seed path → nothing EXPLAIN-measured at
volume); bundle byte budgets (no treemap, no production manifest audit); bfcache persisted-restore
+ production React Profiler (two open manual gates); two corrected migrations (chart-buckets RPC,
sibling-order) unapplied to hosted.

## 3. What is already optimized — do not redo

| Area | Status | Owning plan (do not duplicate) |
|------|--------|--------------------------------|
| Route transitions / loading / error / prefetch / code-split | ✅ Implemented (Phases 0–7 largely done) | `route-transition-performance-optimization/` |
| Estimates list (RPC summaries, `is_workspace_member`, optimistic CRUD) | ✅ Implemented + on prod | 2026-06-14 estimates-list plan (archived) |
| Library (warm TanStack reuse, `staleTimes`, JS 618→232KB) | ✅ P0/P1/P3 done (P2 DB gated) | `2026-06-14-Library-Optimization-Plan/` |
| Charts (buckets-only payload, variance spine) | ✅ Implemented (RPC apply-to-hosted PENDING — G4) | 2026-06-14 charts plan (archived) |
| Teamspace presence/cursors | ✅ Implemented + on prod | 2026-06-14 teamspace plan (archived) |
| Estimate-editor keystroke path | ✅ Profiler-backed; virtualization/`useDeferredValue`/`useOptimistic` REJECTED | estimate unification (archived decision) |
| `proxy.ts` public early-return + getUser() + headers/CSP | ✅ Implemented | route-transition plan |

Full reconciliation matrix (IMPLEMENTED / PARTIAL / SUPERSEDED / STALE / STILL-VALID) is in
`13_RISK_REGISTER_AND_BLAST_RADIUS.md`.

## 4. What remains unproven (the actual work)

1. **Production RUM** — off + security-removed (G1). Master unblock.
2. **Readiness budgets** — none; only smoke tripwires (G3).
3. **Heavy authed surface measurement** — editor/charts/project-detail = zero coverage (G2).
4. **DB at scale** — `is_platform_admin` bare `auth.uid()`; indexes unbuilt; no seed-at-volume (G5).
5. **Hosted migration landmines** — chart-buckets RPC + sibling-order unapplied (G4).
6. **Manual proof gates** — bfcache `persisted=true` + production React Profiler.

## 5. Current speed matrix summary

Full matrix: `03_ROUTE_SPEED_MATRIX.md`; targets/budgets: `11_*` + `evidence/current-budgets.md`.
Headline observed evidence (lab, not field):

| Surface | Observed (lab) | Target (closed-beta) | Status |
|---------|----------------|----------------------|--------|
| Public `/features→/pricing` (warm) | ~179–394ms median | < 300ms | likely OK (re-measure) |
| Public Slow 3G transition | 834–6893ms (high variance) | < 3000ms | needs re-measure |
| `/workshop/projects` (authed, cold) | LCP 3865ms, perf 0.86, server 630ms | LCP ≤ 3000ms | **gap** (1 non-repro run) |
| Authed sidebar nav (warm) | Projects 2325 / Library 2675 / Templates 1857 / Settings 2725ms | < 800ms warm | needs re-measure |
| Estimate editor `[nodeId]` | **unmeasured** | shell < 300ms; data route-specific | **blocked** |
| Charts | **unmeasured** | < 1500ms warm | **blocked** |
| INP (all interactive) | **unmeasured** | < 200ms p75 | **blocked (RUM off)** |

## 6. Top bottleneck themes

1. **Measurement & observability gap** (dominant) — RUM off, no readiness budgets, heavy routes unmeasured.
2. **Server response dominates authed LCP** — transition infra done; TTFB/data (DB+RLS) is the lever.
3. **DB at-scale unproven** — bare-`auth.uid()` RLS overhead + unbuilt indexes + no seed-at-volume.
4. **Public LCP-critical bundle** — landing animation libs + a 2.7MB background image.
5. **Governance/reconciliation** — risk of duplicating or undoing already-landed work.

## 7. Recommended phased plan

Full backlog: `12_OPTIMIZATION_BACKLOG.md`; gated phase plan: `14_IMPLEMENTATION_PHASE_PLAN.md`.

- **P0 — Measurement & Truth:** authed storage-state (G2), `--webpack` treemap + Turbopack manifest audit, heavy-route Lighthouse + `measure-routes` battery, separate smoke vs readiness budgets (G3), "no ready without proof" gates.
- **P1 — No-regret perceived wins:** sidebar-BG WebP/AVIF + orphan-asset cleanup, landing-lib deferral, missing `loading.tsx`/`error.tsx` shells, `next/image` thumbnails, CI import guard, share-event off critical path.
- **P2 — Bundle & hydration:** treemap-driven splits, ExcelJS isolation verify, D3/three isolation proof, icon-import normalize, CSS/font checks.
- **P3 — Data & server:** explicit column projections (67 `select('*')`), wire `get_project_chart_buckets` (G4), `is_platform_admin` initplan wrap + remaining `auth.uid()` wraps (G5), index candidates (G5), server-waterfall + `revalidatePath`/`router.refresh` churn cleanup.
- **P4 — Production/RUM readiness:** wire Speed Insights (G1), route-level RUM + INP, prod-authed Lighthouse, bfcache DevTools proof, React Profiler, realistic seed.
- **P5 — Post-beta scale:** virtualization if proven, search/index expansion, background jobs (export/AI/upload), CDN/image pipeline, observability dashboard, regression budgets in CI (G7).

**Sequencing gate:** no P1+ work on a surface before P0 measurement exists for that surface.

## 8. Readiness gate

Closed beta may proceed with P1 no-regret wins shipped and the owner gates acknowledged. A
**public-launch** "ready" claim requires: field RUM green against the adopted readiness scorecard,
reproducible heavy-route synthetic proof, at-scale `EXPLAIN` evidence, owner-supervised
index/RLS/migration applies, and the two manual gates (bfcache + React Profiler). See
`15_READINESS_DECISION.md`.

## 9. Owner gates

G1 RUM wiring · G2 authed storage-state · G3 readiness scorecard · G4 charts RPC apply · G5 DB
index/RLS applies · G6 irreversible/infra (PITR/Redis/unification) · G7 CI enable · G8
do-not-touch surfaces. Full text + decision log: `16_OPEN_QUESTIONS_OWNER_GATES.md`.

## 10. Concurrent-agent safety (how this pack was produced and must be consumed)

Multiple agents edit this repo simultaneously (HEAD moved during the audit). This pack added
files **only** in its own folder, edited no source, switched no branch, and ran no shared build.
Any implementation that follows must be **small, reversible, validated, and ff-pushed to
`origin/main`** without colliding with the route-transition plan or the four archived surface
plans. See `13_RISK_REGISTER_AND_BLAST_RADIUS.md` → "Concurrent-agent data-safety".
