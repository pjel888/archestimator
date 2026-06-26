import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

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
      editableRow={{
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
      onOpenComponentDetails={() => {}}
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

  it("renders read-only component units in a fixed right-aligned slot", () => {
    const { container, item } = renderCell();

    const slot = getMaterialUnitSlot(container);
    expect(slot).toHaveClass("w-16", "justify-end", "text-right");
    expect(slot).toHaveTextContent(`/ ${item.unit}`);

    const label = slot.querySelector("[data-estimate-material-unit-label='true']");
    expect(label).toHaveClass("text-right");
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

    expect(onExpressFieldCommit).toHaveBeenCalledWith({ imageUrl: "https://assets.example.test/custom-reference.jpg" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Reference image" })).not.toBeInTheDocument());
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
      json: async () => ({ url: "https://assets.example.test/uploaded-reference.webp" }),
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
    fireEvent.click(within(dialog).getByRole("button", { name: "Save image" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/component-library/images", expect.objectContaining({ method: "POST" })));
    await waitFor(() => expect(onExpressFieldCommit).toHaveBeenCalledWith({ imageUrl: "https://assets.example.test/uploaded-reference.webp" }));
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:reference-preview");
  });

  it("does not close or commit when Escape is pressed during image upload", async () => {
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:reference-preview"),
      revokeObjectURL: vi.fn(),
    });
    const fetchMock = vi.fn(() => new Promise(() => undefined));
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
    fireEvent.click(within(dialog).getByRole("button", { name: "Save image" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Uploading image..."));

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("dialog", { name: "Reference image" })).toBeInTheDocument();
    expect(onExpressFieldCommit).not.toHaveBeenCalled();
  });

  it("does not close from header or overlay while image upload is pending", async () => {
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:reference-preview"),
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));

    const item = {
      ...estimateLibraryItems[0],
      id: "express-row-1",
      imageUrl: "",
      sourceLibraryItemId: null,
      linkState: "unlinked" as const,
      metadata: withExpressComponentMetadata({}, { id: "express-1" }),
    };
    const onExpressFieldCommit = vi.fn();
    const { baseElement } = renderCell({
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
    fireEvent.click(within(dialog).getByRole("button", { name: "Save image" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Uploading image..."));

    fireEvent.click(screen.getByRole("button", { name: "Close reference image modal" }));
    expect(screen.getByRole("dialog", { name: "Reference image" })).toBeInTheDocument();

    const overlay = baseElement.querySelector("[data-archestimator-dialog-overlay]");
    expect(overlay).toBeInstanceOf(HTMLElement);
    fireEvent.click(overlay as HTMLElement);
    expect(screen.getByRole("dialog", { name: "Reference image" })).toBeInTheDocument();
    expect(onExpressFieldCommit).not.toHaveBeenCalled();
  });

  it("clears the file preview when switching to a pasted URL", async () => {
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:reference-preview"),
      revokeObjectURL,
    });

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
    fireEvent.change(within(dialog).getByLabelText("Reference image URL"), {
      target: { value: "https://assets.example.test/reference.jpg" },
    });

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:reference-preview");
  });

  it("keeps the image modal open with an alert when upload fails", async () => {
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
    fireEvent.click(within(dialog).getByRole("button", { name: "Save image" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not store image.");
    expect(screen.getByRole("dialog", { name: "Reference image" })).toBeInTheDocument();
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
      { name: `Open component details for ${item.material}`, tooltip: "Component details" },
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
    expect(slot).toHaveClass("w-16", "justify-end", "text-right");

    const unitInput = screen.getByLabelText("Unit");
    expect(slot).toContainElement(unitInput);
    expect(unitInput).toHaveClass("w-12", "text-right");
    expect(unitInput).toHaveValue("month");
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
