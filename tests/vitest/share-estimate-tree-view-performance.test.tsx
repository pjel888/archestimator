import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ShareEstimateTreeView } from "@/components/share/ShareEstimateTreeView";
import type { ShareTreeNode } from "@/lib/share/reconstruct-share-tree";

function makeRows(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `row-${index}`,
    description: `Large proposal row ${index}`,
    designation: `ROW-${index}`,
    discipline: "Architectural",
    material: "Allowance",
    quantity: index + 1,
    unit: "ea",
    rowTotal: 100,
  }));
}

describe("ShareEstimateTreeView performance guard", () => {
  it("caps inline tree rows for large proposals instead of mounting the full row tail", () => {
    const nodes: ShareTreeNode[] = [
      {
        id: "large-area",
        label: "Large Area",
        kind: "area",
        total: 26_000,
        rowCount: 260,
        depth: 0,
        rows: makeRows(260),
        children: [],
      },
    ];

    render(<ShareEstimateTreeView nodes={nodes} currencyCode="PHP" />);

    expect(screen.getByText("Large proposal row 0")).toBeInTheDocument();
    expect(screen.getByText("Large proposal row 249")).toBeInTheDocument();
    expect(screen.queryByText("Large proposal row 250")).not.toBeInTheDocument();
    expect(screen.getByText("250 of 260 rows shown in tree view.")).toBeInTheDocument();
  });
});
