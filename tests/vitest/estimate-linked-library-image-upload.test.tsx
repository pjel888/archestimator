import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { EstimateMaterialCell } from "@/components/workshop/estimate-sheet/rows/cells";
import type { EstimateRowItem } from "@/lib/estimates/types";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("linked Library component image ownership", () => {
  it("uploads through component-owned storage and commits the canonical asset", async () => {
    const MockURL = class extends URL {} as typeof URL;
    MockURL.createObjectURL = vi.fn(() => "blob:library-reference-preview") as typeof URL.createObjectURL;
    MockURL.revokeObjectURL = vi.fn() as typeof URL.revokeObjectURL;
    vi.stubGlobal("URL", MockURL);

    const path = "workspace-1/user-1/library-reference.webp";
    const thumbnailPath = "workspace-1/user-1/library-reference-thumb.webp";
    const url = `/api/component-library/images?path=${path}`;
    const thumbnailUrl = `/api/component-library/images?path=${thumbnailPath}`;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        bucket: "component-images",
        uploadSessionId: "session-library-image",
        assetId: "asset-library-image",
        scanStatus: "not_required",
        path,
        thumbnailPath,
        url,
        thumbnailUrl,
        optimizedBytes: 128,
        contentType: "image/webp",
        width: 640,
        height: 480,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const item: EstimateRowItem = {
      id: "row-1",
      material: "Linked Library Component",
      description: "",
      supplier: "",
      source: "library",
      unit: "pc",
      itemCost: 100,
      quantity: 1,
      subTotal: 100,
      miscCost: 0,
      totalItemCosts: 100,
      category: "General",
      pricingSource: "",
      pricingDate: "",
      sourceLibraryItemId: "library-item-1",
      linkState: "linked-clean",
    };
    const onExpressFieldCommit = vi.fn();

    render(
      <EstimateMaterialCell
        canManageLibrary
        item={item}
        projectId="project-1"
        estimateId="estimate-1"
        editableRow={{
          name: item.material,
          brand: "",
          description: "",
          supplier: "",
          unit: "pc",
          unitCost: "100",
          quantity: "1",
          contingencyMode: "contingency",
          contingencyPercentage: "0",
          miscCost: "0",
          imageUrl: "",
          sourceUrl: "",
        }}
        isReplaceTarget={false}
        onExpressEditorActiveChange={() => {}}
        onExpressFieldChange={() => {}}
        onExpressFieldCommit={onExpressFieldCommit}
        onExpressFieldRevert={() => {}}
        onReplaceDragOver={() => {}}
        onReplaceDragLeave={() => {}}
        onReplace={() => {}}
        onClearComponent={() => {}}
        onRequestProjectSpecific={() => {}}
        onPromoteToLibrary={() => {}}
        onMoveComponent={() => {}}
        onOpenComponentEditor={() => {}}
        onRetryExpressDraft={() => {}}
        onDeleteExpressDraft={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /reference image for/i }));
    const dialog = screen.getByRole("dialog", { name: "Reference image" });
    fireEvent.change(within(dialog).getByLabelText("Upload reference image"), {
      target: { files: [new File(["image"], "library-reference.png", { type: "image/png" })] },
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/component-library/images",
      expect.objectContaining({ method: "POST" }),
    ));
    const formData = fetchMock.mock.calls[0]?.[1]?.body as FormData;
    expect(formData.get("projectId")).toBeNull();
    expect(formData.get("estimateId")).toBeNull();
    await waitFor(() => expect(onExpressFieldCommit).toHaveBeenCalledWith({
      imageUrl: url,
      imageAsset: expect.objectContaining({
        assetId: "asset-library-image",
        bucket: "component-images",
        path,
        thumbnailPath,
      }),
    }));
  });
});
