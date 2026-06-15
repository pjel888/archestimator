---
title: Verification & Open Questions
date: 2026-06-16
status: readiness gate
type: qa-and-questions
scope: /workshop/projects/[projectId]/data
---

# 08 — Verification & Open Questions

## Open questions (resolve before / during implementation)

| ID | Question | Why it matters | Recommendation |
| --- | --- | --- | --- |
| OQ1 | **Default selected sheet** for the breakdown donut? | First impression depends on landing on the "right" sheet. | **RESOLVED for v1: most-recently-updated sheet** (`estimates[0]`, the existing dashboard default at `project-dashboard-repository.ts:348`). A "favorite" default is **deferred** — `estimate_favorites` is per-user and nothing in the default-selection path reads it today, so "favorite → latest" is net-new authed logic (whose favorite? a new server read), not a one-line default. Add favorites as a separate unit only if wanted. |
| OQ2 | **Default grouping** — Category (recommended) or Space (legacy default)? | Sets the first-read mental model of the breakdown. | Default Category; Space stays one click away. Reversible. |
| OQ3 | Cross-sheet bars — **absolute totals** (bar length = cost) or **100%-normalized** (composition share)? | Absolute shows "which sheet is bigger"; normalized shows "how the mix shifts." | Absolute by default (answers the cost question); offer normalized as a toggle only if asked. |
| OQ4 | **Mixed currencies** across a project's sheets — how to handle? | Summing/stacking across different `currency_code` values is invalid and could mislead pricing decisions. | **RESOLVED: if `computeProjectCostRollup` returns `kind: "mixed"`, hide Section 2 entirely and show a one-line notice** ("Sheets use different currencies, so cross-sheet cost comparison is unavailable."). A two-condition branch, not an open design problem — U3 implements it as a hard gate. |
| OQ5 | Should the page keep a **"compare two sheets" affordance** at all? | The deleted tool's whole job was pairwise compare; this OQ itself admits "some users may rely on it." | Drop pairwise compare in v1 (now recorded in [06](06-recommended-design.md) Alternatives rejected). **Before hard-deleting (U5), gather one cheap signal** — `/charts` route usage or a check with 2–3 estimators — so a used capability isn't removed silently. If usage is zero, proceed and record it. A two-sheet slopegraph ([05](05-ux-dataviz-best-practices.md) §3) is the lightweight revisit path. |
| OQ6 | **Archived / draft sheets** — include in the selector and cross-sheet bars? | — | **MOOT as written: the `estimates` table has no archive/status/draft column** (verified columns: `created_at, created_by, currency_code, id, metadata, name, notes, project_budget, project_id, sheet_code, updated_at`; the `archived_at` that exists is on `estimate_tabs` — sub-tabs *within* a sheet — not on sheets). There is no sheet-level archived state to exclude. Revisit only if an archive concept is later added (likely via `metadata` JSONB), which is schema archaeology, not a toggle. |
| OQ7 | Rename internal `project-charts` identifiers to `project-data`? | Cosmetic consistency vs. churn/merge-conflict risk with concurrent agents. | Defer — internal import names work untouched ([04](04-blast-radius-and-rename-impact.md)); not worth the blast radius now. |
| OQ8 | Route label "Data" vs. "Cost data" / "Cost"? | "Data" is broad and may collide with a future raw-data/export surface; "Cost data" is clearer but narrower than the current nav label. | Proceed with committed label **Data** for this implementation. If a future export/table route appears, revisit the label then. |

## Deferred to follow-up work

- **True cost-over-time trend.** Requires a cost-snapshot table (per-day or per-event) — a schema change, not a repository add ([03](03-data-layer-and-feasibility.md) G3). This is the honest home for the user's "multi-layered graph over time" instinct, once the data exists.
- **`get_project_chart_buckets` push-down RPC.** Sits unapplied in `supabase/migrations-pending-review/deferred/`; aggregation currently runs as a JS reduce. Perf-only; adopt when cross-sheet reads get heavy ([03](03-data-layer-and-feasibility.md) G4).
- **Paginated/aggregated cross-sheet read** beyond the 20-sheet per-category threshold ([03](03-data-layer-and-feasibility.md) G1).

---

## QA matrix

| Area | Check | Pass condition |
| --- | --- | --- |
| Sheet swap | Select each sheet | Donut + table + KPI cards update; `?sheet=` updates; color identity stable |
| Grouping | Toggle Category/Supplier/Space | Re-buckets correctly; `?mode=` updates; "Other" sorts last |
| Slice cap | Sheet with ≥7 categories | ≤6 slices + one "Other"; table shows all under the collapse rule |
| Center total | Any sheet | Center label == formatted sheet total |
| Cross-sheet | 0, 1, 2, 5, 21 sheets | Hidden at <2; bars at 2–20; totals-only at >20 |
| Currency | Mixed-currency project | Section 2 hidden + notice shown; no cross-currency sum rendered |
| Redirect | `/charts`, `/charts?left=&right=&mode=category` | Static redirect returns 308 to `/data` with query preserved verbatim; the **`/data` page param reader** maps legacy `?left=<id>`→selected sheet and keeps `?mode=` (a static redirect cannot rename a query key). Old link renders sheet `<id>` with category grouping — selected sheet NOT lost |
| Deletion safety | Build after U5 | No dangling imports; dashboard + AI context still resolve `project-charts` lib |
| Fixtures | Import dashboard UI tests after U1 | No `readFileSync` throw |
| Empty state | Project with no sheets | Status + "Create sheet" CTA; no broken donut |
| Microcopy | Empty, truncation, mixed-currency, chart captions | Strings match [06](06-recommended-design.md) exactly; no placeholder or explanatory dev copy |
| Number formatting | Donut center, KPI cards, bar labels, tables | All money uses `formatChartMoney`; all shares use `formatChartShare`; no ad hoc abbreviation drift |
| Loading | Slow data | Shape-matched skeleton, not a spinner |
| Error | Forced route error | `WorkshopRouteErrorState` with `routeLabel: "Project data"` |
| Authorization (IDOR) | `?sheet=<foreign-estimateId>` from another project | Returns no data; loader scopes on both `project_id` and estimate `id` (as `getDashboardEstimateSeries` does at `project-dashboard-repository.ts:87-88`) |
| Presence disclosure | Project member presence | Surface label remains generic `"data"` / "viewing data"; no selected sheet, cost bucket, or restricted estimate details are broadcast on project-level presence |

## Accessibility gate (D10)

- [ ] Every chart has a reachable `aria-describedby` data table.
- [ ] Categorical marks meet WCAG ≥3:1; text ≥4.5:1.
- [ ] Load-bearing meta uses `#5D5D5D`, never `#7F7F7F`.
- [ ] SVG `<text>` ≥11px.
- [ ] Sheet selector + grouping are keyboard-operable and have accessible names.
- [ ] No information encoded by color alone (direct labels + table).
- [ ] All chart motion gated behind `prefers-reduced-motion`.

## Adversarial checks

- **"It still feels like too much."** After build, screenshot the page and count simultaneous encodings. Target: one donut, one bar group, ≤3 KPI cards, two controls. If a reviewer can't state what the page is for in one sentence, cut more.
- **Concurrent-agent collision.** The `/charts`→`/data` rename is **already committed** (`79e5dfef`); the working tree is clean apart from `.ai/` docs, so there is no active nav/breadcrumb/presence rename edit to reconcile — base work on the committed `data/page.tsx`, not a phantom working-tree diff. The genuine residual hazard is **U5 (gutting the shared `project-charts` lib) racing another agent's edits to that lib's consumers** — serialize U5 after any concurrent lib work lands, since impact analysis against a stale tree gives a stale blast radius.
- **Shared-lib regression.** The biggest risk is gutting `project-charts` and silently breaking the dashboard donut or AI read-context. Gate U5 behind impact analysis showing zero external importers of the pruned symbols.
- **Redirect correctness.** A static `next.config.ts` redirect **cannot rename `?left=`→`?sheet=`** — it preserves the query verbatim. Back-compat MUST live in the `/data` page param reader (accept legacy `?left=` as a fallback for `?sheet=`, drop `?right=`, keep `?mode=`), and that fallback must run the same IDOR scope-check. Test `/charts?left=X&right=Y&mode=category` → renders sheet X, category grouping. Without this the selected sheet is silently lost.
- **Stacked-bar honesty.** Confirm the cross-sheet chart never renders as an area chart or interpolates between sheets — it must read as discrete comparison.
- **Misleading 100 score.** A 100/100 claim is allowed only for planning readiness after the audit backlog is closed, the source audit is archived, and the handoff exists. It must not be used as implementation-complete proof.

## Readiness gate

This plan is implementation-ready. Implementation may be claimed complete only when:

1. The QA matrix and accessibility gate pass.
2. `bun run type-check`, the targeted Vitest suite, and `git diff --check` are green.
3. Graph `detect_changes` / `get_affected_flows` show only the intended components and flows changed.
4. Browser evidence shows the sheet swap works under the chosen v1 router-backed mechanism — note `DashboardCostMix` swaps via a `router.replace` server round-trip, not a guaranteed client-instant swap — the page reads as "calm cost data," and `/charts` links resolve to `/data` with the selected sheet preserved.
5. The mixed-currency gate (OQ4) hides Section 2 + shows the notice for any multi-currency project.
6. **IDOR verified:** a `?sheet=`/`?left=` param naming an estimate from another project returns no data (loader scopes on `project_id` + estimate `id`).

## Success criteria (did the redesign work?)

Correctness is necessary but not sufficient — define outcome signals before ship:

- **Adoption:** `/data` visit rate post-launch vs. the old `/charts` baseline (capture the baseline *before* deleting the route).
- **Task success:** an estimator can answer "what does this sheet cost and how is it split?" in <5s in a quick hallway test.
- **No silent loss:** zero "where did the comparison go?" reports in the first weeks (ties to OQ5 — confirm the comparison job is dead, don't assume).

## Planning-readiness scorecard

| Dimension | Score | Evidence |
| --- | :---: | --- |
| Audit backlog closure | 100 | P1-a through P1-g are resolved in 02/04/06/07/08/09 or explicitly converted into owner-visible product defaults. |
| Implementation handoff | 100 | [09](09-implementation-agent-handoff.md) plus `.ai/08_prompts/IMPLEMENT-2026-06-16-Project-Data-Route-Feature-Plan.md` define scope, sequence, commands, QA, non-goals, and stop conditions. |
| Internal consistency | 100 | Donut mode, slice cap, bar ordering, mixed-currency gate, default sheet, redirect/back-compat, committed-rename fact, and U3/U5 repository boundary match across 00/02/04/06/07/08/09. |
| Verification readiness | 100 | QA matrix covers normal, hostile/stale URL, IDOR, mixed currency, presence disclosure, deleted-component imports, formatting, a11y tables, browser proof, graph impact, and false-green score claims. |
| **Overall planning readiness** | **100** | Docs are implementation-ready; application implementation remains future work. |
