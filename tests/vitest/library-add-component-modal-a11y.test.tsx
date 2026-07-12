import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState, type ComponentProps } from "react";

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
const catalogueOptionsStoragePrefix = "archestimator:add-component-catalogue-options:v1";

function makeAddModalProps(overrides: Partial<ComponentProps<typeof AddComponentModal>> = {}) {
  return {
    open: true,
    folders,
    categoryTree,
    suppliers: [{ id: "supplier-acme", name: "Acme", sort_order: 1 }],
    brands: [{ id: "brand-hinge", name: "Hinge Co", normalized_name: "hinge co", sort_order: 1 }],
    libraryItems: [],
    selectedFolderId: null,
    catalogueOptionsStorageScope: "catalogue-options-default-test-scope",
    onOpenChange: vi.fn(),
    onComponentCreated: vi.fn(),
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
    ...overrides,
  };
}

function StatefulAddModalHarness({ modalProps }: { modalProps: ComponentProps<typeof AddComponentModal> }) {
  const [open, setOpen] = useState(modalProps.open);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open add component
      </button>
      <AddComponentModal
        {...modalProps}
        open={open}
        onOpenChange={(nextOpen) => {
          modalProps.onOpenChange(nextOpen);
          setOpen(nextOpen);
        }}
      />
    </>
  );
}

function renderStatefulAddModal(overrides: Partial<ComponentProps<typeof AddComponentModal>> = {}) {
  const props = makeAddModalProps({
    catalogueOptionsStorageScope: "catalogue-options-test-scope",
    ...overrides,
  });

  render(<StatefulAddModalHarness modalProps={props} />);
  return props;
}

async function getAddDialog() {
  return screen.findByRole("dialog", { name: "Add Component" }, { timeout: 10_000 });
}

async function getEditDialog() {
  return screen.findByRole("dialog", { name: "Edit Component" }, { timeout: 10_000 });
}

async function createCatalogueOption(
  dialog: HTMLElement,
  fieldName: "Category" | "Supplier" | "Brand",
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

async function pickCatalogueOption(
  dialog: HTMLElement,
  fieldName: "Category" | "Supplier" | "Brand",
  value: string,
  searchValue = value,
) {
  const form = within(dialog).getByRole("form", { name: "Quick add component" });
  const input = within(form).getByRole("combobox", { name: fieldName });
  fireEvent.change(input, { target: { value: searchValue } });
  fireEvent.click(await screen.findByRole("option", { name: value }));
  await waitFor(() => expect(input).toHaveValue(value));
  return input;
}

function fillValidQuickAdd(dialog: HTMLElement) {
  const form = within(dialog).getByRole("form", { name: "Quick add component" });
  fireEvent.change(within(form).getByLabelText("Name"), { target: { value: "Door Stop" } });
  fireEvent.change(within(form).getByRole("combobox", { name: "Category" }), { target: { value: "Hardware" } });
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
    window.localStorage.clear();
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

  it("does not show category-tree values as Add Component category options", async () => {
    renderAddModal();
    const dialog = await getAddDialog();
    const form = within(dialog).getByRole("form", { name: "Quick add component" });
    const category = within(form).getByRole("combobox", { name: "Category" });

    fireEvent.change(category, { target: { value: "Hardware" } });

    expect(screen.queryByRole("option", { name: "Hardware" })).not.toBeInTheDocument();
    expect(await screen.findByRole("option", { name: 'Add category "Hardware"' })).toBeInTheDocument();
  });

  it("does not prefill category from the selected library folder", async () => {
    renderAddModal({ selectedFolderId: "folder-hardware" });
    const dialog = await getAddDialog();
    const form = within(dialog).getByRole("form", { name: "Quick add component" });

    expect(within(form).getByRole("combobox", { name: "Category" })).toHaveValue("");
  });

  it("persists added catalogue options after discarding the component draft", async () => {
    renderStatefulAddModal({ catalogueOptionsStorageScope: "catalogue-options-persist-test" });
    let dialog = await getAddDialog();

    await createCatalogueOption(dialog, "Category", "Custom Millwork");
    await createCatalogueOption(dialog, "Supplier", "Saved Supplier Co");
    await createCatalogueOption(dialog, "Brand", "Saved Brand Line");

    fireEvent.click(screen.getByRole("button", { name: "Close add component modal" }));
    const saveDialog = await screen.findByRole("dialog", { name: "Save component draft?" });
    fireEvent.click(within(saveDialog).getByRole("button", { name: "Discard draft" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Add Component" })).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Open add component" }));
    dialog = await getAddDialog();

    await pickCatalogueOption(dialog, "Category", "Custom Millwork", "Custom");
    await pickCatalogueOption(dialog, "Supplier", "Saved Supplier Co", "Saved Supplier");
    await pickCatalogueOption(dialog, "Brand", "Saved Brand Line", "Saved Brand");
  });

  it("deletes user-added catalogue options from the right side of each dropdown", async () => {
    renderStatefulAddModal({ catalogueOptionsStorageScope: "catalogue-options-delete-test" });
    const dialog = await getAddDialog();

    await createCatalogueOption(dialog, "Category", "Delete Me Category");
    await createCatalogueOption(dialog, "Supplier", "Delete Me Supplier");
    await createCatalogueOption(dialog, "Brand", "Delete Me Brand");

    const form = within(dialog).getByRole("form", { name: "Quick add component" });
    const scenarios = [
      ["Category", "category", "Delete Me Category"],
      ["Supplier", "supplier", "Delete Me Supplier"],
      ["Brand", "brand", "Delete Me Brand"],
    ] as const;

    for (const [fieldName, kind, value] of scenarios) {
      const input = within(form).getByRole("combobox", { name: fieldName });
      fireEvent.change(input, { target: { value: "" } });
      fireEvent.change(input, { target: { value } });
      expect(await screen.findByRole("option", { name: value })).toBeInTheDocument();

      fireEvent.click(await screen.findByRole("button", { name: `Delete ${kind} "${value}"` }));
      await waitFor(() => expect(input).toHaveValue(""));

      fireEvent.change(input, { target: { value } });
      await waitFor(() => expect(screen.queryByRole("option", { name: value })).not.toBeInTheDocument());
      expect(await screen.findByRole("option", { name: `Add ${kind} "${value}"` })).toBeInTheDocument();
    }

    const supplier = within(form).getByRole("combobox", { name: "Supplier" });
    fireEvent.change(supplier, { target: { value: "Acme" } });
    expect(await screen.findByRole("option", { name: "Acme" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: 'Delete supplier "Acme"' })).not.toBeInTheDocument();
  });

  it("sanitizes malformed stored catalogue options before rendering dropdown choices", async () => {
    const scope = "catalogue-options-malformed-test";
    window.localStorage.setItem(`${catalogueOptionsStoragePrefix}:${scope}`, JSON.stringify({
      category: [
        { id: 42, label: "  Odd   Category  " },
        { id: "local-catalogue-option:category:duplicate", label: "Odd Category" },
        { id: "local-catalogue-option:category:blank", label: "   " },
      ],
      supplier: "not-an-array",
      brand: [
        { id: "local-catalogue-option:brand:old-brand", label: " Old Brand " },
      ],
    }));

    renderStatefulAddModal({ catalogueOptionsStorageScope: scope });
    const dialog = await getAddDialog();
    const form = within(dialog).getByRole("form", { name: "Quick add component" });

    const category = within(form).getByRole("combobox", { name: "Category" });
    fireEvent.change(category, { target: { value: "Odd Category" } });
    expect(await screen.findByRole("option", { name: "Odd Category" })).toBeInTheDocument();
    expect(screen.getAllByRole("option", { name: "Odd Category" })).toHaveLength(1);

    const supplier = within(form).getByRole("combobox", { name: "Supplier" });
    fireEvent.change(supplier, { target: { value: "not-an-array" } });
    expect(screen.queryByRole("option", { name: "not-an-array" })).not.toBeInTheDocument();
    expect(await screen.findByRole("option", { name: 'Add supplier "not-an-array"' })).toBeInTheDocument();

    const brand = within(form).getByRole("combobox", { name: "Brand" });
    fireEvent.change(brand, { target: { value: "Old Brand" } });
    expect(await screen.findByRole("option", { name: "Old Brand" })).toBeInTheDocument();
  });

  it("keeps saved catalogue options isolated when the storage scope changes", async () => {
    const scopeA = "catalogue-options-scope-a";
    const scopeB = "catalogue-options-scope-b";
    window.localStorage.setItem(`${catalogueOptionsStoragePrefix}:${scopeB}`, JSON.stringify({
      category: [
        {
          id: "local-catalogue-option:category:scope-b-category",
          label: "Scope B Category",
          createdAt: "2026-07-06T00:00:00.000Z",
        },
      ],
      supplier: [],
      brand: [],
    }));

    const { rerender } = render(<AddComponentModal {...makeAddModalProps({ catalogueOptionsStorageScope: scopeA })} />);
    let dialog = await getAddDialog();

    await createCatalogueOption(dialog, "Category", "Scope A Category");
    expect(window.localStorage.getItem(`${catalogueOptionsStoragePrefix}:${scopeA}`)).toContain("Scope A Category");

    rerender(<AddComponentModal {...makeAddModalProps({ catalogueOptionsStorageScope: scopeB })} />);
    dialog = await getAddDialog();

    const form = within(dialog).getByRole("form", { name: "Quick add component" });
    const category = within(form).getByRole("combobox", { name: "Category" });
    fireEvent.change(category, { target: { value: "Scope B" } });
    expect(await screen.findByRole("option", { name: "Scope B Category" })).toBeInTheDocument();

    const storedScopeB = JSON.parse(window.localStorage.getItem(`${catalogueOptionsStoragePrefix}:${scopeB}`) ?? "{}");
    expect(storedScopeB.category).toEqual([
      expect.objectContaining({ label: "Scope B Category" }),
    ]);
    expect(JSON.stringify(storedScopeB)).not.toContain("Scope A Category");
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
    const createdItem = props.onComponentCreated.mock.calls[0][0] as EstimateRowItem;
    expect(createdItem.category).toBe("Hardware");
    expect(createdItem.categoryPath).toBeUndefined();
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

  it("starts with no variants and deletes the last added variant", async () => {
    renderAddModal();
    const dialog = await getAddDialog();
    const drawer = openVariantManager(dialog);

    expect(within(drawer).getByLabelText("Variant manager")).toBeInTheDocument();
    expect(within(drawer).getByText("No variants yet.")).toBeInTheDocument();
    expect(within(drawer).queryByRole("button", { name: "Open V1" })).not.toBeInTheDocument();
    expect(within(drawer).getByRole("button", { name: "Default" })).toBeDisabled();

    clickAddVariant(drawer);

    expect(within(drawer).getByLabelText("Variant editor")).toBeInTheDocument();
    expect(within(drawer).getByRole("button", { name: "Open V1" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(within(drawer).getByRole("button", { name: "Delete variant" }));

    await waitFor(() => expect(within(drawer).queryByRole("button", { name: "Open V1" })).not.toBeInTheDocument());
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

  it("keeps a duplicate acknowledgement when a catalogue input reports its current value", async () => {
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

  it("uploads edit-mode thumbnails through the project image route when a project id is provided", async () => {
    const projectImageProjectId = "22222222-2222-4222-8222-222222222222";
    const thumbnailUrl = "/api/projects/images?path=workspace-1/user-1/project-images/22222222-2222-4222-8222-222222222222/pergo-thumb.webp";
    const onComponentUpdated = vi.fn();
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      bucket: "project-images",
      path: "workspace-1/user-1/project-images/22222222-2222-4222-8222-222222222222/pergo.webp",
      thumbnailPath: "workspace-1/user-1/project-images/22222222-2222-4222-8222-222222222222/pergo-thumb.webp",
      url: "/api/projects/images?path=workspace-1/user-1/project-images/22222222-2222-4222-8222-222222222222/pergo.webp",
      thumbnailUrl,
      originalBytes: 16,
      optimizedBytes: 12,
      contentType: "image/webp",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    renderAddModal({
      editingItem: makeEditingItem(),
      imageUploadProjectId: projectImageProjectId,
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
