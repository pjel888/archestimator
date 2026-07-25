import { readFileSync } from "node:fs";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkshopTitleHeader } from "@/components/workshop/WorkshopTitleHeader";

const pathnameState = vi.hoisted(() => ({
  value: "/workshop",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameState.value,
}));

afterEach(() => {
  cleanup();
  pathnameState.value = "/workshop";
});

describe("WorkshopTitleHeader back control", () => {
  it("removes the reserved back-control space when disabled", () => {
    const { container } = render(
      <WorkshopTitleHeader
        title="Workshop"
        showBackButton={false}
        titleSlot={<div data-testid="workshop-greeting">Good evening</div>}
        breadcrumbs={[]}
      />,
    );

    const greeting = screen.getByTestId("workshop-greeting");
    expect(greeting.parentElement?.firstElementChild).toBe(greeting);
    expect(
      container.querySelector("header > div > span[aria-hidden='true']"),
    ).toBeNull();
  });

  it("keeps the back control enabled by default on nested Workshop routes", () => {
    pathnameState.value = "/workshop/settings/profile";

    render(
      <WorkshopTitleHeader
        title="Profile"
        breadcrumbs={["Workshop", "Settings", "Profile"]}
      />,
    );

    expect(screen.getByRole("link", { name: "Go back" })).toHaveAttribute(
      "href",
      "/workshop/settings",
    );
  });

  it("keeps the reserved back-control space by default on primary Workshop routes", () => {
    pathnameState.value = "/workshop/projects";

    const { container } = render(
      <WorkshopTitleHeader title="Projects" breadcrumbs={["Workshop", "Projects"]} />,
    );

    expect(
      container.querySelector("header > div > span[aria-hidden='true']"),
    ).toBeInTheDocument();
  });

  it("wires the opt-out only through the Workshop root route", () => {
    const routeHeaderSource = readFileSync(
      "src/components/workshop/WorkshopRouteHeader.tsx",
      "utf8",
    );
    const workshopRootSource = readFileSync(
      "src/app/workshop/page.tsx",
      "utf8",
    );

    expect(routeHeaderSource).toContain("showBackButton={showBackButton}");
    expect(workshopRootSource).toContain("showBackButton={false}");
  });
});
