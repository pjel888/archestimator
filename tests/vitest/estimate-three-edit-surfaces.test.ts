import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AddComponentModal } from "@/components/workshop/component-library-manager/AddComponentModal";
import { EditComponentDrawer } from "@/components/workshop/library/EditComponentDrawer";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import type { LibraryFolderRecord } from "@/lib/component-library/library-folder-reorder";
import type { EstimateRowItem } from "@/lib/estimates/types";

const actionMocks = vi.hoisted(() => ({
  createCostLibraryComponent: vi.fn(),
  saveCostLibraryComponentDraft: vi.fn(),
  updateCostLibraryComponent: vi.fn(),
  updateCostLibraryComponentWithPriceOptions: vi.fn(),
  upsertCostLibraryComponentPriceOption: vi.fn(),
}));

vi.mock("@/lib/component-library/actions", () => actionMocks);

const categoryTree: ComponentLibraryTaxonomyNode[] = [{
  id: "category-hardware",
  label: "Hardware",
  kind: "category",
}];

const folders: LibraryFolderRecord[] = [{
  id: "folder-hardware",
  workspace_id: "workspace-1",
  parent_id: null,
  name: "Hardware",
  sort_order: 10,
  source_category_node_id: "category-hardware",
  folder_kind: "custom",
}];

const libraryItem: EstimateRowItem = {
  id: "library-component-1",
  material: "Door Stop",
  name: "Door Stop",
  description: "Existing master component",
  supplier: "Acme",
  source: "library",
  unit: "pc",
  itemCost: 125,
  quantity: 1,
  subTotal: 125,
  contingencyPercentage: 0,
  contingencyValue: 0,
  miscCost: 0,
  totalItemCosts: 125,
  category: "Hardware",
  pricingSource: "Fixture",
  pricingDate: "2026-07-11",
  componentVersionNumber: 1,
  updatedAt: "2026-07-13T09:00:00.000Z",
};

describe("estimate component edit-surface ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a library master through Add Component without invoking the master-update path", async () => {
    actionMocks.createCostLibraryComponent.mockResolvedValueOnce({
      itemId: "created-component",
      activePriceOptionId: "price-1",
      versionNumber: 1,
      createdAt: "2026-07-13T09:00:00.000Z",
      updatedAt: "2026-07-13T09:00:00.000Z",
    });

    render(createElement(AddComponentModal, {
      open: true,
      folders,
      categoryTree,
      suppliers: [{ id: "supplier-acme", name: "Acme", sort_order: 1 }],
      brands: [],
      libraryItems: [],
      selectedFolderId: "folder-hardware",
      catalogueOptionsStorageScope: "three-edit-surfaces",
      onOpenChange: vi.fn(),
      onComponentCreated: vi.fn(),
    }));

    const dialog = await screen.findByRole("dialog", { name: "Add Component" });
    const form = within(dialog).getByRole("form", { name: "Quick add component" });
    fireEvent.change(within(form).getByLabelText("Name"), { target: { value: "New Door Stop" } });
    fireEvent.change(within(form).getByRole("combobox", { name: "Category" }), { target: { value: "Hardware" } });
    fireEvent.change(within(form).getByRole("combobox", { name: "Supplier" }), { target: { value: "Acme" } });
    fireEvent.change(within(form).getByLabelText("Unit cost"), { target: { value: "125" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add Component" }));

    await waitFor(() => expect(actionMocks.createCostLibraryComponent).toHaveBeenCalledOnce());
    expect(actionMocks.createCostLibraryComponent).toHaveBeenCalledWith(expect.objectContaining({ name: "New Door Stop" }));
    expect(actionMocks.updateCostLibraryComponent).not.toHaveBeenCalled();
  });

  it("edits a library master through Edit Component Drawer without creating another component", async () => {
    actionMocks.updateCostLibraryComponent.mockResolvedValueOnce({
      itemId: libraryItem.id,
      versionNumber: 2,
      updatedAt: "2026-07-13T10:00:00.000Z",
    });
    const onSaved = vi.fn();

    render(createElement(EditComponentDrawer, {
      item: libraryItem,
      open: true,
      onOpenChange: vi.fn(),
      onSaved,
    }));

    const drawer = await screen.findByRole("dialog", { name: "Edit component" });
    fireEvent.change(within(drawer).getByDisplayValue("Door Stop"), { target: { value: "Door Stop Premium" } });
    fireEvent.click(within(drawer).getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(actionMocks.updateCostLibraryComponent).toHaveBeenCalledWith(
      libraryItem.id,
      expect.objectContaining({
        name: "Door Stop Premium",
        unitCost: 125,
        miscCost: 0,
        expectedUpdatedAt: libraryItem.updatedAt,
        expectedVersionNumber: libraryItem.componentVersionNumber,
      }),
    ));
    expect(actionMocks.updateCostLibraryComponent.mock.calls[0]?.[1]).not.toHaveProperty("priceOptions");
    expect(actionMocks.updateCostLibraryComponentWithPriceOptions).not.toHaveBeenCalled();
    expect(actionMocks.upsertCostLibraryComponentPriceOption).not.toHaveBeenCalled();
    expect(actionMocks.createCostLibraryComponent).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({
      id: libraryItem.id,
      material: "Door Stop Premium",
      componentVersionNumber: 2,
      updatedAt: "2026-07-13T10:00:00.000Z",
    }));
  });
});
