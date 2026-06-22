# 10 — Phase 4: Query / Server-Action / DTO Standardization + Select Discipline

> **Status:** Plan. Authoritative inputs: `_research/_SYNTHESIS.md` (contract §1 Data/Supabase + state, §3 track 5), `04_TARGET_ARCHITECTURE.md` (§3 action contracts, §4 query/cache, §9 projection/DTO), `01_CODEBASE_AUDIT.md` (A-22…A-28), `02_PATTERN_INVENTORY.md` (PAT-09…PAT-12, PAT-23), dossiers R5 (primary) + R2 (cache reconciliation).
>
> **Scope of this phase:** the *application-side* data discipline — query keys, server-action return shapes, read DTOs, `.select` column discipline, cache reconciliation idioms, and `React cache()`/Next-cache placement. The **DB-side** work (FK indexes, RPC authoring, RLS proof) is `14_PHASE_8_SUPABASE_DB_PLAN.md`; this file cross-references it but applies no migrations.
>
> **Hard constraints (contract §4):** planning only; no `src/**`, `tests/**`, `scripts/**`, `supabase/**`, or config changes in this document. No migrations applied. New helpers/scripts are *proposals* marked "to be added in Phase N."
>
> **Conventions (contract §4):** Priority `P0–P3`, Risk `Low/Medium/High/Critical`, evidence `path:line — observation`. Decision IDs `D-NN`, Risk IDs `RISK-NN`, Open-question IDs `Q-NN`.

---

## 0. Phase intent and dependency position

Phase 4 lands the **data/cache contracts** that the Phase 5 optimistic adapter (`11_…`) and the Phase 8 DB pass (`14_…`) build on. It depends on Phase 1 (`07_…`) having shipped the three foundation primitives:

- the unified **query-key factory** (`src/lib/query/keys.ts`),
- the **`patchAndMarkStale`** helper (`src/lib/query/patch-and-mark-stale.ts`),
- the **structural-hash signature** kernel.

Phase 4 *adopts* those primitives across the data layer and *adds* the read-DTO and `.select` disciplines. It is mostly mechanical, repo-local, and individually verifiable — the bulk is low/medium risk, with two medium-high items (component-library column surgery, gated on the Lite-vs-full open question `Q-E`).

**Early-win note (contract §2):** the `.select("*")` → explicit-columns swaps and the chart-RPC cutover have DB-side dependencies and are coordinated with Phase 8; the pure application-side discipline (key factory adoption, `patchAndMarkStale` adoption, action-envelope adoption) has no DB dependency and may proceed as soon as Phase 1 lands.

---

## 1. Query-key convention (unified factory) — **P1 / Risk: Medium**

**Resolves:** PAT-10, contract §1 state (5 key conventions, `tabTree`/`areaTree` branch ×14), `04` §4.1.

### 1.1 Current state (PINNED)
Five separate key conventions coexist (R2):
- `src/hooks/use-estimate-query.ts:10-16` — `estimateQueryKeys` factory (`detail`/`tabs`/`tabTree`/`areaTree`; `areaTree` flagged **legacy** at `:14`).
- `src/lib/favorites/query-keys.ts:1-5` — `favoritesQueryKeys` clean nested factory (**template**).
- `src/features/notifications/hooks/useNotificationsQuery.ts:19-24` — `notificationQueryKeys` (clean).
- `src/lib/component-library/query-keys.ts:7-47` — bare `as const` arrays + standalone builder fns.
- `src/hooks/use-project-collaboration-query.ts:16-18` — inline standalone fn.
- Inline ad-hoc: `EstimateSheetContent.tsx:1181-1183` (`lazyLibraryQueryKey`).
- `estimateTabId ? tabTree : areaTree` ternary replicated ~14× (`use-estimate-row-mutations.ts:204,212,229,278,303,313,328,353,383,394`).

### 1.2 Target convention (from `04` §4.1)
One nested-factory module `src/lib/query/keys.ts` (delivered by Phase 1). The estimate factory **folds the branch** into a single resolver:

```ts
estimate.tree(id, tabId?)        // tabId ? ["estimate",id,"tabTree",tabId] : ["estimate",id,"areaTree"]
estimate.treeRevision(id, tabId?) // [...tree(id,tabId), "revision"]
```

### 1.3 Phase 4 work
1. **Re-point every call site** to `queryKeys.*`. The ~14 `tabTree/areaTree` ternaries become `queryKeys.estimate.tree(estimateId, tabId)` calls — the branch lives in one place.
2. **Retire the inline `revision` sibling-key** (`use-estimate-query.ts:40,101`) in favor of `estimate.treeRevision`.
3. **Migrate the component-library bare-const keys** (`query-keys.ts:7-47`) and the inline `lazyLibraryQueryKey` (`EstimateSheetContent.tsx:1181-1183`) onto `queryKeys.componentLibrary.*`.
4. **`areaTree` retirement is gated on `Q-B`** (is any non-tab estimate still load-bearing?). Until resolved, the resolver keeps both arms; call sites stop hand-branching either way. Do **not** delete the `areaTree` arm in Phase 4 — record the decision and defer.

### 1.4 Validation
- `bun run type-check` — key-shape mismatches surface as type errors.
- `bun run test:dom` — row-mutation tests (`use-estimate-row-mutations`) must still hit the right cache after each migrated site (invalidation reaches the same key).
- **Equivalence check:** for each migrated site, the produced key array must be `===`-shaped to the pre-migration literal (snapshot test of resolver output covering `tabId` present/absent).
- Cross-ref `Q-B` (areaTree), `D-NN` (record areaTree-retained decision).

---

## 2. Server-action return-shape convention (`ActionResult<T>`) — **P1 / Risk: Medium**

**Resolves:** `04` §3, R5 ("no action returns `.select("*")` blobs except via flagged repos"), feeds Phase 5 adapter.

### 2.1 Current state (PINNED)
23 `"use server"` files (R5). Mutations are mostly thin RPC wrappers (good) but **return shapes vary** — some return the RPC row, some `void`, some a domain object — so each optimistic flow reconciles differently (R2: 5 rollback mechanisms, partly because there is no common envelope).

### 2.2 Target convention (from `04` §3)
One discriminated envelope, new home `src/lib/server/action-result.ts` (Phase 4 introduces the type; Phase 5 consumes it in the adapter):

```ts
type ActionResult<T> =
  | { ok: true; data: T; reconcile?: ReconcilePatch }
  | { ok: false; error: ActionError };  // code: FORBIDDEN|CONFLICT|NOT_FOUND|VALIDATION|SCHEMA_MISSING|UNKNOWN
```

### 2.3 Phase 4 work
1. **Introduce the type module** (`action-result.ts`) — type-only, plus small `ok()` / `err()` constructors.
2. **Wrap mutation actions** to return `ActionResult<Row>` with a `ReconcilePatch` carrying `serverId` + `revision` + canonical `fields`. This is **additive** — the underlying `*_with_history` RPC contracts (R5) are untouched; only the action's *return value* is normalized.
3. **Formalize `SCHEMA_MISSING`** — the existing `isEstimateTabsSchemaMissing` fail-open edge (decisions.md) becomes the `SCHEMA_MISSING` code; default is **fail-closed**, fail-open only where explicitly probed (`RISK-05` security adjacency — do not widen the fail-open surface).
4. **Read actions return DTOs (§4), never raw `.select("*")`.**

### 2.3a Authz-preservation checklist (per wrapped action — `RISK-21`, `22` §authz)
Wrapping an action in `ActionResult<T>` must **never** drop or short-circuit an interior authz check. Per wrapped action:
- [ ] The authz check (`can_edit_estimate` / `getCurrentUserContext()` / membership/role gate) sits **BEFORE any mutation** — never after, never skipped because the happy path now returns an envelope.
- [ ] A failed authz check returns `err({ code: "FORBIDDEN" })` — **not** a silent `ok()` with an empty/partial payload (the envelope makes a silent-success regression easy to introduce; `RISK-21`).
- [ ] The `ok()` path is reached **only** after every gate passes.
- [ ] **Per-wrapped-action test (required):** a no-session / wrong-role call returns `{ ok: false, error: { code: "FORBIDDEN" } }` and performs no write. This is the FORBIDDEN-path oracle Phase 5's optimistic rollback consumes.
- Reference `22_SECURITY_AND_RLS_THREAT_PLAN.md` (`ActionResult<T>` authz-preservation, Phase 4) and the new gate **`prove:action-authz`** (new, Phase 4) that runs the no-session/wrong-role assertion across every wrapped action.

### 2.4 Constraint (MEMORY — `04` R-5)
A `"use server"` file exports **only async functions**. `tsc` + Vitest miss a sync export; only `next build` catches it. **Every actions file edited in this phase must be followed by `bun run build`** before the change is considered green. Record this as a mandatory step in the execution prompt.

### 2.5 Validation
- `bun run type-check` + **`bun run build`** (the sync-export trap).
- Phase 5 adapter unit tests consume the envelope (forward dependency — note in handoff).
- Per-action: assert `ok:true` carries the server id/revision the optimistic flow needs to reconcile.

---

## 3. Read DTO convention (`.select` column discipline) — **P1 / Risk: Medium**

**Resolves:** PAT-23, A-22 / A-25, contract §1 data, `04` §9.1.

### 3.1 Reference patterns to generalize (A-28 — do **not** rebuild)
- `src/lib/publication/public-repository.ts:85-111` — `cache()` + **split column sets** `ACCESS_LOOKUP_COLUMNS` / `SNAPSHOT_LOOKUP_COLUMNS` (`:96-97`) so the heavy `snapshot_json` blob is read **only** when the consumer needs it. **This is the canonical model.**
- `workspace-repository.ts:1620-1683` `listProjectEstimates` — explicit `ESTIMATE_LIST_COLUMNS` (`:1635`) + `project_estimate_list_summaries` RPC.
- `project-charts-repository.ts:15-20` — limit-with-overflow discipline.

### 3.2 Target convention
Every read crossing the server→client boundary returns an **explicit-column DTO**:
1. **Named column-set constants** per table (the `ESTIMATE_LIST_COLUMNS` precedent), colocated with the repository.
2. **Split heavy-blob column sets** (the publication split): a "list/summary" set without large JSON, and a "detail" set that adds `snapshot_json` / `source_snapshot` / `metadata` — selected only when the consuming view renders them.
3. **DTO types are frozen interfaces** (the `ProjectEstimateListRow` precedent, decisions.md D8) so the Phase 5 optimistic adapter reconciles against a stable shape.

> **Phase-8 column-set coordination (M2 — back-pointer):** the named column-set constants and the explicit-`select` / DTO law defined here are the *application-side* half of a paired contract. The *DB-side* half — which columns the Phase-8 RPCs (`project_estimate_list_summaries`, `workspace_homebase_summary`, `get_project_chart_buckets`) must project so these DTO sets remain a clean superset — is coordinated in `14_PHASE_8_SUPABASE_DB_PLAN.md` (column-set coordination / DTO law). The two sections **cite each other**: change a column set in one and the paired section in the other must move with it.

### 3.3 Phase 4 work (the `.select("*")` replacements)
| Site | `path:line` | Action | Risk | Gate |
|---|---|---|---|---|
| Component library load (8 tables) | `component-library-repository.ts:530-746` | §4 below (its own item; gated on `Q-E`) | High | Q-E first |
| `projects` sidebar/list | `workspace-repository.ts:837, 908` | Replace `.select("*")` with `PROJECT_LIST_COLUMNS` set | Medium | DOM + equivalence |
| `getCurrentWorkspaceProject` | `workspace-repository.ts:1356, 1367` | Replace `.select("*")` (lower severity — `cache()`-wrapped per request) with explicit set | Low | DOM |
| Estimate templates load | `component-library-repository.ts:757, 771, 776` | Explicit columns; `source_snapshot` only in detail set | Medium | DOM |
| Estimate-tree row items | `ESTIMATE_TREE_ROW_ITEM_COLUMNS` `workspace-repository.ts:1734` | **Verify `source_snapshot`+`metadata` consumption with R4 (Q-G) before trimming** | Medium | Q-G first |

### 3.4 Critical caveat (A-22 / A-25 unsafe move)
**Do not trim columns the sheet relies on.** `ESTIMATE_TREE_ROW_ITEM_COLUMNS` (`:1734`) carries `source_snapshot` + `metadata` per row; R5/R4 seam (`Q-G`) must confirm whether the sheet renders all of it or only for linked rows **before** moving those into a detail-only set. Trimming a load-bearing column is a correctness regression, not a perf win.

### 3.4a Consumer-audit must cover THREE consumer classes (network review GAP-4)
Before trimming any `.select("*")` to an explicit set, the DTO-superset audit must enumerate **all three** consumer classes — not just renderers:
- **(a) Rendered fields** — columns the view actually paints (the obvious set).
- **(b) `ReconcilePatch` reconcile consumers** — columns the optimistic reconcile (§5/§6, Phase 5 adapter) diffs the server row against. Trimming a column the reconcile compares produces an **intermittent rollback bug** (the diff sees a "changed" field that was simply never selected) — **invisible to DOM tests** because the first paint renders fine.
- **(c) Export-model inputs** — columns consumed by proposal/export model builders (`lib/proposal-export/`, publication snapshot), which read rows outside the render path.
A column is safe to trim only if it is absent from **all three**. The equivalence test (§3.5) snapshots the union of (a)+(b)+(c). Cross-ref `23_NETWORK_AND_DATA_FLOW_PLAN.md` §6.

### 3.5 Validation
- **Explicit-column equivalence test:** for each swapped read, assert the DTO shape contains exactly the fields the consumer reads — across all three classes in §3.4a (snapshot the consumed-field set first, then prove the column list is a superset).
- `bun run test:dom` — the relevant list/library/sheet DOM tests still render.
- Query-payload-size budget (Phase 9, to be added) re-measures the trimmed payload.

---

## 4. Component-library select discipline + `.limit()` — **P1 / Risk: High (the headline item)**

**Resolves:** A-22 (the single largest blast-radius data finding), PAT-23, contract §1 `[HIGH]`.

### 4.1 Current state (PINNED)
`loadCurrentWorkspaceComponentRowsLibrary` (`component-library-repository.ts:530-746`):
- `.select("*")` on **8 tables**: `:547` category_nodes, `:562` cost_library_items, `:606` price_options, `:614` variant_cost_entries, `:634` versions, `:640` price_history, `:646` state_history, `:652` variant_attachments.
- **No `.limit()` on `cost_library_items` (`:562-566`)** — a large workspace loads the entire library.
- **No per-item limit on audit/history (`:630-656`)** — versions/price_history/state_history grow unbounded per item.
- Queries are parallelized (`Promise.all` `:546/602/630`) and grouped client-side via Maps (`:671-683`) — **N+1-free but volume-unbounded.**
- Lite variant (`:1169`, `includeDetailGraph:false`) skips the audit tables but still loads price_options + cost_entries; full variant (`:1146`) loads everything.

### 4.2 Gating open question (`Q-E`) — resolve FIRST
**Does production call `getCurrentWorkspaceComponentLibraryLite` (`:1169`) or the full `getCurrentWorkspaceComponentLibrary` (`:1146`)?** This decides whether the unbounded full graph is on the hot path. **Safe first move (A-22):** trace callers before any column surgery. If prod uses Lite, severity drops to MED and the audit-table limits become a lower-priority hardening; if prod uses full, this is the top data item.

### 4.3 Phase 4 work (after `Q-E`)
1. **Explicit column lists** on all 8 tables (named constants per §3).
2. **`.limit(COMPONENT_LIBRARY_ITEM_LIMIT)`** on `cost_library_items` (`:562-566`) with **N+1 overflow detection** (the `project-charts-repository.ts:15-20` `.limit(N+1)` pattern) so the UI can flag a truncated library rather than silently dropping rows.
3. **Per-item `.limit()`** on versions/price_history/state_history (`:630-656`) — bounded history depth per item.
4. **Heavy-blob split:** keep `source_snapshot`/large JSON in a detail-only set fetched on item inspect, not in the list load.

### 4.4 Risk + validation
- **Risk: High** — this is a hot read for library-heavy workspaces and a behavior change (truncation). The overflow-detection flag is mandatory so truncation is visible, not silent.
- **Validation:** library DOM tests (render with truncated set); `build-performance-query-inventory.ts` (orphan today — wire in Phase 9) re-measures the payload; equivalence test per §3.5.
- Cross-ref `Q-E`, A-22, `RISK-NN` (silent-truncation risk).

---

## 5. Mutation response convention — **P1 / Risk: Low**

**Resolves:** `04` §3 (ReconcilePatch), feeds Phase 5.

Mutation actions return `ActionResult<Row>` (§2) whose `reconcile: ReconcilePatch` carries:
- `tempId?` — the optimistic placeholder to replace,
- `serverId?` — the persisted id (swap the temp),
- `revision?` — for the revision-guarded estimate-tree flow (`use-estimate-query.ts:70-75`),
- `fields?` — canonical server-computed corrections (codes, totals, snapshots).

This lets the Phase 5 adapter swap a temp-id → server-id **without a refetch** (the dominant `setQueryData` reconcile path, §6). Phase 4 only fixes the *shape*; Phase 5 wires it into the adapter's `reconcile`.

### 5.1 Per-operation scoped-delta DTOs (replace full-tree refetch — Bible §5.4)

Today the estimate-tree mutations re-fetch the **entire tree** after a scalar edit (the `tabTree/areaTree` invalidate-then-refetch path). The convention replaces that with a **scoped delta**: each mutation returns only the rows/nodes it actually touched, mapped onto the generic `ReconcilePatch` (§2/§5) but with per-operation field names so each mutation's authoritative return shape is concrete. Per Bible §5.4:

| Mutation | Replaces (current) | Authoritative scoped return |
|---|---|---|
| Rename node | full tree | `{ node, updatedAt, revision }` |
| Update row quantity/cost/text | full tree | `{ row, affectedNodeIds, revision }` |
| Insert row | full tree | `{ row, siblingOrderPatch?, affectedNodeIds, revision }` |
| Delete row | full tree | `{ deletedRowId, affectedNodeIds, revision }` |
| Move row | full tree | `{ movedRow, sourceNodeId, targetNodeId, siblingOrderPatch, revision }` |
| Move node | full tree / RPC | `{ movedNode, affectedParentIds, orderPatch, revision }` |

**Mapping onto `ReconcilePatch`:** each per-op shape is a concrete instance of the generic envelope (§5) — the entity payload (`node`/`row`/`movedRow`/`movedNode`/`deletedRowId`) is `ReconcilePatch.fields`, `revision` is `ReconcilePatch.revision`, and the scope hints (`affectedNodeIds` / `affectedParentIds` / `orderPatch` / `siblingOrderPatch`) are the **`ReconcilePatch.fields` scope payload** that drives the **scoped totals recompute + cache reconciliation**: the adapter recomputes rollups only for the named node/parent ids and re-orders only the named siblings, instead of refetching and re-deriving the whole tree. `updatedAt`/`revision` are the stamps the revision-guarded flow (`use-estimate-query.ts:70-75`) compares.

**The rule (Bible §5.4):** full-tree refetch remains acceptable **ONLY** after a rare structural op (e.g. a large subtree move/import) **or after a conflict** (revision-guard mismatch → reconcile-by-refetch). It is **never** the default for a scalar row edit (quantity/cost/text) — those must reconcile from the scoped delta above. See the §19.4 `UpdateEstimateRowResult` example for the canonical concrete return type, and Bible §5.5 for the column discipline these returns require: an **explicit `select`** of exactly the scoped columns (never `.select("*")`, §3) plus a **revision stamp** on every mutation return so the guard and cache reconcile have an authoritative version to compare.

#### 5.1a Totals-correctness gate — scope-hint completeness (SEV-3 / `RISK-25`)

The per-op DTOs above return `affectedNodeIds` / `affectedParentIds` and the client recomputes rollups **only** for those ids. This makes the return shape a **trust boundary**: if the server's scope hint is *too narrow* (omits a node whose rollup actually changed), the client recomputes a subtree that is **self-consistently wrong** — internally coherent, byte-stable, and therefore **invisible** to the sheet's own byte-equal totals gate (doc 09 gate #3), which compares the cache against itself, not against ground truth. The result is **silently shipped stale customer totals** (`RISK-25`).

**Safety requirement (mandatory, per-op test matrix):** for **each** per-op mutation, the test matrix MUST assert that recomputing the totals Map **FROM the returned `affectedNodeIds`** (the scoped recompute the client actually runs) is **BYTE-EQUAL** to a **full-tree recompute over the post-mutation cache** (the ground-truth oracle). A mismatch proves the server's `affectedNodeIds`/`affectedParentIds` scope hint is **incomplete** — the bug doc 09 gate #3 structurally cannot catch.

- **Why this gate and not doc 09 gate #3:** doc 09 gate #3 proves *the cache is internally consistent after a recompute*; it cannot prove *the recompute covered every node that changed*. Only a full-tree recompute over the same post-mutation cache establishes the complete set, so this gate is the **completeness** oracle that complements doc 09's **consistency** oracle.
- **Fallback unchanged:** a too-narrow scope hint is a server contract defect, not a runtime-recoverable state — but **full-tree refetch remains the fallback on conflict (revision-guard mismatch) and on structural ops** per the rule above. The correctness gate here runs in the **per-op test matrix**, not on the hot path, so it adds no per-edit cost while still proving the scope hint complete before the scoped-delta path is trusted in production.
- Cross-ref `RISK-25`, `28_…` (safety-net invariant register — record this gate as a tracked invariant), and **doc 09 gate #3** (the consistency gate this completeness gate complements).

**Validation:** type-check; the reconcile shape matches what the estimate row-mutation reconcile already does manually (`use-estimate-row-mutations.ts:382-398`) so existing tests are the oracle; plus the §5.1a scope-hint completeness gate (byte-equal scoped-vs-full-tree totals recompute) in the per-op test matrix.

---

## 6. Cache reconciliation convention (invalidate vs setQueryData; `patchAndMarkStale`) — **P1 / Risk: Low**

**Resolves:** PAT-11, contract §1 (`patchAndMarkStale` ×22), `04` §4.2–4.3, R2 candidate-kernel 3.

### 6.1 Current state (PINNED)
The `setQueryData` + `invalidateQueries({refetchType:"none"})` idiom appears at **22 `refetchType` sites** (R2): `use-estimate-row-mutations.ts:212,213,253,254,308,309,388,389,401`, `useNotificationsQuery.ts:93-105`, spread across the 9 `setQueryData` files. `invalidateQueries` has 31 call sites, 22 carrying the `refetchType` qualifier.

### 6.2 Target helper (from `04` §4.2, delivered by Phase 1)
```ts
patchAndMarkStale<T>(client, key, updater): { previous: T | undefined }
// getQueryData(snapshot) → setQueryData(updater) → invalidate({refetchType:"none"}); returns snapshot for rollback
```

### 6.3 Decision rules (the convention)
- **`setQueryData` via `patchAndMarkStale`** — for optimistic writes and server reconciles where the client already holds the canonical shape. **The dominant path.** Returns the snapshot the Phase 5 adapter uses for rollback.
- **`invalidateQueries({refetchType:"active"})`** — **only** when the server computed something the client cannot derive (cross-entity rollups, permission changes) and a real refetch is required.
- **Never double-fetch** — a `cache()`-wrapped server read feeding a client query must not also be `invalidate`-refetched on mount (R5 open question `Q-H` — audit overlap in this phase; see §8).

### 6.4 Phase 4 work
Migrate the 22 `refetchType:"none"` sites to `patchAndMarkStale`. The helper returns the rollback snapshot, which **eliminates the per-flow snapshot boilerplate** and feeds Phase 5's single rollback contract. Sites that genuinely need an active refetch are re-labeled `refetchType:"active"` with a one-line justification.

### 6.5 Validation
- Unit-test the helper (Phase 1) — cache state + stale flag unchanged.
- At each migrated site: assert the post-call cache value and stale flag match the pre-migration behavior (the 22 sites already have row-mutation/notification DOM tests).
- Cross-ref `Q-H` (cache()/query overlap, §8), PAT-11.

---

## 7. When to use `React cache()` / Next cache — **P2 / Risk: Low**

**Resolves:** contract §1 (`cache()` reference pattern), `04` §1.2 / §9, generalize `publication/public-repository.ts`.

### 7.1 Reference pattern (A-28 — generalize, don't rebuild)
`public-repository.ts` is best-in-class: `cache()` on the service client (`:85`), access-row reader (`:99`), snapshot reader (`:111`) — the comment (`:87-95`) documents collapsing 5+ redundant `token_hash` SELECTs into 1. Other strong `cache()` users: `ensureDefaultWorkspace` (`workspace-repository.ts:760`), `getCurrentUserContext` (`auth/session.ts:31`), `listMainSidebarFavoriteProjects` (`:1263`), `getCurrentWorkspaceProject` (`:1347`), `getCachedProjectMembers` (`:1380`).

### 7.2 The convention (when to reach for `cache()`)
Wrap a server read in `React cache()` when **the same input is read more than once within a single request** (layout + page + nested segment), to collapse duplicate round-trips. Criteria:
- Per-request idempotent (auth/session, workspace bootstrap, project members, current project).
- Read by multiple RSC segments in one render.
- **Not** a mutation; **not** request-spanning (use TanStack Query for cross-request client caching, Next route cache for route-level).

### 7.3 Phase 4 work
- **Audit for missing `cache()`**: any repository read invoked by both a `layout.tsx` and its child `page.tsx` that is not yet `cache()`-wrapped is a candidate (mirrors the `getCachedProjectMembers` motivation).
- **Audit for `cache()`↔TanStack double-fetch** (`Q-H`, §8): where a `cache()` server read feeds an island that *also* mounts a TanStack query for the same data, ensure the island hydrates from server-projected props (`setQueryData`-from-props, `EstimateWorkspaceClient.tsx:124-129`) rather than refetching (`04` §1.2 / §4.3).
- **Next route-cache (`experimental.staleTimes`)** at `next.config.ts:64-67` stays as-is (intentional pairing with warm TanStack caches, `04` §1.5) — **config change is out of scope for this doc.**

### 7.4 Validation
- Query-count budget (Phase 9, to be added) confirms duplicate reads collapse to one.
- No behavior change expected; DOM tests unaffected.

---

## 8. Cache reconciliation ↔ server-cache overlap audit (`Q-H`) — **P2 / Risk: Low**

**Resolves:** R5 open question (cache reconciliation seam with R2).

Produce, in this phase, a small inventory: **which server reads are `cache()`-wrapped AND also fronted by a TanStack Query key**, where a double-fetch (server render + client refetch on mount) can occur. For each, decide:
1. **Hydrate-from-props** (preferred) — server projects the DTO, island seeds the cache via `setQueryData`, no client fetch on first paint (`04` §1.2).
2. **Client-only** — drop the server read if the island is the sole consumer.

This is a read-only audit + decision in Phase 4; the fixes are mechanical (move a `setQueryData`-from-props seed) and low-risk. Record findings against `Q-H`.

---

## 9. RPC / index recommendations (cross-ref Phase 8) — **pointer**

The following are **planned in `14_PHASE_8_SUPABASE_DB_PLAN.md`** (no migrations here); Phase 4's role is to shape the *application* reads so the Phase 8 RPCs/indexes slot in cleanly:

- **`get_project_chart_buckets`** (A-24) — push the JS aggregation (`project-charts-repository.ts:101-128`) into SQL. Phase 4 keeps the repository's limit-with-overflow contract and the buckets-only payload shape so the cutover is a drop-in.
- **`workspace_homebase_summary`** / extra `Promise.all` wave (A-23) — collapse the serial tail (`workspace-repository.ts:1126-1222`). Phase 4 keeps the explicit-column DTOs that the summary RPC would return.
- **`estimate_activity_node_scope`** recursive-CTE (A-25) — replace the JS BFS full-node fetch (`actions.ts:670-719`). Phase 4 ensures the action returns the scoped node-id DTO, not raw nodes.
- **Hot-path FK indexes** (A-27) — Phase 8; Phase 4 ensures the application reads filter on the indexed columns (`estimate_nodes.parent_id`, favorites, members, `notification_deliveries`).

See `14_…` §2–§3 for the index/RPC list with per-item risk + validation. For **query-count / payload-size budgets** and the **prefetch/hydration** strategy that gate these reads, see `23_NETWORK_AND_DATA_FLOW_PLAN.md`; for **RPC security** (cross-tenant denial, SECURITY model) see `22_SECURITY_AND_RLS_THREAT_PLAN.md`.

---

## 10. RLS performance checklist (initplan / `auth.uid()` wrapping) — **P2 / Risk: Low (verification)**

**Resolves:** A-28 (RLS-initplan remediation is active and good), contract §1 (`prove:rls-initplan`), `RISK-05` (RLS/security).

Phase 4 itself adds no policies, but any read added/edited here that touches RLS must satisfy this checklist (full DB pass is Phase 8 §5):

- [ ] **No new bare `auth.uid()` in a policy `USING`/`CHECK` clause** — wrap as `(select auth.uid())` so it is evaluated once (initplan), not per row. Current state (R5): 211 `auth.uid()` occurrences, 64 wrapped; most unwrapped ones live inside `SECURITY DEFINER` helper bodies (no per-row re-eval) — preserve that property.
- [ ] **Reuse the remediated helpers** (`is_workspace_member`, `current_project_access_rank`, `can_access_estimate` — migrations `…192344`, `…201302`, `…162000`) rather than inlining new `auth.uid()` predicates.
- [ ] **Run `bun run prove:rls-initplan`** after any RLS-adjacent change — the regression harness proves the rewrite changed no access decision.
- [ ] **Advisor security scan** (`get_advisors`) to confirm no new policy reintroduced a bare `auth.uid()` (open question `Q-I`, A-28).
- [ ] **`RISK-05`:** do not widen the `SCHEMA_MISSING` fail-open surface (§2.3) — fail closed by default.

**Validation:** `bun run prove:rls-initplan`; `get_advisors` (security) pass; `bun run prove:estimate-tabs-rls` / `prove:notification-rls` where those domains are touched.

---

## 11. Phase 4 work summary (priority-ordered)

| # | Item | Priority | Risk | Gate / dependency |
|---|---|---|---|---|
| 1 | Adopt unified query-key factory; fold tabTree/areaTree | P1 | Medium | Phase 1 factory; `Q-B` for areaTree retirement |
| 2 | `ActionResult<T>` envelope on mutation actions | P1 | Medium | `bun run build` after each actions file |
| 3 | Read-DTO column discipline (`projects`, templates, current-project) | P1 | Medium | equivalence tests; `Q-G` for tree row items |
| 4 | Component-library explicit columns + `.limit()` + overflow flag | P1 | **High** | **`Q-E` first** (Lite vs full) |
| 5 | Mutation `ReconcilePatch` response shape | P1 | Low | type-check; feeds Phase 5 |
| 6 | Adopt `patchAndMarkStale` at the 22 sites; invalidate-vs-set rules | P1 | Low | Phase 1 helper |
| 7 | `cache()` placement audit + generalize publication pattern | P2 | Low | query-count budget |
| 8 | `cache()`↔TanStack double-fetch overlap audit | P2 | Low | `Q-H` |
| 10 | RLS initplan checklist on any RLS-touching read | P2 | Low | `prove:rls-initplan`; `RISK-05` |

**Done-when (phase gate):** `bun run validate` green; `bun run build` green (sync-export trap); the migrated key sites pass row-mutation DOM tests; explicit-column equivalence tests pass; `Q-E`/`Q-B`/`Q-G`/`Q-H` resolved or explicitly deferred with a recorded decision; no DB migration applied (all DB items are Phase 8).
