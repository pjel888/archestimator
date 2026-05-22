import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import { ComponentsPageClient } from "@/components/workshop/ComponentsPageClient";
import type { EstimateRowItem } from "@/components/workshop/estimate-tree-data";
import { estimateTemplates } from "@/lib/component-library/estimate-templates";
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

const unmatchedLibraryItem: EstimateRowItem = {
  id: "db-library-custom-bronze-widget",
  material: "Custom Bronze Widget",
  name: "Custom Bronze Widget",
  description: "Component without a matching taxonomy folder",
  supplier: "Unmatched Supplier",
  supplierId: "db-unmatched-supplier",
  source: "library",
  unit: "pc",
  itemCost: 900,
  price: 900,
  currency: "PHP",
  quantity: 1,
  subTotal: 900,
  miscCost: 0,
  totalItemCosts: 900,
  category: "Obscure specialty",
  categoryNodeId: "missing-category-node",
  categoryPath: ["Obscure specialty"],
  pricingSource: "Unmatched Supplier",
  pricingDate: "2026-05-22",
};

const customLibraryItem: EstimateRowItem = {
  id: "db-library-custom-cabinet-pull",
  material: "Custom Cabinet Pull",
  name: "Custom Cabinet Pull",
  description: "User-created component",
  supplier: "Custom Maker",
  supplierId: "db-custom-supplier",
  source: "library",
  unit: "pc",
  itemCost: 75,
  price: 75,
  currency: "PHP",
  quantity: 1,
  subTotal: 75,
  miscCost: 0,
  totalItemCosts: 75,
  category: "Fabrication",
  categoryNodeId: "db-category-fabrication",
  categoryPath: ["Database Components", "Fabrication"],
  isCustom: true,
  pricingSource: "Custom Maker",
  pricingDate: "2026-05-22",
};

const unsourcedLibraryItem: EstimateRowItem = {
  id: "db-library-owner-supplied-sink",
  material: "Owner Supplied Sink",
  name: "Owner Supplied Sink",
  description: "Component without supplier metadata",
  supplier: "",
  source: "library",
  unit: "pc",
  itemCost: 500,
  price: 500,
  currency: "PHP",
  quantity: 1,
  subTotal: 500,
  miscCost: 0,
  totalItemCosts: 500,
  category: "Fabrication",
  categoryNodeId: "db-category-fabrication",
  categoryPath: ["Database Components", "Fabrication"],
  pricingSource: "Owner",
  pricingDate: "2026-05-22",
};

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

  it("keeps the left tree folder-only and shows selected category contents in the sheet", () => {
    render(
      <ComponentsPageClient
        categoryTree={sharedCategoryTree}
        suppliers={[{ id: "db-supplier", name: "Database Supplier", sort_order: 1 }]}
        libraryItems={sharedLibraryItems}
      />,
    );

    const tree = screen.getByLabelText("Component library tree");
    const sheet = screen.getByLabelText("Custom component sheet");

    expect(within(tree).getByRole("treeitem", { name: "Database Components" })).toBeInTheDocument();
    expect(within(tree).getByRole("treeitem", { name: "Fabrication" })).toBeInTheDocument();
    expect(within(tree).queryByRole("treeitem", { name: "Database Steel Frame" })).not.toBeInTheDocument();
    expect(within(tree).queryByRole("treeitem", { name: "Legacy category label" })).not.toBeInTheDocument();

    fireEvent.click(within(tree).getByRole("treeitem", { name: "Fabrication" }));

    expect(within(sheet).getByRole("tab", { name: "Fabrication" })).toHaveAttribute("aria-selected", "true");
    expect(within(sheet).getByText("Database Steel Frame")).toBeInTheDocument();
    expect(within(sheet).getByText(/Database Supplier/)).toBeInTheDocument();
  });

  it("keeps supplier folders navigation-only and shows selected supplier contents in the sheet", () => {
    render(
      <ComponentsPageClient
        categoryTree={sharedCategoryTree}
        suppliers={[{ id: "db-supplier", name: "Database Supplier", sort_order: 1 }]}
        libraryItems={sharedLibraryItems}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Suppliers" }));

    const tree = screen.getByLabelText("Component library tree");
    const sheet = screen.getByLabelText("Custom component sheet");

    expect(within(tree).getByRole("treeitem", { name: "Database Supplier" })).toBeInTheDocument();
    expect(within(tree).queryByRole("treeitem", { name: "Database Steel Frame" })).not.toBeInTheDocument();

    fireEvent.click(within(tree).getByRole("treeitem", { name: "Database Supplier" }));

    expect(within(sheet).getByRole("tab", { name: "Database Supplier" })).toHaveAttribute("aria-selected", "true");
    expect(within(sheet).getByText("Database Steel Frame")).toBeInTheDocument();
  });

  it("changes the center sheet dataset when switching tree view tabs", () => {
    render(
      <ComponentsPageClient
        categoryTree={sharedCategoryTree}
        suppliers={[
          { id: "db-supplier", name: "Database Supplier", sort_order: 1 },
          { id: "db-custom-supplier", name: "Custom Maker", sort_order: 2 },
        ]}
        libraryItems={[sharedLibraryItems[0], customLibraryItem, unsourcedLibraryItem]}
      />,
    );

    const sheet = screen.getByLabelText("Custom component sheet");

    expect(within(sheet).getByRole("tab", { name: "All Components" })).toHaveAttribute("aria-selected", "true");
    expect(within(sheet).getByText("Database Steel Frame")).toBeInTheDocument();
    expect(within(sheet).getByText("Custom Cabinet Pull")).toBeInTheDocument();
    expect(within(sheet).getByText("Owner Supplied Sink")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Suppliers" }));

    expect(within(sheet).getByRole("tab", { name: "All Suppliers" })).toHaveAttribute("aria-selected", "true");
    expect(within(sheet).getByText("Database Steel Frame")).toBeInTheDocument();
    expect(within(sheet).getByText("Custom Cabinet Pull")).toBeInTheDocument();
    expect(within(sheet).queryByText("Owner Supplied Sink")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Custom" }));

    expect(within(sheet).getByRole("tab", { name: "My Components" })).toHaveAttribute("aria-selected", "true");
    expect(within(sheet).queryByText("Database Steel Frame")).not.toBeInTheDocument();
    expect(within(sheet).getByText("Custom Cabinet Pull")).toBeInTheDocument();
    expect(within(sheet).queryByText("Owner Supplied Sink")).not.toBeInTheDocument();
  });

  it("shows estimate templates as their own tree tab with template sheet rows", () => {
    render(<ComponentsPageClient templates={estimateTemplates} />);

    fireEvent.click(screen.getByRole("tab", { name: "Templates" }));

    const tree = screen.getByLabelText("Component library tree");
    const sheet = screen.getByLabelText("Custom component sheet");

    expect(screen.getByRole("tab", { name: "Templates" })).toHaveAttribute("aria-selected", "true");
    expect(within(tree).getByRole("treeitem", { name: "All Templates" })).toHaveAttribute("aria-selected", "true");
    expect(within(tree).getByRole("treeitem", { name: "Residential Rooms" })).toBeInTheDocument();
    expect(within(sheet).getByRole("tab", { name: "All Templates" })).toHaveAttribute("aria-selected", "true");
    expect(within(sheet).getByText("Condo Fit-Out Starter")).toBeInTheDocument();
    expect(within(sheet).getByText("2 groups / 3 areas / 8 rows")).toBeInTheDocument();
    expect(within(sheet).queryByText("Database Steel Frame")).not.toBeInTheDocument();
  });

  it("does not expose static templates when no templates are provided by the route", () => {
    render(<ComponentsPageClient />);

    fireEvent.click(screen.getByRole("tab", { name: "Templates" }));

    expect(screen.queryByText("Condo Fit-Out Starter")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Component library tree")).toBeInTheDocument();
  });

  it("shows unmatched categories as an Uncategorized folder with sheet contents", () => {
    render(
      <ComponentsPageClient
        categoryTree={sharedCategoryTree}
        suppliers={[{ id: "db-unmatched-supplier", name: "Unmatched Supplier", sort_order: 1 }]}
        libraryItems={[unmatchedLibraryItem]}
      />,
    );

    const tree = screen.getByLabelText("Component library tree");
    const sheet = screen.getByLabelText("Custom component sheet");

    expect(within(tree).getByRole("treeitem", { name: "Uncategorized" })).toBeInTheDocument();
    expect(within(tree).queryByRole("treeitem", { name: "Custom Bronze Widget" })).not.toBeInTheDocument();

    fireEvent.click(within(tree).getByRole("treeitem", { name: "Uncategorized" }));

    expect(within(sheet).getByRole("tab", { name: "Uncategorized" })).toHaveAttribute("aria-selected", "true");
    expect(within(sheet).getByText("Custom Bronze Widget")).toBeInTheDocument();
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
