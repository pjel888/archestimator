import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectEstimatesListSkeleton } from "@/components/workshop/ProjectEstimatesListSkeleton";

describe("ProjectEstimatesListSkeleton", () => {
  it("announces a loading status with an estimates-specific label", () => {
    render(<ProjectEstimatesListSkeleton />);
    const status = screen.getByRole("status");
    expect(status).toHaveAccessibleName(/loading estimates/i);
    expect(status).toHaveAttribute("aria-busy", "true");
  });

  it("renders the page shape: search bar + toolbar + a multi-row single-column table", () => {
    const { container } = render(<ProjectEstimatesListSkeleton />);
    expect(container.querySelector('[data-skeleton="search"]')).not.toBeNull();
    expect(container.querySelector('[data-skeleton="toolbar"]')).not.toBeNull();
    expect(container.querySelector('[data-skeleton="table"]')).not.toBeNull();
    expect(container.querySelectorAll("[data-skeleton-row]").length).toBe(12);
  });

  it("does not render the node-route sidebar / 2-column grid / right rail", () => {
    const { container } = render(<ProjectEstimatesListSkeleton />);
    // The mismatched ProjectRouteContentFallback used a 2-column grid + right rail.
    expect(container.querySelector('[class*="grid-cols"]')).toBeNull();
    expect(container.querySelector('[class*="border-l"]')).toBeNull();
    expect(screen.queryByLabelText("Loading project workspace")).toBeNull();
  });
});
