# Content Catalogue

Status: corrected against read-only Supabase queries for project `ebxxqidacheyapmmzavr`.

## Verified Counts

| Metric | Current verified value | Notes |
| --- | --- | --- |
| `cost_library_items` total rows | 154 | All rows in the table at verification time. |
| Visible to current route query | 154 | Repository filters `lifecycle_state != archived`; no archived rows were present in this count. |
| Available items | 153 | `lifecycle_state = available`. |
| Discontinued items | 1 | Still included by the route query because only `archived` is excluded. |
| Items with thumbnail path | 154 | Previous "~50 thumbnails" claim is wrong. |
| Items with supplier text and id | 153 | Previous "supplier data sparse" claim is wrong. |
| Items with brand text and id | 118 | Brand coverage is incomplete but not sparse at the previously stated level. |
| Items with active price option id | 154 | All visible items have an active price option id. |
| `component_category_nodes` total rows | 685 | Includes roots, branches, and leaf nodes. |
| Root category nodes | 9 | DB roots, not inferred UI-promoted groups. |
| `library_folders` rows | 685 | Mirrors or derives from category structure for workspace library navigation. |
| `component_suppliers` rows | 22 | Workspace-scoped supplier records. |
| `component_brands` rows | 29 | Workspace-scoped brand records. |
| Variant attachments | 0 | No attachment rows at verification time. |

## Verified Root Category Distribution

| Root category | Root id | Second-level nodes | Descendant nodes | Visible components |
| --- | --- | ---: | ---: | ---: |
| Administration | `section-administration` | 4 | 32 | 1 |
| Site | `section-site` | 3 | 34 | 1 |
| Structure | `section-structure` | 6 | 44 | 1 |
| Envelope | `section-envelope` | 10 | 67 | 0 |
| Architecture | `section-architecture` | 10 | 75 | 12 |
| Materials | `section-materials` | 13 | 87 | 0 |
| Finishes | `section-finishes` | 9 | 82 | 30 |
| Objects | `section-objects` | 12 | 119 | 107 |
| Systems | `section-systems` | 15 | 136 | 2 |

This replaces the previous "12 top-level divisions" conclusion. If the authenticated UI presents 12 visible groups, that must be documented as a UI grouping/promotion layer and mapped back to DB roots before implementation.

## Schema Fields Used By The Page

### `cost_library_items`

| Field | UX relevance |
| --- | --- |
| `id`, `workspace_id` | Identity and workspace isolation. |
| `name`, `description` | Search and card/inspector content. |
| `category`, `category_node_id`, `library_folder_id` | Taxonomy labels, grouping, tree selection. |
| `supplier`, `supplier_id` | Search, supplier mode, card metadata, add/edit flow. |
| `brand`, `brand_id` | Search, brand mode, card metadata, add/edit flow. |
| `unit`, `unit_cost`, `misc_cost`, `active_price_option_id` | Visible costing and future price-detail inspector. |
| `pricing_source`, `pricing_date`, `confidence` | Trust evidence, filter/facet candidates, proposal confidence. |
| `thumbnail_path` | Card image and potential LCP contributor. |
| `metadata` | Extension surface; must not become unstructured UI dependency without schema review. |
| `lifecycle_state` | Visibility, discontinued/archived state, archive workflow. |
| `current_version_number` | Version-aware detail/edit flow. |
| `created_by`, `created_at`, `updated_at` | Audit trail and maintenance context. |

### Related Tables

| Table | UX relevance |
| --- | --- |
| `component_category_nodes` | Canonical taxonomy. |
| `library_folders` | Workspace folder/tree representation. |
| `component_suppliers` | Supplier mode and supplier combobox records. |
| `component_brands` | Brand mode and brand combobox records. |
| `cost_library_item_price_options` | Current and alternate price options. |
| `cost_library_item_price_history` | Price history evidence for future inspector. |
| `cost_library_item_versions` | Version history for detail/edit governance. |
| `cost_library_item_state_history` | Lifecycle audit evidence. |
| `cost_library_item_variant_cost_entries` | Variant cost detail. |
| `cost_library_item_variant_attachments` | Attachment evidence, currently empty. |

## Content Quality Implications

1. Empty top-level categories are real in the DB. Envelope and Materials currently have zero directly assigned visible components under their subtree in the verification query. The UI should either justify showing empty branches or collapse/prioritize populated paths.
2. Objects dominates the current visible set with 107 of 154 visible components. Filtering and grouping must avoid making the page feel like a furniture/object-only catalogue.
3. Supplier coverage is nearly complete. Do not prioritize "fix missing suppliers" as a broad P1 based on old evidence.
4. Brand coverage has a concrete gap: 36 visible items lack brand data. A "brand missing" hygiene filter may be useful, but it is not the primary catalogue problem.
5. Thumbnail coverage is complete by path. Performance work should focus on image loading strategy, request cost, dimensions, and LCP, not missing thumbnails.
6. The single discontinued item needs explicit UI treatment or route-query exclusion. It should not be silently displayed as a normal available component.

## Catalogue Verification Query Set

The following read-only checks should be rerun before implementation starts:

1. Visible item count by lifecycle state.
2. Thumbnail/supplier/brand/active price option coverage.
3. Root category recursive distribution.
4. Categories with zero visible descendants.
5. Discontinued and archived rows that would or would not appear in the route query.
6. RLS and policy status for all Library domain tables.

No content improvement recommendation should rely on inferred DOM counts when DB truth is available.
