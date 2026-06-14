# Estimate-Tree Single-Node Unification — Implementation Ledger

**Date:** 2026-06-14
**Branch:** `2026-06-13-Estimate-Tree-Single-Node-Unification` (retained)
**Plan:** `.ai/03_plans/2026-06-13-Estimate-Tree-Single-Node-Unification/`
**Landed on `origin/main`:** P0–P6 complete (final tip `bf05415e`). **P5 + P6 migrations APPLIED to prod.**

> **⚠️ UPDATE 2026-06-14 — NOW COMPLETE (P0–P6); supersedes the "corridor-only / staged" framing below.** After the initial reversible corridor (P0–P4, production no-ops) the owner came online and supervised the irreversible step. **P5 relax-only migration** (`20260614003639_unify_estimate_node_kinds`) and **P6 RPC-guard relaxation** (`enable_estimate_node_mixed_writes_p6`) were both APPLIED to prod `ebxxqidacheyapmmzavr` (recorded in remote migration history), and the **UI write-enable** landed (wrap machinery + all client kind-guards deleted; single "Add Area" creates a child area of any node; insertion targets any node; cycle/cross-tab/self-drop still rejected). Each apply followed: pre-flight 0 mixed nodes → rollback artifact captured (`scripts/sql/unify-rollback-pre-apply.sql`; P6 = original guarded RPC defs) → local PG17 prove-harness green → applied via MCP → post-verified (5 fns relaxed, P5 guards intact then P6 dropped, data unchanged 139/114/10/16, advisors 0 ERROR, gen-types no-op). **Point of no return crossed** (first mixed save makes the pre-apply dump stale → forward-fix only; reads already kind-agnostic per P1–P3). P7 dead-code removed except still-wired `correctKinds`. Owner decisions: Q-1 "Area", Q-3 window=now. A concurrent Templates-Panel change conflicted on 3 files and was merged keeping both intents. See also `…-P5-apply.md`. The phase-by-phase detail below remains accurate for *what each phase did*; only the "staged/not-done" status is superseded.

---

## Scope decision (why corridor-only, autonomously)

The plan is a multi-phase core-schema migration (8 phases P0→P7, ~16–22 dev-days). Its own architecture splits the work into:

- **P0–P4: a clean-rollback corridor** — every read change is *monotonic* (can only ever add rows, never drop) and a **provable production no-op** while the DB still enforces two kinds. Reversible by `git revert`.
- **P5 (relax-only migration) + P6 (enable writes / "point of no return")** — the irreversible step. The plan states: *forward-only, Supabase PITR is disabled, the only rollback artifact is a fresh manual logical dump, and the maintenance-window timing is an open owner decision.*

This run was an **unattended overnight execution**. The owner's two instructions collide exactly at P6: "implement 100%" vs "always ensure 0 data loss." At an irreversible, PITR-disabled production cutover, **"0 data loss" is the stronger, more specific constraint** — and the standing MVP-database mandate in `current-state.md` independently bars *"irreversible destructive data loss without fresh explicit instruction and a recovery path"* and *"paid add-ons such as PITR without explicit reapproval."* So P5/P6 were **not** executed; they are staged for an owner-supervised maintenance window.

**Open owner decisions** (`00_INDEX.md`): Q-1 node name — **adopted "Area"** (the plan's own recommendation: BOQ term, already the internal `kind` value, reads cleanly). Q-3 maintenance-window timing — **pending** (gates P5/P6).

What landed is the entire **verifiable, reversible, production-no-op** slice. Browser-only proofs (workshop layout, sticky-cascade) are not runnable here (dev-auth bypass disabled), so anything needing them is marked STAGED, not done. The full `bun run validate` is **pre-existing red on `main`** from the sibling merges (eslint `set-state-in-effect` in a charts comparison component; `lint:design-system` in `ProposalExportPreviewDialog.tsx`) — not introduced here; the gate used was type-check + targeted/oracle tests + per-file eslint clean on the diff.

---

## Landed (verified)

### P0 — Oracle proof-spine + prove script (`7127e976`)
- `package.json`: added `prove:unify-kinds` → `scripts/prove-unify-estimate-node-kinds-postgres.mjs`.
- Oracle (`tests/vitest/estimate-unification-oracle.test.ts`): wired **O2 share-reconstruct ALL_AREA byte-parity snapshot** via `buildShareTreeFromSnapshotNodes`. The 5 pre-existing real assertions (O1 totals, O3b/O4a formula + row-sum, O5 cache keys) already pin the core invariants. O3/O4b/O-DIV oracle wiring **deferred** (their MIXED halves are P2 forward-proofs; export/chart proofs currently live in the dedicated suites).
- Result: oracle **6 passed / 6 todo, 1 snapshot written**.

### P1 — Public share firewall (`1b7cd161`) — the single most important PR
The public/publication share tree dropped rows on any non-area node, understating the client-facing total. Relaxed:
- `src/lib/share/reconstruct-share-tree.ts:297` — `directRows` no longer gated on `kind==='area'`.
- `src/components/share/ShareEstimateTreeView.tsx:87` — inline row render de-gated.
- `src/components/share/ShareEstimateTreePanel.tsx:148` — sidebar inline render de-gated (keeps `showInlineRows`).
- `ShareEstimateTreePanel.tsx` `filterTreeNodes` — row search-match de-gated.
- Oracle **O2 MIXED forward-proof wired**: a `kind:"group"` node that owns rows now survives (rollup 200, orphan→Unassigned).
- Verify: oracle + share suites **67 passed / 5 todo**; **ALL_AREA share snapshot byte-identical** (the no-op proof); existing `reconstruct-share-tree.test.ts` green. Share-component *visual* render → STAGED (browser smoke).

### P2 (export half) — Proposal export keeps rows on any node (`667a1bb1`)
Second client-facing silent-drop site.
- `src/lib/proposal-export/build-proposal-export-model.ts:382` — `flattenEstimateTree` emits rows for every node (byte-identical on all-area; groups carry no rows today).
- `:469` — dropped the now-false `non_area_rows_skipped` warning; removed the now-unreachable `collectNonAreaRows` helper (P7 pull-forward).
- Node-agnostic consolidation **intentionally preserved** (plan 09 §C — identical container+child rows should merge; export has no per-node rollup column).
- Verify: proposal-export suites **16 passed**; ALL_AREA export unchanged; new test proves a group node's rows are exported and totaled.

### P3 (crash-safety half) — Remove row-move throw + hierarchy-validator error (`1eb7195f`)
The V4-caught crash path (worse than a miscount).
- `src/lib/domain/estimate-mutations.ts:12` — dropped the `canNodeReceiveRows` throw in `moveEstimateRowItem` (kept the not-found guard); a row dragged onto a non-area node no longer crashes the optimistic `onMutate`.
- `src/components/workshop/estimate-tree-data.ts:409` — dropped the rows-on-non-area hierarchy-error push.
- Verify: new `estimate-mutations.test.ts` + `estimate-tree-data.test.ts` additions, **12 passed**; move-onto-group no longer throws (missing-target still throws); validator `[]`-clean on a mixed tree.

**Consolidated:** all 5 touched suites together → **54 passed / 5 todo**; `bun run type-check` 0 errors; per-file eslint clean.

---

## Staged (NOT done) — with reasons

| Item | Why staged |
|---|---|
| **P2 charts** (`aggregate-project-charts.ts` re-bucket to owning-node, leaf-or-has-rows, "Own items" leaf, fallback-predicate widen) | Highest double-count/mis-edit hazard in the corridor; the charts sibling merge (`9fbde599`) reworked this file into server-side aggregation with **two different `kind` value-spaces in one file** (capitalized `NodeFact.kind` vs lowercase `TableRow.kind`) — the plan's `:256` anchor is now `:261`. Needs a focused session with O4b oracle wired first. Anchors captured in the workflow brief. |
| **P3 activity-scope** (P3.1 store field, P3.2 decouple `includeDescendants` from `kind`, P3.3 row-emission gate) in `EstimateSheetContent.tsx` | Entangled with the brittle string-test (`live-estimate-node-route.test.ts`, which scans `EstimateSheetContent.tsx`) → requires P0.6/P0.7 neutralization first. Its "must land while all-area" urgency is **conditional on P6** (mixed nodes existing), which is deferred — so no harm in staging alongside. |
| **P0.6/P0.7** brittle-test neutralization | Only needed once P3-activity/P4/P6 edit the scanned files. Suites currently green. |
| **P4** (Area vocab ~40 strings + mixed-content layout) | Vocab/copy is unit-testable but the layout (rows-first inversion, sticky-offset cascade, one-icon, 375px) is **browser-gated** (PR4 gate) and not runnable here. `isEstimateGroupNodeKind`/`getEstimateNodeDisplayKind` deletions are build-breakers that must land with their consumers. |
| **P5** relax-only migration apply + template lockstep | Production DDL behind a write-freeze maintenance window; **owner Q-3 pending**. SQL authored + proven on local PG17 (`08_unify_estimate_node_kinds.P5.sql` + `prove:unify-kinds`). The migration file is deliberately **kept out of `supabase/migrations/`** so no deploy auto-applies it before the gate. |
| **P6** enable writes / "Add Area" / RPC kind-guards | **Point of no return** (PITR off). Owner-supervised only. |
| **P7** dead-code deletion | After P6. (`collectNonAreaRows` already removed as a safe pull-forward.) |

---

## Anchor-refresh findings (workflow, 7 agents) worth carrying forward
- `buildProjectChartComparison` is **no longer dead code** — the charts merge wired it live (`aggregate-project-charts.ts:74`). Don't chase it as dead.
- `project-charts-repository.ts:213` "leaf detection" anchor is **gone** (merge moved leaf/bucket logic into the aggregator); P2-charts needs no repository edit for silent-drop.
- AI read-context (`src/lib/ai/read-context.ts`) has **no feature flag and no in-graph importer** → P2.7/P4.8 (`areaName` provenance, copilot label) are **owner-gated**: confirm Ask's live feature-gate state before treating as dormant.
- `TemplatesBrowseManager.tsx` "Group"/"Group name" is the library **category**, not node kind — allow-list, do not rename in the P4 vocab sweep.

## Verification not performed (honest gaps)
- No hosted-prod action of any kind (no migration applied; no SQL run). The P0 read-only integrity probe was not run against prod.
- Browser/e2e proofs (share visual render, workshop layout) not runnable (dev-auth disabled).
- Full `bun run validate` not asserted green (pre-existing red on `main` from siblings, unrelated to this diff).
