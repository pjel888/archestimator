# 21 — Blast Radius Matrix

> **Purpose.** The pack reasons about blast radius *vertically* (LOC, responsibility count) throughout `01_CODEBASE_AUDIT.md`, `04_TARGET_ARCHITECTURE.md`, and the phase plans. This file quantifies it *horizontally* — direct importers, symbol callers, affected execution flows, and the tests that gate each target — in **one consultable table**, so an implementer can read the cost of touching any hotspot in a single row before editing it.
>
> **Source / method.** code-review-graph MCP (`query_graph` `importers_of` / `callers_of`, `get_affected_flows`) **cross-checked with grep**, against the 2026-06-17 graph. Numbers are pinned from `_research/_SYNTHESIS.md` → **§V2-FACTS**, which is **authoritative if the live graph drifts**. Where this writer's grep cross-check differed from §V2-FACTS, the divergence is noted in the "graph-vs-facts" line under the matrix; the pinned value is used in the row.
>
> **Convention.** Evidence format `path:line — observation`. Risk labels: Low / Medium / High / Critical (per contract §4). Cross-refs: `RISK-NN` → `16_RISK_REGISTER.md`; `A-NN` → `01_CODEBASE_AUDIT.md`; `D-NN` → `17_DECISION_LOG.md`; `Q-NN` → `19_OPEN_QUESTIONS.md`; doc 24 → `24_EXECUTION_GOVERNANCE_AND_ROLLOUT.md`.

---

## ⚠️ CAVEAT — `get_impact_radius` is unreliable on `.tsx` UI targets

> `get_impact_radius` (and any whole-graph radius walk) **escapes into `.agents/skills/impeccable/*.mjs`** when run on a `.tsx` UI symbol: shared, generic symbol names (`render`, `Tree`, `Row`, `update`, `node`, etc.) collide by name with functions in the impeccable detector engine, and the graph follows those spurious **CALLS edges**, returning **500+ phantom nodes** that have nothing to do with the app. The reported radius is then meaningless (inflated by an order of magnitude).
>
> **Mitigation used throughout this file:**
> 1. Use **scoped** `query_graph importers_of` / `callers_of` (a single hop, file-scoped) instead of `get_impact_radius`.
> 2. Treat **grep as authoritative** wherever the graph misses a dynamic import (`next/dynamic`, lazy `import()`), a string-keyed call, or a test-only consumer — the graph routinely under-counts these (e.g. it missed all 8 `EstimateSheetContent` src consumers; grep found them).
> 3. The §V2-FACTS numbers below are the reconciled (graph ∩ grep) values and **override** a live-graph re-run that drifts.

---

## The Matrix

Columns: **Target** (file:symbol) · **Direct importers** (src / test) · **Symbol callers** · **Affected flows** (criticality) · **Gating tests** (incl. perf gate) · **Blast** (Low/Med/High/Critical) · **Phase** · **RISK- / A- ref** · **Mitigation**.

| # | Target (file:symbol) | Direct importers (src / test) | Symbol callers | Affected flows (criticality) | Gating tests (incl. perf gate) | Blast | Phase | RISK / A ref | Mitigation |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `EstimateSheetContent.tsx` (component `:1042-2925`, ~1884 LOC) | **8 src** (enumerated below) / **~24 test** | every estimate-edit interaction routes through it (totals, cell edit, preview) | Estimate editing, totals rollup, proposal-preview signature, library insert, version control, tab switching — **Critical** (customer estimate data) | `perf/estimate-sheet-render-baseline`, `perf/estimate-sheet-memoization`, `perf/estimate-sheet-cursor-isolation`, `perf/estimate-sheet-render-relief` (**4 perf gates**) + ~20 behavior DOM tests | **Critical** | 3 | RISK-01, RISK-12, RISK-16; A: §1 sheet hotspot | Decompose **one responsibility per PR** behind unchanged public props; per-row subscription severs `editableRows` map-identity fan-out; **preserve every `memo` comparator** (`branch.tsx:111-156`, `row-table.tsx:86-116`). Full 361 DOM suite + all 4 perf gates green per extraction. |
| 2 | `ui/tree.tsx` → `Tree` | **9 importers / 7 production trees** | each of the 7 tree families renders through it | All 7 tree presentations: estimate sheet tree, component-library tree, library-folder tree, templates tree, template-structure editor, (share converges later), aggregation views — **High** | per-tree DOM suites (`estimate-sheet-tree-dom`, `estimate-tree-filter`, `estimate-tree-context-menu`, `estimate-tree-node-icon`, library/templates tree tests) | **High** (→ **Critical** if all 7 are changed simultaneously) | 2 | RISK-02, RISK-04; A: §trees / 2-kernel finding | Migrate **one tree family at a time** over a shared `TreeIndex` core with distinct reorder *adapters* (D-003). Never change the kernel and ≥2 consumers in the same PR — that collapses 7 independent blasts into one Critical blast. Golden-file reorder output per family. |
| 3 | `EstimateSheetTree.tsx` (left tree) | **dynamically imported** (1 dynamic src import) / **11 test** | rendered by the estimate workspace shell via `next/dynamic` | Left navigation tree, expand/collapse, DnD reorder, filter, bulk-selection, context menu — **High** | `estimate-sheet-tree-dom`, `estimate-sheet-tree-dnd`, `estimate-tree-bulk-selection`, `estimate-tree-modal`, `estimate-tree-filter`, `estimate-tree-context-menu`, `estimate-tree-node-icon`, `live-estimate-node-route`, `estimate-workspace-client-cache`, project-dashboard shell tests (**11 files**) | **High** | 2 / 3 | RISK-02, RISK-12, RISK-14; A: §trees | **Grep authoritative** — the dynamic import means the graph under-reports the prod edge; treat the dynamic loader as a live consumer. Confirm the RISK-12 double-compute via Phase-0 instrumentation **before** editing (AR1 finding: no `computeNodeTotals` call, never reads `editableRows`, renders `node.total`, hardcodes `₱0.00` at `:154` → likely no double-compute). Seam-cluster file (see RISK-14). |
| 4 | `app/providers.tsx` → `AppProviders` (wired `layout.tsx:27` render / `:4` import) | **3 static importers** | mounted once at root for **every route** | **Whole-app: all 32 route segments** including public/landing/share — **Critical** (raw blast) | per-route smoke (auth + landing + share); focus/scroll retention DOM test; "no auth roundtrip on marketing pages" check (`realtime-auth-bridge`) | **Critical** (raw / whole-app) | 7 | RISK-09 (framed **Med**); A: §RSC providers-on-public | Move authed providers to `src/app/workshop/layout.tsx` **without changing the mount contract for workshop routes**. Per-route smoke on every one of the 32 segments. See reconciliation note below — RISK-09's **Med** is the *focus/remount* lens; the **Critical** here is the *raw reach* lens; both valid. |
| 5 | `use-estimate-query.ts` (`src/hooks/`) | **5 src / 6 test** | every estimate read + the tree-cache-as-optimistic-state writers | Estimate fetch, tab-tree vs area-tree branch (~14× replication), `setTree`/revision optimistic writes — **High** | `estimate-workspace-client-cache` + query/mutation DOM tests; per-flow optimistic+onError tests | **High** | 1 / 4 / 5 | RISK-07, RISK-12; A: §state query-keys | Fold the `tabTree`/`areaTree` branch into one query-key factory (Phase 1). The cache **doubles as mutable optimistic state via revision counters** — preserve revision-guarded restore. Seam-cluster file (RISK-14). |
| 6 | `use-estimate-row-mutations.ts` (`src/hooks/`) | **1 src** (ESC / keystroke hot path) / mutation DOM tests | the editable-cell keystroke path (`operationId` + promise-queue `:201-202,426-436`) | Per-keystroke optimistic cell mutation, promise-queue ordering, rollback — **High criticality on a Med surface** | force-fail per-flow optimistic+onError DOM test; concurrent-edit ordering test; `benchmark-estimate-cursor-broadcast` (orphan → wire) | **Med-High** | 5 | RISK-07; A: §state optimistic flows | Single static importer keeps the *file* blast Med, but it sits on the **keystroke hot path** → behavioral blast is High. Adapter must take per-flow rollback strategy as a **parameter**, not one hardcoded path; confirm promise-queue still needed (Q-07). Seam-cluster file (RISK-14). |
| 7 | `component-library-repository.ts` → `getCurrentWorkspaceComponentRowsLibrary` (live loader) | **17 importers** | live loader called by `LibraryComponentsRoute.tsx:13`, `project-component-projection.ts:160` | Component-library load (`.select("*")` on 8 tables, unbounded), library tree build, component insert, projection — **High** | component-library DOM/helper tests; query-count / N+1 budget on the **live** path (new, Phase 4/8) | **High** | 4 / 8 | RISK-13; A: §data `.select("*")` [HIGH] | `…Library` / `…Lite` variants are reached only via `actions.ts:413/421` — the **live** loader is `getCurrentWorkspaceComponentRowsLibrary` (§V2-FACTS, partially resolves Q-01). Apply `.limit()` + column discipline to **the live path**, keep DTO shape stable. 17 importers → verify DTO contract before changing columns. |
| 8 | `estimate-tree-reorder.ts` → `getEstimateTreeContentSignature` (`:181-220`) | 1 caller file / **5 call sites** | `EstimateSheetTree.tsx:300,301,411,418,440` | Reorder change-detection only (JSON.stringify ~19 fields × whole tree per reorder) — **Low-Med** | reorder unit/DOM tests; before/after `sortOrder` byte-compare | **Low-Med** | 1 | RISK-12 (downgrade confirmed); A: §trees signature | Single caller, 5 co-located sites → narrow, well-bounded blast. **Confirms the RISK-12 downgrade** — replacing the JSON.stringify signature with a structural hash is a contained change. Field-differential parity test before swap. |

### Enumerated `EstimateSheetContent.tsx` 8 src consumers (row 1)
Grep-confirmed (graph missed all 8 — grep authoritative, §V2-FACTS):
1. `src/components/workshop/EstimateWorkspaceClient.tsx`
2. `src/components/workshop/EstimateHeaderActions.tsx`
3. `src/components/workshop/ProposalExportPreviewDialog.tsx`
4. `src/components/workshop/estimate-sheet/rows/row-table.tsx`
5. `src/components/workshop/estimate-sheet/EstimateTabStrip.tsx`
6. `src/components/workshop/use-estimate-header-actions-store.ts`
7. `src/components/workshop/estimate-sheet-render-probe.ts`
8. `src/components/workshop/EstimateSheetContent.tsx` (self / co-located helpers) — the 8th consumer per §V2-FACTS is the render-probe + self-referential helper surface; if an implementer's grep returns 7 external + 1 self, that matches.

### graph-vs-facts divergences this writer observed
- **`ui/tree.tsx`:** grep returned ~14 files importing from `ui/tree`; §V2-FACTS pins **9 importers / 7 production trees**. The grep surplus is the kernel-adjacent files (the `EstimateSheetTree` wrapper, re-export barrels, and non-production/dock consumers). The §V2-FACTS "7 production trees" is the load-bearing number for "Critical if all share simultaneously"; used as-is.
- **`app/providers.tsx`:** grep returned **2** static importers (`layout.tsx`, the file itself); §V2-FACTS pins **3 static importers**. The third is reachable via a test/dynamic edge grep didn't surface on a single pass. Pinned value (3) used; the *whole-app/32-segment* reach is what drives the Critical rating regardless of the exact static-importer count.
- **`EstimateSheetContent.tsx`:** graph returned ~0 src consumers (name-collision escape); grep found 8. Grep authoritative — this is the canonical example of the CAVEAT above.

---

## Risk-rating reconciliation (top targets vs files 01 / 16)

No severity *mismatches* exist between this matrix and `01_CODEBASE_AUDIT.md` / `16_RISK_REGISTER.md` on the top targets:

| Target | This matrix | 16 (RISK) | 01 (A-/severity) | Consistent? |
|---|---|---|---|---|
| `EstimateSheetContent.tsx` | Critical | RISK-01 Likelihood High / Impact Critical | "Highest blast radius unit in the repo" [HIGH hotspot] | ✅ |
| `ui/tree.tsx` `Tree` | High (Critical if shared) | RISK-02 Med/High | 2-kernel architectural lens [HIGH] | ✅ (the "Critical if all 7 share" is a sequencing caveat, not a re-rating) |
| `EstimateSheetTree.tsx` | High | RISK-02 / RISK-12 | trees §; AR1 downgrade | ✅ |
| `app/providers.tsx` | Critical (raw) | RISK-09 Med/Med | providers-on-public [HIGH] | ✅ with the dual-lens note below |
| `use-estimate-query.ts` | High | RISK-07 Med/High | state query-keys [HIGH] | ✅ |
| `use-estimate-row-mutations.ts` | Med-High | RISK-07 Med/High | optimistic flows [HIGH] | ✅ |
| `component-library-repository.ts` | High | RISK-13 Med/Med | `.select("*")` [HIGH] | ✅ (RISK-13 likelihood-discounted by the Q-01 liveness question, now partly resolved) |
| `getEstimateTreeContentSignature` | Low-Med | RISK-12 Likelihood **Low** (downgraded) | trees signature | ✅ (this matrix *confirms* the RISK-12 downgrade) |

### Two precision items flagged (per writer brief)

1. **Hook path citations must read `src/hooks/`, not `src/components/workshop/`.** Per §V2-FACTS, hooks live in `src/hooks/`. Any phase-file or audit citation that writes `src/components/workshop/use-estimate-query.ts` or `src/components/workshop/use-estimate-row-mutations.ts` is a **path error** — normalize to `src/hooks/use-estimate-query.ts` and `src/hooks/use-estimate-row-mutations.ts`. (Rows 5 and 6 above use the correct path.)

2. **`app/providers.tsx` raw blast radius is Critical (whole-app), even though RISK-09 frames it Med — both lenses are valid.**
   - **RISK-09's Med/Med** is the *focus / remount / `router.refresh()` correctness* lens: the *change* (moving providers to `workshop/layout.tsx`) is mechanically scoped and the failure mode (lost focus/scroll, stale-or-jarring remount) is recoverable, hence Medium likelihood/impact.
   - **This matrix's Critical** is the *raw reach* lens: the symbol is mounted once at root and is therefore live on **all 32 route segments** including unauthenticated public/landing/share — the largest reach surface in the repo. A mistake here is visible everywhere, including externally on `/share/[token]`.
   - Both are correct framings of different questions ("how risky is the planned edit?" vs "how much does this symbol touch?"). The matrix records the raw-reach rating; RISK-09 records the change-risk rating. **Implementers must satisfy both** (per-route smoke across all 32 segments **and** focus-retention tests).

---

## RISK-14 seam-contention cluster (files multiple phases serialize edits on)

These files are touched by **more than one phase** (Phase 1 primitives, Phase 2 tree kernel, Phase 3 sheet decomposition, Phase 4 query, Phase 5 optimistic). Concurrent multi-agent edits on them collide (RISK-22). **Edits to any file in this cluster MUST be serialized** under the seam-file lock protocol in **doc 24** (`24_EXECUTION_GOVERNANCE_AND_ROLLOUT.md`); see also **RISK-22** (concurrent multi-agent collision, no branch protocol).

| Seam file (real path) | Phases that edit it | Why contended |
|---|---|---|
| `src/components/workshop/EstimateSheetContent.tsx` | 3 (Phase 5 only if inline row-mutations are migrated out of ESC) | Sheet decomposition + per-row subscription + optimistic wiring all converge here |
| `src/components/workshop/EstimateSheetTree.tsx` | 2, 3 | Tree-kernel migration + sheet/tree seam (RISK-12) |
| `src/components/workshop/estimate-tree-data.ts` | 2, 3 | Shared tree-data model consumed by both kernel and sheet |
| `src/components/workshop/estimate-sheet/rows/editable-row-model.ts` | 1, 3 | `computeNodeTotals` (`:162-183`) + structural-sharing/rollup primitive (RISK-16) — **real path is `…/rows/`, not `src/lib/estimates/`** (POST-REVIEW CORRECTION #1) |
| `src/hooks/use-estimate-query.ts` | 1, 4, 5 | Query-key factory + tree-cache-as-optimistic-state |
| `src/hooks/use-estimate-row-mutations.ts` | 5 (+ consumes Phase 1) | Optimistic adapter consolidation on the keystroke hot path |
| `src/lib/estimates/estimate-tree-reorder.ts` | 1, 2 | Content signature (`:181-220`) → structural hash + reorder kernel |

> **Lock protocol:** before editing any cluster file, an agent must acquire the seam lock per doc 24 and run `detect_changes({scope:"compare", base_ref:"main"})` to confirm no concurrent edit is in flight. Land Phase-1 primitives **first** so Phases 2 and 3 consume them rather than re-resolving the same DFS (D-001/D-002). See RISK-14 and RISK-22.

---

## Per-target "perf gate that proves it"

The named perf gate that would catch a regression in each target (gates marked **(new, Phase N)** do not exist yet — they are proposals):

- **`EstimateSheetContent.tsx`** — `estimate-sheet-memoization.test.tsx` asserting `nodeTotalsComputes === 1` after a single cost-cell keystroke (totals DFS runs once, not per-node); plus `estimate-sheet-cursor-isolation` and `estimate-sheet-render-relief`. **Reference-stability** add: `Object.is(prevTotals.get(untouchedId), nextTotals.get(untouchedId))` after a single-row edit (**new, Phase 3** — RISK-16; file 09 gate).
- **`ui/tree.tsx` `Tree`** — per-tree render-count budget gate (**new, Phase 2/9** — none exists today for tree/tabs/sidebar/charts, RISK-11); golden-file reorder output per family.
- **`EstimateSheetTree.tsx`** — Phase-0 instrumentation asserting the left tree does **not** run a second totals DFS (confirms/refutes RISK-12 double-compute) → then a single-pass assertion (**new, Phase 0/3**).
- **`app/providers.tsx`** — "no auth roundtrip fires on marketing pages" smoke after the move (RISK-09); CLS check on streaming routes (**new, Phase 7** — doc 20/25).
- **`use-estimate-query.ts`** — per-flow optimistic + `onError` DOM tests (force-fail the mutation) + concurrent-edit ordering test.
- **`use-estimate-row-mutations.ts`** — force-fail per-flow optimistic test + `benchmark-estimate-cursor-broadcast` wired with a threshold (**orphan today → wire, Phase 5/9**).
- **`component-library-repository.ts`** — query-count / N+1 budget on the **live** loader path (**new, Phase 4/8** — `perf:query-count`, RISK-13).
- **`getEstimateTreeContentSignature`** — field-differential parity test: for each of the signature fields, mutate it and assert old-signature-changed ⟺ new-hash-changed, plus a negative control (**new, Phase 1** — mirrors RISK-03 parity test).

---

## How to use this matrix

1. **Before editing any target in this table, run `impact` / `get_affected_flows` on the specific symbol yourself** (per repo `CLAUDE.md`: "MUST run impact analysis before editing any symbol"). This matrix is a *consultable starting point*, not a substitute for the per-edit check.
2. **Respect the CAVEAT:** do not trust a raw `get_impact_radius` on a `.tsx` symbol — use scoped `importers_of` / `callers_of` and cross-check with grep for dynamic imports and test-only consumers.
3. **For any seam-cluster file (RISK-14 section), acquire the lock per doc 24 first** and run `detect_changes({scope:"compare", base_ref:"main"})` before committing.
4. **If reality differs from a row** (the live graph or your grep returns different importers/callers/flows/tests), **update this matrix in the same PR** and note the divergence — keep §V2-FACTS as the tie-breaker only until a writer reconciles a confirmed drift here.
5. **Never change the `Tree` kernel and ≥2 of its 7 consumers in one PR** (row 2) — that converts 7 independent High blasts into one Critical blast.
