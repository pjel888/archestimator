# 04 - Feature Readiness & Expand/Collapse Bug Audit

> Part of the **Estimate Master Column (EMC) Improvement Plan** -- `.ai/03_plans/2026-06-14-Estimate-Tree-Column-Improvement-Plan/`
> Status: DRAFT (audit) - 2026-06-14 - Branch: feat/estimate-sheet-uxui
> Index: [00-README](00-README.md)

---

This document is the **feature-readiness lens** on the Estimate Master Column (EMC) -- the middle column of the estimate sheet page (`src/components/workshop/EstimateSheetContent.tsx`, host; `src/components/workshop/estimate-sheet/rows/branch.tsx`, recursive per-node renderer). It is anchored primarily by the **Product Features & Functionality** perspective, cross-referenced with UX, Performance, Blast-Radius, and Database findings.

Headline conclusion: the EMC is **functionally complete except for one correctness-grade defect** -- the disclosure caret is gated on `hasChildren` instead of `hasContents`, so the most common node under the P6 single-node model (a node with its own rows but no child sub-areas) gets **no caret and cannot be collapsed**. This is Requirement 3, and it is symptomatic of a deeper containment-vs-expandability conflation that this document dissects in full. A second, related correctness defect -- the client `kind !== "area"` insert gate (`EstimateSheetContent.tsx:1649`) -- silently no-ops row inserts on non-`area` nodes and is documented here as a feature-readiness blocker that interacts with the caret fix.

Every claim below was verified by reading the cited file at the cited line during this audit (2026-06-14). Sibling docs: [01-CONTEXT-AND-ARCHITECTURE](01-CONTEXT-AND-ARCHITECTURE.md), [02-CRUD-CAPABILITY-MATRIX](02-CRUD-CAPABILITY-MATRIX.md), [05-PERFORMANCE-AUDIT](05-PERFORMANCE-AUDIT.md), [06-DATABASE-AND-NETWORK-AUDIT](06-DATABASE-AND-NETWORK-AUDIT.md).

---

## 1. THE CARET BUG (Requirement 3)

> User report (verbatim intent): *"Some node rows dont have expand/collapse icons even if they have components nested inside them which might be symptomatic of a bigger issue so all the features must be examined."*

### 1.1 Root cause -- the caret is gated on `hasChildren`, not `hasContents`

The per-node renderer derives three predicates at the top of `EstimateSheetBranch` (`branch.tsx:86-88`):

```tsx
const hasChildren = childAreas.length > 0;
const hasOwnRows = estimateRowItems.length > 0;
const hasContents = hasChildren || hasOwnRows;
```

`hasContents` is computed but **never used to gate the caret**. The disclosure control is a ternary keyed on `hasChildren` ONLY (`branch.tsx:182-205`):

```tsx
{hasChildren ? (
  <Button
    variant="ghost"
    size="icon-sm"
    aria-label={`${collapsed ? "Expand" : "Collapse"} ${node.name}`}
    aria-expanded={!collapsed}
    className="size-6 rounded-xs p-0 text-tertiary"
    onClick={() =>
      setCollapsedNodeIds((prev) => {
        const next = new Set(prev);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        return next;
      })
    }
  >
    <CaretDown size={13} weight="regular" aria-hidden="true" className={collapsed ? "-rotate-90" : ""} />
  </Button>
) : (
  // Reserve the caret slot so leaf names stay aligned with parents.
  // Non-focusable, no aria-expanded — a leaf must not advertise
  // expandability (L7).
  <span className="size-6 shrink-0" aria-hidden="true" />
)}
```

A node with own rows but **no** child sub-areas (`hasOwnRows && !hasChildren`) therefore falls into the `else` branch and renders the inert `<span className="size-6 shrink-0" aria-hidden="true" />` placeholder at `branch.tsx:204` -- no `aria-expanded`, no focusable control, no toggle. Yet that node's **entire body** -- its own-rows table (`branch.tsx:249-267`), the add-row strip (`branch.tsx:272-278`), and any child branches -- is rendered inside the single `!collapsed` block at `branch.tsx:236-324` and would collapse perfectly if a caret existed. The toggle handler (`branch.tsx:189-196`) only adds/removes `node.id` from `collapsedNodeIds`; **nothing about it requires children.**

This is the exact user complaint: nodes that visibly contain components show no expand/collapse control.

### 1.2 The conflation is baked into the comment and the model

This is not a one-line slip. The branch carries an explicit comment that encodes the wrong invariant (`branch.tsx:83-85`):

```tsx
// Containment is derived from CHILDREN, not kind: a node is a leaf iff it has
// no child sub-areas. The disclosure caret, aria-expanded, and the rows-vs
// -sub-areas distinction all key off this.
```

Under the **P6 single-node model**, "a node is a leaf iff it has no child sub-areas" is **false**: a node that is a leaf-by-children can still own a collapsible rows body. The `headerAriaLabel` (`branch.tsx:103-107`) already announces the dual content (`"{name}, area{, N rows}{, M sub-areas}"`), proving the renderer knows a node can hold both -- but the caret logic still equates "has children" with "is expandable".

The same proxy leaks into the bulk-collapse engine. `collectAllNodeIds` (`expansion.ts:18-26`) pushes `node.id` for every visited node but recurses **only** into `node.children`:

```ts
export function collectAllNodeIds(nodes: EstimateTreeNode[]): string[] {
  const ids: string[] = [];
  function visit(node: EstimateTreeNode) {
    ids.push(node.id);
    node.children?.forEach(visit);
  }
  nodes.forEach(visit);
  return ids;
}
```

So collapse-all (which builds its Set from `collectAllNodeIds([selectedNode])`, `EstimateSheetContent.tsx:1264`) reasons about the **child hierarchy**, not about which nodes actually have collapsible bodies. A top-level rows-only node DOES get its id collected (it is visited as the root), so collapse-all marks it collapsed -- but with no caret the user can **only** re-expand it via expand-all, never individually. The toggle surface and the bulk surface are already inconsistent; the caret fix reconciles them.

### 1.3 The collapse engine already supports any node -- only the affordance is missing

The single source of truth for "collapsed" is `collapsedNodeIds.has(node.id)` (`branch.tsx:80`), and the whole node body gates on `!collapsed` (`branch.tsx:236`). The toggle (`branch.tsx:189-196`) and the host setter `setCollapsedNodeIds` (`EstimateSheetContent.tsx:1160-1169`) operate purely on a `Set<string>` of node ids -- they neither know nor care whether the node has children. **The engine is already kind-agnostic and child-agnostic; the bug is purely presentational** (the caret never renders for rows-only nodes). This makes the fix surface a single predicate swap (`hasChildren` -> `hasContents` at `branch.tsx:182`), not a re-architecture.

### 1.4 Truth table -- node state x (caret shown? collapsible?)

The four canonical node states crossed with **current** behavior and the **expected** P6 behavior. "Caret shown" = an interactive disclosure button renders; "Collapsible" = the user can hide the node body via that caret.

| Node state | `hasChildren` | `hasOwnRows` | `hasContents` | Caret shown TODAY | Collapsible TODAY | Body present TODAY | Caret EXPECTED | Collapsible EXPECTED | Verified at |
|---|---|---|---|---|---|---|---|---|---|
| **Only rows** (rows, no sub-areas) | false | true | true | **NO** (`else` -> inert span) | **NO** (BUG) | yes (always shown, `!collapsed`) | **YES** | **YES** | `branch.tsx:182,204,236` |
| **Only children** (sub-areas, no own rows) | true | false | true | yes | yes | yes | yes | yes | `branch.tsx:182-199` |
| **Mixed** (rows AND sub-areas) | true | true | true | yes | yes | yes | yes | yes | `branch.tsx:182-199`, `241-248` |
| **Empty** (no rows, no children) | false | false | false | NO (inert span) | n/a (nothing to collapse) | yes (empty-state line) | NO (keep inert slot) | n/a | `branch.tsx:204`, `drop-zones.tsx:85-94` |

**The only defective cell is "Only rows" -> Collapsible TODAY = NO.** This is the single state where current and expected disagree. The "Empty" node correctly keeps the inert slot (nothing to collapse), and that behavior must be **preserved** when the gate widens to `hasContents` -- only the truly-empty node (`!hasContents`) should keep the reserved placeholder.

Note also: under P6, "Only rows" is the **most common** node kind (seeded/real container nodes routinely own rows without sub-areas), so this defect hits the dominant case, not an edge.

### 1.5 Why this is "symptomatic of a bigger issue"

The user's instinct -- that the missing caret is symptomatic -- is correct. The bug is the visible symptom of a **containment-vs-expandability conflation** that predates P6:

1. **Caret** keys off `hasChildren` (`branch.tsx:182`) -- should be `hasContents`.
2. **`aria-expanded`** is only emitted in the `hasChildren` branch (`branch.tsx:187`) -- so rows-only nodes advertise no expandability to assistive tech.
3. **The leaf-iff-no-children comment** (`branch.tsx:83-85`) documents the wrong model and will mislead future contributors.
4. **`collectAllNodeIds`** (`expansion.ts:18-26`) walks the child tree as a proxy for "all collapsible nodes".

All four stem from the same false equivalence: *has children == is expandable*. Under P6 the correct predicate is *has collapsible contents (`hasOwnRows || hasChildren`) == is expandable*. The fix is a model-level reconciliation expressed as a one-line predicate change plus comment/semantics cleanup, not a rewrite -- the collapse machinery is already correct (Section 1.3).

### 1.6 Persistence & perf consequences of the fix (cross-refs)

- **No DB change.** Collapse state is client-only, held in `collapsedNodeIdsByScope` (`EstimateSheetContent.tsx:992`), scope-keyed by tab id (`EstimateSheetContent.tsx:1155-1169`). Confirmed in [06-DATABASE-AND-NETWORK-AUDIT](06-DATABASE-AND-NETWORK-AUDIT.md): no column, RPC, or persistence touches collapse.
- **Perf-positive.** When a rows-only node collapses, its `EstimateRowItemsTable` unmounts (the whole body gates on `!collapsed`, `branch.tsx:236`), removing a heavy table from the render tree -- a net win for large sheets that is impossible today. See [05-PERFORMANCE-AUDIT](05-PERFORMANCE-AUDIT.md) (PERF-4). The fix routes through the existing `EstimateSheetExpansionContext` (`branch.tsx:79`, `EstimateSheetContent.tsx:1171-1177`), adding NO new props to the memoized table -- so the row-table memo comparator and the render-isolation perf tests are unaffected.
- **Tests flip by design.** `tests/vitest/estimate-mixed-content.test.tsx:96-111` currently asserts that a leaf-with-rows shows NO caret and the leaf header carries NO `aria-expanded`. Both assertions **encode the bug** and must be inverted as part of the fix (see Section 5). Confirmed at `estimate-mixed-content.test.tsx:104-110`.

---

## 2. Feature completeness audit

Every EMC feature, rated `works` / `partial` / `broken` / `missing`, with verified evidence. This is the readiness inventory; the exhaustive per-operation CRUD census (affordance / handler / persistence / gating columns) lives in [02-CRUD-CAPABILITY-MATRIX](02-CRUD-CAPABILITY-MATRIX.md). Here the lens is **is it ready, and what is the gap.**

### 2.1 Disclosure / structure features

| Feature | State | Evidence | Gap |
|---|---|---|---|
| Per-node expand/collapse caret | **broken** | `branch.tsx:182` gates on `hasChildren`; rows-only node gets inert slot `branch.tsx:204` | Req 3 -- caret missing on rows-only nodes (Section 1) |
| Expand-all | **works** | `expandAll = setCollapsedNodeIds(new Set())` `EstimateSheetContent.tsx:1265`, wired `:2199-2200` | none for itself; needs caret fix for per-node consistency |
| Collapse-all | **partial** | `collapseAll = setCollapsedNodeIds(new Set(allNodeIds))` `:1266`, `allNodeIds` from `collectAllNodeIds([selectedNode])` `:1264` | collapses rows-only nodes the user then can't individually re-expand (Section 3.1) |
| Collapse state across tab switch | **works** | scope-keyed by `dataTabId` `EstimateSheetContent.tsx:1155-1169` | survives tab switch within session |
| Collapse state across reload | **missing** | `useState` only, no localStorage/DB `EstimateSheetContent.tsx:992` | ephemeral; lost on reload (Section 3.3) |
| Sheet-search reveals matches | **works** | forces `EMPTY_COLLAPSED_NODE_IDS` while active, preserves user state `EstimateSheetContent.tsx:1171-1177` | toggles during active search edit an unseen state (Section 3.2) |

### 2.2 Row / component features (EMC-owned)

| Feature | State | Evidence | Gap |
|---|---|---|---|
| Add blank row | **broken** | `onAddBlankRow` -> `insertBlankRow` -> `insertLibraryItem`; gate at `EstimateSheetContent.tsx:1649` | silent no-op on non-`area` node (Section 2.5) |
| Insert library item (click/sidebar/palette) | **broken** | `insertLibraryItem` gate `EstimateSheetContent.tsx:1647-1649` | same `kind !== "area"` gate; no toast |
| Insert library item via drag | **broken** | `ComponentDropTarget` onDrop `drop-zones.tsx:108-114` -> `onInsertLibraryItem` -> gated handler | reaches the same gate |
| Edit row values (qty/adjustment%/misc/mode) | **works** | `updateRowItem` `EstimateSheetContent.tsx:1623-1645`; serialized per-row mutation | server action RLS-only (no `assertCanEditEstimate`) -- see [02](02-CRUD-CAPABILITY-MATRIX.md) |
| Delete row (single) | **works** | row trash -> `deleteRowItem` -> delete RPC | no confirm dialog |
| Open row details / activity | **works** | `onOpenRowDetails` -> `RowDetailsModal` | two buttons + cell dots open same modal on different tabs |
| Reorder rows within node | **broken** | `DotsSixVertical` at `row-table.tsx:202-204` has `cursor-grab` + `aria-label` but **no `draggable`/`onDragStart`** | phantom affordance; no reorder-row server action (Section 2.6) |
| Duplicate row | **missing** | only delete/details exist in `row-table.tsx` | no duplicate path |
| Replace component (drag onto cell) | **works** | `cells.tsx` replace handler -> `replaceRowItem` | preserves prior qty/contingency/misc |
| Move component between rows | **partial** | implemented as replace(target)+clear(source) = two non-atomic RPCs | partial failure leaves both rows mutated (Section 2.7) |
| Clear component | **works** | material-cell trash + drag-out -> `clearRowComponent` | keeps row, blanks component |
| Mark project-specific (detach) | **works** | confirm dialog -> `detachRow`; server `assertCanEditEstimate` PRESENT | no re-link affordance after detaching |

### 2.3 Selection / bulk features

| Feature | State | Evidence | Gap |
|---|---|---|---|
| Select single row | **works** | row checkbox `row-table.tsx:206-211` -> `toggleRowSelection` | auto-pruned to on-screen rows `EstimateSheetContent.tsx:1191-1199` |
| Select-all rows (per table) | **works** | thead checkbox -> `toggleRowsSelection` | per-node-table, not sheet-wide |
| Bulk delete rows | **partial** | loops `deleteRowItem` per id | N round-trips, not a batched RPC; no confirm |

### 2.4 Tree / view features (EMC header)

| Feature | State | Evidence | Gap |
|---|---|---|---|
| Insert single template into node | **works** | `insertTemplateIntoParent`, no kind gate `EstimateSheetContent.tsx:1689-1693` | P6-correct (any node) |
| Insert template batch into node | **broken** | `insertTemplatesIntoParent` gates `kind !== "group"` `EstimateSheetContent.tsx:1740` | multi-select into a non-group node silently returns false (Section 2.5) |
| Insert template NODE (subtree) | **works** | `insertTemplateNodeIntoParent`, uses `findEstimateNode` (no kind gate) | works on any node |
| Insert project source (subtree) | **works** | `insertProjectSourceIntoParentById`; non-optimistic by design | concurrent bulk inserts can clobber (RS-6) |
| Sheet search | **works** | `displayedSheetNode` render-only filter `EstimateSheetContent.tsx:1143-1151` | identity preserved when inactive (perf guard) |
| Faceted filter | **works** | `filterEstimateSheetNodeByFacets` composed into `displayedSheetNode` `:1148` | render-only, never mutates tree |
| Within-area group/sort | **partial** | `reorderEstimateSheetNodeRows` `:1149` | reorders within area only; no group-header rows; not persisted |
| "Own items" eyebrow | **works** (target for removal) | `branch.tsx:241-248`, only when `hasOwnRows && hasChildren` | Req 1 removes it from the both-case = removes it entirely (Section 2.8) |

### 2.5 The insert kind-gate -- a row-write analogue of the caret bug (broken)

`insertLibraryItem` returns early when the target node is not `area`-kind (`EstimateSheetContent.tsx:1647-1649`):

```tsx
const insertLibraryItem = useStableCallback((targetNodeId: string, libraryItem: EstimateRowItem) => {
  const targetNode = findEstimateNode(estimateTree, targetNodeId);
  if (targetNode?.kind !== "area") return;
  ...
```

This contradicts its own server action -- `insertEstimateRowItemFromLibrary` selects the target node with **no kind filter** under the P6 single-node model (confirmed in [06-DATABASE-AND-NETWORK-AUDIT](06-DATABASE-AND-NETWORK-AUDIT.md), DBNET-1/2; the action comment is "a row may be inserted into ANY node"). Because the add-row strip and component drop target render on **every** node (`branch.tsx:272-278`, `empty={!hasContents}`), a kind-mismatched insert renders an affordance that **silently no-ops with no toast** on a `group`-kind node. This affects: the quiet Add-row button, library-item click, sidebar add-event, command palette (`/` and Cmd/Ctrl+K), and library-item drag -- all route through the gated `insertLibraryItem`.

The batch-template path repeats the pattern with the opposite kind: `insertTemplatesIntoParent` gates `kind !== "group"` (`EstimateSheetContent.tsx:1740`), so a **multi-select** template insert into an `area`-kind node silently returns false, even though the **single**-template path (`insertTemplateIntoParent`, `:1689-1693`) and the drag path are ungated and work.

This is a feature-readiness blocker because **Req 3 makes rows-only/mixed nodes first-class** -- once they collapse and the user expects to add rows to them, the gate makes the add silently fail. The fix (replace both kind checks with existence checks) is a behavior change needing owner sign-off and a verification that the DB RPC is relaxed in the target environment (see [06](06-DATABASE-AND-NETWORK-AUDIT.md) DBNET-1: the committed `insert_estimate_row_item_with_history` migration still hard-codes `node.kind = 'area'`; `.ai/10_state/current-state.md` records hosted P6 relax work, but clean-apply parity still needs D0/D2).

### 2.6 Phantom row-reorder grip (broken)

`row-table.tsx:201-204` renders a `DotsSixVertical` glyph with `cursor-grab`, `active:cursor-grabbing`, and `aria-label={`Drag material ${item.material}`}` inside a plain `<span>`:

```tsx
<span className="flex h-6 cursor-grab items-center justify-center active:cursor-grabbing">
  <DotsSixVertical size={14} weight="regular" className="cursor-grab active:cursor-grabbing" aria-label={`Drag material ${item.material}`} />
</span>
```

It has **no `draggable` attribute and no `onDragStart` handler**, and no reorder-row server action exists anywhere in the EMC. It is a misleading affordance: it advertises drag-to-reorder but does nothing. (The only genuinely draggable row affordance is the **component** grip in the material cell, which *moves the component*, not the row.) Open decision: wire it (needs a new reorder-row RPC) or remove it.

### 2.7 Non-atomic component move (partial)

Moving a component between rows is implemented as `replace(target) + clear(source)` -- two non-atomic RPCs (confirmed in [02](02-CRUD-CAPABILITY-MATRIX.md) and [06](06-DATABASE-AND-NETWORK-AUDIT.md) DBNET-9). A partial failure between the two leaves the source cleared and the target unchanged (or vice versa). It is not a true "move row".

### 2.8 "Own items" eyebrow (Req 1) -- works today, scoped for removal

The eyebrow renders only when a node has BOTH own rows AND children (`branch.tsx:241-248`):

```tsx
{hasOwnRows && hasChildren ? (
  <p className="text-[9px] font-medium leading-3 text-tertiary" style={{ paddingLeft: `${leftIndent + 8}px` }} data-estimate-own-items-label>
    Own items
  </p>
) : null}
```

Req 1 ("no need to put Own items on nodes that both have nested nodes and nested components") targets exactly the both-case -- the **only** case it renders -- so removing that condition removes the label entirely. **Critical scoping:** the charts "Own items" leaf at `aggregate-project-charts.ts:296-309` is a **separate money-attribution surface** (`id: area:${child.id}:own`) that surfaces a mixed node's own-rows total exactly once and **must NOT be touched**:

```ts
// A container that ALSO directly owns rows gets an explicit "Own items"
// leaf so its own money is visible and counted, not merged into a child.
if (own) {
  rows.push({
    id: `area:${child.id}:own`,
    label: "Own items",
    ...
```

The two share only the literal string "Own items". The EMC eyebrow is a DOM `<p>`; the charts leaf is a table row in a different file, different namespace, different test (`project-charts-aggregation.test.ts`). See [01-CONTEXT-AND-ARCHITECTURE](01-CONTEXT-AND-ARCHITECTURE.md) and the Blast-Radius treatment for the full separation argument. Removing the EMC label flips `estimate-mixed-content.test.tsx:77,88,93` (Section 5); the charts test stays untouched.

### 2.9 Wired-and-functional features (works)

Confirmed functional and out of the readiness-risk set:
- **Per-node totals** -- `computeNodeTotal(node, editableRows)` `branch.tsx:90`, recursive sum `editable-row-model.ts:115-119`, live with edits.
- **Breadcrumbs** -- shown when `!collapsed && ancestorPath.length > 0` `branch.tsx:91,218-233`.
- **Template drag-drop** -- every node is a drop target (`canReceiveTemplates = true` `branch.tsx:100`), enter/over/leave/drop handlers `branch.tsx:117-155`.
- **Tab CRUD** -- create/rename/delete/duplicate/reorder live in `EstimateTabStrip` (the New-tab button was relocated into the EMC header and triggers the strip via an imperative ref). See [02](02-CRUD-CAPABILITY-MATRIX.md).

---

## 3. Expand/collapse subsystem deep-dive

### 3.1 expand-all / collapse-all

Both are wired correctly and operate on the scope-keyed collapsed Set (`EstimateSheetContent.tsx:1264-1266`):

```tsx
const allNodeIds = useMemo(() => (selectedNode ? collectAllNodeIds([selectedNode]) : []), [selectedNode]);
const expandAll = useCallback(() => setCollapsedNodeIds(new Set()), [setCollapsedNodeIds]);
const collapseAll = useCallback(() => setCollapsedNodeIds(new Set(allNodeIds)), [allNodeIds, setCollapsedNodeIds]);
```

`allNodeIds` derives from `collectAllNodeIds([selectedNode])` over the **real** `selectedNode` (not `displayedSheetNode`), so it covers the full subtree under the selected node. Both functions are correct for their own contract.

The interaction gap is the caret bug: `collectAllNodeIds` (`expansion.ts:18-26`) visits the root and recurses into `node.children`, so it enumerates **every** node id regardless of children -- including a rows-only node's id. Collapse-all therefore marks a rows-only node collapsed, but **with no caret (Section 1) the only way to re-expand it individually is via expand-all**. So today, collapse-all on a tree of rows-only nodes produces nodes the user cannot individually re-expand. **Once the Req-3 caret fix lands, this becomes consistent** -- the per-node and bulk surfaces will agree. No change to expand-all/collapse-all themselves is required.

### 3.2 Sheet-search forces EMPTY collapse (what happens to user state)

When a search is active (`sheetSearchActive = sheetSearchQuery.trim().length > 0`, `EstimateSheetContent.tsx:1128`), the expansion context value substitutes an empty collapse Set so every match is revealed (`EstimateSheetContent.tsx:1171-1177`):

```tsx
const sheetExpansionContextValue = useMemo(
  () => ({
    collapsedNodeIds: sheetSearchActive ? EMPTY_COLLAPSED_NODE_IDS : collapsedNodeIds,
    setCollapsedNodeIds,
  }),
  [collapsedNodeIds, setCollapsedNodeIds, sheetSearchActive],
);
```

This is a **render-time substitution only** -- the underlying `collapsedNodeIds` (and its scope bucket) is NOT mutated. When search clears, the memo returns the real `collapsedNodeIds` again and the user's pre-search collapse state is **restored verbatim**. Correct and non-destructive.

One edge case: `setCollapsedNodeIds` is still the real setter during search, so a user *can* toggle a caret while searching -- but those toggles operate against an **unseen** state (the substituted empty Set is what's rendered), which may surprise. Low priority; an optional hardening is to disable/hide the per-node caret while search is active. Confirmed at `EstimateSheetContent.tsx:1173`.

Search itself uses `displayedSheetNode` (a separate render-only filtered copy, `EstimateSheetContent.tsx:1143-1151`), so search never touches tree state -- another reason the collapse-state preservation holds.

### 3.3 Scope-keyed persistence -- across tab switch vs reload

Collapse state lives in one component-level `useState` object keyed by scope (`EstimateSheetContent.tsx:992`):

```tsx
const [collapsedNodeIdsByScope, setCollapsedNodeIdsByScope] = useState<Record<string, string[]>>({});
```

Read and write derive the scope bucket from `collapsedScopeKey = dataTabId ?? "legacy"` (`EstimateSheetContent.tsx:1155-1169`):

```tsx
const collapsedScopeKey = dataTabId ?? "legacy";
const collapsedNodeIds = useMemo(
  () => new Set(collapsedNodeIdsByScope[collapsedScopeKey] ?? []),
  [collapsedNodeIdsByScope, collapsedScopeKey],
);
```

Behavioral consequences (all verified):

| Action | Collapse state outcome | Why |
|---|---|---|
| Switch tab and back (within session) | **survives** | scope key changes with `dataTabId`; switching back restores that tab's bucket |
| Re-select a node within a tab | **survives** | same scope bucket, component stays mounted |
| Full page reload | **lost** -- all nodes return to expanded | `useState` is in-memory only; no localStorage/sessionStorage/DB backing |
| Navigate away and back (unmount) | **lost** | component-level state discarded on unmount |
| HMR remount (dev) | **lost** | remount resets state |

A grep across `EstimateSheetContent.tsx`, `use-estimate-workspace-state.ts`, and the `estimate-sheet/` tree confirms **zero persistence calls** for collapse. For a deep estimate where a user collapses many areas, the loss-on-reload is real friction. **This is ephemeral by design today; whether it should persist (localStorage keyed by `estimateId+tabId`, client-only -- no DB column exists) is an open decision** surfaced below. Do not read the scope-keying as durable persistence.

---

## 4. Edge-case catalogue (expected vs actual)

Each canonical node state, what renders today, and what *should* render after the Req-3 caret fix. Anchored to `branch.tsx` and `drop-zones.tsx`.

### 4.1 Empty node (no rows, no children)

- **Today (actual):** inert caret slot `branch.tsx:204`; `NodeIcon`; name; and inside the always-expanded body, the `ComponentDropTarget` empty-state line *"Empty area. Add a row, drag components from the library, or add a sub-area from the tree."* (`drop-zones.tsx:85-94`, gated `empty={!hasContents}` from `branch.tsx:275`).
- **Expected:** unchanged -- no caret (nothing to collapse), keep the inert slot. This is the ONE case the reserved placeholder should survive the `hasContents` gate widening. **Verdict: correct, preserve.**

### 4.2 Only-rows node (own rows, no sub-areas) -- THE BUG

- **Today (actual):** inert caret slot `branch.tsx:204`; body (own-rows table + add-row strip) always rendered, NOT collapsible.
- **Expected:** interactive caret + `aria-expanded` (gate on `hasContents`); collapsing hides the own-rows table and add-strip together. **Verdict: BROKEN -- the headline Req-3 defect (Section 1).**

### 4.3 Only-children node (sub-areas, no own rows)

- **Today (actual):** interactive caret `branch.tsx:182-199`; collapsing hides child branches.
- **Expected:** unchanged. **Verdict: correct.**

### 4.4 Mixed node (own rows AND sub-areas)

- **Today (actual):** interactive caret; "Own items" eyebrow `branch.tsx:241-248`; rows-first DOM order (own rows + add-strip, then child branches `branch.tsx:240-311`).
- **Expected (post Req 1 + Req 3):** caret unchanged (already correct); **remove** the "Own items" eyebrow (Req 1, Section 2.8); rows-first order preserved -- DOM order alone separates own rows from children. **Verdict: caret correct; eyebrow scoped for removal.**

### 4.5 Single child

- **Today (actual):** caret present (`hasChildren` true), standard rendering.
- **Expected:** unchanged. **Verdict: correct.**

### 4.6 Deeply nested

- **Today (actual):** `leftIndent = Math.min(depth * 32, 192)` (`branch.tsx:89`) saturates at 192px (~depth 6), so visual nesting stops increasing past that depth. Sticky offsets stack via `ownRowsStickyTop = stickyTop + STICKY_HEADER_H` (`branch.tsx:95`) and `childStickyTop = ownRowsStickyTop + (hasOwnRows ? STICKY_THEAD_H : 0)` (`branch.tsx:96`), with both constants = 40 (`node-visuals.tsx:9-10`).
- **Expected:** indent saturation is a **spacing concern (Req 2)**, not an expand/collapse defect -- see the UX/Spacing doc. The caret fix does not change indent. **Verdict: caret-correct; deep-nesting indent saturation is a separate Req-2 input.** Note for Req 2: if header height changes, `STICKY_HEADER_H`/`STICKY_THEAD_H` must move in lockstep with the rendered `h-10` header or sticky layers overlap (cross-ref [05-PERFORMANCE-AUDIT](05-PERFORMANCE-AUDIT.md) PERF-6, and the test pin at `estimate-mixed-content.test.tsx:121`).

---

## 5. Test impact (what breaks by design)

`tests/vitest/estimate-mixed-content.test.tsx` pins the **current** behavior and must be rewritten as part of the Req-1/Req-3 change, not after. Verified assertions:

| Assertion | Line | Breaks for | Required change |
|---|---|---|---|
| `getByText("Own items")` in mixed node | `:77` | Req 1 | re-anchor rows-first test on thead/table, not the label |
| "Own items" present in mixed | `:88` | Req 1 | delete/invert |
| "Own items" absent on leaf | `:93` | Req 1 | becomes vacuous (label removed entirely) |
| caret + `aria-expanded` "only on a node with children" | `:96-101` | Req 3 | keep parent assertion |
| leaf renders NO disclosure button | `:105` | Req 3 | **invert** -- rows-only node now HAS a caret |
| leaf header has NO `[aria-expanded]` | `:108-110` | Req 3 | **invert** -- assert it now appears; only the truly-empty node has none |
| thead `style.top === STICKY_HEADER_H` | `:121` | Req 2 (only if header height changes) | update expected if header px moves |

The charts test `tests/vitest/project-charts-aggregation.test.ts` is **out of scope** and must stay green (Section 2.8). Recommended approach: flip the assertions first (TDD), watch them fail, then change `branch.tsx` -- this test file is effectively the spec for the disclosure model.

---

## 6. Readiness summary & open decisions

**Ready to ship after targeted fixes:**
- The EMC is functionally complete except the disclosure model (caret) and the two kind-gates.
- Req 1 (remove "Own items" eyebrow) and Req 3 (caret on rows-only nodes) are **zero-migration, client-render-only** changes (confirmed [06](06-DATABASE-AND-NETWORK-AUDIT.md) DBNET-2). They route through the existing expansion context and do not perturb the row-table memo or perf budget ([05](05-PERFORMANCE-AUDIT.md) PERF-4/PERF-5).
- The lone correctness blockers that need owner sign-off are the **two kind-gates** (`EstimateSheetContent.tsx:1649` row insert, `:1740` batch template) and their DB-RPC drift ([06](06-DATABASE-AND-NETWORK-AUDIT.md) DBNET-1).

**Open decisions (carry to [09-OPEN-DECISIONS](09-OPEN-DECISIONS.md)):**
1. **Empty-node caret policy.** After widening the caret to `hasContents`, the truly-empty node (`!hasContents`) keeps the inert slot (recommended) -- confirm vs a disabled caret.
2. **Collapse persistence.** In-memory-only is intended today (`EstimateSheetContent.tsx:992`); decide whether to back it with localStorage keyed by `estimateId+tabId` (client-only) or document the ephemerality as intended.
3. **"Own items" removal scope.** Confirm full removal of the EMC eyebrow (vs a lighter visual divider), and confirm the charts leaf (`aggregate-project-charts.ts:296-309`) is explicitly out of scope.
4. **Insert kind-gate relaxation.** Replace `kind !== "area"` (`:1649`) and `kind !== "group"` (`:1740`) with existence checks -- behavior change; must be paired with confirming the relaxed `insert_estimate_row_item_with_history` RPC exists in the target environment (DBNET-1).
5. **Phantom row-reorder grip.** Wire it (needs a new reorder-row RPC) or remove it (`row-table.tsx:202-204`).
6. **Caret toggle during active search.** Optionally disable/hide the per-node caret while `sheetSearchActive` to avoid editing an invisible collapse state (`EstimateSheetContent.tsx:1173`).
