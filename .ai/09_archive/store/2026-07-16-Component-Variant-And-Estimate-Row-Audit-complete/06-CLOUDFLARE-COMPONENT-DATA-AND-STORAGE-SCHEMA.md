# Cloudflare Component Data And Storage Schema

> **Historical baseline notice (2026-07-15):** This document is a dated baseline/deep dive, not current readiness authority. Current status lives in `README.md`, `09-ESTIMATE-SHEET-FEATURE-ACTION-MATRIX.md`, `10-DATA-INTEGRITY-BUG-AND-READINESS-AUDIT.md`, `IMPLEMENTATION_PLAN.md`, and `TRACEABILITY.md`. Any `PASS`, implemented, or complete wording below is historical unless re-proved there.

## Authority And Status

`wrangler.jsonc` is the executable Cloudflare binding source. `migrations/` is the active D1 migration chain. `supabase/migrations/` is historical provider-exit material and is not part of this implementation.

This document records the local implemented schema. It does **not** claim that new migrations are applied to hosted D1 or that hosted R2/Queue/Email behavior has been evaluated.

## Bound Resources Used By This Feature

| Resource | Binding | Component-path responsibility |
| --- | --- | --- |
| D1 | `ARCH_DB` | component, variant, cost, upload metadata, estimate receipts, publication/discussion state |
| R2 | `ARCH_UPLOADS_R2` | component images, Project images, component attachments, large issued assets where used |
| Queue | `UPLOAD_JOBS_QUEUE` | upload lifecycle/cleanup/scan work |
| Queue | `CLIENT_PORTAL_NOTIFICATIONS_QUEUE` | recipient/owner notification outbox delivery |
| Email | `EMAIL` | queued Client Portal notification delivery |

No additional Cloudflare resource is required for the implemented component graph.

## Canonical Identity Graph

```text
workspace
  -> cost_library_items (Library component)
       -> cost_library_item_price_options (variant)
            -> cost_library_item_variant_cost_entries (cost history/current cost)
            -> component_variant_attachments [owner_scope=library]
                 -> upload_assets -> R2 object
       -> cost_library_item_versions
       -> linked estimate/template rows

project
  -> estimate_row_items.source_snapshot_json/metadata_json (Project component graph)
       -> stable sourceComponentId
       -> ordered priceOptions[] and selected priceOptionId
       -> component_variant_attachments [owner_scope=project]
            -> upload_assets -> R2 object
       -> project_component_attachment_retention_holds
```

Project components intentionally do not add a master table. Their stable identity and bounded option graph live in estimate-row source receipts; the D1 row action keeps same-component instances consistent inside one project.

## Library Component Tables

### `component_category_nodes`

Taxonomy hierarchy: `id`, parent, label/type, sort order, code, JSON metadata, timestamps.

### `library_folders`

Workspace-scoped component organization: `workspace_id`, parent folder, name, sort order, optional taxonomy relation, folder kind, creator, timestamps.

### `cost_library_items`

Library component master:

- `id`, `workspace_id`;
- name, description, category/category node;
- folder, supplier/supplier ID, brand/brand ID;
- current unit/cost summary and active price option;
- lifecycle state and lifecycle-change audit;
- `current_version_number`;
- pricing date/source, thumbnail path;
- source promotion row receipt;
- JSON metadata, creator, timestamps.

Migration `0075` removes obsolete component-confidence columns. Confidence is not part of the current component contract.

### `cost_library_item_price_options`

Variant identity and searchable current summary:

- `id`, `workspace_id`, `item_id`;
- label, unit, unit/misc cost, currency;
- active/default flags;
- supplier/pricing source;
- JSON metadata containing the remaining variant descriptor fields;
- timestamps;
- unique composite `(workspace_id, item_id, id)` used by attachment ownership.

The application graph projects metadata into SKU, description, sort order, pricing date/source URL/notes, package/dimensions/mass, image bucket/path/thumbnail/metadata, variant metadata, and active cost-entry identity.

### `cost_library_item_variant_cost_entries`

Variant cost records:

- `workspace_id`, `item_id`, `price_option_id`;
- unit/misc cost, currency;
- pricing source/date/source URL/notes;
- current/deleted state and JSON metadata;
- timestamps;
- composite ownership uniqueness.

The graph action enforces one current non-deleted cost entry for each active submitted variant.

### `cost_library_item_versions`

Immutable component snapshots and revision history: item/workspace, monotonically increasing `version_number`, full component/price-option snapshot, summary/reason/effective time/actor.

This number is an internal data revision and concurrency receipt. It is not a product API version.

### `cost_library_item_price_history` and `cost_library_item_state_history`

Idempotent operation-key histories for option pricing and lifecycle changes.

### `component_suppliers` and `component_brands`

Workspace-scoped normalized catalogue identities used by component input and filtering.

### `cost_library_component_drafts`

Bounded active modal drafts with workspace/creator, title, JSON payload, status, and timestamps. Draft persistence is separate from component save.

## Attachment Ownership Migration

### Previous shape

`cost_library_item_variant_attachments` was Library-only and lacked an immutable upload-asset foreign key. Ownership relied too heavily on repeated path/metadata values.

### Current target shape: `component_variant_attachments`

`migrations/0076_component_attachment_ownership.sql` performs a fail-closed preflight, copies every valid Library row, verifies row counts/foreign keys, replaces the old table, and creates owner-specific indexes.

Core columns:

- `id`;
- `owner_scope`: `library` or `project`;
- `price_option_id`;
- Library owner: `item_id`;
- Project owner: `project_id`, `project_component_id`;
- `workspace_id`;
- unique, non-null `upload_asset_id` referencing `upload_assets` with `ON DELETE RESTRICT`;
- `storage_bucket`, unique `storage_path`, name, MIME, size, kind;
- JSON metadata;
- review state/current-approved state and review audit;
- optional Library cost-entry applicability;
- supersession relation/revision;
- timestamps.

Owner checks are exclusive:

```text
library => item_id present; project_id/project_component_id absent
project => item_id absent; project_id/project_component_id present
```

Library rows also carry a composite foreign key to `(workspace_id, item_id, price_option_id)`. Project rows carry `(project_id, workspace_id)` ownership and the application D1 action validates that `price_option_id` belongs to the submitted Project component graph.

### Migration preflight

Migration `0076` aborts if any old attachment has:

- missing/blank item or option identity;
- unknown workspace;
- option outside the same item/workspace;
- zero or multiple matching finalized upload assets;
- cost entry outside the same owner tuple; or
- invalid supersession target.

This is intentionally fix-forward and destructive only after current data passes the audit. It is not a dual-write compatibility migration.

## Upload Metadata Tables

### `upload_sessions`

Reservation/finalization record:

- workspace/actor;
- surface: `project-image`, `component-image`, or `component-attachment`;
- target type/ID;
- storage bucket/path, file descriptor/checksum;
- lifecycle state and expiry;
- JSON metadata and timestamps.

Project-component attachment sessions carry `projectId` and stable `projectComponentId` in metadata/target identity.

### `upload_assets`

Durable immutable upload receipt:

- workspace/actor and optional project/estimate;
- session/surface/target identity;
- finalized/deleted/removed/failure state;
- file descriptor/checksum;
- scan state/provider/result and override audit;
- storage bucket/path/thumbnail;
- JSON metadata and timestamps.

Every persisted component attachment binds exactly one finalized asset ID. A path alone is not authoritative ownership.

### `upload_events`

Append-only upload/session/asset audit events used by lifecycle and delivery proof.

## R2 Object Contracts

### Images

- Library component images are component/workspace owned.
- Project component images are project owned.
- The modal persists descriptors and upload asset identity, not an arbitrary public URL.
- Private authoring uses authenticated broker routes.
- Issued projection drops local broker URLs containing raw `path` query values.
- Already public `/component-thumbnails/...` URLs remain usable.

### Attachments

- logical bucket name is `component-attachments` behind `ARCH_UPLOADS_R2`;
- supported first-user types are PDF, XLS, XLSX;
- object path must be non-empty, normalized, unique, and free of traversal/double-separator forms;
- new metadata is written only from a finalized upload asset;
- download requires permission, readable review state, finalized matching upload asset, and a passing scan gate;
- draft cleanup rejects persisted attachment paths;
- delete/supersede marks metadata/assets before asynchronous/object cleanup as appropriate.

## Upload And Attachment State Machine

```text
reserve session
  -> upload R2 bytes
  -> finalize upload_assets row
  -> attach asset to one Library/Project variant in graph transaction
  -> uploaded/readable through private scan broker
  -> optional approved/rejected/superseded review transition
  -> removal/cleanup after ownership and restore-window checks
```

Failure ordering:

- uploaded but unsaved: draft cleanup may remove the asset/object;
- saved/persisted: draft cleanup must return conflict and cannot delete it;
- Project last-instance delete: retention hold preserves attachment metadata through restore window;
- Project restore: row and hold release happen in one batch;
- retention expiry: only supersede/remove when no live instance exists;
- Library source delete: owned attachment assets are marked removed before source deletion in the same atomic batch.

## Estimate Row Storage

`estimate_row_items` stores the row-owned calculation columns plus:

- `source_library_item_id`;
- `link_state`;
- `row_revision`;
- `source_snapshot_json`;
- `metadata_json`;
- category/supplier relations and timestamps.

### Library receipt

The source snapshot contains a bounded component/option catalogue and the row's selected option, component version, source update receipt, safe image projection, and source identity. Library attachment ownership is not copied into row snapshots used for fan-out/publication.

### Project receipt

The source snapshot/metadata contains:

- `sourceType: "project_component"`;
- stable `sourceComponentId`;
- source row/project receipt;
- selected `priceOptionId` and label;
- complete bounded sanitized `priceOptions` graph;
- Project attachment descriptors bound to stable Project ownership; and
- component-derived fields required for row rendering/calculation.

The authoritative D1 action updates all same-project instances by stable component ID and preserves each row's selected option and local calculation fields.

## Project Attachment Retention

`migrations/0079_project_component_attachment_retention.sql` creates `project_component_attachment_retention_holds` keyed by source delete event and attachment. It records workspace/project/component ownership, asset identity, restore expiry, release time/reason, and indexes unreleased expiry.

Release reasons are `restored`, `expired`, or `live_instance`. This supports undo without making Project attachments immortal.

## Issued Projection And Client Portal Tables

### Component/variant discussion target support

`migrations/0077_client_portal_component_discussion_targets.sql` rebuilds thread/message/read/subscription/mention tables with:

- target kinds including `estimate`, `estimate_tab`, `area_group`, `row`, and `component`;
- issue/section target indexes;
- message visibility and idempotency constraints; and
- client-visible message indexes.

### Bounded estimate projection

`migrations/0078_client_portal_estimate_row_projection.sql` adds:

- `client_portal_issue_estimate_projections`: section, payload hash, summary, row count;
- `client_portal_issue_estimate_rows`: issued estimate/tab/row identity, branch membership, search text, immutable row JSON, and page index.

These tables store public/issued receipts, never live Library IDs or private attachment paths.

### Notification delivery

Owner/recipient discussion and decision events write outbox rows in D1. `CLIENT_PORTAL_NOTIFICATIONS_QUEUE` receives opaque outbox IDs; the consumer leases the row, delivers through `EMAIL`, and acknowledges/retries/dead-letters without placing raw invite/token material in queue payloads.

## Transaction Invariants

1. One component save submits one complete graph.
2. Component, option, current cost, attachment, asset, version, and linked-row changes commit together or fail together.
3. Library save is guarded by component revision and linked-impact fingerprint.
4. Project save is guarded by row revision and Project-component impact fingerprint.
5. Selected option is preserved per row unless that exact option is explicitly removed with a replacement.
6. Row-local calculation inputs never fan out.
7. Authoritative detail/tree read-back precedes success reconciliation.
8. Attachments never transfer ownership by copying an ID/path into a different owner graph.

## Local Evidence

- migration ownership/preflight: `tests/vitest/component-attachment-ownership-migration.test.ts`
- private attachment lifecycle/scan broker: `tests/vitest/component-library-attachment-lifecycle.test.ts`
- upload client targets: `tests/vitest/upload-component-attachment-client.test.ts`
- Project variant attachment graph: `tests/vitest/estimate-actions-d1-reorder-history.test.ts`
- Project last-instance retention: `tests/vitest/project-component-attachment-retention.test.ts`
- promotion graph: `tests/vitest/express-promotion-action.test.ts`
- public image redaction/receipts: `tests/vitest/project-publication-snapshot.test.ts`
- Client Portal projection/targets/notifications: focused Client Portal test files listed in `TRACEABILITY.md`

## Remaining Provider Boundary

- Migrations `0076`–`0079` are present locally but hosted application is `NOT_EVALUATED`.
- Hosted R2 object existence/cleanup and scan-provider behavior are `NOT_EVALUATED`.
- Hosted Queue/Email delivery is `NOT_EVALUATED`.
- No deployment or production mutation is claimed by this pack reconciliation.
