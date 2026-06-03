import React from "react";
import { render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CostDonutChart } from "@/components/charts/CostDonutChart";
import type { CostBucket } from "@/lib/charts/types";

const buckets: CostBucket[] = [
  { id: "structural", label: "Structural Works", total: 123456.78, share: 0.3333333333333333, color: "#2F5D50", rowCount: 8 },
  { id: "architectural", label: "Architectural Finishes", total: 98765.43, share: 0.26666666666666666, color: "#C57B57", rowCount: 6 },
  { id: "mepf", label: "MEPF Systems", total: 147258.36, share: 0.4, color: "#6B7280", rowCount: 5 },
];

function numericTokens(value: string): string[] {
  return value.match(/-?\d+\.?\d*(?:e[+-]?\d+)?/gi) ?? [];
}

function decimalPlaces(token: string): number {
  const decimal = token.toLowerCase().split("e")[0]?.split(".")[1];
  return decimal?.length ?? 0;
}

describe("CostDonutChart deterministic SVG output", () => {
  it("produces byte-identical SVG markup for identical server renders", () => {
    const first = renderToStaticMarkup(
      <CostDonutChart buckets={buckets} total={369480.57} currencyCode="PHP" label="Cost breakdown" compact />,
    );
    const second = renderToStaticMarkup(
      <CostDonutChart buckets={buckets} total={369480.57} currencyCode="PHP" label="Cost breakdown" compact />,
    );

    expect(second).toBe(first);
  });

  it("rounds all generated SVG path coordinates to at most four decimal places", () => {
    const { container } = render(
      <CostDonutChart buckets={buckets} total={369480.57} currencyCode="PHP" label="Cost breakdown" compact />,
    );

    const paths = [...container.querySelectorAll("svg path[d]")];
    expect(paths.length).toBeGreaterThan(0);

    const overPreciseTokens = paths.flatMap((path) =>
      numericTokens(path.getAttribute("d") ?? "").filter((token) => decimalPlaces(token) > 4),
    );

    expect(overPreciseTokens).toEqual([]);
  });

  it("does not render bucket/total debug diagnostics in data or empty states", () => {
    const populated = render(
      <CostDonutChart buckets={buckets} total={369480.57} currencyCode="PHP" label="Cost breakdown" compact />,
    );
    expect(populated.container.textContent).not.toMatch(/buckets:|🍩/i);
    populated.unmount();

    const empty = render(<CostDonutChart buckets={[]} total={0} currencyCode="PHP" label="Cost breakdown" compact />);
    expect(empty.container.textContent).not.toMatch(/buckets:|total:|🍩/i);
    expect(empty.getByText("No cost rows")).toBeInTheDocument();
  });
});
