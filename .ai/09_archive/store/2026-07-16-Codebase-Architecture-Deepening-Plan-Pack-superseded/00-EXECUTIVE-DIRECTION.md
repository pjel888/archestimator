# 00 — Executive Direction

<!-- FRONTIER-PLAN-SUITE: 2026-07-12 · suite_version 2026-07-12 -->
**Pack:** Codebase Architecture Deepening · **Date:** 2026-07-16 · **Status:** PLANNING
**Canonical entrypoint:** `plan-pack.json` · **Lead:** Claude (planning/architecture lane)
**Source review:** `architecture-review-20260716-105343.html` (6 parallel Explore agents over the 60-day hot belt, grep-verified)

---

## 1. Outcome

Turn the nine **deepening opportunities** surfaced by the architecture review into an
executable, dependency-ordered, blast-radius-analyzed refactor program. Each candidate
takes a **shallow module** (interface nearly as wide as its implementation) and **deepens**
it: a smaller interface over more behaviour, placed at a clean seam, testable through that
interface. The program buys **locality** (bugs/changes concentrate in one module) and
**leverage** (one interface, N call sites), and retires the three systemic habits that
repeat across the hot belt.

This pack **plans**. It does not implement product code. Execution is a later authorized task.

## 2. Scope — the program

Nine core candidates (the review's "Strong" cards), plus six auxiliary follow-ons.
Vocabulary is fixed by the review's `/codebase-design` glossary: **module, interface,
implementation, depth, deep, shallow, seam, adapter, leverage, locality.** Domain nouns are
the codebase's own: *Estimate, Row, RowItem, Component, Variant, Folder, Sheet, Node, Branch,
Template, Publication, Workspace, Project.*

| Unit | Candidate | Files (primary) | Phase |
|------|-----------|-----------------|-------|
| UNIT-ARCH-01 | Carve the **Estimate-tree read module** out of the 4441-line workspace god-file; collapse 6 entry points; delete 2 false seams | `src/lib/repositories/workspace-repository.ts` | 1 |
| UNIT-ARCH-02 | Extract the **Component write-repository** out of `component-library/actions.ts` (5545 lines) | `src/lib/component-library/actions.ts`, `src/lib/repositories/component-library-repository.ts` | 1 |
| UNIT-ARCH-03 | Collapse the **38-field row-handler hook** into a deep `RowMutationCoordinator` | `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts`, `EstimateSheetContent.tsx` | 2 |
| UNIT-ARCH-04 | Give the **Row commit/dirty/routing rules** a tested home | `src/components/workshop/estimate-sheet/rows/row-table.tsx`, `editable-row-model.ts`, `editable-row-store.ts` | 2 |
| UNIT-ARCH-05 | Collapse the **four-layer handler prop-drilling**; delete the two memo comparators | `rows/branch.tsx`, `rows/row-table.tsx`, `rows/cells.tsx` | 2 |
| UNIT-ARCH-06 | Delete the **pass-through field-setter reducer pattern** (3 files, ~50 wrappers) | `EstimateSheetTree.tsx`, `ComponentLibraryManager.tsx`, `EstimateSheetContent.tsx` | 0 |
| UNIT-ARCH-07 | Hoist the **duplicated Component/Folder mutation layer** behind one module | `component-library/index.tsx`, `component-library-manager/ComponentLibraryManager.tsx` | 3 |
| UNIT-ARCH-08 | Give the **last-owner invariant** one home | `src/lib/admin/corporate-account-repository.ts` | 3 |
| UNIT-ARCH-09 | Collapse the **six `BetaOperatingSourceSnapshot` adapters** into one `toSourceSnapshot` | `app/admin/page.tsx`, `lib/admin/*-overview.ts`, `*-aggregate.ts` | 3 |
| UNIT-ARCH-A1 | (AUX) Unify the **sheet display-transform pipeline** + identity invariant | `EstimateSheetContent.tsx` | 4 |
| UNIT-ARCH-A2 | (AUX) Collapse the **two project-activity repositories** into one | `project-activity-repository.ts`, `project-activity-feed-repository.ts` | 4 |
| UNIT-ARCH-A3 | (AUX) Free the **source-snapshot sanitizer** from `estimates/actions.ts` | `src/lib/estimates/actions.ts` | 4 |
| UNIT-ARCH-A4 | (AUX) Excise the **image-upload subsystem** from the material-cell god-file | `rows/cells.tsx` | 4 |
| UNIT-ARCH-A5 | (AUX) Collapse the **helpers grab-bag**: keep deep accessors, delete dead half | `component-library/helpers.ts` | 4 |
| UNIT-ARCH-A6 | (AUX) Deepen the **corporate-account actions tier**; stop leaking Row shapes into UI | `corporate-account-actions.ts`, `AdminAccountsList.tsx` | 4 |

## 3. The three systemic habits (the "why this is a program, not a one-off")

1. **God-modules** — workspace-repository (4441 lines, ~40 exports), component-library/actions (5545), estimates/actions (4197), cells.tsx (1486). Multiple unrelated concerns behind one file; testable only past the whole file.
2. **Pass-through reducers / setter wrappers** — a reducer plus per-field setter wrappers whose entire behaviour is a one-line field assignment (`resolveStateUpdater` re-implements useState's functional update). Fail the deletion test outright. Found in EstimateSheetTree (16 cases), ComponentLibraryManager (19), EstimateSheetContent (1 generic + ~24 setters).
3. **Pure helpers extracted for testability while the orchestrator beside them stays untested** (no locality) — the "interface is the test surface" violation. The deepening move puts the real behaviour (orchestration, invariants, routing, sanitization) *into* a module so the module becomes the test surface.

## 4. Non-goals

- No behavior change to product features. Every unit is **behavior-preserving** by intent; output must match current output (see acceptance).
- No new product features, no UI redesign, no schema changes, no new dependencies.
- No speculative compatibility shims, feature flags, rollout, or rollback beyond what a proven current obligation requires (alpha/pre-bias).
- No automated test *execution* or *edits* in this pack — tests are `TEST_PROPOSAL` at most; `TEST_TASK` needs a future explicit user authorization.
- The Auxiliary (A4-phase) candidates are **optional** follow-ons; they do not block core completion.

## 5. Acceptance criteria

For the **pack** (planning):
- AC-PACK-01: Every core REQ-ARCH-01..09 is mapped to a UNIT with owned paths, dependencies, implementation sketch, acceptance evidence, recovery, and a test decision.
- AC-PACK-02: The unit DAG is acyclic and exposes an exact next-ready unit (UNIT-ARCH-06, then UNIT-ARCH-01).
- AC-PACK-03: Every unit carries a **blast-radius** verdict (caller count, affected flows, risk level) and a **deletion-test** verdict.
- AC-PACK-04: A performance & speed study names the hot path, the measurable signal, and the regression guard for the units that touch render/query paths (03, 04, 05, 07).
- AC-PACK-05: `bun run validate:plan-pack -- <folder>` passes; no orphan IDs.

For a **unit** (at execution time, recorded here so executors know the bar):
- Behavior-preserving: the module's observable outputs are unchanged (golden snapshots / existing tests green where authorized).
- The deepened module is **testable through its interface** (a new or existing test crosses the seam, proposed not executed).
- `tsc` / `next build` clean (build is a verification surface, not a gate, unless the user authorizes it as a gate).
- No new `*Row` / SQL-shape leakage across a UI seam (the review's leakage findings are closed for that unit).

## 6. Stop condition

The pack stops when AC-PACK-01..05 hold and a fresh executor can start UNIT-ARCH-06 without
invention. Execution-phase stop conditions live in each unit. The pack is **ACHIEVED** when
validated; later execution is tracked in `LOOP_LEDGER.md`.

## 7. Sequencing & dependencies (summary; full DAG in `05-IMPLEMENTATION-ROADMAP.md`)

```
Phase 0 (quick wins, low risk):   UNIT-ARCH-06  (reducer deletion; disjoint files)
Phase 1 (read/write foundation):   UNIT-ARCH-01  (estimate-tree read module + dead seams)
                                   UNIT-ARCH-02  (write-repository)            [after 01 settles the repo layer]
Phase 2 (estimate-sheet brain):    UNIT-ARCH-03, UNIT-ARCH-04, UNIT-ARCH-05   [disjoint files; coordinate via ledger]
Phase 3 (consolidation):           UNIT-ARCH-07  [after 02], UNIT-ARCH-08, UNIT-ARCH-09
Phase 4 (auxiliary, optional):     UNIT-ARCH-A1..A6
```

Read-side (01) precedes write-side (02) so the action↔repository layering is legible first.
Phase-2 units are mutually independent on **disjoint files** (handlers hook vs row-table vs branch),
so they can parallelize; `LOOP_LEDGER.md` applies first-writer-wins on any collision.
UNIT-ARCH-07 depends on UNIT-ARCH-02 (the write-repository it consumes).

## 8. Orchestration (Multi-Agent Execution Directive)

- **Lead (Claude)** owns the shared contract: `plan-pack.json`, this file, `05-IMPLEMENTATION-ROADMAP.md`, `07-TRACEABILITY-MATRIX.md`, `README.md`, `PACK-MANIFEST.md`, `LOOP_LEDGER.md`. One writer.
- **Workers** author disjoint analysis docs (disjoint write targets = safe parallel writes):
  `01-CURRENT-ARCHITECTURE-AUDIT.md`, `02-BLAST-RADIUS-ANALYSIS.md`, `03-PERFORMANCE-AND-SPEED-STUDY.md`, `06-RISKS-DECISIONS-AND-NON-GOALS.md`, then `04-EXECUTION-SIMULATIONS.md` (reads the first four).
- Worker packets carry goal, owned IDs, relevant source paths, the candidate data, constraints, expected evidence, and return shape only — never the full suite (progressive disclosure).
- Recovery: on weak worker output, the lead narrows/reissues or completes locally. Optional lane failure never blocks the pack.
- Verification: the lead inspects actual artifacts, not summaries. Independent review only to close a named risk.

## 9. Verification approach

Default `test_requirement = NOT_REQUIRED`. `TEST_PROPOSAL` (risk + command, no execution)
for high-blast units: 02 (write-repo moves SQL), 03/04 (optimistic-update/rollback), 07
(generation rollback), 08 (ownership invariant). `TEST_TASK` requires a future explicit
user testing request. Build (`next build`/`tsc`) is a verification surface for the contract
modules; running it as a gate needs user authorization (memory: a `"use server"` export
restriction is only caught by `next build`, so 02/03/07 must build before claiming done).

## 10. Authorization boundaries (AUTH)

This is a **planning** task — no external, paid, production, credential-gated, or
cross-provider action occurs. At **execution** time, the only AUTH-relevant surface is
D1/SQL relocation inside UNIT-ARCH-02 (write-repository) and UNIT-08 (SQL predicate
consolidation): these are local-schema-preserving moves, not migrations, but they touch the
data layer, so each carries a `TEST_PROPOSAL` and a "behavior-preserving" verification
plan. No destructive/production action is authorized by this pack.

## 11. Applicability gates triggered

- **GATE-CONTRACT-01** (types/APIs): 01, 02, 03, 04, 05, 07 — module interfaces change.
- **GATE-NEXT-01** (Next/React): 02 (server/client), 03/04/05/07 (client) — verify server/client boundaries, `"use server"` exports stay async-only.
- **GATE-PERF-01**: all render/query-touching units; study in `03-PERFORMANCE-AND-SPEED-STUDY.md`.
- **GATE-CLEAN-01**: 01 (dead-seam deletion), 06 (reducer deletion) — deletion order + recovery mapped.
- **GATE-VERIFY-01**: every unit maps its criterion to the cheapest decisive authorized evidence.

## 12. ID map (canonical — all docs cite these)

**Two ID surfaces, one mapping.** The Markdown docs use descriptive labels for
readability; `plan-pack.json` uses the validator's required numeric forms
(`scripts/lib/plan-pack-validator.mjs` enforces `REQ-\d+`, `UNIT-\d+`, `RISK-\d+`,
`DEC-AUTO-\d+`, `AC-\d+`, `EVID-\d+`, `ART-\d+`, `SRC-\d+`, `TEST-\d+`; only `GATE-*`
permits a descriptive suffix). `07-TRACEABILITY-MATRIX.md` is the authoritative mapping.

| Markdown label (docs) | plan-pack.json ID | Candidate |
|-----------------------|-------------------|-----------|
| REQ/UNIT-ARCH-01 | REQ/UNIT-001 | Estimate-tree read module carve (+dead seams) |
| REQ/UNIT-ARCH-02 | REQ/UNIT-002 | Component write-repository |
| REQ/UNIT-ARCH-03 | REQ/UNIT-003 | RowMutationCoordinator |
| REQ/UNIT-ARCH-04 | REQ/UNIT-004 | Row commit/dirty/routing module |
| REQ/UNIT-ARCH-05 | REQ/UNIT-005 | Handler context seam (prop-drilling collapse) |
| REQ/UNIT-ARCH-06 | REQ/UNIT-006 | Pass-through reducer deletion |
| REQ/UNIT-ARCH-07 | REQ/UNIT-007 | Component/Folder mutation module |
| REQ/UNIT-ARCH-08 | REQ/UNIT-008 | last-owner invariant |
| REQ/UNIT-ARCH-09 | REQ/UNIT-009 | toSourceSnapshot adapter |
| REQ/UNIT-ARCH-A1 | REQ/UNIT-010 | display-transform pipeline (AUX) |
| REQ/UNIT-ARCH-A2 | REQ/UNIT-011 | project-activity repo merge (AUX) |
| REQ/UNIT-ARCH-A3 | REQ/UNIT-012 | source-snapshot sanitizer (AUX) |
| REQ/UNIT-ARCH-A4 | REQ/UNIT-013 | image-upload excise (AUX) |
| REQ/UNIT-ARCH-A5 | REQ/UNIT-014 | helpers grab-bag collapse (AUX) |
| REQ/UNIT-ARCH-A6 | REQ/UNIT-015 | actions-tier Row leakage (AUX) |

`DEC-ARCH-01..05` (§9/§10) → `DEC-AUTO-001..005`. `RISK-ARCH-*` (allocated in `06`) →
`RISK-001..` (renumbered in `plan-pack.json`). `EV-ARCH-*` → `EVID-001..`. `GATE-*`
names are used verbatim (validator permits). No orphan IDs; the validator enforces
reciprocity, so `plan-pack.json` is machine-generated from a compact spec
(`tools/gen-plan-pack.mjs` in the pack) to guarantee correct hashes + bidirectional links.
