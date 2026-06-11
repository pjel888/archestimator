# 05 — Database Optimization Audit

**Date**: 2026-06-11 | **Status**: Source-audited; EXPLAIN and linked-provider proof pending | **Prior Oracle**: 6 passes | **Last Update**: 2026-06-11 02:42 UTC
**Scope**: Schema, indexes, RPCs, triggers

---

## Key Takeaways

1. **Existing indexes are good** — tree queries, project/estimate listings, and collaboration joins are well-indexed.
2. **6 cost library tables need composite-index proof** on `(workspace_id, item_id)` — needed for the parallel `.in()` queries in `getCurrentWorkspaceComponentLibrary()`. Treat as a hypothesis until `EXPLAIN ANALYZE` proves planner usage.
3. **`source_snapshot` JSONB (1-10KB per row) is over-fetched** — only needed for linked rows. Conditional fetch would save 5-10KB per unlinked row.
4. **RLS policies use nested EXISTS** — `can_access_project` and `can_access_estimate` may add 100-200ms cumulative across 15+ tables. Profile with `EXPLAIN ANALYZE` before optimizing.
5. **Triggers fire per-row** — `*_with_history` functions run on every row mutation. Bulk template inserts fire the trigger individually per row.

---

## 1. Tables in the Rendering Path

| Table | Rows (typical) | Key Columns | JSONB Columns |
|-------|---------------|-------------|---------------|
| `closed_beta_users` | 10-100 | `email`, `status` | None |
| `profiles` | 10-1000 | `id`, `display_name`, `email` | None |
| `workspaces` | 1-10 | `id`, `name`, `slug` | None |
| `workspace_members` | 1-100 | `workspace_id`, `user_id`, `role` | None |
| `projects` | 1-100 | `id`, `workspace_id`, `name` | `metadata` JSONB |
| `project_members` | 1-50 | `project_id`, `user_id`, `role` | None |
| `estimates` | 1-200 | `id`, `project_id`, `name`, `sheet_code` | `metadata` JSONB |
| `estimate_nodes` | 10-1000 | `id`, `estimate_id`, `parent_id`, `kind` | `metadata` JSONB |
| `estimate_row_items` | 10-5000 | `id`, `estimate_id`, `node_id`, `sort_order` | `metadata` JSONB, `source_snapshot` JSONB |
| `estimate_sheet_members` | 1-50 | `estimate_id`, `user_id`, `role` | None |
| `estimate_sheet_access_settings` | 1-10 | `estimate_id`, `inherit_project_access` | None |
| `collaboration_invitations` | 0-50 | `project_id`, `email`, `scope` | None |
| `project_publications` | 0-5 | `project_id`, `status` | `snapshot_json` JSONB |
| `shared_link_recipients` | 0-50 | `publication_id`, `email` | None |
| `cost_library_items` | 10-5000 | `workspace_id`, `category`, `name` | `metadata` JSONB |
| `component_category_nodes` | 10-100 | `sort_order` | None |
| `component_suppliers` | 10-500 | `workspace_id`, `name` | None |
| `component_brands` | 10-500 | `workspace_id`, `name` | None |
| `library_folders` | 5-200 | `workspace_id`, `parent_id` | None |
| `cost_library_item_price_options` | 10-10000 | `workspace_id`, `item_id`, `is_default` | None |
| `cost_library_item_versions` | 10-5000 | `workspace_id`, `item_id`, `version_number` | None |
| `cost_library_item_price_history` | 10-10000 | `workspace_id`, `item_id`, `effective_at` | None |
| `cost_library_item_state_history` | 10-5000 | `workspace_id`, `item_id`, `effective_at` | None |
| `cost_library_item_variant_cost_entries` | 10-5000 | `workspace_id`, `item_id`, `is_current` | None |
| `cost_library_item_variant_attachments` | 10-5000 | `workspace_id`, `item_id` | None |
| `estimate_templates` | 5-200 | `workspace_id`, `name` | None |
| `estimate_template_nodes` | 10-1000 | `template_id`, `sort_order` | None |
| `estimate_template_row_items` | 10-5000 | `template_id`, `sort_order` | None |
| `legal_terms_acceptances` | 1-1000 | `user_id`, `terms_key`, `terms_version` | None |

---

## 2. Existing Indexes

### Project & Estimate Indexes
| Index | Table | Columns | Used By |
|-------|-------|---------|---------|
| `projects_workspace_id_idx` | `projects` | `(workspace_id)` | Project list by workspace |
| `projects_workspace_updated_at_idx` | `projects` | `(workspace_id, updated_at DESC)` | Sorted project list |
| `estimates_project_id_idx` | `estimates` | `(project_id)` | Estimate list by project |
| `estimates_project_updated_at_idx` | `estimates` | `(project_id, updated_at DESC)` | Sorted estimate list |
| `estimate_nodes_estimate_parent_sort_idx` | `estimate_nodes` | `(estimate_id, parent_id, sort_order)` | **Tree queries** |
| `estimate_row_items_estimate_node_sort_idx` | `estimate_row_items` | `(estimate_id, node_id, sort_order)` | **Row item queries** |

### Collaboration Indexes
| Index | Table | Columns |
|-------|-------|---------|
| `project_members_workspace_user_idx` | `project_members` | `(workspace_id, user_id)` |
| `project_members_user_idx` | `project_members` | `(user_id)` |
| `estimate_sheet_members_project_user_idx` | `estimate_sheet_members` | `(project_id, user_id)` |
| `estimate_sheet_members_user_idx` | `estimate_sheet_members` | `(user_id)` |

### Assessment
- **Tree queries**: Well-indexed ✅ (`estimate_nodes_estimate_parent_sort_idx`, `estimate_row_items_estimate_node_sort_idx`)
- **Project/Estimate listings**: Good ✅ (`_updated_at_idx` for sorted lists)
- **Collaboration**: Good ✅ (join columns indexed)

This assessment is local schema inspection only. Future implementation must prove local and linked-provider migration state before claiming database readiness.

---

## 3. Missing Indexes

| # | Table | Recommended Index | Query Pattern | Impact |
|---|-------|------------------|---------------|--------|
| 1 | `cost_library_item_price_options` | `(workspace_id, item_id)` | `.eq("workspace_id").in("item_id", ids)` | HIGH — 6 sub-queries use this pattern |
| 2 | `cost_library_item_versions` | `(workspace_id, item_id)` | `.eq("workspace_id").in("item_id", ids)` | MEDIUM |
| 3 | `cost_library_item_price_history` | `(workspace_id, item_id)` | `.eq("workspace_id").in("item_id", ids)` | MEDIUM |
| 4 | `cost_library_item_state_history` | `(workspace_id, item_id)` | `.eq("workspace_id").in("item_id", ids)` | MEDIUM |
| 5 | `cost_library_item_variant_cost_entries` | `(workspace_id, item_id)` | `.eq("workspace_id").in("item_id", ids)` | MEDIUM |
| 6 | `cost_library_item_variant_attachments` | `(workspace_id, item_id)` | `.eq("workspace_id").in("item_id", ids)` | MEDIUM |
| 7 | `cost_library_items` | `(workspace_id, lifecycle_state)` | `.eq("workspace_id").neq("lifecycle_state", "archived")` | MEDIUM |
| 8 | `legal_terms_acceptances` | `(user_id, terms_key, terms_version, accepted_at DESC)` | Composite filter + sort | LOW |
| 9 | `estimate_templates` | `(workspace_id, sort_order)` | `.eq("workspace_id").order("sort_order")` | LOW |

---

## 4. RPC & Trigger Functions

### Calculation Triggers (Run on INSERT/UPDATE)
| Function | Trigger | On Table | Purpose |
|----------|---------|----------|---------|
| `estimate_row_subtotal` | — | `estimate_row_items` | `quantity * unit_cost` |
| `estimate_row_contingency_value` | — | `estimate_row_items` | Subtotal × contingency% |
| `estimate_row_line_total` | — | `estimate_row_items` | subtotal + misc + contingency |
| `estimate_sheet_total` | — | `estimates` | SUM of all line totals |

### Data Integrity Triggers
| Function | Trigger | Purpose |
|----------|---------|---------|
| `validate_estimate_node_tree` | — | Validates tree hierarchy/cycles |
| `enforce_estimate_node_tree` | `estimate_nodes` (BEFORE INSERT/UPDATE) | Enforces tree validity |
| `enforce_estimate_row_item_area_node` | `estimate_row_items` (BEFORE INSERT/UPDATE) | Row items must belong to area nodes |

### History/Versioning Functions
| Function | Purpose |
|----------|---------|
| `estimate_row_item_snapshot` | Build JSONB snapshot of row |
| `estimate_row_context` | Build lightweight context |
| `estimate_sheet_snapshot` | Full sheet JSONB snapshot |
| `create_estimate_sheet_version` | Named version snapshot |
| `insert_estimate_row_item_with_history` | Insert + record event |
| `update_estimate_row_item_with_history` | Update + record event |
| `replace_estimate_row_item_with_history` | Replace + record event |
| `delete_estimate_row_item_with_history` | Delete + record event |
| `delete_estimate_node_with_history` | Delete node + children + event |
| `restore_estimate_sheet_version_as_copy` | Restore version as new sheet |
| `update_estimate_details_with_history` | Update metadata + event |
| `unlink_estimate_row_item_from_library_with_history` | Detach from library |

### Utility Functions
| Function | Purpose |
|----------|---------|
| `ensure_current_user_profile` | Creates profile if missing |

### Trigger Performance Concern
- `enforce_estimate_node_tree` runs on every node INSERT/UPDATE — validates entire tree hierarchy
- History-writing triggers (`*_with_history`) run on every row mutation — inserts into event tables
- For bulk operations (e.g., inserting 50 rows from a template), each row fires the trigger individually

---

## 5. Query Pattern Analysis

### Most Frequent Queries (per page load)
| Query | Frequency | Table Scan Risk |
|-------|-----------|-----------------|
| `estimate_nodes` by `estimate_id` + `sort_order` | 1-2x | Low (indexed) |
| `estimate_row_items` by `estimate_id` + `sort_order` | 1x | Low (indexed) |
| `cost_library_items` by `workspace_id` | 1x | Medium (no lifecycle_state index) |
| `cost_library_item_price_options` by `workspace_id` + `item_id` IN | 1x | HIGH (no composite index) |
| `project_members` by `project_id` | 1x | Low (indexed) |
| `workspace_members` by `workspace_id` | 1x | Medium (only indexed on `workspace_id`, good enough) |
| `estimates` by `project_id` + `sheet_code` | 1x | Low (indexed) |

### Largest Potential Scans
| Table | Max Rows Scanned | Worst Case |
|-------|-----------------|------------|
| `cost_library_items` (per workspace) | 5,000 | Full scan if no lifecycle_state filter used by planner |
| `cost_library_item_price_options` (per workspace) | 10,000 | Full scan without composite index |
| `estimate_row_items` (per estimate) | 5,000 | OK — indexed on (estimate_id, node_id, sort_order) |

---

## 6. JSONB Column Impact

| Table | JSONB Column | Typical Size | Fetched? | Issue |
|-------|-------------|-------------|----------|-------|
| `projects` | `metadata` | 1-5KB | ✅ `select("*")` | Over-fetched |
| `estimates` | `metadata` | 1-5KB | ✅ `select("*")` | Over-fetched |
| `estimate_nodes` | `metadata` | 0.5-2KB | ✅ `select("*")` | Over-fetched |
| `estimate_row_items` | `metadata` | 0.5-2KB | ✅ `select("*")` | Over-fetched |
| `estimate_row_items` | `source_snapshot` | 1-10KB | ✅ `select("*")` | **Heavily over-fetched** — only needed when row is linked to library |
| `cost_library_items` | `metadata` | 1-5KB | ✅ `select("*")` | Over-fetched |
| `project_publications` | `snapshot_json` | 10-100KB | ✅ `select("*")` | **Massively over-fetched** — only needed when viewing publication |

### Recommendation
- `source_snapshot` on `estimate_row_items`: Only fetch when `link_state = 'linked'` (use conditional select or separate query)
- `snapshot_json` on `project_publications`: Only fetch when viewing publication details (not on every page load)
- All `metadata` columns: Only fetch specific keys needed (use `select("metadata->key_name")` or omit entirely)

---

## 7. Migration Health

- Core schema: `20260518090000_archestimator_core_schema.sql` — well-structured
- Index optimization: `20260519190958_optimize_workspace_estimate_list_indexes.sql` — good coverage
- Collaboration: `20260526142913_project_sheet_collaboration_access.sql` — comprehensive RLS + access control
- Schema alterations are applied via additive migrations (no destructive changes observed) ✅

---

## 8. Recommended Database Actions

### Immediate (Sprint 1)
1. Add composite index `(workspace_id, item_id)` on `cost_library_item_price_options` only after `EXPLAIN ANALYZE` shows the current plan needs it.
2. Add composite index `(workspace_id, lifecycle_state)` on `cost_library_items` only after the future migration proves local and linked safety.
3. Replace `select('*')` with explicit columns to avoid JSONB overhead (see R2 in recommendations)

### Short-term (Sprint 2-3)
4. Profile RLS policy overhead with `EXPLAIN ANALYZE` on estimate page queries
5. Add composite indexes for remaining cost library tables
6. Consider conditional `source_snapshot` fetching for `estimate_row_items`

### Long-term
7. Evaluate moving calculation triggers to application layer (Postgres triggers add per-row overhead)
8. Consider materialized views for frequently-accessed aggregates (project totals, library summaries)
