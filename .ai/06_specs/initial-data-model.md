# Archestimator Canonical Database Schema

**Date:** 2026-05-29<br />
**Status:** Active<br />
**Purpose:** Documents the canonical Supabase / Postgres database schema implemented across all migrations.

---

## 1. Core Platform Tables

### Table: `profiles`
Represents application users, linked to Supabase Auth.
*   `id` (uuid, PK, references `auth.users`)
*   `email` (text, unique)
*   `display_name` (text, nullable)
*   `avatar_url` (text, nullable)
*   `default_workspace_id` (uuid, nullable, references `workspaces`)
*   `created_at` (timestamptz)
*   `updated_at` (timestamptz)

### Table: `workspaces`
Represents the contractor workspace / company boundaries.
*   `id` (uuid, PK)
*   `name` (text)
*   `created_at` (timestamptz)
*   `updated_at` (timestamptz)

### Table: `workspace_members`
Maps profiles to workspaces with roles.
*   `workspace_id` (uuid, PK, references `workspaces` ON DELETE CASCADE)
*   `profile_id` (uuid, PK, references `profiles` ON DELETE CASCADE)
*   `role` (text: `owner` | `admin` | `member`)
*   `created_at` (timestamptz)

---

## 2. Project & Estimate Workspace

### Table: `projects`
Represents a construction project.
*   `id` (uuid, PK)
*   `workspace_id` (uuid, references `workspaces` ON DELETE CASCADE)
*   `name` (text)
*   `client_name` (text, nullable)
*   `location` (text, nullable)
*   `metadata` (jsonb, holds project budget, cover image URL, etc.)
*   `created_at` (timestamptz)
*   `updated_at` (timestamptz)

### Table: `estimates`
An estimate sheet version/revision inside a project.
*   `id` (uuid, PK)
*   `project_id` (uuid, references `projects` ON DELETE CASCADE)
*   `name` (text)
*   `sheet_code` (text, unique within project, e.g., `ES-001`)
*   `status` (text: `draft` | `under-review` | `approved` | `superseded` | `archived`)
*   `created_at` (timestamptz)
*   `updated_at` (timestamptz)

### Table: `estimate_nodes`
Hierarchical tree nodes organizing an estimate.
*   `id` (uuid, PK)
*   `estimate_id` (uuid, references `estimates` ON DELETE CASCADE)
*   `parent_id` (uuid, references `estimate_nodes` ON DELETE CASCADE, nullable)
*   `name` (text)
*   `kind` (text: `group` | `area` — constraint: only `group` and `area` permitted)
*   `sort_order` (numeric)
*   `created_at` (timestamptz)

### Table: `estimate_row_items`
Individual line item cost entries. Must be attached to `area` nodes only.
*   `id` (uuid, PK)
*   `estimate_id` (uuid, references `estimates` ON DELETE CASCADE)
*   `node_id` (uuid, references `estimate_nodes` ON DELETE CASCADE)
*   `sort_order` (numeric)
*   `material` (text)
*   `description` (text, nullable)
*   `supplier` (text, nullable)
*   `unit` (text)
*   `quantity` (numeric)
*   `unit_cost` (numeric)
*   `contingency_percentage` (numeric, defaults to `0`, constraints: `-100` to `100` to allow discounts)
*   `misc_cost` (numeric, defaults to `0`)
*   `row_revision` (integer, default `1`)
*   `discipline` (text, nullable)
*   `designation` (text, nullable)
*   `link_state` (text: `unlinked` | `linked-clean` | `linked-overridden` | `detached` | `source-changed`)
*   `source_library_item_id` (uuid, references `cost_library_items` ON DELETE SET NULL, nullable)
*   `source_snapshot` (jsonb, stores a copy of library metadata at insert time)
*   `correlation_id` (uuid, nullable, for optimistic transaction idempotency)
*   `created_at` (timestamptz)
*   `updated_at` (timestamptz)

---

## 3. Reusable Cost Library & Templates

### Table: `cost_library_items`
Master costs database.
*   `id` (uuid, PK)
*   `workspace_id` (uuid, references `workspaces` ON DELETE CASCADE)
*   `category_node_id` (uuid, references `component_category_nodes`, nullable)
*   `brand_id` (uuid, references `component_brands`, nullable)
*   `supplier_id` (uuid, references `component_suppliers`, nullable)
*   `library_folder_id` (uuid, references `library_folders`, nullable)
*   `name` (text)
*   `description` (text, nullable)
*   `created_at` (timestamptz)
*   `updated_at` (timestamptz)

### Table: `component_category_nodes`
Taxonomy organizing cost categories.
*   `id` (uuid, PK)
*   `parent_id` (uuid, references `component_category_nodes`, nullable)
*   `name` (text)
*   `sort_order` (integer)

### Table: `component_suppliers`
*   `id` (uuid, PK)
*   `workspace_id` (uuid, references `workspaces`)
*   `name` (text, unique within workspace)

### Table: `component_brands`
*   `id` (uuid, PK)
*   `workspace_id` (uuid, references `workspaces`)
*   `name` (text, unique within workspace)

### Table: `library_folders`
*   `id` (uuid, PK)
*   `workspace_id` (uuid, references `workspaces`)
*   `parent_id` (uuid, references `library_folders`, nullable)
*   `name` (text)
*   `sort_order` (numeric)

### Reusable Estimate Templates
Templates mirror the two-kind structure of estimate sheets (`group` and `area`).
*   `estimate_templates` (id, workspace_id, name, description)
*   `estimate_template_nodes` (id, template_id, parent_id, name, kind, sort_order)
*   `estimate_template_row_items` (id, template_id, template_node_id, material, description, supplier, unit, quantity, unit_cost, contingency_percentage, misc_cost, sort_order)

---

## 4. History, Collaboration & Publications

### Table: `estimate_sheet_events`
Append-only log recording every mutation inside an estimate sheet for Activity History.
*   `id` (uuid, PK)
*   `estimate_id` (uuid, references `estimates` ON DELETE CASCADE)
*   `actor_user_id` (uuid, references `profiles`, nullable)
*   `event_type` (text, e.g. `row_created`, `row_updated`, `row_deleted`, `tree_reordered`)
*   `event_source` (text)
*   `estimate_node_id` (uuid, nullable)
*   `target_row_id` (uuid, nullable)
*   `old_snapshot` (jsonb, nullable)
*   `new_snapshot` (jsonb, nullable)
*   `changed_fields` (text[], nullable)
*   `total_delta` (numeric, nullable)
*   `payload` (jsonb, nullable)
*   `correlation_id` (uuid, nullable)
*   `created_at` (timestamptz)

### Table: `project_publications`
Durable view-only snapshot links shared with clients.
*   `id` (uuid, PK)
*   `project_id` (uuid, references `projects` ON DELETE CASCADE)
*   `token_hash` (text, unique)
*   `password_hash` (text, nullable)
*   `snapshot_json` (jsonb)
*   `is_active` (boolean, default `true`)
*   `expires_at` (timestamptz, nullable)
*   `created_at` (timestamptz)
*   `updated_at` (timestamptz)

### Table: `project_publication_recipients`
Allow-listed emails permitted to view the shared link.
*   `id` (uuid, PK)
*   `publication_id` (uuid, references `project_publications` ON DELETE CASCADE)
*   `email` (text)
*   `access_token_hash` (text, nullable)
*   `invited_at` (timestamptz)
*   `last_accessed_at` (timestamptz, nullable)

### Table: `project_publication_comments`
Client/receiver comments left on the public shared link.
*   `id` (uuid, PK)
*   `publication_id` (uuid, references `project_publications` ON DELETE CASCADE)
*   `recipient_id` (uuid, references `project_publication_recipients` ON DELETE CASCADE, nullable)
*   `author_name` (text)
*   `content` (text)
*   `created_at` (timestamptz)

### Table: `project_publication_decisions`
Approval / Decline records on the publication snapshot.
*   `id` (uuid, PK)
*   `publication_id` (uuid, references `project_publications` ON DELETE CASCADE)
*   `recipient_id` (uuid, references `project_publication_recipients` ON DELETE CASCADE)
*   `decision` (text: `approved` | `declined` | `revision_requested`)
*   `feedback` (text, nullable)
*   `snapshot_version` (integer)
*   `created_at` (timestamptz)

---

## 5. Security & RLS Policies

All platform tables enforce Row Level Security (RLS) policies.
*   **Workspace Boundary Rule:** Users can only select, insert, update, or delete rows if they are authenticated and have active membership in the parent workspace (`workspace_members`).
*   **Platform Admin Bypass:** Profiles mapped to the CEO app-role via `resolve_app_role_for_email()` bypass standard RLS filters to enable platform-wide admin monitoring.
*   **Anon Execution Restrictions:** Execute privileges on database RPC functions (`public.create_project_estimate_package_with_history`, `public.reorder_estimate_nodes`, etc.) are explicitly revoked from `anon` role and restricted to `authenticated` users with validated editing access.
