import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildProposalExportModel } from "@/lib/proposal-export/build-proposal-export-model";
import { ProposalExportPreviewDialog } from "@/components/workshop/ProposalExportPreviewDialog";
import { clampRate } from "@/components/workshop/proposal-export-preview-utils";
import { EstimateSheetContent } from "@/components/workshop/EstimateSheetContent";
import { setEstimateProposalPreviewSignatureProbe } from "@/components/workshop/estimate-sheet-render-probe";
// Req 1 / D2: the "Preview Excel Export" opener moved to the project chrome
// header (`EstimateHeaderActions`), fed by the page via a shared store. Render it
// alongside the sheet so the relocated opener is reachable here.
import { EstimateHeaderActions } from "@/components/workshop/EstimateHeaderActions";
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

afterEach(() => {
  setEstimateProposalPreviewSignatureProbe(null);
});

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
        status={{ freshness: "stale", download: { kind: "ready" } }}
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
    expect(screen.getByTestId("proposal-preview-overlay")).toHaveClass(
      "z-[1000]",
      "p-0",
      "backdrop:bg-black/25",
      "backdrop:backdrop-blur-md",
    );
    expect(screen.getByRole("dialog", { name: "Excel export preview" })).toHaveClass(
      "h-[min(900px,94vh)]",
      "w-[min(1360px,98vw)]",
    );
    // D7=B: the modal is a contents summary naming the sheets, not a fake table.
    expect(screen.getByRole("heading", { name: "Export contents" })).toBeInTheDocument();
    expect(screen.getByText("This file will contain")).toBeInTheDocument();
    expect(screen.getByText(/Bid Form .* 2 tabs/)).toBeInTheDocument();
    expect(screen.getByText("Section subtotals, Direct Cost, VAT, and Grand Total.")).toBeInTheDocument();
    expect(screen.getByText("Commercial Terms")).toBeInTheDocument();
    expect(screen.getByText("Review before sending")).toBeInTheDocument(); // F-35
    // Default audience is client → Source Breakdown is named but flagged as omitted.
    expect(screen.getByText("Source Breakdown")).toBeInTheDocument();
    expect(screen.getByText("Not in this export")).toBeInTheDocument();
    // D8=a: a multi-tab all-tabs export hides the single-tab number, which would be wrong.
    expect(screen.getByText(/All 2 tabs, total is in the downloaded Summary/i)).toBeInTheDocument();
    expect(screen.queryByText("₱ 21,700.00")).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "PARTICULARS" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /All tabs/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Main tab/i })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Preview is stale. Refresh to rebuild from current sheet rows.")).toBeInTheDocument();

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
      <ProposalExportPreviewDialog
        open
        model={model}
        onDownload={vi.fn()}
        status={{ freshness: "current", download: { kind: "preparing" } }}
        onRefresh={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const downloadingButton = screen.getByRole("button", { name: /Preparing/i });
    expect(downloadingButton).toBeDisabled();

    rerender(
      <ProposalExportPreviewDialog
        open
        model={model}
        onDownload={vi.fn()}
        status={{
          freshness: "current",
          download: { kind: "ready" },
          downloadError: "Estimate is too large to export as XLSX right now.",
        }}
        onRefresh={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Estimate is too large to export as XLSX right now.");
    expect(screen.getByRole("button", { name: "Download editable XLSX" })).toBeEnabled();
  });

  it("surfaces export validation notes in the contents summary (P1-T2, F-20)", () => {
    const issueNodes: EstimateTreeNode[] = [
      {
        id: "group-with-rows",
        name: "Group With Rows",
        kind: "group",
        total: "₱0.00",
        estimateRowItems: [row({ id: "skipped-on-group" })],
        children: [
          { id: "area", name: "Area", kind: "area", total: "₱0.00", estimateRowItems: [row({ id: "kept", quantity: 5 })] },
        ],
      },
    ];
    const model = buildProposalExportModel({ metadata, nodes: issueNodes, generatedAt: "2026-05-23T00:00:00.000Z" });

    render(<ProposalExportPreviewDialog open model={model} onDownload={vi.fn()} onRefresh={vi.fn()} onClose={vi.fn()} />);

    const issues = screen.getByTestId("proposal-validation-issues");
    expect(within(issues).getByText(/do not yet separate material and labor/i)).toBeInTheDocument();
    expect(within(issues).queryByText(/Rows on group node/i)).not.toBeInTheDocument();
  });

  it("is keyboard accessible: initial focus, Esc-to-close, and overlay-click-to-close (P1-T3, F-06)", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const model = buildProposalExportModel({ metadata, nodes, generatedAt: "2026-05-23T00:00:00.000Z" });

    render(<ProposalExportPreviewDialog open model={model} onDownload={vi.fn()} onRefresh={vi.fn()} onClose={onClose} />);

    const dialog = screen.getByRole("dialog", { name: "Excel export preview" });
    await waitFor(() => expect(dialog).toHaveFocus());

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByTestId("proposal-preview-overlay"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("returns focus to the opener when the preview closes (P1-T3, F-06)", async () => {
    const user = userEvent.setup();

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <EstimateSheetContent
          selectedNodeId="main-house"
          nodes={nodes}
          proposalExportMetadata={metadata}
          renderSidebar={false}
        />
        <EstimateHeaderActions />
      </QueryClientProvider>,
    );

    const opener = screen.getByRole("button", { name: "Preview Excel Export" });
    opener.focus();
    await user.click(opener);

    expect(screen.getByRole("dialog", { name: "Excel export preview" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close preview" }));
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("wires the estimate sheet toolbar to a refreshable read-only proposal preview", async () => {
    const user = userEvent.setup();

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <EstimateSheetContent
          selectedNodeId="main-house"
          nodes={nodes}
          proposalExportMetadata={metadata}
          renderSidebar={false}
        />
        <EstimateHeaderActions />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Preview Excel Export" }));

    expect(screen.getByRole("dialog", { name: "Excel export preview" })).toBeInTheDocument();
    expect(screen.getByText("Preview current")).toBeInTheDocument();
    expect(screen.getByText("This file will contain")).toBeInTheDocument();
    expect(screen.getByText("Bid Form")).toBeInTheDocument();
    expect(screen.getByText("Commercial Terms")).toBeInTheDocument();
    // Single tab → the (VAT/contingency-inclusive) grand total number is shown; it matches
    // the file's Summary Grand Total: 21,700 Direct + 2,170 contingency + 2,864.40 VAT.
    expect(screen.getByText("₱ 26,734.40")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download editable XLSX" })).toBeInTheDocument();
  });

  it("computes proposal signatures lazily and rebuilds preview from current row values", async () => {
    const user = userEvent.setup();
    let signatureComputes = 0;
    setEstimateProposalPreviewSignatureProbe(() => {
      signatureComputes += 1;
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <EstimateSheetContent
          selectedNodeId="main-house"
          nodes={nodes}
          proposalExportMetadata={metadata}
          renderSidebar={false}
        />
        <EstimateHeaderActions />
      </QueryClientProvider>,
    );

    const quantityInput = within(container).getAllByLabelText("Porcelain Tile quantity")[0] as HTMLInputElement;

    await user.click(quantityInput);
    await user.keyboard("{Backspace}{Backspace}13");
    expect(quantityInput.value).toBe("13");
    expect(signatureComputes).toBe(0);

    await user.click(screen.getByRole("button", { name: "Preview Excel Export" }));
    expect(signatureComputes).toBeGreaterThan(0);
    await waitFor(() => expect(screen.getByText("₱ 27,904.80")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Close preview" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Excel export preview" })).not.toBeInTheDocument());

    signatureComputes = 0;
    const previewQuantityInput = within(container).getAllByLabelText("Porcelain Tile quantity")[0] as HTMLInputElement;
    await user.clear(previewQuantityInput);
    await user.type(previewQuantityInput, "14");
    expect(previewQuantityInput.value).toBe("14");
    expect(signatureComputes).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Preview Excel Export" }));
    await waitFor(() => expect(screen.getByText("₱ 29,075.20")).toBeInTheDocument());
    expect(screen.getByText("Preview current")).toBeInTheDocument();
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
        <EstimateHeaderActions />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Preview Excel Export" }));

    expect(screen.getByRole("button", { name: /All tabs/i })).toHaveAttribute("aria-pressed", "true");
    // D8=a: the all-tabs default hides the active-tab number and points to the Summary sheet.
    expect(screen.getByText(/All 2 tabs, total is in the downloaded Summary/i)).toBeInTheDocument();

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

  it("plumbs export settings into the download URL (P2-T2/T3)", async () => {
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
        <EstimateHeaderActions />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Preview Excel Export" }));
    await user.click(screen.getByText("Export settings")); // open the settings panel

    // fireEvent.change sets the field and fires onChange once, synchronously — deterministic
    // for a controlled input (avoids userEvent's per-keystroke append/flush race with the draft
    // state). Real-browser clear-then-type is verified by the clampRate unit tests below.
    const vatInput = screen.getByRole("textbox", { name: "VAT rate percent" });
    fireEvent.change(vatInput, { target: { value: "8" } });
    await user.click(screen.getByRole("checkbox", { name: /Include internal Source Breakdown/i }));

    // RV-3: the contents summary must reflect the requested internal breakdown — once the box
    // is checked the file WILL contain Source Breakdown, so it flips from "Not in this export"
    // to "Internal only" instead of always misreporting it as omitted.
    const sourceBreakdownItem = screen.getByText("Source Breakdown").closest("li") as HTMLElement;
    expect(within(sourceBreakdownItem).getByText("Internal only")).toBeInTheDocument();
    expect(within(sourceBreakdownItem).queryByText("Not in this export")).not.toBeInTheDocument();

    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(
        new Response("xlsx", {
          status: 200,
          headers: {
            "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "content-disposition": 'attachment; filename="x.xlsx"',
          },
        }),
      ),
    );
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => "blob:mock") as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn() as typeof URL.revokeObjectURL;

    try {
      await user.click(screen.getByRole("button", { name: "Download editable XLSX" }));
      await waitFor(() => {
        const url = String(fetchMock.mock.calls.at(-1)?.[0] ?? "");
        expect(url).toContain("vatRate=8");
        expect(url).toContain("audience=internal");
      });
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
        <EstimateHeaderActions />
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

describe("clampRate (RV-4)", () => {
  it("keeps the prior rate when the field is cleared instead of coercing to 0%", () => {
    // Number("") === 0 is finite, so a cleared field used to silently commit 0% and make the
    // fallback unreachable. Empty/whitespace input must fall back to the current rate.
    expect(clampRate("", 12)).toBe(12);
    expect(clampRate("   ", 10)).toBe(10);
  });

  it("falls back on non-numeric input and clamps numeric input into 0–100", () => {
    expect(clampRate("abc", 12)).toBe(12);
    expect(clampRate("8", 12)).toBe(8);
    expect(clampRate("12.5", 10)).toBe(12.5);
    expect(clampRate("150", 12)).toBe(100);
    expect(clampRate("-5", 12)).toBe(0);
  });
});
