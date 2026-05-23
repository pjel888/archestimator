import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { buildProposalExportModel } from "@/lib/proposal-export/build-proposal-export-model";
import { ProposalExportPreviewDialog } from "@/components/workshop/ProposalExportPreviewDialog";
import { EstimateSheetContent } from "@/components/workshop/EstimateSheetContent";
import type { ProposalExportMetadata } from "@/lib/proposal-export/types";
import type { EstimateRowItem, EstimateTreeNode } from "@/lib/estimates/types";

const metadata: ProposalExportMetadata = {
  projectId: "project-1",
  estimateId: "estimate-1",
  projectName: "Grand Hyatt Fit-Out Study",
  projectCode: "GH-001",
  projectAddress: "Taguig City",
  estimateName: "Interior Fit-Out Estimate",
  estimateSheetCode: "EST-001",
  versionLabel: "V1",
  currency: "PHP",
};

function row(overrides: Partial<EstimateRowItem> = {}): EstimateRowItem {
  const itemCost = overrides.itemCost ?? 950;
  const quantity = overrides.quantity ?? 1;
  const miscCost = overrides.miscCost ?? 0;

  return {
    id: overrides.id ?? "row-1",
    material: overrides.material ?? "Porcelain Tile",
    description: overrides.description ?? "Supply and install porcelain floor tile",
    supplier: overrides.supplier ?? "Wilcon Depot",
    source: overrides.source ?? "supplier",
    unit: overrides.unit ?? "sqm",
    itemCost,
    quantity,
    subTotal: itemCost * quantity,
    miscCost,
    totalItemCosts: itemCost * quantity + miscCost,
    category: overrides.category ?? "Finishes",
    discipline: overrides.discipline ?? "Architectural",
    designation: overrides.designation ?? "Floor Finish",
    pricingSource: overrides.pricingSource ?? "Supplier allowance",
    pricingDate: overrides.pricingDate ?? "2026-05-23",
  };
}

const nodes: EstimateTreeNode[] = [
  {
    id: "main-house",
    name: "Main House",
    kind: "group",
    total: "₱0.00",
    children: [
      {
        id: "bedroom-a",
        name: "Bedroom A",
        kind: "area",
        total: "₱0.00",
        estimateRowItems: [row({ id: "bed-a-tile", quantity: 12, miscCost: 500 })],
      },
      {
        id: "bedroom-b",
        name: "Bedroom B",
        kind: "area",
        total: "₱0.00",
        estimateRowItems: [row({ id: "bed-b-tile", quantity: 10, miscCost: 300 })],
      },
    ],
  },
];

describe("ProposalExportPreviewDialog", () => {
  it("shows a read-only contractor-format preview with stale refresh and download controls", async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    const onClose = vi.fn();
    const model = buildProposalExportModel({ metadata, nodes, generatedAt: "2026-05-23T00:00:00.000Z" });

    render(
      <ProposalExportPreviewDialog
        open
        model={model}
        isStale
        downloadHref="/api/projects/project-1/estimates/estimate-1/export/proposal.xlsx"
        onRefresh={onRefresh}
        onClose={onClose}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Excel export preview" })).toBeInTheDocument();
    expect(screen.getByTestId("proposal-preview-overlay")).toHaveClass("z-[1000]", "p-2", "backdrop-blur-md");
    expect(screen.getByRole("dialog", { name: "Excel export preview" })).toHaveClass(
      "h-[min(900px,94vh)]",
      "w-[min(1360px,98vw)]",
    );
    expect(screen.getByText("Read-only Excel preview")).toBeInTheDocument();
    expect(screen.getByText("Preview is stale. Refresh to rebuild from current sheet rows.")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "PARTICULARS" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Porcelain Tile — Supply and install porcelain floor tile" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "22" })).toBeInTheDocument();
    expect(screen.getAllByRole("cell", { name: "₱ 21,700.00" }).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();

    const downloadLink = screen.getByRole("link", { name: "Download editable XLSX" });
    expect(downloadLink).toHaveAttribute("href", "/api/projects/project-1/estimates/estimate-1/export/proposal.xlsx");

    const refreshButton = screen.getByRole("button", { name: "Refresh preview" });
    expect(refreshButton).toHaveClass("h-7", "gap-1", "text-[9px]", "font-bold", "leading-none", "bg-accentSoft", "text-primary");
    expect(downloadLink).toHaveClass("h-7", "gap-1", "text-[9px]", "font-bold", "leading-none", "bg-primary", "text-white");
    expect(screen.getByTestId("proposal-preview-refresh-label")).toHaveClass("text-[9px]", "font-bold", "leading-none");
    expect(screen.getByTestId("proposal-preview-download-label")).toHaveClass("text-[9px]", "font-bold", "leading-none");

    await user.click(refreshButton);
    expect(onRefresh).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Close preview" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("wires the estimate sheet toolbar to a refreshable read-only proposal preview", async () => {
    const user = userEvent.setup();

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <EstimateSheetContent
          selectedNodeId="main-house"
          nodes={nodes}
          projectId="project-1"
          estimateId="estimate-1"
          proposalExportMetadata={metadata}
          renderSidebar={false}
        />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Preview Excel Export" }));

    expect(screen.getByRole("dialog", { name: "Excel export preview" })).toBeInTheDocument();
    expect(screen.getByText("Preview current")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Porcelain Tile — Supply and install porcelain floor tile" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "22" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download editable XLSX" })).toHaveAttribute(
      "href",
      "/api/projects/project-1/estimates/estimate-1/export/proposal.xlsx",
    );
  });
});
