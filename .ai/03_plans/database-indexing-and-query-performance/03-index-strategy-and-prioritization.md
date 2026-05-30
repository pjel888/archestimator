# Index Strategy & Prioritization

**Date:** 2026-05-30

## Three-Layer Index Plan

### Layer A — Critical Path Composite Indexes

Target the flows users feel immediately. These are candidates only — each requires EXPLAIN before/after evidence.

| Area | Query Pattern | Index Strategy |
|------|-------------|----------------|
| Estimate editor | `estimate_nodes WHERE estimate_id ORDER BY sort_order` | Test `(estimate_id, sort_order)` — note `(estimate_id, parent_id, sort_order)` already exists |
| Estimate rows | `estimate_row_items WHERE estimate_id ORDER BY sort_order` | Test `(estimate_id, sort_order)` — current `(estimate_id, node_id, sort_order)` may not serve global sort |
| Project list | `projects WHERE workspace_id ORDER BY updated_at DESC` | Already has `(workspace_id, updated_at DESC)` |
| Project estimates | `estimates WHERE project_id ORDER BY updated_at DESC` | Already has `(project_id, updated_at DESC)` |
| Component library | `cost_library_items WHERE workspace_id ORDER BY category, name` | Add/test `(workspace_id, category, name)` |
| Library folders | `library_folders WHERE workspace_id ORDER BY sort_order, name` | Add/test `(workspace_id, sort_order, name)` |
| Suppliers | `component_suppliers WHERE workspace_id ORDER BY sort_order, name` | Add/test `(workspace_id, sort_order, name)` |
| Brands | `component_brands WHERE workspace_id ORDER BY sort_order, name` | Add/test `(workspace_id, sort_order, name)` |
| Published links | `project_publications WHERE project_id/status ORDER BY published_at DESC` | Already has `(project_id, status, published_at DESC)` |

### Layer B — RLS / Foreign-Key Relationship Indexes

In Supabase, RLS-heavy apps pay hidden costs if policy predicates are not indexed. The core RLS shape is `workspace_id`, `project_id`, `estimate_id`, `user_id`, `role`.

**Prioritize these families:**

- `workspace_id` on every tenant-owned table
- `project_id` on every project-owned table
- `estimate_id` on every estimate/sheet/tree/row table
- `user_id` / `actor_user_id` on membership, audit, AI, invite, and event tables
- Partial indexes for "active" records: pending invitations, active shared links, non-deleted variant entries, published publications

**Do not blindly index every FK.** Classify unindexed FKs into:

1. Must index now — on critical path, high join frequency
2. Monitor until table grows — on secondary path, low current volume
3. Not worth indexing yet — tiny tables, no join pattern
4. Already covered by composite index — redundant with existing

### Layer C — Search Indexes Only When UI Needs Server-Side Search

| Technology | Use Case | When to Deploy |
|-----------|----------|----------------|
| B-tree | Exact filters and ordered lists | Already in use |
| `pg_trgm` + GIN | Fuzzy name/description search | When search moves server-side |
| `tsvector` + GIN | Full-text search | When structured search is a product requirement |
| Vector indexes (pgvector) | AI semantic retrieval | Only if stored embeddings/RAG is explicitly approved |

**Current state:** `pg_stat_statements` is installed. `pg_trgm` is not installed. Do not add `pg_trgm` until server-side search is implemented.

---

## P0–P4 Prioritization Lanes

### P0 — Audit and Evidence Only (No DDL)

- Migration parity check
- Query inventory
- Index inventory
- Supabase advisor capture
- EXPLAIN protocol
- Candidate ranking

### P1 — Critical Path Indexes for Staging

Candidate indexes to evaluate, **not blindly apply**:

```sql
-- Candidate only: estimate rendering
CREATE INDEX IF NOT EXISTS estimate_nodes_estimate_sort_idx
  ON public.estimate_nodes (estimate_id, sort_order);

CREATE INDEX IF NOT EXISTS estimate_row_items_estimate_sort_idx
  ON public.estimate_row_items (estimate_id, sort_order);

-- Candidate only: component library
CREATE INDEX IF NOT EXISTS cost_library_items_workspace_category_name_idx
  ON public.cost_library_items (workspace_id, category, name);

CREATE INDEX IF NOT EXISTS library_folders_workspace_sort_name_idx
  ON public.library_folders (workspace_id, sort_order, name);

CREATE INDEX IF NOT EXISTS component_suppliers_workspace_sort_name_idx
  ON public.component_suppliers (workspace_id, sort_order, name);

CREATE INDEX IF NOT EXISTS component_brands_workspace_sort_name_idx
  ON public.component_brands (workspace_id, sort_order, name);

-- Candidate only: collaboration invite pending state
CREATE INDEX IF NOT EXISTS collaboration_invitations_project_pending_created_idx
  ON public.collaboration_invitations (project_id, created_at DESC)
  WHERE lifecycle_state = 'pending'
    AND accepted_at IS NULL
    AND revoked_at IS NULL;
```

**⚠️ These are candidates only.** Each requires EXPLAIN before/after evidence. Some may be redundant with existing indexes. Some may not be useful until row counts grow. Never add duplicates of existing equivalent indexes. Check against current migrations before proposing.

### P2 — RLS / FK Relationship Indexes

Classify unindexed FKs into the four buckets above. Add indexes in batches, comparing query plans and write overhead after each batch.

### P3 — Search Indexes (ENTERPRISE MVP)

Only after server-side search is introduced. Start with `pg_trgm` + GIN for fuzzy search on names/descriptions. Graduate to `tsvector` + GIN if full-text search becomes a real product requirement.

### P4 — Enterprise / Long-Term

- Materialized summaries if aggregate queries become expensive
- Database views or RPCs for homebase/project summaries
- Scheduled index usage review
- Unused-index cleanup
