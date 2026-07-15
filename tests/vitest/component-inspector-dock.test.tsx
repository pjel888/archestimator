import { fireEvent, render, screen } from "@testing-library/react";
import type { ImgHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type { EstimateRowItem } from "@/lib/estimates/types";

const actionMocks = vi.hoisted(() => ({
  getCostLibraryComponentUsage: vi.fn(async () => ({ templateRowCount: 0, estimateRowCount: 0 })),
}));

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; unoptimized?: boolean }) => {
    const { fill, alt, unoptimized, ...imageProps } = props;
    void fill;
    return (
      // eslint-disable-next-line @next/next/no-img-element -- test double for next/image behavior.
      <img {...imageProps} alt={alt ?? ""} data-unoptimized={String(Boolean(unoptimized))} />
    );
  },
}));
vi.mock("@/lib/component-library/actions", () => actionMocks);
vi.mock("@/hooks/use-media-query", () => ({ useMediaQuery: () => false }));
vi.mock("@/components/workshop/ResizableSidePanel", () => ({
  ResizableSidePanel: ({ ariaLabel, children }: { ariaLabel: string; children: ReactNode }) => (
    <aside aria-label={ariaLabel}>{children}</aside>
  ),
}));

import { ComponentInspectorDock } from "@/components/workshop/library/ComponentInspectorDock";

const item = {
  id: "component-1",
  material: "Broken API thumbnail",
  name: "Broken API thumbnail",
  description: "",
  supplier: "",
  source: "library",
  unit: "pc",
  itemCost: 120,
  quantity: 1,
  subTotal: 120,
  miscCost: 0,
  totalItemCosts: 120,
  imageUrl: "/api/projects/images?path=workspace%2Fbroken-thumb.webp",
  category: "Finishes",
  pricingSource: "",
  pricingDate: "",
} satisfies EstimateRowItem;

describe("ComponentInspectorDock", () => {
  it("serves authenticated API thumbnails directly and falls back without changing geometry", () => {
    render(
      <ComponentInspectorDock
        item={item}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDuplicate={vi.fn()}
        onArchive={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const thumbnail = screen.getByAltText("Broken API thumbnail thumbnail");
    expect(thumbnail).toHaveAttribute("src", item.imageUrl);
    expect(thumbnail).toHaveAttribute("data-unoptimized", "true");
    expect(thumbnail.closest("[data-component-inspector-thumbnail]")).toHaveClass(
      "h-[120px]",
      "w-[120px]",
      "shrink-0",
    );

    fireEvent.error(thumbnail);

    expect(screen.getByRole("img", { name: "Broken API thumbnail thumbnail unavailable" })).toBeInTheDocument();
    expect(screen.queryByAltText("Broken API thumbnail thumbnail")).not.toBeInTheDocument();
  });

  it("offers archive but never exposes permanent deletion", async () => {
    render(
      <ComponentInspectorDock
        item={item}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDuplicate={vi.fn()}
        onArchive={vi.fn()}
        onDelete={vi.fn()}
        canDelete
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Component actions" }));

    expect(await screen.findByRole("menuitem", { name: "Archive component" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Delete permanently" })).not.toBeInTheDocument();
  });
});
