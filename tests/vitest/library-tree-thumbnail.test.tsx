import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LibraryTree } from "@/components/workshop/component-library/tree/LibraryTree";
import type { EstimateRowItem } from "@/lib/estimates/types";

const componentItem: EstimateRowItem = {
  id: "component-pergo",
  material: "Dark Cottage Oak",
  name: "Dark Cottage Oak",
  description: "Oak flooring",
  supplier: "",
  source: "library",
  unit: "box",
  itemCost: 2500.5,
  price: 2500.5,
  currency: "PHP",
  quantity: 1,
  subTotal: 2500.5,
  miscCost: 0,
  totalItemCosts: 2500.5,
  category: "Flooring",
  imageUrl: "11111111-1111-4111-8111-111111111111/user-1/component-images/pergo-thumb.webp",
};

describe("LibraryTree thumbnails", () => {
  it("brokers stored component thumbnail keys into the component image route", () => {
    const { container } = render(
      <LibraryTree
        nodes={[{ id: componentItem.id, label: componentItem.name, item: componentItem }]}
        selectedNodeId={null}
        expandedNodeIds={[]}
        searchQuery=""
        onToggle={vi.fn()}
        showThumbnails
      />,
    );

    const thumbnail = container.querySelector("[data-component-library-row-thumbnail] img") as HTMLImageElement | null;
    expect(thumbnail).not.toBeNull();
    expect(decodeURIComponent(thumbnail.src)).toContain(
      "/api/component-library/images?path=11111111-1111-4111-8111-111111111111/user-1/component-images/pergo-thumb.webp",
    );
  });

  it("renders an existing project-backed component thumbnail", () => {
    const projectThumbnailPath = "11111111-1111-4111-8111-111111111111/user-1/project-images/22222222-2222-4222-8222-222222222222/pergo-thumb.webp";
    const item = { ...componentItem, imageUrl: `/api/projects/images?path=${encodeURIComponent(projectThumbnailPath)}` };
    const { container } = render(
      <LibraryTree
        nodes={[{ id: item.id, label: item.name, item }]}
        selectedNodeId={null}
        expandedNodeIds={[]}
        searchQuery=""
        onToggle={vi.fn()}
        showThumbnails
      />,
    );

    const thumbnail = container.querySelector("[data-component-library-row-thumbnail] img") as HTMLImageElement | null;
    expect(thumbnail).not.toBeNull();
    expect(decodeURIComponent(thumbnail.src)).toContain(`/api/projects/images?path=${projectThumbnailPath}`);
  });
});
