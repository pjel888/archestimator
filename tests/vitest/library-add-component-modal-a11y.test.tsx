import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ComponentProps } from "react";

import { AddComponentModal } from "@/components/workshop/component-library-manager/AddComponentModal";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import type { LibraryFolderRecord } from "@/lib/component-library/library-folder-reorder";
import type { EstimateRowItem } from "@/lib/estimates/types";

const actionMocks = vi.hoisted(() => ({
  createCostLibraryComponent: vi.fn(),
  saveCostLibraryComponentDraft: vi.fn(),
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

function renderAddModal(overrides: Partial<ComponentProps<typeof AddComponentModal>> = {}) {
  const props: ComponentProps<typeof AddComponentModal> = {
    open: true,
    folders,
    categoryTree,
    suppliers: [{ id: "supplier-acme", name: "Acme", sort_order: 1 }],
    brands: [{ id: "brand-hinge", name: "Hinge Co", normalized_name: "hinge co", sort_order: 1 }],
    libraryItems: [],
    selectedFolderId: null,
    onOpenChange: vi.fn(),
    onComponentCreated: vi.fn(),
    ...overrides,
  };

  render(<AddComponentModal {...props} />);
  return props;
}

async function getAddDialog() {
  return screen.findByRole("dialog", { name: "Add Component" }, { timeout: 10_000 });
}

function fillValidQuickAdd(dialog: HTMLElement) {
  const form = within(dialog).getByRole("form", { name: "Quick add component" });
  fireEvent.change(within(form).getByLabelText("Name"), { target: { value: "Door Stop" } });
  fireEvent.change(within(form).getByRole("combobox", { name: "Category" }), { target: { value: "Hardware" } });
  fireEvent.change(within(form).getByRole("combobox", { name: "Supplier" }), { target: { value: "Acme" } });
  fireEvent.change(within(form).getByLabelText("Unit cost"), { target: { value: "123.456" } });
  return form;
}

function openVariantDrawer(dialog: HTMLElement) {
  fireEvent.click(within(dialog).getByRole("button", { name: "Open variants panel" }));
  fireEvent.click(within(dialog).getByRole("button", { name: "Open V1" }));
  return within(dialog).getByRole("dialog", { name: "Manage variants" });
}

describe("AddComponentModal OpenDesign field contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actionMocks.createCostLibraryComponent.mockResolvedValue({
      itemId: "component-created",
      activePriceOptionId: "price-created",
      versionNumber: 1,
    });
    actionMocks.saveCostLibraryComponentDraft.mockResolvedValue({
      draftId: "component-draft-1",
      savedAt: "2026-07-06T00:00:00.000Z",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exposes only the OpenDesign required fields on the main component form", async () => {
    renderAddModal();

    const dialog = await getAddDialog();
    const form = within(dialog).getByRole("form", { name: "Quick add component" });
    const name = within(form).getByLabelText("Name");
    const category = within(form).getByRole("combobox", { name: "Category" });
    const unit = within(form).getByRole("combobox", { name: "Unit" });
    const unitCost = within(form).getByLabelText("Unit cost");

    expect(name).toHaveAttribute("aria-required", "true");
    expect(category).toHaveAttribute("aria-required", "true");
    expect(unit).toHaveAttribute("aria-required", "true");
    expect(unitCost).toHaveAttribute("aria-required", "true");
    expect(name).not.toHaveAttribute("aria-invalid", "true");
    expect(category).not.toHaveAttribute("aria-invalid", "true");
    expect(unitCost).not.toHaveAttribute("aria-invalid", "true");
    expect(within(dialog).queryByText("Enter a component name.")).not.toBeInTheDocument();
    expect(within(form).getByLabelText("Description")).toBeInTheDocument();
    expect(within(form).getByRole("combobox", { name: "Supplier" })).toBeInTheDocument();
    expect(within(form).getByRole("combobox", { name: "Brand" })).toBeInTheDocument();

    expect(within(dialog).queryByLabelText("Pricing date")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Pricing source")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Confidence")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Source URL")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Misc cost")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Length")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Component nesting")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Add Component" })).not.toBeDisabled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Add Component" }));

    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(category).toHaveAttribute("aria-invalid", "true");
    expect(unitCost).toHaveAttribute("aria-invalid", "true");
    expect(within(dialog).getByText("Enter a component name.")).toBeInTheDocument();
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

    expect(await screen.findByRole("dialog", { name: "Save component draft?" })).toBeInTheDocument();
    expect(nativeConfirm).not.toHaveBeenCalled();
    expect(props.onOpenChange).not.toHaveBeenCalledWith(false);

    nativeConfirm.mockRestore();
  });

  it("keeps the draft open after a failed create and preserves OpenDesign fields", async () => {
    actionMocks.createCostLibraryComponent.mockRejectedValueOnce(new Error("Network down"));
    const props = renderAddModal();
    const dialog = await getAddDialog();
    const form = fillValidQuickAdd(dialog);

    fireEvent.click(within(dialog).getByRole("button", { name: "Add Component" }));

    await screen.findByText("Network down");
    expect(screen.getByRole("dialog", { name: "Add Component" })).toBeInTheDocument();
    expect(within(form).getByLabelText("Name")).toHaveValue("Door Stop");
    expect(within(form).getByRole("combobox", { name: "Category" })).toHaveValue("Hardware");
    expect(within(form).getByRole("combobox", { name: "Supplier" })).toHaveValue("Acme");
    expect(props.onComponentCreated).not.toHaveBeenCalled();
  });

  it("submits a field-contract payload without retired price/source fields", async () => {
    const props = renderAddModal();
    const dialog = await getAddDialog();
    fillValidQuickAdd(dialog);

    fireEvent.click(within(dialog).getByRole("button", { name: "Add Component" }));

    await waitFor(() => expect(actionMocks.createCostLibraryComponent).toHaveBeenCalledTimes(1));
    expect(actionMocks.createCostLibraryComponent).toHaveBeenCalledWith(expect.objectContaining({
      fieldContract: "opendesign-add-component",
      name: "Door Stop",
      category: "Hardware",
      unit: "unit",
      supplier: "Acme",
      priceOptions: [
        expect.objectContaining({
          label: "V1",
          unit: "unit",
          unitCost: 123.46,
          currency: "PHP",
          isDefault: true,
        }),
      ],
    }));
    const payload = actionMocks.createCostLibraryComponent.mock.calls[0][0];
    expect(payload).not.toHaveProperty("libraryFolderId");
    expect(payload.priceOptions[0]).not.toHaveProperty("pricingDate");
    expect(payload.priceOptions[0]).not.toHaveProperty("pricingSource");
    expect(payload.priceOptions[0]).not.toHaveProperty("confidence");
    expect(payload.priceOptions[0]).not.toHaveProperty("sourceUrl");
    expect(payload.priceOptions[0]).not.toHaveProperty("notes");
    expect(payload.priceOptions[0]).not.toHaveProperty("miscCost");
    expect(payload.priceOptions[0]).not.toHaveProperty("dimensionLength");
    expect(payload.priceOptions[0]).not.toHaveProperty("costEntries");
    await waitFor(() => expect(props.onComponentCreated).toHaveBeenCalledTimes(1));
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
    expect(within(drawer).queryByLabelText("Equivalent quantity")).not.toBeInTheDocument();
    expect(within(drawer).queryByRole("combobox", { name: "Equivalent unit" })).not.toBeInTheDocument();

    fireEvent.change(variantUnit, { target: { value: "box" } });

    expect(within(drawer).getByLabelText("Equivalent quantity")).toBeInTheDocument();
    expect(within(drawer).getByRole("combobox", { name: "Equivalent unit" })).toBeInTheDocument();
    expect(within(drawer).getByLabelText("Upload attachment")).toBeInTheDocument();

    expect(within(drawer).queryByLabelText("Pricing date")).not.toBeInTheDocument();
    expect(within(drawer).queryByLabelText("Pricing source")).not.toBeInTheDocument();
    expect(within(drawer).queryByLabelText("Confidence")).not.toBeInTheDocument();
    expect(within(drawer).queryByLabelText("Dimension unit")).not.toBeInTheDocument();
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

  it("shows a non-blocking duplicate warning after the name blur check", async () => {
    renderAddModal({ libraryItems: duplicateRows });
    const dialog = await getAddDialog();
    const form = within(dialog).getByRole("form", { name: "Quick add component" });

    fireEvent.change(within(form).getByRole("combobox", { name: "Category" }), { target: { value: "Hardware" } });
    fireEvent.change(within(form).getByRole("combobox", { name: "Supplier" }), { target: { value: "Acme" } });
    const name = within(form).getByLabelText("Name");
    fireEvent.change(name, { target: { value: "Door Hinge" } });
    fireEvent.blur(name);

    await screen.findByText('A component named "Door Hinge" already exists.');
    fireEvent.click(within(form).getByRole("button", { name: "Create anyway" }));
    expect(screen.queryByText(/already exists/)).not.toBeInTheDocument();
  });

  it("normalizes duplicate identity whitespace and supports brand-only matches", async () => {
    renderAddModal({ libraryItems: [...duplicateRows, ...brandDuplicateRows] });
    const dialog = await getAddDialog();
    const form = within(dialog).getByRole("form", { name: "Quick add component" });

    fireEvent.change(within(form).getByRole("combobox", { name: "Category" }), { target: { value: "Hardware" } });
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
