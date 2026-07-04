# Supabase, RLS & Storage Readiness

**Last updated:** 2026-05-30 (header counts reconciled to code 2026-06-18)
**Linked Supabase project:** `ebxxqidacheyapmmzavr`
**Local migration files present (code-verified):** 110 in `supabase/migrations/` (was recorded as 48; code ground-truth `ls supabase/migrations/`)
**Pending-review (deliberately NOT applied):** `supabase/migrations-pending-review/` — `AC-MOD-04`, `AC-MOD-06`, `T4-database-pass.sql`, `deferred/` (`20260528103341_ai_package_builder_memory.sql`, `20260614021500_get_project_chart_buckets_rpc.sql`), `superseded/`
**Remote-applied count:** UNVERIFIABLE FROM CODE — the prior "47/48 applied on linked remote" is an EXTERNAL/HOSTED fact a repo cannot prove. Migration *intent/history* is in `supabase/migrations/`; live application is checked by `scripts/check-supabase-migration-readiness.ts` against the Supabase CLI, not by these files.
**Local Supabase/Docker verification:** Blocked (authorized to proceed with linked remote)

> RECONCILIATION NOTE (2026-06-18): This doc was written at the 48-migration mark (2026-05-30). The codebase has since added ~62 migrations (estimate tabs, node-kind unification, project groups, closed-beta allowlist, beta feedback, mass-deletion governance, shared-link overhaul/rotation, notifications, legal terms, express components, AI audit/apply, etc.). Sections below have been surgically reconciled where code contradicts the doc; tables that enumerate the original 48-migration era are PARTIAL (they predate the newer surface) and are flagged inline rather than rewritten wholesale. All "applied to remote" cells remain EXTERNAL claims code cannot confirm.

---

## 1. Migration Parity

### 1.1 Remote Parity Status

> DRIFT (code-verified 2026-06-18): "48 local files / 47 applied" is stale. **110** migration files now exist in `supabase/migrations/` (code: `ls supabase/migrations/`). How many are applied to the linked remote is UNVERIFIABLE from code (external/hosted fact). The `ai_package_builder_memory` migration is **not** a "local-only not-yet-pushed" file — it lives in `supabase/migrations-pending-review/deferred/20260528103341_ai_package_builder_memory.sql`, deliberately OUTSIDE the CLI-applied path (it will not be picked up by `supabase db push`); see `supabase/migrations-pending-review/README.md`. The milestone table below is a PARTIAL snapshot of the 48-migration era and predates the ~62 newer migrations.

48 local migration files were present at authoring time; now **110**. Full db diff not proven (local Docker blocked). Key milestone migrations and repair history (PARTIAL — original-era snapshot):

| Migration | Timestamp | Description | Remote Status | Repair History |
|---|---|---|---|---|
| `20260518090000_archestimator_core_schema.sql` | Core | Workspaces, projects, estimates, nodes, row items, cost library, RPCs, RLS | Applied | Original application |
| `20260518100000_auth_profiles_ceo_access.sql` | Auth | Profiles, roles, CEO resolver, `handle_new_auth_user` trigger | Applied | Original application |
| `20260527072220_auth_account_data.sql` | Auth accounts | `user_onboarding_profiles`, `workspace_account_settings`, `account_security_events` | Applied | Repaired into history after local drift |
| `20260527115342_project_invite_entry_tokens.sql` | Invite tokens | `collaboration_invitation_tokens`, lifecycle, audit, narrow RPCs | Applied | Grant-verified after repair |
| `20260526142913_project_sheet_collaboration_access.sql` | Collaboration | `project_members`, `estimate_sheet_access_settings`, `estimate_sheet_members`, `collaboration_invitations` | Applied | Repaired into history |
| `20260524033151_estimate_sheet_version_control.sql` | Versioning | `estimate_sheet_events`, `estimate_sheet_versions`, wrapper RPCs | Applied | Baseline versions backfilled for demo estimates |
| `20260524132800_estimate_node_activity_history.sql` | Activity | `create_estimate_node_with_history`, `rename_estimate_node_with_history` | Applied | Repaired into history (was missing) |
| `20260525013900_estimate_activity_retention_metrics.sql` | Metrics | Read-only retention metrics RPC | Applied | Verified after repair |
| `20260523144932_ai_audit_foundation.sql` | AI audit | `ai_action_runs`, `ai_tool_calls`, `ai_data_access_events` | Applied | Original application |
| `20260528103341_ai_package_builder_memory.sql` | AI memory | `ai_package_builder_memory_signals` | **NOT applied (deferred)** | DRIFT: not "local-only not yet pushed" — file is in `supabase/migrations-pending-review/deferred/`, deliberately outside the CLI-applied path; deferred while `AI_PACKAGE_BUILDER_MEMORY_ENABLED` is default-off (README) |
| `20260523120957_component_library_item_versioning.sql` | Component versioning | `cost_library_item_versions`, `cost_library_item_price_options`, etc. | Applied | Original application |
| `20260527120000_project_client_publication.sql` | Publication | `project_publications`, `project_publication_events` | Applied | Original application |
| `20260528220000_project_shared_link_overhaul.sql` | Shared Link V2 | Recipients, comments, responses, events, RPCs | Applied | Applied during P14 overhaul |

### 1.2 Local vs Remote Drift

- **110** migration files present locally in `supabase/migrations/` (code-verified 2026-06-18; was recorded as 48/48)
- **5 additional reviewed-but-deliberately-unapplied** SQL files in `supabase/migrations-pending-review/` (AC-MOD-04, AC-MOD-06, T4-database-pass.sql, deferred/ai_package_builder_memory, deferred/get_project_chart_buckets_rpc) plus a `superseded/` file — these are intentionally NOT in the CLI-applied path
- **Remote-applied count: UNVERIFIABLE from code** (external/hosted). The earlier "47/48 confirmed applied" and "no schema drift detected" assertions cannot be confirmed OR denied from the repo; treat them as historical operator claims, not current proof
- **Local Supabase/Docker unavailable** for full `supabase db diff` comparison; live parity is the job of `scripts/check-supabase-migration-readiness.ts` (parses Supabase CLI output) + `scripts/check-supabase-linked-readiness.ts`, run by an operator against the remote

---

## 2. RLS Policy Inventory

### 2.1 Core Hierarchy Tables

| Table | RLS Enabled? | Policy Description | Access Model | Denial Tested? | Notes |
|---|---|---|---|---|---|
| `workspaces` | Yes | Members can view; auth users can create owned; admins can update | Workspace membership via `is_workspace_member`/`is_workspace_admin` | **No** | Platform admins have all-access override |
| `workspace_members` | Yes | Members can view memberships; admins can manage | Workspace-scoped; admins manage roles | **No** | Platform admins override |
| `projects` | Yes | Members can manage projects | `is_workspace_member(workspace_id)` for all ops | **No** | All members have full CRUD; sheet-collab migration adds project-member sub-RBAC via app layer |
| `estimates` | Yes | Members can manage estimates | Resolves via `projects.workspace_id` membership check | **No** | Transitively workspace-scoped |
| `estimate_nodes` | Yes | Members can manage nodes | Resolves via `estimates → projects → workspace` chain | **No** | Transitively workspace-scoped |
| `estimate_row_items` | Yes | Members can manage row items | Resolves via `estimates → projects → workspace` chain | **No** | Transitively workspace-scoped |
| `cost_library_items` | Yes | Members can manage library items | Direct `workspace_id` membership check | **No** | All workspace members have full CRUD |

### 2.2 Collaboration & Access Tables

| Table | RLS Enabled? | Policy Description | Access Model | Denial Tested? | Notes |
|---|---|---|---|---|---|
| `project_members` | Yes (inherited via migration) | Project managers can manage members | `can_manage_project_access()` security definer | **No** | Added by `20260526142913` |
| `estimate_sheet_access_settings` | Yes (inherited via migration) | Project managers can read/manage settings | `can_manage_project_access()` via project_id | **No** | Sheet-level access control |
| `estimate_sheet_members` | Yes (inherited via migration) | Project managers can manage sheet members | `can_manage_project_access()` via estimate project | **No** | Per-sheet member overrides |
| `collaboration_invitations` | Yes (inherited via migration) | Project managers can read/manage invitations | `can_manage_project_access()` via project_id | **No** | Lifecycle-managed with pending/revoked/expired states |
| `collaboration_invitation_tokens` | Yes | Project managers can manage tokens; anon can resolve | Narrow: anon resolve-only, auth lifecycle ops | **No** | Added by `20260527115342`; one-active-token index |
| `collaboration_audit_events` | Yes | Authenticated workspace members can read own audit events | Workspace-scoped via project/estimate refs | **No** | Metadata-only audit trail |

### 2.3 Publication & Shared Link Tables

> GAP (code-verified 2026-06-18): Two DB-level integrity guarantees for these tables are REVIEWED BUT DELIBERATELY NOT APPLIED (in `supabase/migrations-pending-review/`, outside the CLI path):
> - **AC-MOD-04** (`shared_link_responses` recipient `ON DELETE SET NULL`): until applied, a recipient hard-delete CASCADE-destroys that recipient's locked accept/decline/revision decision row. The app already shows a confirm dialog (UI half shipped), but the DB still cascades. So the "one response per recipient" audit row is NOT durably protected.
> - **AC-MOD-06** (partial unique index `(project_id) WHERE status='published'`): until applied, only a non-unique index exists, so two concurrent create/rotate calls can leave two simultaneously-`published` rows. In-place rotation (AC-MOD-02) mitigates the common path, but the durable DB guarantee is not in the applied schema.
> Both require a human DBA to apply + relocate; see `supabase/migrations-pending-review/README.md`.

| Table | RLS Enabled? | Policy Description | Access Model | Denial Tested? | Notes |
|---|---|---|---|---|---|
| `project_publications` | Yes | Managers can read/insert/update; default-deny for anon | `can_manage_project_publication()` for auth; no direct anon reads | **No** | `increment_project_publication_open` RPC handles anon open counting |
| `project_publication_events` | Yes | Managers can read; insert via RPC only | No direct client writes; anon inserts via RPC | **No** | Open/password events recorded through RPC |
| `shared_link_recipients` | Yes | Publication managers can manage recipients; RPC-gated | Insert/update/delete via security definer RPCs | **No** | Added by Shared Link V2 overhaul |
| `shared_link_comments` | Yes | Publication managers read; anon insert via RPC | `insert_client_comment` RPC gates anon writes | **No** | Snapshot-version-locked comments |
| `shared_link_responses` | Yes | Publication managers read; anon insert via RPC | `submit_client_response` RPC gates anon writes | **No** | One response per recipient per publication |
| `shared_link_events` | Yes | Publication managers read; anon insert via RPC | RPC-gated; no direct table writes | **No** | Event audit for activity tracking |

### 2.4 Component Library Tables

| Table | RLS Enabled? | Policy Description | Access Model | Denial Tested? | Notes |
|---|---|---|---|---|---|
| `component_category_nodes` | Yes (via taxonomy migration) | Authenticated workspace members can read | Global taxonomy; workspace-scoped reads | **No** | Seeded from V3 taxonomy |
| `component_suppliers` | Yes (via taxonomy migration) | Workspace members can manage suppliers | `is_workspace_member(workspace_id)` | **No** | PH-context seeded supplier list |
| `component_brands` | Yes (via brand migration) | Workspace members can manage brands | `is_workspace_member(workspace_id)` | **No** | Brand lookup table |
| `library_folders` | Yes (via folder migration) | Workspace members can manage folders | `is_workspace_member(workspace_id)` with tree enforcement | **No** | React Complex Tree-backed organization |
| `cost_library_item_versions` | Yes (via versioning migration) | Workspace members can read versions | `is_workspace_member(workspace_id)` | **No** | Append-only version history |
| `cost_library_item_price_options` | Yes (via variant migration) | Workspace members can manage price options | `is_workspace_member(workspace_id)` | **No** | Variant-level pricing/unit/SKU |
| `cost_library_item_variant_cost_entries` | Yes (via variant migration) | Workspace members can read/write cost entries | `is_workspace_member(workspace_id)` | **No** | Dated cost entry with `is_current` flag |
| `cost_library_item_variant_attachments` | Yes (via variant migration) | Workspace members can manage attachments | `is_workspace_member(workspace_id)` | **No** | PDF/XLS attachment metadata |
| `cost_library_item_price_history` | Yes (via versioning migration) | Workspace members can read price history | `is_workspace_member(workspace_id)` | **No** | Append-only price audit |
| `cost_library_item_state_history` | Yes (via versioning migration) | Workspace members can read state history | `is_workspace_member(workspace_id)` | **No** | Lifecycle state transitions |

### 2.5 Template Tables

| Table | RLS Enabled? | Policy Description | Access Model | Denial Tested? | Notes |
|---|---|---|---|---|---|
| `estimate_templates` | Yes (via template migration) | Workspace members can manage templates | `is_workspace_member(workspace_id)` | **No** | Reusable estimate templates |
| `estimate_template_nodes` | Yes (via template migration) | Workspace members can manage template nodes | Transitively workspace-scoped | **No** | Tree enforcement trigger `enforce_estimate_template_node_tree` |
| `estimate_template_row_items` | Yes (via template migration) | Workspace members can manage template rows | Transitively workspace-scoped | **No** | Area-node-only enforcement trigger |

### 2.6 Auth & Account Data Tables

| Table | RLS Enabled? | Policy Description | Access Model | Denial Tested? | Notes |
|---|---|---|---|---|---|
| `profiles` | Yes | Users can view own; platform admins manage all | `id = auth.uid() or is_platform_admin()` | **No** | CEO role resolver: `OWNER_EMAIL_PLACEHOLDER` |
| `user_onboarding_profiles` | Yes (via auth account migration) | Users can view/manage own; admins can view all | `can_access_workspace_account_scope()` or ownership | **No** | Added by `20260527072220` |
| `workspace_account_settings` | Yes (via auth account migration) | Workspace members can view; owners/admins can update | `can_access_workspace_account_scope()` scope check | **No** | Organization-level settings |
| `account_security_events` | Yes (via auth account migration) | Users can view own events; workspace admins can view | `user_id = auth.uid() or is_workspace_admin(workspace_id)` | **No** | Metadata-only; `ip_hash`, `user_agent_hash` |

### 2.7 AI Audit Tables

| Table | RLS Enabled? | Policy Description | Access Model | Denial Tested? | Notes |
|---|---|---|---|---|---|
| `ai_action_runs` | Yes | Actors can view/insert own; workspace admins can view | `actor_user_id = auth.uid()` + workspace member | **No** | Direct anon/authenticated table grants revoked |
| `ai_tool_calls` | Yes | Actors can view/insert own; workspace admins can view | `actor_user_id = auth.uid()` + workspace member | **No** | Constraint trigger enforces workspace refs |
| `ai_data_access_events` | Yes | Actors can view/insert own; workspace admins can view | `actor_user_id = auth.uid()` + workspace member | **No** | Metadata-only; filter/result hashes stored |
| `ai_package_apply_commands` | Yes (via Apply RPC migration) | RPC-internal; no direct client access | Service-owned; idempotency key enforcement | **No** | Rollback smoke verified 0 residue |
| `ai_package_builder_memory_preferences` | N/A | **Deferred migration** in `migrations-pending-review/deferred/`; not in CLI-applied path | Not applied | No | DRIFT: doc named it `..._signals`; actual table is `ai_package_builder_memory_preferences` (migration `20260528103341`). Deferred while `AI_PACKAGE_BUILDER_MEMORY_ENABLED` default-off |

### 2.8 Estimate Version Control & Activity Tables

| Table | RLS Enabled? | Policy Description | Access Model | Denial Tested? | Notes |
|---|---|---|---|---|---|
| `estimate_sheet_events` | Yes (via version control migration) | Workspace members can read events | Transitively workspace-scoped | **No** | Append-only mutation history (this is the live "version control" = audit/activity feed) |
| `estimate_sheet_versions` | Yes (via version control migration) | Workspace members can manage versions | Transitively workspace-scoped | **No** | DRIFT: table + RPCs exist (migration `20260524033151`) but the named-snapshot feature is **DORMANT at the app layer** — `src/lib/estimates/actions.ts` defines `DORMANT_NAMED_VERSION_EVENT_TYPES` and throws "Dormant named-version events are not supported in Activity." No server action creates/restores a named version. "Named snapshots; restore-as-copy" is NOT a shipped user capability |
| `project_publications` (see §2.3) | Yes | — | — | — | — |

---

## 3. RPC Grants: Function Security Model

### 3.1 Estimate Mutation RPCs (Security Definer)

| RPC | Security Model | Access Control | Direct Auth Call? | Denial Tested? | Notes |
|---|---|---|---|---|---|
| `create_estimate_node_with_history` | `security definer` | Workspace member via estimate→project chain | Yes (auth) | **No** | Creates node + records history event |
| `rename_estimate_node_with_history` | `security definer` | Workspace member via estimate→project chain | Yes (auth) | **No** | Renames node + records history event |
| `insert_estimate_row_item_with_history` | `security definer` | Workspace member via estimate→project chain | Yes (auth) | **No** | Row insert with history + revision bump |
| `update_estimate_row_item_with_history` | `security definer` | Workspace member via estimate→project chain | Yes (auth) | **No** | Scalar quantity/Misc Cost/contingency updates |
| `replace_estimate_row_item_with_history` | `security definer` | Workspace member via estimate→project chain | Yes (auth) | **No** | Component replacement with source snapshot |
| `delete_estimate_row_item_with_history` | `security definer` | Workspace member via estimate→project chain | Yes (auth) | **No** | Row delete with expected revision protection |
| `delete_estimate_node_with_history` | `security definer` | Workspace member via estimate→project chain | Yes (auth) | **No** | Cascade node delete + history event |
| `create_estimate_sheet_version` | `security definer` | Workspace member via estimate→project chain | DB-defined; **no app caller** | **No** | DRIFT: RPC exists in migration `20260524033151` but is DORMANT — no shipped server action invokes it; named-version events are filtered/rejected in `src/lib/estimates/actions.ts` (`DORMANT_NAMED_VERSION_EVENT_TYPES`) |
| `restore_estimate_sheet_version_as_copy` | `security definer` | Workspace member via estimate→project chain | DB-defined; **no app caller** | **No** | DRIFT: same as above — DORMANT; no user-facing restore-as-copy path exists |
| `insert_estimate_template_into_estimate` | `security definer` | Workspace member + template workspace match | Yes (auth) | **No** | Whole-template insertion with area enforcement |
| `update_estimate_details_with_history` | `security definer` | Workspace member via estimate→project chain | Yes (auth) | **No** | Estimate detail/metadata updates |
| `reorder_estimate_nodes` | `security definer` | Workspace member via estimate→project chain | Yes (auth) | **No** | Node sort-order reordering |
| `atomic_move_estimate_nodes` | `security definer` | Workspace member via estimate→project chain | Yes (auth) | **No** | Node tree moves |

### 3.2 AI Package-Builder RPCs

| RPC | Security Model | Access Control | Direct Auth Call? | Denial Tested? | Notes |
|---|---|---|---|---|---|
| `create_project_estimate_package_with_history` | `security definer` | Route-authorization row in `ai_package_apply_commands` required | Rejected without matching server-recorded auth row | **Yes** (2026-05-28 rollback smoke) | Direct auth call rejected; authorized call created 6 nodes + 5 rows |
| `create_ai_package_library_components_with_history` | `security definer` | Route-authorization row required; idempotency key | Rejected without matching auth row | **Yes** (2026-05-28 gated smoke) | Replay returns `idempotent_replay` without duplicate rows |

### 3.3 Invite & Collaboration RPCs

| RPC | Security Model | Access Control | Direct Auth Call? | Denial Tested? | Notes |
|---|---|---|---|---|---|
| `resolve_collaboration_invitation` | `security definer` | Anon can resolve token; returns safe invitation details | Yes (anon + auth) | **No** | Public invite entry route |
| `accept_collaboration_invitation` | `security definer` | Auth user matching invitation email | Yes (auth) | **No** | Accepts pending invite + adds membership |
| `issue_collaboration_invitation_token` | `security definer` | Authenticated project manager | Yes (auth) | **No** | Creates hashed token for email delivery |
| `revoke_collaboration_invitation_token` | `security definer` | Authenticated project manager (owner/originator) | Yes (auth) | **No** | Revokes token + sets lifecycle state |
| `record_invitation_token_delivery` | `security definer` | Authenticated user who issued token | Yes (auth) | **No** | Records email delivery event |
| `apply_pending_collaboration_invitations` | `security definer` | Post-auth trigger; auto-accepts pending invites | Service-owned trigger | **No** | Runs after `handle_new_auth_user`; overridden to check invite tokens before auto-accept |
| `materialize_expired_collaboration_invitations` | `security definer` | Service-owned; batch expiration | Service-owned | **No** | Cron-compatible batch expiration |

### 3.4 Publication & Shared Link RPCs

| RPC | Security Model | Access Control | Direct Auth Call? | Denial Tested? | Notes |
|---|---|---|---|---|---|
| `increment_project_publication_open` | `security definer` | Public; validates publication status internally | Yes (anon) | **No** | Atomic open counter + timestamp |
| `can_manage_project_publication` | `security definer` | Authenticated project managers | Yes (auth) | **No** | Delegates to `can_manage_project_access` |
| `insert_client_comment` (Shared Link V2) | `security definer` | Anon with valid publication + recipient token | Yes (anon via token) | **No** | Snapshot-version-locked comment |
| `submit_client_response` (Shared Link V2) | `security definer` | Anon with valid publication + recipient token | Yes (anon via token) | **No** | Decision with version locking |

### 3.5 Component Library RPCs

| RPC | Security Model | Access Control | Direct Auth Call? | Denial Tested? | Notes |
|---|---|---|---|---|---|
| `create_cost_library_component` | `security definer` | Authenticated workspace member | Yes (auth) | **No** | Creates item + variants + cost entries in transaction |
| `update_cost_library_component` | `security definer` | Authenticated workspace member | Yes (auth) | **No** | Updates component identity + lifecycle |
| `upsert_cost_library_component_price_option` | `security definer` | Authenticated workspace member | Yes (auth) | **No** | Upserts variant price options |

### 3.6 Template RPCs

| RPC | Security Model | Access Control | Direct Auth Call? | Denial Tested? | Notes |
|---|---|---|---|---|---|
| `insert_estimate_template_into_estimate` | `security definer` | Workspace member + template workspace match | Yes (auth) | **No** | Validates tree hierarchy via trigger |
| `validate_estimate_template_tree` | `security definer` | Internal validation | Service-owned | **No** | Template hierarchy integrity check |
| `estimate_template_seed_uuid` | `security definer` | Workspace member | Yes (auth) | **No** | Deterministic seed key lookup |

### 3.7 Auth & Account RPCs

| RPC | Security Model | Access Control | Direct Auth Call? | Denial Tested? | Notes |
|---|---|---|---|---|---|
| `handle_new_auth_user` | `security definer` | Trigger-only on `auth.users` insert | Service-owned trigger | **No** | Creates profile + resolves CEO role |
| `current_user_profile` | `security definer` | Authenticated user | Yes (auth) | **No** | Returns own profile row |
| `resolve_app_role_for_email` | `sql` (stable) | Internal only | N/A | N/A | CEO resolver for `OWNER_EMAIL_PLACEHOLDER` |
| `is_platform_admin` | `security definer` | Internal gate check | Yes (auth) | **No** | Checks CEO/admin role or email JWT fallback |
| `is_workspace_member` | `security definer` | Internal gate check | Yes (auth) | **No** | Core workspace membership check |
| `is_workspace_admin` | `security definer` | Internal gate check | Yes (auth) | **No** | Core admin/owner check |
| `can_access_workspace_account_scope` | `security definer` | Internal gate check | Yes (auth) | **No** | Scope check for account settings |

### 3.8 Utility RPCs

| RPC | Security Model | Access Control | Direct Auth Call? | Denial Tested? | Notes |
|---|---|---|---|---|---|
| `set_updated_at` | `plpgsql` trigger | Automatic | Trigger-only | N/A | `updated_at` timestamp trigger |
| `add_workspace_owner_membership` | `security definer` | Trigger-only | Service-owned trigger | N/A | Auto-adds workspace creator as owner |
| `estimate_row_subtotal` | `sql` (stable) | Internal computation | Yes (auth) | N/A | Pure computation function |
| `estimate_row_contingency_value` | `sql` (stable) | Internal computation | Yes (auth) | N/A | Pure computation function |
| `estimate_row_line_total` | `sql` (stable) | Internal computation | Yes (auth) | N/A | Pure computation function |
| `estimate_row_item_snapshot` | `sql` (stable) | Internal computation | Yes (auth) | N/A | Row snapshot for versioning |
| `estimate_row_context` | `sql` (stable) | Internal computation | Yes (auth) | N/A | Row context DTO |
| `estimate_sheet_total` | `sql` (stable) | Internal computation | Yes (auth) | N/A | Sheet total aggregation |
| `estimate_sheet_snapshot` | `sql` (stable) | Internal computation | Yes (auth) | N/A | Full sheet snapshot |
| `cost_library_price_option_snapshot` | `sql` (stable) | Internal computation | Revoked from public/anon/auth | N/A | Price option DTO |
| `cost_library_item_version_snapshot` | `sql` (stable) | Internal computation | Yes (auth) | N/A | Item version DTO |
| `enforce_ai_tool_call_workspace_refs` | `plpgsql` trigger | Automatic | Constraint trigger | N/A | Enforces workspace refs on AI tool calls |
| `enforce_ai_data_access_workspace_refs` | `plpgsql` trigger | Automatic | Constraint trigger | N/A | Enforces workspace refs on AI data access |
| `enforce_library_folder_tree` | `plpgsql` trigger | Automatic | Trigger-only | N/A | Library folder hierarchy enforcement |
| `enforce_estimate_template_node_tree` | `plpgsql` trigger | Automatic | Trigger-only | N/A | Template node hierarchy enforcement |
| `enforce_estimate_template_row_item_area_node` | `plpgsql` trigger | Automatic | Trigger-only | N/A | Template row area-node-only enforcement |
| `reorder_library_folders` | `plpgsql` | Auth workspace member | Yes (auth) | **No** | Bulk folder reordering |

---

## 4. Storage Buckets

### 4.1 Bucket Inventory

| Bucket | Public? | File Size Limit | Allowed MIME Types | Access Model | Policies |
|---|---|---|---|---|---|
| `component-images` | Yes (public read) | 12 MB | `image/webp` | Public read; auth upload/update/delete user-scoped by workspace path | 4 policies: public SELECT, auth INSERT/UPDATE/DELETE gated by workspace membership + UUID folder prefix + user-id subfolder |
| `component-attachments` | No (private) | 20 MB | `application/pdf`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | Auth-only read; auth upload/update/delete user-scoped by workspace path | 4 policies: auth SELECT/INSERT/UPDATE/DELETE gated by workspace membership + UUID folder prefix + user-id subfolder |
| `project-images` | No (private) | 12 MB | `image/webp` | Auth-only; user+workspace+project path-scoped | UNTRACKED (added 2026-06-18): introduced by `supabase/migrations/20260603222628_private_project_image_storage.sql` (with hardening `20260603224800`, `20260604023101`). Private because project covers can carry client-identifying context. Route: `src/app/api/projects/images/route.ts` (validates workspaceId/ownerUserId/projectId UUID segments + project↔workspace match) |

### 4.2 Storage Access Controls

**`component-images` bucket:**
- Public SELECT: any user/anon can read WebP images from the bucket
- Auth INSERT: workspace member check on first path segment (workspace UUID) + second path segment must match `auth.uid()`
- Auth UPDATE/DELETE: same path validation + workspace membership check
- Cross-workspace access: path-prefix enforced by UUID pattern matching on first folder level

**`component-attachments` bucket:**
- No public access: anon has no SELECT
- Auth SELECT: workspace member check on first path segment
- Auth INSERT/UPDATE/DELETE: same path validation + workspace membership check
- File type enforcement: only PDF and Excel (XLS/XLSX) allowed at bucket level

**`project-images` bucket** (UNTRACKED addition, code-verified 2026-06-18, migration `20260603222628` + hardening `20260603224800`/`20260604023101`):
- Private: `public = false`; no anon SELECT
- WebP-only, 12 MB cap (bucket-level)
- Path-scoped to workspace UUID + owner user-id + project; route `src/app/api/projects/images/route.ts` re-validates the project belongs to the resolved workspace before serving/uploading
- Same "not tested" denial status as the other buckets (no cross-workspace isolation proof)

### 4.3 Storage Denial Testing Status

| Test | Status | Notes |
|---|---|---|
| Cross-workspace image read | **Not tested** | Path-prefix UUID enforcement should deny; needs proof |
| Cross-workspace attachment read | **Not tested** | Same UUID path enforcement; needs proof |
| Anon upload to private bucket | **Not tested** | Bucket is private + INSERT requires auth; needs proof |
| Anon upload to public bucket | **Not tested** | INSERT requires auth workspace check; needs proof |
| User bypassing own UUID folder | **Not tested** | `auth.uid()` match enforced in path segment 2; needs proof |
| File type bypass | **Not tested** | Bucket-level MIME restrictions; needs proof |
| Size limit bypass | **Not tested** | Bucket-level file size limits; needs proof |

---

## 5. Auth Users, Profile & Workspace Bootstrap

### 5.1 Bootstrap Behavior

| Trigger/Flow | Status | Verification |
|---|---|---|
| `handle_new_auth_user()` trigger | Active on linked remote | Creates `profiles` row on `auth.users` insert |
| CEO role resolution | Active | `OWNER_EMAIL_PLACEHOLDER` resolves to `ceo` role; other emails → `member` |
| Profile UUID | `UUID_PLACEHOLDER` | the owner's authenticated profile UUID |
| Default workspace creation | Not automatic | Workspaces created explicitly; no auto-create on signup |
| `add_workspace_owner_membership()` trigger | Active | Auto-adds workspace creator as owner on insert |
| `apply_pending_collaboration_invitations()` | Active (overridden) | No longer auto-accepts invites before app-owned route verification |
| First-run onboarding | Redirects to `/workshop/settings` | No forced onboarding gate; optional profile/workspace settings |
| CEO platform access | Active | `is_platform_admin()` returns true for CEO email + role; allows platform-wide RLS override |

### 5.2 Auth Provider Dashboard Configuration

| Provider | Status | Notes |
|---|---|---|
| Google OAuth | Active | Redirects to `/auth/callback`; safe redirect sanitizer; provider errors hidden |
| Email sign-in link (magic link) | Active | Fallback auth method; no password UI |
| CAPTCHA protection | **Not configured** | Auth routes lack CAPTCHA; automated abuse risk |
| OAuth app verification | **Not verified** | Google Cloud Console app in testing mode; 100 user cap; "unverified app" warning |
| Rate limiting | In-memory only | Brute-force lockout (5 attempts, 15 min) stored in server memory; lost on restart |
| Anonymous logins | Disabled | No `anon` key usage for session creation |
| Signup policies | Default | No custom signup restrictions configured in Supabase dashboard |

---

## 6. Account Security Events

### 6.1 Audit Event Coverage

| Table | Event Types | Coverage | Denial Tested? |
|---|---|---|---|
| `account_security_events` | Generic event type + `user_id`, `workspace_id`, `ip_hash`, `user_agent_hash`, `metadata_json` | Metadata-only; no raw IP/UA storage | **No** |
| `collaboration_audit_events` | Invitation lifecycle events, project/estimate refs, actor tracking | Metadata-only; invitation-scoped | **No** |
| `estimate_sheet_events` | Row insert/update/delete/replace, node create/rename/delete, AI package applied, version control, template insert | Append-only; `correlation_id` idempotency; `event_type`, `changed_fields`, `snapshot_before`/`snapshot_after` | N/A (audit table) |
| `project_publication_events` | Open, password_success, password_failure, download_attempt_blocked | Metadata-only; `ip_hash`, `user_agent_hash` | N/A (audit table) |
| `shared_link_events` | Open, comment_add, accept_decision, decline_decision, password_attempt | Metadata-only; `ip_hash`, `user_agent_hash` | N/A (audit table) |

---

## 7. Invite-Entry Token Tables

### 7.1 Structure

| Table | Key Columns | Security | Notes |
|---|---|---|---|
| `collaboration_invitations` | `email`, `scope` (project/estimate), `role`, `lifecycle_state`, `expires_at` | RLS: project managers manage; `one-active-email` unique indexes for pending project/estimate scopes | Base invitation record |
| `collaboration_invitation_tokens` | `token_hash` (unique), `token_hint`, `delivery_method`, `expires_at`, `used_at`, `revoked_at` | RLS: anon resolve-only, auth lifecycle ops; `one-active-token` partial unique index | Hashed token; pepper-based hashing |
| `collaboration_audit_events` | `invitation_id`, `project_id`, `estimate_id`, `actor_user_id`, `event_type`, `metadata` | RLS: workspace members read own | Audit trail for invite lifecycle |

### 7.2 Token Lifecycle

- **Issue:** `issue_collaboration_invitation_token` RPC creates hashed token + sets `delivery_method`
- **Resolve:** `resolve_collaboration_invitation` RPC resolves token hash → returns safe invitation details
- **Accept:** `accept_collaboration_invitation` RPC accepts invite + adds `project_member` or `estimate_sheet_member`
- **Revoke:** `revoke_collaboration_invitation_token` RPC revokes token + sets `lifecycle_state`
- **Expiry:** `materialize_expired_collaboration_invitations` batch RPC materializes expired states
- **Post-auth:** `apply_pending_collaboration_invitations` trigger overridden to check tokens before auto-accept

---

## 8. Project Publication / Share Tables

### 8.1 Structure

| Table | Key Columns | Security | Notes |
|---|---|---|---|
| `project_publications` | `token_hash` (unique), `encrypted_token`, `password_hash` (optional scrypt), `snapshot_json`, `selected_estimate_ids`, `status` | RLS: managers manage; default-deny for anon; `increment_project_publication_open` RPC for anon open counting | Publication snapshot + token management |
| `project_publication_events` | `publication_id`, `event_type`, `ip_hash`, `user_agent_hash` | RLS: managers read; insert via RPC only | Metadata-only event audit |
| `shared_link_recipients` | `email`, `recipient_token_hash` (unique), `delivery_status` | RLS: managers manage via RPC | Recipient management for Shared Link V2 |
| `shared_link_comments` | `recipient_id`, `author_email`, `estimate_id`, `row_id`, `body`, `is_internal` | RLS: managers read; anon insert via `insert_client_comment` RPC | Client comments with snapshot-version context |
| `shared_link_responses` | `recipient_id`, `decision` (accepted/declined/revision_requested), `snapshot_version_at_decision` | RLS: managers read; anon insert via `submit_client_response` RPC | One response per recipient per publication |
| `shared_link_events` | `recipient_id`, `event_type`, `ip_hash`, `user_agent_hash` | RLS: managers read; insert via RPC | Activity audit |

### 8.2 Access Model

- **Publication creator (manager):** Full CRUD via `can_manage_project_publication()` → `can_manage_project_access()`
- **Anonymous viewer:** Opens counted via `increment_project_publication_open` RPC; no direct table reads
- **Anonymous recipient:** Comments/responses via `insert_client_comment` and `submit_client_response` RPCs with token validation
- **Password protection:** Optional `password_hash` (scrypt) per publication; in-memory progressive lockout (5 attempts, 15 min)

---

## 9. Component Library Asset Tables

### 9.1 Structure

| Table | Key Columns | Security | Notes |
|---|---|---|---|
| `cost_library_items` | `workspace_id`, `name`, `description`, `category`, `unit`, `misc_cost`, `thumbnail_path` | RLS: workspace members manage | Core component identity |
| `cost_library_item_price_options` | `item_id`, `workspace_id`, `label`, `unit_cost`, `misc_cost`, `supplier_id`, `is_default`, `is_active`, `image_path` | RLS: workspace members manage | Variant pricing/unit/SKU/images |
| `cost_library_item_variant_cost_entries` | `price_option_id`, `item_id`, `workspace_id`, `unit_cost`, `misc_cost`, `pricing_date`, `is_current` | RLS: workspace members manage | Dated selectable cost entries |
| `cost_library_item_variant_attachments` | `price_option_id`, `item_id`, `workspace_id`, `storage_bucket`, `storage_path`, `file_name`, `content_type`, `attachment_kind` | RLS: workspace members manage | PDF/XLS attachment metadata |
| `cost_library_item_versions` | `item_id`, `workspace_id`, `version_number`, `snapshot_json` | RLS: workspace members read | Append-only version history |
| `cost_library_item_price_history` | `item_id`, `workspace_id`, `old_unit_cost`, `new_unit_cost`, `changed_by` | RLS: workspace members read | Append-only price audit |
| `cost_library_item_state_history` | `item_id`, `workspace_id`, `old_state`, `new_state`, `changed_by` | RLS: workspace members read | Lifecycle state transitions |
| `component_category_nodes` | `id` (text), `parent_id`, `name`, `sort_order` | RLS: auth members read | Global V3 taxonomy |
| `component_suppliers` | `workspace_id`, `name`, `country` | RLS: workspace members manage | Supplier directory |
| `component_brands` | `workspace_id`, `name`, `supplier_id` | RLS: workspace members manage | Brand directory |
| `library_folders` | `workspace_id`, `parent_id`, `name`, `sort_order` | RLS: workspace members manage | User-organized folder tree |

---

## 10. AI Audit / Memory Tables

### 10.1 Metadata-Only Audit Posture

All AI audit tables store metadata only; no raw prompts, hidden prompts, full retrieved data, or conversation history is persisted.

| Table | Hash Columns | Constraint | Notes |
|---|---|---|---|
| `ai_action_runs` | `request_message_hash`, `route_context_hash` | Must start with `sha256:` prefix | Hashed user message + route context |
| `ai_tool_calls` | `args_hash`, `result_hash` | Must start with `sha256:` prefix | Hashed tool arguments + results |
| `ai_data_access_events` | `filter_hash` | Must start with `sha256:` prefix | Hashed data access filters |
| `ai_package_apply_commands` | `draft_hash`, `idempotency_key` | Unique constraint | Apply authorization + replay prevention |
| `ai_package_builder_memory_preferences` | (per deferred migration) | Deferred; not in applied path | DRIFT: doc named it `..._signals`; actual table is `ai_package_builder_memory_preferences`, defined in `migrations-pending-review/deferred/20260528103341_*.sql` (deferred, default-off flag) |

### 10.2 Access Model

- Direct anon/authenticated table grants **revoked** for all AI audit tables
- Actors can view/insert only their own rows (matched by `actor_user_id`)
- Workspace admins can view all rows for their workspace
- Platform admins (CEO) can view all rows globally
- Constraint triggers enforce workspace reference integrity on insert

---

## 11. Backup / Export Posture

### 11.1 Supabase Automated Backups

| Feature | Status | Notes |
|---|---|---|
| Daily automated backups | **Depends on Pro tier** | Default for Supabase Pro plan; current plan tier unverified |
| Point-in-Time Recovery (PITR) | **Not configured** | PITR requires explicit enablement and Pro tier; not verified as active |
| Backup retention period | **Unverified** | Default 7 days for Pro; needs confirmation |
| Storage backups | **Unverified** | Supabase Storage backup behavior needs confirmation |
| Migration rollback | **Not documented** | No procedure for rolling back to a prior migration state |
| Schema-only backup | **Not configured** | No `pg_dump --schema-only` backup in CI or scheduled job |

### 11.2 Documented Recovery Procedure

| Item | Status |
|---|---|
| Disaster recovery runbook | **Not documented** |
| Backup restoration drill | **Not performed** |
| Migration rollback test | **Not performed** |
| Storage restoration test | **Not performed** |
| Full cold-start from backups | **Not tested** |

---

## 12. Seed / Test Data Cleanup

### 12.1 Known Seed Data

| Seed | Source Migration | Contents | Cleanup Approach |
|---|---|---|---|
| the owner's CEO profile | `20260518100000` | Profile UUID `UUID_PLACEHOLDER`, CEO role | Permanent bootstrap data |
| DEMO_PROJECT_PLACEHOLDER estimate | `20260519173857` | Demo estimate with General Requirements, Site Works, Lot (House, Services House) nodes | Demo data; can be deleted |
| Luna Heights estimate | `20260518111000`, `20260518151743` | Seed data refresh + contents reset | Demo data; can be deleted |
| OWNER_NAME_PLACEHOLDER seed data | `20260518110000` | Attaches the owner's profile to demo workspace | Bootstrap; tied to CEO profile |
| V3 taxonomy seed | `20260522064018` | `component_category_nodes` global taxonomy | Permanent reference data |
| PH-context suppliers | `20260522070956` | Philippine supplier list | Config data; can be updated |
| Variant cost entry backfill | `20260524131204` | Initial cost entries for existing price options | Transient; naturally replaced by new entries |

### 12.2 Cleanup Approach

- Delete demo projects/estimates via workspace-level cascade (no special tools needed)
- the owner's CEO profile and default workspace must survive cleanup
- Taxonomy and supplier data should survive as reference data
- Variant cost entries regenerate naturally on component creation
- **No automated seed-reset script exists**; cleanup is manual

### 12.3 Destructive Cleanup Approval List

| Item | Category | Notes |
|---|---|---|
| V2/QA checkpoint smoke residue (AI package-builder) | Verified cleaned | 2026-05-28 rollback smoke: 0 synthetic auth users, 0 projects, 0 apply commands after cleanup |
| Collaboration invitation residue | Unknown | May have orphaned invitations from test runs; needs audit |
| Shared link publication residue | Unknown | May have orphaned publications from V1/V2 testing; needs audit |
| Estimate sheet events for deleted estimates | Unknown | Cascade delete handles estimate deletes; `estimate_sheet_events` rows may persist if cascade not verified |
| Storage object residue | Unknown | Orphaned images/attachments after component deletion may persist; no automated cleanup |

---

## 13. Summary

### 13.1 Supabase Production Readiness

**Status: NO**

The following items block production readiness:

| # | Requirement | Status | Evidence Gap |
|---|---|---|---|
| 1 | Migration parity proof | **Partial** | 110 local files; remote-applied count UNVERIFIABLE from code; no `supabase db diff` run to confirm zero drift. Tooling exists: `scripts/check-supabase-migration-readiness.ts` (operator-run vs Supabase CLI) — the *check script* is BUILT but live parity remains an external/operator fact |
| 2 | RLS denial tests | **Partial (was "Missing")** | No comprehensive CI-gated cross-workspace suite covering every core table. BUT local Postgres prove-harnesses now assert owner/collaborator/non-member access decisions for specific surfaces: `scripts/prove-rls-initplan-postgres.mjs`, `scripts/prove-notification-rls-postgres.mjs`, `scripts/prove-estimate-tabs-postgres.mjs`. These are NOT in `.github/workflows/ci.yml`, require local `postgresql` binaries, and cover only a few surfaces — so the broad gap stands, but "zero" is inaccurate |
| 3 | Storage denial tests | **Missing** | Zero cross-workspace storage access tests for any of the three buckets (`component-images`, `component-attachments`, `project-images`) |
| 4 | Auth provider dashboard configuration | **Missing** | Google OAuth unverified; CAPTCHA not configured; rate limiting in-memory only; no Supabase Auth settings screenshot evidence |
| 5 | Backup/recovery approach | **Missing** | No recovery runbook; no PITR configuration; no restoration drill |
| 6 | Staging vs production separation | **Missing** | Single remote Supabase project used for both development and intended production; no dedicated staging environment |

### 13.2 What IS Done

- RLS enabled on every user-data table (40+ tables)
- 50+ security definer RPCs with tenant-isolated access patterns
- AI audit tables with revoked direct grants (metadata-only)
- Invite entry token lifecycle with pepper-hashed tokens and narrow RPCs
- Shared Link V2 overhaul with RPC-gated anon writes
- Component library storage with workspace-scoped path prefix enforcement (+ private `project-images` bucket added since this doc, migration `20260603222628`)
- AI package-builder idempotency with route-authorization gating
- Auth account data migration repaired and applied
- Platform admin (CEO) override with email-based role resolution
- Account security events with hashed IP/UA metadata
- (Added since 2026-05-30, code-verified) estimate tabs foundation (`20260612094734`), node-kind unification (`20260614003639`), project groups (`20260617090000`), closed-beta allowlist + beta feedback (`20260601182522`/`20260602*`), mass-deletion governance (`20260603160000`), shared-link rotation + viewed-snapshot RPC (`20260616094500`), notification system (`20260614125313`), legal terms acceptance (`20260606095935`), express-components foundation (`20260615093524`), RLS initplan `(select auth.uid())` perf rewrite (`20260613192344`/`20260613201302`, proven access-neutral by `scripts/prove-rls-initplan-postgres.mjs`)

### 13.3 What Is NOT Done

- No comprehensive CI-gated RLS denial suite covering every core table (partial local prove-harnesses now exist for initplan/notifications/estimate-tabs surfaces — `scripts/prove-*-postgres.mjs` — but they are NOT in CI and require local Postgres; the "zero RLS denial tests" claim is no longer literally true)
- Zero storage cross-workspace isolation tests (all three buckets)
- No `supabase db diff`/parity gate in CI (only operator-run `scripts/check-supabase-*-readiness.ts` exist; prove-harnesses are local-only, not in `.github/workflows/ci.yml`)
- No staging/production Supabase separation
- No PITR configuration or recovery runbook (operator-run readiness check exists: `scripts/check-supabase-backup-readiness.ts` — tooling BUILT, hosted state still unproven)
- No Supabase Auth dashboard configuration evidence
- No automated seed-reset script
- No storage object cleanup for orphaned files (note: mass-deletion governance migration `20260603160000` + service-role storage cleanup path now exist for governed bulk deletes — orphan-from-single-delete cleanup remains unaddressed)
- `ai_package_builder_memory` migration is deferred in `migrations-pending-review/deferred/` (not "local-only awaiting push"); plus `AC-MOD-04`, `AC-MOD-06`, `T4-database-pass.sql`, and `deferred/get_project_chart_buckets_rpc.sql` are reviewed-but-deliberately-unapplied DB guarantees

### 13.4 Path to Readiness

1. **RLS denial tests:** Create automated Vitest suite that authenticates as Workspace A user, attempts to read/write Workspace B data, and asserts denial for every core table
2. **Storage denial tests:** Create automated tests that attempt cross-workspace storage access for both `component-images` and `component-attachments` buckets
3. **Migration parity:** Run local Supabase/Docker, apply all **110** migrations (count code-verified 2026-06-18), and run `supabase db diff` against remote to confirm zero drift; additionally a DBA must decide on the 5 `migrations-pending-review/` files (AC-MOD-04, AC-MOD-06, T4-database-pass, deferred ai-memory + chart-buckets)
4. **Staging environment:** Provision dedicated Supabase project for staging; configure CI to push migrations to staging before production
5. **Auth configuration:** Complete Google OAuth verification, configure CAPTCHA, implement persistent rate limiting (Redis), and document Supabase Auth dashboard settings
6. **Backup/recovery:** Enable PITR on production Supabase, document recovery runbook, and perform one restoration drill
7. **Seed data:** Create automated seed-reset script for clean local/staging environment setup
