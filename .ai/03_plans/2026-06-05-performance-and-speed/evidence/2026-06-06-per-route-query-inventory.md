# Per-route query inventory — 2026-06-06

Status: **REPO-STATIC QUERY INVENTORY CAPTURED / LIVE PROVIDER PROOF OPEN**.

Repo-static inventory only. Counts table/RPC references and selected-column payload shape by route bucket; does not prove live row counts, payload bytes, RLS cost, EXPLAIN plans, or provider latency.

Scanned roots: `src/app`, `src/lib/repositories`, `src/lib/publication`, `src/lib/collaboration`, `src/lib/ai`.

## Bucket summary

| Bucket | Query refs | Tables | RPCs | Explicit selects | Wildcard selects | Mutations | Max selected columns | Files |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| ai-ask-package-builder | 76 | 20 | 9 | 59 | 0 | 7 | 20 | `src/lib/ai/audit.ts`<br>`src/lib/ai/auth.ts`<br>`src/lib/ai/package-builder/apply.ts`<br>`src/lib/ai/package-builder/memory.ts`<br>`src/lib/ai/package-builder/read-tools.ts`<br>`src/lib/ai/rate-limit.ts`<br>`src/lib/ai/read-context.ts` |
| collaboration-invite | 36 | 11 | 5 | 21 | 0 | 9 | 7 | `src/app/invite/[token]/accept/route.ts`<br>`src/app/invite/[token]/page.tsx`<br>`src/lib/collaboration/actions.ts`<br>`src/lib/collaboration/invite-entry.ts`<br>`src/lib/collaboration/pending-invite-actions.ts`<br>`src/lib/collaboration/workshop-pending-invite.ts` |
| component-library | 18 | 14 | 0 | 3 | 14 | 1 | 7 | `src/lib/repositories/component-library-repository.ts`<br>`src/lib/repositories/cost-library-repository.ts` |
| media-upload-api | 2 | 1 | 0 | 2 | 0 | 0 | 2 | `src/app/api/projects/images/route.ts` |
| project-charts | 5 | 5 | 0 | 5 | 0 | 0 | 9 | `src/lib/repositories/project-charts-repository.ts` |
| public-share-publication | 68 | 14 | 3 | 49 | 0 | 15 | 14 | `src/app/api/share/[token]/activity/route.ts`<br>`src/app/share/[token]/page.tsx`<br>`src/lib/publication/actions.ts`<br>`src/lib/publication/public-repository.ts` |
| workshop-projects-estimates | 57 | 15 | 1 | 35 | 15 | 4 | 13 | `src/lib/repositories/estimate-repository.ts`<br>`src/lib/repositories/workspace-repository.ts` |

## Query reference detail

| Bucket | Source | Kind | Table/RPC | Operation | Payload shape | Selected columns | Select preview |
| --- | --- | --- | --- | --- | --- | ---: | --- |
| ai-ask-package-builder | `src/lib/ai/audit.ts:158` | table | `ai_action_runs` | insert | mutation-payload | n/a |  |
| ai-ask-package-builder | `src/lib/ai/audit.ts:163` | table | `ai_data_access_events` | insert | mutation-payload | n/a |  |
| ai-ask-package-builder | `src/lib/ai/audit.ts:313` | table | `ai_action_runs` | insert | mutation-payload | n/a |  |
| ai-ask-package-builder | `src/lib/ai/audit.ts:317` | table | `ai_tool_calls` | insert | mutation-payload | n/a |  |
| ai-ask-package-builder | `src/lib/ai/audit.ts:322` | table | `ai_data_access_events` | insert | mutation-payload | n/a |  |
| ai-ask-package-builder | `src/lib/ai/audit.ts:336` | table | `ai_action_runs` | insert | mutation-payload | n/a |  |
| ai-ask-package-builder | `src/lib/ai/auth.ts:37` | table | `profiles` | select | explicit-columns | 1 | `default_workspace_id` |
| ai-ask-package-builder | `src/lib/ai/package-builder/apply.ts:336` | table | `cost_library_items` | select | explicit-columns | 20 | `id, workspace_id, name, description, supplier, supplier_id, category, category_node_id, brand, brand_id, unit, unit_cost, misc_cost, lifecycle_state, current…` |
| ai-ask-package-builder | `src/lib/ai/package-builder/apply.ts:355` | table | `cost_library_item_price_options` | select | explicit-columns | 14 | `id, item_id, workspace_id, is_active, label, unit, unit_cost, misc_cost, currency, pricing_date, pricing_source, confidence, supplier_id, updated_at` |
| ai-ask-package-builder | `src/lib/ai/package-builder/apply.ts:915` | rpc | `create_ai_package_library_components_with_history` | rpc | rpc | n/a |  |
| ai-ask-package-builder | `src/lib/ai/package-builder/apply.ts:948` | table | `estimate_row_items` | select | explicit-columns | 2 | `node_id, sort_order` |
| ai-ask-package-builder | `src/lib/ai/package-builder/apply.ts:1008` | rpc | `create_estimate_node_with_history` | rpc | rpc | n/a |  |
| ai-ask-package-builder | `src/lib/ai/package-builder/apply.ts:1060` | rpc | `insert_estimate_template_into_estimate_with_history` | rpc | rpc | n/a |  |
| ai-ask-package-builder | `src/lib/ai/package-builder/apply.ts:1081` | rpc | `rename_estimate_node_with_history` | rpc | rpc | n/a |  |
| ai-ask-package-builder | `src/lib/ai/package-builder/apply.ts:1099` | rpc | `update_estimate_row_item_with_history` | rpc | rpc | n/a |  |
| ai-ask-package-builder | `src/lib/ai/package-builder/apply.ts:1118` | rpc | `replace_estimate_row_item_with_history` | rpc | rpc | n/a |  |
| ai-ask-package-builder | `src/lib/ai/package-builder/apply.ts:1143` | rpc | `delete_estimate_row_item_with_history` | rpc | rpc | n/a |  |
| ai-ask-package-builder | `src/lib/ai/package-builder/apply.ts:1177` | rpc | `insert_estimate_row_item_with_history` | rpc | rpc | n/a |  |
| ai-ask-package-builder | `src/lib/ai/package-builder/apply.ts:1213` | rpc | `insert_estimate_row_item_with_history` | rpc | rpc | n/a |  |
| ai-ask-package-builder | `src/lib/ai/package-builder/apply.ts:1345` | rpc | `create_project_estimate_package_with_history` | rpc | rpc | n/a |  |
| ai-ask-package-builder | `src/lib/ai/package-builder/memory.ts:259` | table | `ai_package_builder_memory_preferences` | select | explicit-columns | 8 | `signal, source_type, source_id, source_label, room_name, operation_type, weight, created_at` |
| ai-ask-package-builder | `src/lib/ai/package-builder/memory.ts:306` | table | `ai_package_builder_memory_preferences` | insert | mutation-payload | n/a |  |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:529` | table | `workspaces` | select | explicit-columns | 1 | `name` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:544` | table | `projects` | select | explicit-columns | 6 | `id, name, client_name, location, project_code, updated_at` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:567` | table | `projects` | select | explicit-columns | 6 | `id, name, client_name, location, project_code, updated_at` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:588` | table | `estimates` | select | explicit-columns | 4 | `id, project_id, name, sheet_code` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:603` | table | `estimate_nodes` | select | explicit-columns | 4 | `id, estimate_id, kind, sort_order` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:609` | table | `estimate_row_items` | select | explicit-columns | 5 | `estimate_id, quantity, unit_cost, contingency_percentage, misc_cost` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:663` | table | `estimate_nodes` | select | explicit-columns | 2 | `id, estimate_id` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:681` | table | `estimates` | select | explicit-columns | 4 | `id, project_id, name, sheet_code` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:699` | table | `estimate_nodes` | select | explicit-columns | 6 | `id, estimate_id, parent_id, kind, name, sort_order` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:705` | table | `estimate_row_items` | select | explicit-columns | 11 | `id, estimate_id, node_id, material, quantity, unit, unit_cost, contingency_percentage, misc_cost, row_revision, source_library_item_id` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:743` | table | `cost_library_items` | select | explicit-columns | 18 | `id, name, description, category, category_node_id, library_folder_id, supplier, supplier_id, brand, brand_id, unit, unit_cost, misc_cost, lifecycle_state, cu…` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:762` | table | `cost_library_item_price_options` | select | explicit-columns | 11 | `id, item_id, unit, unit_cost, misc_cost, currency, is_active, is_default, updated_at, confidence, supplier_id` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:777` | table | `component_category_nodes` | select | explicit-columns | 7 | `id, parent_id, label, node_type, sort_order, code, metadata` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:793` | table | `library_folders` | select | explicit-columns | 7 | `id, workspace_id, parent_id, name, sort_order, source_category_node_id, folder_kind` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:888` | table | `estimates` | select | explicit-columns | 5 | `id, project_id, name, sheet_code, updated_at` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:905` | table | `estimate_nodes` | select | explicit-columns | 6 | `id, estimate_id, parent_id, kind, name, sort_order` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:911` | table | `estimate_row_items` | select | explicit-columns | 13 | `id, estimate_id, node_id, material, description, supplier, quantity, unit, unit_cost, contingency_percentage, misc_cost, source_library_item_id, updated_at` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:1079` | table | `estimates` | select | explicit-columns | 5 | `id, project_id, name, sheet_code, updated_at` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:1095` | table | `estimate_nodes` | select | explicit-columns | 6 | `id, estimate_id, parent_id, kind, name, sort_order` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:1101` | table | `estimate_row_items` | select | explicit-columns | 13 | `id, estimate_id, node_id, material, description, supplier, quantity, unit, unit_cost, contingency_percentage, misc_cost, source_library_item_id, updated_at` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:1167` | table | `estimate_templates` | select | explicit-columns | 4 | `id, name, description, category` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:1181` | table | `estimate_template_nodes` | select | explicit-columns | 4 | `id, template_id, kind, name` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:1186` | table | `estimate_template_row_items` | select | explicit-columns | 12 | `id, template_id, template_node_id, material, description, supplier, quantity, unit, unit_cost, contingency_percentage, misc_cost, sort_order` |
| ai-ask-package-builder | `src/lib/ai/rate-limit.ts:52` | table | `security_rate_limit_events` | select | explicit-columns | 1 | `id` |
| ai-ask-package-builder | `src/lib/ai/rate-limit.ts:57` | table | `security_rate_limit_events` | select | explicit-columns | 1 | `id` |
| ai-ask-package-builder | `src/lib/ai/rate-limit.ts:68` | table | `security_rate_limit_events` | select | explicit-columns | 1 | `id` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:819` | table | `profiles` | select | explicit-columns | 2 | `id, display_name` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:876` | table | `projects` | select | explicit-columns | 2 | `id, name` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:897` | table | `estimate_nodes` | select | explicit-columns | 2 | `id, estimate_id` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:917` | table | `estimates` | select | explicit-columns | 3 | `id, name, sheet_code` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:935` | table | `estimate_sheet_events` | select | explicit-columns | 8 | `event_type, event_source, created_at, actor_user_id, row_context, changed_fields, total_delta, payload` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:974` | table | `projects` | select | explicit-columns | 2 | `id, name` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:990` | table | `estimates` | select | explicit-columns | 5 | `id, name, sheet_code, currency_code, updated_at` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1016` | table | `estimate_row_items` | select | explicit-columns | 9 | `id, estimate_id, node_id, supplier, source_snapshot, quantity, unit_cost, contingency_percentage, misc_cost` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1021` | table | `estimate_nodes` | select | explicit-columns | 6 | `id, estimate_id, parent_id, kind, name, sort_order` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1027` | table | `component_category_nodes` | select | explicit-columns | 5 | `id, parent_id, node_type, label, sort_order` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1031` | table | `component_suppliers` | select | explicit-columns | 4 | `id, name, normalized_name, sort_order` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1216` | table | `projects` | select | explicit-columns | 2 | `id, name` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1230` | table | `estimates` | select | explicit-columns | 4 | `id, project_id, name, sheet_code` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1245` | table | `estimate_nodes` | select | explicit-columns | 4 | `id, estimate_id, kind, name` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1250` | table | `estimate_row_items` | select | explicit-columns | 13 | `id, estimate_id, node_id, material, description, supplier, quantity, unit, unit_cost, contingency_percentage, misc_cost, source_library_item_id, updated_at` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1309` | table | `estimate_templates` | select | explicit-columns | 4 | `id, name, description, category` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1330` | table | `estimate_template_nodes` | select | explicit-columns | 4 | `id, template_id, kind, name` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1335` | table | `estimate_template_row_items` | select | explicit-columns | 12 | `id, template_id, template_node_id, material, description, supplier, quantity, unit, unit_cost, contingency_percentage, misc_cost, sort_order` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1408` | table | `cost_library_items` | select | explicit-columns | 14 | `id, name, description, category, supplier, supplier_id, brand, unit, unit_cost, misc_cost, lifecycle_state, current_version_number, active_price_option_id, c…` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1424` | table | `cost_library_item_price_options` | select | explicit-columns | 11 | `id, item_id, unit, unit_cost, misc_cost, currency, is_active, is_default, updated_at, confidence, supplier_id` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1585` | table | `projects` | select | explicit-columns | 1 | `id` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1600` | table | `projects` | select | explicit-columns | 2 | `id, name` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1723` | table | `projects` | select | explicit-columns | 2 | `id, name` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1743` | table | `estimates` | select | explicit-columns | 3 | `id, name, sheet_code` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1763` | table | `estimate_nodes` | select | explicit-columns | 2 | `id, estimate_id` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1780` | table | `estimates` | select | explicit-columns | 3 | `id, name, sheet_code` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1798` | table | `estimate_nodes` | select | explicit-columns | 6 | `id, estimate_id, parent_id, kind, name, sort_order` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1804` | table | `estimate_row_items` | select | explicit-columns | 10 | `id, estimate_id, node_id, material, quantity, unit, unit_cost, contingency_percentage, misc_cost, source_library_item_id` |
| collaboration-invite | `src/app/invite/[token]/accept/route.ts:105` | rpc | `accept_collaboration_invitation` | rpc | rpc | n/a |  |
| collaboration-invite | `src/app/invite/[token]/page.tsx:88` | rpc | `resolve_collaboration_invitation` | rpc | rpc | n/a |  |
| collaboration-invite | `src/lib/collaboration/actions.ts:123` | table | `workspace_members` | select | explicit-columns | 1 | `role` |
| collaboration-invite | `src/lib/collaboration/actions.ts:129` | table | `project_members` | select | explicit-columns | 1 | `role` |
| collaboration-invite | `src/lib/collaboration/actions.ts:148` | table | `projects` | select | explicit-columns | 3 | `id, name, workspace_id` |
| collaboration-invite | `src/lib/collaboration/actions.ts:176` | table | `estimate_sheet_access_settings` | select | explicit-columns | 1 | `inherit_project_access` |
| collaboration-invite | `src/lib/collaboration/actions.ts:181` | table | `estimate_sheet_members` | select | explicit-columns | 1 | `role` |
| collaboration-invite | `src/lib/collaboration/actions.ts:199` | table | `estimates` | select | explicit-columns | 2 | `id, project_id` |
| collaboration-invite | `src/lib/collaboration/actions.ts:221` | table | `workspace_members` | select | explicit-columns | 1 | `user_id` |
| collaboration-invite | `src/lib/collaboration/actions.ts:228` | table | `project_members` | select | explicit-columns | 1 | `user_id` |
| collaboration-invite | `src/lib/collaboration/actions.ts:256` | table | `collaboration_invitations` | select | explicit-columns | 2 | `id, expires_at` |
| collaboration-invite | `src/lib/collaboration/actions.ts:275` | table | `collaboration_invitations` | select | explicit-columns | 2 | `id, expires_at` |
| collaboration-invite | `src/lib/collaboration/actions.ts:330` | rpc | `issue_collaboration_invitation_token` | rpc | rpc | n/a |  |
| collaboration-invite | `src/lib/collaboration/actions.ts:391` | rpc | `record_collaboration_invitation_delivery` | rpc | rpc | n/a |  |
| collaboration-invite | `src/lib/collaboration/actions.ts:413` | table | `collaboration_audit_events` | insert | mutation-payload | n/a |  |
| collaboration-invite | `src/lib/collaboration/actions.ts:482` | table | `profiles` | select | explicit-columns | 1 | `id` |
| collaboration-invite | `src/lib/collaboration/actions.ts:501` | table | `project_members` | update | mutation-payload | n/a |  |
| collaboration-invite | `src/lib/collaboration/actions.ts:514` | table | `collaboration_invitations` | update | mutation-payload | n/a |  |
| collaboration-invite | `src/lib/collaboration/actions.ts:623` | table | `profiles` | select | explicit-columns | 1 | `id` |
| collaboration-invite | `src/lib/collaboration/actions.ts:642` | table | `estimate_sheet_members` | update | mutation-payload | n/a |  |
| collaboration-invite | `src/lib/collaboration/actions.ts:655` | table | `collaboration_invitations` | update | mutation-payload | n/a |  |
| collaboration-invite | `src/lib/collaboration/actions.ts:749` | table | `collaboration_invitations` | select | explicit-columns | 2 | `project_id, expires_at` |
| collaboration-invite | `src/lib/collaboration/actions.ts:790` | table | `collaboration_invitations` | select | explicit-columns | 7 | `project_id, email, role, scope, expires_at, lifecycle_state, revoked_at` |
| collaboration-invite | `src/lib/collaboration/actions.ts:855` | table | `project_members` | select | explicit-columns | 1 | `role` |
| collaboration-invite | `src/lib/collaboration/actions.ts:867` | table | `project_members` | select | explicit-columns | 2 | `email, display_name` |
| collaboration-invite | `src/lib/collaboration/actions.ts:901` | table | `profiles` | select | explicit-columns | 2 | `email, display_name` |
| collaboration-invite | `src/lib/collaboration/actions.ts:941` | table | `project_members` | select | explicit-columns | 1 | `role` |
| collaboration-invite | `src/lib/collaboration/actions.ts:955` | table | `project_members` | delete | mutation-payload | n/a |  |
| collaboration-invite | `src/lib/collaboration/actions.ts:962` | table | `project_favorites` | delete | mutation-payload | n/a |  |
| collaboration-invite | `src/lib/collaboration/actions.ts:994` | table | `estimate_sheet_members` | upsert | mutation-payload | n/a |  |
| collaboration-invite | `src/lib/collaboration/actions.ts:1019` | table | `estimate_sheet_access_settings` | upsert | mutation-payload | n/a |  |
| collaboration-invite | `src/lib/collaboration/invite-entry.ts:145` | table | `security_rate_limit_events` | select | explicit-columns | 1 | `id` |
| collaboration-invite | `src/lib/collaboration/invite-entry.ts:150` | table | `security_rate_limit_events` | select | explicit-columns | 1 | `id` |
| collaboration-invite | `src/lib/collaboration/invite-entry.ts:170` | table | `security_rate_limit_events` | select | explicit-columns | 1 | `id` |
| collaboration-invite | `src/lib/collaboration/pending-invite-actions.ts:44` | rpc | `accept_collaboration_invitation_by_id` | rpc | rpc | n/a |  |
| collaboration-invite | `src/lib/collaboration/workshop-pending-invite.ts:31` | rpc | `accept_collaboration_invitation` | rpc | rpc | n/a |  |
| component-library | `src/lib/repositories/component-library-repository.ts:315` | table | `library_folders` | select | explicit-columns | 7 | `id, workspace_id, parent_id, name, sort_order, source_category_node_id, folder_kind` |
| component-library | `src/lib/repositories/component-library-repository.ts:370` | table | `library_folders` | insert | mutation-payload | n/a |  |
| component-library | `src/lib/repositories/component-library-repository.ts:516` | table | `component_category_nodes` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/component-library-repository.ts:518` | table | `component_suppliers` | select | explicit-columns | 4 | `id, name, normalized_name, sort_order` |
| component-library | `src/lib/repositories/component-library-repository.ts:524` | table | `component_brands` | select | explicit-columns | 4 | `id, name, normalized_name, sort_order` |
| component-library | `src/lib/repositories/component-library-repository.ts:530` | table | `cost_library_items` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/component-library-repository.ts:569` | table | `cost_library_item_price_options` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/component-library-repository.ts:577` | table | `cost_library_item_versions` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/component-library-repository.ts:583` | table | `cost_library_item_price_history` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/component-library-repository.ts:589` | table | `cost_library_item_state_history` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/component-library-repository.ts:595` | table | `cost_library_item_variant_cost_entries` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/component-library-repository.ts:604` | table | `cost_library_item_variant_attachments` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/component-library-repository.ts:710` | table | `estimate_templates` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/component-library-repository.ts:725` | table | `estimate_template_nodes` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/component-library-repository.ts:730` | table | `estimate_template_row_items` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/cost-library-repository.ts:59` | table | `cost_library_items` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/cost-library-repository.ts:70` | table | `cost_library_items` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/cost-library-repository.ts:77` | table | `cost_library_items` | select | wildcard | n/a | `*` |
| media-upload-api | `src/app/api/projects/images/route.ts:172` | table | `projects` | select | explicit-columns | 2 | `id, workspace_id` |
| media-upload-api | `src/app/api/projects/images/route.ts:213` | table | `projects` | select | explicit-columns | 1 | `id` |
| project-charts | `src/lib/repositories/project-charts-repository.ts:49` | table | `estimates` | select | explicit-columns | 5 | `id, name, sheet_code, currency_code, updated_at` |
| project-charts | `src/lib/repositories/project-charts-repository.ts:158` | table | `estimate_row_items` | select | explicit-columns | 9 | `id, estimate_id, node_id, supplier, source_snapshot, quantity, unit_cost, contingency_percentage, misc_cost` |
| project-charts | `src/lib/repositories/project-charts-repository.ts:196` | table | `estimate_nodes` | select | explicit-columns | 6 | `id, estimate_id, parent_id, kind, name, sort_order` |
| project-charts | `src/lib/repositories/project-charts-repository.ts:224` | table | `component_category_nodes` | select | explicit-columns | 5 | `id, parent_id, node_type, label, sort_order` |
| project-charts | `src/lib/repositories/project-charts-repository.ts:251` | table | `component_suppliers` | select | explicit-columns | 4 | `id, name, normalized_name, sort_order` |
| public-share-publication | `src/app/api/share/[token]/activity/route.ts:111` | table | `project_publications` | select | explicit-columns | 7 | `id, status, revoked_at, expires_at, password_hash, snapshot_json, snapshot_version` |
| public-share-publication | `src/app/api/share/[token]/activity/route.ts:156` | table | `shared_link_comments` | select | explicit-columns | 9 | `id, created_at, body, is_internal, author_email, author_name, recipient_id, estimate_id, row_id` |
| public-share-publication | `src/app/api/share/[token]/activity/route.ts:162` | table | `shared_link_responses` | select | explicit-columns | 5 | `id, created_at, decision, note, recipient_id` |
| public-share-publication | `src/app/api/share/[token]/activity/route.ts:169` | table | `shared_link_events` | select | explicit-columns | 5 | `id, created_at, event_type, metadata_json, recipient_id` |
| public-share-publication | `src/app/api/share/[token]/activity/route.ts:199` | table | `shared_link_recipients` | select | explicit-columns | 2 | `id, display_name` |
| public-share-publication | `src/app/share/[token]/page.tsx:255` | table | `projects` | query | unknown | n/a |  |
| public-share-publication | `src/lib/publication/actions.ts:132` | table | `projects` | select | explicit-columns | 8 | `id, workspace_id, name, project_code, client_name, location, currency_code, metadata` |
| public-share-publication | `src/lib/publication/actions.ts:143` | table | `workspace_members` | select | explicit-columns | 1 | `role` |
| public-share-publication | `src/lib/publication/actions.ts:149` | table | `project_members` | select | explicit-columns | 1 | `role` |
| public-share-publication | `src/lib/publication/actions.ts:251` | table | `project_publications` | select | explicit-columns | 3 | `id, project_id, published_by` |
| public-share-publication | `src/lib/publication/actions.ts:260` | table | `projects` | select | explicit-columns | 3 | `id, workspace_id, created_by` |
| public-share-publication | `src/lib/publication/actions.ts:268` | table | `workspace_members` | select | explicit-columns | 1 | `user_id` |
| public-share-publication | `src/lib/publication/actions.ts:278` | table | `profiles` | select | explicit-columns | 3 | `id, email, display_name` |
| public-share-publication | `src/lib/publication/actions.ts:295` | table | `profiles` | select | explicit-columns | 2 | `email, display_name` |
| public-share-publication | `src/lib/publication/actions.ts:311` | table | `profiles` | select | explicit-columns | 2 | `email, display_name` |
| public-share-publication | `src/lib/publication/actions.ts:330` | table | `project_publications` | select | explicit-columns | 6 | `id, encrypted_token, expires_at, password_hash, selected_estimate_ids, snapshot_version` |
| public-share-publication | `src/lib/publication/actions.ts:344` | table | `estimates` | select | explicit-columns | 4 | `id, name, sheet_code, updated_at` |
| public-share-publication | `src/lib/publication/actions.ts:363` | table | `estimate_row_items` | select | explicit-columns | 13 | `id, estimate_id, node_id, description, designation, discipline, material, quantity, unit, unit_cost, misc_cost, contingency_percentage, source_snapshot` |
| public-share-publication | `src/lib/publication/actions.ts:368` | table | `estimate_nodes` | select | explicit-columns | 6 | `id, estimate_id, name, kind, parent_id, sort_order` |
| public-share-publication | `src/lib/publication/actions.ts:480` | table | `project_publications` | insert | mutation-payload | n/a |  |
| public-share-publication | `src/lib/publication/actions.ts:489` | table | `project_publications` | insert | mutation-payload | n/a |  |
| public-share-publication | `src/lib/publication/actions.ts:536` | table | `project_publications` | update | mutation-payload | n/a |  |
| public-share-publication | `src/lib/publication/actions.ts:577` | table | `project_publications` | insert | mutation-payload | n/a |  |
| public-share-publication | `src/lib/publication/actions.ts:586` | table | `project_publications` | insert | mutation-payload | n/a |  |
| public-share-publication | `src/lib/publication/actions.ts:609` | table | `project_publications` | update | mutation-payload | n/a |  |
| public-share-publication | `src/lib/publication/actions.ts:719` | table | `security_rate_limit_events` | select | explicit-columns | 1 | `id` |
| public-share-publication | `src/lib/publication/actions.ts:724` | table | `security_rate_limit_events` | select | explicit-columns | 1 | `id` |
| public-share-publication | `src/lib/publication/actions.ts:733` | table | `security_rate_limit_events` | select | explicit-columns | 1 | `id` |
| public-share-publication | `src/lib/publication/actions.ts:815` | table | `project_publications` | select | explicit-columns | 4 | `id, project_id, workspace_id, encrypted_token` |
| public-share-publication | `src/lib/publication/actions.ts:841` | table | `shared_link_recipients` | select | explicit-columns | 14 | `id, publication_id, email, display_name, email_unsubscribed_at, invited_by, invited_at, delivery_status, last_opened_at, resend_email_id, resend_last_event_a…` |
| public-share-publication | `src/lib/publication/actions.ts:908` | table | `projects` | select | explicit-columns | 1 | `name` |
| public-share-publication | `src/lib/publication/actions.ts:920` | table | `shared_link_recipients` | select | explicit-columns | 1 | `id` |
| public-share-publication | `src/lib/publication/actions.ts:956` | table | `shared_link_recipients` | update | mutation-payload | n/a |  |
| public-share-publication | `src/lib/publication/actions.ts:1014` | table | `shared_link_recipients` | select | explicit-columns | 4 | `id, email, display_name, email_unsubscribed_at` |
| public-share-publication | `src/lib/publication/actions.ts:1034` | table | `shared_link_recipients` | update | mutation-payload | n/a |  |
| public-share-publication | `src/lib/publication/actions.ts:1061` | table | `shared_link_recipients` | update | mutation-payload | n/a |  |
| public-share-publication | `src/lib/publication/actions.ts:1092` | table | `shared_link_recipients` | delete | mutation-payload | n/a |  |
| public-share-publication | `src/lib/publication/actions.ts:1171` | table | `project_publications` | select | explicit-columns | 6 | `id, project_id, status, revoked_at, expires_at, snapshot_json` |
| public-share-publication | `src/lib/publication/actions.ts:1188` | table | `shared_link_comments` | select | explicit-columns | 9 | `id, created_at, body, is_internal, author_email, author_name, recipient_id, estimate_id, row_id` |
| public-share-publication | `src/lib/publication/actions.ts:1192` | table | `shared_link_responses` | select | explicit-columns | 5 | `id, created_at, decision, note, recipient_id` |
| public-share-publication | `src/lib/publication/actions.ts:1196` | table | `shared_link_events` | select | explicit-columns | 5 | `id, created_at, event_type, metadata_json, recipient_id` |
| public-share-publication | `src/lib/publication/actions.ts:1200` | table | `project_publication_events` | select | explicit-columns | 4 | `id, created_at, event_type, metadata_json` |
| public-share-publication | `src/lib/publication/actions.ts:1227` | table | `shared_link_recipients` | select | explicit-columns | 2 | `id, display_name` |
| public-share-publication | `src/lib/publication/public-repository.ts:193` | table | `security_rate_limit_events` | select | explicit-columns | 1 | `id` |
| public-share-publication | `src/lib/publication/public-repository.ts:210` | table | `security_rate_limit_events` | select | explicit-columns | 1 | `id` |
| public-share-publication | `src/lib/publication/public-repository.ts:231` | table | `security_rate_limit_events` | insert | mutation-payload | n/a |  |
| public-share-publication | `src/lib/publication/public-repository.ts:243` | table | `security_rate_limit_events` | delete | mutation-payload | n/a |  |
| public-share-publication | `src/lib/publication/public-repository.ts:477` | table | `project_publications` | select | explicit-columns | 6 | `id, status, password_hash, expires_at, revoked_at, snapshot_version` |
| public-share-publication | `src/lib/publication/public-repository.ts:493` | table | `project_publications` | select | explicit-columns | 7 | `id, status, password_hash, snapshot_json, expires_at, revoked_at, snapshot_version` |
| public-share-publication | `src/lib/publication/public-repository.ts:512` | table | `project_publications` | select | explicit-columns | 6 | `id, status, password_hash, expires_at, revoked_at, snapshot_version` |
| public-share-publication | `src/lib/publication/public-repository.ts:545` | table | `project_publications` | select | explicit-columns | 6 | `id, status, password_hash, expires_at, revoked_at, snapshot_version` |
| public-share-publication | `src/lib/publication/public-repository.ts:558` | table | `project_publication_events` | select | explicit-columns | 6 | `id, status, password_hash, expires_at, revoked_at, snapshot_version` |
| public-share-publication | `src/lib/publication/public-repository.ts:585` | table | `project_publications` | select | explicit-columns | 6 | `id, status, password_hash, expires_at, revoked_at, snapshot_version` |
| public-share-publication | `src/lib/publication/public-repository.ts:597` | table | `project_publication_events` | insert | mutation-payload | n/a |  |
| public-share-publication | `src/lib/publication/public-repository.ts:607` | rpc | `increment_project_publication_open` | rpc | rpc | n/a |  |
| public-share-publication | `src/lib/publication/public-repository.ts:615` | table | `shared_link_recipients` | insert | mutation-payload | n/a |  |
| public-share-publication | `src/lib/publication/public-repository.ts:625` | table | `shared_link_events` | insert | mutation-payload | n/a |  |
| public-share-publication | `src/lib/publication/public-repository.ts:653` | table | `project_publications` | select | explicit-columns | 5 | `id, status, expires_at, revoked_at, snapshot_version` |
| public-share-publication | `src/lib/publication/public-repository.ts:664` | table | `shared_link_recipients` | select | explicit-columns | 3 | `id, email, display_name` |
| public-share-publication | `src/lib/publication/public-repository.ts:692` | table | `project_publications` | select | explicit-columns | 6 | `id, status, password_hash, expires_at, revoked_at, snapshot_version` |
| public-share-publication | `src/lib/publication/public-repository.ts:703` | table | `shared_link_recipients` | select | explicit-columns | 3 | `id, email, display_name` |
| public-share-publication | `src/lib/publication/public-repository.ts:734` | table | `shared_link_recipients` | select | explicit-columns | 3 | `id, email, display_name` |
| public-share-publication | `src/lib/publication/public-repository.ts:759` | table | `shared_link_comments` | select | explicit-columns | 6 | `id, created_at, body, author_name, author_email, recipient_id` |
| public-share-publication | `src/lib/publication/public-repository.ts:793` | table | `shared_link_responses` | select | explicit-columns | 3 | `decision, note, created_at` |
| public-share-publication | `src/lib/publication/public-repository.ts:837` | table | `shared_link_recipients` | select | explicit-columns | 1 | `recipient_token_hash` |
| public-share-publication | `src/lib/publication/public-repository.ts:852` | rpc | `insert_client_comment` | rpc | rpc | n/a |  |
| public-share-publication | `src/lib/publication/public-repository.ts:893` | table | `shared_link_recipients` | select | explicit-columns | 1 | `recipient_token_hash` |
| public-share-publication | `src/lib/publication/public-repository.ts:908` | rpc | `submit_client_response` | rpc | rpc | n/a |  |
| workshop-projects-estimates | `src/lib/repositories/estimate-repository.ts:152` | table | `estimate_nodes` | select | unknown | n/a |  |
| workshop-projects-estimates | `src/lib/repositories/estimate-repository.ts:157` | table | `estimate_row_items` | select | unknown | n/a |  |
| workshop-projects-estimates | `src/lib/repositories/estimate-repository.ts:182` | table | `estimate_row_items` | insert | mutation-payload | n/a |  |
| workshop-projects-estimates | `src/lib/repositories/estimate-repository.ts:191` | table | `estimate_row_items` | insert | mutation-payload | n/a |  |
| workshop-projects-estimates | `src/lib/repositories/estimate-repository.ts:202` | table | `estimate_row_items` | upsert | mutation-payload | n/a |  |
| workshop-projects-estimates | `src/lib/repositories/estimate-repository.ts:209` | table | `estimate_row_items` | delete | mutation-payload | n/a |  |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:247` | table | `project_members` | select | explicit-columns | 4 | `project_id, workspace_id, user_id, role` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:266` | table | `estimate_sheet_members` | select | explicit-columns | 4 | `estimate_id, project_id, user_id, role` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:285` | table | `estimate_sheet_access_settings` | select | explicit-columns | 2 | `estimate_id, inherit_project_access` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:302` | table | `collaboration_invitations` | select | explicit-columns | 7 | `id, project_id, email, role, scope, estimate_id, expires_at` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:333` | rpc | `list_pending_collaboration_invitations` | rpc | rpc | n/a |  |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:337` | table | `collaboration_invitations` | select | explicit-columns | 2 | `id, project_id` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:421` | table | `project_publications` | select | explicit-columns | 13 | `id, project_id, encrypted_token, password_hash, status, snapshot_json, snapshot_version, selected_estimate_ids, published_at, expires_at, revoked_at, open_co…` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:445` | table | `project_publications` | select | explicit-columns | 11 | `id, project_id, encrypted_token, password_hash, status, snapshot_version, published_at, expires_at, revoked_at, open_count, latest_opened_at` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:557` | table | `estimates` | select | explicit-columns | 1 | `updated_at` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:577` | table | `shared_link_recipients` | select | explicit-columns | 3 | `email, display_name, last_opened_at` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:605` | table | `profiles` | select | explicit-columns | 4 | `id, display_name, email, avatar_url` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:610` | table | `profiles` | select | explicit-columns | 3 | `id, display_name, email` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:646` | table | `workspaces` | select | wildcard | n/a | `*` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:658` | table | `workspaces` | select | wildcard | n/a | `*` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:666` | table | `profiles` | select | wildcard | n/a | `*` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:682` | table | `workspaces` | select | wildcard | n/a | `*` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:690` | table | `profiles` | select | wildcard | n/a | `*` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:707` | table | `projects` | select | wildcard | n/a | `*` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:712` | table | `project_favorites` | select | explicit-columns | 1 | `project_id` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:717` | table | `project_members` | select | explicit-columns | 4 | `project_id, workspace_id, role, user_id` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:721` | table | `estimate_sheet_members` | select | explicit-columns | 4 | `estimate_id, project_id, role, user_id` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:725` | table | `workspace_members` | select | explicit-columns | 1 | `role` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:755` | table | `projects` | select | wildcard | n/a | `*` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:876` | table | `project_favorites` | select | explicit-columns | 2 | `project_id, created_at` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:883` | table | `estimate_favorites` | select | explicit-columns | 2 | `estimate_id, created_at` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:890` | table | `projects` | select | explicit-columns | 8 | `id, name, client_name, project_code, location, updated_at, workspace_id, created_by` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:896` | table | `project_members` | select | explicit-columns | 4 | `project_id, workspace_id, role, user_id` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:900` | table | `estimate_sheet_members` | select | explicit-columns | 4 | `estimate_id, project_id, role, user_id` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:904` | table | `workspace_members` | select | explicit-columns | 1 | `role` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:942` | table | `projects` | select | explicit-columns | 8 | `id, name, client_name, project_code, location, updated_at, workspace_id, created_by` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:969` | table | `estimates` | select | explicit-columns | 5 | `id, project_id, name, sheet_code, updated_at` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:982` | table | `estimates` | select | explicit-columns | 5 | `id, project_id, name, sheet_code, updated_at` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:998` | table | `projects` | select | explicit-columns | 8 | `id, name, client_name, project_code, location, updated_at, workspace_id, created_by` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1028` | table | `estimate_nodes` | select | explicit-columns | 4 | `id, estimate_id, kind, sort_order` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1084` | table | `projects` | select | wildcard | n/a | `*` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1095` | table | `workspaces` | select | wildcard | n/a | `*` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1111` | table | `projects` | select | explicit-columns | 2 | `id, workspace_id` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1120` | table | `workspace_members` | select | explicit-columns | 3 | `workspace_id, user_id, role` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1127` | table | `estimates` | select | explicit-columns | 4 | `id, project_id, name, sheet_code` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1266` | table | `projects` | select | explicit-columns | 2 | `id, workspace_id` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1276` | table | `workspace_members` | select | explicit-columns | 1 | `role` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1342` | table | `estimates` | select | wildcard | n/a | `*` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1362` | table | `estimate_nodes` | select | explicit-columns | 4 | `id, estimate_id, kind, sort_order` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1367` | table | `estimate_row_items` | select | explicit-columns | 5 | `estimate_id, quantity, unit_cost, contingency_percentage, misc_cost` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1412` | table | `estimates` | select | explicit-columns | 3 | `id, name, sheet_code` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1593` | table | `estimates` | select | wildcard | n/a | `*` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1604` | table | `estimate_nodes` | select | wildcard | n/a | `*` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1605` | table | `estimate_row_items` | select | wildcard | n/a | `*` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1641` | table | `estimate_nodes` | select | explicit-columns | 2 | `*, estimates!inner(*)` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1652` | table | `estimate_nodes` | select | wildcard | n/a | `*` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1653` | table | `estimate_row_items` | select | wildcard | n/a | `*` |

## Interpretation

- This is the per-route static inventory required before query consolidation or index proposals.
- Payload size is represented as selected-column shape/count from source, not live bytes.
- Live Supabase EXPLAIN, provider metrics, RLS cost, row counts, and hosted route timing remain open gates.
- Do not create database migrations or RPC rewrites from this artifact alone.
