# 07 — Phase 1: Canonical Indexes, Selectors & Performance Utilities (Detailed Plan)

> **Status:** Wave-2 plan-pack artifact (Writer W6). Authoritative inputs:
> `_research/_SYNTHESIS.md` (contract), `04_TARGET_ARCHITECTURE.md` (§4 query/cache,
> §6 tree kernel, §7 sheet, §11 instrumentation — the end-state these primitives
> serve), `01_CODEBASE_AUDIT.md`, `02_PATTERN_INVENTORY.md` (PAT-NN ids),
> dossiers `_research/R2-state.md` + `_research/R3-trees.md`. Conventions per
> contract §4: Priority `P0–P3`, Risk `Low/Medium/High/Critical`, evidence
> `path:line — observation`.
>
> **Scope discipline (the defining rule of this phase):** Phase 1 ships **pure,
> dependency-free, unit-tested primitives** and **wires NONE of them into hot
> paths.** Wiring is Phase 2 (tree kernel adoption), Phase 3 (sheet), Phase 4
> (query/cache), Phase 5 (optimistic). Phase 1 is "build the parts on the bench,
> prove each in isolation, leave the engine running on its old parts." Low risk by
> construction: a new pure module that nothing imports yet cannot regress
> behavior. Every step's gate is `bun run type-check` + the **new unit test for
> that primitive** + the **4 existing jsdom render-isolation gates stay green**
> (they prove we changed nothing in the hot path).
>
> **Hard constraint (contract §4):** planning only; this document creates no code.
> The TypeScript below is a **design target / interface sketch**, not committed
> code. New files name their intended home; new scripts/tests are flagged.

---

## 0. What Phase 1 delivers (and what it deliberately does not)

**Delivers — five low-risk primitive families** (all in `src/lib/**`, pure, no
React, no Supabase, no hot-path wiring):

1. **Structural-hash signature** — replaces the whole-tree `JSON.stringify`
   content signature (`getEstimateTreeContentSignature`,
   `estimate-tree-reorder.ts:181-220`). Feeds Phase 2/3.
2. **Index/map/set helpers** — `buildTreeIndex` core + Set/Map utilities that
   replace `string[]` + O(n) equality with O(1) `Set`/`Map`. Feeds Phase 2.
3. **`patchAndMarkStale` helper** — the `setQueryData` + `invalidate({refetchType:"none"})`
   idiom repeated at 22 sites (PAT-11; contract §1 state). Feeds Phase 4/5.
4. **Unified query-key factory** — folds the `tabTree`/`areaTree` branch
   (~14×) into one resolver; **defined here, full migration deferred to Phase 4.**
5. **Reusable render-probe / render-count harness** — generalizes
   `estimate-sheet-render-probe.ts` so Phase 9 can add tree/tabs/sidebar/charts
   gates (file 04 §11). Convention + factory only.

**Does NOT deliver:** any change to `EstimateSheetContent.tsx`,
`EstimateSheetTree.tsx`, the mutation hooks, the stores, or the existing query
keys. No call site is migrated. The fan-out sever (per-row subscription, file 04
§7.2), the tree-kernel adoption (file 04 §6.4), and the optimistic adapter (file
04 §8) are explicitly **later phases** that *consume* these primitives.

> **Why pure-first matters here (R3 reconciliation):** the `TreeIndex` is
> **derived** state, not store state (file 04 §6.3; R3 open question to R2). Phase
> 1 builds it as a pure function so Phase 2 can drop it into a memoized selector
> layer without touching Zustand/TanStack. Same for the signature and probes —
> they are leaf utilities with no upstream dependencies, which is what makes the
> slow-refactor safe.

---

## 1. Primitive A — Structural-hash signature (PAT-15 / contract §1 trees)

**Problem (pinned):** `getEstimateTreeContentSignature` (`estimate-tree-reorder.ts:181-220`,
verified) builds a nested array of **~19 fields × every row of the whole tree**
then `JSON.stringify`s it. Called **5×** in `EstimateSheetTree.tsx`
(`:300,301,411,418,440`) including two refs on the **initial render** and on each
incoming-nodes diff (R3 finding-3; R2 finding-2). O(rows × fields) serialization
in the reconcile path.

**Target (file 04 §6.1 item 7):** a cheap structural hash over only the fields
that matter, plus a separate already-cheap structure signature
(`getEstimateTreeStructureSignature:168-179` is fine — keep it; it only emits
`path:kind`).

### A.1 Interface sketch (design target — not committed)

```ts
// src/lib/tree/structural-hash.ts  (new, pure, no deps)

// Rolling/accumulating hash (e.g. FNV-1a or djb2 over field strings) —
// O(rows × selectedFields), no JSON.stringify, no intermediate nested arrays.
export function structuralHash<T>(
  roots: readonly T[],
  children: (n: T) => readonly T[] | undefined,
  fields: (n: T) => readonly (string | number | boolean | null | undefined)[],
): string;

// Convenience for the estimate domain: encodes only the fields the stale-badge
// + reconcile actually compare (today all 19; Phase 3 trims to the load-bearing
// subset once measured).
export function estimateContentHash(nodes: readonly EstimateTreeNode[]): string;
```

### A.2 Steps (bite-sized)
1. **A-S1** Write `structuralHash` + a generic hash function (FNV-1a). Pure.
   *Validate:* new `tests/unit/structural-hash.test.ts` **(propose)** — same
   tree ⇒ same hash; one field change ⇒ different hash; row reorder ⇒ different
   hash; empty tree ⇒ stable; hostile/huge tree ⇒ no `JSON.stringify` blowup.
   `bun run type-check`.
2. **A-S2** Add `estimateContentHash` adapter over `EstimateTreeNode` enumerating
   today's 19 fields (`:187-212`) so it is a **behavioral drop-in** for the
   eventual swap. *Validate:* a parity test asserting `estimateContentHash`
   distinguishes exactly the same node sets that `getEstimateTreeContentSignature`
   does (golden cases). **Do NOT replace the call sites** — that is Phase 2/3.
3. **A-S3** (planning note) Record in `17_DECISION_LOG.md` (D-0xx) that the field
   set may be trimmed to the load-bearing subset only after Phase 0/3 measures
   which fields the stale badge + reconcile actually read (open question to Phase 3).

**Risk:** Low (new pure module, zero call sites changed). **Constraint:** the
existing `estimate-sheet-memoization.test.tsx` gate (`proposalSignatureComputes === 0`
on keystroke) is untouched by Phase 1 — this primitive is the *future* engine for
Phase 3's signature-off-hot-path work (file 04 §7.4), not wired yet.

---

## 2. Primitive B — Tree index + Set/Map helpers (PAT-01 / contract §1 trees+state)

**Problem (pinned):** ≥8 independent `findNode` DFS finders, ≥5 descendant
collectors, ≥4 keep-ancestor filters, ≥3 cascade engines — same DFS over
different node types (R3 structural-sameness map; PAT-01). Separately, state uses
**arrays where Sets/Maps fit**: `expandedNodeIds` is `string[]` with O(n)
`areNodeIdsEqual` (`use-estimate-workspace-state.ts:105-108`), `selectedRowIds`/
`expandedNodeIds` arrays in `estimate-ui-store.ts` (R2 anti-pattern 4; contract §1).

**Target (file 04 §6.1):** the headless `buildTreeIndex` computed **once per tree
version**, replacing per-render/per-keystroke fresh DFS — but in Phase 1 it is
built as a **pure standalone function with no consumer.** Plus small Set/Map
utilities so later phases can swap arrays for O(1) structures.

### B.1 Interface sketch (design target — mirrors file 04 §6.1 / R3)

```ts
// src/lib/tree/tree-kernel.ts  (new canonical home — Phase 1 ships the INDEX only)

export interface TreeAdapter<T> {
  id: (n: T) => string;
  children: (n: T) => readonly T[] | undefined;
  withChildren?: (n: T, c: T[]) => T;   // reserved for Phase-2 ops (moveNode etc.)
}

export interface TreeIndex<T> {
  byId:          ReadonlyMap<string, T>;
  parentOf:      ReadonlyMap<string, string | null>;
  depthOf:       ReadonlyMap<string, number>;
  pathOf:        ReadonlyMap<string, readonly string[]>;   // ancestor ids
  find:          (id: string) => T | undefined;            // O(1) — replaces ≥8 DFS finders
  descendantsOf: (id: string) => ReadonlySet<string>;      // memoized — replaces ≥5 collectors
  ancestorsOf:   (id: string) => readonly string[];
  allIds:        () => readonly string[];
  folderIds:     () => ReadonlySet<string>;
  flattenVisible:(expanded: ReadonlySet<string>) => readonly FlatRow<T>[];
}
export function buildTreeIndex<T>(roots: readonly T[], a: TreeAdapter<T>): TreeIndex<T>;
```

**Phase-1 boundary:** ship `buildTreeIndex` + the read accessors only. The
**mutation ops** (`moveNode`/`removeNodes`/`mapNode`), `filterKeepingAncestors`,
cascade, and `rollup` (file 04 §6.1 items 3–6) are **Phase 2** — they need the
adapter contract this phase freezes, but adopting them touches hot paths.

### B.2 Set/Map utilities (design target)

```ts
// src/lib/collections/id-set.ts  (new, pure)
export function toggleInSet<T>(set: ReadonlySet<T>, v: T): Set<T>;   // immutable
export function setsEqual<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): boolean; // O(min) replaces O(n) areNodeIdsEqual
export function indexBy<T>(items: readonly T[], key: (t: T) => string): Map<string, T>;
```

### B.4 Structural-sharing / reference-stable Map helper (AR3 finding 2; retargeted per D-017 / §V2-FACTS) — design target

```ts
// src/lib/collections/structural-map.ts  (new, pure)
// Produces a NEW Map that COPIES FORWARD unchanged entries BY REFERENCE, so
// Object.is(prev.get(id), next.get(id)) holds for every untouched key. The repo
// has no immer/immutable; the Phase-3 memo guards (areEstimateSheetBranchPropsEqual,
// areEstimateRowItemsTablePropsEqual — §6) depend on this reference stability to
// bail out for untouched rows — but ONLY for OBJECT-valued surfaces.
export function withUpdatedEntry<K, V>(
  prev: ReadonlyMap<K, V>,
  key: K,
  next: V,
): Map<K, V>;   // copies prev's entries by reference, overwrites only `key`
```

**Retarget (D-017 / §V2-FACTS — OVERRIDES the earlier "totals Map" framing):** the
helper targets **OBJECT-valued surfaces only** — the `editableRows` per-row store
(values are `EditableRowValue` objects; the real object-identity check is
`prev.editableRows[item.id] !== next.editableRows[item.id]`, `branch.tsx:101`) and
any object-valued derived map on the sheet hot path. It is **NOT** needed for the
**number-valued totals Map**: the totals Map is `ReadonlyMap<string, number>`
(`EstimateSheetContent.tsx:521`) and the branch guard compares its entries with
`Object.is(prevTotal, nextTotal)` over **NUMBERS** (`branch.tsx:147`) → that is
**value-equality**, so a plain recompute that re-emits equal numbers does **not**
break the guard. Reference-identity preservation is irrelevant for primitives;
structural sharing buys nothing there. **Cross-ref D-017, RISK-16, Q-33.**

**Why this is a Phase-1 primitive (AR3 finding 2):** the per-row store reconcile in
Phase 3 (file 09 Step 4) and any object-valued derived map (file 04 §7.2/§7.3) must
emit a fresh Map on each edit **without** breaking the per-row memo guards — only
the touched key may change identity; every other entry must remain `Object.is`-equal
so untouched rows do not re-render. Because there is **no immer/immutable** in the
repo, this reference-stable copy is the seam the Phase-3 memo guards rely on for the
object case. **Cross-ref RISK-16.**

- **Pure, unit-tested.** *Validate:* `structural-map.test.ts` **(propose)** — for the
  **object-valued case**, a single-key update returns a new Map whose **untouched keys
  preserve reference identity** (`Object.is(prev.get(id), next.get(id)) === true` for
  every id ≠ the updated key), the updated key holds the new value, sizes match, and
  `prev` is not mutated. (No totals-Map / number-valued case — value-equality already
  satisfies that guard; see D-017.)

### B.5 Measurement gate — does any object-valued derived map need this helper? (Q-33)

Add a Phase-1 step **before** treating `withUpdatedEntry` as load-bearing: **confirm
by measurement** whether any **object-valued** derived map on the sheet hot path
actually depends on per-entry reference identity for a memo guard to short-circuit
(Q-33). The `editableRows` store (file 09 Step 4) is the known consumer. If the
measurement finds **no** object-valued derived map beyond the store that needs it,
the helper is **optional / deferred** — ship it only where a measured guard depends
on it. The number-valued totals Map is explicitly excluded (D-017): it needs no
helper at all. Record the finding (and the helper's optional/deferred status) in
`17_DECISION_LOG.md` under D-017 and carry Q-33 to `19_OPEN_QUESTIONS.md`.

> **Open question (AR3 finding 2):** if a no-new-dependency review prefers
> `immer` for this reference-stable copy-forward semantics over a hand-rolled
> helper, flag it as an option — carry to `19_OPEN_QUESTIONS.md` (see §8).

### B.3 Steps
1. **B-S1** Write `buildTreeIndex` (pure DFS once → fills `byId`/`parentOf`/
   `depthOf`/`pathOf`; memoized `descendantsOf`). *Validate:* new
   `tests/unit/tree-kernel.test.ts` **(propose)** — `find` is O(1) and correct;
   `descendantsOf`/`ancestorsOf`/`pathOf` match a reference DFS for a deep (≥6
   level) tree; memoization returns the **same Set instance** on repeat calls;
   cyclic/duplicate-id input fails loudly. `bun run type-check`.
2. **B-S2** Write the Set/Map utilities. *Validate:* `id-set.test.ts`
   **(propose)** — `setsEqual` short-circuits on size, `toggleInSet` is immutable,
   `indexBy` last-wins on dup keys (documented).
3. **B-S3** Write `TreeAdapter` instances for the estimate node and one other
   family (e.g. library folder) as **examples only** (not wired) to prove the
   adapter contract generalizes (R3: the only variation is field names +
   stored-nested vs derived). *Validate:* adapter round-trips id/children for both.
4. **B-S4** (planning note) Record that **no consumer imports these yet**; Phase 2
   migrates `EstimateSheetTree.tsx`'s ~15 `findEstimateNode` DFS calls and the
   filter chain onto the shared index (file 04 §6.4 adoption order). Cross-ref
   Q-D (R3↔R4 seam): the single shared index is intended to serve both the sheet
   and the left tree — Phase 1 makes that possible, Phase 3 verifies it.

**Risk:** Low (pure, no consumers). The big win (kill per-keystroke rebuild) is
**realized in Phase 2/3**, not here — Phase 1 only removes the *excuse* for
re-implementing DFS by providing the canonical one.

---

## 3. Primitive C — `patchAndMarkStale` helper (PAT-11 / contract §1 state)

**Problem (pinned):** the `setQueryData` + `invalidateQueries({refetchType:"none"})`
two-step idiom appears at **22 `refetchType` sites** (PAT-11; R2 finding "22
refetchType sites"; e.g. `use-estimate-row-mutations.ts:212,213,253,254,308,309,388,389,401`).
Hand-replicated everywhere; rollback snapshots taken ad hoc.

**Target (file 04 §4.2):** one helper that writes the cache, marks stale without
refetch, and **returns the prior snapshot** so the Phase-5 optimistic adapter can
use it for rollback.

### C.1 Interface sketch (design target — verbatim from file 04 §4.2)

```ts
// src/lib/query/patch-and-mark-stale.ts  (new)
export function patchAndMarkStale<T>(
  client: QueryClient,
  key: QueryKey,
  updater: (prev: T | undefined) => T,
): { previous: T | undefined } {
  const previous = client.getQueryData<T>(key);
  client.setQueryData<T>(key, updater);
  client.invalidateQueries({ queryKey: key, refetchType: "none" });
  return { previous };
}
```

### C.2 Steps
1. **C-S1** Write the helper. *Validate:* new `tests/vitest/query/patch-and-mark-stale.test.ts`
   **(propose)** against a real `QueryClient` — asserts `setQueryData` applied,
   `invalidateQueries` called with `refetchType:"none"` (no network), and
   `previous` is the pre-write snapshot. `bun run type-check`.
2. **C-S2** (planning note) **Do not migrate the 22 sites** — Phase 4 (query
   standardization) and Phase 5 (optimistic adapter) adopt it. Record the 22-site
   list (R2) as the Phase-4/5 migration checklist in `05_PHASED_REFACTOR_PLAN`
   territory (cross-ref, do not duplicate).

**Risk:** Low (additive pure-ish helper; nothing imports it yet). It is the
seam the optimistic adapter (file 04 §8) builds on — but the adapter is Phase 5.

---

## 4. Primitive D — Unified query-key factory (PAT, contract §1 state, file 04 §4.1)

**Problem (pinned):** **5 query-key conventions** (nested factory ×3, bare-const
+builders, inline fns) — `estimateQueryKeys` (`use-estimate-query.ts:10-16`, with
`areaTree` flagged legacy at `:14`), `favoritesQueryKeys` (clean),
`notificationQueryKeys` (clean), component-library bare consts
(`component-library/query-keys.ts:7-47`), `projectCollaborationQueryKey` inline.
The `estimateTabId ? tabTree : areaTree` ternary is **replicated ~14×**
(`use-estimate-row-mutations.ts:204,212,229,278,303,313,328,353,383,394`).

**Target (file 04 §4.1):** **define** one nested-factory module here, modeled on
the clean favorites/notifications shape, with a single `tree(id, tabId?)` resolver
folding the branch — but **defer the full call-site migration to Phase 4.**

### D.1 Interface sketch (design target — verbatim from file 04 §4.1)

```ts
// src/lib/query/keys.ts  (single source of truth — DEFINED in Phase 1, ADOPTED in Phase 4)
export const queryKeys = {
  estimate: {
    all:    ["estimate"] as const,
    detail: (id: string) => ["estimate", id, "detail"] as const,
    tabs:   (id: string) => ["estimate", id, "tabs"] as const,
    // ONE resolver replaces every `tabId ? tabTree : areaTree` ternary (~14×):
    tree:   (id: string, tabId?: string | null) =>
      tabId ? (["estimate", id, "tabTree", tabId] as const)
            : (["estimate", id, "areaTree"] as const),
    treeRevision: (id: string, tabId?: string | null) =>
      [...queryKeys.estimate.tree(id, tabId), "revision"] as const,
  },
  favorites:            { /* adopt existing favoritesQueryKeys shape */ },
  notifications:        { /* adopt existing notificationQueryKeys shape */ },
  componentLibrary:     { /* fold the bare-const + builders */ },
  projectCollaboration: (projectId: string) => ["project-collaboration", projectId] as const,
} as const;
```

### D.2 Steps
1. **D-S1** Write `queryKeys` reproducing **exactly** the key tuples the existing
   factories/consts produce (so it is a behavioral superset, migration-ready).
   *Validate:* new `tests/unit/query-keys.test.ts` **(propose)** — asserts
   `queryKeys.estimate.tree(id, tabId)` === today's `tabTree` tuple and
   `tree(id, null)` === today's `areaTree` tuple (`use-estimate-query.ts:10-16`);
   `treeRevision` === the `...key,"revision"` sibling pattern
   (`use-estimate-query.ts:40,101`). `bun run type-check`.
2. **D-S2** (planning note) **No call site migrates in Phase 1.** Phase 4 swaps
   the ~14 ternary sites + the 5 conventions onto `queryKeys`. The `areaTree`
   retirement waits on contract §5 Q-B (is `areaTree` load-bearing for any
   non-tab estimate?) — the resolver keeps both arms until answered.

**Risk:** Low (new module, unused). **Constraint:** must be tuple-identical to
today's keys or Phase 4's migration would silently split caches — the parity test
(D-S1) is the guard.

---

## 5. Primitive E — Render-probe convention / render-count harness (file 04 §11)

**Problem (pinned):** only **4 jsdom render-isolation gates** exist
(`tests/vitest/perf/`), all bound to the estimate sheet via a sheet-specific probe
(`src/components/workshop/estimate-sheet-render-probe.ts:19-83`). No reusable
harness for tree/tabs/sidebar/charts (R7 Gap 1).

**Target (file 04 §11):** generalize the probe pattern into a reusable
`createRenderProbe(name)` factory so any component family can expose render/compute
counters a Phase-9 gate asserts. Phase 1 ships the **factory + convention + one
example test**; Phase 9 adds the actual tree/tabs/sidebar/charts gates.

### E.1 Interface sketch (design target — generalizes the existing probe)

```ts
// src/lib/perf/render-probe.ts  (new — generalizes estimate-sheet-render-probe.ts)
export interface RenderProbe {
  report: (id?: string) => void;            // call from the component's render body
  install: (cb: (id?: string) => void) => () => void;  // test installs; returns uninstall
}
export function createRenderProbe(name: string): RenderProbe;
// Production cost = one null check (the existing probe's contract, render-probe.ts:1-2).
```

**Convention (documented in the plan, for Phase 9 authors):**
- A render-count test renders the component, installs a counting probe, performs
  one interaction (keystroke / expand / tab switch / search char), and asserts an
  **exact** count (`=== 0` / `=== 1`) — mirroring the 4 existing gates
  (`render-relief.tsx:162`, `memoization.tsx:166-167,201`,
  `cursor-isolation.tsx:186-232`).
- Probes are **null in production** (one null check, per
  `estimate-sheet-render-probe.ts:1-2`) — never a runtime cost.

### E.2 Steps
1. **E-S1** Write `createRenderProbe`. *Validate:* new
   `tests/vitest/perf/render-probe.test.tsx` **(propose)** — install/report
   counts correctly, uninstall stops counting, null when not installed.
2. **E-S2** (planning note) Document the harness pattern as the template for the
   Phase-9 `perf:render-budget` (file 03 §2; file 04 §11) covering tree
   expand/collapse, tree filter, tab switch, sidebar search, charts. **No new
   component is instrumented in Phase 1** — the existing sheet probe stays as-is;
   this is a *spare* harness for later.

**Risk:** Low (test-only utility; production cost = unchanged null check).

---

## 6. Type contracts summary (design targets, not committed code)

All interfaces above are **design targets** (contract §4; file 04 preamble). The
foundation type surface Phase 1 freezes for later phases:

| Type / fn | Home (new) | Consumed by |
|---|---|---|
| `structuralHash`, `estimateContentHash` | `src/lib/tree/structural-hash.ts` | Phase 2/3 (signature off hot path, file 04 §7.4) |
| `TreeAdapter<T>`, `TreeIndex<T>`, `buildTreeIndex` | `src/lib/tree/tree-kernel.ts` | Phase 2 (ops + adoption, file 04 §6); Phase 3 (incremental totals via `ancestorsOf`, §7.3) |
| `toggleInSet`/`setsEqual`/`indexBy` | `src/lib/collections/id-set.ts` | Phase 2/3 (Set/Map state, file 04 §5.2) |
| `withUpdatedEntry` (structural-sharing Map) | `src/lib/collections/structural-map.ts` | Phase 3 **OBJECT-valued surfaces only** — `editableRows` per-row store (file 09 Step 4) + any object-valued derived map; RISK-16. **NOT the number-valued totals Map** (value-equality suffices; D-017). Optional/deferred until a measured guard depends on it (Q-33). |
| `patchAndMarkStale` | `src/lib/query/patch-and-mark-stale.ts` | Phase 4 (22 sites); Phase 5 (optimistic adapter, file 04 §8) |
| `queryKeys` | `src/lib/query/keys.ts` | Phase 4 (~14 ternary sites + 5 conventions, file 04 §4.1) |
| `createRenderProbe`, `RenderProbe` | `src/lib/perf/render-probe.ts` | Phase 9 (`perf:render-budget`, file 04 §11) |

**Stable-callback & selector rules (conventions Phase 1 documents; enforced when
later phases wire):**

- **Stable callbacks:** any callback passed into the memoized branch/row guards
  must be identity-stable (`useStableCallback` / `useCallback` with exhaustive
  deps). The load-bearing guards `areEstimateSheetBranchPropsEqual`
  (`branch.tsx:111-156`) and `areEstimateRowItemsTablePropsEqual`
  (`row-table.tsx:86-116`) key on per-row `editableRows[id]` identity + stable
  callbacks — file 04 §0 principle 1: the refactor reduces **compute**, never
  these guards. Phase 1's primitives are pure and stateless precisely so they
  cannot introduce a new unstable callback into those guards.
- **Selector rules:** the `TreeIndex` is **derived state in a memoized selector
  layer, not Zustand** (file 04 §6.3; R3↔R2). Selectors must be referentially
  stable across renders when inputs are unchanged (memoize by tree
  version/revision — the existing revision counters at `use-estimate-query.ts:40,101`
  are the recompute trigger). Zustand selectors index by id and bail early when
  unchanged (the good pattern already in `use-estimate-workspace-state.ts:38-84`)
  — preserve it; switch the underlying arrays to `Set`/`Map` (Primitive B) so the
  bail-early comparison is O(1).

---

## 7. Ordered implementation sequence (whole-phase) + validation

| Step | Primitive | Deliverable | Validation (per step) |
|---|---|---|---|
| 1 | E | `createRenderProbe` (build the *measurement* tool first) | unit test; `type-check` |
| 2 | B | `buildTreeIndex` + read accessors | `tree-kernel.test.ts`; `type-check` |
| 3 | B | `id-set` utilities + 2 example adapters | `id-set.test.ts`; `type-check` |
| 4 | A | `structuralHash` + `estimateContentHash` (parity test vs current signature) | `structural-hash.test.ts`; `type-check` |
| 5 | C | `patchAndMarkStale` | `patch-and-mark-stale.test.ts` (real QueryClient); `type-check` |
| 6 | D | `queryKeys` factory (tuple-parity test) | `query-keys.test.ts`; `type-check` |
| 7 | — | **Phase gate** | `vitest run tests/vitest/perf` (the 4 jsdom gates **stay green** — proves no hot-path change) + `bun run validate` |

**Per-phase exit gate:** `bun run validate` green AND the 4 jsdom
render-isolation gates green AND each new primitive has a passing unit test AND a
spot-check confirms one estimate sheet's keystroke isolation is **unchanged**
(file 15 §2 Phase-1 row). Because nothing is wired, `validate` green + perf gates
green ≡ "we built parts and broke nothing."

---

## 8. Risks, constraints & cross-phase dependencies

| Item | Risk | Note |
|---|---|---|
| Primitives wired prematurely | **Medium** | The one real risk. Wiring belongs to Phases 2–5. Reviewer rule: a Phase-1 PR that imports a new primitive into `EstimateSheetContent.tsx`/`EstimateSheetTree.tsx`/mutation hooks/stores is **out of scope** — bounce it. |
| `queryKeys` tuple drift | Medium | Must be byte-identical to today's keys or Phase 4 splits caches. D-S1 parity test is the guard. |
| `estimateContentHash` field drift | Low | Must distinguish the same node sets the current 19-field signature does until Phase 3 trims (A-S2 parity test). |
| `TreeIndex` as store vs selector | Low (decided) | Derived/selector, not Zustand (file 04 §6.3). Confirm with R2 framing; Q-D verifies single-index-serves-both-panels in Phase 3. |

**Dependencies (what consumes Phase 1):**
- **Phase 0 → Phase 1:** the 4 jsdom render-isolation baselines (file 06 S2) must
  be green/captured; Phase 1's gate re-asserts them.
- **Phase 2 (tree kernel):** consumes `buildTreeIndex` + `TreeAdapter` + Set/Map
  helpers + `structuralHash`; adds the ops layer and migrates call sites.
- **Phase 3 (sheet):** consumes `TreeIndex.ancestorsOf` for incremental totals
  (file 04 §7.3) and `structuralHash`/`estimateContentHash` for signature-off-hot-path
  (file 04 §7.4). Per-row subscription store (file 04 §7.2) is built in Phase 3,
  not here.
- **Phase 4 (query/cache):** adopts `queryKeys` (~14 ternary sites) +
  `patchAndMarkStale` (22 sites); resolves Q-B (`areaTree` retirement).
- **Phase 5 (optimistic):** the adapter (file 04 §8) builds on `patchAndMarkStale`
  (snapshot-returning) + `queryKeys`.
- **Phase 9 (gates):** `createRenderProbe` underpins `perf:render-budget`.

**Open questions carried (cross-ref `19_OPEN_QUESTIONS.md`):** Q-B (`areaTree`
load-bearing?) blocks the factory's branch removal but not its definition; Q-D
(left-tree double totals DFS?) is verified in Phase 3 but Primitive B is built to
make a single shared index possible; Q-A (editableRows in cache vs per-row store)
is a Phase-3 decision unaffected by Phase 1's pure primitives.

**New open question (AR3 finding 2; retargeted per D-017):** the structural-sharing /
reference-stable Map helper (`withUpdatedEntry`, §B.4) targets **OBJECT-valued
surfaces only** (the `editableRows` per-row store + any object-valued derived map) —
**not** the number-valued totals Map, which is satisfied by value-equality
(`Object.is` over numbers, `branch.tsx:147`; D-017). Two carried questions: **(Q-33)**
does any object-valued derived map beyond the `editableRows` store actually need the
helper (measure in §B.5; if none, the helper is optional/deferred); and — should a
hand-rolled copy-forward helper ship, or does a no-new-dependency review prefer
adopting **`immer`** for the copy-with-structural-sharing semantics? The helper is the
seam the Phase-3 memo guards depend on **for the object case** (RISK-16; file 09
Step 4); the hand-rolled option keeps Phase 1's zero-dependency constraint, the
`immer` option trades a dependency for battle-tested structural sharing. Carry both
to `19_OPEN_QUESTIONS.md`; record the §B.5 measurement under D-017 in
`17_DECISION_LOG.md`.
