import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ComponentLibraryManager } from "@/components/workshop/component-library-manager/ComponentLibraryManager";
import type { EstimateRowItem } from "@/components/workshop/estimate-tree-data";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";

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

vi.mock("@/lib/component-library/actions", () => actionMocks);

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

function renderManager() {
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
    actionMocks.updateCostLibraryComponent.mockReset();
    actionMocks.updateCostLibraryComponent.mockResolvedValue({ itemId: "item-fresh", versionNumber: 2 });
    actionMocks.upsertCostLibraryComponentPriceOption.mockReset();
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
    expect(screen.getByText("Fresh Tile")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Filter components" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByLabelText("Discontinued"));

    await waitFor(() => {
      expect(screen.queryByText("Fresh Tile")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Discontinued Plank")).toBeInTheDocument();
    expect(screen.getByText(/1 of 3 after filters/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    await waitFor(() => {
      expect(screen.getByText("Fresh Tile")).toBeInTheDocument();
    });
    expect(dialog).toBeInTheDocument();
  });

  it("filters by pricing freshness", async () => {
    renderManager();
    await waitForSheet();

    fireEvent.click(screen.getByRole("button", { name: "Filter components" }));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByLabelText(/Older than 90 days/));

    await waitFor(() => {
      expect(screen.queryByText("Fresh Tile")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Stale Paint")).toBeInTheDocument();
  });

  it("seeds facet state from deep-link search params", async () => {
    navigationMocks.searchParams = new URLSearchParams("lifecycle=discontinued");
    renderManager();
    await waitForSheet();

    await waitFor(() => {
      expect(screen.queryByText("Fresh Tile")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Discontinued Plank")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filter components (1 active)" })).toBeInTheDocument();
  });

  it("supports the missing-brand deep link from the library health line", async () => {
    navigationMocks.searchParams = new URLSearchParams("brand=none");
    renderManager();
    await waitForSheet();

    await waitFor(() => {
      expect(screen.queryByText("Fresh Tile")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Stale Paint")).toBeInTheDocument();
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

  it("announces search result counts in the context strip", async () => {
    renderManager();
    await waitForSheet();

    fireEvent.click(screen.getByRole("button", { name: "Show component table search" }));
    const input = await screen.findByLabelText("Search components");
    fireEvent.change(input, { target: { value: "Stale" } });

    expect(await screen.findByText('1 of 3 match "Stale"')).toBeInTheDocument();
  });
});
