import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const applySource = readFileSync("src/lib/ai/package-builder/apply.ts", "utf8");
const auditSource = readFileSync("src/lib/ai/audit.ts", "utf8");
const draftTokenSource = readFileSync("src/lib/ai/package-builder/draft-token.ts", "utf8");
const handlerSource = readFileSync("src/app/api/ai/package-builder/handler.ts", "utf8");
const readContextSource = readFileSync("src/lib/ai/read-context.ts", "utf8");
const readToolsSource = readFileSync("src/lib/ai/package-builder/read-tools.ts", "utf8");
const routeSource = readFileSync("src/app/api/ai/package-builder/route.ts", "utf8");
const schemasSource = readFileSync("src/lib/ai/package-builder/schemas.ts", "utf8");
const applyRpcMigration = readFileSync("supabase/migrations/20260528003000_ai_package_builder_apply_rpc.sql", "utf8");
const d1ApplyCommandMigration = readFileSync("migrations/0027_ai_package_apply_commands.sql", "utf8");

describe("AI package-builder security contract", () => {
  it("keeps normal package-builder reads and writes off the service-role client", () => {
    expect(applySource).not.toContain("createPackageApplyServiceClient");
    expect(applySource).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(applySource).not.toContain("createClient<Database>");
    expect(readToolsSource).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(readToolsSource).not.toContain("createClient<Database>");
    expect(readContextSource).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(readContextSource).not.toContain("createClient<Database>");
    expect(applySource).not.toContain("createSupabaseServerClient");
    expect(readToolsSource).not.toContain("ensureDefaultWorkspace");
    expect(readToolsSource).not.toContain("createSupabaseServerClient");
    expect(readContextSource).not.toContain("createSupabaseServerClient");
    expect(applySource).toContain("getCloudflareD1Database");
    expect(readToolsSource).toContain("getCloudflareD1Database");
    expect(readContextSource).toContain("getCloudflareD1Database");
  });

  it("derives workspace and user server-side before Apply writes", () => {
    expect(applySource).toContain("requireCurrentUserContext()");
    expect(applySource).toContain("ensureDefaultWorkspace()");
    expect(applySource).toContain("workspace.id !== input.userContext.workspaceId");
    expect(applySource).toContain("currentUser.userId !== input.userContext.userId");
    expect(applySource).toContain("beginApplyCommand");
    expect(applySource).toContain("ai_package_apply_commands");
    expect(applySource).toContain("commandKind");
    expect(applySource).toContain("requirePackageApplyD1Database");
    expect(applySource).toContain("completeApplyCommand");
    expect(applySource).not.toContain("acting_user_id: currentUser.userId");
    expect(applyRpcMigration).toContain("authenticated_user_id uuid := auth.uid()");
    expect(applyRpcMigration).toContain("Package Apply requires an authenticated user.");
    expect(applyRpcMigration).toContain("public.is_workspace_editor(target_workspace_id) is not true");
    expect(applyRpcMigration).toContain("Package Apply requires workspace editor access.");
    expect(applyRpcMigration).toContain("Package draft contains an ineligible row.");
    expect(applyRpcMigration).toContain("Package row with a price option requires a confirmed updated timestamp.");
    expect(applyRpcMigration).toContain("Package row without a price option requires a component version snapshot.");
    expect(applySource).toContain("authorizationRunId");
  });

  it("does not weaken existing project/estimate write authorization for workspace viewers", () => {
    expect(readFileSync("supabase/migrations/20260526142913_project_sheet_collaboration_access.sql", "utf8")).toContain(
      "for insert to authenticated with check (public.is_workspace_editor(workspace_id))",
    );
    expect(applyRpcMigration).toContain("public.is_workspace_editor(target_workspace_id) is not true");
    expect(applyRpcMigration).not.toContain("from public.workspace_members wm\n    where wm.workspace_id = target_workspace_id");
  });

  it("requires provider-backed workspace auth and explicit Apply confirmation before writes", () => {
    expect(routeSource).toContain("isAiRoutesEnabled");
    expect(routeSource).toContain("createAiDisabledResponse");
    expect(handlerSource).toContain("AI requires a signed-in account session");
    expect(handlerSource).toContain("parsePackageBuilderApplyRequest");
    expect(handlerSource).toContain("verifyPackageDraftToken");
    expect(handlerSource).toContain("confirmation");
    expect(handlerSource).toContain("draftHash");
    expect(handlerSource).toContain("recordAiPackageApplyAuthorization");
    expect(handlerSource).toContain("serverConfirmation: true");
    expect(handlerSource).toContain("draftTokenVerified: true");
    expect(draftTokenSource).toContain("createHmac");
    expect(auditSource).toContain("recordAiPackageApplyAuthorization");
    expect(applyRpcMigration).toContain("run_row.metadata->>'draftTokenVerified' = 'true'");
    expect(applyRpcMigration).toContain("run_row.metadata->>'serverConfirmation' = 'true'");
    expect(applyRpcMigration).toContain("run_row.status = 'started'::public.ai_run_status");
    expect(applyRpcMigration).toContain("Package Apply requires server-side confirmation authorization.");
  });

  it("audits read tools with compact source table summaries", () => {
    expect(readToolsSource).toContain("buildAiPackageDataAccessEvent");
    expect(readToolsSource).toContain("search_component_library");
    expect(readToolsSource).toContain("search_estimate_templates");
    expect(readToolsSource).toContain("search_historical_estimate_rows");
    expect(readToolsSource).toContain('sourceTables: ["projects", "estimates", "estimate_nodes", "estimate_row_items"]');
    expect(readToolsSource).toContain("sourceTables");
    expect(readToolsSource).toContain("rowCount");
    expect(readContextSource).toContain("ask_count_accessible_projects");
    expect(readContextSource).toContain("ask_list_accessible_projects");
    expect(readContextSource).toContain("ask_read_project_summary");
    expect(readContextSource).toContain("sourceTables");
    expect(readContextSource).toContain("rowCount");
  });

  it("keeps template row copies on an explicit contract while generic template row sources stay blocked", () => {
    expect(readToolsSource).toContain("rowPreviews");
    expect(handlerSource).toContain("rowPreviews");
    expect(handlerSource).not.toContain("sourceTemplateRowId: row.id");
    expect(schemasSource).toContain("templateRowCopyDraft");
    expect(schemasSource).toContain("copy_template_row");
    expect(schemasSource).toContain('row.sourceType === "template"');
    expect(schemasSource).toContain("Template row");
    expect(applySource).toContain("buildTemplateRowCopyInsert");
    expect(applySource).toContain("sourceTemplateRowId");
    expect(applySource).toContain('row.sourceType === "template"');
    expect(applySource).toContain("Template row");
    expect(applySource).not.toContain("insert_template_row");
    expect(applyRpcMigration).not.toContain("template_row");
  });

  it("bounds AI read tools at the database query layer", () => {
    expect(readToolsSource).not.toContain("listCurrentWorkspaceProjects");
    expect(readToolsSource).not.toContain("listProjectEstimates");
    expect(readToolsSource).not.toContain("getProjectEstimateTreeByEstimate");
    expect(readToolsSource).not.toContain("getProjectEstimateTreeByNode");
    expect(readToolsSource).toContain("FROM projects");
    expect(readToolsSource).toContain("FROM estimates");
    expect(readToolsSource).toContain("FROM estimate_nodes");
    expect(readToolsSource).toContain("FROM estimate_row_items");
    expect(readToolsSource).toContain("DEFAULT_RESULT_LIMIT");
    expect(readToolsSource).toContain("DEFAULT_TREE_LIMIT");
    expect(readToolsSource).toContain("DEFAULT_ROW_LIMIT");
    expect(readToolsSource).toContain("DEFAULT_HISTORICAL_ESTIMATE_LIMIT");
    expect(readToolsSource).toContain("DEFAULT_HISTORICAL_ROW_LIMIT");
    expect(readToolsSource).toContain("LIMIT ?");
    expect(readContextSource).toContain("ASK_READ_CONTEXT_PROJECT_LIST_LIMIT");
    expect(readContextSource).toContain("ASK_READ_CONTEXT_ESTIMATE_LIMIT");
    expect(readContextSource).toContain("ASK_READ_CONTEXT_ACTIVITY_EVENT_LIMIT");
    expect(readContextSource).toContain("LIMIT ?");
    expect(readContextSource).toContain("FROM estimate_sheet_events");
    expect(readContextSource).toContain("SELECT event_type, event_source, created_at, actor_user_id, estimate_tab_id, row_context, changed_fields, total_delta, payload");
    expect(readContextSource).toContain('["projects", "estimates", "estimate_tabs", "estimate_sheet_events", "profiles"]');
    expect(readContextSource).not.toContain("old_snapshot, new_snapshot");
    expect(readContextSource).not.toContain("metadata, created_at");
    expect(readContextSource).toContain("WHERE workspace_id = ?");
    expect(readToolsSource).toContain("priceOptionRowsRead = priceOptionRows.length");
    expect(readToolsSource).toContain("rowCount: itemRows.length + priceOptionRowsRead + folderRowsRead");
    expect(readToolsSource).toContain("current_version_number");
    expect(readToolsSource).toContain("priceOptionUpdatedAt: priceOption?.updated_at ?? null");
    expect(readToolsSource).not.toContain("priceOptionId: priceOption?.id ?? item.active_price_option_id");
  });

  it("keeps package Apply transactionally idempotent in the database", () => {
    expect(d1ApplyCommandMigration).toContain("CREATE TABLE IF NOT EXISTS ai_package_apply_commands");
    expect(d1ApplyCommandMigration).toContain("UNIQUE (workspace_id, idempotency_key)");
    expect(d1ApplyCommandMigration).toContain("status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'completed', 'failed'))");
    expect(d1ApplyCommandMigration).toContain("result_json TEXT CHECK");
    expect(d1ApplyCommandMigration).toContain("failure_json TEXT CHECK");
    expect(applySource).toContain("SELECT id, draft_hash, status, result_json");
    expect(applySource).toContain("INSERT INTO ai_package_apply_commands");
    expect(applySource).toContain("UPDATE ai_package_apply_commands");
    expect(applySource).toContain("recoveryStatus: \"idempotent_replay\"");
  });

  it("keeps component-library Apply idempotent through the D1 Apply command ledger", () => {
    expect(d1ApplyCommandMigration).toContain("library_components_package");
    expect(applySource).toContain("library_components_package");
    expect(applySource).toContain("Idempotency key already belongs to a different");
    expect(applySource).toContain("buildComponentCreatePayload");
    expect(applySource).toContain("applyComponentCreateDraft");
    expect(applySource).not.toContain("create_ai_package_library_components_with_history");
    expect(applySource).not.toContain("createAiAuditSupabaseClient");
  });
});
