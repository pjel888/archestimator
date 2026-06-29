---
title: Current Evidence Inventory
plan_id: 2026-06-29-cloudflare-migration-codex
document: 29
---

# Current Evidence Inventory

## Purpose

This document records the local evidence used to judge the Cloudflare migration plan quality. It is not a completed migration inventory and it is not provider proof. It is the bridge between repo reality and the future worksheets in `26_INVENTORY_WORKSHEETS.md`.

## Evidence Boundary

Collected on 2026-06-29 from the local repository only. No provider dashboard, hosted Cloudflare preview, production traffic, DNS, billing, or external runtime state was changed or verified in this pass.

What this evidence proves:

- The migration has broad provider coupling and cannot be safely planned as a narrow hosting swap.
- The D1 path must account for a real RPC/RLS/function surface, not just table definitions.
- Existing tests and proof scripts provide useful source material for future Cloudflare proof gates.
- The current plan has enough local grounding for owner review and proof-spike planning.

What this evidence does not prove:

- Cloudflare will be cheaper for real Archestimator usage.
- Next.js 16 will run correctly on Workers/OpenNext for this app.
- D1, Better Auth, R2, Queues, Durable Objects, or Email Service meet production parity.
- Production cutover is safe.

## Repo Scan Commands And Counts

| Evidence | Command | Result |
| --- | --- | ---: |
| App files | `rg --files src/app` | `107` |
| API route files | `rg --files src/app/api` | `27` |
| Source files matching provider coupling | `rg -l "supabase|createSupabase|@supabase|\\.rpc\\(|\\.storage\\.|realtime|channel\\(" src/app src/lib src/components src/proxy.ts` | `126` |
| Distinct app-code RPC names | `rg -o --no-filename "rpc\\(\"[A-Za-z0-9_]+\"" src/app src/lib` | `76` |
| Applied SQL migrations | `rg --files supabase/migrations` | `181` |
| Pending-review SQL files | `rg --files supabase/migrations-pending-review` | `15` |
| SQL function declaration/update matches | `rg -n "create (or replace )?function public\\.|create function public\\." supabase/migrations supabase/migrations-pending-review` | `346` |
| RLS/policy/storage/auth SQL matches | `rg -n "create policy|alter table .* enable row level security|storage\\.objects|storage\\.buckets|auth\\.uid\\(" supabase/migrations supabase/migrations-pending-review` | `655` |
| Vitest files | `rg --files tests/vitest` | `555` |

## Full App-Code RPC Catalog

The command only scans `src/app` and `src/lib`; SQL-only functions may exist beyond this list. Every item below needs a caller, SQL source, auth assumption, D1 rewrite strategy, transaction strategy, and denial/golden fixture before D1 implementation.

Access, auth, workspace, and closed-beta RPCs:

- `accept_collaboration_invitation`
- `accept_collaboration_invitation_by_id`
- `can_access_estimate`
- `can_access_project`
- `can_edit_estimate`
- `can_edit_project`
- `check_closed_beta_access`
- `create_closed_beta_allowlist_entry`
- `is_workspace_editor`
- `is_workspace_member`
- `read_closed_beta_allowlist_queue`
- `update_closed_beta_allowlist_entry`

Estimate, tree, tab, history, and template RPCs:

- `archive_estimate_tab_with_history`
- `create_estimate_node_with_history`
- `create_estimate_tab_with_history`
- `create_project_estimate_package_with_history`
- `delete_estimate_node_with_history`
- `delete_estimate_nodes_bulk_with_history`
- `delete_estimate_row_item_with_history`
- `delete_estimate_row_items_bulk_with_history`
- `delete_estimate_tab_with_history`
- `duplicate_estimate_tab_with_history`
- `estimate_node_route_context`
- `get_estimate_activity_retention_metrics`
- `insert_estimate_row_item_with_history`
- `insert_estimate_template_into_estimate_with_history`
- `insert_estimate_template_node_into_estimate_with_history`
- `move_estimate_row_component_with_history`
- `move_estimate_row_item_with_history`
- `project_estimate_list_summaries`
- `project_estimate_list_summaries_for_estimates`
- `promote_estimate_row_to_library_component`
- `rename_estimate_node_with_history`
- `rename_estimate_tab_with_history`
- `reorder_estimate_nodes_with_history`
- `reorder_estimate_tabs_with_history`
- `replace_estimate_row_item_with_history`
- `restore_deleted_estimate_nodes_with_history`
- `restore_deleted_estimate_rows_with_history`
- `unlink_estimate_row_item_from_library_with_history`
- `update_estimate_details_with_history`
- `update_estimate_row_item_with_history`
- `update_estimate_sheet_adjustment_with_history`

Project, navigation, publication, and recipient RPCs:

- `increment_project_publication_open`
- `list_recipient_publications_for_current_user`
- `main_sidebar_favorite_projects`
- `preview_bulk_delete_estimate_sheets`
- `preview_bulk_delete_projects`
- `execute_bulk_delete_estimate_sheets`
- `execute_bulk_delete_projects`
- `workspace_homebase_summary`
- `workspace_projects_summary`

Library and reusable-source RPCs:

- `create_ai_package_library_components_with_history`
- `create_cost_library_component`
- `delete_library_folder`
- `execute_bulk_archive_library_components`
- `library_component_rows_seed`
- `library_overview_summary`
- `library_templates_seed`
- `preview_bulk_archive_library_components`
- `reorder_library_folders`
- `set_cost_library_component_lifecycle_state`
- `update_cost_library_component`
- `upsert_cost_library_component_price_option`

Collaboration, invitations, upload, and provider-operation RPCs:

- `approve_upload_scan_override`
- `create_upload_session`
- `finalize_upload_session`
- `issue_collaboration_invitation_token`
- `list_pending_collaboration_invitations`
- `read_project_collaboration_audit_events`
- `record_collaboration_invitation_delivery`
- `record_mass_deletion_storage_cleanup_result`
- `record_upload_asset`
- `record_upload_scan_result`
- `resolve_collaboration_invitation`
- `validate_estimate_row_image_asset`

## High-Signal Provider-Coupled Source Areas

The provider-coupling scan matched `126` files under `src/app`, `src/lib`, `src/components`, and `src/proxy.ts`. The list below combines the highest-priority matches from that scan with realtime hook files identified in `03_SOURCE_AND_CODEBASE_AUDIT.md`, because those files sit at auth, database, storage, realtime, email, and publication boundaries:

- `src/proxy.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/service-role.ts`
- `src/lib/supabase/types.ts`
- `src/app/auth/callback/route.ts`
- `src/app/providers.tsx`
- `src/app/api/projects/images/route.ts`
- `src/app/api/estimate-row-images/route.ts`
- `src/app/api/component-library/images/route.ts`
- `src/app/api/component-library/attachments/route.ts`
- `src/app/api/component-library/attachments/direct-upload/route.ts`
- `src/app/api/component-library/attachments/scan-override/route.ts`
- `src/app/api/internal/upload-cleanup/route.ts`
- `src/app/api/internal/upload-runtime/route.ts`
- `src/app/api/internal/upload-scan/route.ts`
- `src/app/api/webhooks/resend/route.ts`
- `src/app/api/share/[token]/activity/route.ts`
- `src/app/invite/[token]/accept/route.ts`
- `src/lib/auth/session.ts`
- `src/lib/auth/account-service-role.ts`
- `src/lib/auth/closed-beta-access.ts`
- `src/lib/collaboration/actions.ts`
- `src/lib/collaboration/realtime-identity-server.ts`
- `src/lib/collaboration/realtime-telemetry.ts`
- `src/lib/component-library/actions.ts`
- `src/lib/component-library/template-editor-actions.ts`
- `src/lib/email/resend-webhooks.ts`
- `src/lib/estimates/actions.ts`
- `src/lib/projects/actions.ts`
- `src/lib/publication/actions.ts`
- `src/lib/publication/public-repository.ts`
- `src/lib/publisher/activity-repository.ts`
- `src/lib/repositories/component-library-repository.ts`
- `src/lib/repositories/estimate-repository.ts`
- `src/lib/repositories/project-data-repository.ts`
- `src/lib/repositories/project-estimate-sheets-repository.ts`
- `src/lib/repositories/recipient-proposals-repository.ts`
- `src/lib/repositories/workspace-repository.ts`
- `src/lib/uploads/storage-provider.ts`
- `src/lib/uploads/upload-records.ts`
- `src/lib/uploads/direct-upload-records.ts`
- `src/lib/uploads/scan-job.ts`
- `src/lib/uploads/cleanup-job.ts`
- `src/lib/uploads/provider-portability.ts`
- `src/components/realtime-auth-bridge.tsx`
- `src/components/workshop/ProjectCursorLayer.tsx`
- `src/hooks/use-project-presence.ts`
- `src/hooks/use-estimate-cursor-broadcast.ts`
- `src/hooks/use-estimate-row-update-broadcast.ts`

Future inventory should fill the remaining matched files from the same command and the realtime hook audit, but this priority set is enough to pick a first proof slice.

## Existing Test And Proof Surfaces To Reuse

Auth and route gates:

- `tests/vitest/auth-proxy.test.ts`
- `tests/vitest/auth-session-closed-beta.test.ts`
- `tests/vitest/auth-sensitive-api-boundaries.test.ts`
- `tests/vitest/hosted-auth-route-smoke-script.test.ts`
- `e2e/auth.spec.ts`

Estimate and project correctness:

- `tests/vitest/estimate-mutations.test.ts`
- `tests/vitest/estimate-sheet-actions-authz.test.ts`
- `tests/vitest/estimate-node-route-context-rpc-contract.test.ts`
- `tests/vitest/project-estimate-list-summaries-parity.test.ts`
- `tests/vitest/project-data-repository.test.ts`
- `e2e/estimate-sheet-target-route-smoke.spec.ts`

Library:

- `tests/vitest/component-library-actions-revalidation.test.ts`
- `tests/vitest/component-library-templates-repository.test.ts`
- `tests/vitest/library-route-state-authz.test.tsx`
- `tests/vitest/perf/library-overview-rpc-contract.test.ts`
- `e2e/workshop-library-routes.spec.ts`

Publication and share links:

- `tests/vitest/project-publication-route.test.ts`
- `tests/vitest/project-publication-security.test.ts`
- `tests/vitest/share-no-store-invariants.test.ts`
- `tests/vitest/shared-link-hosted-password-route-proof-script.test.ts`
- `tests/vitest/shared-link-perf-budgets-script.test.ts`
- `e2e/shared-link-receiver.spec.ts`

Uploads and storage:

- `tests/vitest/upload-storage-provider.test.ts`
- `tests/vitest/upload-provider-portability.test.ts`
- `tests/vitest/upload-provider-readback.test.ts`
- `tests/vitest/upload-storage-denial-proof.test.ts`
- `tests/vitest/upload-signed-provider-proof.test.ts`
- `tests/vitest/upload-scan-worker-provider-proof.test.ts`
- `tests/vitest/hosted-upload-runtime-proof-script.test.ts`

Realtime and collaboration:

- `tests/vitest/project-collaboration-realtime.test.ts`
- `tests/vitest/realtime-identity.test.ts`
- `tests/vitest/realtime-auth-bridge-favorites-clear.test.tsx`
- `tests/vitest/estimate-cursor-broadcast-throttle.test.ts`
- `e2e/teamspace-collaboration.spec.ts`

Email:

- `tests/vitest/resend-readiness-script.test.ts`
- `tests/vitest/resend-webhook-delivery.test.ts`
- `tests/vitest/resend-webhook-route.test.ts`
- `tests/vitest/resend-webhook-scope.test.ts`

Performance:

- `tests/vitest/route-transition-performance-spec.test.ts`
- `tests/vitest/route-transition-readiness-script.test.ts`
- `tests/vitest/perf/projects-page-rpc-contract.test.ts`
- `tests/vitest/perf/projects-page-server-parallelism.test.ts`
- `tests/vitest/perf/estimate-sheet-render-baseline.test.tsx`
- `e2e/route-transition-performance.spec.ts`
- `e2e/estimate-sheet-loading-performance.spec.ts`

## Existing Provider Proof Script Inventory

These scripts are evidence that the current stack already has provider proof habits. A Cloudflare migration must replace the relevant claims before retiring the old scripts.

- `scripts/check-resend-readiness.ts`
- `scripts/check-route-transition-readiness.ts`
- `scripts/check-supabase-backup-readiness.ts`
- `scripts/check-supabase-linked-readiness.ts`
- `scripts/check-supabase-migration-readiness.ts`
- `scripts/check-vercel-env-readiness.ts`
- `scripts/check-vercel-health-readiness.ts`
- `scripts/check-vercel-production-readiness.ts`
- `scripts/check-vercel-speed-insights-readiness.ts`
- `scripts/collect-live-db-performance-evidence.ts`
- `scripts/prove-estimate-list-summaries-postgres.mjs`
- `scripts/prove-estimate-row-item-move-rpc-postgres.mjs`
- `scripts/prove-estimate-tabs-postgres.mjs`
- `scripts/prove-membership-floor-triggers-postgres.mjs`
- `scripts/prove-notification-rls-postgres.mjs`
- `scripts/prove-project-activity-route-browser.mjs`
- `scripts/prove-project-dashboard-activity-location-postgres.mjs`
- `scripts/prove-project-dashboard-route-browser.mjs`
- `scripts/prove-recipient-proposals-browser.mjs`
- `scripts/prove-rls-initplan-postgres.mjs`
- `scripts/prove-shared-link-current-preview-smoke.ts`
- `scripts/prove-shared-link-duplicate-decision-race-http.ts`
- `scripts/prove-shared-link-hosted-password-route.ts`
- `scripts/prove-shared-link-hosted-recipient-activity.ts`
- `scripts/prove-shared-link-provider-perf.ts`
- `scripts/prove-shared-link-response-recipient-set-null-postgres.mjs`
- `scripts/prove-t4-shared-link-db-hygiene-postgres.mjs`
- `scripts/prove-unify-estimate-node-kinds-postgres.mjs`
- `scripts/prove-upload-clamd-live.ts`
- `scripts/prove-upload-clean-download-provider-postgres.ts`
- `scripts/prove-upload-cleanup-provider-postgres.ts`
- `scripts/prove-upload-domain-rls-postgres.mjs`
- `scripts/prove-upload-operations-runbook-local.ts`
- `scripts/prove-upload-scan-rpc-provider-postgres.ts`
- `scripts/prove-upload-scan-worker-provider-postgres.ts`
- `scripts/prove-upload-session-capacity-provider-postgres.ts`
- `scripts/prove-upload-signed-provider-postgres.ts`
- `scripts/prove-upload-signed-route-provider-postgres.ts`
- `scripts/prove-upload-storage-denial-postgres.mjs`
- `scripts/prove-upload-tus-provider-postgres.ts`
- `scripts/prove-workshop-homebase-summary-postgres.mjs`

## Evidence-Based First Slice Candidates

Best first proof slice candidates, based on current coupling and reusable tests:

1. Cloudflare front-door/WAF/Turnstile observability slice. Lowest data migration risk, useful security/cost evidence, rollback by DNS/origin path.
2. Upload storage R2 proof slice. Strong existing upload proof surface and clear provider boundary, but requires signed/private object and scan lifecycle parity.
3. Next-on-Workers route fidelity proof. Required for full-native target, but should stay proof-only until auth/proxy/cache behavior is measured.
4. D1 read-only shadow/projection proof for one low-risk read model. Useful for learning D1 query/performance shape without changing source of truth.

Do not start with full D1/Auth/Realtime replacement. The evidence shows that would mix the riskiest boundaries before the team has proof infrastructure.
