import { describe, expect, it } from "vitest";

import {
  buildProjectPublicationSnapshot,
  sanitizeProjectPublicationSnapshotForPublicRead,
} from "@/lib/publication/snapshot";
import type { ProjectPublicationSnapshot } from "@/lib/publication/types";

type SnapshotInput = Parameters<typeof buildProjectPublicationSnapshot>[0];
type SnapshotRowInput = SnapshotInput["estimates"][number]["rows"][number];

function baseProject(): SnapshotInput["project"] {
  return {
    id: "project-1",
    name: "Valencia Residence",
    projectCode: "VR-001",
    clientName: "Client Family",
    location: "Quezon City",
    currencyCode: "PHP",
  };
}

describe("share snapshot redaction", () => {
  it("does not serialize live component trust fields into generated snapshot_json rows", () => {
    const privateTrustRow: SnapshotRowInput & Record<string, unknown> = {
      id: "row-1",
      description: "Custom vanity",
      designation: "CV-01",
      discipline: "Architectural",
      material: "Custom vanity",
      quantity: 1,
      unit: "lot",
      unitCost: 25_000,
      miscCost: 500,
      contingencyPercentage: 10,
      pricing_source: "Private supplier quote URL",
      pricingSource: "Private supplier quote label",
      confidence: "supplier quote under NDA",
      priceHistory: [{ summary: "Private historical cost" }],
      sourceSnapshot: {
        pricing_source: "Private source snapshot URL",
        confidence: "Internal confidence note",
      },
    };

    const snapshot = buildProjectPublicationSnapshot({
      generatedAt: "2026-06-22T00:00:00.000Z",
      project: baseProject(),
      estimates: [
        {
          id: "estimate-1",
          name: "Main Estimate",
          sheetCode: "ES-001",
          updatedAt: "2026-06-22T00:00:00.000Z",
          rows: [privateTrustRow],
        },
      ],
    });

    const serialized = JSON.stringify(snapshot);
    expect(snapshot.estimates[0]?.rows[0]).toEqual({
      id: "row-1",
      description: "Custom vanity",
      designation: "CV-01",
      discipline: "Architectural",
      material: "Custom vanity",
      quantity: 1,
      unit: "lot",
      rowTotal: 28_000,
      imageUrl: null,
      nodeId: null,
    });
    expect(serialized).not.toContain("pricing_source");
    expect(serialized).not.toContain("pricingSource");
    expect(serialized).not.toContain("confidence");
    expect(serialized).not.toContain("priceHistory");
    expect(serialized).not.toContain("sourceSnapshot");
    expect(serialized).not.toContain("Private supplier quote");
    expect(serialized).not.toContain("Internal confidence note");
  });

  it("strips legacy trust fields before public snapshot reads", () => {
    const legacySnapshot = {
      schemaVersion: 1,
      generatedAt: "2026-06-22T00:00:00.000Z",
      project: baseProject(),
      estimateCount: 1,
      rowCount: 1,
      totalCost: 28_000,
      estimates: [
        {
          id: "estimate-1",
          name: "Main Estimate",
          sheetCode: "ES-001",
          updatedAt: "2026-06-22T00:00:00.000Z",
          rowCount: 1,
          totalCost: 28_000,
          rows: [
            {
              id: "row-1",
              description: "Custom vanity",
              designation: "CV-01",
              discipline: "Architectural",
              material: "Custom vanity",
              quantity: 1,
              unit: "lot",
              rowTotal: 28_000,
              imageUrl: null,
              nodeId: null,
              unitCost: 25_000,
              miscCost: 500,
              contingencyPercentage: 10,
              pricing_source: "Legacy private quote URL",
              pricingSource: "Legacy private quote label",
              confidence: "Legacy internal confidence",
              priceHistory: [{ summary: "Legacy private price" }],
              sourceSnapshot: {
                pricing_source: "Legacy source snapshot URL",
                confidence: "Legacy source confidence",
              },
            },
          ],
        },
      ],
    } as unknown as ProjectPublicationSnapshot;

    const sanitized = sanitizeProjectPublicationSnapshotForPublicRead(legacySnapshot);
    const serialized = JSON.stringify(sanitized);

    expect(sanitized.estimates[0]?.rows[0]).toEqual({
      id: "row-1",
      description: "Custom vanity",
      designation: "CV-01",
      discipline: "Architectural",
      material: "Custom vanity",
      quantity: 1,
      unit: "lot",
      rowTotal: 28_000,
      imageUrl: null,
      nodeId: null,
    });
    expect(serialized).not.toContain("unitCost");
    expect(serialized).not.toContain("miscCost");
    expect(serialized).not.toContain("contingencyPercentage");
    expect(serialized).not.toContain("pricing_source");
    expect(serialized).not.toContain("pricingSource");
    expect(serialized).not.toContain("confidence");
    expect(serialized).not.toContain("priceHistory");
    expect(serialized).not.toContain("sourceSnapshot");
    expect(serialized).not.toContain("Legacy private");
    expect(serialized).not.toContain("Legacy source");
  });
});
