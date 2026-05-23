# 10 Third-Pass Implementation Readiness Gate

**Date:** 2026-05-23
**Status:** Third-pass QA complete for planning documents.

## Honest Confidence Statement

This plan cannot be guaranteed at 100% certainty before implementation because the final proof requires running the migration, regenerated types, UI tests, server actions, build, and browser smoke against a live dev server. The third pass does reduce the known planning risks to explicit gates so implementation can fail fast instead of drifting.

## Fresh Evidence Checked

- Linked Supabase project `ebxxqidacheyapmmzavr` still has:
  - `cost_library_items`: 70 rows
  - `component_category_nodes`: 685 rows
  - `component_suppliers`: 43 rows
  - `library_folders`: 685 rows
  - `estimate_row_items` with `source_library_item_id`: 2 rows
- `cost_library_items` still has no lifecycle, version, price-option, price-history, or state-history columns/tables.
- No proposed versioning tables exist yet:
  - `cost_library_item_versions`
  - `cost_library_item_price_options`
  - `cost_library_item_price_history`
  - `cost_library_item_state_history`
- `package.json` currently uses:
  - `next`: `16.2.6`
  - `react`: `19.2.4`
  - `react-complex-tree`: `^2.6.1`
- Current npm metadata rechecked:
  - `react-complex-tree`: `2.6.1`, MIT, React peer `>=16.0.0`
  - `@xyflow/react`: `12.10.2`, MIT, React peer `>=17`
  - `react-arborist`: `3.7.0`, MIT, adds DnD/windowing/redux dependency surface
  - `@visx/hierarchy`: `3.12.0`, React peer range excludes React 19
  - `@headless-tree/react`: `1.7.0`, broad React peers, but not needed for first slice

## Third-Pass Corrections

### 1. Active price option integrity

The first implementation should use one active default price option as the canonical current price:

- table: `cost_library_item_price_options`
- constraint: partial unique index on `(item_id)` where `is_default and is_active`
- RPC validation: selectable components must have exactly one active default price option

`cost_library_items.active_price_option_id` should be optional and added/backfilled only after the price option table exists. It must not be the only integrity mechanism.

### 2. Atomic writes

Any create/update flow that writes component identity, price options, versions, price history, or state history must use SQL RPCs or an equivalent database transaction boundary. A server action that performs separate Supabase client calls is not acceptable for those flows.

Minimum RPC surface:

- `create_cost_library_component(...)`
- `update_cost_library_component(...)`
- `set_cost_library_component_lifecycle_state(...)`
- `upsert_cost_library_component_price_option(...)`

Each versioned mutation must lock the item row, validate same-workspace foreign keys, update denormalized current fields when needed, increment `current_version_number` for estimate-visible changes, and insert history/version records atomically.

### 2a. Append-only access

History and version tables must be append-only for normal app access. Grant `select` and `insert` only; do not grant normal update/delete access or policies on version/history rows. Exposed mutation RPCs should explicitly revoke `execute` from `public` and `anon`, then grant only intended functions to `authenticated`.

### 3. No new visualization package

No new visualization dependency should be added in the first implementation. Use:

- existing `react-complex-tree` for folder/category tree selection
- existing `Modal` for the add/edit surface
- existing `HeaderIconToolbar` `addActions` slot for entry
- existing `ControlSelect` for compact dropdowns
- existing `Badge` for lifecycle state
- compact timeline/list markup for version, price, and state history

`@xyflow/react` remains a later option only if a true node-link graph workflow appears.

### 4. Existing local-only form is not the target

`NewComponentForm` and helper `createComponent()` remain a warning, not the implementation template. The `/workshop/library` workflow must persist to Supabase and use structured category/folder/supplier ids.

### 5. Browser smoke remains open

Previous route checks to `http://localhost:3000/workshop/library` and `/workshop/components` timed out. Implementation cannot close until a clean dev server is started with protected-route dev-auth env and browser smoke proves:

- route loads
- Add Component opens from the center sheet toolbar
- modal is usable at desktop and mobile widths
- save success inserts/selects the component in the current context
- state and pricing controls do not overflow compact workshop layout

### 6. Modal and row contracts

Implementation must define these UI behaviors:

- widened shared `Modal`, bounded scroll body, sticky compact footer
- initial focus to Name and focus return to Add Component
- dirty-close guard and saving-state close protection
- distinct Library folder, Reporting category, and Supplier controls
- row anatomy that keeps lifecycle and pricing metadata compact instead of widening into a table

### 7. History UI gate

If edit price or edit state ships in the first slice, the compact read-only History view is required in the same slice. Deferring history UI is acceptable only if the first implementation is add-only and history is verified through database/repository tests.

## Locked Implementation Order

1. Migration and backfill.
2. Generated Supabase types.
3. Repository read model.
4. RPC wrappers and server actions.
5. Add Component modal shell and form validation.
6. Sheet rendering for lifecycle and price metadata.
7. Read-only history view.
8. Estimate insertion snapshot extension.
9. Focused tests, `validate`, `build`, Supabase advisor check, browser smoke.

Do not parallelize UI implementation ahead of the schema/RPC contract. UI can be designed in parallel, but write integration should wait until the input/output contract is stable.

## Approval Gates Before Code

Implementation should not begin until these are accepted:

- lifecycle vocabulary: `draft`, `in_production`, `available`, `discontinued`, `archived`
- default current-price rule: exactly one active default price option
- discontinued behavior: warn but allow insertion, unless product direction blocks it
- archived behavior: hidden from default browse
- history UI first release: compact timeline/list, not a graph

## Stop Conditions During Implementation

Stop and re-plan if:

- the migration cannot be made idempotent for the 70 existing rows
- RPCs cannot validate workspace ownership for folder, supplier, category, and item ids
- RLS/grants cannot be verified
- append-only history/version grants cannot be enforced
- generated Supabase types conflict with current repository normalization
- legacy estimate/template snapshots cannot be read after adding version fields
- browser smoke still cannot load `/workshop/library` after a clean dev server restart
- code graph or test evidence shows high-risk coupling not covered by focused tests

## Third-Pass Verdict

The plan is ready for user review, not implementation. The next safe step is approval of the lifecycle vocabulary and current-price rule, then execution through a schema-first implementation plan.
