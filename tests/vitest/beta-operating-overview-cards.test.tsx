import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BetaOperatingOverviewCards } from "@/components/admin/BetaOperatingOverview";
import { buildBetaOperatingOverview } from "@/lib/admin/beta-operating-overview";

describe("BetaOperatingOverviewCards", () => {
  it("renders aggregate facts with explicit source and unavailable states", () => {
    const overview = buildBetaOperatingOverview({
      actor: { platformRole: "admin" },
      now: new Date("2029-01-01T00:00:00.000Z"),
      sources: {
        activation: { availability: "available", asOf: "2028-12-31T23:59:00.000Z", errorCategory: null, aggregates: { invited: 3, accepted: 2, active: 1, firstProject: 1, firstPricedRow: 0 } },
      },
    });
    render(<BetaOperatingOverviewCards overview={overview} />);

    const section = screen.getByRole("region", { name: "Beta operator overview" });
    expect(within(section).getByText("3")).toBeInTheDocument();
    expect(within(section).getAllByText("Unavailable").length).toBeGreaterThan(0);
    expect(within(section).getAllByText(/Source: activation/)).toHaveLength(5);
  });

  it("renders no protected metric values when the DTO denies access", () => {
    const overview = buildBetaOperatingOverview({ actor: { platformRole: "member", corporateAccountRole: "owner" }, sources: {} });
    render(<BetaOperatingOverviewCards overview={overview} />);

    expect(screen.getByRole("alert")).toHaveTextContent("platform-admin authorization is required");
    expect(screen.queryByText("cohort · invited")).not.toBeInTheDocument();
  });
});
