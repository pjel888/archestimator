import { describe, expect, it } from "vitest";

import { buildProjectPublicationSnapshot } from "@/lib/publication/snapshot";

describe("project publication snapshot builder", () => {
  it("returns a client-safe immutable DTO with computed totals and no internal supplier/library metadata", () => {
    const snapshot = buildProjectPublicationSnapshot({
      generatedAt: "2026-05-27T00:00:00.000Z",
      project: {
        id: "project-1",
        name: "Valencia Residence",
        projectCode: "VR-001",
        clientName: "Client Family",
        location: "Quezon City",
        currencyCode: "PHP",
      },
      estimates: [
        {
          id: "estimate-1",
          name: "Main Estimate",
          sheetCode: "ES-001",
          updatedAt: "2026-05-26T00:00:00.000Z",
          rows: [
            {
              id: "row-1",
              description: "Concrete works",
              designation: "CW-01",
              discipline: "Structural",
              material: "Concrete",
              quantity: 2,
              unit: "cu.m",
              unitCost: 1000,
              miscCost: 100,
              contingencyPercentage: 10,
              supplier: "Internal supplier",
              supplierId: "supplier-1",
              sourceLibraryItemId: "library-item-1",
              sourceSnapshot: { confidential: true },
              metadata: { internalNote: "hide this" },
            },
          ],
        },
      ],
    });

    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.project).toEqual({
      id: "project-1",
      name: "Valencia Residence",
      projectCode: "VR-001",
      clientName: "Client Family",
      location: "Quezon City",
      currencyCode: "PHP",
    });
    expect(snapshot.estimates[0]?.rows[0]).toEqual({
      id: "row-1",
      description: "Concrete works",
      designation: "CW-01",
      discipline: "Structural",
      material: "Concrete",
      quantity: 2,
      unit: "cu.m",
      unitCost: 1000,
      miscCost: 100,
      contingencyPercentage: 10,
      rowTotal: 2300,
    });
    expect(snapshot.totalCost).toBe(2300);
    expect(JSON.stringify(snapshot)).not.toContain("Internal supplier");
    expect(JSON.stringify(snapshot)).not.toContain("library-item-1");
    expect(JSON.stringify(snapshot)).not.toContain("internalNote");
  });
});
