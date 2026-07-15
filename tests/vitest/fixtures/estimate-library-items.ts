import type { EstimateRowItem } from "@/lib/estimates/types";

function makeEstimateLibraryItem(
  input: Pick<
    EstimateRowItem,
    "id" | "material" | "description" | "supplier" | "source" | "unit" | "itemCost" | "miscCost" | "category" | "pricingSource" | "pricingDate"
  >,
): EstimateRowItem {
  return {
    ...input,
    quantity: 1,
    subTotal: input.itemCost,
    contingencyPercentage: 0,
    contingencyValue: 0,
    adjustmentPercentage: 0,
    adjustmentValue: 0,
    totalItemCosts: input.itemCost + input.miscCost,
    imageUrl: `/component-thumbnails/${input.id}.jpg`,
  };
}

export const estimateLibraryItems: EstimateRowItem[] = [
  makeEstimateLibraryItem({ id: "lib-sofa", material: "HEMLINGBY Loveseat", description: "IKEA Philippines loveseat, Knisa dark gray.", supplier: "IKEA Philippines", source: "library", unit: "pc", itemCost: 7999, miscCost: 1200, category: "Furniture", pricingSource: "IKEA PH sofa category page", pricingDate: "2026-05-17" }),
  makeEstimateLibraryItem({ id: "lib-accent-chair", material: "Mandaue Foam Accent Chair", description: "Mid-market accent-chair allowance.", supplier: "Mandaue Foam", source: "library", unit: "pc", itemCost: 12500, miscCost: 500, category: "Furniture", pricingSource: "Philippine retail allowance", pricingDate: "2026-05-17" }),
  makeEstimateLibraryItem({ id: "lib-coffee-table", material: "IKEA Coffee Table", description: "Compact living-room coffee table allowance.", supplier: "IKEA Philippines", source: "library", unit: "pc", itemCost: 3999, miscCost: 500, category: "Furniture", pricingSource: "IKEA PH table category pricing range", pricingDate: "2026-05-17" }),
  makeEstimateLibraryItem({ id: "lib-dining-table", material: "SANDSBERG Dining Table", description: "Dining-table benchmark.", supplier: "IKEA Philippines", source: "library", unit: "pc", itemCost: 2999, miscCost: 3700, category: "Furniture", pricingSource: "IKEA PH dining tables category page", pricingDate: "2026-05-17" }),
  makeEstimateLibraryItem({ id: "lib-dining-chair", material: "IKEA Dining Chair", description: "Loose dining chair allowance.", supplier: "IKEA Philippines", source: "library", unit: "pc", itemCost: 1990, miscCost: 250, category: "Furniture", pricingSource: "IKEA PH chairs category range", pricingDate: "2026-05-17" }),
  makeEstimateLibraryItem({ id: "lib-queen-bed", material: "BRUKSVARA Bed Frame", description: "Queen bed-frame benchmark.", supplier: "IKEA Philippines", source: "library", unit: "set", itemCost: 6999, miscCost: 3300, category: "Furniture", pricingSource: "IKEA PH beds category page", pricingDate: "2026-05-17" }),
  makeEstimateLibraryItem({ id: "lib-single-bed", material: "IKEA Single Bed Frame", description: "Single bed-frame allowance.", supplier: "IKEA Philippines", source: "library", unit: "set", itemCost: 5999, miscCost: 2000, category: "Furniture", pricingSource: "IKEA PH beds category range", pricingDate: "2026-05-17" }),
  makeEstimateLibraryItem({ id: "lib-bedside-table", material: "IKEA Bedside Table", description: "Nightstand allowance.", supplier: "IKEA Philippines", source: "library", unit: "pc", itemCost: 2799, miscCost: 250, category: "Furniture", pricingSource: "IKEA PH bedroom furniture range", pricingDate: "2026-05-17" }),
  makeEstimateLibraryItem({ id: "lib-light-switch-1gang", material: "Light Switch, 1-Gang 1-Way, Flush Type", description: "Single-gang one-way wall switch.", supplier: "Wilcon Depot / Panasonic", source: "supplier", unit: "pc", itemCost: 170, miscCost: 160, category: "Electrical Fixtures", pricingSource: "Common Philippine retail allowance", pricingDate: "2026-05-17" }),
];
