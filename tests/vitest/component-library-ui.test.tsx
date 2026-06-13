import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { EstimateRightSidebar } from "@/components/workshop/component-library";
import { LIBRARY_PREFS_KEY, LIBRARY_RECENTS_KEY } from "@/components/workshop/component-library/helpers";
import { PROJECT_SOURCE_DRAG_MIME_TYPE, type EstimateTemplate } from "@/components/workshop/component-library/templates";
import { estimateLibraryItems, type EstimateRowItem, type EstimateTreeNode } from "@/components/workshop/estimate-tree-data";
import { useEstimateWorkshopDragState } from "@/components/workshop/estimate-workshop-drag";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import type { ReusableEstimateSource } from "@/lib/reusable-sources/types";

const templateActionMocks = vi.hoisted(() => ({
  createEstimateTemplate: vi.fn(),
  createEstimateTemplateFromEstimateTab: vi.fn(),
  createEstimateTemplateFromEstimateNode: vi.fn(),
  renameEstimateTemplate: vi.fn(),
  deleteEstimateTemplate: vi.fn(),
}));

const reusableSourceActionMocks = vi.hoisted(() => ({
  listReusableProjectSources: vi.fn(),
  listReusableProjectEstimateSources: vi.fn(),
  getReusableEstimateOutline: vi.fn(),
  searchReusableProjectSources: vi.fn(),
}));

vi.mock("@/lib/component-library/actions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/component-library/actions")>()),
  createEstimateTemplate: templateActionMocks.createEstimateTemplate,
  createEstimateTemplateFromEstimateTab: templateActionMocks.createEstimateTemplateFromEstimateTab,
  createEstimateTemplateFromEstimateNode: templateActionMocks.createEstimateTemplateFromEstimateNode,
  renameEstimateTemplate: templateActionMocks.renameEstimateTemplate,
  deleteEstimateTemplate: templateActionMocks.deleteEstimateTemplate,
}));

vi.mock("@/lib/reusable-sources/actions", () => ({
  getReusableEstimateOutline: reusableSourceActionMocks.getReusableEstimateOutline,
  listReusableProjectEstimateSources: reusableSourceActionMocks.listReusableProjectEstimateSources,
  listReusableProjectSources: reusableSourceActionMocks.listReusableProjectSources,
  searchReusableProjectSources: reusableSourceActionMocks.searchReusableProjectSources,
}));

const sidebarSeedItems = estimateLibraryItems.slice(0, 8);
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
    brand: "Database Brand",
    brandId: "db-brand",
    pricingSource: "Database Supplier",
    pricingDate: "2026-05-22",
  },
];
const sharedBrands = [
  {
    id: "db-brand",
    name: "Database Brand",
    normalized_name: "database brand",
    sort_order: 1,
  },
];

function renderSidebar(props: ComponentProps<typeof EstimateRightSidebar> = {}) {
  return render(<EstimateRightSidebar initialLibraryItems={sidebarSeedItems} {...props} />);
}

function openComponentViewMenu() {
  fireEvent.click(screen.getByRole("button", { name: /View by:/ }));
  return screen.getByRole("menu", { name: "Component view mode" });
}

function openLibrarySearch() {
  fireEvent.click(screen.getByRole("button", { name: "Show library tree search" }));
  return screen.getByLabelText("Search Library Tree");
}

describe("component library UI", () => {
  beforeAll(() => {
    if (!window.PointerEvent) {
      window.PointerEvent = MouseEvent as unknown as typeof PointerEvent;
    }
  });

  beforeEach(() => {
    window.localStorage.clear();
    reusableSourceActionMocks.getReusableEstimateOutline.mockReset();
    reusableSourceActionMocks.listReusableProjectEstimateSources.mockReset();
    reusableSourceActionMocks.listReusableProjectSources.mockReset();
    reusableSourceActionMocks.searchReusableProjectSources.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the sidebar without a title bar and with a search disclosure", () => {
    renderSidebar();
    expect(screen.queryByRole("heading", { name: "Library" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Search Library Tree")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show library tree search" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /new/i })).not.toBeInTheDocument();
  });

  it("opens and closes the search dropdown from the toolbar toggle", () => {
    renderSidebar();
    openLibrarySearch();
    expect(screen.getByPlaceholderText("Search Library Tree")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hide library tree search" }));
    expect(screen.queryByPlaceholderText("Search Library Tree")).not.toBeInTheDocument();
  });

  it("opens the search dropdown with the slash shortcut", () => {
    renderSidebar();
    expect(screen.queryByLabelText("Search Library Tree")).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: "/" });
    expect(screen.getByLabelText("Search Library Tree")).toBeInTheDocument();
  });

  it("keeps the search dropdown open on outside clicks while a query is active", () => {
    renderSidebar();
    const search = openLibrarySearch();

    fireEvent.change(search, { target: { value: "love" } });
    fireEvent.pointerDown(document.body);
    expect(screen.getByLabelText("Search Library Tree")).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "" } });
    fireEvent.pointerDown(document.body);
    expect(screen.queryByLabelText("Search Library Tree")).not.toBeInTheDocument();
  });

  it("cascade-selects folders and bulk-adds the selected components from the dock", () => {
    const onInsert = vi.fn(() => true);
    renderSidebar({ onInsertComponent: onInsert, selectedNodeKind: "area", selectedNodeName: "Kitchen" });

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Furniture" }));
    expect(screen.getByRole("checkbox", { name: "Select HEMLINGBY Loveseat" })).toBeChecked();

    const dock = screen.getByRole("region", { name: "Bulk action toolbar" });
    fireEvent.click(within(dock).getByRole("button", { name: "Add selected components" }));

    expect(onInsert).toHaveBeenCalledWith(expect.objectContaining<Partial<EstimateRowItem>>({ id: "lib-sofa" }));
    expect(screen.queryByRole("region", { name: "Bulk action toolbar" })).not.toBeInTheDocument();
  });

  it("bulk-deletes selected components from the dock with undo", () => {
    renderSidebar();

    fireEvent.click(screen.getByRole("checkbox", { name: "Select HEMLINGBY Loveseat" }));
    const dock = screen.getByRole("region", { name: "Bulk action toolbar" });
    fireEvent.click(within(dock).getByRole("button", { name: "Delete selected components" }));

    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete selected" }));

    expect(screen.queryByRole("treeitem", { name: "HEMLINGBY Loveseat" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByRole("treeitem", { name: "HEMLINGBY Loveseat" })).toBeInTheDocument();
  });

  it("shows left-aligned icon-only tools with tooltips and tree controls", () => {
    const { container } = renderSidebar();
    expect(screen.getByLabelText("Library tree tools")).toBeInTheDocument();
    expect(screen.queryByText(/\d+ components?/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand all library tree" })).toHaveAttribute("title", "Expand all library tree");
    expect(screen.getByRole("button", { name: "Collapse all library tree" })).toHaveAttribute("title", "Collapse all library tree");
    expect(screen.getByRole("button", { name: "Add Component" })).toHaveAttribute("title", "Add Component");
    expect(
      Array.from(screen.getByLabelText("Library tree tools").querySelectorAll("button")).map((button) =>
        button.getAttribute("aria-label"),
      ),
    ).toEqual([
      "Show library tree search",
      "Filter library tree",
      "Group library tree",
      "Expand all library tree",
      "Collapse all library tree",
      "View by: Default",
      "Add Component",
      "Add Template",
    ]);
    expect(screen.queryByText("Price range")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Group library by")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Sort library")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Export components" })).not.toBeInTheDocument();

    const stickyHeader = screen.getByLabelText("Library tree tools").closest(".sticky");
    expect(stickyHeader?.children).toHaveLength(2); // toolbar + search disclosure, tabs
    expect(container.querySelector(".min-h-0.flex-1.overflow-auto > .h-8.w-full.bg-white")).toBeNull();
    expect(screen.queryByRole("menu", { name: "Component view mode" })).not.toBeInTheDocument();
    openComponentViewMenu();
    expect(stickyHeader?.children).toHaveLength(3); // toolbar + search disclosure, tabs, view menu
  });

  it("matches the component library route navigation contract", () => {
    renderSidebar();
    const tabs = screen.getByRole("tablist", { name: "Library sections" });
    expect(within(tabs).getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Components", "Templates"]);
    expect(within(tabs).getByRole("tab", { name: "Components" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("tab", { name: "Categories" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Suppliers" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Custom" })).not.toBeInTheDocument();

    const viewMode = openComponentViewMenu();
    expect(screen.getByText("View By")).toBeInTheDocument();
    expect(within(viewMode).getByRole("menuitemradio", { name: "Default" })).toHaveAttribute("aria-checked", "true");
    expect(within(viewMode).getByRole("menuitemradio", { name: "Suppliers" })).toHaveAttribute("aria-checked", "false");
    expect(within(viewMode).getByRole("menuitemradio", { name: "Brand" })).toHaveAttribute("aria-checked", "false");
  });

  it("opens the shared Add Component modal from the add component tool", async () => {
    const { container } = renderSidebar();

    fireEvent.click(screen.getByRole("button", { name: "Add Component" }));

    // The estimate sidebar reuses the Components-page AddComponentModal; it
    // loads through next/dynamic, so the dialog appears asynchronously — and
    // the chunk transform can take a while on a loaded machine.
    const dialog = await screen.findByRole("dialog", { name: "Add Component" }, { timeout: 15000 });
    expect(dialog).toBeInTheDocument();
    expect(dialog.closest("[data-archestimator-modal-root]")).toHaveClass("fixed", "inset-0", "z-[1000]");
    expect(container.querySelector("[role='dialog']")).toBeNull();
    expect(within(dialog).getByLabelText("Name")).toBeInTheDocument();
  });

  it("shows empty state when search returns no results", () => {
    renderSidebar();
    const search = openLibrarySearch();
    fireEvent.change(search, { target: { value: "xyz-nonexistent-12345" } });
    expect(screen.getByText(/No matches for/i)).toBeInTheDocument();
  });

  function expandSupplierFolder() {
    const viewMode = openComponentViewMenu();
    fireEvent.click(within(viewMode).getByRole("menuitemradio", { name: "Suppliers" }));
    // Expand up to 3 levels deep to reach components
    for (let i = 0; i < 3; i++) {
      const folders = screen.getAllByRole("treeitem");
      const collapsedFolder = folders.find((f) => f.getAttribute("aria-expanded") === "false");
      if (collapsedFolder) {
        fireEvent.click(collapsedFolder);
      } else {
        break;
      }
    }
  }

  it("dispatches custom event when add button clicked on a component", () => {
    const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");
    renderSidebar();
    expandSupplierFolder();
    const addButtons = screen.getAllByLabelText(/add to selected area:/i);
    expect(addButtons.length).toBeGreaterThan(0);
    fireEvent.click(addButtons[0]);
    expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
  });

  it("calls onInsertComponent prop when provided instead of dispatching event", () => {
    const onInsert = vi.fn();
    const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");
    renderSidebar({ onInsertComponent: onInsert });
    expandSupplierFolder();
    const addButtons = screen.getAllByLabelText(/add to selected area:/i);
    fireEvent.click(addButtons[0]);
    expect(onInsert).toHaveBeenCalledWith(expect.objectContaining<Partial<EstimateRowItem>>({ source: "library" }));
    expect(dispatchEventSpy).not.toHaveBeenCalledWith(expect.objectContaining({ type: "archestimator:add-library-item" }));
  });

  it("does not mark recents when the direct insert callback rejects insertion", () => {
    renderSidebar({ onInsertComponent: () => false, selectedNodeKind: "area", selectedNodeName: "Kitchen" });
    expandSupplierFolder();
    fireEvent.click(screen.getAllByLabelText(/add to kitchen:/i)[0]);

    expect(window.localStorage.getItem(LIBRARY_RECENTS_KEY)).toBeNull();
    expect(screen.getByText(/was not inserted/i)).toBeInTheDocument();
  });

  it("writes recents without adding a recent strip above the tree", () => {
    renderSidebar({ onInsertComponent: () => true, selectedNodeKind: "area", selectedNodeName: "Kitchen" });
    expandSupplierFolder();
    fireEvent.click(screen.getAllByLabelText(/add to kitchen:/i)[0]);

    const recents = JSON.parse(window.localStorage.getItem(LIBRARY_RECENTS_KEY) ?? "[]");
    expect(recents.length).toBeGreaterThan(0);
    expect(screen.queryByText("Recently Used")).not.toBeInTheDocument();
  });

  it("shows target-aware insertion state and disables add for non-area selections", () => {
    const onInsert = vi.fn();
    renderSidebar({ onInsertComponent: onInsert, selectedNodeKind: "group", selectedNodeName: "Main House" });

    expect(screen.queryByText("Main House cannot receive estimate rows")).not.toBeInTheDocument();
    expandSupplierFolder();
    const addButtons = screen.getAllByLabelText(/select an area before adding/i);
    expect(addButtons[0]).toBeDisabled();
    fireEvent.click(addButtons[0]);
    expect(onInsert).not.toHaveBeenCalled();
  });

  it("renders bulk selection without assemblies, templates, import, or export controls", () => {
    renderSidebar();

    expect(screen.getByRole("checkbox", { name: `Select ${sidebarSeedItems[0].material}` })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save assembly" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save template" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Import library file")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Export components" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Export components as CSV" })).not.toBeInTheDocument();
  });

  it("always shows the Templates tab with an empty state instead of static templates", () => {
    renderSidebar();

    fireEvent.click(screen.getByRole("tab", { name: "Templates" }));

    expect(screen.getByText(/No templates yet/i)).toBeInTheDocument();
    expect(screen.queryByText("Condo Fit-Out Starter")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add template Condo Fit-Out Starter/i })).not.toBeInTheDocument();
  });

  it("applies stored view-mode prefs after mount without clobbering them", async () => {
    window.localStorage.setItem(LIBRARY_PREFS_KEY, JSON.stringify({ activeTab: "components", componentViewMode: "suppliers" }));

    renderSidebar();
    // First render matches SSR output: stored prefs only apply after mount.
    expect(screen.getByRole("button", { name: "View by: Default" })).toBeInTheDocument();

    expect(await screen.findByRole("button", { name: "View by: Suppliers" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "All Suppliers" })).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(LIBRARY_PREFS_KEY) ?? "{}").componentViewMode).toBe("suppliers");
  });

  it("does not crash when localStorage writes fail", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const originalLocalStorage = window.localStorage;
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: () => null,
        setItem: () => {
          throw new Error("blocked");
        },
      },
    });

    try {
      renderSidebar();
      // Stored prefs hydrate in a mount microtask; persistence is gated on it.
      await Promise.resolve();
      const viewMode = openComponentViewMenu();
      fireEvent.click(within(viewMode).getByRole("menuitemradio", { name: "Suppliers" }));

      expect(warn).toHaveBeenCalledWith(expect.stringContaining("Failed to persist"), expect.any(Error));
    } finally {
      Object.defineProperty(window, "localStorage", { configurable: true, value: originalLocalStorage });
    }
  });

  it("dismisses delete confirmation with Escape", () => {
    renderSidebar();
    expandSupplierFolder();
    // Click a component row to open preview
    const componentRows = screen.getAllByRole("treeitem").filter((el) => !el.hasAttribute("aria-expanded"));
    if (componentRows.length > 0) {
      fireEvent.click(componentRows[0]);
    }
    const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("renders only sanitized component source URLs as preview links", () => {
    const safeItem: EstimateRowItem = {
      ...sharedLibraryItems[0],
      id: "safe-source-component",
      material: "Safe Source Component",
      name: "Safe Source Component",
      sourceUrl: "https://supplier.example/quote",
      notes: "Supplier quote",
    };
    renderSidebar({
      initialLibraryItems: [safeItem],
      categoryTree: sharedCategoryTree,
      suppliers: [{ id: "db-supplier", name: "Database Supplier", sort_order: 1 }],
      brands: sharedBrands,
    });

    fireEvent.click(screen.getByRole("treeitem", { name: "Safe Source Component" }));

    expect(screen.getByRole("link", { name: "Source" })).toHaveAttribute("href", "https://supplier.example/quote");

    cleanup();
    window.localStorage.clear();

    const unsafeItem: EstimateRowItem = {
      ...safeItem,
      id: "unsafe-source-component",
      material: "Unsafe Source Component",
      name: "Unsafe Source Component",
      sourceUrl: "javascript:alert(1)",
      notes: "Legacy supplier note",
    };
    renderSidebar({
      initialLibraryItems: [unsafeItem],
      categoryTree: sharedCategoryTree,
      suppliers: [{ id: "db-supplier", name: "Database Supplier", sort_order: 1 }],
      brands: sharedBrands,
    });

    fireEvent.click(screen.getByRole("treeitem", { name: "Unsafe Source Component" }));

    expect(screen.queryByRole("link", { name: "Source" })).not.toBeInTheDocument();
    expect(screen.getByText("Legacy supplier note")).toBeInTheDocument();
  });

  it("keeps slash shortcut from opening search behind the component modal", () => {
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Add Component" }));

    fireEvent.keyDown(window, { key: "/" });
    expect(screen.queryByLabelText("Search Library Tree")).not.toBeInTheDocument();
  });

  it("shows taxonomy folders in the tree", () => {
    renderSidebar();
    expect(screen.queryByRole("treeitem", { name: "All Components" })).not.toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Administration" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("treeitem", { name: "Project Requirements" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Objects" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Furniture" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "HEMLINGBY Loveseat" })).toBeInTheDocument();
  });

  it("keeps estimate sidebar category trees populated with draggable line-item leaves", () => {
    renderSidebar();

    const item = screen.getByRole("treeitem", { name: "HEMLINGBY Loveseat" });

    expect(item).toHaveAttribute("draggable", "true");
    expect(screen.getByRole("button", { name: /add to selected area: hemlingby loveseat/i })).toBeInTheDocument();
  });

  it("uses the same database taxonomy ids as the component workspace tree", () => {
    renderSidebar({
      initialLibraryItems: sharedLibraryItems,
      categoryTree: sharedCategoryTree,
      suppliers: [{ id: "db-supplier", name: "Database Supplier", sort_order: 1 }],
      brands: sharedBrands,
    });

    expect(screen.getByRole("treeitem", { name: "Database Components" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Fabrication" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Database Steel Frame" })).toBeInTheDocument();
    expect(screen.queryByRole("treeitem", { name: "Legacy category label" })).not.toBeInTheDocument();
  });

  it("adds Brand as an estimate-sidebar component organization view", () => {
    renderSidebar({
      initialLibraryItems: sharedLibraryItems,
      categoryTree: sharedCategoryTree,
      suppliers: [{ id: "db-supplier", name: "Database Supplier", sort_order: 1 }],
      brands: sharedBrands,
    });

    const viewMode = openComponentViewMenu();
    fireEvent.click(within(viewMode).getByRole("menuitemradio", { name: "Brand" }));

    expect(screen.getByRole("treeitem", { name: "All Brands" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("treeitem", { name: "Database Brand" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Database Steel Frame" })).toBeInTheDocument();
  });

  it("collapses and expands folders when clicked", () => {
    renderSidebar();
    const folder = screen.getByRole("treeitem", { name: "Objects" });
    expect(folder).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(folder);
    expect(folder).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(folder);
    expect(folder).toHaveAttribute("aria-expanded", "true");
  });

  it("uses the shared ui Tree rows for folders and component rows", () => {
    renderSidebar();

    expect(screen.getByRole("tree", { name: "Library components" })).toBeInTheDocument();

    const folder = screen.getByRole("treeitem", { name: "Administration" });
    expect(folder).toHaveClass("min-h-7", "text-[10px]");
    expect(folder.closest("[data-tree-row]")).toBe(folder);
    // Folders drag too now: sibling reordering is enabled in the sidebar.
    expect(folder).toHaveAttribute("draggable", "true");

    const item = screen.getByRole("treeitem", { name: "HEMLINGBY Loveseat" });
    expect(item).toHaveClass("min-h-7", "text-[10px]");
    expect(item.closest("[data-tree-row]")).toBe(item);
    expect(item.querySelector("[data-component-library-tree-label]")).toHaveClass("text-[10px]", "leading-4");
    expect(item).toHaveAttribute("draggable", "true");
  });

  it("opens right-click actions for folders and draggable component rows", async () => {
    const onInsert = vi.fn();
    renderSidebar({ onInsertComponent: onInsert, selectedNodeKind: "area", selectedNodeName: "Kitchen" });

    fireEvent.contextMenu(screen.getByRole("treeitem", { name: "Administration" }), { clientX: 16, clientY: 16 });
    expect(await screen.findByRole("menuitem", { name: "Select" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Collapse" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.contextMenu(screen.getByRole("treeitem", { name: "HEMLINGBY Loveseat" }), { clientX: 16, clientY: 16 });
    expect(await screen.findByRole("menuitem", { name: "Preview" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "Add to Kitchen" }));

    expect(onInsert).toHaveBeenCalledWith(expect.objectContaining<Partial<EstimateRowItem>>({ id: "lib-sofa" }));
  });

  it("exposes component CRUD through the row context menu", async () => {
    renderSidebar({ selectedNodeKind: "area", selectedNodeName: "Kitchen" });

    fireEvent.contextMenu(screen.getByRole("treeitem", { name: "Administration" }), { clientX: 16, clientY: 16 });
    expect(await screen.findByRole("menuitem", { name: "New Component" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.contextMenu(screen.getByRole("treeitem", { name: "HEMLINGBY Loveseat" }), { clientX: 16, clientY: 16 });
    expect(await screen.findByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Duplicate" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Add to favorites" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitem", { name: "Duplicate" }));
    expect(await screen.findByRole("treeitem", { name: "HEMLINGBY Loveseat copy" })).toBeInTheDocument();

    fireEvent.contextMenu(screen.getByRole("treeitem", { name: "HEMLINGBY Loveseat copy" }), { clientX: 16, clientY: 16 });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(screen.queryByRole("treeitem", { name: "HEMLINGBY Loveseat copy" })).not.toBeInTheDocument();
  });

  it("opens the create-template modal when the sheets tree hands a node over", async () => {
    const sidebarEstimateNodes: EstimateTreeNode[] = [
      {
        id: "main-house",
        name: "Main House",
        kind: "group",
        total: "₱0.00",
        children: [
          { id: "powder-room", name: "Powder Room", kind: "area", total: "₱0.00", children: [], estimateRowItems: [] },
        ],
      },
    ];
    renderSidebar({ estimateId: "estimate-1", projectId: "project-1", nodes: sidebarEstimateNodes });

    act(() => {
      window.dispatchEvent(
        new CustomEvent("archestimator:create-template-from-node", { detail: { sourceNodeId: "powder-room" } }),
      );
    });

    expect(await screen.findByText("Powder Room")).toBeInTheDocument();
    expect(screen.getByText(/Area node · 0 groups · 1 area · 0 rows/)).toBeInTheDocument();
  });
});

describe("templates tree", () => {
  const templateRowItem: EstimateRowItem = {
    ...sharedLibraryItems[0],
    id: "tpl-row-1",
    material: "Template Steel Frame",
    name: "Template Steel Frame",
    quantity: 2,
    subTotal: 2400,
    totalItemCosts: 2400,
  };

  const sidebarTemplates: EstimateTemplate[] = [
    {
      id: "tpl-1",
      name: "Kitchen Starter",
      description: "Base kitchen fit-out",
      category: "Rooms",
      nodes: [
        {
          id: "tpl-1-root",
          name: "Kitchen Fit-Out",
          kind: "area",
          total: "PHP 2,400.00",
          children: [],
          estimateRowItems: [templateRowItem],
        },
      ],
    },
  ];

  const projectSources: ReusableEstimateSource[] = [
    {
      kind: "project",
      projectId: "project-2",
      name: "Renovation Project",
    },
    {
      kind: "project-estimate",
      projectId: "project-2",
      estimateId: "estimate-2",
      name: "Lobby Estimate",
      sheetCode: "EST-002",
    },
    {
      kind: "project-tab",
      projectId: "project-2",
      estimateId: "estimate-2",
      tabId: "tab-2",
      name: "Lobby Main",
    },
    {
      kind: "project-node",
      projectId: "project-2",
      estimateId: "estimate-2",
      tabId: "tab-2",
      nodeId: "node-amenity",
      nodeKind: "group",
      name: "Amenity Millwork",
    },
  ];

  const projectSourcesWithMetadata: ReusableEstimateSource[] = projectSources.map((source) => {
    if (source.kind === "project-node") {
      return {
        ...source,
        metadata: {
          projectName: "Renovation Project",
          estimateName: "Lobby Estimate",
          sheetCode: "EST-002",
          tabName: "Lobby Main",
          nodePath: ["Lobby Main", "Amenity Millwork"],
          updatedAt: "2026-06-12T08:30:00.000Z",
          rowCount: 7,
          totalCost: 125000,
        },
      };
    }
    if (source.kind === "project-tab") {
      return {
        ...source,
        metadata: {
          projectName: "Renovation Project",
          estimateName: "Lobby Estimate",
          sheetCode: "EST-002",
          tabName: "Lobby Main",
          updatedAt: "2026-06-12T08:15:00.000Z",
          rowCount: 11,
          totalCost: 180000,
        },
      };
    }
    return source;
  });

  function createDataTransferStub() {
    const store = new Map<string, string>();
    const types: string[] = [];
    return {
      types,
      dropEffect: "none",
      effectAllowed: "all",
      setData: vi.fn((type: string, value: string) => {
        store.set(type, value);
        if (!types.includes(type)) types.push(type);
      }),
      getData: vi.fn((type: string) => store.get(type) ?? ""),
      setDragImage: vi.fn(),
    };
  }

  function openTemplatesTab(props: ComponentProps<typeof EstimateRightSidebar> = {}) {
    renderSidebar({ templates: sidebarTemplates, ...props });
    fireEvent.click(screen.getByRole("tab", { name: "Templates" }));
  }

  beforeEach(() => {
    useEstimateWorkshopDragState.setState({ activeDrag: null });
    templateActionMocks.createEstimateTemplate.mockReset();
    templateActionMocks.createEstimateTemplateFromEstimateTab.mockReset();
    templateActionMocks.createEstimateTemplateFromEstimateNode.mockReset();
    templateActionMocks.renameEstimateTemplate.mockReset();
    templateActionMocks.deleteEstimateTemplate.mockReset();
    reusableSourceActionMocks.getReusableEstimateOutline.mockReset();
    reusableSourceActionMocks.listReusableProjectEstimateSources.mockReset();
    reusableSourceActionMocks.listReusableProjectSources.mockReset();
    reusableSourceActionMocks.searchReusableProjectSources.mockReset();
  });

  it("renders templates as a uniform node tree with costs and no structure counts", () => {
    openTemplatesTab();

    expect(screen.getByRole("treeitem", { name: "Custom Templates reusable sources" })).toBeInTheDocument();

    // The category reads as a plain group node row: name + summed cost only.
    const categoryRow = screen.getByRole("treeitem", { name: "Rooms templates" });
    expect(within(categoryRow).getByText("₱2,400.00")).toBeInTheDocument();
    expect(within(categoryRow).queryByText(/template/i)).not.toBeInTheDocument();

    const templateRow = screen.getByRole("treeitem", { name: "Kitchen Starter estimate template" });
    expect(within(templateRow).getByText("₱2,400.00")).toBeInTheDocument();
    expect(within(templateRow).queryByText(/groups · .* areas · .* rows/)).not.toBeInTheDocument();
    expect(templateRow).toHaveAttribute("draggable", "true");
  });

  it("reveals the template's internal structure, with every row draggable, when expanded", () => {
    openTemplatesTab();

    fireEvent.click(screen.getByRole("treeitem", { name: "Kitchen Starter estimate template" }));

    const innerArea = screen.getByRole("treeitem", { name: "Kitchen Fit-Out template area" });
    expect(innerArea).toHaveAttribute("draggable", "true");

    fireEvent.click(innerArea);
    const componentLeaf = screen.getByRole("treeitem", { name: "Template Steel Frame template component" });
    expect(componentLeaf).toHaveAttribute("draggable", "true");
  });

  it("drags a group/area from inside a template carrying that subtree", () => {
    openTemplatesTab();

    fireEvent.click(screen.getByRole("treeitem", { name: "Kitchen Starter estimate template" }));
    const innerArea = screen.getByRole("treeitem", { name: "Kitchen Fit-Out template area" });

    const dataTransfer = createDataTransferStub();
    fireEvent.dragStart(innerArea, { dataTransfer });

    expect(dataTransfer.setData).toHaveBeenCalledWith(
      "application/x-archestimator-estimate-template",
      JSON.stringify({ templateId: "tpl-1", templateNodeId: "tpl-1-root" }),
    );
    expect(useEstimateWorkshopDragState.getState().activeDrag).toEqual({
      kind: "estimate-template",
      templateName: "Kitchen Fit-Out",
    });

    fireEvent.dragEnd(innerArea, { dataTransfer });
    expect(useEstimateWorkshopDragState.getState().activeDrag).toBeNull();
  });

  it("bulk-adds a checked inner node as a subtree unit", () => {
    const onInsertTemplateNode = vi.fn(() => true);
    openTemplatesTab({ onInsertTemplateNode, selectedNodeKind: "group", selectedNodeName: "Main House" });

    fireEvent.click(screen.getByRole("treeitem", { name: "Kitchen Starter estimate template" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Kitchen Fit-Out" }));
    fireEvent.click(screen.getByRole("button", { name: "Add selected to estimate" }));

    expect(onInsertTemplateNode).toHaveBeenCalledTimes(1);
    expect(onInsertTemplateNode).toHaveBeenCalledWith(
      expect.objectContaining({ id: "tpl-1" }),
      expect.objectContaining({ id: "tpl-1-root", name: "Kitchen Fit-Out" }),
    );
  });

  it("stamps the template drag payload and publishes the workshop drag for its lifetime", () => {
    openTemplatesTab();

    const templateRow = screen.getByRole("treeitem", { name: "Kitchen Starter estimate template" });
    const dataTransfer = createDataTransferStub();
    fireEvent.dragStart(templateRow, { dataTransfer });

    expect(dataTransfer.setData).toHaveBeenCalledWith(
      "application/x-archestimator-estimate-template",
      JSON.stringify({ templateId: "tpl-1" }),
    );
    expect(useEstimateWorkshopDragState.getState().activeDrag).toEqual({
      kind: "estimate-template",
      templateId: "tpl-1",
      templateName: "Kitchen Starter",
    });

    fireEvent.dragEnd(templateRow, { dataTransfer });
    expect(useEstimateWorkshopDragState.getState().activeDrag).toBeNull();
  });

  it("drags a whole category carrying every template inside it", () => {
    openTemplatesTab();

    const categoryRow = screen.getByRole("treeitem", { name: "Rooms templates" });
    expect(categoryRow).toHaveAttribute("draggable", "true");

    const dataTransfer = createDataTransferStub();
    fireEvent.dragStart(categoryRow, { dataTransfer });

    expect(dataTransfer.setData).toHaveBeenCalledWith(
      "application/x-archestimator-estimate-template",
      JSON.stringify({ templateIds: ["tpl-1"] }),
    );
    expect(useEstimateWorkshopDragState.getState().activeDrag).toEqual({
      kind: "estimate-template",
      templateName: "Rooms templates",
    });

    fireEvent.dragEnd(categoryRow, { dataTransfer });
    expect(useEstimateWorkshopDragState.getState().activeDrag).toBeNull();
  });

  it("renders project-derived sources under a Projects section without hiding custom templates", () => {
    openTemplatesTab({ projectSources });

    expect(screen.getByRole("treeitem", { name: "Custom Templates reusable sources" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Projects reusable sources" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Rooms templates" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("treeitem", { name: "Renovation Project project source" }));
    expect(screen.getByRole("treeitem", { name: "Lobby Estimate estimate EST-002" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("treeitem", { name: "Lobby Estimate estimate EST-002" }));
    expect(screen.getByRole("treeitem", { name: "Lobby Main project tab source" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("treeitem", { name: "Lobby Main project tab source" }));
    expect(screen.getByRole("treeitem", { name: "Amenity Millwork project group" })).toBeInTheDocument();
  });

  it("loads readable project sources when the Templates tab opens in an estimate context", async () => {
    reusableSourceActionMocks.listReusableProjectSources.mockResolvedValue({
      sources: projectSources.filter((source) => source.kind === "project"),
    });
    reusableSourceActionMocks.listReusableProjectEstimateSources.mockResolvedValue({
      sources: projectSources.filter((source) => source.kind === "project-estimate"),
    });

    openTemplatesTab({ projectId: "project-1", estimateId: "estimate-1" });

    await waitFor(() => expect(reusableSourceActionMocks.listReusableProjectSources).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("treeitem", { name: "Projects reusable sources" })).toBeInTheDocument();
    expect(screen.queryByRole("treeitem", { name: "Lobby Estimate estimate EST-002" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("treeitem", { name: "Renovation Project project source" }));
    await waitFor(() =>
      expect(reusableSourceActionMocks.listReusableProjectEstimateSources).toHaveBeenCalledWith({ projectId: "project-2" }),
    );
    expect(screen.getByRole("treeitem", { name: "Lobby Estimate estimate EST-002" })).toBeInTheDocument();
    expect(reusableSourceActionMocks.getReusableEstimateOutline).not.toHaveBeenCalled();
  });

  it("refreshes readable project sources from the Templates tab", async () => {
    const refreshedProjectSources: ReusableEstimateSource[] = [
      ...projectSources.filter((source) => source.kind === "project"),
      {
        kind: "project",
        projectId: "project-3",
        name: "Hotel Refresh Project",
      },
    ];
    const refreshedEstimateSources: ReusableEstimateSource[] = [
      {
        kind: "project-estimate",
        projectId: "project-3",
        estimateId: "estimate-3",
        name: "Lobby Refresh Estimate",
        sheetCode: "EST-003",
      },
    ];
    reusableSourceActionMocks.listReusableProjectSources
      .mockResolvedValueOnce({
        sources: projectSources.filter((source) => source.kind === "project"),
      })
      .mockResolvedValueOnce({ sources: refreshedProjectSources });
    reusableSourceActionMocks.listReusableProjectEstimateSources.mockResolvedValue({ sources: refreshedEstimateSources });

    openTemplatesTab({ projectId: "project-1", estimateId: "estimate-1" });

    expect(await screen.findByRole("treeitem", { name: "Renovation Project project source" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh project sources" }));

    await waitFor(() => expect(reusableSourceActionMocks.listReusableProjectSources).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("treeitem", { name: "Hotel Refresh Project project source" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("treeitem", { name: "Hotel Refresh Project project source" }));
    await waitFor(() =>
      expect(reusableSourceActionMocks.listReusableProjectEstimateSources).toHaveBeenCalledWith({ projectId: "project-3" }),
    );
    expect(screen.getByRole("treeitem", { name: "Lobby Refresh Estimate estimate EST-003" })).toBeInTheDocument();
  });

  it("searches action-backed project sources and reveals unloaded outline matches", async () => {
    reusableSourceActionMocks.listReusableProjectSources.mockResolvedValue({
      sources: projectSources.filter((source) => source.kind === "project"),
    });
    reusableSourceActionMocks.searchReusableProjectSources.mockResolvedValue({ sources: projectSources });

    openTemplatesTab({ projectId: "project-1", estimateId: "estimate-1" });

    expect(await screen.findByRole("treeitem", { name: "Renovation Project project source" })).toBeInTheDocument();
    expect(screen.queryByRole("treeitem", { name: "Amenity Millwork project group" })).not.toBeInTheDocument();

    const search = openLibrarySearch();
    fireEvent.change(search, { target: { value: "Amenity" } });

    await waitFor(() =>
      expect(reusableSourceActionMocks.searchReusableProjectSources).toHaveBeenCalledWith({ query: "Amenity" }),
    );
    expect(await screen.findByRole("treeitem", { name: "Amenity Millwork project group" })).toBeInTheDocument();
  });

  it("lazy-loads an estimate outline when a project estimate expands", async () => {
    reusableSourceActionMocks.listReusableProjectSources.mockResolvedValue({
      sources: projectSources.filter((source) => source.kind === "project"),
    });
    reusableSourceActionMocks.listReusableProjectEstimateSources.mockResolvedValue({
      sources: projectSources.filter((source) => source.kind === "project-estimate"),
    });
    reusableSourceActionMocks.getReusableEstimateOutline.mockResolvedValue({
      sources: projectSources.filter((source) => source.kind === "project-tab" || source.kind === "project-node"),
    });

    openTemplatesTab({ projectId: "project-1", estimateId: "estimate-1" });

    fireEvent.click(await screen.findByRole("treeitem", { name: "Renovation Project project source" }));
    await waitFor(() =>
      expect(reusableSourceActionMocks.listReusableProjectEstimateSources).toHaveBeenCalledWith({ projectId: "project-2" }),
    );
    fireEvent.click(await screen.findByRole("treeitem", { name: "Lobby Estimate estimate EST-002" }));

    await waitFor(() =>
      expect(reusableSourceActionMocks.getReusableEstimateOutline).toHaveBeenCalledWith({
        projectId: "project-2",
        estimateId: "estimate-2",
      }),
    );
    expect(await screen.findByRole("treeitem", { name: "Lobby Main project tab source" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("treeitem", { name: "Lobby Main project tab source" }));
    expect(screen.getByRole("treeitem", { name: "Amenity Millwork project group" })).toBeInTheDocument();
  });

  // Fires a hover on the content area of a tree row (where the prefetch handler
  // lives), located as the row child that holds the visible label text.
  function hoverProjectSourceRow(accessibleName: string, visibleText: string) {
    const row = screen.getByRole("treeitem", { name: accessibleName });
    const textEl = within(row).getByText(visibleText);
    const wrapper = Array.from(row.children).find((child) => child.contains(textEl)) ?? textEl;
    fireEvent.mouseEnter(wrapper as Element);
  }

  it("prefetches a project's estimate list on hover, so the expand never refetches (U6/U23)", async () => {
    reusableSourceActionMocks.listReusableProjectSources.mockResolvedValue({
      sources: projectSources.filter((source) => source.kind === "project"),
    });
    reusableSourceActionMocks.listReusableProjectEstimateSources.mockResolvedValue({
      sources: projectSources.filter((source) => source.kind === "project-estimate"),
    });

    openTemplatesTab({ projectId: "project-1", estimateId: "estimate-1" });

    await screen.findByRole("treeitem", { name: "Renovation Project project source" });
    // Hovering — without any click — warms the next level.
    hoverProjectSourceRow("Renovation Project project source", "Renovation Project");
    await waitFor(() =>
      expect(reusableSourceActionMocks.listReusableProjectEstimateSources).toHaveBeenCalledWith({ projectId: "project-2" }),
    );

    // Expanding now serves the already-resident estimate with no second fetch.
    fireEvent.click(screen.getByRole("treeitem", { name: "Renovation Project project source" }));
    expect(await screen.findByRole("treeitem", { name: "Lobby Estimate estimate EST-002" })).toBeInTheDocument();
    expect(reusableSourceActionMocks.listReusableProjectEstimateSources).toHaveBeenCalledTimes(1);
  });

  it("shows in-place skeleton rows (never a loading banner) while a cold expand loads (U23)", async () => {
    reusableSourceActionMocks.listReusableProjectSources.mockResolvedValue({
      sources: projectSources.filter((source) => source.kind === "project"),
    });
    let resolveEstimates: ((value: { sources: ReusableEstimateSource[] }) => void) | undefined;
    reusableSourceActionMocks.listReusableProjectEstimateSources.mockReturnValue(
      new Promise<{ sources: ReusableEstimateSource[] }>((resolve) => {
        resolveEstimates = resolve;
      }),
    );

    openTemplatesTab({ projectId: "project-1", estimateId: "estimate-1" });

    // Cold expand: no prefetch, the estimate load is still in flight.
    fireEvent.click(await screen.findByRole("treeitem", { name: "Renovation Project project source" }));

    // After the reveal delay, in-place skeleton rows appear — not a spinner and
    // not the old layout-shifting "Loading … project estimate lists…" banner.
    const skeletons = await screen.findAllByRole("treeitem", { name: "Loading reusable source" });
    expect(skeletons.length).toBeGreaterThan(0);
    expect(screen.queryByText(/project estimate lists?/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Loading project estimates/i)).not.toBeInTheDocument();

    await act(async () => {
      resolveEstimates?.({ sources: projectSources.filter((source) => source.kind === "project-estimate") });
    });

    expect(await screen.findByRole("treeitem", { name: "Lobby Estimate estimate EST-002" })).toBeInTheDocument();
    expect(screen.queryAllByRole("treeitem", { name: "Loading reusable source" })).toHaveLength(0);
  });

  it("shows no skeleton when expanding a warm (prop-resident) project source (U23)", () => {
    reusableSourceActionMocks.listReusableProjectSources.mockResolvedValue({ sources: [] });

    openTemplatesTab({ projectSources, projectId: "project-1", estimateId: "estimate-1" });

    fireEvent.click(screen.getByRole("treeitem", { name: "Renovation Project project source" }));
    // The estimate is already resident, so it shows immediately with no skeleton.
    expect(screen.getByRole("treeitem", { name: "Lobby Estimate estimate EST-002" })).toBeInTheDocument();
    expect(screen.queryByRole("treeitem", { name: "Loading reusable source" })).not.toBeInTheDocument();
    expect(reusableSourceActionMocks.listReusableProjectEstimateSources).not.toHaveBeenCalled();
  });

  it("uses prop-supplied project sources without refetching on Templates tab open", () => {
    reusableSourceActionMocks.listReusableProjectSources.mockResolvedValue({ sources: [] });

    openTemplatesTab({ projectSources, projectId: "project-1", estimateId: "estimate-1" });

    expect(reusableSourceActionMocks.listReusableProjectSources).not.toHaveBeenCalled();
    expect(screen.getByRole("treeitem", { name: "Projects reusable sources" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("treeitem", { name: "Renovation Project project source" }));
    fireEvent.click(screen.getByRole("treeitem", { name: "Lobby Estimate estimate EST-002" }));
    expect(reusableSourceActionMocks.getReusableEstimateOutline).not.toHaveBeenCalled();
  });

  it("shows all project sources by default and narrows to the current project only on request", () => {
    const mixedProjectSources: ReusableEstimateSource[] = [
      {
        kind: "project",
        projectId: "project-1",
        name: "Active Project",
      },
      {
        kind: "project-estimate",
        projectId: "project-1",
        estimateId: "estimate-active",
        name: "Active Estimate",
        sheetCode: "EST-ACT",
      },
      ...projectSources.filter((source) => source.kind === "project" || source.kind === "project-estimate"),
    ];

    openTemplatesTab({ projectSources: mixedProjectSources, projectId: "project-1", estimateId: "estimate-1" });

    expect(screen.getByRole("treeitem", { name: "Active Project project source" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Renovation Project project source" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All projects" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Current project only" }));

    expect(screen.getByRole("button", { name: "Current project only" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("treeitem", { name: "Active Project project source" })).toBeInTheDocument();
    expect(screen.queryByRole("treeitem", { name: "Renovation Project project source" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "All projects" }));

    expect(screen.getByRole("treeitem", { name: "Renovation Project project source" })).toBeInTheDocument();
  });

  it("filters reusable source sections between custom templates and project sources", () => {
    openTemplatesTab({ projectSources });

    expect(screen.getByRole("button", { name: "All sources" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("treeitem", { name: "Custom Templates reusable sources" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Projects reusable sources" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Project sources" }));

    expect(screen.getByRole("button", { name: "Project sources" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("treeitem", { name: "Custom Templates reusable sources" })).not.toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Projects reusable sources" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Custom templates" }));

    expect(screen.getByRole("button", { name: "Custom templates" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("treeitem", { name: "Custom Templates reusable sources" })).toBeInTheDocument();
    expect(screen.queryByRole("treeitem", { name: "Projects reusable sources" })).not.toBeInTheDocument();
  });

  it("drags a project tab source with the project-source payload", () => {
    openTemplatesTab({ projectSources });

    fireEvent.click(screen.getByRole("treeitem", { name: "Renovation Project project source" }));
    fireEvent.click(screen.getByRole("treeitem", { name: "Lobby Estimate estimate EST-002" }));
    const tabRow = screen.getByRole("treeitem", { name: "Lobby Main project tab source" });

    const dataTransfer = createDataTransferStub();
    fireEvent.dragStart(tabRow, { dataTransfer });

    expect(dataTransfer.setData).toHaveBeenCalledWith(
      PROJECT_SOURCE_DRAG_MIME_TYPE,
      JSON.stringify({
        kind: "project-tab",
        projectId: "project-2",
        estimateId: "estimate-2",
        tabId: "tab-2",
      }),
    );
    expect(useEstimateWorkshopDragState.getState().activeDrag).toEqual({
      kind: "project-source",
      sourceName: "Lobby Main",
    });

    fireEvent.dragEnd(tabRow, { dataTransfer });
    expect(useEstimateWorkshopDragState.getState().activeDrag).toBeNull();
  });

  it("uses the project-source context menu seam without template management actions", async () => {
    const onInsertProjectSource = vi.fn(() => true);
    openTemplatesTab({ projectSources, onInsertProjectSource, selectedNodeKind: "group", selectedNodeName: "Main House" });

    fireEvent.click(screen.getByRole("treeitem", { name: "Renovation Project project source" }));
    fireEvent.click(screen.getByRole("treeitem", { name: "Lobby Estimate estimate EST-002" }));
    fireEvent.click(screen.getByRole("treeitem", { name: "Lobby Main project tab source" }));
    fireEvent.contextMenu(screen.getByRole("treeitem", { name: "Amenity Millwork project group" }), { clientX: 16, clientY: 16 });

    fireEvent.click(await screen.findByRole("menuitem", { name: "Add to Main House" }));

    expect(onInsertProjectSource).toHaveBeenCalledWith(expect.objectContaining({
      kind: "project-node",
      nodeId: "node-amenity",
    }));
    expect(screen.queryByRole("menuitem", { name: "Rename" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("opens the save-as-template flow from a project node source", async () => {
    const createdTemplate: EstimateTemplate = {
      id: "tpl-project-source",
      name: "Amenity Template",
      description: "",
      category: "Project Sources",
      nodes: [],
    };
    templateActionMocks.createEstimateTemplateFromEstimateNode.mockResolvedValue({ template: createdTemplate });
    openTemplatesTab({ projectSources, selectedNodeKind: "group", selectedNodeName: "Main House" });

    fireEvent.click(screen.getByRole("treeitem", { name: "Renovation Project project source" }));
    fireEvent.click(screen.getByRole("treeitem", { name: "Lobby Estimate estimate EST-002" }));
    fireEvent.click(screen.getByRole("treeitem", { name: "Lobby Main project tab source" }));
    fireEvent.contextMenu(screen.getByRole("treeitem", { name: "Amenity Millwork project group" }), { clientX: 16, clientY: 16 });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Save as template" }));

    const dialog = await screen.findByRole("dialog", { name: "New template" });
    expect(within(dialog).getByText("Amenity Millwork")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Template category")).toHaveValue("Project Sources");
    fireEvent.change(within(dialog).getByLabelText("Template name"), { target: { value: "Amenity Template" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save template" }));

    await waitFor(() => expect(templateActionMocks.createEstimateTemplateFromEstimateNode).toHaveBeenCalledWith({
      projectId: "project-2",
      estimateId: "estimate-2",
      sourceNodeId: "node-amenity",
      name: "Amenity Template",
      category: "Project Sources",
      description: "",
    }));
    expect(await screen.findByRole("treeitem", { name: "Amenity Template estimate template" })).toBeInTheDocument();
  });

  it("opens the save-as-template flow from a whole project tab source", async () => {
    const createdTemplate: EstimateTemplate = {
      id: "tpl-project-tab-source",
      name: "Lobby Main Template",
      description: "",
      category: "Project Sources",
      nodes: [],
    };
    templateActionMocks.createEstimateTemplateFromEstimateTab.mockResolvedValue({ template: createdTemplate });
    openTemplatesTab({ projectSources, selectedNodeKind: "group", selectedNodeName: "Main House" });

    fireEvent.click(screen.getByRole("treeitem", { name: "Renovation Project project source" }));
    fireEvent.click(screen.getByRole("treeitem", { name: "Lobby Estimate estimate EST-002" }));
    fireEvent.contextMenu(screen.getByRole("treeitem", { name: "Lobby Main project tab source" }), { clientX: 16, clientY: 16 });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Save as template" }));

    const dialog = await screen.findByRole("dialog", { name: "New template" });
    expect(within(dialog).getByText("Lobby Main")).toBeInTheDocument();
    expect(within(dialog).getByText(/Tab source/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Template category")).toHaveValue("Project Sources");
    fireEvent.change(within(dialog).getByLabelText("Template name"), { target: { value: "Lobby Main Template" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save template" }));

    await waitFor(() => expect(templateActionMocks.createEstimateTemplateFromEstimateTab).toHaveBeenCalledWith({
      projectId: "project-2",
      estimateId: "estimate-2",
      tabId: "tab-2",
      tabName: "Lobby Main",
      name: "Lobby Main Template",
      category: "Project Sources",
      description: "",
    }));
    expect(templateActionMocks.createEstimateTemplateFromEstimateNode).not.toHaveBeenCalled();
    expect(await screen.findByRole("treeitem", { name: "Lobby Main Template estimate template" })).toBeInTheDocument();
  });

  it("previews project-source live metadata without template management actions", () => {
    const onInsertProjectSource = vi.fn(() => true);
    openTemplatesTab({
      projectSources: projectSourcesWithMetadata,
      onInsertProjectSource,
      selectedNodeKind: "group",
      selectedNodeName: "Main House",
    });

    fireEvent.click(screen.getByRole("treeitem", { name: "Renovation Project project source" }));
    fireEvent.click(screen.getByRole("treeitem", { name: "Lobby Estimate estimate EST-002" }));
    fireEvent.click(screen.getByRole("treeitem", { name: "Lobby Main project tab source" }));
    fireEvent.click(screen.getByRole("treeitem", { name: "Amenity Millwork project group" }));

    const preview = screen.getByRole("region", { name: "Project source preview" });
    expect(within(preview).getByText("Amenity Millwork")).toBeInTheDocument();
    expect(within(preview).getByText("Live source")).toBeInTheDocument();
    expect(within(preview).getByText("Read-through source")).toBeInTheDocument();
    expect(within(preview).getByText("Renovation Project")).toBeInTheDocument();
    expect(within(preview).getByText("Lobby Estimate")).toBeInTheDocument();
    expect(within(preview).getByText("EST-002")).toBeInTheDocument();
    expect(within(preview).getByText("Lobby Main / Amenity Millwork")).toBeInTheDocument();
    expect(within(preview).getByText("7")).toBeInTheDocument();
    expect(within(preview).getByText("₱125,000.00")).toBeInTheDocument();
    expect(within(preview).queryByRole("button", { name: "Rename" })).not.toBeInTheDocument();
    expect(within(preview).queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();

    fireEvent.click(within(preview).getByRole("button", { name: /Add .* Main House/ }));

    expect(onInsertProjectSource).toHaveBeenCalledWith(expect.objectContaining({
      kind: "project-node",
      nodeId: "node-amenity",
    }));
  });

  it("previews loaded project-source outline rows for a tab", () => {
    const onInsertProjectSource = vi.fn(() => true);
    openTemplatesTab({
      projectSources: projectSourcesWithMetadata,
      onInsertProjectSource,
      selectedNodeKind: "group",
      selectedNodeName: "Main House",
    });

    fireEvent.click(screen.getByRole("treeitem", { name: "Renovation Project project source" }));
    fireEvent.click(screen.getByRole("treeitem", { name: "Lobby Estimate estimate EST-002" }));
    fireEvent.click(screen.getByRole("treeitem", { name: "Lobby Main project tab source" }));

    const preview = screen.getByRole("region", { name: "Project source preview" });
    expect(within(preview).getByText("Source outline")).toBeInTheDocument();
    expect(within(preview).getByText("Amenity Millwork")).toBeInTheDocument();
    expect(within(preview).getByText("group")).toBeInTheDocument();
  });

  it("bulk-adds checked project-source targets as top-level reusable selections", () => {
    const onInsertProjectSource = vi.fn(() => true);
    openTemplatesTab({ projectSources, onInsertProjectSource, selectedNodeKind: "group", selectedNodeName: "Main House" });

    fireEvent.click(screen.getByRole("treeitem", { name: "Renovation Project project source" }));
    fireEvent.click(screen.getByRole("treeitem", { name: "Lobby Estimate estimate EST-002" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Lobby Main" }));
    fireEvent.click(screen.getByRole("button", { name: "Add selected to estimate" }));

    expect(onInsertProjectSource).toHaveBeenCalledTimes(1);
    expect(onInsertProjectSource).toHaveBeenCalledWith(expect.objectContaining({
      kind: "project-tab",
      tabId: "tab-2",
    }));
  });

  it("keyboard-selects a project source for bulk insertion", () => {
    const onInsertProjectSource = vi.fn(() => true);
    openTemplatesTab({ projectSources, onInsertProjectSource, selectedNodeKind: "group", selectedNodeName: "Main House" });

    fireEvent.click(screen.getByRole("treeitem", { name: "Renovation Project project source" }));
    fireEvent.click(screen.getByRole("treeitem", { name: "Lobby Estimate estimate EST-002" }));
    const tabRow = screen.getByRole("treeitem", { name: "Lobby Main project tab source" });
    fireEvent.click(tabRow);
    fireEvent.keyDown(tabRow, { key: " " });

    expect(screen.getByRole("checkbox", { name: "Select Lobby Main" })).toHaveAttribute("aria-checked", "true");

    fireEvent.click(screen.getByRole("button", { name: "Add selected to estimate" }));

    expect(onInsertProjectSource).toHaveBeenCalledTimes(1);
    expect(onInsertProjectSource).toHaveBeenCalledWith(expect.objectContaining({
      kind: "project-tab",
      tabId: "tab-2",
    }));
  });

  it("searches project-source names and keeps their source ancestors visible", () => {
    openTemplatesTab({ projectSources });

    const search = openLibrarySearch();
    fireEvent.change(search, { target: { value: "Amenity" } });

    expect(screen.getByRole("treeitem", { name: "Renovation Project project source" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("treeitem", { name: "Renovation Project project source" }));
    expect(screen.getByRole("treeitem", { name: "Lobby Estimate estimate EST-002" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("treeitem", { name: "Lobby Estimate estimate EST-002" }));
    expect(screen.getByRole("treeitem", { name: "Lobby Main project tab source" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("treeitem", { name: "Lobby Main project tab source" }));
    expect(screen.getByRole("treeitem", { name: "Amenity Millwork project group" })).toBeInTheDocument();
    expect(screen.queryByRole("treeitem", { name: "Rooms templates" })).not.toBeInTheDocument();
  });

  it("keeps rows button-free and disables context-menu insertion until a group target exists", async () => {
    openTemplatesTab({ selectedNodeKind: "area", selectedNodeName: "Kitchen" });

    // Adding goes through drag or right-click only — rows keep no add
    // buttons (the expand caret is structural, not an action).
    const templateRow = screen.getByRole("treeitem", { name: "Kitchen Starter estimate template" });
    expect(within(templateRow).queryByRole("button", { name: /add/i })).not.toBeInTheDocument();

    fireEvent.contextMenu(templateRow, { clientX: 16, clientY: 16 });
    expect(await screen.findByRole("menuitem", { name: "Add to estimate" })).toHaveAttribute("data-disabled");
  });

  it("bulk-adds checked templates to the selected group", () => {
    const onInsertTemplate = vi.fn(() => true);
    openTemplatesTab({ onInsertTemplate, selectedNodeKind: "group", selectedNodeName: "Main House" });

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Kitchen Starter" }));
    fireEvent.click(screen.getByRole("button", { name: "Add selected to estimate" }));

    expect(onInsertTemplate).toHaveBeenCalledTimes(1);
    expect(onInsertTemplate).toHaveBeenCalledWith(expect.objectContaining({ id: "tpl-1" }));
  });

  it("keyboard-selects a custom template for bulk insertion", () => {
    const onInsertTemplate = vi.fn(() => true);
    openTemplatesTab({ onInsertTemplate, selectedNodeKind: "group", selectedNodeName: "Main House" });

    const templateRow = screen.getByRole("treeitem", { name: "Kitchen Starter estimate template" });
    fireEvent.click(templateRow);
    fireEvent.keyDown(templateRow, { key: " " });
    expect(screen.getByRole("checkbox", { name: "Select Kitchen Starter" })).toHaveAttribute("aria-checked", "true");

    fireEvent.click(screen.getByRole("button", { name: "Add selected to estimate" }));

    expect(onInsertTemplate).toHaveBeenCalledTimes(1);
    expect(onInsertTemplate).toHaveBeenCalledWith(expect.objectContaining({ id: "tpl-1" }));
  });

  it("renames a template from its context menu", async () => {
    templateActionMocks.renameEstimateTemplate.mockResolvedValue({ templateId: "tpl-1", name: "Kitchen Deluxe" });
    openTemplatesTab();

    fireEvent.contextMenu(screen.getByRole("treeitem", { name: "Kitchen Starter estimate template" }), { clientX: 16, clientY: 16 });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Rename" }));

    const nameInput = await screen.findByLabelText("Template name");
    expect(nameInput).toHaveValue("Kitchen Starter");
    fireEvent.change(nameInput, { target: { value: "Kitchen Deluxe" } });
    fireEvent.click(screen.getByRole("button", { name: "Save name" }));

    await waitFor(() => expect(screen.getByRole("treeitem", { name: "Kitchen Deluxe estimate template" })).toBeInTheDocument());
    expect(templateActionMocks.renameEstimateTemplate).toHaveBeenCalledWith({ templateId: "tpl-1", name: "Kitchen Deluxe" });
  });

  it("deletes a template from its context menu after confirmation", async () => {
    templateActionMocks.deleteEstimateTemplate.mockResolvedValue({ templateId: "tpl-1" });
    openTemplatesTab();

    fireEvent.contextMenu(screen.getByRole("treeitem", { name: "Kitchen Starter estimate template" }), { clientX: 16, clientY: 16 });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));

    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete template" }));

    await waitFor(() => expect(screen.queryByRole("treeitem", { name: "Kitchen Starter estimate template" })).not.toBeInTheDocument());
    expect(templateActionMocks.deleteEstimateTemplate).toHaveBeenCalledWith({ templateId: "tpl-1" });
    expect(screen.getByText(/No templates yet/i)).toBeInTheDocument();
  });

  it("starts a new template from a category with the category prefilled", async () => {
    openTemplatesTab();

    fireEvent.contextMenu(screen.getByRole("treeitem", { name: "Rooms templates" }), { clientX: 16, clientY: 16 });
    fireEvent.click(await screen.findByRole("menuitem", { name: "New Template" }));

    expect(await screen.findByLabelText("Template category")).toHaveValue("Rooms");
  });
});
