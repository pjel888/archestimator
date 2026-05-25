import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const actionMocks = vi.hoisted(() => ({
  deleteEstimateRowItem: vi.fn(),
  fetchEstimateTree: vi.fn(),
  fetchEstimateSheetVersionControl: vi.fn(),
  insertEstimateRowItemFromLibrary: vi.fn(),
  insertEstimateTemplateIntoEstimate: vi.fn(),
  replaceEstimateRowItemWithLibrary: vi.fn(),
  updateEstimateRowItem: vi.fn(),
}));

vi.mock("@/lib/estimates/actions", () => actionMocks);
vi.mock("@/lib/auth/session", () => ({
  getCurrentUserContext: vi.fn(async () => null),
}));

import { EstimateSheetContent } from "@/components/workshop/EstimateSheetContent";
import { resetEstimateWorkspaceState } from "@/hooks/use-estimate-workspace-state";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function renderEstimateSheet() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <EstimateSheetContent
        selectedNodeId="living-area"
        projectId="project-1"
        estimateId="estimate-1"
        renderSidebar={false}
        proposalExportMetadata={{
          projectId: "project-1",
          estimateId: "estimate-1",
          projectName: "Lewis Residence",
          estimateName: "Lewis Residence Estimate",
          estimateSheetCode: "ES-001",
          versionLabel: "V2",
          currency: "PHP",
        }}
      />
    </QueryClientProvider>,
  );
}

describe("estimate sheet version control UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetEstimateWorkspaceState();
    actionMocks.fetchEstimateSheetVersionControl.mockResolvedValue({
      events: [],
      rowEvents: [],
      nodeEvents: [],
      nextCursor: null,
      rowNextCursor: null,
      nodeNextCursor: null,
    });
  });

  it("opens sheet activity without exposing named sheet versions", async () => {
    const user = userEvent.setup();
    renderEstimateSheet();

    await user.click(screen.getByRole("button", { name: "Activity" }));
    const sheetDialog = await screen.findByRole("dialog", { name: "Sheet activity" });
    expect(within(sheetDialog).getByRole("tab", { name: "Activity" })).toHaveAttribute("aria-selected", "true");
    expect(within(sheetDialog).queryByRole("tab", { name: "Versions" })).not.toBeInTheDocument();
    expect(within(sheetDialog).queryByText("Create version")).not.toBeInTheDocument();
    expect(within(sheetDialog).queryByRole("button", { name: "Compare" })).not.toBeInTheDocument();
    expect(within(sheetDialog).queryByRole("button", { name: /Restore/i })).not.toBeInTheDocument();
  });

  it("shows row component changes as row-style component snapshots", async () => {
    const user = userEvent.setup();
    actionMocks.fetchEstimateSheetVersionControl.mockResolvedValue({
      events: [],
      rowEvents: [
        {
          id: "row-event-1",
          eventType: "row_replaced",
          eventSource: "client",
          createdAt: "2026-05-24T02:30:00.000Z",
          actorUserId: null,
          targetRowId: "living-hardwood-oak-flooring",
          estimateNodeId: "living-area",
          rowContext: { material: "Hardwood Oak Flooring" },
          oldSnapshot: {
            material: "Hardwood Oak Flooring",
            description: "Solid hardwood flooring supply and installation.",
            supplier: "Elegant Floors Inc.",
            unit: "sqm",
            unitCost: 1200,
            sourceSnapshot: { category: "Finishes", imageUrl: "/component-thumbnails/living-hardwood-oak-flooring.jpg" },
          },
          newSnapshot: {
            material: "HEMLINGBY Loveseat",
            description: "IKEA Philippines loveseat, Knisa dark gray.",
            supplier: "IKEA Philippines",
            unit: "pc",
            unitCost: 7999,
            sourceSnapshot: { category: "Furniture", imageUrl: "/component-thumbnails/lib-sofa.jpg" },
          },
          changedFields: ["material", "supplier", "unitCost", "sourceSnapshot"],
          totalDelta: 12500,
          payload: {},
          correlationId: "row-history-1",
        },
        {
          id: "row-event-2",
          eventType: "row_updated",
          eventSource: "client",
          createdAt: "2026-05-24T02:45:00.000Z",
          actorUserId: null,
          targetRowId: "living-hardwood-oak-flooring",
          estimateNodeId: "living-area",
          rowContext: { material: "Hardwood Oak Flooring" },
          oldSnapshot: {
            changed: {
              material: "Hardwood Oak Flooring",
              description: "Solid hardwood flooring supply and installation.",
              supplier: "Elegant Floors Inc.",
              unit: "sqm",
              quantity: 48,
              contingencyPercentage: 0,
              contingencyValue: 0,
              miscCost: 0,
              unitCost: 1200,
            },
          },
          newSnapshot: {
            changed: {
              material: "Hardwood Oak Flooring",
              description: "Solid hardwood flooring supply and installation.",
              supplier: "Elegant Floors Inc.",
              unit: "sqm",
              quantity: 50,
              contingencyPercentage: 10,
              contingencyValue: 6000,
              miscCost: 1200,
              unitCost: 1200,
            },
          },
          changedFields: ["quantity", "contingencyPercentage", "miscCost"],
          totalDelta: 7200,
          payload: {},
          correlationId: "row-history-2",
        },
      ],
      nextCursor: null,
      rowNextCursor: null,
    });

    renderEstimateSheet();

    await user.click(screen.getByRole("button", { name: "Open row menu for Hardwood Oak Flooring" }));
    const rowDialog = await screen.findByRole("dialog", { name: "Row details" });

    await waitFor(() => {
      expect(within(rowDialog).getByLabelText("HEMLINGBY Loveseat history component snapshot")).toBeInTheDocument();
    });

    const componentSnapshot = within(rowDialog).getByLabelText("HEMLINGBY Loveseat history component snapshot");
    const replacementCard = within(rowDialog).getByLabelText("Row replaced audit event");
    const scalarCard = within(rowDialog).getByLabelText("Row updated audit event");
    expect(within(rowDialog).getByText("May 24, 10:30 AM")).toBeInTheDocument();
    expect(within(rowDialog).getByText("May 24, 10:45 AM")).toBeInTheDocument();
    expect(within(replacementCard).getByText("Row replaced")).toBeInTheDocument();
    expect(within(replacementCard).getByText("Hardwood Oak Flooring -> HEMLINGBY Loveseat")).toBeInTheDocument();
    expect(within(replacementCard).getByText("Material")).toBeInTheDocument();
    expect(within(replacementCard).getByText(/\+₱\s?12,500\.00/)).toBeInTheDocument();
    expect(within(componentSnapshot).getByText("HEMLINGBY Loveseat")).toBeInTheDocument();
    expect(within(componentSnapshot).getByText("IKEA Philippines")).toBeInTheDocument();
    expect(within(componentSnapshot).getByText("IKEA Philippines loveseat, Knisa dark gray.")).toBeInTheDocument();
    expect(within(componentSnapshot).getByText("/ pc")).toBeInTheDocument();
    expect(within(scalarCard).getByText("Row updated")).toBeInTheDocument();
    expect(within(scalarCard).getByText("quantity, contingency percentage, misc cost")).toBeInTheDocument();
    expect(within(scalarCard).getByText("Quantity")).toBeInTheDocument();
    expect(within(scalarCard).getByText("48 sqm")).toBeInTheDocument();
    expect(within(scalarCard).getByText("50 sqm")).toBeInTheDocument();
    expect(within(scalarCard).getByText("Contingency")).toBeInTheDocument();
    expect(within(scalarCard).getByText("0% (₱ 0.00)")).toBeInTheDocument();
    expect(within(scalarCard).getByText("10% (₱ 6,000.00)")).toBeInTheDocument();
    expect(within(scalarCard).getByText("Misc cost")).toBeInTheDocument();
    expect(within(scalarCard).getByText("₱ 1,200.00")).toBeInTheDocument();
    expect(within(rowDialog).queryByLabelText("Hardwood Oak Flooring history component snapshot")).not.toBeInTheDocument();
  });

  it("shows sheet activity audit cards with old-to-new details by default", async () => {
    const user = userEvent.setup();
    actionMocks.fetchEstimateSheetVersionControl.mockResolvedValue({
      events: [
        {
          id: "sheet-event-1",
          eventType: "sheet_code_updated",
          eventSource: "server_action",
          createdAt: "2026-05-24T03:00:00.000Z",
          actorUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          targetRowId: null,
          estimateNodeId: null,
          rowContext: {},
          oldSnapshot: { sheetCode: "ES-001", name: "Lewis Residence Estimate" },
          newSnapshot: { sheetCode: "ES-002", name: "Lewis Residence Estimate" },
          changedFields: ["sheetCode"],
          totalDelta: null,
          payload: {},
          correlationId: "sheet-history-1",
        },
      ],
      rowEvents: [],
      nextCursor: null,
      rowNextCursor: null,
    });

    renderEstimateSheet();

    await user.click(screen.getByRole("button", { name: "Activity" }));
    const sheetDialog = await screen.findByRole("dialog", { name: "Sheet activity" });
    const sheetActivityCard = within(sheetDialog).getByLabelText("Sheet code updated audit event");

    expect(within(sheetDialog).getByRole("tab", { name: "Activity" })).toHaveAttribute("aria-selected", "true");
    expect(within(sheetActivityCard).getByText("Sheet code updated")).toBeInTheDocument();
    expect(within(sheetActivityCard).getByText("User aaaaaaaa")).toBeInTheDocument();
    expect(within(sheetActivityCard).getByText("Sheet code")).toBeInTheDocument();
    expect(within(sheetActivityCard).getByText("ES-001")).toBeInTheDocument();
    expect(within(sheetActivityCard).getByText("ES-002")).toBeInTheDocument();
    expect(within(sheetActivityCard).getByText("no total change")).toBeInTheDocument();
  });

  it("loads more sheet activity with the returned cursor", async () => {
    const user = userEvent.setup();
    const cursor = {
      createdAt: "2026-05-24T03:00:00.000Z",
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    };
    actionMocks.fetchEstimateSheetVersionControl
      .mockResolvedValueOnce({
        events: [
          {
            id: "sheet-event-1",
            eventType: "sheet_code_updated",
            eventSource: "server_action",
            createdAt: "2026-05-24T03:00:00.000Z",
            actorUserId: null,
            targetRowId: null,
            estimateNodeId: null,
            rowContext: {},
            oldSnapshot: { sheetCode: "ES-001" },
            newSnapshot: { sheetCode: "ES-002" },
            changedFields: ["sheetCode"],
            totalDelta: null,
            payload: {},
            correlationId: "sheet-history-1",
          },
        ],
        rowEvents: [],
        nextCursor: cursor,
        rowNextCursor: null,
      })
      .mockResolvedValueOnce({
        events: [
          {
            id: "sheet-event-2",
            eventType: "sheet_metadata_updated",
            eventSource: "server_action",
            createdAt: "2026-05-24T02:00:00.000Z",
            actorUserId: null,
            targetRowId: null,
            estimateNodeId: null,
            rowContext: {},
            oldSnapshot: { name: "Draft estimate" },
            newSnapshot: { name: "Client estimate" },
            changedFields: ["name"],
            totalDelta: null,
            payload: {},
            correlationId: "sheet-history-2",
          },
        ],
        rowEvents: [],
        nextCursor: null,
        rowNextCursor: null,
      });

    renderEstimateSheet();

    await user.click(screen.getByRole("button", { name: "Activity" }));
    const sheetDialog = await screen.findByRole("dialog", { name: "Sheet activity" });
    expect(within(sheetDialog).getByLabelText("Sheet code updated audit event")).toBeInTheDocument();

    await user.click(within(sheetDialog).getByRole("button", { name: "Load more activity" }));

    await waitFor(() => {
      expect(within(sheetDialog).getByLabelText("Sheet metadata updated audit event")).toBeInTheDocument();
    });
    expect(actionMocks.fetchEstimateSheetVersionControl).toHaveBeenLastCalledWith(expect.objectContaining({
      projectId: "project-1",
      estimateId: "estimate-1",
      eventLimit: 50,
      sheetCursor: cursor,
      rowCursor: undefined,
      scope: "sheet",
    }));
  });

  it("loads more row Version History with the row cursor", async () => {
    const user = userEvent.setup();
    const cursor = {
      createdAt: "2026-05-24T02:45:00.000Z",
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    };
    actionMocks.fetchEstimateSheetVersionControl
      .mockResolvedValueOnce({
        events: [],
        rowEvents: [
          {
            id: "row-event-1",
            eventType: "row_updated",
            eventSource: "client",
            createdAt: "2026-05-24T02:45:00.000Z",
            actorUserId: null,
            targetRowId: "living-hardwood-oak-flooring",
            estimateNodeId: "living-area",
            rowContext: { material: "Hardwood Oak Flooring" },
            oldSnapshot: { changed: { material: "Hardwood Oak Flooring", quantity: 48, unit: "sqm" } },
            newSnapshot: { changed: { material: "Hardwood Oak Flooring", quantity: 50, unit: "sqm" } },
            changedFields: ["quantity"],
            totalDelta: 2400,
            payload: {},
            correlationId: "row-history-1",
          },
        ],
        nextCursor: null,
        rowNextCursor: cursor,
      })
      .mockResolvedValueOnce({
        events: [],
        rowEvents: [
          {
            id: "row-event-2",
            eventType: "row_updated",
            eventSource: "client",
            createdAt: "2026-05-24T02:30:00.000Z",
            actorUserId: null,
            targetRowId: "living-hardwood-oak-flooring",
            estimateNodeId: "living-area",
            rowContext: { material: "Hardwood Oak Flooring" },
            oldSnapshot: { changed: { material: "Hardwood Oak Flooring", miscCost: 0 } },
            newSnapshot: { changed: { material: "Hardwood Oak Flooring", miscCost: 1200 } },
            changedFields: ["miscCost"],
            totalDelta: 1200,
            payload: {},
            correlationId: "row-history-2",
          },
        ],
        nextCursor: null,
        rowNextCursor: null,
      });

    renderEstimateSheet();

    await user.click(screen.getByRole("button", { name: "Open row menu for Hardwood Oak Flooring" }));
    const rowDialog = await screen.findByRole("dialog", { name: "Row details" });
    expect(within(rowDialog).getByText("quantity")).toBeInTheDocument();

    await user.click(within(rowDialog).getByRole("button", { name: "Load more row history" }));

    await waitFor(() => {
      expect(within(rowDialog).getByText("misc cost")).toBeInTheDocument();
    });
    expect(actionMocks.fetchEstimateSheetVersionControl).toHaveBeenLastCalledWith(expect.objectContaining({
      projectId: "project-1",
      estimateId: "estimate-1",
      rowId: "living-hardwood-oak-flooring",
      eventLimit: 50,
      sheetCursor: undefined,
      rowCursor: cursor,
      scope: "row",
    }));
  });

  it("keeps pending row load-more state coherent across row tab changes", async () => {
    const user = userEvent.setup();
    const cursor = {
      createdAt: "2026-05-24T02:45:00.000Z",
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    };
    const pendingRowLoadMore = deferred<Awaited<ReturnType<typeof actionMocks.fetchEstimateSheetVersionControl>>>();
    actionMocks.fetchEstimateSheetVersionControl
      .mockResolvedValueOnce({
        events: [],
        rowEvents: [
          {
            id: "row-event-1",
            eventType: "row_updated",
            eventSource: "client",
            createdAt: "2026-05-24T02:45:00.000Z",
            actorUserId: null,
            targetRowId: "living-hardwood-oak-flooring",
            estimateNodeId: "living-area",
            rowContext: { material: "Hardwood Oak Flooring" },
            oldSnapshot: { changed: { material: "Hardwood Oak Flooring", quantity: 48, unit: "sqm" } },
            newSnapshot: { changed: { material: "Hardwood Oak Flooring", quantity: 50, unit: "sqm" } },
            changedFields: ["quantity"],
            totalDelta: 2400,
            payload: {},
            correlationId: "row-history-1",
          },
        ],
        nextCursor: null,
        rowNextCursor: cursor,
      })
      .mockReturnValueOnce(pendingRowLoadMore.promise);

    renderEstimateSheet();

    await user.click(screen.getByRole("button", { name: "Open row menu for Hardwood Oak Flooring" }));
    const rowDialog = await screen.findByRole("dialog", { name: "Row details" });
    expect(within(rowDialog).getByText("quantity")).toBeInTheDocument();

    await user.click(within(rowDialog).getByRole("button", { name: "Load more row history" }));
    await user.click(within(rowDialog).getByRole("tab", { name: "Summary" }));
    await user.click(within(rowDialog).getByRole("tab", { name: "Source" }));
    expect(actionMocks.fetchEstimateSheetVersionControl).toHaveBeenCalledTimes(2);

    pendingRowLoadMore.resolve({
      events: [],
      rowEvents: [
        {
          id: "row-event-2",
          eventType: "row_updated",
          eventSource: "client",
          createdAt: "2026-05-24T02:30:00.000Z",
          actorUserId: null,
          targetRowId: "living-hardwood-oak-flooring",
          estimateNodeId: "living-area",
          rowContext: { material: "Hardwood Oak Flooring" },
          oldSnapshot: { changed: { material: "Hardwood Oak Flooring", miscCost: 0 } },
          newSnapshot: { changed: { material: "Hardwood Oak Flooring", miscCost: 1200 } },
          changedFields: ["miscCost"],
          totalDelta: 1200,
          payload: {},
          correlationId: "row-history-2",
        },
      ],
      nextCursor: null,
      rowNextCursor: null,
    });
    await user.click(within(rowDialog).getByRole("tab", { name: "Version History" }));

    await waitFor(() => {
      expect(within(rowDialog).getByText("misc cost")).toBeInTheDocument();
    });
    expect(within(rowDialog).queryByRole("button", { name: "Loading..." })).not.toBeInTheDocument();
    expect(actionMocks.fetchEstimateSheetVersionControl).toHaveBeenCalledTimes(2);
  });

  it("does not render dormant named-version event records in Activity", async () => {
    const user = userEvent.setup();
    actionMocks.fetchEstimateSheetVersionControl.mockResolvedValue({
      events: [],
      rowEvents: [],
      nodeEvents: [],
      nextCursor: null,
      rowNextCursor: null,
      nodeNextCursor: null,
    });

    renderEstimateSheet();

    await user.click(screen.getByRole("button", { name: "Activity" }));
    const sheetDialog = await screen.findByRole("dialog", { name: "Sheet activity" });

    await waitFor(() => {
      expect(actionMocks.fetchEstimateSheetVersionControl).toHaveBeenCalledWith(expect.objectContaining({ scope: "sheet" }));
    });
    expect(within(sheetDialog).queryByText("Version created")).not.toBeInTheDocument();
    expect(within(sheetDialog).queryByText("Restored as copy")).not.toBeInTheDocument();
  });

  it("ignores stale initial history failures after switching inspector scope", async () => {
    const user = userEvent.setup();
    const staleInitialFetch = deferred<Awaited<ReturnType<typeof actionMocks.fetchEstimateSheetVersionControl>>>();
    actionMocks.fetchEstimateSheetVersionControl
      .mockReturnValueOnce(staleInitialFetch.promise)
      .mockResolvedValueOnce({
        events: [],
        rowEvents: [
          {
            id: "row-event-1",
            eventType: "row_updated",
            eventSource: "client",
            createdAt: "2026-05-24T02:45:00.000Z",
            actorUserId: null,
            targetRowId: "living-hardwood-oak-flooring",
            estimateNodeId: "living-area",
            rowContext: { material: "Hardwood Oak Flooring" },
            oldSnapshot: { changed: { material: "Hardwood Oak Flooring", quantity: 48, unit: "sqm" } },
            newSnapshot: { changed: { material: "Hardwood Oak Flooring", quantity: 50, unit: "sqm" } },
            changedFields: ["quantity"],
            totalDelta: 2400,
            payload: {},
            correlationId: "row-history-1",
          },
        ],
        nextCursor: null,
        rowNextCursor: null,
      });

    renderEstimateSheet();

    await user.click(screen.getByRole("button", { name: "Activity" }));
    await screen.findByRole("dialog", { name: "Sheet activity" });

    const rejectDuringScopeSwitch = (event: Event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target?.closest('button[aria-label="Open row menu for Hardwood Oak Flooring"]')) return;
      staleInitialFetch.reject(new Error("stale initial sheet load failed"));
    };
    document.addEventListener("click", rejectDuringScopeSwitch);
    try {
      await user.click(screen.getByRole("button", { name: "Open row menu for Hardwood Oak Flooring" }));
    } finally {
      document.removeEventListener("click", rejectDuringScopeSwitch);
    }

    const rowDialog = await screen.findByRole("dialog", { name: "Row details" });

    await waitFor(() => {
      expect(within(rowDialog).getByText("quantity")).toBeInTheDocument();
    });
    expect(within(rowDialog).queryByText("stale initial sheet load failed")).not.toBeInTheDocument();
  });

  it("ignores stale load-more responses after switching inspector scope", async () => {
    const user = userEvent.setup();
    const cursor = {
      createdAt: "2026-05-24T03:00:00.000Z",
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    };
    const staleLoadMore = deferred<Awaited<ReturnType<typeof actionMocks.fetchEstimateSheetVersionControl>>>();
    actionMocks.fetchEstimateSheetVersionControl
      .mockResolvedValueOnce({
        events: [
          {
            id: "sheet-event-1",
            eventType: "sheet_code_updated",
            eventSource: "server_action",
            createdAt: "2026-05-24T03:00:00.000Z",
            actorUserId: null,
            targetRowId: null,
            estimateNodeId: null,
            rowContext: {},
            oldSnapshot: { sheetCode: "ES-001" },
            newSnapshot: { sheetCode: "ES-002" },
            changedFields: ["sheetCode"],
            totalDelta: null,
            payload: {},
            correlationId: "sheet-history-1",
          },
        ],
        rowEvents: [],
        nextCursor: cursor,
        rowNextCursor: null,
      })
      .mockReturnValueOnce(staleLoadMore.promise)
      .mockResolvedValueOnce({
        events: [],
        rowEvents: [
          {
            id: "row-event-1",
            eventType: "row_updated",
            eventSource: "client",
            createdAt: "2026-05-24T02:45:00.000Z",
            actorUserId: null,
            targetRowId: "living-hardwood-oak-flooring",
            estimateNodeId: "living-area",
            rowContext: { material: "Hardwood Oak Flooring" },
            oldSnapshot: { changed: { material: "Hardwood Oak Flooring", quantity: 48, unit: "sqm" } },
            newSnapshot: { changed: { material: "Hardwood Oak Flooring", quantity: 50, unit: "sqm" } },
            changedFields: ["quantity"],
            totalDelta: 2400,
            payload: {},
            correlationId: "row-history-1",
          },
        ],
        nextCursor: null,
        rowNextCursor: null,
      });

    renderEstimateSheet();

    await user.click(screen.getByRole("button", { name: "Activity" }));
    const sheetDialog = await screen.findByRole("dialog", { name: "Sheet activity" });
    await user.click(within(sheetDialog).getByRole("button", { name: "Load more activity" }));
    await user.click(screen.getByRole("button", { name: "Open row menu for Hardwood Oak Flooring" }));

    const rowDialog = await screen.findByRole("dialog", { name: "Row details" });
    staleLoadMore.resolve({
      events: [
        {
          id: "stale-sheet-event",
          eventType: "sheet_metadata_updated",
          eventSource: "server_action",
          createdAt: "2026-05-24T02:00:00.000Z",
          actorUserId: null,
          targetRowId: null,
          estimateNodeId: null,
          rowContext: {},
          oldSnapshot: { name: "Draft estimate" },
          newSnapshot: { name: "Client estimate" },
          changedFields: ["name"],
          totalDelta: null,
          payload: {},
          correlationId: "stale-sheet-history",
        },
      ],
      rowEvents: [],
      nodeEvents: [],
      nextCursor: null,
      rowNextCursor: null,
      nodeNextCursor: null,
    });

    await waitFor(() => {
      expect(within(rowDialog).getByText("quantity")).toBeInTheDocument();
    });
    expect(within(rowDialog).queryByLabelText("Sheet metadata updated audit event")).not.toBeInTheDocument();
  });

  it("opens node activity for the selected node without named-version controls", async () => {
    const user = userEvent.setup();
    actionMocks.fetchEstimateSheetVersionControl.mockResolvedValue({
      events: [],
      rowEvents: [],
      nodeEvents: [
        {
          id: "node-event-1",
          eventType: "node_renamed",
          eventSource: "server_action",
          createdAt: "2026-05-24T03:30:00.000Z",
          actorUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          actorLabel: "Philip Lewis",
          targetRowId: null,
          estimateNodeId: "living-area",
          rowContext: {},
          oldSnapshot: { name: "Living" },
          newSnapshot: { name: "Living Area" },
          changedFields: ["name"],
          totalDelta: null,
          payload: {},
          correlationId: "node-history-1",
        },
      ],
      nextCursor: null,
      rowNextCursor: null,
      nodeNextCursor: null,
    });

    renderEstimateSheet();

    await user.click(screen.getByRole("button", { name: "Node Activity" }));
    const nodeDialog = await screen.findByRole("dialog", { name: "Node activity" });
    const nodeActivityCard = within(nodeDialog).getByLabelText("Node renamed audit event");

    expect(within(nodeActivityCard).getByText("Node renamed")).toBeInTheDocument();
    expect(within(nodeActivityCard).getByText("Philip Lewis")).toBeInTheDocument();
    expect(within(nodeDialog).queryByRole("tab", { name: "Versions" })).not.toBeInTheDocument();
    expect(actionMocks.fetchEstimateSheetVersionControl).toHaveBeenLastCalledWith(expect.objectContaining({
      projectId: "project-1",
      estimateId: "estimate-1",
      nodeId: "living-area",
      includeDescendants: false,
      scope: "node",
    }));
  });

  it("passes sheet activity filters into the history read action", async () => {
    const user = userEvent.setup();
    renderEstimateSheet();

    await user.click(screen.getByRole("button", { name: "Activity" }));
    const sheetDialog = await screen.findByRole("dialog", { name: "Sheet activity" });
    await user.selectOptions(within(sheetDialog).getByLabelText("Filter activity by event type"), "row_updated");
    await user.type(within(sheetDialog).getByLabelText("Search activity"), "hardwood");

    await waitFor(() => {
      expect(actionMocks.fetchEstimateSheetVersionControl).toHaveBeenLastCalledWith(expect.objectContaining({
        eventTypes: ["row_updated"],
        search: "hardwood",
        scope: "sheet",
      }));
    });
  });

  it("uses browser-local day bounds for activity date filters", async () => {
    const user = userEvent.setup();
    renderEstimateSheet();

    await user.click(screen.getByRole("button", { name: "Activity" }));
    const sheetDialog = await screen.findByRole("dialog", { name: "Sheet activity" });
    fireEvent.change(within(sheetDialog).getByLabelText("Filter activity from date"), {
      target: { value: "2026-05-25" },
    });
    fireEvent.change(within(sheetDialog).getByLabelText("Filter activity to date"), {
      target: { value: "2026-05-25" },
    });

    await waitFor(() => {
      expect(actionMocks.fetchEstimateSheetVersionControl).toHaveBeenLastCalledWith(expect.objectContaining({
        dateFrom: new Date(2026, 4, 25, 0, 0, 0, 0).toISOString(),
        dateTo: new Date(2026, 4, 25, 23, 59, 59, 999).toISOString(),
        scope: "sheet",
      }));
    });
  });

  it("groups related activity events that share a correlation id", async () => {
    const user = userEvent.setup();
    actionMocks.fetchEstimateSheetVersionControl.mockResolvedValue({
      events: [
        {
          id: "group-event-1",
          eventType: "template_inserted",
          eventSource: "server_action",
          createdAt: "2026-05-24T03:00:00.000Z",
          actorUserId: null,
          targetRowId: null,
          estimateNodeId: "living-area",
          rowContext: {},
          oldSnapshot: null,
          newSnapshot: { name: "Living package" },
          changedFields: ["template"],
          totalDelta: 5000,
          payload: {},
          correlationId: "template-group-1",
        },
        {
          id: "group-event-2",
          eventType: "row_inserted",
          eventSource: "server_action",
          createdAt: "2026-05-24T02:59:00.000Z",
          actorUserId: null,
          targetRowId: "living-row-2",
          estimateNodeId: "living-area",
          rowContext: { material: "Lamp" },
          oldSnapshot: null,
          newSnapshot: { material: "Lamp" },
          changedFields: ["row"],
          totalDelta: 1500,
          payload: {},
          correlationId: "template-group-1",
        },
      ],
      rowEvents: [],
      nodeEvents: [],
      nextCursor: null,
      rowNextCursor: null,
      nodeNextCursor: null,
    });

    renderEstimateSheet();

    await user.click(screen.getByRole("button", { name: "Activity" }));
    const sheetDialog = await screen.findByRole("dialog", { name: "Sheet activity" });

    expect(within(sheetDialog).getByText("2 related activity events")).toBeInTheDocument();
  });

  it("ignores stale load-more failures after switching inspector scope", async () => {
    const user = userEvent.setup();
    const cursor = {
      createdAt: "2026-05-24T03:00:00.000Z",
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    };
    const staleLoadMore = deferred<Awaited<ReturnType<typeof actionMocks.fetchEstimateSheetVersionControl>>>();
    actionMocks.fetchEstimateSheetVersionControl
      .mockResolvedValueOnce({
        events: [
          {
            id: "sheet-event-1",
            eventType: "sheet_code_updated",
            eventSource: "server_action",
            createdAt: "2026-05-24T03:00:00.000Z",
            actorUserId: null,
            targetRowId: null,
            estimateNodeId: null,
            rowContext: {},
            oldSnapshot: { sheetCode: "ES-001" },
            newSnapshot: { sheetCode: "ES-002" },
            changedFields: ["sheetCode"],
            totalDelta: null,
            payload: {},
            correlationId: "sheet-history-1",
          },
        ],
        rowEvents: [],
        nextCursor: cursor,
        rowNextCursor: null,
      })
      .mockReturnValueOnce(staleLoadMore.promise)
      .mockResolvedValueOnce({
        events: [],
        rowEvents: [
          {
            id: "row-event-1",
            eventType: "row_updated",
            eventSource: "client",
            createdAt: "2026-05-24T02:45:00.000Z",
            actorUserId: null,
            targetRowId: "living-hardwood-oak-flooring",
            estimateNodeId: "living-area",
            rowContext: { material: "Hardwood Oak Flooring" },
            oldSnapshot: { changed: { material: "Hardwood Oak Flooring", quantity: 48, unit: "sqm" } },
            newSnapshot: { changed: { material: "Hardwood Oak Flooring", quantity: 50, unit: "sqm" } },
            changedFields: ["quantity"],
            totalDelta: 2400,
            payload: {},
            correlationId: "row-history-1",
          },
        ],
        nextCursor: null,
        rowNextCursor: null,
      });

    renderEstimateSheet();

    await user.click(screen.getByRole("button", { name: "Activity" }));
    const sheetDialog = await screen.findByRole("dialog", { name: "Sheet activity" });
    await user.click(within(sheetDialog).getByRole("button", { name: "Load more activity" }));

    const rejectDuringScopeSwitch = (event: Event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target?.closest('button[aria-label="Open row menu for Hardwood Oak Flooring"]')) return;
      staleLoadMore.reject(new Error("stale sheet load failed"));
    };
    document.addEventListener("click", rejectDuringScopeSwitch);
    try {
      await user.click(screen.getByRole("button", { name: "Open row menu for Hardwood Oak Flooring" }));
    } finally {
      document.removeEventListener("click", rejectDuringScopeSwitch);
    }

    const rowDialog = await screen.findByRole("dialog", { name: "Row details" });

    await waitFor(() => {
      expect(within(rowDialog).getByText("quantity")).toBeInTheDocument();
    });
    expect(within(rowDialog).queryByText("stale sheet load failed")).not.toBeInTheDocument();
  });

  it("ignores stale load-more failures after reopening the same inspector scope", async () => {
    const user = userEvent.setup();
    const cursor = {
      createdAt: "2026-05-24T03:00:00.000Z",
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    };
    const staleLoadMore = deferred<Awaited<ReturnType<typeof actionMocks.fetchEstimateSheetVersionControl>>>();
    actionMocks.fetchEstimateSheetVersionControl
      .mockResolvedValueOnce({
        events: [
          {
            id: "sheet-event-1",
            eventType: "sheet_code_updated",
            eventSource: "server_action",
            createdAt: "2026-05-24T03:00:00.000Z",
            actorUserId: null,
            targetRowId: null,
            estimateNodeId: null,
            rowContext: {},
            oldSnapshot: { sheetCode: "ES-001" },
            newSnapshot: { sheetCode: "ES-002" },
            changedFields: ["sheetCode"],
            totalDelta: null,
            payload: {},
            correlationId: "sheet-history-1",
          },
        ],
        rowEvents: [],
        nextCursor: cursor,
        rowNextCursor: null,
      })
      .mockReturnValueOnce(staleLoadMore.promise)
      .mockResolvedValueOnce({
        events: [],
        rowEvents: [],
        nextCursor: null,
        rowNextCursor: null,
      });

    renderEstimateSheet();

    await user.click(screen.getByRole("button", { name: "Activity" }));
    const sheetDialog = await screen.findByRole("dialog", { name: "Sheet activity" });
    await user.click(within(sheetDialog).getByRole("button", { name: "Load more activity" }));
    await user.click(within(sheetDialog).getByRole("button", { name: "Close Sheet activity" }));
    await user.click(screen.getByRole("button", { name: "Activity" }));

    const reopenedDialog = await screen.findByRole("dialog", { name: "Sheet activity" });
    await waitFor(() => {
      expect(within(reopenedDialog).getByText("No sheet activity yet")).toBeInTheDocument();
    });

    staleLoadMore.reject(new Error("stale sheet load failed after reopen"));
    await Promise.resolve();
    await Promise.resolve();

    expect(within(reopenedDialog).queryByText("stale sheet load failed after reopen")).not.toBeInTheDocument();
    expect(within(reopenedDialog).getByText("No sheet activity yet")).toBeInTheDocument();
  });
});
