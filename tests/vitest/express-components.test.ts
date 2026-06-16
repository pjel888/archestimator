import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  classifyEstimateRowSource,
  createExpressComponentMetadata,
  isExpressComponentProjectFolderEnabled,
  isExpressComponentsAuthoringEnabled,
  isLegacyBlankEstimateRow,
  readExpressComponentMetadata,
  withCopiedExpressComponentMetadata,
  withExpressComponentMetadata,
} from "@/lib/estimates/express-components";

const baseRow = {
  material: "Custom vanity",
  description: "Manual estimate row",
  supplier: "Local fabricator",
  unit: "lot",
  quantity: 1,
  unitCost: 100,
  miscCost: 0,
  sourceLibraryItemId: null,
  sourceSnapshot: null,
  linkState: "unlinked",
  metadata: {},
};

function readMigrationBySuffix(suffix: string): string {
  const migrationsDir = join(process.cwd(), "supabase/migrations");
  const filename = readdirSync(migrationsDir)
    .filter((entry) => entry.endsWith(suffix))
    .sort()
    .at(-1);
  if (!filename) {
    throw new Error(`Missing migration ending in ${suffix}`);
  }
  return readFileSync(join(migrationsDir, filename), "utf8");
}

describe("express component estimate-row helpers", () => {
  it("creates and reads typed metadata.expressComponent without dropping existing metadata", () => {
    const metadata = withExpressComponentMetadata({ notes: "keep" }, { componentId: "door-fast", componentName: "Fast door" });

    expect(metadata.notes).toBe("keep");
    expect(metadata.expressComponent).toEqual({
      kind: "express",
      schemaVersion: 1,
      componentId: "door-fast",
      componentName: "Fast door",
    });
    expect(readExpressComponentMetadata(metadata)?.componentName).toBe("Fast door");
    expect(createExpressComponentMetadata({ sourceLabel: "Express" }).schemaVersion).toBe(1);
  });

  it("rekeys row-lifetime express ids when express metadata is copied", () => {
    const metadata = withExpressComponentMetadata({ scopeStatus: "included" }, { id: "old-id", componentName: "Fast row" });
    const copied = withCopiedExpressComponentMetadata(
      metadata,
      { sourceTemplateRowId: "template-row-1" },
      () => "new-id",
    );

    expect(copied.scopeStatus).toBe("included");
    expect(copied.sourceTemplateRowId).toBe("template-row-1");
    expect(copied.expressComponent).toMatchObject({
      kind: "express",
      schemaVersion: 1,
      id: "new-id",
      componentName: "Fast row",
    });
  });

  it("classifies express rows ahead of legacy linked/detached/manual states", () => {
    expect(classifyEstimateRowSource({ ...baseRow, metadata: withExpressComponentMetadata({}, { componentId: "x" }) })).toBe(
      "express",
    );
    expect(classifyEstimateRowSource({ ...baseRow, sourceLibraryItemId: "library-1", linkState: "linked-clean" })).toBe(
      "linked-library",
    );
    expect(classifyEstimateRowSource({ ...baseRow, sourceSnapshot: { sourceLibraryItemId: "old-library-1" }, linkState: "detached" })).toBe(
      "detached-library",
    );
    expect(classifyEstimateRowSource(baseRow)).toBe("source-less-manual");
  });

  it("keeps older catalog provenance rows in the library bucket", () => {
    expect(classifyEstimateRowSource({ ...baseRow, source: "library" })).toBe("linked-library");
    expect(classifyEstimateRowSource({ ...baseRow, source: "supplier" })).toBe("linked-library");
  });

  it("keeps legacy blanks distinct from source-less manual rows", () => {
    const blank = {
      material: "",
      description: " ",
      supplier: "",
      unit: "",
      quantity: 0,
      unitCost: 0,
      miscCost: 0,
      sourceLibraryItemId: null,
      sourceSnapshot: null,
      linkState: "unlinked",
      metadata: {},
    };

    expect(isLegacyBlankEstimateRow(blank)).toBe(true);
    expect(classifyEstimateRowSource(blank)).toBe("legacy-blank");
    expect(isLegacyBlankEstimateRow({ ...blank, material: "Manual allowance" })).toBe(false);
    expect(classifyEstimateRowSource({ ...blank, material: "Manual allowance" })).toBe("source-less-manual");
  });

  it("selects and maps estimate row metadata in the repository contract", () => {
    const repository = readFileSync(join(process.cwd(), "src/lib/repositories/estimate-repository.ts"), "utf8");

    expect(repository).toContain("metadata");
    expect(repository).toContain("readEstimateRowMetadata(row.metadata)");
    expect(repository).toContain("metadata: readEstimateRowMetadata(row.metadata) as Json");
  });

  it("keeps copied express-row rekeying in the database insert path", () => {
    const migration = readMigrationBySuffix("_express_components_foundation.sql");

    expect(migration).toContain("rekey_copied_express_component_row_metadata");
    expect(migration).toContain("new.metadata->'expressComponent'->>'kind'");
    expect(migration).toContain("sourceTemplateRowId");
    expect(migration).toContain("sourceRowId");
    expect(migration).toContain("duplicatedFromRowId");
    expect(migration).toContain("jsonb_set");
    expect(migration).toContain("gen_random_uuid()");
  });

  it("defines atomic promotion through one database RPC", () => {
    const migration = readMigrationBySuffix("_express_components_foundation.sql");

    expect(migration).toContain("create or replace function public.promote_express_row_to_library_component");
    expect(migration).toContain("public.create_cost_library_component");
    expect(migration).toContain("public.update_estimate_row_item_with_history");
    expect(migration).toContain("coalesce(source_row.source_snapshot, '{}'::jsonb) || jsonb_build_object");
    expect(migration).toContain("sourceUrl', nullif(source_row.source_snapshot->>'sourceUrl', '')");
    expect(migration).toContain("coalesce(source_row.metadata->'expressComponent'->>'kind', '') <> 'express'");
    expect(migration).toContain("target_library_folder_id");
    expect(migration).toContain("grant execute on function public.promote_express_row_to_library_component");
  });

  it("keeps client flag reads inlinable and direct-RPC insert edit-gated", () => {
    const helper = readFileSync(join(process.cwd(), "src/lib/estimates/express-components.ts"), "utf8");
    const migration = readMigrationBySuffix("_express_components_foundation.sql");

    expect(helper).toContain("process.env.NEXT_PUBLIC_EXPRESS_COMPONENTS_ENABLED");
    expect(helper).not.toContain("env[EXPRESS_COMPONENTS_FLAG], false");
    expect(migration).toContain("public.assert_can_edit_estimate_for_history(target_project_id, target_estimate_id, acting_user_id)");
  });

  it("defaults express authoring and project projection on while honoring explicit off flags", () => {
    expect(isExpressComponentsAuthoringEnabled({})).toBe(true);
    expect(isExpressComponentProjectFolderEnabled({})).toBe(true);
    expect(isExpressComponentsAuthoringEnabled({ NEXT_PUBLIC_EXPRESS_COMPONENTS_ENABLED: "false" })).toBe(false);
    expect(isExpressComponentProjectFolderEnabled({ EXPRESS_COMPONENT_PROJECT_FOLDER_ENABLED: "off" })).toBe(false);
  });

  it("removes express metadata during promotion so promoted rows are linked library rows", () => {
    const migration = readMigrationBySuffix("_express_components_foundation.sql");

    expect(migration).toContain("source_row.source_library_item_id is not null");
    expect(migration).toContain("source_row.source_snapshot->>'sourceType', '') = 'promoted_express_component");
    expect(migration).toContain("(coalesce(source_row.metadata, '{}'::jsonb) - 'expressComponent') || jsonb_build_object");
  });

  it("promotes project-specific rows by creating a fresh library component", () => {
    const migration = readMigrationBySuffix("_promote_detached_estimate_rows_to_library.sql");

    expect(migration).toContain("is_detached_project_row := source_row.source_library_item_id is null");
    expect(migration).toContain("or coalesce(source_row.metadata->'projectComponentProjection'->>'classification', '') = 'detached-library'");
    expect(migration).toContain("public.create_cost_library_component");
    expect(migration).toContain("else 'project-specific-component-promotion'");
    expect(migration).toContain("'createdFrom', promotion_kind");
    expect(migration).toContain("else 'promoted_project_specific_component'");
    expect(migration).toContain("'sourceLibraryItemId', promoted_item_id");
    expect(migration).toContain("'promotedFromLinkState', source_row.link_state");
  });

  it("keeps the trigger-only rekey helper out of the exposed authenticated RPC surface", () => {
    const hardening = readMigrationBySuffix("_harden_express_trigger_execute.sql");

    expect(hardening).toContain("rekey_copied_express_component_row_metadata()");
    expect(hardening).toContain("from public, anon, authenticated");
  });

  it("keeps a structured observability seam for rollout gates", () => {
    const telemetry = readFileSync(join(process.cwd(), "src/lib/estimates/express-components-telemetry.ts"), "utf8");

    expect(telemetry).toContain("[express-components]");
    expect(telemetry).toContain("\"insert_requested\"");
    expect(telemetry).toContain("\"save_requested\"");
    expect(telemetry).toContain("\"virtualization_disabled\"");
    expect(telemetry).toContain("\"promotion_succeeded\"");
  });
});
