import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ComponentProps } from "react";
import { EstimateRightSidebar } from "@/components/workshop/component-library";
import { LIBRARY_RECENTS_KEY } from "@/components/workshop/component-library/helpers";
import { estimateLibraryItems, type EstimateRowItem } from "@/components/workshop/estimate-tree-data";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";

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
    pricingSource: "Database Supplier",
    pricingDate: "2026-05-22",
  },
];

function renderSidebar(props: ComponentProps<typeof EstimateRightSidebar> = {}) {
  return render(<EstimateRightSidebar initialLibraryItems={sidebarSeedItems} {...props} />);
}

describe("component library UI", () => {
  beforeAll(() => {
    if (!window.PointerEvent) {
      window.PointerEvent = MouseEvent as unknown as typeof PointerEvent;
    }
  });

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the sidebar without a title bar and with full-width search", () => {
    renderSidebar();
    expect(screen.queryByRole("heading", { name: "Library" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Search Library Tree")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /new/i })).not.toBeInTheDocument();
  });

  it("shows search input with placeholder", () => {
    renderSidebar();
    expect(screen.getByPlaceholderText("Search Library Tree")).toBeInTheDocument();
  });

  it("shows left-aligned icon-only tools with tooltips and tree controls", () => {
    renderSidebar();
    expect(screen.getByLabelText("Library tree tools")).toBeInTheDocument();
    expect(screen.queryByText(/\d+ components?/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand all library tree" })).toHaveAttribute("title", "Expand all library tree");
    expect(screen.getByRole("button", { name: "Collapse all library tree" })).toHaveAttribute("title", "Collapse all library tree");
    expect(screen.getByRole("button", { name: "Add library tree" })).toHaveAttribute("title", "Add library tree");
    expect(screen.queryByText("Price range")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Group library by")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Sort library")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Export components" })).not.toBeInTheDocument();

    const stickyHeader = screen.getByLabelText("Library tree tools").closest(".sticky");
    expect(stickyHeader?.children).toHaveLength(3); // search, toolbar, tabs
  });

  it("shows tree view tabs", () => {
    renderSidebar();
    expect(screen.getByRole("tab", { name: "Categories" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Suppliers" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("tab", { name: "Custom" })).toHaveAttribute("aria-selected", "false");
  });

  it("opens the new component form in a viewport modal from the plus tool", () => {
    const { container } = renderSidebar();

    fireEvent.click(screen.getByRole("button", { name: "Add library tree" }));

    const dialog = screen.getByRole("dialog", { name: "New component" });
    expect(dialog).toBeInTheDocument();
    expect(dialog.closest("[data-archestimator-modal-root]")).toHaveClass("fixed", "inset-0", "z-[1000]");
    expect(container.querySelector("[role='dialog']")).toBeNull();
    expect(screen.getByLabelText("Component name")).toBeInTheDocument();
  });

  it("shows empty state when search returns no results", () => {
    renderSidebar();
    const search = screen.getByPlaceholderText("Search Library Tree");
    fireEvent.change(search, { target: { value: "xyz-nonexistent-12345" } });
    expect(screen.getByText(/No matches for/i)).toBeInTheDocument();
  });

  function expandSupplierFolder() {
    // Switch to Suppliers tab and expand folders until components appear
    fireEvent.click(screen.getByRole("tab", { name: "Suppliers" }));
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

  it("does not render bulk selection, assemblies, templates, import, or export controls", () => {
    renderSidebar();

    expect(screen.queryByLabelText(`Select ${sidebarSeedItems[0].material}`)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save assembly" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save template" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Import library file")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Export components" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Export components as CSV" })).not.toBeInTheDocument();
  });

  it("does not crash when localStorage writes fail", () => {
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

    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Expand all library tree" }));

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Failed to persist"), expect.any(Error));
    Object.defineProperty(window, "localStorage", { configurable: true, value: originalLocalStorage });
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

  it("keeps slash shortcut from focusing search behind the component modal", () => {
    renderSidebar();
    const search = screen.getByLabelText("Search Library Tree");
    fireEvent.click(screen.getByRole("button", { name: "Add library tree" }));

    fireEvent.keyDown(window, { key: "/" });
    expect(search).not.toHaveFocus();
  });

  it("shows taxonomy folders in the tree", () => {
    renderSidebar();
    expect(screen.getByRole("treeitem", { name: "All Components" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("treeitem", { name: "Administration" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Project Requirements" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Objects" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Furniture" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "HEMLINGBY Loveseat" })).toBeInTheDocument();
  });

  it("uses the same database taxonomy ids as the component workspace tree", () => {
    renderSidebar({
      initialLibraryItems: sharedLibraryItems,
      categoryTree: sharedCategoryTree,
      suppliers: [{ id: "db-supplier", name: "Database Supplier", sort_order: 1 }],
    });

    expect(screen.getByRole("treeitem", { name: "Database Components" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Fabrication" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Database Steel Frame" })).toBeInTheDocument();
    expect(screen.queryByRole("treeitem", { name: "Legacy category label" })).not.toBeInTheDocument();
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

  it("uses the compact shared tree rhythm for folders and component rows", () => {
    renderSidebar();

    const folder = screen.getByRole("treeitem", { name: "All Components" });
    expect(folder).toHaveClass("min-h-7", "!text-[10px]", "leading-4");
    expect(folder).toHaveClass("w-full");
    expect(folder.closest("[data-workshop-tree-row]")).toBe(folder);
    expect(folder).not.toHaveAttribute("draggable");

    const item = screen.getByRole("treeitem", { name: "HEMLINGBY Loveseat" });
    expect(item).toHaveClass("min-h-7", "w-full");
    expect(item.closest("[data-workshop-tree-row]")).toBe(item);
    expect(item.querySelector("[data-component-library-tree-label]")).toHaveClass("text-[10px]", "leading-4");
    expect(item).toHaveAttribute("draggable", "true");
  });

  it("opens right-click actions for folders and draggable component rows", async () => {
    const onInsert = vi.fn();
    renderSidebar({ onInsertComponent: onInsert, selectedNodeKind: "area", selectedNodeName: "Kitchen" });

    fireEvent.contextMenu(screen.getByRole("treeitem", { name: "All Components" }), { clientX: 16, clientY: 16 });
    expect(await screen.findByRole("menuitem", { name: "Select" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Collapse" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.contextMenu(screen.getByRole("treeitem", { name: "HEMLINGBY Loveseat" }), { clientX: 16, clientY: 16 });
    expect(await screen.findByRole("menuitem", { name: "Preview" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitem", { name: "Add to Kitchen" }));

    expect(onInsert).toHaveBeenCalledWith(expect.objectContaining<Partial<EstimateRowItem>>({ id: "lib-sofa" }));
  });
});
