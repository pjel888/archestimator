import { render, screen, waitFor } from "@testing-library/react";
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
  projectName: "Synthetic Hotel Fit-Out Study",
  projectCode: "SYN-001",
  projectAddress: "Metro City",
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
    supplier: overrides.supplier ?? "Sample Supplier",
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
    const onScopeChange = vi.fn();
    const onDownload = vi.fn();
    const model = buildProposalExportModel({ metadata, nodes, generatedAt: "2026-05-23T00:00:00.000Z" });

    render(
      <ProposalExportPreviewDialog
        open
        model={model}
        isStale
        onDownload={onDownload}
        scopeControls={{
          selectedScope: "all-tabs",
          activeTabName: "Main",
          tabCount: 2,
          onScopeChange,
        }}
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
    expect(screen.getByText("This preview consolidates identical items across rooms/areas within each tab.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /All tabs/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Main tab/i })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Preview is stale. Refresh to rebuild from current sheet rows.")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "PARTICULARS" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Porcelain Tile — Supply and install porcelain floor tile" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "22" })).toBeInTheDocument();
    expect(screen.getAllByRole("cell", { name: "₱ 21,700.00" }).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();

    // F-05 (P1-T1): the download is now a button (fetch-then-blob), not a bare <a href>
    // that would save the route's JSON error body under the .xlsx name.
    const downloadButton = screen.getByRole("button", { name: "Download editable XLSX" });
    expect(downloadButton).toHaveClass("h-7", "gap-1", "bg-primary", "text-white");
    expect(screen.queryByRole("link", { name: "Download editable XLSX" })).not.toBeInTheDocument();

    const refreshButton = screen.getByRole("button", { name: "Refresh preview" });
    expect(refreshButton).toHaveClass("h-7", "gap-1", "bg-accentSoft", "text-primary");

    await user.click(downloadButton);
    expect(onDownload).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /Main tab/i }));
    expect(onScopeChange).toHaveBeenCalledWith("active-tab");

    await user.click(refreshButton);
    expect(onRefresh).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Close preview" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("disables the download button and surfaces the route error inline when a download fails", async () => {
    const model = buildProposalExportModel({ metadata, nodes, generatedAt: "2026-05-23T00:00:00.000Z" });

    const { rerender } = render(
      <ProposalExportPreviewDialog open model={model} onDownload={vi.fn()} isDownloading onRefresh={vi.fn()} onClose={vi.fn()} />,
    );

    const downloadingButton = screen.getByRole("button", { name: /Preparing/i });
    expect(downloadingButton).toBeDisabled();

    rerender(
      <ProposalExportPreviewDialog
        open
        model={model}
        onDownload={vi.fn()}
        downloadError="Estimate is too large to export as XLSX right now."
        onRefresh={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Estimate is too large to export as XLSX right now.");
    expect(screen.getByRole("button", { name: "Download editable XLSX" })).toBeEnabled();
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
    expect(screen.getByRole("button", { name: "Download editable XLSX" })).toBeInTheDocument();
  });

  it("defaults multi-tab preview downloads to all-tabs export and lets users switch to the active-tab route", async () => {
    const user = userEvent.setup();

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <EstimateSheetContent
          selectedNodeId="main-house"
          nodes={nodes}
          projectId="project-1"
          estimateId="estimate-1"
          estimateTabs={[
            { id: "tab-main", name: "Main", sortOrder: 0, isDefault: true },
            { id: "tab-owner", name: "Owner Option", sortOrder: 10, isDefault: false },
          ]}
          activeTabId="tab-main"
          dataTabId="tab-main"
          initialTabId="tab-main"
          proposalExportMetadata={metadata}
          renderSidebar={false}
        />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Preview Excel Export" }));

    expect(screen.getByRole("button", { name: /All tabs/i })).toHaveAttribute("aria-pressed", "true");

    // The download button fetches the scoped route and blobs the result; assert the
    // fetched URL changes with scope rather than an <a href>.
    const okResponse = () =>
      new Response("xlsx-bytes", {
        status: 200,
        headers: {
          "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "content-disposition": 'attachment; filename="SYN-001-EST-001-proposal.xlsx"',
        },
      });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(() => Promise.resolve(okResponse()));
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => "blob:mock") as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn() as typeof URL.revokeObjectURL;

    try {
      await user.click(screen.getByRole("button", { name: "Download editable XLSX" }));
      await waitFor(() =>
        expect(fetchMock).toHaveBeenLastCalledWith("/api/projects/project-1/estimates/estimate-1/export/proposal.xlsx"),
      );

      await user.click(screen.getByRole("button", { name: /Main tab/i }));
      expect(screen.getByRole("button", { name: /Main tab/i })).toHaveAttribute("aria-pressed", "true");

      await user.click(screen.getByRole("button", { name: "Download editable XLSX" }));
      await waitFor(() =>
        expect(fetchMock).toHaveBeenLastCalledWith("/api/projects/project-1/estimates/estimate-1/export/proposal.xlsx?tab=tab-main"),
      );
    } finally {
      fetchMock.mockRestore();
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
    }
  });

  it("renders the route error inline (413) without saving a corrupt file", async () => {
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

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Estimate is too large to export as XLSX right now." }), {
        status: 413,
        headers: { "content-type": "application/json" },
      }),
    );
    const createSpy = vi.fn(() => "blob:mock");
    const originalCreate = URL.createObjectURL;
    URL.createObjectURL = createSpy as typeof URL.createObjectURL;

    try {
      await user.click(screen.getByRole("button", { name: "Download editable XLSX" }));
      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent("Estimate is too large to export as XLSX right now."),
      );
      expect(createSpy).not.toHaveBeenCalled();
    } finally {
      fetchMock.mockRestore();
      URL.createObjectURL = originalCreate;
    }
  });
});
