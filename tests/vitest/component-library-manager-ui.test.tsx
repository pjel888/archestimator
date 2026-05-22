import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { ComponentsPageClient } from "@/components/workshop/ComponentsPageClient";
import type { EstimateRowItem } from "@/components/workshop/estimate-tree-data";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";

const sharedCategoryTree: ComponentLibraryTaxonomyNode[] = [
  {
    id: "db-section-components",
    label: "Database Components",
    kind: "organizer",
    children: [
      {
        id: "db-category-fabrication",
        label: "Fabrication",
        kind: "category",
      },
    ],
  },
];

const sharedLibraryItems: EstimateRowItem[] = [
  {
    id: "db-library-steel-frame",
    material: "Database Steel Frame",
    name: "Database Steel Frame",
    description: "Shared DB-backed component",
    supplier: "Database Supplier",
    supplierId: "db-supplier",
    source: "library",
    unit: "pc",
    itemCost: 1200,
    price: 1200,
    currency: "PHP",
    quantity: 1,
    subTotal: 1200,
    miscCost: 0,
    totalItemCosts: 1200,
    category: "Legacy category label",
    categoryNodeId: "db-category-fabrication",
    categoryPath: ["Database Components", "Fabrication"],
    pricingSource: "Database Supplier",
    pricingDate: "2026-05-22",
  },
];

describe("component library manager UI", () => {
  beforeAll(() => {
    if (!window.PointerEvent) {
      window.PointerEvent = MouseEvent as unknown as typeof PointerEvent;
    }
  });

  it("renders the estimate-style component workspace without the retired standalone chrome", () => {
    render(<ComponentsPageClient />);

    expect(screen.getByLabelText("Component library workspace")).toBeInTheDocument();
    expect(screen.getByLabelText("Component library tree")).toBeInTheDocument();
    expect(screen.getByLabelText("Custom component sheet")).toBeInTheDocument();
    expect(screen.getByLabelText("Search component library tree")).toBeInTheDocument();
    expect(screen.getByLabelText("Search component sheet")).toBeInTheDocument();
    expect(screen.getByLabelText("Search component library tree").compareDocumentPosition(screen.getByLabelText("Component tree tools"))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.getByLabelText("Component tree tools").compareDocumentPosition(screen.getByRole("tablist", { name: "Component library tree views" }))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.getByRole("tab", { name: "Categories" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Suppliers" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("treeitem", { name: "All Components" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("treeitem", { name: "Administration" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Architecture" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Materials" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Finishes" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Doors" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Windows" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Furniture" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Equipment" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Plumbing Systems" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Sanitary Systems" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Fire Alarm" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Life Safety" })).toBeInTheDocument();
    expect(screen.queryByText("FF&E")).not.toBeInTheDocument();
    expect(screen.queryByText("FFE")).not.toBeInTheDocument();
    expect(screen.queryByText("Furniture, Fixtures, and Equipment")).not.toBeInTheDocument();
    expect(screen.queryByText("Furniture, Furnishings & Equipment")).not.toBeInTheDocument();
    expect(screen.queryByText("Furniture + Equipment")).not.toBeInTheDocument();
    expect(screen.queryByText("Fixtures & Equipment")).not.toBeInTheDocument();
    expect(screen.queryByText("Architecture & Interiors")).not.toBeInTheDocument();
    expect(screen.queryByText("Fixture - Lighting")).not.toBeInTheDocument();
    expect(screen.queryByText("Fixture - Plumbing")).not.toBeInTheDocument();
    expect(screen.queryByText("Assemblies & Templates")).not.toBeInTheDocument();

    expect(screen.queryByLabelText("Search library")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Library tools")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New component" })).not.toBeInTheDocument();
    expect(screen.queryByRole("grid", { name: "Component library table" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Library filters")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/details$/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Demo seed")).not.toBeInTheDocument();
  });

  it("places components from shared database taxonomy ids instead of legacy labels", () => {
    render(
      <ComponentsPageClient
        categoryTree={sharedCategoryTree}
        suppliers={[{ id: "db-supplier", name: "Database Supplier", sort_order: 1 }]}
        libraryItems={sharedLibraryItems}
      />,
    );

    expect(screen.getByRole("treeitem", { name: "Database Components" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Fabrication" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Database Steel Frame" })).toBeInTheDocument();
    expect(screen.queryByRole("treeitem", { name: "Legacy category label" })).not.toBeInTheDocument();
  });

  it("keeps the route wired to the component workspace shell copy", () => {
    const source = readFileSync(join(process.cwd(), "src/app/workshop/components/page.tsx"), "utf8");

    expect(source).toContain("Component workspace");
    expect(source).toContain("Custom library");
    expect(source).not.toContain("Workspace library");
    expect(source).not.toContain("Demo seed");
    expect(source).not.toContain("Component library shell");
    expect(source).not.toContain("Content pending approved workflow");
  });

  it("supports tree view tabs and sheet-local search in the estimate workspace positions", () => {
    render(<ComponentsPageClient />);

    fireEvent.click(screen.getByRole("tab", { name: "Suppliers" }));

    expect(screen.getByRole("tab", { name: "Suppliers" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("treeitem", { name: "All Suppliers" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("treeitem", { name: /IKEA Philippines/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("treeitem", { name: /IKEA Philippines/ }));

    fireEvent.change(screen.getByLabelText("Search component sheet"), { target: { value: "faucet" } });

    expect(screen.getByLabelText("Search component sheet")).toHaveValue("faucet");
  });

  it("opens right-click actions on component tree folders", async () => {
    render(<ComponentsPageClient />);

    fireEvent.contextMenu(screen.getByRole("treeitem", { name: "All Components" }), { clientX: 16, clientY: 16 });

    expect(await screen.findByRole("menuitem", { name: "Select" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Collapse" })).toBeInTheDocument();
  });

  it("searches taxonomy aliases without turning procurement scopes into category folders", () => {
    render(<ComponentsPageClient />);

    fireEvent.change(screen.getByLabelText("Search component library tree"), { target: { value: "luminaire" } });

    expect(screen.getByLabelText("Search component library tree")).toHaveValue("luminaire");
  });
});
