# Cloudflare Migration Inventory

Generated: 2026-06-30T01:00:00.119Z

Local repository inventory only. It lists file paths, route paths, RPC names, script names, and counts; it does not read env files, print secret values, mutate providers, prove Cloudflare hosted deployment, prove D1/R2/Images/Email/Workers Paid readiness, change DNS, or make current providers removable.

## Counts

| Item | Count |
| --- | ---: |
| App routes | 71 |
| Page routes | 39 |
| Route handlers | 30 |
| Metadata routes | 2 |
| Provider-coupled source files | 93 |
| Distinct app-code RPC names | 80 |
| Package scripts | 94 |
| Script files | 110 |
| Cloudflare package scripts | 31 |
| Provider readiness package scripts | 8 |
| Applied SQL migration files | 181 |
| Pending-review SQL files | 13 |
| SQL function declaration/update matches | 346 |
| RLS/policy/storage/auth SQL matches | 684 |

## Top Provider-Coupled Files

The JSON artifact contains the full file list. This table shows the first 40 sorted matches.

| File | Route | Dependencies | RPC names |
| --- | --- | --- | --- |
| `src/app/api/auth/[...all]/route.ts` | /api/auth/[...all] | cloudflare-local-proof |  |
| `src/app/api/component-library/attachments/direct-upload/route.ts` | /api/component-library/attachments/direct-upload | supabase-client, supabase-rpc | is_workspace_editor |
| `src/app/api/component-library/attachments/route.ts` | /api/component-library/attachments | supabase-client, supabase-rpc | is_workspace_editor |
| `src/app/api/component-library/images/route.ts` | /api/component-library/images | supabase-client, supabase-rpc | is_workspace_editor |
| `src/app/api/estimate-row-images/route.ts` | /api/estimate-row-images | supabase-client, supabase-rpc | can_edit_estimate, can_edit_project |
| `src/app/api/internal/upload-runtime/route.ts` | /api/internal/upload-runtime | supabase-storage, vercel-runtime |  |
| `src/app/api/projects/[projectId]/activity/route.ts` | /api/projects/[projectId]/activity | supabase-rpc | can_edit_project |
| `src/app/api/projects/images/route.ts` | /api/projects/images | supabase-client, supabase-rpc | can_access_estimate, can_access_project, can_edit_project |
| `src/app/api/share/[token]/comment/route.ts` | /api/share/[token]/comment | resend-email |  |
| `src/app/api/webhooks/resend/route.ts` | /api/webhooks/resend | resend-email |  |
| `src/app/auth/callback/route.ts` | /auth/callback | vercel-runtime |  |
| `src/app/invite/[token]/accept/route.ts` | /invite/[token]/accept | supabase-rpc | accept_collaboration_invitation |
| `src/app/invite/[token]/page.tsx` | /invite/[token] | supabase-rpc | resolve_collaboration_invitation |
| `src/app/layout.tsx` |  | vercel-runtime |  |
| `src/app/privacy/page.tsx` | /privacy | resend-email, vercel-runtime |  |
| `src/app/providers.tsx` |  | supabase-realtime |  |
| `src/app/trust/page.tsx` | /trust | supabase-realtime |  |
| `src/app/workshop/projects/[projectId]/activity/page.tsx` | /workshop/projects/[projectId]/activity | supabase-rpc | can_edit_project |
| `src/app/workshop/projects/[projectId]/estimates/page.tsx` | /workshop/projects/[projectId]/estimates | supabase-rpc | can_edit_project |
| `src/app/workshop/projects/[projectId]/page.tsx` | /workshop/projects/[projectId] | supabase-rpc | can_edit_project |
| `src/components/analytics/VercelWebAnalytics.tsx` |  | vercel-runtime |  |
| `src/components/landing/claims-ledger/claims-data.ts` |  | supabase-realtime |  |
| `src/components/landing/CloudflareWebAnalytics.tsx` |  | cloudflare-local-proof |  |
| `src/components/landing/LandingAnalyticsLoader.tsx` |  | cloudflare-local-proof |  |
| `src/components/realtime-auth-bridge.tsx` |  | supabase-realtime |  |
| `src/components/ui/dropdown-select.tsx` |  | supabase-realtime |  |
| `src/components/workshop/EstimateSheetContent.tsx` |  | supabase-realtime |  |
| `src/components/workshop/ProjectCursorLayer.tsx` |  | supabase-realtime |  |
| `src/components/workshop/publication/RecipientEmailComposer.tsx` |  | resend-email |  |
| `src/hooks/use-estimate-cursor-broadcast.ts` |  | supabase-realtime |  |
| `src/hooks/use-estimate-row-update-broadcast.ts` |  | supabase-realtime |  |
| `src/hooks/use-project-presence.ts` |  | supabase-realtime |  |
| `src/lib/ai/audit.ts` |  | supabase-client |  |
| `src/lib/ai/package-builder/apply.ts` |  | supabase-rpc | create_ai_package_library_components_with_history, create_estimate_node_with_history, create_project_estimate_package_with_history, delete_estimate_row_item_with_history, insert_estimate_row_item_with_history, insert_estimate_template_into_estimate_with_history, rename_estimate_node_with_history, replace_estimate_row_item_with_history, update_estimate_row_item_with_history |
| `src/lib/analytics/vercel-web-analytics.ts` |  | vercel-runtime |  |
| `src/lib/auth/account-audit.ts` |  | supabase-client |  |
| `src/lib/auth/account-service-role.ts` |  | supabase-client |  |
| `src/lib/auth/actions.ts` |  | vercel-runtime |  |
| `src/lib/auth/beta-allowlist-admin-actions.ts` |  | supabase-rpc | create_closed_beta_allowlist_entry, update_closed_beta_allowlist_entry |
| `src/lib/auth/beta-allowlist-admin.ts` |  | supabase-rpc | read_closed_beta_allowlist_queue |

## RPC Caller Catalog

The JSON artifact contains every caller file. This table shows up to 80 RPCs with the first four callers per RPC.

| RPC | Caller file count | Sample callers |
| --- | ---: | --- |
| `accept_collaboration_invitation` | 2 | `src/app/invite/[token]/accept/route.ts`<br>`src/lib/collaboration/workshop-pending-invite.ts` |
| `accept_collaboration_invitation_by_id` | 1 | `src/lib/collaboration/pending-invite-actions.ts` |
| `approve_upload_scan_override` | 1 | `src/lib/uploads/scan-override.ts` |
| `archive_estimate_tab_with_history` | 1 | `src/lib/estimates/actions.ts` |
| `authorize_recipient_publication_for_current_user` | 1 | `src/lib/publication/actions.ts` |
| `can_access_estimate` | 2 | `src/app/api/projects/images/route.ts`<br>`src/lib/estimate-sheet/user-preferences-actions.ts` |
| `can_access_project` | 1 | `src/app/api/projects/images/route.ts` |
| `can_edit_estimate` | 4 | `src/app/api/estimate-row-images/route.ts`<br>`src/lib/component-library/actions.ts`<br>`src/lib/estimates/actions.ts`<br>`src/lib/repositories/workspace-repository.ts` |
| `can_edit_project` | 8 | `src/app/api/estimate-row-images/route.ts`<br>`src/app/api/projects/[projectId]/activity/route.ts`<br>`src/app/api/projects/images/route.ts`<br>`src/app/workshop/projects/[projectId]/activity/page.tsx` |
| `check_closed_beta_access` | 1 | `src/lib/auth/closed-beta-access.ts` |
| `create_ai_package_library_components_with_history` | 1 | `src/lib/ai/package-builder/apply.ts` |
| `create_closed_beta_allowlist_entry` | 1 | `src/lib/auth/beta-allowlist-admin-actions.ts` |
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
| `ensure_current_user_profile` | 1 | `src/lib/auth/session.ts` |
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
| `read_closed_beta_allowlist_queue` | 1 | `src/lib/auth/beta-allowlist-admin.ts` |
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
| `update_closed_beta_allowlist_entry` | 1 | `src/lib/auth/beta-allowlist-admin-actions.ts` |
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
| `cf:build` | cloudflare | `ARCHESTIMATOR_CLOUDFLARE_BUILD=1 opennextjs-cloudflare build` |
| `cf:check-d1-auth-realtime` | cloudflare | `bun run scripts/check-cloudflare-d1-auth-realtime-readiness.ts` |
| `cf:check-deploy-dry-run` | cloudflare | `bun run scripts/check-cloudflare-wrangler-deploy-dry-run.ts` |
| `cf:check-dns-delegation` | cloudflare | `bun run scripts/check-cloudflare-dns-delegation.ts` |
| `cf:check-provider` | cloudflare | `bun run scripts/check-cloudflare-provider-readiness.ts` |
| `cf:check-provider-resources` | cloudflare | `bun run scripts/check-cloudflare-provider-resources.ts` |
| `cf:check-readiness` | cloudflare | `bun run scripts/check-cloudflare-worker-readiness.ts` |
| `cf:check-toolchain` | cloudflare | `bun run scripts/check-cloudflare-platform-toolchain.ts` |
| `cf:check-wrangler-auth` | cloudflare | `bun run scripts/check-cloudflare-wrangler-auth.ts` |
| `cf:d1-authz-matrix` | cloudflare | `bun run scripts/generate-cloudflare-d1-authz-access-matrix.ts` |
| `cf:d1-beta-feedback-proof` | cloudflare | `bun run scripts/generate-cloudflare-d1-beta-feedback-proof.ts` |
| `cf:d1-closed-beta-proof` | cloudflare | `bun run scripts/generate-cloudflare-d1-closed-beta-proof.ts` |
| `cf:d1-collaboration-invitation-proof` | cloudflare | `bun run scripts/generate-cloudflare-d1-collaboration-invitation-proof.ts` |
| `cf:d1-component-library-proof` | cloudflare | `bun run scripts/generate-cloudflare-d1-component-library-proof.ts` |
| `cf:d1-estimate-history-proof` | cloudflare | `bun run scripts/generate-cloudflare-d1-estimate-history-proof.ts` |
| `cf:d1-performance-proof` | cloudflare | `bun run scripts/generate-cloudflare-d1-performance-proof.ts` |
| `cf:d1-restore-rehearsal` | cloudflare | `bun run scripts/generate-cloudflare-d1-restore-rehearsal.ts` |
| `cf:d1-rpc-map` | cloudflare | `bun run scripts/generate-cloudflare-d1-rpc-rewrite-map.ts` |
| `cf:d1-rpc-proof` | cloudflare | `bun run scripts/generate-cloudflare-d1-rpc-transaction-proof.ts` |
| `cf:deploy` | cloudflare | `ARCHESTIMATOR_CLOUDFLARE_BUILD=1 opennextjs-cloudflare build && opennextjs-cloudflare deploy -- --keep-vars` |
| `cf:inventory` | cloudflare | `bun run scripts/generate-cloudflare-migration-inventory.ts` |
| `cf:preview` | cloudflare | `ARCHESTIMATOR_CLOUDFLARE_BUILD=1 opennextjs-cloudflare build && opennextjs-cloudflare preview` |
| `cf:pricing` | cloudflare | `bun run scripts/generate-cloudflare-pricing-snapshot.ts` |
| `cf:queues-cron-proof` | cloudflare | `bun run scripts/generate-cloudflare-queues-cron-proof.ts` |
| `cf:release-gates` | cloudflare | `bun run scripts/check-cloudflare-release-gates.ts` |
| `cf:typegen` | cloudflare | `wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts` |
| `cf:verify-hosted-performance` | cloudflare | `bun run scripts/verify-cloudflare-hosted-performance.ts` |
| `cf:verify-hosted-routes` | cloudflare | `bun run scripts/verify-cloudflare-hosted-routes.ts` |
| `cf:verify-preview-routes` | cloudflare | `bun run scripts/verify-cloudflare-worker-preview-routes.ts` |
| `cf:workbook` | cloudflare | `bun run scripts/generate-cloudflare-cost-performance-workbook.ts` |
| `gen:types` | provider-readiness | `supabase gen types typescript --project-id ebxxqidacheyapmmzavr --schema public > src/lib/supabase/types.ts` |
| `launch:check-legal-owner` | launch | `bun run scripts/check-legal-owner-readiness.ts` |
| `launch:check-resend-readiness` | provider-readiness | `bun run scripts/check-resend-readiness.ts` |
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
| `perf:check-speed-insights` | performance | `bun run scripts/check-vercel-speed-insights-readiness.ts` |
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
