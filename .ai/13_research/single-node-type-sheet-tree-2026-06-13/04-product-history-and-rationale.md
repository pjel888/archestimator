# Product history & rationale — why two node kinds exist

**Scope:** Why does the group/area split exist? Was one-type ever considered? Is it load-bearing or incidental?
**Bottom line:** The two-kind model is a **deliberate, owner-approved, domain-grounded decision** made ~3 weeks before this research (2026-05-20). The codebase already collapsed 6 kinds → 2 *on purpose* and treated two as the **end-state**, not a waypoint to one. Collapsing to one was never proposed; doing so reverses an explicit decision.

---

## Timeline

| Date | Migration / commit | What happened |
|---|---|---|
| 2026-05-18 | [`20260518090000_…core_schema.sql:9`](../../../supabase/migrations/20260518090000_archestimator_core_schema.sql) | Initial enum had **6** kinds: `lot, structure, level, area, group, assembly` (mirrors a spatial construction hierarchy) |
| 2026-05-18 | [`20260518105000_add_general…`](../../../supabase/migrations/20260518105000_add_general_estimate_node_kind.sql) (`f15f6dcb`) | Added `general` for BOQ "General Requirements / preliminaries" → 7 kinds |
| 2026-05-19 | [`20260519192045_atomic…moves`](../../../supabase/migrations/20260519192045_atomic_estimate_node_moves.sql) (`5feadb3b`) | Last migration treating all grouping kinds as active; area→rows rule already present |
| 2026-05-20 | commit `861b5fd0` | UI rebuilt around "Group and Area Nodes"; obsolete move paths removed |
| 2026-05-20 22:49 | [`20260520222038_enforce_two_kind…`](../../../supabase/migrations/20260520222038_enforce_two_kind_estimate_nodes.sql) (`2ab20f8f`) | **The consolidation:** `lot/general/structure/level/assembly → group`; CHECK `kind in ('group','area')`; rewritten validator; row-items-must-be-area trigger. Commit notes *"after Philip approval"* |

---

## The documented rationale (with quotes)

Primary ADR: [`.ai/09_archive/store/2026-05-29-estimate-tree-dnd-reorganization-complete/00-two-node-domain-decision.md`](../../09_archive/store/2026-05-29-estimate-tree-dnd-reorganization-complete/00-two-node-domain-decision.md):

> **"Do not encode domain shape as technical node kinds. Names such as Lot, General Requirements, House, Ground Floor, Roof, Trade, Phase, or any future organizing label are user/UX content on a `group` node, not separate storage kinds."**

Canonical decision log, [`.ai/10_state/decisions.md:463`](../../10_state/decisions.md):

> "Estimate tree uses exactly two active technical node kinds: Group Nodes … organize the tree, may nest other Group Nodes, and may contain Area Nodes. Area Nodes are row-owning leaves and are the only nodes that may contain estimate row items; Area Nodes cannot contain child nodes."

Foundation spec, [`.ai/06_specs/state-and-supabase-foundation.md`](../../06_specs/state-and-supabase-foundation.md):

> "Only `area` nodes may receive estimate row items unless Philip explicitly approves a broader receiving rule."

The split was the **prerequisite** that unblocked drag-and-drop reorganization: the kind model was inconsistent across TS, SQL validators, the repository layer, and tests, and DnD couldn't be built safely until it was unified to a minimal, consistent set.

---

## Real-world domain meaning

From [`.ai/06_specs/brand/spatial-hierarchy-narrative.md`](../../06_specs/brand/spatial-hierarchy-narrative.md), the original spatial hierarchy was *Lot → Structure → Floor → **Area** → Line Item*, where:

> "Area group — room, zone, space, or work area."

In BOQ / quantity-surveying practice, an **area** is the terminal organizing unit — a physical space/zone where priced rows are assigned (Bedroom 1, Foundation, Bathroom). A **group** is any organizer above it (lot, building, floor, trade, phase). The AI package-builder spec ([`ai-assistant-and-package-builder-spec.md`](../../06_specs/ai-assistant-and-package-builder-spec.md)) literally *"parses rooms (Area Nodes)"*, and the cost charts aggregate *"By Space (area hierarchy)"*. `area` carries concrete, stable domain meaning; it is not arbitrary software structure.

---

## Was one-type ever considered?

**No.** No commit, ADR, or spec discusses removing the area/group distinction or using a single kind. The nearest analog — a *components + templates* unification — was raised and **explicitly rejected** ([`.ai/03_plans/2026-06-11-Unification-Plan-For-Components-And-Templates/01_DESIGN_BRIEF.md`](../../03_plans/2026-06-11-Unification-Plan-For-Components-And-Templates/01_DESIGN_BRIEF.md)): *"A single combined tree … was considered and rejected: the two content types have different schemas, different hierarchies."* The 6→2 collapse was framed as simplification to the **minimum necessary distinction**, with two as the deliberate stopping point.

The only acknowledged future flex is the **root rule** (whether top-level *areas* could be allowed) — *"If product later wants top-level Area Nodes, that is a separate hierarchy decision"* — which is about expanding the grammar, not collapsing the two kinds.

---

## Verdict (product lens)

The two-type model is **deliberate and load-bearing**, on five independent signals:
1. It has a named, pre-implementation ADR (`00-two-node-domain-decision.md`) with explicit owner approval.
2. It's enforced coherently across TS types, the tree library's `isFolder`, repositories, SQL constraints/triggers, tests, and seed data.
3. It answers a load-bearing question — *"which nodes own rows?"* Removing it forces a replacement answer (every node, or a new boolean = the same distinction renamed).
4. It drives multiple shipped features (row tables only on areas, template wrap, DnD rules, "by space" charts, AI room-parsing).
5. Where alternatives were genuinely considered elsewhere, they were documented and rejected — here, one-type was never even raised, indicating the distinction was treated as settled.

Reversing it is not a refactor; it's a product-direction change that should clear a high bar (see [recommendation](00-recommendation.md), "When Option D would become right").
