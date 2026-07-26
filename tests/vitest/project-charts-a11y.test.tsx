import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ProjectChartsClient } from "@/components/workshop/project-charts/ProjectChartsClient";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { buildSeriesByEstimate } from "@/lib/project-charts/project-comparison-view";
import type { ProjectChartsData } from "@/lib/project-charts/types";

function twoEstimateData(): ProjectChartsData {
  const estimateOptions = [
    { id: "estimate-a", name: "Schematic", sheetCode: "EST-001", currencyCode: "PHP", updatedAt: null, rowCount: 1, totalCost: 1000 },
    { id: "estimate-b", name: "Tender", sheetCode: "EST-002", currencyCode: "PHP", updatedAt: null, rowCount: 1, totalCost: 600 },
  ];
  const seriesByEstimateId = buildSeriesByEstimate(
    {
      estimates: estimateOptions,
      rows: [
        { id: "r1", estimateId: "estimate-a", nodeId: "a-struct", categoryNodeId: null, supplierId: null, supplierName: null, sourceSupplierId: null, sourceSupplierName: null, quantity: 10, unitCost: 100, miscCost: 0 },
        { id: "r2", estimateId: "estimate-b", nodeId: "b-struct", categoryNodeId: null, supplierId: null, supplierName: null, sourceSupplierId: null, sourceSupplierName: null, quantity: 6, unitCost: 100, miscCost: 0 },
      ],
      nodes: [
        { id: "a-struct", estimateId: "estimate-a", parentId: null, kind: "Area", name: "Structural", sortOrder: 1 },
        { id: "b-struct", estimateId: "estimate-b", parentId: null, kind: "Area", name: "Structural", sortOrder: 1 },
      ],
      categoryNodes: [],
      suppliers: [],
    },
    ["estimate-a", "estimate-b"],
  );
  return {
    projectId: "project-1",
    projectName: "Lewis Residence",
    estimateOptions,
    seriesByEstimateId,
    loadMode: "all-estimates",
    requiresSelectedPair: false,
    didTruncate: false,
    rowLimit: 5000,
    estimateLimit: 20,
  };
}

describe("project charts accessibility", () => {
  it("has exactly one h1 and associates each chart with the detail table (P3.3/P3.4)", () => {
    render(
      <ProjectChartsClient data={twoEstimateData()} initialGroupingMode="space" initialLeftEstimateId="estimate-a" initialRightEstimateId="estimate-b" />,
    );

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);

    const spine = screen.getByTestId("project-variance-spine");
    const tableId = spine.getAttribute("aria-describedby");
    expect(tableId).toBeTruthy();
    const table = document.getElementById(tableId as string);
    expect(table?.tagName.toLowerCase()).toBe("table");
  });

  it("encodes buckets with a text label (not color alone) so the chart↔table mapping survives grayscale (1.4.1)", () => {
    render(
      <ProjectChartsClient data={twoEstimateData()} initialGroupingMode="space" initialLeftEstimateId="estimate-a" initialRightEstimateId="estimate-b" />,
    );

    // The bucket label is rendered as text in BOTH the variance spine and the table.
    const spine = screen.getByTestId("project-variance-spine");
    expect(within(spine).getByText("Structural")).toBeInTheDocument();
    const row = screen.getAllByTestId("comparison-table-row")[0];
    expect(within(row).getByText("Structural")).toBeInTheDocument();
    // A non-color cue token (letter) accompanies the swatch.
    expect(within(row).getByText("A")).toBeInTheDocument();
  });

  it("exposes pinned state independently from transient hover state", async () => {
    const user = userEvent.setup();
    render(
      <ProjectChartsClient data={twoEstimateData()} initialGroupingMode="space" initialLeftEstimateId="estimate-a" initialRightEstimateId="estimate-b" />,
    );

    const spineButton = within(screen.getByTestId("project-variance-spine")).getByRole("button");
    expect(spineButton).toHaveAttribute("aria-pressed", "false");
    await user.hover(spineButton);
    expect(spineButton).toHaveAttribute("aria-pressed", "false");
    await user.click(spineButton);
    expect(spineButton).toHaveAttribute("aria-pressed", "true");

    const compositionButtons = screen.getAllByRole("button", { name: "Toggle Structural pin" });
    expect(compositionButtons.every((button) => button.getAttribute("aria-pressed") === "true")).toBe(true);
  });
});

describe("SegmentedControl roving tabindex (P3.5 / A11Y-8)", () => {
  function Harness() {
    const [value, setValue] = useState("space");
    return (
      <SegmentedControl
        ariaLabel="Break down by"
        options={[
          { value: "space", label: "Space" },
          { value: "category", label: "Category" },
          { value: "supplier", label: "Supplier" },
        ]}
        value={value}
        onValueChange={setValue}
      />
    );
  }

  it("keeps one tab stop and moves selection with arrow keys", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const space = screen.getByRole("button", { name: "Space" });
    const category = screen.getByRole("button", { name: "Category" });
    const supplier = screen.getByRole("button", { name: "Supplier" });

    // Only the selected option is in the tab order.
    expect(space).toHaveAttribute("tabindex", "0");
    expect(category).toHaveAttribute("tabindex", "-1");
    expect(supplier).toHaveAttribute("tabindex", "-1");
    expect(space).toHaveAttribute("aria-pressed", "true");

    space.focus();
    await user.keyboard("{ArrowRight}");
    expect(category).toHaveAttribute("aria-pressed", "true");
    expect(category).toHaveAttribute("tabindex", "0");
    expect(space).toHaveAttribute("tabindex", "-1");

    await user.keyboard("{ArrowLeft}");
    expect(space).toHaveAttribute("aria-pressed", "true");

    await user.keyboard("{End}");
    expect(supplier).toHaveAttribute("aria-pressed", "true");
    await user.keyboard("{Home}");
    expect(space).toHaveAttribute("aria-pressed", "true");
  });
});
