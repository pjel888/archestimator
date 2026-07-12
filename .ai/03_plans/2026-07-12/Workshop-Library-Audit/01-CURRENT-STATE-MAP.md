# 01 — Workshop Library Current-State Map

> Evidence-grounded map of `/workshop/library` as of 2026-07-12. Every claim has
> a `file:line` reference. Read alongside `02-BUG-AND-RISK-REGISTER.md`.

## 1. Route + server/client boundary

`src/app/workshop/library/layout.tsx` is the shared shell for all three tabs:

- `WorkshopRouteHeader` (title "Library", breadcrumbs `["Library"]`) with
  `titleSlot={<LibraryTitleBarClient/>}` and `subHeader={<LibraryTabsLayoutClient/>}`.
- `WorkshopCanvasWash` background + `LibraryTabPanel` wraps `children`.

Three tab routes, each a server component that calls `assertRouteErrorSmoke`
(`src/lib/route-error-smoke`) and renders a client surface:

| Route | Page (RSC) | Client surface | Seed data |
|---|---|---|---|
| `/workshop/library` (Overview) | `page.tsx:8` | `LibraryOverview` (`overview/LibraryOverview.tsx`) — **intentionally cleared** (returns empty div) + `LibraryOverviewSearch` (⌘K combobox, debounced `searchLibraryOverview`) | none |
| `/workshop/library/components` | `components/page.tsx:8` | `LibraryComponentsRoute` → `LibraryPageClient` → `ComponentLibraryManager` | `getCurrentWorkspaceComponentRowsLibrary({ itemLimit: 24, includeDetailGraph: false })` |
| `/workshop/library/templates` | `templates/page.tsx:17` | `TemplatesBrowsePageClient` → `TemplatesBrowseManager` | `getCurrentWorkspaceEstimateTemplatesSeed()` under `withPerfTraceRequest("workshop.library.templates")` |
| `/workshop/library/templates/[templateId]` | `templates/[templateId]/page.tsx` | `TemplateEditorClient` (sheet + structure tree + right sidebar) | server seed (see pack) |

Each route has its own `loading.tsx` + `error.tsx` (per-segment boundaries).

## 2. Tab coordination

- `library-tabs-model.ts` — pure: `getLibraryActiveTab(pathname)` →
  `"overview" | "components" | "templates"` from `usePathname`. Single source of
  truth for active tab; no state drift.
- `LibraryTabsLayoutClient.tsx` — client `role="tablist"` strip; prefetches via
  `routeRouter.prefetch` on pointer-enter/focus/click. Hides itself on the
  template-editor sub-route (`segments[0]==="templates" && segments.length>1`).
- `LibraryTabPanel.tsx` — `role="tabpanel"` with `display:contents`; drops panel
  semantics on the editor route so the editor owns its own landmark tree.
- `LibraryTitleBarClient.tsx` — breadcrumb + TEMPLATE chip + save-state indicator
  (reads `useLibraryEditorChrome` Zustand) + "Insert into estimate" button
  (editor route only). ⌘K delegates to the active surface's search.

## 3. Components tab — `component-library-manager/`

The newest workshop surface, replacing the estimate-sidebar-centric flow. All
LIVE; mounted by `LibraryPageClient.tsx`, `component-library/index.tsx`, and
`EstimateSheetContent.tsx`.

| File | Role | Notable |
|---|---|---|
| `ComponentLibraryManager.tsx` (~2900L) | catalogue card grid + dense virtualized table, query-cache coherence, route-state, detail hydration, bulk archive, folder CRUD | two reducers; `useTransition`; `useVirtualizer` (gated by `WORKSHOP_LIBRARY_COMPONENTS_VIRTUALIZATION`); receives `onLibraryItemsMutated`/`onLibraryFoldersMutated`/`onProjectPromotionSucceeded` to patch warm cache instead of `router.refresh()` |
| `LibraryFolderTree.tsx` (~1458L) | folder + component tree, drag reorder, bulk selection, context menu, view modes (default/suppliers/brand) | `reorderLibraryFolders` action |
| `AddComponentModal.tsx` (~2370L) | create/edit component modal: variants, image upload (`resizeImageForUpload`, `uploadComponentImage`), attachment upload, draft saving, duplicate detection | largest file in the audit |
| `library-folder-tree-shared.ts` | shared types/constants (`ComponentViewMode`, `ALL_COMPONENTS_FOLDER_ID`, ...) | pure |

**Route-state write pattern (verify):** `ComponentLibraryManager.tsx:2365-2374`
and `:2400-2408` write `?component=` via raw `window.history.pushState/
replaceState` then bump an internal `componentRouteStateVersion`. This bypasses
Next's router, so `useSearchParams` subscribers don't observe the change. See
`02` BUG-P2-04.

## 4. Templates tab — `library/templates-browse/`

| File | Role | Notable |
|---|---|---|
| `TemplatesBrowsePageClient.tsx` | owns warm TanStack Query cache | `workspaceEstimateTemplatesQueryKey({userId,workspaceId})` / `WORKSPACE_ESTIMATE_TEMPLATES_QUERY_KEY`; queryFn `loadCurrentWorkspaceEstimateTemplates`; dynamic-imports `TemplatesBrowseManager` |
| `TemplatesBrowseManager.tsx` (~1200L) | optimistic rename/duplicate/move/delete/rename-category with rollback; embeds `NewTemplateModal`, `InsertIntoEstimatePicker`, `EstimateRightSidebar` | preview uses in-column `SelectedTemplatePreview`, NOT `TemplatePreviewDock` |
| `TemplateGallery.tsx` | center gallery: `TemplateGalleryRow` (memoized), `SelectedTemplatePreview`, search toolbar, ⌘K | imports `buildTemplatePreviewNodeTotals` from `TemplatePreviewDockModel.ts` (the model is LIVE) |
| `InsertIntoEstimatePicker.tsx` | project → estimate picker | `listEstimateInsertTargets` → `resolveEstimateTemplateInsertTarget` → `insertEstimateTemplateIntoEstimate`; gated by `getTemplateDependencyHealth` |

## 5. Template editor — `library/template-editor/`

| File | Role | Notable |
|---|---|---|
| `TemplateEditorClient.tsx` | top-level composer | `useReducer`; lazy TanStack Query for lite component library (`workspaceComponentLibraryLiteQueryKey`, `enabled: dockRequested`); updates `useLibraryEditorChrome`; dynamic-imports `EstimateRightSidebar` |
| `TemplateEditorSheet.tsx` | center work surface: editable rows + branch nodes, drag/drop | `dragOverCount` state; `TemplateEditableRow` uses derived-state-during-render (see `02` BUG-P2-02) |
| `TemplateStructureTree.tsx` | left tree: context-menu CRUD + drag reorder | move up/down (U12 step) with `aria-live` announcements |
| `use-template-editor.ts` | optimistic editing hook centralizing tree mutations | render-phase setState + `run` race — see `02` BUG-P2-01, BUG-P1-... |

## 6. Shared library models + facet filter

- `component-facet-filter-model.ts` — pure facet model: `componentMatchesFacets`,
  `buildComponentFacetOptions`, `parseComponentFacetSearchParams`,
  `countActiveComponentFacets`. Freshness thresholds: 90/180 days.
- `component-facet-filter.tsx` — popover + applied-chip strip.
- `source-trust-model.ts` / `source-trust-chips.tsx` — pricing-freshness calc +
  trust chips + dependency health + `getLibraryCommitTrustGate`.
- `library-surface-variant.tsx` / `library-surface-class.ts` — paper/glass
  theming context + class resolver.

## 7. Older-but-live module — `component-library/`

NOT dead/duplicate. Serves the estimate sidebar; consumed via dynamic import by
the template editor and browse managers.

| File | Role | Status |
|---|---|---|
| `index.tsx` (~2900L) | legacy manager: `EstimateRightSidebar`, favorites/recents/tree-order (localStorage) | LIVE (consumed by TemplatesBrowseManager + TemplateEditorClient) |
| `helpers.ts` | formatting/search/filter/sort/group/import-export/create/staleness | partially dead exports (see `02` §Dead) |
| `tree/*` | category/supplier/brand tree used inside estimate sidebar | LIVE |
| `use-estimate-right-sidebar-state.ts` | sidebar state hooks | LIVE; optimistic-preservation pattern in `useTemplatesTabState` |
| `NewComponentForm/CommandPalette/PreviewPanel/NewTemplateModal.tsx` | modals + ⌘K palette + preview | LIVE |
| `account-preferences-client.ts` | client wrapper for account prefs | LIVE |

## 8. Read layer — `component-library-repository.ts`

Every public export calls `ensureDefaultWorkspace()` (→ `requireCurrentUserContext`)
and scopes every query by `workspace.id`. No write paths. `isUuid` guards id
inputs. All `IN (...)` clauses use `placeholders()` → `?` with bound values
(no SQL injection).

**Two collection strategies** (`component-library-repository.ts:327-369`):
- `collectComponentLibraryRowsForSelectedItems` — `WHERE item_id IN (...)`.
  Bounded, uses the `item_id` index. Correct.
- `collectComponentLibraryWorkspaceRowsForItems` — pages
  `SELECT * WHERE workspace_id = ? LIMIT 1000 OFFSET n`, then filters in JS by
  `itemIdSet`. Used for the "load all" path. Perf concern at scale (see `02`
  PERF entries).

`includeDetailGraph` gates the versions/price-history/state-history/attachments
graph (the U18 optimization) — browse surfaces skip it. Good.

**Type/schema drift to verify:** `ComponentPriceOptionRow` (lines 145-182)
declares `sku`, `variant_description`, `package_quantity`,
`dimension_length/width/height`, `mass`, `image_bucket/image_path`,
`source_url`, `active_cost_entry_id`, etc. The D1 table
`cost_library_item_price_options` (migration `0026:77-98`) has **none** of these
columns, and no later migration ALTERs them in (confirmed by grep). The query
ORDER BY uses `json_extract(metadata_json, '$.variantSortOrder')` — so variant
metadata may be stored in `metadata_json` JSON, not as columns. **This needs
confirmation**: is the variant feature wired to write/read these fields via
`metadata_json`, or is the type a stale aspiration? If the latter, the type is
misleading and should be trimmed. See `02` DATA-DRIFT-01.

## 9. Write layer — server actions

### `component-library/actions.ts`
- Every mutating action calls `ensureDefaultWorkspace()` +
  `requireCurrentUserContext()` + `assertCanManageLibrary` (→
  `isWorkspaceEditorInD1`) or `assertCanManageLibraryFolders`. Workspace scoping
  on UPDATEs is consistent: `WHERE id = ? AND workspace_id = ?`.
- `searchLibraryOverview` (`:2905-2943`) properly escapes LIKE
  (`LIKE ? ESCAPE '\\'`, strips `,()"`, escapes `\\%_`). No SQL injection.
- `assertWithinLibraryQuota` (`:561-578`) is COUNT-then-INSERT → TOCTOU
  (`02` BUG-P2-05). Caps 10 000 / 2 000 / 100, so practical impact is tiny.
- **No transactions.** `createCostLibraryComponent` is INSERT item → looped
  price-option upserts → UPDATE `active_price_option_id` →
  `insertComponentVersion`, each its own `await run(...)` (`02` BUG-P2-06).

### `template-editor-actions.ts`
- `requireTemplateEditorAccess` (→ `isWorkspaceEditorInD1`) +
  `requireWorkspaceTemplate` (workspace-scoped lookup) on every action.
  `insertTemplateIntoTemplate` verifies **both** target and source templates
  belong to the workspace (`:934-935`) — prevents cross-workspace composition.
- `moveEstimateTemplateNode` does a proper cycle check (`:598-604`).
- `insertTemplateIntoTemplate` has compensating delete of copied nodes on
  row-insert failure (`:1026-1040`) — better than the component actions.

## 10. API upload layer — `/api/component-library/**`

| Route | Methods | Authz | Storage |
|---|---|---|---|
| `attachments/route.ts` | GET/POST/DELETE | `canManageLibrary` → `isWorkspaceEditorInD1` (all 3) | R2 `component-attachments`; magic-byte MIME sniff; 20 MiB cap; `reserveUploadAdmission`; `isOwnedAttachmentPath` on delete |
| `attachments/direct-upload/route.ts` | POST(create)/PUT(upload)/POST(finalize) | **`profile.id === currentUser.userId` only** — NOT `isWorkspaceEditorInD1` | R2 single-part signed sessions; 5-min expiry; D1-backed durable capacity caps |
| `attachments/scan-override/route.ts` | POST | `canApproveUploadScanOverride` → `isPlatformAdminRole` (no workspace check — by design) | sets `scan_status='override_approved'` with expiry; checksum re-verify |
| `images/route.ts` | GET/POST/DELETE | POST/DELETE `canManageLibrary`; GET only workspace scoping (no editor gate) | R2 `component-images`; `processUploadImageToWebp` (sharp or `IMAGES` binding); 12 MiB cap |

**Scan pipeline:** component-attachment is the only `required`-scan surface;
images are `not_required`. `UPLOAD_JOBS_QUEUE` (cron-driven, not per-upload) →
`/api/internal/upload-scan` (Bearer secret, `UPLOAD_JOBS_ENABLED=1`). Internal
routes use **non-constant-time** secret compare (`02` BUG-P2-08).

## 11. Upload record layer — `lib/uploads/`

- `recordUploadAsset` (`upload-records.ts:76-223`) inserts `upload_sessions`,
  `upload_assets`, `upload_events` as **3 non-transactional INSERTs** (`02`
  BUG-P1-02). A mid-way failure leaves an orphan `finalized` session with no
  asset → never cleaned (cleanup keys off `upload_assets.status='deleted'` and
  `upload_sessions.status IN (reserved/failed/expired/deleted)`).
- `finalizeUploadSessionAsset` (`direct-upload-records.ts:445-601`) flips session
  to `finalized` **before** the asset INSERT (`02` BUG-P2-09). If the asset
  INSERT fails, the session is permanently stuck.
- `admission-control.ts` — in-process token bucket; **per-isolate** (no
  cross-instance coordination on Workers); never sweeps expired entries (minor
  memory leak). The D1-backed durable cap is the real gate.
- `scanning.ts`/`scan-job.ts` — scan worker is global, cron-driven; conditional
  UPDATE with checksum re-verify (good optimistic-concurrency guard).
- `upload-job-queue.ts` — idempotency is per-batch only (two deliveries in
  different batches both execute); provider-proof receipts written to R2.

## 12. D1 schema (component-library core)

21 tables across migrations `0010, 0011, 0022, 0023, 0024, 0026, 0028, 0036`
(+ triggers `0038`, data purge `0037`). FK integrity on history/version/
supplier/brand/draft tables is solid (CASCADE). `cost_library_item_variant_cost_
entries.deleted_at` is correctly indexed + queried. DB CHECK constraints
(lifecycle enum, valid JSON, checksum length, override-column consistency)
backstop the app layer.

**Indexing note:** `cost_library_items` queried with
`WHERE workspace_id = ? AND lifecycle_state <> 'archived' ORDER BY updated_at
DESC, id ASC`. Existing `idx_cost_library_items_workspace_lifecycle
(workspace_id, lifecycle_state, updated_at DESC)` can't use a range on the
`<> 'archived'` predicate, so ORDER BY forces a sort. No library index was
added in `0031` or `0050` (`02` PERF-02).

**Dead schema after `0037`:** `component_category_nodes` is permanently empty
(data purged, table + columns retained). Repo still queries it unconditionally
(`component-library-repository.ts:1121`). Dead `*_category_node_id` columns
remain on `cost_library_items`, `library_folders`, `estimate_row_items`,
`estimate_template_row_items` (`02` DEAD-SCHEMA-01).

**Missing UNIQUE constraints:** `cost_library_items` (no `(workspace_id, name)`
or `(workspace_id, library_folder_id, name)`); `estimate_templates` (no
`(workspace_id, name)`); `cost_library_item_price_options` (no `(item_id,
label)`). Folders + suppliers + brands DO have name uniqueness. Inconsistent
(`02` DATA-02).

## 13. Cloudflare bindings in use (library surface)

- D1 `ARCH_DB` — all reads/writes via prepared statements + bind.
- R2 `ARCH_UPLOADS_R2` — `component-attachments` + `component-images` logical
  buckets; provider-proof receipts under `provider-proof/jobs/`.
- Images `IMAGES` — optional WebP transcoding when
  `ARCHESTIMATOR_IMAGE_PROCESSING_PROVIDER=cloudflare-images`; falls back to
  `sharp`.
- Queue `UPLOAD_JOBS_QUEUE` — cron-driven scan + cleanup jobs.
- No Durable Objects touched by the library surface.

## 14. Cross-cutting positives

- SQL injection surface is essentially zero (every dynamic clause uses bound
  `?`).
- Workspace scoping on writes is consistent across server actions + attachment/
  image routes (the direct-upload authz gap is the one exception).
- Path traversal is well-defended (`assertSafeStoragePath`,
  `isOwnedAttachmentPath`, `parseComponentImageStoragePath`,
  `buildUploadObjectKey` reject `..`/`//`/`\\` + enforce prefix ownership).
- Scan pipeline has a real optimistic-concurrency guard on both the worker
  result write and the manual override.
- The newer facet filter + cache-coherence callbacks (P0 T4) + virtualization
  + lazy detail-graph hydration show deliberate, modern perf engineering.
