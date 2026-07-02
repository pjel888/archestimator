# Executive Brief & Scope

**Date:** 2026-05-30

## Why Archestimator Needs Indexing

Archestimator's architecture is already query-heavy, tenant-scoped, collaboration-heavy, and estimate-tree-heavy. Database-heavy surfaces include:

- **Workspace homebase** — project list, favorites, membership lookups
- **Estimate tree/editor** — `estimate_nodes` and `estimate_row_items` fetched by `estimate_id`, ordered by `sort_order`
- **Component library** — suppliers, brands, cost items, variants, price history all loaded by `workspace_id` with ordering
- **Collaboration invites** — pending invite resolution, lifecycle state filtering, token hash lookups
- **Shared links / publication** — `project_publications` by project/status, publication event tracking
- **AI audit / package builder** — `ai_action_runs`, `ai_tool_calls`, `ai_data_access_events`, `ai_package_apply_commands`

All of these surfaces share common query patterns: tenant-scoped (`workspace_id`, `project_id`), order-sensitive (`sort_order`, `created_at`, `updated_at`), and state-filtered (pending, published, active).

## Current Assessment

- **Data volume is still small** — no immediate production emergency. Cache health is excellent (index hit rate ~99.98%, table hit rate 100%).
- **Supabase Performance Advisor** already flags many unindexed foreign keys. The worst clusters are `ai_data_access_events` (8 unindexed FKs), `ai_tool_calls` (7), `cost_library_items` (7), and several collaboration/library/estimate tables (4–6 each).
- **`pg_stat_statements`** is installed and should be used for query evidence.
- **Migration parity** must be verified before designing indexes, especially for shared-link recipient/comment/response/event tables.

## Beta-Readiness Principle

**Prove query plans before applying indexes.** Every candidate index must be tied to a real query shape, tested with EXPLAIN, and compared before/after. No speculative indexes.

## Non-Goals

- No migration creation in this planning task
- No DDL execution (CREATE INDEX, ALTER TABLE, etc.)
- No app-code query optimization
- No search engine integration (Algolia, Meilisearch, etc.)
- No vector/RAG index work unless separately approved
- No materialized view creation without explicit approval
