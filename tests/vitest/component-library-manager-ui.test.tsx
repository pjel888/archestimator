import { beforeAll, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";

import { LibraryPageClient } from "@/components/workshop/LibraryPageClient";
import type { EstimateRowItem } from "@/components/workshop/estimate-tree-data";
import { estimateTemplates } from "@/lib/component-library/estimate-templates";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import type { LibraryFolderRecord } from "@/lib/component-library/library-folder-reorder";

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

const sharedLibraryFolders: LibraryFolderRecord[] = [
  {
    id: "folder-fabrication",
    workspace_id: "workspace-1",
    parent_id: null,
    name: "Fabrication",
    sort_order: 10,
    source_category_node_id: "db-category-fabrication",
    folder_kind: "taxonomy",
  },
  {
    id: "folder-details",
    workspace_id: "workspace-1",
    parent_id: "folder-fabrication",
    name: "Details",
    sort_order: 10,
    source_category_node_id: null,
    folder_kind: "custom",
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
    libraryFolderId: "folder-fabrication",
    pricingSource: "Database Supplier",
    pricingDate: "2026-05-22",
  },
  {
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
    libraryFolderId: "folder-details",
    isCustom: true,
    pricingSource: "Custom Maker",
    pricingDate: "2026-05-22",
  },
  {
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

function renderLibrary(overrides: Partial<ComponentProps<typeof LibraryPageClient>> = {}) {
  return render(
    <LibraryPageClient
      categoryTree={sharedCategoryTree}
      suppliers={[
        { id: "db-supplier", name: "Database Supplier", sort_order: 1 },
        { id: "db-custom-supplier", name: "Custom Maker", sort_order: 2 },
      ]}
      libraryFolders={sharedLibraryFolders}
      libraryItems={sharedLibraryItems}
      {...overrides}
    />,
  );
}

function getLibraryFolderButton(name: string) {
  const matches = screen.getAllByLabelText(name);
  const folderButton = matches.find((element) => element.hasAttribute("data-library-folder-node-id"));
  if (!folderButton) throw new Error(`Library folder button not found: ${name}`);
  return folderButton;
}

describe("component library manager UI", () => {
  beforeAll(() => {
    if (!window.PointerEvent) {
      window.PointerEvent = MouseEvent as unknown as typeof PointerEvent;
    }
  });

  it("renders the library workspace without the retired standalone manager chrome", () => {
    renderLibrary();

    expect(screen.getByLabelText("Component library workspace")).toBeInTheDocument();
    expect(screen.getByLabelText("Component library tree")).toBeInTheDocument();
    expect(screen.getByLabelText("Custom component sheet")).toBeInTheDocument();
    expect(screen.getByLabelText("Search component library tree")).toBeInTheDocument();
    expect(screen.getByLabelText("Search component sheet")).toBeInTheDocument();

    const workspace = screen.getByLabelText("Component library workspace");
    const sheetPanel = workspace.querySelector('[data-component-library-sheet-panel="true"]');
    const treePanel = workspace.querySelector('[data-component-library-tree-panel="true"]');
    expect(sheetPanel).not.toBeNull();
    expect(treePanel).not.toBeNull();
    expect(sheetPanel!.compareDocumentPosition(treePanel!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const centerHeader = document.querySelector('[data-component-library-center-header="true"]');
    const workspaceHeader = document.querySelector('[data-workshop-layout="component-library-workspace-header-row"]');
    expect(centerHeader).not.toHaveClass("lg:left-[var(--component-library-tree-width)]");
    expect(workspaceHeader?.getAttribute("style") ?? "").not.toContain("--component-library-tree-width");

    const tabs = screen.getByRole("tablist", { name: "Library views" });
    expect(within(tabs).getByRole("tab", { name: "Categories" })).toHaveAttribute("aria-selected", "true");
    expect(within(tabs).getByRole("tab", { name: "Templates" })).toHaveAttribute("aria-selected", "false");
    expect(screen.queryByRole("tab", { name: "Suppliers" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Custom" })).not.toBeInTheDocument();

    expect(screen.queryByLabelText("Search library")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Library tools")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New component" })).not.toBeInTheDocument();
    expect(screen.queryByRole("grid", { name: "Component library table" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Library filters")).not.toBeInTheDocument();
    expect(screen.queryByText("Demo seed")).not.toBeInTheDocument();
  });

  it("uses editable folder navigation and keeps row items out of the library tree", () => {
    renderLibrary();

    const tree = screen.getByLabelText("Component library tree");
    const sheet = screen.getByLabelText("Custom component sheet");

    expect(within(tree).getByRole("treeitem", { name: "Fabrication" })).toHaveAttribute("aria-selected", "true");
    expect(getLibraryFolderButton("Details")).toBeInTheDocument();
    expect(within(tree).queryByRole("treeitem", { name: "Database Steel Frame" })).not.toBeInTheDocument();
    expect(within(sheet).getByRole("tab", { name: "Fabrication" })).toHaveAttribute("aria-selected", "true");
    expect(within(sheet).getByText("Database Steel Frame")).toBeInTheDocument();

    fireEvent.click(getLibraryFolderButton("Details"));

    expect(within(sheet).getByRole("tab", { name: "Details" })).toHaveAttribute("aria-selected", "true");
    expect(within(sheet).getByText("Custom Cabinet Pull")).toBeInTheDocument();
    expect(within(sheet).queryByText("Database Steel Frame")).not.toBeInTheDocument();
  });

  it("moves supplier organization under Categories instead of a top-level Suppliers tab", () => {
    renderLibrary();

    const organizeBy = screen.getByRole("group", { name: "Organize categories by" });
    fireEvent.click(within(organizeBy).getByRole("button", { name: "Suppliers" }));

    const tree = screen.getByLabelText("Component library tree");
    const sheet = screen.getByLabelText("Custom component sheet");

    expect(screen.queryByRole("tab", { name: "Suppliers" })).not.toBeInTheDocument();
    expect(within(tree).getByRole("treeitem", { name: "All Suppliers" })).toHaveAttribute("aria-selected", "true");
    expect(within(tree).getByRole("treeitem", { name: "Database Supplier" })).toBeInTheDocument();

    fireEvent.click(within(tree).getByRole("treeitem", { name: "Database Supplier" }));

    expect(within(sheet).getByRole("tab", { name: "Database Supplier" })).toHaveAttribute("aria-selected", "true");
    expect(within(sheet).getByText("Database Steel Frame")).toBeInTheDocument();
    expect(within(sheet).queryByText("Owner Supplied Sink")).not.toBeInTheDocument();
  });

  it("keeps custom and uncategorized row collections in the Categories dropdown", () => {
    renderLibrary({ libraryItems: [...sharedLibraryItems, unmatchedLibraryItem] });

    const sheet = screen.getByLabelText("Custom component sheet");
    const collection = screen.getByLabelText("Library row collection");

    expect(within(collection).getByRole("option", { name: "Estimate Row Items" })).toBeInTheDocument();
    expect(within(collection).getByRole("option", { name: "Custom Row Items" })).toBeInTheDocument();
    expect(within(collection).getByRole("option", { name: "Uncategorized" })).toBeInTheDocument();

    fireEvent.change(collection, { target: { value: "custom-row-items" } });
    expect(within(sheet).getByRole("tab", { name: "Custom Row Items" })).toHaveAttribute("aria-selected", "true");
    expect(within(sheet).getByText("Custom Cabinet Pull")).toBeInTheDocument();
    expect(within(sheet).queryByText("Database Steel Frame")).not.toBeInTheDocument();

    fireEvent.change(collection, { target: { value: "uncategorized" } });
    expect(within(sheet).getByRole("tab", { name: "Uncategorized" })).toHaveAttribute("aria-selected", "true");
    expect(within(sheet).getByText("Custom Bronze Widget")).toBeInTheDocument();
  });

  it("shows estimate templates as their own top-level tab with template sheet rows", () => {
    renderLibrary({ templates: estimateTemplates });

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
    renderLibrary();

    fireEvent.click(screen.getByRole("tab", { name: "Templates" }));

    expect(screen.queryByText("Condo Fit-Out Starter")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Component library tree")).toBeInTheDocument();
  });

  it("opens right-click actions on editable library folders", async () => {
    renderLibrary();

    fireEvent.contextMenu(getLibraryFolderButton("Fabrication"), { clientX: 16, clientY: 16 });

    expect(await screen.findByRole("menuitem", { name: "Select" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Add folder" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Rename" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();
  });

  it("searches folder labels without reintroducing procurement scopes as category folders", () => {
    render(<LibraryPageClient />);

    fireEvent.change(screen.getByLabelText("Search component library tree"), { target: { value: "luminaire" } });

    expect(screen.getByLabelText("Search component library tree")).toHaveValue("luminaire");
    expect(screen.queryByText("FF&E")).not.toBeInTheDocument();
    expect(screen.queryByText("Furniture, Fixtures, and Equipment")).not.toBeInTheDocument();
    expect(screen.queryByText("Fixtures & Equipment")).not.toBeInTheDocument();
  });
});
