# Project Charts Page — UX/UI, Performance & Correctness Overhaul

**Route audited:** `/workshop/projects/[projectId]/charts`
**Live URL:** `http://localhost:3000/workshop/projects/22222222-2222-4222-8222-222222222222/charts`
**Date:** 2026-06-14
**Type:** Audit + redesign + implementation plan pack (no product code changed during planning)
**Status:** Implementation-ready after the P-1 data-contract entry gate (`09`)
and the second-pass repair gates (`13`) are represented in tests/evidence.

---

## Why this exists

The user reports the page is "very shit in everything — ux/ui, performance,
EVERYTHING." This pack answers, with file:line evidence, **why** that is true,
**what the page should be instead**, **how to measure the gap objectively**, and
**exactly what to change**, sequenced by felt-impact × risk.

It is built from six independent audit lanes, all grounded in the live code:
performance/waterfall, database/RLS, UX & visual design, data-viz best-practice
research, infosec, and accessibility/responsive. A second-pass codebase review
then tightened the execution gates for stale tests, cache freshness, AI Ask
downstream behavior, design-system primitives, and visual QA (`13`).

---

## The single most important finding (read this first)

**The page does not do its job, and the code to do its job already exists and is
unused.**

`/workshop/.../charts` exists to let an estimator **compare cost estimates for a
project** — which is cheaper, by how much, and *why* (which spaces / categories /
suppliers drive the difference). Instead it renders **N independent donut charts
side by side** with no delta, no variance, no shared baseline, and no narrative.

Meanwhile `src/lib/project-charts/aggregate-project-charts.ts:69-88`
(`buildProjectChartComparison`) and `:357-385` (`buildComparisonRows`) already
compute, per bucket, `leftTotal`, `rightTotal`, `delta`, `deltaPercent`, **sorted
by `Math.abs(delta)` descending** — i.e. "the cost buckets that moved the most,
biggest first." That is the entire insight product, pre-built, and wired to
**zero** components. The UI only calls `buildProjectChartSeries` (the
independent-column path) at `ProjectChartsClient.tsx:85`.

Everything else — the micro-typography, the cramped toolbar, the weak encodings,
the client-side aggregation, the unstable colors — is downstream of that missing
spine. **The redesign is mostly: use the engine that exists.**

The second-order finding: the two chart types on the page (donut by *angle*,
bubble by *area*) are ranks 4 and 5 of 5 on the Cleveland–McGill perceptual
accuracy scale — the two *worst* encodings for "compare magnitudes." See `04`.

The performance problem is real but **latent, not yet biting**: the audited
project has tens of rows, not thousands (`02` §E). The architecture, however,
ships **up to ~1.3–1.6 MB of raw facts** to the browser and aggregates entirely
client-side, with an O(rows × nodes) hot-loop bug — invisible at 5 rows, a wall
at a few thousand line items. Cheap to fix, and the fix (server-side aggregation)
simultaneously closes a data-minimization finding (`05` SEC-1).

---

## Document map

| Doc | Contents |
|-----|----------|
| `00_INDEX.md` | This file — executive summary, prioritized findings, document map |
| `01_AUDIT_PERFORMANCE_AND_WATERFALL.md` | Request waterfall, RSC payload sizing, client-aggregation cost, the per-row Map bug, code-split asymmetry, missing route skeleton |
| `02_AUDIT_DATABASE.md` | The 5 queries, index coverage, RLS `auth.uid()` cost, the `get_project_chart_buckets` RPC design (recursive CTE ancestor walks), LIMIT-truncation integrity, live volume |
| `03_AUDIT_UX_UI_AND_VISUAL_DESIGN.md` | The missing comparison spine, worst-encoding critique, micro-type inventory, hierarchy/IA, layout, color-instability bug, motion, copy, anti-patterns — rated against DESIGN.md + Rams |
| `04_DATAVIZ_RESEARCH_AND_INFORMATION_ARCHITECTURE.md` | Cited best practice: chart selection, dashboard layout, insight-first narrative, accessible viz, interaction; the Top-10 principles driving the redesign |
| `05_AUDIT_INFOSEC.md` | Severity-ranked authZ / data-exposure / headers findings, and what RLS already makes safe (don't chase) |
| `06_AUDIT_ACCESSIBILITY_AND_RESPONSIVE.md` | WCAG 2.2 AA: color-only encoding, contrast, font floor, keyboard, SR, semantics, reflow, touch targets — plus what's already done well |
| `07_MEASUREMENT_METHODOLOGY.md` | Repeatable before/after harness: RSC payload bytes, client aggregation time, INP/LCP, contrast & CVD assertions, Storybook a11y/keyboard, "time to insight" |
| `08_REDESIGN_NORTH_STAR_AND_DESIGN_SPEC.md` | The target page: information architecture, the variance spine, composition view, comparison table, type scale, palette, layout, interaction model, motion, copy |
| `09_IMPLEMENTATION_PLAN.md` | TDD task plan, P-1 entry gate → P0 design spine → P1 charts → P2 perf/DB → P3 a11y → P4 hardening, each independently revertible |
| `10_DECISIONS_AND_OPEN_QUESTIONS.md` | Resolved design decisions + the owner calls required, each with an implementation-unblocking default |
| `11_TRACEABILITY_AND_QA_MATRIX.md` | Finding → task → test → acceptance matrix + adversarial QA scenarios + rollback gates |
| `12_PREIMPLEMENTATION_REVIEW_AND_REPAIR.md` | Independent review synthesis, BLOCK findings, the mandatory entry gate |
| `13_SECOND_PASS_GAP_AUDIT.md` | Additional missing angles found after deeper codebase inspection: stale tests, payload proof, cache freshness, AI Ask, shared primitives, nav naming, visual QA |

---

## Prioritized findings (consolidated)

Severity legend: 🔴 core product / correctness failure · 🟠 felt UX or scaling-cliff · 🟡 hardening / polish.

| # | Finding | Sev | Dimension | Doc |
|---|---------|-----|-----------|-----|
| **C1** | Comparison engine (`buildProjectChartComparison`, delta/variance) is **dead code**; UI shows independent donuts → the page can't do its one job | 🔴 | Product/UX | 03 |
| **C2** | Donut (angle) + bubble (area) are the **two worst encodings** (Cleveland–McGill ranks 4–5) for "compare magnitudes / find drivers" | 🔴 | Design/Viz | 03,04 |
| **C3** | Color assigned by **per-series rank index** (`toBucket`, `aggregate:412-418`) → the *same category is a different color in each column*; palette is not CVD-safe; color is the *sole* chart↔table link (WCAG 1.4.1 Level A) | 🔴 | Correctness/A11y | 03,06 |
| **H1** | Server ships raw facts (≤5000 rows + 1500 nodes + 1000 cat + 1000 suppliers ≈ **1.3–1.6 MB**); 100% of aggregation runs client-side | 🟠 | Perf | 01,02 |
| **H2** | `resolveSpaceBucket`/`resolveCategoryBucket`/`resolveSupplierBucket` rebuild a full lookup `Map` **once per row** → O(rows × dimension); ~7.5 M Map inserts/series in space mode | 🟠 | Perf bug | 01 |
| **H3** | `chartColumns` memo depends on whole `data` object → **all columns fully recompute** on every Group By / estimate / add-chart click | 🟠 | Perf | 01 |
| **H4** | Primary **data rendered at 8–9 px** (callout values, totals, control buttons) — inverts DESIGN.md's hierarchy invariant; 700/600 weights in bubble violate the regular/medium rule | 🟠 | Design/A11y | 03,06 |
| **H5** | No page title, no project/context header, **no entry point** — user lands inside a hairline toolbar of equal-weight toggles | 🟠 | Design/IA | 03 |
| **H6** | `repeat(N, minmax(220px,1fr))` asphyxiates a 720 px donut; **horizontal page scroll** at 3 columns; reflow fails at 320 px (WCAG 1.4.10) | 🟠 | Layout/A11y | 03,06 |
| **H7** | Contrast failures: muted text `#7F7F7F` ≈ 4.0:1 (fails 4.5:1); white-on-fill bubble labels fail; callout connectors `#E5E5E5` ≈ 1.3:1 (fails 3:1) | 🟠 | A11y | 06 |
| **H8** | Bubble nodes not keyboard/SR-focusable, no live region; no `<h1>`, chart columns are unnamed `<section>`s; SVG `role=img` gives one opaque string | 🟠 | A11y | 06 |
| **H9** | All bucket aggregation runs in JS over raw rows — **`get_project_chart_buckets` RPC** opportunity (recursive-CTE ancestor walks); ~100–400× payload cut (same root as H1) | 🟠 | DB | 02 |
| **M1** | `is_workspace_member` (and all chart-path RLS helpers) use **bare `auth.uid()`** not `(select auth.uid())` initplan caching — per-row tax | 🟡 | DB | 02 |
| **M2** | `loadRowFacts` has **no `.order()`** before `.limit(5001)` → on a >5000-row estimate, an *arbitrary* subset is charted and totals silently under-count | 🟡 | DB/Integrity | 02 |
| **M3** | No `charts/loading.tsx`; wrong-shape project skeleton + 250 ms global overlay; thin empty state; cryptic "Large project mode" copy | 🟡 | UX | 01,03 |
| **M4** | Motion threadbare and one-directional; no cross-highlight between slice ↔ table ↔ other estimate | 🟡 | UX | 03 |
| **M5** | Per-row cost facts (qty/unit cost/contingency/supplier) cross the wire when only buckets are needed — data minimization (fixed as a side-effect of H1) | 🟡 | Infosec | 05 |
| **M6** | `/workshop/*` has **no security headers** (no CSP/X-Frame-Options/nosniff) — cross-cutting gap, referenced not owned | 🟡 | Infosec | 05 |
| **M7** | Every donut slice is `tabIndex=0` → ~36 flat tab stops, no roving tabindex; rAF focus-restore is fragile across the remount boundary; remove button at the 24 px floor | 🟡 | A11y | 06 |
| **M8** | Component-library/category/supplier mutations have no explicit charts freshness story; estimate actions revalidate charts, but shared taxonomy/library changes can still stale the page | 🟡 | Correctness/cache | 13 |
| **M9** | AI Ask reads project chart context; the buckets-only/RPC cutover must preserve or version that downstream contract | 🟡 | Downstream | 13 |
| **L1** | Microcopy terse/inconsistent: "Group By/View By", "Suppliers" vs "Space/Category", "Add chart" (mechanic not intent), cryptic large-project note | 🟡 | Copy | 03 |
| **L2** | Hover/active transitions not gated on `prefers-reduced-motion` (AAA, not AA) | 🟡 | A11y | 06 |

**Not a problem (verified safe — do not chase):** cross-workspace BOLA via forged
`projectId` is closed (app gate + `can_access_project` RLS); `searchParams`
`left/right/mode` are allow-set-intersected + whitelisted; raw `source_snapshot`
jsonb is **never** serialized to the client; `component_category_nodes` with no
workspace filter is a **global taxonomy by design**, not a leak; the
`assertRouteErrorSmoke` param is env-gated off in prod; the `.in()/.eq()` filters
are index-covered; `getUser()` (not `getSession()`) is used. (`05`, `02`.)

---

## What "done" looks like (acceptance gate → `07` + `11`)

- A repeatable harness produces **baseline** and **after** numbers for: RSC
  payload bytes, client aggregation ms, INP on the Group By toggle, LCP, and a
  qualitative "time-to-insight."
- **P0** ships the design spine: comparison is the default view (variance bars +
  auto-generated insight sentence, driven by the existing engine), data lifted to
  the 10 px floor / 12 px hero, stable color-by-category, a chart-shaped
  `loading.tsx`.
- **P1** ships the chart system: bubble deleted; donut demoted to an optional
  "share view"; grouped/stacked composition bars; the comparison detail table.
- **P2** ships perf/DB: `get_project_chart_buckets` RPC; raw facts dropped from
  the payload; deterministic order + truncation banner; `(select auth.uid())`
  RLS; cache/freshness and AI Ask downstream contracts are proven — verified by
  EXPLAIN ANALYZE, runtime payload evidence, and targeted regression tests.
- **P3** ships WCAG 2.2 AA: redundant (non-color) encoding, headings/landmarks,
  contrast-fixed tokens, roving tabindex, 320 px reflow, reduced-motion, and the
  DESIGN.md data-viz minimum amendment.
- **P4** references the cross-cutting `/workshop` security-headers ticket and
  verifies the smoke env var is unset in prod.
- Every change has a failing-test-first step and a measured/asserted delta.
  Visual/design claims include Storybook and Playwright artifacts, not only
  prose review.

---

## Quality posture

High confidence after gates, not a bug-free guarantee. The plan is grounded in
file:line evidence across six audit lanes plus the second-pass repair audit in
`13`; it identifies one decisive root cause (dead comparison engine), separates
already-safe non-issues from real work, and converts missing angles into
testable gates. The pack is ready to execute only after P-1 and the `13` repairs
are represented in tests/evidence.
