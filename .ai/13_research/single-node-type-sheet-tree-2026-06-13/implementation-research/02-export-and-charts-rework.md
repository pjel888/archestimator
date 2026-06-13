I have everything I need. Note that `read-context.ts` (AI surface, out-of-scope per brief) consumes the chart series — I'll note the DB/logic coupling but not plan its changes. Let me verify the chart "space" bucket uses *highest* Area (the brief's key correctness concern) — confirmed at lines 169-192 (`resolveSpaceBucket`) and 301-321 (`resolveSpaceAreaNode`), both walk to the topmost ancestor of `kind==='Area'`.

Now I'll compose the implementation-grade findings.

---

# FACET: PROPOSAL EXPORT & CHARTS REWORK — Findings

## 0. The core insight that reframes this facet

There are **two different grouping models** in play, and they break differently under the unified node type:

- **Proposal export does NOT group by tree node.** It groups by `sectionKey`, derived from each row's `category`/`discipline` text (`build-proposal-export-model.ts:95,106`). The tree node (`areaPath`) is carried only as *provenance metadata* for the Source Breakdown sheet. So the export's "section heading" is a category, never a node. This means the "node is both heading and line-item holder" problem (question 3) is **structurally absent from the main Bid Form** — it only surfaces in the Source Breakdown sheet and in `flattenEstimateTree`'s walk filter.
- **Charts DO group by tree node** (the "by space" mode), and they pick the **highest `Area` ancestor** of each row. This is where the real double-count and ambiguity risks live.

The existing **correct** reference algorithm already lives in the codebase: `buildEstimateTree.computeTotals` (`workspace-repository.ts:1624-1630`) computes `rowTotal + childTotal` recursively and **already handles a node that has both its own rows and children without double-counting**. Both rework targets should converge on that pattern.

---

## 1. TOTALS must never double-count (rolling up children + own rows)

### 1a. Proposal export grand total — **already safe, one cleanup needed**

`buildTotals` (`build-proposal-export-model.ts:216-236`) sums over flat `proposalRows`, each of which traces back to exactly one source row via `flattenEstimateTree`. There is no parent/child summation, so **no double-count risk** regardless of where rows sit. The only change is that `flattenEstimateTree` must stop skipping rows on non-`area` nodes (§1c).

### 1b. Charts grand total (`buildSeries`) — **already safe**

`buildSeries` (`aggregate-project-charts.ts:111-128`) iterates `input.rows` (flat row facts) once and accumulates into buckets by `bucket.id`. Each row contributes exactly once. The series `total` (line 133) sums buckets. No node-walk, no double-count. **No change needed for the series total.**

### 1c. `flattenEstimateTree` — REMOVE the `kind === "area"` gate

`build-proposal-export-model.ts:265` currently only emits rows when `node.kind === "area"`. Under one type, every node can hold rows.

**Before (`:261-282`):**
```ts
function visit(node, path, pathIds) {
  const nextPath = [...path, node.name];
  const nextPathIds = [...pathIds, node.id];
  if (node.kind === "area") {                    // <-- DROP THIS GATE
    for (const sourceRow of node.estimateRowItems ?? []) { rows.push({...}); sortIndex += 1; }
  }
  node.children?.forEach((child) => visit(child, nextPath, nextPathIds));
}
```
**After:**
```ts
function visit(node, path, pathIds) {
  const nextPath = [...path, node.name];
  const nextPathIds = [...pathIds, node.id];
  for (const sourceRow of node.estimateRowItems ?? []) {   // emit rows on ANY node
    rows.push({ sourceRow, sourceRowId: sourceRow.id, sourceNodeId: node.id, sourceNodeName: node.name,
      areaPath: nextPath, areaPathIds: nextPathIds, areaPathLabel: nextPath.join(" / "), sortIndex });
    sortIndex += 1;
  }
  node.children?.forEach((child) => visit(child, nextPath, nextPathIds));
}
```
A container's own rows and its descendants' rows each get emitted once, at their own node. No double count because consolidation/totals are flat over emitted rows.

### 1d. DELETE `collectNonAreaRows` and its warning

`build-proposal-export-model.ts:238-255` raises a `non_area_rows_skipped` warning for rows on non-area nodes. Once §1c emits those rows, the warning is false ("rows were skipped" — they no longer are). Remove the function and its call at `:350`. Also drop the obsolete `node.kind` reference. Leave the `empty_estimate` (`:352-358`) and `cost_split_compatibility_mode` (`:360-367`) issues.

### 1e. The DB total RPC `estimate_sheet_total` — already kind-agnostic, but flag a pre-existing formula divergence

`20260524033151_estimate_sheet_version_control.sql:175-184` already sums flat across all rows by `estimate_id` with no `kind`/`node` predicate, so it is **invariant-safe** under one type — no change required for collapse.

**Risk to surface (pre-existing, not caused by collapse):** the RPC uses `(quantity * unit_cost) + misc_cost` and **omits contingency**, diverging from the canonical formula `subTotal + miscCost + subTotal*contingency%/100` used by export (`build-proposal-export-model.ts:92-94`), charts (`aggregate-project-charts.ts:99-100`), and the tree (`estimate-row-tree-patch.ts:30-40`). The collapse makes rows appear at more nodes and will draw more eyes to this `estimate_sheet_total`/snapshot number, amplifying the inconsistency. Recommend aligning the RPC to:
```sql
coalesce(sum(
  (row_item.quantity * row_item.unit_cost)
  + row_item.misc_cost
  + ((row_item.quantity * row_item.unit_cost) * coalesce(row_item.contingency_percentage,0) / 100)
), 0)
```
This touches a SECURITY/`stable` SQL function consumed by `estimate_sheet_snapshot` (`:230`) → version-control history. Treat as a **separate, explicitly-scoped** change (it alters historical snapshot numbers) — do not silently fold it into the collapse. Flagging only.

---

## 2. 'By space' grouping when a node has BOTH children and own rows

This is the charts surface (`buildSpaceTableRows`, `:194-299`). Today every row is attributed to its **highest `Area` ancestor** (`resolveSpaceAreaNode`, `:301-321`); `Group` ancestors only receive rolled-up totals (`:230-241`); the `walk` renders `Group` rows as roll-up headers and `Area` rows as leaves with buckets. Under one type, "highest Area ancestor" is meaningless and a node can be both a parent and a row-owner.

### Proposed rule: own rows form an implicit leaf bucket at their owning node; ancestors roll up

Attribute each row to **the node that directly owns it** (`row.nodeId`), not to a walked-up ancestor. Then every node's displayed total = (own direct rows) + (sum of children totals), exactly like `computeTotals`. A node that has both children and own rows renders as a roll-up header **and** contributes an "own rows" leaf bucket so the direct cost is visible and not hidden inside the header number.

**Before (`resolveSpaceBucket`, `:169-192`)** — walks to highest `Area`:
```ts
function resolveSpaceBucket(nodes, row) {
  let current = row.nodeId ? nodeById.get(row.nodeId) : undefined;
  let highestArea;
  while (current) { if (current.kind === "Area") highestArea = current; ... }
  const label = highestArea?.name ?? "Unassigned space";
  return { id: highestArea ? normalizeBucketId("space", label) : "unassigned-space", label };
}
```
**After** — bucket = the owning node itself (pie/top-level grouping by the top-level ancestor for readability, or by owning node; recommend owning node for correctness, top-ancestor only if pie cardinality must stay low):
```ts
function resolveSpaceBucket(nodes, row) {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const owner = row.nodeId ? nodeById.get(row.nodeId) : undefined;
  if (!owner) return { id: "unassigned-space", label: "Unassigned space" };
  return { id: normalizeBucketId("space", owner.name), label: owner.name };
}
```
(Pie bucketing by owning node can explode cardinality; `collapseTopBuckets` at `:387` already caps to top-N + "Other", so this is bounded. If you want the pie grouped by *top-level* space, walk to the topmost ancestor regardless of kind — but keep the *table* attributed to the owning node per below.)

**Before (`buildSpaceTableRows`, `:218-241`)** — attributes to `resolveSpaceAreaNode` (highest Area), rolls up only into `Group` ancestors:
```ts
for (const row of input.rows) {
  const areaNode = resolveSpaceAreaNode(nodeById, row); if (!areaNode) continue;
  const total = calculateProjectChartRowTotal(row);
  // areaTotals[areaNode.id] += total
  let current = areaNode.parentId ? nodeById.get(areaNode.parentId) : undefined;
  while (current) { if (current.kind === "Group") groupTotals[current.id] += total; ... }
}
```
**After** — attribute to owning node; roll up into **every** ancestor (no kind filter):
```ts
const ownTotals = new Map();   // direct rows on a node
const rollupTotals = new Map(); // node total incl. descendants
for (const row of input.rows) {
  if (row.estimateId !== estimateId) continue;
  const owner = row.nodeId ? nodeById.get(row.nodeId) : undefined;
  if (!owner) continue;
  const total = calculateProjectChartRowTotal(row);
  const own = ownTotals.get(owner.id) ?? { node: owner, total: 0, rowCount: 0 };
  own.total += total; own.rowCount += 1; ownTotals.set(owner.id, own);
  let cur = owner;
  while (cur) {                                  // every ancestor, kind-agnostic
    const acc = rollupTotals.get(cur.id) ?? { node: cur, total: 0, rowCount: 0 };
    acc.total += total; acc.rowCount += 1; rollupTotals.set(cur.id, acc);
    cur = cur.parentId ? nodeById.get(cur.parentId) : undefined;
  }
}
```
**Before (`walk`, `:243-284`)** — branches on `child.kind === "Group"` to decide header vs leaf. **After** — drop the kind branch; a node is a *header* if it has children, and *additionally* emits an "own rows" child bucket when `ownTotals.has(child.id)`:
```ts
function walk(parentId, depth) {
  const out = [];
  for (const child of childrenByParentId.get(parentId ?? "__root__") ?? []) {
    const roll = rollupTotals.get(child.id);
    const own = ownTotals.get(child.id);
    const nested = walk(child.id, depth + 1);
    const hasChildren = (childrenByParentId.get(child.id)?.length ?? 0) > 0;
    if (!roll && nested.length === 0) continue;

    if (hasChildren) {
      out.push({ id: `node:${child.id}`, label: child.name, total: roll?.total ?? 0,
        share: getShare(roll?.total ?? 0, seriesTotal), rowCount: roll?.rowCount ?? 0,
        color: null, depth, kind: "group" });           // header
      if (own) {                                          // implicit own-rows bucket
        out.push({ id: `own:${child.id}`, label: `${child.name} — items`, total: own.total,
          share: getShare(own.total, seriesTotal), rowCount: own.rowCount,
          color: bucketById.get(normalizeBucketId("space", child.name))?.color ?? PROJECT_CHART_COLORS[0],
          depth: depth + 1, kind: "area" });
      }
      out.push(...nested);
    } else {
      if (!own) continue;
      out.push({ id: `node:${child.id}`, label: child.name, total: own.total,
        share: getShare(own.total, seriesTotal), rowCount: own.rowCount,
        color: bucketById.get(normalizeBucketId("space", child.name))?.color ?? PROJECT_CHART_COLORS[0],
        depth, kind: "area" });                           // pure leaf
    }
  }
  return out;
}
```
**Why no double-count:** a row hits `ownTotals` once (owner) and `rollupTotals` once per ancestor (including owner). The header shows the rollup (descendants + own); the separate `own:` bucket shows only direct rows; they are sibling display rows, not summed together by the UI. Critically, the **old** code summed `total` into `groupTotals` for *every* Group ancestor while also keeping `areaTotals` — but it attributed each row to a *single* Area, so a child-and-rows node was impossible to represent. The new code makes the both-case first-class.

Delete `resolveSpaceAreaNode` (`:301-321`) — replaced by direct-owner attribution. Keep the `SpaceNodeAccumulator` type (`:54-58`).

---

## 3. Proposal export rendering: node that is BOTH a section heading AND has own line items

Because the **Bid Form groups by category `sectionKey`, not by node** (`:95,106,207`), a tree node is never itself a section heading in the Bid Form. After §1c, a container's own rows simply flow into the Bid Form's category sections alongside everyone else's — **no structural change to the Bid Form, Summary, or Commercial Terms sheets is required, and no document ambiguity arises there.**

Where the both-case becomes visible is the **Source Breakdown** sheet (`create-proposal-workbook.ts:425-460`), which lists `areaPathLabel` per source row. After §1c:
- A row owned by a container node shows that container's full path as its `AREA PATH` (e.g. `Building A / Level 2`), and the same path appears as a *prefix* on its descendants' rows. This is correct and unambiguous — it reads as "this line item belongs at the Level 2 node itself."
- The `AREA` column (`sourceNodeName`, `:443`) shows the owning node's name. For a container-owned row that equals the heading name; for descendant rows it's the leaf. No collision.

**Recommended document structure (Source Breakdown), optional polish:** add a marker so a reader can distinguish container-level line items from leaf line items. Cheapest: append a `LEVEL` indicator derived from `areaPathIds.length`, or set the `AREA PATH` for a container-owned row to terminate with a ` ▸ (direct)` suffix. This is cosmetic; the data is already correct without it. If you want the Bid Form to *also* offer node-based grouping (so a heading node's own items bucket visibly), that is a **new feature** (`consolidationMode: "area-breakdown"` already exists as a settings enum at `types.ts:3` but is unused in builder logic) — out of scope for the collapse, but the right home for it.

---

## 4. Ambiguous / nonsensical cases and resolutions

| # | Case under one type | Where it breaks today | Resolution |
|---|---|---|---|
| A | Row sits on a non-leaf node | `flattenEstimateTree:265` skips it; export silently undercounts grand total | §1c — remove `kind==='area'` gate. **Highest-severity correctness bug.** |
| B | Charts "by space": row on a container | `resolveSpaceAreaNode:301` walks to highest **Area**; a row whose only ancestors are former "groups" returns `undefined` → row **dropped from the space table entirely** (`:222 if (!areaNode) continue`) | §2 — attribute to owning node; every node participates. |
| C | Container has both children and own rows | Old `walk:248` treats node as either Group (header, no own bucket) **or** Area (leaf) — never both; own rows on a "group" are invisible in the space table | §2 — emit header **plus** `own:` leaf bucket. |
| D | Root node holds rows | Old "roots must be group" assumption meant root rows never existed; `resolveSpaceBucket` would yield `unassigned-space` even though the row has a clear node | §2 owner-based attribution makes root-owned rows a normal top-level bucket. |
| E | Pie bucket cardinality explosion | Owner-based bucketing (§2) can produce one bucket per node | Bounded — `collapseTopBuckets:387` already collapses to top-N + "Other". Confirm `topBucketLimit` (default 8) is acceptable; no code change. |
| F | False validation warning | `collectNonAreaRows:242` warns rows "were skipped" | §1d — delete; rows are no longer skipped. |
| G | DB total vs canonical formula divergence | `estimate_sheet_total:181` omits contingency | §1e — flag as separate, scoped DDL change (alters snapshot history); do **not** fold into collapse. |
| H | `kind` map in chart repo | `project-charts-repository.ts:213` maps `node.kind === "area" ? "Area" : "Group"` | Harmless during transition (it's just a label feeding the now-kind-agnostic walk). Once §2 lands, `ProjectChartNodeFact.kind` is **unused** by aggregation — leave the column/map in place for back-compat until the schema-level `kind` removal is sequenced; note as dead-ish coupling, not a blocker. |

---

## Out-of-scope coupling noted (not planned)

- `src/lib/ai/read-context.ts:1167-1169` calls `buildProjectChartSeries` for space/category/supplier. The §2 signature is unchanged (same input/output types), so the AI surface keeps compiling; its *output text* will reflect the new owner-based space grouping. No AI app changes planned per brief.
- `ProjectChartNodeFact.kind` (`project-charts/types.ts:32`) and the DB `estimate_nodes.kind` column remain referenced by `project-charts-repository.ts:213` and `loadNodeFacts`. After §2 they are no longer load-bearing for aggregation. DB-level `kind` removal is a separate facet.

## Exact-change index (file:line)
- `src/lib/proposal-export/build-proposal-export-model.ts:265` — delete `if (node.kind === "area")` gate (§1c).
- `…/build-proposal-export-model.ts:238-255` + `:350` — delete `collectNonAreaRows` + its call (§1d).
- `src/lib/project-charts/aggregate-project-charts.ts:169-192` (`resolveSpaceBucket`), `:218-241` (attribution loop), `:243-284` (`walk`), `:301-321` (`resolveSpaceAreaNode`, delete) — owner-based attribution + both-case rows (§2).
- `supabase/migrations/20260524033151_estimate_sheet_version_control.sql:181` — flag only; align contingency in a separate scoped migration (§1e).
- Reference (no change): `workspace-repository.ts:1624-1630` `computeTotals` is the correct roll-up the above should mirror; `estimate_sheet_total:175-184` is already kind/node-agnostic.