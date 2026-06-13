I have everything needed. Let me write out my adversarial analysis.

I've verified all the load-bearing facts. Here is my verdict.

---

VERDICT: **CORRECT-WITH-CONDITIONS** — the proposal's *core* roll-up math (export grand total, charts series total, owner-based attribution) is sound and does not double-count, but the claim "produce CORRECT numbers" is **only true if three additional conditions hold that the proposal does not fully guarantee**. Two of them are real defects in the proposed "After" code or in surfaces the proposal declares out-of-scope. I can construct a concrete tree where numbers are wrong or the document is nonsensical for each.

---

## What I verified as actually correct

- **Export grand total (`buildTotals`, lines 216-236) is flat over emitted rows.** Each emitted row traces to exactly one source row. Removing the `kind === "area"` gate at line 265 makes container-owned rows get emitted once at their own node. No double-count. ✔ Confirmed.
- **Charts series total (`buildSeries`, lines 111-133) iterates `input.rows` once.** No node-walk, contributes once per row. ✔ Confirmed independent of the space-table logic.
- **The reference `computeTotals` (`repositories/workspace-repository.ts:1624-1630`, not the path the proposal cited) does `rowTotal + childTotal` recursively and is the correct both-case pattern.** ✔ Confirmed.

So for the *grand totals*, the claim holds.

---

## Counterexample 1 — the proposed charts "After" code double-counts `rowCount` and mislabels the header total (BREAKS as written)

The proposal's new `walk` pushes a `group` header carrying `roll.total` (descendants + own) **and** a sibling `own:` leaf carrying `own.total`. It asserts "the UI does not sum them." But look at what `rollupTotals` accumulates: for the header it stores `acc.rowCount += 1` for **every** ancestor on **every** row. Concrete tree:

```
Building A (has 1 own row R0 = 100)
└─ Level 2 (has 1 own row R1 = 50)
   └─ Room 201 (leaf, 1 row R2 = 30)
```

Proposed `rollupTotals`:
- Building A: total 180, rowCount **3**
- Level 2: total 80, rowCount **2**
- Room 201: total 30, rowCount 1

Proposed `ownTotals`: Building A 100/1, Level 2 50/1, Room 201 30/1.

The header row for "Building A" shows `rowCount: 3` while its sibling "Building A — items" shows `rowCount: 1`, and "Level 2" header shows `2` with "Level 2 — items" showing `1`. **A reader summing the visible `rowCount` column gets 3+1+2+1+1 = 8 for a 3-row estimate.** The `total` column is internally non-additive too: header(180) + items(100) + header(80) + items(50) + leaf(30) = 440 for a series whose true total is 180. The proposal's defense ("they are sibling display rows, not summed") is false for any consumer that sums a column — and `read-context.ts` (which the proposal admits consumes the series, lines 1167-1169 region) flattens `tableRows` into AI narrative text where this *will* be summed or quoted as nonsense. The header total must be the **own-rows-only** delta if an `own:` sibling is also rendered, OR the `own:` sibling must be suppressed and the header must carry the full roll-up with a separate non-summed "(direct: X)" annotation. As written, **it breaks.**

---

## Counterexample 2 — `consolidationKey` silently merges a container row into a leaf row, destroying provenance (BREAKS — unaddressed)

The proposal claims removing the gate is purely additive for the Bid Form because grouping is by `sectionKey`. But consolidation (`consolidationKey`, lines 125-138) keys on `sectionKey + tag + particulars + unit + unit costs + remarks` — **not on node**. Concrete tree:

```
Building A (own row: "Concrete", 100 m³, ₱5000, category "Structural")
└─ Slab on Grade (leaf row: "Concrete", 100 m³, ₱5000, category "Structural")
```

Before unification, Building A's row was *skipped*, so only the leaf appeared: 1 line, qty 100. After removing the gate, both rows are emitted, hit the **same** `consolidationKey`, and merge into one line with **qty 200, cost ₱1,000,000**. The grand total is arithmetically correct (it always was the sum), but:
- The two `sources[]` now list `areaPathLabel` "Building A" and "Building A / Slab on Grade". The Source Breakdown sheet shows one consolidated proposal row pointing at a container path *and* its own descendant path. A reader cannot tell these were a parent-level allowance vs a child line — which is exactly the "exported document is nonsensical" failure mode the brief asks for. The proposal's §3 "optional cosmetic polish" understates this: it is a **provenance correctness** issue, not cosmetics, because the merged row's quantity (200) now spans two tree levels with no marker. This is a real "document is nonsensical" counterexample.

---

## Counterexample 3 — three *other* totals paths the proposal never reconciles will disagree (BREAKS the cross-surface claim)

The claim is "export, the by-space chart, AND estimate totals produce correct numbers." There are **five** total-producing surfaces, and the proposal only fixes two and flags one. The two it ignores:

1. **`share/reconstruct-share-tree.ts:297`** — `directRows = node.kind === "area" ? rows : []`. This is the *published/shared* estimate tree. Under unification it still drops every container-owned row from `directTotal`. Same tree as Counterexample 1: the shared view shows Building A total = 80 (only Level2+Room201 via children), **dropping R0 = 100**. The in-app `computeTotals` shows 180. Shared ≠ live. The proposal does not mention this file at all.

2. **DB RPC `estimate_sheet_total` (line 181)** uses `(qty*unit_cost) + misc_cost` and **omits contingency entirely**. Export/charts/tree all use `subtotal + misc + subtotal*contingency%/100`. For any row with non-zero contingency, the snapshot/version-control total is *already* wrong relative to every TS surface — the proposal correctly flags this (§1e) but then says "do not fold into the collapse." That is a process choice, but it means the literal claim "estimate totals produce correct numbers" is **false today and remains false after the rework** for any estimate with contingency. A 10% contingency on a ₱1M estimate yields a ₱100k discrepancy between the version-control snapshot and the exported document.

So the cross-surface "all produce correct, consistent numbers" claim is **broken** by share-tree (unfixed) and the RPC (flagged-but-unfixed).

---

## The exact rules export + charts + totals MUST follow to stay correct

1. **Single-attribution invariant.** Every row is attributed to exactly its owning `nodeId`. No walk to a "highest Area" ancestor (delete `resolveSpaceAreaNode` and the `kind === "area"` gate at `build-proposal-export-model.ts:265` and `reconstruct-share-tree.ts:297`). ✔ proposal does this for export+charts, ✗ misses share-tree.

2. **Roll-up = own + Σ children, computed once.** Mirror `computeTotals`. A node's displayed roll-up total must equal direct rows plus the sum of child roll-ups — never the sum of a separately-rendered "own" sibling **and** the roll-up, in any column a consumer might total. If you render both a roll-up header and an "own items" sibling, the header total and rowCount must be the **direct-only** values, or the sibling must be omitted. (Fixes Counterexample 1.)

3. **Consolidation must not cross node provenance silently.** Either include `sourceNodeId` (or a leaf-vs-container marker) in `consolidationKey`, or forbid merging a container-owned row with a descendant-owned row. The Source Breakdown row's `areaPathLabel` must unambiguously distinguish a direct/container-level line from a leaf line. (Fixes Counterexample 2.)

4. **One canonical row-total formula everywhere.** `subTotal + miscCost + subTotal*contingency%/100`. The RPC at `estimate_sheet_total:181` violates this (drops contingency) and must be aligned in the same change-set, or the "estimate totals are correct" claim cannot be asserted. (Fixes Counterexample 3, item 2.)

5. **No row may be dropped.** Any row whose `nodeId` resolves to a node not of kind "area" must still be counted. The proposal's §1c/§1d handle export; share-tree and any other `kind === "area"` row filter must be swept too.

---

## Files (absolute paths) and corrected line references

- `/Users/philiplewis/Documents/archestimator/src/lib/proposal-export/build-proposal-export-model.ts` — gate at line 265; `collectNonAreaRows` 238-255 + call at 350; **unaddressed merge risk** in `consolidationKey` 125-138 / `consolidateProposalRows` 288-344.
- `/Users/philiplewis/Documents/archestimator/src/lib/project-charts/aggregate-project-charts.ts` — `resolveSpaceBucket` 169-192, attribution loop 218-241, `walk` 243-284, `resolveSpaceAreaNode` 301-321. **Proposed `walk` rewrite double-counts rowCount/total per Counterexample 1.**
- `/Users/philiplewis/Documents/archestimator/src/lib/share/reconstruct-share-tree.ts:297` — **fifth totals path the proposal omits entirely; drops container-owned rows.**
- `/Users/philiplewis/Documents/archestimator/supabase/migrations/20260524033151_estimate_sheet_version_control.sql:181` — RPC omits contingency; flagged-but-unfixed means "estimate totals correct" stays false for contingency rows.
- `/Users/philiplewis/Documents/archestimator/src/lib/repositories/project-charts-repository.ts:213` and `/Users/philiplewis/Documents/archestimator/src/lib/ai/read-context.ts:1116` — `kind === "area" ? "Area" : "Group"` map; harmless to aggregation after §2 but `read-context` *consumes the broken series tableRows* and will surface Counterexample 1's bad rowCounts in AI output.
- Reference (correct pattern): `/Users/philiplewis/Documents/archestimator/src/lib/repositories/workspace-repository.ts:1624-1630` (proposal cited the wrong path `workspace-repository.ts:1624`).

Note: many file:line citations in the proposal point at non-existent paths (`workspace-repository.ts`, `project-charts-repository.ts`, `estimate-row-tree-patch.ts` at repo root rather than under `repositories/`); the code content matches but the navigation references are unreliable.

Default-to-BREAKS rationale: the literal claim spans "export, by-space chart, AND estimate totals." I found concrete trees where the proposed charts `walk` yields non-additive columns (CE1), where export consolidation produces a nonsensical merged provenance (CE2), and where two unfixed totals paths disagree with the rest (CE3). The grand-total arithmetic is correct; the **per-row display and cross-surface consistency** are not, under the proposal as written.