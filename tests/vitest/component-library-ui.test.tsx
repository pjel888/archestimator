import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EstimateRightSidebar } from "@/components/workshop/component-library";
import type { EstimateRowItem } from "@/components/workshop/estimate-tree-data";

describe("component library UI", () => {
  it("renders the sidebar with title and new button", () => {
    render(<EstimateRightSidebar />);
    expect(screen.getByText("Component library")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /new/i })).toBeInTheDocument();
  });

  it("shows search input with placeholder", () => {
    render(<EstimateRightSidebar />);
    expect(screen.getByPlaceholderText(/search components, suppliers, tags/i)).toBeInTheDocument();
  });

  it("shows component count", () => {
    render(<EstimateRightSidebar />);
    // Should show count of seeded library items
    expect(screen.getByText(/\d+ components?/)).toBeInTheDocument();
  });

  it("toggles filter panel when filter button clicked", () => {
    render(<EstimateRightSidebar />);
    const filterButton = screen.getByRole("button", { name: /open component filters/i });
    fireEvent.click(filterButton);
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getAllByText("Supplier").length).toBeGreaterThanOrEqual(1);
    fireEvent.click(filterButton);
    expect(screen.queryByText("Category")).not.toBeInTheDocument();
  });

  it("switches view mode between compact, detailed, and grid", () => {
    render(<EstimateRightSidebar />);
    const compact = screen.getByTitle("Compact");
    const detailed = screen.getByTitle("Detailed");
    const grid = screen.getByTitle("Grid");
    expect(compact).toBeInTheDocument();
    expect(detailed).toBeInTheDocument();
    expect(grid).toBeInTheDocument();

    // Click detailed view
    fireEvent.click(detailed);
    // Click grid view
    fireEvent.click(grid);
    // Click compact view
    fireEvent.click(compact);
  });

  it("opens new component form when new button clicked", () => {
    render(<EstimateRightSidebar />);
    const newButton = screen.getByRole("button", { name: /new/i });
    fireEvent.click(newButton);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("New component")).toBeInTheDocument();
  });

  it("shows empty state when search returns no results", () => {
    render(<EstimateRightSidebar />);
    const search = screen.getByPlaceholderText(/search components, suppliers, tags/i);
    fireEvent.change(search, { target: { value: "xyz-nonexistent-12345" } });
    expect(screen.getByText("No components matched")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear search and filters/i })).toBeInTheDocument();
  });

  it("dispatches custom event when add button clicked on a component", () => {
    const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");
    render(<EstimateRightSidebar />);
    // The add buttons are hidden until hover, but we can still find them in the DOM
    const addButtons = screen.getAllByLabelText(/add .* to selected estimate area/i);
    expect(addButtons.length).toBeGreaterThan(0);
    fireEvent.click(addButtons[0]);
    expect(dispatchEventSpy).toHaveBeenCalledWith(expect.any(CustomEvent));
    dispatchEventSpy.mockRestore();
  });

  it("calls onInsertComponent prop when provided instead of dispatching event", () => {
    const onInsert = vi.fn();
    render(<EstimateRightSidebar onInsertComponent={onInsert} />);
    const addButtons = screen.getAllByLabelText(/add .* to selected estimate area/i);
    fireEvent.click(addButtons[0]);
    expect(onInsert).toHaveBeenCalledWith(expect.objectContaining<Partial<EstimateRowItem>>({ source: "library" }));
  });

  it("shows group headers with item counts", () => {
    render(<EstimateRightSidebar />);
    // Default group by is category, so we should see category names
    expect(screen.getByText("Furniture")).toBeInTheDocument();
  });

  it("collapses and expands groups when header clicked", () => {
    render(<EstimateRightSidebar />);
    const groupHeader = screen.getByText("Furniture");
    fireEvent.click(groupHeader);
    // After collapse, the group content should be hidden
    // (We verify the button has aria-expanded="false")
    expect(groupHeader.closest("button")).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(groupHeader);
    expect(groupHeader.closest("button")).toHaveAttribute("aria-expanded", "true");
  });
});
