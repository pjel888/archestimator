import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import { TemplatesPageClient } from "@/components/workshop/TemplatesPageClient";
import { estimateTemplates } from "@/lib/component-library/estimate-templates";

describe("template library manager UI", () => {
  it("renders templates on their own library route surface", () => {
    render(<TemplatesPageClient templates={estimateTemplates} />);

    expect(screen.getByLabelText("Template library workspace")).toBeInTheDocument();
    expect(screen.getByLabelText("Template library tree")).toBeInTheDocument();
    expect(screen.getByLabelText("Template sheet")).toBeInTheDocument();
    expect(screen.queryByLabelText("Library row collection")).not.toBeInTheDocument();

    const tabs = screen.getByRole("tablist", { name: "Library views" });
    expect(within(tabs).getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Templates"]);
    expect(within(tabs).getByRole("tab", { name: "Templates" })).toHaveAttribute("aria-selected", "true");

    const tree = screen.getByLabelText("Template library tree");
    const sheet = screen.getByLabelText("Template sheet");
    expect(within(tree).getByRole("treeitem", { name: "All Templates" })).toHaveAttribute("aria-selected", "true");
    expect(within(tree).getByRole("treeitem", { name: "Residential Rooms" })).toBeInTheDocument();
    expect(within(tree).getByRole("treeitem", { name: "Condo Fit-Out Starter" })).toBeInTheDocument();
    expect(within(sheet).getByRole("tab", { name: "All Templates" })).toHaveAttribute("aria-selected", "true");
    expect(within(sheet).getByText("3 of 3 templates")).toBeInTheDocument();
    expect(within(sheet).getByText("Condo Fit-Out Starter")).toBeInTheDocument();
    expect(within(sheet).getByText("2 groups / 3 areas / 8 rows")).toBeInTheDocument();
    const condoPreview = within(sheet).getByLabelText("Condo Fit-Out Starter template preview");
    expect(within(condoPreview).getByText("Residential Rooms")).toBeInTheDocument();
    expect(within(condoPreview).getByText("Structure")).toBeInTheDocument();
    expect(within(condoPreview).getByText("Interior Fit-Out")).toBeInTheDocument();
    expect(within(condoPreview).getByText("Living + Dining")).toBeInTheDocument();
    expect(within(condoPreview).getByText("Sample rows")).toBeInTheDocument();
    expect(within(condoPreview).getByText("HEMLINGBY Loveseat")).toBeInTheDocument();
    expect(within(condoPreview).getAllByText("1 pc").length).toBeGreaterThan(0);
    expect(within(sheet).queryByText("Database Steel Frame")).not.toBeInTheDocument();

    fireEvent.click(within(tree).getByRole("treeitem", { name: "Condo Fit-Out Starter" }));
    expect(within(sheet).getByRole("tab", { name: "Condo Fit-Out Starter" })).toHaveAttribute("aria-selected", "true");
    expect(within(sheet).getByText("1 of 1 template")).toBeInTheDocument();
    expect(within(sheet).getAllByText("Condo Fit-Out Starter").length).toBeGreaterThan(0);
  });

  it("renders the shared empty state copy when no templates exist", () => {
    render(<TemplatesPageClient templates={[]} />);

    const sheet = screen.getByLabelText("Template sheet");
    expect(within(sheet).getByRole("tab", { name: "All Templates" })).toHaveAttribute("aria-selected", "true");
    expect(within(sheet).getByText("No templates in this workspace yet.")).toBeInTheDocument();
    expect(within(sheet).queryByText("No templates in this folder yet.")).not.toBeInTheDocument();
  });

  it("renders shared no-match states for sheet and tree filters", () => {
    render(<TemplatesPageClient templates={estimateTemplates} />);

    const sheet = screen.getByLabelText("Template sheet");
    fireEvent.change(screen.getByLabelText("Search template sheet"), { target: { value: "zzzz-template" } });

    expect(within(sheet).getByRole("tab", { name: "All Templates" })).toHaveAttribute("aria-selected", "true");
    expect(within(sheet).getByText('No templates match "zzzz-template".')).toBeInTheDocument();

    const tree = screen.getByLabelText("Template library tree");
    fireEvent.change(screen.getByLabelText("Search template library tree"), { target: { value: "zzzz-folder" } });

    expect(within(tree).getByText("No template folders")).toBeInTheDocument();
    expect(within(tree).getByText('No templates match "zzzz-folder".')).toBeInTheDocument();
  });
});
