# Codebase blast-radius findings — node-type unification

**Scope:** Would the TypeScript/React codebase get simpler or more complex if `group` + `area` became one type?
**Bottom line:** A **modest, partly-illusory** win. ~300–400 lines and ~15 helpers delete cleanly (mostly the auto-wrap machinery), but ~35 `kind === "area"` *type* checks convert into `rows.length > 0` *data* checks that carry a new edge case, and the AI package builder loses a clean discriminator (real regression risk).

~221 `kind` branch points span ~38 files. Categorized by *why* they distinguish the two kinds:
- **(a) Essential** — encodes "container vs leaf"; survives unification, just expressed as a data check.
- **(b) Incidental** — exists only because of the split; *disappears* under unification.
- **(c) New complexity** — introduced *by* unification.

---

## Clean deletions (category b) — the real win

| What | Where | Notes |
|---|---|---|
| Auto-wrap server action | [`actions.ts` `wrapEstimateAreaAndInsertTemplate`](../../../src/lib/estimates/actions.ts) (~100 lines, 3 RPCs) | The single most intricate sheet operation; needs optimistic state + rollback |
| Optimistic client wrap | [`EstimateSheetContent.tsx` `wrapAreaNodeWithGroup` / `wrapAreaAndInsertTemplates`](../../../src/components/workshop/EstimateSheetContent.tsx) | ~50 lines + re-selection edge cases |
| `getEstimateWrapGroupName`, `canNestEstimateNodeKind`, `getEstimateNodeNestingError`, `isEstimateGroupNodeKind` | [`tree-hierarchy.ts`](../../../src/lib/estimates/tree-hierarchy.ts) | Whole helpers gone |
| `canNodeReceiveRows` | [`src/lib/domain/estimate-tree.ts`](../../../src/lib/domain/estimate-tree.ts) | Every node can receive rows |
| Two creation paths + `readEstimateNodeKind` | [`actions.ts`](../../../src/lib/estimates/actions.ts), [`EstimateSheetTree.tsx:619`](../../../src/components/workshop/EstimateSheetTree.tsx) | "New Group" / "New Area" collapse to "New node"; context-menu items merge |
| AI `kind` field + parser + validation (~80 lines) | [`package-builder/schemas.ts`](../../../src/lib/ai/package-builder/schemas.ts) | Root-must-be-group, areas-no-children, rows-target-area all gone |
| Two-map pattern (`nodeIdsByClientDraftId` + `areaNodeIdsByClientDraftId`) | [`package-builder/apply.ts`](../../../src/lib/ai/package-builder/apply.ts) | Collapses to one map |
| `ShareTreeNode.kind` classification pass | [`reconstruct-share-tree.ts`](../../../src/lib/share/reconstruct-share-tree.ts) | Already derives `kind` from structure — becomes dead |
| Template-editor nesting guard | [`TemplateStructureTree.tsx:136`](../../../src/components/workshop/library/template-editor/TemplateStructureTree.tsx) | `parentNode?.kind === "group"` → always-true |

---

## Type-check → data-check conversions (category a/c) — the hidden cost

~35 sites that currently ask `kind === "area"` (a clean, static discriminant) become `(node.estimateRowItems?.length ?? 0) > 0` (a runtime data check). The conversion is *not* free:

- **Empty-node ambiguity.** A freshly created node has no rows and no children. Today its kind tells you whether it's a folder or a row workspace. Under unification it's **indistinguishable** — the UI must guess, or introduce a new "intended role" hint (i.e., re-encode the discriminator under a new name).
- **Render layer** ([`branch.tsx`](../../../src/components/workshop/estimate-sheet/rows/branch.tsx), [`node-visuals.tsx`](../../../src/components/workshop/estimate-sheet/rows/node-visuals.tsx)): icons, spacing, header styling, breadcrumbs all branch on kind. They don't vanish — they become data-driven, and a node that is *both* container and leaf needs a brand-new visual treatment that doesn't exist today.
- **Charts** ([`aggregate-project-charts.ts`](../../../src/lib/project-charts/aggregate-project-charts.ts), [`project-charts-repository.ts:213`](../../../src/lib/repositories/project-charts-repository.ts)): the "by space" walk traces row → nearest `Area` ancestor → `Group` roll-ups. With rows allowed at any depth this is a *semantic* change, not a rename — risk of subtle cost-aggregation errors.
- **AI context** ([`read-tools.ts`](../../../src/lib/ai/package-builder/read-tools.ts) ~35 kind sites, [`handler.ts`](../../../src/app/api/ai/package-builder/handler.ts), [`draft.ts`](../../../src/lib/ai/package-builder/draft.ts)): the model is prompted with `currentAreas` as a first-class concept and outputs a `kind` per node. Removing the discriminator means re-architecting how the AI expresses "this node holds rows" — non-trivial prompt + schema work with regression exposure.

---

## What the type model becomes

`EstimateTreeNode` loses its `kind` discriminant; both `children?` and `estimateRowItems?` are already optional, so the *shape* barely changes — but the **guarantee** that one implies the absence of the other is what's lost. `canNestEstimateNodeKind` → nothing (any parent allowed; only cycle-prevention remains). `selectFirstEstimateNodeIds`' "first area" landing heuristic → "first node with rows," with a newly-undefined answer for all-empty trees.

**Legacy normalization survives.** `normalizeEstimateTreeNodeKind` still must map historical `lot/structure/level/assembly` rows — just to one type instead of to `group`.

---

## Important: the substrate is already kind-agnostic

This *lowers* the apparent blast radius and makes the middle-ground options feasible:
- `buildEstimateTree` already attaches rows to **any** node id, not just areas ([`workspace-repository.ts:1611`](../../../src/lib/repositories/workspace-repository.ts)).
- The row table is **already rendered in every branch**; groups just get `[]`, and `hasContents` already means "children OR rows" ([`branch.tsx:78,242`](../../../src/components/workshop/estimate-sheet/rows/branch.tsx)).
- `reconstruct-share-tree.ts` already *derives* kind from whether a node has children.

So the constraint is enforced at the **edges** (DB triggers, add-row/drop affordances, styling), not the core. That's why Option B/C (interaction-level) reach most of the benefit without the type-model rewrite.

---

## Verdict (maintainability lens)

~300–400 lines out, ~15 helpers gone — genuinely nice, concentrated in the auto-wrap mechanism and nesting enforcement. But ~35 sites trade a *type* check for a *data* check that is murkier for empty/new nodes, the AI layer needs careful rework, and charts need semantic re-validation. **Net: a mild simplification with a moderate increase in "what kind of node is this?" ambiguity.** If the auto-wrap and two-path friction are the goal, the agent's own suggested middle ground — *let `group` also hold rows, keep `area` as the pure leaf* — captures most of the win at a fraction of the risk (see [recommendation](00-recommendation.md), Option C).
