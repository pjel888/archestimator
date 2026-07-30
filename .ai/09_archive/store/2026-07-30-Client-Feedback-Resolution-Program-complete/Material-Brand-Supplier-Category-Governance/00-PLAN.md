# Material Brand, Supplier, and Category Governance Plan

## Status

- Package: `CONDITIONALLY_READY`
- Implementation: `NOT_STARTED`
- Plan-creation evidence: `Q0_CONTRACT_ONLY`; the pack validator must pass before handoff.
- Planned implementation profile: `Q2_CRITICAL_CHANGE_GATE` because the work changes workspace authorization, persisted identifiers, D1 migration/backfill behavior, estimate snapshots, and authenticated UI.
- First ready unit: `UNIT-001`
- Execution model: one lead writer, serial units, no nested implementation agents. Only `UNIT-001` is initially `READY`; dependency-bound units remain `PLANNED`. Q2 completion still requires distinct read-only quality and security reviewers.
- Cross-pack order: complete this pack's product edits before `Material-Image-Upload-Consistency` edits the shared `AddComponentModal.tsx`, `EstimateSheetContent.tsx`, and `rows/cells.tsx` files.

### Current-source refresh — 2026-07-30

Current Project catalogue entries use synthetic projection identities and
folders. Only projections carrying a canonical `cost_library_items.id` may move
that Library item's `library_folder_id`; project-only rows must offer an
explicit Save to Library action before categorization. UNIT-005 now owns the
authoritative server action/D1 mutation, revision/receipt/audit result, and UI
rollback needed for that operation. Active edits overlap the estimate row
handler and mutation hook and must be preserved.

## Task Contract

### Objective and intent

Replace browser-local brand and supplier suggestions with canonical workspace-scoped entities, preserve those identities through Library and Project editing, and make category changes an explicit folder move while keeping folder membership authoritative.

The user-visible outcome is:

1. Workspace editors can create, rename, archive, restore, and deduplicate brands and suppliers from a shared master list.
2. Every new or edited material stores a canonical brand/supplier ID; labels remain denormalized display or historical snapshots, not identity.
3. A brand selected while editing a Project component survives optimistic state, D1 persistence, authoritative refetch, and Project-tab projection.
4. Direct Category cannot become free text. Library items and canonically linked Project projections move the Library item's `library_folder_id`; project-only rows must first be saved to Library. The estimate-row area move remains a separately named estimate-tree action.

### Scope, inputs, and authority

- In scope: existing `component_brands` and `component_suppliers`; lifecycle columns and indexes only where the current schema is insufficient; idempotent backfill; master CRUD/archive/restore/merge; authorization and audit; Library modal and estimate-row selector integration; Project projection; current mutable estimate snapshots; explicit Library/Project catalogue folder-move UI; non-regression separation from estimate-area movement; focused regressions and Q2 evidence.
- Authoritative inputs: `AGENTS.md`,
  `.ai/03_plans/2026-07-28/Client-Feedback-Resolution-Program/evidence/client-feedback.md`,
  current D1 migrations, current repository/actions/projector source, the
  PP-C-R assignment and correction, and this canonical plan.
- Authoritative product paths are listed per unit. Plan prose never overrides executable migrations or current source.
- Existing immutable version/audit snapshots remain historical evidence. The migration does not rewrite old `cost_library_item_versions` or issued/publication snapshots merely to modernize IDs.

### Constraints and dependencies

- Reuse `component_brands` and `component_suppliers`; do not create duplicate master tables.
- Reuse the current component-library permission and mutation/audit infrastructure. Do not add a second authorization system or a second activity ledger.
- `library_folder_id` is the category source of truth. `category` and `category_node_id` remain server-derived projections only.
- No localStorage importer, dual-write path, feature flag, staged rollout, compatibility shim, hosted proof, or deployment is part of this pack.
- The shared worktree is dirty. Preserve unfamiliar work, reread each shared file immediately before editing, and never reset, clean, stash, branch, commit, or stage.
- `migrations/0126_material_catalogue_governance.sql` is the exact currently reserved migration path. If that number exists before implementation starts, this pack is stale and must be refreshed before any migration edit.
- Current GitNexus results are stale/partial and returned no reliable process graph for the projector. Before editing each named function, refresh or use the available index, run upstream impact, and stop for a HIGH/CRITICAL warning; current-source callers remain the fallback evidence.

### Owner, capabilities, tools, and permissions

- Owner: one lead implementation agent in the current shared worktree.
- Capability class: frontier judgment for D1/data integrity and authorization; ordinary code-edit capability for bounded UI and test changes.
- Read permission: repository-wide, current Git diff/status, local D1/test artifacts, and current GitNexus index.
- Write permission during implementation: only the exact paths assigned to the active unit; one writer per shared path.
- External boundary: none for local implementation or evidence. Production deployment, paid services, destructive data loss, and unbound provider changes remain out of scope rather than implementation gates.

### Required behavior and artifacts

- One migration and focused D1 mutation layer complete the existing master tables.
- One canonical normalization rule is shared by create, rename, merge, selectors, and backfill tests.
- Server actions return authoritative entity IDs and revisions; clients never mint durable IDs.
- Every master mutation records actor, workspace, entity kind, before/after identity, and intent in the existing activity outbox/receipt boundary.
- Project projection returns brand and brand ID with supplier and supplier ID.
- Category moves update the canonical Library item's `library_folder_id` and derive labels. A Project projection may call that mutation only with its canonical Library item ID; project-only rows expose Save to Library. Estimate-tree area moves remain separate and no write path accepts independent category text.
- Focused unit/route/component/browser evidence and the Q2 aggregate are machine-readable.

### Acceptance and evidence decision

- All acceptance criteria are currently `FAIL` because implementation and executable evidence have not run.
- Every core behavior requires `TEST_TASK` evidence under standing local authorization. Source inspection or this plan alone cannot close a criterion.
- Defect cases require red-before-green reproduction where feasible: Project brand loss, local-only create, category immutability without move, cross-workspace entity IDs, archived selections, and merge/reference rewrites.

### Stop and escalation conditions

- Stop successfully only when all units are `VERIFIED`, all criteria/tests/gates are fresh `PASS`, `bun run quality:critical` aggregates `PASS`, required independent reviews approve, and no unresolved high/critical finding remains.
- Stop as `QUALITY_BLOCKED`, not `PASS`, if required evidence cannot run because of protected concurrent work after exact hashes and failures are recorded.
- Escalate only an actual destructive, credentialed, external-production, paid, or ownership boundary. Ordinary migration design, naming, deduplication, and UI choices are resolved below.

## Current Source Evidence

Observed against `HEAD 214fd2af3564c6c90d6bb46a7f2f7bd19faa811d` on 2026-07-28. Line anchors are current-source anchors and are stale if those files change.

### Existing canonical tables and persistence

- `migrations/0028_component_library_action_support.sql:9` creates `component_suppliers`; `:21` already enforces workspace/normalized-name uniqueness.
- `migrations/0028_component_library_action_support.sql:27` creates `component_brands`; `:39` carries the same uniqueness rule.
- The tables have timestamps and metadata but no explicit archive/merge lifecycle or actor columns (`migrations/0028_component_library_action_support.sql:9` and `:27`). That is the schema gap this pack may extend; it is not a reason to create replacement masters.
- `migrations/0026_component_promotion_support.sql:35` defines cost-library persistence; supplier text/ID are at `:43`-`:44` and brand text/ID at `:45`-`:46`.
- `src/lib/repositories/component-library-repository.ts:622` maps D1 rows. It resolves folder, supplier, and brand at `:632`-`:634`, retains text fallbacks at `:647` and `:668`, and emits IDs at `:648` and `:669`.
- `src/lib/repositories/component-library-repository.ts:1289` loads the dataset; current supplier and brand table reads are at `:1305`-`:1320`.
- `src/lib/repositories/component-library-repository.ts:971` synthesizes brand IDs from free text only when no persisted brands exist. This fallback is transitional behavior to delete after migration/backfill, not a second master source.
- `src/lib/component-library/component-mutation-d1.ts:1952` persists component identity; supplier/brand labels and IDs are written together at `:1953`-`:1967`.
- `src/lib/component-library/component-mutation-d1.ts:6`-`:8` imports the shared receipt helpers from `src/lib/estimates/mutation-receipts.ts`; the backing table is `estimate_mutation_receipts` from `migrations/0081_estimate_mutation_receipts.sql:4`. There is no component-specific receipt table to invent.
- Template paths already carry IDs: `src/lib/component-library/template-propagation-d1.ts:216` and `:239`, `src/lib/component-library/template-editor-actions.ts:1400`-`:1402`, and `src/lib/component-library/template-versioning-d1.ts:113`.

### Modal and row selectors

- `src/components/workshop/component-library-manager/AddComponentModal.tsx:259` normalizes labels locally and `:263` creates the current browser key.
- Local catalogue storage is read/written at `src/components/workshop/component-library-manager/AddComponentModal.tsx:319`-`:333`; local synthetic IDs are built at `:267`-`:279`.
- Base and local options merge at `src/components/workshop/component-library-manager/AddComponentModal.tsx:972`-`:1009`.
- A created local supplier/brand deliberately clears the durable ID at `src/components/workshop/component-library-manager/AddComponentModal.tsx:1601`-`:1616`; submit therefore persists nullable IDs plus free text (`:1385`-`:1391`, `:1687`-`:1705`).
- Supplier and Brand comboboxes are rendered at `src/components/workshop/component-library-manager/AddComponentModal.tsx:1991`-`:2027`.
- Inline estimate selectors commit labels rather than identity at `src/components/workshop/estimate-sheet/rows/cells.tsx:879`-`:891`, with Brand and Supplier UI at `:1027`-`:1075`.
- `src/components/workshop/component-catalogue-combobox-options.ts:23`-`:25` makes synthetic option IDs and `:68`-`:69` returns only a label.
- `src/components/workshop/EstimateSheetContent.tsx:1595`-`:1618` builds options from both canonical IDs and arbitrary row labels; `:2351`-`:2358` keeps an ID only when it looks like a UUID.

### Project projection and estimate snapshots

- `src/lib/component-library/project-component-projection.ts:49` defines projection columns and includes supplier fields but omits brand fields.
- The projection row types at `src/lib/component-library/project-component-projection.ts:101` and D1 row types at `:143` repeat that omission.
- `projectEstimateRowToLibraryItem` begins at `src/lib/component-library/project-component-projection.ts:289`; supplier ID/label are restored at `:336` and `:348`-`:349`, while no brand/brand ID is returned.
- The same mapper already preserves `imageAsset` and source metadata at `src/lib/component-library/project-component-projection.ts:342` and `:374`-`:386`, proving the source snapshot is available at this boundary.
- Estimate editing already writes brand, brand ID, supplier, and supplier ID into the mutable source snapshot at `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts:489`-`:524`.
- Optimistic mutation retains those values at `src/hooks/use-estimate-row-mutations.ts:356`-`:362` and `:401`-`:407`.
- D1 read hydration restores brand/brand ID from the source snapshot at `src/lib/estimates/estimate-tree-read-repository.ts:500` and `:532`-`:533`.
- The Project editor submits all four fields at `src/components/workshop/EstimateSheetContent.tsx:2245`-`:2265` and persists them through `updateRowItem` at `:2301`-`:2313`. The authoritative Project projection, not the edit mutation, is the observed loss point.

### Category source of truth and move behavior

- `src/lib/component-library/category-folders.ts:29`-`:72` derives category path/name/ID from folder hierarchy; `:66`-`:70` selects the leaf folder.
- Direct Category is intentionally read-only and folder-derived at `src/components/workshop/component-library-manager/AddComponentModal.tsx:1982`-`:1989`.
- `src/lib/component-library/folder-mutation-d1.ts:426`-`:441` moves a Library item by changing `library_folder_id` and deriving denormalized category values.
- `src/lib/component-library/actions.ts:1695`-`:1713` exposes the authorized move action.
- Current drag movement and optimistic rollback live at `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:2926`-`:2974` and `src/components/workshop/component-library/component-folder-move-coordinator.ts:44`-`:114`.
- Project rows already have an authorized tree move at `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts:1191`-`:1252` and `src/lib/estimates/actions.ts:3141`-`:3169`.

### Shared-worktree and graph state

- The original scoped status is stale: `use-estimate-row-handlers.ts` and `use-estimate-row-mutations.ts` now contain active unfamiliar edits that overlap later units.
- Concurrent untracked migrations currently occupy `0124` and `0125`; they are unfamiliar work and must remain untouched.
- GitNexus is indexed but stale and did not resolve `projectEstimateRowToLibraryItem` impact. Treat impact as `UNKNOWN` until the implementation session refreshes context; do not infer LOW risk from missing graph results.

## Scope

### Included

- Extend, never duplicate, `component_brands` and `component_suppliers`.
- Workspace-scoped create, rename, archive, restore, and merge/deduplicate operations.
- Durable IDs in Library items, price options where supported, mutable estimate rows/source snapshots, Project projections, and current template/edit flows.
- Authorized activity/audit events and idempotent mutation receipts.
- Migration/backfill plus a direct fix-forward repair operation for future inconsistent live references.
- Active/archived selector behavior in Add/Edit Component and Page 001 row editing.
- Explicit Library/Project catalogue folder moves plus a non-regression boundary for the separately named estimate-area move.
- Q2 migration, denial, concurrency, UI, accessibility, browser, mutation, and review evidence.

### Non-goals

- A new category master table, taxonomy engine, procurement system, contact directory, or supplier pricing marketplace.
- Rewriting immutable historical versions, issued snapshots, or audit events to current names.
- Hard deleting master entities from user UI.
- Importing old localStorage suggestions. Suggestions never persisted to D1 are discarded when the old code is removed.
- Free-text category editing or keeping a category/folder dual-write contract.
- Cross-workspace master sharing.
- Changes to public routes, deployment, production D1, R2, Supabase, or unbound providers.
- Broad redesign of the Library tree or estimate sheet.

## Requirements

### `DATA-001` - Existing masters become complete governance entities

`component_brands` and `component_suppliers` remain canonical. They support stable IDs, canonical names/normalization, `active|archived|merged` lifecycle, archive/restore metadata, merge target, actor timestamps, and workspace-aware indexes without duplicate master tables.

### `DATA-002` - IDs become current editable identity

All newly created or edited components/rows store canonical IDs. Labels are server-derived current display values or immutable historical snapshots. Missing/merged IDs are resolved or rejected server-side; clients cannot submit a cross-workspace or wrong-kind ID.

### `DATA-003` - Migration and fix-forward reconcile current data

The migration deterministically backfills masters and unambiguous current references, adds typed estimate-row `brand_id`, preserves immutable history, and supplies an idempotent repair/merge path for current inconsistent references. Applying the migration twice or retrying a receipt cannot duplicate entities or reference rewrites.

### `SEC-001` - Permissions and audit are explicit

Workspace viewers may read linked active/archived names but cannot mutate. Editors/admins may create, rename, archive, and restore. Only workspace admins/owners may merge identities because it rewrites broad references. Every accepted or denied mutation remains tenant-scoped; accepted mutations emit actor-attributed activity and a replay-safe receipt.

### `REQ-001` - Modal selectors use canonical entities

Add/Edit Component brand and supplier create/select flows call server actions, receive IDs, surface duplicate/archive conflicts, and remove all localStorage/synthetic-ID behavior.

### `REQ-002` - Page 001 row selectors use canonical entities

Inline Brand and Supplier edits select or create canonical IDs, persist label plus ID through optimistic mutation, and restore both after D1 refetch. Selectors load only when opened/focused and do not add an authenticated-route mount request.

### `REQ-003` - Project projection preserves brand identity

Project projection SQL, types, D1 mapping, and `projectEstimateRowToLibraryItem` return brand/brand ID symmetrically with supplier/supplier ID. A Project edit remains visible after authoritative reload.

### `UX-001` - Category is moved, never independently edited

Direct Category remains a derived read-only display with an adjacent `Move to category...` action. Library items and Project projections with a canonical Library item ID call the authorized component-folder move for that canonical identity. Project-only rows show Save to Library instead of a category mutation. The estimate sheet keeps a separately labelled `Move row to area...` action that changes only estimate-tree placement. Success updates only the intended authoritative parent; denial/failure rolls back optimistic UI and restores focus.

## Decisions

### `DEC-AUTO-001` - Reuse the 0028 masters

No new brand/supplier master tables are allowed. Lifecycle and actor fields are added to the existing tables because current constraints do not represent archive or merge state.

### `DEC-AUTO-002` - Normalize once on the server

Create, rename, merge, and backfill tests use one D1-portable normalization rule: trim leading/trailing ASCII whitespace, collapse each ASCII whitespace run to one space, and lowercase ASCII `A-Z`; punctuation and non-ASCII code points are preserved. The TypeScript helper and migration SQL expression must pass the same fixture table before either is accepted. The database unique key stores that result. UI may trim for presentation but does not define identity.

### `DEC-AUTO-003` - Archive instead of delete

Archived entities disappear from new choices but remain resolvable for linked records and may be restored. Creating an archived duplicate returns the archived entity and a restore action; it does not create a second row.

### `DEC-AUTO-004` - Merge is a transactional admin operation

Merge chooses an active survivor in the same workspace/kind, rewrites current live references, marks the duplicate `merged` with `merged_into_id`, changes its normalized key to an ID-based tombstone, emits one audit event/receipt, and never rewrites immutable versions. Cross-workspace, cross-kind, self, cyclic, or stale-revision merges fail closed.

### `DEC-AUTO-005` - Current labels follow IDs; history stays snapshot-based

Current Library/Project selectors display the canonical master name when an ID resolves. Mutable source snapshots are updated on authorized edits/backfill. Immutable component versions and issued snapshots retain the name captured when produced.

### `DEC-AUTO-006` - Add typed estimate-row brand identity

The final current `estimate_row_items` schema gains nullable `brand_id`, symmetric with `supplier_id`. Source snapshot `brandId` remains the portable snapshot field, but typed D1 reads/writes and projection no longer depend exclusively on JSON.

### `DEC-AUTO-007` - Folder membership remains category truth

No action accepts free-text category as an independent mutation. Canonical Library item moves write `library_folder_id` and derive denormalized category fields from the component-folder hierarchy. A Project projection can invoke that move only when it carries the canonical item ID; otherwise it must be explicitly saved to Library. Estimate-row area moves change only estimate-tree parent/position, use the separate `Move row to area...` label, and never derive or mutate Direct Category.

### `DEC-AUTO-008` - Fix forward without a compatibility lane

The migration handles current rows; the new mutation boundary rejects new label-only writes. A dedicated admin repair/merge function resolves later detected inconsistencies. The old localStorage path and repository synthetic-brand fallback are deleted in the same implementation slice.

## Target Data and Mutation Contract

### Master entity shape

Both existing tables gain equivalent fields:

- `lifecycle_state TEXT NOT NULL DEFAULT 'active' CHECK (...)` with `active`, `archived`, and `merged`.
- `archived_at TEXT`, `archived_by TEXT`, `merged_into_id TEXT`, `created_by TEXT`, and `updated_by TEXT`.
- A workspace/lifecycle/sort/name index for active selector reads and a merge-target index.
- The existing `(workspace_id, normalized_name)` uniqueness remains. A merged tombstone uses `merged:<entity-id>` so the survivor owns the canonical key.

### Mutation inputs and results

- Every command accepts `intentId`, entity kind, workspace-derived context, expected `updatedAt`, and only the fields needed by that command.
- Create returns an existing active exact-normalized entity as an idempotent success; an archived match returns a typed conflict requiring explicit restore.
- Rename rejects active or archived collisions and stale revisions.
- Archive leaves references intact. Restore rejects a canonical-key conflict.
- Merge accepts survivor and duplicate IDs plus both revisions and returns counts by rewritten surface.
- Results include authoritative entity data and revision. UI updates from the result, then invalidates/reloads the component-library dataset.

### Backfill order

`migrations/0126_material_catalogue_governance.sql` performs one atomic, tested sequence:

1. Extend existing master tables and final `estimate_row_items` with lifecycle/actor/merge fields and nullable `brand_id`.
2. Keep valid existing master IDs and names as primary candidates.
3. Collect non-empty current labels/IDs from `cost_library_items`, supplier-bearing price options, current estimate row columns/source snapshots, and current template/edit records.
4. Group candidates by workspace, kind, and the canonical D1-portable normalization. The SQL recursive CTE iterates code points, treats `9`-`13` and `32` as collapsible ASCII whitespace, and maps only `65`-`90` to `97`-`122`; fixtures must prove byte-for-byte parity with the TypeScript helper. Prefer an existing master ID; otherwise prefer a valid referenced UUID; otherwise generate one D1 UUID-shaped ID once in a temporary map.
5. Insert one master per group, then update current cost-library, price-option, estimate-row typed columns, mutable source snapshots, and current template references to survivor IDs.
6. When multiple old IDs normalize together, rewrite current references to the survivor and retain merged tombstones for old persisted master IDs.
7. Leave empty labels/invalid orphan IDs unassigned rather than inventing names. The repository surfaces those rows as `Unassigned`, and the next authorized edit must select/create a canonical entity.
8. Add indexes only after rewrites and assert no cross-workspace master reference, duplicate active normalized key, or resolvable label-only current row remains.

### Audit contract

- Reuse the current `src/lib/estimates/mutation-receipts.ts` helper and `estimate_mutation_receipts` table already used by component-library mutations for replay protection; do not add a second receipt table.
- Reuse `activity_event_outbox` for accepted `catalogue_entity.created|renamed|archived|restored|merged` events.
- Event payload includes workspace, actor, entity kind/ID, old/new canonical names, merge survivor/duplicate, rewritten counts, intent ID, and timestamp; it excludes secrets and raw request bodies.
- Denials are tested and remain observable through existing structured server error/log behavior; no sensitive cross-workspace name is returned.

## UX Contract

### Master management

- Brand and Supplier tree sections expose accessible `Manage brands` and `Manage suppliers` actions for editors.
- The manager dialog supports search, active/archived filter, create, rename, archive/restore, and admin-only merge.
- Archive and merge confirmations name the affected entity and linked-current-record count. They do not claim immutable history will be rewritten.
- Duplicate create/rename focuses the existing entity; archived duplicate offers Restore.

### Add/Edit Component

- Remove local storage keys, synthetic `local-*` IDs, local delete controls, and label-only submit branches.
- Selecting an existing entity commits its ID/name immediately.
- Creating shows pending state, calls the server once with a retained intent ID, then commits the returned ID/name. Failure preserves typed text and exposes Retry; Save is blocked while identity creation is unresolved.
- Archived linked entities render as `Name (archived)` in edit mode but are not offered for new selection.

### Page 001 inline rows

- Opening Brand/Supplier lazily uses the canonical dataset already available to the estimate library surface; no new request runs on row mount.
- Create/select commits ID and label in one row mutation. Optimistic state keeps both; failure restores both.
- A stale/merged selected ID resolves to the survivor from the server result before the row is considered saved.

### Move to category/folder

- Direct Category remains `aria-readonly` and displays the resolved path.
- `Move to category...` opens a keyboard-operable dialog/tree with current folder selected, search, Cancel, and Move.
- Library and canonically linked Project catalogue confirmation invoke the folder move coordinator/action with the canonical Library item identity and update the modal/list from its authoritative result. Project-only rows expose Save to Library and never pass a synthetic projection ID to the folder mutation.
- The estimate sheet retains `Move row to area...`; it never invokes the category dialog, writes `library_folder_id`, or changes the Direct Category display.
- On failure, the original parent/path is restored, an alert names the recoverable failure, and focus returns to the opener.

## Dependency DAG

```text
UNIT-001 Schema + backfill
    -> UNIT-002 Master actions + repository + audit
        -> UNIT-003 Modal/master management integration
        -> UNIT-004 Row IDs + Project projection persistence
        -> UNIT-005 Explicit category/folder move UX
UNIT-003 + UNIT-004 + UNIT-005
    -> UNIT-006 Cross-entry Q2 evidence and reviews
```

All units are assigned to the single lead writer. Dependencies are execution order, not approval gates.

## Unit Contracts

### `UNIT-001` - Extend and backfill canonical masters

- Goal: add only the missing lifecycle/actor/merge and typed brand fields, then reconcile current references atomically.
- Depends on: none.
- Owned paths:
  - `migrations/0126_material_catalogue_governance.sql` (new)
  - `tests/vitest/material-catalogue-governance-migration.test.ts` (new)
  - `tests/vitest/component-library-brand-schema.test.ts`
- Read-only dependencies: `migrations/0026_component_promotion_support.sql`, `migrations/0028_component_library_action_support.sql`, final estimate-row rebuild migrations, current template tables, and current D1 migration runner.
- Implementation boundary: schema/backfill SQL and migration characterization only; no UI or server action edits.
- Acceptance evidence: apply on empty and representative pre-migration SQLite/D1 fixtures; rerun migration checker; assert survivor mapping, lifecycle constraints, typed `brand_id`, current-reference rewrites, preserved historical snapshots, and no duplicate/cross-workspace references.
- Recovery: before any bound D1 application, repair `0126` in place. After any application, never edit it; add the next numbered fix-forward migration and refresh this pack.
- Completion signal: `TEST-001` and migration checker pass with machine-readable output.

### `UNIT-002` - Add master mutations, permissions, and audit

- Goal: expose replay-safe workspace-scoped CRUD/archive/restore/admin-merge and return authoritative masters.
- Depends on: `UNIT-001`.
- Owned paths:
  - `src/lib/component-library/catalogue-governance-d1.ts` (new)
  - `src/lib/component-library/catalogue-governance.ts` (new shared types/normalization)
  - `src/lib/component-library/actions.ts`
  - `src/lib/repositories/component-library-repository.ts`
  - `tests/vitest/component-library-catalogue-governance.test.ts` (new)
  - `tests/vitest/component-library-actions-revalidation.test.ts`
- Read-only dependencies: current workspace-role helpers, shared `estimate_mutation_receipts`, `activity_event_outbox`, component mutation synchronization, and template repositories.
- Implementation boundary: server/D1 mutation and dataset behavior. Do not modify modal, estimate row, or category UI.
- Acceptance evidence: editor/admin/viewer matrix, cross-workspace/wrong-kind denial, stale revision, idempotent replay, archive-linked display, merge rewrites/counts, audit payload redaction, and repository removal of synthetic brand fallback.
- Recovery: every command is one D1 transaction/receipt. Failed guards produce no mutation/event; retry reuses `intentId`.
- Completion signal: `TEST-002` passes and repository returns only persisted master IDs plus explicit unassigned fallbacks.

### `UNIT-003` - Integrate modal and master management

- Goal: replace local browser catalogue state with server-backed masters and management UI.
- Depends on: `UNIT-002`.
- Owned paths:
  - `src/components/workshop/component-library-manager/AddComponentModal.tsx`
  - `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
  - `src/components/workshop/component-library-manager/CatalogueEntityManagerDialog.tsx` (new)
  - `src/components/workshop/component-library/index.tsx`
  - `tests/vitest/library-add-component-modal-a11y.test.tsx`
  - `tests/vitest/component-library-ui.test.tsx`
- Read-only dependency: `src/components/ui/creatable-combobox.tsx`; retain its generic API unless an actual blocker is proven.
- Implementation boundary: master UI/create/select/manage behavior only. Image upload code in the modal belongs to the C2 pack and must not be changed here.
- Acceptance evidence: red-before-green localStorage case, canonical ID create/select, duplicate/archive/restore/merge states, viewer denial, pending/retry, focus and live-region behavior, and no `local-*` or catalogue storage key remains.
- Recovery: failed create/rename preserves text and intent; server state is authoritative after invalidation. No browser-local fallback is restored.
- Completion signal: `TEST-003` passes and the old storage/synthetic-ID scan returns no product matches.

### `UNIT-004` - Persist row IDs and Project brand projection

- Goal: make inline Brand/Supplier identity durable and restore brand through authoritative Project projection.
- Depends on: `UNIT-002`.
- Owned paths:
  - `src/lib/component-library/project-component-projection.ts`
  - `src/components/workshop/component-catalogue-combobox-options.ts`
  - `src/components/workshop/estimate-sheet/rows/cells.tsx`
  - `src/components/workshop/EstimateSheetContent.tsx`
  - `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts`
  - `src/hooks/use-estimate-row-mutations.ts`
  - `src/lib/estimates/actions.ts`
  - `src/lib/estimates/estimate-tree-read-repository.ts`
  - `tests/vitest/project-component-projection.test.ts`
  - `tests/vitest/project-component-projection-d1.test.ts`
  - `tests/vitest/estimate-sheet-actions-authz.test.ts`
- Implementation boundary: Brand/Supplier fields and projection only. Do not alter image upload code in `rows/cells.tsx` or `EstimateSheetContent.tsx`.
- Acceptance evidence: brand/supplier ID create/select, optimistic rollback, D1 typed/source snapshot writes, Project projection SQL/type/mapper parity, refetch persistence, archived/merged resolution, and cross-workspace denial.
- Recovery: optimistic row state rolls back label and ID together; retry uses the same row mutation coordinator and server result.
- Completion signal: `TEST-004` passes with a regression that fails against the current brand-omitting projector.

### `UNIT-005` - Add explicit move-to-category workflow

- Goal: expose component-folder movement without making category editable, while keeping estimate-area movement visibly and behaviorally separate.
- Depends on: `UNIT-002`.
- Owned paths:
  - `src/components/workshop/component-library-manager/MoveComponentCategoryDialog.tsx` (new)
  - `src/components/workshop/component-library-manager/AddComponentModal.tsx`
  - `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx`
  - `src/components/workshop/component-library/component-folder-move-coordinator.ts`
  - `src/lib/component-library/actions.ts`
  - `src/lib/component-library/folder-mutation-d1.ts`
  - `src/lib/component-library/project-component-projection.ts`
  - `tests/vitest/component-library-folder-mutation-d1.test.ts`
  - `tests/vitest/library-add-component-modal-a11y.test.tsx`
  - `tests/vitest/component-library-ui.test.tsx`
- Read-only non-regression dependencies: `src/components/workshop/EstimateSheetContent.tsx` and `tests/vitest/estimate-component-drag.test.tsx` for the separately labelled estimate-area move.
- Implementation boundary: explicit trigger/dialog, canonical Library identity resolution, revision/receipt/audit-aware folder mutation, and authoritative Library/canonically linked Project integration. Do not create project-row category storage, pass synthetic projection IDs, change category derivation, or route category changes through estimate-row movement.
- Acceptance evidence: Library and Project catalogue folder move success/rollback/permission, synthetic-folder denial, derived-path refresh, keyboard navigation, focus return, Direct Category remains read-only, and estimate-area movement changes only tree placement.
- Recovery: existing optimistic coordinators restore the prior parent on failure; a retry starts from the authoritative current parent.
- Completion signal: `TEST-005` passes and no independent category input/action exists.

### `UNIT-006` - Reconcile cross-entry Q2 evidence

- Goal: prove the complete migration, permission, selector, projection, category, accessibility, and shared-worktree contract.
- Depends on: `UNIT-003`, `UNIT-004`, `UNIT-005`.
- Owned paths:
  - `e2e/material-catalogue-governance.spec.ts` (new)
  - focused tests listed in `TEST-001` through `TEST-005` when evidence exposes a missing assertion
  - task-owned files only for repairs; quality artifacts are generated under `artifacts/quality/`
- Implementation boundary: evidence and repairs only; no unrelated cleanup or gate weakening.
- Acceptance evidence: full command set below, fresh GitNexus change detection, independent quality review, distinct security/data-boundary review, and aggregate Q2 `PASS`.
- Recovery: rerun the narrowest invalidated command after a repair, then rerun the Q2 aggregate. Preserve inherited failures with exact attribution.
- Completion signal: `TEST-006`, `GATE-Q2`, and every criterion are `PASS`; all units become `VERIFIED`.

## Acceptance Criteria

### `AC-001` - Canonical lifecycle and backfill

Empty and representative legacy databases migrate once to valid existing masters, lifecycle fields, typed estimate brand IDs, and deduplicated current references; rerun/repair evidence proves no duplicate or cross-workspace mapping.

### `AC-002` - Authorized replay-safe governance

Role, tenant, stale-revision, idempotency, archive/restore, merge, and audit cases execute with fail-closed results and no partial rewrite.

### `AC-003` - Modal master parity

Add/Edit Component uses only server-returned IDs, preserves retryable input, supports management, and contains no localStorage/synthetic master path.

### `AC-004` - Inline and Project persistence

Page 001 create/select stores label+ID and a Project brand edit survives optimistic update, D1 reload, projection, and reopening.

### `AC-005` - Category move truth and accessibility

Library and canonically linked Project catalogue journeys change the canonical Library item's `library_folder_id`, derive displayed category, rollback failures, meet keyboard/live-region/focus requirements, and never accept category text or synthetic projection IDs. Project-only rows expose Save to Library. The separately labelled estimate-area journey changes only estimate-tree placement and leaves Direct Category unchanged.

### `AC-006` - Q2 completion

Static, focused, migration, Worker-applicable, browser/device, accessibility, mutation, coverage, independent review, security review, and aggregate artifacts are fresh and green with no skipped/flaky/high-risk result.

## Tests and Exact Evidence Commands

All commands run serially from the repository root after checking host memory and confirming no other heavy command is active.

### `TEST-001` - Migration/backfill

```powershell
bun x vitest run tests/vitest/material-catalogue-governance-migration.test.ts tests/vitest/component-library-brand-schema.test.ts --maxWorkers=1 --reporter=json --outputFile=artifacts/quality/material-catalogue-migration.json
bun run dev:check-d1-migrations
```

Expected: exit `0`; JSON has zero failed/skipped tests; empty and legacy fixtures pass; migration checker includes `0126_material_catalogue_governance.sql` with no ordering/schema error.

### `TEST-002` - Server governance and denial

```powershell
bun x vitest run tests/vitest/component-library-catalogue-governance.test.ts tests/vitest/component-library-actions-revalidation.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1 --reporter=json --outputFile=artifacts/quality/material-catalogue-actions.json
```

Expected: exit `0`; viewer/cross-workspace/wrong-kind/stale/cyclic merge cases deny without changes; replay returns one receipt/event; merge counts and references match fixtures.

### `TEST-003` - Modal and management UI

```powershell
bun x vitest run tests/vitest/library-add-component-modal-a11y.test.tsx tests/vitest/component-library-ui.test.tsx --maxWorkers=1 --reporter=json --outputFile=artifacts/quality/material-catalogue-ui.json
rg -n "catalogue-options:|local-(brand|supplier)|localStorage" src/components/workshop/component-library-manager/AddComponentModal.tsx
```

Expected: tests exit `0`; scan exits `1` with no matches; create/retry/archive/restore/merge and accessibility assertions pass.

### `TEST-004` - Inline identity and Project projection

```powershell
bun x vitest run tests/vitest/project-component-projection.test.ts tests/vitest/project-component-projection-d1.test.ts tests/vitest/estimate-sheet-actions-authz.test.ts --maxWorkers=1 --reporter=json --outputFile=artifacts/quality/material-project-projection.json
```

Expected: exit `0`; projected item contains brand/brandId and supplier/supplierId before and after D1 refetch; optimistic failure restores both label and ID.

### `TEST-005` - Move workflow

```powershell
bun x vitest run tests/vitest/library-add-component-modal-a11y.test.tsx tests/vitest/component-library-ui.test.tsx tests/vitest/estimate-component-drag.test.tsx --maxWorkers=1 --reporter=json --outputFile=artifacts/quality/material-category-move.json
```

Expected: exit `0`; Library and Project catalogue moves call only the folder action, the estimate-area journey calls only the row move action, denied/failed moves restore the correct original parent, and Direct Category remains `aria-readonly` and unchanged by area movement.

### `TEST-006` - Browser and cross-entry regression

```powershell
bun x playwright test e2e/material-catalogue-governance.spec.ts --workers=1 --reporter=json > artifacts/quality/material-catalogue-playwright.json
```

Expected: configured browser/device projects pass without retries or skips; create Brand/Supplier, save/reload Project edit, archive-linked display, Library/Project catalogue category moves retain correct folder identity/path and keyboard focus, and an estimate-area move leaves Direct Category unchanged.

### Static, build, mutation, graph, and aggregate gate

```powershell
bun run type-check
bun run lint -- src/lib/component-library/catalogue-governance-d1.ts src/lib/component-library/catalogue-governance.ts src/lib/component-library/actions.ts src/lib/repositories/component-library-repository.ts src/lib/component-library/project-component-projection.ts src/components/workshop/component-library-manager/AddComponentModal.tsx src/components/workshop/component-library-manager/ComponentLibraryManager.tsx src/components/workshop/component-library-manager/CatalogueEntityManagerDialog.tsx src/components/workshop/component-library-manager/MoveComponentCategoryDialog.tsx src/components/workshop/component-library/index.tsx src/components/workshop/component-catalogue-combobox-options.ts src/components/workshop/estimate-sheet/rows/cells.tsx src/components/workshop/EstimateSheetContent.tsx src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts src/hooks/use-estimate-row-mutations.ts src/lib/estimates/actions.ts src/lib/estimates/estimate-tree-read-repository.ts
bun run build
bun run quality:diff-coverage
bun run test:mutation:changed
bun run quality:reviews
bun run quality:security
bun run quality:critical
git diff --check
```

Expected:

- Every command exits `0`; build emits a successful Next/OpenNext-compatible build signal.
- Changed critical branches report 100% coverage and no surviving high-risk mutant.
- `artifacts/quality/reviews.json` contains an approving independent quality reviewer who is not the author.
- `artifacts/quality/security.json` contains an approving distinct security/data-boundary reviewer and zero unresolved high/critical findings.
- `artifacts/quality/` aggregate records `Q2_CRITICAL_CHANGE_GATE` and final `PASS`, including inherited/task-owned path attribution.
- `git diff --check` prints no whitespace error.

Before each product symbol edit, run GitNexus upstream impact for that exact function/class. Before final reconciliation, run:

```text
detect_changes({scope: "compare", base_ref: "main"})
```

Expected: only planned catalogue, estimate projection, move, migration, and evidence flows appear. Any HIGH/CRITICAL or unrelated flow invalidates the current plan until reviewed and reflected here.

## Gates

### `GATE-Q2` - Critical change gate

- Status now: `FAIL` / not run.
- Requires all six tests, static/lint/build, migration checker, changed critical coverage, changed mutation, browser/device evidence, independent quality review, distinct security/data-boundary review, graph/diff reconciliation, and Q2 aggregate `PASS`.
- Missing, skipped, flaky, malformed, stale, or inherited-but-unattributed required evidence fails closed.

### Authorization boundaries

- No active `AUTH-*` boundary blocks local implementation or testing.
- This pack does not authorize deployment, production D1 execution, destructive data loss, paid services, or changes outside bound Archestimator resources.

## Risks and Controls

### `RISK-001` - Incorrect dedupe merges distinct companies

- Control: punctuation-preserving normalization, explicit admin merge, before/after linked counts, stale revisions, and no automatic fuzzy matching.

### `RISK-002` - Backfill rewrites the wrong tenant/reference

- Control: workspace in every candidate/map/join, representative collision fixtures, transaction guards, cross-workspace assertions, and fix-forward only after application.

### `RISK-003` - Archived/merged IDs disappear from existing rows

- Control: retained tombstones and linked archived reads; selectors hide them only for new choices; current references are rewritten on merge.

### `RISK-004` - Project optimistic state masks authoritative loss

- Control: D1 projector tests and browser save/reload/reopen evidence, not component-state-only assertions.

### `RISK-005` - Category becomes a second source of truth

- Control: no category mutation input, `library_folder_id`-derived display on every catalogue surface, separately named folder versus estimate-area actions, and scans/tests proving area movement never writes category fields.

### `RISK-006` - Shared-file collision with C2 or concurrent work

- Control: C1-before-C2 serialization, one writer per shared file, immediate reread, scoped status/hash capture, and stale trigger on any shared-file change.

### `RISK-007` - Broad merge synchronization misses a current surface

- Control: enumerate cost library, price options, mutable estimate rows/snapshots, current templates, Project projection, and linked estimate sync in one D1 test matrix; GitNexus/current-source caller review before implementation.

## Requirement Traceability

| Requirement | Units | Criteria | Planned evidence |
|---|---|---|---|
| `DATA-001` | `UNIT-001`, `UNIT-002` | `AC-001`, `AC-002` | `TEST-001`, `TEST-002` |
| `DATA-002` | `UNIT-002`, `UNIT-003`, `UNIT-004` | `AC-002`, `AC-003`, `AC-004` | `TEST-002`, `TEST-003`, `TEST-004` |
| `DATA-003` | `UNIT-001`, `UNIT-002` | `AC-001`, `AC-002` | `TEST-001`, `TEST-002` |
| `SEC-001` | `UNIT-002`, `UNIT-006` | `AC-002`, `AC-006` | `TEST-002`, Q2 reviews/gate |
| `REQ-001` | `UNIT-003` | `AC-003` | `TEST-003` |
| `REQ-002` | `UNIT-004` | `AC-004` | `TEST-004`, `TEST-006` |
| `REQ-003` | `UNIT-004` | `AC-004` | `TEST-004`, `TEST-006` |
| `UX-001` | `UNIT-005`, `UNIT-006` | `AC-005`, `AC-006` | `TEST-005`, `TEST-006`, Q2 gate |

## Recovery and Resume

### Unit checkpoints

- Record `git status --short`, task-owned diff hashes, current HEAD, migration list, and relevant GitNexus impact before each unit.
- A unit is not complete until its focused JSON artifact is readable and green.
- Shared paths `AddComponentModal.tsx`, `EstimateSheetContent.tsx`, and `rows/cells.tsx` are reread before each patch and released before C2 starts.

### Failure recovery

- Migration fixture failure: discard only the un-applied task edit through a new `apply_patch`; never reset shared state. Once applied to any bound database, write a new numbered fix-forward migration.
- Mutation guard failure: the D1 transaction/receipt must leave zero partial rows/events; fix the guard and retry with the retained intent.
- Optimistic UI failure: restore the prior label+ID or parent from the mutation coordinator, retain user input, and offer Retry.
- Concurrent unfamiliar edit: stop writing that shared file, capture its new diff/hash, re-read, and rebase the planned patch manually without overwriting.
- Required evidence failure: fix the root cause, rerun the narrowest invalidated layer, then rerun Q2. Do not weaken coverage, mutation, browser, or reviewer requirements.

### Resume state

- Goal: canonical workspace material entities, durable Project identity, folder-derived categories.
- Next unit: `UNIT-001`.
- Active decisions: `DEC-AUTO-001` through `DEC-AUTO-008`.
- Active authorization boundaries: none.
- Cross-pack sequence: finish C1 product edits and focused evidence, then refresh C2 shared-file anchors before C2 `UNIT-001`.

## Stale Triggers

Refresh this pack before implementation if any of these occur:

1. `migrations/0126_material_catalogue_governance.sql` is allocated or the final estimate-row schema changes.
2. `component_brands`, `component_suppliers`, cost-library supplier/brand columns, mutation receipts, or activity outbox schemas change.
3. Any shared modal, row selector, estimate mutation, Project projector, folder move, or template path named above changes.
4. The C2 pack is implemented first or edits a shared file.
5. GitNexus refresh reports a HIGH/CRITICAL or previously unknown caller/flow.
6. The Q2 policy, validation matrix, plan-pack schema, or exact quality commands change.
7. A production/bound D1 has already applied migration `0126`.

## Stop Condition

Stop only when the implementation has one canonical workspace master system, no browser-local master identity path, durable brand/supplier IDs across Library and Project refetch, explicit Library/Project catalogue folder movement with `library_folder_id`-derived categories, a separate estimate-area action that cannot mutate Direct Category, fresh Q2 `PASS` evidence, required independent approvals, and no unresolved high/critical risk. Do not deploy or claim hosted behavior from this local pack.
