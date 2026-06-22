# 00 — Performance Refactor Plan Pack — Command Center

> **One-page index.** Authoritative contract: `_research/_SYNTHESIS.md`. This pack is **planning only** — no code, migrations, or DB actions. Date: 2026-06-17. Branch when planned: `feat/sidebar-redesign`.

---

## Goal

Eliminate the per-keystroke / per-interaction recompute pressure and structural duplication that make the Archestimator estimate workshop slow, while *preserving all existing behavior and the memo guards that already shield rendering*. Convert the codebase from "7 tree families each re-solving the same problem + a 1881-LOC god component + 13 hand-rolled optimistic flows" to a small set of canonical, measurable, regression-gated primitives.

## Scope

- Tree algorithm/index unification (headless kernel + ops) across 7 tree families.
- `EstimateSheetContent` decomposition and render isolation.
- Per-keystroke recompute elimination (structural-hash signatures, memoized indexes).
- Optimistic-mutation lifecycle standardization (1 adapter; unified query-key factory; `patchAndMarkStale` helper).
- Data/bundle/DB discipline (provider topology, `d3` dedup, share-page dynamic charts, `.select`/`.limit` discipline, hot-path FK indexes, chart + homebase RPCs).
- CI benchmark/regression gates and documentation.

## Non-goals

- New product features or UX redesigns (the sidebar redesign is independent and not in scope).
- Visual / design changes beyond consolidating already-duplicated primitives.
- Rewriting the WebGL/three lifecycle (confirmed exemplary) or exceljs (confirmed server-only).
- Applying any migration, index, RPC, or destructive DB action — these are **planning items with risk + validation only**.
- Touching `src/**`, `tests/**`, `e2e/**`, `scripts/**`, `supabase/**`, or config in *this* pack.

## Current repo facts (contract §0)

- Next.js 16.2.6 (App Router), React 19.2.6, Bun, TypeScript strict, Tailwind v4.
- Supabase/Postgres + RLS; TanStack Query 5.100.14; Zustand 5.0.14; TanStack Table 8.21 / Virtual 3.14.
- Trees: custom `src/components/ui/tree.tsx`; `react-complex-tree@2.6.1` effectively dead (type alias + CSS only).
- Heavy libs: `d3@7.9` (only `d3-shape` used), `exceljs@4.4` (server-only), `three@0.184` (exemplary lifecycle), `@firecms/neat` (patched), `lenis`, `roughjs`, `rough-notation`, `@phosphor-icons/react`.
- Tooling: Storybook 10.4, Vitest 4.1 (361 DOM tests, serial), Playwright 1.60, `@next/bundle-analyzer` wired (`next.config.ts:190`) but **no npm script** → `ANALYZE=true bun run build`.
- Aggregate gate: `bun run validate` = `type-check` + `lint` + `lint:design-system` + `lint:design` + `test` (5 unit) + `test:dom` (361). Does **not** run e2e/perf/storybook/bundle analysis.

## Research sources

- Master research: `.ai/13_research/2026-06-17-Master-Performance/`
- This pack's dossiers: `.ai/03_plans/2026-06-17-Performance-Refactor/_research/` — `R1-rsc-and-bundle.md`, `R2-state.md`, `R3-trees.md`, `R4-sheet.md`, `R5-data-supabase.md`, `R6-ui-primitives.md`, `R7-tests-perf-tooling.md`, and the authoritative `_SYNTHESIS.md`.

## Plan file index (00–28)

| File | Purpose |
|---|---|
| `00_README.md` | This command center — goal, scope, facts, index, phase order, quick wins, top tracks, success. |
| `01_CODEBASE_AUDIT.md` | Evidence-grounded audit of current hotspots, blast radius, file:line findings. |
| `02_PATTERN_INVENTORY.md` | Catalogue of duplicated patterns (trees, query keys, optimistic flows, primitives). |
| `03_PERFORMANCE_BASELINE_AND_BENCHMARKS.md` | What to measure first; baseline harness; benchmark plan. |
| `04_TARGET_ARCHITECTURE.md` | End-state design: headless tree kernel, decomposed sheet, optimistic adapter, query-key factory. |
| `05_PHASED_REFACTOR_PLAN.md` | Master phase-by-phase plan tying all sub-plans together. |
| `06_PHASE_0_BASELINE_PLAN.md` | Phase 0 — baseline, instrumentation, guardrails. |
| `07_PHASE_1_FOUNDATION_PLAN.md` | Phase 1 — canonical indexes, selectors, perf utilities (structural-hash, `patchAndMarkStale`, key factory). |
| `08_PHASE_2_TREE_KERNEL_PLAN.md` | Phase 2 — headless `TreeIndex` + ops; delete `react-complex-tree`; converge `WorkshopTree`→`Tree`. |
| `09_PHASE_3_ESTIMATE_SHEET_PLAN.md` | Phase 3 — sheet decomposition + render isolation; break `editableRows` fan-out. |
| `10_PHASE_4_DATA_AND_CACHE_PLAN.md` | Phase 4 — query/server-action/DTO standardization + `.select` discipline. |
| `11_PHASE_5_OPTIMISTIC_MUTATIONS_PLAN.md` | Phase 5 — one optimistic adapter; standard rollback. |
| `12_PHASE_6_UI_PRIMITIVES_PLAN.md` | Phase 6 — primitive consolidation + loading-state cleanup + DS duplication lint rule. |
| `13_PHASE_7_BUNDLE_RUNTIME_PLAN.md` | Phase 7 — provider topology, `d3` dedup, share charts, code-splitting. |
| `14_PHASE_8_SUPABASE_DB_PLAN.md` | Phase 8 — FK indexes, chart RPC, homebase RPC, RLS pass. |
| `15_VALIDATION_MATRIX.md` | Per-phase validation commands and acceptance gates. |
| `16_RISK_REGISTER.md` | RISK-01…NN — risks, likelihood, impact, mitigation, validation. |
| `17_DECISION_LOG.md` | D-001…NN — architectural decisions, alternatives, consequences. |
| `18_EXECUTION_PROMPTS.md` | Ready-to-run prompts for each phase's implementation agent. |
| `19_OPEN_QUESTIONS.md` | Q-01…NN — owner/eng/measurement/DB/deferrable questions to resolve. |
| `20_UX_UI_AND_INTERACTION_PLAN.md` | Cross-phase UX contract: transient-state preservation, perceived-latency, a11y gates, visual-regression. |
| `21_BLAST_RADIUS_MATRIX.md` | Graph-quantified per-target blast radius (imports/callers/flows/tests) + the RISK-14 seam cluster. |
| `22_SECURITY_AND_RLS_THREAT_PLAN.md` | Provider-move auth boundary, RPC cross-tenant proofs, ActionResult authz preservation, optimistic FORBIDDEN-path. |
| `23_NETWORK_AND_DATA_FLOW_PLAN.md` | Realtime channel/query-count/payload budgets; prefetch & hydration strategy. |
| `24_EXECUTION_GOVERNANCE_AND_ROLLOUT.md` | Branch/PR model, seam-lock, stop-the-line, feature flags, owner-decision deadlines + safe defaults. |
| `25_OBSERVABILITY_RUM_AND_RESOURCE_BUDGETS.md` | Field RUM, memory/leak, exec-time/TBT, server/TTFB budgets, measurement methodology. |
| `26_NEXT16_CACHE_COMPONENTS_AND_COMPILER_PLAN.md` | Next 16 Cache Components C0→C4 rollout + React Compiler gated pilot + concurrency law (Bible §6/§7 "Phase 5 pilot" the pack had been missing). |
| `27_ENGINEERING_GUARDRAILS_AND_PR_CHECKLIST.md` | Bible §2 Law-2/Law-3 merge gates, §15.4 static guardrails, §17 10-question PR checklist, §18 Do-Not-Do banned-patterns list. |
| `28_BEHAVIOR_PRESERVATION_AND_SAFETY_NET.md` | Mission-critical operator console (D-024): invariant register with objective proof gates, the "stop immediately if X" tripwire set, the per-phase correctness gate independent of render-count, and the kill-switch map. |

> **Phases 9 and 10 have no standalone detail file in this pack — this is intentional, not a missing file.** There is no `15_PHASE_9_*` or `16_PHASE_10_*`; do not hunt for them. **Phase 9** (CI benchmark gates / regression prevention) is specified by `15_VALIDATION_MATRIX.md` (the per-phase gates and acceptance thresholds) plus the Phase-9 prompt in `18_EXECUTION_PROMPTS.md`. **Phase 10** (documentation, examples, enforcement) is docs-only and carries no design file — its work is driven entirely by the Phase-10 prompt in `18_EXECUTION_PROMPTS.md`. The index above is complete: files `00`–`28` (29 files total), no gaps. Files `20`–`25` are the round-2 additions that close the weakest review dimensions; files `26`–`27` are the round-4 Bible-coverage additions; file `28` is the round-5 mission-critical safety net (see "Review scorecard & dimensions covered" below).

## Phase order (contract §2)

```
Phase 0  — Baseline, instrumentation, guardrails
Phase 1  — Canonical indexes, selectors, perf utilities (structural-hash, patchAndMarkStale, query-key factory)
Phase 2  — Tree kernel unification (headless TreeIndex + ops)
Phase 3  — Estimate sheet decomposition + render isolation (break editableRows fan-out)
Phase 4  — Query/server-action/DTO standardization + select discipline
Phase 5  — Optimistic mutation lifecycle standardization (1 adapter, standard rollback)
Phase 6  — UI primitive consolidation + loading-state cleanup + DS duplication lint rule
Phase 7  — Bundle/code-splitting/runtime cleanup (provider topology, d3 dedup, share charts)
Phase 8  — Supabase/RPC/index/RLS performance pass (FK indexes, chart RPC, homebase RPC)
Phase 9  — CI benchmark gates and regression prevention
Phase 10 — Documentation, examples, enforcement
```

### Quick-win note (contract §2)

Several Phase 7/8 items are cheap, isolated, high-leverage and **MAY be pulled forward immediately after the Phase 0 baseline** as gated "early wins" (each gated by baseline + `validate`): provider-topology move, `d3`→`d3-shape` dedup, share-page dynamic chart import, hot-path FK indexes, shipping `get_project_chart_buckets`. They do **not** depend on the tree/sheet refactors. Flag and harvest them but keep the disciplined default order for everything else. See **D-002**.

## Top-5 leverage tracks (contract §3)

1. **Tree kernel unification** — one headless `TreeIndex` + ops replacing ≥8 find-by-id / ≥5 descendant / ≥4 ancestor-filter / ≥3 cascade impls across 7 tree families; delete `react-complex-tree`; converge `WorkshopTree`→`Tree`.
2. **EstimateSheetContent decomposition + render isolation** — break the 1881-LOC component; sever the `editableRows` map-identity fan-out via per-row subscription; **preserve existing `memo` guards**.
3. **Per-keystroke recompute elimination** — replace whole-tree `JSON.stringify` signature + full-tree totals DFS + proposal-signature DFS with incremental/structural-hash + memoized indexes (fed by Phase 1).
4. **Optimistic mutation lifecycle standardization** — collapse 13 flows / 5 rollback mechanisms into one adapter; unified query-key factory (fold `tabTree`/`areaTree`); `patchAndMarkStale` helper (22 sites).
5. **Data/bundle/DB discipline pass** — provider topology + `d3` dedup + share dynamic charts; `.select` column discipline + `.limit()` on component library; hot-path FK indexes; ship `get_project_chart_buckets` + homebase summary RPC.

## Review scorecard & dimensions covered

This pack was scored by an 8-lens review panel. Round 2 added six documents to close the weakest dimensions (full scorecard + owner-of-fix mapping in `_research/_SYNTHESIS.md` "V2 IMPROVEMENT CONTRACT"; target after round 2 is every dimension ≥ 95).

| Lens (dimension) | Round-1 score /100 | Closed in round 2 by |
|---|---|---|
| Quality / coherence | 92 | existing-file fixes |
| Feasibility / impl-readiness | 88 | doc 24, doc 22 |
| Performance rigor | 88 | doc 25 |
| DB / network | 78 | doc 23 |
| Strategy / scope | 72 | doc 24 |
| Blast-radius | 62 | doc 21 (blast radius) |
| Security | 52 | doc 22 (security/RLS) |
| UX / UI | 38 | doc 20 (UX/interaction) |

Round 2 thus added UX (doc 20), blast radius (doc 21), security (doc 22), network (doc 23), governance (doc 24), and observability (doc 25). Irreducible product/measurement calls are logged as `Q-NN` with a named owner + safe default, never left silent.

**Bible coverage (round-4 pass):** a round-4 pass cross-checked the pack against the Performance Engineering Bible (`.ai/13_research/2026-06-17-Master-Performance/…Bible…md`) §2–§22. The two structural gaps — Next-16 Cache Components + React Compiler rollout (Bible §6/§7/§16-Phase-5), and the standing guardrail/checklist artifacts (Bible §15.4/§17/§18/§2-Laws) — are now closed by docs 26 + 27. In addition, ~20 PARTIALs were transcribed into the relevant phase docs: estimate-row images (§13.3), URL-sync table (§11.2), per-op DTO table (§5.4), tree micro-budgets (§3.7), query EXPLAIN law (§10.2), and others. The pack now reflects the full Bible, not just the synthesis.

**Safety / do-not-break (round-5 pass):** a mission-critical safety audit closed a critical latent bug — the proposal-export staleness signature omitted `discipline` plus the export settings, so a change to either could ship a wrong customer workbook; this is now logged as `A-41`/`RISK-03` and fixed-as-found in Phase 3. The pass also added a scoped-delta totals-correctness gate (`RISK-25`) so a wrong `affectedNodeIds` can never silently stale customer totals, scheduled the six static guardrails (`SC-1..6`) into Phase 0/9, and consolidated every behavior-preservation invariant into doc 28 (the operator console).

**Round-3 status:** the owner answered all open questions (`19_OPEN_QUESTIONS.md` §"2026-06-17 answer pass"), removing the owner-decision ceiling — every decision is now Closed, an accepted Decision, a scheduled Phase-0 Gate (with a non-regression default), or an explicit Defer. A re-audit (coherence + adversarial + feasibility lenses) then closed concrete defects: the `get_project_chart_buckets` RPC already exists (Phase 8 = review-and-harden, not author); D-016 reversed (no `@vercel/speed-insights` per Q-28 + a forbidding test); a Decision Resolution Protocol (doc 24 §6.1) makes execution non-blocking; Phase-0 exit criteria now have an EITHER/OR fixture-fallback branch.

## Success definition

- **Behavior preserved:** all 361 Vitest DOM tests + 5 unit tests stay green; `bun run validate` passes at every phase boundary; e2e + RLS proofs (`prove:rls-initplan`, `prove:estimate-tabs-rls`) unchanged.
- **Measured win:** per-keystroke compute in the estimate sheet drops measurably against the Phase 0 baseline (render-count budgets, route-transition medians, peak-load profile) — no metric regresses.
- **Structural win:** one tree kernel; `react-complex-tree` removed; one optimistic adapter; one query-key factory; duplicated primitives consolidated with a CI duplication-lint rule.
- **No new debt:** new scripts/budgets/RPCs are shipped with thresholds and wired into CI (Phase 9); DS duplication is enforced, not just documented.
- **Regression-gated:** every refactor lands behind a baseline-before-after comparison; HIGH/CRITICAL-risk items (per `16_RISK_REGISTER.md`) cleared with owner sign-off where flagged.
- **Dimension gates pass (round-2 additions):** UX/a11y gates green (transient-state preservation, roving/dialog focus, keyboard cell editing, visual-regression/CLS per doc 20); security `prove:*` set green (`prove:workshop-auth-boundary`, `prove:project-chart-buckets` cross-tenant denial, extended `prove:estimate-tabs-rls` CTE multi-role, ActionResult authz preservation, optimistic FORBIDDEN-path per doc 22); network/perf budgets met (per-route query-count/round-trip + payload + realtime-cost per doc 23); RUM + resource budgets met (field Web-Vitals wiring, `perf:memory-leak`, `perf:tbt`/exec-time, server/TTFB per doc 25).
- **Bible-coverage gates pass (round-4 additions):** the engineering guardrails + PR checklist (`27_ENGINEERING_GUARDRAILS_AND_PR_CHECKLIST.md`) are enforced as standing merge gates (Law-2/Law-3, static guardrails, 10-question PR checklist, Do-Not-Do banned patterns); the Next-16 Cache Components C0→C4 rollout and the React Compiler gated pilot (`26_NEXT16_CACHE_COMPONENTS_AND_COMPILER_PLAN.md`) are landed/advanced per their adoption criteria. Both are part of the standing definition of done.
- **Safety net green (round-5 addition):** doc 28 (`28_BEHAVIOR_PRESERVATION_AND_SAFETY_NET.md`) is the pre-merge operator console and part of the standing definition of done — no behavior-changing phase ships without its invariant proof gate green (invariant register, tripwire set, per-phase correctness gate independent of render-count, and kill-switch map all satisfied).
- **Owner decisions resolved:** every "Owner decision needed: yes" question is tracked with a deadline + safe default in `24_EXECUTION_GOVERNANCE_AND_ROLLOUT.md` and `19_OPEN_QUESTIONS.md` — none left silent.
- **Implementation-ready (non-blocking sense):** the pack is implementation-ready in the non-blocking sense — every phase has an objective Definition of Done; every decision has an accepted ruling or a safe default an implementer applies without waiting (per the Decision Resolution Protocol in `24_EXECUTION_GOVERNANCE_AND_ROLLOUT.md` §6.1); residual "Gate" items are Phase-0 measurements with non-regression defaults, not blockers. See also the answer-pass table in `19_OPEN_QUESTIONS.md` §"2026-06-17 answer pass".
