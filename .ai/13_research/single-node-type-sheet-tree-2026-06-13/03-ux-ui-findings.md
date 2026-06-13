# UX/UI findings — node-type unification

**Scope:** Is collapsing `group` + `area` into one type better or worse for users?
**Bottom line:** A genuine trade-off that **leans negative for a construction-estimating product**. Unification removes real friction, but it introduces an unsolved "mixed-content node" layout, erodes the section-vs-location clarity estimators rely on, and weakens proposal export + the cost chart. The painful parts of the two-type model are interaction problems with cheaper fixes.

---

## A. Current UX model

| | **Group** | **Area** |
|---|---|---|
| Tree icon | `FolderSimple` | `MapPin` |
| Content pane | Sub-tree browser; row table renders empty | Line-item table with add-row + library drop |
| Header style | Left-border accent, filled muted bg, `font-medium text-ink` | No border fill, lighter `text-secondary`, breadcrumbs shown |
| Context menu | "New Group inside" + "New Area inside" | No create actions |
| Total | Bold (rollup) | Normal weight (own items) |

The split gives a **scannable typological signal**: a folder is structure, a pin is a priced location. Refs: [`EstimateSheetTree.tsx`](../../../src/components/workshop/EstimateSheetTree.tsx), [`node-visuals.tsx`](../../../src/components/workshop/estimate-sheet/rows/node-visuals.tsx), [`branch.tsx`](../../../src/components/workshop/estimate-sheet/rows/branch.tsx). The template editor reproduces the same model.

---

## B. Friction the split causes today

1. **Silent auto-wrap on area drop.** Dropping a template on an area conjures a new wrapper group (`"<Area> Group"`) and visually reorganizes the tree without an explicit user decision ([`EstimateSheetTree.tsx:588`](../../../src/components/workshop/EstimateSheetTree.tsx)).
2. **"Select a group first" block** when adding an area ([`EstimateSheetTree.tsx:622`](../../../src/components/workshop/EstimateSheetTree.tsx)).
3. **"Can't nest here" drag errors** using domain jargon users may not grok.
4. **Premature classification** — the user must decide group-or-area before they know whether a thing will gain sub-structure.
5. **No "convert area → group"** path; restructuring is manual.
6. **Invisible routing** in the template editor: dropping a component on a group silently routes to the first descendant area.

---

## C. UX wins of unification

Simpler one-noun mental model; drop anything anywhere with no wrap surprise; no premature type decision; a node can grow sub-structure in place; one "Add node" button with no prerequisite; the auto-wrap machinery and its edge-case bugs disappear.

---

## D. UX costs — the mixed-content node is the crux

- **Layout problem.** A node with both children *and* direct rows must show a sub-tree **and** a line-item table at once. Where do direct rows sit — above children (floating, disconnected), below (buried under long subtrees), or interleaved (Notion-style, cognitively heavy in a spreadsheet)? No current view solves this. *(Mitigant: the substrate already renders a row table inside every branch, [`branch.tsx:242`](../../../src/components/workshop/estimate-sheet/rows/branch.tsx) — but the visual design intent is still missing.)*
- **Semantic clarity loss.** [`ux-ui-typology-data-hierarchy-calibration-2026-05-19.md`](../ux-ui-typology-data-hierarchy-calibration-2026-05-19.md): *"Visual hierarchy must follow the typological hierarchy"* and *"Do not bundle unrelated data into one line."* A node that is both a section header and a BOQ table is exactly that bundle at the structural level.
- **Ambiguity in a financial doc.** Are rows on a "Ground Floor" node intentional floor-level items, or a mis-drop that belongs in a sub-area? The type split is the guardrail that prevents the question.
- **Proposal export.** Group→section heading, area→detail block maps cleanly today. A mixed node has no clean section/item equivalent ([`build-proposal-export-model.ts`](../../../src/lib/proposal-export/build-proposal-export-model.ts)).
- **Audit guardrail.** Today every number lives in an area; you can scan a tree and trust where costs are. Unification scatters rows at any depth — worse for teams/auditability.

---

## E. Which mental model fits construction estimating

- **Notion/Workflowy (fully unified):** great for prose, wrong for typed cost rows with fixed columns.
- **File system (folder holds files + folders):** closest analogy, but files vs folders stay visually distinct in a way mixed estimate rows don't.
- **Typed hierarchy (section → item):** what professional BOQ/QS tools and Excel BOQ templates use — and what the local market (Philippines, Excel-BOQ-dominated per [`competitor-landscape-construction-estimating-2026-05-16.md`](../competitor-landscape-construction-estimating-2026-05-16.md)) already expects. Programa research stresses *"keep estimates familiar: sections, line items, quantity, unit, unit cost"* ([`programa-design-product-research-2026-05-16.md`](../programa-design-product-research-2026-05-16.md)).

The typed model is the strongest domain fit: project trees map to real physical/trade divisions, output needs clean section/item structure, and audit needs numbers only at leaves.

---

## F. Bottom line (UX lens)

Not a clean win or loss — a context-dependent trade-off that, for this product's BOQ-literate users and proposal-output requirements, **leans negative** unless the mixed-content layout gets dedicated design first. The high-value UX move is to **kill the specific friction without killing the distinction**:

- Replace silent auto-wrap with an explicit confirm (*"Create '<Area> Group' to hold this template?"*).
- Auto-create a sibling group when "Add Area" fires with nothing selected.
- Add a "Convert to group" context action.

These remove the felt pain while keeping the scannable structure, clean export, and audit trail.
