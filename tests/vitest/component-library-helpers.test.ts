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
} from "@/components/workshop/EstimateSheetContent";
import { estimateLibraryItems, type EstimateRowItem } from "@/components/workshop/estimate-tree-data";

const base = {
  source: "library" as const,
  quantity: 1,
  subTotal: 0,
  supplementaryCosts: 0,
  laborCost: 0,
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
    expect(createComponent({ material: "", category: "Finishes", supplier: "", unit: "pc", itemCost: "10", currency: "PHP", discipline: "Architectural", designation: "Floor", description: "", tags: "", imageUrl: "", laborCost: "0", supplementaryCosts: "0", sku: "", sourceUrl: "", notes: "" }).error).toMatch(/required/i);
    expect(createComponent({ material: "Bad Cost", category: "Finishes", supplier: "", unit: "pc", itemCost: "abc", currency: "PHP", discipline: "Architectural", designation: "Floor", description: "", tags: "", imageUrl: "", laborCost: "0", supplementaryCosts: "0", sku: "", sourceUrl: "", notes: "" }).error).toMatch(/base price/i);
    expect(createComponent({ material: "Bad Labor", category: "Finishes", supplier: "", unit: "pc", itemCost: "10", currency: "PHP", discipline: "Architectural", designation: "Floor", description: "", tags: "", imageUrl: "", laborCost: "-1", supplementaryCosts: "0", sku: "", sourceUrl: "", notes: "" }).error).toMatch(/labor default/i);
    const result = createComponent({ material: "Custom Counter", category: "Cabinetry", supplier: "Project", unit: "lm", itemCost: "12500", currency: "PHP", discipline: "Architectural", designation: "Counter", description: "Counter allowance", tags: "counter, custom", imageUrl: "", laborCost: "1500", supplementaryCosts: "500", sku: "CC-1", sourceUrl: "https://example.com", notes: "Verify quote" });
    expect(result.component?.isCustom).toBe(true);
    expect(result.component?.totalItemCosts).toBe(14500);
    expect(result.component?.tags).toEqual(["counter", "custom"]);
    expect(result.component?.imageUrl).toMatch(/^https:\/\//);
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
      "name,category,unit,price,supplier,quantity,labor cost,other cost,tags",
      "\"Imported Pendant\",Lighting Fixtures,pc,1500,Firefly,2,100,50,\"lighting,ceiling\"",
      "Missing Price,Finishes,sqm,,Supplier,1,0,0,",
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
