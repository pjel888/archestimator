# `/workshop/components` UX/UI Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task. Because the current working tree has many existing uncommitted changes, implementation must be isolated in a new branch/worktree or coordinated with the current branch owner before editing production code.

**Goal:** Turn `/workshop/components` from a placeholder/card browse surface into a compact, searchable, table-first global Component Library manager with supplier/category/spec pivots, price-health visibility, and a right-side detail/create/edit drawer.

**Architecture:** Keep the route inside the existing workshop shell and collection layout. Build a manager mode separate from the estimate insertion sidebar, but reuse safe helpers and models where possible. Start read-only with current data shape, then add persistent CRUD after the schema/action boundary is decided.

**Tech Stack:** Next.js 16 app route, React/TypeScript, Tailwind, existing UI primitives, Supabase `cost_library_items`, Bun/Vitest.

---

## Preconditions

1. Confirm working tree ownership before code edits.
   - Current observed branch: `fix/estimate-workspace-labels-alignment`.
   - Many files were already modified/untracked before this plan pack.
   - Do not overwrite unrelated work.

2. If editing symbols/functions/classes, follow project GitNexus/code-review-graph rules where tools are available. At minimum, inspect impact before modifying shared components.

3. Preserve these contracts:
   - Estimate sidebar insertion via `onInsertComponent` and `archestimator:add-library-item` event.
   - Drag payload MIME type: `application/x-archestimator-library-item`.
   - Shared workshop shell/search/toolbar rhythm.
   - Existing app density and font-size constraints.

4. Implementation readiness verdict after independent review: **CONDITIONAL GO**.
   - GO only for the approved read-only first slice: Phase 1 manager UI plus Task 2.1 read-only inspector.
   - NO-GO for Task 2.2 editor form, persistent CRUD, hard delete/archive, schema expansion, imports, bulk actions, saved views, or live estimate-impact workflows until the later gates in this plan are explicitly satisfied.
   - If a future implementation ticket chooses DB CRUD instead of read-only first, it must update this plan before coding.

## Phase 0 — Product/data decision gate

**Approved first implementation scope:** Option A — read-only manager UI first.

The first slice validates the UX with current seed/demo/library-shaped data and must not create live DB writes. Mutation controls are either hidden or disabled with clear compact copy. Do not ship a route that appears editable while writes are not connected.

### Task 0.1: Decide MVP data scope

**Objective:** Choose whether first implementation is read-only/demo-backed, DB-field-only, or schema-expanded.

**Files:**
- Read: `supabase/migrations/20260518090000_archestimator_core_schema.sql`
- Read: `src/lib/repositories/cost-library-repository.ts`
- Read: `src/components/workshop/estimate-tree-data.ts`
- Read: `src/components/workshop/component-library/types.ts`

**Recommendation:**

Start with a read-only manager using current seeded/demo items and adapters. Then add persistent CRUD using DB fields. Schema expansion can follow if Philip wants images/source URL/notes/tags persisted cleanly.

**Decision options:**

A. Read-only UI first
- Fastest UX validation.
- No DB/schema risk.
- Best if visual/product direction is not yet approved.

B. DB-field-only CRUD first
- Uses existing `cost_library_items` fields.
- Defers rich fields such as tags/source URL/image URL.
- Best for production foundation.

C. Schema expansion first
- Adds missing metadata fields.
- More complete but slower/riskier.
- Requires migration/type updates/tests.

**Acceptance criteria:**
- The implementation ticket states which option is chosen.
- If choosing C, migration fields are explicitly approved.
- For the current first slice, the ticket states: `A — read-only manager UI first`.
- In read-only mode, New/Edit/Duplicate/Archive/Delete are hidden or disabled; no local-only save behavior is presented as real persistence.
- Any later switch to B or C adds server-safe repository/actions, workspace scoping, rollback/error handling, archive/delete policy, and persistence tests before enabling mutation UI.

## Phase 1 — Read-only manager UI

### Task 1.1: Create a route-specific manager model/adapters

**Objective:** Normalize existing seed or DB rows into a manager view model without changing estimate insertion models.

**Files:**
- Create: `src/components/workshop/component-library-manager/types.ts`
- Create: `src/components/workshop/component-library-manager/adapters.ts`
- Test: `tests/vitest/component-library-manager-adapters.test.ts`

**Model shape:**

```ts
export type LibraryHealthIssue =
  | "missing-price"
  | "missing-source"
  | "missing-date"
  | "low-confidence"
  | "stale-price";

export type LibraryPriceHealth = "current" | "needs-review" | "stale";

export type ComponentLibraryDataSource = "demo" | "workspace";

export type ComponentLibraryManagerItem = {
  id: string;
  name: string;
  kind: "material" | "labor" | "equipment" | "subcontract" | "assembly" | "allowance";
  category: string;
  supplier: string;
  rawSupplier?: string | null;
  brand?: string;
  sku?: string;
  unit: string;
  unitCost: number | null;
  laborCost: number | null;
  supplementaryCost: number | null;
  pricingSource?: string;
  pricingDate?: string;
  confidence?: string;
  description: string;
  thumbnailPath?: string;
  updatedAt?: string;
  health: LibraryPriceHealth;
  healthIssues: LibraryHealthIssue[];
};

export type ComponentLibraryManagerState = {
  query: string;
  statusView: "all" | "needs-review" | "missing-price" | "missing-source";
  groupBy: "none" | "category" | "supplier" | "kind" | "spec";
  sortBy: "name" | "category" | "supplier" | "unitCost" | "updated";
  selectedItemId?: string;
  dataSource: ComponentLibraryDataSource;
  readOnly: boolean;
};
```

**Seed/demo adapter rules:**
- `id` maps from source `id`.
- `name` maps from source `name` or `material`.
- `unitCost` maps from `itemCost`; preserve unknown as `null`, do not collapse unknown into `0`.
- `supplementaryCost` maps from `supplementaryCosts`.
- `laborCost` maps from `laborCost`.
- `pricingSource` maps from `pricingSource`.
- `pricingDate` maps from `pricingDate`.
- `thumbnailPath` maps from `imageUrl`.
- `supplier` uses display fallback `No supplier`; keep the raw nullable supplier separately.
- `category` uses display fallback `Uncategorized` when source category is missing.
- `kind` defaults to `material` for current seed items unless explicit metadata later says labor/equipment/subcontract/assembly/allowance.

**Price-health display precedence:**
1. `missing-price`
2. `missing-source` or `missing-date`
3. `low-confidence`
4. `stale-price`
5. `current`

The row badge may show the highest-priority status, but the inspector and filters must preserve all `healthIssues` so multiple problems are not lost.

**Test cases:**
- Converts an `EstimateRowItem` seed item into the manager item shape.
- Converts a DB `cost_library_items` row into the manager item shape when Phase 3 begins.
- Derives `missing-price` for zero/missing cost when appropriate.
- Derives `missing-source` and `missing-date` independently when source/date are absent.
- Preserves multiple health issues or documented precedence.
- Maps missing supplier to display `No supplier` while preserving raw null value.
- Maps missing category to display `Uncategorized`.
- Defaults seed kind deterministically.
- Preserves supplier/category/unit/name.

**Run:**

```bash
bun run test:dom -- tests/vitest/component-library-manager-adapters.test.ts
```

### Task 1.2: Extract read-only table/list component

**Objective:** Build the dense default list/table for manager mode.

**Files:**
- Create: `src/components/workshop/component-library-manager/ComponentLibraryTable.tsx`
- Test: `tests/vitest/component-library-manager-ui.test.tsx`

**Required behavior:**
- Renders compact rows.
- Shows name, kind, category, supplier, unit, unit cost, source/date, health.
- Row click calls `onSelect(item.id)`.
- Empty state is supplied by parent.

**Acceptance criteria:**
- Default surface is table/list, not card grid.
- Text sizes stay within app density rules.

### Task 1.3: Add facets/search helpers

**Objective:** Support the user’s core pivots: category, supplier, kind, unit, price health.

**Files:**
- Create: `src/components/workshop/component-library-manager/helpers.ts`
- Test: `tests/vitest/component-library-manager-helpers.test.ts`

**Functions:**
- `searchManagerItems(items, query)`
- `filterManagerItems(items, filters)`
- `groupManagerItems(items, groupBy)`
- `sortManagerItems(items, sortMode)`
- `getManagerFacets(items)`

**Test cases:**
- Search by name.
- Search by supplier.
- Search by SKU/brand/source if present.
- Filter by supplier/category/kind/health.
- Count facets accurately.
- Include `No supplier` and `Uncategorized` groups.
- Group by category and supplier.
- Sort deterministically.

### Task 1.4: Replace placeholder route content with read-only manager layout

**Objective:** Make `/workshop/components` show real library management structure using current seeded items.

**Files:**
- Modify: `src/app/workshop/components/page.tsx`
- Modify: `src/components/workshop/ComponentsPageClient.tsx`
- Possibly create: `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
- Test: `tests/vitest/component-library-manager-ui.test.tsx`

**Implementation notes:**
- Keep route file thin.
- Use `WorkshopCollectionLayout`.
- Use `SearchInput` via the layout.
- Use `HeaderIconToolbar` for filter/group/add controls, but do not wire destructive actions yet.
- Show left facet panel, center table/list, optional right inspector.
- Use seed items through adapter if DB loading is not in scope for Phase 1.
- Remove or replace placeholder footer copy in the route file.
- In read-only mode, hide or disable mutation actions with clear copy.
- If `HeaderIconToolbar` does not support Sort/View, either extend the shared primitive safely or explicitly defer Sort/View in the UI; do not hand-roll one-off toolbar buttons.
- If `WorkshopCollectionLayout` cannot support independently scrollable manager panes, add a manager-owned inner pane layout while preserving the shared 38px search/toolbar rhythm.

**Acceptance criteria:**
- Placeholder-only “shell pending workflow” feel is gone from visible page content.
- Route-level test asserts `Component library shell` and `Content pending approved workflow` are absent.
- Search filters item rows.
- Supplier/category/health facets are visible.
- Selecting a row opens read-only inspector.
- Default view is table/list, not card grid.
- No `Add to estimate` primary action appears on the global manager route.

## Phase 2 — Read-only detail inspector

### Task 2.1: Build read-only detail inspector

**Objective:** Let users inspect price/source/category/supplier details without leaving the list.

**Files:**
- Create: `src/components/workshop/component-library-manager/ComponentLibraryInspector.tsx`
- Test: `tests/vitest/component-library-manager-ui.test.tsx`

**Sections:**
- Identity
- Pricing
- Supplier/source
- Description/spec notes

**Acceptance criteria:**
- High-frequency price/source fields appear above long description.
- Edit/Duplicate are hidden or disabled in the current read-only slice unless Phase 3 persistence has been implemented.
- Delete/archive is not enabled in read-only mode.

### Task 2.2: Defer compact editor form until persistence is approved

**Objective:** Prevent fake editability in the first slice. Build this only if Phase 3 is selected or if the component is explicitly created as a non-routed pure form test artifact.

**Files:**
- Later only: `src/components/workshop/component-library-manager/ComponentLibraryEditorForm.tsx`
- Test only if the form is explicitly built as a non-routed pure artifact: `tests/vitest/component-library-manager-ui.test.tsx`

**Required fields:**
- Name
- Kind
- Category
- Unit
- Unit cost
- Supplier
- Pricing source
- Pricing date
- Confidence
- Description

**Validation:**
- Required: name, kind, category, unit.
- Numeric costs are non-negative.
- Missing price/source/date allowed, but health shows needs review.

**Acceptance criteria:**
- Current read-only route does not expose a save-capable form.
- If created later, user can create a minimal item quickly, the form is compact and sectioned, and the save callback receives normalized payload.

## Phase 3 — Persistence boundary

### Task 3.1: Extend repository safely

**Objective:** Add missing update/delete/list server-safe primitives without changing existing estimate behavior.

**Files:**
- Modify: `src/lib/repositories/cost-library-repository.ts`
- Create: `src/lib/repositories/cost-library-server-repository.ts` or refactor repository functions to accept an injected Supabase server/browser client.
- Create or modify: `src/lib/cost-library/actions.ts`
- Test: repository/action tests as appropriate in `tests/vitest/`

**Functions:**
- `listCostLibraryItemsForCurrentWorkspace()` or a server-only equivalent that derives workspace from authenticated context.
- `createCostLibraryItem(input)`
- `updateCostLibraryItem(id, input)`
- `archiveCostLibraryItem(id)` if archive/status is schema-backed, otherwise keep archive disabled.
- `deleteCostLibraryItem(id)` only if hard delete is explicitly approved and tested.
- `duplicateCostLibraryItem(id)` as action or UI-derived create

**Acceptance criteria:**
- Actions revalidate `/workshop/components`.
- Payloads use only schema-approved fields.
- Existing estimate row snapshots are not mutated.
- Server actions derive the current workspace server-side; the client never supplies trusted `workspace_id`.
- Update/duplicate/archive/delete verify the item belongs to the current workspace.
- Browser repositories are not imported into server components/actions unless explicitly made isomorphic.
- Hard delete is not exposed unless source-link/history consequences are documented and accepted.

### Task 3.2: Server-load workspace library items

**Objective:** Load real `cost_library_items` where available, with honest demo fallback if empty/unconfigured.

**Files:**
- Modify: `src/app/workshop/components/page.tsx`
- Modify: `src/components/workshop/ComponentsPageClient.tsx`
- Possibly use: `src/lib/repositories/workspace-repository.ts`

**Acceptance criteria:**
- Route passes initial items into client.
- Empty DB state is handled.
- User-facing copy says `Demo seed` or `Workspace library`, not backend/debug terms.
- Sparse demo DB data may fall back to clearly labeled demo seed rows for UX validation; do not show a weak first impression as if it were the full workspace library.

### Task 3.3: Wire create/update/duplicate/archive only after policy is approved

**Objective:** Make the manager operational once data boundary is ready.

**Files:**
- Modify: manager components from Phases 1-2
- Modify: `src/lib/cost-library/actions.ts`
- Tests: UI + action tests

**Acceptance criteria:**
- New component saves and appears.
- Edit updates selected row.
- Duplicate creates a copy.
- Archive requires confirmation and is preferred over hard delete.
- Hard delete remains unavailable unless explicitly approved.
- Errors are visible and non-destructive.
- Failed create/update/archive rolls back optimistic UI or avoids optimistic mutation entirely.
- Existing estimate row snapshots/source snapshots are not mutated.

## Phase 4 — Taxonomy/spec improvements

### Task 4.1: Add taxonomy metadata model

**Objective:** Support category/supplier/spec pivots without overcommitting to rigid MasterFormat.

**Files:**
- Depending on chosen scope:
  - `src/components/workshop/component-library-manager/taxonomy.ts`
  - Migration if persisting spec codes/tags outside `metadata`

**Recommended model:**

- `primary_category`: Archestimator/UniFormat-inspired human category.
- `kind`: material/labor/equipment/subcontract/assembly/allowance.
- `supplier`: procurement pivot.
- `metadata.masterformat_codes`: optional string array.
- `metadata.trade_tags`: optional string array.
- `metadata.performance_tags`: optional string array.

**Acceptance criteria:**
- Category and supplier remain first-class pivots.
- MasterFormat/spec code is available as a secondary filter/view, not required for every item.
- Assemblies can map to multiple spec codes later.

## Phase 5 — Advanced price review workflow

### Task 5.1: Add derived price-health queue

**Objective:** Expand the Phase 1 health indicators into an operational stale-price workflow.

**Files:**
- Modify: manager helpers/model.
- Modify: manager UI tabs/facets.
- Tests: helpers + UI.

**Rules for MVP:**
- Missing/zero price => `missing-price` unless kind is explicit allowance with known reason.
- Missing source/date => `missing-source` / `missing-date`.
- Low/empty confidence => `low-confidence`.
- Stale threshold later, because there is no approved age policy yet.

Phase 1 already implements basic `healthIssues` and Needs Review filtering. Phase 5 adds verification actions, aging thresholds, bulk workflows, and supplier quote exports.

**Acceptance criteria:**
- Needs Review view shows only risky items.
- User can open/edit each risky item.
- No automatic update to estimates is implied.

## Phase 6 — Shared sidebar/manager consolidation later

### Task 6.1: Extract common browser components only after manager is accepted

**Objective:** Avoid duplicating core search/filter/list logic while preserving different jobs.

**Files:**
- Existing: `src/components/workshop/component-library/*`
- New: `src/components/workshop/component-library-manager/*`

**Rules:**
- Sidebar remains compact insertion mode.
- Global route remains management mode.
- Shared helpers/adapters are okay.
- Do not make the global manager dispatch add-to-estimate as primary action.

## Test strategy

### Focused tests to add first

```bash
bun run test:dom -- \
  tests/vitest/component-library-manager-adapters.test.ts \
  tests/vitest/component-library-manager-helpers.test.ts \
  tests/vitest/component-library-manager-ui.test.tsx
```

Add a route/page smoke test that proves `/workshop/components` no longer shows placeholder footer copy and does not expose `Supabase` or backend/debug copy to users.

### Regression tests to preserve

```bash
bun run test:dom -- \
  tests/vitest/component-library-ui.test.tsx \
  tests/vitest/component-library-helpers.test.ts \
  tests/vitest/estimate-sheet-cost-inputs.test.tsx
```

Add or preserve a drag-start regression proving the estimate sidebar still emits both `application/x-archestimator-library-item` and `text/plain` drag data.

### Final validation

```bash
bun run type-check
bun run lint
bun run validate
bun run build
bun run test:e2e
git diff --check
```

If `bun run validate` fails due to unrelated pre-existing landing/workshop issues, report the exact unrelated blocker and still run the focused tests above.

If `bun run test:e2e` fails because an existing Next dev server is already running for the repo, either stop the existing server or run Playwright against that port, for example `PLAYWRIGHT_PORT=3000 bun run test:e2e` when the active server is on port 3000.

### Browser/visual QA required before merge

- Desktop `/workshop/components`: search, facets, table/list default, no placeholder footer copy.
- Search/no-match state with clear action.
- Category, supplier, kind, and health facet filtering.
- Inspector open state with price/source/date/confidence above long notes.
- Narrow viewport: facet collapse/usable table/inspector overlay behavior.
- Estimate workspace regression: right sidebar remains insertion-focused and add/drag insertion still works.
- Capture screenshots or browser notes; jsdom tests alone are not enough for the three-pane density decision.

## Risks

1. Dirty working tree
   - Risk: overwriting unrelated active work.
   - Control: implement in isolated branch/worktree or coordinate before editing.

2. Schema mismatch
   - Risk: UI shows fields that cannot persist.
   - Control: start with DB-field-only or store extra fields in `metadata` until migration is approved.

3. Sidebar/global confusion
   - Risk: global route becomes a giant add-to-estimate picker.
   - Control: keep table-first manager language and actions.

4. Over-rigid taxonomy
   - Risk: MasterFormat blocks practical supplier/category workflows.
   - Control: category/supplier/kind as primary pivots; spec codes secondary.

5. Silent cost propagation
   - Risk: editing library price appears to change historical estimates.
   - Control: state and implement snapshot semantics; no automatic estimate mutation.

6. Fake editability
   - Risk: the read-only first slice shows New/Edit/Duplicate/Archive controls that do nothing or save only locally.
   - Control: hide or disable mutation controls until Phase 3 persistence is implemented and tested.

7. Crowded three-pane table
   - Risk: facets + 10-12 columns + inspector exceed laptop width.
   - Control: column priority rules: always show health/name/kind/category/supplier/unit/unit cost; collapse labor/other/SKU/updated/confidence into secondary line or inspector when width is constrained.

## Definition of done for first implementation slice

- `/workshop/components` shows a compact searchable manager surface, not placeholder cards.
- User can browse by category and supplier.
- User can see price health/source/date at row level.
- User can select an item and inspect details in a drawer/panel.
- Create/edit UI shell is intentionally deferred or disabled in read-only mode with clear copy.
- Existing estimate sidebar insertion behavior still passes tests.
- Focused manager tests pass.
- Build and E2E gates pass or unrelated blockers are documented with focused tests passing.
- Browser/visual QA evidence is captured.
- `git diff --check` passes.
