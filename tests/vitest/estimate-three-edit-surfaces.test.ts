import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AddComponentModal } from "@/components/workshop/component-library-manager/AddComponentModal";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import type { LibraryFolderRecord } from "@/lib/component-library/library-folder-reorder";

const actionMocks = vi.hoisted(() => ({
  createCostLibraryComponent: vi.fn(),
  findCurrentWorkspaceCostLibraryComponentDuplicate: vi.fn(),
  saveCostLibraryComponentDraft: vi.fn(),
  updateCostLibraryComponentWithPriceOptions: vi.fn(),
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

describe("estimate component edit-surface ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actionMocks.findCurrentWorkspaceCostLibraryComponentDuplicate.mockResolvedValue(null);
  });

  it("creates a library master through Add Component without invoking the master-update path", async () => {
    actionMocks.createCostLibraryComponent.mockResolvedValueOnce({
      itemId: "created-component",
      activePriceOptionId: "price-1",
      versionNumber: 1,
      createdAt: "2026-07-13T09:00:00.000Z",
      updatedAt: "2026-07-13T09:00:00.000Z",
      component: {
        id: "created-component",
        material: "New Door Stop",
        name: "New Door Stop",
      },
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
    expect(within(form).getByLabelText("Direct category")).toHaveValue("Hardware");
    fireEvent.change(within(form).getByRole("combobox", { name: "Supplier" }), { target: { value: "Acme" } });
    fireEvent.change(within(form).getByLabelText("Unit cost"), { target: { value: "125" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add Component" }));

    await waitFor(() => expect(actionMocks.createCostLibraryComponent).toHaveBeenCalledOnce());
    expect(actionMocks.createCostLibraryComponent).toHaveBeenCalledWith(expect.objectContaining({ name: "New Door Stop" }));
    expect(actionMocks.updateCostLibraryComponentWithPriceOptions).not.toHaveBeenCalled();
  });

  it("keeps the full Add/Edit modal as the only advanced Library editor", () => {
    const reducedDrawerPath = join(process.cwd(), "src/components/workshop/library/EditComponentDrawer.tsx");
    const managerSource = readFileSync(
      join(process.cwd(), "src/components/workshop/component-library-manager/ComponentLibraryManager.tsx"),
      "utf8",
    );

    expect(existsSync(reducedDrawerPath)).toBe(false);
    expect(managerSource).toContain("AddComponentModal");
    expect(managerSource).not.toContain("EditComponentDrawer");
  });

  it("routes both full and inline Library edits through the ordered option graph action", () => {
    const estimateSheetSource = readFileSync(
      join(process.cwd(), "src/components/workshop/EstimateSheetContent.tsx"),
      "utf8",
    );
    const actionSource = readFileSync(
      join(process.cwd(), "src/lib/component-library/actions.ts"),
      "utf8",
    );

    expect(estimateSheetSource).toContain("updateCostLibraryComponentWithPriceOptions");
    expect(actionSource).toContain("export async function updateCostLibraryComponentWithPriceOptions");
    expect(actionSource).not.toMatch(/export async function updateCostLibraryComponent\(/u);
  });
});
