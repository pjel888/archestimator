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

## Applied Provider Migrations — 2026-06-15

Target project was confirmed through Supabase MCP before mutation:

- Project: `Archestimator`
- Ref: `ebxxqidacheyapmmzavr`
- Region: `ap-southeast-2`
- Status: `ACTIVE_HEALTHY`
- Database: Postgres `17.6.1.121`
- Non-target project visible but untouched: `archestimator` / `hrpdwqurngnyajuhbkdg`

Applied with Supabase MCP `apply_migration` to `ebxxqidacheyapmmzavr` only:

| Remote version | Name | Purpose |
| --- | --- | --- |
| `20260615093524` | `express_components_foundation` | Replaces insert-history RPC for server-owned row insertion, adds copied-express rekey trigger, adds atomic express-row promotion RPC, grants only app-facing RPCs to `authenticated`. |
| `20260615093648` | `harden_express_trigger_execute` | Revokes `authenticated` execute on the trigger-only rekey helper so it is not exposed as a callable RPC endpoint. |

Local migration filenames were reconciled to the provider-recorded versions:

- `supabase/migrations/20260615093524_express_components_foundation.sql`
- `supabase/migrations/20260615093648_harden_express_trigger_execute.sql`

## Post-Apply Provider Probes

All probes below were run against `ebxxqidacheyapmmzavr`; rollback behavior was verified so provider proof rows/items were not left behind.

### Function and trigger presence

SQL probe confirmed:

- `insert_estimate_row_item_with_history(uuid, uuid, uuid, jsonb, uuid, uuid)` exists.
- `promote_express_row_to_library_component(uuid, uuid, uuid, uuid, uuid, uuid)` exists.
- `rekey_copied_express_component_row_metadata()` exists.
- Trigger `rekey_copied_express_component_row_metadata` exists on `public.estimate_row_items`.

### Execute grants

SQL probe confirmed:

- `insert_estimate_row_item_with_history`: `anon_execute=false`, `authenticated_execute=true`.
- `promote_express_row_to_library_component`: `anon_execute=false`, `authenticated_execute=true`.
- `rekey_copied_express_component_row_metadata`: after follow-up hardening, `anon_execute=false`, `authenticated_execute=false`, `service_role_execute=true`.

Advisor note: the two app-facing RPCs are intentionally signed-in callable and follow the existing history-RPC pattern. The trigger helper was the accidental callable surface caught by advisors and fixed forward.

### Insert + idempotency rollback probe

Using signed-in claims for existing editor/owner `4e23801d-6fc2-4886-b980-d15ca2b164b8`, a rollback transaction called `insert_estimate_row_item_with_history` twice with the same `correlation_id`.

Observed result:

- requested `row_id` was preserved
- inserted material was `Provider rollback express vanity`
- returned `rowRevision` was `1`
- first call `idempotent=false`
- second call `idempotent=true`
- second call preserved the same `row_id`

### Copy rekey rollback probe

A direct rollback insert with `metadata.sourceTemplateRowId` and `metadata.expressComponent.id = old-provider-proof-id` observed:

- `metadata.expressComponent.kind = express`
- `sourceTemplateRowId = template-row-provider-proof`
- express id changed from `old-provider-proof-id`

### Promotion rollback probe

Within one rollback transaction, an express row was inserted through the insert RPC, promoted through `promote_express_row_to_library_component`, then promoted again.

Observed result:

- first promotion `idempotent=false`
- first promotion created a library item result (`itemId` present)
- second promotion `idempotent=true`
- row had `source_library_item_id is not null`
- `source_snapshot.sourceType = promoted_express_component`
- `metadata.expressComponent` removed
- `link_state = linked-clean`

### Non-member denial rollback probe

Using signed-in claims for a random non-member UUID, insert RPC returned `Workspace access denied.` before row mutation.

### Rollback cleanliness

Post-probe counts confirmed no rollback proof data remained:

- `estimate_row_items` rows with provider-proof material names: `0`
- `cost_library_items` with provider-proof names: `0`

## Type Generation Evidence

`supabase gen types typescript --project-id ebxxqidacheyapmmzavr` succeeded and confirmed the generated RPC surface now includes:

- `insert_estimate_row_item_with_history`
- `promote_express_row_to_library_component`

The committed type update preserves existing local nullable-argument compatibility patches and helper exports while adding the new promotion RPC type.

## Supabase Docs/Changelog Check

Per Supabase skill guidance, `https://supabase.com/changelog.md` was checked on 2026-06-15. Recent breaking-change entries relevant to database/API exposure were reviewed; the applied Express migrations add functions/triggers only, no new exposed tables, no pg_graphql dependency, and no Auth/OAuth behavior changes. The April 28, 2026 Data/GraphQL table auto-exposure breaking change does not affect this no-new-table migration.
