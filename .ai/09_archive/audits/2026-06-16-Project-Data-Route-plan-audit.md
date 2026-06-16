---
title: "Audit — Project Data Route Feature Plan (2nd pass)"
date: 2026-06-16
type: plan-audit
auditor: Claude (Opus 4.8) — 7 parallel persona lenses + code verification
plan_under_review: .ai/03_plans/2026-06-16-Project-Data-Route-Feature-Plan/
plan_status: planning artifact (no implementation performed); improvement pass applied to docs 00/06/07/08
archive_status: resolved-and-archived
resolved_by: .ai/03_plans/2026-06-16-Project-Data-Route-Feature-Plan/
current_readiness_score: 100/100 planning readiness
method: ce-product-lens · ce-design-lens · ce-feasibility · ce-coherence · ce-scope-guardian · ce-adversarial · ce-security, each scored 0–100 and verified against the codebase
---

# Audit — Project Data Route Feature Plan (2nd pass)

> **Archived resolution note (2026-06-16):** This audit's remaining P1 backlog has been closed in the active plan pack. The current implementation-readiness artifact is `.ai/03_plans/2026-06-16-Project-Data-Route-Feature-Plan/`, with the 100/100 planning-readiness score recorded in `08-verification-and-open-questions.md` and the copy-ready handoff in `09-implementation-agent-handoff.md`. Historical scores below describe the pre-closure audit state.

> **What this file is.** A comprehensive, scored audit of the 9-doc plan pack for the project **Data** route (rename `/charts` → `/data`; delete the over-complex cost-comparison tool; ship a per-sheet cost-breakdown donut + a cross-sheet cost comparison). It records (a) the scores, (b) the corrections **already applied** in this pass, and (c) a prioritized remaining backlog. **The last section is a self-contained drag-and-drop prompt** you can hand to the next codebase AI to finish improving the docs.

---

## 1. Executive summary

The plan pack is **strong** — unusually well-researched, intellectually honest, and meticulous about deletion safety. Seven independent review lenses scored it, and the code was checked line-by-line: **9 of 10 load-bearing technical claims verified TRUE**, the deletion-safety analysis is accurate to the importer level, and the dataviz reasoning is well-cited.

Its one systematic weakness was a **"just reuse / just relocate" optimism** that did not survive code inspection: the donut it reuses hides slice labels (`hideCallouts`), the cross-sheet bars it reuses are the wrong chart type, the redirect it specifies cannot rename a query key, and two "open questions" referenced **data that does not exist in the schema**. None of these are fatal — all are correctable in the docs — but together they made the plan look more implementation-ready than it was.

**This pass corrected the critical items inline** (docs 00/06/07/08). The remaining work is genuine but well-scoped, and is captured as a backlog + a handoff prompt below.

**Overall plan quality: 76 / 100 before this pass → 85 / 100 after the corrections applied here.** Remaining lift to ~92 is the backlog in §6 plus the four product decisions in §7 that only the user can make.

The five things that mattered most (all code-confirmed):

1. **Donut reuse is not verbatim.** `DashboardCostMix` mounts `CostDonutChart` with `hideCallouts` (ring + table, *no* slice labels) — but the spec demanded direct slice labels. "Relocate verbatim" delivers the opposite labeling decision. *(Fixed: the `/data` donut now specced in full-callout mode; this also gives `/data` a reason to exist vs. the dashboard donut it would otherwise duplicate.)*
2. **The redirect cannot do the param remap.** A static `next.config.ts` rule can't rename `?left=`→`?sheet=`; preserving the query verbatim silently drops the selected sheet — the exact regression the redirect exists to prevent. *(Fixed: back-compat moved into the `/data` page param reader, with the IDOR check.)*
3. **Two open questions referenced non-existent data.** "Favorite → latest" default isn't wired and `estimate_favorites` is per-user; and there is **no archive column on `estimates`** at all. *(Fixed: v1 default = most-recently-updated; OQ6 marked moot.)*
4. **The rename is already committed (`79e5dfef`)** — so the plan's "diff the in-flight working tree" caution was stale and misleading. *(Fixed across 00/07/08.)*
5. **Strategy gap: the plan deletes a tool with zero usage evidence and ships with no success metric.** *(Partially fixed: success criteria + a "gather one signal before deleting" gate added; the deeper "is this route worth a separate build" call needs the user — §7.)*

---

## 2. Scorecard (the requested 1–100 ratings)

Scores are evidence-based, not self-congratulatory. "After" reflects the corrections applied in this pass (§5).

| Dimension | Before | After | One-line rationale |
| --- | :---: | :---: | --- |
| **Effectivity** (will the page do the user's job?) | 78 | 83 | Donut mode clarified, currency closed, ordering fixed; still missing microcopy/number-format specifics. |
| **Strategy** | 72 | 75 | Honest about the data gap and altitude; success criteria + delete-evidence gate added; route-vs-dashboard identity and time-series investment still need a user call. |
| **Quality / coherence** | 78 | 88 | Cross-doc contradictions (donut labels, ordering, currency, slice cap) reconciled; terminology tight; a few doc-02 staleness items remain. |
| **Implementation readiness** | 84 | 90 | Wrong loader fixed, test list completed, compare-link unit added, redirect mechanism corrected, non-existent-data OQs removed. |
| **UX / design** | 81 | 84 | `hideCallouts` contradiction resolved, a11y embedded; still missing empty-state/notice copy, motion + formatting specifics. |
| **Scope discipline** | 71 | 74 | KPI header and >20-sheet path flagged as deferrable; user decides keep/defer. |
| **Robustness** (survives contact with reality) | 68 | 80 | The four false "reuse" premises are now corrected in-doc; residual: swap-mechanism choice + lib-gut serialization. |
| **Security** | 87 | 90 | IDOR gate + redirect-param-safety added to the verification gate. |
| **OVERALL** | **76** | **85** | Strong plan; remaining lift is the §6 backlog + §7 product decisions. |

### Per-document scores

| Doc | Score | Notes |
| --- | :---: | --- |
| `00-README.md` | 88 | Clean index; updated this pass for the corrected facts. |
| `01-current-state-audit.md` | 90 | Excellent, code-accurate; correctly flagged the dashboard-redundancy that 06 had to resolve. |
| `02-component-and-chart-inventory.md` | 84 | Strong inventory; one stale claim (`getProjectDashboardSummary` "incl. costMix" — it's `null` in the base path) and it under-flagged the `hideCallouts`-vs-direct-labels implication. **Needs the §6 P1-b fix.** |
| `03-data-layer-and-feasibility.md` | 90 | The best doc — honest about the time-series gap, accurate on the 20-sheet bound and the RPC. |
| `04-blast-radius-and-rename-impact.md` | 86 | Thorough; its "in-flight working tree" framing was stale (rename now committed) — **needs the §6 P1-c note.** |
| `05-ux-dataviz-best-practices.md` | 88 | Well-cited; mildly under-applies its own "switch to horizontal bar past ~6 categories" guidance. |
| `06-recommended-design.md` | 82 → 89 | Had the donut-labels contradiction, `created_at` ordering, and open currency — **corrected this pass.** |
| `07-implementation-roadmap.md` | 80 → 88 | Wrong U2 loader, under-copied U7 test list, unassigned compare-links — **corrected this pass (incl. new U9).** |
| `08-verification-and-open-questions.md` | 78 → 88 | OQs closed/corrected, IDOR + success criteria + currency gate added — **this pass.** |

### The seven lens verdicts (raw)

| Lens | Score | Headline |
| --- | :---: | --- |
| Strategy (product) | 72 | Honest and disciplined, but deletes an unmeasured tool and never resolves why `/data` exists separately from the dashboard donut. |
| Design effectivity | 81 | Strongest on anti-slop restraint; weakest on interaction-state copy and the sheet-swap fetch mechanism. |
| Implementation readiness | 84 | 9/10 claims TRUE; gated down by the U2 loader, the stale concurrency premise, and under-copied test/link cleanup. |
| Quality / coherence | 78 | Excellent traceability; a handful of cross-doc inconsistencies and 3 OQs that 06 had already half-answered. |
| Scope discipline | 71 | Correct deletions and reuse, but adds a KPI header + >20-sheet path the simple brief didn't authorize. |
| Robustness (adversarial) | 68 | "Reuse" premises partly false; one compound failure (redirect + param + default) ships broken if untouched. |
| Security | 87 | Proportionate; real risk is an IDOR via `?sheet=`/`?left=` if a new call site omits the existing project scope check. |

---

## 3. Method

Seven purpose-built document-review persona agents ran **in parallel**, each with a dedicated goal and a 0–100 score, each pointed at the full 9-doc pack. The feasibility, adversarial, scope, and security lenses additionally **read the codebase and ran read-only shell** to verify claims rather than trusting the docs. Findings were cross-checked against each other (convergence raised confidence) and against the code before being adopted — agent output was weighed on the merits, not on authority. The improvement pass (§5) applied only the corrections that were code-confirmed or unambiguous; judgment-call and product decisions were left for the user (§7) and the next AI (§6, §8).

---

## 4. Code-verified claim ledger (reference for the next AI)

These were checked against the repo. Trust them; cite them when implementing.

| # | Claim | Verdict | Evidence |
| --- | --- | :---: | --- |
| 1 | `/data/page.tsx` still mounts the comparison `ProjectChartsClient` via `getProjectChartsData` | TRUE | `src/app/workshop/projects/[projectId]/data/page.tsx:3,6,26,35` |
| 2 | `getDashboardEstimateSeries(projectId, estimateId)` returns per-sheet `series.{category\|supplier\|space}.allBuckets` with `total/share/label/color` | TRUE | `project-dashboard-repository.ts:73`; shape in `project-charts/types.ts:55-94` |
| 3 | `DashboardCostMix` swaps on sheet selection via `DropdownSelect` + `SegmentedControl` — **but via `router.replace` server round-trip, and the donut uses `hideCallouts` (no slice labels)** | TRUE (w/ nuance) | `DashboardCostMix.tsx:92,97,115,126,138,145` |
| 4 | `CostDonutChart` is the real `d3-shape` donut; `ProjectCostDonutChart` is a re-export shim | TRUE | `CostDonutChart.tsx:4-5`; `ProjectCostDonutChart.tsx:10` |
| 5 | No chart library (only `d3`/`d3-shape`); bars are hand-rolled CSS | TRUE | `package.json`; `d3-shape` only in `CostDonutChart.tsx` |
| 6 | `project-dashboard-ui-fixtures.ts` `readFileSync`s `project-charts/**` (~L30-37) → deleting components throws at import | TRUE | `project-dashboard-ui-fixtures.ts:30-37` |
| 7 | `next.config.ts` has NO `redirects()` and no middleware | TRUE | `next.config.ts` (only `headers()` at `:72`); no `middleware.ts` |
| 8 | `project-charts/{format,types,bucket-color,aggregate-project-charts}.ts` are imported by dashboard + AI read-context (gut, don't delete) | TRUE | importers incl. `read-context.ts:4,11`, `DashboardCostMix.tsx:11`, `compare-href.ts:9`, both repos |
| 9 | Cross-sheet per-category bounded at 20 sheets; **no cost-over-time data** (only `created_at`/`updated_at`) | TRUE | `project-charts-repository.ts:15,79`; `estimates` Row has no snapshot/version/cost-history column |
| 10 | New `project-data/*` component paths don't exist / don't collide | TRUE | `ls src/components/workshop/project-data/` → not found |
| 11 | The `/charts`→`/data` rename is **committed**, not in-flight | TRUE | commit `79e5dfef` "Keep project navigation focused on active destinations"; working tree clean except `.ai/` |
| 12 | `estimates` table has **no archive/status/draft column** (OQ6 is moot) | TRUE | columns: `created_at, created_by, currency_code, id, metadata, name, notes, project_budget, project_id, sheet_code, updated_at`; `archived_at` is on `estimate_tabs`, not sheets |
| 13 | "Favorite" default is **unwired**; `estimate_favorites` is **per-user**; dashboard default is `estimates[0]` | TRUE | `project-dashboard-repository.ts:348`; `estimate_favorites` has `user_id` |
| 14 | `ProjectChartEstimateOption` exposes `updatedAt` only — **no `createdAt`** | TRUE | `project-charts/types.ts:3-11` |
| 15 | `ProjectCompositionBars` is 100%-normalized, typed against `ProjectChartComparisonView` (deleted in U5), sorted by `baselineTotal` | TRUE | `ProjectCompositionBars.tsx:3,33,70` |

---

## 5. Corrections already applied in this pass (do NOT redo)

The following were edited directly into the plan docs. The next AI should treat these as **done** and build on them.

| # | Fix | Docs touched |
| --- | --- | --- |
| C1 | Donut reuse reframed: `/data` uses `CostDonutChart` **full-callout labeled mode** (not the dashboard's `hideCallouts`); positions `/data` as the labeled "deep" view vs. the dashboard's compact glance (resolves the redundancy). | 06 D2/D3, 07 U2, 00 |
| C2 | Redirect remap moved to the **page param reader** (accept legacy `?left=`, drop `?right=`, keep `?mode=`, IDOR-validate); static rule preserves query verbatim only. | 06 D8 + Redirect spec, 07 (U6 context + new U9), 08 |
| C3 | Default sheet = **most-recently-updated** for v1; favorites deferred (per-user, unwired). | 06 §Section 1, 07 U2, 08 OQ1 |
| C4 | **OQ6 marked MOOT** — `estimates` has no archive column. | 08 OQ6 |
| C5 | **Currency gate CLOSED (OQ4)** — hide Section 2 + notice when `computeProjectCostRollup().kind === "mixed"`. | 06 §Section 2 + honesty guardrails, 07 U3, 08 OQ4 + QA |
| C6 | Cross-sheet bars: **rebuild + re-type** off the surviving series, **absolute** cost domain, **order by total descending** (not `created_at`, which isn't loaded and misleads). | 06 D5 + §Section 2, 07 U3, 00 |
| C7 | **U2 loader corrected** to `getProjectDashboardSummary` (enumerates sheets + resolves default + attaches series); noted `costMix: null` for zero-sheet projects. | 07 U2 |
| C8 | **U7 test list completed** with the comparison-symbol-importing tests + golden-master fixture that would otherwise break `type-check` after U5. | 07 U7 |
| C9 | **New U9** added: repoint live dashboard `buildCompareHref` callers + repo deep-link from `?left=` to `?sheet=` (was unassigned). | 07 U9, 06 Redirect spec, 00 |
| C10 | **Stale "in-flight working tree" caution corrected** — rename committed in `79e5dfef`; residual hazard reframed to U5 lib-gut serialization. | 00, 07, 08 |
| C11 | **IDOR gate added** (gate item 6 + QA row + redirect-param safety). | 08 |
| C12 | **Success criteria added** (adoption vs. `/charts` baseline, <5s task test, no "where did compare go?" reports). | 08 |
| C13 | Slice cap stated as **6, deliberately diverging from the dashboard's `TOP_SEGMENT_LIMIT = 5`**; redirect standardized to **308**. | 06 D3, 08 |
| C14 | **Pairwise-compare** recorded as a rejected alternative with a "gather one usage signal before hard-deleting" gate. | 06 Alternatives, 08 OQ5 |

---

## 6. Remaining backlog for the next AI (actionable)

Format: `[Priority] doc → section → problem → action`. Priority: **P1** = should fix before implementation; **P2** = polish. (All P0s from the review were resolved in §5.)

### P1 — resolve before the plan is handed to an implementer

- **P1-a · 06 §Section 1 + Section 2 → missing UX copy.** No strings for: empty-state status + learning cue, the mixed-currency notice, the truncation note, the donut `aria-label`, and the two section headings. **Action:** add a short "Microcopy" block to 06 with verbatim strings (e.g. empty: "No estimate sheets yet." / "Add an estimate sheet to see how cost breaks down by category, supplier, or space." / CTA "Create estimate sheet"; currency: "Sheets use different currencies, so cross-sheet cost comparison is unavailable.").
- **P1-b · 02 §4 → stale `costMix` claim.** Doc 02 says `getProjectDashboardSummary` returns "incl. `costMix`" — but `assembleDashboardSummary` returns `costMix: null`; it's populated only by the outer function when a `selectedEstimateId` resolves, and is `null` for zero-sheet projects. **Action:** correct doc 02's data-layer table and cross-link the zero-sheet empty state into U2.
- **P1-c · 04 (whole doc) → stale "in-flight" framing.** The body still narrates the rename as an uncommitted working-tree change. **Action:** add a header note that the rename landed in commit `79e5dfef`; replace "diff working tree vs HEAD and reconcile" with "verify against `git log`; base on the committed `data/page.tsx`."
- **P1-d · 06 §Section 1 / 07 U2 → sheet-swap fetch mechanism undecided.** Document whether the swap is a `router.replace` server round-trip (matches `DashboardCostMix`, simplest) or a client pre-load (true-instant). **Action:** pick one in U2; if "visibly instant" is a hard requirement, that forces pre-load and changes the U2 data contract. Drop the unqualified word "instant" from the 08 gate (already softened this pass — confirm).
- **P1-e · 06 §Section 2 a11y → cross-sheet bar data table under-specified.** The donut's table is specced; the bars' table columns are now named (Sheet / Total / per-category) but the requirement should ship **in U3's test scenarios**, not deferred to U8. **Action:** confirm the U3 scenario added this pass is sufficient; ensure `role="img"`+`aria-label` upgrades to a table-backed pattern matching the donut.
- **P1-f · 06 number formatting → unspecified.** `formatChartMoney` is `en-PH`; the abbreviation threshold (`$412K` vs `$412,000`), decimal places for `$4.2M`, and whether the donut center + KPI cards share the formatter are undefined. **Action:** specify in 06 (these are the page's most prominent numbers).
- **P1-g · strategy → time-series is the deferred differentiator.** Decide whether `/data` is a stepping stone to the cost-over-time view (which needs a cost-snapshot table) or a permanent commodity cost-viewer. **Action:** add a one-paragraph stance to 06 Known tensions; if stepping-stone, scope a thin snapshot-capture fast-follow. *(This borders on §7 — flag to the user.)*

### P2 — polish

- **P2-a · 06 layout → control-row + KPI responsive breakpoints** (sheet dropdown + grouping toggle in one row; cards two-up→one-up). Add explicit `<640px` stacking.
- **P2-b · 06 §Section 2 → ordering note.** Bars now order by total desc (good); add the one-line caption rationale so an implementer doesn't "helpfully" re-add date ordering.
- **P2-c · 05 under-application → horizontal-bar escape hatch.** 05 recommends switching the breakdown to a sorted horizontal bar past ~6 meaningful categories; 06 only offers the table. Note the deliberate scope choice (calm + no-dependency) so it reads as decided, not missed.
- **P2-d · 08 → presence-label disclosure.** Add one line accepting that the `"data"` presence label is visible to all project members (viewer-role included) by design; if fine-grained role access is added later, presence must not reveal the active sheet.
- **P2-e · route name.** "Data" is generic and may collide with a future data-export/table feature; consider "Cost" or "Cost data." *(User preference — §7.)*
- **P2-f · 06 D7 / Section 2 → baseline pinning is now superseded** by total-descending ordering; remove any lingering "largest category at baseline" language to avoid contradiction.

---

## 7. Decisions that need YOU (the user), not the next AI

These are product calls the review surfaced. The plan can proceed on the recommended default, but you may want to weigh in:

1. **Is `/data` worth a separate build, or is it really the cross-sheet view?** Section 1 duplicates the dashboard's donut. The plan now differentiates it as the labeled "deep" view — but the honest alternative is to make the **cross-sheet comparison** the route's reason to exist and demote the donut. *Recommended:* ship both, lead with the donut, but if you only want one thing here, the cross-sheet view is the differentiator.
2. **Delete the comparison tool outright, or archive it behind a flag?** No usage data exists. *Recommended:* check `/charts` usage (or ask 2–3 estimators) before the U5 hard-delete; if zero, delete and record it.
3. **Keep the KPI header?** It's slightly beyond your "donut + cost tracking" ask. *Recommended:* keep ≤3 cards but drop "largest category" (it restates the donut's top slice); defer the whole header if the page feels heavy.
4. **Default grouping Category (recommended) vs. Space (legacy).** Reversible one-constant flip. *Recommended:* Category.

---

## 8. ► DRAG-AND-DROP PROMPT FOR THE NEXT CODEBASE AI ◄

> Copy everything in this section into the next AI. It is self-contained.

```
GOAL: Improve the plan pack at
.ai/03_plans/2026-06-16-Project-Data-Route-Feature-Plan/
so it is fully implementation-ready, using the audit at
.ai/02_audits/2026-06-16-Project-Data-Route-plan-audit.md.

This is a PLANNING / DOCUMENT-IMPROVEMENT task — do NOT write application code.
Only edit the 9 markdown docs in the plan folder (00-README … 08-verification).

CONTEXT (already true — verify, don't re-derive):
- The feature: rename the project route /workshop/projects/[projectId]/charts → /data
  (ALREADY DONE — committed in 79e5dfef; working tree clean except .ai/ docs),
  DELETE the over-complex multi-estimate cost-COMPARISON tool, and ship a calm
  two-section page: (1) a per-estimate-sheet cost-breakdown DONUT that swaps when
  you pick a sheet; (2) a cross-sheet cost COMPARISON (stacked bars, NOT a time-series).
- The audit's §4 "claim ledger" lists 15 code-verified facts — trust them.
- The audit's §5 lists 14 corrections ALREADY APPLIED to docs 00/06/07/08 —
  do NOT redo these; build on them.

WHAT TO DO:
1. Read the audit (esp. §5 done, §6 backlog, §7 user-decisions, §4 verified facts).
2. Work the §6 backlog. Do every P1 (a–g); do the P2s if cheap. For each:
   - make the edit directly in the named doc/section,
   - keep repo-relative paths, keep the existing doc voice and table style,
   - cite code with file:line where the audit already did.
3. For the §6 items that are pure facts (P1-b doc-02 costMix, P1-c doc-04 stale
   framing), VERIFY against the codebase before editing — read the file, confirm
   the line, then fix.
4. For the §7 user-decision items: do NOT decide them yourself. Add a clearly
   labeled "Needs user decision" callout in 00-README listing the four, each with
   the audit's recommended default, so they're visible — but leave the plan running
   on the recommended default.
5. Re-verify internal consistency after editing (the coherence lens found these
   classes: donut slice cap stated the same everywhere; the ?sheet=/?mode= URL
   contract identical across 06/07/08; the deletion inventory matching across
   01/06/07/00; the 20-sheet threshold consistent). Fix any drift you introduce.

HARD CONSTRAINTS:
- READ-ONLY on src/ and tests/ — this task edits ONLY the plan markdown.
- Multiple AI agents may edit this repo concurrently. Do NOT touch source files.
  The shared lib src/lib/project-charts/** is consumed by the dashboard + AI
  read-context — any future code work must GUT (prune comparison exports), not delete.
- Before recommending the U5 deletion order in any doc, preserve the rule:
  break the tests/vitest/project-dashboard-ui-fixtures.ts readFileSync coupling
  (lines ~30-37) BEFORE deleting the project-charts components.
- The /charts→/data redirect canNOT rename ?left=→?sheet= in next.config.ts;
  back-compat lives in the /data page param reader WITH the project-scoped IDOR check.

ACCEPTANCE (when you're done):
- Every §6 P1 item is resolved in the docs, or explicitly deferred with a reason.
- No doc contradicts another on: donut mode (full-callout, labeled), slice cap (6),
  bar ordering (total descending), currency handling (hide Section 2 + notice),
  default sheet (most-recently-updated), the redirect mechanism, or the committed-
  rename fact.
- 00-README carries the four "Needs user decision" items with recommended defaults.
- The plan reads as implementation-ready: an engineer could start U1 without
  inventing the loader, the donut mode, the param contract, or any UX copy.
- Report a short changelog of what you changed, and which §7 items you left for the user.
```

---

## 9. Bottom line

This is a high-quality plan that was over-confident about reuse. The corrections in §5 removed the parts that were actually wrong; the §6 backlog is finishing work, not rescue work; the §7 decisions are the user's to make. Post-pass readiness is **85/100**, and an engineer following the corrected docs would not hit a build-breaking surprise on the deletion path, the data layer, or the redirect. Hand §8 to the next AI to close the remaining gap.
