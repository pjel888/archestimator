---
title: "Project Data Page — Donut-First Redesign: Implementation Guide (Codebase-AI Authoritative)"
date: 2026-06-22
route: /workshop/projects/[projectId]/data
status: code-verified-guide
execution: knowledge-work
supersedes_errors_in: [00-PLAN.md, 03-COMPONENT-AND-FILE-PLAN.md, 04-DATA-AND-ROUTE-CONTRACT.md, 06-TEST-AND-VERIFICATION-PLAN.md]
audit: 6-agent codebase verification + reconciliation (2026-06-22); ~88% of raw plan claims verified, 5 must-fix points corrected here. Adversarial review pass applied 2026-06-22 (corrected: per-column delta derivation §12, DropdownSelect placeholder type §11.2, Plus import path, a11y test coverage §13.3, board→callback wiring §11.3, zero-sheet EmptyState).
---

# 08 — Implementation Guide (Codebase-AI Authoritative)

> **Read this first.** This is the single source of truth for *how* to implement the
> donut-first Project Data redesign. It is grounded in a 6-agent codebase audit
> (2026-06-22) that verified every contract claim in `00`–`07` against the live
> code with `file:line` evidence, then reconciled the findings. Where the raw
> plan docs (`00`–`07`) disagree with the code, **this guide wins** — the
> disagreements are listed explicitly in §6 and §13. Anchor lines are point-in-time;
> re-grep before editing (lines drift under active commits, but the grep recipe is
> stable).

---

## 0. How to use this document

1. **§1–§3** orient you (verdict, goal, SWOT). Read once.
2. **§4 (layer cake)** tells you what you may touch vs. what is frozen. Memorize the frozen list.
3. **§6 (corrections)** is the delta between the raw plan and reality. Apply these *instead of* the plan's wording wherever they conflict.
4. **§10 (phased plan)** is the build order — a 5-commit stack that stays green at every commit. Follow it.
5. **§11–§12** are the component specs + the per-column data derivation cookbook (copy-pasteable, with all guards).
6. **§13 (test plan)** tells you exactly which tests to update/add/delete/keep-green, with the harness pattern.
7. **§14–§15** are the gates and the Definition of Done. Don't merge until every DoD box is checked.

**Proportional graph policy (per `AGENTS.md`):** this is a UI-surface change with a
frozen external contract — `rg` + targeted reads are the right tools. Reach for the
code-review-graph / GitNexus only for the broad "who imports the orphans?" sweep
(already done in the audit; see §13). Do **not** run a full graph re-index for this work.

---

## 1. Executive summary + audit verdict

**Feature.** Replace the dense `[9px]` comparison table on
`/workshop/projects/[projectId]/data` with a row of **self-contained estimate columns**,
each crowned by its own `CostDonutChart` + its own breakdown list, plus a rightmost
**`+` tile** that adds the next estimate column (cap 3 total). Delete the 4 orphaned
project-data sections + their 3 UI tests; update the 2 governance-test files.

**Audit verdict: `plan-mostly-accurate-with-fixes` (~88% of claims hold as-written).**
The consumed-unchanged engine layer, the route-state contract, the deletion-safety map,
and the test-harness patterns are all verified accurate. The plan breaks down on **five
concrete points** the implementer MUST correct before writing code:

| # | Plan said | Reality | Fix |
|---|-----------|---------|-----|
| 1 | `ProjectDataRouteSummary` has **8** fields | **11** fields — plan omits `projectId`, `projectName`, `costAcrossSheetsMode` (last is load-bearing at >20 sheets) | §6.1 |
| 2 | `DeltaBadge` is a reusable primitive | **Local non-exported function** inside `CostComparisonBoard.tsx:452`; not importable | §6.2 (extract first) |
| 3 | `MAX_COMPARE_COLUMNS` is the shared client+board cap | **Board-only** (4 call sites); client hardcodes `2` separately | §6.5 (preserve split) |
| 4 | Companion test edits are aspirational | **Mandatory in the same commit** as the deletions or `vitest` crashes at module load (`fileParallelism:false`) | §7, §13 |
| 5 | `onChange` callbacks; options have `id` | Callbacks are **`onValueChange`**; `DropdownSelectOption` has **no `id`** (index by `value`) | §6.6 |

Plus 6 more implementation corrections (§6.7–§6.12) and 8 test corrections (§13).
**None require re-planning** — all are fixable in-guide.

---

## 2. Goal & owner decisions (reference: `README.md`, `00-PLAN.md`)

**Owner's directive (verbatim, `README.md:24`):** *"this is supposed to be the main
data visualization for the page… make users know and understand the cost of the project
through the estimates… a donut chart per estimate/div… a + button on the rightmost side
(similar to the expand/collapse sidebar button) which adds another field for estimate 002
in order to compare them side by side… right now it's bad and the ux is non existent… you
can even delete all of it."*

**Owner decisions (2026-06-21, locked):**
1. **Breakdown is per-column.** Each estimate column is self-contained — its own donut +
   its own breakdown list. **No shared comparison table** beneath the columns. Each donut's
   accessible text alternative is its own in-column list (`aria-describedby`).
2. **Delete the 4 orphaned sections** (`CostBreakdownSection`, `CostAcrossSheetsSection`,
   `ProjectDataInsightHeader`, `CostLedger`) + their 3 UI tests in this PR, and update the
   2 governance-test files that read them.

**Design principle (from `README.md:44`, `02-TARGET-UX-AND-LAYOUT.md:122`):** *one surface,
one shadow* (paper panel floats on grey canvas; inside stays flat). Data-viz amendment:
SVG chart text floor `11px`; the **data list is the zoom-safe / screen-reader surface** —
every donut is `role="img"` pointing at its list via `aria-describedby`. Categorical hues
come **only** from `colorForBucket` (Okabe–Ito), applied as inline `fill`/`backgroundColor`,
never Tailwind classes.

> ⚠️ **`DESIGN.md` is not in the repo** (confirmed absent, 2026-06-22). The plan references
> it heavily, but the rules it quotes (11px floor, `aria-describedby`, 3px radius, Okabe–Ito
> via `colorForBucket`, motion-reduce) are enforced by **real code** (`CostDonutChart`,
> `colorForBucket`) and by the **governance tests** (`project-dashboard-charts-ui.test.ts`).
> Treat those rules as binding because the *code + tests* bind them — do not grep for a
> `DESIGN.md` file.

---

## 3. SWOT analysis

### Strengths
- **Mature reusable primitives already proven on a sibling surface.** `CostDonutChart`,
  `colorForBucket`, `collapseProjectChartBuckets`, `buildProjectChartComparisonView` are all
  live on the `ProjectChartsClient` "share view" — the redesign rides them unchanged.
- **Frozen external contract isolates blast radius.** Board props signature, URL contract,
  and the data payload are all preserved → server route, repository, and route-state are untouched.
- **Pure client-side.** No DB/RLS/auth/security/data-integrity blast → verification is
  proportional (vitest + tsc + build; browser proof opt-in only).
- **Clear, verified anchor map.** This guide gives `file:line` for every symbol the work touches.
- **Beneficial side effect.** Deleting `CostBreakdownSection` removes an eager-d3 import
  site, partially auto-resolving a stale perf-plan item (R-12; out of scope to claim here).

### Weaknesses
- **Raw plan had 5 material inaccuracies** (§1 table) — a naive implementer following
  `00`–`07` verbatim would hit compile/runtime breaks.
- **`DeltaBadge` is local** → extraction is a prerequisite for the per-column delta badge
  (§6.2), adding a small refactor step.
- **`MAX_COMPARE_COLUMNS` is duplicated** (board 3 / client 2) — a latent inconsistency
  the rewrite must not worsen (§6.5).
- **a11y test is ~10 `it` blocks, not 1.** The plan's "UPDATE" only enumerates test #1; the whole
  `describe` block shares the old controls (§13.3).
- **Label-format coupling.** Several a11y assertions depend on exact rendered strings
  (`'Tender Estimate (EST-002)'`, `'Remove … from comparison'`, `'Major C Delta'`); a new
  label format churns them (R-10).

### Opportunities
- Cleaner per-column UX that matches the owner's mental model and the "main data viz" intent.
- Removes the 8–10px-text / 2px-bar hostility of the current board (`01-CURRENT-STATE-AUDIT.md:47`).
- Sets up future space-mode drill-down via `ProjectChartBucket.sourceNodeId` (currently unused on this surface).
- Consolidates guidance on the two parallel bucket structs (R-01).

### Threats
- **`vitest` `fileParallelism:false`** → one module-load crash (e.g. `readFileSync` on a
  deleted file) kills the **entire** suite, not just affected tests. Deletion ordering is a
  hard blocker (§7, B-1).
- **Controlled/uncontrolled `CostDonutChart` misuse** (R-08) → hover-dim desync.
- **`rollup.totalCost` under `kind:'mixed'`** reads `undefined` if summed unconditionally (R-05).
- **`costAcrossSheetsMode: 'totals-only'` at >20 sheets** — a cross-sheet chart that ignores
  it regresses perf + visuals on large projects (R-07).
- **Stale perf-plan anchors** (`CostBreakdownSection.tsx:5`) become dead after deletion and
  could mislead future work (R-12; flagged, out of scope).

---

## 4. The layer cake — what is FROZEN vs. what CHANGES

> **The single most important table in this guide.** If a layer is FROZEN, do not touch it.
> The redesign's low risk profile depends entirely on respecting this partition.

### 4.1 FROZEN layers (do NOT edit)

| Layer | File | Why frozen |
|-------|------|-----------|
| Server route | `src/app/workshop/projects/[projectId]/data/page.tsx` | Same `ProjectDataClient` + same summary. |
| Error boundary | `src/app/workshop/projects/[projectId]/data/error.tsx` | Untouched. |
| Repository | `src/lib/repositories/project-data-repository.ts` | Payload already has everything (§5). |
| Route state | `src/lib/workshop/project-data-route-state.ts` | URL contract preserved (§4.3). |
| Charts engine | `src/lib/project-charts/*` | Consumed unchanged (§5). |
| Shared donut | `src/components/charts/CostDonutChart.tsx` | Used via existing props (§5). |
| Client shell | `src/components/workshop/project-data/ProjectDataClient.tsx` | **Call-site props identical** — the board rewrite keeps the exact prop signature (§4.2). |
| `/charts` redirect | `src/app/workshop/projects/[projectId]/charts/page.tsx` | Untouched (note: it's a 307/308, not 302 — §6.11). |

### 4.2 FROZEN contract: `CostComparisonBoardProps` (10 fields — preserve verbatim)

`src/components/workshop/project-data/CostComparisonBoard.tsx:35-46`. `ProjectDataClient`
mounts the board with this **exact** contract (`ProjectDataClient.tsx:102-113`):

```ts
type CostComparisonBoardProps = {
  className?: string;
  summary: ProjectDataRouteSummary;
  baselineEstimateId: string | null;
  compareEstimateIds: string[];
  groupingMode: ProjectChartGroupingMode;
  activeBucketId: string | null;
  onBaselineChange: (estimateId: string) => void;
  onCompareEstimateIdsChange: (estimateIds: string[]) => void;
  onGroupingModeChange: (mode: ProjectChartGroupingMode) => void;
  onActiveBucketChange: (bucketId: string | null) => void;
};
```

The rewrite **keeps this export name and prop type byte-for-byte** so `ProjectDataClient`
is untouched. All the donut-first machinery is internal.

### 4.3 FROZEN contract: URL / query params

`sheet` (baseline) · `compare` (comma list; `none` = explicit no-compare; absent = `null` =
auto-pick) · `mode` (grouping; absent = `category`; only `space|category|supplier` accepted).
Legacy `left`/`right` are **read** as fallback (`project-data-route-state.ts:23-26`) and
**stripped on write** by the client on the first interactive `replaceQuery`
(`ProjectDataClient.tsx:44-45`). **No server redirect exists** — `left`/`right` persist in
the address bar until first interaction (status quo; do not add a redirect — §9 Q4).

### 4.4 DELIBERATELY-CHANGED contracts (update code AND tests together)

> ⚠️ The audit's `must_preserve` list flagged these as "asserted in tests today." They are
> **deliberately changed** by this redesign, not preserved. Both the code and the test
> assertions move together.

| Contract | Old | New | Tests to update |
|----------|-----|-----|-----------------|
| Shared table id | `<table id="project-data-cost-comparison-table">` | **Removed** (no shared table; each donut has its own breakdown list) | `project-data-a11y.test.tsx:34-37` → assert absence; `project-dashboard-charts-ui.test.ts:46` → `.not.toContain` |
| Page `<h1>` text | `"Cost comparison"` | `"Cost breakdown"` (count stays exactly 1) | `project-data-a11y.test.tsx:30` |
| "Add sheet to compare" combobox | `DropdownSelect` forced to `""` | **`+` tile** (`AddEstimateColumn`) | `project-data-a11y.test.tsx:33` + governance board-contract block |
| "Baseline estimate sheet" combobox | baseline `DropdownSelect` | per-column **swap** `DropdownSelect`(s) | `project-data-a11y.test.tsx:32` + governance block |
| Board source strings | `"Cost comparison"`, `"Baseline estimate sheet"`, `"Add sheet to compare"`, `"project-data-cost-comparison-table"` | `CostDonutChart`, `EstimateColumn`, `AddEstimateColumn`, `collapseProjectChartBuckets`, `buildProjectChartComparisonView`, `buildInsightSentence`, `"Cost breakdown"` | `project-dashboard-charts-ui.test.ts:43-46` → new contract |

---

## 5. Verified reuse inventory (do not reinvent)

Every asset below was confirmed live with the stated API. **Import paths and names are exact.**

| Asset | Location | API you consume |
|-------|----------|-----------------|
| `buildProjectChartComparisonView` | `src/lib/project-charts/project-comparison-view.ts:136` | `({estimates, seriesByEstimateId, groupingMode, estimateIds, baselineEstimateId?})` → `{insight: ProjectChartComparisonInsightInput\|null, buckets: ProjectChartComparisonViewBucket[]}`. Each bucket has `perEstimateTotals`, `perEstimateShares`, `baselineTotal`, `comparandTotal`, `delta` (=comparand−baseline), `deltaPercent: number\|null`. **`insight` is `null` unless ≥2 estimates** — guard it (R-02). |
| `collapseProjectChartBuckets` | `src/lib/project-charts/aggregate-project-charts.ts:442` | `(buckets: ProjectChartBucket[], topBucketLimit = 8): ProjectChartBucket[]`. Synthesized "Other" bucket sets `isOther:true`. This is the exact helper the sibling `ProjectChartsClient` uses (`:116`). |
| `colorForBucket` | `src/lib/project-charts/bucket-color.ts:67` | `(bucketId: string): string` → Okabe–Ito `#RRGGBB`, or `#9AA0A6` for `__other__`. Stable per bucket → cross-column visual identity. |
| `formatChartMoney` / `formatSignedChartMoney` / `formatChartShare` / `bucketCueToken` | `src/lib/project-charts/format.ts:3,11,17,25` | Money/share formatting. |
| `buildInsightSentence` + `formatDeltaPercent` | `src/lib/project-charts/build-insight-sentence.ts:23,70-79` | `(insight) → {sentence, direction}\|null`. **`formatDeltaPercent` lives HERE, not in `format.ts`** (R-03). |
| `CostDonutChart` | `src/components/charts/CostDonutChart.tsx:11-47` | `'use client'`. Required: `buckets, total, currencyCode, label`. Optional: `hideCallouts?, compact?, activeBucketId?, onActiveBucketChange?, describedById?`. SVG: `data-testid="d3-donut-chart"`, `role="img"` (`:374,377`); each slice `path` has `tabIndex={0}` + `aria-label` + `motion-reduce` (`:393,397,398`). Passing `activeBucketId` makes it **controlled** — don't mix patterns per instance (R-08). |
| `SegmentedControl` | `src/components/ui/segmented-control.tsx:16-38` | `options: {value, label, ariaLabel?}[]`, `value`, **`onValueChange`** (NOT `onChange`). Requires `ariaLabel`; single-select only. |
| `DropdownSelect` + `DropdownSelectOption` | `src/components/ui/dropdown-select.tsx:34-68` | Option = `{value, label, disabled?, icon?}` — **NO `id`**. Controlled via `value`; callback **`onValueChange`**. Plus `placeholder?, disabled?, aria-label/aria-labelledby`. |
| `Banner` | `src/components/ui/banner.tsx:5-12` | `tone/title/description/actions/onDismiss/icon`. |
| `EmptyState` | `src/components/ui/empty-state.tsx:4-10` | `icon/title/description/action/className`. |
| `Button` | `src/components/ui/button.tsx:18-22` | `variant/size/children` + native button attrs. |
| `ADD_BUTTON_CLASSNAME` | `src/components/ui/toolbar-icon-button.tsx:21-25` | Named string export = `"bg-orange-100 text-orange-700 hover:bg-orange-200 hover:text-orange-800 focus-visible:bg-orange-200 focus-visible:text-orange-800 cursor-pointer"` (estimate-sheet light-orange Add affordance). |

### Type imports (get these right — §6.3, §6.9)

```ts
// Engine-emitted bucket — use THIS for donut/comparison data, NOT CostBucket
import type { ProjectChartBucket, ProjectChartGroupingMode } from "@/lib/project-charts/types";
//                                  // ProjectChartGroupingMode = "space" | "category" | "supplier" (NO "composition")
import type {
  ProjectDataRouteSummary,   // 11 fields (§6.1)
  ProjectDataEstimateSheet,  // {id,name,sheetCode: string|null, currencyCode, updatedAt: string|null, rowCount, totalCost}
  ProjectDataRollup,         // discriminated union kind:'single' | 'mixed' (§6.8)
} from "@/lib/repositories/project-data-repository";
```

> **Do not** import `CostBucket` from `@/lib/charts/types` for donut data — it lacks
> `sourceNodeId` and is the parallel struct reserved for the workshop-donut/share-receiver
> surface (R-01). `CostDonutChart` accepts either structurally, but type your data as
> `ProjectChartBucket` to match the engine.

---

## 6. Corrections to the raw plan (apply INSTEAD OF the plan's wording)

### 6.1 `ProjectDataRouteSummary` is an 11-field type, not 8
`src/lib/repositories/project-data-repository.ts:23-35`. The plan's 8 fields are all correct;
it **omits** `projectId: string` (`:24`), `projectName: string` (`:25`), and
`costAcrossSheetsMode: "stacked" | "totals-only"` (`:32`). The last is **load-bearing**: it
switches to `'totals-only'` at **>20 sheets** (`:82`). If the redesign renders any cross-sheet
cost chart, it MUST read `costAcrossSheetsMode` and suppress stacked rendering when
`'totals-only'` (R-07). (The per-column donut-first design has no cross-sheet chart, so this
is mostly defensive — but type against the full 11-field shape.)

### 6.2 `DeltaBadge` is NOT importable — extract it first (P0)
`CostComparisonBoard.tsx:452-475` — `function DeltaBadge({delta, baselineTotal, currencyCode, compact=false})`, **no `export`**. Non-baseline `EstimateColumn`s need delta badges, and
`EstimateColumn` is a new file → you cannot import `DeltaBadge` today.

**Default decision (§9 Q3):** extract to `src/components/ui/delta-badge.tsx` as commit 1 (P0).
When extracting, audit the exact imports `DeltaBadge` uses at `:452-475` and move the **local**
helpers with it. Known coupling: `formatSignedChartMoney` is exported from `format.ts` (keep
importing it from there); `formatSignedShare` and `cn` may be local to the board — move the
local ones into `delta-badge.tsx` (or a shared util). Update `CostComparisonBoard.tsx` to
import the extracted `DeltaBadge`. **This is a pure refactor — the board renders identically
and all tests stay green.**

### 6.3 Type donut data as `ProjectChartBucket`, not `CostBucket`
See §5. The engine (`collapseProjectChartBuckets`, `buildProjectChartComparisonView`) emits
`ProjectChartBucket` (`src/lib/project-charts/types.ts:99-108`), which carries
`sourceNodeId?: string|null` for space-mode drill-down. `CostBucket`
(`src/lib/charts/types.ts:9-17`) lacks it.

### 6.4 `formatDeltaPercent` import source
Import from `@/lib/project-charts/build-insight-sentence` (`:70-79`), **not** `format.ts`.
`formatChartMoney/formatSignedChartMoney/formatChartShare/bucketCueToken` come from `format.ts`.
(Existing consumers `ProjectComparisonTable.tsx:5` and `ProjectVarianceSpine.tsx:7` confirm.)

### 6.5 `MAX_COMPARE_COLUMNS` reconciliation — preserve the split, don't hoist
There is **no shared cap constant.** `MAX_COMPARE_COLUMNS = 3` lives only in
`CostComparisonBoard.tsx:31` (4 call sites: `:31,76,136,488`). The client's
`normalizeCompareIds` hardcodes `2` (`ProjectDataClient.tsx:133`), and the board's add-sheet
handler slices to 2 (`CostComparisonBoard.tsx:135`). With 1 baseline, max display = 3 ⇒ up to
2 compare slots, so they **agree in effect today**.

**Default decision (§9 Q1):** **preserve the current split as-is** (baseline + 2 compare = 3
total). Do **not** hoist `MAX_COMPARE_COLUMNS` into the client in this PR — it would break the
must-stay-green `project-data-repository.test.ts` compare-cap=2 assertions. Add a `// TODO:
duplicated cap — see ProjectDataClient.tsx:133` comment at **both** sites for future cleanup.
When rewriting the board's add-column handler, keep the `slice(0, 2)` semantics (or
`MAX_COMPARE_COLUMNS - 1`).

### 6.6 `onValueChange` (not `onChange`); no `id` on options
`DropdownSelect` and `SegmentedControl` both use **`onValueChange`**. `DropdownSelect` is
controlled via **`value`** (not `defaultValue`). `DropdownSelectOption` has `{value, label,
disabled?, icon?}` — **no `id`**; index by `value`. Wiring `onChange` is a silent no-op (R-09).

### 6.7 Guard every `seriesByEstimateId` lookup
The repo loads series **only** for `selectedEstimateId` + `compareEstimateIds`
(`project-data-repository.ts:67`), not all sheets; `seriesByEstimateId` can be `{}` when
`chartsData` is null (`:81`). **Always** use:
```ts
const modeSeries = summary.seriesByEstimateId[estimate.id]?.[groupingMode];
const buckets = modeSeries ? collapseProjectChartBuckets(modeSeries.allBuckets, 8) : [];
const total = modeSeries?.total ?? estimate.totalCost;
```
Never index without optional chaining (R-04).

### 6.8 Branch on `rollup.kind` before reading `totalCost`
`rollup` is `{kind:'single', currencyCode, totalCost} | {kind:'mixed', currencyCodes}`
(`project-data-repository.ts:19-21`). Under `'mixed'` there is **no** `totalCost`. For the
header rollup display, branch: `'single'` → show `totalCost`; `'mixed'` → show the
`currencyCodes` list + the mixed-currency `Banner` (R-05).

### 6.9 `sheetCode` and `updatedAt` are nullable
`ProjectDataEstimateSheet` (`project-data-repository.ts:9-17`): `sheetCode: string | null`,
`updatedAt: string | null`. Handle `null` in the column UI (e.g. secondary text falls back to
sheet name only). Field **names** are frozen.

### 6.10 Legacy `left`/`right` are NOT stripped on page load
The resolver only **reads** them (`project-data-route-state.ts:23-26`); the **client** strips
them via `params.delete` on the first interactive `replaceQuery` (`ProjectDataClient.tsx:44-45`).
No server redirect exists. Do not assume a canonical URL at SSR (§9 Q4 — accept status quo).

### 6.11 `/charts` redirect is 307/308, not 302
`charts/page.tsx:21` calls `next/navigation`'s `redirect()`, which the App Router renders as
**307 (GET) / 308 (POST)**, not 302. Behavior (redirect to `/data` preserving query) is correct;
only the status-code label in the plan was imprecise. No code change.

### 6.12 Design/AA/Tailwind gotchas (from project memory — bake in)
- **`#7F7F7F` `tertiary` fails WCAG AA** (4.00:1 on white). For **load-bearing** meta in the
  column (sheet code, "line items", dates), use **`text-secondary` (`#5D5D5D`, 6.0:1)**, not
  `text-tertiary`. Reserve tertiary for genuinely decorative/icon-tint use.
- **Tailwind arbitrary CSS-var color needs the `color:` hint.** If any swatch/chrome fill ever
  points at a `var()` (it shouldn't — categorical color is inline `fill`/`backgroundColor` via
  `colorForBucket`), use `bg-[color:var(--x)]`, **not** `bg-[var(--x)]` (the latter silently
  emits no color). The current design uses inline styles, so this is a guardrail, not a fix.

---

## 7. Blockers & ordering constraints (hard)

| ID | Blocker | Must resolve before |
|----|---------|---------------------|
| **B-1** | Convert the **4 orphan fixture reads** `readFileSync → readOptional` (`tests/vitest/project-dashboard-ui-fixtures.ts:35-38`) in the **same commit** as the 4 orphan-file deletions. `readFileSync` throws `ENOENT` at module load on a missing file; `project-dashboard-ui-fixtures.ts` is imported transitively; `fileParallelism:false` → **entire vitest suite crashes**, not just affected tests. | Deleting any of the 4 orphan `.tsx` files. **Order: edit fixtures → delete files → `bunx vitest run`.** |
| **B-2** | Rewrite the governance KEEP-test block (`project-dashboard-charts-ui.test.ts:38-54`) in the same PR as the deletions. After `readOptional` returns `""`, the 4 `.toContain` assertions (`:49-52`) fail → rewrite to `.toBe("")`. **Preserve** the `ProjectVarianceSpine` negative at `:53` `expect(projectDataClient).not.toContain("ProjectVarianceSpine")` (the plan's verbatim quote omitted it). | PR marked complete / CI green. |
| **B-3** | If `CostComparisonBoard.tsx` is renamed/moved, update the fixture path `projectDataComparisonBoard` (`fixtures:34`, `readFileSync` of the KEPT file) in the same commit. (Default: do **not** rename — keep the filename.) | Any rename/move of the board file. |
| **B-4** | `DeltaBadge` extraction (§6.2) MUST land before any new file outside the board renders a delta badge. Writing `import { DeltaBadge } from "@/components/ui/delta-badge"` before extraction = compile break. | Authoring `EstimateColumn.tsx` (which renders non-baseline deltas). |

**Coupling rule:** steps that delete files + the tests/fixtures that read them are ONE atomic
unit. The phased plan (§10) sequences them so the repo compiles and the suite is green at
**every** commit.

---

## 8. Risk register

| ID | Risk | L | Impact | Mitigation |
|----|------|---|--------|-----------|
| R-01 | Two parallel bucket structs (`CostBucket` vs `ProjectChartBucket`). | med | Type drift; `sourceNodeId` silently unavailable if typed as `CostBucket`. | Type donut data as `ProjectChartBucket` (§6.3). |
| R-02 | `comparisonView.insight` is `null` unless ≥2 estimates → header crash on single-sheet. | **high** | Runtime crash on the common single-sheet case. | Guard: `comparisonView?.insight ? buildInsightSentence(comparisonView.insight)?.sentence ?? null : null` (mirror `CostComparisonBoard.tsx:89`). |
| R-03 | `formatDeltaPercent` imported from `format.ts` = undefined import. | **high** | Broken delta formatting. | Import from `build-insight-sentence.ts` (§6.4). |
| R-04 | `seriesByEstimateId[unselectedSheet]` = undefined → crash. | **high** | Runtime crash on unselected sheets. | Optional-chain every lookup (§6.7). |
| R-05 | `rollup.totalCost` summed under `kind:'mixed'` reads undefined. | med | NaN/undefined totals on multi-currency projects. | Branch on `rollup.kind` (§6.8). |
| R-06 | Legacy `left`/`right` persist at SSR (no server redirect). | med | Non-canonical URL at load for analytics/sharing. | Accept status quo (§9 Q4); document lazy canonicalization. |
| R-07 | Cross-sheet chart ignoring `costAcrossSheetsMode` renders stacked at >20 sheets. | med | Perf regression + wrong visual on large projects. | Read `costAcrossSheetsMode`; suppress stacked when `'totals-only'` (§6.1). *(Donut-first design has no cross-sheet chart — defensive only.)* |
| R-08 | `CostDonutChart` controlled/uncontrolled mixed per instance. | low | Hover-dim / active-slice desync. | Per instance: always pass `activeBucketId`+`onActiveBucketChange`, or never (§5). |
| R-09 | `onChange` wired instead of `onValueChange`; options indexed by `id`. | med | Silent no-op wiring; broken a11y. | Use `onValueChange`; index by `value` (§6.6). |
| R-10 | a11y tests depend on exact label strings. | **high** | Multiple a11y failures on label format. | Decide label format up front (§9 Q5 — preserve verbatim); update assertions (§13.3). |
| R-11 | New test file fails to mount if it imports server-only/Supabase code. | med | New tests don't render. | Render the leaf component directly with plain props + `vi.fn()`; no router mock for leaves (§13.5). |
| R-12 | Stale perf-plan anchors (`CostBreakdownSection.tsx:5`) go dead after deletion. | **high** | Misleading future work; bundle-size claims need re-baselining. | **Out of scope.** Flag for owner: mark `Performance-Refactor` A-35/R-7 items referencing `CostBreakdownSection.tsx:5` as resolved/superseded. Do **not** delete those doc lines in this PR. |

---

## 9. Open questions + defaults (implementation is never blocked waiting on a human)

| Q | Question | Default if unanswered |
|---|----------|----------------------|
| Q1 | Hoist `MAX_COMPARE_COLUMNS` into the client, or preserve the baseline+2-compare=3 split? | **Preserve as-is.** Don't hoist (breaks `project-data-repository.test.ts` cap=2). Add `TODO` comments at both sites. (§6.5) |
| Q2 | Does the redesign render a cross-sheet cost chart that must read `costAcrossSheetsMode`? | **No** (donut-first is per-column). If you add one later, read `costAcrossSheetsMode` and suppress stacked when `'totals-only'`. (§6.1) |
| Q3 | Extract `DeltaBadge`, or keep it local? | **Extract** to `src/components/ui/delta-badge.tsx` as P0 — `EstimateColumn` (new file) needs it. (§6.2) |
| Q4 | Add a server redirect to canonicalize `left`/`right` at SSR? | **No** — accept lazy client-side strip (status quo, out of scope). (§6.10) |
| Q5 | What label format for option names / delta text? | **Preserve existing verbatim** where structurally possible: option = `"<name> (<sheetCode>)"`; remove button = `"Remove <name> from comparison"`. Diverge only if the new UI structurally can't produce the old string, and update the affected assertion explicitly. (§13.3, R-10) |

---

## 10. Phased implementation plan (5-commit stack, green at every commit)

> Each commit leaves the repo **compiling and the suite green.** The plan's original 8-step
> sequence (`00-PLAN.md:92`) is the *conceptual* order; this is the *commit* order that
> respects the §7 blockers.

### Commit 1 — P0: Extract `DeltaBadge` (refactor; behavior identical)
**Why first:** unblocks B-4; pure refactor keeps everything green.
1. Create `src/components/ui/delta-badge.tsx`. Move `DeltaBadge` + its **local** coupled
   helpers (audit `CostComparisonBoard.tsx:452-475`; keep `formatSignedChartMoney` imported
   from `format.ts`). Export `DeltaBadge` and its prop type.
2. Update `CostComparisonBoard.tsx` to `import { DeltaBadge } from "@/components/ui/delta-badge"`;
   delete the local definition.
3. Gate: `bunx tsc --noEmit && bunx vitest run tests/vitest/project-data-a11y.test.tsx tests/vitest/project-dashboard-charts-ui.test.ts` → green.
- **Pros:** smallest possible blast; decouples delta rendering for reuse; board untouched visually.
- **Cons:** adds a file + an import churn in the board; must not change DeltaBadge behavior.

### Commit 2 — Orphan cleanup (green throughout; board untouched)
**Why now:** deletes dead code + its test readers as one atomic safe unit (B-1, B-2). The
board is **not** rewritten yet, so the governance board-string assertions (`:43-46`) still pass.
1. `tests/vitest/project-dashboard-ui-fixtures.ts:35-38` — convert the **4** orphan reads
   (`projectDataInsightHeader`, `projectDataCostBreakdown`, `projectDataCostLedger`,
   `projectDataCostAcrossSheets`) from `readFileSync` → `readOptional` (helper at `:3`).
   **Leave** `:33-34` (`projectDataClient`, `projectDataComparisonBoard`) as `readFileSync`.
2. `tests/vitest/project-dashboard-charts-ui.test.ts:49-52` — change the 4 orphan `.toContain`
   to `.toBe("")`. **Preserve** `:53` (`ProjectVarianceSpine` negative). The d3 `.not.toContain`
   (`:68-69`) become vacuously true on `""` — leave or drop.
3. Delete the 4 orphan files: `CostBreakdownSection.tsx`, `CostAcrossSheetsSection.tsx`,
   `ProjectDataInsightHeader.tsx`, `CostLedger.tsx`.
4. Delete the 3 orphan tests: `project-data-cost-breakdown-ui.test.tsx`,
   `project-data-cost-across-sheets-ui.test.tsx`, `project-data-insight-header-ui.test.tsx`.
5. Gate: `bunx vitest run tests/vitest/project-dashboard-charts-ui.test.ts` → green.
- **Pros:** shrinks the surface; removes an eager-d3 import (partially helps R-12); isolates the deletion risk from the redesign.
- **Cons:** touches governance tests twice (again in commit 5); must get the `.toBe("")` rewrite right or the block fails.

### Commit 3 — P1: `EstimateColumn.tsx` + test (green; unmounted)
1. Add `src/components/workshop/project-data/EstimateColumn.tsx` (spec §11.1).
2. Add `tests/vitest/project-data-estimate-column.test.tsx` (spec §13.5). Render the leaf
   directly; no router mock.
3. Gate: `bunx vitest run tests/vitest/project-data-estimate-column.test.tsx` → green.
- **Pros:** self-contained, testable in isolation; reuses extracted `DeltaBadge`.
- **Cons:** not yet mounted (dead until commit 5) — keep it small and obviously correct.

### Commit 4 — P2: `AddEstimateColumn.tsx` + test (green; unmounted)
1. Add `src/components/workshop/project-data/AddEstimateColumn.tsx` (spec §11.2).
2. Add `tests/vitest/project-data-add-estimate-column.test.tsx` (spec §13.5).
3. Gate: green.
- **Pros:** isolates the `+` affordance + disabled-state a11y.
- **Cons:** same as commit 3 (unmounted until commit 5).

### Commit 5 — THE REDESIGN (atomic; green)
**Why atomic:** the board rewrite, its skeleton, the a11y rewrite, and the governance
board-contract rewrite are interlocked — splitting them leaves the suite red mid-stack.
1. Rewrite `src/components/workshop/project-data/CostComparisonBoard.tsx` (spec §11.3):
   keep the frozen prop signature (§4.2); header band (one `<h1>` **"Cost breakdown"**,
   grouping `SegmentedControl`, insight sentence w/ null+mixed-currency guards, `Banner`s);
   columns row = `displayEstimates.map(→ <EstimateColumn/>)` + trailing `<AddEstimateColumn/>`;
   **no shared `<table>`** (remove `project-data-cost-comparison-table` id — §4.4); shared
   `activeBucketId` hover/focus highlight.
2. Light-edit `data/loading.tsx` skeleton to the columns-row shape — **preserve** the
   governance strings (`data-project-data-loading`, `Loading project data`,
   `data-project-data-grid="comparison-board"`, `project-data-grid__board`).
3. Rewrite `project-dashboard-charts-ui.test.ts:43-46` board-contract assertions to the new
   donut-first contract (§13.2). Keep nav/scroll/skeleton/d3-isolation tests.
4. Rewrite the **whole** `project-data-a11y.test.tsx` `describe` (~10 `it` blocks, `:20-213`) to the
   new per-column contract (§13.3); add `project-data-board-donut-first.test.tsx` (§13.4).
5. Full gate (§14): `tsc --noEmit` · `vitest run` (project-data + governance) · `lint` · `build`.
- **Pros:** one coherent switch; suite green at the merge boundary.
- **Cons:** large diff; the a11y rewrite is the riskiest part (~10 tests, label-coupled — R-10). Mitigate via Q5 (preserve labels).

> **Don't merge until §15 (DoD) is fully checked.** Rollback = `git revert` of the PR (no
> migration/data/URL breakage to undo).

---

## 11. Component specs

### 11.1 `EstimateColumn.tsx` (new) — one self-contained estimate card
**Presentational leaf.** The board owns all data derivation (§12) and passes everything down.
This keeps it trivially testable (R-11) and avoids re-deriving series per column.

```tsx
// src/components/workshop/project-data/EstimateColumn.tsx
import { CostDonutChart } from "@/components/charts/CostDonutChart";
import { DropdownSelect, type DropdownSelectOption } from "@/components/ui/dropdown-select";
import { DeltaBadge } from "@/components/ui/delta-badge";
import { formatChartMoney, formatChartShare } from "@/lib/project-charts/format";
import type { ProjectChartBucket, ProjectChartGroupingMode } from "@/lib/project-charts/types";
import type { ProjectDataEstimateSheet } from "@/lib/repositories/project-data-repository";

export type EstimateColumnProps = {
  estimate: ProjectDataEstimateSheet;
  baseline: boolean;                       // column 0
  groupingMode: ProjectChartGroupingMode;
  buckets: ProjectChartBucket[];           // board already collapsed top-8 + Other (§12)
  total: number;
  currencyCode: string;
  // baseline-relative delta AMOUNT (non-baseline only); null under mixed currency / baseline / no baseline.
  // DeltaBadge derives the % internally from (delta, baselineTotal) — do NOT pass a separate percent.
  delta: number | null;
  baselineTotal: number | null;            // baselineEstimate.totalCost (for DeltaBadge); null if no baseline
  activeBucketId: string | null;
  swapOptions: DropdownSelectOption[];     // remaining sheets not on the board
  canSwap: boolean;
  onActiveBucketChange: (id: string | null) => void;
  onSwapEstimate: (nextId: string) => void;
  onRemove?: () => void;                   // absent on baseline
};

const listId = (estimateId: string) => `estimate-${estimateId}-breakdown`;

export function EstimateColumn(props: EstimateColumnProps) {
  const { estimate, baseline, groupingMode, buckets, total, currencyCode,
          delta, activeBucketId, swapOptions, canSwap,
          onActiveBucketChange, onSwapEstimate, onRemove } = props;
  const breakdownId = listId(estimate.id);
  return (
    <section aria-label={`${estimate.name} cost breakdown by ${groupingMode}`}
             className="flex min-w-[280px] flex-1 flex-col rounded-xs border bg-surface px-4 py-3">
      {/* header: baseline chip OR delta + remove ✕ */}
      <header className="flex items-center justify-between gap-2">
        {baseline
          ? <span className="text-[10px] font-medium uppercase tracking-wide text-secondary">Baseline</span>
          : (delta != null && baselineTotal != null && (
              <DeltaBadge delta={delta} baselineTotal={baselineTotal} currencyCode={currencyCode} />
            ))}
        {!baseline && onRemove && (
          <button type="button" onClick={onRemove}
                  aria-label={`Remove ${estimate.name} from comparison`}
                  className="focus-visible:ring-focus …">✕</button>
        )}
      </header>

      {/* title + hero total */}
      <h2 className="truncate text-[12px]/snug font-medium">{estimate.name}</h2>
      <p className="text-[12px] font-medium tabular-nums">{formatChartMoney(total, currencyCode)}</p>
      <p className="text-[10px] text-secondary">{estimate.rowCount} line items</p>

      {/* donut → its OWN breakdown list via describedById */}
      <CostDonutChart
        buckets={buckets} total={total} currencyCode={currencyCode}
        label={`Cost breakdown for ${estimate.name}`}
        hideCallouts compact
        activeBucketId={activeBucketId}
        onActiveBucketChange={onActiveBucketChange}
        describedById={breakdownId}
      />

      {/* the a11y surface for THIS donut */}
      <ul id={breakdownId}
          aria-label={`${estimate.name} cost breakdown by ${groupingMode}`}
          className="mt-2 space-y-1">
        {buckets.map((b) => (
          <li key={b.id}
              tabIndex={0}
              onFocus={() => onActiveBucketChange(b.id)}
              style={{ opacity: activeBucketId && activeBucketId !== b.id ? 0.45 : 1 }}
              className="flex items-center gap-2 text-[11px]">
            <span aria-hidden className="inline-block size-2 rounded-full"
                  style={{ backgroundColor: b.color }} />
            <span className="truncate">{b.label}</span>
            <span className="ml-auto tabular-nums">{formatChartMoney(b.total, currencyCode)}</span>
            <span className="tabular-nums text-secondary">{formatChartShare(b.share)}</span>
          </li>
        ))}
      </ul>

      {/* swap this column's estimate */}
      {canSwap && (
        <DropdownSelect
          aria-label={`Change ${estimate.name} sheet`} value=""
          options={swapOptions}
          onValueChange={onSwapEstimate}
          placeholder="Change sheet"
        />
      )}
    </section>
  );
}
```

**Notes / gotchas:**
- `text-secondary` (not `tertiary`) for load-bearing meta — AA (§6.12).
- `DeltaBadge` (props `{delta, baselineTotal, currencyCode, compact?}` — see §6.2) derives the
  **percent internally** from `delta`+`baselineTotal`; pass only the amount. It already handles the
  `baselineTotal === 0` and zero-delta tones (mirror `CostComparisonBoard.tsx:452-475`).
- The donut is **controlled** (`activeBucketId` + `onActiveBucketChange` always passed) — good (R-08).
- Breakdown rows are focusable (`tabIndex={0}`) and set `activeBucketId` on focus → shared highlight.
- Keep the `role="img"`/`aria-describedby` wiring on the donut (it's internal to `CostDonutChart`
  via `describedById`); do **not** add a second `role="img"` wrapper.

### 11.2 `AddEstimateColumn.tsx` (new) — the rightmost `+` tile
```tsx
// src/components/workshop/project-data/AddEstimateColumn.tsx
import { DropdownSelect, type DropdownSelectOption } from "@/components/ui/dropdown-select";
import { ADD_BUTTON_CLASSNAME } from "@/components/ui/toolbar-icon-button";

export type AddEstimateColumnProps = {
  remainingOptions: DropdownSelectOption[];
  canAdd: boolean;
  onAdd: (estimateId: string) => void;
};

// CORRECTED (adversarial review):
//  - DropdownSelect.placeholder is `string` (dropdown-select.tsx:47), NOT ReactNode → a Plus icon
//    cannot go in the placeholder. The trigger DOES accept `className` (merged via cn at :360-369,
//    last arg wins), so we tint the trigger directly with ADD_BUTTON_CLASSNAME.
//  - The trigger always renders a CaretDown chevron (it's a value-picker) — acceptable as the
//    "+/picker" affordance.
//  - Use `disabled` (NOT `aria-disabled`) when !canAdd: `disabled` makes the combobox non-focusable
//    so it can't open an empty listbox at the cap (G4). `aria-disabled` keeps it focusable (for
//    transient pending-commit states) — not what we want for "max reached".
export function AddEstimateColumn({ remainingOptions, canAdd, onAdd }: AddEstimateColumnProps) {
  return (
    <div className="sticky right-0 self-stretch">
      <DropdownSelect
        className={`min-w-[120px] self-stretch rounded-xs border border-dashed ${ADD_BUTTON_CLASSNAME}`}
        aria-label="Add estimate to compare"
        value=""
        options={canAdd ? remainingOptions : []}
        disabled={!canAdd}
        onValueChange={onAdd}
        placeholder={canAdd ? "Add estimate" : "All sheets shown"}
      />
    </div>
  );
}
```
**Notes:**
- **No leading Plus glyph in the trigger today** — `placeholder` is string-only and per-option
  `icon` applies to options, not the trigger. The `"Add estimate"` label + picker chevron is
  sufficient and matches the `ADD_BUTTON` affordance. If a Plus is wanted later, add a
  `triggerLeadingIcon?` prop to `DropdownSelect` first (out of scope for this PR).
- **If you need a `Plus` anywhere in this PR**, the canonical repo-wide import is
  `import { Plus } from "@phosphor-icons/react/dist/ssr"` → `<Plus size={12} weight="regular" />`
  (confirmed at `CostComparisonBoard.tsx:3,189`). `@/components/ui/icon` does **not** exist.
- `sticky right-0` keeps the tile reachable when the row scrolls horizontally (responsive,
  `05-RESPONSIVE-A11Y-INTERACTION.md:8`).

### 11.3 `CostComparisonBoard.tsx` (rewrite in place) — donut-first, per-column
**Keep the frozen export + props** (§4.2). Internally:

1. **Build `comparisonView`** via `buildProjectChartComparisonView({ estimates, seriesByEstimateId,
   groupingMode, estimateIds: displayEstimateIds, baselineEstimateId })` — for the header insight
   sentence + per-column baseline-relative deltas. **No shared table.**
2. **Header band** (`shrink-0`, `border-b`): eyebrow `COST DATA`, one `<h1>` **"Cost breakdown"**,
   subtitle, grouping `SegmentedControl` (`onValueChange`!), insight sentence
   (`!isMixedCurrency && comparisonView?.insight ? buildInsightSentence(comparisonView.insight)?.sentence ?? null : null`),
   `Banner`s for mixed currency (`rollup.kind === 'mixed'`) and truncation (`summary.didTruncate`).
3. **Columns row** (the hero, horizontally-scrollable flex): `displayEstimates.map(estimate => <EstimateColumn .../>)` + trailing `<AddEstimateColumn/>`.
4. **Remove** the `<table id="project-data-cost-comparison-table">`, the sticky first column,
   the `h-2` bars, the `CompositionMicroLine`, the forced-empty "Add sheet to compare"
   `DropdownSelect`, and the sheet chips row (their function moves into the columns + `+` tile).
5. **Keep** `MAX_COMPARE_COLUMNS` (§6.5), `normalizeDisplayEstimateIds`, `remainingOptions`
   derivation, `activeBucketId` hover-dim semantics (now cross-column via the shared prop).
6. **Preserve the zero-sheet empty state.** Keep the `!baselineEstimateId` (no estimate sheets)
   → `<EmptyState>` branch from the current board (`:180-194`). The donut-first board must still
   not crash when a project has no sheets.
7. **Donut sizing.** `CostDonutChart` renders at a fixed viewBox (~520×400,
   `CostDonutChart.tsx:19-20`); inside a `min-w-[280px]` column it needs an explicit responsive
   width (wrap in a `w-full` container + constrain height) so it doesn't overflow. Verify at the
   opt-in browser pass.

**Board → frozen-callback wiring** (the new internal controls translate to the FROZEN props in
§4.2 — all machinery stays internal to the board; `ProjectDataClient` is untouched):
- `AddEstimateColumn.onAdd(nextId)` → `onCompareEstimateIdsChange([...compareEstimateIds, nextId].slice(0, MAX_COMPARE_COLUMNS - 1))`.
- `EstimateColumn.onRemove()` (non-baseline) → `onCompareEstimateIdsChange(compareEstimateIds.filter((id) => id !== estimate.id))` (mirror current board `:152`).
- `EstimateColumn.onSwapEstimate(nextId)` — **non-baseline** column at slot `i` →
  `onCompareEstimateIdsChange(compareEstimateIds.map((id, idx) => (idx === i ? nextId : id)))`;
  **baseline** column (slot 0) → `onBaselineChange(nextId)`.
- `SegmentedControl.onValueChange(mode)` → `onGroupingModeChange(mode)`.
- `activeBucketId` (board-held) + `EstimateColumn.onActiveBucketChange` / donut `onActiveBucketChange`
  → the frozen `onActiveBucketChange` (board owns the single shared state).

**Per-column derivation the board performs** (passes into `<EstimateColumn/>`) — see §12 for the
full cookbook with guards.

---

## 12. Per-column data derivation cookbook (board-side, with all guards)

```ts
// inside CostComparisonBoard, per display estimate:
import { collapseProjectChartBuckets } from "@/lib/project-charts/aggregate-project-charts";
import type { ProjectChartBucket } from "@/lib/project-charts/types";

const isMixedCurrency = summary.rollup.kind === "mixed";            // R-05
const modeSeries = summary.seriesByEstimateId[estimate.id]?.[groupingMode]; // R-04 (optional chain)
const buckets: ProjectChartBucket[] = modeSeries
  ? collapseProjectChartBuckets(modeSeries.allBuckets, 8)           // top-8 + Other, CVD-safe
  : [];
const total = modeSeries?.total ?? estimate.totalCost;
const currencyCode = estimate.currencyCode;                          // each donut renders its own currency

// ⚠️ CORRECTED (adversarial review): buildProjectChartComparisonView precomputes `delta`/`deltaPercent`
//   ONLY for the FIRST non-baseline comparand (project-comparison-view.ts:147,199) — it is NOT a
//   per-estimate delta map. Do NOT read per-column deltas from comparisonView.buckets[].delta: that
//   field is always the single comparand's delta and is WRONG for a 3rd column (e.g. baseline=A,
//   compare=[B,C] → column C would wrongly show B's delta). Compute each column's baseline-relative
//   delta directly from SHEET TOTALS (this mirrors the current board at CostComparisonBoard.tsx:355 & :402):
const baselineEstimate = summary.estimateSheets.find((s) => s.id === baselineEstimateId) ?? null;
const baselineTotalCost = baselineEstimate?.totalCost ?? 0;
const delta: number | null =
  !baseline && !isMixedCurrency && baselineEstimate
    ? estimate.totalCost - baselineTotalCost
    : null;
// (DeltaBadge derives the % from delta+baselineTotal; the engine's precomputed % is single-comparand only.)

// comparisonView is STILL called — but ONLY for the header insight sentence (baseline-vs-first-comparand,
// null-guarded per R-02). It is NOT the source of per-column deltas.
```

**Swap options for a column** = `estimateOptions.filter(o => !displayEstimateIds.includes(o.value) || o.value === estimate.id)`
(sheets not on the board, plus the column's own current sheet so the menu isn't empty).
**`remainingOptions` for the `+` tile** = `estimateOptions.filter(o => !displayEstimateIds.includes(o.value))`.
**`canAdd`** = `displayEstimateIds.length < MAX_COMPARE_COLUMNS && remainingOptions.length > 0`.

---

## 13. Test plan

### 13.1 Files — update / add / delete / keep-green (verified)

| Action | File | Anchor |
|--------|------|--------|
| **UPDATE** | `tests/vitest/project-dashboard-ui-fixtures.ts` | `:35-38` → `readOptional` (commit 2) |
| **UPDATE** | `tests/vitest/project-dashboard-charts-ui.test.ts` | orphan `.toContain`→`.toBe("")` `:49-52` (commit 2); board-contract `:43-46` → new donut-first (commit 5); **preserve** `:53` `ProjectVarianceSpine`, nav `:20-28`, scroll `:30-36`, skeleton `:56-63`, d3-isolation `:65-77` |
| **UPDATE** | `tests/vitest/project-data-a11y.test.tsx` | **whole `describe`** `:20-213` → new per-column contract (commit 5) |
| **ADD** | `tests/vitest/project-data-estimate-column.test.tsx` | commit 3 |
| **ADD** | `tests/vitest/project-data-add-estimate-column.test.tsx` | commit 4 |
| **ADD** | `tests/vitest/project-data-board-donut-first.test.tsx` | commit 5 (or fold into a11y) |
| **DELETE** | `tests/vitest/project-data-cost-breakdown-ui.test.tsx` | commit 2 (imports `CostBreakdownSection` `:5`) |
| **DELETE** | `tests/vitest/project-data-cost-across-sheets-ui.test.tsx` | commit 2 (`:4`) |
| **DELETE** | `tests/vitest/project-data-insight-header-ui.test.tsx` | commit 2 (`:5`) |
| **KEEP GREEN (do not touch)** | `tests/vitest/project-data-route-state.test.ts` | URL parsing — untouched |
| **KEEP GREEN** | `tests/vitest/project-data-repository.test.ts` | compare cap=2, mixed-currency, totals-only — untouched |
| **KEEP GREEN** | `tests/vitest/project-data-concentration-sentence.test.ts` | `buildCostConcentration` — untouched |

### 13.2 Governance KEEP-test rewrite (`project-dashboard-charts-ui.test.ts`)
The `"uses a comparison-first data board…"` block (`:38-54`) — **rewrite it wholesale** (re-grep
the exact `expect` count at impl time; the live block has ~15 assertions today — do NOT drop any
unless intentionally superseded by a new-contract line below). New donut-first contract:
```ts
// board source contains the new composition
expect(projectDataComparisonBoard).toContain("Cost breakdown");                 // new h1
expect(projectDataComparisonBoard).toContain("CostDonutChart");
expect(projectDataComparisonBoard).toContain("EstimateColumn");
expect(projectDataComparisonBoard).toContain("AddEstimateColumn");
expect(projectDataComparisonBoard).toContain("collapseProjectChartBuckets");
expect(projectDataComparisonBoard).toContain("buildProjectChartComparisonView");
expect(projectDataComparisonBoard).toContain("buildInsightSentence");
// shared cross-column table intentionally absent now
expect(projectDataComparisonBoard).not.toContain("project-data-cost-comparison-table");
// orphans are gone (readOptional → "")
expect(projectDataInsightHeader).toBe("");
expect(projectDataCostBreakdown).toBe("");
expect(projectDataCostLedger).toBe("");
expect(projectDataCostAcrossSheets).toBe("");
// PRESERVE — the plan's verbatim quote omitted this ProjectVarianceSpine negative; keep it
expect(projectDataClient).not.toContain("ProjectVarianceSpine");
// these negatives are ALREADY true (ProjectDataClient imports only CostComparisonBoard) — preserve, don't count as new coverage
expect(projectDataClient).not.toContain("ProjectDataInsightHeader");
expect(projectDataClient).not.toContain("CostAcrossSheetsSection");
```
**Keep untouched:** nav `Data` label/icon (`:20-28`), fixed-shell scroll contract on
`projectDataClient` (`:30-36` — reads the unchanged `ProjectDataClient.tsx`), skeleton contract
(`:56-63` — reads `loading.tsx`; keep the 4 governance strings), d3-isolation (`:65-77` —
`'from "d3'` must stay absent from client/board; `'from "d3-shape"'` stays in `sharedCostDonutChart`).

### 13.3 a11y test — rewrite the WHOLE `describe` (re-grep the exact `it(` count at impl time; ~10 blocks, `:20-213`)
The plan only enumerated test #1 (`:26-38`). **Every `it` block** drives the old comboboxes/table
by role/name and breaks when those roles go away — not just the first. Two tests the plan/reconciliation
undercounted need explicit handling (else commit 5 goes red):
- **"Major C Delta" test (`:165`)** — asserts `getByText("Major C Delta")`, a comparison-ranking
  label. With no shared table, that label must be produced by `EstimateColumn`'s breakdown list for
  the relevant column, **or** the assertion restages in the new `project-data-board-donut-first.test.tsx`.
- **"Other bucket / line counts" test (`:190`)** — asserts a `getByRole("row", { name: /Other/ })`
  with "5 lines"/"77 lines". `role="row"` is gone (no `<table>`) — restage against the breakdown
  `<li>` rows (they carry the bucket label + line count) in the new donut-first test.

Remap, across `:26-212`:
- `getByRole("heading",{level:1,name:"Cost comparison"})` → `name:"Cost breakdown"`.
- `getByRole("combobox",{name:"Baseline estimate sheet"})` / `"Add sheet to compare"` → per-column
  swap `DropdownSelect`(es) + the `+` tile (`aria-label:"Add estimate to compare"`).
- `getByRole("table",{name:"Cost comparison by category"})` → **assert absence** of the table;
  assert N `[data-testid="d3-donut-chart"]` (one per selected estimate), each `role="img"` with
  `aria-describedby` → its own `estimate-<id>-breakdown` list.
- `getByRole("button",{name:"Supplier"})` → grouping `SegmentedControl` (button role).
- `getByRole("option",{name:"Tender Estimate (EST-002)"})` → keep the **same label format**
  (Q5) so these still resolve; otherwise update the assertion.
- **URL-shape assertions** (`sheet=`/`compare=`/`mode=`) **stay** — the URL contract is unchanged.
- **Reuse** the `summary()/estimateSheet()/series` fixtures at `:215-329`.

### 13.4 New board-donut-first test (`project-data-board-donut-first.test.tsx`)
- `CostComparisonBoard` renders **N donuts + N breakdown lists** for N display estimates;
  **no** shared `<table>`.
- `+` appends a column → calls `onCompareEstimateIdsChange` (mocked).
- Shared `activeBucketId`: setting it highlights the matching slice in every donut and the
  matching row in every list.

### 13.5 New leaf tests — harness pattern (R-11)
Follow `project-data-a11y.test.tsx:1-18` **exactly**: `render` the leaf (`EstimateColumn` /
`AddEstimateColumn`) directly with plain props + `vi.fn()` callbacks. **No `next/navigation`
mock needed for leaves** (only `ProjectDataClient` needs it). Import types from
`@/lib/project-charts/types` and `@/lib/repositories/project-data-repository`.
`DropdownSelect` interaction pattern (from `ui-dropdown-select.test.tsx:196-210`):
```ts
fireEvent.click(screen.getByRole("combobox", { name: /add estimate/i }));
fireEvent.click(screen.getByRole("option", { name: "Tender Estimate (EST-002)" }));
expect(onAdd).toHaveBeenCalledWith("est-002");
```

---

## 14. Verification gates (run in order)

1. `bunx tsc --noEmit` — new components + rewritten board typecheck against the unchanged
   `ProjectDataClient` prop signature; deleted files have no callers.
2. `bunx vitest run tests/vitest/project-data tests/vitest/project-dashboard-charts-ui.test.ts tests/vitest/project-dashboard-ui-fixtures.ts` — green (updated + new + governance).
3. `bun run lint` on changed files.
4. `bun run build` — catches RSC/client-boundary regressions (the board is `'use client'`;
   `CostDonutChart` is `'use client'`; `EstimateColumn`/`AddEstimateColumn` are client leaves).
5. **Browser proof — opt-in, conditional** (per `AGENTS.md` speed guardrail): only if a visual
   claim stays unproven (e.g. the side-by-side donut layout or `+`-tile `sticky right-0` at
   breakpoints). Run a single Playwright/visual pass on
   `/workshop/projects/<id>/data` at 1/2/3 columns. Otherwise report as skipped.

---

## 15. Definition of Done (every box checkable)

- [ ] `/workshop/projects/[projectId]/data` shows **one self-contained donut column per selected
      estimate** (donut + per-column breakdown list), with a rightmost `+` tile that adds the
      next column (**disabled** — not hidden — at 3 columns or no remaining sheets).
- [ ] Grouping (Category/Supplier/Space) **re-buckets every donut + list**; no `"composition"`
      mode is offered.
- [ ] Hover/focus a slice or row → **shared highlight** across all donuts + lists
      (`activeBucketId`).
- [ ] Each donut is `role="img"` with `aria-describedby` → **its own** breakdown list;
      exactly **one `<h1>`** ("Cost breakdown"); **no** shared `<table>`.
- [ ] **Single-sheet** state: one donut column, no crash (insight null-guarded — R-02).
- [ ] **Mixed-currency** state: `Banner`; per-column deltas hidden; each donut renders its own
      currency; `rollup.kind==='mixed'` not summed (R-05).
- [ ] URL (`sheet`/`compare`/`mode`) behaves as before; legacy `left`/`right` still read;
      `compare='none'` ⇒ `[]`; `mode` defaults to `category`.
- [ ] `ProjectDataClient.tsx` is **unchanged** (props signature byte-for-byte preserved — §4.2).
- [ ] The 4 orphan components + 3 orphan tests are **deleted**; the 2 governance-test files
      **updated**; `readOptional` conversion in place.
- [ ] All project-data + governance vitest tests **green**; the 3 must-stay-green tests
      **untouched & green**.
- [ ] `bunx tsc --noEmit` clean; `bun run build` succeeds.
- [ ] Load-bearing meta uses `text-secondary` (AA), not `text-tertiary` (§6.12).

---

## 16. Rollback
Concentrated in `CostComparisonBoard.tsx` (+ `EstimateColumn.tsx`, `AddEstimateColumn.tsx`,
`delta-badge.tsx`) + the deletions and governance/a11y test edits — all in one PR.
`git revert` of the PR. **No migration, no data, no URL breakage to undo.**

## 17. Out of scope (explicitly)
- Any change to the `/charts` redirect, the repository, the route-state resolver, or `ProjectDataClient.tsx`.
- New server queries / RPCs / migrations.
- Redesigning `ProjectMiniSidebar` or the shell.
- Hoisting `MAX_COMPARE_COLUMNS` (Q1 — deferred; `TODO` comments only).
- Adding a server redirect to canonicalize `left`/`right` (Q4 — deferred).
- Touching the stale `Performance-Refactor` plan anchors (R-12 — flag for owner only).

## 18. Appendix — file:line anchor index (re-grep before editing)

**Engine / types:** `buildProjectChartComparisonView` `project-comparison-view.ts:136` (input `:29-38`, return/bucket/insight `:92-131`) · `collapseProjectChartBuckets` `aggregate-project-charts.ts:442` · `colorForBucket` `bucket-color.ts:67` · `formatChartMoney/formatSignedChartMoney/formatChartShare/bucketCueToken` `format.ts:3,11,17,25` · `buildInsightSentence`/`formatDeltaPercent` `build-insight-sentence.ts:23,70-79` · `ProjectChartBucket` `project-charts/types.ts:99-108` · `ProjectChartGroupingMode` `types.ts:1` · `ProjectChartEstimateSeries` `types.ts:73`.

**Shared UI:** `CostDonutChart` props `charts/CostDonutChart.tsx:11-47` (a11y `:373-400`) · `SegmentedControl` `ui/segmented-control.tsx:16-38` · `DropdownSelect`/`DropdownSelectOption` `ui/dropdown-select.tsx:34-68` · `Banner` `ui/banner.tsx:5-12` · `EmptyState` `ui/empty-state.tsx:4-10` · `Button` `ui/button.tsx:18-22` · `ADD_BUTTON_CLASSNAME` `ui/toolbar-icon-button.tsx:21-25` · `DeltaBadge` (local) `CostComparisonBoard.tsx:452-475`.

**Surface:** `CostComparisonBoard.tsx` (586 LOC) props `:35-46`, export `:54`, table id `:88/199`, MAX_COMPARE_COLUMNS `:31` (call sites `:76,136,488`), add-sheet slice `:135`, insight guard `:89`, banners `:162/170`, activeBucketId `:404/415` · `ProjectDataClient.tsx` (137 LOC) overrides `:23-40`, replaceQuery `:42-68`, normalizeCompareIds hardcoded 2 `:133`, board mount `:102-113`.

**Contract:** `getProjectDataRouteSummary` `repositories/project-data-repository.ts:43` · `ProjectDataRouteSummary` (11 fields) `:23-35` · `ProjectDataEstimateSheet` `:9-17` · `costAcrossSheetsMode` threshold `:82` · `resolveProjectDataRouteState` `workshop/project-data-route-state.ts:22` · `assertRouteErrorSmoke` `route-error-smoke.ts:8`.

**Tests:** a11y `project-data-a11y.test.tsx:20-213` (fixtures `:215-329`) · governance `project-dashboard-charts-ui.test.ts:38-54,65-77` · fixtures `project-dashboard-ui-fixtures.ts:3,33-38` · vitest config `vitest.config.ts:6-24` (jsdom, `fileParallelism:false`, `@`→`./src`) · DropdownSelect click pattern `ui-dropdown-select.test.tsx:196-210`.

---

*End of guide. Audit provenance: 6-agent parallel verification + reconciliation, 2026-06-22
(transcript `…/subagents/workflows/wf_28dd8432-d9a`). Raw plan docs `00`–`07` remain the
design rationale; this guide is the implementation authority.*
