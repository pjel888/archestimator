import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TemplatesBrowseManager } from "@/components/workshop/library/templates-browse/TemplatesBrowseManager";
import { buildTemplatePreviewNodeTotals } from "@/components/workshop/library/templates-browse/TemplatePreviewDockModel";
import type { EstimateTemplate } from "@/components/workshop/component-library/templates";
import type { EstimateRowItem, EstimateTreeNode } from "@/lib/estimates/types";

const componentLibraryActionMocks = vi.hoisted(() => ({
  createLibraryFolder: vi.fn(),
  createEstimateTemplate: vi.fn(),
  createEstimateTemplateFromEstimateNode: vi.fn(),
  executeBulkArchiveLibraryComponents: vi.fn(),
  deleteEstimateTemplate: vi.fn(),
  duplicateEstimateTemplate: vi.fn(),
  listEstimateInsertTargets: vi.fn(),
  loadComponentLibraryUserPreferences: vi.fn(),
  moveEstimateTemplateToCategory: vi.fn(),
  previewBulkArchiveLibraryComponents: vi.fn(),
  recordComponentLibraryTelemetryEvent: vi.fn(),
  renameEstimateTemplate: vi.fn(),
  renameLibraryFolder: vi.fn(),
  renameTemplateCategory: vi.fn(),
  reorderLibraryFolders: vi.fn(),
  resolveEstimateTemplateInsertTarget: vi.fn(),
  saveComponentLibraryUserPreferences: vi.fn(),
}));

const estimateActionMocks = vi.hoisted(() => ({
  insertEstimateTemplateIntoEstimate: vi.fn(),
}));

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
}));

const reusableSourceActionMocks = vi.hoisted(() => ({
  getReusableEstimateOutline: vi.fn(),
  listReusableProjectEstimateSources: vi.fn(),
  listReusableProjectSources: vi.fn(),
  searchReusableProjectSources: vi.fn(),
}));

vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => false,
}));

vi.mock("@/lib/component-library/actions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/component-library/actions")>()),
  createLibraryFolder: componentLibraryActionMocks.createLibraryFolder,
  createEstimateTemplate: componentLibraryActionMocks.createEstimateTemplate,
  createEstimateTemplateFromEstimateNode: componentLibraryActionMocks.createEstimateTemplateFromEstimateNode,
  deleteEstimateTemplate: componentLibraryActionMocks.deleteEstimateTemplate,
  duplicateEstimateTemplate: componentLibraryActionMocks.duplicateEstimateTemplate,
  executeBulkArchiveLibraryComponents: componentLibraryActionMocks.executeBulkArchiveLibraryComponents,
  listEstimateInsertTargets: componentLibraryActionMocks.listEstimateInsertTargets,
  loadComponentLibraryUserPreferences: componentLibraryActionMocks.loadComponentLibraryUserPreferences,
  moveEstimateTemplateToCategory: componentLibraryActionMocks.moveEstimateTemplateToCategory,
  previewBulkArchiveLibraryComponents: componentLibraryActionMocks.previewBulkArchiveLibraryComponents,
  recordComponentLibraryTelemetryEvent: componentLibraryActionMocks.recordComponentLibraryTelemetryEvent,
  renameEstimateTemplate: componentLibraryActionMocks.renameEstimateTemplate,
  renameLibraryFolder: componentLibraryActionMocks.renameLibraryFolder,
  renameTemplateCategory: componentLibraryActionMocks.renameTemplateCategory,
  reorderLibraryFolders: componentLibraryActionMocks.reorderLibraryFolders,
  resolveEstimateTemplateInsertTarget: componentLibraryActionMocks.resolveEstimateTemplateInsertTarget,
  saveComponentLibraryUserPreferences: componentLibraryActionMocks.saveComponentLibraryUserPreferences,
}));

vi.mock("@/lib/estimates/actions", () => estimateActionMocks);

vi.mock("@/lib/reusable-sources/actions", () => reusableSourceActionMocks);

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: navigationMocks.push,
    refresh: navigationMocks.refresh,
    replace: navigationMocks.replace,
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/workshop/library/templates",
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
    price: itemCost,
    currency: "PHP",
    contingencyPercentage: 0,
    contingencyValue: 0,
    miscCostDefault: miscCost,
    category: "General",
    pricingSource: "Test source",
    pricingDate: "2026-06-01",
    confidence: "Quoted",
    sourceLibraryItemId: `component-${overrides.id}`,
    linkState: "linked-clean",
    ...overrides,
    itemCost,
    quantity,
    miscCost,
    subTotal,
    totalItemCosts: subTotal + miscCost,
  };
}

function makeNode(overrides: Partial<EstimateTreeNode> & { id: string; name: string; kind: "group" | "area" }): EstimateTreeNode {
  return {
    total: "PHP 0.00",
    children: [],
    estimateRowItems: [],
    ...overrides,
  };
}

const condoTemplate: EstimateTemplate = {
  id: "template-condo",
  name: "Condo Starter",
  description: "Compact condo fit out structure.",
  category: "Residential",
  nodes: [
    makeNode({
      id: "node-condo-group",
      name: "Interior Fit-Out",
      kind: "group",
      children: [
        makeNode({
          id: "node-condo-area",
          name: "Living Room",
          kind: "area",
          estimateRowItems: [
            makeRow({
              id: "row-condo-panel",
              material: "Zirconium Wall Panel",
              supplier: "Unique Supply Co",
              itemCost: 500,
              quantity: 2,
            }),
          ],
        }),
      ],
    }),
  ],
};

const deckTemplate: EstimateTemplate = {
  id: "template-deck",
  name: "Roof Deck Lounge",
  description: "Outdoor lounge structure.",
  category: "Exterior",
  nodes: [
    makeNode({
      id: "node-deck-group",
      name: "Roof Deck",
      kind: "group",
      children: [
        makeNode({
          id: "node-deck-area",
          name: "Lounge",
          kind: "area",
          estimateRowItems: [
            makeRow({ id: "row-deck-sofa", material: "Outdoor Sofa", itemCost: 1000 }),
            makeRow({ id: "row-deck-drain", material: "Floor Drain", itemCost: 200 }),
          ],
        }),
      ],
    }),
  ],
};

const fixtureTemplates: EstimateTemplate[] = [condoTemplate, deckTemplate];

function createDataTransferStub() {
  const data: Record<string, string> = {};
  return {
    data,
    setData(type: string, value: string) {
      data[type] = value;
    },
    getData(type: string) {
      return data[type] ?? "";
    },
    types: [] as string[],
    effectAllowed: "",
    dropEffect: "",
  };
}

function renderManager(templates: EstimateTemplate[] = fixtureTemplates) {
  return render(<TemplatesBrowseManager templates={templates} />);
}

function getGallery() {
  return screen.getByLabelText("Template content");
}

describe("TemplatesBrowseManager (Templates browse, Phase 2)", () => {
  beforeEach(() => {
    navigationMocks.push.mockReset();
    navigationMocks.refresh.mockReset();
    navigationMocks.replace.mockReset();
    for (const mock of Object.values(componentLibraryActionMocks)) mock.mockReset();
    for (const mock of Object.values(reusableSourceActionMocks)) mock.mockReset();
    estimateActionMocks.insertEstimateTemplateIntoEstimate.mockReset();
    vi.spyOn(window, "prompt").mockReturnValue(null);
  });

  it("renders gallery rows with singular-correct counts and context strip", () => {
    renderManager();

    const gallery = getGallery();
    expect(within(gallery).getByText("2 areas · 1 row")).toBeInTheDocument();
    expect(within(gallery).getByText("2 areas · 2 rows")).toBeInTheDocument();
    const condoTrust = within(gallery).getByLabelText("Source trust for Condo Starter");
    expect(within(condoTrust).getByText("1/1 linked rows")).toBeInTheDocument();
    expect(within(condoTrust).getByText("Current")).toBeInTheDocument();
    const contextStrip = document.querySelector('[data-template-sheet-context-strip="true"]');
    expect(contextStrip).toHaveTextContent("All Templates · 2 templates");
    expect(contextStrip).toHaveTextContent("Sorted by group");
  });

  it("renders the template inventory plus a Library and Project source dock", () => {
    renderManager();

    expect(screen.getByRole("treeitem", { name: "All Templates" })).toBeInTheDocument();
    const sourceTabs = screen.getByRole("tablist", { name: "Estimate source sections" });
    expect(within(sourceTabs).getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Library", "Project"]);
    expect(screen.queryByRole("tab", { name: "Templates" })).not.toBeInTheDocument();
    expect(screen.queryByRole("treeitem", { name: "Projects reusable sources" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Condo Starter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Insert Condo Starter into estimate" })).toBeInTheDocument();
  });

  it("selects a row on click and shows its structure in the preview dock", async () => {
    renderManager();

    expect(screen.queryByRole("region", { name: "Template preview" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Preview Condo Starter" }));

    const dock = await screen.findByRole("region", { name: "Template preview" });
    expect(within(dock).getByText("Interior Fit-Out")).toBeInTheDocument();
    expect(within(dock).getByText("Living Room")).toBeInTheDocument();
    expect(within(dock).getByText("Zirconium Wall Panel")).toBeInTheDocument();
    expect(within(dock).getByText("Template total")).toBeInTheDocument();
    expect(dock.querySelector('[data-template-preview-total="true"]')).toHaveTextContent("₱1,000.00");
  });

  it("precomputes preview dock subtree totals once per selected template", () => {
    const root = makeNode({
      id: "preview-root",
      name: "Root",
      kind: "group",
      estimateRowItems: [makeRow({ id: "root-row", material: "Root row", itemCost: 200 })],
      children: [
        makeNode({
          id: "preview-child",
          name: "Child",
          kind: "area",
          estimateRowItems: [makeRow({ id: "child-row", material: "Child row", itemCost: 300, quantity: 2 })],
        }),
      ],
    });

    const totals = buildTemplatePreviewNodeTotals([root]);

    expect(totals.get("preview-root")).toBe(800);
    expect(totals.get("preview-child")).toBe(600);
  });

  it("pushes the editor route from the row Open action", () => {
    renderManager();

    fireEvent.click(screen.getByRole("button", { name: "Open Condo Starter" }));

    expect(navigationMocks.push).toHaveBeenCalledWith("/workshop/library/templates/template-condo");
  });

  it("inserts into an estimate through the picker via resolve + existing insert action", async () => {
    componentLibraryActionMocks.listEstimateInsertTargets.mockResolvedValue({
      projects: [
        {
          id: "project-1",
          name: "Tower A",
          estimates: [{ id: "estimate-1", name: "Main Estimate", sheetCode: "EST-01" }],
        },
      ],
    });
    componentLibraryActionMocks.resolveEstimateTemplateInsertTarget.mockResolvedValue({
      targetParentNodeId: "node-root-group",
      targetParentNodeName: "Interior Fit-Out",
      targetParentNodeKind: "group",
      targetParentNodePath: ["Interior Fit-Out"],
    });
    estimateActionMocks.insertEstimateTemplateIntoEstimate.mockResolvedValue({
      tree: [],
      insertedRootNodeIds: ["inserted-1"],
    });
    renderManager();

    fireEvent.click(screen.getByRole("button", { name: "Insert Condo Starter into estimate" }));

    const dialog = await screen.findByRole("dialog", { name: "Insert into estimate" });
    await waitFor(() => {
      expect(componentLibraryActionMocks.listEstimateInsertTargets).toHaveBeenCalled();
    });

    fireEvent.click(await within(dialog).findByRole("combobox", { name: "Insert target project" }));
    fireEvent.click(within(screen.getByRole("listbox", { name: "Insert target project" })).getByRole("option", { name: "Tower A" }));

    fireEvent.click(await within(dialog).findByRole("combobox", { name: "Insert target estimate" }));
    fireEvent.click(
      within(screen.getByRole("listbox", { name: "Insert target estimate" })).getByRole("option", { name: "EST-01 · Main Estimate" }),
    );

    expect(await within(dialog).findByText("Inserting into Main Estimate — Tower A.")).toBeInTheDocument();
    expect(await within(dialog).findByText("Target group: Interior Fit-Out")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Insert template" }));

    await waitFor(() => {
      expect(componentLibraryActionMocks.resolveEstimateTemplateInsertTarget).toHaveBeenCalledWith({
        projectId: "project-1",
        estimateId: "estimate-1",
      });
    });
    expect(componentLibraryActionMocks.resolveEstimateTemplateInsertTarget).toHaveBeenCalledTimes(2);
    await waitFor(() => {
      expect(estimateActionMocks.insertEstimateTemplateIntoEstimate).toHaveBeenCalledWith({
        projectId: "project-1",
        estimateId: "estimate-1",
        targetParentNodeId: "node-root-group",
        templateId: "template-condo",
      });
    });
    expect(await screen.findByText("Inserted into Main Estimate.")).toBeInTheDocument();
  });

  it("renames a template from the row kebab through the existing action", async () => {
    componentLibraryActionMocks.renameEstimateTemplate.mockResolvedValue({
      templateId: "template-condo",
      name: "Condo Premium",
    });
    renderManager();

    fireEvent.click(screen.getByRole("button", { name: "Condo Starter actions" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Rename" }));

    // U12 (C5): the native window.prompt is replaced by an in-DS modal.
    const input = await screen.findByLabelText("Template name");
    expect(input).toHaveValue("Condo Starter");
    fireEvent.change(input, { target: { value: "Condo Premium" } });
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));

    await waitFor(() => {
      expect(componentLibraryActionMocks.renameEstimateTemplate).toHaveBeenCalledWith({
        templateId: "template-condo",
        name: "Condo Premium",
      });
    });
    expect(within(getGallery()).getByText("Condo Premium")).toBeInTheDocument();
  });

  it("deletes a template from the row kebab after the verbatim confirm", async () => {
    componentLibraryActionMocks.deleteEstimateTemplate.mockResolvedValue({ templateId: "template-condo" });
    renderManager();

    fireEvent.click(screen.getByRole("button", { name: "Condo Starter actions" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));

    const dialog = await screen.findByRole("alertdialog", { name: "Delete template?" });
    expect(
      within(dialog).getByText(
        '"Condo Starter" will be removed from the library. Estimates already built from it keep their rows.',
      ),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete template" }));

    await waitFor(() => {
      expect(componentLibraryActionMocks.deleteEstimateTemplate).toHaveBeenCalledWith({ templateId: "template-condo" });
    });
    await waitFor(() => {
      expect(within(getGallery()).queryByText("Condo Starter")).not.toBeInTheDocument();
    });
  });

  it("duplicates a template through the new action and shows the copy", async () => {
    componentLibraryActionMocks.duplicateEstimateTemplate.mockResolvedValue({
      template: { ...condoTemplate, id: "template-condo-copy", name: "Condo Starter copy" },
    });
    renderManager();

    fireEvent.click(screen.getByRole("button", { name: "Condo Starter actions" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Duplicate" }));

    await waitFor(() => {
      expect(componentLibraryActionMocks.duplicateEstimateTemplate).toHaveBeenCalledWith({ templateId: "template-condo" });
    });
    expect(await within(screen.getByRole("list", { name: "All Templates template rows" })).findByText("Condo Starter copy")).toBeInTheDocument();
  });

  it("matches row content in the gallery search (material/supplier extension)", async () => {
    renderManager();

    fireEvent.click(screen.getByRole("button", { name: "Show template content search" }));
    const input = await screen.findByLabelText("Search templates");
    fireEvent.change(input, { target: { value: "Zirconium" } });

    const gallery = getGallery();
    await waitFor(() => {
      expect(within(gallery).queryByText("Roof Deck Lounge")).not.toBeInTheDocument();
    });
    expect(within(gallery).getByText("Condo Starter")).toBeInTheDocument();
    expect(screen.getByText('1 of 2 match "Zirconium"')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "Unique Supply Co" } });
    expect(within(gallery).getByText("Condo Starter")).toBeInTheDocument();
    expect(screen.getByText('1 of 2 match "Unique Supply Co"')).toBeInTheDocument();
  });

  it("moves a template between groups by dragging in the tree", async () => {
    componentLibraryActionMocks.moveEstimateTemplateToCategory.mockResolvedValue({
      templateId: "template-condo",
      category: "Exterior",
      sortOrder: 0,
    });
    renderManager();

    const tree = screen.getByRole("tree", { name: "Template library tree" });
    const templateRow = within(tree).getByRole("treeitem", { name: "Condo Starter template" });
    const categoryRow = within(tree).getByRole("treeitem", { name: "Exterior group" });
    const dataTransfer = createDataTransferStub();

    fireEvent.dragStart(templateRow, { dataTransfer });
    fireEvent.dragOver(categoryRow, { dataTransfer });
    fireEvent.drop(categoryRow, { dataTransfer });

    await waitFor(() => {
      expect(componentLibraryActionMocks.moveEstimateTemplateToCategory).toHaveBeenCalledWith({
        templateId: "template-condo",
        category: "Exterior",
      });
    });
    expect(await screen.findByText("Moved to Exterior.")).toBeInTheDocument();
  });

  it("offers a keyboard move equivalent through the Move to group modal", async () => {
    componentLibraryActionMocks.moveEstimateTemplateToCategory.mockResolvedValue({
      templateId: "template-condo",
      category: "Exterior",
      sortOrder: 0,
    });
    renderManager();

    const tree = screen.getByRole("tree", { name: "Template library tree" });
    fireEvent.contextMenu(within(tree).getByRole("treeitem", { name: "Condo Starter template" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Move to group…" }));

    const input = await screen.findByRole("combobox", { name: "Template group" });
    expect(screen.getByText("Current group: Residential. Choose an existing group or create a new one.")).toBeInTheDocument();
    fireEvent.click(input);
    fireEvent.click(screen.getByRole("option", { name: /Exterior/ }));
    fireEvent.click(screen.getByRole("button", { name: "Move" }));

    await waitFor(() => {
      expect(componentLibraryActionMocks.moveEstimateTemplateToCategory).toHaveBeenCalledWith({
        templateId: "template-condo",
        category: "Exterior",
      });
    });
  });

  it("creates a new template group from the move combobox", async () => {
    componentLibraryActionMocks.moveEstimateTemplateToCategory.mockResolvedValue({
      templateId: "template-condo",
      category: "Premium",
      sortOrder: 0,
    });
    renderManager();

    const tree = screen.getByRole("tree", { name: "Template library tree" });
    fireEvent.contextMenu(within(tree).getByRole("treeitem", { name: "Condo Starter template" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Move to group…" }));

    const input = await screen.findByRole("combobox", { name: "Template group" });
    fireEvent.change(input, { target: { value: "Premium" } });
    fireEvent.click(screen.getByRole("option", { name: 'Create "Premium"' }));
    fireEvent.click(screen.getByRole("button", { name: "Move" }));

    await waitFor(() => {
      expect(componentLibraryActionMocks.moveEstimateTemplateToCategory).toHaveBeenCalledWith({
        templateId: "template-condo",
        category: "Premium",
      });
    });
  });

  it("keeps the gallery shell empty with a working New template action", async () => {
    renderManager([]);

    const gallery = getGallery();
    expect(within(gallery).queryByText("No templates yet.")).not.toBeInTheDocument();
    expect(within(gallery).queryByText("Save a template to reuse line items.")).not.toBeInTheDocument();
    expect(within(gallery).getByRole("list", { name: "All Templates template rows" })).toBeInTheDocument();

    // The persistent toolbar action remains the New template entry point.
    const newTemplateButtons = within(gallery).getAllByRole("button", { name: "New template" });
    expect(newTemplateButtons).toHaveLength(1);
    fireEvent.click(newTemplateButtons[0]);
    expect(await screen.findByRole("dialog", { name: "New template" })).toBeInTheDocument();
  });
});
