# Per-route query inventory — 2026-06-22

Status: **REPO-STATIC QUERY INVENTORY CAPTURED / LIVE PROVIDER PROOF OPEN**.

Repo-static inventory only. Counts table/RPC references and selected-column payload shape by route bucket; does not prove live row counts, payload bytes, RLS cost, EXPLAIN plans, or provider latency.

Scanned roots: `src/app`, `src/lib/repositories`, `src/lib/publication`, `src/lib/collaboration`, `src/lib/ai`.

## Bucket summary

| Bucket | Query refs | Tables | RPCs | Explicit selects | Wildcard selects | Mutations | Max selected columns | Files |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| ai-ask-package-builder | 79 | 21 | 9 | 62 | 0 | 7 | 20 | `src/lib/ai/audit.ts`<br>`src/lib/ai/auth.ts`<br>`src/lib/ai/package-builder/apply.ts`<br>`src/lib/ai/package-builder/memory.ts`<br>`src/lib/ai/package-builder/read-tools.ts`<br>`src/lib/ai/rate-limit.ts`<br>`src/lib/ai/read-context.ts` |
| collaboration-invite | 37 | 12 | 5 | 21 | 0 | 10 | 7 | `src/app/invite/[token]/accept/route.ts`<br>`src/app/invite/[token]/page.tsx`<br>`src/lib/collaboration/actions.ts`<br>`src/lib/collaboration/invite-entry.ts`<br>`src/lib/collaboration/pending-invite-actions.ts`<br>`src/lib/collaboration/realtime-identity-server.ts`<br>`src/lib/collaboration/workshop-pending-invite.ts` |
| component-library | 39 | 15 | 0 | 17 | 21 | 1 | 7 | `src/lib/repositories/component-library-repository.ts`<br>`src/lib/repositories/cost-library-repository.ts` |
| media-upload-api | 2 | 1 | 0 | 2 | 0 | 0 | 2 | `src/app/api/projects/images/route.ts` |
| other-server-data | 10 | 7 | 1 | 8 | 0 | 0 | 11 | `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts`<br>`src/lib/repositories/estimate-favorites-repository.ts`<br>`src/lib/repositories/project-activity-repository.ts`<br>`src/lib/repositories/project-estimate-sheets-repository.ts`<br>`src/lib/repositories/project-location-repository.ts` |
| project-charts | 5 | 5 | 0 | 5 | 0 | 0 | 9 | `src/lib/repositories/project-charts-repository.ts` |
| public-share-publication | 64 | 16 | 3 | 48 | 0 | 11 | 14 | `src/app/api/share/[token]/activity/route.ts`<br>`src/lib/publication/actions.ts`<br>`src/lib/publication/public-repository.ts` |
| workshop-projects-estimates | 90 | 20 | 5 | 58 | 11 | 4 | 14 | `src/app/workshop/projects/[projectId]/estimates/page.tsx`<br>`src/app/workshop/projects/[projectId]/page.tsx`<br>`src/lib/repositories/estimate-repository.ts`<br>`src/lib/repositories/workspace-repository.ts` |

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
| ai-ask-package-builder | `src/lib/ai/package-builder/memory.ts:80` | table | `ai_package_builder_memory_preferences` | select | explicit-columns | 1 | `id` |
| ai-ask-package-builder | `src/lib/ai/package-builder/memory.ts:270` | table | `ai_package_builder_memory_preferences` | select | explicit-columns | 8 | `signal, source_type, source_id, source_label, room_name, operation_type, weight, created_at` |
| ai-ask-package-builder | `src/lib/ai/package-builder/memory.ts:317` | table | `ai_package_builder_memory_preferences` | insert | mutation-payload | n/a |  |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:533` | table | `workspaces` | select | explicit-columns | 1 | `name` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:548` | table | `projects` | select | explicit-columns | 6 | `id, name, client_name, location, project_code, updated_at` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:571` | table | `projects` | select | explicit-columns | 6 | `id, name, client_name, location, project_code, updated_at` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:592` | table | `estimates` | select | explicit-columns | 4 | `id, project_id, name, sheet_code` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:607` | table | `estimate_nodes` | select | explicit-columns | 4 | `id, estimate_id, kind, sort_order` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:613` | table | `estimate_row_items` | select | explicit-columns | 5 | `estimate_id, quantity, unit_cost, contingency_percentage, misc_cost` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:670` | table | `estimate_nodes` | select | explicit-columns | 3 | `id, estimate_id, estimate_tab_id` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:691` | table | `estimates` | select | explicit-columns | 4 | `id, project_id, name, sheet_code` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:708` | table | `estimate_nodes` | select | explicit-columns | 7 | `id, estimate_id, estimate_tab_id, parent_id, kind, name, sort_order` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:721` | table | `estimate_row_items` | select | explicit-columns | 11 | `id, estimate_id, node_id, material, quantity, unit, unit_cost, contingency_percentage, misc_cost, row_revision, source_library_item_id` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:762` | table | `cost_library_items` | select | explicit-columns | 18 | `id, name, description, category, category_node_id, library_folder_id, supplier, supplier_id, brand, brand_id, unit, unit_cost, misc_cost, lifecycle_state, cu…` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:781` | table | `cost_library_item_price_options` | select | explicit-columns | 11 | `id, item_id, unit, unit_cost, misc_cost, currency, is_active, is_default, updated_at, confidence, supplier_id` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:796` | table | `component_category_nodes` | select | explicit-columns | 7 | `id, parent_id, label, node_type, sort_order, code, metadata` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:812` | table | `library_folders` | select | explicit-columns | 7 | `id, workspace_id, parent_id, name, sort_order, source_category_node_id, folder_kind` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:907` | table | `estimates` | select | explicit-columns | 5 | `id, project_id, name, sheet_code, updated_at` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:924` | table | `estimate_nodes` | select | explicit-columns | 6 | `id, estimate_id, parent_id, kind, name, sort_order` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:930` | table | `estimate_row_items` | select | explicit-columns | 13 | `id, estimate_id, node_id, material, description, supplier, quantity, unit, unit_cost, contingency_percentage, misc_cost, source_library_item_id, updated_at` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:1098` | table | `estimates` | select | explicit-columns | 5 | `id, project_id, name, sheet_code, updated_at` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:1114` | table | `estimate_nodes` | select | explicit-columns | 6 | `id, estimate_id, parent_id, kind, name, sort_order` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:1120` | table | `estimate_row_items` | select | explicit-columns | 13 | `id, estimate_id, node_id, material, description, supplier, quantity, unit, unit_cost, contingency_percentage, misc_cost, source_library_item_id, updated_at` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:1186` | table | `estimate_templates` | select | explicit-columns | 4 | `id, name, description, category` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:1200` | table | `estimate_template_nodes` | select | explicit-columns | 4 | `id, template_id, kind, name` |
| ai-ask-package-builder | `src/lib/ai/package-builder/read-tools.ts:1205` | table | `estimate_template_row_items` | select | explicit-columns | 12 | `id, template_id, template_node_id, material, description, supplier, quantity, unit, unit_cost, contingency_percentage, misc_cost, sort_order` |
| ai-ask-package-builder | `src/lib/ai/rate-limit.ts:52` | table | `security_rate_limit_events` | select | explicit-columns | 1 | `id` |
| ai-ask-package-builder | `src/lib/ai/rate-limit.ts:57` | table | `security_rate_limit_events` | select | explicit-columns | 1 | `id` |
| ai-ask-package-builder | `src/lib/ai/rate-limit.ts:68` | table | `security_rate_limit_events` | select | explicit-columns | 1 | `id` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:846` | table | `profiles` | select | explicit-columns | 2 | `id, display_name` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:908` | table | `projects` | select | explicit-columns | 2 | `id, name` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:930` | table | `estimate_nodes` | select | explicit-columns | 2 | `id, estimate_id` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:951` | table | `estimates` | select | explicit-columns | 3 | `id, name, sheet_code` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:970` | table | `estimate_tabs` | select | explicit-columns | 4 | `id, name, sort_order, is_default` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:981` | table | `estimate_sheet_events` | select | explicit-columns | 9 | `event_type, event_source, created_at, actor_user_id, estimate_tab_id, row_context, changed_fields, total_delta, payload` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1022` | table | `projects` | select | explicit-columns | 2 | `id, name` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1038` | table | `estimates` | select | explicit-columns | 5 | `id, name, sheet_code, currency_code, updated_at` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1064` | table | `estimate_row_items` | select | explicit-columns | 9 | `id, estimate_id, node_id, supplier, source_snapshot, quantity, unit_cost, contingency_percentage, misc_cost` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1069` | table | `estimate_nodes` | select | explicit-columns | 6 | `id, estimate_id, parent_id, kind, name, sort_order` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1075` | table | `component_category_nodes` | select | explicit-columns | 5 | `id, parent_id, node_type, label, sort_order` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1079` | table | `component_suppliers` | select | explicit-columns | 4 | `id, name, normalized_name, sort_order` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1332` | table | `projects` | select | explicit-columns | 2 | `id, name` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1346` | table | `estimates` | select | explicit-columns | 4 | `id, project_id, name, sheet_code` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1361` | table | `estimate_nodes` | select | explicit-columns | 4 | `id, estimate_id, kind, name` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1366` | table | `estimate_row_items` | select | explicit-columns | 13 | `id, estimate_id, node_id, material, description, supplier, quantity, unit, unit_cost, contingency_percentage, misc_cost, source_library_item_id, updated_at` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1425` | table | `estimate_templates` | select | explicit-columns | 4 | `id, name, description, category` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1446` | table | `estimate_template_nodes` | select | explicit-columns | 4 | `id, template_id, kind, name` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1451` | table | `estimate_template_row_items` | select | explicit-columns | 12 | `id, template_id, template_node_id, material, description, supplier, quantity, unit, unit_cost, contingency_percentage, misc_cost, sort_order` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1524` | table | `cost_library_items` | select | explicit-columns | 14 | `id, name, description, category, supplier, supplier_id, brand, unit, unit_cost, misc_cost, lifecycle_state, current_version_number, active_price_option_id, c…` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1540` | table | `cost_library_item_price_options` | select | explicit-columns | 11 | `id, item_id, unit, unit_cost, misc_cost, currency, is_active, is_default, updated_at, confidence, supplier_id` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1702` | table | `projects` | select | explicit-columns | 1 | `id` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1717` | table | `projects` | select | explicit-columns | 2 | `id, name` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1841` | table | `projects` | select | explicit-columns | 2 | `id, name` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1861` | table | `estimates` | select | explicit-columns | 3 | `id, name, sheet_code` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1881` | table | `estimate_nodes` | select | explicit-columns | 2 | `id, estimate_id` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1898` | table | `estimates` | select | explicit-columns | 3 | `id, name, sheet_code` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1916` | table | `estimate_nodes` | select | explicit-columns | 7 | `id, estimate_id, estimate_tab_id, parent_id, kind, name, sort_order` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1922` | table | `estimate_row_items` | select | explicit-columns | 10 | `id, estimate_id, node_id, material, quantity, unit, unit_cost, contingency_percentage, misc_cost, source_library_item_id` |
| ai-ask-package-builder | `src/lib/ai/read-context.ts:1928` | table | `estimate_tabs` | select | explicit-columns | 4 | `id, name, sort_order, is_default` |
| collaboration-invite | `src/app/invite/[token]/accept/route.ts:169` | rpc | `accept_collaboration_invitation` | rpc | rpc | n/a |  |
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
| collaboration-invite | `src/lib/collaboration/actions.ts:488` | table | `profiles` | select | explicit-columns | 1 | `id` |
| collaboration-invite | `src/lib/collaboration/actions.ts:507` | table | `project_members` | update | mutation-payload | n/a |  |
| collaboration-invite | `src/lib/collaboration/actions.ts:520` | table | `collaboration_invitations` | update | mutation-payload | n/a |  |
| collaboration-invite | `src/lib/collaboration/actions.ts:629` | table | `profiles` | select | explicit-columns | 1 | `id` |
| collaboration-invite | `src/lib/collaboration/actions.ts:648` | table | `estimate_sheet_members` | update | mutation-payload | n/a |  |
| collaboration-invite | `src/lib/collaboration/actions.ts:661` | table | `collaboration_invitations` | update | mutation-payload | n/a |  |
| collaboration-invite | `src/lib/collaboration/actions.ts:755` | table | `collaboration_invitations` | select | explicit-columns | 2 | `project_id, expires_at` |
| collaboration-invite | `src/lib/collaboration/actions.ts:796` | table | `collaboration_invitations` | select | explicit-columns | 7 | `project_id, email, role, scope, expires_at, lifecycle_state, revoked_at` |
| collaboration-invite | `src/lib/collaboration/actions.ts:861` | table | `project_members` | select | explicit-columns | 1 | `role` |
| collaboration-invite | `src/lib/collaboration/actions.ts:873` | table | `project_members` | select | explicit-columns | 2 | `email, display_name` |
| collaboration-invite | `src/lib/collaboration/actions.ts:907` | table | `profiles` | select | explicit-columns | 2 | `email, display_name` |
| collaboration-invite | `src/lib/collaboration/actions.ts:947` | table | `project_members` | select | explicit-columns | 1 | `role` |
| collaboration-invite | `src/lib/collaboration/actions.ts:961` | table | `project_members` | delete | mutation-payload | n/a |  |
| collaboration-invite | `src/lib/collaboration/actions.ts:968` | table | `project_favorites` | delete | mutation-payload | n/a |  |
| collaboration-invite | `src/lib/collaboration/actions.ts:1000` | table | `estimate_sheet_members` | upsert | mutation-payload | n/a |  |
| collaboration-invite | `src/lib/collaboration/actions.ts:1025` | table | `estimate_sheet_access_settings` | upsert | mutation-payload | n/a |  |
| collaboration-invite | `src/lib/collaboration/invite-entry.ts:145` | table | `security_rate_limit_events` | select | explicit-columns | 1 | `id` |
| collaboration-invite | `src/lib/collaboration/invite-entry.ts:150` | table | `security_rate_limit_events` | select | explicit-columns | 1 | `id` |
| collaboration-invite | `src/lib/collaboration/invite-entry.ts:170` | table | `security_rate_limit_events` | select | explicit-columns | 1 | `id` |
| collaboration-invite | `src/lib/collaboration/pending-invite-actions.ts:44` | rpc | `accept_collaboration_invitation_by_id` | rpc | rpc | n/a |  |
| collaboration-invite | `src/lib/collaboration/realtime-identity-server.ts:98` | table | `302e020100300506032b657004220420` | update | mutation-payload | n/a |  |
| collaboration-invite | `src/lib/collaboration/workshop-pending-invite.ts:31` | rpc | `accept_collaboration_invitation` | rpc | rpc | n/a |  |
| component-library | `src/lib/repositories/component-library-repository.ts:335` | table | `library_folders` | select | explicit-columns | 7 | `id, workspace_id, parent_id, name, sort_order, source_category_node_id, folder_kind` |
| component-library | `src/lib/repositories/component-library-repository.ts:390` | table | `library_folders` | insert | mutation-payload | n/a |  |
| component-library | `src/lib/repositories/component-library-repository.ts:547` | table | `component_category_nodes` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/component-library-repository.ts:549` | table | `component_suppliers` | select | explicit-columns | 4 | `id, name, normalized_name, sort_order` |
| component-library | `src/lib/repositories/component-library-repository.ts:555` | table | `component_brands` | select | explicit-columns | 4 | `id, name, normalized_name, sort_order` |
| component-library | `src/lib/repositories/component-library-repository.ts:561` | table | `cost_library_items` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/component-library-repository.ts:605` | table | `cost_library_item_price_options` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/component-library-repository.ts:613` | table | `cost_library_item_variant_cost_entries` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/component-library-repository.ts:633` | table | `cost_library_item_versions` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/component-library-repository.ts:639` | table | `cost_library_item_price_history` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/component-library-repository.ts:645` | table | `cost_library_item_state_history` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/component-library-repository.ts:651` | table | `cost_library_item_variant_attachments` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/component-library-repository.ts:756` | table | `estimate_templates` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/component-library-repository.ts:771` | table | `estimate_template_nodes` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/component-library-repository.ts:776` | table | `estimate_template_row_items` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/component-library-repository.ts:943` | table | `cost_library_items` | select | explicit-columns | 1 | `id` |
| component-library | `src/lib/repositories/component-library-repository.ts:948` | table | `component_category_nodes` | select | explicit-columns | 1 | `id` |
| component-library | `src/lib/repositories/component-library-repository.ts:952` | table | `component_suppliers` | select | explicit-columns | 1 | `id` |
| component-library | `src/lib/repositories/component-library-repository.ts:956` | table | `component_brands` | select | explicit-columns | 1 | `id` |
| component-library | `src/lib/repositories/component-library-repository.ts:960` | table | `cost_library_items` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/component-library-repository.ts:967` | table | `estimate_templates` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/component-library-repository.ts:973` | table | `estimate_templates` | select | explicit-columns | 1 | `category` |
| component-library | `src/lib/repositories/component-library-repository.ts:977` | table | `cost_library_items` | select | explicit-columns | 1 | `id` |
| component-library | `src/lib/repositories/component-library-repository.ts:984` | table | `cost_library_items` | select | explicit-columns | 1 | `id` |
| component-library | `src/lib/repositories/component-library-repository.ts:991` | table | `cost_library_items` | select | explicit-columns | 1 | `updated_at` |
| component-library | `src/lib/repositories/component-library-repository.ts:997` | table | `cost_library_items` | select | explicit-columns | 1 | `id` |
| component-library | `src/lib/repositories/component-library-repository.ts:1027` | table | `estimate_template_nodes` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/component-library-repository.ts:1032` | table | `estimate_template_row_items` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/component-library-repository.ts:1075` | table | `estimate_template_row_items` | select | explicit-columns | 1 | `source_library_item_id` |
| component-library | `src/lib/repositories/component-library-repository.ts:1079` | table | `estimate_row_items` | select | explicit-columns | 1 | `source_library_item_id` |
| component-library | `src/lib/repositories/component-library-repository.ts:1124` | table | `cost_library_items` | select | explicit-columns | 1 | `id` |
| component-library | `src/lib/repositories/component-library-repository.ts:1129` | table | `cost_library_items` | select | explicit-columns | 1 | `id` |
| component-library | `src/lib/repositories/component-library-repository.ts:1136` | table | `estimate_templates` | select | explicit-columns | 1 | `id` |
| component-library | `src/lib/repositories/component-library-repository.ts:1171` | table | `estimate_templates` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/component-library-repository.ts:1185` | table | `estimate_template_nodes` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/component-library-repository.ts:1190` | table | `estimate_template_row_items` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/cost-library-repository.ts:60` | table | `cost_library_items` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/cost-library-repository.ts:71` | table | `cost_library_items` | select | wildcard | n/a | `*` |
| component-library | `src/lib/repositories/cost-library-repository.ts:78` | table | `cost_library_items` | select | wildcard | n/a | `*` |
| media-upload-api | `src/app/api/projects/images/route.ts:186` | table | `projects` | select | explicit-columns | 2 | `id, workspace_id` |
| media-upload-api | `src/app/api/projects/images/route.ts:232` | table | `projects` | select | explicit-columns | 1 | `id` |
| other-server-data | `src/app/api/projects/[projectId]/estimates/[estimateId]/export/proposal.xlsx/route.ts:82` | table | `workspace_members` | select | explicit-columns | 1 | `role` |
| other-server-data | `src/lib/repositories/estimate-favorites-repository.ts:14` | table | `estimate_favorites` | select | explicit-columns | 2 | `estimate_id, created_at` |
| other-server-data | `src/lib/repositories/project-activity-repository.ts:184` | table | `profiles` | select | explicit-columns | 3 | `id, display_name, email` |
| other-server-data | `src/lib/repositories/project-activity-repository.ts:272` | table | `estimate_sheet_events` | select | unknown | n/a |  |
| other-server-data | `src/lib/repositories/project-estimate-sheets-repository.ts:42` | table | `estimates` | select | explicit-columns | 4 | `id, name, sheet_code, updated_at` |
| other-server-data | `src/lib/repositories/project-estimate-sheets-repository.ts:61` | table | `estimates` | select | explicit-columns | 1 | `id` |
| other-server-data | `src/lib/repositories/project-estimate-sheets-repository.ts:79` | table | `estimates` | select | explicit-columns | 6 | `id, project_id, name, sheet_code, project_budget, updated_at` |
| other-server-data | `src/lib/repositories/project-estimate-sheets-repository.ts:94` | table | `estimate_nodes` | select | explicit-columns | 4 | `id, estimate_id, kind, parent_id` |
| other-server-data | `src/lib/repositories/project-estimate-sheets-repository.ts:98` | rpc | `project_estimate_list_summaries_for_estimates` | rpc | rpc | n/a |  |
| other-server-data | `src/lib/repositories/project-location-repository.ts:81` | table | `project_locations` | select | explicit-columns | 11 | `id, project_id, latitude, longitude, accuracy_meters, source, display_label, address_text, geocoder_name, provider_place_id, updated_at` |
| project-charts | `src/lib/repositories/project-charts-repository.ts:50` | table | `estimates` | select | explicit-columns | 5 | `id, name, sheet_code, currency_code, updated_at` |
| project-charts | `src/lib/repositories/project-charts-repository.ts:175` | table | `estimate_row_items` | select | explicit-columns | 9 | `id, estimate_id, node_id, supplier, source_snapshot, quantity, unit_cost, contingency_percentage, misc_cost` |
| project-charts | `src/lib/repositories/project-charts-repository.ts:217` | table | `estimate_nodes` | select | explicit-columns | 6 | `id, estimate_id, parent_id, kind, name, sort_order` |
| project-charts | `src/lib/repositories/project-charts-repository.ts:250` | table | `component_category_nodes` | select | explicit-columns | 5 | `id, parent_id, node_type, label, sort_order` |
| project-charts | `src/lib/repositories/project-charts-repository.ts:277` | table | `component_suppliers` | select | explicit-columns | 4 | `id, name, normalized_name, sort_order` |
| public-share-publication | `src/app/api/share/[token]/activity/route.ts:112` | table | `project_publications` | select | explicit-columns | 7 | `id, status, revoked_at, expires_at, password_hash, activity_target_labels_json, snapshot_version` |
| public-share-publication | `src/app/api/share/[token]/activity/route.ts:157` | table | `shared_link_comments` | select | explicit-columns | 12 | `id, created_at, is_internal, author_email, author_name, recipient_id, estimate_id, row_id, target_kind, target_label, target_secondary_label, snapshot_versio…` |
| public-share-publication | `src/app/api/share/[token]/activity/route.ts:163` | table | `shared_link_responses` | select | explicit-columns | 10 | `id, created_at, decision, note, recipient_id, estimate_id, row_id, target_kind, target_label, target_secondary_label` |
| public-share-publication | `src/app/api/share/[token]/activity/route.ts:170` | table | `shared_link_events` | select | explicit-columns | 5 | `id, created_at, event_type, metadata_json, recipient_id` |
| public-share-publication | `src/app/api/share/[token]/activity/route.ts:200` | table | `shared_link_recipients` | select | explicit-columns | 2 | `id, display_name` |
| public-share-publication | `src/lib/publication/actions.ts:179` | table | `projects` | select | explicit-columns | 8 | `id, workspace_id, name, project_code, client_name, location, currency_code, metadata` |
| public-share-publication | `src/lib/publication/actions.ts:190` | table | `workspace_members` | select | explicit-columns | 1 | `role` |
| public-share-publication | `src/lib/publication/actions.ts:196` | table | `project_members` | select | explicit-columns | 1 | `role` |
| public-share-publication | `src/lib/publication/actions.ts:298` | table | `project_publications` | select | explicit-columns | 3 | `id, project_id, published_by` |
| public-share-publication | `src/lib/publication/actions.ts:307` | table | `projects` | select | explicit-columns | 3 | `id, workspace_id, created_by` |
| public-share-publication | `src/lib/publication/actions.ts:315` | table | `workspace_members` | select | explicit-columns | 1 | `user_id` |
| public-share-publication | `src/lib/publication/actions.ts:325` | table | `profiles` | select | explicit-columns | 3 | `id, email, display_name` |
| public-share-publication | `src/lib/publication/actions.ts:342` | table | `profiles` | select | explicit-columns | 2 | `email, display_name` |
| public-share-publication | `src/lib/publication/actions.ts:358` | table | `profiles` | select | explicit-columns | 2 | `email, display_name` |
| public-share-publication | `src/lib/publication/actions.ts:377` | table | `project_publications` | select | explicit-columns | 7 | `id, encrypted_token, expires_at, location_visibility, password_hash, selected_estimate_ids, snapshot_version` |
| public-share-publication | `src/lib/publication/actions.ts:395` | table | `estimates` | select | explicit-columns | 4 | `id, name, sheet_code, updated_at` |
| public-share-publication | `src/lib/publication/actions.ts:415` | table | `estimate_row_items` | select | explicit-columns | 13 | `id, estimate_id, node_id, description, designation, discipline, material, quantity, unit, unit_cost, misc_cost, contingency_percentage, imageUrl:source_snaps…` |
| public-share-publication | `src/lib/publication/actions.ts:420` | table | `estimate_nodes` | select | explicit-columns | 7 | `id, estimate_id, estimate_tab_id, name, kind, parent_id, sort_order` |
| public-share-publication | `src/lib/publication/actions.ts:425` | table | `estimate_tabs` | select | explicit-columns | 5 | `id, estimate_id, name, sort_order, is_default` |
| public-share-publication | `src/lib/publication/actions.ts:651` | table | `project_publications` | update | mutation-payload | n/a |  |
| public-share-publication | `src/lib/publication/actions.ts:734` | table | `project_publications` | update | mutation-payload | n/a |  |
| public-share-publication | `src/lib/publication/actions.ts:922` | table | `security_rate_limit_events` | select | explicit-columns | 1 | `id` |
| public-share-publication | `src/lib/publication/actions.ts:927` | table | `security_rate_limit_events` | select | explicit-columns | 1 | `id` |
| public-share-publication | `src/lib/publication/actions.ts:936` | table | `security_rate_limit_events` | select | explicit-columns | 1 | `id` |
| public-share-publication | `src/lib/publication/actions.ts:1018` | table | `project_publications` | select | explicit-columns | 4 | `id, project_id, workspace_id, encrypted_token` |
| public-share-publication | `src/lib/publication/actions.ts:1044` | table | `shared_link_recipients` | select | explicit-columns | 14 | `id, publication_id, email, display_name, email_unsubscribed_at, invited_by, invited_at, delivery_status, last_opened_at, resend_email_id, resend_last_event_a…` |
| public-share-publication | `src/lib/publication/actions.ts:1112` | table | `projects` | select | explicit-columns | 1 | `name` |
| public-share-publication | `src/lib/publication/actions.ts:1144` | table | `shared_link_recipients` | select | explicit-columns | 1 | `id` |
| public-share-publication | `src/lib/publication/actions.ts:1181` | table | `shared_link_recipients` | update | mutation-payload | n/a |  |
| public-share-publication | `src/lib/publication/actions.ts:1249` | table | `shared_link_recipients` | select | explicit-columns | 4 | `id, email, display_name, email_unsubscribed_at` |
| public-share-publication | `src/lib/publication/actions.ts:1331` | table | `shared_link_recipients` | delete | mutation-payload | n/a |  |
| public-share-publication | `src/lib/publication/actions.ts:1405` | table | `publication_digest_log` | insert | mutation-payload | n/a |  |
| public-share-publication | `src/lib/publication/actions.ts:1476` | table | `project_publications` | select | explicit-columns | 6 | `id, project_id, status, revoked_at, expires_at, activity_target_labels_json` |
| public-share-publication | `src/lib/publication/actions.ts:1493` | table | `shared_link_comments` | select | explicit-columns | 13 | `id, created_at, body, is_internal, author_email, author_name, recipient_id, estimate_id, row_id, target_kind, target_label, target_secondary_label, snapshot_…` |
| public-share-publication | `src/lib/publication/actions.ts:1497` | table | `shared_link_responses` | select | explicit-columns | 10 | `id, created_at, decision, note, recipient_id, estimate_id, row_id, target_kind, target_label, target_secondary_label` |
| public-share-publication | `src/lib/publication/actions.ts:1501` | table | `shared_link_events` | select | explicit-columns | 5 | `id, created_at, event_type, metadata_json, recipient_id` |
| public-share-publication | `src/lib/publication/actions.ts:1505` | table | `project_publication_events` | select | explicit-columns | 4 | `id, created_at, event_type, metadata_json` |
| public-share-publication | `src/lib/publication/actions.ts:1532` | table | `shared_link_recipients` | select | explicit-columns | 2 | `id, display_name` |
| public-share-publication | `src/lib/publication/public-repository.ts:173` | table | `project_publications` | select | unknown | n/a |  |
| public-share-publication | `src/lib/publication/public-repository.ts:185` | table | `project_publications` | select | unknown | n/a |  |
| public-share-publication | `src/lib/publication/public-repository.ts:213` | table | `project_publications` | select | explicit-columns | 4 | `id, activity_target_labels_json, snapshot_json, snapshot_version` |
| public-share-publication | `src/lib/publication/public-repository.ts:225` | table | `project_publications` | select | explicit-columns | 1 | `snapshot_json` |
| public-share-publication | `src/lib/publication/public-repository.ts:383` | table | `security_rate_limit_events` | select | explicit-columns | 1 | `id` |
| public-share-publication | `src/lib/publication/public-repository.ts:422` | table | `security_rate_limit_events` | select | explicit-columns | 1 | `id` |
| public-share-publication | `src/lib/publication/public-repository.ts:443` | table | `security_rate_limit_events` | insert | mutation-payload | n/a |  |
| public-share-publication | `src/lib/publication/public-repository.ts:455` | table | `security_rate_limit_events` | delete | mutation-payload | n/a |  |
| public-share-publication | `src/lib/publication/public-repository.ts:780` | table | `project_publications` | select | explicit-columns | 6 | `id, status, password_hash, expires_at, revoked_at, snapshot_version` |
| public-share-publication | `src/lib/publication/public-repository.ts:823` | table | `project_publication_events` | insert | mutation-payload | n/a |  |
| public-share-publication | `src/lib/publication/public-repository.ts:859` | table | `project_publication_events` | insert | mutation-payload | n/a |  |
| public-share-publication | `src/lib/publication/public-repository.ts:875` | rpc | `increment_project_publication_open` | rpc | rpc | n/a |  |
| public-share-publication | `src/lib/publication/public-repository.ts:884` | table | `shared_link_recipients` | insert | mutation-payload | n/a |  |
| public-share-publication | `src/lib/publication/public-repository.ts:894` | table | `shared_link_events` | insert | mutation-payload | n/a |  |
| public-share-publication | `src/lib/publication/public-repository.ts:922` | table | `project_publications` | select | explicit-columns | 6 | `id, status, expires_at, revoked_at, snapshot_version, password_hash` |
| public-share-publication | `src/lib/publication/public-repository.ts:933` | table | `shared_link_recipients` | select | explicit-columns | 3 | `id, email, display_name` |
| public-share-publication | `src/lib/publication/public-repository.ts:962` | table | `project_publications` | select | explicit-columns | 6 | `id, status, password_hash, expires_at, revoked_at, snapshot_version` |
| public-share-publication | `src/lib/publication/public-repository.ts:973` | table | `shared_link_recipients` | select | explicit-columns | 3 | `id, email, display_name` |
| public-share-publication | `src/lib/publication/public-repository.ts:1004` | table | `shared_link_recipients` | select | explicit-columns | 3 | `id, email, display_name` |
| public-share-publication | `src/lib/publication/public-repository.ts:1029` | table | `shared_link_comments` | select | explicit-columns | 12 | `id, created_at, body, author_name, author_email, recipient_id, estimate_id, row_id, target_kind, target_label, target_secondary_label, snapshot_version_at_co…` |
| public-share-publication | `src/lib/publication/public-repository.ts:1075` | table | `shared_link_responses` | select | explicit-columns | 10 | `decision, note, created_at, estimate_id, row_id, target_kind, target_label, target_secondary_label, signer_name, signature_intent_hash` |
| public-share-publication | `src/lib/publication/public-repository.ts:1141` | table | `shared_link_recipients` | select | explicit-columns | 1 | `recipient_token_hash` |
| public-share-publication | `src/lib/publication/public-repository.ts:1180` | rpc | `insert_client_comment` | rpc | rpc | n/a |  |
| public-share-publication | `src/lib/publication/public-repository.ts:1190` | table | `shared_link_comments` | select | explicit-columns | 11 | `id, created_at, body, author_name, recipient_id, estimate_id, row_id, target_kind, target_label, target_secondary_label, snapshot_version_at_comment` |
| public-share-publication | `src/lib/publication/public-repository.ts:1245` | table | `shared_link_recipients` | select | explicit-columns | 1 | `recipient_token_hash` |
| public-share-publication | `src/lib/publication/public-repository.ts:1288` | rpc | `submit_client_response` | rpc | rpc | n/a |  |
| workshop-projects-estimates | `src/app/workshop/projects/[projectId]/estimates/page.tsx:74` | rpc | `can_edit_project` | rpc | rpc | n/a |  |
| workshop-projects-estimates | `src/app/workshop/projects/[projectId]/estimates/page.tsx:89` | rpc | `can_edit_project` | rpc | rpc | n/a |  |
| workshop-projects-estimates | `src/app/workshop/projects/[projectId]/estimates/page.tsx:91` | table | `estimate_sheet_members` | select | explicit-columns | 1 | `estimate_id` |
| workshop-projects-estimates | `src/app/workshop/projects/[projectId]/estimates/page.tsx:97` | table | `estimate_sheet_access_settings` | select | explicit-columns | 2 | `estimate_id, inherit_project_access` |
| workshop-projects-estimates | `src/app/workshop/projects/[projectId]/page.tsx:25` | rpc | `can_edit_project` | rpc | rpc | n/a |  |
| workshop-projects-estimates | `src/lib/repositories/estimate-repository.ts:168` | table | `estimate_nodes` | select | explicit-columns | 2 | `${ESTIMATE_NODE_SELECT}, estimate_tab_id` |
| workshop-projects-estimates | `src/lib/repositories/estimate-repository.ts:173` | table | `estimate_row_items` | select | explicit-columns | 2 | `${ESTIMATE_NODE_SELECT}, estimate_tab_id` |
| workshop-projects-estimates | `src/lib/repositories/estimate-repository.ts:194` | table | `estimate_nodes` | select | explicit-columns | 2 | `${ESTIMATE_NODE_SELECT}, estimate_tab_id` |
| workshop-projects-estimates | `src/lib/repositories/estimate-repository.ts:211` | table | `estimate_row_items` | select | unknown | n/a |  |
| workshop-projects-estimates | `src/lib/repositories/estimate-repository.ts:230` | table | `estimate_row_items` | insert | mutation-payload | n/a |  |
| workshop-projects-estimates | `src/lib/repositories/estimate-repository.ts:239` | table | `estimate_row_items` | insert | mutation-payload | n/a |  |
| workshop-projects-estimates | `src/lib/repositories/estimate-repository.ts:250` | table | `estimate_row_items` | upsert | mutation-payload | n/a |  |
| workshop-projects-estimates | `src/lib/repositories/estimate-repository.ts:257` | table | `estimate_row_items` | delete | mutation-payload | n/a |  |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:341` | table | `project_members` | select | explicit-columns | 4 | `project_id, workspace_id, user_id, role` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:360` | table | `estimate_sheet_members` | select | explicit-columns | 4 | `estimate_id, project_id, user_id, role` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:379` | table | `estimate_sheet_access_settings` | select | explicit-columns | 2 | `estimate_id, inherit_project_access` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:396` | table | `collaboration_invitations` | select | explicit-columns | 7 | `id, project_id, email, role, scope, estimate_id, expires_at` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:427` | rpc | `list_pending_collaboration_invitations` | rpc | rpc | n/a |  |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:431` | table | `collaboration_invitations` | select | explicit-columns | 2 | `id, project_id` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:521` | table | `project_publications` | select | explicit-columns | 14 | `id, project_id, encrypted_token, password_hash, status, snapshot_json, snapshot_version, selected_estimate_ids, published_at, expires_at, revoked_at, open_co…` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:545` | table | `project_publications` | select | explicit-columns | 12 | `id, project_id, encrypted_token, password_hash, status, snapshot_version, published_at, expires_at, revoked_at, open_count, latest_opened_at, location_visibi…` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:667` | table | `estimates` | select | explicit-columns | 1 | `updated_at` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:689` | table | `shared_link_recipients` | select | explicit-columns | 3 | `email, display_name, last_opened_at` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:717` | table | `shared_link_comments` | select | explicit-columns | 1 | `created_at` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:738` | table | `shared_link_responses` | select | explicit-columns | 1 | `created_at` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:781` | table | `profiles` | select | explicit-columns | 4 | `id, display_name, email, avatar_url` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:786` | table | `profiles` | select | explicit-columns | 3 | `id, display_name, email` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:828` | table | `workspaces` | select | wildcard | n/a | `*` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:840` | table | `workspaces` | select | wildcard | n/a | `*` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:848` | table | `profiles` | select | wildcard | n/a | `*` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:864` | table | `workspaces` | select | wildcard | n/a | `*` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:872` | table | `profiles` | select | wildcard | n/a | `*` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:898` | table | `projects` | select | explicit-columns | 1 | `project_id` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:906` | table | `project_favorites` | select | explicit-columns | 1 | `project_id` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:911` | table | `estimate_favorites` | select | explicit-columns | 3 | `estimate_id, project_id, created_at` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:917` | table | `project_members` | select | explicit-columns | 4 | `project_id, workspace_id, role, user_id` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:921` | table | `estimate_sheet_members` | select | explicit-columns | 4 | `estimate_id, project_id, role, user_id` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:925` | table | `workspace_members` | select | explicit-columns | 1 | `role` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:931` | table | `project_groups` | select | explicit-columns | 4 | `id, name, accent_id, position` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:938` | table | `project_group_memberships` | select | explicit-columns | 2 | `project_id, group_id` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:982` | table | `projects` | select | explicit-columns | 5 | `id, project_id, name, sheet_code, updated_at` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:990` | table | `estimates` | select | explicit-columns | 5 | `id, project_id, name, sheet_code, updated_at` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1294` | rpc | `workspace_homebase_summary` | rpc | rpc | n/a |  |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1300` | table | `project_members` | select | explicit-columns | 4 | `project_id, workspace_id, role, user_id` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1304` | table | `estimate_sheet_members` | select | explicit-columns | 4 | `estimate_id, project_id, role, user_id` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1308` | table | `workspace_members` | select | explicit-columns | 1 | `role` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1442` | table | `project_favorites` | select | explicit-columns | 2 | `project_id, created_at` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1449` | table | `estimate_favorites` | select | explicit-columns | 2 | `estimate_id, created_at` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1456` | table | `projects` | select | explicit-columns | 8 | `id, name, client_name, project_code, location, updated_at, workspace_id, created_by` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1462` | table | `project_members` | select | explicit-columns | 4 | `project_id, workspace_id, role, user_id` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1466` | table | `estimate_sheet_members` | select | explicit-columns | 4 | `estimate_id, project_id, role, user_id` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1470` | table | `workspace_members` | select | explicit-columns | 1 | `role` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1513` | table | `estimates` | select | explicit-columns | 5 | `id, project_id, name, sheet_code, updated_at` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1523` | table | `estimates` | select | explicit-columns | 5 | `id, project_id, name, sheet_code, updated_at` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1550` | table | `projects` | select | explicit-columns | 8 | `id, name, client_name, project_code, location, updated_at, workspace_id, created_by` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1583` | table | `estimate_nodes` | select | explicit-columns | 5 | `id, estimate_id, kind, parent_id, sort_order` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1654` | table | `project_favorites` | select | explicit-columns | 2 | `project_id, created_at` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1669` | table | `projects` | select | explicit-columns | 3 | `id, name, project_code` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1673` | table | `estimate_favorites` | select | explicit-columns | 3 | `estimate_id, project_id, created_at` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1690` | table | `estimates` | select | explicit-columns | 4 | `id, project_id, name, sheet_code` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1741` | table | `projects` | select | wildcard | n/a | `*` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1752` | table | `workspaces` | select | wildcard | n/a | `*` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1787` | table | `workspace_members` | select | explicit-columns | 3 | `workspace_id, user_id, role` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1791` | table | `estimates` | select | explicit-columns | 4 | `id, project_id, name, sheet_code` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:1942` | table | `workspace_members` | select | explicit-columns | 1 | `role` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:2023` | table | `estimates` | select | explicit-columns | 5 | `id, estimate_id, kind, parent_id, sort_order` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:2047` | rpc | `project_estimate_list_summaries` | rpc | rpc | n/a |  |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:2051` | table | `estimate_nodes` | select | explicit-columns | 5 | `id, estimate_id, kind, parent_id, sort_order` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:2376` | table | `estimates` | select | wildcard | n/a | `*` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:2387` | table | `estimate_nodes` | select | unknown | n/a |  |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:2388` | table | `estimate_row_items` | select | unknown | n/a |  |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:2443` | table | `estimates` | select | explicit-columns | 2 | `id, project_id` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:2472` | table | `estimate_tabs` | select | explicit-columns | 9 | `id, estimate_id, name, sort_order, is_default, archived_at, metadata, created_at, updated_at` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:2497` | rpc | `can_edit_estimate` | rpc | rpc | n/a |  |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:2505` | table | `estimate_tabs` | select | explicit-columns | 9 | `id, estimate_id, name, sort_order, is_default, archived_at, metadata, created_at, updated_at` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:2533` | table | `estimates` | select | wildcard | n/a | `*` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:2560` | table | `estimate_tabs` | select | explicit-columns | 9 | `id, estimate_id, name, sort_order, is_default, archived_at, metadata, created_at, updated_at` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:2592` | table | `estimate_nodes` | select | unknown | n/a |  |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:2608` | table | `estimate_row_items` | select | unknown | n/a |  |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:2700` | table | `estimates` | select | wildcard | n/a | `*` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:2713` | table | `estimate_nodes` | select | unknown | n/a |  |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:2727` | table | `estimate_row_items` | select | unknown | n/a |  |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:2790` | table | `estimate_nodes` | select | explicit-columns | 4 | `id, estimate_id, estimate_tab_id, estimates!inner(*)` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:2822` | table | `estimates` | select | wildcard | n/a | `*` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:2860` | table | `estimate_nodes` | select | explicit-columns | 2 | `*, estimates!inner(*)` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:2871` | table | `estimate_nodes` | select | unknown | n/a |  |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:2872` | table | `estimate_row_items` | select | explicit-columns | 4 | `id, estimate_id, estimate_tab_id, estimates!inner(*)` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:2891` | table | `estimate_nodes` | select | explicit-columns | 4 | `id, estimate_id, estimate_tab_id, estimates!inner(*)` |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:2914` | table | `estimate_nodes` | select | unknown | n/a |  |
| workshop-projects-estimates | `src/lib/repositories/workspace-repository.ts:2915` | table | `estimate_row_items` | select | unknown | n/a |  |

## Interpretation

- This is the per-route static inventory required before query consolidation or index proposals.
- Payload size is represented as selected-column shape/count from source, not live bytes.
- Live Supabase EXPLAIN, provider metrics, RLS cost, row counts, and hosted route timing remain open gates.
- Do not create database migrations or RPC rewrites from this artifact alone.
