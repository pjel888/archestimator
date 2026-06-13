I now have full coverage. The `templateTargetParentNode` ancestor-walk (`:882-885`), `findFirstArea` DFS (`tree-hierarchy.ts:102`), and the AI read-side kind sites are all accurately characterized. The `project-source-browse-tree.tsx` uses only source-kind (custom-template/project/etc.), not node kind — correctly noise. But note `TemplatesTree.tsx:928` (`nodeKind === "group" ? "Group" : "Area"`) and `:274/277` (`node.nodeKind` aria/icon) are a parallel browse-tree consumer of estimate node kind, listed nowhere.

I have enough to render the verdict.

---

**VERDICT: GAPS-FOUND**

The blast radius and template-tree parity work are **largely thorough and the DB/template anchors are accurate**, but the completeness CLAIM is **false**: several live, semantic, kind-dependent code paths are missed or mis-bucketed as NO-CHANGE. The most serious is a runtime "rows-only-on-area" guard on the optimistic row-move path that the blast radius never lists.

### MISSED — semantic gates (load-bearing, will break behavior or build)

1. **`src/lib/domain/estimate-mutations.ts:12` — `moveEstimateRowItem` throws "Only Area Nodes may receive estimate row items." via `canNodeReceiveRows(targetNode.kind)`.** This file is **not listed anywhere** in the blast radius. It is **live runtime code**, invoked optimistically at `src/hooks/use-estimate-query.ts:176` (`moveEstimateRowItem(previous, input)`) during drag-to-move-a-row. Once any node can hold rows, dragging a row onto a former-group node throws client-side. The blast radius claims it accounts for "every `canNodeReceiveRows` guard" but only enumerates the definition (`estimate-tree.ts:51`); it misses this sole caller and its file. **Must SIMPLIFY/DELETE the guard at `estimate-mutations.ts:12`.**

2. **`src/components/workshop/estimate-tree-data.ts:404-417` — `validateEstimateTreeHierarchy` actively errors on non-area rows** (`:409 if (node.kind !== "area" && node.estimateRowItems?.length) errors.push("...is a Group Node but contains estimate row items")`). The blast radius buckets `estimate-tree-data.ts` under **NO-CHANGE** ("sample fixtures (labels)"), which is wrong — this is the exact "rows-only-on-area" assumption the audit was told to hunt. Tested by `estimate-tree-data.test.ts:82-84`. **Must DELETE or invert.**

### MISSED — build-breaking consumers of helpers slated for DELETE

3. **`src/components/workshop/estimate-sheet/activity-history.tsx:14,138`** imports and calls `getEstimateNodeDisplayKind` — a helper the blast radius marks **DELETE** (`tree-hierarchy.ts:21`). Yet `activity-history.tsx` is listed under NO-CHANGE. Deleting the helper breaks this file's build. (Self-contradiction in the deliverable.)

4. **`src/components/workshop/estimate-sheet/rows/node-visuals.tsx:3,36`** imports/calls `getEstimateNodeDisplayKind`. Blast radius says "no functional change under Option A" but does not note the dependency on a deleted helper. Same build hazard.
   (For reference, `getEstimateNodeDisplayKind` also feeds `EstimateSheetTree.tsx:77,84,1282` — those are listed; `activity-history` and `node-visuals` are the unlisted ones.)

### MISSED — cross-subsystem coupling (save-as-template)

5. **`src/lib/component-library/actions.ts:768` — save-project-subtree-as-template** copies an estimate subtree into `estimate_template_nodes` with `kind: node.kind as "group" | "area"` and its rows. Blast radius calls `component-library/actions.ts` "pass-through labels, no logic." Once estimates allow rows-on-group (mixed-content) nodes, saving such a subtree as a template inserts rows-on-group into `estimate_template_nodes`, which the still-enforced `validate_estimate_template_tree` / `enforce_estimate_template_row_item_area_node` triggers (`20260522091621:46-48, :104-118`) will **reject** — unless the template DB side is relaxed in lockstep (the cross-cutting research does plan the template DB relaxation, but neither deliverable connects this **save-as-template path** as the consumer that depends on it). Flag the coupling.

### MISSED / understated — chart aggregation nuance

6. **`src/lib/project-charts/aggregate-project-charts.ts:256`** is a **second** row-summing site using the **raw** discriminant: `nestedRows.reduce((sum, row) => sum + (row.kind === "area" ? row.total : 0), 0)`. The blast radius lists `:256` but characterizes the whole file as branching on the **derived** capitalized `"Area"/"Group"`. This line mixes a **raw lowercase** `row.kind === "area"` filter; if not switched to leaf/has-rows detection, nested rows on former-group nodes are dropped here independently of the `:175/:309` derived-kind paths. Same data-loss risk class as the export/share gaps the deliverable already flags. **Must switch to leaf-or-has-rows.**

### MISSED — parallel binary derivation consumers (cosmetic-but-unlisted)

7. **`src/components/workshop/component-library/tree/TemplatesTree.tsx:928`** (`datum.source.nodeKind === "group" ? "Group" : "Area"`) and `:274,277` (`node.nodeKind` for aria-label/`NodeKindIcon`) — a project-source browse tree consuming estimate node kind. Not enumerated. Cosmetic (icon/meta label) so non-breaking, but it is a "roots-are-groups/leaves-are-areas" display assumption that drifts once the model collapses; should be in the cosmetic-survives list.

### CORRECT / CONFIRMED (no gap)
- Estimate-side DB validator anchors are accurate: live `validate_estimate_node_tree` at `20260612094734:208-295`, rows-must-be-area `:263-266`, cycle `:269-292`, cross-tab/missing-parent preserved. AI apply RPC `node_kind <> 'area'` confirmed at `20260528003000_ai_package_builder_apply_rpc.sql` and `20260612094734:264`.
- Template DB anchors accurate: active-kind-check, `validate_estimate_template_tree` body, `enforce_estimate_template_row_item_area_node`, and both template-insert group-target guards (`20260524050746:856-913` non-history + history-aware in `20260612094734`) all exist where claimed. `validate_estimate_template_tree` body lives only in `20260522091621` (later files only `perform` it) — anchor correct.
- Template editor app gates accurate: `template-editor-actions.ts:88,93,193,199,274,314,478`; `TemplateStructureTree.tsx:140,142,176,195,202` + `onAddNode:21`; `findFirstTemplateArea` at `template-editor-model.ts:99-102`; `use-template-editor.ts:91`. **Template tree is fully covered** at these sites — the only template-adjacent gap is the save-as-template coupling (#5) and the `TemplatesTree.tsx` browse consumer (#7).
- `estimate-tree-edit.ts` genuinely has 0 kind hits (NO-CHANGE claim correct). `share-tree:297` row gate, `correctKinds:162`, charts `:213`, `actions.ts .eq("kind",...)` at `:2232/:2409/:2483`, EstimateSheetContent/branch.tsx anchors — all verified accurate.

**Net:** template tree coverage is solid; the failure of the COMPLETENESS claim rests on items #1 and #2 (two un-listed live "rows-only-on-area" semantic gates: `estimate-mutations.ts:12` and `estimate-tree-data.ts:409`), the two build-breaking deleted-helper consumers (#3 `activity-history.tsx`, #4 `node-visuals.tsx`), the save-as-template DB coupling (#5), and the raw-discriminant chart sum (#6 `aggregate-project-charts.ts:256`).