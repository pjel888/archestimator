import { describe, expect, it } from "vitest";

import {
  filterManagerItems,
  getManagerFacets,
  groupManagerItems,
  searchManagerItems,
  sortManagerItems,
} from "@/components/workshop/component-library-manager/helpers";
import { defaultManagerFilters, type ComponentLibraryManagerItem } from "@/components/workshop/component-library-manager/types";

const items: ComponentLibraryManagerItem[] = [
  {
    id: "tile",
    name: "Porcelain Tile",
    kind: "material",
    category: "Finishes",
    supplier: "Wilcon Depot",
    rawSupplier: "Wilcon Depot",
    brand: "Mariwasa",
    sku: "MW-600",
    unit: "sqm",
    unitCost: 950,
    laborCost: 350,
    supplementaryCost: 0,
    pricingSource: "Supplier quote",
    pricingDate: "2026-05-18",
    confidence: "medium",
    description: "Floor finish with textured surface",
    health: "current",
    healthIssues: [],
    discipline: "Architectural",
    tags: ["floor", "tile"],
  },
  {
    id: "adhesive",
    name: "Tile Adhesive",
    kind: "material",
    category: "Finishes",
    supplier: "ABC",
    rawSupplier: "ABC",
    unit: "bag",
    unitCost: 360,
    laborCost: 0,
    supplementaryCost: 0,
    pricingSource: "",
    pricingDate: "2026-05-18",
    description: "Cement based adhesive",
    health: "needs-review",
    healthIssues: ["missing-source"],
    tags: ["adhesive"],
  },
  {
    id: "labor",
    name: "Install lighting fixture",
    kind: "labor",
    category: "Lighting Fixtures",
    supplier: "No supplier",
    rawSupplier: null,
    unit: "pc",
    unitCost: null,
    laborCost: 450,
    supplementaryCost: 0,
    pricingSource: "Foreman allowance",
    pricingDate: "2025-01-15",
    description: "Electrical labor allowance",
    health: "missing",
    healthIssues: ["missing-price", "stale-price"],
    tags: ["lighting", "labor"],
  },
];

describe("component library manager helpers", () => {
  it("searches across primary and metadata fields", () => {
    expect(searchManagerItems(items, "Porcelain Tile").map((item) => item.id)).toEqual(["tile"]);
    expect(searchManagerItems(items, "mariwasa").map((item) => item.id)).toEqual(["tile"]);
    expect(searchManagerItems(items, "lighting").map((item) => item.id)).toEqual(["labor"]);
    expect(searchManagerItems(items, "bag").map((item) => item.id)).toEqual(["adhesive"]);
  });

  it("filters by status, facets, and health", () => {
    expect(filterManagerItems(items, { ...defaultManagerFilters, status: "needs-review" }).map((item) => item.id)).toEqual(["adhesive", "labor"]);
    expect(filterManagerItems(items, { ...defaultManagerFilters, status: "missing-price" }).map((item) => item.id)).toEqual(["labor"]);
    expect(filterManagerItems(items, { ...defaultManagerFilters, categories: ["Finishes"], suppliers: ["ABC"] }).map((item) => item.id)).toEqual(["adhesive"]);
    expect(filterManagerItems(items, { ...defaultManagerFilters, kinds: ["labor"], units: ["pc"], health: ["missing"] }).map((item) => item.id)).toEqual(["labor"]);
    expect(filterManagerItems([...items, { ...items[0], id: "missing-date", health: "needs-review", healthIssues: ["missing-date"] }], { ...defaultManagerFilters, status: "missing-source" }).map((item) => item.id)).toEqual(["adhesive"]);
  });

  it("sorts and groups manager items", () => {
    expect(sortManagerItems(items, "unitCostAsc").map((item) => item.id)).toEqual(["adhesive", "tile", "labor"]);
    expect(sortManagerItems(items, "unitCostDesc").map((item) => item.id)).toEqual(["tile", "adhesive", "labor"]);
    expect(groupManagerItems(items, "supplier").map(([group]) => group)).toEqual(["ABC", "No supplier", "Wilcon Depot"]);
    expect(groupManagerItems(items, "health").map(([group]) => group)).toEqual(["Current", "Missing", "Needs review"]);
  });

  it("computes facet counts", () => {
    const facets = getManagerFacets(items);

    expect(facets.total).toBe(3);
    expect(facets.needsReview).toBe(2);
    expect(facets.missingPrice).toBe(1);
    expect(facets.missingSource).toBe(1);
    expect(getManagerFacets([...items, { ...items[0], id: "missing-date", health: "needs-review", healthIssues: ["missing-date"] }]).missingSource).toBe(1);
    expect(facets.categories).toContainEqual({ value: "Finishes", count: 2 });
    expect(facets.suppliers).toContainEqual({ value: "No supplier", count: 1 });
    expect(facets.kinds).toContainEqual({ value: "labor", count: 1 });
    expect(facets.health).toContainEqual({ value: "missing", count: 1 });
  });
});
