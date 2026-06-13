The single-node research is structural and doesn't pin a name. My recommendation is unconstrained by prior naming. I now have a complete, evidence-grounded picture. Final deliverable.

---

# FACET: NAMING + CREATE FLOW for the unified node

## Summary recommendation

**Call it an "Area."** One unified node = one **Area**. One toolbar button: **Add Area**. Add anywhere, drop anywhere, no type choice, no insert-gate, no auto-wrap, no convert. Strip the word "Node" and the word "Group" from every user-facing surface.

This is the single most domain-true, lowest-migration, lowest-relearning choice given (a) "Area" is already the local Philippine-market BOQ term the brand expects (sibling plan KTD-1 explicitly says *"Area … the local Philippine market expects it"*), (b) the codebase already routes everything through `kind: "area"` for the row-bearing node, and (c) every retained user already knows "Area" means "the thing that holds my cost rows."

---

## (1) Recommended SINGLE user-facing name

### Decision: **Area**

### Candidate evaluation

| Candidate | Domain pull (BOQ/construction) | What existing users know | Fit for a node that holds BOTH children AND rows | Verdict |
|---|---|---|---|---|
| **Area** | Strong. Standard in QS/BOQ takeoff ("Area/length/count measurement" — competitor doc `competitor-landscape…md:32`). Spatial-hierarchy doc lists "Area group — room, zone, space, or work area" (`spatial-hierarchy-narrative.md:20`). Local PH market expects it (sibling KTD-1). | **Highest.** Users already pick "Add Node" to make the row-bearing thing; that thing IS `kind: "area"`. The selected-node sheet eyebrow already says "Area Node" (`EstimateSheetContent.tsx:417`). Zero relearning of the core word. | Excellent. An Area that can also nest sub-Areas reads naturally as "Ground Floor area > Kitchen area." Recursion is intuitive ("areas within areas"). | **CHOSEN** |
| Section | Decent. The sibling two-kind plan picked it for `group` ("reads as can-contain-sub-sections", KTD-1). | Low for the unified node — it was being introduced as a *rename of the OTHER kind* (group), which is the kind being deleted. Choosing it now teaches a brand-new word for the surviving concept. | Good ("sections contain sections"), but it pulls toward "organizer that doesn't hold costs" — the opposite of the unification message (every node holds costs). | Runner-up; rejected (introduces a new word + wrong connotation) |
| Item / Line item | Strong in BOQ, but **already taken** by `estimate_row_items` (the cost rows). Tour copy reserves "line item" for rows (`10_copywriting…md:18,266`). | Collides hard. "Item holds items" is incoherent. | Fails — naming collision with the row primitive. | Rejected |
| Group | Abstract; collides with the verb "group" used in auto-wrap copy (`getEstimateWrapGroupName`, sibling KTD-1 note). It's also the kind being removed. | Users know "Group" as the *organizer that can't hold rows* — the exact mental model being deleted. Keeping the word re-imports the old constraint. | Misleading — implies "container only." | Rejected |
| Node | Data-model jargon. PRODUCT.md brand voice: "no marketing buzzwords… no jargon"; onboarding rule "without using database terms" (`10_copywriting…md:242`). | Users tolerate it but it's the thing the friction plan explicitly says to "drop … from all user-facing copy" (KTD-1). | Technically accurate, brand-wrong. | Rejected |
| Line group / Category | Weak domain pull; "Category" implies taxonomy not spatial/scope structure (spatial doc warns against "taxonomy" publicly, `spatial-hierarchy-narrative.md:128`). | Unknown to users; high relearning. | Mediocre. | Rejected |

### Justification
- **Domain pull:** "Area" is the canonical BOQ/QS unit of organization and the one term that survives translation to the broader offer hierarchy (`spatial-hierarchy-narrative.md:5` — "area group … room, zone, space, or work area"). Competitors center it (takeoff "area measurement").
- **Brand voice:** PRODUCT.md demands "precise, architectural, understated… no jargon." "Area" is a real word a contractor says on a jobsite; "Node"/"Group" are tool-speak. Dropping "Node" is already an endorsed direction.
- **Existing-user knowledge:** Today the row-bearing node is literally `kind: "area"` and is surfaced as "Area Node" in the sheet header. Keeping "Area" means the survivors of the merge relearn *nothing* about the concept they use most; they only stop seeing the now-meaningless "Group" / "Node" distinction.
- **Recursion reads cleanly:** "An Area can hold cost rows and other Areas" is a one-sentence mental model. Compare "A Section can hold a Section" (introduces a word) or "A Node holds Nodes" (jargon).

> One caveat to flag, not re-litigate: the same-day sibling plan (`2026-06-13-Estimate-Sheet-Tree-Friction-Reduction`) standardized on **Section + Area (two kinds)**. That plan is the *two-kind* world your committed decision deletes. If the owner has socialized "Section" already, the only viable alternative is to invert — call the unified node **Section** and drop "Area." I recommend **Area** because it has the stronger local-market pull and far lower relearning, but the decision is a coin-flip on familiarity; pick one and apply it everywhere.

---

## (2) The create flow (simplest possible)

**Principle:** type is no longer a precondition or a consequence — it does not exist. There is one kind. So creation is just "make an Area, here."

### Toolbar (tree panel header)
- **One** add action replaces the current two (`EstimateSheetTree.tsx:1315-1326`):
  - `{ label: "Add Area", icon: <MapPin/>, onClick: () => handleAddTreeNode() }`
- Behavior: creates a new Area as a **child of the currently selected Area**, or at **root** if nothing is selected (or the selection can't be resolved). No "select a group first" error path — delete the guard at `EstimateSheetTree.tsx:623-626`. Optimistic insert + inline rename opens immediately (existing flow at `:629-645` stays, minus the kind branch).
- The `addActions` prop on `TreePanelHeader` becomes a single-entry array everywhere it's used: `EstimateSheetTree.tsx`, `activity-history.tsx:1443-1451` (the disabled mirror), `tree-panel-header.stories.tsx:92-97`.

### Context menu (right-click a row)
Replace the kind-gated "create-nodes" group (`EstimateSheetTree.tsx:1092-1119`, currently only shown `if (nodeIsGroup)`) with one unconditional item, shown on **every** node:
- **"Add Area inside"** → `handleAddTreeNode(rightClickedNodeId)`.
- Delete the "New Group inside" / "New Area Node inside" pair and the `nodeIsGroup` branch entirely. Drop the `armContextMenuRenameHandoff` duplication for the second item.
- Keep Save as template / Rename / Delete unchanged.

### Drop anywhere
- `handleTreeCanDrop` / `handleTreeDrop` keep cycle/missing-parent checks but no kind/nesting validation (the `evaluateEstimateTreeDrop` nesting rule and `canNestEstimateNodeKind` go away — out of scope to detail here, but the create flow assumes any node accepts a child).
- Template external drop (`treeExternalDrop`, `:591-617`): the `isGroupTarget ? … : wrapAreaNodeId` branch collapses — **every** target takes `targetParentNodeId`. No `wrapAreaNodeId` path, no auto-wrap. (`getEstimateWrapGroupName` in `tree-hierarchy.ts:43` becomes dead.)

### Empty-state copy
- Tree panel empty state (`EstimateSheetTree.tsx:1336-1338`):
  - Before: *"This estimate has no tree nodes yet. Add a Group Node or Area Node to begin rebuilding the estimate structure."*
  - **After:** *"This estimate is empty. Add an Area to start."*
- Sheet empty state (`EstimateSheetContent.tsx:1846-1848`):
  - Before: *"This estimate has no Group Nodes, Area Nodes, or cost estimate rows. Rebuild the tree first, then place cost rows only inside Area Nodes."*
  - **After:** *"This estimate is empty. Add an Area, then add cost rows to it."*
- Empty-tab state (`EstimateSheetContent.tsx:1834-1839`): button "Add Group" → **"Add Area"**; body "Add a group to start the tree…" → **"Add an Area to start, or drag a template or project content here."**
- Optional one-line inline guidance under the first Area (mirrors the sibling plan's well-formed line, rewritten for one kind): *"Areas hold your cost rows — and you can nest Areas inside Areas to organize."*

### Node placeholder names
- `EstimateSheetTree.tsx:628`: `const nodeName = "New Area";` (drop the `kind === "group" ? "New Group" : "New Area Node"` ternary).
- `createOptimisticEstimateTreeNode` (`:144-153`): always seed `estimateRowItems: []` (every node can hold rows now); drop the `kind === "area" ? … : {}` conditional.
- Status toasts (`:645`, `:694`): "Adding Node" / "Node added" — keep generic, or align to "Adding Area" / "Area added."

---

## (3) FULL before→after vocabulary table

Every `Group Node` / `Area Node` / `Add Group` / `Add Node` / insert-gate / nesting string. **Scope: app/workshop only. AI surfaces (`src/lib/ai/**`, `src/app/api/ai/**`) excluded per OUT OF SCOPE.** Internal code identifiers (`kind`, `"group"`, `"area"`, `isEstimateGroupNodeKind`, etc.) are NOT user-facing and stay as-is unless the unification removes them.

| # | File:line | Surface | Before (string) | After |
|---|---|---|---|---|
| 1 | `EstimateSheetTree.tsx:628` | new-node placeholder | `kind === "group" ? "New Group" : "New Area Node"` | `"New Area"` |
| 2 | `EstimateSheetTree.tsx:624` | insert-gate error | `"you must select a group first before adding an area node"` | **delete** (no gate) |
| 3 | `EstimateSheetTree.tsx:645` | toast | `kind === "group" ? "Adding Group" : "Adding Node"` | `"Adding Area"` |
| 4 | `EstimateSheetTree.tsx:694` | toast | `kind === "group" ? "Group added" : "Node added"` | `"Area added"` |
| 5 | `EstimateSheetTree.tsx:1100` | context menu item | `"New Group inside"` | **delete** (merged into #7) |
| 6 | `EstimateSheetTree.tsx:1109` | context menu item | `"New Area Node inside"` | `"Add Area inside"` (now unconditional) |
| 7 | `EstimateSheetTree.tsx:1317` | toolbar add action | `"Add Group"` | **delete** (single button) |
| 8 | `EstimateSheetTree.tsx:1322` | toolbar add action | `"Add Node"` | `"Add Area"` |
| 9 | `EstimateSheetTree.tsx:1337` | tree empty state | `"…Add a Group Node or Area Node to begin rebuilding the estimate structure."` | `"This estimate is empty. Add an Area to start."` |
| 10 | `EstimateSheetTree.tsx:1285-1286` | delete-confirm desc | group: `"…removes the group, child groups, child areas, and descendant estimate rows."` / area: `"…removes the area and its estimate rows."` | single: `"This removes the Area, every Area inside it, and all their cost rows."` |
| 11 | `EstimateSheetContent.tsx:417` | sheet eyebrow | `${nodeCode} ${isGroup ? "Group Node" : "Area Node"}` | `${nodeCode} Area` |
| 12 | `EstimateSheetContent.tsx:1838` | empty-tab button | `"Add Group"` | `"Add Area"` |
| 13 | `EstimateSheetContent.tsx:1835` | empty-tab body | `"Add a group to start the tree, or drag a template or project content here."` | `"Add an Area to start, or drag a template or project content here."` |
| 14 | `EstimateSheetContent.tsx:1847` | sheet empty state | `"This estimate has no Group Nodes, Area Nodes, or cost estimate rows. Rebuild the tree first, then place cost rows only inside Area Nodes."` | `"This estimate is empty. Add an Area, then add cost rows to it."` |
| 15 | `estimate-sheet/activity-history.tsx:1443` | history toolbar (disabled mirror) | `"Add Group"` | **delete** (single button) |
| 16 | `estimate-sheet/activity-history.tsx:1448` | history toolbar (disabled mirror) | `"Add Node"` | `"Add Area"` |
| 17 | `estimate-sheet/activity-history.tsx:1320` | activity empty desc | `"Node changes and row edits in this Area Node will appear here."` | `"Changes and row edits in this Area will appear here."` |
| 18 | `NewEstimateForm.tsx:16` | create-estimate helper | `"Creates a draft estimate with Group Nodes and one project-wide Area Node."` | `"Creates a draft estimate with a starter Area structure."` |
| 19 | `ProposalExportPreviewDialog.tsx:235` | export empty | `"No Area Node rows are available for proposal export."` | `"No Area rows are available for proposal export."` |
| 20 | `component-library/CommandPalette.tsx:133` | insert hint | `"Select an Area Node before inserting components"` | `"Select an Area before inserting components"` |
| 21 | `component-library/index.tsx:1278` | insert msg | `"Select an Area Node before adding library components."` | `"Select an Area before adding library components."` |
| 22 | `component-library/index.tsx:1291` | insert msg | `"…Select an Area Node and try again."` | `"…Select an Area and try again."` |
| 23 | `component-library/index.tsx:1324,1345,1364` | insert msg | `"Select a Group Node before adding {estimate templates / template nodes / project sources}."` | `"Select an Area before adding {…}."` (target is now any Area) |
| 24 | `component-library/index.tsx:1332,1351,1370` | insert msg | `"…Select a Group Node and try again."` | `"…Select an Area and try again."` |
| 25 | `component-library/index.tsx:2092` | disabled reason | `"Select a Group Node before adding project sources"` | `"Select an Area before adding project sources"` |
| 26 | `component-library/tree/TemplatesTree.tsx:737,782,863` | disabled reason | `"Select a Group Node before adding this {template / node / templates}."` | `"Select an Area before adding this {…}."` |
| 27 | `component-library/tree/TemplatesTree.tsx:800` | disabled reason | `"Select an Area Node before adding this component."` | `"Select an Area before adding this component."` |
| 28 | `component-library/tree/TemplatesTree.tsx:818` | disabled reason | `"Select a Group Node before adding this source."` | `"Select an Area before adding this source."` |
| 29 | `component-library/tree/TemplatesTree.tsx:940` | templates empty | `"…Select a Group or Area Node in the estimate tree, then use Add Template…"` | `"…Select an Area in the estimate tree, then use Add Template…"` |
| 30 | `component-library/NewTemplateModal.tsx:183` | template helper | `"Select a Group or Area Node in the estimate tree first…"` | `"Select an Area in the estimate tree first…"` |
| 31 | `library/templates-browse/TemplatePreviewDock.tsx:129` | preview empty | `"No structure yet. Open the template to add groups and areas."` | `"No structure yet. Open the template to add Areas."` |
| 32 | `domain/estimate-mutations.ts:12` | error (user-surfaced via thrown) | `"Only Area Nodes may receive estimate row items."` | with unification this guard is **removed** (every node receives rows); if retained transitionally → `"This node can't receive rows."` |
| 33 | `estimate-tree-data.ts:410` | validation error | `"${path} is a Group Node but contains estimate row items"` | **delete** (the invariant it enforces is one of the RULES BEING REMOVED) |
| 34 | `actions.ts:2236` | server error | `"Target Group Node not found in the current project."` | `"Target Area not found in the current project."` |
| 35 | `tree-hierarchy.ts:43` | wrap-group name | `` `${trimmed} Group` `` / `"New Group"` | **dead** (auto-wrap removed) |
| 36 | `tree-hierarchy.ts:49-51` | nesting error | `` `${childKind} nodes cannot be placed under ${parentKind}.` `` | **dead** (nesting validation removed) |
| 37 | `EstimateSheetTree.tsx:1344,1359` | aria-label | `` `${projectName} estimate areas` `` | keep — already "areas," reads correctly |
| 38 | `EstimateSheetTree.tsx:1398` | bulk label | `"node selected"` / `"nodes selected"` | `"Area selected"` / `"Areas selected"` |
| 39 | `EstimateSheetTree.tsx:1415-1416,1424-1425` | bulk delete modal | `"…selected node(s)"`, `"…removes selected nodes, descendant groups, child areas, and descendant estimate rows."` | `"…selected Area(s)"`, `"This removes the selected Areas, every Area inside them, and all their cost rows."` |
| 40 | `EstimateSheetTree.tsx:1451` | single delete title fallback | `"Delete node"` | `"Delete Area"` |

**Stories (non-prod, update for parity):** `tree-panel-header.stories.tsx:92-97`, `context-menu.stories.tsx:132-133`.

**Icon note:** `NodeIcon` / `AddTreeActionIcon` (`EstimateSheetTree.tsx:76-86`) currently switch FolderSimple (group) vs MapPin (area). With one kind, pick **one** icon for all Areas. Recommend **MapPin** (the existing Area glyph) for consistency with "Area," or a neutral nested-box glyph; the Folder glyph should retire with "Group."

---

## (4) Onboarding implication

The unified node **deletes the entire reason for the group-vs-area teaching step.**

**Affected tour content (file: `.ai/03_plans/2026-06-03-react-joyride-onboarding-implementation-plan/10_copywriting_and_step_content.md`):**

- **Segment 3, Step 1 (`estimate_sheet_step_1`, line 234)** — body *"Groups organize sections. Areas hold the line items for each space."* → rewrite to one concept: **"The left panel is your estimate tree. Each Area holds cost rows, and Areas can nest to organize your estimate."**
- **Segment 3, Step 2 (`estimate_sheet_step_2`, lines 244-257)** — *"Build the structure / Add a Group (like Ground Floor), then add Areas (Kitchen, Living Room) inside each group."* This step exists **only** to teach the two-kind hierarchy. **Delete it** (or collapse to: title "Add an Area" / body **"Click Add Area. Name it — Ground Floor, then add Areas like Kitchen and Living Room inside it."**). Segment 3 drops from 5 steps to 4 (or keeps 5 with the freed slot reused).
- **Segment 3 copy rationale (line 242)** — *"Introduces the two key node types — Group and Area"* → no longer applicable; the whole rationale of "two node types" is removed.

**Target attributes that become stale (rename, don't multiply):**
- `ae-tour-estimate-add-group` (referenced in `10_copywriting…md:252,391`; registry `07_tour_registry_and_targeting_plan.md:205,295`; a11y `11_accessibility_plan.md:256` label *"Add a group to the estimate tree"*; matrix `04_implementation_matrix.md:197,216`). Since there's now **one** Add button, point a single `ae-tour-estimate-add-area` at it and retire both `ae-tour-estimate-add-group` and the proposed `ae-tour-estimate-add-area` split. The a11y label becomes **"Add an Area to the estimate tree."**

**Copy-review-checklist impact (line 449):** the approved Archestimator-specific noun list *"(project, estimate sheet, component, group, area, line item, library, proposal, export, folder)"* should drop **"group"** for the estimate tree (keep "folder" — that's the *component library*, a separate tree, unaffected).

**Net:** one tour step and one entire "what's the difference between a group and an area" explanation are deleted — the friction plan itself flags this as the tell that the model is wrong (`01_PROBLEM_GOALS_AND_INVARIANTS.md:14`: *"Needing a tutorial to explain two buttons is the smell."*).

---

## Risks / things to surface

1. **Naming collision with the same-day sibling plan.** `2026-06-13-Estimate-Sheet-Tree-Friction-Reduction` already committed "Section (=group) + keep Area" in a *two-kind* world. If any UI/copy from that plan shipped or was socialized, "Area" vs "Section" must be reconciled before either lands. My pick (Area) is correct for the *one-kind* world but directly overrides that plan's KTD-1.
2. **"Area" recursion connotation.** "Area inside Area" is slightly less natural than "Section inside Section" for pure organizers (a top-level "Phase 1" or "Electrical" trade grouping reads oddly as an "Area"). Mitigate with the inline guidance line and example names that lean spatial. If the owner's trees are heavily trade/phase-organized rather than spatial, **Section** becomes the stronger unified name — flag for owner judgment.
3. **`estimate areas` aria-label and `kind: "area"` internal naming already bias toward "Area"** (`EstimateSheetTree.tsx:1344`, all `kind` values) — choosing "Area" minimizes internal/user-facing drift; choosing "Section" leaves a permanent vocabulary gap between code (`area`) and UI (Section), a long-term confusion source for the team.
4. **Share/export layer derives "group" from `children.length > 0`** (`reconstruct-share-tree.ts:161-170`) and labels public output by kind. A unified "Area" name needs the public share/proposal renderer's any kind/group labels reconciled too (e.g. `:264` "preserves the exact group/area hierarchy"); confirm exported documents don't print "Group"/"Area Node" headers. Public-facing translation per `spatial-hierarchy-narrative.md:124-130` should also avoid the word "node."
5. **Validation/guard deletions (#32, #33, #36) are behavioral, not cosmetic** — they implement the very rules being removed. They must be deleted in lockstep with the schema/RPC change, not as a copy pass, or the UI will allow what the server still rejects (or vice-versa).

**Key file anchors:** `src/components/workshop/EstimateSheetTree.tsx` (toolbar `:1315`, context menu `:1087`, empty-state `:1336`, placeholder `:628`, gate `:623`), `src/components/workshop/EstimateSheetContent.tsx:417,1838,1847`, `src/components/workshop/estimate-sheet/activity-history.tsx:1320,1443`, `src/lib/estimates/tree-hierarchy.ts:43,49`, `src/lib/domain/estimate-mutations.ts:12`, `src/components/workshop/estimate-tree-data.ts:410`, `.ai/03_plans/2026-06-03-react-joyride-onboarding-implementation-plan/10_copywriting_and_step_content.md:234,244-257`, `.ai/06_specs/brand/spatial-hierarchy-narrative.md:20,124-130`.