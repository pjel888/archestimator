import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { EstimateRightSidebar } from "@/components/workshop/component-library";
import { LIBRARY_RECENTS_KEY } from "@/components/workshop/component-library/helpers";
import { estimateLibraryItems, type EstimateRowItem } from "@/components/workshop/estimate-tree-data";

const sidebarSeedItems = estimateLibraryItems.slice(0, 8);

function renderSidebar(props: ComponentProps<typeof EstimateRightSidebar> = {}) {
  return render(<EstimateRightSidebar initialLibraryItems={sidebarSeedItems} {...props} />);
}

describe("component library UI", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the sidebar without a title bar and with full-width search", () => {
    renderSidebar();
    expect(screen.queryByRole("heading", { name: "Library" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Search Library")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /new/i })).not.toBeInTheDocument();
  });

  it("shows search input with placeholder", () => {
    renderSidebar();
    expect(screen.getByPlaceholderText("Search Library")).toBeInTheDocument();
  });

  it("shows left-aligned icon-only tools with tooltips", () => {
    renderSidebar();
    expect(screen.getByLabelText("Library tools")).toBeInTheDocument();
    expect(screen.queryByText(/\d+ components?/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filter library" })).toHaveAttribute("title", "Filter library");
    expect(screen.getByRole("button", { name: "Group library" })).toHaveAttribute("title", "Group library");
    expect(screen.queryByRole("button", { name: "Collapse all library" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Expand all library" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add library" })).toHaveAttribute("title", "Add library");
    expect(screen.queryByText("Price range")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Group library by")).toHaveValue("category");
    expect(screen.getByLabelText("Sort library")).toHaveValue("relevance");
  });

  it("opens filters from the icon-only filter tool", () => {
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: "Filter library" }));
    expect(screen.getByText("Price range")).toBeInTheDocument();
  });

  it("opens the new component form in a viewport modal from the plus tool", () => {
    const { container } = renderSidebar();

    fireEvent.click(screen.getByRole("button", { name: "Add library" }));

    const dialog = screen.getByRole("dialog", { name: "New component" });
    expect(dialog).toBeInTheDocument();
    expect(dialog.closest("[data-archestimator-modal-root]")).toHaveClass("fixed", "inset-0", "z-[1000]");
    expect(container.querySelector("[role='dialog']")).toBeNull();
    expect(screen.getByLabelText("Component name")).toBeInTheDocument();
  });

  it("shows empty state when search returns no results", () => {
    renderSidebar();
    const search = screen.getByPlaceholderText("Search Library");
    fireEvent.change(search, { target: { value: "xyz-nonexistent-12345" } });
    expect(screen.getByText("No components matched")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear search and filters/i })).toBeInTheDocument();
  });

  it("dispatches custom event when add button clicked on a component", () => {
    const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");
    renderSidebar();
    // The add buttons are hidden until hover, but we can still find them in the DOM
    const addButtons = screen.getAllByLabelText(/add to selected area:/i);
    expect(addButtons.length).toBeGreaterThan(0);
    fireEvent.click(addButtons[0]);
    expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
  });

  it("calls onInsertComponent prop when provided instead of dispatching event", () => {
    const onInsert = vi.fn();
    const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");
    renderSidebar({ onInsertComponent: onInsert });
    const addButtons = screen.getAllByLabelText(/add to selected area:/i);
    fireEvent.click(addButtons[0]);
    expect(onInsert).toHaveBeenCalledWith(expect.objectContaining<Partial<EstimateRowItem>>({ source: "library" }));
    expect(dispatchEventSpy).not.toHaveBeenCalledWith(expect.objectContaining({ type: "archestimator:add-library-item" }));
  });

  it("does not mark recents when the direct insert callback rejects insertion", () => {
    renderSidebar({ onInsertComponent: () => false, selectedNodeKind: "area", selectedNodeName: "Kitchen" });
    fireEvent.click(screen.getAllByLabelText(/add to kitchen:/i)[0]);

    expect(window.localStorage.getItem(LIBRARY_RECENTS_KEY)).toBeNull();
    expect(screen.getByText(/was not inserted/i)).toBeInTheDocument();
  });

  it("writes recents and shows the recent strip after successful direct insertion", () => {
    renderSidebar({ onInsertComponent: () => true, selectedNodeKind: "area", selectedNodeName: "Kitchen" });
    fireEvent.click(screen.getAllByLabelText(/add to kitchen:/i)[0]);

    expect(JSON.parse(window.localStorage.getItem(LIBRARY_RECENTS_KEY) ?? "[]")).toContain(sidebarSeedItems[0].id);
    expect(screen.getByText("Recently Used")).toBeInTheDocument();
  });

  it("shows target-aware insertion state and disables add for non-area selections", () => {
    const onInsert = vi.fn();
    renderSidebar({ onInsertComponent: onInsert, selectedNodeKind: "group", selectedNodeName: "Main House" });

    expect(screen.getByText("Main House cannot receive estimate rows")).toBeInTheDocument();
    const addButtons = screen.getAllByLabelText(/select an area before adding/i);
    expect(addButtons[0]).toBeDisabled();
    fireEvent.click(addButtons[0]);
    expect(onInsert).not.toHaveBeenCalled();
  });

  it("exposes view, group, and sort controls", () => {
    renderSidebar({ selectedNodeKind: "area", selectedNodeName: "Kitchen" });

    expect(screen.getByText("Inserting into Kitchen")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /grid/i }));
    expect(screen.getByRole("button", { name: /grid/i })).toHaveAttribute("aria-pressed", "true");

    fireEvent.change(screen.getByLabelText("Group library by"), { target: { value: "supplier" } });
    expect(screen.getByLabelText("Group library by")).toHaveValue("supplier");

    fireEvent.change(screen.getByLabelText("Sort library"), { target: { value: "priceDesc" } });
    expect(screen.getByLabelText("Sort library")).toHaveValue("priceDesc");
  });

  it("uses native preview buttons with arrow-key card navigation", async () => {
    const { container } = renderSidebar();
    expect(container.querySelector("[role='button']")).toBeNull();

    await waitFor(() => expect(screen.getAllByRole("button", { name: /preview/i })[0]).toHaveAttribute("tabindex", "0"));
    const previewButtons = screen.getAllByRole("button", { name: /preview/i });
    previewButtons[0].focus();
    fireEvent.keyDown(previewButtons[0], { key: "ArrowDown" });
    expect(previewButtons[1]).toHaveFocus();
  });

  it("supports bulk selection, favorite, and bundle creation", () => {
    const onInsert = vi.fn(() => true);
    renderSidebar({ onInsertComponent: onInsert, selectedNodeKind: "area", selectedNodeName: "Kitchen" });

    fireEvent.click(screen.getByLabelText(`Select ${sidebarSeedItems[0].material}`));
    fireEvent.click(screen.getByRole("button", { name: /^Favorite$/ }));
    expect(screen.getByRole("button", { name: `Unfavorite ${sidebarSeedItems[0].material}` })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save assembly" }));
    expect(screen.getByRole("tab", { name: "Assemblies" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("1 item assembly")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add 1" }));
    expect(onInsert).toHaveBeenCalledWith(expect.objectContaining({ id: sidebarSeedItems[0].id }));
  });

  it("shows default templates and inserts a bundle as multiple components", () => {
    const onInsert = vi.fn(() => true);
    renderSidebar({ onInsertComponent: onInsert, selectedNodeKind: "area", selectedNodeName: "Kitchen" });

    fireEvent.click(screen.getByRole("tab", { name: "Templates" }));
    expect(screen.getAllByText(/template/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: /add \d+/i })[0]);
    expect(onInsert).toHaveBeenCalled();
  });

  it("imports CSV components from the hidden file input", async () => {
    renderSidebar();
    const file = new File([""], "components.csv", { type: "text/csv" });
    Object.defineProperty(file, "text", {
      value: vi.fn().mockResolvedValue("name,category,unit,price\nImported Mirror,Finishes,pc,900"),
    });

    fireEvent.change(screen.getByLabelText("Import library file"), { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText("Imported Mirror")).toBeInTheDocument());
  });

  it("offers JSON and CSV export actions", () => {
    const createObjectUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:component-export");
    const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    renderSidebar();

    fireEvent.click(screen.getByRole("button", { name: "Export components" }));
    fireEvent.click(screen.getByRole("button", { name: "Export components as CSV" }));

    expect(createObjectUrl).toHaveBeenCalledTimes(2);
    expect(click).toHaveBeenCalledTimes(2);
    expect(revokeObjectUrl).toHaveBeenCalledTimes(2);
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
    fireEvent.click(screen.getByRole("button", { name: /grid/i }));

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Failed to persist"), expect.any(Error));
    Object.defineProperty(window, "localStorage", { configurable: true, value: originalLocalStorage });
  });

  it("dismisses delete confirmation with Escape", () => {
    renderSidebar();
    fireEvent.click(screen.getAllByText("HEMLINGBY Loveseat")[0]);
    const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("keeps slash shortcut from focusing search behind the component modal", () => {
    renderSidebar();
    const search = screen.getByLabelText("Search Library");
    fireEvent.click(screen.getByRole("button", { name: "Add library" }));

    fireEvent.keyDown(window, { key: "/" });
    expect(search).not.toHaveFocus();
  });

  it("shows group headers with item counts", () => {
    renderSidebar();
    // Default group by is category, so we should see category names
    expect(screen.getByText("Furniture")).toBeInTheDocument();
  });

  it("collapses and expands groups when header clicked", () => {
    renderSidebar();
    const groupHeader = screen.getByText("Furniture");
    fireEvent.click(groupHeader);
    // After collapse, the group content should be hidden
    // (We verify the button has aria-expanded="false")
    expect(groupHeader.closest("button")).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(groupHeader);
    expect(groupHeader.closest("button")).toHaveAttribute("aria-expanded", "true");
  });
});
