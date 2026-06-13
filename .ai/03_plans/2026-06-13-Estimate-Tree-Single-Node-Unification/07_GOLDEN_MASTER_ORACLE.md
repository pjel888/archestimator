# 07 — Golden-Master Oracle (P0.2)

The oracle is **the proof mechanism for the whole route**: it freezes the serialized output of every read surface on a representative **all-area** tree, so that each read-path phase (P1–P3) can be shown to reproduce it **byte-for-byte** — i.e. a *provable production no-op* — and it asserts the **target** behaviour on a synthetic **mixed-content** tree, which is the forward-proof that rows survive and dollars don't double-count.

Artifacts:
- Spec → this doc.
- Test → [`tests/vitest/estimate-unification-oracle.test.ts`](../../../tests/vitest/estimate-unification-oracle.test.ts)
- Fixtures + builders → [`tests/vitest/estimate-unification-oracle.fixtures.ts`](../../../tests/vitest/estimate-unification-oracle.fixtures.ts)
- Snapshots → vitest `__snapshots__/estimate-unification-oracle.test.ts.snap` (committed; the golden master)

---

## The two fixtures

### `ALL_AREA_FIXTURE` — the prod-parity tree (frozen)
A representative tree using **only the current valid shape**: `group` roots/containers, `area` leaves carrying rows. Mirrors how every real estimate looks today, so its serialized outputs are **identical before and after** the read-path fixes (the mixed branch of each gate is never taken on this data). This is what makes P1–P3 provable no-ops.

```
T1 Building (group)
├ Substructure (group)
│  └ Footings (area)            rows: [Concrete q10×u500 misc200 cont5%, Rebar q2×u1500]
└ Superstructure (group)
   ├ GroundFloor (area)         rows: [Block q100×u45]
   └ FirstFloor (area)          rows: [Block q80×u45, Beam q4×u3000 cont10%]
```
Every output surface snapshots this with `toMatchSnapshot()`. **Any diff through P1–P7 is a regression** — the reviewer inspects the `.snap` change in the PR.

### `MIXED_FIXTURE` — the synthetic mixed-content tree (forward-proof)
The V2 worked example, made canonical. A node holds **both** own rows **and** children:

```
BuildingA (mixed)                ownRows: [R_a q1×u100]      → 100
├ Level2 (mixed)                 ownRows: [R_b q1×u50]       → 50
│  └ Room201 (area/leaf)         rows:    [R_c q1×u30]       → 30
└ Level3 (area/leaf)             rows:    [R_d q1×u20]       → 20
GRAND TOTAL = 100 + 50 + 30 + 20 = 200   (each row exactly once)
```
This tree is **invalid under today's DB** but valid post-P5. The oracle builds it as an in-memory fixture (no DB) so the read surfaces can be exercised against it now.

---

## Captured outputs (per fixture)

| # | Surface | Entry point (verified) | Oracle assertion |
|---|---|---|---|
| O1 | **Totals** (in-app node totals + grand total) | `computeNodeTotal(node, {})` (`editable-row-model.ts:115`) | all-area: snapshot. mixed: BuildingA=180 (own100+L2's50+Room30), grand=200 |
| O2 | **Share reconstruct** | `buildShareTreeFromSnapshotNodes(...)` (`reconstruct-share-tree.ts:267`, the `:297` area gate) | all-area: snapshot of the ShareTreeNode[] + rollup. mixed: every row present in `directRows` of its owning node; rollup total=200 |
| O3 | **Proposal export model** | `buildProposalExportModel({nodes})` (`build-proposal-export-model.ts:463`) | all-area: snapshot of `{summaryRows, proposalRows, totals}`. mixed: grand total=200, every source row appears once, **no `non_area_rows_skipped` warning**, no cross-provenance merge |
| O3b| **Export per-row formula** | derived in `normalizeSourceRow` (`:88-94`) | each row's `costAmount` = `qty×unitCost + misc + qty×unitCost×cont%/100` (canonical) |
| O4 | **Chart aggregates** | `buildProjectChartSeries({rowFacts, nodeFacts, estimateId})` (`aggregate-project-charts.ts:90`) | all-area: snapshot of series buckets + space table. mixed: bucket sum=200, **no double-count**, BuildingA's own row not lost to "Unassigned space" |
| O5 | **Activity-scope cache keys** | `getActivityScopeKey(scope)` (`activity-history.tsx:1290`) | for each node: key is stable across a child-add (V3 B2) — `node:{id}:desc` and `node:{id}:direct` both derivable independent of child count |

The per-row cost formula (the canonical invariant I6) is asserted identical across O1/O3b/O4 — `subTotal + miscCost + subTotal×cont%/100`, `subTotal = qty×unitCost` (authoritative: `estimate-row-tree-patch.ts:30-31,40`).

---

## How byte-parity is asserted

1. Each surface serializes to a **stable-key-order JSON** via `stableStringify(...)` (sorts object keys) so snapshot diffs are deterministic.
2. **All-area fixture** → `expect(stableStringify(output)).toMatchSnapshot()`. The `.snap` file, committed at P0, is the golden master. P1–P7 must reproduce it unchanged.
3. **Mixed fixture** → explicit numeric/structural assertions encoding the **target** post-fix behaviour. These are the per-phase **acceptance tests**:
   - O2 mixed → enabled/expected-green at **P1** (share firewall).
   - O3/O4 mixed → enabled/expected-green at **P2** (export + charts).
   - O5 mixed → enabled/expected-green at **P3** (activity scope).
   - O1 mixed → green at P0 already (`computeNodeTotal` is already kind-agnostic — confirmed in 01 §"already kind-agnostic"; this is the baseline that proves the substrate sums own-rows+children correctly).

   Pre-fix, the mixed assertions for O2/O3/O4 **fail** (rows dropped) — that failure *is* the bug the phase fixes. They are wired as `it` (not `it.skip`) guarded by a per-phase `PHASE_ENABLED` flag in the fixtures file so the suite stays green as each phase lands. (Alternatively run them as explicit xfail until the phase; the flag approach keeps one source of truth.)

## The "monotonic delta" rule

After the migration (P5+), the **all-area** snapshot must STILL match byte-for-byte (no real tree is mixed yet). The only sanctioned snapshot changes are on the **mixed** fixture and must be **monotonic**: a phase may only cause more rows/dollars to *appear*, never fewer. The test asserts `mixedGrandTotal_after >= mixedGrandTotal_before` at each surface as a guard against an accidental drop.

## What the oracle deliberately does NOT cover (tracked, not folded in)

- The **snapshot RPC** (`estimate_sheet_total` / version-control) **drops contingency** today (V2) — it already disagrees with export/charts/in-app for contingency rows. The oracle records this as a **known divergence** (O-DIV-1), asserted as the *current* (wrong) value with a `// KNOWN BUG, tracked` note, so the oracle doesn't pretend the five surfaces agree. Decision to fix-or-defer: [`09 §B`](09_P1_DESIGN_DECISIONS.md). This keeps the oracle honest rather than encoding a falsehood.
