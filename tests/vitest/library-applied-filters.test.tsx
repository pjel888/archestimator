import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LibraryPageClient } from "@/components/workshop/LibraryPageClient";
import type { EstimateRowItem } from "@/components/workshop/estimate-tree-data";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
}));

const searchParamState = vi.hoisted(() => ({
  value: "",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: navigationMocks.push,
    refresh: navigationMocks.refresh,
    replace: navigationMocks.replace,
  }),
  usePathname: () => "/workshop/library/components",
  useSearchParams: () => new URLSearchParams(searchParamState.value),
}));

const categoryTree: ComponentLibraryTaxonomyNode[] = [
  {
    id: "category-root",
    label: "Components",
    kind: "organizer",
    children: [{ id: "category-finishes", label: "Finishes", kind: "category" }],
  },
];

const libraryItems: EstimateRowItem[] = [
  {
    id: "component-alpha",
    material: "Alpha Tile",
    name: "Alpha Tile",
    description: "Fresh supplier-backed tile",
    supplier: "Tile Supplier",
    supplierId: "supplier-tile",
    source: "library",
    unit: "sqm",
    itemCost: 100,
    price: 100,
    currency: "PHP",
    quantity: 1,
    subTotal: 100,
    miscCost: 0,
    totalItemCosts: 100,
    category: "Finishes",
    categoryNodeId: "category-finishes",
    pricingSource: "Supplier quote",
    pricingDate: new Date().toISOString().slice(0, 10),
    confidence: "quoted",
    lifecycleState: "available",
  },
  {
    id: "component-beta",
    material: "Beta Paint",
    name: "Beta Paint",
    description: "Missing brand paint",
    supplier: "Paint Supplier",
    supplierId: "supplier-paint",
    source: "library",
    unit: "gal",
    itemCost: 200,
    price: 200,
    currency: "PHP",
    quantity: 1,
    subTotal: 200,
    miscCost: 0,
    totalItemCosts: 200,
    category: "Finishes",
    categoryNodeId: "category-finishes",
    pricingSource: "Supplier quote",
    pricingDate: "2025-01-01",
    confidence: "catalog",
    lifecycleState: "available",
  },
  {
    id: "component-gamma",
    material: "Gamma Fixture",
    name: "Gamma Fixture",
    description: "Discontinued fixture",
    supplier: "",
    source: "library",
    unit: "pc",
    itemCost: 300,
    price: 300,
    currency: "PHP",
    quantity: 1,
    subTotal: 300,
    miscCost: 0,
    totalItemCosts: 300,
    category: "Finishes",
    categoryNodeId: "category-finishes",
    pricingSource: "Owner",
    pricingDate: "",
    confidence: "allowance",
    lifecycleState: "discontinued",
  },
];

function renderLibrary(element: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
}

async function waitForLibraryWorkspace() {
  await screen.findByRole("button", { name: /View by:/ }, { timeout: 10_000 });
}

beforeEach(() => {
  navigationMocks.push.mockReset();
  navigationMocks.refresh.mockReset();
  navigationMocks.replace.mockReset();
  searchParamState.value = "";
});

describe("Library applied filters", () => {
  it("renders removable applied-filter chips, clear-all, count strip, and the glass shell", async () => {
    renderLibrary(
      <LibraryPageClient
        categoryTree={categoryTree}
        suppliers={[
          { id: "supplier-tile", name: "Tile Supplier", sort_order: 1 },
          { id: "supplier-paint", name: "Paint Supplier", sort_order: 2 },
        ]}
        brands={[]}
        libraryItems={libraryItems}
      />,
    );
    await waitForLibraryWorkspace();

    const workspace = document.querySelector('[data-component-library-workspace="true"]');
    expect(workspace).toHaveAttribute("data-library-surface", "glass");
    expect(workspace).toHaveClass("estimate-glass-well");
    expect(document.querySelector('[data-component-library-tree-panel="true"]')).toHaveClass("estimate-glass-rail");
    expect(document.querySelector('[data-component-library-sheet="true"]')).toHaveClass("estimate-glass-paper");

    fireEvent.click(screen.getByRole("button", { name: "Filter components" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Tile Supplier" }));

    const appliedFilters = screen.getByLabelText("Applied component filters");
    expect(within(appliedFilters).getByText("Supplier: Tile Supplier")).toBeInTheDocument();
    expect(document.querySelector('[data-component-sheet-context-strip="true"]')).toHaveTextContent("All Components · 1 shown · 3 in scope");
    expect(screen.getByRole("button", { name: "View details for Alpha Tile" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View details for Beta Paint" })).not.toBeInTheDocument();

    fireEvent.click(within(appliedFilters).getByRole("button", { name: "Remove Supplier: Tile Supplier filter" }));

    await waitFor(() => expect(screen.queryByLabelText("Applied component filters")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "View details for Beta Paint" })).toBeInTheDocument();
    expect(document.querySelector('[data-component-sheet-context-strip="true"]')).toHaveTextContent("All Components · 3 components");
  });

  it("hydrates overview deep-link filters and clears all active facets", async () => {
    searchParamState.value = "brand=none&freshness=stale";

    renderLibrary(
      <LibraryPageClient
        categoryTree={categoryTree}
        suppliers={[{ id: "supplier-paint", name: "Paint Supplier", sort_order: 1 }]}
        brands={[]}
        libraryItems={libraryItems}
      />,
    );
    await waitForLibraryWorkspace();

    const appliedFilters = screen.getByLabelText("Applied component filters");
    expect(within(appliedFilters).getByText("Brand: No brand")).toBeInTheDocument();
    expect(within(appliedFilters).getByText("Pricing: Older than 90 days")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View details for Beta Paint" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View details for Alpha Tile" })).not.toBeInTheDocument();

    fireEvent.click(within(appliedFilters).getByRole("button", { name: "Clear filters" }));

    await waitFor(() => expect(screen.queryByLabelText("Applied component filters")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "View details for Alpha Tile" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View details for Gamma Fixture" })).toBeInTheDocument();
  });
});
