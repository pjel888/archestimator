import { describe, expect, it } from "vitest";

import { buildProjectPublicationSnapshot } from "@/lib/publication/snapshot";

describe("project publication snapshot builder (Shared Link V2)", () => {
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
      imageUrl: null,
      nodeId: null,
    });
    expect(snapshot.totalCost).toBe(2300);
    expect(JSON.stringify(snapshot)).not.toContain("Internal supplier");
    expect(JSON.stringify(snapshot)).not.toContain("library-item-1");
    expect(JSON.stringify(snapshot)).not.toContain("internalNote");
  });

  it("keeps only safe public share image URLs in snapshots", () => {
    const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";

    try {
      const safeSupabaseCover = "https://example.supabase.co/storage/v1/object/public/component-images/ws/user/components/cover.webp";
      const snapshot = buildProjectPublicationSnapshot({
        generatedAt: "2026-05-27T00:00:00.000Z",
        project: {
          id: "project-1",
          name: "Valencia Residence",
          projectCode: "VR-001",
          clientName: "Client Family",
          location: "Quezon City",
          currencyCode: "PHP",
          coverImageUrl: safeSupabaseCover,
        },
        estimates: [
          {
            id: "estimate-1",
            name: "Main Estimate",
            sheetCode: "ES-001",
            updatedAt: "2026-05-26T00:00:00.000Z",
            rows: [
              {
                id: "safe-local-row",
                description: "Local thumbnail",
                designation: "A",
                discipline: "Architectural",
                material: "Sofa",
                quantity: 1,
                unit: "pc",
                unitCost: 1,
                miscCost: 0,
                contingencyPercentage: 0,
                imageUrl: "/component-thumbnails/lib-sofa.jpg",
              },
              {
                id: "unsafe-remote-row",
                description: "Tracker thumbnail",
                designation: "B",
                discipline: "Architectural",
                material: "Tracker",
                quantity: 1,
                unit: "pc",
                unitCost: 1,
                miscCost: 0,
                contingencyPercentage: 0,
                imageUrl: "https://tracker.example/pixel.svg?recipient=client",
              },
              {
                id: "unsafe-data-row",
                description: "Data thumbnail",
                designation: "C",
                discipline: "Architectural",
                material: "Data",
                quantity: 1,
                unit: "pc",
                unitCost: 1,
                miscCost: 0,
                contingencyPercentage: 0,
                imageUrl: "data:image/svg+xml,<svg></svg>",
              },
              {
                id: "unsafe-supabase-query-row",
                description: "Same-origin tracker thumbnail",
                designation: "D",
                discipline: "Architectural",
                material: "Tracker",
                quantity: 1,
                unit: "pc",
                unitCost: 1,
                miscCost: 0,
                contingencyPercentage: 0,
                imageUrl: `${safeSupabaseCover}?recipient=client`,
              },
              {
                id: "unsafe-supabase-svg-row",
                description: "Same-origin SVG thumbnail",
                designation: "E",
                discipline: "Architectural",
                material: "SVG",
                quantity: 1,
                unit: "pc",
                unitCost: 1,
                miscCost: 0,
                contingencyPercentage: 0,
                imageUrl: "https://example.supabase.co/storage/v1/object/public/component-images/ws/user/pixel.svg",
              },
              {
                id: "unsafe-project-image-row",
                description: "Private project thumbnail",
                designation: "F",
                discipline: "Architectural",
                material: "Project cover",
                quantity: 1,
                unit: "pc",
                unitCost: 1,
                miscCost: 0,
                contingencyPercentage: 0,
                imageUrl: "https://example.supabase.co/storage/v1/object/public/component-images/ws/user/project-images/project-1/cover.webp",
              },
            ],
          },
        ],
      });

      expect(snapshot.project.coverImageUrl).toBe(safeSupabaseCover);
      expect(snapshot.estimates[0]?.rows[0]?.imageUrl).toBe("/component-thumbnails/lib-sofa.jpg");
      expect(snapshot.estimates[0]?.rows[1]?.imageUrl).toBeNull();
      expect(snapshot.estimates[0]?.rows[2]?.imageUrl).toBeNull();
      expect(snapshot.estimates[0]?.rows[3]?.imageUrl).toBeNull();
      expect(snapshot.estimates[0]?.rows[4]?.imageUrl).toBeNull();
      expect(snapshot.estimates[0]?.rows[5]?.imageUrl).toBeNull();

      const unsafeCoverSnapshot = buildProjectPublicationSnapshot({
        generatedAt: "2026-05-27T00:00:00.000Z",
        project: {
          id: "project-1",
          name: "Valencia Residence",
          projectCode: "VR-001",
          clientName: "Client Family",
          location: "Quezon City",
          currencyCode: "PHP",
          coverImageUrl: "https://tracker.example/cover.svg",
        },
        estimates: [],
      });
      expect(unsafeCoverSnapshot.project.coverImageUrl).toBeNull();
      const privateProjectCoverSnapshot = buildProjectPublicationSnapshot({
        generatedAt: "2026-05-27T00:00:00.000Z",
        project: {
          id: "project-1",
          name: "Valencia Residence",
          projectCode: "VR-001",
          clientName: "Client Family",
          location: "Quezon City",
          currencyCode: "PHP",
          coverImageUrl: "/api/projects/images?path=workspace/user/project-images/project-1/cover.webp",
        },
        estimates: [],
      });
      expect(privateProjectCoverSnapshot.project.coverImageUrl).toBeNull();
    } finally {
      if (originalSupabaseUrl === undefined) {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      } else {
        process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
      }
    }
  });
});
