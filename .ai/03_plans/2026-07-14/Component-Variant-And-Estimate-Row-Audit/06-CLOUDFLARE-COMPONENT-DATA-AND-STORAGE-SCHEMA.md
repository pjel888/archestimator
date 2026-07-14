# Cloudflare Component Data And Storage Schema

## Scope

This appendix records the current Cloudflare bindings and the complete component-related D1/R2/Queue data path required by the Add/Edit Component, Library component, Project component, variant, upload, and Estimate Sheet row contracts.

It does not authorize changes to legacy Supabase infrastructure or unrelated Cloudflare projects. `wrangler.jsonc` remains executable provider truth.

## Bound Cloudflare Resources

| Resource | Binding/name | Component responsibility |
| --- | --- | --- |
| Worker | `archestimator-proof` | application and API runtime |
| D1 | `ARCH_DB` / `archestimator-proof-db` | component, variant, row, upload, history metadata |
| R2 | `ARCH_UPLOADS_R2` / `archestimator-proof-uploads` | component images and private attachments |
| Images | `IMAGES` | image optimization pipeline where used |
| Queue | `UPLOAD_JOBS_QUEUE` / `archestimator-upload-jobs` | attachment scan/finalization jobs |
| Queue | `CLIENT_PORTAL_NOTIFICATIONS_QUEUE` | downstream issued-review notifications; not component persistence |
| Durable Objects | `COLLAB_ROOMS`, `GLOBAL_PRESENCE`, `SUPPORT_INBOX` | unrelated to component persistence |
| Email | `EMAIL` | unrelated to component persistence |

`compatibility_date`, `nodejs_compat`, numbered D1 migration files, and Durable Object migration tags such as `v1`/`v2-admin-dashboard` are Cloudflare operational controls. They are not product V1/V2 compatibility promises and must not be renamed or deleted as UI cleanup.

## Logical Relationship Map

```text
workspaces
  ├─ library_folders
  ├─ component_suppliers
  ├─ component_brands
  ├─ cost_library_items
  │    ├─ cost_library_item_price_options
  │    │    ├─ cost_library_item_variant_cost_entries
  │    │    ├─ cost_library_item_price_history
  │    │    └─ cost_library_item_variant_attachments
  │    ├─ cost_library_item_versions
  │    └─ cost_library_item_state_history
  ├─ cost_library_component_drafts
  ├─ upload_sessions
  ├─ upload_assets
  │    └─ upload_events
  └─ projects
       └─ estimates
            └─ estimate_row_items
                 ├─ Library instance: source_library_item_id + selected option snapshot
                 └─ Project component: project component ID + option graph in JSON
```

R2 ownership is joined through `upload_sessions`/`upload_assets` and the component/variant descriptors or attachment binding table. A bare public URL is not authoritative ownership.

## Current D1 Component Schema

### `component_category_nodes`

Source: `migrations/0026_component_promotion_support.sql`.

Columns:

- `id` primary key;
- `parent_id` self-reference, `ON DELETE SET NULL`;
- `label`, `node_type`, `sort_order`, optional `code`;
- `metadata` valid JSON object; and
- `created_at`, `updated_at`.

Index: parent/sort/label.

### `library_folders`

Columns:

- `id`, `workspace_id`, `parent_id`;
- `name`, `sort_order`;
- optional `source_category_node_id`;
- `folder_kind` in `taxonomy|custom`;
- `created_by`, `created_at`, `updated_at`; and
- unique workspace/parent/name.

Index: workspace/parent/sort/name.

### `cost_library_items`

Current columns after migrations `0026`, `0028`, and `0075`:

- identity/ownership: `id`, `workspace_id`, `created_by`;
- catalogue: `name`, `description`, `category`, `category_node_id`, `library_folder_id`;
- supplier/brand: `supplier`, `supplier_id`, `brand`, `brand_id`;
- active display/cost projection: `unit`, `unit_cost`, `misc_cost`, `active_price_option_id`;
- lifecycle: `lifecycle_state`, `lifecycle_state_changed_at`, `lifecycle_state_changed_by`;
- pricing/media: `pricing_source`, `pricing_date`, `thumbnail_path`;
- revision/audit: `current_version_number`, `source_estimate_row_item_id`, `metadata_json`, `created_at`, `updated_at`.

The removed `confidence` column is not part of the current product contract.

Indexes/constraints:

- workspace/lifecycle/updated;
- workspace/folder/name;
- source estimate row when present;
- unique workspace/source row;
- lifecycle values are constrained to `draft|in_production|available|discontinued|archived`.

### `cost_library_item_price_options`

Current columns after `0026` and `0075`:

- `id`, `workspace_id`, `item_id` with component cascade;
- `label`, `unit`, `unit_cost`, `misc_cost`, `currency`;
- `is_active`, `is_default`;
- `supplier_id`, `pricing_source`;
- `metadata_json`;
- `created_at`, `updated_at`.

Indexes: item/active/default and workspace/updated.

Variant metadata currently carries fields that do not have first-class columns, including SKU, description, sort order, pricing date/source URL/notes, package/dimensions/mass, image bucket/path/thumbnail/metadata, variant metadata, and active cost entry ID.

### `cost_library_item_variant_cost_entries`

Current columns after `0028` and `0075`:

- `id`, `workspace_id`, `item_id`, `price_option_id`;
- `unit_cost`, `misc_cost`, `currency`;
- `pricing_source`, `pricing_date`, `source_url`, `notes`;
- `is_current`, `deleted_at`, `metadata_json`;
- `created_at`, `updated_at`.

All item/option/workspace relations cascade. Index: option/current/deleted. The action layer must enforce exactly one non-deleted current entry per active option inside the save transaction.

### `cost_library_item_variant_attachments`

Source: `migrations/0022_component_attachment_metadata.sql`.

Columns:

- identity/link: `id`, nullable `price_option_id`, nullable `item_id`, `workspace_id`;
- storage: fixed `storage_bucket='component-attachments'`, unique `storage_path`;
- file: `file_name`, allowed PDF/Excel `content_type`, positive `size_bytes`, `attachment_kind`;
- metadata/audit: `metadata_json`, `created_by`, `created_at`, `updated_at`;
- review: `review_status`, `applicable_cost_entry_id`, `is_current_approved`, `reviewed_by`, `reviewed_at`, `review_note`, `review_revision`;
- supersession: `superseded_by` self-reference.

Indexes: workspace/path, workspace/review/current, price option/created, item/created.

**Schema defect:** `price_option_id` and `item_id` are plain text with no foreign keys because this table was created before the component tables. The schema permits orphan or cross-item attachment bindings. This must be repaired by a direct table rebuild to the current target shape, not by adding a second compatibility table.

### `cost_library_item_versions`

Columns: `id`, `item_id`, `workspace_id`, `version_number`, `snapshot_json`, `change_summary`, `change_reason`, `effective_at`, `created_by`, `created_at`.

Constraints: unique item/version; index item/version descending.

`version_number` is an internal optimistic-concurrency/audit revision. It is not a released product API version.

### `cost_library_item_price_history`

Columns: `id`, `price_option_id`, `item_id`, `workspace_id`, `operation_key`, `old_snapshot`, `new_snapshot`, `change_reason`, `effective_at`, `created_by`, `created_at`.

Constraint: unique item/operation key. Index: item/created.

### `cost_library_item_state_history`

Columns: `id`, `item_id`, `workspace_id`, `from_state`, `to_state`, `operation_key`, `effective_at`, `change_reason`, `created_by`, `created_at`.

Constraint: unique item/operation key. Index: item/created.

### `component_suppliers` and `component_brands`

Each contains `id`, `workspace_id`, `name`, `normalized_name`, `sort_order`, `metadata_json`, `created_at`, `updated_at`, with unique workspace/normalized name and workspace sort indexes.

### `cost_library_component_drafts`

Columns: `id`, `workspace_id`, `created_by`, `title`, `draft_json`, `status`, `converted_item_id`, `created_at`, `updated_at`, `converted_at`, `discarded_at`.

Constraints/triggers:

- status in `active|converted|discarded`;
- valid JSON object;
- maximum 65,536-byte draft JSON;
- maximum 100 active drafts per workspace; and
- indexes by workspace/status and workspace/creator.

## Upload Metadata Schema

### `upload_sessions`

Columns:

- `id`, `workspace_id`, `actor_user_id`;
- `surface` in `project-image|component-image|component-attachment`;
- target entity type/ID;
- storage bucket/path;
- file name/type/size/checksum;
- status in `reserved|pending|finalized|failed|expired|deleted|aborted`;
- expiry, metadata JSON, created/updated timestamps.

Indexes: workspace/created and active admission capacity.

### `upload_assets`

Columns:

- identity/ownership: `id`, `workspace_id`, actor, optional project/estimate, upload session;
- surface/target fields;
- status in `reserved|pending|finalized|deleted|removed|failed|aborted`;
- file name/type/size/checksum;
- scan status/provider/result/timestamp;
- scan override actor/reason/expiry/checksum;
- storage bucket/path/thumbnail;
- metadata JSON and timestamps.

Indexes: scan override queue, workspace/created, project/created.

### `upload_events`

Columns: `id`, upload session/asset, workspace/actor, `event_type`, `metadata_json`, `created_at`.

Indexes: asset/created and workspace/created.

## Estimate Row Storage Contract

The current `estimate_row_items` shape is rebuilt in `migrations/0073_estimate_calculation_input_constraints.sql`.

Component-relevant columns:

- identity/location: `id`, `estimate_id`, `node_id`, `sort_order`;
- visible component values: `material`, `description`, `supplier`, `supplier_id`, `unit`, `unit_cost`;
- row-owned values: quantity fields, contingency, adjustment, miscellaneous cost, discipline, designation;
- source receipt: `source_library_item_id`, `link_state`, `source_snapshot_json`, `metadata_json`, `category_node_id`;
- concurrency: `row_revision`, `created_at`, `updated_at`.

Indexes: estimate/sort, node, and partial source Library item.

### Library instance JSON receipt

The bounded source snapshot must include:

- component ID/type/version/update timestamp;
- selected option ID/label;
- active option summaries required by the row selector;
- component fields and selected option-derived values;
- lifecycle/category/supplier/brand/media receipt; and
- no private attachment URL or raw cross-tenant storage secret.

### Project component JSON authority

Project component identity is stored in source/metadata JSON and shared by its instances inside one project. Its option graph must contain stable option IDs and one explicit default. Each row still stores its own selected option ID.

## R2 And Upload Policies

### Component images

- logical bucket: `component-images` in `ARCH_UPLOADS_R2`;
- maximum 12 MiB and 24 million pixels;
- JPEG/PNG/WebP/AVIF;
- scan not required;
- component/workspace-owned path; and
- saved descriptor includes bucket/path/thumbnail, not only a public URL.

### Component attachments

- logical bucket: `component-attachments` in `ARCH_UPLOADS_R2`;
- maximum 20 MiB;
- PDF/XLS/XLSX only;
- private/brokered download;
- malware scan required through `UPLOAD_JOBS_QUEUE`; and
- cannot become usable component metadata before the clean or authorized override state.

## Required Upload-to-Variant State Machine

```text
reserve session
  -> write R2 object
  -> finalize upload asset
  -> queue/complete scan when required
  -> save component transaction binds asset/path to item + option
  -> authoritative detail read exposes safe metadata
```

Failure paths:

- modal discard before save: remove newly owned object and mark asset/session aborted/removed;
- failed component save: retain only a short cleanup grace period, then remove unclaimed object;
- variant replacement: bind new object, then remove/supersede prior binding after successful transaction;
- variant delete: block if in use, then remove/supersede attachment bindings and queue object cleanup;
- component delete: detach Estimate rows first, then remove component-owned metadata/objects according to retention policy;
- expired session/orphan asset: existing cleanup job removes unclaimed storage safely.

## Confirmed Schema/Write Gaps

1. Attachment `item_id`/`price_option_id` lack foreign keys and same-item/workspace enforcement.
2. Component create/update action plans never write attachment binding rows.
3. `active_price_option_id` is not a declared foreign key and must be validated transactionally.
4. D1 does not itself enforce one default active option or one current cost entry; action and/or targeted unique indexes must do so.
5. linked Estimate rows have no relational `price_option_id` column; selection lives in JSON, so all fan-out queries must extract/validate it consistently.
6. Library row fan-out currently writes one active/default option to every row.
7. Project component option authority is duplicated in row snapshots without a deterministic merge/update contract.
8. optimistic UI objects can diverge from saved D1 identities and attachment bindings.

## Fix-Forward Schema Plan

### Migration A — Attachment relational repair

Rebuild `cost_library_item_variant_attachments` once with:

- `item_id NOT NULL REFERENCES cost_library_items(id) ON DELETE CASCADE`;
- `price_option_id NOT NULL REFERENCES cost_library_item_price_options(id) ON DELETE CASCADE`;
- optional `upload_asset_id REFERENCES upload_assets(id) ON DELETE SET NULL`;
- same existing review/storage constraints and indexes; and
- a guarded data copy that rejects or quarantines orphan/mismatched rows before swap.

The save action additionally verifies the option belongs to the item and workspace. SQLite cannot express that whole composite invariant with the current primary keys alone.

### Migration B — Database invariants

Prefer targeted unique indexes where current data permits:

- one active default option per item/workspace;
- one non-deleted current cost entry per option; and
- one current approved attachment per option/cost-entry scope when the product rule requires it.

If SQLite partial-index limitations or existing data prevent a direct index, keep a single transaction validator; do not create shadow compatibility columns.

### Migration C — Optional row selection column only if justified

The preferred lean path is to keep selected option identity in the existing bounded source snapshot and centralize JSON extraction. Add a first-class `selected_price_option_id` row column only if query/constraint requirements cannot be met cleanly. Do not duplicate it merely for convenience.

## Pre-Migration Data Audit

The implementation unit must inspect and reconcile:

- items with zero active variants;
- items with zero or multiple active defaults;
- options whose `item_id`/`workspace_id` mismatch;
- current cost entry count per option;
- attachment rows with missing/mismatched item/option/upload asset;
- attachment storage paths referenced by more than one intended owner;
- Library-linked rows whose selected option is absent/inactive;
- rows whose snapshot component ID disagrees with `source_library_item_id`;
- Project component groups with divergent option graphs/defaults; and
- unclaimed component R2 assets outside the cleanup grace period.

Repairs are fix-forward and scoped to the bound `ARCH_DB`/`ARCH_UPLOADS_R2`. No legacy Supabase mutation is part of this pack.

## Transaction And Read-Back Invariants

- Component, option, cost, attachment, version, and linked-row writes succeed or fail together.
- Every update checks expected component version/update timestamp plus the current affected-row fingerprint.
- Option IDs survive rename/reorder.
- Default changes never change an existing row's selected option.
- Linked row reconciliation resolves values from that row's selected option.
- Project reconciliation is limited to one project and one logical component identity.
- API results return authoritative IDs/revisions or perform an immediate authoritative detail read.
- R2 deletion never precedes the successful D1 mutation that removes the last valid reference.

## Beta Simplification Boundary

Keep numbered D1 migrations, component/row revisions, issue content revisions, and Cloudflare migration tags because they are operational ordering and concurrency controls. Remove user-facing/product V1/V2 language, duplicate editors, dual payload contracts, fallbacks, and unused legacy adapters after current data is proven clean.
