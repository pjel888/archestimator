# Project Charts Page — Implementation Report

**Date:** 2026-06-14
**Branch:** `2026-06-14-Project-Charts-Page-Improvement-Plan`
**Plan:** `.ai/03_plans/2026-06-14-Project-Charts-Page-Improvement-Plan` (archived on completion)
**Route:** `/workshop/projects/[projectId]/charts`

The charts page now does its one job — **compare cost estimates** — by wiring up
the comparison engine that already existed and was wired to nothing. Independent
donuts are gone; the page is a variance-first cost-comparison surface.

---

## What shipped, by phase

### P-1 — Frozen data contracts (TDD-first)
- `src/lib/project-charts/project-comparison-view.ts` — `ProjectChartComparisonView`,
  built purely from pre-bucketed series (engine-equivalent to
  `buildProjectChartComparison`). Contract + 3-estimate + baseline-override +
  null-delta tests.
- `src/lib/project-charts/bucket-color.ts` — `colorForBucket`, stable CVD-safe
  Okabe–Ito mapping keyed by bucket id. Replaces the per-series rank-index color lie.
- `src/lib/project-charts/build-insight-sentence.ts` — pure insight generator
  (single / two-driver / equal / null-delta → "new").
- `tests/vitest/fixtures/project-charts-golden-master-fixture.ts` + golden-master
  test — locks JS bucket totals/labels/ids/order for all three modes (the equivalence
  baseline a future RPC push-down must reproduce).

### P0 — Design spine
Header band + auto insight sentence; variance **dumbbell** spine (position-on-shared-
scale; direction via success/danger + arrow + sign — never color alone); type scale
≥10px HTML / ≥11px SVG, no 700/600 weights; stable color; control row using the new
shared `SegmentedControl` (roving tabindex); `charts/loading.tsx`; real empty/low
states; per-row `Map` hoisted out of the aggregation hot loop (O(rows×nodes)→O(n));
nav reframed **Charts/pie → Compare/bar icon**.

### P1 — Chart system
100%-stacked composition bars; comparison detail table (per-estimate Cost/Share +
Δ/Δ%, stable id for `aria-describedby`, focusable rows = the keyboard/SR surface);
donut demoted to a dynamic-imported single-estimate **Share view**; **bubble chart
deleted** (removes `d3-hierarchy` from the bundle); shared `activeBucketId`
cross-highlight + click-to-pin. `/share` donut path unchanged (determinism test green).
Waterfall/bridge (P1.5) intentionally deferred per the plan's time-box — the dumbbell
satisfies the core comparison job; noted as future headroom.

### P2 — Performance & database
Aggregation moved **server-side** in the repository (the PERF-2 repository-reduce
option). The payload is now pre-bucketed series, not raw facts — closing the
data-minimization finding (SEC-1/M5). Runtime payload contract test: a 5,000-row
synthetic fixture serializes to **~10 KB** (< 50 KB budget) with no raw fact arrays
(evidence: `payload-contract-evidence.json`). Deterministic `.order('id')` before
truncation + honest "totals incomplete" banner; global-taxonomy invariant documented;
cache-freshness regression test (labels derive from live facts + dynamic route);
AI Ask `projectCharts` contract hardened (compact buckets, no raw facts).
`get_project_chart_buckets` RPC shipped as a **ready migration**
(`supabase/migrations/20260614021500_get_project_chart_buckets_rpc.sql`) for a future
push-down; the repository keeps the proven JS reduce until the RPC is golden-master
proven and probed on deploy (fail-open on partial drift, per the add-new-tab lesson).

### P3 — Accessibility (WCAG 2.2 AA)
DESIGN.md **Data visualization** amendment (11px SVG / 10px control floor; table as
zoom-safe text alternative; Okabe–Ito data-viz palette exception). New
`--muted-foreground` token (#6b6b6b ≈ 5.3:1) defined deterministically; donut callout
connector darkened to ~3.2:1. Redundant non-color encoding (cue letters + labels) so
chart↔table mapping survives grayscale; single `<h1>`; named chart regions +
`aria-describedby` → the table; roving tabindex on the segmented group; responsive
stacking (no fixed 220px columns, no horizontal page scroll); reduced-motion gating on
all transitions.

### P4 — Cross-cutting (referenced, not owned)
- **Security headers** (`05` SEC-2 / P4.1): `/workshop/*` still lacks CSP /
  X-Frame-Options / nosniff. Cross-cutting, shared with the estimates/library plans —
  referenced here, owned by the shared headers ticket.
- **Route-error smoke env** (`05` SEC-5 / P4.2): `assertRouteErrorSmoke` is env-gated
  by `ARCHESTIMATOR_E2E_ROUTE_ERROR_SMOKE`; confirm it is unset in prod/preview at
  deploy time. Ops check, no code change.

---

## P-1.9 — Downstream consumer inventory

| Consumer | Contract after cutover |
|---|---|
| `ProjectChartsClient` | Consumes the pre-bucketed `seriesByEstimateId` via `buildProjectChartComparisonView`. No raw facts. |
| Route loader `charts/page.tsx` → `getProjectChartsData` | Returns buckets-only `ProjectChartsData` (no row/node/category/supplier fact arrays). |
| AI Ask `src/lib/ai/read-context.ts` (`readAskProjectChartSummary`) | **Unchanged path** — builds facts internally, emits only `compactChartBuckets`. Test hardened to assert no raw facts leak. |
| `/share/[token]` donut (`CostDonutChart`) | Unchanged compact path; only the callout-connector contrast + reduced-motion gating changed; determinism test green. |
| Future RPC consumer | `get_project_chart_buckets` ready; equivalence is a deploy-time golden-master/EXPLAIN gate. |

---

## P2.6 / D-9 — Coordinated RLS change (referenced)

The `(select auth.uid())` InitPlan wrap for `is_workspace_member` and its five
sibling helpers (`is_workspace_admin`, `is_platform_admin`, `can_access_estimate`,
`can_edit_estimate`, `current_project_access_rank`) is a **repo-wide, security-critical
change shared with the estimates and library plans**. Per D-9 it must be applied once,
not three times. This plan deliberately does **not** author or apply that migration to
avoid duplicate/conflicting RLS rewrites across concurrent agents. Recipe for the
single coordinated migration: wrap each helper's `auth.uid()` → `(select auth.uid())`,
verify with `EXPLAIN (ANALYZE)` before/after on the row-items query, and confirm the
Supabase `auth_rls_initplan` advisor clears.

---

## Evidence

| Claim | Evidence |
|---|---|
| Buckets-only payload, no raw facts, < 50 KB | `payload-contract-evidence.json` — 10,101 bytes for 5,000 rows; `tests/vitest/project-charts-payload-contract.test.ts` |
| Comparison engine wired + insight/variance correct | `tests/vitest/project-charts-{comparison-view,ui}.test.*` |
| Stable CVD-safe color | `tests/vitest/project-charts-bucket-color.test.ts` |
| Aggregation correctness locked (RPC equivalence baseline) | `tests/vitest/project-charts-golden-master.test.ts` |
| AI Ask compact context, no raw facts | `tests/vitest/ai-ask-read-context.test.ts` (P2.9 block) |
| Cache freshness | `tests/vitest/project-charts-cache-freshness.test.ts` |
| Redundant encoding + h1 + chart↔table assoc + roving tabindex | `tests/vitest/project-charts-a11y.test.tsx` |
| `/share` donut unchanged | `tests/vitest/share/cost-donut-chart-hydration.test.tsx` |
| Nav reframe + bubble deletion + donut dynamic | `tests/vitest/project-dashboard-charts-ui.test.ts` |
| Design-system compliance | `bun run lint:design-system` clean for all charts files |
| Type safety | `bun run type-check` → 0 errors |
| Visual-QA harness | `src/stories/charts/project-cost-comparison.stories.tsx` (provider-free state matrix) |

---

## Residual risk / not done in this cycle (honest)

- **Browser-rendered visual QA** (Playwright screenshots, Storybook a11y-addon run,
  live INP/LCP, 320px/400% manual reflow, VoiceOver/NVDA): the provider-free story
  matrix exists as the harness, but the actual screenshot/a11y-addon run requires a
  browser environment (dev-auth disabled here). These are deploy/CI verification steps.
- **RPC live apply + EXPLAIN/advisor**: the RPC is a ready, golden-master-aligned
  migration; live apply + EXPLAIN is a deploy-time gate. The shipping path is the
  proven server-side JS reduce.
- **P1.5 waterfall/bridge** alternate variance form: deferred per the plan's time-box.
- **Pre-existing, out-of-scope:** `lint:design-system` reports 18 violations in
  `ProposalExportPreviewDialog.tsx` (owned by the spreadsheet-export plan) that exist
  on the base commit and were not touched here.
