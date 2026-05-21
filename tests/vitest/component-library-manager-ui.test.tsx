import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { ComponentsPageClient } from "@/components/workshop/ComponentsPageClient";

describe("component library manager UI", () => {
  it("renders the estimate-style component workspace without the retired standalone chrome", () => {
    render(<ComponentsPageClient />);

    expect(screen.getByLabelText("Component library workspace")).toBeInTheDocument();
    expect(screen.getByLabelText("Component library tree")).toBeInTheDocument();
    expect(screen.getByLabelText("Custom component sheet")).toBeInTheDocument();
    expect(screen.getByLabelText("Search component library tree")).toBeInTheDocument();
    expect(screen.getByLabelText("Search component sheet")).toBeInTheDocument();
    expect(screen.getByLabelText("Search component library tree").compareDocumentPosition(screen.getByLabelText("Component tree tools"))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.getByLabelText("Component tree tools").compareDocumentPosition(screen.getByRole("tablist", { name: "Component library tree views" }))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.getByRole("tab", { name: "Categories" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Suppliers" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByRole("treeitem", { name: "Fixtures" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("treeitem", { name: "Administration" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Architecture" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Materials" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Finishes" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Doors" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Windows" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Furniture" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Equipment" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Plumbing Systems" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Sanitary Systems" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Fire Alarm" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Life Safety" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Custom user components" })).toBeInTheDocument();
    expect(screen.getAllByText("LED Downlight 18W").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lavatory Faucet").length).toBeGreaterThan(0);
    expect(screen.queryByText("FF&E")).not.toBeInTheDocument();
    expect(screen.queryByText("FFE")).not.toBeInTheDocument();
    expect(screen.queryByText("Furniture, Fixtures, and Equipment")).not.toBeInTheDocument();
    expect(screen.queryByText("Furniture, Furnishings & Equipment")).not.toBeInTheDocument();
    expect(screen.queryByText("Furniture + Equipment")).not.toBeInTheDocument();
    expect(screen.queryByText("Fixtures & Equipment")).not.toBeInTheDocument();
    expect(screen.queryByText("Architecture & Interiors")).not.toBeInTheDocument();
    expect(screen.queryByText("Fixture - Lighting")).not.toBeInTheDocument();
    expect(screen.queryByText("Fixture - Plumbing")).not.toBeInTheDocument();
    expect(screen.queryByText("Assemblies & Templates")).not.toBeInTheDocument();

    expect(screen.queryByLabelText("Search library")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Library tools")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New component" })).not.toBeInTheDocument();
    expect(screen.queryByRole("grid", { name: "Component library table" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Library filters")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/details$/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Demo seed")).not.toBeInTheDocument();
  });

  it("keeps the route wired to the component workspace shell copy", () => {
    const source = readFileSync(join(process.cwd(), "src/app/workshop/components/page.tsx"), "utf8");

    expect(source).toContain("Component workspace");
    expect(source).toContain("Custom library");
    expect(source).not.toContain("Workspace library");
    expect(source).not.toContain("Demo seed");
    expect(source).not.toContain("Component library shell");
    expect(source).not.toContain("Content pending approved workflow");
  });

  it("supports tree view tabs and sheet-local search in the estimate workspace positions", () => {
    render(<ComponentsPageClient />);

    fireEvent.click(screen.getByRole("tab", { name: "Suppliers" }));

    expect(screen.getByRole("tab", { name: "Suppliers" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("treeitem", { name: /IKEA Philippines/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByText("HEMLINGBY Loveseat").length).toBeGreaterThan(0);
    expect(screen.queryByText("LED Downlight 18W")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("treeitem", { name: /Wilcon Depot/ }));

    expect(screen.getAllByText("LED Downlight 18W").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lavatory Faucet").length).toBeGreaterThan(0);
    expect(screen.queryByText("HEMLINGBY Loveseat")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search component sheet"), { target: { value: "faucet" } });

    expect(screen.getByLabelText("Search component sheet")).toHaveValue("faucet");
    expect(screen.getAllByText("Lavatory Faucet").length).toBeGreaterThan(0);
    expect(screen.queryByText("LED Downlight 18W")).not.toBeInTheDocument();
  });

  it("searches taxonomy aliases without turning procurement scopes into category folders", () => {
    render(<ComponentsPageClient />);

    fireEvent.change(screen.getByLabelText("Search component library tree"), { target: { value: "luminaire" } });

    expect(screen.getByLabelText("Search component library tree")).toHaveValue("luminaire");
    expect(screen.getByRole("treeitem", { name: "Lighting Fixtures" })).toBeInTheDocument();
    expect(screen.queryByRole("treeitem", { name: "FF&E" })).not.toBeInTheDocument();
  });

  it("keeps organizer, category, and subcategory tree rows visually consistent", () => {
    render(<ComponentsPageClient />);

    expect(screen.getByRole("treeitem", { name: "Objects" })).toHaveClass("!text-[10px]");
    expect(screen.getByRole("treeitem", { name: "Fixtures" })).toHaveClass("!text-[10px]");
    expect(screen.getByRole("treeitem", { name: "Lighting Fixtures" })).toHaveClass("!text-[10px]");
    expect(screen.getByRole("treeitem", { name: "Objects" }).className).not.toContain("uppercase");
    expect(screen.getByRole("treeitem", { name: "Objects" }).className).not.toContain("tracking-[0.08em]");
  });

  it("preserves the no-drag component tree contract and the estimate tree width target", () => {
    const source = readFileSync(
      join(process.cwd(), "src/components/workshop/component-library-manager/ComponentLibraryManager.tsx"),
      "utf8",
    );

    expect(source).toContain("const COMPONENT_LIBRARY_TREE_WIDTH = 376");
    expect(source).toContain("componentCategoryTree");
    expect(source).not.toContain("kind === \"browse-section\"");
    expect(source).not.toContain("node.code ? <span");
    expect(source).toContain("defaultWidth={272}");
    expect(source).toContain("minWidth={216}");
    expect(source).toContain("maxWidth={432}");
    expect(source).toContain("widthOffset={COMPONENT_LIBRARY_TREE_LEFT_EXTENSION_WIDTH}");
    expect(source).not.toContain("canDragAndDrop");
    expect(source).not.toContain("canReorderItems");
    expect(source).not.toContain("onDrop");
    expect(source).not.toContain("data-estimate-tree-root");
    expect(source).not.toContain("EstimateRightSidebar");
    expect(source).not.toContain("renderSidebar");
  });
});
