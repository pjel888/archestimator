import { readFileSync } from "node:fs";
import { join } from "node:path";

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DraggingPosition, TreeItem, TreeItemIndex, TreeViewState } from "react-complex-tree";

import { LibraryPageClient } from "@/components/workshop/LibraryPageClient";
import type { EstimateRowItem } from "@/components/workshop/estimate-tree-data";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";

const actionMocks = vi.hoisted(() => ({
  changeCostLibraryComponentLifecycleState: vi.fn(),
  createCostLibraryComponent: vi.fn(),
  createLibraryFolder: vi.fn(),
  deleteLibraryFolder: vi.fn(),
  renameLibraryFolder: vi.fn(),
  reorderLibraryFolders: vi.fn(),
  upsertCostLibraryComponentPriceOption: vi.fn(),
}));

const navigationMocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

type CapturedFolderEnvironmentProps = {
  items: Record<TreeItemIndex, TreeItem<{ folderId: string | null; label: string }>>;
  getItemTitle: (item: TreeItem<{ folderId: string | null; label: string }>) => string;
  viewState?: TreeViewState;
  canDragAndDrop?: boolean;
  canReorderItems?: boolean;
  canDropOnFolder?: boolean;
  canDropOnNonFolder?: boolean;
  canDropBelowOpenFolders?: boolean;
  canDropAt?: (items: TreeItem<{ folderId: string | null; label: string }>[], target: DraggingPosition) => boolean;
  onDrop?: (items: TreeItem<{ folderId: string | null; label: string }>[], target: DraggingPosition) => void | Promise<void>;
};

const rctHarness = vi.hoisted(() => ({
  lastEnvironmentProps: null as CapturedFolderEnvironmentProps | null,
}));

vi.mock("@/lib/component-library/actions", () => actionMocks);

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: navigationMocks.refresh,
  }),
}));

vi.mock("react-complex-tree", () => ({
  InteractionMode: { ClickArrowToExpand: "ClickArrowToExpand" },
  ControlledTreeEnvironment: (props: CapturedFolderEnvironmentProps & { children: React.ReactNode }) => {
    rctHarness.lastEnvironmentProps = props;
    return <div data-rct-environment="true">{props.children}</div>;
  },
  Tree: ({ rootItem, treeLabel }: { rootItem: TreeItemIndex; treeLabel: string }) => {
    const environment = rctHarness.lastEnvironmentProps;
    if (!environment) return null;
    const selectedItems = new Set(environment.viewState?.["library-folder-tree"]?.selectedItems?.map(String) ?? []);

    function renderChildren(parentId: TreeItemIndex): React.ReactNode {
      const parent = environment.items[parentId];
      return (
        <ol>
          {(parent?.children ?? []).map((childId) => {
            const child = environment.items[childId];
            return (
              <li key={String(childId)}>
                <button
                  type="button"
                  role="treeitem"
                  aria-label={environment.getItemTitle(child)}
                  aria-selected={selectedItems.has(String(childId))}
                  data-library-folder-node-id={String(childId)}
                >
                  {environment.getItemTitle(child)}
                </button>
                {child?.children?.length ? renderChildren(childId) : null}
              </li>
            );
          })}
        </ol>
      );
    }

    return (
      <div role="tree" aria-label={treeLabel}>
        {renderChildren(rootItem)}
      </div>
    );
  },
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

const sharedFolders = [
  {
    id: "folder-fabrication",
    workspace_id: "workspace-1",
    parent_id: null,
    name: "Fabrication",
    sort_order: 10,
    source_category_node_id: "db-category-fabrication",
    folder_kind: "taxonomy" as const,
  },
  {
    id: "folder-details",
    workspace_id: "workspace-1",
    parent_id: "folder-fabrication",
    name: "Details",
    sort_order: 10,
    source_category_node_id: null,
    folder_kind: "custom" as const,
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
    id: "db-library-custom-pull",
    material: "Custom Pull",
    name: "Custom Pull",
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
    id: "db-library-owner-sink",
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

describe("workshop library consolidation UI", () => {
  beforeEach(() => {
    actionMocks.createLibraryFolder.mockReset();
    actionMocks.createCostLibraryComponent.mockReset();
    actionMocks.deleteLibraryFolder.mockReset();
    actionMocks.changeCostLibraryComponentLifecycleState.mockReset();
    actionMocks.renameLibraryFolder.mockReset();
    actionMocks.reorderLibraryFolders.mockReset();
    actionMocks.upsertCostLibraryComponentPriceOption.mockReset();
    actionMocks.reorderLibraryFolders.mockResolvedValue(undefined);
    navigationMocks.refresh.mockReset();
    rctHarness.lastEnvironmentProps = null;
  });

  it("uses /workshop/library as the canonical route and redirects the retired components route", () => {
    const libraryRoute = readFileSync(join(process.cwd(), "src/app/workshop/library/page.tsx"), "utf8");
    const componentsRoute = readFileSync(join(process.cwd(), "src/app/workshop/components/page.tsx"), "utf8");
    const templatesRoute = readFileSync(join(process.cwd(), "src/app/workshop/templates/page.tsx"), "utf8");

    expect(libraryRoute).toContain("LibraryPageClient");
    expect(libraryRoute).toContain("getCurrentWorkspaceComponentRowsLibrary");
    expect(libraryRoute).not.toContain("getCurrentWorkspaceComponentLibrary");
    expect(libraryRoute).not.toContain("templates=");
    expect(libraryRoute).toContain('breadcrumbs={["Library"]}');
    expect(libraryRoute).toContain("Workspace library");
    expect(libraryRoute).not.toContain("Categories and templates");
    expect(componentsRoute).toContain('redirect("/workshop/library")');
    expect(componentsRoute).not.toContain("getCurrentWorkspaceComponentLibrary");
    expect(templatesRoute).toContain("TemplatesPageClient");
    expect(templatesRoute).toContain("getCurrentWorkspaceEstimateTemplates");
  });

  it("renders Components as the only route tab with direct folder scoped rows", () => {
    render(
      <LibraryPageClient
        categoryTree={sharedCategoryTree}
        suppliers={[{ id: "db-supplier", name: "Database Supplier", sort_order: 1 }]}
        libraryFolders={sharedFolders}
        libraryItems={sharedLibraryItems}
      />,
    );

    const libraryTabs = screen.getByRole("tablist", { name: "Library views" });
    expect(within(libraryTabs).getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Components"]);
    expect(within(libraryTabs).getByRole("tab", { name: "Components" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("tab", { name: "Templates" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Suppliers" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Custom" })).not.toBeInTheDocument();

    const viewMode = screen.getByRole("group", { name: "Component view mode" });
    expect(within(viewMode).getByRole("button", { name: "View By: Default" })).toHaveAttribute("aria-pressed", "true");
    expect(within(viewMode).getByRole("button", { name: "Suppliers" })).toHaveAttribute("aria-pressed", "false");

    expect(screen.queryByLabelText("Library row collection")).not.toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Fabrication" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Database Steel Frame")).toBeInTheDocument();
  });

  it("opens the Add Component modal and submits categorized versioned pricing", async () => {
    actionMocks.createCostLibraryComponent.mockResolvedValue({
      itemId: "new-component-id",
      activePriceOptionId: "new-price-id",
      versionNumber: 1,
    });

    render(
      <LibraryPageClient
        categoryTree={sharedCategoryTree}
        suppliers={[{ id: "db-supplier", name: "Database Supplier", sort_order: 1 }]}
        libraryFolders={sharedFolders}
        libraryItems={sharedLibraryItems}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add Component" }));

    const dialog = await screen.findByRole("dialog", { name: "Add Component" });
    fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "Acoustic Wall Panel" } });
    fireEvent.change(within(dialog).getByLabelText("Unit"), { target: { value: "sqm" } });

    fireEvent.click(within(dialog).getByRole("tab", { name: "Classify" }));
    fireEvent.change(within(dialog).getByLabelText("Supplier"), { target: { value: "db-supplier" } });

    fireEvent.click(within(dialog).getByRole("tab", { name: "Pricing" }));
    fireEvent.change(within(dialog).getByLabelText("Price option 1 unit cost"), { target: { value: "1250" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add price option" }));
    fireEvent.change(within(dialog).getByLabelText("Price option 2 label"), { target: { value: "Installed" } });
    fireEvent.change(within(dialog).getByLabelText("Price option 2 unit cost"), { target: { value: "1800" } });
    fireEvent.change(within(dialog).getByLabelText("Price option 2 misc cost"), { target: { value: "150" } });

    fireEvent.click(within(dialog).getByRole("tab", { name: "Lifecycle" }));
    fireEvent.change(within(dialog).getByLabelText("Component state"), { target: { value: "in_production" } });

    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(actionMocks.createCostLibraryComponent).toHaveBeenCalledTimes(1));
    expect(actionMocks.createCostLibraryComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Acoustic Wall Panel",
        unit: "sqm",
        libraryFolderId: "folder-fabrication",
        categoryNodeId: "db-category-fabrication",
        supplierId: "db-supplier",
        lifecycleState: "in_production",
        priceOptions: [
          expect.objectContaining({ label: "Retail", unit: "sqm", unitCost: 1250, miscCost: 0, isDefault: true }),
          expect.objectContaining({ label: "Installed", unit: "sqm", unitCost: 1800, miscCost: 150, isDefault: false }),
        ],
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Add Component" })).not.toBeInTheDocument());
  });

  it("exposes editable price-option and lifecycle controls on versioned rows", async () => {
    actionMocks.upsertCostLibraryComponentPriceOption.mockResolvedValue({
      itemId: "db-library-steel-frame",
      priceOptionId: "installed-price",
      versionNumber: 2,
    });
    actionMocks.changeCostLibraryComponentLifecycleState.mockResolvedValue({
      itemId: "db-library-steel-frame",
      lifecycleState: "discontinued",
      versionNumber: 3,
    });

    render(
      <LibraryPageClient
        categoryTree={sharedCategoryTree}
        suppliers={[{ id: "db-supplier", name: "Database Supplier", sort_order: 1 }]}
        libraryFolders={sharedFolders}
        libraryItems={[
          {
            ...sharedLibraryItems[0],
            lifecycleState: "available",
            componentVersionNumber: 1,
            priceOptionId: "retail-price",
            priceOptionLabel: "Retail",
            priceOptions: [
              { id: "retail-price", label: "Retail", unit: "pc", unitCost: 1200, miscCost: 0, currency: "PHP", isDefault: true, isActive: true },
              { id: "installed-price", label: "Installed", unit: "pc", unitCost: 1600, miscCost: 100, currency: "PHP", isDefault: false, isActive: true },
            ],
            history: [
              { id: "version-1", type: "version", label: "Version 1", summary: "Component created", effectiveAt: "2026-05-22T00:00:00.000Z" },
            ],
          },
        ]}
      />,
    );

    expect(screen.getAllByText("Available").length).toBeGreaterThan(0);
    expect(screen.getByText("History / v1")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Pricing option for Database Steel Frame"), { target: { value: "installed-price" } });
    await waitFor(() => expect(actionMocks.upsertCostLibraryComponentPriceOption).toHaveBeenCalledTimes(1));
    expect(actionMocks.upsertCostLibraryComponentPriceOption).toHaveBeenCalledWith(
      "db-library-steel-frame",
      expect.objectContaining({ id: "installed-price", label: "Installed", isDefault: true }),
    );

    fireEvent.change(screen.getByLabelText("Lifecycle state for Database Steel Frame"), { target: { value: "discontinued" } });
    await waitFor(() => expect(actionMocks.changeCostLibraryComponentLifecycleState).toHaveBeenCalledTimes(1));
    expect(actionMocks.changeCostLibraryComponentLifecycleState).toHaveBeenCalledWith(
      expect.objectContaining({
        itemId: "db-library-steel-frame",
        lifecycleState: "discontinued",
      }),
    );
  });

  it("keeps supplier organization inside Components and scopes the sheet directly to suppliers", () => {
    render(
      <LibraryPageClient
        categoryTree={sharedCategoryTree}
        suppliers={[
          { id: "db-supplier", name: "Database Supplier", sort_order: 1 },
          { id: "db-custom-supplier", name: "Custom Maker", sort_order: 2 },
        ]}
        libraryFolders={sharedFolders}
        libraryItems={sharedLibraryItems}
      />,
    );

    const viewMode = screen.getByRole("group", { name: "Component view mode" });
    fireEvent.click(within(viewMode).getByRole("button", { name: "Suppliers" }));
    const updatedViewMode = screen.getByRole("group", { name: "Component view mode" });

    expect(within(updatedViewMode).getByRole("button", { name: "Suppliers" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("tab", { name: "Suppliers" })).not.toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "All Suppliers" })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByRole("treeitem", { name: "Database Supplier" }));

    const sheet = screen.getByLabelText("Component sheet");
    expect(within(sheet).getByText("Database Steel Frame")).toBeInTheDocument();
    expect(within(sheet).queryByText("Owner Supplied Sink")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Library row collection")).not.toBeInTheDocument();
  });

  it("uses the shared drag/drop tree environment for editable library folders", async () => {
    render(
      <LibraryPageClient
        categoryTree={sharedCategoryTree}
        suppliers={[{ id: "db-supplier", name: "Database Supplier", sort_order: 1 }]}
        libraryFolders={sharedFolders}
        libraryItems={sharedLibraryItems}
      />,
    );

    const environment = rctHarness.lastEnvironmentProps;
    expect(environment).toMatchObject({
      canDragAndDrop: true,
      canReorderItems: true,
      canDropOnFolder: true,
      canDropOnNonFolder: false,
      canDropBelowOpenFolders: true,
    });

    const detailItem = environment?.items["folder:folder-details"];
    expect(detailItem).toBeDefined();
    expect(environment?.canDropAt?.([detailItem!], {
      targetType: "between-items",
      parentItem: "library-folder-tree-root",
      childIndex: 0,
      linearIndex: 0,
    })).toBe(true);

    await environment?.onDrop?.([detailItem!], {
      targetType: "between-items",
      parentItem: "library-folder-tree-root",
      childIndex: 0,
      linearIndex: 0,
    });

    await waitFor(() => {
      expect(actionMocks.reorderLibraryFolders).toHaveBeenCalledWith({
        updates: expect.arrayContaining([
          expect.objectContaining({ id: "folder-details", parentId: null, sortOrder: 10 }),
          expect.objectContaining({ id: "folder-fabrication", parentId: null, sortOrder: 20 }),
        ]),
      });
    });
  });
});
