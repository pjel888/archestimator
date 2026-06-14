# 06 - Database & Network/Fetching Audit

> Part of the **Estimate Master Column (EMC) Improvement Plan** -- `.ai/03_plans/2026-06-14-Estimate-Tree-Column-Improvement-Plan/`
> Status: DRAFT (audit) - 2026-06-14 - Branch: feat/estimate-sheet-uxui
> Index: [00-README](00-README.md)

---

## Scope & method

This document audits the **persistence and fetching layer** behind the Estimate Master Column (EMC) -- the middle column of the estimate sheet. It answers four practical questions the plan needs:

1. What is the schema for tabs / nodes / row items / components, and what constraints (CHECK, trigger, RLS) gate writes?
2. How does the query layer cache, invalidate, and persist each mutation (cache-set vs refetch)?
3. When does an EMC edit actually reach the database (the dirty/save model)?
4. What is the DB/network impact of the three presentational EMC requirements (Req 1 Own-items, Req 2 spacing, Req 3 caret)?

**Verification.** Every claim below is anchored to a file I opened and read in this session. Schema/RPC claims are verified against the **committed migrations** in `supabase/migrations/`, not against the hosted DB -- a hosted-vs-migrations drift is the single most material finding ([§1.5](#15-the-load-bearing-finding-committed-rpc-still-kind-gates-rows-to-area), [DBNET-1]). Where hosted state is known to differ from the committed SQL, it is called out explicitly and cross-linked to `.ai/10_state/current-state.md`. An owner-authed Supabase MCP `pg_get_functiondef` check closes the implementation-time parity gap.

Sibling docs cross-referenced: [02-CRUD-CAPABILITY-MATRIX](02-CRUD-CAPABILITY-MATRIX.md) (operation census), [04-FEATURE-READINESS-AND-BUG-AUDIT](04-FEATURE-READINESS-AND-BUG-AUDIT.md) (Req 3 caret), [03-UXUI-AUDIT](03-UXUI-AUDIT.md) (Req 1), [05-PERFORMANCE-AUDIT](05-PERFORMANCE-AUDIT.md) (render cost), [07-BLAST-RADIUS-AND-RISK](07-BLAST-RADIUS-AND-RISK.md) (readiness).

---

## 1. Schema -- tabs, nodes, row items, components

The EMC entity hierarchy has **three persisted levels**, not four: **Tab -> Node -> Row item**. A "Component" is **not a separate table** -- it is the library-linkage sub-state of a row item, carried by `source_library_item_id` + `source_snapshot` + `link_state` columns on `estimate_row_items`. This is confirmed by the repository's row mapper (`estimate-repository.ts:71-92`) and the row select list (`estimate-repository.ts:45`), neither of which references any component table. (Cross-ref: [02-CRUD-CAPABILITY-MATRIX](02-CRUD-CAPABILITY-MATRIX.md) treats Component as a row sub-state, not a row of its own.)

### 1.1 estimate_tabs

The tab table and its RLS were added by `supabase/migrations/20260612094734_estimate_tabs_foundation.sql`.

| Concern | Detail | Anchor (verified) |
|---|---|---|
| RLS enabled | `alter table public.estimate_tabs enable row level security;` | `20260612094734_estimate_tabs_foundation.sql:39` |
| Read policy | viewers may `select` when `can_access_estimate(estimate_id)` | `20260612094734_estimate_tabs_foundation.sql:41-42` |
| Write policy | editors may `for all` when `can_edit_estimate(estimate_id)` (USING + WITH CHECK) | `20260612094734_estimate_tabs_foundation.sql:43-44` |
| Admin policy | `is_platform_admin()` may manage all tabs | `20260612094734_estimate_tabs_foundation.sql:45-46` |
| Grants | `revoke all ... from public, anon, authenticated;` then `grant select, insert, update, delete ... to authenticated;` | `20260612094734_estimate_tabs_foundation.sql:48-49` |

The tab RLS is the perimeter for the whole estimate sheet: `can_access_estimate` / `can_edit_estimate` are the same predicates the node and row policies and the `*_with_history` RPCs lean on. (Note: prior whole-app audits flagged `is_platform_admin()` resolving on bare `auth.uid()` as a hardening item -- pre-existing and out of scope here.)

### 1.2 estimate_nodes

`estimate_nodes` is the single node table. The tabs migration added `estimate_tab_id` (per-tab scoping) and the node mapper reads `id, estimate_id, parent_id, kind, name, sort_order` plus `estimate_tab_id` (`estimate-repository.ts:44`, `estimate-repository.ts:190`).

- **`kind` is still a live column** with values `'group' | 'area'`. The repository explicitly filters out any other kind: `isActiveEstimateNodeKind` accepts only `'group'` or `'area'` (`estimate-repository.ts:53-55`), and `toEstimateNode` drops a row whose kind is neither (`estimate-repository.ts:57-58`). So `kind` persists, but the **renderer is kind-agnostic** (see [04-FEATURE-READINESS-AND-BUG-AUDIT](04-FEATURE-READINESS-AND-BUG-AUDIT.md)).
- **Two-kind hierarchy validator REMOVED for P5.** The unification migration `20260614003639_unify_estimate_node_kinds.sql` removed the "root must be group / only group may parent group|area" block (`20260614003639_unify_estimate_node_kinds.sql:74-76`) so **any node may be a root and any node may parent any node**. Cross-tab isolation (parent must be in the same tab) is **preserved** (`20260614003639_unify_estimate_node_kinds.sql:63-72`).
- **Row-item-belongs-to-node validator RELAXED for P5.** The same migration dropped the `node.kind <> 'area'` clause from the validator, keeping only the orphan / same-estimate existence half (`20260614003639_unify_estimate_node_kinds.sql:78-89`). The comment is explicit that this is the validator path and that the per-row write-time trigger carries the other half.

**Net schema truth:** a "mixed" node (own rows **and** children) is **legal at the DB level after P5**. The constraints that would have rejected it are gone from the committed validator migration.

### 1.3 estimate_row_items

The row table holds the editable cost basis and the component linkage. Selected/mapped columns (`estimate-repository.ts:45`, mapper `71-92`):

`id, estimate_id, node_id, sort_order, source_library_item_id, source_snapshot, material, description, supplier, unit, quantity, unit_cost, contingency_percentage, misc_cost, row_revision, discipline, designation, link_state`

Key constraint-bearing columns:

- **`row_revision`** -- optimistic-concurrency token. Every update/replace/delete/detach RPC requires `expected_row_revision` and raises `estimate_sheet_row_revision_conflict` (errcode `P0001`) on mismatch, with `expected`/`current` in the detail payload (`20260524050746_add_estimate_row_contingency_percentage.sql:489-497`). On success the RPC bumps `row_revision = row_revision + 1` (`20260524050746:519`). Insert sets `row_revision = 1` and takes no expected revision (correct -- it is a create). See [§3.6](#36-optimistic-concurrency-row_revision).
- **`source_library_item_id` / `source_snapshot` / `link_state`** -- the "Component" sub-state. `link_state` is the enum `public.estimate_row_link_state` (referenced in the update set-clause cast at `20260524050746:513`); detaching a row sets `source_library_item_id = null`, `link_state = 'detached'`, `source = 'project'` (optimistic patch at `use-estimate-row-mutations.ts:191-194`).
- **`contingency_percentage`** -- added by `20260524050746_add_estimate_row_contingency_percentage.sql`; `misc_cost` merged in, both numeric.

### 1.4 The component "table" does not exist

There is no `estimate_components` table in the read path. A row's component is its library linkage. "Replace component" rewrites `source_*`/`material`/etc. on the same row via `replace_estimate_row_item_with_history`; "clear component" replaces with a blank template; "mark project-specific" detaches via `unlink_estimate_row_item_from_library_with_history`. All operate on `estimate_row_items` rows -- documented in the persistence map ([§3](#3-persistence-map-per-mutation)).

### 1.5 The load-bearing finding: committed RPC still kind-gates rows to 'area' (DBNET-1)

This is the most material DB risk in the entire EMC plan and it directly gates Req 3.

- The **server action** `insertEstimateRowItemFromLibrary` selects the target node with **no kind filter** and an explicit P6 comment: *"a row may be inserted into ANY node, not only the former 'area' kind"* (`src/lib/estimates/actions.ts:2500-2510`). It passes the node straight to the RPC (`actions.ts:2531-2534`).
- The **only committed definition** of `insert_estimate_row_item_with_history` still hard-codes the gate:

```sql
-- 20260524050746_add_estimate_row_contingency_percentage.sql:344-352
if target_node_id is null or not exists (
  select 1
  from public.estimate_nodes node
  where node.id = target_node_id
    and node.estimate_id = target_estimate_id
    and node.kind = 'area'              -- <-- still 'area'-only in committed SQL
) then
  raise exception 'Target area node not found in the current estimate.';
end if;
```

So on **any environment rebuilt from the committed migrations** (`supabase db reset`, a fresh staging/CI DB), inserting a row into a `group`-kind node -- exactly the mixed-node case Req 3 enables -- **throws server-side**. `.ai/10_state/current-state.md` records that the relaxed P6 RPC work was applied to production, but the SQL still needs clean-apply parity in `supabase/migrations/`.

The same `kind = 'group'` gate exists in two sibling insert RPCs:

- `insert_estimate_subtree_into_estimate` -- `kind = 'group'` parent guard (`20260613134852_insert_estimate_subtree_rpc.sql:87`, "Target Group Node not found in the current project." at `:90`).
- `insert_estimate_template_into_estimate` -- `kind = 'group'` parent guard (`20260612094734_estimate_tabs_foundation.sql:824`, error at `:826-828`).

**Why this matters for the plan:** Req 3 (caret on rows-only nodes) is presentational, but the *enabling app-layer change* -- lifting the client gate `if (targetNode?.kind !== "area") return;` (`EstimateSheetContent.tsx:1649`) -- will start routing row inserts to non-`area` nodes. On a committed-migrations environment those inserts fail. **Before any non-prod env exercises mixed-node inserts, the P6 relax SQL must land as a real committed migration.** Cross-ref [07-BLAST-RADIUS-AND-RISK](07-BLAST-RADIUS-AND-RISK.md) (readiness blocker) and [04-FEATURE-READINESS-AND-BUG-AUDIT](04-FEATURE-READINESS-AND-BUG-AUDIT.md) (the client gate).

> **[DBNET-1] still needs a fresh implementation preflight.** `.ai/10_state/current-state.md` records that P5/P6 production relax work was applied and write-enablement was verified, while the committed SQL shown above still hard-codes `kind = 'area'` / `kind = 'group'`. That means the remaining risk is source/live drift and clean-apply parity, not just production behavior. **Confirming the actual hosted RPC bodies is an explicit Phase-D PRE-STEP -- D0 -- that GATES D1, D2, and D3.** D0 = run an owner-authed Supabase MCP `pg_get_functiondef` against all three insert RPCs (`insert_estimate_row_item_with_history`, `insert_estimate_subtree_into_estimate`, `insert_estimate_template_into_estimate`) and diff the live bodies against the committed migrations. If hosted RPCs are not relaxed, the migration-landing work below is correctness-critical for production too, not just for clean-apply environments. See [09-OPEN-DECISIONS](09-OPEN-DECISIONS.md) (OD-9) for the open decision this PRE-STEP resolves.

---

## 2. Query layer -- keys, hooks, invalidation

### 2.1 Query keys

All EMC reads/writes route through `estimateQueryKeys` (`src/hooks/use-estimate-query.ts:10-16`):

```ts
detail:   (estimateId)        => ["estimate", estimateId]
tabs:     (estimateId)        => ["estimate", estimateId, "tabs"]
tabTree:  (estimateId, tabId) => ["estimate", estimateId, "tab", tabId, "area-tree"]
areaTree: (estimateId)        => ["estimate", estimateId, "area-tree"]   // legacy
```

The **active tab's tree** is `tabTree(estimateId, tabId)`; `areaTree` is the legacy full-estimate key kept for compatibility. The host selects between them: when a `dataTabId` exists it uses `tabTreeQuery`, otherwise the legacy `legacyTreeQuery` (`EstimateSheetContent.tsx:982-987`). Each tree query is **enabled only for the active tab** (`enabled: Boolean(dataTabId)`, `EstimateSheetContent.tsx:980`; `enabled: ... && Boolean(projectId && estimateId && tabId)`, `use-estimate-query.ts:106`). `staleTime` is **5 minutes** for tabs and both trees (`use-estimate-query.ts:47, 108, 161`).

### 2.2 Per-tree cache helpers

`useEstimateTabTreeQuery` / `useEstimateAreaTreeQuery` expose a hand-rolled optimistic toolkit over the TanStack cache (`use-estimate-query.ts:110-142`, mirrored at `49-81`):

- `setTree(next)` -- writes the cache via `setQueryData` and **bumps a sibling `revision` key** (`use-estimate-query.ts:120-129`). The revision is the guard that lets a late async reconcile detect that a newer optimistic edit superseded it.
- `getTreeRevision()` / `bumpTreeRevision()` -- read/increment the `[...queryKey, "revision"]` counter (`use-estimate-query.ts:111-119`).
- `restore(previousTree, expectedRevision)` -- rolls back **only if** `getTreeRevision() === expectedRevision`, otherwise it no-ops (`use-estimate-query.ts:131-136`). This is the "don't clobber a newer edit" guard used by all rollbacks.
- `prepareOptimisticUpdate()` -- cancels in-flight queries and snapshots the current cache (`use-estimate-query.ts:137-140`).

The tree itself **lives in the TanStack cache, not React state.** Mutations mutate the cache directly; the component reads `query.data`.

### 2.3 Invalidation strategy -- refetchType "none" everywhere on row ops

Row mutations live in `useEstimateRowMutations` (`src/hooks/use-estimate-row-mutations.ts`). The shared `mutationOptions` invalidate with **`refetchType: "none"`** on both success and error (`use-estimate-row-mutations.ts:144-145, 150`):

```ts
// use-estimate-row-mutations.ts:142-151
onSuccess: (_result, input) => {
  markSaved();
  void queryClient.invalidateQueries({ queryKey: ...tabTree/areaTree..., refetchType: "none" });
  if (detailQueryKey) void queryClient.invalidateQueries({ queryKey: detailQueryKey, refetchType: "none" });
},
onError: (_error, input) => {
  input.rollback?.();
  markFailed();
  if (treeQueryKey) void queryClient.invalidateQueries({ queryKey: treeQueryKey, refetchType: "none" });
},
```

`refetchType: "none"` means **the cache is marked stale but never refetched**. Combined with `staleTime: 5min`, the practical effect is: **the optimistic `setQueryData` IS the persisted state**, and no network read pulls server truth until a cold remount, a tab switch to an un-cached tab, or the 5-minute stale window elapses. Every row-mutation path (`insert`, `replace`, `delete`, `detach`, `update`) repeats this `refetchType: "none"` pattern (`use-estimate-row-mutations.ts:205-206, 216, 254-255, 266`). See [§3.5](#35-no-server-reconciliation-on-insertdelete).

The **one exception** is the legacy `useMoveEstimateRowItem`, which is the only path that genuinely refetches: `onSettled: () => queryClient.invalidateQueries({ queryKey })` with a **default** refetch (`use-estimate-query.ts:182`). This legacy mutation goes through the repository (`estimateRepository.moveEstimateRowItem`, `use-estimate-query.ts:172`) and is **not** on the EMC's primary edit path.

---

## 3. Persistence map per mutation

This is the persistence column for the CRUD matrix ([02-CRUD-CAPABILITY-MATRIX](02-CRUD-CAPABILITY-MATRIX.md)). Every EMC write goes through a Supabase `SECURITY DEFINER` `*_with_history` RPC that (a) checks edit access (`assert_can_edit_estimate_for_history` / `resolve_estimate_workspace`), (b) short-circuits on `estimate_sheet_event_result(correlation_id)` for idempotency, (c) takes a `FOR UPDATE` lock on the estimate, (d) mutates, (e) writes an `estimate_sheet_events` audit row. The lock + idempotency pattern is visible in the insert RPC preamble (`20260524050746:335-342`).

| Operation | RPC (server action) | Optimistic? | Reconcile / refetch | Anchor (verified) |
|---|---|---|---|---|
| Insert library item / blank row | `insert_estimate_row_item_with_history` (`insertEstimateRowItemFromLibrary`) | Yes -- `setEstimateTree` + `setEditableRows` then `insertRow` | **None** -- `refetchType: "none"`, no post-success patch | `EstimateSheetContent.tsx:1655-1677`, `use-estimate-row-mutations.ts:156-159, 144` |
| Update row values (qty/cont%/misc) | `update_estimate_row_item_with_history` | Yes -- `patchEstimateRowItemInTree(toOptimisticRowPatch)` | **Server patch** -- `patchEstimateRowItemInTree(toServerRowPatch)` on success | `use-estimate-row-mutations.ts:239-256` |
| Replace / clear component | `replace_estimate_row_item_with_history` | Yes (shared `mutationOptions`) | None beyond shared invalidate (`refetchType:"none"`) | `use-estimate-row-mutations.ts:161-164` |
| Delete row (single + bulk loop) | `delete_estimate_row_item_with_history` | Yes -- `setEstimateTree` removal | **None** -- `refetchType: "none"` | `use-estimate-row-mutations.ts:166-169` |
| Mark project-specific (detach) | `unlink_estimate_row_item_from_library_with_history` | Yes -- `onMutate` `setQueryData` detached patch | **Server patch** -- `patchEstimateRowItemInTree(toDetachedRowPatch)` on success | `use-estimate-row-mutations.ts:171-218` |
| Insert template (single/batch) | `insert_estimate_template_into_estimate_with_history` | Yes -- optimistic clone | **Revision-guarded** `setEstimateTree(result.tree)` only if revision unchanged | `EstimateSheetContent.tsx:1712-1718` |
| Insert template node (subtree) | mixes template read + `create_estimate_node_with_history` + `insert_estimate_row_item_with_history` loop | Yes | Revision-guarded reconcile | `actions.ts` template-node path (multi-RPC, not atomic) |
| Insert project source (subtree) | `insert_estimate_subtree_into_estimate_with_history` | **No** (server copies subtree, applies returned tree) | Applies returned tree | `20260613134852_insert_estimate_subtree_rpc.sql:80-91` |
| Move component between rows | `replace_*` (target) + `replace_*`-with-blank (source) | Yes (two mutations) | **Non-atomic** -- partial failure leaves one row mutated | [02-CRUD-CAPABILITY-MATRIX](02-CRUD-CAPABILITY-MATRIX.md) |

**Two atomicity caveats to carry into the matrix:**

1. **`moveRowComponent` is replace(target) + clear(source) = two non-atomic RPCs.** A failure between them leaves the source cleared and target unchanged (or vice versa). It is not a single-transaction "move."
2. **`insertTemplateNodeIntoEstimate` is a client-orchestrated multi-RPC loop** (template read, then create-node, then per-row insert), not one transaction.

### 3.5 No server reconciliation on insert/delete

`insert` and `delete` row mutations have **no `onSuccess` reconcile** -- only the shared `mutationOptions` with `refetchType: "none"` (`use-estimate-row-mutations.ts:156-169`). The optimistic tree edit done in the host (`insertLibraryItem` `setEstimateTree`, `deleteRowItem` `setEstimateTree`) is the **only** post-success state. By contrast, `update` and `detach` **do** reconcile from the server result (`patchEstimateRowItemInTree(... toServerRowPatch / toDetachedRowPatch)`, `use-estimate-row-mutations.ts:250-252, 199-203`), syncing `rowRevision`/`itemCost`/`linkState`. Inserted rows use a **client-generated UUID** that the RPC honors (`row_payload.id` / `persistedRowId`, `actions.ts:2529`), so optimistic and persisted IDs match -- no ID reconciliation needed.

**Invariant for Req 3:** because insert has no post-success refetch, the optimistic tree shape (which node the row lands in, its `sort_order`) must be exactly correct. When the client gate is lifted to allow inserts on previously-non-insertable nodes, verify the optimistic placement matches the RPC's `sort_order` computation (`actions.ts:2515-2525`, "max(sort_order)+1 within node").

### 3.6 Optimistic concurrency (row_revision)

Update/replace/delete/detach supply `expectedRowRevision` from the cached row's revision (`withMutationIdentity` -> `getCachedRowRevision`, `use-estimate-row-mutations.ts:270-282`). The RPC raises `P0001 estimate_sheet_row_revision_conflict` on mismatch and rolls back (`20260524050746:489-497`); on success it bumps revision and the client patches the new revision into cache. This makes concurrent in-EMC editing safe at the row grain. None of Req 1/2/3 touch rows, so this model is unaffected; any **future batch-save** would need to thread `expectedRowRevision` per row.

---

## 4. The dirty/save model -- when an edit reaches the DB

**There is no batch save and no debounce.** Every cell edit persists immediately, serialized per-row.

- `editableRows` is **one flat hoisted `useState` Record** on the host (`EstimateSheetContent.tsx:989`). Cell `onChange` handlers set this state for instant UI; on a value change `updateRowItem` builds a patch and calls `updateRow` (`EstimateSheetContent.tsx:1623-1645`).
- `updateRow === enqueueRowUpdate` (`use-estimate-row-mutations.ts:311`). It **immediately** fires `update_estimate_row_item_with_history`, but **serialized per `rowId`** via a promise chain: each edit on a row waits for the prior edit on the *same* row before issuing (`use-estimate-row-mutations.ts:291-301`). There is **no time-based coalescing** -- this is ordering, not throttling. So a user typing a quantity generates one RPC round-trip per committed value, each writing an `estimate_sheet_events` audit row and bumping `row_revision`.
- **`saveState` is cosmetic.** `markRowDirty` only sets the label `"dirty"` (`use-estimate-row-mutations.ts:106-108`); the `idle/dirty/saving/saved/failed` state drives no persistence. Its only functional use is a guard: while `saveState === "dirty" || "saving"`, the host **skips re-syncing `editableRows` from the cache tree** so a server tree doesn't overwrite an in-flight cell edit (`EstimateSheetContent.tsx:1588-1597`). There is no `beforeunload` blocker wired to it in the read sections.

**Verification of "no debounce":** I confirmed `updateRowItem` (`EstimateSheetContent.tsx:1623`) calls `updateRow` synchronously with the new values, and `enqueueRowUpdate` (`use-estimate-row-mutations.ts:291-301`) issues `mutateAsync` immediately after the prior same-row promise resolves -- no timer. **Open question:** whether the cell input layer (`cells.tsx`) commits on every keystroke or only on blur/Enter determines the true RPC-per-keystroke rate; this audit confirmed only that the host fires synchronously once given a value. (Cross-ref [05-PERFORMANCE-AUDIT](05-PERFORMANCE-AUDIT.md) PERF-3: the host also recomputes three whole-tree DFS derivations per keystroke.)

---

## 5. Fetch waterfalls / N+1 on tab switch

Switching tabs flips `dataTabId`, which changes the query key `tabTree(estimateId, tabId)` (`use-estimate-query.ts:13, 100`). Consequences:

- **No prefetch of sibling tabs.** Only the active tab's tree query is enabled (`EstimateSheetContent.tsx:980`). First visit to each tab is a cold read; revisits within the 5-minute `staleTime` are cache-hot.
- **2-step nodes-then-rows waterfall.** `getEstimateTabTree` runs **sequentially**: query 1 fetches `estimate_nodes` for the tab; only after it resolves does query 2 fetch `estimate_row_items` via `.in("node_id", nodeIds)` (`estimate-repository.ts:186-216`). The rows query **cannot start** until the node IDs are known. If the tab has zero nodes it short-circuits with no rows query (`estimate-repository.ts:203`).
- **Not an N+1.** The rows query is a **single batched `IN`** over all node IDs (`estimate-repository.ts:205-209`), not one query per node. Prior DB audits confirmed composite indexes cover this `.in()` (memory 5747). It is a serialized waterfall, not a fan-out.
- **Contrast with the legacy full-estimate read.** `getEstimateTree` fetches nodes and rows **in parallel** by `estimate_id` (`Promise.all([...])`, `estimate-repository.ts:161-172`). The per-tab path traded that parallelism for tab scoping.

**Optional perf (out of scope for Req 1/2/3):** prefetch adjacent tabs on hover/idle, or collapse `getEstimateTabTree` into a single round trip (a tab-scoped RPC or an embedded select) to kill the nodes-then-rows waterfall. Belongs in the Network section as a known cold-switch cost, not a blocker.

**Pre-existing payload note (unchanged by this work):** EMC reads ship the full cost basis to the browser. `ESTIMATE_ROW_ITEM_SELECT` includes `unit_cost`, `supplier`, `source_snapshot`, etc. (`estimate-repository.ts:45`) and runs via `createSupabaseBrowserClient` (`estimate-repository.ts:160, 187`). RLS (`can_access_estimate` via the tab policies, `20260612094734:41-46`) is the perimeter, but the client receives more than it renders (memory 6675/6562). None of Req 1/2/3 change the read shape; do not widen the payload to support them.

---

## 6. DB/network impact of the proposed EMC changes

### 6.1 Req 1 (remove "Own items" eyebrow) and Req 3 (caret on rows-only nodes): PRESENTATIONAL -- zero schema/RPC change

The DB already supports the target end-state, so **neither requires a migration**:

- **Schema already permits mixed nodes.** P5 (`20260614003639_unify_estimate_node_kinds.sql`) removed the two-kind hierarchy block (`:74-76`) and relaxed the row-item validator to existence-only (`:78-89`). A node holding both children and own rows is legal at the schema level.
- **The "Own items" eyebrow is pure view logic.** It is a conditionally-rendered `<p>` (`branch.tsx:241-248`, gated `hasOwnRows && hasChildren`) with **no column, FK, RLS, trigger, or RPC** reading or writing it. Removing it touches no persistence. (Cross-ref [03-UXUI-AUDIT](03-UXUI-AUDIT.md).)
- **The disclosure caret is pure view logic.** Gated on `hasChildren` today (`branch.tsx:182`); widening to `hasContents` is a className/JSX change. **Collapse state is client-only** -- `collapsedNodeIdsByScope` is plain React `useState` on the host (`EstimateSheetContent.tsx:992`), scope-keyed by `dataTabId`, with **no localStorage/sessionStorage/server backing** (no persistence call exists in the host or hooks). It survives tab switches within a session but is **lost on reload**. (Cross-ref [04-FEATURE-READINESS-AND-BUG-AUDIT](04-FEATURE-READINESS-AND-BUG-AUDIT.md).)

**The one DB-adjacent dependency for Req 3** is **not** a schema change -- it is lifting the client gate `if (targetNode?.kind !== "area") return;` (`EstimateSheetContent.tsx:1649`), which currently makes a rows-bearing node always behave as a leaf by silently rejecting inserts. Lifting it is an app change, **but it depends on [DBNET-1] (§1.5)**: a committed-migrations environment will reject the resulting row inserts on `group` nodes until the relaxed RPC lands as a real migration.

### 6.2 Req 2 (spacing): PRESENTATIONAL -- zero schema/RPC/network change

Spacing is governed by pure functions and class strings (`groupGap` in `node-visuals.tsx`, `space-y-4` / `leftIndent` / sticky offsets in `branch.tsx`). No state, cache, query, or persistence is involved. Render-neutral and network-neutral. (Render-cost detail: [05-PERFORMANCE-AUDIT](05-PERFORMANCE-AUDIT.md).)

### 6.3 Charts "Own items" leaf is a SEPARATE DB-fed surface -- keep it (DBNET-3)

Req 1 removes the **EMC visual** eyebrow only. `aggregate-project-charts.ts` emits its **own** "Own items" leaf row (`id: area:{id}:own`) for any container that **also directly owns rows**, so a mixed node's own money is surfaced exactly once and not merged into a child rollup. The `rows.push` block is at `aggregate-project-charts.ts:300-309`, the leaf `label: "Own items"` at `aggregate-project-charts.ts:301`, and the explanatory comment ("a container that ALSO directly owns rows...") at `aggregate-project-charts.ts:296`. This is **money-attribution correctness** for the charts surface, asserted by `project-charts-aggregation.test.ts`: the leaf-label assertion is at `project-charts-aggregation.test.ts:244` and the `container == sum-of-leaves == series total` invariant (own rows NOT dropped and NOT merged into a child) at `project-charts-aggregation.test.ts:249-260`. It shares only the literal string "Own items" with the EMC label.

```ts
// aggregate-project-charts.ts:300-309 (comment at :296, label at :301) -- DO NOT delete with the EMC label
if (own) {
  rows.push({
    id: `area:${child.id}:own`,
    label: "Own items",
    total: own.total,
    ...
  });
}
```

**Scope Req 1 to `branch.tsx` only.** Leave the charts leaf (`aggregate-project-charts.ts:300-309`) untouched and `project-charts-aggregation.test.ts:244, 249-260` green. (Note: per memory the `get_project_chart_buckets` RPC is not yet applied to hosted, so charts currently aggregate JS-side from the full client payload -- the leaf logic runs in `aggregate-project-charts.ts` regardless of that RPC.) Cross-ref [07-BLAST-RADIUS-AND-RISK](07-BLAST-RADIUS-AND-RISK.md).

### 6.4 Summary table

| Requirement | Schema change? | RPC change? | Network change? | DB-adjacent dependency |
|---|---|---|---|---|
| Req 1 -- remove "Own items" eyebrow | No | No | No | Charts leaf must stay (DBNET-3); update `estimate-mixed-content.test.tsx` only |
| Req 2 -- spacing/rhythm | No | No | No | None |
| Req 3 -- caret on rows-only nodes | No | No | No | **Depends on [DBNET-1]:** lift client gate (`:1649`) **and** land P6 relax RPC migration before any non-prod env does mixed-node inserts |

---

## 7. Open decisions surfaced (DB/network)

1. **[DBNET-1, blocker] Land the P6 relax SQL as a committed migration.** Drop the `kind = 'area'` guard in `insert_estimate_row_item_with_history` (`20260524050746:344-352`) and the `kind = 'group'` guards in `insert_estimate_subtree_into_estimate` (`20260613134852:87`) and `insert_estimate_template_into_estimate` (`20260612094734:824`), replacing each with the existing same-estimate/orphan existence check, so a clean apply matches prod. **This must precede Req 3 shipping to any non-prod environment.**
2. **Confirm hosted RPC bodies vs migrations (Phase-D PRE-STEP D0; gates D1 + D2 + D3).** An owner-authed Supabase MCP `pg_get_functiondef` for the three insert RPCs converts the current-state record plus committed-SQL drift into a verified implementation fact. Run this as **D0** before D1/D2/D3 of Phase D. See [09-OPEN-DECISIONS](09-OPEN-DECISIONS.md) (OD-9).
3. **Collapse-state persistence (product decision, not a DB blocker).** Collapse state is in-memory only (`EstimateSheetContent.tsx:992`) and lost on reload. If persisted collapse is desired, back it with `localStorage` keyed by `estimateId + tabId` (client-only, **no DB column**). Otherwise document the ephemerality as intended.
4. **Per-keystroke RPC + audit-row volume.** No debounce; every committed cell value is one `update_*` RPC + one `estimate_sheet_events` row (`use-estimate-row-mutations.ts:291-301`). If this is a concern at scale, debounce numeric commits or coalesce within the per-row queue. Out of scope for Req 1/2/3.
5. **Cold tab-switch waterfall.** No prefetch + nodes-then-rows serialized fetch (`estimate-repository.ts:186-216`). Optional: prefetch adjacent tabs or collapse to a single round trip.

---

## Anchors index (verified this session)

| Claim | Anchor |
|---|---|
| Tab RLS (read/write/admin), grants | `supabase/migrations/20260612094734_estimate_tabs_foundation.sql:39-49` |
| Template RPC `kind='group'` parent gate | `supabase/migrations/20260612094734_estimate_tabs_foundation.sql:819-828` |
| Committed insert-row RPC still `kind='area'` | `supabase/migrations/20260524050746_add_estimate_row_contingency_percentage.sql:344-352` |
| row_revision conflict (P0001) + bump | `supabase/migrations/20260524050746_add_estimate_row_contingency_percentage.sql:489-497, 519` |
| P5: two-kind block removed | `supabase/migrations/20260614003639_unify_estimate_node_kinds.sql:74-76` |
| P5: row-item validator relaxed | `supabase/migrations/20260614003639_unify_estimate_node_kinds.sql:78-89` |
| Subtree RPC `kind='group'` parent gate | `supabase/migrations/20260613134852_insert_estimate_subtree_rpc.sql:80-91` |
| Query keys + staleTime | `src/hooks/use-estimate-query.ts:10-16, 47, 108, 161` |
| `setTree`/revision/`restore` toolkit | `src/hooks/use-estimate-query.ts:110-142` |
| `refetchType: "none"` row invalidation | `src/hooks/use-estimate-row-mutations.ts:144-145, 150, 205-206, 254-255, 266` |
| update reconcile (toServerRowPatch) | `src/hooks/use-estimate-row-mutations.ts:247-256` |
| detach optimistic + reconcile | `src/hooks/use-estimate-row-mutations.ts:171-218` |
| per-row serialized queue (no debounce) | `src/hooks/use-estimate-row-mutations.ts:291-301` |
| `saveState` cosmetic + dirty-skip guard | `src/components/workshop/EstimateSheetContent.tsx:1588-1597`; `use-estimate-row-mutations.ts:106-108` |
| client gate `kind !== "area"` (Req 3 enabler) | `src/components/workshop/EstimateSheetContent.tsx:1649` |
| server action passes ANY node (P6 comment) | `src/lib/estimates/actions.ts:2500-2510, 2531-2534` |
| client-generated row UUID honored by RPC | `src/lib/estimates/actions.ts:2529` |
| collapse state client-only (`useState`) | `src/components/workshop/EstimateSheetContent.tsx:992` |
| nodes-then-rows tab-tree waterfall | `src/lib/repositories/estimate-repository.ts:186-216` |
| legacy parallel full-estimate read | `src/lib/repositories/estimate-repository.ts:161-172` |
| full cost payload to browser | `src/lib/repositories/estimate-repository.ts:45, 160, 187` |
| Component is a row sub-state (no table) | `src/lib/repositories/estimate-repository.ts:71-92` |
| charts "Own items" leaf (keep) -- `rows.push` block | `src/lib/project-charts/aggregate-project-charts.ts:300-309` (label at `:301`, comment at `:296`) |
| charts leaf test: label + sum-of-leaves invariant | `tests/vitest/project-charts-aggregation.test.ts:244, 249-260` |
