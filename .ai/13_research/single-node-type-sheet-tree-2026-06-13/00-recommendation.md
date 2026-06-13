# Should the estimate sheet tree collapse `group` + `area` into one node type?

**Date:** 2026-06-13
**Question (verbatim):** "What if we combine group node and area node into just 1 type? Will that be good in terms of ux/ui, performance, codebase, database schema etc?"
**Verdict:** **No — do not collapse to a single node type.** Keep two kinds. Solve the real pain (drag-drop friction, premature classification) with targeted interaction fixes, not a data-model rewrite. If the genuine goal is "let a container also hold a few direct line items," there is a much cheaper, lower-risk relaxation (Option C below) than full unification.

This recommendation is deliberately unbiased: full unification is a **real, modest codebase win** (~300–400 lines deleted, the auto-wrap workflow gone), and it is **performance-neutral**. It is rejected not because it is unworkable, but because the cost/benefit is poor relative to cheaper options, and because it reverses a recent, deliberate, domain-grounded decision without a proportionate reason.

---

## TL;DR by dimension

| Dimension | Effect of collapsing to 1 type | Net |
|---|---|---|
| **Database schema** | Removes ~10 guard objects (2 CHECK constraints, 2 row→area triggers, the hierarchy rule, ~4 RPC kind-guards, the parallel template-tree guards). Surviving invariants (cycle, missing-parent, cross-tab) are already kind-agnostic. | **Simplifies** (mildly) |
| **Performance** | Negligible. Totals already sum flat across all rows (kind-agnostic). Render already attaches rows to any node. One extra "fetch children + fetch rows" per node, fully served by existing indexes. | **Wash** |
| **Codebase** | ~300–400 lines and ~15 helpers deleted (auto-wrap, `canNestEstimateNodeKind`, two creation paths). BUT ~35 `kind === "area"` *type* checks become `rows.length > 0` *data* checks with a new edge case (empty new node = ambiguous), and the AI package builder loses a clean discriminator (regression risk). | **Mild win, partly illusory** |
| **UX/UI** | Removes auto-wrap surprises and the premature group/area decision. BUT introduces the unsolved **mixed-content node** layout problem (a node showing both a sub-tree *and* a line-item table), erodes the scannable section-vs-location distinction estimators expect, and muddies proposal export + the "by space" chart. | **Trade-off, leans negative for this domain** |
| **Product / domain** | Reverses a deliberate, owner-approved decision ([`00-two-node-domain-decision.md`](.ai/09_archive/store/2026-05-29-estimate-tree-dnd-reorganization-complete/00-two-node-domain-decision.md)) made ~3 weeks ago. `area` = a real BOQ concept (the location where rows live); `group` = any organizer above it. | **Argues against** |

**The decisive asymmetry:** the benefits of collapsing (less code, no auto-wrap) are obtainable *without* collapsing. The costs of collapsing (mixed-content UX, lost audit guardrail, AI regression, reversing a domain decision) are **only** incurred *by* collapsing. When the upside is reachable by a cheaper path and the downside is exclusive to the expensive path, the expensive path loses.

---

## What the two types actually are

- **`estimate_nodes.kind`** is constrained to `'group'` and `'area'` ([`20260520222038_enforce_two_kind_estimate_nodes.sql`](supabase/migrations/20260520222038_enforce_two_kind_estimate_nodes.sql)).
- **Invariant:** roots are `group`; only `group` holds children; `group` holds `group`|`area`; **`area` is a leaf that exclusively owns the cost line items** (`estimate_row_items`). Enforced in the DB by constraint triggers + cycle check, and mirrored in ~221 branch points across ~38 TS/TSX files.
- **Domain meaning** ([`.ai/06_specs/brand/spatial-hierarchy-narrative.md`](.ai/06_specs/brand/spatial-hierarchy-narrative.md)): `area` = "room, zone, space, or work area" — the terminal organizing unit where an estimator assigns priced rows. `group` = any organizer above it (lot / structure / floor / trade / phase). The system was *deliberately* designed so those organizer labels are **UX text on a group node, not separate node kinds**.
- **Prior art:** this is already the result of a consolidation — the schema began with **six** kinds (`lot/structure/level/area/group/assembly`) and was deliberately collapsed to **two**. The history is explicit that two was the intended end-state, not a waypoint toward one.

---

## The crux: the "auto-wrap" friction is what's really driving the question

Almost all of the day-to-day pain attributed to "two types" traces to **one rule**: *areas cannot have children.* Because of it:

- Dropping a multi-node template onto an area can't insert children, so the app silently **wraps** the area in a new group (`getEstimateWrapGroupName`, [`tree-hierarchy.ts:41`](src/lib/estimates/tree-hierarchy.ts)). This spans 3 sequential RPCs + optimistic client state + rollback ([`actions.ts` `wrapEstimateAreaAndInsertTemplate`](src/lib/estimates/actions.ts)) and is the single most intricate, bug-prone piece of the sheet.
- "You must select a group first before adding an area" blocks a natural action ([`EstimateSheetTree.tsx:622`](src/components/workshop/EstimateSheetTree.tsx)).
- There's no "convert area → group" path, so restructuring is manual.

Full unification removes this — but so do the cheaper options. **Don't rewrite the type system to fix an interaction problem.**

---

## A key technical finding that lowers the stakes

The data and render substrate is **already mostly kind-agnostic**, which means the two-type model is thinner than it looks and the middle-ground options are more feasible than the raw branch-count suggests:

- `buildEstimateTree` attaches row items to **any** node id, not just areas ([`workspace-repository.ts:1611`](src/lib/repositories/workspace-repository.ts)).
- `estimate_sheet_total` sums **flat** across all rows regardless of kind ([`20260524033151_…version_control.sql:181`](supabase/migrations/20260524033151_estimate_sheet_version_control.sql)) — so totals would *not* break under any of these options.
- The row-item table is **already rendered inside every branch**; groups just receive an empty array, and `hasContents` already contemplates "children OR rows" ([`branch.tsx:78,242`](src/components/workshop/estimate-sheet/rows/branch.tsx)).

The constraint lives almost entirely in **(a) DB triggers** and **(b) interaction affordances + styling** — not in the storage or rendering substrate. This is why the recommended path is interaction-level, not schema-level.

---

## The option spectrum (the real decision)

### Option A — Status quo (strict two-type), accept the friction
Zero work. Auto-wrap and the "select a group first" block remain. Not recommended *as-is* because the friction is real, but it is the correct baseline.

### Option B — Keep two types, fix the friction with interactions ✅ **Recommended near-term**
No schema change, no type-model change. Specifically:
1. Replace the silent auto-wrap with an explicit confirm ("Create group '\<Area\> Group' to hold this template?") **or** allow the drop to land as a sibling — make the restructure visible and intentional.
2. When "Add Area" fires with no group selected, **auto-create a sibling group** instead of erroring.
3. Add a **"Convert to group"** context action (an area with no rows becomes a group; an area with rows is wrapped on demand).

Captures ~80% of the felt benefit at ~10% of the risk. Preserves the audit guardrail, clean proposal export, the "by space" chart, and the AI discriminator. **This is the highest value-to-risk move.**

### Option C — Keep two kinds, but let `group` also hold rows (relax rule #2 only)
A single, low-risk relaxation: drop the `enforce_estimate_row_item_area_node` trigger and the row→area rule so a **group** can hold a few direct line items, while `area` stays the pure leaf. The data layer already supports this (rows attach to any node id today). Solves "I just want one cost on this floor without making a whole sub-area." Cost: you take on a *limited* mixed-content layout (only on groups), so it needs a small, deliberate design (e.g., a clearly separated "Items on this node" section). Reasonable **if** product validates demand. Note it does **not** remove auto-wrap (that's rule #1).

### Option D — Full unification to one node type ❌ **What was asked; not recommended**
Remove the distinction entirely; any node holds both children and rows. Deletes the most code, but:
- Forces the **mixed-content node** as the *default* everywhere (sub-tree + line-item table in one pane) — an unsolved layout that the typology research warns against ([`.ai/13_research/ux-ui-typology-data-hierarchy-calibration-2026-05-19.md`](.ai/13_research/ux-ui-typology-data-hierarchy-calibration-2026-05-19.md)).
- Replaces a clean static discriminator with runtime data checks that are **ambiguous for empty/new nodes** (is a fresh node a folder or a leaf?).
- Requires a non-trivial AI package-builder refactor (loses the `kind` discriminator it reasons with) — regression risk.
- Erodes the section-vs-item structure that maps cleanly to BOQ output and the "by space" cost chart, and that experienced QS/estimators expect.
- Reverses a deliberate, documented, owner-approved decision without a proportionate driver.

---

## When Option D *would* become the right answer

Be honest about the conditions that would flip this:
1. **User research shows the group/area decision is a real onboarding drop-off** — i.e., the cost is paid by users, not just by code readers.
2. **The product pivots to a "simple mode"** for tiny solo estimates where any hierarchy is overkill and a flat list is the goal.
3. **Someone first designs and validates the mixed-content node layout** (sub-tree + items in one view) and updates the proposal export + space chart to handle rows at any depth.

Absent those, unification trades a deliberate, domain-fit structure for a modest, partly-illusory code saving.

---

## Recommended path

1. **Now:** Option B (interaction fixes). Removes the actual pain, no migration, no risk to exports/charts/AI.
2. **If users still want direct items on containers:** Option C, with a small dedicated design for the container-with-items layout.
3. **Only if a Option-D trigger above fires:** open a *new* brainstorm + plan specifically for the mixed-content layout, export model, and AI prompt redesign — then implement. Do not back into full unification incrementally.

See the facet deep-dives in this folder: [database](01-database-and-schema-findings.md) · [codebase](02-codebase-blast-radius.md) · [ux/ui](03-ux-ui-findings.md) · [product history](04-product-history-and-rationale.md).
