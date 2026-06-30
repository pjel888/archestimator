# Cloudflare D1/Auth/Realtime Readiness

Generated: 2026-06-30T10:48:06.364Z

Local D1/Auth/Realtime redesign readiness inventory only. It reads repository source, package, generated type, wrangler, and sanitized evidence artifacts; it does not read env files, print secret values, call provider APIs, create D1 databases, mutate Cloudflare/Supabase, change DNS, deploy Workers, or make Supabase removable.

## Summary

| Gate | Ready |
| --- | --- |
| Database inventory ready | yes |
| D1 binding ready | yes |
| Better Auth local route-gate proof ready | yes |
| Hosted Better Auth D1 schema proof ready | yes |
| Better Auth provider secret/origin proof ready | yes |
| Provider-backed Better Auth session fixture ready | yes |
| Provider-backed Better Auth callback/session cutover proof ready | yes |
| Better Auth provider proof ready | yes |
| Auth replacement ready | no |
| App-layer authorization spec ready | yes |
| Local RPC transaction mechanics ready | yes |
| Local beta-feedback D1 slice ready | yes |
| Local collaboration-invitation D1 slice ready | yes |
| Local closed-beta D1 slice ready | yes |
| Local component-library D1 slice ready | yes |
| Local estimate-history D1 slice ready | yes |
| RPC rewrite plan ready | yes |
| Realtime replacement ready | yes |
| Restore proof ready | yes |
| Performance proof ready | yes |
| Local redesign readiness report ready | yes |
| Production D1/Auth/Realtime ready | no |

## Inventory Snapshot

| Item | Count |
| --- | ---: |
| App routes | 71 |
| Provider-coupled files | 93 |
| Distinct Supabase RPC names | 80 |
| Applied SQL migration files | 181 |
| SQL function declaration matches | 346 |
| RLS/policy/storage/auth SQL matches | 684 |

## Manifest Snapshot

| Item | Value |
| --- | --- |
| D1 bindings in Wrangler | ARCH_DB |
| Typed D1 bindings | ARCH_DB |
| Durable Object bindings in Wrangler | COLLAB_ROOMS |
| Typed Durable Object bindings | COLLAB_ROOMS |
| Better Auth dependency | yes |

## Checks

| Scope | Check | Result | Evidence | Blocker |
| --- | --- | --- | --- | --- |
| database | Supabase database behavior inventory ready | PASS | routes=71, providerCoupledFiles=93, rpcNames=80, sqlMigrations=181, sqlFunctions=346, rlsPolicyStorageAuthMatches=684 |  |
| d1 | D1 database binding configured and typed | PASS | wranglerD1Bindings=ARCH_DB, typedD1Bindings=ARCH_DB |  |
| auth | Better Auth D1 local route-gate proof ready | PASS | betterAuthDependency=yes, betterAuthFiles=4, d1AdapterFiles=4, routeGateFiles=1, localProof=yes, routeGateHelperTests=yes, routeGateD1SessionFixture=yes, schemaSqlGenerated=yes, schemaSqlReview=yes, parityRows=7, existingSupabaseAuthFiles=12 |  |
| auth | Better Auth D1 production replacement ready | FAIL | betterAuthDependency=yes, betterAuthFiles=4, d1AdapterFiles=4, routeGateFiles=1, localProof=yes, routeGateD1SessionFixture=yes, schemaSqlReady=yes, hostedSchemaProof=yes, providerSecret=yes, providerSessionFixture=yes, providerCallbackSession=yes, providerProof=yes, productionProof=no, actualRouteMounted=yes, localOnly=no, providerBacked=yes | Better Auth production cutover proof is missing: OAuth provider credential proof, live route cutover, or Supabase auth removal is incomplete. |
| authorization | App-layer authorization access matrix and denial tests ready | PASS | present=yes, accessPaths=47, positiveTests=47, denialTests=47, allCovered=yes, crossWorkspaceDenials=yes, routeActionCoverage=yes |  |
| d1 | D1 beta-feedback local domain proof ready | PASS | present=yes, schema=yes, appLayerAuthz=yes, localSlice=yes, productionProof=no, feedbackRows=1, forgedWorkspaceRows=0, mismatchedProjectRows=0, rollbackResidueRows=0, duplicateStatusAuditRows=0, localOnly=yes, providerBacked=no |  |
| d1 | D1 collaboration-invitation local domain proof ready | PASS | present=yes, schema=yes, tokenIssue=yes, resolveState=yes, acceptByToken=yes, acceptById=yes, localSlice=yes, productionProof=no, affectedRpcNames=5, tokenIssueRows=1, activeTokensAfterIssue=1, wrongAccountMembershipRows=0, rollbackResidueRows=0, duplicateAcceptAuditRows=0, replayBlockedAuditRows=1, localOnly=yes, providerBacked=no |  |
| d1 | D1 closed-beta local domain proof ready | PASS | present=yes, schema=yes, statusContract=yes, appLayerAdminGuard=yes, accessCheck=yes, queueRead=yes, createMutation=yes, updateMutation=yes, localSlice=yes, productionProof=no, affectedRpcNames=4, adminQueueRows=3, nonAdminQueueRows=0, createRows=1, duplicateCreateRows=0, nonAdminCreateRows=0, rollbackResidueRows=0, localOnly=yes, providerBacked=no |  |
| d1 | D1 component-library local domain proof ready | PASS | present=yes, schema=yes, editorGuard=yes, folderDelete=yes, folderReorder=yes, bulkArchive=yes, componentUpdate=yes, lifecycleMutation=yes, priceOptionUpsert=yes, localSlice=yes, productionProof=no, affectedRpcNames=6, archivedComponentRows=2, viewerDeleteResidueRows=0, rollbackResidueRows=0, duplicatePriceHistoryRows=0, duplicateBulkArchiveEventRows=0, restoredComponentRows=5, localOnly=yes, providerBacked=no |  |
| d1 | D1 estimate-history local domain proof ready | PASS | present=yes, schema=yes, editorGuard=yes, tabMutation=yes, subtreeInsert=yes, rowMove=yes, sheetAdjustment=yes, packageApply=yes, promoteToLibrary=yes, rollback=yes, idempotency=yes, queryBudget=yes, restoreFixture=yes, localSlice=yes, productionProof=no, affectedRpcNames=12, viewerMutationResidueRows=0, rollbackResidueRows=0, duplicateSubtreeOperationRows=1, projectPackageCommandRows=1, libraryPackageCommandRows=1, restoredHistoryRows=11, localOnly=yes, providerBacked=no |  |
| rpc | Supabase RPC rewrite map and transaction proof ready | PASS | present=yes, mappedRpcNames=80, inventoryRpcNames=80, goldenFixtures=yes, transactions=yes, rollback=yes, idempotency=yes, localMechanics=yes, productionRewrite=no |  |
| rpc | D1 RPC local transaction/rollback/idempotency mechanics ready | PASS | present=yes, transactions=yes, rollback=yes, idempotency=yes, localProof=yes, productionProof=no, coveredPatterns=4, rollbackResidueRows=0, duplicateSideEffects=0, localOnly=yes, providerBacked=no |  |
| realtime | Durable Objects/WebSockets realtime replacement wired | PASS | wranglerDurableObjectBindings=COLLAB_ROOMS, typedDurableObjectBindings=COLLAB_ROOMS, durableObjectRealtimeFiles=1, existingSupabaseRealtimeFiles=19 |  |
| restore | D1 export/import restore rehearsal ready | PASS | present=yes, export=yes, import=yes, rehearsal=yes, destructiveRestoreDocumented=yes, localOnly=yes, providerBacked=no |  |
| performance | D1 query-count and hosted p95 performance proof ready | PASS | present=yes, queryCountBudgets=yes, p95RouteProof=yes, hostedWorkerD1Performance=yes, localOnly=no, providerBacked=yes |  |

## Candidate First D1 Slices

| Slice | Risk | Reason | Matching RPC names |
| --- | --- | --- | --- |
| Beta feedback submissions | low | Narrow prelaunch data shape with limited workflow coupling. | `check_closed_beta_access`, `create_closed_beta_allowlist_entry`, `read_closed_beta_allowlist_queue`, `update_closed_beta_allowlist_entry` |
| Closed-beta allowlist | low | Sensitive but narrow prelaunch access-control table with bounded admin mutations and existing route/action tests. | `check_closed_beta_access`, `create_closed_beta_allowlist_entry`, `read_closed_beta_allowlist_queue`, `update_closed_beta_allowlist_entry` |
| Collaboration invitation tokens | medium | Token issue/resolve/accept touches memberships and audit rows, but is bounded enough for a local D1 domain proof before core estimate writes. | `accept_collaboration_invitation`, `accept_collaboration_invitation_by_id`, `issue_collaboration_invitation_token`, `list_pending_collaboration_invitations`, `record_collaboration_invitation_delivery`, `resolve_collaboration_invitation` |
| Upload metadata and scan state | medium | R2 byte storage has local adapters, but metadata authorization still needs D1/app-layer proof. | `approve_upload_scan_override`, `create_upload_session`, `finalize_upload_session`, `record_mass_deletion_storage_cleanup_result`, `record_upload_asset`, `record_upload_scan_result` |
| Library read models | medium | Read-heavy catalogs are useful for D1 query-count and p95 proof before core estimate writes. | `create_ai_package_library_components_with_history`, `create_cost_library_component`, `delete_library_folder`, `execute_bulk_archive_library_components`, `insert_estimate_template_into_estimate_with_history`, `insert_estimate_template_node_into_estimate_with_history`, `library_component_rows_seed`, `library_overview_summary`, `library_templates_seed`, `move_estimate_row_component_with_history`, `preview_bulk_archive_library_components`, `promote_estimate_row_to_library_component` |
| Component-library mutations | medium | Folder, component versioning, price option, lifecycle, and bulk archive writes exercise D1 transaction and idempotency patterns before estimate-history rewrites. | `delete_library_folder`, `execute_bulk_archive_library_components`, `reorder_library_folders`, `set_cost_library_component_lifecycle_state`, `update_cost_library_component`, `upsert_cost_library_component_price_option` |
| Estimate-history mutations | high | Core estimating writes touch tabs, rows, subtrees, package apply commands, and history/audit rows; keep this as a proven local D1 slice before live D1 replacement. | `archive_estimate_tab_with_history`, `create_ai_package_library_components_with_history`, `create_estimate_tab_with_history`, `create_project_estimate_package_with_history`, `delete_estimate_tab_with_history`, `duplicate_estimate_tab_with_history`, `insert_estimate_subtree_into_estimate_with_history`, `move_estimate_row_item_with_history`, `promote_estimate_row_to_library_component`, `rename_estimate_tab_with_history`, `update_estimate_sheet_adjustment_with_history` |
| Workspace/project authorization core | high | This is the RLS replacement boundary and must wait for access matrices plus denial tests. | `accept_collaboration_invitation`, `accept_collaboration_invitation_by_id`, `approve_upload_scan_override`, `authorize_recipient_publication_for_current_user`, `can_access_estimate`, `can_access_project`, `can_edit_estimate`, `can_edit_project`, `create_project_estimate_package_with_history`, `execute_bulk_delete_projects`, `increment_project_publication_open`, `is_workspace_editor` |

## Blockers

- Better Auth D1 production replacement ready: Better Auth production cutover proof is missing: OAuth provider credential proof, live route cutover, or Supabase auth removal is incomplete.
