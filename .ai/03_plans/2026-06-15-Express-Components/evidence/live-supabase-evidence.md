---
title: Express Components Live Supabase Evidence
type: docs
date: 2026-06-15
---

# Express Components Live Supabase Evidence

Read-only checks were run against Supabase project `ebxxqidacheyapmmzavr`.

## Relevant Tables

`estimate_row_items` already contains the row facts express components need:

- identity and placement: `id`, `estimate_id`, `node_id`, `sort_order`
- source/linkage: `source_library_item_id`, `source_snapshot`, `link_state`
- editable component facts: `material`, `description`, `supplier`, `unit`, `unit_cost`, `misc_cost`, `quantity`
- governance: `metadata`, `row_revision`, constraints, history RPCs
- extra grouping/link fields the plan must account for: `discipline`, `designation`, `category_node_id`, `supplier_id`, and `contingency_percentage`

`source` is derived by the app from `source_library_item_id`; it is not a persisted row column.

The live insert RPC already returns the persisted row snapshot, including `rowRevision`, and is idempotent by `correlation_id`. The current app action discards that result.

The live update RPC already accepts express fields such as `material`, `description`, `supplier`, `unit`, `unitCost`, `miscCost`, `discipline`, `designation`, `categoryNodeId`, `supplierId`, `sourceSnapshot`, and `metadata`. Omitted `metadata`/`sourceSnapshot` keys preserve current JSON. Sending either top-level key replaces that JSON value, so JSON-changing operations must server-merge complete objects.

`cost_library_items` and `cost_library_item_price_options` remain the reusable workspace component aggregate.

`library_folders` is workspace-scoped folder organization with `folder_kind` values `taxonomy` and `custom`.

## RLS Enabled

| Table | RLS enabled |
| --- | --- |
| `cost_library_item_price_options` | true |
| `cost_library_items` | true |
| `estimate_row_items` | true |
| `library_folders` | true |

## Relevant Policies

`estimate_row_items`:

- read by viewers/managers through `can_access_estimate` or `can_edit_estimate`
- insert/update/delete by managers through `can_edit_estimate`

`cost_library_items`:

- read by workspace members/editors/admins
- write by workspace editors/admins

`cost_library_item_price_options`:

- read by workspace members

`library_folders`:

- read by workspace members
- write by workspace editors

## Provider Implication

The existing table and policy shape supports estimate-row scoped express components. A new table would require explicit grants, RLS policies, generated type updates, and new RPC/history boundaries.
