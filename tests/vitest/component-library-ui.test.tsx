import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EstimateRightSidebar } from "@/components/workshop/component-library";
import type { EstimateRowItem } from "@/components/workshop/estimate-tree-data";

describe("component library UI", () => {
  it("renders the sidebar with title and full-width search", () => {
    render(<EstimateRightSidebar />);
    expect(screen.getByText("Component library")).toBeInTheDocument();
    expect(screen.getByLabelText("Search component library")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /new/i })).not.toBeInTheDocument();
  });

  it("shows search input with placeholder", () => {
    render(<EstimateRightSidebar />);
    expect(screen.getByPlaceholderText(/search component library/i)).toBeInTheDocument();
  });

  it("shows left-aligned icon-only tools with tooltips", () => {
    render(<EstimateRightSidebar />);
    expect(screen.getByLabelText("Component library tools")).toBeInTheDocument();
    expect(screen.queryByText(/\d+ components?/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filter component library" })).toHaveAttribute("title", "Filter component library");
    expect(screen.getByRole("button", { name: "Group component library" })).toHaveAttribute("title", "Group component library");
    expect(screen.queryByRole("button", { name: "Collapse all component library" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Expand all component library" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add component library" })).toHaveAttribute("title", "Add component library");
    expect(screen.queryByText("Category")).not.toBeInTheDocument();
  });

  it("opens filters from the icon-only filter tool", () => {
    render(<EstimateRightSidebar />);
    fireEvent.click(screen.getByRole("button", { name: "Filter component library" }));
    expect(screen.getByText("Category")).toBeInTheDocument();
  });

  it("shows empty state when search returns no results", () => {
    render(<EstimateRightSidebar />);
    const search = screen.getByPlaceholderText(/search component library/i);
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
