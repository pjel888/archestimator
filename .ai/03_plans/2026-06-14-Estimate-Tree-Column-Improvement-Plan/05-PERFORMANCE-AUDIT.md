# 05 - Performance Audit & Budgets

> Part of the **Estimate Master Column (EMC) Improvement Plan** -- `.ai/03_plans/2026-06-14-Estimate-Tree-Column-Improvement-Plan/`
> Status: DRAFT (audit) - 2026-06-14 - Branch: feat/estimate-sheet-uxui
> Index: [00-README](00-README.md)

---

## TL;DR

The EMC's render economy rests on **exactly one** load-bearing optimization: `EstimateRowItemsTable` is wrapped in `React.memo` with a hand-written comparator (`row-table.tsx:57-82,84`) that slices the flat hoisted `editableRows` Record per-table, so a keystroke in one area's table does not re-render sibling tables. **Everything else in the EMC is unoptimized**: `EstimateSheetBranch` is a plain un-memoized recursive function (`branch.tsx:78`, rendered raw at `EstimateSheetContent.tsx:2340`), there is **no virtualization** anywhere in the rows path (grep returns nothing), and every keystroke re-runs three whole-tree DFS derivations on the host (`EstimateSheetContent.tsx:1234,1238,1241`).

The four proposed EMC changes are **render-cheap and provably perf-neutral or perf-positive**:

| Change | Verdict | Why |
|---|---|---|
| Req 1 - remove "Own items" eyebrow | Neutral (strictly cheaper) | Deletes one conditional `<p>`; no state, no memo input |
| Req 2 - spacing rhythm | Neutral | Pure className/number ops; only sticky-constant lockstep matters |
| Req 3 - caret on every node | **Positive** | Lets users collapse heavy rows-only tables, **unmounting** them from the render tree |
| Req 4 - CRUD matrix (doc-only) | Neutral | Documentation; per-operation perf reviewed when each ships |

The two real risks for **future** EMC work (not these four reqs): (1) any new shared state piped into the table that is **not sliced** at the per-table comparator granularity breaks the zero-cross-render guarantee; (2) Req 2 changing header pixel-height without updating `STICKY_HEADER_H`/`STICKY_THEAD_H` in lockstep causes sticky overlap/gaps that read as jank.

The non-negotiable budget any change MUST clear: **keystroke in one table re-renders 0 sibling tables; remote-cursor frames re-render 0 tables and 0 host renders.** These are enforced by `tests/vitest/perf/*` and verified below.

Sibling docs: see [03-UXUI-AUDIT.md](03-UXUI-AUDIT.md) (Req 3 caret / disclosure model), [03-UXUI-AUDIT.md](03-UXUI-AUDIT.md) (Req 2 spacing / sticky math), [07-BLAST-RADIUS-AND-RISK.md](07-BLAST-RADIUS-AND-RISK.md) (test gate), [02-CRUD-CAPABILITY-MATRIX.md](02-CRUD-CAPABILITY-MATRIX.md) (operations).

---

## 1. Render Architecture (memoization map)

### 1.1 The memo wall is at the TABLE boundary, not the branch boundary

There are precisely two render units in the EMC tree and only one of them is protected.

| Component | File:line | Memoized? | What protects it |
|---|---|---|---|
| `EstimateSheetContent` (host) | `EstimateSheetContent.tsx` | n/a (top of tree) | Internal `useMemo`/`useStableCallback` discipline |
| `EstimateSheetBranch` (recursive per-node) | `branch.tsx:78` | **NO** - plain function | Nothing; re-renders on every host state change |
| `EstimateRowItemsTable` (per-node row grid) | `row-table.tsx:84` | **YES** - `React.memo` + comparator | `areEstimateRowItemsTablePropsEqual` (`row-table.tsx:57-82`) |
| `EstimateMaterialCell` / per-row `<tr>` | `cells.tsx:90`, `row-table.tsx:186` | **NO** - plain function / inline | Only the owning table's memo wall |

Verified: `EstimateSheetBranch` is declared as a bare `export function` at `branch.tsx:78` with no `memo()` wrapper, and rendered un-wrapped at `EstimateSheetContent.tsx:2340`. Its child recursion at `branch.tsx:285-309` likewise renders bare `<EstimateSheetBranch>` instances. `EstimateRowItemsTable` is the only `memo(...)` in the rows path (`row-table.tsx:84`).

### 1.2 The comparator: how per-table isolation actually holds

`areEstimateRowItemsTablePropsEqual` (`row-table.tsx:57-82`) is the single enforcement point of the whole perf budget. It returns `false` (forcing a re-render) on:

- identity change of `items`, `targetNodeId`, `stickyTop`, `setEditableRows`, or **any** of the 11 callback props (`row-table.tsx:58-74`);
- per-item change of `editableRows[item.id]` **or** `selectedRowIds` membership, checked in a `for` loop keyed by `item.id` (`row-table.tsx:77-80`):

```ts
for (const item of next.items) {
  if (prev.editableRows[item.id] !== next.editableRows[item.id]) return false;
  if (prev.selectedRowIds.has(item.id) !== next.selectedRowIds.has(item.id)) return false;
}
return true;
```

This is why a keystroke that mutates `editableRows[X]` flips equality **only for the table that owns row X**: every other table's `for` loop finds no per-row delta and short-circuits to `true`. The whole-Set/Record props (`editableRows`, `selectedRowIds`) change identity on every host render, but the comparator never compares them by identity at the top level - it only reaches **inside** them keyed by the table's own `item.id`s.

### 1.3 Stable-prop discipline (the other half of the contract)

The comparator's strict callback `!==` checks (`row-table.tsx:62-73`) would force a re-render on every host render **unless** the callbacks are identity-stable. They are, via `useStableCallback` (`use-stable-callback.ts:8-16`):

```ts
export function useStableCallback<Args, Result>(callback) {
  const callbackRef = useRef(callback);
  useInsertionEffect(() => { callbackRef.current = callback; });
  return useCallback((...args) => callbackRef.current(...args), []);
}
```

The returned function has a permanently stable identity (`useCallback([])`) while always invoking the latest closure. The host wires all row handlers (`insertLibraryItem`, `replaceRowItem`, `deleteRowItem`, `updateRowItem`, etc.) into the branch at `EstimateSheetContent.tsx:2346-2360`; the branch forwards the **same references** to children (`branch.tsx:292-306`) and to the memoized table. So the only props that legitimately flip the comparator are `items` (tree shape change), `stickyTop` (layout shift), and per-row `editableRows`/`selectedRowIds` deltas.

### 1.4 The collapse context is OUT of band (does not touch the table memo)

Collapse state reaches the branch through `EstimateSheetExpansionContext`, not through table props. The context value is memoized at `EstimateSheetContent.tsx:1171-1177`, and the branch consumes it via `useEstimateSheetExpansion()` (`branch.tsx:79`). Because `collapsedNodeIds` is a context value and not a table prop, toggling collapse re-renders the **branch** subtree (PERF-1) but the memoized **tables** short-circuit (their `items`/`editableRows`/`selectedRowIds` are unchanged). This is the architectural reason Req 3 (carets on every node) is perf-safe - see §5.3.

---

## 2. The existing perf guards / budgets

The render probe is a production-zero-cost observability hook (`estimate-sheet-render-probe.ts:1-23`): `reportEstimateRowItemsTableRender` and `reportEstimateSheetContentRender` no-op (`activeProbe?.(...)`) unless a test installs a probe. The table fires its probe on every render at `row-table.tsx:103` (`reportEstimateRowItemsTableRender(targetNodeId)`); the host fires its probe at `EstimateSheetContent.tsx:962` (`reportEstimateSheetContentRender()`).

Three perf test files install probes and assert hard budgets. **These are the regression gate.**

### 2.1 Render relief (`tests/vitest/perf/estimate-sheet-render-relief.test.tsx`)

Fixture: 3 areas x 3 rows under a group (`makeTree(3, 3)`, lines 60-77, rendered 79-97).

| Assertion | Line | What it locks |
|---|---|---|
| `rendersOutside(renderCounts, "relief-area-1") === 0` after 3 keystrokes | `139` | **Keystroke in one table re-renders 0 sibling tables** |
| `renderCounts.get("relief-area-1") > 0` | `138` | The edited table DOES re-render (correctness) |
| `totalTableRenders === 0` on command-palette open | `175` | Opening the palette re-renders **no** table |
| `rendersOutside(renderCounts, "relief-area-1") === 0` on bulk-select | `189` | Bulk-selecting a row re-renders **only** that row's table |
| `projectTotals.at(-1) === 6300` after two edits | `159` | Cross-table totals stay live + correct |

`rendersOutside` (lines 107-113) sums probe counts across every table whose id is not the edited one - the budget is literally "the sum of all other tables' renders is zero".

### 2.2 Cursor isolation (`tests/vitest/perf/estimate-sheet-cursor-isolation.test.tsx`)

Fixture: 3 areas x 3 rows (`makeTree()`, lines 100-117). Installs **both** the table probe and the host probe (lines 135-140).

| Assertion | Line | What it locks |
|---|---|---|
| `contentRenders() === 0` on incoming remote cursor | `186` | A remote cursor frame does **not** re-render the host |
| `totalTableRenders === 0` on incoming remote cursor | `189` | A remote cursor frame re-renders **no** table |
| `input.value === "123"` + `activeElement === input` mid-cursor typing | `210-211` | Focus + typed value survive cursor frames |
| `tableRenders.get("cursor-area-2"/"-3") === 0` mid-typing | `214-215` | Other tables stay quiet through keystroke + cursor frame |
| `totalTableRenders === 0` on cursor list emptying | `230-232` | Clearing the overlay touches no table |

This proves remote-cursor rendering is fully decoupled from both the host and the row tables - the cursor layer is a sibling component (`EstimateSheetCursorLayer`, `EstimateSheetContent.tsx:2337`) reading its own `useSyncExternalStore`.

### 2.3 Render baseline (`tests/vitest/perf/estimate-sheet-render-baseline.test.tsx`)

A profiling harness, not a hard gate. It profiles keystrokes at 50/200/500 rows (lines 202-215) and writes a JSON profile. It explicitly self-labels as **relative-only** (line 65: `"Local jsdom render/keystroke profile. Not a production Chrome trace; use for relative before/after comparison only."`). The only assertion is `editedTableRenders > 0` (lines 204, 209, 214) - it records `keystrokeMsWorst` but **never asserts an upper bound on time**. This is the gap §6 closes.

### 2.4 Budget summary (what every EMC change must not regress)

1. Keystroke in table N -> 0 renders in any table != N (`relief:139`).
2. Bulk-select in table N -> 0 renders in any table != N (`relief:189`).
3. Command palette open -> 0 table renders (`relief:175`).
4. Remote cursor frame -> 0 host renders **and** 0 table renders (`cursor:186,189,232`).
5. The edited table DOES re-render and totals stay correct (`relief:138,159`).

---

## 3. Re-render blast analysis

### 3.1 Single row edit (the hot path)

A cell `onChange` calls `setEditableRows` on the host. `editableRows` is one flat hoisted `useState` Record (`EstimateSheetContent.tsx:989`). The cascade:

1. Host re-renders (probe fires at `EstimateSheetContent.tsx:962`).
2. **Three whole-tree DFS memos re-run** because they key on `editableRows`:
   - `projectTotal` - full DFS via `computeNodeTotal` over `estimateTree` (`EstimateSheetContent.tsx:1234-1237`).
   - `currentRows = flattenEstimateRows(...)` - full DFS over all nodes+rows (`EstimateSheetContent.tsx:1238`).
   - `activityScopeItems = buildActivityScopeTreeItems(...)` - full DFS, one item per node **and** per row (`EstimateSheetContent.tsx:1241-1251`), **even when the consuming modals are closed**.
3. `EstimateSheetBranch` re-renders top-to-bottom (PERF-1, un-memoized) and at **each** branch calls recursive `computeNodeTotal(node, editableRows)` (`branch.tsx:90`), which itself recurses the subtree (`editable-row-model.ts:115-118`). A node at depth d re-derives its entire subtree total; summed over the tree this is O(rows x depth) of redundant arithmetic per render.
4. Inside each branch the memoized `EstimateRowItemsTable` short-circuits **except** the one table owning the edited row (comparator `for` loop, `row-table.tsx:77-80`).
5. That one table re-renders all of **its** rows (`row-table.tsx:186` maps all `computedRows`; `computedRows` recomputed at `row-table.tsx:109-136`).

Net: cross-table isolation holds (budget §2.4.1), but the **host JS cost** (steps 2-3) is paid on every keystroke and is unmeasured by the render-count tests. This is a **pre-existing** finding (memory obs 6676), independent of the four reqs.

### 3.2 Expand/collapse toggle

The caret's `onClick` calls `setCollapsedNodeIds` (`branch.tsx:189-196`), which routes to the host setter (`EstimateSheetContent.tsx:1160-1169`) and updates `collapsedNodeIdsByScope`. Cascade:

1. Host re-renders; `collapsedNodeIds` memo rebuilds (`EstimateSheetContent.tsx:1156-1159`) and the context value memo rebuilds (`EstimateSheetContent.tsx:1171-1177`).
2. Branch tree re-renders (PERF-1). The three `editableRows`-keyed memos in §3.1 **do NOT** re-run (their deps - `editableRows`, `estimateTree` - are unchanged), so collapse is cheaper than a keystroke on the host.
3. The toggled node's body is gated on `!collapsed` (`branch.tsx:236`), so when collapsed its `EstimateRowItemsTable` and child branches **unmount** - a render-tree shrink.
4. Sibling tables short-circuit (their `items`/`editableRows`/`selectedRowIds` unchanged).

### 3.3 Tab switch

Switching the active tab flips `dataTabId`, which (a) changes the TanStack query key for the active tab's tree and (b) changes `collapsedScopeKey = dataTabId ?? "legacy"` (`EstimateSheetContent.tsx:1155`), so `collapsedNodeIds` rebuilds for the new scope. The new tab's tree is fetched (a cold 2-step nodes-then-rows waterfall per the Database/Network audit), then `displayedSheetNode` swaps and the whole branch tree mounts fresh for the new selection. This is a full remount of the EMC subtree by design - the per-table memo offers no protection across a tree-identity swap, and is not expected to. Collapse state for the previous tab is retained in its scope bucket and restored on switch-back (in-memory only; lost on reload).

---

## 4. Scale risks

### 4.1 No virtualization / windowing anywhere

Verified by grep: `react-window|react-virtual|virtualiz|useVirtual|@tanstack/react-virtual` across the entire estimate-sheet path and `EstimateSheetContent.tsx` returns **nothing** (exit 1). Consequences:

- **Wide subtree**: `EstimateSheetBranch` maps over all `childAreas` with no windowing (`branch.tsx:281`). The full visible subtree renders eagerly.
- **Tall table**: `EstimateRowItemsTable` maps over all `computedRows` with no windowing (`row-table.tsx:186`). The memo prevents an **unchanged** table from re-rendering, but does **not** bound the cost of rendering a table that DOES change: editing one row in a 500-row area re-renders all 500 of that area's rows (`computedRows` recompute at `row-table.tsx:109-136` maps all items).
- **Intra-table cost is O(rows-in-edited-area)**, unbounded, and unmeasured beyond 500 (baseline tops out at 10 areas x 50 rows, `baseline:212`).

### 4.2 Per-row/cell components are not individually memoized

`EstimateMaterialCell` (`cells.tsx:90`) and each `<tr>` (built inline in `computedRows.map`, `row-table.tsx:186`) are plain functions with fresh inline arrow handlers per cell. Because the table is memoized at its boundary, this is fine for the **cross-table** case (a quiet table never re-renders its cells). But the unit of re-render inside a table is the **whole table**, never a single row - so any keystroke in an area rebuilds all of that area's `<tr>`s and re-allocates every inline handler. This is the multiplier behind §4.1's intra-table linear cost.

### 4.3 Sticky-layer count grows with depth

Each branch renders a sticky node header (`branch.tsx:172`, `top: stickyTop`) and each table renders a sticky `<thead>` (`row-table.tsx:160`, `top: stickyTop`). Offsets accumulate down the recursion:

```ts
// branch.tsx:95-96
const ownRowsStickyTop = stickyTop + STICKY_HEADER_H;          // 40
const childStickyTop = ownRowsStickyTop + (hasOwnRows ? STICKY_THEAD_H : 0);  // +40
```

with `STICKY_HEADER_H = STICKY_THEAD_H = 40` (`node-visuals.tsx:9-10`). The JS to compute these is O(1) per branch. The cost is at the **browser compositor layer**: a deep mixed tree produces many simultaneously-pinned `position:sticky` elements (each branch header `z-[20]` + each own-rows `thead` `z-10`), each on its own stacking context. On scroll the compositor re-evaluates all active sticky layers. There is **no test or budget** covering scroll/paint cost - the perf suite is jsdom render-count only (`baseline:65` explicitly notes "Not a production Chrome trace").

### 4.4 Host-side whole-tree recompute (the JS ceiling)

Per §3.1, every keystroke re-runs `projectTotal` + `flattenEstimateRows` + `buildActivityScopeTreeItems` (the last even with modals closed) plus per-branch `computeNodeTotal`. At production data sizes this is the dominant client cost and the only one not protected by the table memo. It is **out of scope** for the four reqs (none of them add rows or new `editableRows`-keyed memos) but is the readiness ceiling to fold into §6.

---

## 5. Performance cost of each proposed change (proving neutrality)

### 5.1 Req 1 - remove the "Own items" eyebrow: NEUTRAL (strictly cheaper)

The eyebrow is a single static `<p>` rendered conditionally when `hasOwnRows && hasChildren` (`branch.tsx:241-248`). It has **no state, no callbacks, no `editableRows` dependency**. Removing it removes one DOM node per mixed node - strictly cheaper. Zero impact on the table comparator or any isolation test (it is not a table prop and not a memo input). Proof: search the comparator (`row-table.tsx:57-82`) and the three `editableRows` memos (`EstimateSheetContent.tsx:1234-1251`) - the string "Own items" / the eyebrow appears in **none** of them; it lives only in branch JSX. (Coupling note: the charts "Own items" leaf in `aggregate-project-charts.ts` is a separate surface - correctness, not perf; see [07-BLAST-RADIUS-AND-RISK.md](07-BLAST-RADIUS-AND-RISK.md).)

### 5.2 Req 2 - spacing rhythm: NEUTRAL (one lockstep caveat)

All spacing is governed by **pure functions and className strings**, recomputed per branch render but O(1) with no object allocation feeding a memo:

- `groupGap(depth, usesSiblingGroupRhythm)` returns a static Tailwind class string (`node-visuals.tsx:12-19`). (Note: [08-IMPLEMENTATION-PLAN.md](08-IMPLEMENTATION-PLAN.md) Task C1 collapses `groupGap` to a single `depth` argument, removing the dead `usesSiblingGroupRhythm` flag; the perf conclusion (neutral) is unchanged for the one-arg form — it remains a pure, allocation-free className function.)
- `space-y-4` + conditional `mt-1` (`branch.tsx:237`).
- `leftIndent = Math.min(depth * 32, 192)` computed inline (`branch.tsx:89`).

Changing any of these values has **no render-count or memo consequence**. The **one** perf-relevant caveat is sticky stacking: if Req 2 changes the rendered header height (`h-10` at `branch.tsx:174`) or `thead` height, then `STICKY_HEADER_H`/`STICKY_THEAD_H` (`node-visuals.tsx:9-10`) - the single source of truth for the accumulated offsets at `branch.tsx:95-96` - **must change in lockstep**, or sticky layers overlap/gap (a correctness regression that looks like jank). `estimate-mixed-content.test.tsx:121` asserts the own-rows `thead` `top === STICKY_HEADER_H`, so a height change forces that test to update too. **Preferred path**: tune only the non-sticky gaps (`space-y-*`, `groupGap`, breadcrumb `my`/`pb`) and keep header height fixed at 40px - then no sticky math is touched. See [03-UXUI-AUDIT.md](03-UXUI-AUDIT.md).

### 5.3 Req 3 - caret on every node: NET POSITIVE

The fix: render the caret when `hasContents` (`hasOwnRows || hasChildren`, already computed at `branch.tsx:88`) instead of only `hasChildren` (`branch.tsx:182`). Cost analysis:

- The caret is **one `Button` per branch** (`branch.tsx:183-199`); collapse already routes through the existing `EstimateSheetExpansionContext` (`branch.tsx:79`), so **no new table props** and **no new host shared-Set** beyond the existing `collapsedNodeIds`.
- Toggling collapse re-renders the branch subtree (PERF-1) but the memoized tables short-circuit (items/editableRows identity unchanged) - §3.2.
- **The win**: when a rows-only node collapses, its `EstimateRowItemsTable` **unmounts** (the body is gated on `!collapsed`, `branch.tsx:236`). Today a rows-only node has no caret (`branch.tsx:200-204` empty slot) and **cannot** be collapsed, so its heavy table can never leave the render tree. Letting users collapse heavy rows-only tables is a structural perf win for large sheets.
- The context value is already memoized (`EstimateSheetContent.tsx:1171-1177`) and passed via context, not via the table, so consumers re-subscribe correctly without breaking the table memo.

**Proof of neutrality against the tests**: the caret addition adds no table prop, so `areEstimateRowItemsTablePropsEqual` (`row-table.tsx:57-82`) is byte-for-byte unaffected and both isolation tests pass unchanged at the perf level. (The change DOES flip behavioral assertions in `estimate-mixed-content.test.tsx:96-111` - that is a correctness/test-rewrite concern owned by [03-UXUI-AUDIT.md](03-UXUI-AUDIT.md) and [07-BLAST-RADIUS-AND-RISK.md](07-BLAST-RADIUS-AND-RISK.md), not a perf regression.)

### 5.4 Req 4 - CRUD matrix: NEUTRAL (documentation)

Req 4 is documentation only ([02-CRUD-CAPABILITY-MATRIX.md](02-CRUD-CAPABILITY-MATRIX.md)). No render cost. When individual CRUD gap-fills later ship, each must clear the §2.4 budget and the §6 rule below: any new handler reaching the table must be `useStableCallback`-wrapped, and any new per-row signal must be added to the comparator's per-item `for` loop (`row-table.tsx:77-80`) keyed by `item.id`, never as a top-level whole-sheet object compared by identity.

### 5.5 Combined proof

None of Reqs 1-4 (a) add a new table prop, (b) add a new `editableRows`-keyed memo, or (c) introduce a whole-sheet Set/object compared by identity. Therefore the comparator (`row-table.tsx:57-82`) and the two isolation tests (`relief`, `cursor`) are **invariant under all four changes** at the perf level. The only file whose perf-adjacent constants can move is `node-visuals.tsx:9-10`, and only if Req 2 changes header height - a lockstep edit, not a regression.

---

## 6. Recommended perf budgets to add

The existing suite covers cross-table **render isolation** at small sizes but has **no absolute-time budget** and **no branch-level or scroll budget**. Recommended additions, in priority order:

| # | Budget | Where to add | Closes |
|---|---|---|---|
| B1 | **Collapse-unmount probe**: collapsing a rows-only node stops its table probe firing AND re-renders 0 sibling tables | extend `relief` test | Locks the Req 3 win (§5.3); guards against a future regression that re-mounts collapsed tables |
| B2 | **Absolute-time soft budget**: warn if `keystrokeMsWorst` at 500 rows exceeds a threshold (start as a logged warning, not a hard fail, since jsdom is relative-only per `baseline:65`) | `baseline` test (lines 202-215 already record `keystrokeMsWorst`) | §2.3 / §4.1 - no regression gate on per-keystroke time today |
| B3 | **Branch-level render count**: assert the number of `EstimateSheetBranch` renders on a collapse/select toggle is bounded (add a branch render probe alongside the existing table/content probes in `estimate-sheet-render-probe.ts`) | new probe + `relief` test | PERF-1 - branch re-render on collapse/select is currently untested |
| B4 | **Manual scroll-jank checklist item**: scroll a depth 4-5 mixed tree in real Chrome after any Req 2 spacing change; confirm sticky headers stack without overlap/gap | readiness checklist (this plan) | §4.3 - sticky compositor cost has no automated guard |
| B5 | **Sticky-constant lockstep assertion**: a test asserting the rendered header height equals `STICKY_HEADER_H` (extend `estimate-mixed-content.test.tsx:121` which already asserts `thead top === STICKY_HEADER_H`) | `estimate-mixed-content` test | §5.2 - silent sticky-offset mismatch if Req 2 moves header height |

**Process rule (no code, enforce in review)**: run `tests/vitest/perf/*` (relief + cursor + baseline) as a merge gate after **any** branch/table/host change, and re-read the comparator contract before adding any prop to the table. Document the comparator (`row-table.tsx:57-82`) as the canonical perf contract for the EMC.

---

## 7. Cross-references

- **[03-UXUI-AUDIT.md](03-UXUI-AUDIT.md)** - Req 3 caret semantics / disclosure model; the perf-safe implementation routes collapse through `EstimateSheetExpansionContext`, not new table props (§5.3).
- **[03-UXUI-AUDIT.md](03-UXUI-AUDIT.md)** - Req 2 spacing rhythm + sticky-constant lockstep; prefer non-sticky-gap-only edits to avoid touching the offset math (§5.2, §4.3).
- **[07-BLAST-RADIUS-AND-RISK.md](07-BLAST-RADIUS-AND-RISK.md)** - `areEstimateRowItemsTablePropsEqual` + the three perf tests are the regression gate; the behavioral test flips for Reqs 1/3 are correctness, not perf.
- **[06-DATABASE-AND-NETWORK-AUDIT.md](06-DATABASE-AND-NETWORK-AUDIT.md)** - keystroke-level RPC traffic (no debounce) and cold tab-switch waterfall pair with §3.1's whole-tree recompute and §3.3's tab-switch remount.
- **[02-CRUD-CAPABILITY-MATRIX.md](02-CRUD-CAPABILITY-MATRIX.md)** - per-operation perf review when each CRUD gap-fill ships (§5.4).

---

## 8. Open decisions (perf)

1. **Is per-keystroke host JS cost felt at production sizes?** §3.1/§4.4 (3x whole-tree DFS + per-branch `computeNodeTotal`) is the dominant client cost but is unmeasured beyond relative jsdom numbers (`baseline:65`). Needs a real Chrome trace at production row counts to size B2's threshold. **Out of scope for Reqs 1-4** but the readiness ceiling.
2. **Max row count under a SINGLE area in production?** §4.1/§4.2 only bite when one area holds many rows; if rows are spread across many small areas the memo keeps cost flat. This decides whether intra-table virtualization (or a memoized per-`<tr>` component) is ever needed.
3. **Memoize `EstimateSheetBranch` before shipping Req 3?** PERF-1 branch re-render on collapse/select is untested. Recommendation: **not required** for Reqs 1-4 (the table memo is the wall and Req 3 only adds carets); revisit as optional hardening (B3) if branch re-render is measured as a problem on large trees.
4. **Who owns sticky-constant sync if Req 2 moves header height?** §5.2 - recommend B5 (an automated lockstep assertion) over manual review.
