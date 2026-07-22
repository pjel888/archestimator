import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InsertIntoEstimatePicker } from "@/components/workshop/library/templates-browse/InsertIntoEstimatePicker";
import type { EstimateTemplate } from "@/components/workshop/component-library/templates";
import type { EstimateRowItem } from "@/lib/estimates/types";

const componentLibraryActionMocks = vi.hoisted(() => ({
  listEstimateInsertTargets: vi.fn(),
  resolveEstimateTemplateInsertTarget: vi.fn(),
}));

const estimateActionMocks = vi.hoisted(() => ({
  insertEstimateTemplateIntoEstimate: vi.fn(),
}));

vi.mock("@/lib/component-library/actions", () => componentLibraryActionMocks);
vi.mock("@/lib/estimates/actions", () => estimateActionMocks);
vi.mock("@/lib/component-library/template-browse-actions", () => ({
  loadCurrentWorkspaceEstimateTemplateGraph: vi.fn(async (templateId: string) => ({
    id: templateId,
    name: "Condo Starter",
    description: "Compact condo structure.",
    category: "Residential",
    nodes: [],
  })),
}));

function makeRow(overrides: Partial<EstimateRowItem> & { id: string; material: string }): EstimateRowItem {
  const itemCost = overrides.itemCost ?? 100;
  const quantity = overrides.quantity ?? 1;
  const miscCost = overrides.miscCost ?? 0;
  const subTotal = itemCost * quantity;
  return {
    name: overrides.material,
    description: "",
    supplier: "Test Supplier",
    source: "library",
    unit: "pc",
    itemCost,
    price: itemCost,
    currency: "PHP",
    quantity,
    subTotal,
    contingencyPercentage: 0,
    contingencyValue: 0,
    miscCost,
    miscCostDefault: miscCost,
    totalItemCosts: subTotal + miscCost,
    category: "General",
    pricingSource: "Supplier quote",
    pricingDate: "2026-06-01",
    sourceLibraryItemId: `component-${overrides.id}`,
    linkState: "linked-clean",
    lifecycleState: "available",
    ...overrides,
  };
}

function makeTemplate(rowOverrides: Partial<EstimateRowItem> = {}): EstimateTemplate {
  return {
    id: "template-condo",
    name: "Condo Starter",
    description: "Compact condo structure.",
    category: "Residential",
    nodes: [
      {
        id: "node-area",
        name: "Living Room",
        kind: "area",
        total: "PHP 0.00",
        estimateRowItems: [
          makeRow({
            id: "row-panel",
            material: "Wall Panel",
            ...rowOverrides,
          }),
        ],
      },
    ],
  };
}

function mockTargets() {
  componentLibraryActionMocks.listEstimateInsertTargets.mockResolvedValue({
    projects: [
      {
        id: "project-1",
        name: "Tower A",
        estimates: [{ id: "estimate-1", name: "Main Estimate", sheetCode: "EST-01" }],
      },
    ],
  });
}

async function chooseOnlyTarget() {
  const dialog = await screen.findByRole("dialog", { name: "Insert into estimate" });
  fireEvent.click(await within(dialog).findByRole("combobox", { name: "Insert target project" }));
  fireEvent.click(within(screen.getByRole("listbox", { name: "Insert target project" })).getByRole("option", { name: "Tower A" }));
  fireEvent.click(await within(dialog).findByRole("combobox", { name: "Insert target estimate" }));
  fireEvent.click(
    within(screen.getByRole("listbox", { name: "Insert target estimate" })).getByRole("option", { name: "EST-01 · Main Estimate" }),
  );
  return dialog;
}

function renderPicker(template: EstimateTemplate = makeTemplate()) {
  return render(
    <InsertIntoEstimatePicker
      open
      onOpenChange={vi.fn()}
      template={template}
      onInserted={vi.fn()}
    />,
  );
}

describe("InsertIntoEstimatePicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTargets();
    componentLibraryActionMocks.resolveEstimateTemplateInsertTarget.mockResolvedValue({
      targetParentNodeId: "node-root-group",
      targetTabId: "tab-active",
      targetParentNodeName: "Interior Fit-Out",
      targetParentNodeKind: "group",
      targetParentNodePath: ["Interior Fit-Out"],
    });
    estimateActionMocks.insertEstimateTemplateIntoEstimate.mockResolvedValue({
      status: "inserted",
      tree: [],
      insertedRootNodeIds: ["inserted-1"],
    });
  });

  it("shows project, estimate, and resolved target before insert, then re-resolves on submit", async () => {
    renderPicker();

    const dialog = await chooseOnlyTarget();

    expect(await within(dialog).findByText("Inserting into Main Estimate — Tower A.")).toBeInTheDocument();
    expect(await within(dialog).findByText("Target group: Interior Fit-Out")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Insert template" }));

    await waitFor(() => {
      expect(componentLibraryActionMocks.resolveEstimateTemplateInsertTarget).toHaveBeenCalledTimes(2);
    });
    expect(componentLibraryActionMocks.resolveEstimateTemplateInsertTarget).toHaveBeenLastCalledWith({
      projectId: "project-1",
      estimateId: "estimate-1",
    });
    await waitFor(() => {
      expect(estimateActionMocks.insertEstimateTemplateIntoEstimate).toHaveBeenCalledWith(expect.objectContaining({
        projectId: "project-1",
        estimateId: "estimate-1",
        targetParentNodeId: "node-root-group",
        targetTabId: "tab-active",
        templateId: "template-condo",
        unavailableSourcePolicy: "cancel",
        mode: "linked",
        intentId: expect.any(String),
      }));
    });
  });

  it("offers an independent copy without losing the resolved target when no active tab exists", async () => {
    estimateActionMocks.insertEstimateTemplateIntoEstimate
      .mockResolvedValueOnce({
        status: "requires_active_tab",
        code: "template_link_requires_active_tab",
        estimateId: "estimate-1",
        targetParentNodeId: "node-root-group",
      })
      .mockResolvedValueOnce({ status: "inserted", mode: "copy", tree: [], insertedRootNodeIds: ["inserted-1"] });
    renderPicker();

    const dialog = await chooseOnlyTarget();
    await within(dialog).findByText("Target group: Interior Fit-Out");
    fireEvent.click(within(dialog).getByRole("button", { name: "Insert template" }));

    await waitFor(() => expect(estimateActionMocks.insertEstimateTemplateIntoEstimate).toHaveBeenCalledTimes(1));

    const confirmation = await screen.findByRole("dialog", { name: "Insert an independent copy?" });
    fireEvent.click(within(confirmation).getByRole("button", { name: "Insert copy instead" }));

    await waitFor(() => expect(estimateActionMocks.insertEstimateTemplateIntoEstimate).toHaveBeenCalledTimes(2));
    const linkedInput = estimateActionMocks.insertEstimateTemplateIntoEstimate.mock.calls[0]?.[0];
    const copyInput = estimateActionMocks.insertEstimateTemplateIntoEstimate.mock.calls[1]?.[0];
    expect(linkedInput).toEqual(expect.objectContaining({
      mode: "linked",
      targetParentNodeId: "node-root-group",
    }));
    expect(copyInput).toEqual(expect.objectContaining({
      mode: "copy",
      targetParentNodeId: "node-root-group",
    }));
    expect(copyInput.intentId).not.toBe(linkedInput.intentId);
  });

  it("uses the explicit copy mode without attempting a linked insertion", async () => {
    renderPicker();

    const dialog = await chooseOnlyTarget();
    fireEvent.click(within(dialog).getByRole("radio", { name: /Insert copy/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Insert template" }));

    await waitFor(() => {
      expect(estimateActionMocks.insertEstimateTemplateIntoEstimate).toHaveBeenCalledTimes(1);
    });
    expect(estimateActionMocks.insertEstimateTemplateIntoEstimate).toHaveBeenCalledWith(expect.objectContaining({
      mode: "copy",
      targetParentNodeId: "node-root-group",
    }));
  });

  it("disables linked mode for an empty Template while keeping copy available", async () => {
    renderPicker({ ...makeTemplate(), nodes: [] });

    const dialog = await chooseOnlyTarget();
    await waitFor(() => {
      expect(within(dialog).getByRole("radio", { name: /Insert linked/ })).toBeDisabled();
      expect(within(dialog).getByText(/This Template is empty/)).toBeInTheDocument();
    });
    fireEvent.click(within(dialog).getByRole("radio", { name: /Insert copy/ }));
    expect(within(dialog).getByRole("button", { name: "Insert template" })).not.toBeDisabled();
  });

  it("inserts saved values as unlinked rows only after explicit confirmation", async () => {
    estimateActionMocks.insertEstimateTemplateIntoEstimate
      .mockResolvedValueOnce({
        status: "requires_saved_snapshot_confirmation",
        unavailableSourceCount: 1,
        unavailableRows: [{ templateRowId: "row-panel", reason: "selected_variant_unavailable" }],
      })
      .mockResolvedValueOnce({ status: "inserted", tree: [], insertedRootNodeIds: ["inserted-1"] });
    renderPicker();

    const dialog = await chooseOnlyTarget();
    await within(dialog).findByText("Target group: Interior Fit-Out");
    fireEvent.click(within(dialog).getByRole("button", { name: "Insert template" }));

    const confirmation = await screen.findByRole("dialog", { name: "Use saved template values?" });
    fireEvent.click(within(confirmation).getByRole("button", { name: "Insert saved values" }));
    expect(estimateActionMocks.insertEstimateTemplateIntoEstimate).toHaveBeenNthCalledWith(1, expect.objectContaining({
      unavailableSourcePolicy: "cancel",
    }));
    await waitFor(() => {
      expect(estimateActionMocks.insertEstimateTemplateIntoEstimate).toHaveBeenNthCalledWith(2, expect.objectContaining({
        unavailableSourcePolicy: "use_saved_snapshot_unlinked",
        mode: "copy",
      }));
    });
    expect(estimateActionMocks.insertEstimateTemplateIntoEstimate.mock.calls[1]?.[0].intentId)
      .not.toBe(estimateActionMocks.insertEstimateTemplateIntoEstimate.mock.calls[0]?.[0].intentId);
  });

  it("cancels cleanly when saved snapshot insertion is declined", async () => {
    const onInserted = vi.fn();
    const onOpenChange = vi.fn();
    estimateActionMocks.insertEstimateTemplateIntoEstimate.mockResolvedValue({
      status: "requires_saved_snapshot_confirmation",
      unavailableSourceCount: 1,
      unavailableRows: [{ templateRowId: "row-panel", reason: "source_component_unavailable" }],
    });
    render(
      <InsertIntoEstimatePicker
        open
        onOpenChange={onOpenChange}
        template={makeTemplate()}
        onInserted={onInserted}
      />,
    );

    const dialog = await chooseOnlyTarget();
    await within(dialog).findByText("Target group: Interior Fit-Out");
    fireEvent.click(within(dialog).getByRole("button", { name: "Insert template" }));

    const confirmation = await screen.findByRole("dialog", { name: "Use saved template values?" });
    fireEvent.click(within(confirmation).getByRole("button", { name: "Cancel insert" }));
    await waitFor(() => expect(estimateActionMocks.insertEstimateTemplateIntoEstimate).toHaveBeenCalledTimes(1));
    expect(onInserted).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("blocks a stale target when the submit-time resolver no longer returns a parent node", async () => {
    componentLibraryActionMocks.resolveEstimateTemplateInsertTarget
      .mockResolvedValueOnce({
        targetParentNodeId: "node-root-group",
        targetParentNodeName: "Interior Fit-Out",
        targetParentNodeKind: "group",
        targetParentNodePath: ["Interior Fit-Out"],
      })
      .mockResolvedValueOnce({
        targetParentNodeId: null,
        targetParentNodeName: null,
        targetParentNodeKind: null,
        targetParentNodePath: null,
      });
    renderPicker();

    const dialog = await chooseOnlyTarget();
    await within(dialog).findByText("Target group: Interior Fit-Out");
    fireEvent.click(within(dialog).getByRole("button", { name: "Insert template" }));

    expect(await within(dialog).findByText("That estimate is no longer available. Choose another target.")).toBeInTheDocument();
    expect(estimateActionMocks.insertEstimateTemplateIntoEstimate).not.toHaveBeenCalled();
  });

  it("blocks archived dependencies and allows discontinued dependencies only after confirmation", async () => {
    const { rerender } = render(
      <InsertIntoEstimatePicker
        open
        onOpenChange={vi.fn()}
        template={makeTemplate({ lifecycleState: "archived" })}
        onInserted={vi.fn()}
      />,
    );

    let dialog = await chooseOnlyTarget();
    expect(await within(dialog).findByText("Archived dependency")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Insert template" })).toBeDisabled();

    rerender(
      <InsertIntoEstimatePicker
        open
        onOpenChange={vi.fn()}
        template={makeTemplate({ lifecycleState: "discontinued" })}
        onInserted={vi.fn()}
      />,
    );

    dialog = await screen.findByRole("dialog", { name: "Insert into estimate" });
    expect(await within(dialog).findByText("Discontinued dependency")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Insert template" })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Insert anyway after reviewing dependency warnings" }));
    expect(within(dialog).getByRole("button", { name: "Insert template" })).not.toBeDisabled();
  });
});
