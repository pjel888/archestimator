# Critical User Flows & Query Hotspots

**Date:** 2026-05-30

## Homebase / Project List

**Route:** `/workshop`

Query columns:

- `projects.workspace_id` — tenant scope
- `projects.updated_at` — recency ordering
- `project_favorites.workspace_id`, `project_favorites.user_id`, `project_favorites.created_at`
- `estimate_favorites.workspace_id`, `estimate_favorites.user_id`, `estimate_favorites.created_at`
- `project_members.user_id` — shared project access
- `estimate_sheet_members.user_id` — sheet-only access

---

## Project Estimates

**Route:** `/workshop/projects/[projectId]/estimates`

Query columns:

- `estimates.project_id` — project scope
- `estimates.updated_at` — recency ordering
- `estimate_nodes.estimate_id` — tree nodes
- `estimate_row_items.estimate_id` — row items

---

## Estimate Editor

**Route:** `/workshop/projects/[projectId]/estimates/[nodeId]`

Query columns:

- `estimate_nodes.estimate_id` — estimate scope
- `estimate_nodes.parent_id` — tree hierarchy
- `estimate_nodes.sort_order` — render order
- `estimate_row_items.estimate_id` — row scope
- `estimate_row_items.node_id` — node scope
- `estimate_row_items.sort_order` — row order

Note: Browser repo fetches `estimate_nodes` and `estimate_row_items` by `estimate_id` ordered by `sort_order`. The most important estimate indexes match `estimate_id + render order`.

---

## Component Library

**Route:** `/workshop/library`

Query columns:

- `cost_library_items.workspace_id` — tenant scope
- `cost_library_items.category` — category filter
- `cost_library_items.name` — name order
- `cost_library_items.supplier_id`, `cost_library_items.brand_id`, `cost_library_items.category_node_id` — joins
- `cost_library_item_price_options.workspace_id`, `cost_library_item_price_options.item_id` — variant lookup
- `cost_library_item_versions.workspace_id`, `cost_library_item_versions.item_id`
- `cost_library_item_price_history.workspace_id`, `cost_library_item_price_history.item_id`
- `cost_library_item_state_history.workspace_id`, `cost_library_item_state_history.item_id`
- `library_folders.workspace_id`, `library_folders.parent_id`, `library_folders.sort_order`
- `component_suppliers.workspace_id` — tenant scope
- `component_brands.workspace_id` — tenant scope

The app loads suppliers, brands, and cost items by `workspace_id`, orders by `sort_order`/`name`/`category`, and batch-loads variants/history by `workspace_id + item_id IN (...)`.

---

## Collaboration Invites

**Route:** `/invite/[token]`, Teamspaces modal

Query columns:

- `collaboration_invitations.project_id` — project scope
- `collaboration_invitations.estimate_id` — sheet scope
- `collaboration_invitations.email` — invitee lookup
- `collaboration_invitations.lifecycle_state` — pending filter
- `collaboration_invitations.accepted_at`, `collaboration_invitations.revoked_at` — state
- `collaboration_invitation_tokens.token_hash` — token resolution
- `collaboration_invitation_tokens.invitation_id` — FK join
- `collaboration_invitation_tokens.expires_at` — expiry check

---

## Shared Links / Publication

**Route:** `/share/[token]`, `/api/share/[token]/*`

Query columns:

- `project_publications.project_id` — project scope
- `project_publications.status` — active filter
- `project_publications.published_at` — recency ordering
- `project_publications.token_hash` — token resolution
- `project_publication_events.publication_id` — event scope
- `project_publication_events.created_at` — event ordering

### ⚠️ Schema-Parity Warning

The app code references `shared_link_recipients`, `shared_link_comments`, `shared_link_responses`, and `shared_link_events` (via `src/lib/publication/`). Verify these tables exist in the live Supabase schema before designing indexes for them. Migration `20260528220000_project_shared_link_overhaul` may not be applied to the linked remote.

---

## AI Audit / Package Builder

- `ai_action_runs.workspace_id`, `ai_action_runs.actor_user_id`, `ai_action_runs.created_at`
- `ai_tool_calls.run_id`, `ai_tool_calls.workspace_id`, `ai_tool_calls.actor_user_id`, `ai_tool_calls.target_project_id`, `ai_tool_calls.target_estimate_id`
- `ai_data_access_events.workspace_id`, `ai_data_access_events.actor_user_id`, `ai_data_access_events.target_project_id`, `ai_data_access_events.target_estimate_id`
- `ai_package_apply_commands.workspace_id`, `ai_package_apply_commands.idempotency_key`, `ai_package_apply_commands.actor_user_id`
