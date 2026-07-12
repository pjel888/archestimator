import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, fireEvent, waitFor, within } from "@testing-library/react";

import { EstimateMaterialCell } from "@/components/workshop/estimate-sheet/rows/cells";
import { estimateLibraryItems } from "@/components/workshop/estimate-tree-data";
import { withExpressComponentMetadata, withProjectComponentProjectionMetadata } from "@/lib/estimates/express-components";

afterEach(() => {
  vi.unstubAllGlobals();
});

// Req 4 / D4 / OD-14: a cancelled or failed component drag must NOT delete the
// attached component. moveRowComponent (the host) clears the source itself on a
// real move, so the drag-end handler must never clear — only the explicit
// delete/clear action removes a component.
function renderCell(overrides: Partial<Parameters<typeof EstimateMaterialCell>[0]> = {}) {
  const item = {
    ...estimateLibraryItems[0],
    id: "row-1",
    sourceLibraryItemId: "library-item-1",
    linkState: "linked-clean" as const,
  };
  const onClearComponent = vi.fn();
  const onPromoteToLibrary = vi.fn();
  const view = render(
    <EstimateMaterialCell
      item={item}
      projectId="project-1"
      estimateId="estimate-1"
      editableRow={{
        name: item.material,
        brand: item.brand ?? "",
        description: item.description,
        supplier: item.supplier,
        unit: item.unit,
        unitCost: String(item.itemCost),
        quantity: String(item.quantity),
        contingencyMode: "contingency",
        contingencyPercentage: String(item.contingencyPercentage ?? 0),
        miscCost: String(item.miscCost),
        imageUrl: item.imageUrl ?? "",
        sourceUrl: item.sourceUrl ?? "",
      }}
      isReplaceTarget={false}
      onExpressEditorActiveChange={() => {}}
      onExpressFieldChange={() => {}}
      onExpressFieldCommit={() => {}}
      onExpressFieldRevert={() => {}}
      onReplaceDragOver={() => {}}
      onReplaceDragLeave={() => {}}
      onReplace={() => {}}
      onClearComponent={onClearComponent}
      onRequestProjectSpecific={() => {}}
      onPromoteToLibrary={onPromoteToLibrary}
      onMoveComponent={() => {}}
      onOpenComponentEditor={() => {}}
      onRetryExpressDraft={() => {}}
      onDeleteExpressDraft={() => {}}
      {...overrides}
    />,
  );
  return { ...view, item, onClearComponent, onPromoteToLibrary };
}

function getComponentSourceRail(componentShell: HTMLElement) {
  const rail = componentShell.firstElementChild;
  expect(rail).toBeInstanceOf(HTMLElement);
  expect(rail).toHaveAttribute("aria-hidden", "true");
  return rail as HTMLElement;
}

function expectNeutralRailWithInteractiveSourceColor(rail: HTMLElement, interactiveColorClass: string) {
  expect(rail).toHaveClass("bg-divider");
  expect(rail).not.toHaveClass(interactiveColorClass);
  expect(rail).toHaveClass(`group-hover:${interactiveColorClass}`);
  expect(rail).toHaveClass(`group-focus-within:${interactiveColorClass}`);
  expect(rail).toHaveClass(`group-hover/estimate-row:${interactiveColorClass}`);
}

function getMaterialUnitSlot(root: ParentNode) {
  const slot = root.querySelector("[data-estimate-material-unit-slot='true']");
  expect(slot).toBeInstanceOf(HTMLElement);
  return slot as HTMLElement;
}

function createPendingAbortableFetch() {
  return vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  }));
}

function uploadedImageAsset(url: string, assetId = "asset-1") {
  return {
    kind: "upload-asset",
    schemaVersion: 1,
    assetId,
    uploadSessionId: `${assetId}-session`,
    bucket: "project-images",
    path: `workspace-1/user-1/project-images/project-1/estimate-row-images/estimate-1/${assetId}.webp`,
    thumbnailPath: `workspace-1/user-1/project-images/project-1/estimate-row-images/estimate-1/${assetId}-thumb.webp`,
    url,
    thumbnailUrl: `${url}?thumb=1`,
    contentType: "image/webp",
    sizeBytes: 128,
    scanStatus: "not_required",
  };
}

describe("EstimateMaterialCell component drag safety (Req 4 / D4)", () => {
  it("does NOT clear the component when a drag is cancelled (dropEffect none)", () => {
    const { item, onClearComponent } = renderCell();
    const dragHandle = screen.getByRole("button", { name: `Drag component ${item.material}` });
    fireEvent.dragEnd(dragHandle, { dataTransfer: { dropEffect: "none" } });
    expect(onClearComponent).not.toHaveBeenCalled();
  });

  it("does NOT clear the source on a successful move (the move path clears it, not drag-end)", () => {
    const { item, onClearComponent } = renderCell();
    const dragHandle = screen.getByRole("button", { name: `Drag component ${item.material}` });
    fireEvent.dragEnd(dragHandle, { dataTransfer: { dropEffect: "move" } });
    expect(onClearComponent).not.toHaveBeenCalled();
  });

  it("still clears the component via the explicit Delete action", () => {
    const { item, onClearComponent } = renderCell();
    fireEvent.click(screen.getByRole("button", { name: `Delete component ${item.material}` }));
    expect(onClearComponent).toHaveBeenCalledTimes(1);
  });

  it("marks library components with the library source rail", () => {
    const { container } = renderCell();
    const componentShell = container.querySelector("[data-component-source]");
    expect(componentShell).toHaveAttribute("data-component-source", "library");
    expect(componentShell).toHaveAttribute("title", expect.stringContaining("Library Component"));
  });

  it("marks supplier-sourced catalog components with the library source rail", () => {
    const supplierCatalogItem = {
      ...estimateLibraryItems.find((item) => item.id === "lib-light-switch-1gang")!,
      id: "supplier-row-1",
      sourceLibraryItemId: null,
      linkState: "unlinked" as const,
    };
    renderCell({ item: supplierCatalogItem });

    const componentShell = screen.getByLabelText(`${supplierCatalogItem.material} replaceable estimate component`);
    expect(componentShell).toHaveAttribute("data-component-source", "library");
    expect(componentShell).toHaveAttribute("title", expect.stringContaining("Library Component"));
    expectNeutralRailWithInteractiveSourceColor(getComponentSourceRail(componentShell), "bg-[#E8B99D]");
  });

  it("keeps the library source rail neutral until the row or component is interactive", () => {
    const { container } = renderCell();
    const componentShell = container.querySelector("[data-component-source]");
    expect(componentShell).toBeInstanceOf(HTMLElement);
    expectNeutralRailWithInteractiveSourceColor(getComponentSourceRail(componentShell as HTMLElement), "bg-[#E8B99D]");
  });

  it("renders component identity as name, brand, then supplier", () => {
    const item = {
      ...estimateLibraryItems[0],
      id: "branded-row-1",
      brand: "Oakline Studio",
      supplier: "Builder Supplier",
    };
    renderCell({ item });

    const componentShell = screen.getByLabelText(`${item.material} replaceable estimate component`);
    const name = within(componentShell).getByText(item.material);
    const brand = within(componentShell).getByText("Oakline Studio");
    const supplier = within(componentShell).getByText("Builder Supplier");

    expect(name.compareDocumentPosition(brand) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(brand.compareDocumentPosition(supplier) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(brand.parentElement).toHaveClass("bg-surfaceMuted", "!text-[9px]", "font-medium");
    expect(supplier).toHaveClass("text-[10px]", "font-normal", "text-tertiary");
  });

  it("renders read-only component units in a fixed right-aligned slot", () => {
    const { container, item } = renderCell();

    const slot = getMaterialUnitSlot(container);
    expect(slot).toHaveClass("pointer-events-none", "absolute", "right-0", "top-[calc(50%+22px)]", "w-[112px]", "justify-end", "text-right", "!text-[10px]");
    expect(slot).toHaveTextContent(`/${item.unit}`);

    const label = slot.querySelector("[data-estimate-material-unit-label='true']");
    expect(label).toHaveClass("flex", "min-w-0", "max-w-full", "items-center", "justify-end", "text-right", "!text-[10px]");
    expect(label).toHaveAttribute("title", `per ${item.unit}`);
    expect(label?.querySelector("[data-estimate-material-unit-slash='true']")).toHaveClass("block", "shrink-0");
    expect(label?.querySelector("[data-estimate-material-unit-slash='true']")).toHaveTextContent("/");
    expect(label?.querySelector("[data-estimate-material-unit-value='true']")).toHaveClass("min-w-0", "truncate");
  });

  it("keeps editable component units at the same 10px size as row quantity units", () => {
    const item = {
      ...estimateLibraryItems[0],
      id: "express-row-1",
      sourceLibraryItemId: null,
      linkState: "unlinked" as const,
      metadata: withExpressComponentMetadata({}, { id: "express-1" }),
    };
    renderCell({
      item,
      editableRow: {
        name: item.material,
        description: item.description,
        supplier: item.supplier,
        unit: item.unit,
        unitCost: String(item.itemCost),
        quantity: String(item.quantity),
        contingencyMode: "contingency",
        contingencyPercentage: String(item.contingencyPercentage ?? 0),
        miscCost: String(item.miscCost),
        imageUrl: item.imageUrl ?? "",
        sourceUrl: item.sourceUrl ?? "",
      },
    });

    const unitInput = screen.getByRole("combobox", { name: "Unit" });
    expect(unitInput).toHaveClass("w-full", "!text-[10px]");
    const unitLabel = unitInput.closest("[data-estimate-material-unit-label='true']");
    expect(unitLabel).toHaveClass("flex", "items-center", "justify-end");
    expect(unitLabel?.querySelector("[data-estimate-material-unit-slash='true']")).toHaveClass("block", "shrink-0");
  });

  it("shows a promote action for express components", () => {
    const item = {
      ...estimateLibraryItems[0],
      id: "express-row-1",
      sourceLibraryItemId: null,
      linkState: "unlinked" as const,
      metadata: withExpressComponentMetadata({}, { id: "express-1" }),
    };
    const { onPromoteToLibrary } = renderCell({
      item,
      editableRow: {
        name: item.material,
        description: item.description,
        supplier: item.supplier,
        unit: item.unit,
        unitCost: String(item.itemCost),
        quantity: String(item.quantity),
        contingencyMode: "contingency",
        contingencyPercentage: String(item.contingencyPercentage ?? 0),
        miscCost: String(item.miscCost),
        imageUrl: item.imageUrl ?? "",
        sourceUrl: item.sourceUrl ?? "",
      },
    });

    const componentShell = screen.getByLabelText(`${item.material} replaceable estimate component`);
    expect(componentShell).toHaveAttribute("data-component-source", "express");
    expect(componentShell).toHaveAttribute("title", expect.stringContaining("Project Component"));
    fireEvent.click(screen.getByRole("button", { name: `Promote ${item.material} to library` }));
    expect(onPromoteToLibrary).toHaveBeenCalledTimes(1);
  });

  it("opens the express reference image modal and commits a pasted URL on Enter", async () => {
    const item = {
      ...estimateLibraryItems[0],
      id: "express-row-1",
      imageUrl: "",
      sourceLibraryItemId: null,
      linkState: "unlinked" as const,
      metadata: withExpressComponentMetadata({}, { id: "express-1" }),
    };
    const onExpressFieldCommit = vi.fn();
    renderCell({
      item,
      editableRow: {
        name: "Project Component",
        description: item.description,
        supplier: item.supplier,
        unit: item.unit,
        unitCost: String(item.itemCost),
        quantity: String(item.quantity),
        contingencyMode: "contingency",
        contingencyPercentage: String(item.contingencyPercentage ?? 0),
        miscCost: String(item.miscCost),
        imageUrl: "",
        sourceUrl: item.sourceUrl ?? "",
      },
      onExpressFieldCommit,
    });

    fireEvent.click(screen.getByRole("button", { name: "Add reference image for Project Component" }));
    const dialog = screen.getByRole("dialog", { name: "Reference image" });
    const urlInput = within(dialog).getByLabelText("Reference image URL");
    fireEvent.change(urlInput, { target: { value: "https://assets.example.test/custom-reference.jpg" } });
    fireEvent.keyDown(urlInput, { key: "Enter" });

    expect(onExpressFieldCommit).toHaveBeenCalledWith({
      imageUrl: "https://assets.example.test/custom-reference.jpg",
      imageAsset: null,
    });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Reference image" })).not.toBeInTheDocument());
  });

  it("closes the reference image modal while the selected photo uploads in the row card", async () => {
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:reference-preview"),
      revokeObjectURL: vi.fn(),
    });

    let resolveUpload: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((resolve, reject) => {
      resolveUpload = resolve;
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));
    vi.stubGlobal("fetch", fetchMock);

    const item = {
      ...estimateLibraryItems[0],
      id: "express-row-1",
      imageUrl: "",
      sourceLibraryItemId: null,
      linkState: "unlinked" as const,
      metadata: withExpressComponentMetadata({}, { id: "express-1" }),
    };
    const onExpressFieldCommit = vi.fn();
    renderCell({
      item,
      editableRow: {
        name: "Project Component",
        description: item.description,
        supplier: item.supplier,
        unit: item.unit,
        unitCost: String(item.itemCost),
        quantity: String(item.quantity),
        contingencyMode: "contingency",
        contingencyPercentage: String(item.contingencyPercentage ?? 0),
        miscCost: String(item.miscCost),
        imageUrl: "",
        sourceUrl: item.sourceUrl ?? "",
      },
      onExpressFieldCommit,
    });

    fireEvent.click(screen.getByRole("button", { name: "Add reference image for Project Component" }));
    const dialog = screen.getByRole("dialog", { name: "Reference image" });
    fireEvent.change(within(dialog).getByLabelText("Upload reference image"), {
      target: { files: [new File(["image"], "reference.png", { type: "image/png" })] },
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/estimate-row-images", expect.objectContaining({ method: "POST" })));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Reference image" })).not.toBeInTheDocument());

    const rowCard = screen.getByLabelText("Project Component replaceable estimate component");
    expect(within(rowCard).getByRole("status")).toHaveTextContent("Uploading image...");
    expect(onExpressFieldCommit).not.toHaveBeenCalled();

    await act(async () => {
      resolveUpload?.({
        ok: true,
        json: async () => ({
          url: "https://assets.example.test/uploaded-reference.webp",
          imageAsset: uploadedImageAsset("https://assets.example.test/uploaded-reference.webp"),
        }),
      } as Response);
      await Promise.resolve();
    });

    await waitFor(() => expect(onExpressFieldCommit).toHaveBeenCalledWith({
      imageUrl: "https://assets.example.test/uploaded-reference.webp",
      imageAsset: uploadedImageAsset("https://assets.example.test/uploaded-reference.webp"),
    }));
    await waitFor(() => expect(within(rowCard).queryByRole("status")).not.toBeInTheDocument());
  });

  it("uploads an express reference image before committing the returned image URL", async () => {
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:reference-preview"),
      revokeObjectURL,
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        url: "https://assets.example.test/uploaded-reference.webp",
        imageAsset: uploadedImageAsset("https://assets.example.test/uploaded-reference.webp"),
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const item = {
      ...estimateLibraryItems[0],
      id: "express-row-1",
      imageUrl: "",
      sourceLibraryItemId: null,
      linkState: "unlinked" as const,
      metadata: withExpressComponentMetadata({}, { id: "express-1" }),
    };
    const onExpressFieldCommit = vi.fn();
    renderCell({
      item,
      editableRow: {
        name: "Project Component",
        description: item.description,
        supplier: item.supplier,
        unit: item.unit,
        unitCost: String(item.itemCost),
        quantity: String(item.quantity),
        contingencyMode: "contingency",
        contingencyPercentage: String(item.contingencyPercentage ?? 0),
        miscCost: String(item.miscCost),
        imageUrl: "",
        sourceUrl: item.sourceUrl ?? "",
      },
      onExpressFieldCommit,
    });

    fireEvent.click(screen.getByRole("button", { name: "Add reference image for Project Component" }));
    const dialog = screen.getByRole("dialog", { name: "Reference image" });
    const uploadInput = within(dialog).getByLabelText("Upload reference image");
    const file = new File(["image"], "reference.png", { type: "image/png" });
    fireEvent.change(uploadInput, { target: { files: [file] } });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/estimate-row-images", expect.objectContaining({ method: "POST" })));
    const body = fetchMock.mock.calls[0]?.[1]?.body;
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get("projectId")).toBe("project-1");
    expect((body as FormData).get("estimateId")).toBe("estimate-1");
    expect((body as FormData).get("rowItemId")).toBe("express-row-1");
    await waitFor(() => expect(onExpressFieldCommit).toHaveBeenCalledWith({
      imageUrl: "https://assets.example.test/uploaded-reference.webp",
      imageAsset: uploadedImageAsset("https://assets.example.test/uploaded-reference.webp"),
    }));
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:reference-preview");
  });

  it("opens the native file picker from the visible upload button", async () => {
    const item = {
      ...estimateLibraryItems[0],
      id: "express-row-1",
      imageUrl: "",
      sourceLibraryItemId: null,
      linkState: "unlinked" as const,
      metadata: withExpressComponentMetadata({}, { id: "express-1" }),
    };
    const inputClickSpy = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    try {
      renderCell({
        item,
        editableRow: {
          name: "Project Component",
          description: item.description,
          supplier: item.supplier,
          unit: item.unit,
          unitCost: String(item.itemCost),
          quantity: String(item.quantity),
          contingencyMode: "contingency",
          contingencyPercentage: String(item.contingencyPercentage ?? 0),
          miscCost: String(item.miscCost),
          imageUrl: "",
          sourceUrl: item.sourceUrl ?? "",
        },
      });

      fireEvent.click(screen.getByRole("button", { name: "Add reference image for Project Component" }));
      const dialog = screen.getByRole("dialog", { name: "Reference image" });
      fireEvent.click(within(dialog).getByRole("button", { name: "Upload image" }));

      expect(inputClickSpy).toHaveBeenCalledTimes(1);
    } finally {
      inputClickSpy.mockRestore();
    }
  });

  it("keeps the background reference image upload running when Escape is pressed", async () => {
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:reference-preview"),
      revokeObjectURL: vi.fn(),
    });
    const fetchMock = createPendingAbortableFetch();
    vi.stubGlobal("fetch", fetchMock);

    const item = {
      ...estimateLibraryItems[0],
      id: "express-row-1",
      imageUrl: "",
      sourceLibraryItemId: null,
      linkState: "unlinked" as const,
      metadata: withExpressComponentMetadata({}, { id: "express-1" }),
    };
    const onExpressFieldCommit = vi.fn();
    renderCell({
      item,
      editableRow: {
        name: "Project Component",
        description: item.description,
        supplier: item.supplier,
        unit: item.unit,
        unitCost: String(item.itemCost),
        quantity: String(item.quantity),
        contingencyMode: "contingency",
        contingencyPercentage: String(item.contingencyPercentage ?? 0),
        miscCost: String(item.miscCost),
        imageUrl: "",
        sourceUrl: item.sourceUrl ?? "",
      },
      onExpressFieldCommit,
    });

    fireEvent.click(screen.getByRole("button", { name: "Add reference image for Project Component" }));
    const dialog = screen.getByRole("dialog", { name: "Reference image" });
    fireEvent.change(within(dialog).getByLabelText("Upload reference image"), {
      target: { files: [new File(["image"], "reference.png", { type: "image/png" })] },
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/estimate-row-images", expect.objectContaining({ method: "POST" })));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Reference image" })).not.toBeInTheDocument());

    const rowCard = screen.getByLabelText("Project Component replaceable estimate component");
    await waitFor(() => expect(within(rowCard).getByRole("status")).toHaveTextContent("Uploading image..."));

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Reference image" })).not.toBeInTheDocument();
    expect(within(rowCard).getByRole("status")).toHaveTextContent("Uploading image...");
    expect(onExpressFieldCommit).not.toHaveBeenCalled();
  });

  it("keeps the upload indicator in the card while the modal is closed", async () => {
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:reference-preview"),
      revokeObjectURL: vi.fn(),
    });
    const fetchMock = createPendingAbortableFetch();
    vi.stubGlobal("fetch", fetchMock);

    const item = {
      ...estimateLibraryItems[0],
      id: "express-row-1",
      imageUrl: "",
      sourceLibraryItemId: null,
      linkState: "unlinked" as const,
      metadata: withExpressComponentMetadata({}, { id: "express-1" }),
    };
    const onExpressFieldCommit = vi.fn();
    renderCell({
      item,
      editableRow: {
        name: "Project Component",
        description: item.description,
        supplier: item.supplier,
        unit: item.unit,
        unitCost: String(item.itemCost),
        quantity: String(item.quantity),
        contingencyMode: "contingency",
        contingencyPercentage: String(item.contingencyPercentage ?? 0),
        miscCost: String(item.miscCost),
        imageUrl: "",
        sourceUrl: item.sourceUrl ?? "",
      },
      onExpressFieldCommit,
    });

    fireEvent.click(screen.getByRole("button", { name: "Add reference image for Project Component" }));
    const dialog = screen.getByRole("dialog", { name: "Reference image" });
    fireEvent.change(within(dialog).getByLabelText("Upload reference image"), {
      target: { files: [new File(["image"], "reference.png", { type: "image/png" })] },
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Reference image" })).not.toBeInTheDocument());

    const rowCard = screen.getByLabelText("Project Component replaceable estimate component");
    expect(within(rowCard).getByRole("status")).toHaveTextContent("Uploading image...");
    expect(screen.queryByRole("button", { name: "Close reference image modal" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add reference image for Project Component" })).toBeDisabled();
    expect(onExpressFieldCommit).not.toHaveBeenCalled();
  });

  it("waits for an optimistic component row to save before uploading the selected image", async () => {
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:reference-preview"),
      revokeObjectURL: vi.fn(),
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        url: "https://assets.example.test/draft-reference.webp",
        imageAsset: uploadedImageAsset("https://assets.example.test/draft-reference.webp", "asset-draft"),
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const item = {
      ...estimateLibraryItems[0],
      id: "express-row-1",
      imageUrl: "",
      sourceLibraryItemId: null,
      linkState: "unlinked" as const,
      metadata: withExpressComponentMetadata({}, { id: "express-1" }),
    };
    const onExpressFieldCommit = vi.fn();
    const editableRow = {
      name: "Project Component",
      description: item.description,
      supplier: item.supplier,
      unit: item.unit,
      unitCost: String(item.itemCost),
      quantity: String(item.quantity),
      contingencyMode: "contingency" as const,
      contingencyPercentage: String(item.contingencyPercentage ?? 0),
      miscCost: String(item.miscCost),
      imageUrl: "",
      sourceUrl: item.sourceUrl ?? "",
    };
    const props = {
      item,
      projectId: "project-1",
      estimateId: "estimate-1",
      editableRow,
      isReplaceTarget: false,
      onExpressEditorActiveChange: vi.fn(),
      onExpressFieldChange: vi.fn(),
      onExpressFieldCommit,
      onExpressFieldRevert: vi.fn(),
      onReplaceDragOver: vi.fn(),
      onReplaceDragLeave: vi.fn(),
      onReplace: vi.fn(),
      onClearComponent: vi.fn(),
      onRequestProjectSpecific: vi.fn(),
      onPromoteToLibrary: vi.fn(),
      onMoveComponent: vi.fn(),
      onOpenComponentEditor: vi.fn(),
      onRetryExpressDraft: vi.fn(),
      onDeleteExpressDraft: vi.fn(),
    } satisfies Parameters<typeof EstimateMaterialCell>[0];
    const view = render(<EstimateMaterialCell {...props} expressDraftState="creating" />);

    fireEvent.click(screen.getByRole("button", { name: "Add reference image for Project Component" }));
    const dialog = screen.getByRole("dialog", { name: "Reference image" });
    fireEvent.change(within(dialog).getByLabelText("Upload reference image"), {
      target: { files: [new File(["image"], "reference.png", { type: "image/png" })] },
    });

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Reference image" })).not.toBeInTheDocument());
    const rowCard = screen.getByLabelText("Project Component replaceable estimate component");
    expect(within(rowCard).getByText("Waiting for the component row to save before uploading image...")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onExpressFieldCommit).not.toHaveBeenCalled();

    view.rerender(<EstimateMaterialCell {...props} expressDraftState={undefined} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/estimate-row-images", expect.objectContaining({ method: "POST" })));
    await waitFor(() => expect(onExpressFieldCommit).toHaveBeenCalledWith({
      imageUrl: "https://assets.example.test/draft-reference.webp",
      imageAsset: uploadedImageAsset("https://assets.example.test/draft-reference.webp", "asset-draft"),
    }));
  });

  it("retries a failed reference image upload with the selected file", async () => {
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:reference-preview"),
      revokeObjectURL: vi.fn(),
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: "Upload capacity is busy." }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          url: "https://assets.example.test/retried-reference.webp",
          imageAsset: uploadedImageAsset("https://assets.example.test/retried-reference.webp", "asset-retried"),
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const item = {
      ...estimateLibraryItems[0],
      id: "express-row-1",
      imageUrl: "",
      sourceLibraryItemId: null,
      linkState: "unlinked" as const,
      metadata: withExpressComponentMetadata({}, { id: "express-1" }),
    };
    const onExpressFieldCommit = vi.fn();
    renderCell({
      item,
      editableRow: {
        name: "Project Component",
        description: item.description,
        supplier: item.supplier,
        unit: item.unit,
        unitCost: String(item.itemCost),
        quantity: String(item.quantity),
        contingencyMode: "contingency",
        contingencyPercentage: String(item.contingencyPercentage ?? 0),
        miscCost: String(item.miscCost),
        imageUrl: "",
        sourceUrl: item.sourceUrl ?? "",
      },
      onExpressFieldCommit,
    });

    fireEvent.click(screen.getByRole("button", { name: "Add reference image for Project Component" }));
    const dialog = screen.getByRole("dialog", { name: "Reference image" });
    fireEvent.change(within(dialog).getByLabelText("Upload reference image"), {
      target: { files: [new File(["image"], "reference.png", { type: "image/png" })] },
    });

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Reference image" })).not.toBeInTheDocument());
    const rowCard = screen.getByLabelText("Project Component replaceable estimate component");
    expect(await within(rowCard).findByRole("alert")).toHaveTextContent("Upload capacity is busy.");
    fireEvent.click(within(rowCard).getByRole("button", { name: "Retry upload" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onExpressFieldCommit).toHaveBeenCalledWith({
      imageUrl: "https://assets.example.test/retried-reference.webp",
      imageAsset: uploadedImageAsset("https://assets.example.test/retried-reference.webp", "asset-retried"),
    }));
  });

  it("clears the failed upload preview when switching to a pasted URL", async () => {
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:reference-preview"),
      revokeObjectURL,
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Could not store image." }),
    }));

    const item = {
      ...estimateLibraryItems[0],
      id: "express-row-1",
      imageUrl: "",
      sourceLibraryItemId: null,
      linkState: "unlinked" as const,
      metadata: withExpressComponentMetadata({}, { id: "express-1" }),
    };
    renderCell({
      item,
      editableRow: {
        name: "Project Component",
        description: item.description,
        supplier: item.supplier,
        unit: item.unit,
        unitCost: String(item.itemCost),
        quantity: String(item.quantity),
        contingencyMode: "contingency",
        contingencyPercentage: String(item.contingencyPercentage ?? 0),
        miscCost: String(item.miscCost),
        imageUrl: "",
        sourceUrl: item.sourceUrl ?? "",
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add reference image for Project Component" }));
    const dialog = screen.getByRole("dialog", { name: "Reference image" });
    fireEvent.change(within(dialog).getByLabelText("Upload reference image"), {
      target: { files: [new File(["image"], "reference.png", { type: "image/png" })] },
    });

    const rowCard = screen.getByLabelText("Project Component replaceable estimate component");
    expect(await within(rowCard).findByRole("alert")).toHaveTextContent("Could not store image.");

    fireEvent.click(screen.getByRole("button", { name: "Add reference image for Project Component" }));
    const reopenedDialog = screen.getByRole("dialog", { name: "Reference image" });
    fireEvent.change(within(reopenedDialog).getByLabelText("Reference image URL"), {
      target: { value: "https://assets.example.test/reference.jpg" },
    });

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:reference-preview");
  });

  it("closes the image modal and shows a retryable card alert when upload fails", async () => {
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:reference-preview"),
      revokeObjectURL: vi.fn(),
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Could not store image." }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const item = {
      ...estimateLibraryItems[0],
      id: "express-row-1",
      imageUrl: "",
      sourceLibraryItemId: null,
      linkState: "unlinked" as const,
      metadata: withExpressComponentMetadata({}, { id: "express-1" }),
    };
    const onExpressFieldCommit = vi.fn();
    renderCell({
      item,
      editableRow: {
        name: "Project Component",
        description: item.description,
        supplier: item.supplier,
        unit: item.unit,
        unitCost: String(item.itemCost),
        quantity: String(item.quantity),
        contingencyMode: "contingency",
        contingencyPercentage: String(item.contingencyPercentage ?? 0),
        miscCost: String(item.miscCost),
        imageUrl: "",
        sourceUrl: item.sourceUrl ?? "",
      },
      onExpressFieldCommit,
    });

    fireEvent.click(screen.getByRole("button", { name: "Add reference image for Project Component" }));
    const dialog = screen.getByRole("dialog", { name: "Reference image" });
    fireEvent.change(within(dialog).getByLabelText("Upload reference image"), {
      target: { files: [new File(["image"], "reference.png", { type: "image/png" })] },
    });

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Reference image" })).not.toBeInTheDocument());
    const rowCard = screen.getByLabelText("Project Component replaceable estimate component");
    expect(await within(rowCard).findByRole("alert")).toHaveTextContent("Could not store image.");
    expect(within(rowCard).getByRole("button", { name: "Retry upload" })).toBeInTheDocument();
    expect(onExpressFieldCommit).not.toHaveBeenCalled();
  });

  it("rejects invalid reference image files without uploading or closing", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const item = {
      ...estimateLibraryItems[0],
      id: "express-row-1",
      imageUrl: "",
      sourceLibraryItemId: null,
      linkState: "unlinked" as const,
      metadata: withExpressComponentMetadata({}, { id: "express-1" }),
    };
    renderCell({
      item,
      editableRow: {
        name: "Project Component",
        description: item.description,
        supplier: item.supplier,
        unit: item.unit,
        unitCost: String(item.itemCost),
        quantity: String(item.quantity),
        contingencyMode: "contingency",
        contingencyPercentage: String(item.contingencyPercentage ?? 0),
        miscCost: String(item.miscCost),
        imageUrl: "",
        sourceUrl: item.sourceUrl ?? "",
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add reference image for Project Component" }));
    const dialog = screen.getByRole("dialog", { name: "Reference image" });
    fireEvent.change(within(dialog).getByLabelText("Upload reference image"), {
      target: { files: [new File(["not image"], "reference.txt", { type: "text/plain" })] },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Use a JPG, PNG, WebP, or AVIF image.");
    expect(screen.getByRole("dialog", { name: "Reference image" })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows real tooltips for icon-only component actions on keyboard focus", () => {
    const { item } = renderCell({
      onOpenReplacePicker: vi.fn(),
      onOpenMovePicker: vi.fn(),
    });

    const actionExpectations = [
      { name: `Make ${item.material} a Project Component`, tooltip: "Make project component" },
      { name: `Replace component ${item.material}`, tooltip: "Replace component" },
      { name: `Move component ${item.material}`, tooltip: "Move component" },
      { name: `Delete component ${item.material}`, tooltip: "Delete component" },
      { name: `Edit component ${item.material}`, tooltip: "Edit component" },
      { name: `Drag component ${item.material}`, tooltip: "Drag component" },
    ];

    for (const expectation of actionExpectations) {
      const action = screen.getByRole("button", { name: expectation.name });
      fireEvent.focus(action);
      expect(screen.getByRole("tooltip")).toHaveTextContent(expectation.tooltip);
      fireEvent.blur(action);
    }
  });

  it("renders express components with the same shell chrome as library components", () => {
    const libraryView = renderCell();
    const libraryShell = libraryView.container.querySelector("[data-component-source]");
    expect(libraryShell).toBeInstanceOf(HTMLElement);
    const libraryShellClassName = (libraryShell as HTMLElement).className;
    libraryView.unmount();

    const item = {
      ...estimateLibraryItems[0],
      id: "express-row-1",
      sourceLibraryItemId: null,
      linkState: "unlinked" as const,
      metadata: withExpressComponentMetadata({}, { id: "express-1" }),
    };
    renderCell({
      item,
      editableRow: {
        name: item.material,
        description: item.description,
        supplier: item.supplier,
        unit: item.unit,
        unitCost: String(item.itemCost),
        quantity: String(item.quantity),
        contingencyMode: "contingency",
        contingencyPercentage: String(item.contingencyPercentage ?? 0),
        miscCost: String(item.miscCost),
        imageUrl: item.imageUrl ?? "",
        sourceUrl: item.sourceUrl ?? "",
      },
    });

    const expressShell = screen.getByLabelText(`${item.material} replaceable estimate component`);
    expect(expressShell.className).toBe(libraryShellClassName);
  });

  it("renders express component units in the same fixed right-aligned slot", () => {
    const item = {
      ...estimateLibraryItems[0],
      id: "express-row-1",
      sourceLibraryItemId: null,
      linkState: "unlinked" as const,
      metadata: withExpressComponentMetadata({}, { id: "express-1" }),
    };
    const { container } = renderCell({
      item,
      editableRow: {
        name: item.material,
        description: item.description,
        supplier: item.supplier,
        unit: "month",
        unitCost: String(item.itemCost),
        quantity: String(item.quantity),
        contingencyMode: "contingency",
        contingencyPercentage: String(item.contingencyPercentage ?? 0),
        miscCost: String(item.miscCost),
        imageUrl: item.imageUrl ?? "",
        sourceUrl: item.sourceUrl ?? "",
      },
    });

    const slot = getMaterialUnitSlot(container);
    expect(slot).toHaveClass("absolute", "right-0", "top-[calc(50%+22px)]", "w-[112px]", "justify-end", "text-right");

    const unitInput = screen.getByLabelText("Unit");
    expect(slot).toContainElement(unitInput);
    expect(unitInput).toHaveClass("w-full", "text-right");
    expect(unitInput).toHaveValue("month");
  });

  it("shows the existing unit dropdown when editing an express component unit", () => {
    const item = {
      ...estimateLibraryItems[0],
      id: "express-row-1",
      sourceLibraryItemId: null,
      linkState: "unlinked" as const,
      metadata: withExpressComponentMetadata({}, { id: "express-1" }),
    };
    const onExpressFieldChange = vi.fn();
    const onExpressFieldCommit = vi.fn();
    renderCell({
      item,
      editableRow: {
        name: item.material,
        description: item.description,
        supplier: item.supplier,
        unit: "",
        unitCost: String(item.itemCost),
        quantity: String(item.quantity),
        contingencyMode: "contingency",
        contingencyPercentage: String(item.contingencyPercentage ?? 0),
        miscCost: String(item.miscCost),
        imageUrl: item.imageUrl ?? "",
        sourceUrl: item.sourceUrl ?? "",
      },
      onExpressFieldChange,
      onExpressFieldCommit,
    });

    const unitCombobox = screen.getByRole("combobox", { name: "Unit" });
    fireEvent.focus(unitCombobox);

    const unitListbox = screen.getByRole("listbox", { name: "Unit options" });
    expect(unitListbox).toBeInTheDocument();
    expect(unitListbox.parentElement).toBe(document.body);
    expect(unitListbox).toHaveClass("fixed", "z-[1050]");
    expect(screen.getByRole("option", { name: "pc Piece" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("option", { name: "pc Piece" }));
    expect(onExpressFieldChange).toHaveBeenCalledWith({ unit: "pc" });

    fireEvent.blur(unitCombobox, { target: { value: "pc" } });
    expect(onExpressFieldCommit).toHaveBeenCalledWith({ unit: "pc" });
  });

  it("shows existing brand and supplier dropdowns when editing an express component", () => {
    const item = {
      ...estimateLibraryItems[0],
      id: "express-row-1",
      sourceLibraryItemId: null,
      linkState: "unlinked" as const,
      metadata: withExpressComponentMetadata({}, { id: "express-1" }),
    };
    const onExpressFieldChange = vi.fn();
    const onExpressFieldCommit = vi.fn();
    renderCell({
      item,
      editableRow: {
        name: item.material,
        brand: "",
        description: item.description,
        supplier: "",
        unit: item.unit,
        unitCost: String(item.itemCost),
        quantity: String(item.quantity),
        contingencyMode: "contingency",
        contingencyPercentage: String(item.contingencyPercentage ?? 0),
        miscCost: String(item.miscCost),
        imageUrl: item.imageUrl ?? "",
        sourceUrl: item.sourceUrl ?? "",
      },
      brandOptions: [
        { id: "brand-acme", label: "Acme Brand" },
        { id: "brand-oakline", label: "Oakline" },
      ],
      supplierOptions: [
        { id: "supplier-builder", label: "Builder Supply" },
        { id: "supplier-jobsite", label: "Jobsite Depot" },
      ],
      onExpressFieldChange,
      onExpressFieldCommit,
    });

    const brandInput = screen.getByRole("combobox", { name: "Brand" });
    fireEvent.focus(brandInput);
    const brandListbox = screen.getByRole("listbox", { name: "Brand options" });
    expect(brandListbox.parentElement).toBe(document.body);
    expect(brandListbox).toHaveClass("fixed", "z-[1050]");
    expect(within(brandListbox).getByRole("option", { name: "Acme Brand" })).toBeInTheDocument();
    expect(within(brandListbox).getByRole("option", { name: "Oakline" })).toBeInTheDocument();

    fireEvent.change(brandInput, { target: { value: "oak" } });
    expect(onExpressFieldChange).toHaveBeenCalledWith({ brand: "oak" });
    fireEvent.click(within(brandListbox).getByRole("option", { name: "Oakline" }));
    expect(onExpressFieldChange).toHaveBeenCalledWith({ brand: "Oakline" });
    expect(onExpressFieldCommit).toHaveBeenCalledWith({ brand: "Oakline" });

    const supplierInput = screen.getByRole("combobox", { name: "Supplier" });
    fireEvent.focus(supplierInput);
    const supplierListbox = screen.getByRole("listbox", { name: "Supplier options" });
    expect(supplierListbox.parentElement).toBe(document.body);
    expect(supplierListbox).toHaveClass("fixed", "z-[1050]");
    expect(within(supplierListbox).getByRole("option", { name: "Builder Supply" })).toBeInTheDocument();
    expect(within(supplierListbox).getByRole("option", { name: "Jobsite Depot" })).toBeInTheDocument();

    fireEvent.click(within(supplierListbox).getByRole("option", { name: "Builder Supply" }));
    expect(onExpressFieldChange).toHaveBeenCalledWith({ supplier: "Builder Supply" });
    expect(onExpressFieldCommit).toHaveBeenCalledWith({ supplier: "Builder Supply" });
  });

  it("keeps the express source rail neutral until the row or component is interactive", () => {
    const item = {
      ...estimateLibraryItems[0],
      id: "express-row-1",
      sourceLibraryItemId: null,
      linkState: "unlinked" as const,
      metadata: withExpressComponentMetadata({}, { id: "express-1" }),
    };
    renderCell({
      item,
      editableRow: {
        name: item.material,
        description: item.description,
        supplier: item.supplier,
        unit: item.unit,
        unitCost: String(item.itemCost),
        quantity: String(item.quantity),
        contingencyMode: "contingency",
        contingencyPercentage: String(item.contingencyPercentage ?? 0),
        miscCost: String(item.miscCost),
        imageUrl: item.imageUrl ?? "",
        sourceUrl: item.sourceUrl ?? "",
      },
    });

    const componentShell = screen.getByLabelText(`${item.material} replaceable estimate component`);
    expectNeutralRailWithInteractiveSourceColor(getComponentSourceRail(componentShell), "bg-[#AAB6E8]");
  });

  it("shows a promote action for detached project-specific components", () => {
    const item = {
      ...estimateLibraryItems[0],
      id: "detached-row-1",
      source: "project" as const,
      sourceLibraryItemId: null,
      linkState: "detached" as const,
    };
    const { onPromoteToLibrary } = renderCell({ item });

    const componentShell = screen.getByLabelText(`${item.material} replaceable estimate component`);
    expect(componentShell).toHaveAttribute("data-component-source", "project");
    expect(componentShell).toHaveAttribute("title", expect.stringContaining("Project Component"));
    fireEvent.click(screen.getByRole("button", { name: `Promote ${item.material} to library` }));
    expect(onPromoteToLibrary).toHaveBeenCalledTimes(1);
  });

  it("keeps the project-specific source rail neutral until the row or component is interactive", () => {
    const item = {
      ...estimateLibraryItems[0],
      id: "detached-row-1",
      source: "project" as const,
      sourceLibraryItemId: null,
      linkState: "detached" as const,
    };
    renderCell({ item });

    const componentShell = screen.getByLabelText(`${item.material} replaceable estimate component`);
    expectNeutralRailWithInteractiveSourceColor(getComponentSourceRail(componentShell), "bg-[#A6B27B]");
  });

  it("uses the olive rail for projected project-specific components", () => {
    const item = {
      ...estimateLibraryItems[0],
      id: "project-projection-row-1",
      source: "project" as const,
      sourceLibraryItemId: null,
      linkState: "unlinked" as const,
      metadata: withProjectComponentProjectionMetadata(
        {},
        { projectId: "project-1", estimateId: "estimate-1", nodeId: "node-1", classification: "detached-library" },
      ),
    };
    renderCell({ item });

    const componentShell = screen.getByLabelText(`${item.material} replaceable estimate component`);
    expect(componentShell).toHaveAttribute("data-component-source", "project");
    expect(componentShell).toHaveAttribute("title", expect.stringContaining("Project Component"));
    expectNeutralRailWithInteractiveSourceColor(getComponentSourceRail(componentShell), "bg-[#A6B27B]");
  });

  it("labels source-less row components as Project Components", () => {
    const item = {
      ...estimateLibraryItems[0],
      id: "source-less-row-1",
      source: "project" as const,
      sourceLibraryItemId: null,
      sourceSnapshot: undefined,
      linkState: "unlinked" as const,
      metadata: {},
    };
    renderCell({ item });

    const componentShell = screen.getByLabelText(`${item.material} replaceable estimate component`);
    expect(componentShell).toHaveAttribute("data-component-source", "manual");
    expect(componentShell).toHaveAttribute("title", expect.stringContaining("Project Component"));
  });
});
