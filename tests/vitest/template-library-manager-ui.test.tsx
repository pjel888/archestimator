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
    expect(within(sheet).getByText("Condo Fit-Out Starter")).toBeInTheDocument();
    expect(within(sheet).getByText("2 groups / 3 areas / 8 rows")).toBeInTheDocument();
    expect(within(sheet).queryByText("Database Steel Frame")).not.toBeInTheDocument();

    fireEvent.click(within(tree).getByRole("treeitem", { name: "Condo Fit-Out Starter" }));
    expect(within(sheet).getByRole("tab", { name: "Condo Fit-Out Starter" })).toHaveAttribute("aria-selected", "true");
    expect(within(sheet).getAllByText("Condo Fit-Out Starter").length).toBeGreaterThan(0);
  });
});
