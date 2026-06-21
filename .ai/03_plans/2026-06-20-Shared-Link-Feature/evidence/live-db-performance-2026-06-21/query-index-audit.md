# CODEX-P0-DBIDX-001 Repo-Only Query/Index Audit

**Generated:** 2026-06-21T11:50:48.451Z
**Scope:** Repo-only local audit. No Supabase connection, no live metrics, no DDL, no migration apply.
**Command:** `bun run dbidx:audit-repo`

## Output 1: repo-derived query map

The scanner inspected these source roots: `src/lib/repositories`, `src/lib/publication`, `src/lib/collaboration`, `src/lib/ai`, `src/app/api`, `src/app/share`, `src/app/invite`.

| Kind | Name | Operations Seen | Source Files |
| --- | --- | --- | --- |
| rpc | `accept_collaboration_invitation` | rpc | `src/app/invite/[token]/accept/route.ts`<br>`src/lib/collaboration/workshop-pending-invite.ts` |
| rpc | `accept_collaboration_invitation_by_id` | rpc | `src/lib/collaboration/pending-invite-actions.ts` |
| rpc | `can_edit_estimate` | rpc | `src/lib/repositories/workspace-repository.ts` |
| rpc | `create_ai_package_library_components_with_history` | rpc | `src/lib/ai/package-builder/apply.ts` |
| rpc | `create_estimate_node_with_history` | rpc | `src/lib/ai/package-builder/apply.ts` |
| rpc | `create_project_estimate_package_with_history` | rpc | `src/lib/ai/package-builder/apply.ts` |
| rpc | `delete_estimate_row_item_with_history` | rpc | `src/lib/ai/package-builder/apply.ts` |
| rpc | `increment_project_publication_open` | rpc | `src/lib/publication/public-repository.ts` |
| rpc | `insert_estimate_row_item_with_history` | rpc | `src/lib/ai/package-builder/apply.ts` |
| rpc | `insert_estimate_template_into_estimate_with_history` | rpc | `src/lib/ai/package-builder/apply.ts` |
| rpc | `issue_collaboration_invitation_token` | rpc | `src/lib/collaboration/actions.ts` |
| rpc | `list_pending_collaboration_invitations` | rpc | `src/lib/repositories/workspace-repository.ts` |
| rpc | `project_estimate_list_summaries` | rpc | `src/lib/repositories/workspace-repository.ts` |
| rpc | `project_estimate_list_summaries_for_estimates` | rpc | `src/lib/repositories/project-estimate-sheets-repository.ts` |
| rpc | `record_collaboration_invitation_delivery` | rpc | `src/lib/collaboration/actions.ts` |
| rpc | `rename_estimate_node_with_history` | rpc | `src/lib/ai/package-builder/apply.ts` |
| rpc | `replace_estimate_row_item_with_history` | rpc | `src/lib/ai/package-builder/apply.ts` |
| rpc | `resolve_collaboration_invitation` | rpc | `src/app/invite/[token]/page.tsx` |
| rpc | `update_estimate_row_item_with_history` | rpc | `src/lib/ai/package-builder/apply.ts` |
| rpc | `workspace_homebase_summary` | rpc | `src/lib/repositories/workspace-repository.ts` |
| table | `ai_action_runs` | insert, query | `src/lib/ai/audit.ts` |
| table | `ai_data_access_events` | insert | `src/lib/ai/audit.ts` |
| table | `ai_package_builder_memory_preferences` | insert, query, select | `src/lib/ai/package-builder/memory.ts` |
| table | `ai_tool_calls` | insert | `src/lib/ai/audit.ts` |
| table | `collaboration_audit_events` | insert | `src/lib/collaboration/actions.ts` |
| table | `collaboration_invitations` | query | `src/lib/collaboration/actions.ts`<br>`src/lib/repositories/workspace-repository.ts` |
| table | `component_brands` | query | `src/lib/repositories/component-library-repository.ts` |
| table | `component_category_nodes` | query, select | `src/lib/ai/package-builder/read-tools.ts`<br>`src/lib/ai/read-context.ts`<br>`src/lib/repositories/component-library-repository.ts`<br>`src/lib/repositories/project-charts-repository.ts` |
| table | `component_suppliers` | query | `src/lib/ai/read-context.ts`<br>`src/lib/repositories/component-library-repository.ts`<br>`src/lib/repositories/project-charts-repository.ts` |
| table | `cost_library_item_price_history` | query | `src/lib/repositories/component-library-repository.ts` |
| table | `cost_library_item_price_options` | query | `src/lib/ai/package-builder/apply.ts`<br>`src/lib/ai/package-builder/read-tools.ts`<br>`src/lib/ai/read-context.ts`<br>`src/lib/repositories/component-library-repository.ts` |
| table | `cost_library_item_state_history` | query | `src/lib/repositories/component-library-repository.ts` |
| table | `cost_library_item_variant_attachments` | query | `src/lib/repositories/component-library-repository.ts` |
| table | `cost_library_item_variant_cost_entries` | query | `src/lib/repositories/component-library-repository.ts` |
| table | `cost_library_item_versions` | query | `src/lib/repositories/component-library-repository.ts` |
| table | `cost_library_items` | query, select | `src/lib/ai/package-builder/apply.ts`<br>`src/lib/ai/package-builder/read-tools.ts`<br>`src/lib/ai/read-context.ts`<br>`src/lib/repositories/component-library-repository.ts`<br>`src/lib/repositories/cost-library-repository.ts` |
| table | `estimate_favorites` | query | `src/lib/repositories/estimate-favorites-repository.ts`<br>`src/lib/repositories/workspace-repository.ts` |
| table | `estimate_nodes` | query, select | `src/lib/ai/package-builder/read-tools.ts`<br>`src/lib/ai/read-context.ts`<br>`src/lib/publication/actions.ts`<br>`src/lib/repositories/estimate-repository.ts`<br>`src/lib/repositories/project-charts-repository.ts`<br>`src/lib/repositories/project-estimate-sheets-repository.ts`<br>`src/lib/repositories/workspace-repository.ts` |
| table | `estimate_row_items` | delete, insert, query, select, upsert | `src/lib/ai/package-builder/apply.ts`<br>`src/lib/ai/package-builder/read-tools.ts`<br>`src/lib/ai/read-context.ts`<br>`src/lib/publication/actions.ts`<br>`src/lib/repositories/component-library-repository.ts`<br>`src/lib/repositories/estimate-repository.ts`<br>`src/lib/repositories/project-charts-repository.ts`<br>`src/lib/repositories/workspace-repository.ts` |
| table | `estimate_sheet_access_settings` | query, upsert | `src/lib/collaboration/actions.ts`<br>`src/lib/repositories/workspace-repository.ts` |
| table | `estimate_sheet_events` | query | `src/lib/ai/read-context.ts`<br>`src/lib/repositories/project-activity-repository.ts` |
| table | `estimate_sheet_members` | query, upsert | `src/lib/collaboration/actions.ts`<br>`src/lib/repositories/workspace-repository.ts` |
| table | `estimate_tabs` | query | `src/lib/ai/read-context.ts`<br>`src/lib/publication/actions.ts`<br>`src/lib/repositories/workspace-repository.ts` |
| table | `estimate_template_nodes` | query | `src/lib/ai/package-builder/read-tools.ts`<br>`src/lib/ai/read-context.ts`<br>`src/lib/repositories/component-library-repository.ts` |
| table | `estimate_template_row_items` | query | `src/lib/ai/package-builder/read-tools.ts`<br>`src/lib/ai/read-context.ts`<br>`src/lib/repositories/component-library-repository.ts` |
| table | `estimate_templates` | query | `src/lib/ai/package-builder/read-tools.ts`<br>`src/lib/ai/read-context.ts`<br>`src/lib/repositories/component-library-repository.ts` |
| table | `estimates` | query | `src/lib/ai/package-builder/read-tools.ts`<br>`src/lib/ai/read-context.ts`<br>`src/lib/collaboration/actions.ts`<br>`src/lib/publication/actions.ts`<br>`src/lib/repositories/project-charts-repository.ts`<br>`src/lib/repositories/project-estimate-sheets-repository.ts`<br>`src/lib/repositories/workspace-repository.ts` |
| table | `library_folders` | insert, query | `src/lib/ai/package-builder/read-tools.ts`<br>`src/lib/repositories/component-library-repository.ts` |
| table | `profiles` | query, select | `src/lib/ai/auth.ts`<br>`src/lib/ai/read-context.ts`<br>`src/lib/collaboration/actions.ts`<br>`src/lib/publication/actions.ts`<br>`src/lib/repositories/project-activity-repository.ts`<br>`src/lib/repositories/workspace-repository.ts` |
| table | `project_favorites` | query | `src/lib/collaboration/actions.ts`<br>`src/lib/repositories/workspace-repository.ts` |
| table | `project_group_memberships` | query | `src/lib/repositories/workspace-repository.ts` |
| table | `project_groups` | query | `src/lib/repositories/workspace-repository.ts` |
| table | `project_locations` | query | `src/lib/repositories/project-location-repository.ts` |
| table | `project_members` | query, upsert | `src/lib/collaboration/actions.ts`<br>`src/lib/publication/actions.ts`<br>`src/lib/repositories/workspace-repository.ts` |
| table | `project_publication_events` | insert, query | `src/lib/publication/actions.ts`<br>`src/lib/publication/public-repository.ts` |
| table | `project_publications` | query | `src/app/api/share/[token]/activity/route.ts`<br>`src/lib/publication/actions.ts`<br>`src/lib/publication/public-repository.ts`<br>`src/lib/repositories/workspace-repository.ts` |
| table | `projects` | query, select | `src/app/api/projects/images/route.ts`<br>`src/lib/ai/package-builder/read-tools.ts`<br>`src/lib/ai/read-context.ts`<br>`src/lib/collaboration/actions.ts`<br>`src/lib/publication/actions.ts`<br>`src/lib/repositories/workspace-repository.ts` |
| table | `publication_digest_log` | insert | `src/lib/publication/actions.ts` |
| table | `security_rate_limit_events` | insert, query | `src/lib/ai/rate-limit.ts`<br>`src/lib/collaboration/invite-entry.ts`<br>`src/lib/publication/actions.ts`<br>`src/lib/publication/public-repository.ts` |
| table | `shared_link_comments` | query | `src/app/api/share/[token]/activity/route.ts`<br>`src/lib/publication/actions.ts`<br>`src/lib/publication/public-repository.ts`<br>`src/lib/repositories/workspace-repository.ts` |
| table | `shared_link_events` | insert, query | `src/app/api/share/[token]/activity/route.ts`<br>`src/lib/publication/actions.ts`<br>`src/lib/publication/public-repository.ts` |
| table | `shared_link_recipients` | delete, query | `src/app/api/share/[token]/activity/route.ts`<br>`src/lib/publication/actions.ts`<br>`src/lib/publication/public-repository.ts`<br>`src/lib/repositories/workspace-repository.ts` |
| table | `shared_link_responses` | query | `src/app/api/share/[token]/activity/route.ts`<br>`src/lib/publication/actions.ts`<br>`src/lib/publication/public-repository.ts`<br>`src/lib/repositories/workspace-repository.ts` |
| table | `workspace_members` | query | `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`<br>`src/lib/collaboration/actions.ts`<br>`src/lib/publication/actions.ts`<br>`src/lib/repositories/workspace-repository.ts` |
| table | `workspaces` | query | `src/lib/ai/package-builder/read-tools.ts`<br>`src/lib/repositories/workspace-repository.ts` |

## Output 2: migration-derived index inventory

The scanner inspected `supabase/migrations/*.sql` and captured every `CREATE INDEX` / `CREATE UNIQUE INDEX` statement it found.

| Source | Statement |
| --- | --- |
| `supabase/migrations/20260518090000_archestimator_core_schema.sql:120` | `create index workspaces_created_by_idx on public.workspaces(created_by);` |
| `supabase/migrations/20260518090000_archestimator_core_schema.sql:121` | `create index workspace_members_user_id_idx on public.workspace_members(user_id);` |
| `supabase/migrations/20260518090000_archestimator_core_schema.sql:122` | `create index projects_workspace_id_idx on public.projects(workspace_id);` |
| `supabase/migrations/20260518090000_archestimator_core_schema.sql:123` | `create index estimates_project_id_idx on public.estimates(project_id);` |
| `supabase/migrations/20260518090000_archestimator_core_schema.sql:124` | `create index cost_library_items_workspace_id_idx on public.cost_library_items(workspace_id);` |
| `supabase/migrations/20260518090000_archestimator_core_schema.sql:125` | `create index estimate_nodes_estimate_parent_sort_idx on public.estimate_nodes(estimate_id, parent_id, sort_order);` |
| `supabase/migrations/20260518090000_archestimator_core_schema.sql:126` | `create index estimate_row_items_estimate_node_sort_idx on public.estimate_row_items(estimate_id, node_id, sort_order);` |
| `supabase/migrations/20260518100000_auth_profiles_ceo_access.sql:17` | `create index profiles_email_idx on public.profiles(email);` |
| `supabase/migrations/20260518100000_auth_profiles_ceo_access.sql:18` | `create index profiles_role_idx on public.profiles(role);` |
| `supabase/migrations/20260520051908_optimize_workspace_estimate_list_indexes.sql:2` | `create index if not exists projects_workspace_updated_at_idx on public.projects(workspace_id, updated_at desc);` |
| `supabase/migrations/20260520051908_optimize_workspace_estimate_list_indexes.sql:5` | `create index if not exists estimates_project_updated_at_idx on public.estimates(project_id, updated_at desc);` |
| `supabase/migrations/20260522064018_component_library_taxonomy_source.sql:39` | `create index if not exists component_category_nodes_parent_sort_idx on public.component_category_nodes(parent_id, sort_order);` |
| `supabase/migrations/20260522064018_component_library_taxonomy_source.sql:40` | `create index if not exists component_suppliers_workspace_sort_idx on public.component_suppliers(workspace_id, sort_order, name);` |
| `supabase/migrations/20260522064018_component_library_taxonomy_source.sql:41` | `create index if not exists cost_library_items_category_node_id_idx on public.cost_library_items(category_node_id);` |
| `supabase/migrations/20260522064018_component_library_taxonomy_source.sql:42` | `create index if not exists cost_library_items_supplier_id_idx on public.cost_library_items(supplier_id);` |
| `supabase/migrations/20260522064018_component_library_taxonomy_source.sql:43` | `create index if not exists estimate_row_items_category_node_id_idx on public.estimate_row_items(category_node_id);` |
| `supabase/migrations/20260522064018_component_library_taxonomy_source.sql:44` | `create index if not exists estimate_row_items_supplier_id_idx on public.estimate_row_items(supplier_id);` |
| `supabase/migrations/20260522070956_tighten_component_taxonomy_advisors.sql:3` | `create index if not exists component_category_nodes_created_by_idx on public.component_category_nodes(created_by);` |
| `supabase/migrations/20260522070956_tighten_component_taxonomy_advisors.sql:6` | `create index if not exists component_suppliers_created_by_idx on public.component_suppliers(created_by);` |
| `supabase/migrations/20260522091621_component_library_templates.sql:62` | `create index if not exists estimate_templates_workspace_sort_idx on public.estimate_templates(workspace_id, sort_order, name);` |
| `supabase/migrations/20260522091621_component_library_templates.sql:63` | `create index if not exists estimate_template_nodes_template_parent_sort_idx on public.estimate_template_nodes(template_id, parent_id, sort_order);` |
| `supabase/migrations/20260522091621_component_library_templates.sql:64` | `create index if not exists estimate_template_row_items_template_node_sort_idx on public.estimate_template_row_items(template_id, template_node_id, sort_order);` |
| `supabase/migrations/20260522091621_component_library_templates.sql:65` | `create index if not exists estimate_template_row_items_source_library_item_id_idx on public.estimate_template_row_items(source_library_item_id);` |
| `supabase/migrations/20260522091621_component_library_templates.sql:66` | `create index if not exists estimate_template_row_items_category_node_id_idx on public.estimate_template_row_items(category_node_id);` |
| `supabase/migrations/20260522091621_component_library_templates.sql:67` | `create index if not exists estimate_template_row_items_supplier_id_idx on public.estimate_template_row_items(supplier_id);` |
| `supabase/migrations/20260523030333_library_folder_organization.sql:22` | `create index if not exists library_folders_workspace_parent_sort_idx on public.library_folders(workspace_id, parent_id, sort_order);` |
| `supabase/migrations/20260523030333_library_folder_organization.sql:23` | `create unique index if not exists library_folders_workspace_source_category_key on public.library_folders(workspace_id, source_category_node_id) where source_category_node_id is not null;` |
| `supabase/migrations/20260523030333_library_folder_organization.sql:26` | `create index if not exists cost_library_items_library_folder_id_idx on public.cost_library_items(library_folder_id);` |
| `supabase/migrations/20260523120957_component_library_item_versioning.sql:87` | `create unique index if not exists cost_library_items_id_workspace_key on public.cost_library_items(id, workspace_id);` |
| `supabase/migrations/20260523120957_component_library_item_versioning.sql:89` | `create unique index if not exists component_suppliers_id_workspace_key on public.component_suppliers(id, workspace_id);` |
| `supabase/migrations/20260523120957_component_library_item_versioning.sql:91` | `create unique index if not exists library_folders_id_workspace_key on public.library_folders(id, workspace_id);` |
| `supabase/migrations/20260523120957_component_library_item_versioning.sql:93` | `create index if not exists cost_library_items_workspace_lifecycle_idx on public.cost_library_items(workspace_id, lifecycle_state);` |
| `supabase/migrations/20260523120957_component_library_item_versioning.sql:95` | `create index if not exists cost_library_item_versions_workspace_item_idx on public.cost_library_item_versions(workspace_id, item_id, version_number desc);` |
| `supabase/migrations/20260523120957_component_library_item_versioning.sql:97` | `create index if not exists cost_library_item_price_options_workspace_item_idx on public.cost_library_item_price_options(workspace_id, item_id, is_active);` |
| `supabase/migrations/20260523120957_component_library_item_versioning.sql:99` | `create unique index if not exists cost_library_item_price_options_default_active_key on public.cost_library_item_price_options(item_id) where is_default and is_active;` |
| `supabase/migrations/20260523120957_component_library_item_versioning.sql:102` | `create index if not exists cost_library_item_price_history_workspace_item_idx on public.cost_library_item_price_history(workspace_id, item_id, effective_at desc);` |
| `supabase/migrations/20260523120957_component_library_item_versioning.sql:104` | `create index if not exists cost_library_item_state_history_workspace_item_idx on public.cost_library_item_state_history(workspace_id, item_id, effective_at desc);` |
| `supabase/migrations/20260523144932_ai_audit_foundation.sql:93` | `create index if not exists ai_action_runs_workspace_actor_created_idx on public.ai_action_runs(workspace_id, actor_user_id, created_at desc);` |
| `supabase/migrations/20260523144932_ai_audit_foundation.sql:95` | `create index if not exists ai_action_runs_status_created_idx on public.ai_action_runs(status, created_at desc);` |
| `supabase/migrations/20260523144932_ai_audit_foundation.sql:97` | `create index if not exists ai_tool_calls_run_created_idx on public.ai_tool_calls(run_id, created_at);` |
| `supabase/migrations/20260523144932_ai_audit_foundation.sql:99` | `create index if not exists ai_tool_calls_workspace_tool_created_idx on public.ai_tool_calls(workspace_id, tool_name, created_at desc);` |
| `supabase/migrations/20260523144932_ai_audit_foundation.sql:101` | `create index if not exists ai_data_access_events_run_created_idx on public.ai_data_access_events(run_id, created_at);` |
| `supabase/migrations/20260523144932_ai_audit_foundation.sql:103` | `create index if not exists ai_data_access_events_workspace_event_created_idx on public.ai_data_access_events(workspace_id, event_name, created_at desc);` |
| `supabase/migrations/20260524033151_estimate_sheet_version_control.sql:56` | `create index if not exists estimate_sheet_events_estimate_created_idx on public.estimate_sheet_events(estimate_id, created_at desc, id desc);` |
| `supabase/migrations/20260524033151_estimate_sheet_version_control.sql:58` | `create index if not exists estimate_sheet_events_row_created_idx on public.estimate_sheet_events(target_row_id, created_at desc, id desc) where target_row_id is not null;` |
| `supabase/migrations/20260524033151_estimate_sheet_version_control.sql:61` | `create index if not exists estimate_sheet_events_correlation_idx on public.estimate_sheet_events(estimate_id, correlation_id, created_at desc);` |
| `supabase/migrations/20260524033151_estimate_sheet_version_control.sql:63` | `create index if not exists estimate_sheet_events_workspace_created_idx on public.estimate_sheet_events(workspace_id, created_at desc);` |
| `supabase/migrations/20260524033151_estimate_sheet_version_control.sql:65` | `create index if not exists estimate_sheet_versions_workspace_estimate_idx on public.estimate_sheet_versions(workspace_id, estimate_id, version_number desc);` |
| `supabase/migrations/20260524053500_component_brand_library.sql:20` | `create index if not exists component_brands_workspace_sort_idx on public.component_brands(workspace_id, sort_order, name);` |
| `supabase/migrations/20260524053500_component_brand_library.sql:21` | `create index if not exists cost_library_items_brand_id_idx on public.cost_library_items(brand_id);` |
| `supabase/migrations/20260524120322_component_library_variants.sql:71` | `create index if not exists cost_library_item_price_options_variant_sort_idx on public.cost_library_item_price_options(item_id, variant_sort_order, created_at, id);` |
| `supabase/migrations/20260524131204_component_variant_assets_cost_entries.sql:11` | `create unique index if not exists cost_library_item_price_options_id_workspace_key on public.cost_library_item_price_options(id, workspace_id);` |
| `supabase/migrations/20260524131204_component_variant_assets_cost_entries.sql:60` | `create unique index if not exists cost_library_variant_cost_entries_current_key on public.cost_library_item_variant_cost_entries(price_option_id) where is_current and deleted_at is null;` |
| `supabase/migrations/20260524131204_component_variant_assets_cost_entries.sql:64` | `create index if not exists cost_library_variant_cost_entries_option_idx on public.cost_library_item_variant_cost_entries(price_option_id, deleted_at, is_current desc, pricing_date desc, created_at desc);` |
| `supabase/migrations/20260524131204_component_variant_assets_cost_entries.sql:199` | `create index if not exists cost_library_variant_attachments_option_idx on public.cost_library_item_variant_attachments(price_option_id, created_at desc);` |
| `supabase/migrations/20260526013617_workshop_favorites.sql:62` | `create index if not exists project_favorites_workspace_user_created_idx on public.project_favorites(workspace_id, user_id, created_at desc);` |
| `supabase/migrations/20260526013617_workshop_favorites.sql:65` | `create index if not exists project_favorites_project_id_idx on public.project_favorites(project_id);` |
| `supabase/migrations/20260526013617_workshop_favorites.sql:68` | `create index if not exists estimate_favorites_workspace_user_created_idx on public.estimate_favorites(workspace_id, user_id, created_at desc);` |
| `supabase/migrations/20260526013617_workshop_favorites.sql:71` | `create index if not exists estimate_favorites_estimate_id_idx on public.estimate_favorites(estimate_id);` |
| `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql:111` | `create index if not exists project_members_workspace_user_idx on public.project_members(workspace_id, user_id);` |
| `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql:113` | `create index if not exists project_members_user_idx on public.project_members(user_id);` |
| `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql:115` | `create index if not exists estimate_sheet_members_project_user_idx on public.estimate_sheet_members(project_id, user_id);` |
| `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql:117` | `create index if not exists estimate_sheet_members_user_idx on public.estimate_sheet_members(user_id);` |
| `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql:119` | `create index if not exists collaboration_invitations_project_email_idx on public.collaboration_invitations(project_id, email);` |
| `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql:121` | `create index if not exists collaboration_invitations_estimate_email_idx on public.collaboration_invitations(estimate_id, email) where estimate_id is not null;` |
| `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql:124` | `create unique index if not exists collaboration_invitations_active_project_email_idx on public.collaboration_invitations(project_id, email) where scope = 'project' and accepted_at is null and revoked_at is null;` |
| `supabase/migrations/20260526142913_project_sheet_collaboration_access.sql:127` | `create unique index if not exists collaboration_invitations_active_estimate_email_idx on public.collaboration_invitations(estimate_id, email) where scope = 'estimate' and accepted_at is null and revoked_at is null;` |
| `supabase/migrations/20260527072220_auth_account_data.sql:80` | `create index user_onboarding_profiles_completed_idx on public.user_onboarding_profiles(user_id, onboarding_completed_at);` |
| `supabase/migrations/20260527072220_auth_account_data.sql:83` | `create index workspace_account_settings_country_idx on public.workspace_account_settings(country_region);` |
| `supabase/migrations/20260527072220_auth_account_data.sql:86` | `create index account_security_events_user_created_idx on public.account_security_events(user_id, created_at desc);` |
| `supabase/migrations/20260527072220_auth_account_data.sql:89` | `create index account_security_events_workspace_created_idx on public.account_security_events(workspace_id, created_at desc);` |
| `supabase/migrations/20260527115342_project_invite_entry_tokens.sql:61` | `create index if not exists collaboration_invitation_tokens_invitation_idx on public.collaboration_invitation_tokens(invitation_id);` |
| `supabase/migrations/20260527115342_project_invite_entry_tokens.sql:63` | `create index if not exists collaboration_invitation_tokens_expires_idx on public.collaboration_invitation_tokens(expires_at);` |
| `supabase/migrations/20260527115342_project_invite_entry_tokens.sql:65` | `create unique index if not exists collaboration_invitation_tokens_one_active_idx on public.collaboration_invitation_tokens(invitation_id) where used_at is null and revoked_at is null;` |
| `supabase/migrations/20260527115342_project_invite_entry_tokens.sql:80` | `create index if not exists collaboration_audit_events_invitation_idx on public.collaboration_audit_events(invitation_id, created_at desc);` |
| `supabase/migrations/20260527115342_project_invite_entry_tokens.sql:82` | `create index if not exists collaboration_audit_events_project_idx on public.collaboration_audit_events(project_id, created_at desc);` |
| `supabase/migrations/20260527115342_project_invite_entry_tokens.sql:89` | `create unique index collaboration_invitations_active_project_email_idx on public.collaboration_invitations(project_id, email) where scope = 'project' and lifecycle_state = 'pending';` |
| `supabase/migrations/20260527115342_project_invite_entry_tokens.sql:94` | `create unique index collaboration_invitations_active_estimate_email_idx on public.collaboration_invitations(estimate_id, email) where scope = 'estimate' and lifecycle_state = 'pending';` |
| `supabase/migrations/20260527120000_project_client_publication.sql:40` | `create index if not exists project_publications_project_status_idx on public.project_publications(project_id, status, published_at desc);` |
| `supabase/migrations/20260527120000_project_client_publication.sql:43` | `create index if not exists project_publications_token_hash_idx on public.project_publications(token_hash);` |
| `supabase/migrations/20260527120000_project_client_publication.sql:56` | `create index if not exists project_publication_events_publication_created_idx on public.project_publication_events(publication_id, created_at desc);` |
| `supabase/migrations/20260528220000_project_shared_link_overhaul.sql:82` | `create unique index if not exists shared_link_recipients_publication_email_idx on public.shared_link_recipients(publication_id, lower(email));` |
| `supabase/migrations/20260528220000_project_shared_link_overhaul.sql:85` | `create index if not exists shared_link_recipients_token_hash_idx on public.shared_link_recipients(recipient_token_hash);` |
| `supabase/migrations/20260528220000_project_shared_link_overhaul.sql:88` | `create index if not exists shared_link_recipients_publication_id_idx on public.shared_link_recipients(publication_id, created_at desc);` |
| `supabase/migrations/20260528220000_project_shared_link_overhaul.sql:92` | `create index if not exists shared_link_comments_publication_idx on public.shared_link_comments(publication_id, created_at desc);` |
| `supabase/migrations/20260528220000_project_shared_link_overhaul.sql:95` | `create index if not exists shared_link_comments_recipient_idx on public.shared_link_comments(recipient_id, created_at desc);` |
| `supabase/migrations/20260528220000_project_shared_link_overhaul.sql:98` | `create index if not exists shared_link_comments_estimate_idx on public.shared_link_comments(publication_id, estimate_id, created_at desc);` |
| `supabase/migrations/20260528220000_project_shared_link_overhaul.sql:102` | `create unique index if not exists shared_link_responses_recipient_publication_idx on public.shared_link_responses(recipient_id, publication_id);` |
| `supabase/migrations/20260528220000_project_shared_link_overhaul.sql:105` | `create index if not exists shared_link_responses_publication_idx on public.shared_link_responses(publication_id, created_at desc);` |
| `supabase/migrations/20260528220000_project_shared_link_overhaul.sql:109` | `create index if not exists shared_link_events_publication_idx on public.shared_link_events(publication_id, created_at desc);` |
| `supabase/migrations/20260531175141_shared_link_recipient_unsubscribe.sql:8` | `create index if not exists shared_link_recipients_email_unsubscribed_idx on public.shared_link_recipients(publication_id, email_unsubscribed_at desc) where email_unsubscribed_at is not null;` |
| `supabase/migrations/20260601003000_security_rate_limit_events.sql:10` | `create index if not exists security_rate_limit_events_lookup_idx on public.security_rate_limit_events(scope, key_hash, occurred_at desc);` |
| `supabase/migrations/20260601003000_security_rate_limit_events.sql:13` | `create index if not exists security_rate_limit_events_expiry_idx on public.security_rate_limit_events(expires_at);` |
| `supabase/migrations/20260601011500_resend_shared_link_delivery_webhooks.sql:12` | `create unique index if not exists shared_link_recipients_resend_email_id_idx on public.shared_link_recipients(resend_email_id) where resend_email_id is not null;` |
| `supabase/migrations/20260601011500_resend_shared_link_delivery_webhooks.sql:16` | `create index if not exists shared_link_recipients_resend_last_event_at_idx on public.shared_link_recipients(resend_last_event_at desc) where resend_last_event_at is not null;` |
| `supabase/migrations/20260602083000_beta_feedback_submissions.sql:22` | `create index if not exists beta_feedback_submissions_created_at_idx on public.beta_feedback_submissions(created_at desc);` |
| `supabase/migrations/20260602083000_beta_feedback_submissions.sql:25` | `create index if not exists beta_feedback_submissions_user_created_at_idx on public.beta_feedback_submissions(user_id, created_at desc);` |
| `supabase/migrations/20260603160000_mass_deletion_governance.sql:24` | `create index if not exists mass_deletion_events_workspace_created_idx on public.mass_deletion_events(workspace_id, created_at desc);` |
| `supabase/migrations/20260603160000_mass_deletion_governance.sql:25` | `create index if not exists mass_deletion_events_actor_correlation_idx on public.mass_deletion_events(actor_user_id, correlation_id);` |
| `supabase/migrations/20260603160000_mass_deletion_governance.sql:26` | `create index if not exists estimate_row_items_source_library_item_id_idx on public.estimate_row_items(source_library_item_id);` |
| `supabase/migrations/20260603160000_mass_deletion_governance.sql:27` | `create index if not exists cost_library_item_variant_attachments_item_idx on public.cost_library_item_variant_attachments(item_id);` |
| `supabase/migrations/20260606095935_legal_terms_acceptance.sql:27` | `create index legal_terms_acceptances_user_terms_accepted_idx on public.legal_terms_acceptances(user_id, terms_key, accepted_at desc);` |
| `supabase/migrations/20260606095935_legal_terms_acceptance.sql:30` | `create index legal_terms_acceptances_terms_version_idx on public.legal_terms_acceptances(terms_key, terms_version, accepted_at desc);` |
| `supabase/migrations/20260612094734_estimate_tabs_foundation.sql:28` | `create unique index estimate_tabs_one_default_per_estimate on public.estimate_tabs (estimate_id) where is_default;` |
| `supabase/migrations/20260612094734_estimate_tabs_foundation.sql:32` | `create index estimate_tabs_estimate_id_sort_idx on public.estimate_tabs (estimate_id, sort_order);` |
| `supabase/migrations/20260612094734_estimate_tabs_foundation.sql:72` | `create index estimate_nodes_tab_parent_sort_idx on public.estimate_nodes (estimate_tab_id, parent_id, sort_order);` |
| `supabase/migrations/20260612094734_estimate_tabs_foundation.sql:78` | `create index estimate_sheet_events_tab_created_idx on public.estimate_sheet_events (estimate_tab_id, created_at desc, id desc) where estimate_tab_id is not null;` |
| `supabase/migrations/20260614125313_20260606090000_notification_system.sql:78` | `create index if not exists notification_definitions_release_version_idx on public.notification_definitions(release_version) where release_version is not null;` |
| `supabase/migrations/20260614125313_20260606090000_notification_system.sql:82` | `create index if not exists notification_definitions_active_idx on public.notification_definitions(starts_at desc, expires_at, priority desc);` |
| `supabase/migrations/20260614125313_20260606090000_notification_system.sql:85` | `create index if not exists notification_definitions_dedupe_key_idx on public.notification_definitions(dedupe_key) where dedupe_key is not null;` |
| `supabase/migrations/20260614125313_20260606090000_notification_system.sql:89` | `create index if not exists notification_deliveries_user_feed_idx on public.notification_deliveries(user_id, delivered_at desc);` |
| `supabase/migrations/20260614125313_20260606090000_notification_system.sql:92` | `create index if not exists notification_deliveries_user_unread_idx on public.notification_deliveries(user_id, delivered_at desc) where read_at is null and dismissed_at is null and archived_at is null;` |
| `supabase/migrations/20260614125313_20260606090000_notification_system.sql:96` | `create index if not exists notification_deliveries_user_modal_idx on public.notification_deliveries(user_id, delivered_at desc) where modal_acknowledged_at is null and dismissed_at is null and archived_at is null;` |
| `supabase/migrations/20260616171158_project_groups.sql:31` | `create unique index if not exists project_groups_user_workspace_lower_name_idx on public.project_groups (user_id, workspace_id, lower(name));` |
| `supabase/migrations/20260616171158_project_groups.sql:34` | `create index if not exists project_groups_workspace_user_position_idx on public.project_groups (workspace_id, user_id, position, created_at);` |
| `supabase/migrations/20260616171158_project_groups.sql:37` | `create index if not exists project_group_memberships_workspace_user_idx on public.project_group_memberships (workspace_id, user_id);` |
| `supabase/migrations/20260616171158_project_groups.sql:40` | `create index if not exists project_group_memberships_group_id_idx on public.project_group_memberships (group_id);` |
| `supabase/migrations/20260616171158_project_groups.sql:43` | `create index if not exists project_group_memberships_project_id_idx on public.project_group_memberships (project_id);` |
| `supabase/migrations/20260617090000_project_groups.sql:55` | `create unique index if not exists project_groups_user_workspace_lower_name_idx on public.project_groups (user_id, workspace_id, lower(name));` |
| `supabase/migrations/20260617090000_project_groups.sql:59` | `create index if not exists project_groups_workspace_user_position_idx on public.project_groups (workspace_id, user_id, position, created_at);` |
| `supabase/migrations/20260617090000_project_groups.sql:63` | `create index if not exists project_group_memberships_workspace_user_idx on public.project_group_memberships (workspace_id, user_id);` |
| `supabase/migrations/20260617090000_project_groups.sql:66` | `create index if not exists project_group_memberships_group_id_idx on public.project_group_memberships (group_id);` |
| `supabase/migrations/20260617090000_project_groups.sql:69` | `create index if not exists project_group_memberships_project_id_idx on public.project_group_memberships (project_id);` |
| `supabase/migrations/20260619105250_project_dashboard_activity_location.sql:99` | `create index if not exists estimate_sheet_events_project_created_idx on public.estimate_sheet_events(project_id, created_at desc, id desc);` |
| `supabase/migrations/20260619105250_project_dashboard_activity_location.sql:138` | `create index if not exists project_locations_workspace_project_idx on public.project_locations(workspace_id, project_id);` |
| `supabase/migrations/20260621042221_shared_link_event_context.sql:31` | `create index if not exists shared_link_responses_estimate_idx on public.shared_link_responses (publication_id, estimate_id) where estimate_id is not null;` |
| `supabase/migrations/20260621042221_shared_link_event_context.sql:35` | `create index if not exists shared_link_responses_row_idx on public.shared_link_responses (publication_id, row_id) where row_id is not null;` |
| `supabase/migrations/20260621120000_shared_link_d1_d11_hardening.sql:44` | `create index if not exists publication_digest_log_publication_idx on public.publication_digest_log(publication_id, created_at desc);` |
| `supabase/migrations/20260621120000_shared_link_d1_d11_hardening.sql:240` | `create unique index if not exists project_publications_one_published_per_project_idx on public.project_publications(project_id) where status = 'published';` |

## Output 3: live metrics

Live Supabase metrics were not collected in this repo-only pass.

- Supabase advisor output: not collected.
- `pg_stat_statements` snapshot: not collected.
- Live unindexed-FK query results: not collected.
- Live schema parity: not collected.

## Output 4: live-metrics-unavailable note

Live metrics are unavailable for this local implementation slice because the user asked to skip external/provider/manual gates while provider configuration is pending. This artifact intentionally does not fabricate Supabase advisor findings, `pg_stat_statements`, live schema parity, live row counts, or EXPLAIN output.

## Follow-up

This completes the repo-only DBIDX-001 audit input. DBIDX-002/003 still require a linked/staging database or an owner-approved local staging database with representative seed data. Do not create candidate index migrations until parity and EXPLAIN evidence exist.
