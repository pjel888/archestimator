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

The live replace RPC is not omit-preserve for JSON blobs. It replaces `metadata` and `source_snapshot` from the replacement payload, which means move/replace paths can drop `metadata.expressComponent` unless U8 adds a carry/merge/block rule.

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

## Source-Less Row Shape Capture

Read-only provider query on 2026-06-15 against project `ebxxqidacheyapmmzavr` selected source-less rows from `estimate_row_items` with sanitized row ids and shape flags only. Secrets were not recorded.

Query shape: `source_library_item_id is null`, selecting `id`, `material`, `description`, `metadata`, `category_node_id`, `unit_cost`, `source_snapshot`, and `link_state`.

Summary:

- 31 total source-less rows.
- 29 have `link_state = "unlinked"`.
- 2 have `link_state = "linked-overridden"`.
- 3 of the 29 unlinked rows match the legacy blank placeholder shape: material equals `Drag or add a component here`, `metadata.tags` includes `manual-row-placeholder`, no category, zero cost, and no image.
- 26 of the 29 unlinked rows are edited/named source-less rows with no `metadata.expressComponent`.
- 13 unlinked rows have category, nonzero cost, image, and non-manual tags.
- 13 unlinked rows have no category, nonzero cost, no image, and no tags.
- No captured source-less row has `metadata.expressComponent.kind = "express"`.

Shape counts:

| Shape | Count |
| --- | ---: |
| `unlinked` + edited/named + no manual tag + no express metadata + category + nonzero cost + image | 13 |
| `unlinked` + legacy blank label + `manual-row-placeholder` + no express metadata + no category + zero cost + no image | 3 |
| `unlinked` + edited/named + no manual tag + no express metadata + no category + nonzero cost + no image | 13 |
| `linked-overridden` + edited/named + no manual tag + no express metadata + category + nonzero cost + image | 2 |

Sanitized row-shape sample:

| # | id prefix | link state | material shape | tags | express metadata | category | unit cost | image |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `332a7365` | unlinked | edited/named | other-tags | no | yes | nonzero | yes |
| 2 | `80f83f88` | linked-overridden | edited/named | other-tags | no | yes | nonzero | yes |
| 3 | `10cbe09b` | linked-overridden | edited/named | other-tags | no | yes | nonzero | yes |
| 4 | `d070a03f` | unlinked | edited/named | other-tags | no | yes | nonzero | yes |
| 5 | `abb7df26` | unlinked | edited/named | other-tags | no | yes | nonzero | yes |
| 6 | `1ca1627e` | unlinked | legacy blank label | manual-row-placeholder | no | no | 0 | no |
| 7 | `4cbdd32e` | unlinked | edited/named | other-tags | no | yes | nonzero | yes |
| 8 | `36e61e4e` | unlinked | edited/named | other-tags | no | yes | nonzero | yes |
| 9 | `25fe3e73` | unlinked | edited/named | none | no | no | nonzero | no |
| 10 | `d8bda0a9` | unlinked | legacy blank label | manual-row-placeholder | no | no | 0 | no |
| 11-23 | mixed | unlinked | edited/named | none | no | no | nonzero | no |
| 24 | `e9233eb6` | unlinked | legacy blank label | manual-row-placeholder | no | no | 0 | no |
| 25-31 | mixed | unlinked | edited/named | other-tags | no | yes | nonzero | yes |

Implementation implication: source-less is not a blank predicate. U2's `row_blank_added` migration and U6/U8 projection logic must classify true legacy blanks by material/tag shape, not by `source_library_item_id is null` or `link_state = "unlinked"` alone. Edited/named source-less rows need an explicit manual/project-local classification decision before Project projection ships.
