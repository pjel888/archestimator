import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ShareEstimateTreePanel } from "@/components/share/ShareEstimateTreePanel";
import type { ShareTreeNode } from "@/lib/share/reconstruct-share-tree";

const treeFixture: ShareTreeNode[] = [
  {
    id: "root",
    label: "Main Estimate",
    kind: "group",
    total: 1000,
    rowCount: 1,
    depth: 0,
    rows: [],
    children: [
      {
        id: "kitchen",
        label: "Kitchen",
        kind: "area",
        total: 1000,
        rowCount: 1,
        depth: 1,
        rows: [
          {
            id: "row-kitchen",
            description: "Porcelain tile",
            designation: "TILE-01",
            discipline: "Finishes",
            material: "Tile",
            quantity: 12,
            unit: "sqm",
            rowTotal: 1000,
          },
        ],
        children: [],
      },
    ],
  },
];

describe("ShareEstimateTreePanel accessibility", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("keeps navigable leaf tree rows keyboard reachable", () => {
    const onNavigate = vi.fn();

    render(
      <ShareEstimateTreePanel
        nodes={treeFixture}
        currencyCode="PHP"
        showInlineRows={false}
        onNavigate={onNavigate}
      />,
    );

    const leaf = screen.getByRole("treeitem", { name: /Kitchen/i });
    expect(leaf).toHaveAttribute("tabindex", "0");

    fireEvent.keyDown(leaf, { key: "Enter" });
    fireEvent.keyDown(leaf, { key: " " });

    expect(onNavigate).toHaveBeenCalledTimes(2);
    expect(onNavigate).toHaveBeenNthCalledWith(1, "kitchen");
    expect(onNavigate).toHaveBeenNthCalledWith(2, "kitchen");
  });

  it("keeps quantity and unit visible in mobile inline row summaries", async () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(max-width: 767px)",
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(
      <ShareEstimateTreePanel
        nodes={treeFixture}
        currencyCode="PHP"
        showInlineRows
      />,
    );

    fireEvent.click(screen.getByRole("treeitem", { name: /Main Estimate/i }));
    expect(await screen.findByText("Porcelain tile")).toBeInTheDocument();
    expect(screen.getByText("Qty 12 · sqm")).toBeInTheDocument();
  });
});
