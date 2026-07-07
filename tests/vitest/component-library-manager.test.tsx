import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ComponentLibraryManager } from "@/components/workshop/component-library-manager/ComponentLibraryManager";
import type { EstimateRowItem } from "@/components/workshop/estimate-tree-data";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import { withExpressComponentMetadata, withProjectComponentProjectionMetadata } from "@/lib/estimates/express-components";

const actionMocks = vi.hoisted(() => ({
  changeCostLibraryComponentLifecycleState: vi.fn(),
  createCostLibraryComponent: vi.fn(),
  createLibraryFolder: vi.fn(),
  deleteLibraryFolder: vi.fn(),
  deleteLibraryFoldersBulk: vi.fn(),
  executeBulkArchiveLibraryComponents: vi.fn(),
  getCostLibraryComponentUsage: vi.fn(),
  moveCostLibraryComponentToFolder: vi.fn(),
  previewBulkArchiveLibraryComponents: vi.fn(),
  renameLibraryFolder: vi.fn(),
  reorderLibraryFolders: vi.fn(),
  updateCostLibraryComponent: vi.fn(),
  upsertCostLibraryComponentPriceOption: vi.fn(),
}));

const navigationMocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  searchParams: new URLSearchParams(),
}));

const promotionMocks = vi.hoisted(() => ({
  promoteExpressRowToLibraryComponent: vi.fn(),
}));

vi.mock("@/lib/component-library/actions", () => actionMocks);
vi.mock("@/lib/estimates/express-promotion-actions", () => promotionMocks);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: navigationMocks.refresh }),
  useSearchParams: () => navigationMocks.searchParams,
}));

vi.mock("react-complex-tree", () => ({
  InteractionMode: { ClickArrowToExpand: "ClickArrowToExpand" },
  ControlledTreeEnvironment: ({ children }: { children: React.ReactNode }) => (
    <div data-rct-environment="true">{children}</div>
  ),
  Tree: () => null,
}));

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

const categoryTree: ComponentLibraryTaxonomyNode[] = [
  {
    id: "cat-finishes",
    label: "Finishes",
    kind: "category",
  },
];

const folders = [
  {
    id: "folder-finishes",
    workspace_id: "workspace-1",
    parent_id: null,
    name: "Finishes",
    sort_order: 10,
    source_category_node_id: "cat-finishes",
    folder_kind: "taxonomy" as const,
  },
];

function makeItem(overrides: Partial<EstimateRowItem> & { id: string; material: string }): EstimateRowItem {
  return {
    name: overrides.material,
    description: "",
    supplier: "Default Supplier",
    source: "library",
    unit: "pc",
    itemCost: 100,
    quantity: 1,
    subTotal: 100,
    miscCost: 0,
    totalItemCosts: 100,
    category: "Finishes",
    categoryNodeId: "cat-finishes",
    categoryPath: ["Finishes"],
    libraryFolderId: "folder-finishes",
    pricingSource: "Test source",
    pricingDate: todayIsoDate(),
    ...overrides,
  };
}

const fixtureItems: EstimateRowItem[] = [
  makeItem({
    id: "item-fresh",
    material: "Fresh Tile",
    brand: "Mariwasa",
    brandId: "brand-mariwasa",
    confidence: "Quoted",
    lifecycleState: "available",
    supplierId: "sup-1",
  }),
  makeItem({
    id: "item-discontinued",
    material: "Discontinued Plank",
    brand: "Kahrs",
    confidence: "Estimated",
    lifecycleState: "discontinued",
  }),
  makeItem({
    id: "item-stale-no-brand",
    material: "Stale Paint",
    brand: undefined,
    confidence: "Quoted",
    lifecycleState: "available",
    pricingDate: "2024-01-01",
  }),
];

function renderManager(options: { canManageLibrary?: boolean } = {}) {
  return render(
    <ComponentLibraryManager
      categoryTree={categoryTree}
      suppliers={[{ id: "sup-1", name: "Default Supplier", sort_order: 1 }]}
      brands={[
        { id: "brand-mariwasa", name: "Mariwasa", normalized_name: "mariwasa", sort_order: 1 },
        { id: "brand-kahrs", name: "Kahrs", normalized_name: "kahrs", sort_order: 2 },
      ]}
      libraryFolders={folders}
      libraryItems={fixtureItems}
      canManageLibrary={options.canManageLibrary ?? true}
    />,
  );
}

async function waitForSheet() {
  await screen.findByRole("button", { name: "Add component" }, { timeout: 10_000 });
}

describe("ComponentLibraryManager Phase 1 uplift", () => {
  beforeEach(() => {
    navigationMocks.searchParams = new URLSearchParams();
    navigationMocks.refresh.mockReset();
    actionMocks.getCostLibraryComponentUsage.mockReset();
    actionMocks.getCostLibraryComponentUsage.mockResolvedValue({ templateRowCount: 2, estimateRowCount: 6 });
    actionMocks.changeCostLibraryComponentLifecycleState.mockReset();
    actionMocks.changeCostLibraryComponentLifecycleState.mockResolvedValue({
      itemId: "item-fresh",
      versionNumber: 3,
      lifecycleState: "discontinued",
    });
    actionMocks.updateCostLibraryComponent.mockReset();
    actionMocks.updateCostLibraryComponent.mockResolvedValue({ itemId: "item-fresh", versionNumber: 2 });
    actionMocks.upsertCostLibraryComponentPriceOption.mockReset();
    promotionMocks.promoteExpressRowToLibraryComponent.mockReset();
  });

  it("hosts the folder tree panel before the sheet (tree on the left)", async () => {
    renderManager();
    await waitForSheet();

    const treePanel = document.querySelector("[data-component-library-tree-panel='true']");
    const sheetPanel = document.querySelector("[data-component-library-sheet-panel='true']");
    expect(treePanel).not.toBeNull();
    expect(sheetPanel).not.toBeNull();
    expect(
      treePanel!.compareDocumentPosition(sheetPanel!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders a lifecycle badge on non-available components only", async () => {
    renderManager();
    await waitForSheet();

    const badge = await screen.findByText("Discontinued", { selector: "[data-component-lifecycle-badge]" });
    expect(badge).toHaveAttribute("data-component-lifecycle-badge", "discontinued");
    expect(document.querySelectorAll("[data-component-lifecycle-badge]")).toHaveLength(1);
  });

  it("filters the catalogue through the facet popover and resets", async () => {
    renderManager();
    await waitForSheet();
    // The facet filter scopes the catalogue sheet; the folder tree (a separate
    // surface) also lists component names, so assert against the sheet panel.
    const sheet = document.querySelector("[data-component-library-sheet-panel='true']") as HTMLElement;
    expect(within(sheet).getByText("Fresh Tile")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Filter components" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByLabelText("Discontinued"));

    await waitFor(() => {
      expect(within(sheet).queryByText("Fresh Tile")).not.toBeInTheDocument();
    });
    expect(within(sheet).getByText("Discontinued Plank")).toBeInTheDocument();
    expect(screen.getByText(/1 of 3 after filters/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    await waitFor(() => {
      expect(within(sheet).getByText("Fresh Tile")).toBeInTheDocument();
    });
    expect(dialog).toBeInTheDocument();
  });

  it("filters by pricing freshness", async () => {
    renderManager();
    await waitForSheet();
    const sheet = document.querySelector("[data-component-library-sheet-panel='true']") as HTMLElement;

    fireEvent.click(screen.getByRole("button", { name: "Filter components" }));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByLabelText(/Older than 90 days/));

    await waitFor(() => {
      expect(within(sheet).queryByText("Fresh Tile")).not.toBeInTheDocument();
    });
    expect(within(sheet).getByText("Stale Paint")).toBeInTheDocument();
  });

  it("seeds facet state from deep-link search params", async () => {
    navigationMocks.searchParams = new URLSearchParams("lifecycle=discontinued");
    renderManager();
    await waitForSheet();
    const sheet = document.querySelector("[data-component-library-sheet-panel='true']") as HTMLElement;

    await waitFor(() => {
      expect(within(sheet).queryByText("Fresh Tile")).not.toBeInTheDocument();
    });
    expect(within(sheet).getByText("Discontinued Plank")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filter components (1 active)" })).toBeInTheDocument();
  });

  it("supports the missing-brand deep link from the library health line", async () => {
    navigationMocks.searchParams = new URLSearchParams("brand=none");
    renderManager();
    await waitForSheet();
    const sheet = document.querySelector("[data-component-library-sheet-panel='true']") as HTMLElement;

    await waitFor(() => {
      expect(within(sheet).queryByText("Fresh Tile")).not.toBeInTheDocument();
    });
    expect(within(sheet).getByText("Stale Paint")).toBeInTheDocument();
  });

  it("opens and focuses the sheet search disclosure on Cmd+K", async () => {
    renderManager();
    await waitForSheet();
    expect(screen.queryByLabelText("Search components")).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "k", metaKey: true });

    const input = await screen.findByLabelText("Search components");
    await waitFor(() => {
      expect(input).toHaveFocus();
    });
  });

  it("opens the inspector dock on card click with details and usage counts", async () => {
    renderManager();
    await waitForSheet();

    fireEvent.click(screen.getByRole("button", { name: "View details for Fresh Tile" }));

    const dock = await screen.findByRole("region", { name: "Component details for Fresh Tile" });
    expect(within(dock).getByText("Mariwasa")).toBeInTheDocument();
    expect(within(dock).getByText("Quoted")).toBeInTheDocument();
    expect(within(dock).getByText("Available")).toBeInTheDocument();
    expect(await within(dock).findByText("2 template rows · 6 estimate rows")).toBeInTheDocument();
    expect(actionMocks.getCostLibraryComponentUsage).toHaveBeenCalledWith({ itemId: "item-fresh" });
  });

  it("closes the inspector on Escape and returns focus to the card", async () => {
    renderManager();
    await waitForSheet();

    const cardButton = screen.getByRole("button", { name: "View details for Fresh Tile" });
    fireEvent.click(cardButton);
    await screen.findByRole("region", { name: "Component details for Fresh Tile" });

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("region", { name: "Component details for Fresh Tile" })).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(cardButton).toHaveFocus();
    });
  });

  it("hides inspector mutation controls for read-only workspace viewers", async () => {
    renderManager({ canManageLibrary: false });

    expect(screen.queryByRole("button", { name: "Add component" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View details for Fresh Tile" }));
    const dock = await screen.findByRole("region", { name: "Component details for Fresh Tile" });

    expect(within(dock).queryByRole("button", { name: "Edit component" })).not.toBeInTheDocument();
    expect(within(dock).queryByRole("button", { name: "Duplicate" })).not.toBeInTheDocument();
  });

  it("opens the edit drawer from the inspector and saves through the versioned actions", async () => {
    renderManager();
    await waitForSheet();

    fireEvent.click(screen.getByRole("button", { name: "View details for Fresh Tile" }));
    const dock = await screen.findByRole("region", { name: "Component details for Fresh Tile" });
    fireEvent.click(within(dock).getByRole("button", { name: "Edit component" }));

    const drawer = await screen.findByRole("dialog", { name: "Edit component" });
    const nameInput = within(drawer).getByDisplayValue("Fresh Tile");
    fireEvent.change(nameInput, { target: { value: "Fresh Tile Premium" } });
    fireEvent.click(within(drawer).getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(actionMocks.updateCostLibraryComponent).toHaveBeenCalledWith(
        "item-fresh",
        expect.objectContaining({ name: "Fresh Tile Premium" }),
      );
    });
    expect(actionMocks.upsertCostLibraryComponentPriceOption).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText("Component updated.")).toBeInTheDocument();
    });
  });

  it("clears stale supplier and brand ids when inspector free-text values change", async () => {
    renderManager();
    await waitForSheet();

    fireEvent.click(screen.getByRole("button", { name: "View details for Fresh Tile" }));
    const dock = await screen.findByRole("region", { name: "Component details for Fresh Tile" });
    fireEvent.click(within(dock).getByRole("button", { name: "Edit component" }));

    const drawer = await screen.findByRole("dialog", { name: "Edit component" });
    fireEvent.change(within(drawer).getByLabelText("Supplier"), { target: { value: "New Supplier" } });
    fireEvent.change(within(drawer).getByLabelText("Brand"), { target: { value: "New Brand" } });
    fireEvent.click(within(drawer).getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(actionMocks.updateCostLibraryComponent).toHaveBeenCalledWith(
        "item-fresh",
        expect.objectContaining({
          supplier: "New Supplier",
          supplierId: null,
          brand: "New Brand",
          brandId: null,
        }),
      );
    });
  });

  it("persists inspector lifecycle changes through the lifecycle action", async () => {
    renderManager();
    await waitForSheet();

    fireEvent.click(screen.getByRole("button", { name: "View details for Fresh Tile" }));
    const dock = await screen.findByRole("region", { name: "Component details for Fresh Tile" });
    fireEvent.click(within(dock).getByRole("button", { name: "Edit component" }));

    const drawer = await screen.findByRole("dialog", { name: "Edit component" });
    fireEvent.click(within(drawer).getByRole("combobox", { name: "Lifecycle state" }));
    fireEvent.click(await screen.findByRole("option", { name: "Discontinued" }));
    fireEvent.click(within(drawer).getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(actionMocks.changeCostLibraryComponentLifecycleState).toHaveBeenCalledWith({
        itemId: "item-fresh",
        lifecycleState: "discontinued",
        changeReason: "Edited from the component inspector",
      });
    });
    expect(actionMocks.updateCostLibraryComponent).not.toHaveBeenCalled();
  });

  it("announces search result counts in the context strip", async () => {
    renderManager();
    await waitForSheet();

    fireEvent.click(screen.getByRole("button", { name: "Show component table search" }));
    const input = await screen.findByLabelText("Search components");
    fireEvent.change(input, { target: { value: "Stale" } });

    expect(await screen.findByText('1 of 3 match "Stale"')).toBeInTheDocument();
  });
  it("promotes project express components from the Project catalogue card", async () => {
    promotionMocks.promoteExpressRowToLibraryComponent.mockResolvedValue({
      rowId: "project-row-1",
      itemId: "library-item-1",
    });
    const projectFolder = {
      id: "project-components-project-1",
      workspace_id: "workspace-1",
      parent_id: null,
      name: "Project",
      sort_order: -100,
      source_category_node_id: null,
      folder_kind: "custom" as const,
    };
    const expressFolder = {
      id: "project-components-project-1-express",
      workspace_id: "workspace-1",
      parent_id: projectFolder.id,
      name: "Express",
      sort_order: -90,
      source_category_node_id: null,
      folder_kind: "custom" as const,
    };
    const expressMetadata = withProjectComponentProjectionMetadata(
      withExpressComponentMetadata({}, { id: "express-1" }),
      { projectId: "project-1", estimateId: "estimate-1", nodeId: "node-1", classification: "express" },
    );
    const projectItem = makeItem({
      id: "project-row-1",
      material: "Express Vanity",
      source: "project",
      sourceLibraryItemId: null,
      linkState: "unlinked",
      libraryFolderId: expressFolder.id,
      metadata: expressMetadata,
    });

    render(
      <ComponentLibraryManager
        categoryTree={categoryTree}
        libraryFolders={[projectFolder, expressFolder]}
        libraryItems={[projectItem]}
        projectId="project-1"
        promotionEnabled
      />,
    );
    await waitForSheet();

    fireEvent.click(screen.getByRole("button", { name: "Promote Express Vanity to library" }));

    await waitFor(() => {
      expect(promotionMocks.promoteExpressRowToLibraryComponent).toHaveBeenCalledWith({
        projectId: "project-1",
        estimateId: "estimate-1",
        rowId: "project-row-1",
      });
    });
    await waitFor(() => expect(screen.queryByRole("button", { name: "Promote Express Vanity to library" })).not.toBeInTheDocument());
    expect(screen.getByText("Express Vanity promoted to the workspace library.")).toBeInTheDocument();
  });

  it("promotes detached project-specific components from the Project catalogue card", async () => {
    promotionMocks.promoteExpressRowToLibraryComponent.mockResolvedValue({
      rowId: "detached-row-1",
      itemId: "library-item-2",
    });
    const projectFolder = {
      id: "project-components-project-1",
      workspace_id: "workspace-1",
      parent_id: null,
      name: "Project",
      sort_order: -100,
      source_category_node_id: null,
      folder_kind: "custom" as const,
    };
    const detachedFolder = {
      id: "project-components-project-1-detached",
      workspace_id: "workspace-1",
      parent_id: projectFolder.id,
      name: "Project-specific",
      sort_order: -80,
      source_category_node_id: null,
      folder_kind: "custom" as const,
    };
    const detachedMetadata = withProjectComponentProjectionMetadata(
      {},
      { projectId: "project-1", estimateId: "estimate-1", nodeId: "node-1", classification: "detached-library" },
    );
    const projectItem = makeItem({
      id: "detached-row-1",
      material: "Custom Closet",
      source: "project",
      sourceLibraryItemId: null,
      linkState: "detached",
      libraryFolderId: detachedFolder.id,
      metadata: detachedMetadata,
    });

    render(
      <ComponentLibraryManager
        categoryTree={categoryTree}
        libraryFolders={[projectFolder, detachedFolder]}
        libraryItems={[projectItem]}
        projectId="project-1"
        promotionEnabled
      />,
    );
    await waitForSheet();

    fireEvent.click(screen.getByRole("button", { name: "Promote Custom Closet to library" }));

    await waitFor(() => {
      expect(promotionMocks.promoteExpressRowToLibraryComponent).toHaveBeenCalledWith({
        projectId: "project-1",
        estimateId: "estimate-1",
        rowId: "detached-row-1",
      });
    });
    await waitFor(() => expect(screen.queryByRole("button", { name: "Promote Custom Closet to library" })).not.toBeInTheDocument());
    expect(screen.getByText("Custom Closet promoted to the workspace library.")).toBeInTheDocument();
  });

});
