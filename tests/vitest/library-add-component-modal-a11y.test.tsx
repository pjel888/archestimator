import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ComponentProps } from "react";

import { AddComponentModal } from "@/components/workshop/component-library-manager/AddComponentModal";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import type { LibraryFolderRecord } from "@/lib/component-library/library-folder-reorder";
import type { EstimateRowItem } from "@/lib/estimates/types";

const actionMocks = vi.hoisted(() => ({
  archiveComponentCatalogueEntity: vi.fn(),
  createComponentCatalogueEntity: vi.fn(),
  createCostLibraryComponent: vi.fn(),
  findCurrentWorkspaceCostLibraryComponentDuplicate: vi.fn(),
  renameComponentCatalogueEntity: vi.fn(),
  restoreComponentCatalogueEntity: vi.fn(),
  saveCostLibraryComponentDraft: vi.fn(),
  updateCostLibraryComponentWithPriceOptions: vi.fn(),
}));

vi.mock("@/lib/component-library/actions", () => actionMocks);

const categoryTree: ComponentLibraryTaxonomyNode[] = [
  {
    id: "taxonomy-root",
    label: "Components",
    kind: "organizer",
    children: [
      {
        id: "cat-hardware",
        label: "Hardware",
        kind: "category",
      },
    ],
  },
];

const folders: LibraryFolderRecord[] = [
  {
    id: "folder-hardware",
    workspace_id: "workspace-1",
    parent_id: null,
    name: "Hardware",
    sort_order: 10,
    source_category_node_id: "cat-hardware",
    folder_kind: "custom",
  },
  {
    id: "folder-lighting",
    workspace_id: "workspace-1",
    parent_id: null,
    name: "Lighting",
    sort_order: 20,
    source_category_node_id: "cat-lighting",
    folder_kind: "custom",
  },
];

const duplicateRows: EstimateRowItem[] = [
  {
    id: "component-duplicate",
    material: "Door Hinge",
    name: "Door Hinge",
    description: "",
    supplier: "Acme",
    source: "library",
    unit: "pc",
    itemCost: 10,
    price: 10,
    currency: "PHP",
    quantity: 1,
    subTotal: 10,
    miscCost: 0,
    totalItemCosts: 10,
    category: "Hardware",
    pricingSource: "Acme",
    pricingDate: "2026-01-10",
  },
];

const brandDuplicateRows: EstimateRowItem[] = [
  {
    ...duplicateRows[0],
    id: "component-brand-duplicate",
    material: "Concealed Pull",
    name: "Concealed Pull",
    supplier: "",
    brand: "Hinge Co",
  },
];
function makeAddModalProps(overrides: Partial<ComponentProps<typeof AddComponentModal>> = {}) {
  return {
    open: true,
    folders,
    categoryTree,
    suppliers: [{ id: "supplier-acme", name: "Acme", sort_order: 1 }],
    brands: [{ id: "brand-hinge", name: "Hinge Co", normalized_name: "hinge co", sort_order: 1 }],
    libraryItems: [],
    selectedFolderId: null,
    onOpenChange: vi.fn(),
    onComponentCreated: vi.fn(),
    expectedComponentImpactFingerprint: "component-impact-fingerprint",
    ...overrides,
  };
}

function renderAddModal(overrides: Partial<ComponentProps<typeof AddComponentModal>> = {}) {
  const props = makeAddModalProps(overrides);

  render(<AddComponentModal {...props} />);
  return props;
}

function makeEditingItem(overrides: Partial<EstimateRowItem> = {}): EstimateRowItem {
  return {
    ...duplicateRows[0],
    id: "estimate-row-editing",
    material: "Pergo Flooring 9",
    name: "Pergo Flooring 9",
    description: "Existing flooring component",
    supplier: "Ace Hardware",
    brand: "Pergo",
    category: "Flooring",
    unit: "unit",
    itemCost: 2500,
    price: 2500,
    quantity: 5,
    subTotal: 12500,
    totalItemCosts: 12500,
    componentVersionNumber: 1,
    updatedAt: "2026-07-13T10:00:00.000Z",
    ...overrides,
  };
}

async function getAddDialog() {
  return screen.findByRole("dialog", { name: "Add Component" }, { timeout: 10_000 });
}

async function getEditDialog() {
  return screen.findByRole("dialog", { name: "Edit Component" }, { timeout: 10_000 });
}

async function createCatalogueOption(
  dialog: HTMLElement,
  fieldName: "Supplier" | "Brand",
  value: string,
) {
  const form = within(dialog).getByRole("form", { name: "Quick add component" });
  const input = within(form).getByRole("combobox", { name: fieldName });
  const kind = fieldName.toLowerCase();
  fireEvent.change(input, { target: { value } });
  fireEvent.click(await screen.findByRole("option", { name: `Add ${kind} "${value}"` }));
  await waitFor(() => expect(input).toHaveValue(value));
  return input;
}

function fillValidQuickAdd(dialog: HTMLElement) {
  const form = within(dialog).getByRole("form", { name: "Quick add component" });
  fireEvent.change(within(form).getByLabelText("Name"), { target: { value: "Door Stop" } });
  fireEvent.change(within(form).getByRole("combobox", { name: "Supplier" }), { target: { value: "Acme" } });
  fireEvent.change(within(form).getByLabelText("Unit cost"), { target: { value: "123.456" } });
  return form;
}

function openVariantManager(dialog: HTMLElement) {
  fireEvent.click(within(dialog).getByRole("button", { name: "Open variants panel" }));
  return within(dialog).getByRole("dialog", { name: "Manage variants" });
}

function clickAddVariant(drawer: HTMLElement) {
  const addButtons = within(drawer).getAllByRole("button", { name: "Add variant" });
  fireEvent.click(addButtons[addButtons.length - 1]);
}

function openVariantDrawer(dialog: HTMLElement) {
  const drawer = openVariantManager(dialog);
  clickAddVariant(drawer);
  return drawer;
}

describe("AddComponentModal OpenDesign field contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    actionMocks.findCurrentWorkspaceCostLibraryComponentDuplicate.mockReset().mockResolvedValue(null);
    actionMocks.createComponentCatalogueEntity.mockReset();
    actionMocks.createCostLibraryComponent.mockResolvedValue({
      itemId: "component-created",
      activePriceOptionId: "price-created",
      versionNumber: 1,
      createdAt: "2026-07-13T10:00:00.000Z",
      updatedAt: "2026-07-13T10:00:00.000Z",
      component: {
        ...duplicateRows[0],
        id: "component-created",
        sourceLibraryItemId: "component-created",
        priceOptionId: "price-created",
        priceOptionLabel: "Default",
        componentVersionNumber: 1,
        createdAt: "2026-07-13T10:00:00.000Z",
        updatedAt: "2026-07-13T10:00:00.000Z",
      },
    });
    actionMocks.updateCostLibraryComponentWithPriceOptions.mockImplementation(async (itemId, input) => ({
      itemId,
      activePriceOptionId: input.priceOptions[0]?.id ?? "price-created",
      versionNumber: 2,
      updatedAt: "2026-07-13T11:00:00.000Z",
      affectedEstimates: [],
      rowRevisions: {},
      rowPatches: {},
      updatedRowCount: 0,
      component: {
        ...makeEditingItem(),
        id: itemId,
        source: "library",
        sourceLibraryItemId: itemId,
        imageUrl: input.thumbnailPath ?? undefined,
        priceOptions: input.priceOptions,
        componentVersionNumber: 2,
        updatedAt: "2026-07-13T11:00:00.000Z",
      },
    }));
    actionMocks.saveCostLibraryComponentDraft.mockResolvedValue({
      draftId: "component-draft-1",
      savedAt: "2026-07-06T00:00:00.000Z",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("exposes only the OpenDesign required fields on the main component form", async () => {
    renderAddModal();

    const dialog = await getAddDialog();
    const form = within(dialog).getByRole("form", { name: "Quick add component" });
    const name = within(form).getByLabelText("Name");
    const directCategory = within(form).getByRole("textbox", { name: "Direct category" });
    const unit = within(form).getByRole("combobox", { name: "Unit" });
    const unitCost = within(form).getByLabelText("Unit cost");

    expect(name).toHaveAttribute("aria-required", "true");
    expect(directCategory).toHaveAttribute("aria-readonly", "true");
    expect(directCategory).toHaveValue("Uncategorized");
    expect(unit).toHaveAttribute("aria-required", "true");
    expect(unitCost).toHaveAttribute("aria-required", "true");
    expect(name).not.toHaveAttribute("aria-invalid", "true");
    expect(directCategory).not.toHaveAttribute("aria-invalid", "true");
    expect(unitCost).not.toHaveAttribute("aria-invalid", "true");
    expect(within(dialog).queryByText("Enter a component name.")).not.toBeInTheDocument();
    expect(within(form).getByLabelText("Description")).toBeInTheDocument();
    expect(within(form).getByRole("combobox", { name: "Supplier" })).toBeInTheDocument();
    expect(within(form).getByRole("combobox", { name: "Brand" })).toBeInTheDocument();

    expect(within(dialog).queryByLabelText("Pricing date")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Pricing source")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Source URL")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Misc cost")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Length")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Component nesting")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Add Component" })).not.toBeDisabled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Add Component" }));

    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(directCategory).not.toHaveAttribute("aria-invalid", "true");
    expect(unitCost).toHaveAttribute("aria-invalid", "true");
    expect(within(dialog).getByText("Enter a component name.")).toBeInTheDocument();
  });

  it("keeps Unit cost editable while typing and formats it after focus leaves", async () => {
    renderAddModal();

    const dialog = await getAddDialog();
    const form = within(dialog).getByRole("form", { name: "Quick add component" });
    const unitCost = within(form).getByLabelText("Unit cost");

    fireEvent.change(unitCost, { target: { value: "1" } });
    expect(unitCost).toHaveValue("1");
    fireEvent.change(unitCost, { target: { value: "12." } });
    expect(unitCost).toHaveValue("12.");
    fireEvent.change(unitCost, { target: { value: "12.5" } });
    expect(unitCost).toHaveValue("12.5");

    fireEvent.blur(unitCost);
    expect(unitCost).toHaveValue("12.50");

    const variantsDrawer = openVariantDrawer(dialog);
    const variantUnitCost = within(variantsDrawer).getByLabelText("Variant unit cost");
    fireEvent.change(variantUnitCost, { target: { value: "3" } });
    expect(variantUnitCost).toHaveValue("3");
    fireEvent.blur(variantUnitCost);
    expect(variantUnitCost).toHaveValue("3.00");
  });

  it("lets a nested combobox own Escape before the dirty modal close dialog", async () => {
    const nativeConfirm = vi.spyOn(window, "confirm").mockImplementation(() => false);
    const props = renderAddModal();
    const dialog = await getAddDialog();
    const form = within(dialog).getByRole("form", { name: "Quick add component" });

    const supplier = within(form).getByRole("combobox", { name: "Supplier" });
    fireEvent.focus(supplier);
    expect(await screen.findByRole("listbox", { name: "Supplier options" })).toBeInTheDocument();

    fireEvent.keyDown(supplier, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("listbox", { name: "Supplier options" })).not.toBeInTheDocument());
    expect(screen.getByRole("dialog", { name: "Add Component" })).toBeInTheDocument();
    expect(props.onOpenChange).not.toHaveBeenCalled();

    fireEvent.change(within(form).getByLabelText("Name"), { target: { value: "Door Stop" } });
    fireEvent.click(screen.getByRole("button", { name: "Close add component modal" }));

    expect(await screen.findByRole("dialog", { name: "Discard unsaved component?" })).toBeInTheDocument();
    expect(nativeConfirm).not.toHaveBeenCalled();
    expect(props.onOpenChange).not.toHaveBeenCalledWith(false);

    nativeConfirm.mockRestore();
  });

  it("closes without a warning when the draft has no meaningful values", async () => {
    const props = renderAddModal();
    const dialog = await getAddDialog();

    fireEvent.click(within(dialog).getByRole("button", { name: "Open variants panel" }));
    const variantsDrawer = within(dialog).getByRole("dialog", { name: "Manage variants" });
    clickAddVariant(variantsDrawer);
    fireEvent.click(within(dialog).getByRole("button", { name: "Close add component modal" }));

    expect(props.onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole("dialog", { name: "Discard unsaved component?" })).not.toBeInTheDocument();
  });

  it("warns only while a meaningful value remains in the draft", async () => {
    renderAddModal();
    const dialog = await getAddDialog();
    const name = within(dialog).getByLabelText("Name");

    fireEvent.change(name, { target: { value: "Temporary component" } });
    fireEvent.change(name, { target: { value: "   " } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Close add component modal" }));

    expect(screen.queryByRole("dialog", { name: "Discard unsaved component?" })).not.toBeInTheDocument();
  });

  it("keeps the draft open after a failed create and preserves OpenDesign fields", async () => {
    actionMocks.createCostLibraryComponent.mockRejectedValueOnce(new Error("Network down"));
    const props = renderAddModal({ selectedFolderId: "folder-hardware" });
    const dialog = await getAddDialog();
    const form = fillValidQuickAdd(dialog);

    fireEvent.click(within(dialog).getByRole("button", { name: "Add Component" }));

    await screen.findByText("Network down");
    expect(screen.getByRole("dialog", { name: "Add Component" })).toBeInTheDocument();
    expect(within(form).getByLabelText("Name")).toHaveValue("Door Stop");
    expect(within(form).getByRole("textbox", { name: "Direct category" })).toHaveValue("Hardware");
    expect(within(form).getByRole("combobox", { name: "Supplier" })).toHaveValue("Acme");
    expect(props.onComponentCreated).not.toHaveBeenCalled();
  });

  it("keeps direct category folder-derived instead of exposing category creation", async () => {
    renderAddModal();
    const dialog = await getAddDialog();
    const form = within(dialog).getByRole("form", { name: "Quick add component" });

    expect(within(form).getByRole("textbox", { name: "Direct category" })).toHaveValue("Uncategorized");
    expect(within(form).queryByRole("combobox", { name: "Category" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Hardware" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: 'Add category "Hardware"' })).not.toBeInTheDocument();
  });

  it("derives direct category from the selected library folder", async () => {
    renderAddModal({ selectedFolderId: "folder-hardware" });
    const dialog = await getAddDialog();
    const form = within(dialog).getByRole("form", { name: "Quick add component" });

    expect(within(form).getByRole("textbox", { name: "Direct category" })).toHaveValue("Hardware");
  });

  it("moves an edited component by canonical category ID and preserves the moved category on save", async () => {
    let resolveMove: ((value: {
      type: "latest-success";
      attemptedTargetFolderId: string;
      authoritativeConfirmedFolderId: string;
      optimisticAction: "keep";
    }) => void) | undefined;
    const onMoveComponentCategory = vi.fn(() => new Promise<{
      type: "latest-success";
      attemptedTargetFolderId: string;
      authoritativeConfirmedFolderId: string;
      optimisticAction: "keep";
    }>((resolve) => {
      resolveMove = resolve;
    }));
    renderAddModal({
      editingItem: makeEditingItem({ libraryFolderId: "folder-hardware" }),
      onComponentUpdated: vi.fn(),
      onMoveComponentCategory,
    });
    const dialog = await getEditDialog();
    const form = within(dialog).getByRole("form", { name: "Quick add component" });
    const directCategory = within(form).getByRole("textbox", { name: "Direct category" });
    const moveControl = within(form).getByRole("combobox", { name: "Move component to category" });

    expect(directCategory).toHaveAttribute("aria-readonly", "true");
    expect(directCategory).toHaveValue("Hardware");
    fireEvent.click(moveControl);
    fireEvent.click(await screen.findByRole("option", { name: "Lighting" }));

    expect(onMoveComponentCategory).toHaveBeenCalledWith(
      expect.objectContaining({ libraryFolderId: "folder-hardware" }),
      "folder-lighting",
    );
    expect(directCategory).toHaveValue("Lighting");
    expect(moveControl).toHaveAttribute("aria-disabled", "true");
    expect(within(form).getByRole("status")).toHaveTextContent("Moving component category");

    resolveMove?.({
      type: "latest-success",
      attemptedTargetFolderId: "folder-lighting",
      authoritativeConfirmedFolderId: "folder-lighting",
      optimisticAction: "keep",
    });
    await screen.findByText("Moved to Lighting.");

    fireEvent.click(within(dialog).getByRole("button", { name: "Save Component" }));
    await waitFor(() => expect(actionMocks.updateCostLibraryComponentWithPriceOptions).toHaveBeenCalledTimes(1));
    expect(actionMocks.updateCostLibraryComponentWithPriceOptions).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ libraryFolderId: "folder-lighting" }),
    );
  });

  it("rolls back a failed category move and restores focus to the labeled move control", async () => {
    const onMoveComponentCategory = vi.fn().mockResolvedValue({
      type: "latest-failure",
      attemptedTargetFolderId: "folder-lighting",
      authoritativeConfirmedFolderId: "folder-hardware",
      optimisticAction: "rollback",
      error: new Error("Category move failed"),
    });
    renderAddModal({
      editingItem: makeEditingItem({ libraryFolderId: "folder-hardware" }),
      onComponentUpdated: vi.fn(),
      onMoveComponentCategory,
    });
    const dialog = await getEditDialog();
    const form = within(dialog).getByRole("form", { name: "Quick add component" });
    const directCategory = within(form).getByRole("textbox", { name: "Direct category" });
    const moveControl = within(form).getByRole("combobox", { name: "Move component to category" });

    fireEvent.click(moveControl);
    fireEvent.click(await screen.findByRole("option", { name: "Lighting" }));

    await within(form).findByRole("alert");
    expect(within(form).getByRole("alert")).toHaveTextContent("Category move failed");
    expect(directCategory).toHaveValue("Hardware");
    await waitFor(() => expect(moveControl).toHaveFocus());
  });

  it("disables category moves without catalogue management permission", async () => {
    const onMoveComponentCategory = vi.fn();
    renderAddModal({
      editingItem: makeEditingItem({ libraryFolderId: "folder-hardware" }),
      onComponentUpdated: vi.fn(),
      canManageCatalogue: false,
      onMoveComponentCategory,
    });
    const dialog = await getEditDialog();
    const form = within(dialog).getByRole("form", { name: "Quick add component" });
    const moveControl = within(form).getByRole("combobox", { name: "Move component to category" });

    expect(moveControl).toBeDisabled();
    fireEvent.click(moveControl);
    expect(onMoveComponentCategory).not.toHaveBeenCalled();
  });

  it("commits server-returned catalogue IDs into the component payload", async () => {
    actionMocks.createComponentCatalogueEntity
      .mockResolvedValueOnce({
        replayed: false,
        entity: {
          id: "supplier-saved",
          workspaceId: "workspace-1",
          kind: "supplier",
          name: "Saved Supplier Co",
          normalizedName: "saved supplier co",
          lifecycleState: "active",
          revision: 1,
          archivedAt: null,
          archivedBy: null,
          mergedIntoId: null,
          createdBy: "user-1",
          updatedBy: "user-1",
          createdAt: "2026-07-30T00:00:00.000Z",
          updatedAt: "2026-07-30T00:00:00.000Z",
        },
      })
      .mockResolvedValueOnce({
        replayed: false,
        entity: {
          id: "brand-saved",
          workspaceId: "workspace-1",
          kind: "brand",
          name: "Saved Brand Line",
          normalizedName: "saved brand line",
          lifecycleState: "active",
          revision: 1,
          archivedAt: null,
          archivedBy: null,
          mergedIntoId: null,
          createdBy: "user-1",
          updatedBy: "user-1",
          createdAt: "2026-07-30T00:00:00.000Z",
          updatedAt: "2026-07-30T00:00:00.000Z",
        },
      });
    renderAddModal({ selectedFolderId: "folder-hardware" });
    const dialog = await getAddDialog();

    await createCatalogueOption(dialog, "Supplier", "Saved Supplier Co");
    await createCatalogueOption(dialog, "Brand", "Saved Brand Line");
    const form = within(dialog).getByRole("form", { name: "Quick add component" });
    fireEvent.change(within(form).getByLabelText("Name"), { target: { value: "Door Stop" } });
    fireEvent.change(within(form).getByLabelText("Unit cost"), { target: { value: "123.456" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add Component" }));

    await waitFor(() => expect(actionMocks.createCostLibraryComponent).toHaveBeenCalledTimes(1));
    expect(actionMocks.createCostLibraryComponent).toHaveBeenCalledWith(expect.objectContaining({
      supplierId: "supplier-saved",
      brandId: "brand-saved",
    }));
    expect(window.localStorage.getItem("archestimator-component-catalogue")).toBeNull();
  });

  it("preserves a failed catalogue name and replays the same intent on Retry", async () => {
    actionMocks.createComponentCatalogueEntity
      .mockRejectedValueOnce(new Error("Catalogue service unavailable"))
      .mockResolvedValueOnce({
        replayed: true,
        entity: {
          id: "supplier-retried",
          workspaceId: "workspace-1",
          kind: "supplier",
          name: "Retry Supplier",
          normalizedName: "retry supplier",
          lifecycleState: "active",
          revision: 1,
          archivedAt: null,
          archivedBy: null,
          mergedIntoId: null,
          createdBy: "user-1",
          updatedBy: "user-1",
          createdAt: "2026-07-30T00:00:00.000Z",
          updatedAt: "2026-07-30T00:00:00.000Z",
        },
      });
    renderAddModal();
    const dialog = await getAddDialog();
    const supplier = await createCatalogueOption(dialog, "Supplier", "Retry Supplier");

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Catalogue service unavailable");
    expect(supplier).toHaveValue("Retry Supplier");
    const firstIntent = actionMocks.createComponentCatalogueEntity.mock.calls[0]?.[0].intentId;
    fireEvent.click(within(dialog).getByRole("button", { name: "Retry supplier creation" }));

    await waitFor(() => expect(actionMocks.createComponentCatalogueEntity).toHaveBeenCalledTimes(2));
    expect(actionMocks.createComponentCatalogueEntity.mock.calls[1]?.[0]).toEqual(expect.objectContaining({
      entityKind: "supplier",
      intentId: firstIntent,
      name: "Retry Supplier",
    }));
    await waitFor(() => expect(supplier).toHaveValue("Retry Supplier"));
  });

  it("shows an archived linked master without offering it for a new selection", async () => {
    renderAddModal({
      editingItem: makeEditingItem({ supplierId: "supplier-archived", supplier: "Legacy Supplier" }),
      suppliers: [{
        id: "supplier-archived",
        name: "Legacy Supplier",
        sort_order: 1,
        lifecycle_state: "archived",
        revision: 2,
      }],
    });
    const dialog = await getEditDialog();
    const supplier = within(dialog).getByRole("combobox", { name: "Supplier" });

    expect(supplier).toHaveValue("Legacy Supplier (archived)");
    fireEvent.focus(supplier);
    expect(screen.queryByRole("option", { name: "Legacy Supplier (archived)" })).not.toBeInTheDocument();
  });

  it("submits the canonical component graph payload", async () => {
    const props = renderAddModal({ selectedFolderId: "folder-hardware" });
    const dialog = await getAddDialog();
    fillValidQuickAdd(dialog);

    fireEvent.click(within(dialog).getByRole("button", { name: "Add Component" }));

    await waitFor(() => expect(actionMocks.createCostLibraryComponent).toHaveBeenCalledTimes(1));
    expect(actionMocks.createCostLibraryComponent).toHaveBeenCalledWith(expect.objectContaining({
      name: "Door Stop",
      category: "Hardware",
      unit: "unit",
      supplier: "Acme",
      priceOptions: [
        expect.objectContaining({
          label: "Default",
          unit: "unit",
          unitCost: 123.46,
          currency: "PHP",
          isDefault: true,
          costEntries: [
            expect.objectContaining({
              unitCost: 123.46,
              currency: "PHP",
              isCurrent: true,
            }),
          ],
          attachments: [],
        }),
      ],
    }));
    const payload = actionMocks.createCostLibraryComponent.mock.calls[0][0];
    expect(payload.libraryFolderId).toBe("folder-hardware");
    expect(payload).not.toHaveProperty("metadata");
    expect(payload.priceOptions[0]).not.toHaveProperty("dimensionLength");
    await waitFor(() => expect(props.onComponentCreated).toHaveBeenCalledTimes(1));
    const createdItem = props.onComponentCreated.mock.calls[0][0] as EstimateRowItem;
    expect(createdItem.category).toBe("Hardware");
    expect(createdItem.categoryPath).toBeUndefined();
    expect(createdItem.createdAt).toBe("2026-07-13T10:00:00.000Z");
    expect(createdItem.updatedAt).toBe("2026-07-13T10:00:00.000Z");
  });

  it("opens the variants drawer with OpenDesign variant-only fields", async () => {
    renderAddModal();
    const dialog = await getAddDialog();
    const drawer = openVariantDrawer(dialog);

    expect(within(drawer).getByLabelText("Variant Name")).toBeInTheDocument();
    expect(within(drawer).getByLabelText("Variant Description")).toBeInTheDocument();
    expect(within(drawer).getByLabelText("SKU / Reference")).toBeInTheDocument();
    expect(within(drawer).getByLabelText("Variant unit cost")).toBeInTheDocument();
    const variantUnit = within(drawer).getByRole("combobox", { name: "Variant unit" });
    expect(variantUnit).toBeInTheDocument();
    expect(within(drawer).getByText("Equivalency")).toBeInTheDocument();
    const equivalentQuantity = within(drawer).getByLabelText("Equivalent quantity");
    const equivalentUnit = within(drawer).getByLabelText("Equivalent unit");
    expect(equivalentQuantity).toBeInTheDocument();
    expect(equivalentUnit).toBeInTheDocument();
    fireEvent.change(equivalentQuantity, { target: { value: "12" } });
    fireEvent.change(equivalentUnit, { target: { value: "tiles" } });

    fireEvent.change(variantUnit, { target: { value: "box" } });

    expect(within(drawer).getByLabelText("Equivalent quantity")).toBeInTheDocument();
    expect(within(drawer).getByLabelText("Equivalent unit")).toBeInTheDocument();
    expect(equivalentQuantity).toHaveValue("12");
    expect(equivalentUnit).toHaveValue("tiles");
    expect(within(drawer).getByLabelText("Upload attachment")).toBeInTheDocument();

    expect(within(drawer).queryByLabelText("Pricing date")).not.toBeInTheDocument();
    expect(within(drawer).queryByLabelText("Pricing source")).not.toBeInTheDocument();
    expect(within(drawer).queryByLabelText("Dimension unit")).not.toBeInTheDocument();
  });

  it("starts with no variants and deletes the last added variant", async () => {
    renderAddModal();
    const dialog = await getAddDialog();
    const drawer = openVariantManager(dialog);

    expect(within(drawer).getByLabelText("Variant manager")).toBeInTheDocument();
    expect(within(drawer).getByText("No variants yet.")).toBeInTheDocument();
    expect(within(drawer).queryByRole("button", { name: "Open V-1 — Default" })).not.toBeInTheDocument();
    expect(within(drawer).getByRole("button", { name: "Default" })).toBeDisabled();

    clickAddVariant(drawer);

    expect(within(drawer).getByLabelText("Variant editor")).toBeInTheDocument();
    expect(within(drawer).getByRole("button", { name: "Open V-1 — Default" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(within(drawer).getByRole("button", { name: "Delete variant" }));

    await waitFor(() => expect(within(drawer).queryByRole("button", { name: "Open V-1 — Default" })).not.toBeInTheDocument());
    expect(within(drawer).getByText("No variants yet.")).toBeInTheDocument();
    expect(within(drawer).queryByLabelText("Variant editor")).not.toBeInTheDocument();
    expect(within(drawer).getByRole("button", { name: "Default" })).toBeDisabled();
  });

  it("renders uploaded variant attachments in the drawer carousel", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      bucket: "component-attachments",
      path: "workspace-1/user-1/spec.pdf",
      fileName: "spec.pdf",
      contentType: "application/pdf",
      sizeBytes: 2048,
      uploadSessionId: "session-attachment-1",
      assetId: "asset-attachment-1",
      scanStatus: "pending",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    renderAddModal();

    const dialog = await getAddDialog();
    const drawer = openVariantDrawer(dialog);

    const file = new File(["%PDF-1.7"], "spec.pdf", { type: "application/pdf" });
    fireEvent.change(within(drawer).getByLabelText("Upload attachment"), {
      target: { files: [file] },
    });

    await screen.findByText("Stored spec.pdf (2 KB).");
    expect(within(drawer).getByText("spec.pdf")).toBeInTheDocument();
    expect(within(drawer).getByRole("button", { name: "Remove attachment spec.pdf" })).toBeInTheDocument();
    expect(within(drawer).queryByRole("link", { name: "Download attachment spec.pdf" })).not.toBeInTheDocument();
  });

  it("offers a brokered download control for persisted variant attachments", async () => {
    const attachmentId = "11111111-1111-4111-8111-111111111111";
    renderAddModal({
      editingItem: makeEditingItem({
        priceOptionId: "option-default",
        priceOptions: [
          {
            id: "option-default",
            label: "Default",
            variantSortOrder: 0,
            unit: "unit",
            unitCost: 2500,
            miscCost: 0,
            currency: "PHP",
            isActive: true,
            isDefault: true,
            attachments: [
              {
                id: attachmentId,
                assetId: "22222222-2222-4222-8222-222222222222",
                bucket: "component-attachments",
                path: "workspace-1/user-1/spec.pdf",
                fileName: "spec.pdf",
                contentType: "application/pdf",
                sizeBytes: 2048,
                kind: "pdf",
                scanStatus: "clean",
                reviewStatus: "uploaded",
                isCurrentApproved: false,
              },
            ],
          },
          {
            id: "option-alternate",
            label: "Alternate",
            variantSortOrder: 1,
            unit: "unit",
            unitCost: 2600,
            miscCost: 0,
            currency: "PHP",
            isActive: true,
            isDefault: false,
            attachments: [],
          },
        ],
      }),
      onComponentUpdated: vi.fn(),
    });

    const dialog = await getEditDialog();
    const drawer = openVariantManager(dialog);
    fireEvent.click(within(drawer).getByRole("button", { name: "Open V-1 — Default" }));

    expect(within(drawer).getByRole("link", { name: "Download attachment spec.pdf" })).toHaveAttribute(
      "href",
      `/api/component-library/attachments?id=${attachmentId}`,
    );
  });

  it("keeps Activity fields because they exist in the OpenDesign component", async () => {
    renderAddModal();
    const dialog = await getAddDialog();

    fireEvent.click(within(dialog).getByRole("tab", { name: "Activity" }));

    const activityPanel = within(dialog).getByRole("tabpanel", { name: "Activity" });
    expect(within(activityPanel).getByRole("combobox", { name: "Component state" })).toHaveTextContent("Available");
    expect(within(activityPanel).getByLabelText("Effective date")).toBeInTheDocument();
    expect(within(activityPanel).getByLabelText("Currency")).toHaveValue("PHP");
    expect(within(activityPanel).getByLabelText("Change note")).toBeInTheDocument();
  });

  it("shows a non-blocking duplicate warning as identity fields change without requiring name blur", async () => {
    renderAddModal({ libraryItems: duplicateRows, selectedFolderId: "folder-hardware" });
    const dialog = await getAddDialog();
    const form = within(dialog).getByRole("form", { name: "Quick add component" });

    fireEvent.change(within(form).getByRole("combobox", { name: "Supplier" }), { target: { value: "Acme" } });
    const name = within(form).getByLabelText("Name");
    fireEvent.change(name, { target: { value: "Door Hinge" } });

    await screen.findByText('A component named "Door Hinge" already exists.');
    fireEvent.click(within(form).getByRole("button", { name: "Create anyway" }));
    expect(screen.queryByText(/already exists/)).not.toBeInTheDocument();
  });

  it("uses the workspace-wide server preflight and requires explicit create-anyway acknowledgement", async () => {
    actionMocks.findCurrentWorkspaceCostLibraryComponentDuplicate.mockResolvedValue({
      itemId: "component-outside-loaded-page",
      name: "Door Stop",
      category: "Hardware",
      supplier: "Acme",
      brand: null,
    });
    renderAddModal({ libraryItems: [], selectedFolderId: "folder-hardware" });
    const dialog = await getAddDialog();
    fillValidQuickAdd(dialog);

    fireEvent.click(within(dialog).getByRole("button", { name: "Add Component" }));

    await screen.findByText('A component named "Door Stop" already exists.');
    expect(actionMocks.findCurrentWorkspaceCostLibraryComponentDuplicate).toHaveBeenCalledWith({
      name: "Door Stop",
      category: "Hardware",
      supplier: "Acme",
      brand: null,
    });
    expect(actionMocks.createCostLibraryComponent).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Create anyway" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Add Component" }));

    await waitFor(() => expect(actionMocks.createCostLibraryComponent).toHaveBeenCalledTimes(1));
    expect(actionMocks.createCostLibraryComponent).toHaveBeenCalledWith(expect.objectContaining({
      allowDuplicate: true,
      intentId: expect.any(String),
      name: "Door Stop",
    }));
  });

  it("keeps a duplicate acknowledgement when a catalogue input reports its current value", async () => {
    renderAddModal({ libraryItems: duplicateRows, selectedFolderId: "folder-hardware" });
    const dialog = await getAddDialog();
    const form = within(dialog).getByRole("form", { name: "Quick add component" });

    fireEvent.change(within(form).getByRole("combobox", { name: "Supplier" }), { target: { value: "Acme" } });
    const name = within(form).getByLabelText("Name");
    fireEvent.change(name, { target: { value: "Door Hinge" } });
    fireEvent.blur(name);

    await screen.findByText('A component named "Door Hinge" already exists.');
    fireEvent.click(within(form).getByRole("button", { name: "Create anyway" }));
    fireEvent.change(within(form).getByRole("combobox", { name: "Supplier" }), { target: { value: "Acme" } });

    expect(screen.queryByText(/already exists/)).not.toBeInTheDocument();
  });

  it("does not show add-mode duplicate warnings while editing a component", async () => {
    renderAddModal({
      editingItem: makeEditingItem(),
      libraryItems: [
        {
          ...makeEditingItem(),
          id: "different-component-same-identity",
        },
      ],
      onComponentUpdated: vi.fn(),
    });
    const dialog = await getEditDialog();
    const form = within(dialog).getByRole("form", { name: "Quick add component" });
    const name = within(form).getByLabelText("Name");

    fireEvent.blur(name);
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
    });

    expect(screen.queryByText(/already exists/)).not.toBeInTheDocument();
    expect(within(form).queryByRole("button", { name: "Create anyway" })).not.toBeInTheDocument();
  });

  it("brokers existing component-library storage thumbnails in edit mode", async () => {
    const imagePath = "11111111-1111-4111-8111-111111111111/user-1/component-images/pergo-thumb.webp";
    renderAddModal({
      editingItem: makeEditingItem({ imageUrl: imagePath }),
      onComponentUpdated: vi.fn(),
    });
    const dialog = await getEditDialog();

    const image = within(dialog).getByAltText("Component thumbnail preview") as HTMLImageElement;
    const renderedSrc = decodeURIComponent(image.getAttribute("src") ?? "");
    expect(renderedSrc).toContain("/api/component-library/images?path=");
    expect(renderedSrc).toContain(imagePath);
  });

  it("brokers existing project image storage thumbnails in edit mode", async () => {
    const imagePath = [
      "11111111-1111-4111-8111-111111111111",
      "user-1",
      "project-images",
      "22222222-2222-4222-8222-222222222222",
      "estimate-row-images",
      "33333333-3333-4333-8333-333333333333",
      "pergo-thumb.webp",
    ].join("/");
    renderAddModal({
      editingItem: makeEditingItem({ imageUrl: imagePath }),
      onComponentUpdated: vi.fn(),
    });
    const dialog = await getEditDialog();

    const image = within(dialog).getByAltText("Component thumbnail preview") as HTMLImageElement;
    const renderedSrc = decodeURIComponent(image.getAttribute("src") ?? "");
    expect(renderedSrc).toContain("/api/projects/images?path=");
    expect(renderedSrc).toContain(imagePath);
  });

  it("saves edited components with a brokered thumbnail URL", async () => {
    const imagePath = "11111111-1111-4111-8111-111111111111/user-1/component-images/pergo-thumb.webp";
    const onComponentUpdated = vi.fn();
    renderAddModal({
      editingItem: makeEditingItem({ imageUrl: imagePath }),
      onComponentUpdated,
    });
    const dialog = await getEditDialog();

    fireEvent.click(within(dialog).getByRole("button", { name: "Save Component" }));

    await waitFor(() => expect(onComponentUpdated).toHaveBeenCalledTimes(1));
    expect(actionMocks.createCostLibraryComponent).not.toHaveBeenCalled();
    const updatedItem = onComponentUpdated.mock.calls[0][0] as EstimateRowItem;
    const imageUrl = decodeURIComponent(updatedItem.imageUrl ?? "");
    expect(imageUrl).toContain("/api/component-library/images?path=");
    expect(imageUrl).toContain(imagePath);
  });

  it("keeps the authoritative server revision after editing a linked component", async () => {
    const onComponentUpdated = vi.fn();
    renderAddModal({
      editingItem: makeEditingItem({
        id: "component-created",
        source: "library",
        sourceLibraryItemId: "component-created",
        updatedAt: "2026-07-13T10:00:00.000Z",
      }),
      onComponentUpdated,
    });
    const dialog = await getEditDialog();

    fireEvent.click(within(dialog).getByRole("button", { name: "Save Component" }));

    await waitFor(() => expect(onComponentUpdated).toHaveBeenCalledTimes(1));
    expect(actionMocks.updateCostLibraryComponentWithPriceOptions).toHaveBeenCalledTimes(1);
    expect(actionMocks.updateCostLibraryComponentWithPriceOptions).toHaveBeenCalledWith(
      "component-created",
      expect.objectContaining({
        expectedUpdatedAt: "2026-07-13T10:00:00.000Z",
        expectedVersionNumber: 1,
        intentId: expect.any(String),
      }),
    );
    const updatedItem = onComponentUpdated.mock.calls[0][0] as EstimateRowItem;
    expect(updatedItem.componentVersionNumber).toBe(2);
    expect(updatedItem.updatedAt).toBe("2026-07-13T11:00:00.000Z");
  });

  it("reuses the retained update intent when an unchanged save is retried", async () => {
    actionMocks.updateCostLibraryComponentWithPriceOptions.mockRejectedValueOnce(new Error("Connection interrupted."));
    const onComponentUpdated = vi.fn();
    renderAddModal({
      editingItem: makeEditingItem({
        id: "component-created",
        source: "library",
        sourceLibraryItemId: "component-created",
      }),
      onComponentUpdated,
    });
    const dialog = await getEditDialog();

    fireEvent.click(within(dialog).getByRole("button", { name: "Save Component" }));
    await within(dialog).findByText("Connection interrupted.");
    fireEvent.click(await within(dialog).findByRole("button", { name: "Save Component" }));

    await waitFor(() => expect(onComponentUpdated).toHaveBeenCalledTimes(1));
    expect(actionMocks.updateCostLibraryComponentWithPriceOptions).toHaveBeenCalledTimes(2);
    const firstIntentId = actionMocks.updateCostLibraryComponentWithPriceOptions.mock.calls[0]?.[1]?.intentId;
    const secondIntentId = actionMocks.updateCostLibraryComponentWithPriceOptions.mock.calls[1]?.[1]?.intentId;
    expect(firstIntentId).toMatch(/^[0-9a-f-]{36}$/u);
    expect(secondIntentId).toBe(firstIntentId);
  });

  it("persists a newly added Library variant through save and reopen", async () => {
    const defaultOptionId = "11111111-1111-4111-8111-111111111111";
    const persistedOptionId = "22222222-2222-4222-8222-222222222222";
    const editingItem = makeEditingItem({
      id: "component-created",
      source: "library",
      sourceLibraryItemId: "component-created",
      priceOptionId: defaultOptionId,
      priceOptionLabel: "Default",
      priceOptions: [
        {
          id: defaultOptionId,
          label: "Default",
          unit: "unit",
          unitCost: 2500,
          miscCost: 0,
          currency: "PHP",
          isActive: true,
          isDefault: true,
        },
      ],
    });
    actionMocks.updateCostLibraryComponentWithPriceOptions.mockImplementationOnce(async (itemId, input) => {
      const persistedPriceOptions = input.priceOptions.map((option, index) => ({
        ...option,
        id: option.id ?? persistedOptionId,
        miscCost: option.costEntries?.[0]?.miscCost ?? 0,
        currency: option.costEntries?.[0]?.currency ?? "PHP",
        isActive: true,
        isDefault: index === 0,
      }));
      return {
        itemId,
        activePriceOptionId: defaultOptionId,
        versionNumber: 2,
        updatedAt: "2026-07-13T11:00:00.000Z",
        affectedEstimates: [],
        rowRevisions: {},
        rowPatches: {},
        updatedRowCount: 0,
        component: {
          ...editingItem,
          priceOptions: persistedPriceOptions,
          componentVersionNumber: 2,
          updatedAt: "2026-07-13T11:00:00.000Z",
        },
      };
    });
    const onComponentUpdated = vi.fn();
    const initialRender = render(
      <AddComponentModal
        {...makeAddModalProps({ editingItem, onComponentUpdated })}
      />,
    );
    const dialog = await getEditDialog();
    const drawer = openVariantManager(dialog);

    clickAddVariant(drawer);
    fireEvent.change(within(drawer).getByLabelText("Variant unit cost"), { target: { value: "375" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save Component" }));

    await waitFor(() => expect(actionMocks.updateCostLibraryComponentWithPriceOptions).toHaveBeenCalledTimes(1));
    const payload = actionMocks.updateCostLibraryComponentWithPriceOptions.mock.calls[0][1];
    expect(payload.priceOptions).toHaveLength(2);
    expect(payload.priceOptions[1]).toMatchObject({
      id: undefined,
      label: "Option 2",
      unitCost: 375,
      isDefault: false,
    });
    await waitFor(() => expect(onComponentUpdated).toHaveBeenCalledTimes(1));
    const persistedItem = onComponentUpdated.mock.calls[0][0] as EstimateRowItem;
    expect(persistedItem.priceOptions?.[1]).toMatchObject({
      id: persistedOptionId,
      label: "Option 2",
      unitCost: 375,
    });

    initialRender.unmount();
    renderAddModal({ editingItem: persistedItem, onComponentUpdated: vi.fn() });
    const reopenedDialog = await getEditDialog();
    const reopenedDrawer = openVariantManager(reopenedDialog);
    expect(within(reopenedDrawer).getByRole("button", { name: "Open V-2 — Option 2" })).toBeInTheDocument();
    expect(within(reopenedDrawer).getByRole("button", { name: /^Option 2PHP/u })).toBeInTheDocument();
  });

  it("reorders variants without changing their stable IDs or explicit default", async () => {
    const defaultOptionId = "11111111-1111-4111-8111-111111111111";
    const secondOptionId = "22222222-2222-4222-8222-222222222222";
    const thirdOptionId = "33333333-3333-4333-8333-333333333333";
    renderAddModal({
      editingItem: makeEditingItem({
        id: "component-created",
        source: "library",
        sourceLibraryItemId: "component-created",
        priceOptionId: secondOptionId,
        priceOptionLabel: "Option 2",
        priceOptions: [
          { id: defaultOptionId, label: "Default", unit: "unit", unitCost: 2500, miscCost: 0, currency: "PHP", isActive: true, isDefault: true },
          { id: secondOptionId, label: "Option 2", unit: "unit", unitCost: 2600, miscCost: 0, currency: "PHP", isActive: true, isDefault: false },
          { id: thirdOptionId, label: "Option 3", unit: "unit", unitCost: 2700, miscCost: 0, currency: "PHP", isActive: true, isDefault: false },
        ],
      }),
      onComponentUpdated: vi.fn(),
    });
    const dialog = await getEditDialog();
    const drawer = openVariantManager(dialog);

    fireEvent.click(within(drawer).getByRole("button", { name: "Move Option 3 up" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Save Component" }));

    await waitFor(() => expect(actionMocks.updateCostLibraryComponentWithPriceOptions).toHaveBeenCalledTimes(1));
    const payload = actionMocks.updateCostLibraryComponentWithPriceOptions.mock.calls[0][1];
    expect(payload.priceOptions.map((option: { id?: string }) => option.id)).toEqual([
      defaultOptionId,
      thirdOptionId,
      secondOptionId,
    ]);
    expect(payload.priceOptions.find((option: { id?: string }) => option.id === defaultOptionId)?.isDefault).toBe(true);
    expect(payload.priceOptions.find((option: { id?: string }) => option.id === secondOptionId)?.isDefault).toBe(false);
    expect(payload.priceOptions.find((option: { id?: string }) => option.id === thirdOptionId)?.isDefault).toBe(false);
  });

  it("reports pending only for the project variant edited in the full component editor", async () => {
    const defaultOptionId = "11111111-1111-4111-8111-111111111111";
    const secondOptionId = "22222222-2222-4222-8222-222222222222";
    const editingItem = makeEditingItem({
      source: "project",
      sourceLibraryItemId: null,
      priceOptionId: defaultOptionId,
      priceOptionLabel: "Default",
      priceOptions: [
        { id: defaultOptionId, label: "Default", variantDescription: "Standard", unit: "unit", unitCost: 2500, miscCost: 0, currency: "PHP", isActive: true, isDefault: true },
        { id: secondOptionId, label: "Option 2", variantDescription: "Premium", unit: "unit", unitCost: 2750, miscCost: 0, currency: "PHP", isActive: true, isDefault: false },
      ],
    });
    const onComponentUpdatePendingChange = vi.fn();
    const onComponentUpdated = vi.fn().mockResolvedValue(undefined);
    renderAddModal({
      editingItem,
      componentEditScope: "project",
      onComponentUpdated,
      onComponentUpdatePendingChange,
    });

    const dialog = await getEditDialog();
    const drawer = openVariantManager(dialog);
    fireEvent.click(within(drawer).getByRole("button", { name: "Open V-2 — Option 2" }));
    fireEvent.change(within(drawer).getByLabelText("Variant Name"), { target: { value: "Premium" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save Component" }));

    await waitFor(() => expect(onComponentUpdated).toHaveBeenCalledTimes(1));
    expect(onComponentUpdatePendingChange.mock.calls[0]).toEqual([
      editingItem,
      true,
      { kind: "variants", priceOptionIds: [secondOptionId] },
    ]);
    await waitFor(() => expect(onComponentUpdatePendingChange).toHaveBeenLastCalledWith(
      editingItem,
      false,
      { kind: "variants", priceOptionIds: [secondOptionId] },
    ));
  });

  it("reports component-wide pending when the component identity changes", async () => {
    const editingItem = makeEditingItem({
      source: "project",
      sourceLibraryItemId: null,
    });
    const onComponentUpdatePendingChange = vi.fn();
    renderAddModal({
      editingItem,
      componentEditScope: "project",
      onComponentUpdated: vi.fn().mockResolvedValue(undefined),
      onComponentUpdatePendingChange,
    });

    const dialog = await getEditDialog();
    fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "Updated shared component" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save Component" }));

    await waitFor(() => expect(onComponentUpdatePendingChange).toHaveBeenCalledWith(
      editingItem,
      true,
      { kind: "component" },
    ));
  });

  it("uses component-owned storage when a Library component is created from a project surface", async () => {
    const projectImageProjectId = "22222222-2222-4222-8222-222222222222";
    const thumbnailUrl = "/api/component-library/images?path=workspace-1/user-1/component-images/oak-thumb.webp";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      bucket: "component-images",
      path: "workspace-1/user-1/component-images/oak.webp",
      thumbnailPath: "workspace-1/user-1/component-images/oak-thumb.webp",
      url: "/api/component-library/images?path=workspace-1/user-1/component-images/oak.webp",
      thumbnailUrl,
      originalBytes: 16,
      optimizedBytes: 12,
      contentType: "image/webp",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    renderAddModal({ imageUploadProjectId: projectImageProjectId });
    const dialog = await getAddDialog();

    const drawer = openVariantManager(dialog);
    expect(within(drawer).getByText("No variants yet.")).toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole("button", { name: "Close variants panel" }));

    const file = new File(["fake-image-bytes"], "oak.png", { type: "image/png" });
    const thumbnailInput = within(dialog).getByLabelText("Upload thumbnail") as HTMLInputElement;
    let selectedFiles: File[] = [file];
    Object.defineProperty(thumbnailInput, "files", {
      configurable: true,
      get: () => selectedFiles,
    });
    Object.defineProperty(thumbnailInput, "value", {
      configurable: true,
      get: () => selectedFiles[0]?.name ?? "",
      set: (value: string) => {
        if (value === "") selectedFiles = [];
      },
    });
    const createObjectUrlMock = vi.spyOn(URL, "createObjectURL").mockImplementation(() => {
      if (selectedFiles.length === 0) throw new Error("The native file selection was cleared too early.");
      return "blob:oak-preview";
    });

    fireEvent.change(thumbnailInput);

    await screen.findByText(/Stored WebP thumbnail/);
    expect(createObjectUrlMock).toHaveBeenCalledWith(file);
    expect(selectedFiles).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledWith("/api/component-library/images", expect.objectContaining({ method: "POST" }));
    expect(within(dialog).getByAltText("Component thumbnail preview")).toBeInTheDocument();
    const updatedDrawer = openVariantManager(dialog);
    expect(within(updatedDrawer).getByText("No variants yet.")).toBeInTheDocument();
    expect(within(updatedDrawer).getByRole("button", { name: "Default" })).toBeDisabled();
  });

  it("uploads edit-mode thumbnails through the project image route when a project id is provided", async () => {
    const projectImageProjectId = "22222222-2222-4222-8222-222222222222";
    const thumbnailUrl = "/api/projects/images?assetId=asset-1&variant=thumbnail";
    const onComponentUpdated = vi.fn();
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      assetId: "asset-1",
      uploadSessionId: "session-1",
      bucket: "project-images",
      path: "workspace-1/user-1/project-images/22222222-2222-4222-8222-222222222222/pergo.webp",
      thumbnailPath: "workspace-1/user-1/project-images/22222222-2222-4222-8222-222222222222/pergo-thumb.webp",
      url: "/api/projects/images?assetId=asset-1&variant=image",
      thumbnailUrl,
      fileName: "pergo.png",
      originalBytes: 16,
      originalContentType: "image/png",
      sizeBytes: 12,
      optimizedBytes: 12,
      contentType: "image/webp",
      width: 1200,
      height: 900,
      thumbnailWidth: 512,
      thumbnailHeight: 384,
      checksumSha256: "a".repeat(64),
      scanStatus: "not_required",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    renderAddModal({
      editingItem: makeEditingItem({
        source: "project",
        sourceLibraryItemId: null,
      }),
      componentEditScope: "project",
      imageUploadProjectId: projectImageProjectId,
      projectComponentId: "33333333-3333-4333-8333-333333333333",
      onComponentUpdated,
    });
    const dialog = await getEditDialog();

    const file = new File(["fake-image-bytes"], "pergo.png", { type: "image/png" });
    fireEvent.change(within(dialog).getByLabelText("Upload thumbnail"), {
      target: { files: [file] },
    });

    await screen.findByText(/Stored WebP thumbnail/);
    expect(fetchMock).toHaveBeenCalledWith("/api/projects/images", expect.objectContaining({ method: "POST" }));
    const formData = fetchMock.mock.calls[0][1]?.body as FormData;
    expect(formData.get("projectId")).toBe(projectImageProjectId);

    fireEvent.click(within(dialog).getByRole("button", { name: "Save Component" }));

    await waitFor(() => expect(onComponentUpdated).toHaveBeenCalledTimes(1));
    const updatedItem = onComponentUpdated.mock.calls[0][0] as EstimateRowItem;
    expect(updatedItem.imageUrl).toBe(thumbnailUrl);
    expect(updatedItem.priceOptions?.[0]?.thumbnailPath).toBe(thumbnailUrl);
  });

  it("binds project component attachment uploads to the edited project component", async () => {
    const projectId = "22222222-2222-4222-8222-222222222222";
    const projectComponentId = "77777777-7777-4777-8777-777777777777";
    const estimateRowId = "66666666-6666-4666-8666-666666666666";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      bucket: "component-attachments",
      path: `${projectId}/user-1/spec.pdf`,
      fileName: "spec.pdf",
      contentType: "application/pdf",
      sizeBytes: 2048,
      uploadSessionId: "88888888-8888-4888-8888-888888888888",
      assetId: "99999999-9999-4999-8999-999999999999",
      scanStatus: "pending",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    renderAddModal({
      editingItem: makeEditingItem({
        id: estimateRowId,
        source: "project",
        sourceLibraryItemId: null,
      }),
      componentEditScope: "project",
      imageUploadProjectId: projectId,
      projectComponentId,
    });

    const dialog = await getEditDialog();
    const drawer = openVariantDrawer(dialog);
    fireEvent.change(within(drawer).getByLabelText("Upload attachment"), {
      target: { files: [new File(["%PDF-1.7"], "spec.pdf", { type: "application/pdf" })] },
    });

    await screen.findByText("Stored spec.pdf (2 KB).");
    const formData = fetchMock.mock.calls[0][1]?.body as FormData;
    expect(formData.get("projectId")).toBe(projectId);
    expect(formData.get("projectComponentId")).toBe(projectComponentId);
    expect(formData.get("projectComponentId")).not.toBe(estimateRowId);

    fireEvent.click(within(drawer).getByRole("button", { name: "Remove attachment spec.pdf" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const deleteRequest = fetchMock.mock.calls[1][1];
    expect(deleteRequest?.method).toBe("DELETE");
    expect(JSON.parse(String(deleteRequest?.body))).toMatchObject({
      projectId,
      projectComponentId,
    });
  });

  it("keeps detached project edits out of the Library update path", async () => {
    const onComponentUpdated = vi.fn();
    renderAddModal({
      editingItem: makeEditingItem({
        source: "project",
        sourceLibraryItemId: "historical-library-component",
        linkState: "detached",
      }),
      componentEditScope: "project",
      imageUploadProjectId: "22222222-2222-4222-8222-222222222222",
      projectComponentId: "77777777-7777-4777-8777-777777777777",
      onComponentUpdated,
    });

    const dialog = await getEditDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: "Save Component" }));

    await waitFor(() => expect(onComponentUpdated).toHaveBeenCalledTimes(1));
    expect(actionMocks.updateCostLibraryComponentWithPriceOptions).not.toHaveBeenCalled();
  });

  it("normalizes duplicate identity whitespace and supports brand-only matches", async () => {
    renderAddModal({
      libraryItems: [...duplicateRows, ...brandDuplicateRows],
      selectedFolderId: "folder-hardware",
    });
    const dialog = await getAddDialog();
    const form = within(dialog).getByRole("form", { name: "Quick add component" });

    fireEvent.change(within(form).getByRole("combobox", { name: "Supplier" }), { target: { value: "Acme" } });
    const name = within(form).getByLabelText("Name");
    fireEvent.change(name, { target: { value: "  door    hinge  " } });
    fireEvent.blur(name);

    await screen.findByText('A component named "Door Hinge" already exists.');

    fireEvent.change(within(form).getByRole("combobox", { name: "Supplier" }), { target: { value: "" } });
    fireEvent.change(within(form).getByRole("combobox", { name: "Brand" }), { target: { value: "Hinge Co" } });
    fireEvent.change(name, { target: { value: "Concealed Pull" } });
    fireEvent.blur(name);

    await screen.findByText('A component named "Concealed Pull" already exists.');
    fireEvent.click(within(form).getByRole("button", { name: "Create anyway" }));
    fireEvent.change(within(form).getByLabelText("Unit cost"), { target: { value: "45.50" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add Component" }));

    await waitFor(() => expect(actionMocks.createCostLibraryComponent).toHaveBeenCalledTimes(1));
  });
});
