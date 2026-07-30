import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "src/lib/component-library/template-propagation-d1.ts"),
  "utf8",
);

describe("template propagation sidecar concurrency", () => {
  it("snapshots every mutable sidecar family and guards the exact state before replacement", () => {
    const guardIndex = source.indexOf("template_propagation_sidecar_concurrency_guard");
    const firstDeleteIndex = source.indexOf("DELETE FROM estimate_accessory_edges", guardIndex);

    expect(source).toContain("loadPropagationSidecarState");
    expect(source).toContain("'contributionScopes'");
    expect(source).toContain("'variantSelections'");
    expect(source).toContain("'alternatives'");
    expect(source).toContain("'optionalItems'");
    expect(source).toContain("'accessoryEdges'");
    expect(source).toContain("(SELECT value FROM current_sidecars) = json(?)");
    expect(guardIndex).toBeGreaterThan(-1);
    expect(firstDeleteIndex).toBeGreaterThan(guardIndex);
  });

  it("only replaces relationships wholly owned by linked instance rows", () => {
    expect(source).toMatch(/DELETE FROM estimate_accessory_edges[\s\S]*?parent_row_item_id IN[\s\S]*?AND child_row_item_id IN[\s\S]*?AND created_by IS \?/);
    expect(source).toMatch(/DELETE FROM estimate_alternative_groups[\s\S]*?NOT EXISTS \([\s\S]*?external_member\.row_item_id NOT IN/);
    expect(source).toMatch(/DELETE FROM estimate_row_variant_selections[\s\S]*?AND selected_by IS \?/);
  });

  it("fails closed instead of cascading removal through user-owned relationships", () => {
    const ownershipGuard = source.slice(
      source.indexOf("WITH linked_rows(id) AS", source.indexOf("const statements")),
      source.indexOf("template_sidecar_removal_ownership_guard") + "template_sidecar_removal_ownership_guard".length,
    );

    expect(ownershipGuard).toContain("removed_rows(id)");
    expect(ownershipGuard).toContain("estimate_accessory_edges AS edge");
    expect(ownershipGuard).toContain("edge.created_by IS ?");
    expect(ownershipGuard).toContain("estimate_alternative_groups AS group_row");
    expect(ownershipGuard).toContain("external_member.row_item_id NOT IN");
    expect(ownershipGuard).toContain("ELSE json('')");
  });

  it("projects and concurrency-guards the selected option brand", () => {
    expect(source).toContain("option.brand_id AS option_brand_id");
    expect(source).toContain("option.brand AS option_brand");
    expect(source).toContain("brandId: source.option_brand_id");
    expect(source).toContain("brand: source.option_brand");
    expect(source).toContain("option.brand_id IS json_extract(expected.value, '$.optionBrandId')");
    expect(source).toContain("brand_id = excluded.brand_id");
  });
});
