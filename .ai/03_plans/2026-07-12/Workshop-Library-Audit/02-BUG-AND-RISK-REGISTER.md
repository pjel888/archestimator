# 02 — Workshop Library Bug & Risk Register

> Every entry has `file:line` evidence from current source (2026-07-12).
> Severity: **P1** = fix before first users; **P2** = fix soon / real bug with
> bounded blast radius; **P3** = cleanup / hardening / minor.
>
> No tests were run (User Test Authorization Gate). Where a bug warrants a test,
> a `TEST_PROPOSAL` (named risk + exact command) is recorded for explicit owner
> authorization.

## P1 — fix before first users

### BUG-P1-01 — direct-upload authz gap (viewers can upload)

- **Location:** `src/app/api/component-library/attachments/direct-upload/route.ts:486-488,499-501`
- **What:** POST (create session) and PUT (upload bytes) only check
  `if (profile?.id && profile.id !== currentUser.userId) return 403`. They do
  **not** call `canManageLibrary` / `isWorkspaceEditorInD1`.
- **Impact:** any logged-in member who resolves to the default workspace —
  including a `viewer` or suspended-role member — can reserve upload sessions
  and push attachment objects to R2, bypassing the editor gate enforced by the
  sibling `attachments/route.ts` and `images/route.ts`. Since
  `component-attachment` is the virus-scan surface, this also widens the upload
  surface for files that later require scan overrides.
- **Recommended surface:** add `canManageLibrary()` check before
  `createSignedUpload`/`uploadToCloudflareR2` (mirror `attachments/route.ts`).
- **Proof class:** source inspection. `TEST_PROPOSAL`: authz — attempt a
  direct-upload `create` as a workspace viewer; expect 403 (currently succeeds).

### BUG-P1-02 — non-atomic upload record writes strand R2 orphans

- **Location:** `src/lib/uploads/upload-records.ts:90-216` (`recordUploadAsset`)
- **What:** `upload_sessions`, `upload_assets`, `upload_events` are 3
  sequential non-transactional INSERTs. A D1 failure between them leaves an
  orphan `finalized` session with no asset row — and (in the POST attachments
  path) an orphan R2 object. The cleanup job keys off
  `upload_assets.status='deleted'` and
  `upload_sessions.status IN (reserved/failed/expired/deleted)`, so a
  `finalized` session with no asset is **never cleaned**.
- **Impact:** R2 orphans + dangling sessions accumulate under any D1 write
  hiccup. Affects `attachments/route.ts` POST and `images/route.ts` POST.
- **Recommended surface:** wrap the 3 inserts in D1 `batch()`, or add a
  compensating delete of the session/asset on partial failure.
- **Proof class:** source inspection. `TEST_PROPOSAL`: simulate a mid-sequence
  D1 failure and assert cleanup eligibility.

## P2 — real bugs, bounded blast radius

### BUG-P2-01 — `useTemplateEditor.run` optimistic-update race

- **Location:** `src/components/workshop/library/template-editor/use-template-editor.ts:90-119`
- **What:** `run` captures `previous` via closure **outside** the setState
  updater. If two mutations overlap before the first commits, the second's
  rollback target is stale → clobbers the first mutation's optimistic change on
  failure.
- **Impact:** visible only under fast double-edits; rollback to wrong snapshot.
- **Recommended surface:** capture the snapshot inside the updater, or queue
  mutations.

### BUG-P2-02 — render-phase derived setState (3 sites)

- **Locations:**
  - `use-template-editor.ts:57-60`
  - `EditComponentDrawer.tsx:77-81`
  - `TemplateEditorSheet.tsx:119-127` (`TemplateEditableRow`)
- **What:** setState called during render guarded by an id/reference inequality
  check. React tolerates this (id-guard prevents infinite loop), but it's flagged
  by react-doctor-style linters and is fragile.
- **Recommended surface:** move to `useEffect`/`useMemo` keyed on the id/ref.

### BUG-P2-03 — `createCostLibraryComponent` non-atomic multi-statement

- **Location:** `src/lib/component-library/actions.ts:1294-1384`
- **What:** INSERT item → looped `upsertComponentPriceOptionInD1` (each its own
  statements) → UPDATE `active_price_option_id` → `insertComponentVersion`, no
  transaction. A mid-sequence failure leaves a partial component (item + some
  price options, no version, possibly stale `active_price_option_id`). Same
  pattern in `updateCostLibraryComponent`,
  `upsertCostLibraryComponentPriceOption`,
  `changeCostLibraryComponentLifecycleState`. Template-duplication paths
  acknowledge this and compensate; component paths do not.
- **Recommended surface:** wrap multi-statement sequences in D1 `batch()` with
  compensating deletes, mirroring `insertTemplateIntoTemplate`.

### BUG-P2-04 — route-state write bypasses Next router

- **Location:** `src/components/workshop/component-library-manager/ComponentLibraryManager.tsx:2365-2374, 2400-2408`
- **What:** `?component=` written via raw `window.history.pushState/replaceState`
  + internal `componentRouteStateVersion` counter. Bypasses Next's router, so
  `useSearchParams` subscribers don't observe the change.
- **Impact:** currently compensated by the internal counter; any future
  framework subscriber sees stale `?component=` until a real navigation.
- **Recommended surface:** use `router.push`/`router.replace` from
  `next/navigation`.

### BUG-P2-05 — quota TOCTOU

- **Location:** `src/lib/component-library/actions.ts:561-578` (`assertWithinLibraryQuota`)
- **What:** COUNT-then-INSERT lets concurrent requests both pass the cap.
- **Impact:** tiny (caps are 10 000 / 2 000 / 100). Real but low.

### BUG-P2-06 — scan-override audit can detach from the override

- **Location:** `src/lib/uploads/scan-override.ts:184-191`
- **What:** conditional UPDATE commits, then `insertScanOverrideEvent` runs
  separately with no transaction. If the event INSERT fails, the override is
  live but unaudited.
- **Recommended surface:** `batch()` the UPDATE + INSERT.

### BUG-P2-07 — `finalizeUploadSessionAsset` can strand a session

- **Location:** `src/lib/uploads/direct-upload-records.ts:493-563`
- **What:** session flipped to `finalized` **before** the asset INSERT. If the
  asset INSERT fails, session is `finalized` with no asset; a retry hits the
  `status === 'finalized'` branch (`:456-464`), finds no existing asset, throws
  → permanently stuck, object orphaned in R2.
- **Recommended surface:** insert the asset first, then flip the session; or use
  `batch()`.

### BUG-P2-08 — non-constant-time secret compare on internal job routes

- **Locations:** `src/app/api/internal/upload-scan/route.ts:42`,
  `src/app/api/internal/upload-cleanup/route.ts:47`
- **What:** `authHeader === \`Bearer ${secret}\`` (non-constant-time). Low-risk
  (secret isn't user-supplied) but a best-practice miss.
- **Recommended surface:** `crypto.timingSafeEqual`.

### BUG-P2-09 — image GET has no per-object capability check

- **Location:** `src/app/api/component-library/images/route.ts:174-193`
- **What:** GET only resolves workspace + checks `parsedPath.workspaceId !==
  workspace.id`. Any member of workspace X can GET any image under `X/...` by
  guessing object keys (no editor gate, no ownership check). Cross-workspace is
  blocked; within-workspace enumeration is possible.
- **Impact:** likely acceptable (images aren't secret within a workspace), but
  confirm the threat model.

### BUG-P2-10 — `recordAttachmentDownloadIssued` failure aborts the download

- **Location:** `src/app/api/component-library/attachments/route.ts:414-415`
- **What:** if the audit INSERT fails, the user gets a 409-equivalent and the
  (valid, clean) attachment is not served. Sacrifices availability for audit
  completeness.
- **Recommended surface:** decide intended priority; treat audit failure as
  non-fatal if availability matters more.

## P3 — cleanup / hardening / minor

### BUG-P3-01 — admission-control state is per-isolate + never sweeps

- `src/lib/uploads/admission-control.ts:30-32` — module-global Maps, no
  cross-instance coordination on Workers; never sweeps expired entries (minor
  memory leak). The D1-backed durable cap is the real gate. IP from
  `cf-connecting-ip` only (collapses to `"unknown"` behind non-CF routing).

### BUG-P3-02 — upload idempotency is per-batch only

- `src/lib/cloudflare/upload-job-queue.ts:338` — `seenIdempotencyKeys` is local
  to one batch; two deliveries in different batches both execute. Underlying job
  routes are idempotent-ish, so blast radius is limited.

### BUG-P3-03 — direct-upload checksum optional at create

- `src/app/api/component-library/attachments/direct-upload/route.ts:215,266` —
  `checksumSha256` optional; finalize succeeds on R2 etag alone. Weakens the
  content-integrity story but R2 etag still binds the bytes.

### BUG-P3-04 — `isUniqueViolation` checks Postgres code in a D1 codebase

- `src/lib/workshop/group-actions.ts:54-56` — `code === "23505"` is dead
  Postgres-era code. The string-based `isDuplicateNameViolation` (`:61-70`) is
  what actually catches D1/SQLite `UNIQUE constraint failed: ...`. Confirm the
  D1 driver surfaces those messages, else duplicate-name errors surface as 500s.

### BUG-P3-05 — `INSERT OR IGNORE` that can never ignore

- `src/lib/component-library/actions.ts:991, 1614` — keyed on random UUID PK, so
  `OR IGNORE` is a no-op. Harmless noise.

### BUG-P3-06 — `lifecycleState` not app-validated

- `src/lib/component-library/actions.ts:708` (`normalizeComponentInput`) doesn't
  validate the enum; DB CHECK (`0026:50-52`) catches invalid values → surfaces
  as a generic D1 write failure rather than a clean validation message.

### BUG-P3-07 — personal-email special-casing in shared library code

- `src/lib/repositories/workspace-repository.ts:1418` —
  `context.email === "philipjonlewis@gmail.com"` branches the default workspace
  name. Smell; move to config.

### BUG-P3-08 — giant components (review velocity + TTI)

- `ComponentLibraryManager.tsx` (~2900L), `AddComponentModal.tsx` (~2370L),
  `LibraryFolderTree.tsx` (~1458L), `TemplatesBrowseManager.tsx` (~1200L) all
  carry `react-doctor-disable-next-line react-doctor/no-giant-component`. Split
  for review velocity + cold-load.

### BUG-P3-09 — multiple lazy `dynamic()` imports in one surface

- `ComponentLibraryManager.tsx:92-123` — 4 separate chunks (folder tree, add
  modal, inspector dock, edit drawer). On a cold load with all four triggered,
  that's 4 round-trips. Consider preloading inspector/drawer on first hover.

### BUG-P3-10 — `buildCatalogueOutline`/`buildCatalogueFolderMaps` cost

- `ComponentLibraryManager.tsx:488-593` — walks every item + every folder per
  invocation. Verify `useMemo` guard at the call site (folderNodes memoized at
  `:2210`; confirm outline memoization).

### BUG-P3-11 — virtualization fallback double-layout

- `ComponentLibraryManager.tsx:1029-1044` — when `useVirtualizer` returns 0
  items on first paint, a synthetic row array is constructed; double-layout on
  first mount for large lists.

## Performance findings

### PERF-01 — workspace-wide paged table scans to filter by itemIds

- `src/lib/repositories/component-library-repository.ts:327-351`
  (`collectComponentLibraryWorkspaceRowsForItems`). Pages
  `SELECT * WHERE workspace_id = ? LIMIT 1000 OFFSET n` over 6 tables
  (`cost_library_item_price_options`, `cost_library_item_variant_cost_entries`,
  `cost_library_item_versions`, `cost_library_item_price_history`,
  `cost_library_item_state_history`, `cost_library_item_variant_attachments`)
  then filters in JS. For a workspace with thousands of components this is a
  6× full-table-scan waterfall per cold load. The bounded path (`:353-369`) does
  the right thing with `WHERE item_id IN (...)`.
- **Fix:** always use the `IN (...)` path when `itemIds` is non-empty
  (`loadCurrentWorkspaceComponentRowsLibraryAppPath` always supplies
  `loadedItemIds`).

### PERF-02 — `cost_library_items` sort-scan under `lifecycle_state <> 'archived'`

- Repo runs `WHERE workspace_id = ? AND lifecycle_state <> 'archived' ORDER BY
  updated_at DESC, id ASC`. Existing
  `idx_cost_library_items_workspace_lifecycle (workspace_id, lifecycle_state,
  updated_at DESC)` can't use a range on the `<>` predicate → sort scan. No
  library index was added in `0031` or `0050`.
- **Fix:** partial index `WHERE lifecycle_state <> 'archived' ON (workspace_id,
  updated_at DESC, id)`.

### PERF-03 — `getLibraryOverviewAppPath` 12-query fan-out + unbounded discontinued scan

- `component-library-repository.ts:1713-1910` — 12 parallel D1 round-trips per
  overview render + `SELECT id ... WHERE lifecycle_state = 'discontinued'` with
  no LIMIT (`:1806-1810`). Bounded by workspace size but worth a cap.

### PERF-04 — unbounded `SELECT *` on templates

- `loadCurrentWorkspaceEstimateTemplatesAppPath:1300-1307` — all templates +
  nodes + row_items `SELECT * WHERE template_id IN (...)`, no LIMIT. Heavy at
  the 2000-template cap. Recent-templates path caps at 5; full load does not.

### PERF-05 — `searchLibraryOverview` 3 LIKE patterns per row

- `actions.ts:2914-931` — `LOWER(name) LIKE … OR LOWER(supplier) LIKE … OR
  LOWER(brand) LIKE …` (leading `%`). Result capped at 6/3 but scan cost grows
  with workspace size. Consider FTS if this surface gets heavy use.

## Data / schema drift

### DATA-DRIFT-01 — `ComponentPriceOptionRow` type vs D1 columns (VERIFY)

- `component-library-repository.ts:145-182` declares `sku`,
  `variant_description`, `package_quantity`, `dimension_length/width/height`,
  `mass`, `image_bucket/image_path`, `source_url`, `active_cost_entry_id`, etc.
  D1 `cost_library_item_price_options` (`0026:77-98`) has none of these, and no
  migration ALTERs them in. The ORDER BY uses
  `json_extract(metadata_json, '$.variantSortOrder')`, suggesting variant data
  lives in `metadata_json` JSON — but that is unconfirmed for the full column
  set.
- **Action:** confirm whether the variant feature writes/reads these via
  `metadata_json` (type is correct, columns intentionally absent) or whether the
  type is a stale aspiration (legacy Postgres
  `supabase/migrations/20260524120322_component_library_variants.sql` defines
  them as real columns). If stale, trim the type. If intended, document the
  JSON-column contract.

### DATA-02 — missing UNIQUE constraints (name uniqueness)

- `cost_library_items` — no `(workspace_id, name)` or `(workspace_id,
  library_folder_id, name)`. `estimate_templates` — no `(workspace_id, name)`.
  `cost_library_item_price_options` — no `(item_id, label)`. Folders + suppliers
  + brands DO have name uniqueness. Inconsistent → duplicate names allowed.

### DATA-03 — soft-FK orphan risks

- `upload_assets.upload_session_id` (0010:50), `upload_events.upload_session_id`
  (0010:130), `cost_library_item_variant_attachments.price_option_id` (0022:3) +
  `.item_id` (0022:4), `cost_library_items.active_price_option_id` (0026:54),
  `cost_library_items.source_estimate_row_item_id` (0026:56),
  `estimate_template_row_items.source_library_item_id` (0024:42),
  `.category_node_id` (0024:47), `.supplier_id` (0024:48),
  `estimate_row_items.source_library_item_id` (0021:4) — no FKs; can orphan
  (only workspace CASCADE clears them).

## Dead / outdated code

### DEAD-UI-01 — `TemplatePreviewDock.tsx` (component) is dead

- `src/components/workshop/library/templates-browse/TemplatePreviewDock.tsx` —
  never imported. Browse flow uses in-column `SelectedTemplatePreview`. **Keep
  `TemplatePreviewDockModel.ts`** (LIVE, consumed by `TemplateGallery.tsx:24`).

### DEAD-UI-02 — `RecentComponentCard.tsx` is dead

- `src/components/workshop/library/overview/RecentComponentCard.tsx` — exported,
  never imported. Overview tab is intentionally empty, so no host. Safe to
  remove when the Overview tab is rebuilt.

### DEAD-UI-03 — dead helper exports in `helpers.ts`

- `src/components/workshop/component-library/helpers.ts` —
  `createDefaultLibraryBundles` (:571), `expandLibraryBundle` (:600),
  `getLibraryBundleTotal` (:616), `exportLibraryItemsToJson` (:463),
  `exportLibraryItemsToCsv` (:487), `parseLibraryCsv` (:409),
  `parseLibraryJson` (:433), `groupComponents` (:169). An unwired CSV/JSON
  import/export + bundle feature set.

### DEAD-UI-04 — `buildComponentLibraryNavigationTree` dead

- `src/components/workshop/component-library/tree/buildLibraryTree.ts:486` —
  re-exported via `tree/index.ts:18` but never consumed. Sibling
  `getLibraryItemsForTreeNode` (:496) is LIVE.

### DEAD-UI-05 — `componentLibraryDatasetVersion` (verify)

- `component-library-repository.ts:2030` — `const` declared at file end; verify
  it's exported/consumed. If not, dead.

### DEAD-SCHEMA-01 — empty `component_category_nodes` + dead `*_category_node_id` columns

- `0037_remove_preloaded_component_categories.sql` purged all rows + NULLed
  references but left the table, its index, and the `*_category_node_id`
  columns on `cost_library_items`, `library_folders`, `estimate_row_items`,
  `estimate_template_row_items`. Repo still queries
  `component_category_nodes` unconditionally
  (`component-library-repository.ts:1121, 1741`). Schema-debt artifact.

### OUTDATED-01 — stale RLS comments

- `component-library-repository.ts:1958-1960` ("RLS keeps cross-workspace ids
  invisible"), `component-library/actions.ts:337` ("defense-in-depth on top of
  the RLS editor-write split"), `:2841` ("RLS-scoped"). No RLS exists — D1/SQLite
  with app-enforced `workspace_id`. Behavior correct; comments misleading.

### OUTDATED-02 — Postgres error-code check

- `src/lib/workshop/group-actions.ts:54-56` — `code === "23505"` (Postgres).
  See BUG-P3-04.

### OUTDATED-03 — `supabase/migrations` variant file

- `supabase/migrations/20260524120322_component_library_variants.sql` is the
  only place the price-option variant columns are defined as real columns. Do
  NOT re-apply; it is migration archaeology (historical provider-exit evidence).
  Relevant only to DATA-DRIFT-01 resolution.

## UX / UI notes

- **Overview tab is intentionally empty** (`LibraryOverview.tsx` returns an empty
  div, owner's request). The `LibraryOverviewSearch` (⌘K combobox) is the only
  live Overview content. `RecentComponentCard` is dead because the host was
  cleared.
- The three-tab split (Overview / Components / Templates) is well-coordinated;
  active tab is derived purely from `usePathname` (no drift). Tab strip hides on
  the template-editor sub-route.
- Facet filter + source-trust chips + freshness thresholds (90/180 days) are a
  deliberate, modern filtering design. Two parallel filter implementations exist
  (new facet model vs. legacy `filterComponents` in `helpers.ts`) — they serve
  different surfaces (workshop route vs. estimate sidebar), not duplicates.
- The component-library-manager (new) and component-library (legacy estimate
  sidebar) coexist intentionally; not duplicates.
- Accessibility is generally solid: combobox + listbox ARIA on search,
  `role="tablist"/"tabpanel"`, `aria-live` move announcements in the structure
  tree, Esc-to-close on the inspector dock. The render-phase setState sites
  (BUG-P2-02) are the main React-correctness smell, not an a11y issue.
