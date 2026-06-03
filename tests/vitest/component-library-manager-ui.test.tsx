import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ComponentProps } from "react";

import { LibraryPageClient } from "@/components/workshop/LibraryPageClient";
import type { EstimateRowItem } from "@/components/workshop/estimate-tree-data";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import type { LibraryFolderRecord } from "@/lib/component-library/library-folder-reorder";

const navigationMocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

const actionMocks = vi.hoisted(() => ({
  archiveCostLibraryComponentsBulk: vi.fn(),
  createCostLibraryComponent: vi.fn(),
  createLibraryFolder: vi.fn(),
  deleteLibraryFolder: vi.fn(),
  deleteLibraryFoldersBulk: vi.fn(),
  renameLibraryFolder: vi.fn(),
  reorderLibraryFolders: vi.fn(),
}));

vi.mock("@/lib/component-library/actions", () => actionMocks);

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: navigationMocks.refresh,
  }),
}));

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
  {
    id: "folder-empty-child",
    workspace_id: "workspace-1",
    parent_id: "folder-details",
    name: "Empty Child",
    sort_order: 20,
    source_category_node_id: null,
    folder_kind: "custom",
  },
];

const sharedBrands = [
  {
    id: "db-brand",
    name: "Database Brand",
    normalized_name: "database brand",
    sort_order: 1,
  },
  {
    id: "db-pull-studio",
    name: "Pull Studio",
    normalized_name: "pull studio",
    sort_order: 2,
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
    brand: "Database Brand",
    brandId: "db-brand",
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
    brand: "Pull Studio",
    brandId: "db-pull-studio",
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

async function renderLibrary(overrides: Partial<ComponentProps<typeof LibraryPageClient>> = {}) {
  const result = render(
    <LibraryPageClient
      categoryTree={sharedCategoryTree}
      suppliers={[
        { id: "db-supplier", name: "Database Supplier", sort_order: 1 },
        { id: "db-custom-supplier", name: "Custom Maker", sort_order: 2 },
      ]}
      brands={sharedBrands}
      libraryFolders={sharedLibraryFolders}
      libraryItems={sharedLibraryItems}
      {...overrides}
    />,
  );
  await screen.findByLabelText("Component library tree", undefined, { timeout: 10_000 });
  return result;
}

function getLibraryFolderButton(name: string) {
  const matches = screen.getAllByLabelText(name);
  const folderButton = matches.find((element) => element.hasAttribute("data-library-folder-node-id"));
  if (!folderButton) throw new Error(`Library folder button not found: ${name}`);
  return folderButton;
}

function getLibraryFolderButtonWithin(scope: HTMLElement, name: string) {
  const matches = within(scope).getAllByLabelText(name);
  const folderButton = matches.find((element) => element.hasAttribute("data-library-folder-node-id"));
  if (!folderButton) throw new Error(`Library folder button not found: ${name}`);
  return folderButton;
}

function getLibraryFolderArrowWithin(scope: HTMLElement, folderId: string) {
  const arrow = scope.querySelector(`[data-library-folder-arrow-id="folder:${folderId}"]`);
  if (!arrow) throw new Error(`Library folder arrow not found: ${folderId}`);
  return arrow as HTMLElement;
}

describe("component library manager bundle boundaries", () => {
  it("keeps the library folder tree surface behind a named dynamic import", () => {
    const managerSource = readFileSync(join(process.cwd(), "src/components/workshop/component-library-manager/ComponentLibraryManager.tsx"), "utf8");

    expect(managerSource).toContain('import("./LibraryFolderTree").then((module) => module.LibraryFolderTreeSurface)');
    expect(managerSource).not.toContain('from "./LibraryFolderTree"');
    expect(managerSource).toContain('from "./library-folder-tree-shared"');
  });
});

describe("component library manager UI", () => {
  beforeAll(async () => {
    await import("@/components/workshop/component-library-manager/ComponentLibraryManager");
    await import("@/components/workshop/component-library-manager/AddComponentModal");

    if (!window.PointerEvent) {
      window.PointerEvent = MouseEvent as unknown as typeof PointerEvent;
    }
  });

  it("renders the library workspace without the retired standalone manager chrome", async () => {
    await renderLibrary();

    expect(screen.getByLabelText("Component library workspace")).toBeInTheDocument();
    expect(screen.getByLabelText("Component library tree")).toBeInTheDocument();
    expect(screen.getByLabelText("Component sheet")).toBeInTheDocument();
    expect(screen.getByLabelText("Search component library tree")).toBeInTheDocument();
    expect(screen.getByLabelText("Search component sheet")).toBeInTheDocument();

    const workspace = screen.getByLabelText("Component library workspace");
    const workspaceFrame = document.querySelector('[data-component-library-workspace="true"]');
    const sheetPanel = workspace.querySelector('[data-component-library-sheet-panel="true"]');
    const treePanel = workspace.querySelector('[data-component-library-tree-panel="true"]');
    expect(workspaceFrame).toHaveClass("border-r");
    expect(workspaceFrame).not.toHaveClass("border");
    expect(workspaceFrame).not.toHaveClass("border-l");
    expect(workspaceFrame).not.toHaveClass("border-b");
    expect(workspaceFrame).not.toHaveClass("border-t");
    expect(sheetPanel).not.toBeNull();
    expect(treePanel).not.toBeNull();
    expect(treePanel).not.toHaveClass("border-l");
    expect(treePanel).not.toHaveClass("border-hairline");
    expect(sheetPanel!.compareDocumentPosition(treePanel!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(document.querySelector('[data-component-library-center-header="true"]')).toBeNull();
    expect(document.querySelector('[data-workshop-layout="component-library-workspace-header-row"]')).toBeNull();

    const tabs = screen.getByRole("tablist", { name: "Library views" });
    expect(within(tabs).getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Components"]);
    expect(within(tabs).getByRole("tab", { name: "Components" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("tab", { name: "Templates" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Suppliers" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Custom" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Library row collection")).not.toBeInTheDocument();

    expect(screen.queryByLabelText("Search library")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Library tools")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New component" })).not.toBeInTheDocument();
    expect(screen.queryByRole("grid", { name: "Component library table" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Library filters")).not.toBeInTheDocument();
    expect(screen.queryByText("Demo seed")).not.toBeInTheDocument();
  });

  it("uses editable folder navigation and shows component leaves inside the library tree", async () => {
    await renderLibrary();

    const tree = screen.getByLabelText("Component library tree");
    const sheet = screen.getByLabelText("Component sheet");
    const rowGroups = Array.from(tree.querySelectorAll("ol"));
    expect(rowGroups.length).toBeGreaterThan(0);
    for (const rowGroup of rowGroups) expect(rowGroup).toHaveClass("space-y-0");

    expect(within(tree).getByRole("treeitem", { name: "All Components" })).toHaveAttribute("aria-selected", "true");
    expect(within(tree).getByRole("treeitem", { name: "All Components" })).toHaveAttribute("aria-expanded", "true");
    expect(getLibraryFolderButton("Details")).toBeInTheDocument();
    expect(within(tree).getByRole("treeitem", { name: "Database Steel Frame" })).toBeInTheDocument();
    expect(within(tree).getByRole("treeitem", { name: "Custom Cabinet Pull" })).toBeInTheDocument();
    expect(within(sheet).getByRole("tab", { name: "All Components" })).toHaveAttribute("aria-selected", "true");
    expect(within(sheet).getByRole("tablist", { name: "Component sheet tabs" })).not.toHaveTextContent("3 / 3");
    expect(within(sheet).queryByLabelText("All Components component rows")).not.toBeInTheDocument();
    const fabricationArrow = getLibraryFolderArrowWithin(tree, "folder-fabrication");
    expect(getLibraryFolderButton("Fabrication")).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(fabricationArrow);

    expect(getLibraryFolderButton("Fabrication")).toHaveAttribute("aria-expanded", "false");
    expect(within(tree).queryByRole("treeitem", { name: "Details" })).not.toBeInTheDocument();

    fireEvent.click(getLibraryFolderArrowWithin(tree, "folder-fabrication"));

    expect(getLibraryFolderButton("Fabrication")).toHaveAttribute("aria-expanded", "true");
    expect(getLibraryFolderButton("Details")).toBeInTheDocument();

    const fabricationBranch = within(sheet).getByLabelText("Fabrication component catalogue branch");
    const detailsBranch = within(sheet).getByLabelText("Fabrication / Details component catalogue branch");
    const emptyBranch = within(sheet).getByLabelText("Fabrication / Details / Empty Child component catalogue branch");
    expect(fabricationBranch).toHaveAttribute("data-component-catalogue-folder-depth", "0");
    expect(detailsBranch).toHaveAttribute("data-component-catalogue-folder-depth", "1");
    expect(emptyBranch).toHaveAttribute("data-component-catalogue-folder-depth", "2");
    expect(fabricationBranch.firstElementChild).toHaveClass("min-h-[72px]");
    expect(detailsBranch.firstElementChild).toHaveClass("min-h-[72px]");
    expect(emptyBranch.firstElementChild).toHaveClass("min-h-[72px]");
    expect(fabricationBranch.firstElementChild).toHaveClass("bg-white");
    expect(fabricationBranch.firstElementChild).toHaveClass("border-hairline");
    expect(fabricationBranch.firstElementChild).not.toHaveClass("border-l-2");
    expect(fabricationBranch.firstElementChild).not.toHaveClass("border-l-divider/70");
    expect(detailsBranch.firstElementChild).not.toHaveClass("border-l-2");
    expect(emptyBranch.firstElementChild).not.toHaveClass("border-l-2");
    expect(fabricationBranch.firstElementChild).not.toHaveClass("bg-surfaceMuted/70");
    expect(fabricationBranch.firstElementChild).not.toHaveAttribute("style");
    expect(detailsBranch.firstElementChild).not.toHaveAttribute("style");
    expect(emptyBranch.firstElementChild).not.toHaveAttribute("style");
    expect(within(fabricationBranch).getByText("Component Library")).toHaveClass("text-tertiary/70");
    expect(within(fabricationBranch).getByRole("heading", { name: "Fabrication" })).toHaveClass("font-medium");
    expect(within(detailsBranch).getByText("Fabrication", { selector: "p" })).toHaveClass("text-tertiary/70");
    expect(within(detailsBranch).getByRole("heading", { name: "Details" })).toHaveClass("font-medium");
    expect(within(emptyBranch).getByText("Fabrication / Details", { selector: "p" })).toHaveClass("text-tertiary/70");
    expect(within(emptyBranch).getByRole("heading", { name: "Empty Child" })).toHaveClass("font-medium");
    expect(within(fabricationBranch).queryByText(/\d+ items?/i)).not.toBeInTheDocument();
    expect(within(emptyBranch).queryByText("Empty folder")).not.toBeInTheDocument();
    expect(within(fabricationBranch).getByText("Database Steel Frame")).toBeInTheDocument();
    expect(within(fabricationBranch).getByText("Database Brand")).toBeInTheDocument();
    expect(tree.querySelector('[data-library-folder-arrow-id="folder:folder-empty-child"]')).toBeNull();
    expect(tree.querySelector('[data-library-folder-arrow-spacer-id="folder:folder-empty-child"]')).not.toBeNull();
    const detailsCard = detailsBranch.querySelector('[data-component-catalogue-card-id="db-library-custom-cabinet-pull"]');
    const emptyRow = emptyBranch.querySelector('[data-component-catalogue-empty-row="true"]');
    expect(detailsCard).not.toBeNull();
    expect(emptyRow).not.toBeNull();
    expect(within(detailsCard as HTMLElement).getByText("Custom Cabinet Pull")).toBeInTheDocument();
    expect(within(detailsCard as HTMLElement).getByText("Fabrication / Details")).toBeInTheDocument();
    expect(within(detailsCard as HTMLElement).getByText("Pull Studio")).toBeInTheDocument();
    const emptyMessage = within(emptyBranch).getByText("No components in this folder yet.");
    expect(emptyMessage).toBeInTheDocument();
    expect(emptyMessage).toHaveClass("absolute");
    expect(emptyMessage).toHaveClass("inset-0");
    expect(emptyMessage).toHaveClass("border-dashed");
    expect(emptyMessage).toHaveClass("bg-surfaceMuted/30");
    expect(emptyMessage).toHaveClass("opacity-50");
    expect(emptyRow).toHaveClass("grid");
    expect(emptyRow).toHaveClass("grid-cols-[repeat(auto-fill,minmax(164px,1fr))]");
    expect(emptyRow?.querySelector('[data-component-catalogue-empty-row-spacer="true"]')).toHaveClass("min-h-[236px]");
    expect(emptyBranch.querySelector('[data-component-catalogue-empty-card="true"]')).toBeNull();
    const detailsGrid = within(detailsBranch).getByLabelText("Fabrication / Details component catalogue grid");
    expect(detailsGrid).not.toHaveAttribute("style");
    expect(detailsGrid).toHaveClass("list-none");
    expect(detailsGrid).toHaveClass("p-0");

    fireEvent.click(within(detailsBranch).getByRole("button", { name: "Collapse Fabrication / Details" }));

    expect(within(detailsBranch).getByRole("button", { name: "Expand Fabrication / Details" })).toHaveAttribute("aria-expanded", "false");
    expect(within(detailsBranch).queryByText("Custom Cabinet Pull")).not.toBeInTheDocument();
    expect(within(detailsBranch).queryByLabelText("Fabrication / Details / Empty Child component catalogue branch")).not.toBeInTheDocument();

    fireEvent.click(within(detailsBranch).getByRole("button", { name: "Expand Fabrication / Details" }));

    expect(within(detailsBranch).getByRole("button", { name: "Collapse Fabrication / Details" })).toHaveAttribute("aria-expanded", "true");
    expect(within(detailsBranch).getByText("Custom Cabinet Pull")).toBeInTheDocument();
    expect(within(detailsBranch).getByLabelText("Fabrication / Details / Empty Child component catalogue branch")).toBeInTheDocument();

    fireEvent.click(getLibraryFolderButton("Details"));

    expect(within(sheet).getByRole("tab", { name: "Details" })).toHaveAttribute("aria-selected", "true");
    const selectedDetailsBranch = within(sheet).getByLabelText("Fabrication / Details component catalogue branch");
    expect(selectedDetailsBranch.firstElementChild).toHaveClass("bg-white");
    expect(selectedDetailsBranch.firstElementChild).not.toHaveClass("border-l-2");
    expect(selectedDetailsBranch.firstElementChild).not.toHaveClass("border-l-divider/70");
    expect(selectedDetailsBranch.firstElementChild).not.toHaveClass("bg-surfaceMuted/70");
    expect(within(selectedDetailsBranch).getByText("Custom Cabinet Pull")).toBeInTheDocument();
    expect(within(sheet).getByLabelText("Fabrication / Details / Empty Child component catalogue branch")).toBeInTheDocument();
    expect(within(sheet).queryByText("Database Steel Frame")).not.toBeInTheDocument();
  });

  it("shows catalogue result counts and searches pricing source trust fields", async () => {
    await renderLibrary({
      libraryItems: sharedLibraryItems.map((item) =>
        item.id === "db-library-steel-frame"
          ? { ...item, pricingSource: "May quote ledger", confidence: "supplier quote" }
          : item,
      ),
    });

    const sheet = screen.getByLabelText("Component sheet");
    expect(within(sheet).getByText("3 of 3 components")).toBeInTheDocument();
    expect(within(sheet).getByText("Source: May quote ledger")).toBeInTheDocument();
    expect(within(sheet).getAllByText("Checked 2026-05-22").length).toBeGreaterThan(0);
    expect(within(sheet).getByText("Confidence: supplier quote")).toBeInTheDocument();

    const tree = screen.getByLabelText("Component library tree");
    fireEvent.change(within(tree).getByRole("searchbox", { name: "Search component library tree" }), { target: { value: "quote ledger" } });

    expect(within(tree).getByRole("treeitem", { name: "Database Steel Frame" })).toBeInTheDocument();
    expect(within(tree).queryByRole("treeitem", { name: "Custom Cabinet Pull" })).not.toBeInTheDocument();
    expect(within(tree).queryByRole("treeitem", { name: "Owner Supplied Sink" })).not.toBeInTheDocument();

    fireEvent.change(within(tree).getByRole("searchbox", { name: "Search component library tree" }), { target: { value: "database brand" } });

    expect(within(tree).getByRole("treeitem", { name: "Database Steel Frame" })).toBeInTheDocument();
    expect(within(tree).queryByRole("treeitem", { name: "Custom Cabinet Pull" })).not.toBeInTheDocument();

    fireEvent.change(within(sheet).getByRole("searchbox", { name: "Search component sheet" }), { target: { value: "quote ledger" } });

    expect(within(sheet).getByText("1 of 3 components")).toBeInTheDocument();
    expect(within(sheet).getByText("Database Steel Frame")).toBeInTheDocument();
    expect(within(sheet).queryByText("Custom Cabinet Pull")).not.toBeInTheDocument();
    expect(within(sheet).queryByText("Owner Supplied Sink")).not.toBeInTheDocument();

    fireEvent.change(within(sheet).getByRole("searchbox", { name: "Search component sheet" }), { target: { value: "database brand" } });

    expect(within(sheet).getByText("1 of 3 components")).toBeInTheDocument();
    expect(within(sheet).getByText("Database Steel Frame")).toBeInTheDocument();
    expect(within(sheet).queryByText("Custom Cabinet Pull")).not.toBeInTheDocument();
  });

  it("moves supplier organization under Components instead of a top-level Suppliers tab", async () => {
    await renderLibrary();

    const viewMode = screen.getByRole("group", { name: "Component view mode" });
    expect(screen.getByText("View By")).toBeInTheDocument();
    expect(within(viewMode).getByRole("button", { name: "Default" })).toHaveAttribute("aria-pressed", "true");
    expect(within(viewMode).getByRole("button", { name: "Brand" })).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(within(viewMode).getByRole("button", { name: "Suppliers" }));

    const tree = screen.getByLabelText("Component library tree");
    const sheet = screen.getByLabelText("Component sheet");

    expect(screen.queryByRole("tab", { name: "Suppliers" })).not.toBeInTheDocument();
    expect(within(tree).getByRole("treeitem", { name: "All Suppliers" })).toHaveAttribute("aria-selected", "true");
    expect(within(tree).getByRole("treeitem", { name: "Database Supplier" })).toBeInTheDocument();
    expect(within(tree).getByRole("treeitem", { name: "Database Steel Frame" })).toBeInTheDocument();

    fireEvent.click(within(tree).getByRole("treeitem", { name: "Database Supplier" }));

    expect(within(sheet).getByRole("tab", { name: "Database Supplier" })).toHaveAttribute("aria-selected", "true");
    const supplierBranch = within(sheet).getByLabelText("Fabrication component catalogue branch");
    expect(within(supplierBranch).getByText("Database Steel Frame")).toBeInTheDocument();
    expect(within(supplierBranch).getByText("Database Supplier")).toBeInTheDocument();
    expect(within(sheet).queryByText("Owner Supplied Sink")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Library row collection")).not.toBeInTheDocument();
  });

  it("adds Brand as a component organization view and scopes the sheet directly to brands", async () => {
    await renderLibrary();

    const viewMode = screen.getByRole("group", { name: "Component view mode" });
    fireEvent.click(within(viewMode).getByRole("button", { name: "Brand" }));

    const tree = screen.getByLabelText("Component library tree");
    const sheet = screen.getByLabelText("Component sheet");

    expect(within(viewMode).getByRole("button", { name: "Brand" })).toHaveAttribute("aria-pressed", "true");
    expect(within(tree).getByRole("treeitem", { name: "All Brands" })).toHaveAttribute("aria-selected", "true");
    expect(within(tree).getByRole("treeitem", { name: "Database Brand" })).toBeInTheDocument();
    expect(within(tree).getByRole("treeitem", { name: "Pull Studio" })).toBeInTheDocument();

    fireEvent.click(within(tree).getByRole("treeitem", { name: "Database Brand" }));

    expect(within(sheet).getByRole("tab", { name: "Database Brand" })).toHaveAttribute("aria-selected", "true");
    expect(within(sheet).getByText("Database Steel Frame")).toBeInTheDocument();
    expect(within(sheet).queryByText("Custom Cabinet Pull")).not.toBeInTheDocument();
    expect(within(sheet).queryByText("Owner Supplied Sink")).not.toBeInTheDocument();
  });

  it("uses the same working folder expanders inside the Add Component modal", async () => {
    await renderLibrary();

    fireEvent.click(screen.getByRole("button", { name: "Add Component" }));

    const dialog = await screen.findByRole("dialog", { name: "Add Component" });
    const modalFabricationArrow = getLibraryFolderArrowWithin(dialog, "folder-fabrication");
    expect(getLibraryFolderButtonWithin(dialog, "Fabrication")).toHaveAttribute("aria-expanded", "true");
    expect(within(dialog).getByRole("treeitem", { name: "Details" })).toBeInTheDocument();

    fireEvent.click(modalFabricationArrow);

    expect(getLibraryFolderButtonWithin(dialog, "Fabrication")).toHaveAttribute("aria-expanded", "false");
    expect(within(dialog).queryByRole("treeitem", { name: "Details" })).not.toBeInTheDocument();

    fireEvent.click(getLibraryFolderArrowWithin(dialog, "folder-fabrication"));

    expect(getLibraryFolderButtonWithin(dialog, "Fabrication")).toHaveAttribute("aria-expanded", "true");
    expect(within(dialog).getByRole("treeitem", { name: "Details" })).toBeInTheDocument();
  });

  it("runs rename and delete folder actions inside the Add Component modal tree", async () => {
    await renderLibrary();

    fireEvent.click(screen.getByRole("button", { name: "Add Component" }));

    const dialog = await screen.findByRole("dialog", { name: "Add Component" });
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("Renamed Details");
    actionMocks.renameLibraryFolder.mockResolvedValueOnce({
      folder: {
        ...sharedLibraryFolders[1],
        name: "Renamed Details",
      },
    });

    fireEvent.contextMenu(getLibraryFolderButtonWithin(dialog, "Details"), { clientX: 16, clientY: 16 });

    expect(await screen.findByRole("menuitem", { name: "Select" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Add folder" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "Rename" }));

    await waitFor(() => expect(actionMocks.renameLibraryFolder).toHaveBeenCalledWith("folder-details", "Renamed Details"));
    await waitFor(() => expect(getLibraryFolderButtonWithin(dialog, "Renamed Details")).toBeInTheDocument());

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    actionMocks.deleteLibraryFolder.mockResolvedValueOnce(undefined);

    fireEvent.contextMenu(getLibraryFolderButtonWithin(dialog, "Renamed Details"), { clientX: 16, clientY: 16 });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));

    await waitFor(() => expect(actionMocks.deleteLibraryFolder).toHaveBeenCalledWith("folder-details"));

    promptSpy.mockRestore();
    confirmSpy.mockRestore();
  });

  it("archives selected catalogue components through the bulk toolbar", async () => {
    actionMocks.archiveCostLibraryComponentsBulk.mockReset();
    navigationMocks.refresh.mockReset();
    actionMocks.archiveCostLibraryComponentsBulk.mockResolvedValueOnce({
      archivedItemIds: ["db-library-steel-frame"],
    });
    await renderLibrary();

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Database Steel Frame" }));
    expect(screen.getByRole("toolbar", { name: "Bulk actions" })).toHaveTextContent("1 component selected");

    fireEvent.click(screen.getByRole("button", { name: "Archive selected" }));
    const dialog = screen.getByRole("dialog", { name: "Archive 1 selected component" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Archive" }));

    await waitFor(() => expect(actionMocks.archiveCostLibraryComponentsBulk).toHaveBeenCalledWith(["db-library-steel-frame"]));
    await waitFor(() => expect(navigationMocks.refresh).toHaveBeenCalledTimes(1));
  });

  it("keeps supplier typing in the current Add Component tree view and stages the supplier folder", async () => {
    await renderLibrary();

    fireEvent.click(screen.getByRole("button", { name: "Add Component" }));

    const dialog = await screen.findByRole("dialog", { name: "Add Component" });
    const viewMode = within(dialog).getByRole("group", { name: "Add component view mode" });
    expect(within(viewMode).getByRole("button", { name: "Default" })).toHaveAttribute("aria-pressed", "true");
    expect(within(dialog).getByRole("treeitem", { name: "Fabrication" })).toBeInTheDocument();

    fireEvent.change(within(dialog).getByRole("combobox", { name: "Supplier" }), {
      target: { value: "Future Fabricator" },
    });

    expect(within(dialog).getByRole("combobox", { name: "Supplier" })).toHaveValue("Future Fabricator");
    expect(within(viewMode).getByRole("button", { name: "Default" })).toHaveAttribute("aria-pressed", "true");
    expect(within(dialog).queryByRole("treeitem", { name: "All Suppliers" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("treeitem", { name: "Future Fabricator" })).not.toBeInTheDocument();

    fireEvent.click(within(viewMode).getByRole("button", { name: "Suppliers" }));

    expect(within(viewMode).getByRole("button", { name: "Suppliers" })).toHaveAttribute("aria-pressed", "true");
    expect(within(dialog).getByRole("treeitem", { name: "Future Fabricator" })).toHaveAttribute("aria-selected", "true");
  });

  it("keeps brand typing in the current Add Component tree view and stages the brand folder", async () => {
    await renderLibrary();

    fireEvent.click(screen.getByRole("button", { name: "Add Component" }));

    const dialog = await screen.findByRole("dialog", { name: "Add Component" });
    const viewMode = within(dialog).getByRole("group", { name: "Add component view mode" });
    expect(within(viewMode).getByRole("button", { name: "Default" })).toHaveAttribute("aria-pressed", "true");
    expect(within(dialog).getByRole("treeitem", { name: "Fabrication" })).toBeInTheDocument();

    fireEvent.change(within(dialog).getByRole("combobox", { name: "Brand" }), {
      target: { value: "Future Studio" },
    });

    expect(within(dialog).getByRole("combobox", { name: "Brand" })).toHaveValue("Future Studio");
    expect(within(viewMode).getByRole("button", { name: "Default" })).toHaveAttribute("aria-pressed", "true");
    expect(within(dialog).queryByRole("treeitem", { name: "All Brands" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("treeitem", { name: "Future Studio" })).not.toBeInTheDocument();

    fireEvent.click(within(viewMode).getByRole("button", { name: "Brand" }));

    expect(within(viewMode).getByRole("button", { name: "Brand" })).toHaveAttribute("aria-pressed", "true");
    expect(within(dialog).getByRole("treeitem", { name: "Future Studio" })).toHaveAttribute("aria-selected", "true");
  });

  it("opens a cost manager with timestamped component cost data", async () => {
    await renderLibrary();

    fireEvent.click(screen.getByRole("button", { name: "Add Component" }));

    const dialog = await screen.findByRole("dialog", { name: "Add Component" });
    expect(within(dialog).getByText("Cost baseline")).toBeInTheDocument();
    expect(within(dialog).getByText(/Updated /)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Open cost manager" }));

    const manager = await screen.findByRole("dialog", { name: "Cost Manager" });
    expect(within(manager).getByText("Variant 1 cost data")).toBeInTheDocument();
    expect(within(manager).getByText("Current entry")).toBeInTheDocument();
    expect(within(manager).getByText("All cost entries")).toBeInTheDocument();
    expect(within(manager).getByRole("textbox", { name: "Cost manager unit cost" })).toBeInTheDocument();
    expect(within(manager).getByRole("textbox", { name: "Cost manager misc cost" })).toBeInTheDocument();
    expect(within(manager).getByLabelText("Cost manager pricing source")).toBeInTheDocument();
    expect(within(manager).getByLabelText("Cost manager pricing date")).toBeInTheDocument();
    expect(within(manager).getByLabelText("Cost manager confidence")).toBeInTheDocument();
    expect(within(manager).getByLabelText("Cost manager source URL")).toBeInTheDocument();
    expect(within(manager).getByLabelText("Cost manager notes")).toBeInTheDocument();

    fireEvent.click(within(manager).getByRole("button", { name: "Add cost entry" }));

    const costEntries = within(manager).getByRole("listbox", { name: "Cost manager entries" });
    expect(within(costEntries).getAllByRole("option")).toHaveLength(2);
  });

  it("renders unit dropdowns with clear code and meaning columns", async () => {
    await renderLibrary();

    fireEvent.click(screen.getByRole("button", { name: "Add Component" }));

    const dialog = await screen.findByRole("dialog", { name: "Add Component" });
    const unitInput = within(dialog).getByRole("combobox", { name: "Unit" });

    fireEvent.focus(unitInput);
    fireEvent.change(unitInput, { target: { value: "" } });

    const unitOptions = within(dialog).getByRole("listbox", { name: "Unit options" });
    expect(within(unitOptions).getByText("Code")).toBeInTheDocument();
    expect(within(unitOptions).getByText("Meaning")).toBeInTheDocument();
    expect(unitOptions.querySelector('[data-combobox-option-code="pc"]')).toHaveTextContent("pc");
    expect(unitOptions.querySelector('[data-combobox-option-meaning="Piece"]')).toHaveTextContent("Piece");

    fireEvent.change(unitInput, { target: { value: "box" } });
    fireEvent.click(within(dialog).getByRole("option", { name: "box Box / carton" }));

    const packageUnitInput = within(dialog).getByRole("combobox", { name: "Content per box unit" });
    fireEvent.focus(packageUnitInput);

    const packageUnitOptions = within(dialog).getByRole("listbox", { name: "Content per box unit options" });
    expect(within(packageUnitOptions).getByText("Code")).toBeInTheDocument();
    expect(within(packageUnitOptions).getByText("Meaning")).toBeInTheDocument();
    expect(packageUnitOptions.querySelector('[data-combobox-option-code="pieces"]')).toHaveTextContent("pieces");
    expect(packageUnitOptions.querySelector('[data-combobox-option-meaning="Count"]')).toHaveTextContent("Count");

    const dimensionUnitInput = within(dialog).getByRole("combobox", { name: "Dimension unit" });
    fireEvent.focus(dimensionUnitInput);

    const dimensionUnitOptions = within(dialog).getByRole("listbox", { name: "Dimension unit options" });
    expect(dimensionUnitOptions).toHaveAttribute("data-combobox-popup-placement", "top");
    expect(within(dimensionUnitOptions).getByText("Code")).toBeInTheDocument();
    expect(within(dimensionUnitOptions).getByText("Meaning")).toBeInTheDocument();
    expect(dimensionUnitOptions.querySelector('[data-combobox-option-code="mm"]')).toHaveTextContent("mm");
    expect(dimensionUnitOptions.querySelector('[data-combobox-option-meaning="Millimeter"]')).toHaveTextContent("Millimeter");
  });

  it("removes collection dropdown behavior instead of hiding it", async () => {
    await renderLibrary({ libraryItems: [...sharedLibraryItems, unmatchedLibraryItem] });

    expect(screen.queryByLabelText("Library row collection")).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Estimate Row Items" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Custom Row Items" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Uncategorized" })).not.toBeInTheDocument();
    expect(screen.queryByText("Custom Row Items")).not.toBeInTheDocument();
    expect(screen.queryByText("Uncategorized")).not.toBeInTheDocument();

    const source = readFileSync(join(process.cwd(), "src/components/workshop/component-library-manager/ComponentLibraryManager.tsx"), "utf8");
    expect(source).not.toContain("RowCollectionSelect");
    expect(source).not.toContain("changeCollection");
    expect(source).not.toContain("collectionOptions");
    expect(source).not.toContain("activeCollectionId");
    expect(source).not.toContain("estimate-row-items");
    expect(source).not.toContain("custom-row-items");
    expect(source).not.toContain("uncategorized");
    expect(source).not.toContain("Uncategorized");
    expect(source).not.toContain("supplier-row-items");
  });

  it("does not expose template UI inside the component route", async () => {
    await renderLibrary();

    expect(screen.queryByRole("tab", { name: "Templates" })).not.toBeInTheDocument();
    expect(screen.queryByText("All Templates")).not.toBeInTheDocument();
    expect(screen.queryByText("Residential Rooms")).not.toBeInTheDocument();
    expect(screen.queryByText("Condo Fit-Out Starter")).not.toBeInTheDocument();
  });

  it("opens right-click actions on editable library folders", async () => {
    await renderLibrary();

    fireEvent.contextMenu(getLibraryFolderButton("Fabrication"), { clientX: 16, clientY: 16 });

    expect(await screen.findByRole("menuitem", { name: "Select" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Add folder" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Rename" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();
  });

  it("searches folder labels without reintroducing procurement scopes as category folders", async () => {
    await renderLibrary();

    fireEvent.change(screen.getByLabelText("Search component library tree"), { target: { value: "luminaire" } });

    expect(screen.getByLabelText("Search component library tree")).toHaveValue("luminaire");
    expect(screen.queryByText("FF&E")).not.toBeInTheDocument();
    expect(screen.queryByText("Furniture, Fixtures, and Equipment")).not.toBeInTheDocument();
    expect(screen.queryByText("Fixtures & Equipment")).not.toBeInTheDocument();
  });
});
