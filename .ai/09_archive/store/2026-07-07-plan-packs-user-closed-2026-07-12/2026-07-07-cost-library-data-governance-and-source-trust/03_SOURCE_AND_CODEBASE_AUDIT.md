# 03 — Source and Codebase Audit

This document records the systematic, read-only inventory of the cost-library surface as it exists today. Every entry is repo-relative with the key symbol(s). It is the evidence backbone for `06`/`07`/`11`. "NOT FOUND" is explicit so the planner does not assume.

## 1. Cost-library source — `src/lib/component-library/`

| File | Purpose | Key symbols |
|---|---|---|
| `actions.ts` (107 KB, `"use server"`) | Primary D1 Server Actions / data-access layer for components, price options, drafts, lifecycle, folders, templates, bulk archive | `ComponentLifecycleState` (`"draft"\|"in_production"\|"available"\|"discontinued"\|"archived"`, L176); `ComponentPriceOptionInput` (L178: `pricingSource, pricingDate, confidence, sourceUrl, supplierId, currency, costEntries, attachments`); `ComponentVariantCostEntryInput` (L216: `unitCost, currency, pricingSource, pricingDate, confidence, sourceUrl, notes, isCurrent, deletedAt`); `ComponentVariantAttachmentInput` (L231); `CreateCostLibraryComponentInput` (L242); `SaveCostLibraryComponentDraftInput/Result` (L266); `LIBRARY_COMPONENT_CAP=10_000`, `LIBRARY_TEMPLATE_CAP=2_000` (L378); authz guards `assertCanManageLibrary`, `assertCanManageLibraryFolders`, `assertCanEditEstimate` (L322–373); `insertComponentVersion` (writes `cost_library_item_versions`); `changeCostLibraryComponentLifecycleState` (writes `cost_library_item_state_history`); provenance injection `{source:"library", isCustom:true, createdFrom:"workshop-library"}` (L1212); `revalidateLibraryRoutes()`, `revalidateTemplateSurfaces()` |
| `template-editor-actions.ts` (33 KB) | Server Actions for estimate-template node/row editing | template node/row mutations |
| `d1-store.ts` | D1 store for telemetry + user preferences | `recordComponentLibraryTelemetryEventInD1`; `component_library_user_preferences` |
| `library-telemetry.ts` | Telemetry event catalog + sanitizer | `LIBRARY_TELEMETRY_EVENTS` (PII/file-ext redaction) |
| `source-url.ts` | Source URL sanitize/validate | `sanitizeComponentSourceUrl`, `readComponentSourceUrlInput` (http/https/internal-path) |
| `quick-add-validation.ts` | Quick-add input validation | `QUICK_ADD_TEXT_LIMITS`; `validateQuickAddComponentInput`; `assertQuickAddComponentInput`; blocks spreadsheet formula prefixes (`=+-@`); rejects future pricing dates; enforces https on pricingSource |
| `project-component-projection.ts` | Projects estimate rows back into a virtual "Project Components" library | `getProjectComponentRowsLibrary`, `projectEstimateRowToLibraryItem` |
| `estimate-templates.ts` | Template type/builder | `EstimateTemplate` |
| `library-folder-reorder.ts` | Folder sort-order math | reorder helpers |
| `query-keys.ts`, `unit-options.ts`, `taxonomy.ts`, `category-taxonomy.v2.json`, `action-errors.ts` | Supporting | TanStack keys, unit conversions, taxonomy, `throwActionError` |

**Governance concepts already present in `actions.ts`:** lifecycle states, versioning (`cost_library_item_versions` with `snapshot_json, change_summary, change_reason, effective_at, created_by`), `current_version_number`, lifecycle audit (`cost_library_item_state_history`), promotion provenance (`source_estimate_row_item_id` UNIQUE), quotas, authz guards, revalidation. **NOT present:** review enum, accept/reject/lock/supersede RPCs-equivalents, assignment, due dates, optimistic-revision conflicts, review-event audit (verified by grep: 0 references).

## 2. Repository layer — `src/lib/repositories/component-library-repository.ts` (75 KB)

| Symbol | Responsibility |
|---|---|
| `getCurrentWorkspaceComponentLibrary(/Lite)` | Workspace library read |
| `getCurrentWorkspaceComponentRowsLibrary` | Project-component virtual library |
| `getCurrentWorkspaceComponentRowDetail` | Row detail (used by inspector) |
| `getLibraryOverview` | Overview dashboard data |
| `getLibraryDashboardSpotlight` | Spotlight widgets |
| `getEstimateTemplateById`, `buildEstimateTemplatesFromRows` | Template reads |
| `ComponentLibraryDataset`, `ComponentRowsLibraryDataset`, `LibraryOverviewComponent`, `LibraryOverviewHealth`, `ComponentVersionRow`, `ComponentHistoryEntry` | Read types |
| `SIDEBAR_COMPONENT_LIBRARY_ITEM_COLUMNS` (L264) | Read projection incl. `pricing_source, pricing_date, confidence, lifecycle_state, lifecycle_state_changed_at` |
| imports `getTemplateSourceTrustChips` | Trust annotation on templates |

## 3. D1 migrations — `migrations/`

| File | Cost-library relevance |
|---|---|
| `0026_component_promotion_support.sql` | **Core cost-library D1 schema.** Creates `component_category_nodes`, `library_folders`, `cost_library_items`, `cost_library_item_price_options`, `component_suppliers`, `component_brands`, `cost_library_item_versions`, `cost_library_item_price_history`, `cost_library_item_state_history`. (Note: does **not** create `cost_library_item_variant_cost_entries` — that table is created in `0028`; earlier draft of this audit mis-attributed it. Corrected 2026-07-07.) |
| `0028_component_library_action_support.sql` | Adds `library_folders.created_by`; adds to `cost_library_items`: `pricing_source, pricing_date, thumbnail_path, lifecycle_state_changed_at, lifecycle_state_changed_by`. **Creates `cost_library_item_variant_cost_entries`** (L65) with: `id, workspace_id, item_id, price_option_id, unit_cost, misc_cost, currency, pricing_source, pricing_date, confidence, source_url, notes, is_current, deleted_at, metadata_json, created_at, updated_at`. |
| `0022_component_attachment_metadata.sql` | `cost_library_item_variant_attachments` (`storage_bucket='component-attachments'`, `review_status` enum `'uploaded'\|'approved'\|'rejected'\|'superseded'`, `reviewed_by/at`, `review_note`, `superseded_by`, `is_current_approved`, `applicable_cost_entry_id`, `review_revision`). |
| `0011_component_library_preferences_telemetry.sql` | `component_library_telemetry_events` + `component_library_user_preferences` (payload JSON `NOT LIKE '%token%'/'%signed%'/'%storage_path%'`). |
| `0025_reusable_source_insert_support.sql` | `estimate_nodes.metadata_json`, `estimate_row_items.supplier`, `estimate_sheet_events` (audit: old/new snapshot, changed_fields, correlation_id). |
| `0036_cost_library_component_drafts.sql` | `cost_library_component_drafts` (`draft_json`, status `'active'\|'converted'\|'discarded'`, `converted_item_id`, `converted_at`, `discarded_at`, `created_by`; indexes on workspace+status and workspace+creator). |
| `0030..0035` | Workspace/membership, perf indexes, group membership positions, privacy register, data retention events, account security HMAC — not cost-library-specific but define surrounding schema. |

**Reconstructed D1 cost-library schema (current state):**
- `cost_library_items`: id, workspace_id, name, description, category, category_node_id, library_folder_id, supplier, supplier_id, brand, brand_id, unit, unit_cost, misc_cost, `lifecycle_state` (CHECK enum), `current_version_number`, active_price_option_id, `confidence`, `pricing_source`, `pricing_date`, thumbnail_path, `lifecycle_state_changed_at/by`, `source_estimate_row_item_id` (UNIQUE), metadata_json, created_by, created_at, updated_at.
- `cost_library_item_price_options`: label, unit, unit_cost, misc_cost, `currency DEFAULT 'PHP'`, is_active, is_default, `confidence, supplier_id, pricing_source`, metadata_json.
- `cost_library_item_variant_cost_entries`: unit_cost, misc_cost, currency, `pricing_source, pricing_date, confidence, source_url, notes`, is_current, deleted_at, metadata_json. **G2 GAP (D1-only): no `review_status/assigned_to/review_due_at/locked_by/lock_reason/reviewed_by/reviewed_at/review_note/superseded_by/review_revision`. The Supabase/Postgres equivalent table already has all 9 columns via `20260622143000_library_trust_governance.sql:53-64`; the gap exists only on the active D1 runtime.**
- `cost_library_item_versions` / `cost_library_item_price_history` / `cost_library_item_state_history`: append-only audit (`operation_key` idempotency, `effective_at`, `change_reason`, `created_by`).
- `cost_library_item_variant_attachments`: has a richer `review_status` than cost entries (see `0022`).
- `cost_library_component_drafts`: draft persistence.

**Migration ordering note (revised 2026-07-07):** Archestimator has two migration trees. The active **D1** tree at `migrations/` uses `00xx_` numbering and currently runs `0001`..`0037` (tip = `0037_remove_preloaded_component_categories.sql`, added 2026-07-07). The legacy **Supabase** tree at `supabase/migrations/` uses 14-digit timestamps and is reference/exit only. `AGENTS.md` still says "29 SQL files, latest `0029`" — that count is stale (drift acknowledged in `.ai/03_plans/2026-07-07-operational-data-readiness-source-of-truth/`). The next free D1 number is **`0038`**, so the governance migration is `0038_cost_library_cost_review_governance.sql`. (An earlier draft of this audit proposed `0037`; corrected after verifying `0037` was taken.)

## 4. Supabase reference governance — `supabase/migrations/20260622143000_library_trust_governance.sql` (48 KB)

**This is reference evidence, not the target runtime.** It defines the contract to port:

- Enums: `cost_library_cost_review_status` (`proposed|needs_review|accepted|rejected|superseded`), `cost_library_cost_review_event_type`, `cost_library_attachment_review_status`, `cost_library_attachment_review_event_type`.
- Columns on `cost_library_item_variant_cost_entries`: `review_status, reviewed_by, reviewed_at, review_note, assigned_to, review_due_at, locked_by, locked_at, lock_reason, superseded_by, review_revision`.
- 7 CHECK constraints: lock consistency, reviewed consistency, supersede consistency, revision positive.
- Unique partial index `cost_entries_one_accepted_current_per_option` (one accepted current entry per price option).
- Event tables `cost_library_cost_review_events` / `cost_library_attachment_review_events` (admin-only RLS).
- Triggers `enforce_cost_library_cost_review_scope` / `enforce_cost_library_attachment_review_scope`.
- **9 admin-only RPCs** behind `require_cost_library_governance_admin` (is_platform_admin OR is_workspace_admin): `assign_cost_library_cost_refresh`, `accept_cost_library_cost_entry`, `lock_cost_library_cost_entry`, `unlock_cost_library_cost_entry`, `reject_cost_library_cost_entry`, `supersede_cost_library_cost_entry`, `approve_cost_library_attachment`, `reject_cost_library_attachment`, `supersede_cost_library_attachment`. All use `expected_review_revision` optimistic concurrency (`'40001' Cost review revision conflict`).

Related Supabase migrations: `20260601184343_unlink_estimate_row_items.sql` (detach RPC + `row_revision` conflict guard), `20260616120000_promote_detached_estimate_rows_to_library.sql` (promotion RPC), `20260626184000_freeze_unscanned_component_attachment_approval.sql`, `20260627130000_harden_estimate_sheet_versions_rls.sql`.

## 5. UI components

### `src/components/workshop/library/` (primary library workspace)
| File | Key symbols |
|---|---|
| `source-trust-model.ts` | **Central trust model.** `COMPONENT_FACET_STALE_DAYS=90`, `COMPONENT_FACET_VERY_STALE_DAYS=180`; `getComponentPricingFreshness` → `fresh\|stale\|very-stale\|missing`; `confidenceChipCopy` (regex → "Verified source"/"Accepted cost"/"Low confidence"/"Likely source"); `getComponentSourceTrustChips`; `getLibraryCommitTrustGate({action, existingRow, now})` → `{severity: pass\|warn\|block, reasons[]}` (blocks archived; warns discontinued/draft/in_production, stale/very-stale/missing, missing pricingSource, low confidence, `source-changed`, thumbnail mismatch); `getTemplateSourceTrustChips`; `getTemplateDependencyHealth` |
| `source-trust-chips.tsx` | `SourceTrustChips` renderer (tones neutral/success/warning/danger; `data-library-source-trust-chip`) |
| `component-facet-filter.tsx` / `-model.ts` | Faceted filter by lifecycle/freshness/confidence/source-presence |
| `EditComponentDrawer.tsx` | Edit form: lifecycleState, confidence, pricingSource (uses `validateQuickAddComponentInput`) |
| `ComponentInspectorDock.tsx` | Uses `getComponentSourceTrustChips` |
| `LibraryComponentsRoute.tsx`, `LibraryTabsLayoutClient.tsx`, `LibraryTitleBarClient.tsx`, `LibraryTabPanel.tsx`, `library-surface-variant.tsx`, `component-route-state.ts` | Library routing/layout |
| `overview/LibraryOverview.tsx`, `overview/RecentComponentCard.tsx` (uses trust chips), `overview/LibraryOverviewSearch.tsx` | Overview dashboard |
| `templates-browse/` (`TemplateGallery`, `TemplatePreviewDock`, `InsertIntoEstimatePicker`) | Template browse (uses `getTemplateDependencyHealth`) |

### `src/components/workshop/component-library/` (estimate sidebar library)
`index.tsx`, `PreviewPanel.tsx` (uses `getComponentSourceTrustChips`), `CommandPalette.tsx`, `NewComponentForm.tsx`, `NewTemplateModal.tsx`, `tree/` (LibraryTree, TemplatesTree, buildLibraryTree), `helpers.ts`, `types.ts`, `templates.ts`, `account-preferences-client.ts`, `use-estimate-right-sidebar-state.ts`.

### `src/components/workshop/component-library-manager/` (Add Component modal)
`AddComponentModal.tsx` (uses `createCostLibraryComponent` + `saveCostLibraryComponentDraft`; variant images; attachments via `uploadComponentAttachment`; `validateComponentAttachmentFile`), `ComponentLibraryManager.tsx`, `LibraryFolderTree.tsx`, `library-folder-tree-shared.ts`.

### `src/components/workshop/EstimateSheetContent.tsx`
Consumes library via estimate-sheet hooks; trust gate surfaced through `estimate-sheet/use-estimate-row-handlers.ts`.

## 6. Estimate integration (the heart of estimate impact)

| File | Key symbols / behavior |
|---|---|
| `src/components/workshop/estimate-sheet/use-estimate-row-handlers.ts` | `insertLibraryItem` / `replaceRowItem` call `getLibraryCommitTrustGate`; on `block`→`trust_insert_gate_blocked`, on `warn`→`trust_insert_gate_warned`, on confirm→`trust_insert_gate_confirmed` telemetry; `pendingLibraryCommitGate` state; `confirmPendingLibraryCommit` / `cancelPendingLibraryCommit` |
| `src/lib/estimates/types.ts` | `EstimateRowLinkState` (`"unlinked"\|"linked-clean"\|"linked-overridden"\|"detached"\|"source-changed"`, L4); `EstimateRowItem` (L93: `sourceLibraryItemId, linkState, componentVersionId/Number, priceOptionId/Label, lifecycleState, lifecycleStateChangedAt, pricingSource, pricingDate, confidence, sourceUrl, rowRevision, metadata`) |
| `src/lib/estimates/express-components.ts` | `classifyEstimateRowSource` (L229: express/linked-library/detached-library/legacy-blank/source-less-manual) |
| `src/lib/estimates/express-promotion-actions.ts` | L443: writes `link_state = 'linked-clean'` on promotion |
| `src/lib/estimates/actions.ts` | `insertEstimateRowItemFromLibrary`, `replaceEstimateRowItemWithLibrary`, `detachEstimateRowItemFromLibrary`, `updateEstimateRowItem` (`expectedRowRevision` conflict guard), `insertEstimateTemplateIntoEstimate`; writes `source_snapshot, link_state, row_revision` |
| `src/lib/domain/estimate-tree.ts`, `src/lib/activity/activity-formatters.ts`, `src/lib/repositories/workspace-repository.ts`, `src/components/workshop/estimate-sheet/activity-history.tsx`, `src/components/workshop/estimate-sheet/rows/cells-model.ts` | Read/format `source-changed` for display |

**CRITICAL GAP — stale propagation:** `link_state = 'source-changed'` is **read** by the trust gate and template health, but the only **write** sites are promotion (`linked-clean`) and explicit detach. There is **no trigger, job, or library-update path** that flips existing estimate rows to `source-changed` when a `cost_library_items` row or its price option changes. Verified by grep across `src/`. This is the dead-branch risk.

## 7. Server Actions / Route Handlers / RPC + authz

### Server Actions (`src/lib/component-library/actions.ts`) — all `"use server"`
- **Reads:** `loadCurrentWorkspaceComponentLibrary(/Lite)`, `loadProjectComponentLibraryLite`, `loadCurrentWorkspaceComponentRowsLibrary`, `loadProjectComponentRowsLibrary`, `loadCostLibraryComponentRowDetail`, `loadCurrentWorkspaceEstimateTemplates`, `getCostLibraryComponentUsage`, `searchLibraryOverview`, `listEstimateInsertTargets`, `resolveEstimateTemplateInsertTarget`.
- **Writes:** `createCostLibraryComponent`, `saveCostLibraryComponentDraft`, `updateCostLibraryComponent`, `upsertCostLibraryComponentPriceOption`, `changeCostLibraryComponentLifecycleState`, `previewBulkArchiveLibraryComponents` / `executeBulkArchiveLibraryComponents` (hash-gated), folder CRUD (`createLibraryFolder`, `renameLibraryFolder`, `deleteLibraryFolder`, `reorderLibraryFolders`, `moveCostLibraryComponentToFolder`), template actions.
- **Preferences/telemetry:** `loadComponentLibraryUserPreferences`, `saveComponentLibraryUserPreferences`, `recordComponentLibraryTelemetryEvent`.

**MISSING (gaps this plan fills):** `assignCostEntryForReview`, `acceptCostEntry`, `rejectCostEntry`, `lockCostEntry`, `unlockCostEntry`, `supersedeCostEntry` and attachment equivalents — none exist on the D1 path.

### Route Handlers (`src/app/api/component-library/`)
- `attachments/route.ts` — GET (download, requires `review_status='approved'` + `is_current_approved` + clean scan), POST (upload PDF/XLS/XLSX ≤20MB, magic-byte validation, scan pending), DELETE (blocks reviewed attachments).
- `attachments/scan-override/route.ts`, `attachments/direct-upload/route.ts`.
- `images/route.ts`.
- Authz: `isWorkspaceEditorInD1` for all.

### App-level authorization — `src/lib/authz/d1-access.ts`
D1 has no native RLS; this is the RLS-equivalent:
- `canAccessProjectInD1`, `canEditProjectInD1`, `canAccessEstimateInD1`, `canEditEstimateInD1`, `isWorkspaceEditorInD1` (role IN owner/admin/member), `isWorkspaceMemberInD1`.
- Platform-admin bypass via `isPlatformAdminRole`.
- **GAP:** no `isWorkspaceAdminInD1` / `isCostLibraryGovernanceAdminInD1` equivalent to Supabase `require_cost_library_governance_admin` — needed for review actions (`OPEN-5`).

## 8. Tests (existing inventory — `tests/vitest/`)

| Area | Files |
|---|---|
| Source trust model | `library-source-trust.test.ts` (freshness tiers, confidence copy, insert/replace gates, template trust) |
| Governance contract | `component-library-cost-governance-actions.test.ts` (**asserts Supabase governance migration contract AND asserts D1 actions do NOT use governance RPCs**) |
| Versioning/schema | `component-library-versioning-schema.test.ts`, `component-library-folder-schema.test.ts`, `component-library-brand-schema.test.ts`, `component-library-attachment-lifecycle.test.ts` |
| Store/telemetry | `component-library-d1-store.test.ts`, `component-library-durable-telemetry.test.ts`, `library-telemetry-emit.test.ts` |
| Actions/folders/templates | `component-library-folder-actions.test.ts`, `component-library-helpers.test.ts`, `component-library-templates-repository.test.ts`, `component-library-templates-schema.test.ts`, `component-library-user-preferences.test.ts`, `component-library-actions-revalidation.test.ts`, `library-action-errors.test.ts`, `library-copy-contract.test.ts` |
| UI | `library-add-component-modal-a11y.test.tsx`, `library-viewer-authz.test.tsx`, `library-route-state-authz.test.tsx`, `library-workspace-switch-cache.test.ts`, `library-components-cache.test.tsx`, `library-applied-filters.test.tsx`, `library-overview.test.tsx`, `library-tabs-layout.test.tsx`, `library-tab-a11y.test.tsx`, `library-template-insert-picker.test.tsx`, `library-templates-cache.test.tsx`, `library-header-search.test.tsx`, `library-folder-tree-selection.test.tsx`, `component-library-manager*.test.tsx`, `workshop-library-consolidation-ui.test.tsx` |
| Estimate integration | `estimate-library-item-insert-contract.test.ts`, `estimate-sheet-library-insert.test.tsx`, `estimate-sheet-library-lazy-load.test.tsx`, `estimate-sheet-sidebar-library-consumers.test.tsx`, `estimate-component-library-lazy-load.test.tsx`, `estimate-component-drag.test.tsx`, `express-components.test.ts`, `project-component-projection.test.ts`, `project-component-projection-d1.test.ts`, `reusable-source-drag.test.ts`, `reusable-sources-actions.test.ts`, `template-browse-project-sources.test.tsx`, `project-source-insert-action.test.ts` |
| Security/governance-flavored | `security-findings-library-tooling-contracts.test.ts`, `infosec-db-pending-review-contract.test.ts`, `trust-page-overclaims.test.ts`, `cloudflare-d1-component-library-proof-script.test.ts` |

## 9. Related plans/specs/docs

| Path | Relevance |
|---|---|
| `.ai/06_specs/current-project-estimates-component-library-spec.md` | Domain model for component library + estimates |
| `.ai/06_specs/project-estimate-versioning-system.md` | Versioning model |
| `.ai/03_plans/2026-07-07-operational-data-readiness-source-of-truth/PROMPT.md` | Notes `AGENTS.md` migration-count drift (29 vs 0036) |
| `.ai/03_plans/2026-06-20-Library-Page-Overall-Improvement/` | Library page UX history |
| `.ai/03_plans/2026-06-28-add-component-opendesign-field-contract/` | Add-component field contract |
| `.ai/10_state/current-state.md` fast path | Stage = pre-launch closed-beta MVP; component-library preference gating; package-builder Draft read tools moved off Supabase to D1 (~L2900); component-library provider data purged by owner (~L3510) |
| `AGENTS.md` | Cost library = first-user priority; Cloudflare-resource standing authorization; free-tier posture |

## 10. Gaps summary (drives `04`/`11`)

| # | Gap | Evidence | Plan ref |
|---|---|---|---|
| G1 | Dual persistence drift: Supabase has full governance RPCs; D1 `actions.ts` uses none | grep: 17 refs in Supabase migration, 0 in actions.ts; governance test asserts the split | `DEC-1`,`DEC-2`, P1/P2 |
| G2 | **D1-only** schema gap: D1 `cost_library_item_variant_cost_entries` (created in `0028`) lacks `review_status/assigned_to/review_due_at/locked_by/lock_reason/reviewed_by/reviewed_at/review_note/superseded_by/review_revision`. The Supabase/Postgres equivalent already has them (`20260622143000:53-64`). | D1 `0028` schema vs Supabase governance migration | P1, `DATA-*` |
| G3 | `source-changed` estimate-row state is read by gate but never written on library mutation | grep: only promotion (`linked-clean`) and detach write link_state | P4, `DEC-4` |
| G4 | No library import/export (CSV/JSON/Excel) | NOT FOUND; only estimate proposal export exists | P5 |
| G5 | No `isWorkspaceAdminInD1`/governance-admin authz helper | `src/lib/authz/d1-access.ts` has editor/member but not admin/governance-admin | P2, `OPEN-5` |
| G6 | Confidence is free text; chips derive labels by regex | `source-trust-model.ts` `confidenceChipCopy` | `OPEN-3`, P3 |
| G7 | Currency hardcoded PHP default; no region/version model | `cost_library_item_price_options.currency DEFAULT 'PHP'` | `OPEN-2`, P3 |
| G8 | No review-event audit table on D1 (Supabase has `cost_library_cost_review_events`) | `migrations/` | P1 (`DEC-3` extends existing history) |
| G9 | No "owner-accepted provenance" concept distinct from "imported/unverified" | NOT FOUND | P3, `OPEN-1` |

No "whole codebase" claim is made beyond this systematic inventory of the cost-library surface and its consumers.
