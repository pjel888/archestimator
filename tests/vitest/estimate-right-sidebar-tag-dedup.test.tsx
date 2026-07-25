import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PreviewPanel } from "@/components/workshop/component-library/PreviewPanel";
import { hydrateSidebarLibraryItems } from "@/components/workshop/component-library/use-estimate-right-sidebar-state";
import type { EstimateRowItem } from "@/components/workshop/estimate-tree-data";

const furnitureItem: EstimateRowItem = {
  id: "furniture-chair",
  material: "Dining Chair",
  description: "Dining chair allowance.",
  supplier: "Furniture Supplier",
  source: "library",
  unit: "pc",
  itemCost: 1_500,
  quantity: 1,
  subTotal: 1_500,
  miscCost: 0,
  totalItemCosts: 1_500,
  category: "Furniture",
  discipline: "Furniture",
  pricingSource: "Supplier quote",
  pricingDate: "2026-07-25",
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("estimate right sidebar fallback tags", () => {
  it("keeps fallback tag order without rendering duplicate React keys", () => {
    const consoleError = vi.spyOn(console, "error");
    const [hydratedItem] = hydrateSidebarLibraryItems([furnitureItem]);

    render(
      <PreviewPanel
        item={hydratedItem}
        onClose={vi.fn()}
        onAdd={vi.fn()}
        addDisabled={false}
        addLabel="Add component"
        insertQuantity={1}
        onInsertQuantityChange={vi.fn()}
      />,
    );

    expect(hydratedItem.tags).toEqual(["Furniture", "Furniture Supplier"]);
    expect(
      consoleError.mock.calls.some(([message]) =>
        String(message).includes("Encountered two children with the same key"),
      ),
    ).toBe(false);
  });
});
