import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ComponentProps } from "react";

import { AddComponentModal } from "@/components/workshop/component-library-manager/AddComponentModal";
import type { ComponentLibraryTaxonomyNode } from "@/lib/component-library/taxonomy";
import type { LibraryFolderRecord } from "@/lib/component-library/library-folder-reorder";
import type { EstimateRowItem } from "@/lib/estimates/types";

const actionMocks = vi.hoisted(() => ({
  createCostLibraryComponent: vi.fn(),
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
    source_category_node_id: null,
    folder_kind: "custom",
  },
];

const duplicateRows: EstimateRowItem[] = [
  {
    id: "component-duplicate",
    material: "Door Hinge",
    name: "Door Hinge",
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
  fireEvent.change(within(form).getByLabelText("Category"), { target: { value: "Hardware" } });
  fireEvent.change(within(form).getByRole("combobox", { name: "Supplier" }), { target: { value: "Acme" } });
  fireEvent.change(within(form).getByLabelText("Unit cost"), { target: { value: "123.456" } });
  fireEvent.change(within(form).getByLabelText("Pricing date"), { target: { value: "2026-01-10" } });
  fireEvent.change(within(form).getByLabelText("Pricing source"), {
    target: { value: "https://supplier.example/quote" },
  });
  fireEvent.change(within(form).getByLabelText("Confidence"), { target: { value: "Supplier quote" } });
  return form;
}

describe("AddComponentModal quick add contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actionMocks.createCostLibraryComponent.mockResolvedValue({
      itemId: "component-created",
      activePriceOptionId: "price-created",
      versionNumber: 1,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exposes the canonical required fields with required and invalid semantics", async () => {
    renderAddModal();

    const dialog = await getAddDialog();
    const form = within(dialog).getByRole("form", { name: "Quick add component" });
    const name = within(form).getByLabelText("Name");
    const category = within(form).getByLabelText("Category");
    const unit = within(form).getByRole("combobox", { name: "Unit" });
    const unitCost = within(form).getByLabelText("Unit cost");

    expect(name).toHaveAttribute("aria-required", "true");
    expect(category).toHaveAttribute("aria-required", "true");
    expect(unit).toHaveAttribute("aria-required", "true");
    expect(unitCost).toHaveAttribute("aria-required", "true");
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(category).toHaveAttribute("aria-invalid", "true");
    expect(unitCost).toHaveAttribute("aria-invalid", "true");
    expect(within(dialog).getByRole("button", { name: "Add Component" })).toBeDisabled();
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

    expect(await screen.findByRole("dialog", { name: "Discard this draft?" })).toBeInTheDocument();
    expect(nativeConfirm).not.toHaveBeenCalled();
    expect(props.onOpenChange).not.toHaveBeenCalledWith(false);

    nativeConfirm.mockRestore();
  });

  it("keeps invalid source fields client-side and preserves input after a failed retry", async () => {
    actionMocks.createCostLibraryComponent.mockRejectedValueOnce(new Error("Network down"));
    const props = renderAddModal();
    const dialog = await getAddDialog();
    const form = fillValidQuickAdd(dialog);

    const pricingDate = within(form).getByLabelText("Pricing date");
    const pricingSource = within(form).getByLabelText("Pricing source");

    fireEvent.change(pricingDate, { target: { value: "2999-01-01" } });
    expect(pricingDate).toHaveAttribute("aria-invalid", "true");
    expect(within(dialog).getByRole("button", { name: "Add Component" })).toBeDisabled();

    fireEvent.change(pricingDate, { target: { value: "2026-01-10" } });
    fireEvent.change(pricingSource, { target: { value: "ftp://supplier.example/quote" } });
    expect(pricingSource).toHaveAttribute("aria-invalid", "true");
    expect(within(dialog).getByRole("button", { name: "Add Component" })).toBeDisabled();

    fireEvent.change(pricingSource, { target: { value: "https://supplier.example/quote" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add Component" }));

    await screen.findByText("Network down");
    expect(screen.getByRole("dialog", { name: "Add Component" })).toBeInTheDocument();
    expect(within(form).getByLabelText("Name")).toHaveValue("Door Stop");
    expect(within(form).getByLabelText("Category")).toHaveValue("Hardware");
    expect(within(form).getByLabelText("Pricing source")).toHaveValue("https://supplier.example/quote");
    expect(props.onComponentCreated).not.toHaveBeenCalled();
  });

  it("submits the quick add payload without requiring a folder", async () => {
    const props = renderAddModal();
    const dialog = await getAddDialog();
    fillValidQuickAdd(dialog);

    fireEvent.click(within(dialog).getByRole("button", { name: "Add Component" }));

    await waitFor(() => expect(actionMocks.createCostLibraryComponent).toHaveBeenCalledTimes(1));
    expect(actionMocks.createCostLibraryComponent).toHaveBeenCalledWith(expect.objectContaining({
      name: "Door Stop",
      category: "Hardware",
      unit: "unit",
      supplier: "Acme",
      libraryFolderId: null,
      priceOptions: [
        expect.objectContaining({
          label: "Variant 1",
          unit: "unit",
          unitCost: 123.46,
          pricingDate: "2026-01-10",
          pricingSource: "https://supplier.example/quote",
          confidence: "Supplier quote",
          isDefault: true,
        }),
      ],
    }));
    await waitFor(() => expect(props.onComponentCreated).toHaveBeenCalledTimes(1));
  });

  it("renders scan, review, and download blocked states for uploaded attachments", async () => {
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
    fireEvent.click(within(dialog).getByRole("button", { name: "Advanced catalog details" }));

    const file = new File(["%PDF-1.7"], "spec.pdf", { type: "application/pdf" });
    fireEvent.change(within(dialog).getByLabelText("Upload attachment"), {
      target: { files: [file] },
    });

    await screen.findByText("Stored spec.pdf (2 KB).");
    expect(within(dialog).getByText("spec.pdf")).toBeInTheDocument();
    expect(within(dialog).getByText("Scan pending")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Attachment scan status: Scan pending")).toBeInTheDocument();
    expect(within(dialog).getByText("Review blocked")).toBeInTheDocument();
    expect(within(dialog).getByText("Download blocked")).toBeInTheDocument();
    expect(within(dialog).getByText(
      "Download blocked until scanner marks this attachment clean and Library review marks it current.",
    )).toBeInTheDocument();
  });

  it("shows a non-blocking duplicate warning after the name blur check", async () => {
    renderAddModal({ libraryItems: duplicateRows });
    const dialog = await getAddDialog();
    const form = within(dialog).getByRole("form", { name: "Quick add component" });

    fireEvent.change(within(form).getByLabelText("Category"), { target: { value: "Hardware" } });
    fireEvent.change(within(form).getByRole("combobox", { name: "Supplier" }), { target: { value: "Acme" } });
    const name = within(form).getByLabelText("Name");
    fireEvent.change(name, { target: { value: "Door Hinge" } });
    fireEvent.blur(name);

    await screen.findByText('A component named "Door Hinge" already exists. Add anyway or open the existing one.');
    fireEvent.click(within(form).getByRole("button", { name: "Create anyway" }));
    expect(screen.queryByText(/already exists/)).not.toBeInTheDocument();
  });

  it("normalizes duplicate identity whitespace and supports brand-only matches", async () => {
    renderAddModal({ libraryItems: [...duplicateRows, ...brandDuplicateRows] });
    const dialog = await getAddDialog();
    const form = within(dialog).getByRole("form", { name: "Quick add component" });

    fireEvent.change(within(form).getByLabelText("Category"), { target: { value: "Hardware" } });
    fireEvent.change(within(form).getByRole("combobox", { name: "Supplier" }), { target: { value: "Acme" } });
    const name = within(form).getByLabelText("Name");
    fireEvent.change(name, { target: { value: "  door    hinge  " } });
    fireEvent.blur(name);

    await screen.findByText('A component named "Door Hinge" already exists. Add anyway or open the existing one.');

    fireEvent.change(within(form).getByRole("combobox", { name: "Supplier" }), { target: { value: "" } });
    fireEvent.change(within(form).getByRole("combobox", { name: "Brand" }), { target: { value: "Hinge Co" } });
    fireEvent.change(name, { target: { value: "Concealed Pull" } });
    fireEvent.blur(name);

    await screen.findByText('A component named "Concealed Pull" already exists. Add anyway or open the existing one.');
    fireEvent.click(within(form).getByRole("button", { name: "Create anyway" }));
    fireEvent.change(within(form).getByLabelText("Unit cost"), { target: { value: "45.50" } });
    fireEvent.change(within(form).getByLabelText("Pricing date"), { target: { value: "2026-01-10" } });
    fireEvent.change(within(form).getByLabelText("Pricing source"), {
      target: { value: "https://supplier.example/quote" },
    });
    fireEvent.change(within(form).getByLabelText("Confidence"), { target: { value: "Supplier quote" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add Component" }));

    await waitFor(() => expect(actionMocks.createCostLibraryComponent).toHaveBeenCalledTimes(1));
  });
});
