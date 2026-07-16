# Current Architecture And Evidence

> **Historical baseline notice (2026-07-15):** This document is a dated baseline/deep dive, not current readiness authority. Current status lives in `README.md`, `09-ESTIMATE-SHEET-FEATURE-ACTION-MATRIX.md`, `10-DATA-INTEGRITY-BUG-AND-READINESS-AUDIT.md`, `IMPLEMENTATION_PLAN.md`, and `TRACEABILITY.md`. Any `PASS`, implemented, or complete wording below is historical unless re-proved there.

## Evidence Model

This document describes the current shared worktree, not the older planning baseline. Current source wins over the GitNexus index where the index points at an earlier commit. GitNexus still confirms the central relationship: `AddComponentModal.submit` calls `updateCostLibraryComponentWithPriceOptions`, which in turn owns option planning, linked-row synchronization, revision guards, D1 batching, authoritative detail reread, and route revalidation.

Evidence labels:

- `IMPLEMENTED`: current source contains the path.
- `FOCUSED_PROOF`: a focused automated/static check was reported for the path during implementation.
- `PRESENT_NOT_RUN`: an adjacent test exists but this reconciliation does not claim a fresh run.
- `NOT_EVALUATED`: hosted/release/browser behavior was not proved.

## End-To-End Private Authoring Path

### 1. Open the canonical editor

The Components manager and Estimate Sheet both dynamically load:

`src/components/workshop/component-library-manager/AddComponentModal.tsx`

The Components manager hydrates a selected Library item with `loadCostLibraryComponentEditorDetail`. The Estimate Sheet does the same for a linked Library row and uses `getEstimateComponentEditImpact` for a Project component. Both supply the current option-usage counts and an impact fingerprint before editing.

The former reduced `src/components/workshop/library/EditComponentDrawer.tsx` is deleted. There is no active second advanced editor.

### 2. Hydrate the complete graph

`getInitialDraft`:

- sorts active `priceOptions` by `variantSortOrder` and label;
- preserves each stable option ID;
- preserves the explicit `isDefault` flag independently from the initiating row's selection;
- hydrates label, description, SKU, unit, cost, package metadata, image identity, upload asset identity, scan state, and attachments; and
- selects the initiating row's `priceOptionId` for editing without redefining it as default.

This separation matters: **selected option**, **default option**, and **active editor option** are different facts.

### 3. Edit the component graph

The modal maintains one `ComponentDraft` containing component fields and an ordered `VariantDraft[]`.

- First option label: `Default`.
- Later generated labels: `Option 2`, `Option 3`, and so on.
- New options receive a fresh UUID.
- Persisted options retain their D1 IDs.
- Exactly one default is required.
- Reordering changes `variantSortOrder`, not identity.
- Removing a used option requires a replacement selected from the retained active options.

The exact user-reported defect lived here: the former first **Add variant** branch only enabled variant mode and returned. The current `addVariant` always creates and appends a new draft option.

### 4. Submit one complete graph

`buildComponentPayload` emits one component object with the complete ordered `priceOptions` graph. It does not issue per-option client mutations.

For every option the payload carries the supported identity and field set: stable ID when persisted, label, SKU, description, sort order, unit, current cost entry, currency/pricing metadata, supplier relation, package metadata, image descriptor, attachment descriptors, active/default flags, effective date, and change reason.

### 5A. Library owner save

`updateCostLibraryComponentWithPriceOptions` in `src/lib/component-library/actions.ts`:

1. checks workspace permission;
2. checks component `updated_at` and version number;
3. checks the linked-row/option impact fingerprint;
4. validates exactly one default and all submitted stable option IDs;
5. validates explicit replacements for removed used options;
6. builds component, option, cost-entry, attachment, upload-asset, history/version, and linked-row statements;
7. commits them through one guarded D1 batch;
8. rereads the complete component detail graph; and
9. returns authoritative component and instance-sync results.

Linked-row plans retain each row's selected option ID. A `linked-clean` row receives component fields and the derived fields of its own selected option. A `linked-overridden` row receives the new catalogue/version receipt while its visible local overrides remain unchanged. Detached/unlinked rows are excluded.

### 5B. Project owner save

The same modal uses `componentEditScope="project"`. It builds the same complete graph, then `EstimateSheetContent.updateComponentFromEditor` calls the normal row update path with:

- the stable Project `sourceComponentId`;
- complete `priceOptions` in the source snapshot;
- the initiating row's selected `priceOptionId`;
- the expected component-impact fingerprint; and
- any removed-option replacement map.

`updateEstimateRowItem` forwards this to the D1 `update_estimate_row_item_with_history` action. The server finds instances of the same Project component only inside the target project, guards the source revision and complete component-impact fingerprint inside the final D1 batch, updates the shared catalogue atomically, derives variant fields by each row's selected option, preserves row-local values, increments revisions, and writes one correlated history event. Ordinary row patch and replacement use the same source-revision guard so a zero-row stale write cannot still commit history.

After persistence the Estimate Sheet reconciles authoritative tree data before treating the edit as complete. A detached Project component that retains a historical `sourceLibraryItemId` is still routed by `componentEditScope="project"`; it cannot accidentally invoke the Library mutation.

## Component Types And Ownership

| Type | Stable identity | Storage authority | Fan-out boundary | Edit path |
| --- | --- | --- | --- | --- |
| Library | `cost_library_items.id` | Library component/option D1 tables | same workspace; linked rows only | full modal -> `updateCostLibraryComponentWithPriceOptions` |
| Project | project `sourceComponentId` | estimate-row snapshot/metadata + Project attachment ownership | same project and same component identity | full modal -> `updateEstimateRowItem` -> D1 action |
| Template source | template row/source receipt | template tables/snapshot | none after insertion | resolve current source at insert or explicitly use unlinked snapshot |
| Express/custom row | row/project component identity | estimate row | explicit Project instances only | inline/full modal according to component classification |

Project component identity is not an estimate row ID. `getProjectComponentEditorIdentity` resolves the stable component identity from metadata/source snapshot and passes it to image/attachment routes.

## Estimate Row Transfer And Selection

### Library insert

Insertion copies a bounded, sanitized option catalogue into the row receipt, selects the default option once, and stores:

- `sourceLibraryItemId`;
- `componentVersionId`/`componentVersionNumber` when available;
- selected `priceOptionId` and label;
- component/variant-derived name, description, SKU, unit, cost, pricing, and image values;
- link state; and
- row-local quantity/calculation fields.

Changing the variant later calls the row update path and changes selected option/derived fields; it does not replace the component.

### Project copy and make-project-specific

Making a Library instance project-specific:

- creates a fresh Project component ID;
- clears `sourceLibraryItemId` and Library link state;
- preserves the current ordered option graph and selected option;
- preserves quantity and other row-local fields; and
- removes Library-owned attachment descriptors rather than transferring ownership implicitly.

A Project component copied across projects receives a new Project identity. Same-project instances may share one Project identity.

### Promotion

`src/lib/estimates/express-promotion-actions.ts` promotes the complete ordered graph into Library tables. It maps option IDs to fresh Library option IDs, preserves the source-selected option in the resulting row receipt, writes cost entries and eligible attachments, and returns the authoritative selection.

### Move and replace

Row reorganization preserves row identity and component receipt while changing location/order under one D1 batch. Every affected row revision is checked by an in-batch guard and repeated in the final `UPDATE` predicate before the history event/outbox is written. Single-row deletion uses the same pattern: attachment retention, a revision-qualified `DELETE`, history, and outbox are committed together or fail together. Replace follows the replacement policy for source identity and selected default; it does not silently retain a foreign source relationship.

## CRUD And Lifecycle

### Library

- **Create:** one complete graph batch, version `1`, authoritative reread.
- **Read:** compact catalogue rows plus on-demand complete detail.
- **Update:** guarded graph batch with selected-option-aware fan-out.
- **Duplicate:** hydrates full detail, creates fresh component/option/cost-entry IDs, copies metadata/images, and intentionally omits attachments rather than sharing a unique R2 path.
- **Move:** workspace-scoped folder update.
- **Archive:** preview hash then lifecycle update; estimate rows remain.
- **Delete:** preview hash, detach estimate/template rows, mark owned uploads removed, delete the source; issued content remains immutable.

### Project

- **Create/copy:** materializes a stable Project identity and complete option graph in estimate rows.
- **Read:** row projection plus impact/usage query.
- **Update:** project-scoped component-instance batch.
- **Delete:** deletes the row; shared attachment metadata is retained while another live instance exists and held through the restore window when the last instance is removed.
- **Restore:** restores the row and releases its matching attachment retention hold in the same batch.
- **Promotion:** creates a new Library master and relinks the source row to the new Library identity.
- **Detach:** severs the Library link and produces a new Project identity without changing the Library master.

### Variant operations

- add, rename, reorder, set default, update, and remove are all graph operations;
- stable ID, not label or position, is identity;
- adding/reordering/defaulting never reselects existing rows;
- variant-derived values refresh only for instances selecting that option;
- used deletion requires explicit replacement and only those selected rows move;
- unused deletion is direct.

## D1/R2 Attachment Path

Uploads use `upload_sessions`, `upload_assets`, and `upload_events`. Logical surfaces are `component-image` and `component-attachment`; objects live behind the bound R2 service.

`component_variant_attachments` has one exclusive owner tuple:

- Library: `(workspace_id, item_id, price_option_id)`; or
- Project: `(workspace_id, project_id, project_component_id, price_option_id)`.

Every attachment binds one unique finalized `upload_assets.id` and one unique bucket/path. Download uses the authenticated broker, checks tenant/project permission, attachment review state, finalized upload identity, and scan policy before R2 access. Draft cleanup refuses to delete persisted attachment rows.

## Issued Review Path

Publication reads row/component receipts and projects them into immutable client-safe values:

- opaque issue-local component anchor;
- opaque issue-local variant anchor;
- selected variant label;
- component version number;
- row revision;
- normalized link state; and
- safe issued image URL only.

`normalizeIssuedPublicationImageUrl` drops local `/api/projects/images?path=...` and `/api/component-library/images?path=...` values because those contain private storage identity. Already public `/component-thumbnails/...` values remain allowed.

Client Portal estimate projection preserves those receipts, supports paged immutable rows, and exposes distinct component and row discussion targets. `resolveClientPortalIssuedTarget` only resolves IDs present in issued content and derives target labels from that payload. Owner replies then persist a client-visible message/activity entry and recipient notification outbox rows.

## Source And Test Evidence

| Concern | Source | Focused evidence |
| --- | --- | --- |
| reported save/reopen defect | `AddComponentModal.tsx`, `EstimateSheetContent.tsx` | `tests/vitest/estimate-sheet-library-insert.test.tsx` exact Project save/reopen case |
| stable option/default ordering | `AddComponentModal.tsx` | `tests/vitest/library-add-component-modal-a11y.test.tsx` |
| Library graph/fan-out | `component-library/actions.ts` | `tests/vitest/component-library-actions-revalidation.test.ts`, related component action tests |
| Project variant fan-out/replacement | `estimates/d1-action-client.ts` | `tests/vitest/estimate-actions-d1-reorder-history.test.ts` |
| row graph snapshots/detach | `source-snapshot-price-options.ts`, row handlers | `tests/vitest/source-snapshot-price-options.test.ts`, `estimate-sheet-library-insert.test.tsx` |
| promotion | `express-promotion-actions.ts` | `tests/vitest/express-promotion-action.test.ts` |
| attachment ownership | migration `0076`, routes/upload records | `component-attachment-ownership-migration.test.ts`, attachment lifecycle/upload tests |
| Project attachment retention | migration `0079`, retention helper | `project-component-attachment-retention.test.ts` |
| public projection | `publication/snapshot.ts`, `publication/image-url.ts` | `project-publication-snapshot.test.ts` |
| issued component discussion | Client Portal projection/resolver/UI | estimate-browser, issued-target-resolver, shell tests |
| owner reply notifications | publisher discussion + Queue consumer | publisher-discussion-service and notification-queue tests |

## Evidence Limits

- Local source and focused automated/static evidence do not prove hosted migration application.
- No browser automation, screenshots, or visual QA were run.
- No production deployment or real recipient email delivery is claimed.
- Release remains `NOT_EVALUATED`.
