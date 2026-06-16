import { describe, expect, it } from "vitest";

import { buildProjectPublicationSnapshot, sanitizeProjectPublicationSnapshotForPublicRead } from "@/lib/publication/snapshot";

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
      rowTotal: 2300,
      imageUrl: null,
      nodeId: null,
    });
    expect(snapshot.totalCost).toBe(2300);
    expect(JSON.stringify(snapshot)).not.toContain("unitCost");
    expect(JSON.stringify(snapshot)).not.toContain("miscCost");
    expect(JSON.stringify(snapshot)).not.toContain("contingencyPercentage");
    expect(JSON.stringify(snapshot)).not.toContain("Internal supplier");
    expect(JSON.stringify(snapshot)).not.toContain("library-item-1");
    expect(JSON.stringify(snapshot)).not.toContain("internalNote");
  });

  it("strips legacy internal rate fields before public snapshot reads", () => {
    const sanitized = sanitizeProjectPublicationSnapshotForPublicRead({
      schemaVersion: 1,
      generatedAt: "2026-05-27T00:00:00.000Z",
      project: {
        id: "project-1",
        name: "Valencia Residence",
        projectCode: "VR-001",
        clientName: "Client Family",
        location: "Quezon City",
        currencyCode: "PHP",
      },
      estimateCount: 1,
      rowCount: 1,
      totalCost: 2300,
      estimates: [
        {
          id: "estimate-1",
          name: "Main Estimate",
          sheetCode: "ES-001",
          updatedAt: "2026-05-26T00:00:00.000Z",
          rowCount: 1,
          totalCost: 2300,
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
              rowTotal: 2300,
              imageUrl: null,
              nodeId: null,
            },
          ],
        },
      ],
    } as unknown as Parameters<typeof sanitizeProjectPublicationSnapshotForPublicRead>[0]);

    expect(sanitized.estimates[0]?.rows[0]).toEqual({
      id: "row-1",
      description: "Concrete works",
      designation: "CW-01",
      discipline: "Structural",
      material: "Concrete",
      quantity: 2,
      unit: "cu.m",
      rowTotal: 2300,
      imageUrl: null,
      nodeId: null,
    });
    expect(JSON.stringify(sanitized)).not.toContain("unitCost");
    expect(JSON.stringify(sanitized)).not.toContain("miscCost");
    expect(JSON.stringify(sanitized)).not.toContain("contingencyPercentage");
  });

  it("carries safe express component image URLs into publication snapshot rows", () => {
    const snapshot = buildProjectPublicationSnapshot({
      generatedAt: "2026-06-15T00:00:00.000Z",
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
          updatedAt: "2026-06-15T00:00:00.000Z",
          rows: [
            {
              id: "express-row-1",
              description: "Inline-authored vanity",
              designation: "",
              discipline: "Unspecified",
              material: "Express custom vanity",
              quantity: 1,
              unit: "lot",
              unitCost: 12_000,
              miscCost: 750,
              contingencyPercentage: 10,
              imageUrl: "/component-thumbnails/lib-vanity.jpg",
            },
          ],
        },
      ],
    });

    expect(snapshot.estimates[0]?.rows[0]).toMatchObject({
      id: "express-row-1",
      material: "Express custom vanity",
      rowTotal: 13_950,
      imageUrl: "/component-thumbnails/lib-vanity.jpg",
    });
  });

  it("builds v1.2 estimate-tab snapshots while preserving estimate-level legacy rows", () => {
    const snapshot = buildProjectPublicationSnapshot({
      generatedAt: "2026-06-13T00:00:00.000Z",
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
          updatedAt: "2026-06-13T00:00:00.000Z",
          tabs: [
            { id: "tab-base", name: "Base", sortOrder: 0, isDefault: true },
            { id: "tab-alt", name: "Alternates", sortOrder: 1, isDefault: false },
          ],
          nodes: [
            { id: "node-base", name: "Base Area", kind: "area", parentId: null, sortOrder: 0, estimateTabId: "tab-base" },
            { id: "node-alt", name: "Alternate Area", kind: "area", parentId: null, sortOrder: 0, estimateTabId: "tab-alt" },
          ],
          rows: [
            {
              id: "row-base",
              nodeId: "node-base",
              description: "Base concrete",
              designation: "BASE-01",
              discipline: "Structural",
              material: "Concrete",
              quantity: 2,
              unit: "cu.m",
              unitCost: 1000,
              miscCost: 0,
              contingencyPercentage: 0,
            },
            {
              id: "row-alt",
              nodeId: "node-alt",
              description: "Alternate millwork",
              designation: "ALT-01",
              discipline: "Joinery",
              material: "Oak",
              quantity: 1,
              unit: "lot",
              unitCost: 5000,
              miscCost: 250,
              contingencyPercentage: 10,
            },
          ],
        },
      ],
    });

    const estimate = snapshot.estimates[0];

    expect(snapshot.schemaVersion).toBe(1.2);
    expect(estimate?.rowCount).toBe(2);
    expect(estimate?.rows.map((row) => row.id)).toEqual(["row-base", "row-alt"]);
    expect(estimate?.rows.map((row) => row.tabId)).toEqual(["tab-base", "tab-alt"]);
    expect(estimate?.treeNodes?.map((node) => [node.id, node.tabId])).toEqual([
      ["node-base", "tab-base"],
      ["node-alt", "tab-alt"],
    ]);
    expect(estimate?.tabs?.map((tab) => [tab.id, tab.rowCount, tab.totalCost])).toEqual([
      ["tab-base", 1, 2000],
      ["tab-alt", 1, 5750],
    ]);
    expect(estimate?.tabs?.[0]?.rows.map((row) => row.id)).toEqual(["row-base"]);
    expect(estimate?.tabs?.[1]?.treeNodes?.map((node) => node.id)).toEqual(["node-alt"]);
    expect(snapshot.totalCost).toBe(7750);
  });

  it("excludes rows and nodes from tabs that are absent from the active publication tab set", () => {
    const snapshot = buildProjectPublicationSnapshot({
      generatedAt: "2026-06-13T00:00:00.000Z",
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
          updatedAt: "2026-06-13T00:00:00.000Z",
          tabs: [{ id: "tab-base", name: "Base", sortOrder: 0, isDefault: true }],
          nodes: [
            { id: "node-base", name: "Base Area", kind: "area", parentId: null, sortOrder: 0, estimateTabId: "tab-base" },
            { id: "node-archived", name: "Archived Area", kind: "area", parentId: null, sortOrder: 1, estimateTabId: "tab-archived" },
          ],
          rows: [
            {
              id: "row-base",
              nodeId: "node-base",
              description: "Base concrete",
              designation: "BASE-01",
              discipline: "Structural",
              material: "Concrete",
              quantity: 2,
              unit: "cu.m",
              unitCost: 1000,
              miscCost: 0,
              contingencyPercentage: 0,
            },
            {
              id: "row-archived",
              nodeId: "node-archived",
              description: "Archived allowance",
              designation: "ARCH-01",
              discipline: "Hidden",
              material: "Hidden material",
              quantity: 1,
              unit: "lot",
              unitCost: 5000,
              miscCost: 250,
              contingencyPercentage: 10,
            },
          ],
        },
      ],
    });

    const estimate = snapshot.estimates[0];

    expect(estimate?.rowCount).toBe(1);
    expect(estimate?.totalCost).toBe(2000);
    expect(estimate?.rows.map((row) => row.id)).toEqual(["row-base"]);
    expect(estimate?.treeNodes?.map((node) => node.id)).toEqual(["node-base"]);
    expect(estimate?.tabs?.[0]?.rows.map((row) => row.id)).toEqual(["row-base"]);
    expect(estimate?.tabs?.[0]?.treeNodes?.map((node) => node.id)).toEqual(["node-base"]);
    expect(JSON.stringify(snapshot)).not.toContain("row-archived");
    expect(JSON.stringify(snapshot)).not.toContain("node-archived");
    expect(snapshot.totalCost).toBe(2000);
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
