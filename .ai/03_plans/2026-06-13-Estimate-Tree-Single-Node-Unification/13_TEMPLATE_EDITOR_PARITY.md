# 13 — Template-Editor UI Parity (P2.14)

The template tree must unify **in lockstep** with the estimate tree in the same release (R7) — `save-as-template` copies estimate subtrees into `estimate_template_*` and calls `validate_estimate_template_tree`, so if the estimate side allowed rows-on-(former-group) while the template editor/DB still rejected, save-as-template would break the instant a relaxed estimate is templated. This is the editor-side change list to the same depth as the estimate side. Ground-truthed against `src/components/workshop/library/template-editor/*` 2026-06-13.

**Two-kind logic is concentrated in three creation surfaces + one "select a group" guard + the rows-only-on-area render + drop guards. There is NO auto-wrap in the editor itself** (auto-wrap lives in `tree-hierarchy.ts`/server). So editor unification is mostly *removing guards + collapsing two Add paths into one*.

---

## A. Kill the second creation path (group) — four surfaces must change together
| Site | Today | Change |
|---|---|---|
| `TemplateEditorSheet.tsx:368-393` | per-node header `isGroup ? (Add group + Add area) : null` | one always-present "Add" → `onAddNode(node.id)` |
| `TemplateEditorSheet.tsx:574-594` (+ `:537-544` `areaTargetGroup`) | sheet-header "Add group" + "Add area" (`disabled: !areaTargetGroup`) | single "Add area"; **delete** the `disabled`/`areaTargetGroup` "select a group first" guard |
| `TemplateStructureTree.tsx:189-207, 241` | `addItems = kind==="group" ? [Add group, Add area] : []` (areas get none) | one "Add" item on **every** node; drop the `addItems.length>0` gate |
| `TemplateStructureTree.tsx:166-183` | root menu "Add group" only | one "Add" → `onAddNode(null)` |
| `TemplateEditorClient.tsx:214-220` | left-panel "Add group" | single "Add area" → `addNode(null)` |

## B. Remove the `kind` parameter from creation
| Site | Change |
|---|---|
| `TemplateStructureTree.tsx:21`, `TemplateEditorSheet.tsx:32`, `TemplateEditorClient.tsx:88-98`, `use-template-editor.ts:90-108` | drop `kind` from `onAddNode`/`addNode`; optimistic temp node defaults `kind:"area"` (or omit) |
| `TemplateEditorClient.tsx:90,102,111` | kind-flavored `window.prompt`/rename/delete labels → "Area name" / "area" |
| `template-editor-actions.ts:14,79` + `use-template-editor.ts:17` | collapse/remove `TemplateNodeKind`; `createEstimateTemplateNode` defaults kind server-side |

## C. Rows + children on EVERY node (kill "areas can't have children / groups can't hold rows")
| Site | Today | Change |
|---|---|---|
| `TemplateEditorSheet.tsx:421-436` | rows render only when `node.kind==="area"` | render the row table + ghost row for **every** node |
| `TemplateEditorSheet.tsx:264,268` (`isGroup`,`displayKind`) | drives branch rendering | delete; render all nodes identically (children block + rows block both unconditional) |
| `TemplateEditorSheet.tsx:331-335,344,358,361,406` | kind-based chrome/icon/classes | depth-based single node visual (shared `node-visuals.tsx`, see E) |

## D. Drop / drag validation — accept any node
| Site | Today | Change |
|---|---|---|
| `TemplateStructureTree.tsx:142-144` | `canDropNode` requires `kind==="group"` at root and as parent | delete both guards — any node nests under root/any parent |
| `TemplateEditorSheet.tsx:277-280` | `componentRouteArea` = self if area else first descendant area; `acceptsTemplateDrop &&= isGroup` | target = the node itself; drop the `isGroup` condition |
| `TemplateEditorSheet.tsx:437-452` | component/template drop-zones gated to area/group | render on any node, target = the node |
| `TemplateEditorClient.tsx:134-140` | `componentTargetArea`/`templateTargetGroup` indirection | target = selected node (or first node); delete the group→first-area / group-only-template indirection |
| `template-editor-model.ts:98-106` `findFirstTemplateArea` | "first area" | "first node" (or delete — drop targets are now the node) |

## E. Shared visuals (LOCKSTEP with the estimate side — not editor-private)
`node-visuals.tsx` (`estimate-sheet/rows/node-visuals.tsx`) is imported by `TemplateEditorSheet.tsx` (`NodeIcon`, `nodeHeaderClasses`, `nodeNameClasses`, `nodeTotalClasses`). Editing it changes **both** surfaces — which is exactly the intended lockstep, but call it out in the PR. One icon + depth-based classes per [11 §L3](11_LAYOUT_AND_A11Y_SPEC.md). Remove `FolderSimple` imports at `TemplateStructureTree.tsx:4`, `TemplateEditorSheet.tsx:4`, `TemplateEditorClient.tsx:6`. `getEstimateNodeDisplayKind` (identity passthrough, `tree-hierarchy.ts:21-23`) deletes once icons collapse.

## F. Copy / aria
- `TemplateEditorSheet.tsx:614-620` empty state: "…or add an area to start the structure."
- `TemplateStructureTree.tsx:39`, `TemplateEditorSheet.tsx:350,399` aria-labels drop the kind word → "node"/"area".

## G. Sidebar prop
- `TemplateEditorClient.tsx:243-244` `selectedNodeKind` will always be "area"; confirm `EstimateRightSidebar` no longer branches on it, then drop the prop.

## G2. Template editor form alignment

Any new inline rename/create/add controls introduced for template parity follow the same form-alignment rule as the estimate surface: use shared control primitives, reserve helper/error slots for paired fields, align label baselines and input heights, and give dropdown/clear affordances enough inset padding. Do not solve drift with one-off margins in the template editor.

## H. Phase placement & risk
- All editor changes ship in **P5** (template DB + UI lockstep, R7) so editor and the relaxed `validate_estimate_template_tree` never disagree. (The estimate-side layout/vocab ships P4; the template editor is lower-traffic and is fine landing with the template DB relax in P5.)
- **Risk:** the four creation surfaces (A) must change together or the UI offers inconsistent affordances. The single hard "select a group first" guard is `areaTargetGroup` (`Sheet:537-544` → `disabled` at `:589`); the structure tree enforces the same rule structurally by only showing add-items on groups (`:189-207`).
- **Test:** `estimate-template-unification.test.tsx` (one Add path, rows on any template node, drop zones on any node, no auto-wrap) + the save-as-template lockstep regression (a subtree with a former-group-with-rows templates successfully against the relaxed `validate_estimate_template_tree`) — see [10](10_TEST_MIGRATION_MAP.md).
- **Dedicated save-as-template proof:** create a source estimate subtree with a mixed node, save it as a template, then assert both `estimate_template_nodes` and `estimate_template_row_items` contain the mixed shape and the editor renders rows plus children for the same template node. The existing template-insert smoke is not enough because it inserts a reusable template into a group; it does not prove a former group with rows can be templated after relax.

## I. Cosmetic-survives — the templates BROWSE tree (V4 #7, easily missed)
`src/components/workshop/component-library/tree/TemplatesTree.tsx` is a **separate** consumer of estimate node kind in the browse surface: `:928` `nodeKind === "group" ? "Group" : "Area"` (meta label) and `:274,:277` (`node.nodeKind` → aria-label + `NodeKindIcon`). Non-breaking (display only), but it is a "roots-are-groups / leaves-are-areas" display assumption that drifts once the model collapses. **Sweep it in P4/P5** (single icon + drop the kind word) so the browse tree matches the editor. Also `TemplatePreviewDock.tsx:18,32` (`NodeKindIcon kind={node.kind}`) — same one-icon change.
