# Critical User Flows & Query Hotspots

**Date:** 2026-05-30

---

## Homebase / Project List

**Route:** `/workshop`

**Source:** `src/lib/repositories/workspace-repository.ts` — `getWorkshopHomebaseData`, `listCurrentWorkspaceProjects`

**Query patterns:**

| Pattern | Columns | Index Coverage |
|---------|---------|---------------|
| `project_favorites WHERE workspace_id/user_id ORDER BY created_at DESC LIMIT` | `workspace_id`, `user_id`, `created_at` | TBD |
| `estimate_favorites WHERE workspace_id/user_id ORDER BY created_at DESC LIMIT` | `workspace_id`, `user_id`, `created_at` | TBD |
| `projects WHERE workspace_id ORDER BY updated_at DESC LIMIT` | `workspace_id`, `updated_at` | Appears covered |
| `project_members WHERE user_id` | `user_id` | TBD |
| `estimate_sheet_members WHERE user_id` | `user_id` | TBD |

**Candidate gaps:** Favorite tables may need `(workspace_id, user_id, created_at DESC)` composite indexes if user-scoped favorite loading becomes expensive.

**EXPLAIN template:** See doc 05 — Project homebase template.

---

## Project Estimates

**Route:** `/workshop/projects/[projectId]/estimates`

**Source:** `src/lib/repositories/estimate-repository.ts` — estimate listing by project

**Query patterns:**

| Pattern | Columns | Index Coverage |
|---------|---------|---------------|
| `estimates WHERE project_id ORDER BY updated_at DESC` | `project_id`, `updated_at` | Appears covered |
| `estimate_nodes WHERE estimate_id` | `estimate_id` | TBD |
| `estimate_row_items WHERE estimate_id` | `estimate_id` | TBD |

---

## Estimate Editor

**Route:** `/workshop/projects/[projectId]/estimates/[nodeId]`

**Source:** `src/lib/repositories/estimate-repository.ts`, `src/lib/repositories/workspace-repository.ts` — `getProjectEstimateTreeByEstimate`

**Query patterns:**

| Pattern | Columns | Index Coverage |
|---------|---------|---------------|
| `estimate_nodes WHERE estimate_id ORDER BY sort_order` | `estimate_id`, `sort_order` | Has `(estimate_id, parent_id, sort_order)` — may not serve global sort optimally |
| `estimate_row_items WHERE estimate_id ORDER BY sort_order` | `estimate_id`, `sort_order` | Has `(estimate_id, node_id, sort_order)` — may not serve global sort optimally |
| Hierarchy: `estimate_nodes WHERE estimate_id,parent_id,sort_order` | `estimate_id`, `parent_id`, `sort_order` | Appears covered |

**Candidate gaps:** `(estimate_id, sort_order)` may benefit estimate-wide renders. Test with EXPLAIN first.

**EXPLAIN template:** See doc 05 — Estimate nodes + Estimate row items templates.

---

## Component Library

**Route:** `/workshop/library`

**Source:** `src/lib/repositories/component-library-repository.ts` — `loadCurrentWorkspaceComponentRowsLibrary`

**Query patterns:**

| Pattern | Columns | Index Coverage |
|---------|---------|---------------|
| `cost_library_items WHERE workspace_id ORDER BY category, name` | `workspace_id`, `category`, `name` | Candidate — TBD |
| `cost_library_item_price_options WHERE workspace_id AND item_id IN (...) ORDER BY is_default, variant_sort_order, created_at` | `workspace_id`, `item_id`, `is_default`, `variant_sort_order`, `created_at` | Has `(workspace_id, item_id, is_active)` — order coverage needs EXPLAIN |
| `cost_library_item_versions WHERE workspace_id AND item_id IN (...) ORDER BY version_number DESC` | `workspace_id`, `item_id`, `version_number` | TBD |
| `cost_library_item_price_history WHERE workspace_id AND item_id IN (...) ORDER BY effective_at DESC` | `workspace_id`, `item_id`, `effective_at` | May exist |
| `cost_library_item_state_history WHERE workspace_id AND item_id IN (...) ORDER BY effective_at DESC` | `workspace_id`, `item_id`, `effective_at` | May exist |
| `cost_library_item_variant_cost_entries WHERE workspace_id AND item_id IN (...) AND deleted_at IS NULL ORDER BY is_current, pricing_date, created_at` | `workspace_id`, `item_id`, `deleted_at`, `is_current`, `pricing_date`, `created_at` | TBD |
| `cost_library_item_variant_attachments WHERE workspace_id AND item_id IN (...) ORDER BY created_at DESC` | `workspace_id`, `item_id`, `created_at` | TBD |

**Candidate gaps:** `(workspace_id, category, name)` on `cost_library_items`. Variant/history tables may need `(workspace_id, item_id)` composite indexes with order columns.

**EXPLAIN template:** See doc 05 — Component library items + price options templates.

---

## Collaboration Invites

**Route:** `/invite/[token]`, Teamspaces modal

**Source:** `src/lib/repositories/workspace-repository.ts` — `readOptionalCollaborationInvitations`, `src/lib/collaboration/`

**Query patterns:**

| Pattern | Columns | Index Coverage |
|---------|---------|---------------|
| `collaboration_invitations WHERE project_id,lifecycle_state,accepted_at IS NULL,revoked_at IS NULL ORDER BY created_at DESC` | `project_id`, `lifecycle_state`, `accepted_at`, `revoked_at`, `created_at` | Partial index candidate |
| `collaboration_invitation_tokens WHERE token_hash` | `token_hash` | TBD |
| `collaboration_invitation_tokens WHERE invitation_id` | `invitation_id` | TBD |
| `collaboration_audit_events WHERE invitation_id/project_id ORDER BY created_at DESC` | `invitation_id`, `project_id`, `created_at` | TBD |

**Candidate gaps:** Partial index on `collaboration_invitations` for pending/active state. `collaboration_invitation_tokens.token_hash` needs index verification.

**EXPLAIN template:** See doc 05 — Pending collaboration invitations template.

---

## Shared Links / Publication

**Route:** `/share/[token]`, `/api/share/[token]/*`

**Source:** `src/lib/publication/actions.ts` — `readLatestProjectPublication`, `buildSnapshotForProject`, `listSharedLinkRecipients` (if table exists)

**Query patterns:**

| Pattern | Columns | Index Coverage |
|---------|---------|---------------|
| `project_publications WHERE project_id,status ORDER BY published_at DESC LIMIT 1` | `project_id`, `status`, `published_at` | Appears covered |
| `project_publications WHERE token_hash` | `token_hash` | Appears covered |
| `project_publication_events WHERE publication_id ORDER BY created_at DESC` | `publication_id`, `created_at` | TBD |
| `shared_link_recipients WHERE publication_id ORDER BY created_at DESC` | `publication_id`, `created_at` | ⚠️ Table may not exist |

### ⚠️ Schema-Parity Warning (Actionable)

The app code references `shared_link_recipients`, `shared_link_comments`, `shared_link_responses`, and `shared_link_events` (via `src/lib/publication/`). Before designing any index for these tables:

1. Run CODEX-P0-DBIDX-002 to verify these tables exist in the live Supabase schema.
2. Check if migration `20260528220000_project_shared_link_overhaul` is applied.
3. If tables are missing, shared-link recipient/comment indexing is **blocked** until parity is restored.

**EXPLAIN template:** See doc 05 — Latest project publication + Publication events templates.

---

## AI Audit / Package Builder

**Source:** `src/lib/ai/`, package apply RPCs/migrations

**Query patterns:**

| Pattern | Columns | Index Coverage |
|---------|---------|---------------|
| `ai_action_runs WHERE workspace_id,actor_user_id ORDER BY created_at DESC` | `workspace_id`, `actor_user_id`, `created_at` | TBD |
| `ai_tool_calls WHERE run_id` | `run_id` | TBD |
| `ai_tool_calls WHERE workspace_id,tool_name ORDER BY created_at DESC` | `workspace_id`, `tool_name`, `created_at` | TBD |
| `ai_data_access_events WHERE run_id` | `run_id` | TBD |
| `ai_data_access_events WHERE workspace_id,event_name ORDER BY created_at DESC` | `workspace_id`, `event_name`, `created_at` | TBD |
| `ai_package_apply_commands WHERE workspace_id,idempotency_key` | `workspace_id`, `idempotency_key` | TBD |

**Candidate gaps:** AI audit tables have many unindexed FKs. Index only audit/read patterns — these are write-heavy if AI usage grows.

**EXPLAIN template:** See doc 05 — AI events template.
