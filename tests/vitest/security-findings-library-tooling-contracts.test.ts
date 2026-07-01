import { describe, expect, it } from "vitest";

import { latestFunction, latestMigrationBySuffix, read } from "./security-findings-test-helpers";

describe("Codex component-library and tooling hardening contracts", () => {
  it("keeps library folder mutations limited to workspace editors", () => {
    const folderActions = read("src/lib/component-library/actions.ts");
    const libraryFolderHardening = latestMigrationBySuffix("_harden_library_folder_editor_access.sql");
    const transactionalDeleteMigration = latestMigrationBySuffix("_transactional_library_folder_delete.sql");
    const latestReorderRpc = latestFunction("reorder_library_folders");
    const latestDeleteRpc = latestFunction("delete_library_folder");

    expect(folderActions).toContain("assertCanManageLibraryFolders");
    expect(folderActions).toContain("isWorkspaceEditorInD1");
    expect(folderActions).toContain("DELETE FROM library_folders");
    expect(folderActions).not.toContain(".update({ parent_id: update.parentId, sort_order: update.sortOrder })");
    expect(folderActions).not.toContain('supabase.rpc("delete_library_folder"');
    expect(libraryFolderHardening).toContain('drop policy if exists "members can manage library folders" on public.library_folders');
    expect(libraryFolderHardening).toContain('create policy "members can view library folders" on public.library_folders');
    expect(libraryFolderHardening).toContain('create policy "workspace editors can insert library folders" on public.library_folders');
    expect(libraryFolderHardening).toContain('create policy "workspace editors can update library folders" on public.library_folders');
    expect(libraryFolderHardening).toContain('create policy "workspace editors can delete library folders" on public.library_folders');
    expect(libraryFolderHardening).toContain("revoke all on public.library_folders from authenticated");
    expect(libraryFolderHardening).toContain("grant select, insert, update, delete on public.library_folders to authenticated");
    expect(latestReorderRpc).toContain("public.is_workspace_editor(target_workspace_id) is not true");
    expect(latestReorderRpc).not.toContain("not public.is_workspace_member(target_workspace_id)");
    expect(transactionalDeleteMigration).toContain("grant execute on function public.delete_library_folder(uuid, uuid) to authenticated");
    expect(latestDeleteRpc).toContain("public.is_workspace_editor(target_workspace_id) is not true");
    expect(latestDeleteRpc).toContain("for update");
    expect(latestDeleteRpc).toContain("set constraints library_folders_workspace_parent_sort_key deferred");
    expect(latestDeleteRpc).toContain("max_sibling_sort_order + (child_order.child_rank * 10)");
    expect(latestDeleteRpc.indexOf("update public.library_folders folder")).toBeGreaterThanOrEqual(0);
    expect(latestDeleteRpc.indexOf("delete from public.library_folders folder")).toBeGreaterThan(
      latestDeleteRpc.indexOf("update public.library_folders folder"),
    );
  });

  it("pins MCP tooling package specs instead of auto-resolving floating uvx packages", () => {
    const expectedPackage = "code-review-graph==2.3.5";
    const rootMcp = JSON.parse(read(".mcp.json"));
    const cursorMcp = JSON.parse(read(".cursor/mcp.json"));
    const codexHooks = JSON.parse(read(".codex/hooks.json"));
    const codexConfig = read(".codex/config.toml");
    const claudeSettings = JSON.parse(read(".claude/settings.json"));
    const hookCommands = Object.values(codexHooks.hooks)
      .flatMap((entries) => entries as Array<{ hooks?: Array<{ command?: string }> }>)
      .flatMap((entry) => entry.hooks ?? [])
      .map((hook) => hook.command ?? "");

    for (const server of [rootMcp.mcpServers["code-review-graph"], cursorMcp.mcpServers["code-review-graph"]]) {
      expect(server.command).toBe("uvx");
      expect(server.args).toEqual([expectedPackage, "serve"]);
      expect(server.args).not.toContain("code-review-graph");
    }

    expect(codexConfig).toContain(`"${expectedPackage}"`);
    expect(codexConfig).toContain("hooks = false");
    expect(codexConfig).not.toContain("[hooks.state.");
    expect(codexConfig).not.toMatch(/^\s*"code-review-graph",\s*$/m);
    expect(codexHooks.hooks).toEqual({});
    expect(hookCommands).toEqual([]);
    expect(claudeSettings.hooks).toEqual({});
    expect(
      hookCommands.filter(
        (command) =>
          command.includes("code-review-graph update --skip-flows") &&
          !command.includes(`uvx --from ${expectedPackage} code-review-graph update --skip-flows`),
      ),
    ).toEqual([]);
    expect(
      hookCommands.filter(
        (command) =>
          command.includes("code-review-graph status") &&
          !command.includes(`uvx --from ${expectedPackage} code-review-graph status`),
      ),
    ).toEqual([]);
  });

  it("keeps local agent startup/edit loops hook-free and explicit", () => {
    const claudeSettings = JSON.parse(read(".claude/settings.json"));
    const codexHooks = JSON.parse(read(".codex/hooks.json"));
    const codexConfig = read(".codex/config.toml");
    const claudeGuide = read("CLAUDE.md");
    const serializedAgentConfig = JSON.stringify({ claudeSettings, codexHooks });

    expect(claudeSettings.hooks).toEqual({});
    expect(codexHooks.hooks).toEqual({});
    expect(codexConfig).toContain("hooks = false");
    expect(serializedAgentConfig).not.toContain("code-review-graph update");
    expect(serializedAgentConfig).not.toContain("code-review-graph status");
    expect(serializedAgentConfig).not.toContain("impeccable/scripts/hook.mjs");
    expect(claudeGuide).toContain("Hooks are disabled for speed");
    expect(claudeGuide).toContain("bun run graph:reindex");
  });

  it("uses the repo-pinned Impeccable detector instead of mutable npx resolution", () => {
    const packageJson = read("package.json");
    const ciWorkflow = read(".github/workflows/ci.yml");
    const validationMatrix = read(".ai/00_system/VALIDATION_MATRIX.md");
    const floatingCommand = ["npx", "impeccable", "detect", "--strict"].join(" ");

    expect(packageJson).toContain('"lint:design": "node .agents/skills/impeccable/scripts/detect.mjs --strict src/components"');
    expect(packageJson).not.toContain(floatingCommand);
    expect(ciWorkflow).toContain("run: bun run lint:design");
    expect(ciWorkflow).not.toContain(floatingCommand);
    expect(validationMatrix).toContain("bun run lint:design");
    expect(validationMatrix).not.toContain(floatingCommand);
  });

  it("keeps estimate-template tables readable by members but writable only by workspace editors", () => {
    const templateRlsHardening = latestMigrationBySuffix("_harden_estimate_template_editor_rls.sql");

    expect(templateRlsHardening).toContain('drop policy if exists "members can manage estimate templates" on public.estimate_templates');
    expect(templateRlsHardening).toContain('drop policy if exists "members can manage estimate template nodes" on public.estimate_template_nodes');
    expect(templateRlsHardening).toContain('drop policy if exists "members can manage estimate template row items" on public.estimate_template_row_items');
    expect(templateRlsHardening).toContain('create policy "members can view estimate templates" on public.estimate_templates');
    expect(templateRlsHardening).toContain("using (public.is_workspace_member(workspace_id))");
    expect(templateRlsHardening).toContain('create policy "workspace editors can insert estimate templates" on public.estimate_templates');
    expect(templateRlsHardening).toContain('create policy "workspace editors can update estimate templates" on public.estimate_templates');
    expect(templateRlsHardening).toContain('create policy "workspace editors can delete estimate templates" on public.estimate_templates');
    expect(templateRlsHardening).toContain('create policy "workspace editors can insert estimate template nodes" on public.estimate_template_nodes');
    expect(templateRlsHardening).toContain('create policy "workspace editors can update estimate template nodes" on public.estimate_template_nodes');
    expect(templateRlsHardening).toContain('create policy "workspace editors can delete estimate template nodes" on public.estimate_template_nodes');
    expect(templateRlsHardening).toContain('create policy "workspace editors can insert estimate template row items" on public.estimate_template_row_items');
    expect(templateRlsHardening).toContain('create policy "workspace editors can update estimate template row items" on public.estimate_template_row_items');
    expect(templateRlsHardening).toContain('create policy "workspace editors can delete estimate template row items" on public.estimate_template_row_items');
    expect(templateRlsHardening).toContain("public.is_workspace_editor(template.workspace_id)");
  });

  it("keeps component-library taxonomy seed IDs scoped per workspace", () => {
    const taxonomySeed = read("supabase/migrations/20260522064018_component_library_taxonomy_source.sql");
    const identityMigration = read("supabase/migrations/20260524141347_component_library_identity_variant_sku_brand_view.sql");
    const seedIdRepair = latestMigrationBySuffix("_workspace_scoped_component_seed_ids.sql");

    expect(taxonomySeed).toContain("create or replace function public.component_library_seed_uuid");
    expect(taxonomySeed).toContain("target_workspace_id::text || ':component-library:' || source_key");
    expect(taxonomySeed).toContain('public.component_library_seed_uuid(w.id, item."sourceId")');
    expect(taxonomySeed).toContain("item.metadata || jsonb_build_object('workspaceScopedSeed', true)");
    expect(taxonomySeed).not.toMatch(/select\s+item\.id,\s+w\.id/i);

    expect(seedIdRepair).toContain("select distinct on (legacy.metadata->>'sourceFixtureId')");
    expect(seedIdRepair).toContain("cross join legacy_seed_items");
    expect(seedIdRepair).toContain("public.component_library_seed_uuid(workspace.id, legacy.metadata->>'sourceFixtureId')");
    expect(seedIdRepair).toContain("update public.estimate_row_items row_item");
    expect(seedIdRepair).toContain("to_jsonb(relink_targets.replacement_item_id::text)");
    expect(seedIdRepair).toContain("lifecycle_state = 'archived'::public.component_lifecycle_state");
    expect(identityMigration).toContain("drop column if exists kind");
    expect(seedIdRepair).not.toContain("legacy.kind");
    expect(seedIdRepair).not.toMatch(/^\s*kind,\s*$/m);
    expect(seedIdRepair).not.toContain("kind = excluded.kind");
  });
});
