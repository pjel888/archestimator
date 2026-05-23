import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectEstimatesTable, type ProjectEstimateTableRow } from "@/components/workshop/ProjectEstimatesTable";

const routerMock = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

const actionMocks = vi.hoisted(() => ({
  duplicateEstimateSheet: vi.fn(),
  regenerateEstimateSheetCode: vi.fn(),
  updateEstimateDetails: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@/lib/estimates/actions", () => actionMocks);

const originalLocalStorage = window.localStorage;

function makeEstimate(overrides: Partial<ProjectEstimateTableRow> = {}): ProjectEstimateTableRow {
  return {
    created_at: "2026-05-19T10:00:00.000Z",
    created_by: null,
    currency_code: "PHP",
    firstNodeId: "node-1",
    id: "estimate-1",
    metadata: {},
    name: "Original Estimate",
    nodeCount: 1,
    project_id: "project-1",
    rowItemCount: 1,
    sheet_code: "EST-001",
    totalProjectCost: 1250,
    updated_at: "2026-05-19T10:00:00.000Z",
    ...overrides,
  };
}

function renderTable(estimate = makeEstimate()) {
  render(<ProjectEstimatesTable estimates={[estimate]} projectBudget={5000} projectId="project-1" />);
}

describe("project estimates table inline editing", () => {
  beforeEach(() => {
    actionMocks.duplicateEstimateSheet.mockReset();
    actionMocks.regenerateEstimateSheetCode.mockReset();
    actionMocks.updateEstimateDetails.mockReset();
    routerMock.refresh.mockReset();
    window.localStorage.clear();
  });

  afterEach(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: originalLocalStorage,
    });
    vi.restoreAllMocks();
  });

  it("saves an inline estimate name edit once when Enter blurs the field", async () => {
    const updatedEstimate = makeEstimate({ name: "Updated Estimate" });
    actionMocks.updateEstimateDetails.mockResolvedValue(updatedEstimate);
    const user = userEvent.setup();

    renderTable();

    const nameInput = screen.getByLabelText("Estimate sheet name for Original Estimate");
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Estimate{Enter}");

    await waitFor(() => expect(actionMocks.updateEstimateDetails).toHaveBeenCalledTimes(1));
    expect(actionMocks.updateEstimateDetails).toHaveBeenCalledWith({
      projectId: "project-1",
      estimateId: "estimate-1",
      name: "Updated Estimate",
    });
    expect(routerMock.refresh).toHaveBeenCalledTimes(1);
  });

  it("cancels an inline estimate name edit with Escape without saving on blur", async () => {
    const user = userEvent.setup();

    renderTable();

    const nameInput = screen.getByLabelText("Estimate sheet name for Original Estimate");
    await user.clear(nameInput);
    await user.type(nameInput, "Should Not Save{Escape}");

    await waitFor(() => expect(nameInput).toHaveValue("Original Estimate"));
    expect(actionMocks.updateEstimateDetails).not.toHaveBeenCalled();
    expect(routerMock.refresh).not.toHaveBeenCalled();
  });

  it("does not crash when persisted column width storage is blocked", () => {
    const throwingLocalStorage: Storage = {
      get length() {
        return 0;
      },
      clear: vi.fn(),
      getItem: vi.fn(() => {
        throw new DOMException("Storage is blocked", "SecurityError");
      }),
      key: vi.fn(() => null),
      removeItem: vi.fn(() => {
        throw new DOMException("Storage is blocked", "SecurityError");
      }),
      setItem: vi.fn(() => {
        throw new DOMException("Storage is blocked", "SecurityError");
      }),
    };
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: throwingLocalStorage,
    });

    expect(() => renderTable()).not.toThrow();
    expect(screen.getByLabelText("Estimate sheet name for Original Estimate")).toBeInTheDocument();
  });

  it("duplicates an estimate sheet from the row actions once and refreshes the table", async () => {
    let resolveDuplicate: ((value: { estimateId: string; firstNodeId: string | null; sheetCode: string }) => void) | undefined;
    actionMocks.duplicateEstimateSheet.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDuplicate = resolve;
        }),
    );
    const user = userEvent.setup();

    renderTable();

    const duplicateButton = screen.getByRole("button", { name: "Duplicate Original Estimate" });
    await user.dblClick(duplicateButton);

    expect(actionMocks.duplicateEstimateSheet).toHaveBeenCalledTimes(1);
    expect(actionMocks.duplicateEstimateSheet).toHaveBeenCalledWith({
      projectId: "project-1",
      estimateId: "estimate-1",
    });
    await waitFor(() => expect(duplicateButton).toBeDisabled());

    resolveDuplicate?.({ estimateId: "estimate-2", firstNodeId: "node-2", sheetCode: "ES-002" });
    await waitFor(() => expect(routerMock.refresh).toHaveBeenCalledTimes(1));
  });
});
