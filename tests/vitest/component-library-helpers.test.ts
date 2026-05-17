import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { createComponent, filterComponents, groupComponents, searchComponents, sortComponents } from "@/components/workshop/EstimateSheetContent";
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
    const result = createComponent({ material: "Custom Counter", category: "Cabinetry", supplier: "Project", unit: "lm", itemCost: "12500", currency: "PHP", discipline: "Architectural", designation: "Counter", description: "Counter allowance", tags: "counter, custom", imageUrl: "", laborCost: "1500", supplementaryCosts: "500", sku: "CC-1", sourceUrl: "https://example.com", notes: "Verify quote" });
    expect(result.component?.isCustom).toBe(true);
    expect(result.component?.totalItemCosts).toBe(14500);
    expect(result.component?.tags).toEqual(["counter", "custom"]);
    expect(result.component?.imageUrl).toMatch(/^https:\/\//);
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
