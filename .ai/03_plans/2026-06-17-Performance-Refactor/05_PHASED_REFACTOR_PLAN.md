# 05 — Phased Refactor Plan (Master Roadmap)

> **Authoring agent:** W5. **Status:** Authoritative master index for phase order, dependencies, and exit criteria. **Do not compress.**
>
> **Inputs (read in this order):** `_research/_SYNTHESIS.md` (contract — phase order §2, tracks §3, conventions §4) → `01_CODEBASE_AUDIT.md` (findings `A-01…A-40`) → `02_PATTERN_INVENTORY.md` (`PAT-NN`) → `04_TARGET_ARCHITECTURE.md` (end-state §1–§12). Risks live in `16_RISK_REGISTER.md` (`RISK-NN`); decisions in `17_DECISION_LOG.md` (`D-NN`); open questions in `19_OPEN_QUESTIONS.md` (`Q-NN`); validation semantics in `15_VALIDATION_MATRIX.md`.
>
> **Relationship to the detail files:** This file is the **master roadmap** — it owns the canonical order, the dependency graph, the per-phase summary (goal/why/deps/files/sequence/risks/non-goals/validation/QA/rollback/exit), and the cross-references to `A-NN`/`PAT-NN`. Each phase has a **detail file** (`06`–`14`) that elaborates one phase with implementation specifics. Where this file and a detail file disagree on **order, dependencies, or exit criteria, this file wins**; where they disagree on **implementation mechanics, the detail file wins**. The detail-file map is in §0.3.
>
> **Conventions (contract §4):** Priority `P0–P3`; Risk `Low/Medium/High/Critical`; evidence `path:line — observation`. Validation vocabulary is restricted to the commands in contract §4 / `15_VALIDATION_MATRIX §1`; any new command is flagged **(new, Phase N)** — a proposal, not runnable today. **Hard constraint (D-011):** this pack is **planning only** — no edits to `src/**`, `tests/**`, `e2e/**`, `scripts/**`, `supabase/**`, or config; no migration applied. Future migrations/indexes/RPCs/scripts are planning items carrying risk + validation only.

---

## 0. How to use this roadmap

### 0.1 The disciplined default order (PINNED — contract §2, D-001)

```
Phase 0  — Baseline, instrumentation, and guardrails
Phase 1  — Canonical indexes, selectors, and performance utilities
Phase 2  — Tree kernel unification (headless TreeIndex + ops)
Phase 3  — Estimate sheet decomposition and render isolation (break editableRows fan-out)
Phase 4  — Query / server-action / DTO standardization + select discipline
Phase 5  — Optimistic mutation lifecycle standardization (1 adapter, standard rollback)
Phase 6  — UI primitive consolidation + loading-state cleanup + DS duplication lint rule
Phase 7  — Bundle / code-splitting / runtime cleanup (provider topology, d3 dedup, share charts)
Phase 8  — Supabase / RPC / index / RLS performance pass (FK indexes, chart RPC, homebase RPC)
Phase 9  — CI benchmark gates and regression prevention
Phase 10 — Documentation, examples, and enforcement
```

The order is **foundation-first** (`D-001`, `D-008`): Phase 0 establishes the baselines every later phase compares against; Phase 1 ships the primitives that Phases 2 and 3 both consume; Phase 9 gates depend on Phase 0 instrumentation. **No deviation from this order was made by W5** — see §0.5.

### 0.2 The quick-win pull-forward option (contract §2 note, `D-002`)

Several Phase 7/8 items are cheap, isolated, high-leverage, and do **not** depend on the tree/sheet refactors. They **MAY** be pulled forward immediately after the Phase 0 baseline, each gated by `bun run validate` + the relevant baseline proof:

| Quick win | Normal home | Findings | Pre-conditions |
|---|---|---|---|
| Provider topology move (authed providers → `workshop/layout.tsx`) | Phase 7 | `A-01` | `ANALYZE=true bun run build` baseline (Q-09); route-smoke + focus tests (RISK-09) |
| `d3` → `d3-shape` dependency dedup | Phase 7 | `A-34` | Analyzer confirms only `d3-shape` is imported (Q-09) |
| Share-page dynamic chart import | Phase 7 | `A-35` | Analyzer share-chunk baseline; `shared-link-receiver.spec.ts` (RISK-04) |
| Hot-path FK indexes | Phase 8 | `A-27` | RLS/advisor review (RISK-05); planning item only — migration applied under its own gate |
| Ship `get_project_chart_buckets` RPC | Phase 8 | `A-24` | Golden-master chart oracle + deploy probe (RISK-05) |

Default remains the disciplined order; quick wins are an explicit, gated option, never a license to reorder the big refactors. Coordination risk if abused: `RISK-14`.

### 0.3 Detail-file map

| Phase | Detail file | Owner |
|---|---|---|
| 0 | `06_PHASE_0_BASELINE_PLAN.md` | W6 |
| 1 | `07_PHASE_1_FOUNDATION_PLAN.md` | W6 |
| 2 | `08_PHASE_2_TREE_KERNEL_PLAN.md` | W7 |
| 3 | `09_PHASE_3_ESTIMATE_SHEET_PLAN.md` | W8 |
| 4 | `10_PHASE_4_DATA_AND_CACHE_PLAN.md` | W9 |
| 5 | `11_PHASE_5_OPTIMISTIC_MUTATIONS_PLAN.md` | W10 |
| 6 | `12_PHASE_6_UI_PRIMITIVES_PLAN.md` | W10 |
| 7 | `13_PHASE_7_BUNDLE_RUNTIME_PLAN.md` | W10 |
| 8 | `14_PHASE_8_SUPABASE_DB_PLAN.md` | W9 |
| 9 | **No standalone detail file by design** — Phase 9 detail = `15_VALIDATION_MATRIX.md` (gates) + the Phase-9 prompt in `18_EXECUTION_PROMPTS.md`. (No `15_PHASE_9_*` file exists.) | — |
| 10 | **No standalone detail file by design** — Phase 10 is docs-only; its prompt lives in `18_EXECUTION_PROMPTS.md`. (No `16_PHASE_10_*` file exists.) | — |

**Cross-phase / program-wide detail docs (round-2 additions — not phase-scoped):**

| Doc | Scope | Applies to |
|---|---|---|
| `20_UX_UI_AND_INTERACTION_PLAN.md` | Cross-phase UX contract (transient-state preservation, perceived-latency contracts, a11y/visual-regression gates, DnD affordances, stale-badge debounce) | Phases 2, 3, 5, 6, 7 |
| `21_BLAST_RADIUS_MATRIX.md` | Per-target import/caller/flow/test blast radius — pre-edit reference | Every phase |
| `22_SECURITY_AND_RLS_THREAT_PLAN.md` | Auth-boundary continuity, new-RPC SECURITY model + cross-tenant denial proofs, `ActionResult` authz preservation, optimistic FORBIDDEN-path tests, recursive-CTE multi-role isolation | Phases 4, 5, 7, 8 |
| `23_NETWORK_AND_DATA_FLOW_PLAN.md` | Realtime channel/subscription budget, query-count/round-trip ceilings, payload-size budgets, prefetch/hydration | Phases 4, 8 |
| `24_EXECUTION_GOVERNANCE_AND_ROLLOUT.md` | Branch/PR/merge model, seam-file lock protocol (RISK-22), stop-the-line/abort criteria, safe-pause points, feature-flag rollout | Program-wide |
| `25_OBSERVABILITY_RUM_AND_RESOURCE_BUDGETS.md` | Field RUM/Web-Vitals wiring, memory/leak budget, bundle-exec-time/TBT budget, measurement methodology | Phases 0, 9 |
| `26_NEXT16_CACHE_COMPONENTS_AND_COMPILER_PLAN.md` | Gated Next-16 / React-19 feature-adoption track: C0→C4 Cache Components rollout + React Compiler purity-audit-then-pilot (both OFF by default, single-config-revert) | The Feature-Adoption Track (§F below); depends on Phases 1–3 + 7 |
| `27_ENGINEERING_GUARDRAILS_AND_PR_CHECKLIST.md` | Standing program-wide guardrails: §2 Law-2/Law-3 merge gates, 6 static checks, 10-question PR checklist, Do-Not-Do banned-patterns list | Program-wide (D-023, §0.8) |

### 0.4 Dependency graph (which phases must precede which)

```
            ┌─────────────────────────── Phase 0 (baseline/instrumentation) ───────────────────────────┐
            │  feeds EVERY later phase's before/after proof; feeds Phase 9 gate harness                  │
            ▼
        Phase 1 (primitives: TreeIndex builder, structuralHash, patchAndMarkStale, query-key factory)
            │
     ┌──────┴───────┐
     ▼              ▼
 Phase 2         Phase 3          (share seam files: estimate-tree-data.ts, editable-row-model.ts → serialize, RISK-14)
 (tree kernel)   (sheet decomp)   Phase 3 totals depend on Phase 1 parent-index + Phase 2 TreeIndex/rollup (D-012)
     │              │
     └──────┬───────┘
            ▼
        Phase 4 (query/DTO/select discipline) ──► Phase 5 (optimistic adapter; uses §3 ActionResult + §4 helpers)
            │
            ▼
        Phase 6 (UI primitives + skeleton + DS lint rule)   [independent of 2/3/4/5; can run any time after 1]
            │
            ▼
        Phase 7 (bundle/runtime)   [provider/d3/share are early-win eligible after Phase 0]
            │
            ▼
        Phase 8 (Supabase/RPC/index/RLS)  [FK indexes + chart RPC early-win eligible after Phase 0]
            │
            ▼
        Phase 9 (CI gates)  ──depends on──► Phase 0 instrumentation + every kernel's render-count test
            │
            ▼
        Phase 10 (docs + enforcement)
```

**Hard ordering edges:** 0 → everything; 1 → {2, 3}; {1, 2} → 3 (totals share the index, `D-012`); 4 → 5; 0 → 9. **Soft edges:** 6 may follow 1 directly; 7/8 quick wins may follow 0; **soft 3 → 5**: Phase 5's tree-patch reconciliation over `mapNode` is consumed by `useEstimateRowOperations` (extracted in Phase 3 **Step 6**) — either land Phase 3 Step 6 **before** Phase 5 Step 4, or confirm Phase 5 can centralize the reconciliation independently of that extraction. Phases 2 and 3 **share seam files** (`estimate-tree-data.ts`, `editable-row-model.ts`, `EstimateSheetTree.tsx`, `EstimateSheetContent.tsx`) — serialize edits to those files (`RISK-14`, `D-001`).

### 0.5 Ordering deviations made by W5

**None.** The pinned contract §2 order is used verbatim. The dependency graph (§0.4) and the quick-win option (§0.2) are clarifications, not reorderings. If a future implementer proves a better order, record it as a new `D-NN` in `17_DECISION_LOG.md` and update §0.1 here.

### 0.6 Per-phase template

Every phase below uses the same sections: **Goal · Why this phase exists · Dependencies · Candidate files · Implementation sequence · Risks · Non-goals · Validation commands · Manual QA checklist · Rollback strategy · Exit criteria**, plus the `A-NN`/`PAT-NN` it resolves. "Validation commands" lists only contract-§4 commands; proposals are marked **(new, Phase N)**.

### 0.7 Execution governance (D-015)

The program runs as concurrent multi-agent work against a shared repo, so execution is governed by `24_EXECUTION_GOVERNANCE_AND_ROLLOUT.md`. **EVERY phase PR follows doc 24** for: the branch/PR/merge model; the **seam-file lock protocol** (`RISK-22` — the `RISK-14` seam cluster `estimate-tree-data.ts`, `editable-row-model.ts`, `EstimateSheetTree.tsx`, `EstimateSheetContent.tsx` must not be edited concurrently); **stop-the-line / abort criteria** (program-level "dead" thresholds); **safe-pause points** for mid-session interruption; and **feature-flag / kill-switch rollout** for each risky phase.

Before editing any seam or high-blast-radius file, implementers **MUST** consult `21_BLAST_RADIUS_MATRIX.md` for the per-target blast radius and run `impact` + `detect_changes` (compare against `main`) to confirm the change touches only the expected symbols/flows. Adopted as **D-015**.

### 0.8 Standing engineering guardrails + PR checklist (D-023)

Independent of phase, **every PR in this program follows the standing artifacts in `27_ENGINEERING_GUARDRAILS_AND_PR_CHECKLIST.md`** (adopted as **D-023**):

- The **§2 Law-2 / Law-3 merge gates** — Law-3 ("name your normalize/index/project/render layers") is a hard merge gate for any feature touching a repeated data shape.
- The **6 static guardrail checks** (mechanical, repo-wide) — these become **Phase-9 CI gates** alongside `perf:gate`.
- The **10-question PR checklist** — run before opening any PR.
- The **Do-Not-Do banned-patterns list** — re-introducing a banned pattern fails review.

These are program-wide governance, not a phase: they apply from Phase 0 through Phase 10. The static checks are wired into CI in Phase 9 (see that phase's gate list) and documented/referenced from `15_VALIDATION_MATRIX.md` in Phase 10.

See `28_BEHAVIOR_PRESERVATION_AND_SAFETY_NET.md` for the consolidated operator safety console (D-024) that unifies the guardrails, tripwires, kill-switches, and behavior-preservation gates referenced across this pack.

---

## Phase 0 — Baseline, instrumentation, and guardrails

**Resolves:** `A-03` (analyzer has no script), `A-38` (only 4 render gates), `A-39` (no real large-data fixture), `A-40` (non-binding/absent budgets). Measurement for `A-01/A-17/A-20/A-22/A-34/A-35` (bundle + flag reality). · **Detail:** `06_PHASE_0_BASELINE_PLAN.md`.

**Goal.** Capture an honest, reproducible **before** state for every metric the program claims to improve, build the missing measurement instruments, and answer the measurement open-questions (`Q-05, Q-09, Q-10, Q-11, Q-12, Q-13, Q-13b, Q-16, Q-17, Q-19`) — without changing any product behavior.

**Why this phase exists.** Many findings are *import-graph-derived, not measured* (`RISK-06`, `RISK-11`, `D-008`). Refactoring on reasoning alone risks wasted or regressive work. Baseline-before-refactor (`D-008`, Accepted) is the program's discipline: no later phase lands without a Phase-0 number to beat.

**Dependencies.** None. Gates every later phase.

**Candidate files (read / instrument; planning-only edits proposed for later phases).**
- Analyzer: `next.config.ts:190-194` (bundle-analyzer wired, no script — `A-03`).
- Existing render gates (the template to replicate): `tests/vitest/perf/estimate-sheet-render-relief.test.tsx:162`, `-memoization.test.tsx:166-201`, `-cursor-isolation.test.tsx`, `-render-baseline.test.tsx:204-214`.
- Render probes to generalize: `estimate-sheet-render-probe.ts` (`reportEstimateSheetContentRender`, `reportEstimateNodeTotalsCompute`).
- Synthetic profile + manifest-only seed: `route-transition-peak-load-profile.test.tsx:63-66`, `scripts/seed-performance-test-data.ts:116` (`A-39`).
- Route-transition budgets (loose): `scripts/check-route-transition-readiness.ts:108-113` (`A-40`).
- Orphan benchmarks to run for a baseline number: `scripts/build-performance-query-inventory.ts`, `scripts/benchmark-proposal-workbook.ts`, `scripts/benchmark-estimate-cursor-broadcast.ts`.
- Virtualization flags (confirm prod state): `src/lib/workshop/virtualization-flags.ts` (`A-20`, Q-C/`Q`).
- Seam compute to instrument both sides: `EstimateSheetContent.tsx:1401-1406` (sheet totals) **and** `EstimateSheetTree.tsx` (its own DFS — `Q-05`/`RISK-12`).

**Implementation sequence.**
1. Add an `analyze` npm-script proposal (`A-03`) and run `ANALYZE=true bun run build`; record per-route First-Load-JS + chunk contents. Confirm/deny: supabase in landing chunk (`A-01`/Q-09), `react-complex-tree` absent from runtime bundle (`A-17`/Q-10), d3-only-d3-shape (`A-34`/Q-09), share chunk carries d3 (`A-35`).
2. Run `perf:measure-routes` then `perf:check-routes`; archive median/overlay/`_rsc` JSON as the route baseline.
3. Run `perf:profile-peak-load` (synthetic ≤200 rows) and record the number; note its self-flagged non-production caveat.
4. Generalize `estimate-sheet-render-probe.ts` into a reusable `createRenderProbe(name)` (proposal) so tree/tabs/sidebar/charts can expose counters; capture **current** counts as the baseline (no budget yet — that is Phase 9).
5. Build the **real large-data fixture** proposal — `perf:seed-db-fixture` **(new, Phase 0)** (1000+ row sheet, deep multi-level tree, 100+ project list) and `perf:profile-peak-load-large` **(new, Phase 0)**; capture peak-load numbers against it.
6. Run the orphan benchmarks once (`build-performance-query-inventory`, `benchmark-proposal-workbook`, `benchmark-estimate-cursor-broadcast`) to record a number; capture query-count per hot-path load as the `perf:query-count` **(new, Phase 0→9)** baseline.
7. Instrument **both** the sheet totals (`EstimateSheetContent.tsx:1402-1406`) and the left tree (`EstimateSheetTree.tsx`) compute on one keystroke to settle `Q-05`/`RISK-12` (double-compute?).
8. Answer the remaining measurement Q's: `lint:design` enforcing? (`Q-11` — note `15_VALIDATION_MATRIX §1` already corrects this to **enforcing**), CI scope (`Q-13`), double-fetch overlaps (`Q-17`), heavy-column usage (`Q-16`), client-bundled server code (`Q-19`).
9. Capture a **manual Chrome DevTools Performance trace** of every matrix flow (the only production-fidelity signal) to anchor the synthetic numbers.
10. Ratify all PROPOSED budgets in `03_PERFORMANCE_BASELINE_AND_BENCHMARKS.md §6`.

**Risks.** `RISK-06` (unverified bundle claims — this phase verifies them), `RISK-11` (test brittleness / loose budgets — this phase builds the fixture + render-count template), `RISK-12`/`Q-05` (seam double-compute — measured here).

**Non-goals.** No product behavior change. No refactor. No tightening of budgets to *gating* (that is Phase 9). No applied migration or new index (`D-011`).

**Validation commands.** `bun run validate` (floor); `ANALYZE=true bun run build`; `perf:measure-routes` + `perf:check-routes`; `perf:profile-peak-load`; `bun run scripts/build-performance-query-inventory.ts`; `bun run scripts/benchmark-proposal-workbook.ts`; **(new, Phase 0)** `perf:seed-db-fixture`, `perf:profile-peak-load-large`, `perf:query-count`, `perf:memory-leak`, `perf:tbt`, `perf:realtime-cost`, RUM field wiring (docs 23/25; baselines only — gating is Phase 9; detail in `15`).

**Manual QA checklist.** Chrome Performance capture (LCP/INP/long-tasks) for: landing, `/share/[token]`, `/workshop` homebase, estimates list, estimate sheet (keystroke into a cost cell), tree expand/collapse/filter, tab switch, charts load. Confirm both virtualization flags' prod state. Confirm no behavior changed (this is read-only).

**Rollback strategy.** N/A — instrumentation/measurement only; nothing to roll back. (New scripts are isolated and gated; if a new script is unstable, it is simply not wired into CI yet.)

**Exit criteria.**
- Bundle reality recorded; Q-09/Q-10 answered with analyzer evidence.
- Route + peak-load baselines archived (synthetic **and** large-fixture).
- `createRenderProbe` exists and current render/compute counts captured for tree/tabs/sidebar/charts.
- EITHER the real large-data fixture exists and a large-fixture peak-load number is recorded (at-scale), OR T4 has tripped (fixture proven infeasible per RISK-15/Q-24), the D-018 synthetic-only downgrade is recorded in `17_DECISION_LOG.md`, and affected Phase 2/3/4/7/8 exits are tagged "synthetic-only". One of these two states MUST hold; the fixture being merely "not yet attempted" does NOT satisfy this exit.
- Query-count baseline per hot-path load recorded.
- `Q-05` (seam double-compute), `Q-11`, `Q-13`, `Q-16`, `Q-17`, `Q-19` answered or explicitly carried forward with an owner.
- Every PROPOSED budget ratified or rejected; manual Chrome trace anchors each synthetic number.

---

## Phase 1 — Canonical indexes, selectors, and performance utilities

**Resolves:** foundations for `A-09` (totals parent-index), `A-11` (query-key factory), `A-12` (`patchAndMarkStale` ×22), `A-16` (structural-hash signature). · **Patterns:** `PAT` query-key conventions, `patchAndMarkStale` idiom, whole-tree signature. · **Detail:** `07_PHASE_1_FOUNDATION_PLAN.md`.

**Goal.** Ship the small, pure, well-tested primitives that Phases 2–5 consume, **without** wiring them into hot paths yet (mechanical, low-risk extractions): the `buildTreeIndex` parent/ancestor index, the `structuralHash` signature, the `patchAndMarkStale` helper, and the unified query-key factory.

**Why this phase exists.** Both the tree kernel (Phase 2) and the sheet (Phase 3) need the same index/rollup/hash primitives; building them once first prevents Phases 2 and 3 from forking near-identical helpers and minimizes rework (`D-001`). These are the leverage behind track 3 ("per-keystroke recompute elimination").

**Dependencies.** Phase 0 (baseline numbers the new primitives will be measured against). Feeds Phases 2, 3, 4, 5.

**Candidate files.**
- New primitive homes (`04_TARGET_ARCHITECTURE §4, §6`): `src/lib/tree/tree-kernel.ts` (`buildTreeIndex`, `structuralHash`), `src/lib/query/keys.ts` (factory), `src/lib/query/patch-and-mark-stale.ts`.
- Current implementations being generalized: `editable-row-model.ts:162-183` (`computeNodeTotals` — needs a parent index for incremental totals, `A-09`), `estimate-tree-reorder.ts:181-220` (`getEstimateTreeContentSignature` — target for `structuralHash`, `A-16`), `use-estimate-query.ts:10-16,40,101` (key factory + revision sibling-key, `A-11`/`A-12`), `favorites/query-keys.ts:1-5` + `notifications/useNotificationsQuery.ts:19-24` (the clean nested-factory template to adopt), `use-estimate-row-mutations.ts:204-394` (the ~14× `tabTree/areaTree` ternary + 22 `patchAndMarkStale` sites).

**Implementation sequence.**
1. `patchAndMarkStale(client, key, updater)` (`04 §4.2`) — extract the `setQueryData` + `invalidate({refetchType:"none"})` idiom, returning the snapshot for rollback. Pure, mechanical. Do **not** migrate the 22 sites yet (Phase 4/5 migrate them under their own tests).
2. Unified query-key factory `queryKeys` (`04 §4.1`) modeled on `favoritesQueryKeys`/`notificationQueryKeys`; add `estimate.tree(id, tabId?)` resolver + `treeRevision`. Keep **both** `tabTree`/`areaTree` arms until `Q-04` confirms retirement; do not yet rewrite the 14 ternary call sites.
3. `buildTreeIndex(roots, adapter)` (`04 §6.1`) producing `byId/parentOf/depthOf/pathOf/find/descendantsOf/ancestorsOf` + `rollup`. Unit-test against a fixture tree; assert `find` is O(1) and `rollup` recomputes only changed ancestors.
4. `structuralHash(idx, adapter, fields)` (`04 §6.1 item 7`) — enumerate the **exact** fields each consumer reads first (`A-16`/`RISK-03`: the 19-field reorder signature and the 15-field proposal signature) so the hash is field-equivalent. Add a parity test vs the existing stringify on a fixture.
5. Add focused unit tests for each primitive; keep `tests/vitest/perf/*` green (no hot-path wired yet).

**Risks.** `RISK-03` (signature semantics must cover exact fields — enumerate first, `D-010`), `RISK-14` (these primitives are the shared seam — land them before Phases 2/3 to avoid forks).

**Non-goals.** No wiring into `EstimateSheetContent`/`EstimateSheetTree`/mutations yet (that is Phases 2–5). No retirement of `areaTree` (gated on `Q-04`). No behavior change.

**Validation commands.** `bun run validate`; focused `bun run test:dom` on the new util tests + `tests/vitest/perf/*` (must stay green); `bun run type-check`.

**Manual QA checklist.** Spot-check one estimate sheet: keystroke isolation and totals are **unchanged** (primitives not yet wired). Confirm the new key factory produces byte-identical keys to the current ones for existing call patterns.

**Rollback strategy.** Each primitive is a new, unwired module — revert the file(s). Because nothing consumes them yet, rollback is a clean delete with zero blast radius.

**Exit criteria.**
- `patchAndMarkStale`, `queryKeys` factory, `buildTreeIndex`+`rollup`, `structuralHash` exist with passing unit tests.
- `structuralHash` proven **field-equivalent** to the existing stringify on a fixture (`RISK-03`).
- Key factory produces identical keys to current usage; `tabTree/areaTree` resolver present (both arms).
- `tests/vitest/perf/*` still green; `bun run validate` green.
- No hot path yet consumes the primitives (intentional).

---

## Phase 2 — Tree kernel unification (headless TreeIndex + ops)

**Resolves:** `A-14` (7 tree families re-solve the same ops), `A-15` (EstimateSheetTree rebuilds whole tree per keystroke), `A-16` (signature, completes), `A-17` (two presentation kernels + dead `react-complex-tree`), `A-18` (library taxonomy re-synth per build), `A-05` (secondary monoliths shrink). · **Track 1.** · **Detail:** `08_PHASE_2_TREE_KERNEL_PLAN.md`.

**Goal.** Replace the ≥8 find-by-id / ≥5 descendant / ≥4 ancestor-filter / ≥3 cascade re-implementations across the 7 tree families with **one headless `TreeIndex` + ops layer** (Phase-1 primitive, applied), built once per tree version; converge `WorkshopTree` → `Tree`; delete the dead `react-complex-tree` dep.

**Why this phase exists.** Trees are the central architectural lens (`R3`): the same DFS over different node types, mostly un-memoized, run per render/keystroke. One index kills the duplication **and** the per-keystroke rebuild (`A-15`). It is the #1 highest-leverage track (contract §3).

> **Perf-thesis caveat (AR3).** The steps converting families 2–6 (library/folder, templates, structure editor, share read-only, non-render traversals) deliver real **code-dedup** value but **no measurable hot-path perf win** — the headline keystroke-decoupling payoff (`A-15`) lands **only** when family 1 (the estimate sheet tree) converts. Because the estimate tree is adopted **first** (step 1) but the adapter shape is not frozen until the library-folder step, the program must **not** claim perf wins from the early tree-family conversions, and must run an **early de-risking probe** of the `SortOrderStrategy`/`moveNode` adapter shape against the **estimate family's** sort-order rules **before** freezing the adapter at the library-folder step (cross-ref file `08`, `Q-08`, `D-003`).
>
> **Family-1 sequencing reconciliation (D-014).** The "convert estimate tree LAST" framing elsewhere and "adopt estimate tree FIRST" (step 1 below) are reconciled as: **design + freeze the `moveNode`/`SortOrderStrategy` adapter SHAPE first** (validated by the early de-risking probe against the estimate family's sort-order rules), then **convert the estimate family's data structures last** so its hot-path perf win lands on a proven adapter rather than churning it. Accordingly Phase 2 carries a **two-tier exit**: a **code-dedup-green** tier (families consume the shared index; duplication removed) is satisfiable independently of, and **does not** mark passed, the **perf-win-green** tier (family-1 keystroke decoupling measured against the Phase-0 render-count baseline). The perf gate is **not** considered passed until family-1 lands (cross-ref `D-014`, doc `08`).

**Dependencies.** Phase 1 (`buildTreeIndex`, `structuralHash`, `rollup`). Coordinates with Phase 3 on shared seam files (`D-012`, `RISK-14`). Phase 0 render-count baseline anchors the win.

**Candidate files.**
- Estimate sheet tree (adopt first — highest churn): `EstimateSheetTree.tsx:193-236,300,301,328-339,411,418,440`, `estimate-tree-data.ts:395`, `lib/estimates/estimate-tree-{reorder,edit}.ts` (`reorder:63,156,181-220,222-251`; `edit:37,78,87`), `estimate-row-tree-patch.ts`, `lib/domain/estimate-tree.ts:54`, `lib/estimates/tree-hierarchy.ts:18-25`, `tree-selection.ts:23,40`.
- Library trees: `component-library/tree/{buildLibraryTree.ts:46-149,478-504, helpers.ts:28,39,52, LibraryTree.tsx}`, `component-library-manager/LibraryFolderTree.tsx:437`, `lib/component-library/library-folder-reorder.ts:1,86`.
- Templates / structure editor: `component-library/tree/TemplatesTree.tsx:659-730,841-849,878-898` (donate its indexed filter), `library/template-editor/TemplateStructureTree.tsx`.
- Share read-only: `share/ShareEstimateTreeView.tsx:298`, `lib/share/reconstruct-share-tree.ts:29` (500-row cap, `Q-02`).
- Presentation kernels: `ui/tree.tsx:30,278-284` (keep), `workshop-tree.tsx` (delete), `app/workshop/layout.tsx:15` (CSS import to drop), `package.json` (`react-complex-tree` dep to remove, `D-004`).
- Non-render traversals (later, low risk): `lib/project-charts/`, `lib/proposal-export/`, `lib/publication/snapshot.ts:135-163`, `lib/reusable-sources/source-collectors.ts`, `lib/component-library/estimate-templates.ts`.

**Implementation sequence (adoption order, `04 §6.4`).**
1. Adopt `TreeIndex` in the **estimate sheet tree** behind existing behavior: replace the ~15 fresh `findEstimateNode` DFS with `idx.find` (O(1)); replace the 2-filter full `toUiNode` rebuild with `filterKeepingAncestors(idx, …)` over a per-version index (`A-15`).
2. Swap the 5 `getEstimateTreeContentSignature` call sites (`EstimateSheetTree.tsx:300,301,411,418,440`) to `structuralHash` (`A-16`), preserving `mergeEstimateTreeStructureWithCachedNodes` change-detection (verify the diff still fires).
3. Collapse the near-identical reorder planners (`buildEstimateNodeReorderPlan` vs `buildLibraryFolderReorderPlan`) onto `moveNode`/`removeNodes` with **distinct sort-order adapters** (`D-003`; confirm `Q-08` before fully unifying — keep adapters if rules diverge).
4. Library/folder trees adopt the index; cache the taxonomy shell + precompute the category→node map once (`A-18`).
5. Templates adopt the index; **donate** `filterProjectSourcesByQuery` (`TemplatesTree.tsx:659-730`) as the canonical `filterKeepingAncestors` model.
6. Move Share's render onto `Tree` in read-only mode; then delete `WorkshopTree` (`A-17`).
7. Remove `react-complex-tree` (`D-004`): replace the `TreeItemIndex` type alias with `type TreeItemIndex = string` (`library-folder-reorder.ts:1,86`), drop the CSS import (`layout.tsx:15`), delete the dep — **only after** the Phase-0 analyzer confirms it is absent from the runtime bundle (`Q-10`).
8. Generalize cascade selection (`tree-selection.ts`) and rollups over the adapter (low-risk, last).

**Risks.** `RISK-02` (DnD/reorder/sortOrder regression — golden-file the planner output, migrate one family at a time, `Q-08`), `RISK-04` (Share/read-only mismatch — decide 500-row cap `Q-02` first), `RISK-06`/`Q-10` (verify dep absence before removal), `RISK-14` (shared seam files with Phase 3 — serialize edits), `RISK-12`/`D-012` (the shared index must serve both sheet and left tree).

**Non-goals.** Not decomposing `EstimateSheetContent` (Phase 3). Not changing virtualization thresholds (Phase 3). Not changing reorder *persistence rules* — only the engine. Not forcing all 7 families at once (estimate first, others as proven).

**Validation commands.** `bun run validate`; focused `bun run test:dom` tree groups (reorder 385, edit 189, filter 250, bulk-selection 180, context-menu 827, dnd, external-drop, row-patch 116); `bun run test:e2e` tree specs (`estimate-tree-dnd.spec.ts`); `bun run test` (`tree-selection` unit); `ANALYZE=true bun run build` (confirm `react-complex-tree` gone, `WorkshopTree` removed); `bun run storybook:validate` (a11y — roving focus on the unified `Tree`) + the UX `GATE-*` (doc 20); **(new, Phase 9)** `perf:render-budget` for tree expand/filter once it exists.

**Manual QA checklist.** Expand/collapse, filter (type a query char-by-char), drag-drop, multi-select cascade on **all 7 tree families** incl. the Share viewer and Templates. Byte-compare persisted `sortOrder` before/after on a fixture (RISK-02). Confirm Share `/share/[token]` renders identically post-`Tree` migration.

**Rollback strategy.** Migrate one tree family per PR; each PR is independently revertible. Keep the old DFS helpers in place until the index is proven for that family, then delete in a follow-up PR. The `react-complex-tree` removal is its own revertible PR (re-add dep + CSS import + type alias).

**Exit criteria (two-tier, `D-014`).**
- **Code-dedup-green tier:** families consume the shared index; duplicated find/descendant/ancestor/cascade helpers removed. (Satisfiable independently — does **not** by itself mark the perf gate passed.)
- **Perf-win-green tier (gates the perf claim):** estimate sheet tree uses `TreeIndex.find` (no fresh DFS) and `filterKeepingAncestors`; the per-keystroke whole-tree rebuild is gone (Phase-0 render-count baseline improved). Family-1 must land before the perf gate is marked passed.
- All 5 `getEstimateTreeContentSignature` calls use `structuralHash`; reorder change-detection still fires (golden-file parity).
- At least estimate + library + templates families consume the shared index; cascade/rollup generalized.
- `WorkshopTree` deleted; Share renders on `Tree`; `react-complex-tree` removed and absent from the bundle (analyzer-confirmed).
- All tree DOM/e2e suites green; persisted `sortOrder` byte-identical on the fixture.

---

## Phase 3 — Estimate sheet decomposition and render isolation

**Resolves:** `A-04` (1881-LOC god component), `A-07` (`editableRows` map-identity fan-out), `A-08` (preserve render guards — constraint), `A-09` (full-tree totals DFS per keystroke), `A-19` (proposal signature per keystroke), `A-20` (virtualization thresholds), `A-21` (resync rebuilds whole map). · **Tracks 2 & 3.** · **Detail:** `09_PHASE_3_ESTIMATE_SHEET_PLAN.md`.

**Goal.** Decompose the 1881-LOC exported component along `R4`'s responsibility map into hooks + presentational children, and **sever the `editableRows` map-identity fan-out** via per-row subscription — while **preserving every load-bearing `memo` guard** and keeping per-keystroke compute counters at their target (`nodeTotalsComputes === 1`, `proposalSignatureComputes === 0`, `rendersOutside === 0`).

**Why this phase exists.** `EstimateSheetContent.tsx` is the #1 hotspot and highest blast-radius unit in the repo. The map-identity coupling is the single highest-leverage perf fix; the decomposition makes the file maintainable and the fan-out fixable. It is track 2 (decomposition) + track 3 (per-keystroke recompute elimination), contract §3.

**Dependencies.** Phase 1 (parent-index for incremental totals, `structuralHash` for the proposal signature). Phase 2 (the shared `TreeIndex`/rollup — totals must read the **same** index the left tree reads, `D-012`/`RISK-12`). Coordinates on shared seam files (`RISK-14`).

> **CONDITIONAL (see D-013, Q-05):** AR1 found `EstimateSheetTree.tsx` has no `computeNodeTotals` call (`:154`) — the left tree renders totals from the tree-data model, not a per-keystroke DFS. If Phase 0 confirms no double-compute, the Phase-3 incremental-totals work depends only on the Phase-1 parent-index primitive, and full Phase-2 kernel adoption becomes parallel, not blocking. Keep the hard 2→3 edge only if Phase 0 finds the tree DOES double-compute.

**Candidate files.**
- `src/components/workshop/EstimateSheetContent.tsx` — exported fn `:1042-2922`; `editableRows` `useState` `:1093/1401`; fan-out memos/effects `:1252,1401,1405,1413,1429,1590`; ~10 mutation handlers reading `previousRows` `:1817,1974,2034,2081,2192,2328,2372,2434,2487,2512`; proposal signature `:287-318`, `:1250-1263`; resync effect `:1766-1783`; cursor layer (already extracted — the template) `:866-1040`; render tree `:2578-2922`.
- `src/components/workshop/estimate-sheet/rows/editable-row-model.ts:29-52` (`updateEditableRowValue` — returns a new top-level object), `:131-143` (`collectEditableRows`), `:155-160`/`:162-183` (`computeNodeTotal`/`computeNodeTotals`).
- Render guards to preserve (`A-08`): `estimate-sheet/branch.tsx:111-156,177`, `estimate-sheet/row-table.tsx:86-116,170,201-238,344-346`.
- Virtualization: `estimate-sheet/virtual-branch-list.tsx:34-42,44-125`, `row-table.tsx:22,130-138`, `src/lib/workshop/virtualization-flags.ts`.
- New target homes (`04 §7`): `src/components/workshop/estimate-sheet/rows/editable-rows-store.ts` (co-located with `editable-row-model.ts` per the `09 §4.1` sheet-math co-location law + `04 §7.2`; **NOT** `src/lib/estimates/`), hooks `useEstimateEditableRows`, `useEstimateTotals`, `useProposalExport` + `<ProposalExportController>`, `useEstimateActivityHistory`, `useEstimateRowOperations`, `useSheetDisplayTransforms`, `<EstimateSheetCenterColumn>`.

**Implementation sequence (highest-value first, one responsibility per PR).** *(Steps below map to `09 §12`'s authoritative **0–11** numbering — see doc 09 for the per-step detail. The map: per-row store = Step 4, incremental totals = Step 5, row-operations = Step 6, proposal signature = Step 7, center-column = Step 9. `24 §4`'s safe-pause table keys to the same `09 §12` numbering.)*
1. Extract the **well-gated, side-effect-isolated** concerns first to de-risk: `useEstimateActivityHistory` (already gated behind `inspector || rowDetails || projectSpecificRowId`), using the already-extracted cursor layer as the template.
2. Introduce the **per-row editable-rows external store** (`04 §7.2`, `editable-rows-store.ts`): components subscribe per `rowId` via `subscribeRow`; keep the per-row `memo` guard (`row-table.tsx:86-116`) — now reinforced. Whole-map `snapshot()` only on cold paths (export, reconcile). **Decide `Q-08b`** (cache vs atoms) with measurement before committing the shape.
3. Make totals **incremental** (`04 §7.3`, `A-09`): `useEstimateTotals` becomes a memoized `rollup` over the shared `TreeIndex`, recomputing only the edited row's ancestor chain. Reconcile the search/facet second-pass (`displayedNodeTotals`, `:1402-1406`) onto the same incremental rollup (`Q-08c`). Keep the `nodeTotals?.get(id) ?? computeNodeTotal(...)` fallback as a latent guard (`branch.tsx:177`).
4. Move the **proposal signature off the keystroke path** (`04 §7.4`, `A-19`): compute lazily on dialog-open + debounced, and/or via `structuralHash` over only the stale-badge fields.
5. Fix the **resync effect** (`A-21`): on server reconcile, **diff** changed rows against the index and patch only those, instead of rebuilding the whole map (`:1766-1783`).
6. Extract `useEstimateRowOperations` (the 15 mutation callbacks — largest LOC win; this feeds the Phase-5 optimistic adapter), `useSheetDisplayTransforms`, then the presentational `<EstimateSheetCenterColumn>` (pre-derived props only).
7. Virtualization (`A-20`): after the render-count gates prove no regression and the large fixture is available, lower thresholds / default-enable the flags (gated on `Q-C` prod-flag answer); cache `getScrollElement`/`findScrollParent` per container.

**Risks.** `RISK-01` (behavior regression — **Critical/High**; decompose behind unchanged public props, one responsibility per PR, full DOM suite each time, diff `computeNodeTotals` output on a fixture). `RISK-12`/`D-012` (seam double-compute — share one index with the left tree). `RISK-03` (proposal export mismatch — `structuralHash` must cover the exact 15 fields). `RISK-14` (shared seam files with Phase 2 — serialize). `RISK-11` (test churn from decomposition).

**Non-goals.** Not changing the tree kernel (Phase 2). Not removing any `memo` comparator (`A-08` constraint — the problem is **compute**, not row re-renders). Not changing the public props of `EstimateSheetContent`. Not merging `bulkSelectedRowIds` into a store (`Q-08e` — measure first; that is Phase 5 territory if at all).

**Validation commands.** `bun run validate`; `tests/vitest/perf/*` (relief/memoization/cursor/baseline) — **the load-bearing gate**, must keep `nodeTotalsComputes===1`, `proposalSignatureComputes===0`, `rendersOutside===0`; `bun run perf:profile-peak-load`; **(new, Phase 0)** `perf:profile-peak-load-large`; full `bun run test:dom`; `bun run test:e2e` (`estimates-crud-latency.spec.ts`); `bun run storybook:validate` (a11y — keyboard cell editing + ARIA preserved across decomposition) + the UX `GATE-*` (doc 20).

**Manual QA checklist.** Chrome Performance capture: keystroke into a cost cell → confirm **0** cross-area work and the left-tree DFS is **not** doubled (`Q-05` seam). Tab switch; filter active + edit; open proposal preview then keep typing (signature must not rebuild per keystroke); server reconcile mid-edit (resync patches only changed rows). Large-fixture sheet scroll (virtualization windows rows).

**Rollback strategy.** One responsibility per PR, each behind unchanged public props and revertible independently. Keep `computeNodeTotals` and `collectEditableRows` as fallback paths until the incremental/per-row versions are proven by the perf gates, then remove. The per-row store lands behind a measured `Q-08b` decision; if it regresses, revert to the single-map `useState` (the guards are unchanged either way).

**Exit criteria.**
- `EstimateSheetContent` reduced to a thin orchestrator (**objective target: orchestrator component ≤ ~400 LOC, down from 1881**; each extracted hook single-responsibility); public props unchanged.
- `editableRows` is per-row-subscribed; a keystroke in row A notifies only row A + its ancestor-chain totals.
- Totals are incremental over the shared `TreeIndex`; `nodeTotalsComputes === 1` per keystroke; the left tree is **not** double-computing (`Q-05`/`D-012` resolved).
- Proposal signature is off the keystroke path; `proposalSignatureComputes === 0` per keystroke; export output byte-identical on a fixture (`RISK-03`).
- Resync patches only changed rows on reconcile.
- All 361 DOM tests + the 4 perf gates green; large-fixture peak-load improved vs Phase-0 baseline.

---

## Phase 4 — Query / server-action / DTO standardization + select discipline

**Resolves:** `A-02` (`router.refresh()` ×12 / sparse streaming), `A-11` (key factory — applied), `A-12` (`patchAndMarkStale` ×22 — applied), `A-22` (component-library `.select("*")` discipline), `A-25` (`projects` `.select("*")` + activity N+1, the read-discipline part). · **Track 5 (the cache/discipline part).** · **Detail:** `10_PHASE_4_DATA_AND_CACHE_PLAN.md`.

**Goal.** Standardize the read/cache seam: adopt the Phase-1 query-key factory and `patchAndMarkStale` helper at all call sites; introduce the `ActionResult<T>` server-action envelope and explicit-column read DTOs; classify and reduce `router.refresh()`; replace `.select("*")` with explicit columns (+ `.limit()`) on the read paths.

**Why this phase exists.** Five query-key conventions + a 14×-replicated ternary + 22 copies of a subtle cache idiom are drift the optimistic adapter (Phase 5) cannot stand on. A uniform `ActionResult` envelope and DTO discipline are the precondition for the adapter's uniform `reconcile`/`rollback` (`04 §3, §4, §9.1`).

**Dependencies.** Phase 1 (factory + helper exist). Precedes Phase 5 (adapter consumes the envelope + helper). Phase 0 query-count baseline anchors the win.

**Candidate files.**
- Key/idiom migration sites: `use-estimate-row-mutations.ts:204,212,213,229,253,254,278,303,308,309,313,328,353,383,388,389,394,401` (the ~14× ternary + 22 `patchAndMarkStale`), `use-estimate-query.ts:10-16,40,59-143`, `component-library/query-keys.ts`, `favorites/query-keys.ts`, `notifications/useNotificationsQuery.ts:19-24`, `use-project-collaboration-query.ts:16-18`, ad-hoc inline keys `EstimateSheetContent.tsx:1181-1183`.
- `router.refresh()` classification (12 files — contract correction #3; real estimates-store call `ProjectEstimatesClient.tsx:215`) — `Q-08f`.
- Read discipline: `component-library-repository.ts:530-746` (`.select("*")` ×8, unbounded — gated on `Q-01` full-vs-Lite, `:1146`/`:1169`), `workspace-repository.ts:837,908,1356,1367` (`projects` `.select("*")`), `estimates/actions.ts:600-622,670-719` (activity actor-label N+1 + full-node scope fetch — the column/N+1 part; the recursive-CTE RPC is Phase 8).
- New homes: `src/lib/server/action-result.ts` (`04 §3`), DTO column-set modules modeled on `publication/public-repository.ts:85-97` split column sets and `project_estimate_list_summaries`.
- `staleTime` policy cleanup: `providers.tsx:18-19` (central default), remove ≥7 redundant `5*60*1000` restatements; keep intentional overrides (`use-sidebar-favorites-query.ts:30` staleTime 0; `EstimateSheetContent.tsx:1193-1196` long lazy cache).

**Implementation sequence.**
1. Migrate the ~14 `tabTree/areaTree` ternary sites to `queryKeys.estimate.tree(id, tabId?)` (mechanical; both arms still present pending `Q-04`).
2. Migrate the 22 `setQueryData + invalidate(refetchType:"none")` sites to `patchAndMarkStale` (mechanical; tree-reorder rollback unaffected — the revision sibling-key still via `treeRevision`).
3. Introduce `ActionResult<T>` + `ActionError` (`04 §3`); wrap existing thin RPC actions additively (underlying `*_with_history` RPCs untouched). Run `bun run build` after any `"use server"` edit (memory: only `next build` catches a non-async export).
4. Read DTOs: replace `projects` `.select("*")` (`workspace-repository.ts:837/908/1356/1367`) with explicit columns; apply explicit columns to the **live** component-library loader (full or Lite per `Q-01`/`RISK-13`) and add `.limit()` on `cost_library_items` + per-item history. Cross-check heavy-column usage (`Q-16`: `source_snapshot`/`metadata`) before trimming.
5. Activity history: fold actor labels into the event read to kill the second `profiles` hop (`:600-622`); explicit columns on the event payload (`A-25`). (The recursive-CTE node-scope RPC is Phase 8.)
6. `router.refresh()` classification (`Q-08f`): per call site, label "needs fresh RSC payload" (auth/permission/route-structure — keep, with a one-line justification comment) vs "scoped invalidation" (convert to `patchAndMarkStale`). Convert the clear invalidation cases; leave the genuine RSC cases.
7. `staleTime` cleanup: delete the ≥7 redundant restatements; keep the documented overrides.
8. (Optional, paired with Phase 7 streaming) introduce server-projection initial state via `setQueryData`-from-props where a client island currently fetches-then-derives.

**Risks.** `RISK-09` (router.refresh/invalidation — remount/stale risk; classify per call site, focus/scroll tests), `RISK-13`/`Q-01` (wrong component-library path — trace caller first), `RISK-07` (the `patchAndMarkStale` migration must not disturb reorder rollback). The `"use server"` async-export trap (run `bun run build`).

**Non-goals.** Not building the new RPCs (Phase 8). Not migrating the optimistic flows themselves (Phase 5). Not retiring `areaTree` (gated `Q-04`). Not changing optimistic semantics — only the key/helper/envelope plumbing.

**Validation commands.** `bun run validate`; `bun run build` (**`use server` async-export check**); `bun run prove:estimate-list-summaries`, `bun run prove:estimate-tabs-rls`; `bun run scripts/build-performance-query-inventory.ts` (wildcard-count down vs Phase-0); **(new, Phase 0→9)** `perf:query-count`; **(new, Phase 4)** `prove:action-authz` (`ActionResult<T>` wrap preserves interior authz — `RISK-21`, doc 22).

**Manual QA checklist.** Sheet load and list load — behavior unchanged; DevTools network round-trip count vs Phase-0 baseline (fewer columns / no new round-trips). Trigger each retained `router.refresh()` path and confirm the fresh-payload behavior; trigger each converted path and confirm the cache update is correct with no remount/focus loss.

**Rollback strategy.** Key/helper migrations are mechanical and per-file revertible. DTO column trims are revertible per repository function (revert to `.select("*")` restores the old shape). The `ActionResult` wrap is additive — revert the wrapper, the underlying RPC is untouched. `router.refresh()` conversions are per-call-site revertible.

**Exit criteria.**
- Zero hand-branched `tabTree/areaTree` ternaries; all use the resolver. All 22 patch sites use `patchAndMarkStale`.
- `ActionResult<T>` adopted by the touched actions; `bun run build` green (async-export check).
- `projects` and the live component-library loader use explicit columns; component-library reads bounded by `.limit()` (live path per `Q-01`).
- Activity actor-label N+1 removed; wildcard count down vs Phase-0 inventory.
- `router.refresh()` call sites classified; clear invalidation cases converted; retained cases justified inline.
- Redundant `staleTime` restatements removed; behavior unchanged (all DOM/e2e green).

---

## Phase 5 — Optimistic mutation lifecycle standardization

**Resolves:** `A-10` (13 flows / 5 rollbacks / 2 with none), `A-12` (tree-as-mutable-cache, formalized), `A-13` (Zustand: server-state-in-store, dup selection stores, hot dragState, arrays-for-sets). · **Track 4.** · **Detail:** `11_PHASE_5_OPTIMISTIC_MUTATIONS_PLAN.md`.

**Goal.** Collapse the 13 hand-rolled optimistic flows / 5 rollback mechanisms into **one `createOptimisticMutation` adapter** with pluggable rollback; give notifications + collaborator-role rollback (closing the no-rollback gap, per `Q-06`); and clean up the Zustand layer (merge selection/expansion stores, isolate `dragState`, arrays→Set/Map, retire `project-estimates-store`'s server-state ownership).

**Why this phase exists.** 13 flows × 5 rollback mechanisms is the largest correctness-and-maintainability liability in the state layer; two flows silently have no rollback. One adapter standardizes ordering/error handling while preserving each flow's required guarantee (`04 §8`, `D-005`). Track 4, contract §3.

**Dependencies.** Phase 1 (`patchAndMarkStale`, key factory), Phase 4 (`ActionResult` envelope + migrated call sites). Builds on the Phase-2 `mapNode` for the estimate tree-patch reconciliation. **Soft 3 → 5:** Step 4's `mapNode` reconciliation is consumed by `useEstimateRowOperations` (Phase 3 Step 6) — either land Phase 3 Step 6 before this step, or confirm Phase 5 can centralize reconciliation independently (§0.4).

**Candidate files.**
- Adapter home: `src/lib/query/create-optimistic-mutation.ts` (`04 §8`).
- Flows to migrate: `use-estimate-row-mutations.ts` (patch-snapshot `:395-398,312-318`; operationId + promise-queue `:201-202,426-436`), `use-estimate-query.ts:70-75,120-143,167-184` (revision-guarded restore + whole-tree snapshot), favorites cache-snapshot flow, `project-estimates-store.ts:35-102` (closure-restore engine — server state to retire), **no-rollback** `useNotificationsQuery.ts:83-164` + `use-project-collaboration-query.ts:45-63`.
- Tree-patch reconciliation pair: `patchEstimateRowItemInTree` + `findEstimateRowItemInTree` + `toXxxRowPatch` (centralize as estimate-domain `apply`/`reconcile` over `mapNode`).
- Zustand cleanup: `use-estimate-workspace-state.ts:105-108` (arrays + O(n) `areNodeIdsEqual`), `estimate-ui-store.ts:34-51` (overlapping selection + hot `dragState:49`), new `src/stores/estimate-workspace-ui-store.ts` (merged, Set/Map) + `use-estimate-drag-store` (isolated dragState), `use-estimate-header-actions-store.ts` (keep, document as event bridge), `bulkSelectedRowIds` local Set `EstimateSheetContent.tsx:1099` (`Q-08e` — measure before merging).

**Implementation sequence.**
1. Build `createOptimisticMutation` (`04 §8`) with **pluggable rollback** (patch-snapshot / whole-tree snapshot / revision-guarded / cache-snapshot / closure-restore / none) and an optional `identity.revisionKey` guard.
2. Migrate the **two no-rollback flows first** (notifications, collaborator-role) — pure correctness win, but decide `Q-06` (intentional eventual-consistency vs latent bug): make rollback **opt-in** so current behavior is preserved unless the owner chooses to fix (`RISK-08`, `D-005`).
3. Migrate the estimate-row flows: patch-snapshot, then the revision-guarded reorder restore (preserve the revision protocol via `treeRevision`), then the whole-tree move snapshot — **one flow per PR with parity proof**.
4. Centralize the tree-patch reconciliation (`patchEstimateRowItemInTree` etc.) as the estimate-domain `apply`/`reconcile` over `mapNode` (Phase 2).
5. Decide `Q-07` (is the per-row `operationId` + promise-queue still needed under the adapter?) by measurement; retain only if ordering still needs it.
6. Retire `project-estimates-store`'s server-state ownership → TanStack cache (`A-13`); keep its UI-only state if any.
7. Zustand structural cleanup (`04 §5`): merge `use-estimate-workspace-state` + `estimate-ui-store` selection/expansion into one store keyed by scope, arrays→`Set`/`Map`; **isolate `dragState`** into its own store (highest-frequency, lowest-coupling — do this first as the safest); evaluate `bulkSelectedRowIds` merge (`Q-08e` — measure, likely leave local).

**Risks.** `RISK-07` (consolidation loses a flow-specific guarantee — adapter takes rollback as a parameter, migrate one at a time, preserve revision guard, `Q-07`), `RISK-08`/`Q-06` (no-rollback flows — opt-in rollback, decide intent first), `RISK-01` (estimate state correctness — parity proof per flow).

**Non-goals.** Not changing the underlying `*_with_history` RPC contracts. Not forcing rollback onto intentional eventual-consistency flows. Not merging `bulkSelectedRowIds` without measurement (`Q-08e`). Not touching the render-isolation work (Phase 3) beyond consuming its row store.

**Validation commands.** `bun run validate`; full `bun run test:dom` (mutation/rollback DOM tests); `bun run test:e2e` (CRUD + collaboration specs); `tests/vitest/perf/*` (no render regression); **(new, Phase 5)** optimistic FORBIDDEN-path tests (rollback on a denied/authz-failed mutation — doc 22); **(new, Phase 9)** `benchmark-estimate-cursor-broadcast` wired with a threshold for ordering.

**Manual QA checklist.** Force a server error on each migrated flow → confirm correct rollback (especially notifications + collaborator-role, which had **none** before). Concurrent edits to the same row (ordering). Drag a node rapidly (dragState isolated — selection subscribers don't re-render). Selection/expansion across tabs (merged store).

**Rollback strategy.** One flow per PR, each keeping the old behavior until parity is proven, then deleting the old path. The adapter's pluggable rollback means a problematic flow can fall back to its original closure. The Zustand merge is staged: `dragState` isolation first (safest), then selection merge, each independently revertible.

**Exit criteria.**
- All 13 flows go through `createOptimisticMutation`; the 5 rollback mechanisms are expressed as adapter parameters, not bespoke code.
- Notifications + collaborator-role have rollback (or a recorded `D-NN` that no-rollback is intentional, opt-in).
- Revision-guarded reorder semantics preserved (concurrent-edit test green).
- `project-estimates-store` no longer owns server state.
- Selection/expansion merged into one Set/Map store; `dragState` isolated; selection subscribers don't re-render on drag.
- All DOM/e2e green; no render-isolation regression; `Q-06`/`Q-07`/`Q-08e` resolved or recorded.

---

## Phase 6 — UI primitive consolidation + loading-state cleanup + DS duplication lint rule

**Resolves:** `A-29` (DS linter has zero reuse rules — root cause), `A-30` (`Card` bypassed; `LiveProjectCard` un-memoized), `A-31` (icon-button forked ×3 + dead primitive + 19 raw strings), `A-32` (`BulkActionToolbar` ×2; `EstimateTabStrip` ignores `tab-strip`; 70 raw inputs), `A-33` (skeleton drift), `A-05` (secondary monoliths shrink as primitives absorb logic). · **Detail:** `12_PHASE_6_UI_PRIMITIVES_PLAN.md`.

**Goal.** Consolidate the 6 forked primitive families onto canonical primitives, memoize the un-memoized cards, unify the skeleton/loading-shell strategy, and — critically — **add a duplication/reuse lint rule** so re-introduced duplicates fail CI (the root-cause fix).

**Why this phase exists.** `DESIGN.md:426` calls a visible duplicate a "blocking design-system defect," yet the only enforcing gate (`enforce-app-design-system.mjs`) has **zero** reuse rules, so duplicates pass CI silently. Consolidating without the lint rule just re-drifts (`RISK-10`). This phase is largely independent of the data/sheet refactors and can run any time after Phase 1.

**Dependencies.** Phase 1 (none structural; can run after). Independent of Phases 2–5. Needs `Q-03` (bless-vs-refactor decisions) and `Q-11` (which gate is enforcing — note `15_VALIDATION_MATRIX §1` corrects this to: `lint:design` **is** enforcing) resolved before finalizing migration targets.

**Candidate files.**
- DS gate: `scripts/enforce-app-design-system.mjs:148-237` (token-only; add reuse/duplication + dead-primitive + skeleton-consistency rules — `D-006`).
- Cards: `LiveProjectCard.tsx:1-722` (722 LOC, un-memoized), `ProjectCard.tsx`, `EstimateListCard.tsx`, `ui/card.tsx` (0× imported in workshop).
- Icon-button: `ui/icon-button.tsx` (`IconButton` dead), `toolbar-icon-button.tsx`, `header-icon-toolbar.tsx`, + 19 raw class strings (`ProjectEstimatesTable.tsx:302,312,344`, `ProjectTeamspaceHeader.tsx:494`, `ComponentLibraryManager.tsx:451,581`, `EstimateColumnRuler.tsx:90`, `EstimateSheetContent.tsx:2753`, `AddComponentModal.tsx` ×4, `LiveProjectCard.tsx` ×2).
- Bulk toolbar: `ui/bulk-action-toolbar.tsx:1-219` vs `workshop/BulkActionToolbar.tsx:1-135` (delete the copy).
- Tab strip: `EstimateTabStrip.tsx:1-655` (654 LOC, ignores `tab-strip.tsx`) — `Q-03` bless vs refactor.
- Inputs: `SearchInput` (adopted in only 2 files), 70 raw `<input>`, 8 files hand-rolling `role="dialog"`.
- Skeletons/loading: `ui/skeleton.tsx` (correct), 6 bespoke `animate-pulse` (`data-table.tsx` ×2, `TemplatesTree.tsx`, `component-library/index.tsx`, 2 stories), `library/loading.tsx:1` (no shell) vs `workshop/loading.tsx`/`projects/loading.tsx` (`StaticWorkshopLoadingShell`); add `<Skeleton.List rows={n} />` (`04 §10`).

**Implementation sequence.**
1. **Add the duplication/reuse lint rule first** (`D-006`, `A-29`) to the enforcing gate; run it against the current tree — it must flag the known duplicates (`A-30…A-33`). Landing the rule first means every consolidation below is enforced as it lands, preventing re-drift.
2. Delete the `workshop/BulkActionToolbar.tsx` copy; route its callers to `ui/bulk-action-toolbar.tsx` (`A-32`).
3. Icon-button: collapse into one `Button variant="icon"` (or the blessed target per `Q-03`); migrate the 19 raw class strings; delete the dead `IconButton` (`A-31`).
4. Cards: make `ui/card.tsx` the structural base (header/media/body/footer slots); compose `LiveProjectCard`/`ProjectCard`/`EstimateListCard` on it; **memoize `LiveProjectCard`** (`A-30`).
5. Tab strip: per `Q-03`, either compose `EstimateTabStrip` on `tab-strip.tsx`/`Tabs` (keeping DnD/scroll/add-affordance feature-local) or formally bless the divergence with a recorded `D-NN` (`A-32`).
6. Inputs: mandate `SearchInput`/`ControlInput`; migrate the highest-traffic raw `<input>` sites; (dialog consolidation is optional / `Q-23`).
7. Skeletons: the 6 bespoke `animate-pulse` blocks adopt `Skeleton` (+ `motion-reduce`); add `<Skeleton.List>`; align `library/loading.tsx` to the shared shell (`A-33`, `Q-23`).

**Risks.** `RISK-10` (DS drift / under-enforcement — land the lint rule as part of consolidation, decide intentional-vs-accidental per family via `Q-03`). Pixel regression on consolidated components.

**Non-goals.** Not decomposing the secondary monoliths wholesale (they shrink as primitives absorb logic — `A-05`). Not changing token rules (already enforced). Not forcing a dialog-primitive migration if `Q-23` defers it.

**Validation commands.** `bun run validate`; `bun run lint:design-system` + `bun run lint:design` (+ the **new DS duplication rule** added here); `bun run storybook:validate` (a11y — dialog focus-trap/return-focus on consolidated primitives) + the UX `GATE-*` (doc 20); `bun run test:dom` (skeleton/primitive tests).

**Manual QA checklist.** Visual QA: cards, icon-buttons, bulk-action toolbar, tab strip, skeletons — pixel-diff before/after. Confirm `motion-reduce:animate-none` honored on all skeletons. Confirm the new lint rule fails on a deliberately seeded duplicate.

**Rollback strategy.** Each primitive family is its own revertible PR. The lint rule can be landed in warn-mode first, then promoted to error once the tree is clean (so it never blocks the consolidation it enables). Card/icon-button migrations are mechanical site-by-site reverts.

**Exit criteria.**
- The DS gate has a reuse/duplication rule that fails on a seeded duplicate; it flags **no remaining known duplicates** after consolidation (`RISK-10` closed via the root-cause lint rule, `D-006`).
- One `BulkActionToolbar`, one icon-button primitive (dead `IconButton` removed), `Card` is the structural base, `LiveProjectCard` memoized.
- `EstimateTabStrip` either composed on the primitive or formally blessed (`D-NN`); `SearchInput`/`ControlInput` adopted at the high-traffic sites.
- All skeletons use `Skeleton`(+`motion-reduce`); `Skeleton.List` exists; `loading.tsx` shells consistent.
- `storybook:validate` + `lint:design*` green; pixel-diffs accepted.

---

## Phase 7 — Bundle / code-splitting / runtime cleanup

**Resolves:** `A-01` (authed providers on public routes), `A-02` (streaming — the Suspense part), `A-17` (dead dep — completes with Phase 2), `A-34` (`d3` dedup), `A-35` (eager d3 charts on Data + Share), `A-36` (`optimizePackageImports` coverage). · **Track 5 (the bundle part).** · **Detail:** `13_PHASE_7_BUNDLE_RUNTIME_PLAN.md`.

**Goal.** Shrink the public/shared bundle and runtime cost: split provider topology so authed-only providers (supabase/realtime/notifications) stop loading on public routes; dedup `d3`→`d3-shape`; make d3 charts dynamic at **every** consumer incl. the public Share page; extend `optimizePackageImports`; add streaming + the `analyze` script.

**Why this phase exists.** The biggest app-shell win: `RealtimeAuthBridge` drags `@supabase/ssr` + supabase-js into the landing bundle and fires an auth roundtrip on marketing pages (`A-01`). The provider move, `d3` dedup, and share-chart dynamic import are **quick-win eligible** after Phase 0 (`D-002`).

**Dependencies.** Phase 0 (analyzer baseline — `Q-09`/`Q-10`/`RISK-06`: **do not act on any bundle claim before the analyzer confirms it**). Phase 2 (completes the `react-complex-tree` removal `A-17`). Provider/d3/share items are early-win eligible.

**Candidate files.**
- Provider topology: `src/app/layout.tsx:25-31`, `src/app/providers.tsx:30-46`, target `src/app/workshop/layout.tsx`, `src/components/realtime-auth-bridge.tsx:22-66` (`A-01`, `04 §1.1`).
- `d3` dedup: `package.json` (full `d3` dep), `CostDonutChart.tsx:4-5` (only `d3-shape` used) (`A-34`).
- Eager charts: `CostBreakdownSection.tsx:5` (Data route via `ProjectDataClient.tsx:82`), `SharePageTabs.tsx:23` (public `/share/[token]`), reference `ProjectChartsClient.tsx:26-29` (already dynamic) (`A-35`).
- Config: `next.config.ts:55` (`optimizePackageImports` → add `@tanstack/react-table`, `@tanstack/react-virtual`, `@radix-ui/react-context-menu`, `d3-shape`; normalize phosphor bare-barrel → `/dist/ssr`), `:64-67` (`staleTimes` — keep), `:190-194` (add `analyze` script) (`A-36`, `A-03`).
- Streaming: `projects/[projectId]/layout.tsx:42-51` (reference shape), estimates list / library overview / homebase routes (`04 §1.3`).
- Confirmed positives — **do not touch** (`A-37`): `create-proposal-workbook.ts` (exceljs server-only), `NeatWireframeBackground.tsx`/`HeroSection.tsx:11-14,117,132-141` (WebGL lifecycle).

**Implementation sequence.**
1. (Early-win) Move `RealtimeAuthBridge`, `NotificationProvider`, `PerformanceMonitor`, `NavigationListener`, `BfcacheHandler` from `providers.tsx` to `src/app/workshop/layout.tsx`; keep only the public-safe set (QueryClient/Toast/overlay) on root (`A-01`, `04 §1.1`). Verify focus/scroll and that no auth roundtrip fires on `/` (`RISK-09`).
2. (Early-win) Remove full `d3` from `package.json` (only `d3-shape` is imported — analyzer-confirmed, `Q-09`); `bun run validate` + smoke (`A-34`).
3. (Early-win) Make `CostDonutChart` dynamic at `CostBreakdownSection.tsx:5` and `SharePageTabs.tsx:23` (tab-gated), matching the already-dynamic charts route (`A-35`); confirm the share page still renders the chart post-import.
4. Extend `optimizePackageImports` one entry at a time with a before/after analyzer diff (`A-36`, `RISK-06`); normalize phosphor bare-barrel imports to `/dist/ssr`.
5. Add the `analyze` npm script (`A-03`).
6. Streaming (`A-02` Suspense part / `04 §1.3`): replicate the project-layout streaming shape on estimates list / library overview / homebase (the latter after Phase 8 collapses its serial tail), each using the canonical route shell (Phase 6) for pixel-consistency.

**Risks.** `RISK-06` (unmeasured bundle claims / barrel breakage — analyzer before/after each change, one `optimizePackageImports` entry at a time), `RISK-09` (provider move remount/focus — smoke + focus tests), `RISK-04` (share chart — keep render output identical).

**Non-goals.** Not removing `PerformanceMonitor` (it backs telemetry — relocate, don't delete). Not touching the confirmed positives (`A-37`). Not removing `QueryClientProvider` from root unless the analyzer shows it carries weight (`04 §1.1`). Not the homebase RPC itself (Phase 8).

**Validation commands.** `bun run validate`; `ANALYZE=true bun run build` (before/after: supabase leaves landing chunk; d3 dedup; share-chunk diff); `bun run build`; `bun run test:e2e` (`landing-audit.spec.ts`, `shared-link-receiver.spec.ts`, streaming spec); **(new, Phase 7)** `prove:workshop-auth-boundary` (unauthenticated workshop route → 302 login after the RSC→client provider move — `RISK-19`, doc 22) + a CLS check on streaming boundaries (doc 20); **(new, Phase 7/9)** `perf:bundle-budget`.

**Manual QA checklist.** Load landing + `/share/[token]` with the network panel — confirm **no** supabase-js / realtime / authed providers and **no** auth roundtrip on marketing pages; confirm charts lazy-load only when their tab opens. Confirm workshop routes still mount all authed providers correctly.

**Rollback strategy.** Provider move, d3 dedup, share-chart dynamic, each `optimizePackageImports` entry, and each streaming boundary are **independent revertible PRs**. The analyzer before/after is the proof for each; if a change doesn't shrink the bundle or breaks a barrel, revert that single change.

**Exit criteria.**
- Landing + `/share/[token]` chunks contain **no** supabase/realtime/notifications (analyzer-confirmed); no auth roundtrip on marketing pages (`landing-audit.spec.ts`).
- `d3` removed; only `d3-shape` shipped; charts dynamic at all three consumers.
- `optimizePackageImports` extended (each entry analyzer-verified); `analyze` script exists.
- Heavy authed routes stream behind the canonical shell.
- `bun run validate` + e2e green; per-route First-Load-JS improved vs Phase-0 baseline.

---

## Phase 8 — Supabase / RPC / index / RLS performance pass

**Resolves:** `A-22` (component-library bounded reads — DB part), `A-23` (homebase serial tail), `A-24` (chart RPC unshipped), `A-25` (activity recursive-CTE RPC), `A-26` (first-node oracle — optional), `A-27` (87 unindexed FKs — hot-path subset), `A-28` (verify RLS-initplan still holds). · **Track 5 (the DB part).** · **Detail:** `14_PHASE_8_SUPABASE_DB_PLAN.md`.

**Goal.** Plan (not apply — `D-011`) the DB-side performance work: hot-path FK indexes, ship `get_project_chart_buckets`, collapse the homebase serial tail (RPC or parallel wave), recursive-CTE RPC for activity node-scope, and verify RLS-initplan remediation still holds — each as a planning item carrying risk + validation.

**Why this phase exists.** The remaining high-leverage wins live at the data tier: 87 unindexed FKs (hot-path subset backs sidebar/homebase/list), a serial round-trip tail in homebase, JS aggregation that should be SQL, and a designed-but-never-shipped chart RPC. FK indexes + chart RPC are **quick-win eligible** after Phase 0 (`D-002`).

**Dependencies.** Phase 0 (query-count + latency baselines). Phase 4 (DTO/read discipline reduces what these RPCs return). Phase 7 streaming consumes the collapsed homebase. **Planning-only** — migrations are items, not applied (`D-011`).

**Candidate files / artifacts.**
- FK indexes (hot-path subset of `A-27`): `estimate_nodes(parent_id)`, `estimate_nodes(estimate_tab_id)`, `project_favorites`, `estimate_favorites`, `project_members`, `project_group_memberships`, `estimate_sheet_members`, `notification_deliveries(project|estimate|workspace)`. Defer audit/AI-table FKs (`Q-22`). Re-evaluate 13 `unused_index` after a longer window (`Q-14`).
- Chart RPC: `project-charts-repository.ts:101-128` (JS aggregation; `get_project_chart_buckets` referenced as ready but `rg` → 0 migrations) (`A-24`).
- Homebase serial tail: `workspace-repository.ts:1126-1222` (5–7 sequential awaits, several independent — parallelize the favoriteProjects/favoriteEstimates/recentEstimates trio first; do **not** parallelize the `sharedProjects` follow-up `:905-913` which depends on `sharedProjectIds`) (`A-23`).
- Activity node-scope: `estimates/actions.ts:670-719` (full-node fetch + JS BFS `:640-662` → `WITH RECURSIVE` RPC `estimate_activity_node_scope`) (`A-25`).
- First-node oracle (optional): `workspace-repository.ts:1620-1683` (window-function RPC honoring depth/area ordering) (`A-26`).
- Verify-don't-rebuild (`A-28`): `publication/public-repository.ts:85-97` (the pattern to generalize), prior remediation `…20260614162000_rls_initplan_auth_uid.sql`, `prove:rls-initplan` harness.

**Implementation sequence (each a planning item with risk + validation; applied under its own gate later).**
1. (Early-win) Plan the hot-path FK indexes (`A-27`) with explicit RLS/SECURITY-DEFINER review (`RISK-05`); defer audit/AI FKs (`Q-22`); plan the `unused_index` re-evaluation after a longer `pg_stat_user_indexes` window (`Q-14`) — do **not** drop on a young DB.
2. (Early-win) Plan shipping `get_project_chart_buckets` (`A-24`): the recursive-CTE/aggregation RPC, golden-master oracle parity (charts already have golden-master DOM tests), deploy probe with fail-open on partial drift; payload stays buckets-only (no raw facts).
3. Plan collapsing the homebase serial tail (`A-23`): parallelize the provably-independent trio first; or a `workspace_homebase_summary` RPC. Validate round-trip count down (`perf:query-count`).
4. Plan the activity `estimate_activity_node_scope` recursive-CTE RPC (`A-25`) to replace the JS BFS full-node fetch; fold actor labels server-side (paired with Phase 4's N+1 fix).
5. (Optional) Plan the first-node window-function RPC (`A-26`).
6. Verify RLS-initplan still holds (`A-28`, `Q-12`): plan a `prove:rls-initplan` + advisor security pass confirming no post-`…162000` bare `auth.uid()` in a USING/CHECK clause.

**Risks.** `RISK-05` (RLS/security regression — **Critical**; new RPCs as planning items with explicit RLS + `SECURITY DEFINER`/`search_path` review, advisor + `prove:rls-initplan`, cross-tenant test for any new RPC — owner decision needed for any new SECURITY DEFINER RPC), `RISK-13`/`Q-01` (component-library bounded-read targets the live path), `RISK-12` (the chart/activity rollups must not double-compute).

**Non-goals.** **No migration applied in this pack** (`D-011`). No dropping of `unused_index` without a longer window (`Q-14`). Not the client-side cache work (Phase 4). Not rebuilding the confirmed-good patterns (`A-28` — generalize, don't replace).

**Validation commands.** `bun run validate`; `bun run prove:rls-initplan`, `bun run prove:estimate-list-summaries`, `bun run prove:unify-kinds`, `bun run prove:estimate-tabs-rls`; `bun run build` (if actions touched — async-export check); **(new, Phase 8)** cross-tenant RPC denial proofs for every new RPC — `prove:project-chart-buckets` (cross-tenant) + extended `prove:estimate-tabs-rls` (CTE multi-role isolation), `RISK-20`, doc 22; **(new, Phase 0→9)** `perf:query-count` (homebase round-trips down; chart RPC push-down — doc 23). Re-run Supabase `get_advisors` (MCP) after any future migration is actually applied (out of this pack's scope).

**Manual QA checklist (for when applied later, not this pack).** DevTools: homebase load, charts load — round-trip count + latency vs Phase-0 baseline. Cross-tenant access test for any new RPC. Golden-master chart parity before/after the RPC cutover. Confirm FK indexes don't change any access decision.

**Rollback strategy.** Every DB item is a discrete planning artifact; when applied later, each migration is its own up/down. FK indexes are non-destructive (drop to revert). The chart RPC cutover keeps the JS path until golden-master parity is proven, then switches (revertible by flag). The homebase change is code-only (revert the repository function).

**Exit criteria (for this planning pack).**
- Each DB item exists as a planning artifact with: exact target, risk (`RISK-05`-reviewed), validation command, and an explicit "to be applied in Phase N" marker.
- Hot-path FK index list finalized; audit/AI FKs explicitly deferred (`Q-22`); `unused_index` flagged for a longer window (`Q-14`).
- `get_project_chart_buckets` design + golden-master + deploy-probe plan documented.
- Homebase collapse plan (parallel wave vs RPC) documented with the independence analysis.
- Activity recursive-CTE RPC + first-node RPC (optional) documented.
- RLS-initplan verification plan (`Q-12`) documented. **No migration applied.**

---

## Phase 9 — CI benchmark gates and regression prevention

**Resolves:** `A-38` (only 4 render gates — replicate), `A-39` (no large fixture — use Phase-0's), `A-40` (non-binding/absent budgets — tighten + add). · **Detail:** Phase-9 plan (gates).

**Goal.** Turn the Phase-0 instrumentation into **hard CI gates** so a perf regression fails the build: render-count budgets for tree/tabs/sidebar/charts, a query-count/N+1 budget, a bundle-size budget, a large-fixture peak-load profile, and tightened route-transition budgets — aggregated into a single `perf:gate`.

**Why this phase exists.** CI today already runs build, `lint:design`, `test:e2e`, and `test:e2e:perf` (Q-13 answered, `.github/workflows/ci.yml:21-31`) — but the new perf/security gates (`perf:render-budget`, `perf:query-count`, `perf:bundle-budget`, `perf:profile-peak-load-large`, `perf:gate`, plus the analyzer) are **NOT in CI today** and need **NEW CI wiring** here. Without those gates, every win from Phases 2–8 can silently re-regress. The 4 existing jsdom render-isolation tests are the template (`A-38`); this phase generalizes them and makes the loose budgets bite (`A-40`).

**Dependencies.** Phase 0 (instrumentation, `createRenderProbe`, large fixture, baselines). Each kernel's render-count test depends on that kernel's phase landing (2/3/6). `Q-13` is answered (`.github/workflows/ci.yml:21-31`): `test:e2e`/`test:e2e:perf` already run in CI, but the analyzer + package-level perf scripts do not — so the new perf gates require NEW CI wiring in this phase.

**Candidate files / artifacts.**
- Template: `tests/vitest/perf/{estimate-sheet-render-relief,-memoization,-cursor-isolation,-render-baseline}.test.tsx`.
- New render-count gates for: tree expand/collapse + filter, tab switch, right-sidebar search, charts (`04 §11`).
- Query-count: wire `scripts/build-performance-query-inventory.ts` (orphan) into a gated `perf:query-count`.
- Bundle: the `analyze` script (Phase 7) + a per-route/chunk kb ceiling → `perf:bundle-budget`.
- Large fixture: Phase-0 `perf:seed-db-fixture` + `perf:profile-peak-load-large` (tightened ceiling).
- Route budgets: `scripts/check-route-transition-readiness.ts:108-113` (tighten 15s/10s/30s + overlay cap 1.0 to real warm targets — `Q-21`).
- Orphan benchmarks to wire with thresholds: `benchmark-proposal-workbook`, `benchmark-estimate-cursor-broadcast` (`Q-20`).

**Implementation sequence.**
1. Generalize `createRenderProbe` (Phase 0) and add render-count budget tests modeled on the 4 existing gates for tree/tabs/sidebar/charts (`perf:render-budget` **(new, Phase 9)**) — each asserting exact `0`/`1` counts.
2. Wire `build-performance-query-inventory` into a gated `perf:query-count` **(new)** with per-flow ceilings + N+1 detection.
3. Add `perf:bundle-budget` **(new)** parsing analyzer output: per-route kb ceiling + "no supabase/realtime in landing."
4. Tighten `perf:check-routes` budgets to real warm targets (`Q-21`); convert peak-load to a bounded gate against the large fixture (`perf:profile-peak-load-large`).
5. Wire the orphan benchmarks with thresholds (`Q-20`).
6. Wire the **6 static guardrail checks SC-1..6** (doc 27 — mechanical, repo-wide) into the gated set: aggregate them into `perf:gate` alongside the perf budgets and add them to the CI gated set so re-introducing a banned pattern fails the build. This resolves the §0.8 forward-reference ("the static checks are wired into CI in Phase 9").
7. Aggregate all into `perf:gate` **(new, Phase 9)** and wire into CI (contingent on `Q-13`).
8. Prove each gate **bites**: introduce a deliberate regression (perf budget **and** an SC-1..6 banned pattern) and confirm it fails.

**Risks.** `RISK-11` (test brittleness / loose budgets — prefer behavior assertions; the gate must fail on a seeded regression). Over-tight budgets that flake (calibrate against Phase-0 medians + device profile `Q-18`).

**Non-goals.** Not adding new product behavior. Not re-doing the instrumentation (Phase 0 built it). Not the docs (Phase 10).

**Validation commands.** `bun run validate`; **(new, Phase 9)** `perf:gate` = `perf:render-budget` + `perf:query-count` + `perf:bundle-budget` + `perf:profile-peak-load(-large)` + `perf:memory-leak` + `perf:tbt` (exec-time) + `perf:realtime-cost` + tightened `perf:check-routes` + the **6 static guardrail checks SC-1..6** (doc 27), plus the RUM field dashboard (docs 23/25); the wired orphan benchmarks.

**Manual QA checklist.** Confirm CI actually runs `perf:gate` (answers `Q-13`). For each budget, seed a deliberate regression and confirm CI goes red. Confirm budgets calibrate to the ratified Phase-0 baselines + target device/network (`Q-18`).

**Rollback strategy.** Each gate is added in warn-mode first, then promoted to error once stable. A flaky gate can be demoted to warn without blocking. The aggregate `perf:gate` is the last thing wired; until then each sub-gate runs independently.

**Exit criteria.**
- Render-count budgets exist for tree/tabs/sidebar/charts (exact `0`/`1`); the 4 original gates still green.
- `perf:query-count`, `perf:bundle-budget`, large-fixture peak-load, tightened route budgets all exist and **fail on a seeded regression**.
- Orphan benchmarks wired with thresholds.
- The **6 static guardrail checks SC-1..6** (doc 27) are aggregated into `perf:gate` and in the CI gated set; a seeded banned-pattern reintroduction fails the build (closes the §0.8 forward-reference).
- `perf:gate` aggregates them and runs in CI (or `Q-13` resolved with an explicit CI plan).

---

## Phase 10 — Documentation, examples, and enforcement

**Resolves:** durability of every prior phase; closes the loop on `A-29`/`D-006` enforcement; documents the canonical kernels (`A-14`, `A-04`, `A-10`) so the next contributor reuses rather than re-forks. · **Detail:** Phase-10 plan (docs).

**Goal.** Document the canonical kernels (TreeIndex/ops, the sheet decomposition, the optimistic adapter, the query-key factory, the DTO/RPC discipline, the perf-gate system), add copy-pasteable examples, and ensure every new gate is wired + referenced so the wins are durable.

**Why this phase exists.** The refactor's value compounds only if the next contributor finds and reuses the kernels instead of re-forking (the exact failure mode that produced 7 tree families, 13 optimistic flows, 6 primitive forks). Documentation + enforcement is what makes "don't rebuild the confirmed-good" stick.

**Dependencies.** All prior phases (documents their end-state). Phase 9 (references the gates).

**Candidate files / artifacts.**
- `DESIGN.md` (reuse contract — link the new duplication lint rule), `AGENTS.md`/`CLAUDE.md` (point implementers at the kernels), `.ai/10_state/decisions.md` (record the accepted `D-NN`).
- New kernel docs/examples: TreeIndex+ops usage, sheet hook map, `createOptimisticMutation` recipe, `queryKeys` factory + `patchAndMarkStale` recipe, DTO/RPC discipline, `createRenderProbe` + `perf:gate` how-to.
- Storybook examples for the consolidated primitives (Phase 6).
- `15_VALIDATION_MATRIX.md` (mark the new gates as enforced); this `05` roadmap (mark phases done).

**Implementation sequence.**
1. Write the kernel usage docs + minimal examples (one per canonical kernel).
2. Add Storybook examples for the consolidated primitives.
3. Update `DESIGN.md`/`AGENTS.md`/`CLAUDE.md`/`decisions.md` to point at the kernels and the new gates; record accepted decisions.
4. Confirm every new gate is documented and referenced from `15_VALIDATION_MATRIX.md`; mark the roadmap phases complete.
5. Re-run `perf:gate` to confirm green end-state.

**Risks.** Documentation drift (mitigated by keeping examples as runnable Storybook/tests). Low overall risk.

**Non-goals.** No new refactor. No new gates (Phase 9 owns those).

**Validation commands.** `bun run validate`; `bun run storybook:validate`; re-run **(new, Phase 9)** `perf:gate` to confirm green.

**Manual QA checklist.** Docs review: a new contributor can find and use each kernel from the docs alone. Confirm every gate is referenced from the validation matrix. Confirm `decisions.md` records the accepted `D-NN`.

**Rollback strategy.** Docs-only; revert the doc/example commits if inaccurate. No product blast radius.

**Exit criteria.**
- Each canonical kernel has usage docs + a runnable example.
- `DESIGN.md`/`AGENTS.md`/`CLAUDE.md`/`decisions.md` reference the kernels + gates.
- Every new gate documented + referenced from `15_VALIDATION_MATRIX.md`; `perf:gate` green.
- This roadmap's phases marked complete with their before/after evidence linked.

---

## Track F — Next-16 / React-19 Feature-Adoption Track (gated, sequenced LATE)

**Status:** A **gated adoption track**, NOT a renumber or reorder of the 0–10 phases. It is sequenced **deliberately late** — it begins only **after** the Phase 1–3 purity/decomposition work and the Phase 7 bundle work have landed. · **Detail:** `26_NEXT16_CACHE_COMPONENTS_AND_COMPILER_PLAN.md`.

**Why late (and gated, not foundational).** Cache Components and the React Compiler are **multipliers on clean architecture, not substitutes for it.** The Compiler only safely auto-memoizes code that is already pure (Phases 1–3 establish that purity); Cache Components only pay off once the editor's render isolation and the bundle/provider topology are already sound (Phases 3 + 7). Adopting either before the foundation is in place risks masking — or being defeated by — the very impurity and coupling this program removes. Hence this track is **last**, behind hard dependency gates.

**Dependencies.** Phases 1–3 (purity primitives + estimate-sheet decomposition / render isolation) **and** Phase 7 (bundle / provider-topology cleanup) must be complete. Phase 0 baselines + Phase 9 render/bundle gates anchor the before/after.

**Cache Components rollout order (C0→C4, editor LAST).** Roll out in the documented order, converting the editor **last**:
- **C0** — enablement scaffolding + measurement harness (no surfaces cached yet).
- **C1 → C3** — progressively cache the lower-risk read surfaces (marketing/public, then list/homebase read paths, then secondary authed read surfaces).
- **C4** — the estimate editor / sheet, **converted last**, only after C1–C3 are proven and the render-isolation gates still hold.

**React Compiler gate (purity-audit-then-pilot).** The Compiler is adopted via a **purity audit first, then a scoped pilot** — never repo-wide by default. The audit confirms the Phase 1–3 purity invariants hold for the pilot scope; only then is the Compiler enabled for that scope as a pilot, measured against the Phase-0/Phase-9 render baselines.

**Both OFF by default, single-config-revert.** Neither `cacheComponents` nor `reactCompiler` is enabled in production without passing its gate; both are controlled by a single config switch so the **entire track is revertible by reverting one config change** (no scattered code rollback). Cookies/`headers()` access stays **outside** cached scopes (a cached scope must not read per-request private data).

**Gating decisions / risks / questions.** This track is governed by **D-021** and **D-022** (the adoption decisions), **RISK-23** and **RISK-24** (the adoption risks — stale-private-data and compiler-miscompile/over-memoization), and the open questions **Q-36** and **Q-37**. The track does not start until its dependency phases are green and these gates are satisfied; see doc 26 for the full gate definitions, the C0→C4 surface list, the purity-audit checklist, and the no-stale-private-data verification.

---

## Appendix A — Findings → phase coverage (round-trip with `01_CODEBASE_AUDIT`)

| Finding | Phase(s) | Finding | Phase(s) |
|---|---|---|---|
| A-01 | 7 (early win) | A-21 | 3 |
| A-02 | 4 + 7 | A-22 | 4 + 8 |
| A-03 | 0 / 7 | A-23 | 8 |
| A-04 | 3 | A-24 | 8 (early win) |
| A-05 | 2 / 3 / 6 | A-25 | 4 + 8 |
| A-06 | constraint (preserve) | A-26 | 8 (optional) |
| A-07 | 3 (foundations 1) | A-27 | 8 (early win) |
| A-08 | 3 (constraint) | A-28 | 8 (verify) |
| A-09 | 1 + 3 | A-29 | 6 + 10 |
| A-10 | 5 (adapter 1) | A-30 | 6 |
| A-11 | 1 + 4 | A-31 | 6 |
| A-12 | 1 + 4/5 | A-32 | 6 |
| A-13 | 5 | A-33 | 6 |
| A-14 | 2 | A-34 | 7 (early win) |
| A-15 | 2 | A-35 | 7 (early win) |
| A-16 | 1 → 2/3 | A-36 | 7 |
| A-17 | 2 / 7 | A-37 | constraint (reference) |
| A-18 | 2 | A-38 | 0 + 9 |
| A-19 | 3 | A-39 | 0 + 9 |
| A-20 | 3 | A-40 | 9 |

Every `A-NN` is covered. `A-06`/`A-37` are preservation constraints, not fixes.

## Appendix B — Risk → phase

`RISK-01`→3 · `RISK-02`→2 · `RISK-03`→1/3 · `RISK-04`→2/7 · `RISK-05`→8 · `RISK-06`→0/7 · `RISK-07`→5 · `RISK-08`→5 · `RISK-09`→4/7 · `RISK-10`→6 · `RISK-11`→0/9 · `RISK-12`→0/3 · `RISK-13`→4/8 · `RISK-14`→all (coordination, esp. 1/2/3).

## Appendix C — Open question → blocking phase

`Q-01`→4/8 · `Q-02`→2 · `Q-03`→6 · `Q-04`→1/4 · `Q-05`→0/3 · `Q-06`→5 · `Q-07`→5 · `Q-08`→2 · `Q-08b`→3 · `Q-08c`→3 · `Q-08e`→5 · `Q-08f`→4 · `Q-09`/`Q-10`→0/7 · `Q-11`→0/6 · `Q-12`→0/8 · `Q-13`→0/9 · `Q-14`/`Q-22`→8 · `Q-16`/`Q-17`→0/4 · `Q-18`→9 · `Q-19`→0/7 · `Q-20`/`Q-21`→9 · `Q-23`→6.
