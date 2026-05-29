# 03 Data Model and Versioning Plan

## Principles

- Keep `cost_library_items` as the stable component identity table.
- Add append-only history instead of overwriting history.
- Preserve current estimate snapshot behavior: existing estimate rows do not silently change when a library component changes.
- Keep current denormalized columns on `cost_library_items` for fast reads and backwards compatibility.
- New tables must enable RLS and explicit authenticated grants.

## Proposed Schema

### Enum: `component_lifecycle_state`

Values:

- `draft`
- `in_production`
- `available`
- `discontinued`
- `archived`

`draft` is for incomplete components. `in_production` means the component is actively produced or sourced but may not be a preferred estimating default. `available` is the normal selectable state. `discontinued` preserves historical records but warns users. `archived` hides from normal browse/search unless filters include archived.

### Alter `cost_library_items`

Add:

- `lifecycle_state component_lifecycle_state not null default 'available'`
- `lifecycle_state_changed_at timestamptz not null default now()`
- `lifecycle_state_changed_by uuid references auth.users(id) on delete set null`
- `active_price_option_id uuid null`
- `current_version_number integer not null default 1`

Keep existing:

- `unit_cost`
- `misc_cost`
- `pricing_source`
- `pricing_date`
- `confidence`

Those existing fields should mirror the active price option for fast shared reads.

Migration ordering lock: add `active_price_option_id` only after `cost_library_item_price_options` exists. The first implementation should use the partial unique default-price constraint as the integrity source of truth. The pointer can be backfilled and indexed after default price options exist, but the system must not depend on a cyclic create-order relationship between `cost_library_items` and `cost_library_item_price_options`.

If `active_price_option_id` is kept, add its foreign key only after backfill:

- `references public.cost_library_item_price_options(id) on delete set null`
- preferably `deferrable initially deferred`

The migration must avoid a hard FK cycle during initial table creation.

### Table: `cost_library_item_versions`

Purpose: whole-component version control.

Suggested columns:

- `id uuid primary key default gen_random_uuid()`
- `item_id uuid not null references public.cost_library_items(id) on delete cascade`
- `workspace_id uuid not null references public.workspaces(id) on delete cascade`
- `version_number integer not null`
- `snapshot jsonb not null`
- `change_summary text not null default ''`
- `change_reason text not null default ''`
- `effective_at timestamptz not null default now()`
- `created_by uuid references auth.users(id) on delete set null`
- `created_at timestamptz not null default now()`

Constraints:

- unique `(item_id, version_number)`
- check `version_number > 0`

The snapshot should include identity, categorization, supplier, lifecycle state, active price option id, and current denormalized price fields.

### Table: `cost_library_item_price_options`

Purpose: multiple selectable pricing options per component.

Suggested columns:

- `id uuid primary key default gen_random_uuid()`
- `item_id uuid not null references public.cost_library_items(id) on delete cascade`
- `workspace_id uuid not null references public.workspaces(id) on delete cascade`
- `label text not null`
- `unit text not null`
- `unit_cost numeric not null default 0`
- `misc_cost numeric not null default 0`
- `currency text not null default 'PHP'`
- `pricing_source text`
- `pricing_date date`
- `confidence text`
- `source_url text`
- `notes text not null default ''`
- `supplier_id uuid references public.component_suppliers(id) on delete set null`
- `is_active boolean not null default true`
- `is_default boolean not null default false`
- `created_by uuid references auth.users(id) on delete set null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints:

- check trimmed label and unit are non-empty.
- check `unit_cost >= 0`.
- check `misc_cost >= 0`.
- one default active option per item, via partial unique index on `(item_id)` where `is_default and is_active`.
- a component that is selectable must have exactly one default active option, enforced by RPC validation and verified by tests.

### Table: `cost_library_item_price_history`

Purpose: record pricing changes over time.

Suggested columns:

- `id uuid primary key default gen_random_uuid()`
- `price_option_id uuid not null references public.cost_library_item_price_options(id) on delete cascade`
- `item_id uuid not null references public.cost_library_items(id) on delete cascade`
- `workspace_id uuid not null references public.workspaces(id) on delete cascade`
- `old_snapshot jsonb`
- `new_snapshot jsonb not null`
- `change_reason text not null default ''`
- `effective_at timestamptz not null default now()`
- `created_by uuid references auth.users(id) on delete set null`
- `created_at timestamptz not null default now()`

### Table: `cost_library_item_state_history`

Purpose: lifecycle-state audit.

Suggested columns:

- `id uuid primary key default gen_random_uuid()`
- `item_id uuid not null references public.cost_library_items(id) on delete cascade`
- `workspace_id uuid not null references public.workspaces(id) on delete cascade`
- `from_state component_lifecycle_state`
- `to_state component_lifecycle_state not null`
- `effective_at timestamptz not null default now()`
- `change_reason text not null default ''`
- `created_by uuid references auth.users(id) on delete set null`
- `created_at timestamptz not null default now()`

## Server Action Contract

Add server actions in `src/lib/component-library/actions.ts` or a scoped companion module. The server actions should be thin validation/cache wrappers over SQL RPCs for writes that touch more than one table:

- `createCostLibraryComponent(input)`
- `updateCostLibraryComponent(input)`
- `createComponentPriceOption(input)`
- `updateComponentPriceOption(input)`
- `changeComponentLifecycleState(input)`

Every action must:

1. Resolve current user and workspace.
2. Validate foreign keys belong to the same workspace where applicable.
3. Validate category node exists if provided.
4. Insert/update the identity row.
5. Insert version/history rows in the same logical transaction.
6. Revalidate `/workshop/library` and `/workshop/components`.

Because Supabase server actions do not automatically wrap multiple client calls in one transaction, SQL RPC functions are required for create/update flows that write `cost_library_items`, price options, versions, and history rows together. If an implementation proposes multiple Supabase client calls for a component create/update, stop and re-plan before writing code.

Minimum RPCs:

- `create_cost_library_component(...)`
- `update_cost_library_component(...)`
- `set_cost_library_component_lifecycle_state(...)`
- `upsert_cost_library_component_price_option(...)`

Each RPC must validate workspace ownership for folder, supplier, category node, and existing item references before mutating rows.

Every versioned mutation RPC should:

1. lock the target `cost_library_items` row when mutating an existing component;
2. validate same-workspace ownership for `library_folder_id`, `supplier_id`, `category_node_id`, price option ids, and item ids;
3. update denormalized current fields when the default price option changes;
4. increment `current_version_number` when estimate-visible fields change;
5. insert version/history rows in the same transaction;
6. return the new component/version/price identifiers needed by server actions.

## Estimate Insertion Contract

When inserting a component into an estimate row, `source_snapshot` should be expanded to include:

- `sourceLibraryItemId`
- `componentVersionNumber`
- `componentVersionId`
- `priceOptionId`
- `pricingDate`
- `pricingSource`
- `categoryNodeId`
- `supplierId`
- copied `unit_cost`, `misc_cost`, `unit`, `currency`

Existing rows remain immutable snapshots until an explicit refresh workflow is planned.

## RLS and Grants

For new public tables:

- `alter table ... enable row level security`
- workspace-member policies for all workspace-scoped tables
- explicit `grant select, insert, update, delete on ... to authenticated` only on mutable current-state tables when direct table mutation is intentionally allowed
- history/version tables get `select, insert` only; normal app users should not get update/delete policies on append-only history
- explicit `revoke execute on function ... from public, anon` before granting intended RPCs to `authenticated`
- explicit function grants for RPCs
- avoid `security definer` on exposed public functions unless required; if required, lock `search_path`, narrow grants, and consider private-schema helper functions

This is required because Supabase public-schema Data API exposure is moving toward explicit grants for new objects, and RLS must be enabled for exposed tables.

Use database-level integrity where practical. Prefer composite foreign keys or constraint triggers that prove `supplier_id`, `library_folder_id`, price options, versions, and history rows match the component `workspace_id`, so correctness does not depend only on server-action callers.

## Backfill Rules

For every existing `cost_library_items` row:

1. Create one default active price option from `unit`, `unit_cost`, `misc_cost`, `pricing_source`, `pricing_date`, `confidence`, and `supplier_id`.
2. Set `lifecycle_state = 'available'`.
3. Insert version `1` with a snapshot of the current component row and default price option.
4. Insert an initial state history row with `from_state = null`, `to_state = 'available'`.
5. Backfill `active_price_option_id` after the price option row exists.

The backfill must be idempotent or protected by `where not exists` checks so partial migration retries do not duplicate price options, versions, or history rows.

Before enabling RLS or finishing blocks that depend on deferred constraints after backfill, explicitly drain deferred constraints with `set constraints all immediate;` where the migration uses deferrable constraints or trigger-heavy seed/backfill paths.

## Snapshot Compatibility

Extend `source_snapshot` without breaking legacy estimate/template rows. New snapshots should include:

- `sourceLibraryItemId`
- `componentVersionNumber`
- `componentVersionId`
- `priceOptionId`
- `priceOptionLabel`
- `pricingDate`
- `pricingSource`
- `categoryNodeId`
- `categoryPath`
- `supplierId`
- `supplier`
- copied `unit_cost`, `misc_cost`, `unit`, `currency`

Readers must tolerate old snapshots where `componentVersionId` and `priceOptionId` are missing. Update both estimate-row and estimate-template insertion/read paths when implementation reaches the snapshot phase.
