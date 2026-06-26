import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ProjectEstimatesListSkeleton } from "@/components/workshop/ProjectEstimatesListSkeleton";
import { ProjectEstimatesListRouteFallback } from "@/components/workshop/ProjectEstimatesListRouteFallback";
import { useNavigationUiStore } from "@/stores/navigation-ui-store";

afterEach(() => {
  cleanup();
  useNavigationUiStore.getState().bfcacheRestore();
});

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

  it("renders the list fallback when no sheet-bound navigation is active", () => {
    render(<ProjectEstimatesListRouteFallback />);
    expect(screen.getByRole("status", { name: /loading estimates/i })).toBeInTheDocument();
  });

  it("suppresses the list fallback during estimate sheet navigation", () => {
    useNavigationUiStore.getState().show("/workshop/projects/project-1/estimates/estimate-1");
    const { container } = render(<ProjectEstimatesListRouteFallback />);
    expect(container.textContent).toBe("");
    expect(screen.queryByRole("status", { name: /loading estimates/i })).toBeNull();
  });
});
