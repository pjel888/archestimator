import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CostDonutChart } from "@/components/charts/CostDonutChart";

function sampleBuckets() {
  return [
    { id: "floor", label: "Floor Finishes", total: 48020, share: 0.536, color: "#e69f00", rowCount: 1 },
    { id: "foundations", label: "Foundations", total: 41650, share: 0.464, color: "#f0e442", rowCount: 1 },
  ];
}

describe("CostDonutChart hideCallouts regression", () => {
  it("renders arc paths inside the SVG viewport when callouts are hidden", () => {
    render(
      <CostDonutChart
        buckets={sampleBuckets()}
        total={89670}
        currencyCode="PHP"
        label="Cost by category"
        compact
        hideCallouts
        describedById="breakdown-table"
      />,
    );

    const svg = screen.getByTestId("d3-donut-chart");
    const paths = svg.querySelectorAll("path");
    expect(paths.length).toBeGreaterThan(0);

    const svgRect = svg.getBoundingClientRect();
    paths.forEach((path) => {
      const rect = path.getBoundingClientRect();
      // With the centre translate fix, every arc must sit inside the SVG
      // container (allowing a small sub-pixel tolerance for strokes/anti-aliasing).
      expect(rect.left).toBeGreaterThanOrEqual(svgRect.left - 2);
      expect(rect.top).toBeGreaterThanOrEqual(svgRect.top - 2);
      expect(rect.right).toBeLessThanOrEqual(svgRect.right + 2);
      expect(rect.bottom).toBeLessThanOrEqual(svgRect.bottom + 2);
    });

    // The center label should also be inside the SVG.
    const centerLabel = screen.getByTestId("donut-center-empty");
    const labelRect = centerLabel.getBoundingClientRect();
    expect(labelRect.left).toBeGreaterThanOrEqual(svgRect.left);
    expect(labelRect.right).toBeLessThanOrEqual(svgRect.right);
  });

  it("remains inside the SVG viewport in full callout mode", () => {
    render(
      <CostDonutChart
        buckets={sampleBuckets()}
        total={89670}
        currencyCode="PHP"
        label="Cost by category"
        compact
      />,
    );

    const svg = screen.getByTestId("d3-donut-chart");
    const paths = svg.querySelectorAll("path");
    const svgRect = svg.getBoundingClientRect();
    paths.forEach((path) => {
      const rect = path.getBoundingClientRect();
      expect(rect.left).toBeGreaterThanOrEqual(svgRect.left - 2);
      expect(rect.top).toBeGreaterThanOrEqual(svgRect.top - 2);
      expect(rect.right).toBeLessThanOrEqual(svgRect.right + 2);
      expect(rect.bottom).toBeLessThanOrEqual(svgRect.bottom + 2);
    });
  });
});
