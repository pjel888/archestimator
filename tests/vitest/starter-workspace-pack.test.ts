import { describe, expect, it } from "vitest";

import {
  GUIDED_ESTIMATE_BLUEPRINT,
  GUIDED_SAMPLE_KIND,
  GUIDED_SAMPLE_VERSION,
  STARTER_PACK_MANIFEST,
  STARTER_PACK_VERSION,
  STARTER_REFERENCE_SOURCES,
  STARTER_USER_ASSET_KEYS,
  STARTER_WORKSPACE_ASSET_KEYS,
} from "@/lib/onboarding/starter-pack";

describe("starter workspace pack", () => {
  it("keeps the promised compact starter cardinality", () => {
    const estimateCount = STARTER_PACK_MANIFEST.projects.reduce(
      (count, project) => count + project.estimates.length,
      0,
    );

    expect(STARTER_PACK_VERSION).toBe(2);
    expect(GUIDED_SAMPLE_VERSION).toBe(2);
    expect(GUIDED_SAMPLE_KIND).toBe("estimate_sheet_foundations");
    expect(STARTER_PACK_MANIFEST.projects).toHaveLength(3);
    expect(estimateCount).toBe(4);
    expect(STARTER_PACK_MANIFEST.folders).toHaveLength(2);
    expect(STARTER_PACK_MANIFEST.components).toHaveLength(6);
    expect(STARTER_PACK_MANIFEST.templates).toHaveLength(3);
    expect(
      STARTER_PACK_MANIFEST.projects.flatMap((project) =>
        project.estimates.flatMap((estimate) =>
          estimate.nodes.flatMap((node) => node.rows)
        )
      ).length,
    ).toBeGreaterThanOrEqual(20);
  });

  it("uses unique deterministic keys and valid cross-asset references", () => {
    const workspaceKeys = [...STARTER_WORKSPACE_ASSET_KEYS];
    const componentKeys = new Set(
      STARTER_PACK_MANIFEST.components.map((component) => component.key),
    );
    const folderKeys = new Set([
      ...STARTER_PACK_MANIFEST.folders.map((folder) => folder.key),
      "protected.uncategorized",
    ]);

    expect(new Set(workspaceKeys).size).toBe(workspaceKeys.length);
    expect(new Set(STARTER_USER_ASSET_KEYS).size).toBe(
      STARTER_USER_ASSET_KEYS.length,
    );
    for (const component of STARTER_PACK_MANIFEST.components) {
      expect(folderKeys.has(component.folderKey)).toBe(true);
      expect(component.variants.filter((variant) => variant.isDefault)).toHaveLength(1);
      expect(component.pricingAsOf).toBe("2026-07-26");
      expect(component.expiresOn).toMatch(/^2026-/);
      expect(component.referenceIds.length).toBeGreaterThanOrEqual(2);
      expect(component.referenceIds.every((referenceId) =>
        STARTER_REFERENCE_SOURCES[referenceId].url.startsWith("https://")
      )).toBe(true);
      expect(component.taxBasis).toBe("EX_VAT");
      expect(component.vatRate).toBe(0.12);
    }
    for (const template of STARTER_PACK_MANIFEST.templates) {
      expect(template.sourceComponentKeys.length).toBeGreaterThanOrEqual(3);
      expect(
        template.sourceComponentKeys.every((componentKey) =>
          componentKeys.has(componentKey)
        ),
      ).toBe(true);
    }
  });

  it("separates worked examples from the user practice mutation", () => {
    const rows = GUIDED_ESTIMATE_BLUEPRINT.nodes.flatMap((node) => node.rows);
    const practiceRows = rows.filter((row) => row.source === "practice");
    const workedRows = rows.filter((row) => row.source === "worked");
    const projectRows = rows.filter((row) => row.source === "project");

    expect(practiceRows).toEqual([
      expect.objectContaining({
        key: "row.tile_practice",
        quantity: 18,
        unitCost: 0,
      }),
    ]);
    expect(workedRows.length).toBeGreaterThan(0);
    expect(projectRows.length).toBeGreaterThan(0);
    expect(
      rows.every((row) => row.quantity >= 0 && row.unitCost >= 0),
    ).toBe(true);
  });

  it("keeps tutorial, reference, and sandbox roles explicit", () => {
    expect(
      STARTER_PACK_MANIFEST.projects.map((project) => project.label),
    ).toEqual(["Tutorial", "Reference", "Sandbox"]);
    expect(
      STARTER_PACK_MANIFEST.projects.map((project) => project.currencyCode),
    ).toEqual(["PHP", "PHP", "PHP"]);
    expect(
      STARTER_PACK_MANIFEST.projects.map((project) => project.projectCode),
    ).toEqual(["PH-DEMO-CA", "PH-DEMO-HS", "PH-DEMO-SP"]);
    expect(
      STARTER_PACK_MANIFEST.projects.map((project) => project.location),
    ).toEqual([
      "Fictional Antipolo site, Rizal",
      "Fictional Quezon City tenancy, NCR",
      "Fictional Cebu City barangay site, Region VII",
    ]);
    expect(
      STARTER_PACK_MANIFEST.projects.every((project) =>
        project.sourceDisclaimer.includes("DEMO_ILLUSTRATIVE")
        && project.referenceIds.length >= 4
        && project.taxBasis === "EX_VAT"
        && project.vatRate === 0.12
      ),
    ).toBe(true);
  });
});
