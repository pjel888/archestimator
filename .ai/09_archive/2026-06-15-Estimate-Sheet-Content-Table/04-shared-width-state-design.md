# Shared Column-Width State Design — Estimate Sheet

> Planning doc. No source changes. Scope: **where** the resizable column-width
> state lives, **how** it persists, and **how** one resize propagates to every
> node group in a sheet without breaking the row-table memoization.
>
> The TanStack/resize-handle API specifics (pointer math, hit targets, keyboard
> resize, ARIA) are **deferred to a sibling doc**. This doc is state / storage /
> sync only.

---

## 0. Grounding: what exists today

| Concern | Reality in the codebase | Cite |
| --- | --- | --- |
| Column track definition | A single Tailwind class constant, shared by *every* row and the existing header row. There is exactly one source of truth for column geometry today. | `src/components/workshop/estimate-sheet/rows/row-table.tsx:96` (`ROW_COLUMNS = "grid-cols-[36px_32px_minmax(160px,1fr)_58px_92px_106px_92px_108px_30px]"`), applied at body rows `:243` and the existing `<thead>` row `:626` |
| The "multiple node groups" | All groups render inside **one** `EstimateSheetVirtualBranchList`, itself inside **one** scroll container (`data-estimate-pointer-surface`). That container is the natural shared ancestor for a CSS custom property. | `EstimateSheetContent.tsx:2704-2744` (the surface div at `:2706`, the list at `:2712`) |
| Existing global UI store | `useEstimateUiStore` — flat zustand, **no persist middleware**, keyed-map pattern (`activityScopeDirectOnly: Record<string, boolean>`), default-`{}` stability. | `src/stores/estimate-ui-store.ts:11,39,45-48` |
| Per-estimate / per-tab keying | `useEstimateWorkspaceState` keys state by `estimateId` *and* by `tabId` with `...ById` record maps and no-op-guarded setters (`if (state.x[id] === v) return state;`). | `src/hooks/use-estimate-workspace-state.ts:30-93` |
| Identity-stable handlers | `useStableCallback` — ref + `useInsertionEffect`, returns one frozen function; **only safe post-commit**. The row table is memoized on callback identity. | `src/hooks/use-stable-callback.ts:8-16`; memo guard `row-table.tsx:66-94` |
| localStorage helper | `safeSetJsonStorage` / `readJsonStorage` — SSR-guarded, try/catch, JSON. Import from `@/components/workshop/component-library/helpers`; `EstimateSheetContent.tsx:128` currently re-exports `safeSetJsonStorage`, but `readJsonStorage` should come from the helper module directly. | `src/components/workshop/component-library/helpers.ts:92-110` |
| zustand persist middleware | **Not used anywhere** (`grep zustand/middleware` → 0 hits). The repo persists manually via the helpers above. |
| Server user-preferences table | **Does not exist** (`supabase/migrations/*` has no `user_*pref*` / `*settings*` table). |

Two facts drive every recommendation below:

1. **There is already a single column source of truth** (`ROW_COLUMNS`). We are
   replacing a *constant* with a *variable* — not introducing per-group state.
2. **The repo's persistence idiom is manual `safeSetJsonStorage`, not persist
   middleware.** Matching it keeps this feature consistent and avoids pulling in
   middleware the codebase has deliberately avoided.

---

## 1. State shape & scope

### Scope decision: **per-estimate** (one width set shared by all node groups *and* all tabs of an estimate)

The user said "adjust for all." Decompose what "all" means:

- **All node groups within the visible sheet** — REQUIRED. This is the literal
  ask and is satisfied by a single source of truth (see §3). All groups already
  live under one surface and one `ROW_COLUMNS`.
- **All tabs of the same estimate** — RECOMMENDED. The 9 columns are identical
  across every tab (same `row-table.tsx`). A surveyor who widens "Material" on
  tab A expects it wide on tab B; per-tab widths would feel broken. Unlike
  selection/expansion (which are legitimately per-tab in
  `use-estimate-workspace-state.ts:9-10`), column geometry is a *view
  preference*, not *navigation state*.
- **All estimates globally** — REJECTED as the storage key, but it is the
  *fallback default* (see §4). Different estimates can legitimately want
  different layouts, so the committed scope key is the estimate; a brand-new
  estimate inherits the user's last-used widths as its starting point.

> Net: **committed store is keyed by `estimateId`**, with a global "last-used"
> default seeded into new estimates. This mirrors exactly how
> `use-estimate-workspace-state.ts` keys by `estimateId` while accepting a
> `default…` argument (`:157,175,180,193`).

If `estimateId` is missing, the implementation must not invent a durable key.
Use only the spec defaults or an in-memory/session fallback for that render and
skip localStorage read/write. Persistent per-estimate widths start only when a
real `estimateId` exists.

### The canonical 9-track contract

The grid has 9 tracks; columns 1, 2, and 9 are fixed structural chrome (index
gutter, selection column, row-actions) and are **not user-resizable** — only the 6
data columns resize. We still model all 9 in the type so the grid template is
fully reconstructable from state.

This is the canonical column contract for the package. Other docs should link
here instead of re-tabling IDs, labels, fields, defaults, or CSS variable names.

| Track | Storage/CSS ID | Header label | Backing field(s) / source | Current track | Resizable? |
|---:|---|---|---|---|---:|
| 1 | `index` | `#` | row index display only | `36px` | No |
| 2 | `select` | select checkbox | selection chrome | `32px` | No |
| 3 | `material` | `Materials` | material card / express component content | `minmax(160px,1fr)` | Yes |
| 4 | `quantity` | `Qty` | editable quantity plus inline unit suffix | `58px` | Yes |
| 5 | `subTotal` | `Subtotal` | `subTotal` (`src/lib/estimates/types.ts:95`) | `92px` | Yes |
| 6 | `adjustment` | `Adjustment` | `contingencyPercentage` / `contingencyValue`; there is no backing field named `adjustment` (`types.ts:96-97`) | `106px` | Yes |
| 7 | `miscCost` | `Misc Cost` | `miscCost` / editable misc-cost input (`types.ts:98`) | `92px` | Yes |
| 8 | `totalItemCosts` | `Total Item Cost` | `totalItemCosts` (`types.ts:100`) | `108px` | Yes |
| 9 | `actions` | actions | row action buttons | `30px` | No |

CSS variables use the same IDs with the `--est-col-` prefix. Example:
`--est-col-material`, `--est-col-subTotal`, `--est-col-totalItemCosts`.

```ts
// src/lib/estimate-sheet/column-model.ts  (new file — pure constants/types)

export type EstimateColumnId =
  | "index"        // track 1 — 36px  fixed (row number gutter)
  | "select"       // track 2 — 32px  fixed (selection checkbox column)
  | "material"     // track 3 — minmax(160px,1fr)  RESIZABLE (the flex column)
  | "quantity"     // track 4 — 58px  RESIZABLE
  | "subTotal"     // track 5 — 92px  RESIZABLE (field: subTotal)
  | "adjustment"   // track 6 — 106px RESIZABLE (UI over contingency fields)
  | "miscCost"     // track 7 — 92px  RESIZABLE
  | "totalItemCosts" // track 8 — 108px RESIZABLE (field: totalItemCosts)
  | "actions";     // track 9 — 30px  fixed (row kebab)

/** Only the user-resizable columns appear as keys in stored width state. */
export type ResizableColumnId =
  | "material" | "quantity" | "subTotal" | "adjustment" | "miscCost" | "totalItemCosts";

/** Width in CSS px. `material` stores a *minimum*; it keeps the `1fr` flex. */
export type ColumnWidths = Partial<Record<ResizableColumnId, number>>;
```

`Partial` + an empty-`{}` default is deliberate (see §5): an absent key means
"use the spec default," so adding/removing a column later never invalidates a
stored payload, and the default object identity stays stable.

### Committed store-state shape

```ts
type EstimateColumnWidthsState = {
  /** Committed widths keyed by estimateId. Empty {} until first resize. */
  widthsByEstimateId: Record<string, ColumnWidths | undefined>;
  /** Global last-used set, seeded into new estimates as their starting point. */
  lastUsedWidths: ColumnWidths;
  /** Commit a full width set for an estimate (called once on drag-END). */
  commitColumnWidths: (estimateId: string, widths: ColumnWidths) => void;
  /** Reset one estimate back to spec defaults (clears its entry). */
  resetColumnWidths: (estimateId: string) => void;
};
```

---

## 2. Where it lives — transient vs committed split

### Recommendation: **a new store `useEstimateColumnWidthsStore` (committed layer) + a CSS-variable-on-ancestor (transient layer).** Do *not* extend `estimate-ui-store`, and never route live-drag pixels through React props.

#### Why a new store, not `estimate-ui-store`

`estimate-ui-store` is *unkeyed, ephemeral* interaction state (selection, drag,
focus — `estimate-ui-store.ts:6-25`). Column widths are *keyed by estimateId*
and *persisted*. They belong with the per-estimate-keyed family
(`use-estimate-workspace-state.ts`), not the ephemeral one. A dedicated store
keeps the persistence subscription (§4) scoped to one slice instead of
serializing drag/selection noise. This matches how the repo already splits
stores by lifecycle (`navigation-ui-store`, `project-estimates-store`,
`estimate-ui-store` are all separate).

#### The memoization hazard (this is the crux)

`EstimateRowItemsTable` is `memo`'d via `areEstimateRowItemsTablePropsEqual`
(`row-table.tsx:66-94`) and the whole branch tree is fed referentially-stable
callbacks (`EstimateSheetContent.tsx:1064-1066`). **A width value that changes
on every `pointermove` must never become a React prop or store-subscribed value
that flows into these memoized branches** — that would re-render every row table
on every mouse frame and destroy the perf guard the codebase fought for.

Resolution: a **two-layer split**.

```
┌─────────────────────────────────────────────────────────────────────┐
│  TRANSIENT LAYER  (live drag — high frequency, zero React state)      │
│                                                                       │
│  pointermove ─▶ resizeController.setColumnVar(id, px)                 │
│                   └─ surfaceEl.style.setProperty("--est-col-material",│
│                        px + "px")   ◀── direct DOM write, no setState │
│                                                                       │
│  CSS recomputes grid-template-columns from the vars.                  │
│  React renders 0 times during the drag.                              │
└─────────────────────────────────────────────────────────────────────┘
                              │  pointerup / Enter (drag END)
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  COMMITTED LAYER  (one write per resize — low frequency, store)       │
│                                                                       │
│  commitColumnWidths(estimateId, finalWidths)   ◀── single set()      │
│     • updates lastUsedWidths                                          │
│     • store subscription debounces → safeSetJsonStorage (§4)         │
│     • on next render, the surface's inline style is re-derived from   │
│       the store so SSR/remount/other-tab values match the DOM vars.  │
└─────────────────────────────────────────────────────────────────────┘
```

- **Transient layer = CSS custom properties written imperatively** to the
  `data-estimate-pointer-surface` element (`EstimateSheetContent.tsx:2706`). The
  resize controller is a `useRef`-held object (built with `useStableCallback`
  semantics — handlers invoked post-commit only, per
  `use-stable-callback.ts:8-9`). No `setState` fires during the drag.
- **Committed layer = the new store**, written exactly once on drag-end.

The surface element renders its column vars from the *committed* store value:

```tsx
const committedWidths = useEstimateColumnWidthsStore(
  (s) => s.widthsByEstimateId[estimateId ?? ""] ?? s.lastUsedWidths,
);
const columnVars = useMemo(
  () => buildColumnVars(committedWidths), // → { "--est-col-material": "220px", ... }
  [committedWidths],
);
// <div data-estimate-pointer-surface style={columnVars} …>
```

Because `committedWidths` only changes on drag-end (not during), this subscribed
read re-renders the surface (and re-derives the inline style) at most once per
resize — never per frame. Live drag bypasses React entirely by overwriting the
same vars on the same element.

---

## 3. Cross-group sync — one source of truth, zero per-group state

The 9-track template stops being a hard-coded class and becomes a template that
reads CSS variables. `ROW_COLUMNS` (`row-table.tsx:96`) changes from a literal
to a var-driven template applied identically to every row and the header:

```ts
// Conceptual replacement for ROW_COLUMNS. Fixed tracks stay literal;
// resizable tracks read a var with the spec default as fallback.
const COLUMN_TEMPLATE =
  "36px 32px " +
  "minmax(var(--est-col-material, 160px), 1fr) " +
  "var(--est-col-quantity, 58px) " +
  "var(--est-col-subTotal, 92px) " +
  "var(--est-col-adjustment, 106px) " +
  "var(--est-col-miscCost, 92px) " +
  "var(--est-col-totalItemCosts, 108px) " +
  "30px";
// applied via style={{ gridTemplateColumns: COLUMN_TEMPLATE }} on each <tr>.
```

Sync falls out of CSS cascade for free:

1. The vars are defined **once**, on the shared scroll surface ancestor
   (`:2706`), which contains *every* node group's branch list (`:2712`).
2. Every row `<tr>` and the column header use the *same* `COLUMN_TEMPLATE`,
   which references those inherited vars.
3. Setting `--est-col-material` once on the ancestor instantly reflows **all**
   groups' grids in the same layout pass. There is no per-group React state to
   fan out, no prop to thread through `EstimateSheetVirtualBranchList`, and the
   row memo comparator is untouched (`gridTemplateColumns` is a static string;
   the *values* live in inherited CSS vars the comparator never sees).

This is the entire reason the design is sync-by-construction: **CSS inheritance
is the broadcast bus.** One write, N groups updated, 0 React renders of the rows.

> Header note: the existing column header already lives in
> `row-table.tsx:625-650` and reuses `ROW_COLUMNS` at `:626`. The migration must
> apply the same var-driven template to that header `<tr>` and every body row.
> Any future sticky ruler/header must also live *inside* the same surface so it
> inherits the same vars and stays pixel-aligned with the rows during drag.

---

## 4. Persistence

### MVP: **localStorage via the existing `safeSetJsonStorage` helper, with a versioned envelope.**

No persist middleware (the repo doesn't use it; `helpers.ts:101` is the house
style). Subscribe to the new store and write debounced on commit:

```ts
const STORAGE_VERSION = 1;
const storageKey = (estimateId: string) =>
  `archestimator:estimate-column-widths:v${STORAGE_VERSION}:${estimateId}`;
const lastUsedKey = `archestimator:estimate-column-widths:v${STORAGE_VERSION}:__last-used`;

type StoredColumnWidths = { v: number; widths: ColumnWidths };
```

- **Key naming:** namespaced (`archestimator:…`), versioned (`:v1:`), scoped by
  `estimateId`; plus one `__last-used` key for the global default. Per-estimate
  keys avoid one giant blob and avoid cross-estimate write contention.
- **Versioning / migration:** the `v1` segment + `{ v, widths }` envelope. A
  future `v2` reads `v1`, maps unknown/renamed `ResizableColumnId`s (drop
  unknown keys — `Partial` tolerates absence), writes `v2`, and the loader
  ignores keys whose version it can't parse. Because absent keys fall back to
  spec defaults, partial/dropped data degrades gracefully instead of corrupting
  layout.
- **Write path:** `safeSetJsonStorage(storageKey(id), { v: 1, widths })` on
  commit (debounced ~250ms to coalesce rapid successive resizes). SSR-safe and
  try/catch-guarded by the helper (`helpers.ts:102-108`).
- **Read path (hydration):** `readJsonStorage(storageKey(id), null)` →
  `commitColumnWidths(id, stored.widths)` inside a mount `useEffect` (never
  during render — avoids SSR/client hydration mismatch, same discipline as the
  effects in `use-estimate-workspace-state.ts:131-137`). Fall back to
  `__last-used`, then to `{}` (spec defaults).
- **Reset to default:** `resetColumnWidths(estimateId)` clears the store entry
  *and* removes the localStorage key, so the grid snaps back to the `ROW_COLUMNS`
  spec widths (the var fallbacks in §3 take over automatically — no recompute
  needed). Expose this as a "Reset column widths" affordance in the deferred UI
  doc.

### Future: server-side per-user preference

No table exists today. When cross-device persistence is wanted, add a
`user_view_preferences` row (user_id, scope = estimate_id, `widths jsonb`,
updated_at) behind a repository (mirroring `estimate-repository.ts`) and a
TanStack mutation. The localStorage layer becomes the offline/optimistic cache;
the store commit fires both the local write and a debounced server upsert. The
two-layer transient/committed split is unchanged — only the committed-layer sink
gains a second destination. Defer until multi-device demand is real (YAGNI;
matches `ce-scope-guardian` discipline and the repo's "no premature server
state" posture).

---

## 5. Selector & identity rules (referential stability)

Mirror the `activityScopeDirectOnly` default-`{}` stability comment
(`EstimateSheetContent.tsx:1116-1119`) and the no-op-guard setters in
`use-estimate-workspace-state.ts:38,50,61,73,84`:

1. **Module-level frozen defaults.** Export one shared empty object and reuse it
   so every "no widths yet" read returns the *same reference* (prevents the
   `columnVars` memo from busting):

   ```ts
   export const EMPTY_COLUMN_WIDTHS: ColumnWidths = Object.freeze({});
   // selector: (s) => s.widthsByEstimateId[estimateId] ?? s.lastUsedWidths
   //           (lastUsedWidths is itself stable until a commit)
   ```

2. **No-op-guard the setter.** `commitColumnWidths` must early-return the
   existing state when the incoming widths are shallow-equal to what's stored,
   exactly like `if (state.x[id] === v) return state;`
   (`use-estimate-workspace-state.ts:38`). A drag that ends where it started must
   not produce a new object identity or a storage write.

3. **Narrow selectors only.** Components subscribe to
   `widthsByEstimateId[estimateId]` (or `lastUsedWidths`) and the action
   functions — never the whole store object. Action functions from `create` are
   stable by construction (same as `setActivityScopeDirectOnly`).

4. **Derive `columnVars` with `useMemo` keyed on the committed object identity.**
   Since the committed object only changes on a real commit, the inline-style
   object is referentially stable between resizes, so the surface div doesn't
   re-render spuriously.

5. **Transient writes carry no identity.** Live-drag `setProperty` calls mutate
   the DOM, not state, so they create zero new references and can't trip any
   memo. The store stays untouched until commit.

---

## 6. Default widths derived from the current tracks

From `row-table.tsx:96`
(`grid-cols-[36px_32px_minmax(160px,1fr)_58px_92px_106px_92px_108px_30px]`):

| # | `EstimateColumnId` | Current track | Resizable? | Default (px) | Min | Max | Notes |
|---|---|---|---|---|---|---|---|
| 1 | `index` | `36px` | No | 36 | 36 | 36 | Row-number gutter; fixed chrome. |
| 2 | `select` | `32px` | No | 32 | 32 | 32 | Selection checkbox column; fixed. |
| 3 | `material` | `minmax(160px,1fr)` | **Yes** | **160 (min)** | 160 | 640 | Stays `minmax(var,1fr)` — the var sets the *minimum*; column keeps absorbing slack. The resolved planning value remains 160 so Phase 0 can reproduce today's layout. Before enabling user resize, U0 must measure the express card floor; if 160 proves unusable, raise default and min together and delete the byte-identical rollout claim. |
| 4 | `quantity` | `58px` | **Yes** | 58 | 52 | 140 | Quantity input plus `/ unit` suffix. |
| 5 | `subTotal` | `92px` | **Yes** | 92 | 76 | 220 | Computed read-only currency; backing field is `subTotal`. |
| 6 | `adjustment` | `106px` | **Yes** | 106 | 92 | 240 | Header label / storage ID for contingency mode, percent input, and value; backing fields are `contingencyPercentage` and `contingencyValue`. |
| 7 | `miscCost` | `92px` | **Yes** | 92 | 76 | 220 | Editable currency. |
| 8 | `totalItemCosts` | `108px` | **Yes** | 108 | 88 | 260 | Computed read-only line total; backing field is `totalItemCosts`. |
| 9 | `actions` | `30px` | No | 30 | 30 | 30 | Row kebab; fixed. |

```ts
export const DEFAULT_COLUMN_WIDTHS: Record<ResizableColumnId, number> = {
  material: 160, quantity: 58, subTotal: 92, adjustment: 106, miscCost: 92, totalItemCosts: 108,
};
export const COLUMN_WIDTH_BOUNDS: Record<ResizableColumnId, { min: number; max: number }> = {
  material: { min: 160, max: 640 }, quantity: { min: 52, max: 140 },
  subTotal: { min: 76, max: 220 }, adjustment: { min: 92, max: 240 },
  miscCost: { min: 76, max: 220 }, totalItemCosts: { min: 88, max: 260 },
};
```

Min/max are the only invariants the *state* layer enforces (clamp on commit and
on transient write). Mins are set so inputs/labels don't clip; maxes prevent a
single column from starving `material`'s flex. The defaults are byte-identical to
today's grid, so absent state reproduces the current layout exactly — a safe,
reversible rollout.

---

## 7. New / touched files (for the implementer)

| File | Change |
| --- | --- |
| `src/lib/estimate-sheet/column-model.ts` *(new)* | Types + `DEFAULT_COLUMN_WIDTHS`, `COLUMN_WIDTH_BOUNDS`, `EMPTY_COLUMN_WIDTHS`, `buildColumnVars`, `COLUMN_TEMPLATE`. |
| `src/stores/estimate-column-widths-store.ts` *(new)* | The committed store (§1, §2) + persistence subscription (§4). |
| `src/components/workshop/estimate-sheet/rows/row-table.tsx` | Replace `ROW_COLUMNS` literal (`:96`) with var-driven `COLUMN_TEMPLATE`; apply via `gridTemplateColumns` at `:243`/`:626`. Memo comparator unchanged. |
| `src/components/workshop/EstimateSheetContent.tsx` | Read committed widths, set `columnVars` inline style on the `data-estimate-pointer-surface` div (`:2706`), hydrate from storage in a mount effect. |
| *(deferred sibling doc)* | The resize controller / handle, pointer + keyboard math, ARIA, header rendering. |

---

## 8. Why this is the right altitude

- **Reuses the single existing source of truth** (`ROW_COLUMNS`) instead of
  inventing per-group state.
- **The hard constraint — never re-render memoized rows on mousemove — is
  structurally guaranteed**, not merely "be careful": live drag touches the DOM,
  never the store or props.
- **Persistence matches the house style** (`safeSetJsonStorage`, not unused
  persist middleware) and stays trivially migratable to a server table later.
- **Defaults are byte-identical to today**, so shipping with empty state is a
  no-op and reset is free (CSS var fallbacks). This depends on keeping
  `material` at 160 until an express-card measurement proves a different floor
  is required and the rollout claim is revised.
