# Schema Verification

Status: read-only verification against Supabase project `ebxxqidacheyapmmzavr`.

No schema or data mutations were made.

## Relevant Tables

| Table | Rows | RLS | Policy count | UX relevance |
| --- | ---: | --- | ---: | --- |
| `cost_library_items` | 154 | Enabled | 3 | Component identity, card data, lifecycle, current price linkage. |
| `component_category_nodes` | 685 | Enabled | 4 | Canonical taxonomy. |
| `library_folders` | 685 | Enabled | 4 | Workspace folder/tree representation. |
| `cost_library_item_versions` | 157 | Enabled | 2 | Version history. |
| `cost_library_item_price_options` | 155 | Enabled | 1 | Current and alternate pricing. |
| `cost_library_item_price_history` | 156 | Enabled | 1 | Price history. |
| `cost_library_item_state_history` | 156 | Enabled | 2 | Lifecycle audit history. |
| `component_suppliers` | 22 | Enabled | 1 | Supplier mode and supplier picker. |
| `component_brands` | 29 | Enabled | 1 | Brand mode and brand picker. |
| `cost_library_item_variant_cost_entries` | 155 | Enabled | 1 | Variant cost entries. |
| `cost_library_item_variant_attachments` | 0 | Enabled | 1 | Attachments, currently empty. |
| `profile_role_hardening_audit` | 0 | Disabled | 0 | Security advisory unrelated to Library UI but relevant to beta readiness. |

## Core Item Schema

| Column | Type class | UI implication |
| --- | --- | --- |
| `id` | uuid | Stable item identity. |
| `workspace_id` | uuid | Workspace isolation. |
| `name` | text | Primary card/search label. |
| `description` | text | Detail/inspector content and search. |
| `category` | text | Legacy/display category. |
| `category_node_id` | text nullable | Canonical taxonomy link. |
| `library_folder_id` | uuid nullable | Folder tree link. |
| `supplier`, `supplier_id` | text/uuid nullable | Supplier metadata and picker. |
| `brand`, `brand_id` | text/uuid nullable | Brand metadata and picker. |
| `unit` | text | Cost unit display. |
| `unit_cost`, `misc_cost` | numeric | Cost display and price comparison. |
| `pricing_source` | text nullable | Trust and source evidence. |
| `pricing_date` | date nullable | Freshness and filter candidate. |
| `confidence` | text nullable | Trust indicator and filter candidate. |
| `thumbnail_path` | text nullable | Image rendering and storage lookup. |
| `metadata` | jsonb | Extension point, not a primary UI contract without review. |
| `lifecycle_state` | enum | Available/discontinued/archived state. |
| `active_price_option_id` | uuid nullable | Current price option link. |
| `current_version_number` | integer | Versioned edits and audit history. |
| `created_by`, `created_at`, `updated_at` | uuid/timestamp | Audit and maintenance context. |

## Lifecycle Verification

| State | Count | Route visibility |
| --- | ---: | --- |
| `available` | 153 | Visible |
| `discontinued` | 1 | Visible under current route query |
| `archived` | 0 | Excluded by route query |

Planning implication: either the UI must make discontinued state visible or the repository query/design must intentionally exclude it. This is a product decision, not a styling issue.

## Field Coverage Verification

| Field group | Current coverage |
| --- | ---: |
| Thumbnail path | 154/154 visible items |
| Supplier text/id | 153/154 visible items |
| Brand text/id | 118/154 visible items |
| Active price option id | 154/154 visible items |
| Price options with confidence | 155/155 price options |
| Price options with pricing date | 151/155 price options |
| Price options with source URL | 73/155 price options |
| Price option image/thumbnail paths | 0/155 price options |

## RLS And Policy Findings

The Library domain tables checked have RLS enabled and policies present. The exception found by direct policy check is `profile_role_hardening_audit`, which has RLS disabled and no policies.

Supabase advisors also reported broad security/performance warnings. The ones most relevant to this Library planning pass:

| Advisory | Relevance |
| --- | --- |
| `profile_role_hardening_audit` RLS disabled | Beta readiness issue. Not directly used by Library UI, but should be tracked before closed beta hardening is claimed. |
| `cost_library_items` multiple permissive policies | Potential query/RLS overhead. Should be reviewed before scaling performance work. |
| Security-definer RPC advisories, including cost-library update/lifecycle functions | Must be reviewed before expanding edit/detail flows. Do not assume mutation safety just because UI exists. |

## Schema-Driven UX Decisions

1. The detail/inspector plan must include current price option, price history, version history, lifecycle history, supplier/brand records, and attachment state.
2. Search/facets should use fields with meaningful coverage: category path, supplier, brand, lifecycle, confidence, pricing date, source URL.
3. Missing supplier is not a broad workflow. Missing brand may be a targeted hygiene filter.
4. Thumbnail missing-state design is not currently high priority because paths exist for all visible items.
5. Discontinued visibility is the main data-state ambiguity.
6. Any edit flow must be version/RPC-aware and policy-reviewed.

## Required Pre-Implementation DB Rechecks

Run these read-only checks immediately before coding starts:

1. Row counts for relevant tables.
2. Lifecycle distribution.
3. Field coverage.
4. Root category distribution.
5. RLS/policy status.
6. Supabase security and performance advisors.
7. RPC signatures and grants for any mutation flow in scope.
