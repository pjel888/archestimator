import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DashboardHeadline } from "@/components/workshop/dashboard/DashboardHeadline";
import type { DashboardCostRollup, DashboardHeadline as DashboardHeadlineData } from "@/lib/workshop/dashboard-types";

function headline(overrides: Partial<DashboardHeadlineData> = {}): DashboardHeadlineData {
  return {
    id: "est-1",
    name: "Revised scope",
    total: 1_000_000,
    currencyCode: "PHP",
    updatedAt: "2026-06-12T00:00:00.000Z",
    budget: null,
    variance: null,
    ...overrides,
  };
}

function rollup(overrides: Partial<DashboardCostRollup> = {}): DashboardCostRollup {
  return { kind: "single-currency", total: 1_000_000, currencyCode: "PHP", ...overrides };
}

describe("DashboardHeadline (Zone A)", () => {
  it("renders the cost in the estimate's currency with an honest 'Most recently updated' anchor (R1/R2)", () => {
    render(<DashboardHeadline headline={headline()} estimateCount={4} rollup={rollup()} />);

    expect(screen.getByText("₱1,000,000")).toBeInTheDocument();
    expect(screen.getByText("Most recently updated · Revised scope")).toBeInTheDocument();
    expect(screen.queryByText(/Primary/)).not.toBeInTheDocument();
  });

  it("shows a red over-budget pill with a non-colour cue when over budget (R3)", () => {
    render(
      <DashboardHeadline
        headline={headline({ budget: 800_000, variance: { budget: 800_000, delta: 200_000, percent: 0.25, isOver: true } })}
        estimateCount={2}
        rollup={rollup()}
      />,
    );

    const pill = screen.getByLabelText(/Over budget by ₱200,000/);
    expect(pill).toHaveClass("text-danger");
    expect(pill).toHaveTextContent("▲");
  });

  it("shows a green under-budget pill when under budget (R3)", () => {
    render(
      <DashboardHeadline
        headline={headline({ budget: 1_200_000, variance: { budget: 1_200_000, delta: -200_000, percent: -1 / 6, isOver: false } })}
        estimateCount={2}
        rollup={rollup()}
      />,
    );

    const pill = screen.getByLabelText(/Under budget/);
    expect(pill).toHaveClass("text-success");
    expect(pill).toHaveTextContent("▼");
  });

  it("renders no variance pill when there is no budget (no fabricated zero — R3)", () => {
    render(<DashboardHeadline headline={headline({ budget: null, variance: null })} estimateCount={3} rollup={rollup()} />);
    expect(screen.queryByLabelText(/budget by/)).not.toBeInTheDocument();
  });

  it("renders one quiet meta line with count + freshness, no separate tiles (R4)", () => {
    render(<DashboardHeadline headline={headline()} estimateCount={4} rollup={rollup()} />);
    expect(screen.getByText(/4 estimates · ₱1,000,000 total · updated/)).toBeInTheDocument();
    expect(screen.queryByText(/Currency/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Last updated/)).not.toBeInTheDocument();
  });

  it("uses the singular noun for a single estimate", () => {
    render(<DashboardHeadline headline={headline()} estimateCount={1} rollup={rollup()} />);
    expect(screen.getByText(/^1 estimate · updated/)).toBeInTheDocument();
  });

  it("shows a mixed-currency caption when estimates use different currencies", () => {
    render(<DashboardHeadline headline={headline()} estimateCount={3} rollup={rollup({ kind: "mixed" })} />);
    expect(screen.getByText(/mixed currencies/)).toBeInTheDocument();
  });

  it("shows a single-currency project total when multiple estimates share a currency", () => {
    render(
      <DashboardHeadline
        headline={headline()}
        estimateCount={3}
        rollup={rollup({ total: 3_500_000 })}
      />,
    );
    expect(screen.getByText(/₱3,500,000 total/)).toBeInTheDocument();
  });
});
