# Cloudflare Migration Inventory

Generated: 2026-06-30T19:50:37.767Z

Local repository inventory only. It lists file paths, route paths, RPC names, script names, and counts; it does not read env files, print secret values, mutate providers, prove Cloudflare hosted deployment, prove D1/R2/Images/Email/Workers Paid readiness, change DNS, or make current providers removable.

## Counts

| Item | Count |
| --- | ---: |
| App routes | 70 |
| Page routes | 39 |
| Route handlers | 29 |
| Metadata routes | 2 |
| Provider-coupled source files | 86 |
| Distinct app-code RPC names | 75 |
| Package scripts | 103 |
| Script files | 122 |
| Cloudflare package scripts | 42 |
| Provider readiness package scripts | 7 |
| Applied SQL migration files | 182 |
| Pending-review SQL files | 13 |
| SQL function declaration/update matches | 348 |
| RLS/policy/storage/auth SQL matches | 684 |

## Top Provider-Coupled Files

The JSON artifact contains the full file list. This table shows the first 40 sorted matches.

| File | Route | Dependencies | RPC names |
| --- | --- | --- | --- |
| `src/app/api/auth/[...all]/route.ts` | /api/auth/[...all] | cloudflare-local-proof |  |
| `src/app/api/component-library/attachments/direct-upload/route.ts` | /api/component-library/attachments/direct-upload | cloudflare-local-proof, supabase-client, supabase-rpc | is_workspace_editor |
| `src/app/api/component-library/attachments/route.ts` | /api/component-library/attachments | supabase-client, supabase-rpc | is_workspace_editor |
| `src/app/api/component-library/images/route.ts` | /api/component-library/images | supabase-client, supabase-rpc | is_workspace_editor |
| `src/app/api/estimate-row-images/route.ts` | /api/estimate-row-images | supabase-client, supabase-rpc | can_edit_estimate, can_edit_project |
| `src/app/api/internal/upload-runtime/route.ts` | /api/internal/upload-runtime | cloudflare-local-proof |  |
| `src/app/api/projects/[projectId]/activity/route.ts` | /api/projects/[projectId]/activity | supabase-rpc | can_edit_project |
| `src/app/api/projects/images/route.ts` | /api/projects/images | supabase-client, supabase-rpc | can_access_estimate, can_access_project, can_edit_project |
| `src/app/invite/[token]/page.tsx` | /invite/[token] | cloudflare-local-proof, supabase-rpc | resolve_collaboration_invitation |
| `src/app/invite/[token]/sign-out/route.ts` | /invite/[token]/sign-out | cloudflare-local-proof |  |
| `src/app/privacy/page.tsx` | /privacy | cloudflare-local-proof |  |
| `src/app/trust/page.tsx` | /trust | cloudflare-local-proof |  |
| `src/app/workshop/projects/[projectId]/activity/page.tsx` | /workshop/projects/[projectId]/activity | supabase-rpc | can_edit_project |
| `src/app/workshop/projects/[projectId]/estimates/page.tsx` | /workshop/projects/[projectId]/estimates | supabase-rpc | can_edit_project |
| `src/app/workshop/projects/[projectId]/page.tsx` | /workshop/projects/[projectId] | supabase-rpc | can_edit_project |
| `src/components/landing/CloudflareWebAnalytics.tsx` |  | cloudflare-local-proof |  |
| `src/components/landing/LandingAnalyticsLoader.tsx` |  | cloudflare-local-proof |  |
| `src/components/realtime-auth-bridge.tsx` |  | cloudflare-local-proof |  |
| `src/components/workshop/ProjectDetailsModal.tsx` |  | cloudflare-local-proof |  |
| `src/hooks/use-estimate-cursor-broadcast.ts` |  | cloudflare-local-proof |  |
| `src/hooks/use-estimate-row-update-broadcast.ts` |  | cloudflare-local-proof |  |
| `src/hooks/use-project-presence.ts` |  | cloudflare-local-proof |  |
| `src/lib/ai/audit-d1-store.ts` |  | cloudflare-local-proof |  |
| `src/lib/ai/audit.ts` |  | cloudflare-local-proof |  |
| `src/lib/ai/package-builder/apply.ts` |  | supabase-rpc | create_ai_package_library_components_with_history, create_estimate_node_with_history, create_project_estimate_package_with_history, delete_estimate_row_item_with_history, insert_estimate_row_item_with_history, insert_estimate_template_into_estimate_with_history, rename_estimate_node_with_history, replace_estimate_row_item_with_history, update_estimate_row_item_with_history |
| `src/lib/ai/rate-limit.ts` |  | cloudflare-local-proof |  |
| `src/lib/auth/account-actions.ts` |  | cloudflare-local-proof |  |
| `src/lib/auth/account-audit-d1-store.ts` |  | cloudflare-local-proof |  |
| `src/lib/auth/account-audit.ts` |  | cloudflare-local-proof |  |
| `src/lib/auth/account-settings-d1-store.ts` |  | cloudflare-local-proof |  |
| `src/lib/auth/actions.ts` |  | cloudflare-local-proof |  |
| `src/lib/auth/auth-provider-selection.ts` |  | cloudflare-local-proof |  |
| `src/lib/auth/better-auth-cloudflare.ts` |  | cloudflare-local-proof |  |
| `src/lib/auth/closed-beta-d1-store.ts` |  | cloudflare-local-proof |  |
| `src/lib/auth/cloudflare-better-auth-runtime.ts` |  | cloudflare-local-proof |  |
| `src/lib/auth/dev-auth.ts` |  | supabase-client |  |
| `src/lib/auth/profile-d1-store.ts` |  | cloudflare-local-proof |  |
| `src/lib/auth/request-proxy.ts` |  | cloudflare-local-proof |  |
| `src/lib/auth/session.ts` |  | cloudflare-local-proof |  |
| `src/lib/cloudflare/better-auth-proof-router.ts` |  | cloudflare-local-proof |  |

## RPC Caller Catalog

The JSON artifact contains every caller file. This table shows up to 80 RPCs with the first four callers per RPC.

| RPC | Caller file count | Sample callers |
| --- | ---: | --- |
| `accept_collaboration_invitation_by_id_for_actor` | 1 | `src/lib/collaboration/invitation-acceptance.ts` |
| `accept_collaboration_invitation_for_actor` | 1 | `src/lib/collaboration/invitation-acceptance.ts` |
| `approve_upload_scan_override` | 1 | `src/lib/uploads/scan-override.ts` |
| `archive_estimate_tab_with_history` | 1 | `src/lib/estimates/actions.ts` |
| `authorize_recipient_publication_for_current_user` | 1 | `src/lib/publication/actions.ts` |
| `can_access_estimate` | 2 | `src/app/api/projects/images/route.ts`<br>`src/lib/estimate-sheet/user-preferences-actions.ts` |
| `can_access_project` | 1 | `src/app/api/projects/images/route.ts` |
| `can_edit_estimate` | 4 | `src/app/api/estimate-row-images/route.ts`<br>`src/lib/component-library/actions.ts`<br>`src/lib/estimates/actions.ts`<br>`src/lib/repositories/workspace-repository.ts` |
| `can_edit_project` | 8 | `src/app/api/estimate-row-images/route.ts`<br>`src/app/api/projects/[projectId]/activity/route.ts`<br>`src/app/api/projects/images/route.ts`<br>`src/app/workshop/projects/[projectId]/activity/page.tsx` |
| `create_ai_package_library_components_with_history` | 1 | `src/lib/ai/package-builder/apply.ts` |
| `create_cost_library_component` | 1 | `src/lib/component-library/actions.ts` |
| `create_estimate_node_with_history` | 2 | `src/lib/ai/package-builder/apply.ts`<br>`src/lib/estimates/actions.ts` |
| `create_estimate_tab_with_history` | 1 | `src/lib/estimates/actions.ts` |
| `create_project_estimate_package_with_history` | 1 | `src/lib/ai/package-builder/apply.ts` |
| `create_upload_session` | 1 | `src/lib/uploads/direct-upload-records.ts` |
| `delete_estimate_node_with_history` | 1 | `src/lib/estimates/actions.ts` |
| `delete_estimate_nodes_bulk_with_history` | 1 | `src/lib/estimates/actions.ts` |
| `delete_estimate_row_item_with_history` | 2 | `src/lib/ai/package-builder/apply.ts`<br>`src/lib/estimates/actions.ts` |
| `delete_estimate_row_items_bulk_with_history` | 1 | `src/lib/estimates/actions.ts` |
| `delete_estimate_tab_with_history` | 1 | `src/lib/estimates/actions.ts` |
| `delete_library_folder` | 1 | `src/lib/component-library/actions.ts` |
| `duplicate_estimate_tab_with_history` | 1 | `src/lib/estimates/actions.ts` |
| `estimate_node_route_context` | 1 | `src/lib/repositories/workspace-repository.ts` |
| `execute_bulk_archive_library_components` | 1 | `src/lib/component-library/actions.ts` |
| `execute_bulk_delete_estimate_sheets` | 1 | `src/lib/estimates/actions.ts` |
| `execute_bulk_delete_projects` | 1 | `src/lib/projects/actions.ts` |
| `finalize_upload_session` | 1 | `src/lib/uploads/direct-upload-records.ts` |
| `get_estimate_activity_retention_metrics` | 1 | `src/lib/estimates/actions.ts` |
| `increment_project_publication_open` | 1 | `src/lib/publication/public-repository.ts` |
| `insert_client_comment` | 1 | `src/lib/publication/public-repository.ts` |
| `insert_estimate_row_item_with_history` | 2 | `src/lib/ai/package-builder/apply.ts`<br>`src/lib/estimates/actions.ts` |
| `insert_estimate_subtree_into_estimate_with_history` | 1 | `src/lib/reusable-sources/actions.ts` |
| `insert_estimate_template_into_estimate_with_history` | 2 | `src/lib/ai/package-builder/apply.ts`<br>`src/lib/estimates/actions.ts` |
| `insert_estimate_template_node_into_estimate_with_history` | 1 | `src/lib/estimates/actions.ts` |
| `is_workspace_editor` | 5 | `src/app/api/component-library/attachments/direct-upload/route.ts`<br>`src/app/api/component-library/attachments/route.ts`<br>`src/app/api/component-library/images/route.ts`<br>`src/lib/component-library/actions.ts` |
| `is_workspace_member` | 1 | `src/lib/component-library/actions.ts` |
| `issue_collaboration_invitation_token` | 1 | `src/lib/collaboration/actions.ts` |
| `library_component_rows_seed` | 1 | `src/lib/repositories/component-library-repository.ts` |
| `library_overview_summary` | 1 | `src/lib/repositories/component-library-repository.ts` |
| `library_templates_seed` | 1 | `src/lib/repositories/component-library-repository.ts` |
| `list_pending_collaboration_invitations` | 1 | `src/lib/repositories/workspace-repository.ts` |
| `list_recipient_publications_for_current_user` | 1 | `src/lib/repositories/recipient-proposals-repository.ts` |
| `main_sidebar_favorite_projects` | 1 | `src/lib/repositories/workspace-repository.ts` |
| `move_estimate_row_component_with_history` | 1 | `src/lib/estimates/actions.ts` |
| `move_estimate_row_item_with_history` | 1 | `src/lib/estimates/actions.ts` |
| `preview_bulk_archive_library_components` | 1 | `src/lib/component-library/actions.ts` |
| `preview_bulk_delete_estimate_sheets` | 1 | `src/lib/estimates/actions.ts` |
| `preview_bulk_delete_projects` | 1 | `src/lib/projects/actions.ts` |
| `project_estimate_list_summaries` | 1 | `src/lib/repositories/workspace-repository.ts` |
| `project_estimate_list_summaries_for_estimates` | 1 | `src/lib/repositories/project-estimate-sheets-repository.ts` |
| `promote_estimate_row_to_library_component` | 1 | `src/lib/estimates/express-promotion-actions.ts` |
| `read_project_collaboration_audit_events` | 1 | `src/lib/repositories/project-activity-feed-repository.ts` |
| `record_collaboration_invitation_delivery` | 1 | `src/lib/collaboration/actions.ts` |
| `record_mass_deletion_storage_cleanup_result` | 1 | `src/lib/projects/actions.ts` |
| `record_upload_asset` | 1 | `src/lib/uploads/upload-records.ts` |
| `record_upload_scan_result` | 1 | `src/lib/uploads/scan-job.ts` |
| `rename_estimate_node_with_history` | 2 | `src/lib/ai/package-builder/apply.ts`<br>`src/lib/estimates/actions.ts` |
| `rename_estimate_tab_with_history` | 1 | `src/lib/estimates/actions.ts` |
| `reorder_estimate_nodes_with_history` | 1 | `src/lib/estimates/actions.ts` |
| `reorder_estimate_tabs_with_history` | 1 | `src/lib/estimates/actions.ts` |
| `reorder_library_folders` | 1 | `src/lib/component-library/actions.ts` |
| `replace_estimate_row_item_with_history` | 2 | `src/lib/ai/package-builder/apply.ts`<br>`src/lib/estimates/actions.ts` |
| `resolve_collaboration_invitation` | 1 | `src/app/invite/[token]/page.tsx` |
| `restore_deleted_estimate_nodes_with_history` | 1 | `src/lib/estimates/actions.ts` |
| `restore_deleted_estimate_rows_with_history` | 1 | `src/lib/estimates/actions.ts` |
| `set_cost_library_component_lifecycle_state` | 1 | `src/lib/component-library/actions.ts` |
| `submit_client_response` | 1 | `src/lib/publication/public-repository.ts` |
| `unlink_estimate_row_item_from_library_with_history` | 1 | `src/lib/estimates/actions.ts` |
| `update_cost_library_component` | 1 | `src/lib/component-library/actions.ts` |
| `update_estimate_details_with_history` | 1 | `src/lib/estimates/actions.ts` |
| `update_estimate_row_item_with_history` | 2 | `src/lib/ai/package-builder/apply.ts`<br>`src/lib/estimates/actions.ts` |
| `update_estimate_sheet_adjustment_with_history` | 1 | `src/lib/estimates/actions.ts` |
| `upsert_cost_library_component_price_option` | 1 | `src/lib/component-library/actions.ts` |
| `workspace_homebase_summary` | 1 | `src/lib/repositories/workspace-repository.ts` |
| `workspace_projects_summary` | 1 | `src/lib/repositories/workspace-repository.ts` |

## Readiness And Proof Scripts

| Script | Family | Command |
| --- | --- | --- |
| `cf:better-auth-proof` | cloudflare | `bun run scripts/generate-cloudflare-better-auth-proof.ts` |
| `cf:better-auth-provider-proof` | cloudflare | `bun run scripts/verify-cloudflare-better-auth-provider-proof.ts` |
| `cf:build` | cloudflare | `ARCHESTIMATOR_CLOUDFLARE_BUILD=1 opennextjs-cloudflare build` |
| `cf:check-d1-auth-realtime` | cloudflare | `bun run scripts/check-cloudflare-d1-auth-realtime-readiness.ts` |
| `cf:check-deploy-dry-run` | cloudflare | `bun run scripts/check-cloudflare-wrangler-deploy-dry-run.ts` |
| `cf:check-dns-delegation` | cloudflare | `bun run scripts/check-cloudflare-dns-delegation.ts` |
| `cf:check-email` | cloudflare | `bun run scripts/check-cloudflare-email-readiness.ts` |
| `cf:check-provider` | cloudflare | `bun run scripts/check-cloudflare-provider-readiness.ts` |
| `cf:check-provider-resources` | cloudflare | `bun run scripts/check-cloudflare-provider-resources.ts` |
| `cf:check-readiness` | cloudflare | `bun run scripts/check-cloudflare-worker-readiness.ts` |
| `cf:check-toolchain` | cloudflare | `bun run scripts/check-cloudflare-platform-toolchain.ts` |
| `cf:check-wrangler-auth` | cloudflare | `bun run scripts/check-cloudflare-wrangler-auth.ts` |
| `cf:d1-account-security-events-backfill` | cloudflare | `bun run scripts/migrate-account-security-events-to-d1.ts` |
| `cf:d1-account-settings-backfill` | cloudflare | `bun run scripts/migrate-account-settings-to-d1.ts` |
| `cf:d1-ai-audit-backfill` | cloudflare | `bun run scripts/migrate-ai-audit-to-d1.ts` |
| `cf:d1-authz-matrix` | cloudflare | `bun run scripts/generate-cloudflare-d1-authz-access-matrix.ts` |
| `cf:d1-beta-feedback-proof` | cloudflare | `bun run scripts/generate-cloudflare-d1-beta-feedback-proof.ts` |
| `cf:d1-closed-beta-proof` | cloudflare | `bun run scripts/generate-cloudflare-d1-closed-beta-proof.ts` |
| `cf:d1-collaboration-invitation-proof` | cloudflare | `bun run scripts/generate-cloudflare-d1-collaboration-invitation-proof.ts` |
| `cf:d1-component-library-proof` | cloudflare | `bun run scripts/generate-cloudflare-d1-component-library-proof.ts` |
| `cf:d1-estimate-history-proof` | cloudflare | `bun run scripts/generate-cloudflare-d1-estimate-history-proof.ts` |
| `cf:d1-legal-terms-backfill` | cloudflare | `bun run scripts/migrate-legal-terms-acceptances-to-d1.ts` |
| `cf:d1-performance-proof` | cloudflare | `bun run scripts/generate-cloudflare-d1-performance-proof.ts` |
| `cf:d1-profiles-backfill` | cloudflare | `bun run scripts/migrate-profiles-to-d1.ts` |
| `cf:d1-restore-rehearsal` | cloudflare | `bun run scripts/generate-cloudflare-d1-restore-rehearsal.ts` |
| `cf:d1-rpc-map` | cloudflare | `bun run scripts/generate-cloudflare-d1-rpc-rewrite-map.ts` |
| `cf:d1-rpc-proof` | cloudflare | `bun run scripts/generate-cloudflare-d1-rpc-transaction-proof.ts` |
| `cf:d1-runtime-proof` | cloudflare | `bun run scripts/verify-cloudflare-d1-runtime-performance-proof.ts` |
| `cf:deploy` | cloudflare | `ARCHESTIMATOR_CLOUDFLARE_BUILD=1 opennextjs-cloudflare build && OPEN_NEXT_DEPLOY=true CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV=false wrangler deploy --keep-vars` |
| `cf:inventory` | cloudflare | `bun run scripts/generate-cloudflare-migration-inventory.ts` |
| `cf:jobs-proof` | cloudflare | `bun run scripts/verify-cloudflare-jobs-proof.ts` |
| `cf:preview` | cloudflare | `ARCHESTIMATOR_CLOUDFLARE_BUILD=1 opennextjs-cloudflare build && opennextjs-cloudflare preview` |
| `cf:pricing` | cloudflare | `bun run scripts/generate-cloudflare-pricing-snapshot.ts` |
| `cf:provider-proof` | cloudflare | `bun run scripts/verify-cloudflare-provider-proof.ts` |
| `cf:queues-cron-proof` | cloudflare | `bun run scripts/generate-cloudflare-queues-cron-proof.ts` |
| `cf:release-gates` | cloudflare | `bun run scripts/check-cloudflare-release-gates.ts` |
| `cf:sync-worker-secrets` | cloudflare | `bun run scripts/sync-cloudflare-worker-secrets.ts` |
| `cf:typegen` | cloudflare | `wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts` |
| `cf:verify-hosted-performance` | cloudflare | `bun run scripts/verify-cloudflare-hosted-performance.ts` |
| `cf:verify-hosted-routes` | cloudflare | `bun run scripts/verify-cloudflare-hosted-routes.ts` |
| `cf:verify-preview-routes` | cloudflare | `bun run scripts/verify-cloudflare-worker-preview-routes.ts` |
| `cf:workbook` | cloudflare | `bun run scripts/generate-cloudflare-cost-performance-workbook.ts` |
| `gen:types` | provider-readiness | `supabase gen types typescript --project-id ebxxqidacheyapmmzavr --schema public > src/lib/supabase/types.ts` |
| `launch:check-legal-owner` | launch | `bun run scripts/check-legal-owner-readiness.ts` |
| `launch:check-supabase-backup` | provider-readiness | `bun run scripts/check-supabase-backup-readiness.ts` |
| `launch:check-supabase-linked-readiness` | provider-readiness | `bun run scripts/check-supabase-linked-readiness.ts` |
| `launch:check-supabase-migrations` | provider-readiness | `bun run scripts/check-supabase-migration-readiness.ts` |
| `launch:check-support-dns` | launch | `bun run scripts/check-support-email-dns.ts` |
| `launch:check-support-monitoring` | launch | `bun run scripts/check-support-monitoring-readiness.ts` |
| `launch:check-vercel-env` | provider-readiness | `bun run scripts/check-vercel-env-readiness.ts` |
| `launch:check-vercel-health` | provider-readiness | `bun run scripts/check-vercel-health-readiness.ts` |
| `launch:check-vercel-production` | provider-readiness | `bun run scripts/check-vercel-production-readiness.ts` |
| `launch:supabase-readiness` | launch | `supabase db query --linked --file scripts/sql/linked-supabase-launch-readiness.sql --output json` |
| `launch:verify-hosted-auth` | launch | `bun run scripts/verify-hosted-auth-routes.ts` |
| `launch:verify-hosted-export` | launch | `bun run scripts/verify-hosted-export-route.ts` |
| `launch:verify-hosted-sensitive-routes` | launch | `bun run scripts/verify-hosted-sensitive-route-fail-closed.ts` |
| `perf:check-routes` | performance | `bun run scripts/check-route-transition-readiness.ts` |
| `perf:collect-live-evidence` | performance | `bun run scripts/collect-live-db-performance-evidence.ts` |
| `perf:dashboard-query-count` | performance | `bun run scripts/measure-workshop-dashboard-query-count.ts` |
| `perf:library-baseline` | performance | `bun run scripts/measure-library-performance-baseline.ts` |
| `perf:measure-routes` | performance | `bun run scripts/measure-route-transitions.ts` |
| `perf:profile-peak-load` | performance | `vitest run tests/vitest/route-transition-peak-load-profile.test.tsx --maxWorkers=1` |
| `perf:seed-fixture` | performance | `bun run scripts/seed-performance-test-data.ts` |
| `prove:estimate-list-summaries` | proof | `node scripts/prove-estimate-list-summaries-postgres.mjs` |
| `prove:estimate-tabs-rls` | proof | `node scripts/prove-estimate-tabs-postgres.mjs` |
| `prove:membership-floor-triggers` | proof | `node scripts/prove-membership-floor-triggers-postgres.mjs` |
| `prove:notification-rls` | proof | `node scripts/prove-notification-rls-postgres.mjs` |
| `prove:project-dashboard-activity-location` | proof | `node scripts/prove-project-dashboard-activity-location-postgres.mjs` |
| `prove:rls-initplan` | proof | `node scripts/prove-rls-initplan-postgres.mjs` |
| `prove:shared-link-response-recipient-set-null` | proof | `node scripts/prove-shared-link-response-recipient-set-null-postgres.mjs` |
| `prove:t4-shared-link-db-hygiene` | proof | `node scripts/prove-t4-shared-link-db-hygiene-postgres.mjs` |
| `prove:unify-kinds` | proof | `node scripts/prove-unify-estimate-node-kinds-postgres.mjs` |
| `prove:workspace-homebase-summary` | proof | `node scripts/prove-workshop-homebase-summary-postgres.mjs` |
