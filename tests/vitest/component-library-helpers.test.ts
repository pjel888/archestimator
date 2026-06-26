import { describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import {
  createComponent,
  createDefaultLibraryBundles,
  exportLibraryItemsToCsv,
  expandLibraryBundle,
  exportLibraryItemsToJson,
  filterComponents,
  getComponentImageUrl,
  getLibraryBundleTotal,
  getComponentDesignation,
  getComponentDiscipline,
  getStalenessLabel,
  getStalenessTone,
  groupComponents,
  parseLibraryCsv,
  parseLibraryJson,
  readLibraryPreferences,
  safeSetJsonStorage,
  searchComponents,
  sortComponents,
} from "@/components/workshop/component-library/helpers";
import { getComponentImageUrl as getActivityComponentImageUrl } from "@/components/workshop/estimate-sheet/activity-history-model";
import { estimateLibraryItems, type EstimateRowItem } from "@/components/workshop/estimate-tree-data";
import { sanitizeComponentSourceUrl } from "@/lib/component-library/source-url";

const base = {
  source: "library" as const,
  quantity: 1,
  subTotal: 0,
  miscCost: 0,
  totalItemCosts: 0,
  pricingSource: "test",
  pricingDate: "2026-05-18",
};

const items: EstimateRowItem[] = [
  { ...base, id: "a", material: "Porcelain Tile", description: "Floor finish with textured surface", supplier: "Wilcon Depot", unit: "sqm", itemCost: 950, category: "Finishes", discipline: "Architectural", tags: ["floor", "tile"], imageUrl: "tile.jpg", isFavorite: true, createdAt: "2026-05-17T00:00:00.000Z" },
  { ...base, id: "b", material: "Tile Adhesive", description: "Cement based adhesive", supplier: "ABC", unit: "bag", itemCost: 360, category: "Finishes", discipline: "Architectural", tags: ["adhesive"], createdAt: "2026-05-18T00:00:00.000Z" },
  { ...base, id: "c", material: "LED Downlight", description: "Recessed ceiling lighting", supplier: "Firefly", unit: "pc", itemCost: 420, category: "Lighting Fixtures", discipline: "Electrical", tags: ["ceiling", "light"], isCustom: true, lastUsedAt: "2026-05-18T01:00:00.000Z" },
];

describe("component library helpers", () => {
  it("searches across fields and ranks exact name matches first", () => {
    const results = searchComponents(items, "Porcelain Tile");
    expect(results.map((result) => result.item.id)).toEqual(["a"]);
    expect(searchComponents(items, "tile").map((result) => result.item.id)).toEqual(["b", "a"]);
    expect(searchComponents(items, "firefly")[0].item.id).toBe("c");
  });

  it("combines filters for category, price, favorite, custom, recent, and image state", () => {
    expect(filterComponents(items, { categories: ["Finishes"], suppliers: [], disciplines: [], designations: [], units: [], minPrice: "500", maxPrice: "1000", favoritesOnly: true, recentOnly: false, customOnly: false, imageState: "has", supplierState: "all" }).map((item) => item.id)).toEqual(["a"]);
    expect(filterComponents(items, { categories: [], suppliers: [], disciplines: ["Electrical"], designations: [], units: ["pc"], minPrice: "", maxPrice: "", favoritesOnly: false, recentOnly: true, customOnly: true, imageState: "none", supplierState: "has" }, [], ["c"]).map((item) => item.id)).toEqual(["c"]);
  });

  it("sorts and groups components", () => {
    const searched = searchComponents(items, "");
    expect(sortComponents(searched, "priceAsc").map((item) => item.id)).toEqual(["b", "c", "a"]);
    expect(sortComponents(searched, "priceDesc").map((item) => item.id)).toEqual(["a", "c", "b"]);
    expect(groupComponents(items, "discipline").map(([group]) => group)).toEqual(["Architectural", "Electrical"]);
  });

  it("validates and creates custom components", () => {
    expect(createComponent({ material: "", category: "Finishes", supplier: "", unit: "pc", itemCost: "10", currency: "PHP", discipline: "Architectural", designation: "Floor", description: "", tags: "", imageUrl: "", miscCost: "0", sku: "", sourceUrl: "", notes: "" }).error).toMatch(/required/i);
    expect(createComponent({ material: "Bad Cost", category: "Finishes", supplier: "", unit: "pc", itemCost: "abc", currency: "PHP", discipline: "Architectural", designation: "Floor", description: "", tags: "", imageUrl: "", miscCost: "0", sku: "", sourceUrl: "", notes: "" }).error).toMatch(/base price/i);
    expect(createComponent({ material: "Bad Misc", category: "Finishes", supplier: "", unit: "pc", itemCost: "10", currency: "PHP", discipline: "Architectural", designation: "Floor", description: "", tags: "", imageUrl: "", miscCost: "-1", sku: "", sourceUrl: "", notes: "" }).error).toMatch(/misc cost/i);
    const result = createComponent({ material: "Custom Counter", category: "Cabinetry", supplier: "Project", unit: "lm", itemCost: "12500", currency: "PHP", discipline: "Architectural", designation: "Counter", description: "Counter allowance", tags: "counter, custom", imageUrl: "", miscCost: "2000", sku: "CC-1", sourceUrl: "https://example.com", notes: "Verify quote" });
    expect(result.component?.isCustom).toBe(true);
    expect(result.component?.totalItemCosts).toBe(14500);
    expect(result.component?.miscCost).toBe(2000);
    expect(result.component?.tags).toEqual(["counter", "custom"]);
    expect(result.component?.imageUrl).toMatch(/^data:image\/svg\+xml,/);
    expect(result.component?.imageUrl).not.toContain("images.unsplash.com");
  });

  it("uses local SVG placeholders for component image fallbacks", () => {
    const tileFallback = getComponentImageUrl({ ...base, id: "fallback-tile", material: "Porcelain Tile", category: "Finishes", supplier: "", unit: "sqm", itemCost: 1 });
    const activityFallback = getActivityComponentImageUrl({
      id: "fallback-light",
      material: "LED Downlight",
      description: "",
      category: "Lighting Fixtures",
      supplier: "",
      unit: "pc",
      itemCost: 1,
    });

    expect(tileFallback).toMatch(/^data:image\/svg\+xml,/);
    expect(tileFallback).not.toContain("images.unsplash.com");
    expect(activityFallback).toMatch(/^data:image\/svg\+xml,/);
    expect(activityFallback).not.toContain("images.unsplash.com");
  });

  it("allows safe component source URLs and rejects unsafe schemes during custom component creation", () => {
    expect(createComponent({ material: "HTTPS Source", category: "Finishes", supplier: "", unit: "pc", itemCost: "10", currency: "PHP", discipline: "Architectural", designation: "Floor", description: "", tags: "", imageUrl: "", miscCost: "0", sku: "", sourceUrl: " https://supplier.example/item ", notes: "" }).component?.sourceUrl).toBe("https://supplier.example/item");
    expect(createComponent({ material: "HTTP Source", category: "Finishes", supplier: "", unit: "pc", itemCost: "10", currency: "PHP", discipline: "Architectural", designation: "Floor", description: "", tags: "", imageUrl: "", miscCost: "0", sku: "", sourceUrl: "http://supplier.example/item", notes: "" }).component?.sourceUrl).toBe("http://supplier.example/item");
    expect(createComponent({ material: "Internal Source", category: "Finishes", supplier: "", unit: "pc", itemCost: "10", currency: "PHP", discipline: "Architectural", designation: "Floor", description: "", tags: "", imageUrl: "", miscCost: "0", sku: "", sourceUrl: "/workshop/components/component-id", notes: "" }).component?.sourceUrl).toBe("/workshop/components/component-id");

    for (const unsafeSourceUrl of ["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "mailto:supplier@example.com", "file:///etc/passwd"]) {
      expect(createComponent({ material: "Unsafe Source", category: "Finishes", supplier: "", unit: "pc", itemCost: "10", currency: "PHP", discipline: "Architectural", designation: "Floor", description: "", tags: "", imageUrl: "", miscCost: "0", sku: "", sourceUrl: unsafeSourceUrl, notes: "" }).error).toMatch(/source url/i);
    }
  });

  it("infers disciplines, designations, and staleness consistently", () => {
    expect(getComponentDiscipline({ ...base, id: "cab", material: "Base Cabinet", category: "Cabinetry", supplier: "", unit: "lm", itemCost: 1 })).toBe("Millwork");
    expect(getComponentDiscipline({ ...base, id: "out", material: "Site Light", category: "Outdoor", supplier: "", unit: "pc", itemCost: 1 })).toBe("Sitework");
    expect(getComponentDesignation({ ...base, id: "sink", material: "Lavatory Sink", category: "Plumbing Fixtures", supplier: "", unit: "pc", itemCost: 1 })).toBe("Plumbing");

    expect(getStalenessTone(new Date(Date.now() - 181 * 86400000).toISOString())).toBe("danger");
    expect(getStalenessTone(new Date(Date.now() - 91 * 86400000).toISOString())).toBe("warning");
    expect(getStalenessLabel(new Date().toISOString())).toBe("Recent");
  });

  it("guards storage writes that throw", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const circularData: Record<string, unknown> = {};
    circularData.self = circularData;

    expect(safeSetJsonStorage("archestimator_test_storage_error", circularData)).toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Failed to persist"), expect.any(Error));

    warn.mockRestore();
  });

  it("falls back when stored library preferences are invalid", () => {
    window.localStorage.setItem("archestimator_component_library_preferences_v1", "{not-json");
    expect(readLibraryPreferences()).toEqual({});
  });

  it("parses CSV and JSON imports into complete library row items", () => {
    const csv = [
      "name,category,unit,price,supplier,quantity,misc cost,tags",
      "\"Imported Pendant\",Lighting Fixtures,pc,1500,Firefly,2,150,\"lighting,ceiling\"",
      "Missing Price,Finishes,sqm,,Supplier,1,0,",
    ].join("\n");
    const csvResult = parseLibraryCsv(csv);
    expect(csvResult.items).toHaveLength(1);
    expect(csvResult.items[0]).toMatchObject({
      material: "Imported Pendant",
      category: "Lighting Fixtures",
      unit: "pc",
      itemCost: 1500,
      quantity: 2,
      totalItemCosts: 3150,
      source: "library",
      isCustom: true,
    });
    expect(csvResult.items[0].tags).toEqual(["lighting", "ceiling"]);
    expect(csvResult.errors[0]).toMatch(/price is required/i);

    const jsonResult = parseLibraryJson(JSON.stringify({
      items: [{ id: "json-sink", material: "JSON Sink", category: "Plumbing Fixtures", unit: "pc", itemCost: 4200 }],
      bundles: [{ id: "json-bath", kind: "assembly", name: "JSON bath", description: "Imported bundle", items: [{ itemId: "json-sink", quantity: 2 }] }],
    }));
    expect(jsonResult.items[0]).toMatchObject({ material: "JSON Sink", source: "library", pricingSource: "JSON import" });
    expect(jsonResult.items[0].id).toBe("json-sink");
    expect(jsonResult.bundles[0]).toMatchObject({ id: "json-bath", kind: "assembly", name: "JSON bath" });
    expect(jsonResult.bundles[0].items).toEqual([{ itemId: "json-sink", quantity: 2 }]);
  });

  it("sanitizes legacy component source URLs before rendering hrefs", () => {
    expect(sanitizeComponentSourceUrl("https://supplier.example/quote")).toBe("https://supplier.example/quote");
    expect(sanitizeComponentSourceUrl("/workshop/components/component-id")).toBe("/workshop/components/component-id");
    expect(sanitizeComponentSourceUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeComponentSourceUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(sanitizeComponentSourceUrl("mailto:supplier@example.com")).toBeNull();
    expect(sanitizeComponentSourceUrl("file:///etc/passwd")).toBeNull();
  });

  it("drops unsafe imported component source URLs while preserving safe imported URLs", () => {
    const csv = [
      "name,category,unit,price,source url",
      "Safe Supplier,Finishes,pc,10,https://supplier.example/quote",
      "Safe Internal,Finishes,pc,10,/workshop/components/component-id",
      "Unsafe Script,Finishes,pc,10,javascript:alert(1)",
    ].join("\n");

    expect(parseLibraryCsv(csv).items.map((item) => item.sourceUrl)).toEqual([
      "https://supplier.example/quote",
      "/workshop/components/component-id",
      undefined,
    ]);

    const json = JSON.stringify({
      items: [
        { material: "Unsafe Data", category: "Finishes", unit: "pc", itemCost: 10, sourceUrl: "data:text/html,<script>alert(1)</script>" },
      ],
    });
    expect(parseLibraryJson(json).items[0].sourceUrl).toBeUndefined();
  });

  it("does not treat retired split cost import columns as misc cost", () => {
    const csv = [
      "name,category,unit,price,supplier,quantity,labor cost,other cost,tags",
      "\"Legacy Pendant\",Lighting Fixtures,pc,1500,Firefly,2,100,50,\"lighting\"",
    ].join("\n");

    const csvResult = parseLibraryCsv(csv);

    expect(csvResult.items).toHaveLength(1);
    expect(csvResult.items[0]).toMatchObject({
      material: "Legacy Pendant",
      miscCost: 0,
      totalItemCosts: 3000,
    });
  });

  it("exports a versioned library payload with bundles", () => {
    const bundles = createDefaultLibraryBundles(items);
    const exported = JSON.parse(exportLibraryItemsToJson(items, bundles)) as { schema: string; items: EstimateRowItem[]; bundles: typeof bundles };
    expect(exported.schema).toBe("archestimator.component-library.v1");
    expect(exported.items).toHaveLength(items.length);
    expect(exported.bundles.length).toBeGreaterThan(0);
  });

  it("exports component library rows as CSV", () => {
    const csv = exportLibraryItemsToCsv([{ ...items[0], tags: ["tile", "quoted"], notes: "Needs \"supplier\" check" }]);
    expect(csv.split("\n")[0]).toContain("material,category,unit,itemCost");
    expect(csv).toContain("Porcelain Tile");
    expect(csv).toContain("\"tile, quoted\"");
    expect(csv).toContain("\"Needs \"\"supplier\"\" check\"");
  });

  it("escapes spreadsheet formula-leading CSV cells", () => {
    const csv = exportLibraryItemsToCsv([{
      ...items[0],
      material: "=HYPERLINK(\"https://example.invalid\")",
      category: "+SUM(A1:A2)",
      supplier: "-cmd|' /C calc'!A0",
      discipline: "@malicious",
      designation: "  =2+2",
      tags: ["=tag", "safe"],
      sku: "\t=tabbed",
      sourceUrl: "\r=carriage",
      notes: "\n=linebreak",
    }]);

    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'+SUM(A1:A2)");
    expect(csv).toContain("'-cmd|' /C calc'!A0");
    expect(csv).toContain("'@malicious");
    expect(csv).toContain("'  =2+2");
    expect(csv).toContain("\"'=tag, safe\"");
    expect(csv).toContain("'\t=tabbed");
    expect(csv).toContain("\"'\r=carriage\"");
    expect(csv).toContain("\"'\n=linebreak\"");
  });

  it("creates and expands default assemblies/templates from library items", () => {
    const bundles = createDefaultLibraryBundles(items);
    const bundle = bundles[0];
    expect(bundle.items.length).toBeGreaterThan(0);
    const expanded = expandLibraryBundle(bundle, items);
    expect(expanded.map((item) => item.id)).toEqual(bundle.items.map((entry) => entry.itemId));
    expect(getLibraryBundleTotal(bundle, items)).toBeGreaterThan(0);
  });

  it("keeps every seeded library component image-backed", () => {
    expect(estimateLibraryItems.every((item) => Boolean(item.imageUrl))).toBe(true);
    const localImageUrls = estimateLibraryItems.map((item) => item.imageUrl).filter((url): url is string => Boolean(url?.startsWith("/component-thumbnails/")));
    expect(localImageUrls).toHaveLength(estimateLibraryItems.length);

    const hashes = localImageUrls.map((url) => {
      const filePath = join(process.cwd(), "public", url.replace(/^\//, ""));
      expect(existsSync(filePath), `${url} should exist`).toBe(true);
      return createHash("sha256").update(readFileSync(filePath)).digest("hex");
    });
    expect(new Set(hashes).size).toBe(hashes.length);
  });
});

describe("library tree sibling ordering", () => {
  const orderFixtureNodes = [
    {
      id: "root",
      label: "Root",
      children: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
        { id: "c", label: "C" },
      ],
    },
  ];

  it("applies saved sibling order and keeps unknown ids in natural position", async () => {
    const { applyLibraryTreeOrder } = await import("@/components/workshop/component-library/tree");
    const ordered = applyLibraryTreeOrder(orderFixtureNodes, { root: ["c", "a"] });
    expect(ordered[0].children?.map((node) => node.id)).toEqual(["c", "a", "b"]);
    expect(applyLibraryTreeOrder(orderFixtureNodes, undefined)).toBe(orderFixtureNodes);
  });

  it("locates the shared parent sibling order and rejects cross-parent pairs", async () => {
    const { findLibrarySiblingOrder } = await import("@/components/workshop/component-library/tree");
    expect(findLibrarySiblingOrder(orderFixtureNodes, "a", "c")).toEqual({ parentKey: "root", siblingIds: ["a", "b", "c"] });
    expect(findLibrarySiblingOrder(orderFixtureNodes, "a", "root")).toBeNull();
  });

  it("builds supplier and brand trees from indexed id/name matches without duplicate rows", async () => {
    const { buildLibraryTreeWithComponentRows } = await import("@/components/workshop/component-library/tree");
    const treeItems: EstimateRowItem[] = [
      {
        ...base,
        id: "id-match",
        material: "Id Matched Component",
        supplier: "Alias Supplier",
        supplierId: "supplier-canonical",
        brand: "Alias Brand",
        brandId: "brand-canonical",
        unit: "pc",
        itemCost: 10,
        category: "Finishes",
      },
      {
        ...base,
        id: "name-match",
        material: "Name Matched Component",
        supplier: "Canonical Supplier",
        brand: "Canonical Brand",
        unit: "pc",
        itemCost: 20,
        category: "Finishes",
      },
      {
        ...base,
        id: "both-match",
        material: "Both Matched Component",
        supplier: "Canonical Supplier",
        supplierId: "supplier-canonical",
        brand: "Canonical Brand",
        brandId: "brand-canonical",
        unit: "pc",
        itemCost: 30,
        category: "Finishes",
      },
    ];

    const supplierTree = buildLibraryTreeWithComponentRows("suppliers", treeItems, [], [], {
      suppliers: [{ id: "supplier-canonical", name: "Canonical Supplier" }],
    });
    const brandTree = buildLibraryTreeWithComponentRows("brands", treeItems, [], [], {
      brands: [{ id: "brand-canonical", name: "Canonical Brand" }],
    });

    const supplierNode = supplierTree[0].children?.find((node) => node.label === "Canonical Supplier");
    const brandNode = brandTree[0].children?.find((node) => node.label === "Canonical Brand");
    expect(supplierNode?.children?.map((node) => node.item?.id).sort()).toEqual([
      "both-match",
      "id-match",
      "name-match",
    ]);
    expect(brandNode?.children?.map((node) => node.item?.id).sort()).toEqual([
      "both-match",
      "id-match",
      "name-match",
    ]);
  });

  it("splits project express components into a project-only sidebar tree", async () => {
    const { buildLibraryTreeWithComponentRows, buildProjectComponentTree, splitSidebarComponentItems } = await import("@/components/workshop/component-library/tree");
    const { buildLibraryFolderTree, getLibraryItemsForFolderNode } = await import("@/lib/component-library/library-folder-reorder");
    const projectFolderId = "project-components-project-1";
    const estimateFolderId = "project-components-project-1-estimate-estimate-1";
    const projectItem: EstimateRowItem = {
      ...base,
      id: "express-row-1",
      material: "Express Vanity",
      supplier: "Project",
      source: "project",
      unit: "lot",
      itemCost: 1500,
      category: "Unassigned",
      libraryFolderId: estimateFolderId,
      metadata: {
        projectComponentProjection: {
          projectId: "project-1",
          projectName: "Casa Miguel",
          estimateId: "estimate-1",
          estimateName: "Main Estimate",
          classification: "express",
        },
      },
    };
    const ordinaryUsedItem: EstimateRowItem = {
      ...base,
      id: "ordinary-used-row",
      material: "Used Library Sofa",
      supplier: "Workspace library",
      source: "library",
      unit: "pc",
      itemCost: 1200,
      category: "Furniture",
      libraryFolderId: estimateFolderId,
      metadata: {},
    };
    const sidebarFolders = [
      { id: projectFolderId, parent_id: null, name: "Casa Miguel", sort_order: -100 },
      { id: estimateFolderId, parent_id: projectFolderId, name: "Main Estimate", sort_order: -90 },
    ];

    const splitItems = splitSidebarComponentItems([projectItem, ordinaryUsedItem, ...items]);
    expect(splitItems.projectItems.map((item) => item.id)).toEqual(["express-row-1"]);
    expect(splitItems.libraryItems.map((item) => item.id)).toContain("ordinary-used-row");

    const projectTree = buildProjectComponentTree(splitItems.projectItems, {
      libraryFolders: sidebarFolders,
    });
    const categoryTree = buildLibraryTreeWithComponentRows("categories", splitItems.libraryItems, [], [], {
      categoryTree: [],
      libraryFolders: sidebarFolders,
      pruneEmptyFolders: true,
    });
    const supplierTree = buildLibraryTreeWithComponentRows("suppliers", [projectItem, ordinaryUsedItem, ...items], [], [], {
      suppliers: [],
      libraryFolders: sidebarFolders,
      pruneEmptyFolders: true,
    });
    const brandTree = buildLibraryTreeWithComponentRows("brands", [projectItem, ordinaryUsedItem, ...items], [], [], {
      brands: [],
      libraryFolders: sidebarFolders,
      pruneEmptyFolders: true,
    });
    const customTree = buildLibraryTreeWithComponentRows("custom", [projectItem, ordinaryUsedItem, ...items], [], [], {
      libraryFolders: sidebarFolders,
      pruneEmptyFolders: true,
    });

    expect(projectTree[0].label).toBe("Casa Miguel");
    expect(projectTree[0].children?.[0].label).toBe("Main Estimate");
    expect(projectTree[0].children?.[0].children?.[0]).toMatchObject({ id: "express-row-1", label: "Express Vanity" });
    expect(JSON.stringify(projectTree[0])).not.toContain("Used Library Sofa");
    expect(JSON.stringify(categoryTree)).not.toContain("Express Vanity");
    expect(JSON.stringify(supplierTree)).not.toContain("Express Vanity");
    expect(JSON.stringify(brandTree)).not.toContain("Express Vanity");
    expect(JSON.stringify(customTree)).not.toContain("Express Vanity");

    const managerFolders = buildLibraryFolderTree(sidebarFolders.map((folder) => ({
      ...folder,
      workspace_id: "workspace-1",
      source_category_node_id: null,
      folder_kind: "custom" as const,
    })));
    expect(getLibraryItemsForFolderNode(managerFolders[0], [projectItem, ordinaryUsedItem, ...items]).map((item) => item.id)).toEqual(["express-row-1"]);
  });
});
