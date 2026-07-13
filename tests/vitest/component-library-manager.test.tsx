import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ComponentLibraryManager } from "@/components/workshop/component-library-manager/ComponentLibraryManager";
import type { EstimateRowItem } from "@/components/workshop/estimate-tree-data";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import { withExpressComponentMetadata, withProjectComponentProjectionMetadata } from "@/lib/estimates/express-components";

const actionMocks = vi.hoisted(() => ({
  changeCostLibraryComponentLifecycleState: vi.fn(),
  createCostLibraryComponent: vi.fn(),
  saveCostLibraryComponentDraft: vi.fn(),
  createLibraryFolder: vi.fn(),
  deleteLibraryFolder: vi.fn(),
  deleteLibraryFoldersBulk: vi.fn(),
  executeBulkArchiveLibraryComponents: vi.fn(),
  getCostLibraryComponentUsage: vi.fn(),
  loadCostLibraryComponentRowDetail: vi.fn(),
  moveCostLibraryComponentToFolder: vi.fn(),
  previewBulkArchiveLibraryComponents: vi.fn(),
  renameLibraryFolder: vi.fn(),
  reorderLibraryFolders: vi.fn(),
  updateCostLibraryComponent: vi.fn(),
  upsertCostLibraryComponentPriceOption: vi.fn(),
}));

const navigationMocks = vi.hoisted(() => {
  const push = vi.fn();
  const refresh = vi.fn();
  const replace = vi.fn();
  return {
    push,
    refresh,
    replace,
    router: { push, refresh, replace },
    pathname: "/workshop/library/components",
    searchParams: new URLSearchParams(),
  };
});

const promotionMocks = vi.hoisted(() => ({
  promoteExpressRowToLibraryComponent: vi.fn(),
}));

vi.mock("@/lib/component-library/actions", () => actionMocks);
vi.mock("@/lib/estimates/express-promotion-actions", () => promotionMocks);

vi.mock("next/navigation", () => ({
  useRouter: () => navigationMocks.router,
  usePathname: () => navigationMocks.pathname,
  useSearchParams: () => new URLSearchParams(window.location.search),
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
    source_category_node_id: null,
    folder_kind: "custom" as const,
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
    confidence: "Quoted",
    lifecycleState: "available",
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

function renderManager({ canManageLibrary = true }: { canManageLibrary?: boolean } = {}) {
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
      canManageLibrary={canManageLibrary}
    />,
  );
}

async function waitForSheet() {
  await screen.findByRole("button", { name: "Add component" }, { timeout: 10_000 });
}

function getComponentNameInspectButton(itemId: string) {
  const button = document.querySelector(`[data-component-card-inspect="${itemId}"]`);
  if (!(button instanceof HTMLElement)) throw new Error(`Inspect button not found for ${itemId}`);
  return button;
}

describe("ComponentLibraryManager Phase 1 uplift", () => {
  beforeEach(() => {
    navigationMocks.searchParams = new URLSearchParams();
    window.history.replaceState(null, "", navigationMocks.pathname);
    navigationMocks.push.mockReset();
    navigationMocks.refresh.mockReset();
    navigationMocks.replace.mockReset();
    actionMocks.saveCostLibraryComponentDraft.mockReset();
    actionMocks.saveCostLibraryComponentDraft.mockResolvedValue({
      draftId: "component-draft-1",
      savedAt: "2026-07-06T00:00:00.000Z",
    });
    actionMocks.getCostLibraryComponentUsage.mockReset();
    actionMocks.getCostLibraryComponentUsage.mockResolvedValue({ templateRowCount: 2, estimateRowCount: 6 });
    actionMocks.loadCostLibraryComponentRowDetail.mockReset();
    actionMocks.loadCostLibraryComponentRowDetail.mockResolvedValue(null);
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

  it("hides mutation affordances when library management capability is read-only", async () => {
    renderManager({ canManageLibrary: false });
    await screen.findByRole("button", { name: "Filter components" });

    expect(screen.queryByRole("button", { name: "Add component" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add library folder" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Select Fresh Tile for archive")).not.toBeInTheDocument();
    expect(screen.queryByText("Archive selected")).not.toBeInTheDocument();

    fireEvent.click(getComponentNameInspectButton("item-fresh"));
    const dock = await screen.findByRole("region", { name: "Component details for Fresh Tile" });
    expect(within(dock).queryByRole("button", { name: "Edit component" })).not.toBeInTheDocument();
    expect(within(dock).queryByRole("button", { name: "Duplicate" })).not.toBeInTheDocument();
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
    const dialog = await screen.findByRole("region", { name: "Filter components" });
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
    await screen.findByRole("region", { name: "Filter components" });
    fireEvent.click(screen.getByLabelText(/Older than 90 days/));

    await waitFor(() => {
      expect(within(sheet).queryByText("Fresh Tile")).not.toBeInTheDocument();
    });
    expect(within(sheet).getByText("Stale Paint")).toBeInTheDocument();
  });

  it("seeds facet state from deep-link search params", async () => {
    navigationMocks.searchParams = new URLSearchParams("lifecycle=discontinued");
    window.history.replaceState(null, "", `${navigationMocks.pathname}?lifecycle=discontinued`);
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
    window.history.replaceState(null, "", `${navigationMocks.pathname}?brand=none`);
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
    actionMocks.loadCostLibraryComponentRowDetail.mockResolvedValueOnce({
      ...fixtureItems[0],
      history: [{
        id: "price-history-1",
        type: "price",
        label: "Fresh Tile",
        summary: "Price option changed (₱100.00)",
        effectiveAt: "2026-06-01T00:00:00.000Z",
        createdAt: "2026-06-01T00:00:00.000Z",
      }],
    });
    renderManager();
    await waitForSheet();

    fireEvent.click(getComponentNameInspectButton("item-fresh"));

    const dock = await screen.findByRole("region", { name: "Component details for Fresh Tile" });
    expect(within(dock).getByText("Mariwasa")).toBeInTheDocument();
    const trustChips = within(dock).getByLabelText("Source trust for Fresh Tile");
    expect(within(trustChips).queryByText("Fresh price")).not.toBeInTheDocument();
    expect(within(trustChips).getByText("Verified source")).toBeInTheDocument();
    expect(within(dock).getByText("Confidence")).toBeInTheDocument();
    expect(within(dock).getByText("Quoted")).toBeInTheDocument();
    expect(within(dock).getByText("Available")).toBeInTheDocument();
    expect(await within(dock).findByText("Price option changed (₱100.00)")).toBeInTheDocument();
    expect(await within(dock).findByText("2 template rows · 6 estimate rows")).toBeInTheDocument();
    expect(actionMocks.getCostLibraryComponentUsage).toHaveBeenCalledWith({ itemId: "item-fresh" });
    expect(actionMocks.loadCostLibraryComponentRowDetail).toHaveBeenCalledWith("item-fresh");
  });

  it("closes the inspector on Escape and returns focus to the card", async () => {
    renderManager();
    await waitForSheet();

    const cardButton = getComponentNameInspectButton("item-fresh");
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

  it("opens the edit drawer from the inspector and saves through the versioned actions", async () => {
    renderManager();
    await waitForSheet();

    fireEvent.click(getComponentNameInspectButton("item-fresh"));
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
        canManageLibrary
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
        canManageLibrary
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
