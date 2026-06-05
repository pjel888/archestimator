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
    const sheetDialog = await screen.findByRole("dialog", { name: "Activity History" });
    const scopeSearch = within(sheetDialog).getByRole("searchbox", { name: "Search Tree" });
    expect(scopeSearch).toBeInTheDocument();
    expect(within(sheetDialog).getByRole("button", { name: "Filter tree" })).toBeInTheDocument();
    expect(within(sheetDialog).getByRole("button", { name: "Group tree" })).toBeInTheDocument();
    expect(within(sheetDialog).getByRole("button", { name: "Expand all tree" })).toBeInTheDocument();
    expect(within(sheetDialog).getByRole("button", { name: "Collapse all tree" })).toBeInTheDocument();
    expect(within(sheetDialog).getByRole("button", { name: "Add Group" })).toBeDisabled();
    expect(within(sheetDialog).getByRole("button", { name: "Add Node" })).toBeDisabled();
    expect(within(sheetDialog).getByRole("tab", { name: "Sheets" })).toHaveAttribute("aria-selected", "true");
    const scopeTree = within(sheetDialog).getByRole("tree", { name: "Activity scope tree" });
    expect(scopeTree).toBeInTheDocument();
    expect(scopeTree.querySelectorAll("[data-workshop-tree-row]").length).toBeGreaterThan(0);
    expect(within(scopeTree).queryByText(/₱/)).not.toBeInTheDocument();
    expect(within(sheetDialog).getByRole("treeitem", { name: /Lewis Residence Estimate/i })).toHaveAttribute("aria-selected", "true");
    expect(within(sheetDialog).getByRole("treeitem", { name: /Main House/i })).toBeInTheDocument();
    expect(within(sheetDialog).getByRole("treeitem", { name: /Living Area/i })).toBeInTheDocument();
    expect(within(sheetDialog).getByRole("treeitem", { name: /Hardwood Oak Flooring/i })).toBeInTheDocument();
    expect(within(sheetDialog).queryByText("Whole estimate sheet")).not.toBeInTheDocument();
    const selectedScopeHeader = within(sheetDialog).getByRole("region", { name: "Selected activity scope" });
    expect(within(selectedScopeHeader).getByText("ES-001")).toBeInTheDocument();
    expect(within(selectedScopeHeader).getByText("Lewis Residence Estimate")).toBeInTheDocument();
    expect(within(selectedScopeHeader).queryByText("Scope total")).not.toBeInTheDocument();
    expect(within(selectedScopeHeader).queryByText(/₱/)).not.toBeInTheDocument();
    expect(within(sheetDialog).queryByText(/^\d+ events?$/)).not.toBeInTheDocument();
    expect(within(sheetDialog).queryByRole("button", { name: "Reset activity filters" })).not.toBeInTheDocument();
    expect(within(sheetDialog).queryByRole("tab", { name: "Versions" })).not.toBeInTheDocument();
    expect(within(sheetDialog).queryByText("Create version")).not.toBeInTheDocument();
    expect(within(sheetDialog).queryByRole("button", { name: "Compare" })).not.toBeInTheDocument();
    expect(within(sheetDialog).queryByRole("button", { name: /Restore/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Node Activity" })).not.toBeInTheDocument();

    await user.click(within(sheetDialog).getByRole("button", { name: "Collapse all tree" }));
    expect(within(sheetDialog).queryByRole("treeitem", { name: /Hardwood Oak Flooring/i })).not.toBeInTheDocument();

    await user.click(within(sheetDialog).getByRole("button", { name: "Expand all tree" }));
    expect(within(sheetDialog).getByRole("treeitem", { name: /Hardwood Oak Flooring/i })).toBeInTheDocument();

    await user.type(scopeSearch, "Hardwood");
    expect(within(sheetDialog).getByRole("treeitem", { name: /Hardwood Oak Flooring/i })).toBeInTheDocument();
    expect(within(sheetDialog).queryByRole("treeitem", { name: /SANDSBERG Dining Table/i })).not.toBeInTheDocument();
  });

  it("structures row component changes with explicit before-and-after snapshot evidence", async () => {
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
            brand: "Oakline",
            unit: "sqm",
            unitCost: 1200,
            sourceSnapshot: { brand: "Oakline", category: "Finishes", imageUrl: "/component-thumbnails/living-hardwood-oak-flooring.jpg", supplier: "Elegant Floors Inc." },
          },
          newSnapshot: {
            material: "HEMLINGBY Loveseat",
            description: "IKEA Philippines loveseat, Knisa dark gray.",
            supplier: "IKEA Philippines",
            brand: "IKEA",
            unit: "pc",
            unitCost: 7999,
            sourceSnapshot: { brand: "IKEA", category: "Furniture", imageUrl: "/component-thumbnails/lib-sofa.jpg", supplier: "IKEA Philippines" },
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

    await user.click(screen.getByRole("button", { name: "Open row activity for Hardwood Oak Flooring" }));
    const rowDialog = await screen.findByRole("dialog", { name: "Row item details" });

    await waitFor(() => {
      expect(within(rowDialog).getByLabelText("After component snapshot for HEMLINGBY Loveseat")).toBeInTheDocument();
    });

    const replacementCard = within(rowDialog).getByLabelText(/^Row replaced audit event/);
    const scalarCard = within(rowDialog).getByLabelText(/^Row updated audit event/);
    const beforeSnapshot = within(replacementCard).getByLabelText("Before component snapshot for Hardwood Oak Flooring");
    const afterSnapshot = within(replacementCard).getByLabelText("After component snapshot for HEMLINGBY Loveseat");
    expect(within(rowDialog).getByText("May 24, 10:30 AM")).toBeInTheDocument();
    expect(within(rowDialog).getByText("May 24, 10:45 AM")).toBeInTheDocument();
    expect(within(replacementCard).getAllByText("System replaced Hardwood Oak Flooring with HEMLINGBY Loveseat.").length).toBeGreaterThan(0);
    expect(within(replacementCard).queryByText("Row replaced")).not.toBeInTheDocument();
    expect(within(replacementCard).getByText("material, supplier, unit cost, source snapshot")).toBeInTheDocument();
    expect(within(replacementCard).getByText("Audit facts")).toBeInTheDocument();
    expect(within(replacementCard).getByText("Component snapshot evidence")).toBeInTheDocument();
    expect(replacementCard.querySelectorAll("[data-row-history-component-card]")).toHaveLength(2);
    expect(within(replacementCard).getByText("Material")).toBeInTheDocument();
    expect(within(replacementCard).getByText(/\+₱\s?12,500\.00/)).toBeInTheDocument();
    expect(within(beforeSnapshot).getByText("Before component")).toBeInTheDocument();
    expect(within(beforeSnapshot).getByText("Hardwood Oak Flooring")).toBeInTheDocument();
    expect(within(beforeSnapshot).getByText("Elegant Floors Inc.")).toBeInTheDocument();
    expect(within(beforeSnapshot).getByText("Finishes")).toBeInTheDocument();
    expect(within(afterSnapshot).getByText("After component")).toBeInTheDocument();
    expect(within(afterSnapshot).getByText("HEMLINGBY Loveseat")).toBeInTheDocument();
    expect(within(afterSnapshot).getByText("IKEA Philippines")).toBeInTheDocument();
    expect(within(afterSnapshot).getByText("IKEA Philippines loveseat, Knisa dark gray.")).toBeInTheDocument();
    expect(within(afterSnapshot).getByText("Furniture")).toBeInTheDocument();
    expect(within(afterSnapshot).getByText("pc")).toBeInTheDocument();
    expect(within(scalarCard).getAllByText("System changed quantity, adjustment percentage, misc cost for Hardwood Oak Flooring.").length).toBeGreaterThan(0);
    expect(within(scalarCard).queryByText("Row updated")).not.toBeInTheDocument();
    expect(within(scalarCard).getByText("Affected fields: quantity, adjustment percentage, misc cost")).toBeInTheDocument();
    expect(within(scalarCard).getByText("Audit facts")).toBeInTheDocument();
    expect(within(scalarCard).getByText("Quantity")).toBeInTheDocument();
    expect(within(scalarCard).getAllByText("Previous").length).toBeGreaterThan(0);
    expect(within(scalarCard).getAllByText("Current").length).toBeGreaterThan(0);
    expect(within(scalarCard).getByText("48 sqm")).toBeInTheDocument();
    expect(within(scalarCard).getByText("50 sqm")).toBeInTheDocument();
    expect(within(scalarCard).getByText("Adjustment percentage")).toBeInTheDocument();
    expect(within(scalarCard).getByText("Contingency 0% (₱ 0.00)")).toBeInTheDocument();
    expect(within(scalarCard).getByText("Contingency 10% (₱ 6,000.00)")).toBeInTheDocument();
    expect(within(scalarCard).getByText("Misc cost")).toBeInTheDocument();
    expect(within(scalarCard).getByText(/₱\s?1,200\.00/)).toBeInTheDocument();
    expect(scalarCard.querySelector("[data-audit-component-snapshots]")).not.toBeInTheDocument();
  });

  it("keeps component snapshot layout stable when the stored source has no image", async () => {
    const user = userEvent.setup();
    actionMocks.fetchEstimateSheetVersionControl.mockResolvedValue({
      events: [],
      rowEvents: [
        {
          id: "row-event-no-image",
          eventType: "row_added",
          eventSource: "server_action",
          createdAt: "2026-05-24T03:15:00.000Z",
          actorUserId: null,
          targetRowId: "living-hardwood-oak-flooring",
          estimateNodeId: "living-area",
          rowContext: { material: "Manual Stone Countertop" },
          oldSnapshot: null,
          newSnapshot: {
            material: "Manual Stone Countertop",
            description: "Owner-supplied countertop allowance.",
            supplier: "Local fabricator",
            unit: "lm",
            quantity: 3,
            unitCost: 4500,
            lineTotal: 13500,
            sourceLibraryItemId: "11111111-1111-4111-8111-111111111111",
            sourceSnapshot: { category: "Finishes" },
          },
          changedFields: ["row"],
          totalDelta: 13500,
          payload: {},
          correlationId: "row-history-no-image",
        },
      ],
      nextCursor: null,
      rowNextCursor: null,
      nodeEvents: [],
      nodeNextCursor: null,
    });

    renderEstimateSheet();

    await user.click(screen.getByRole("button", { name: "Open row activity for Hardwood Oak Flooring" }));
    const rowDialog = await screen.findByRole("dialog", { name: "Row item details" });

    const snapshot = await within(rowDialog).findByLabelText("Component added snapshot for Manual Stone Countertop");
    expect(within(snapshot).getByText("No image in snapshot")).toBeInTheDocument();
    expect(within(snapshot).getByText("Manual Stone Countertop")).toBeInTheDocument();
    expect(within(snapshot).getByText("Local fabricator")).toBeInTheDocument();
    expect(within(snapshot).getByText("3 lm")).toBeInTheDocument();
    expect(within(snapshot).getByText("₱ 4,500.00")).toBeInTheDocument();
    expect(within(snapshot).getByText("₱ 13,500.00")).toBeInTheDocument();
  });

  it("does not render unsafe legacy source snapshot image URLs in row history", async () => {
    const user = userEvent.setup();
    actionMocks.fetchEstimateSheetVersionControl.mockResolvedValue({
      events: [],
      rowEvents: [
        {
          id: "row-event-unsafe-image",
          eventType: "row_added",
          eventSource: "server_action",
          createdAt: "2026-05-24T03:15:00.000Z",
          actorUserId: null,
          targetRowId: "living-hardwood-oak-flooring",
          estimateNodeId: "living-area",
          rowContext: { material: "Tracked Component" },
          oldSnapshot: null,
          newSnapshot: {
            material: "Tracked Component",
            description: "Legacy imported row.",
            supplier: "Unknown supplier",
            unit: "pc",
            quantity: 1,
            unitCost: 4500,
            lineTotal: 4500,
            sourceLibraryItemId: "11111111-1111-4111-8111-111111111111",
            sourceSnapshot: { category: "Finishes", imageUrl: "https://tracker.example/pixel.svg?viewer=client" },
          },
          changedFields: ["row"],
          totalDelta: 4500,
          payload: {},
          correlationId: "row-history-unsafe-image",
        },
        {
          id: "row-event-data-image",
          eventType: "row_added",
          eventSource: "server_action",
          createdAt: "2026-05-24T03:16:00.000Z",
          actorUserId: null,
          targetRowId: "living-hardwood-oak-flooring",
          estimateNodeId: "living-area",
          rowContext: { material: "Data URL Component" },
          oldSnapshot: null,
          newSnapshot: {
            material: "Data URL Component",
            description: "Legacy imported row.",
            supplier: "Unknown supplier",
            unit: "pc",
            quantity: 1,
            unitCost: 5000,
            lineTotal: 5000,
            sourceLibraryItemId: "11111111-1111-4111-8111-111111111111",
            sourceSnapshot: { category: "Finishes", imageUrl: "data:image/svg+xml,<svg></svg>" },
          },
          changedFields: ["row"],
          totalDelta: 5000,
          payload: {},
          correlationId: "row-history-data-image",
        },
      ],
      nextCursor: null,
      rowNextCursor: null,
      nodeEvents: [],
      nodeNextCursor: null,
    });

    renderEstimateSheet();

    await user.click(screen.getByRole("button", { name: "Open row activity for Hardwood Oak Flooring" }));
    const rowDialog = await screen.findByRole("dialog", { name: "Row item details" });

    const trackerSnapshot = await within(rowDialog).findByLabelText("Component added snapshot for Tracked Component");
    const dataSnapshot = await within(rowDialog).findByLabelText("Component added snapshot for Data URL Component");
    expect(within(trackerSnapshot).getByText("No image in snapshot")).toBeInTheDocument();
    expect(within(dataSnapshot).getByText("No image in snapshot")).toBeInTheDocument();
    expect(rowDialog.innerHTML).not.toContain("tracker.example");
    expect(rowDialog.innerHTML).not.toContain("data:image");
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
          actorLabel: "Philip Lewis",
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
    const sheetDialog = await screen.findByRole("dialog", { name: "Activity History" });
    const sheetActivityCard = within(sheetDialog).getByLabelText(/^Sheet code updated audit event/);

    expect(within(sheetActivityCard).getAllByText("Philip Lewis changed sheet code from ES-001 to ES-002.").length).toBeGreaterThan(0);
    const activityFeed = within(sheetDialog).getByRole("feed", { name: "Activity history events" });
    expect(activityFeed).toBeInTheDocument();
    const dayRegion = within(sheetDialog).getByRole("region", { name: "May 24, 2026 activity" });
    expect(dayRegion).toBeInTheDocument();
    expect(within(dayRegion).getByText("May 24, 2026").parentElement).not.toHaveClass("sticky");
    expect(within(sheetActivityCard).getByText("Audit facts")).toBeInTheDocument();
    expect(within(sheetActivityCard).getByText("Philip Lewis")).toBeInTheDocument();
    expect(within(sheetActivityCard).queryByText(/^User /)).not.toBeInTheDocument();
    expect(within(sheetActivityCard).queryByText("Server action")).not.toBeInTheDocument();
    expect(within(sheetActivityCard).getByText("Sheet code")).toBeInTheDocument();
    expect(within(sheetActivityCard).getByText("Previous")).toBeInTheDocument();
    expect(within(sheetActivityCard).getByText("Current")).toBeInTheDocument();
    expect(within(sheetActivityCard).getByText("ES-001")).toBeInTheDocument();
    expect(within(sheetActivityCard).getByText("ES-002")).toBeInTheDocument();
    expect(within(sheetActivityCard).getByText("no total change")).toBeInTheDocument();
  });

  it("renders library sync changes without link-state jargon", async () => {
    const user = userEvent.setup();
    actionMocks.fetchEstimateSheetVersionControl.mockResolvedValue({
      events: [
        {
          id: "sheet-event-library-status",
          eventType: "row_updated",
          eventSource: "server_action",
          createdAt: "2026-05-25T11:27:00.000Z",
          actorUserId: "4e23801d-6fc2-4886-b980-d15ca2b164b8",
          actorLabel: "Philip Lewis",
          targetRowId: "side-and-coffee-tables",
          estimateNodeId: "family-lounge",
          rowContext: { material: "Side and coffee tables" },
          oldSnapshot: {
            changed: {
              material: "Side and coffee tables",
              linkState: "linked-clean",
              quantity: 1,
              unit: "set",
            },
          },
          newSnapshot: {
            changed: {
              material: "Side and coffee tables",
              linkState: "linked-overridden",
              quantity: 18,
              unit: "set",
            },
          },
          changedFields: ["linkState", "quantity"],
          totalDelta: 166600,
          payload: {},
          correlationId: "sheet-history-library-status",
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
    const sheetDialog = await screen.findByRole("dialog", { name: "Activity History" });
    const auditCard = within(sheetDialog).getByLabelText(/^Row updated audit event/);

    expect(within(auditCard).getAllByText("Philip Lewis changed library status, quantity for Side and coffee tables.").length).toBeGreaterThan(0);
    expect(within(auditCard).getByText("Affected fields: library status, quantity")).toBeInTheDocument();
    expect(within(auditCard).getByText("Library status")).toBeInTheDocument();
    expect(within(auditCard).getByText("Using library values")).toBeInTheDocument();
    expect(within(auditCard).getByText("Customized from library")).toBeInTheDocument();
    expect(within(auditCard).queryByText("Link state")).not.toBeInTheDocument();
    expect(within(auditCard).queryByText("Linked Clean")).not.toBeInTheDocument();
    expect(within(auditCard).queryByText("Linked Overridden")).not.toBeInTheDocument();
  });

  it("renders blank placeholder row activity as audit text instead of component drop targets", async () => {
    const user = userEvent.setup();
    actionMocks.fetchEstimateSheetVersionControl.mockResolvedValue({
      events: [
        {
          id: "blank-row-added",
          eventType: "row_blank_added",
          eventSource: "server_action",
          createdAt: "2026-05-24T11:47:00.000Z",
          actorUserId: "4e23801d-0000-4000-8000-000000000000",
          targetRowId: "blank-row-1",
          estimateNodeId: "living-area",
          rowContext: { material: "Drag or add a component here" },
          oldSnapshot: null,
          newSnapshot: {
            material: "Drag or add a component here",
            description: "",
            supplier: "",
            unit: "unit",
            unitCost: 0,
            lineTotal: 0,
            sourceLibraryItemId: null,
            sourceSnapshot: {},
          },
          changedFields: ["row"],
          totalDelta: 0,
          payload: {},
          correlationId: "blank-row-added",
        },
        {
          id: "blank-row-deleted",
          eventType: "row_deleted",
          eventSource: "server_action",
          createdAt: "2026-05-24T11:48:00.000Z",
          actorUserId: "4e23801d-0000-4000-8000-000000000000",
          targetRowId: "blank-row-1",
          estimateNodeId: "living-area",
          rowContext: { material: "Drag or add a component here" },
          oldSnapshot: {
            material: "Drag or add a component here",
            description: "",
            supplier: "",
            unit: "unit",
            unitCost: 0,
            lineTotal: 0,
            sourceLibraryItemId: null,
            sourceSnapshot: {},
          },
          newSnapshot: null,
          changedFields: ["row"],
          totalDelta: 0,
          payload: {},
          correlationId: "blank-row-deleted",
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
    const sheetDialog = await screen.findByRole("dialog", { name: "Activity History" });

    expect(within(sheetDialog).getAllByText(/added an empty row slot/i).length).toBeGreaterThan(0);
    expect(within(sheetDialog).getAllByText(/removed Empty row slot from the estimate/i).length).toBeGreaterThan(0);
    expect(within(sheetDialog).getAllByText("Unknown user").length).toBeGreaterThan(0);
    expect(within(sheetDialog).queryByText(/User 4E23801D/i)).not.toBeInTheDocument();
    expect(within(sheetDialog).queryByText("Drag or add a component here")).not.toBeInTheDocument();
    expect(sheetDialog.querySelector("[data-row-history-component-card]")).not.toBeInTheDocument();
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
    const sheetDialog = await screen.findByRole("dialog", { name: "Activity History" });
    expect(within(sheetDialog).getByLabelText(/^Sheet code updated audit event/)).toBeInTheDocument();

    await user.click(within(sheetDialog).getByRole("button", { name: "Load more activity" }));

    await waitFor(() => {
      expect(within(sheetDialog).getByLabelText(/^Sheet metadata updated audit event/)).toBeInTheDocument();
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

  it("loads more row activity with the row cursor", async () => {
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

    await user.click(screen.getByRole("button", { name: "Open row activity for Hardwood Oak Flooring" }));
    const rowDialog = await screen.findByRole("dialog", { name: "Row item details" });
    expect(within(rowDialog).getByText("Affected fields: quantity")).toBeInTheDocument();

    await user.click(within(rowDialog).getByRole("button", { name: "Load more row activity" }));

    await waitFor(() => {
      expect(within(rowDialog).getByText("Affected fields: misc cost")).toBeInTheDocument();
    });
    expect(actionMocks.fetchEstimateSheetVersionControl).toHaveBeenLastCalledWith(expect.objectContaining({
      projectId: "project-1",
      estimateId: "estimate-1",
      rowId: "living-hardwood-oak-flooring",
      eventLimit: 50,
      rowCursor: cursor,
      scope: "row",
    }));
  });

  it("keeps pending row load-more state coherent across activity scope changes", async () => {
    const user = userEvent.setup();
    const cursor = {
      createdAt: "2026-05-24T02:45:00.000Z",
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    };
    const pendingRowLoadMore = deferred<Awaited<ReturnType<typeof actionMocks.fetchEstimateSheetVersionControl>>>();
    actionMocks.fetchEstimateSheetVersionControl
      .mockResolvedValueOnce({
        events: [],
        rowEvents: [],
        nodeEvents: [],
        nextCursor: null,
        rowNextCursor: null,
        nodeNextCursor: null,
      })
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
      .mockReturnValueOnce(pendingRowLoadMore.promise)
      .mockResolvedValueOnce({
        events: [],
        rowEvents: [],
        nodeEvents: [],
        nextCursor: null,
        rowNextCursor: null,
        nodeNextCursor: null,
      });

    renderEstimateSheet();

    await user.click(screen.getByRole("button", { name: "Activity" }));
    const rowDialog = await screen.findByRole("dialog", { name: "Activity History" });
    await user.click(within(rowDialog).getByRole("treeitem", { name: /Hardwood Oak Flooring/i }));
    expect(within(rowDialog).getByText("Affected fields: quantity")).toBeInTheDocument();

    await user.click(within(rowDialog).getByRole("button", { name: "Load more row activity" }));
    await user.click(within(rowDialog).getByRole("treeitem", { name: /Lewis Residence Estimate/i }));
    await waitFor(() => {
      expect(within(rowDialog).getByText("No sheet activity yet")).toBeInTheDocument();
    });
    expect(within(rowDialog).queryByRole("button", { name: "Loading..." })).not.toBeInTheDocument();
    expect(actionMocks.fetchEstimateSheetVersionControl).toHaveBeenCalledTimes(4);

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
    await Promise.resolve();
    await Promise.resolve();

    expect(within(rowDialog).queryByText("misc cost")).not.toBeInTheDocument();
    expect(within(rowDialog).queryByRole("button", { name: "Loading..." })).not.toBeInTheDocument();
    expect(actionMocks.fetchEstimateSheetVersionControl).toHaveBeenCalledTimes(4);
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
    const sheetDialog = await screen.findByRole("dialog", { name: "Activity History" });

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
    const rowDialog = await screen.findByRole("dialog", { name: "Activity History" });
    await user.click(within(rowDialog).getByRole("treeitem", { name: /Hardwood Oak Flooring/i }));
    await waitFor(() => {
      expect(actionMocks.fetchEstimateSheetVersionControl).toHaveBeenLastCalledWith(expect.objectContaining({ scope: "row" }));
    });
    staleInitialFetch.reject(new Error("stale initial sheet load failed"));

    await waitFor(() => {
      expect(within(rowDialog).getByText("Affected fields: quantity")).toBeInTheDocument();
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
    const sheetDialog = await screen.findByRole("dialog", { name: "Activity History" });
    await user.click(within(sheetDialog).getByRole("button", { name: "Load more activity" }));
    await user.click(within(sheetDialog).getByRole("treeitem", { name: /Hardwood Oak Flooring/i }));

    const rowDialog = await screen.findByRole("dialog", { name: "Activity History" });
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
      expect(within(rowDialog).getByText("Affected fields: quantity")).toBeInTheDocument();
    });
    expect(within(rowDialog).queryByLabelText(/^Sheet metadata updated audit event/)).not.toBeInTheDocument();
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

    await user.click(screen.getByRole("button", { name: "Activity" }));
    const nodeDialog = await screen.findByRole("dialog", { name: "Activity History" });
    await user.click(within(nodeDialog).getByRole("treeitem", { name: /Living Area/i }));
    const nodeActivityCard = within(nodeDialog).getByLabelText(/^Node renamed audit event/);

    expect(within(nodeActivityCard).getAllByText("Philip Lewis renamed Living to Living Area.").length).toBeGreaterThan(0);
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

  it("selects group nodes from the activity tree with descendant scope", async () => {
    const user = userEvent.setup();
    actionMocks.fetchEstimateSheetVersionControl.mockResolvedValue({
      events: [],
      rowEvents: [],
      nodeEvents: [
        {
          id: "group-event-1",
          eventType: "template_inserted",
          eventSource: "server_action",
          createdAt: "2026-05-24T04:30:00.000Z",
          actorUserId: null,
          targetRowId: null,
          estimateNodeId: "living-area",
          rowContext: {},
          oldSnapshot: null,
          newSnapshot: { name: "Living package" },
          changedFields: ["template"],
          totalDelta: 25000,
          payload: {},
          correlationId: "group-history-1",
        },
      ],
      nextCursor: null,
      rowNextCursor: null,
      nodeNextCursor: null,
    });

    renderEstimateSheet();

    await user.click(screen.getByRole("button", { name: "Activity" }));
    const activityDialog = await screen.findByRole("dialog", { name: "Activity History" });
    await user.click(within(activityDialog).getByRole("treeitem", { name: /Main House/i }));

    expect(within(activityDialog).getByLabelText(/^Template inserted audit event/)).toBeInTheDocument();
    expect(actionMocks.fetchEstimateSheetVersionControl).toHaveBeenLastCalledWith(expect.objectContaining({
      projectId: "project-1",
      estimateId: "estimate-1",
      nodeId: "main-house",
      includeDescendants: true,
      scope: "node",
    }));
  });


  it("renders composer copy for every estimate activity event type without raw technical labels", async () => {
    const user = userEvent.setup();
    const eventTypes = [
      "row_updated",
      "row_added",
      "row_blank_added",
      "row_deleted",
      "row_replaced",
      "template_inserted",
      "sheet_code_updated",
      "sheet_metadata_updated",
      "sheet_version_created",
      "sheet_restored_as_copy",
      "node_created",
      "node_renamed",
      "node_deleted_with_children",
      "tree_reordered",
    ];
    actionMocks.fetchEstimateSheetVersionControl.mockResolvedValue({
      events: eventTypes.map((eventType, index) => ({
        id: `composer-event-${eventType}`,
        eventType,
        eventSource: "server_action",
        createdAt: `2026-05-24T03:${String(index).padStart(2, "0")}:00.000Z`,
        actorUserId: "user-1",
        actorLabel: "Philip Lewis",
        targetRowId: eventType.startsWith("row_") || eventType === "template_inserted" ? `row-${index}` : null,
        estimateNodeId: eventType.startsWith("node_") || eventType === "tree_reordered" ? "living-area" : null,
        rowContext: { material: "Hardwood Oak Flooring", nodePath: "Main House / Living Area" },
        oldSnapshot: { material: "Old Tile", quantity: 1, unitCost: 1000, sheetCode: "ES-001", name: "Old Living Area" },
        newSnapshot: { material: "Hardwood Oak Flooring", quantity: 2, unitCost: 1500, sheetCode: "ES-002", name: "Living Area" },
        changedFields: ["quantity", "unitCost"],
        totalDelta: 5000,
        payload: { templateName: "Living Package", name: "Living Area", oldName: "Old Living Area", newName: "Living Area", updatedCount: 3 },
        correlationId: `composer-${index}`,
      })),
      rowEvents: [],
      nodeEvents: [],
      nextCursor: null,
      rowNextCursor: null,
      nodeNextCursor: null,
    });

    renderEstimateSheet();

    await user.click(screen.getByRole("button", { name: "Activity" }));
    const sheetDialog = await screen.findByRole("dialog", { name: "Activity History" });
    expect(within(sheetDialog).getAllByText("Philip Lewis changed quantity, unit cost for Hardwood Oak Flooring.").length).toBeGreaterThan(0);
    expect(within(sheetDialog).getAllByText("Philip Lewis added Hardwood Oak Flooring to the estimate.").length).toBeGreaterThan(0);
    expect(within(sheetDialog).getAllByText("Philip Lewis reorganized the estimate tree.").length).toBeGreaterThan(0);
    expect(within(sheetDialog).queryByText("Row updated")).not.toBeInTheDocument();
    expect(within(sheetDialog).queryByText("Template inserted")).not.toBeInTheDocument();
    const renderedText = sheetDialog.textContent ?? "";
    for (const eventType of eventTypes) {
      expect(renderedText).not.toContain(eventType);
    }
  });

  it("offers real row-added filter values instead of the removed legacy inserted-row event", async () => {
    const user = userEvent.setup();
    renderEstimateSheet();

    await user.click(screen.getByRole("button", { name: "Activity" }));
    const sheetDialog = await screen.findByRole("dialog", { name: "Activity History" });
    await user.click(within(sheetDialog).getByRole("button", { name: "Filter activity" }));
    const eventTypeSelect = within(sheetDialog).getByLabelText("Filter activity by event type") as HTMLSelectElement;

    expect(within(eventTypeSelect).queryByRole("option", { name: "Inserted rows" })).not.toBeInTheDocument();
    expect(within(eventTypeSelect).queryByRole("option", { name: "Added rows" })).toHaveValue("row_added");
    expect(within(eventTypeSelect).queryByRole("option", { name: "Added blank rows" })).toHaveValue("row_blank_added");

    await user.selectOptions(eventTypeSelect, "row_blank_added");

    await waitFor(() => {
      expect(actionMocks.fetchEstimateSheetVersionControl).toHaveBeenLastCalledWith(expect.objectContaining({
        eventTypes: ["row_blank_added"],
        scope: "sheet",
      }));
    });
  });

  it("passes sheet activity filters into the history read action", async () => {
    const user = userEvent.setup();
    renderEstimateSheet();

    await user.click(screen.getByRole("button", { name: "Activity" }));
    const sheetDialog = await screen.findByRole("dialog", { name: "Activity History" });
    expect(within(sheetDialog).getByLabelText("Search activity")).toBeInTheDocument();
    expect(within(sheetDialog).queryByLabelText("Filter activity by event type")).not.toBeInTheDocument();
    await user.click(within(sheetDialog).getByRole("button", { name: "Filter activity" }));
    expect(within(sheetDialog).getByRole("group", { name: "Activity filter options" })).toBeInTheDocument();
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
    const sheetDialog = await screen.findByRole("dialog", { name: "Activity History" });
    await user.click(within(sheetDialog).getByRole("button", { name: "Filter activity" }));
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
          eventType: "row_added",
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
    const sheetDialog = await screen.findByRole("dialog", { name: "Activity History" });

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
    const sheetDialog = await screen.findByRole("dialog", { name: "Activity History" });
    await user.click(within(sheetDialog).getByRole("button", { name: "Load more activity" }));

    await user.click(within(sheetDialog).getByRole("treeitem", { name: /Hardwood Oak Flooring/i }));
    await waitFor(() => {
      expect(actionMocks.fetchEstimateSheetVersionControl).toHaveBeenLastCalledWith(expect.objectContaining({ scope: "row" }));
    });
    staleLoadMore.reject(new Error("stale sheet load failed"));

    const rowDialog = await screen.findByRole("dialog", { name: "Activity History" });

    await waitFor(() => {
      expect(within(rowDialog).getByText("Affected fields: quantity")).toBeInTheDocument();
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
    const sheetDialog = await screen.findByRole("dialog", { name: "Activity History" });
    await user.click(within(sheetDialog).getByRole("button", { name: "Load more activity" }));
    await user.click(within(sheetDialog).getByRole("button", { name: "Close Activity History" }));
    await user.click(screen.getByRole("button", { name: "Activity" }));

    const reopenedDialog = await screen.findByRole("dialog", { name: "Activity History" });
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
