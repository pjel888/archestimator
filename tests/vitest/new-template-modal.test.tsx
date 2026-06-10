import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { NewTemplateModal } from "@/components/workshop/component-library/NewTemplateModal";
import type { EstimateTreeNode } from "@/components/workshop/estimate-tree-data";

const actionMocks = vi.hoisted(() => ({
  createEstimateTemplateFromEstimateNode: vi.fn(),
}));

vi.mock("@/lib/component-library/actions", () => actionMocks);

const sourceNode: EstimateTreeNode = {
  id: "node-1",
  name: "Kitchen Wing",
  kind: "group",
  total: "₱0.00",
  children: [
    {
      id: "node-2",
      name: "Kitchen",
      kind: "area",
      total: "₱0.00",
      children: [],
      estimateRowItems: [],
    },
  ],
};

function renderModal(overrides: Partial<Parameters<typeof NewTemplateModal>[0]> = {}) {
  return render(
    <NewTemplateModal
      open
      onOpenChange={vi.fn()}
      projectId="project-1"
      estimateId="estimate-1"
      sourceNode={sourceNode}
      existingCategories={["Rooms"]}
      onCreated={vi.fn()}
      {...overrides}
    />,
  );
}

describe("NewTemplateModal", () => {
  beforeEach(() => {
    actionMocks.createEstimateTemplateFromEstimateNode.mockReset();
  });

  it("summarizes the selected source node", () => {
    renderModal();

    expect(screen.getByText("Kitchen Wing")).toBeInTheDocument();
    expect(screen.getByText(/Group node · 1 groups · 1 areas · 0 rows/)).toBeInTheDocument();
  });

  it("disables saving and explains when no estimate node is selected", () => {
    renderModal({ sourceNode: null });

    expect(screen.getByText(/Select a Group or Area Node in the estimate tree first/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save template" })).toBeDisabled();
  });

  it("requires a template name before calling the server", async () => {
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Save template" }));

    expect(await screen.findByText("Template name is required.")).toBeInTheDocument();
    expect(actionMocks.createEstimateTemplateFromEstimateNode).not.toHaveBeenCalled();
  });

  it("creates the template from the selected node and reports it back", async () => {
    const createdTemplate = { id: "tpl-1", name: "Kitchen Wing", description: "", category: "General", nodes: [] };
    actionMocks.createEstimateTemplateFromEstimateNode.mockResolvedValue({ template: createdTemplate });
    const onCreated = vi.fn();
    const onOpenChange = vi.fn();
    renderModal({ onCreated, onOpenChange });

    fireEvent.change(screen.getByLabelText("Template name"), { target: { value: "Kitchen Wing Template" } });
    fireEvent.change(screen.getByLabelText("Template group"), { target: { value: "Rooms" } });
    fireEvent.click(screen.getByRole("button", { name: "Save template" }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(createdTemplate));
    expect(actionMocks.createEstimateTemplateFromEstimateNode).toHaveBeenCalledWith({
      projectId: "project-1",
      estimateId: "estimate-1",
      sourceNodeId: "node-1",
      name: "Kitchen Wing Template",
      category: "Rooms",
      description: "",
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("surfaces server failures inline without closing", async () => {
    actionMocks.createEstimateTemplateFromEstimateNode.mockRejectedValue(new Error("Estimate not found in the current workspace."));
    const onCreated = vi.fn();
    const onOpenChange = vi.fn();
    renderModal({ onCreated, onOpenChange });

    fireEvent.change(screen.getByLabelText("Template name"), { target: { value: "Kitchen Wing Template" } });
    fireEvent.click(screen.getByRole("button", { name: "Save template" }));

    expect(await screen.findByText("Estimate not found in the current workspace.")).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
