import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import { ComponentsPageClient } from "@/components/workshop/ComponentsPageClient";
import { ComponentLibraryInspector } from "@/components/workshop/component-library-manager/ComponentLibraryInspector";
import type { ComponentLibraryManagerItem } from "@/components/workshop/component-library-manager/types";

describe("component library manager UI", () => {
  it("renders a dense manager table instead of the old card grid", () => {
    const { container } = render(<ComponentsPageClient />);

    expect(screen.getByRole("grid", { name: "Component library table" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Name" })).toHaveAttribute("aria-sort", "ascending");
    expect(screen.getByRole("columnheader", { name: "Unit cost" })).toHaveAttribute("aria-sort", "none");
    expect(screen.getByLabelText("Library filters")).toBeInTheDocument();
    expect(screen.getByText("Dense table")).toBeInTheDocument();
    expect(container.querySelector("article")).toBeNull();
  });

  it("does not leave placeholder route copy in the page file", () => {
    const source = readFileSync(join(process.cwd(), "src/app/workshop/components/page.tsx"), "utf8");

    expect(source).toContain("Workspace library");
    expect(source).not.toContain("Component library shell");
    expect(source).not.toContain("Content pending approved workflow");
  });

  it("searches visible rows", () => {
    render(<ComponentsPageClient />);

    fireEvent.change(screen.getByLabelText("Search library"), { target: { value: "HEMLINGBY" } });

    expect(screen.getByText("HEMLINGBY Loveseat")).toBeInTheDocument();
    expect(screen.queryByText("Mandaue Foam Accent Chair")).not.toBeInTheDocument();
  });

  it("filters from the facet panel", () => {
    render(<ComponentsPageClient />);

    fireEvent.click(screen.getByRole("button", { name: /Missing price/i }));

    expect(screen.getByText("No components matched")).toBeInTheDocument();
  });

  it("updates facet counts to the visible filtered set", () => {
    render(<ComponentsPageClient />);

    fireEvent.click(screen.getByRole("button", { name: /Finishes18/i }));

    expect(screen.getByText("18 visible items")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Plumbing Fixtures10/i })).not.toBeInTheDocument();
  });

  it("opens a read-only inspector from a row", () => {
    render(<ComponentsPageClient />);

    fireEvent.click(screen.getByRole("row", { name: /HEMLINGBY Loveseat/i }));

    const inspector = screen.getByLabelText("HEMLINGBY Loveseat details");
    expect(inspector).toBeInTheDocument();
    expect(within(inspector).getByText("Pricing")).toBeInTheDocument();
    expect(within(inspector).getByText("IKEA PH sofa category page")).toBeInTheDocument();
    expect(within(inspector).getByRole("button", { name: "Edit" })).toBeDisabled();
    expect(within(inspector).getByRole("button", { name: "Duplicate" })).toBeDisabled();
  });

  it("does not render unsafe source URLs as external links", () => {
    const unsafeItem: ComponentLibraryManagerItem = {
      id: "unsafe",
      name: "Unsafe Source",
      kind: "material",
      category: "Finishes",
      supplier: "Supplier",
      rawSupplier: "Supplier",
      unit: "pc",
      unitCost: 1,
      laborCost: 0,
      supplementaryCost: 0,
      pricingSource: "Manual",
      pricingDate: "2026-05-21",
      confidence: "Demo seed",
      description: "Unsafe URL fixture",
      sourceUrl: "javascript:alert(1)",
      health: "current",
      healthIssues: [],
    };

    render(<ComponentLibraryInspector item={unsafeItem} onClose={() => undefined} />);

    expect(screen.getByText("javascript:alert(1)")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "javascript:alert(1)" })).not.toBeInTheDocument();
  });
});
