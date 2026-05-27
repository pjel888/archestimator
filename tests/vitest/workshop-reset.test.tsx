import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import type { ImgHTMLAttributes } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { WorkshopHomebaseClient } from "@/components/workshop/WorkshopHomebaseClient";
import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";

const mocks = vi.hoisted(() => ({
  routerRefresh: vi.fn(),
  setProjectFavorite: vi.fn(async () => {}),
  setEstimateFavorite: vi.fn(async () => {}),
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUserContext: vi.fn(async () => null),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(() => undefined) })),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop",
  useRouter: () => ({
    refresh: mocks.routerRefresh,
  }),
}));

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; priority?: boolean; sizes?: string }) => {
    const { alt, fill, priority, sizes, ...imageProps } = props;
    void fill;
    void priority;
    void sizes;

    return createElement("img", { alt: alt ?? "", ...imageProps });
  },
}));

vi.mock("@/lib/workshop/actions", () => ({
  setProjectFavorite: mocks.setProjectFavorite,
  setEstimateFavorite: mocks.setEstimateFavorite,
}));

const workshopHomebase = {
  workspace: {
    id: "workspace-1",
    name: "Test Workspace",
    slug: null,
    created_by: "user-1",
    created_at: "2026-05-01T00:00:00.000Z",
    updated_at: "2026-05-01T00:00:00.000Z",
  },
  projects: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      name: "Lewis Residence",
      client_name: "M Family",
      project_code: "AE-LR-001",
      location: "Quezon City",
      updated_at: "2026-05-22T00:00:00.000Z",
      isFavorite: true,
      favoriteCreatedAt: "2026-05-23T00:00:00.000Z",
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      name: "Makati Office",
      client_name: "North Studio",
      project_code: "AE-MO-002",
      location: "Makati",
      updated_at: "2026-05-20T00:00:00.000Z",
      isFavorite: false,
      favoriteCreatedAt: null,
    },
  ],
  estimates: [
    {
      id: "77777777-7777-4777-8777-777777777720",
      project_id: "22222222-2222-4222-8222-222222222222",
      name: "Lewis Residence - 001",
      sheet_code: "ES-001",
      updated_at: "2026-05-24T00:00:00.000Z",
      projectName: "Lewis Residence",
      projectCode: "AE-LR-001",
      firstNodeId: "88888888-8888-4888-8888-888888888888",
      isFavorite: true,
      favoriteCreatedAt: "2026-05-24T00:00:00.000Z",
    },
    {
      id: "99999999-9999-4999-8999-999999999999",
      project_id: "33333333-3333-4333-8333-333333333333",
      name: "Makati Office - Tender",
      sheet_code: "ES-002",
      updated_at: "2026-05-21T00:00:00.000Z",
      projectName: "Makati Office",
      projectCode: "AE-MO-002",
      firstNodeId: null,
      isFavorite: false,
      favoriteCreatedAt: null,
    },
  ],
};

afterEach(() => {
  mocks.routerRefresh.mockClear();
  mocks.setProjectFavorite.mockClear();
  mocks.setEstimateFavorite.mockClear();
});

describe("workshop sidebar baseline", () => {
  test("renders the workshop shell with an overlay sidebar and blank canvas", async () => {
    render(
      await WorkshopPageShell({
        title: "Workshop",
        eyebrow: "Workspace",
        showEyebrow: false,
        breadcrumbs: ["Workshop"],
        contentClassName: "",
        children: <div className="h-full bg-white" aria-label="Workshop empty canvas" />,
      }),
    );

    expect(screen.getByRole("main", { name: "Workshop" })).toBeTruthy();
    expect(screen.queryByText("Workshop shell")).toBeNull();
    expect(screen.queryByText("Select Projects or Components from the sidebar")).toBeNull();
    const navigation = screen.getByRole("navigation", { name: "Main navigation" });
    expect(navigation).toBeTruthy();
    expect(screen.getByRole("button", { name: "Expand sidebar" }).getAttribute("aria-expanded")).toBe("false");
    expect(navigation.querySelector('span[class*="bg-white/[0.10]"]')).toBeTruthy();
    expect(navigation.querySelector('span[class*="backdrop-blur-[1px]"]')).toBeTruthy();
    expect(screen.getByLabelText("Workshop empty canvas").childElementCount).toBe(0);
  });

  test("renders a bento homebase without search chrome and with persisted favorite targets", async () => {
    const user = userEvent.setup();
    const { container } = render(<WorkshopHomebaseClient homebase={workshopHomebase} />);

    expect(container.querySelector("div.h-full.min-h-0.bg-white.p-2")).toBeTruthy();
    expect(screen.queryByLabelText("Search Workshop")).toBeNull();
    expect(screen.queryByLabelText("Workshop tools")).toBeNull();
    expect(screen.queryByRole("button", { name: "Filter workshop" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Group workshop" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Expand all workshop" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Collapse all workshop" })).toBeNull();
    expect(screen.getAllByRole("link", { name: /Open Projects/ })[0]).toHaveAttribute("href", "/workshop/projects");
    expect(screen.getByRole("link", { name: /Open Components/ })).toHaveAttribute("href", "/workshop/library");
    expect(screen.getByRole("link", { name: /Open Templates/ })).toHaveAttribute("href", "/workshop/templates");
    expect(screen.getAllByRole("link", { name: /Open Projects/ })[0]).toHaveClass("aspect-square");
    expect(screen.getByRole("link", { name: /Open Components/ })).toHaveClass("aspect-square");
    expect(screen.getByRole("link", { name: /Open Templates/ })).toHaveClass("aspect-square");
    expect(container.querySelector('img[src="/Cards/Projects-Card.jpg"]')).toBeTruthy();
    expect(container.querySelector('img[src="/Cards/Components-Card.jpg"]')).toBeTruthy();
    expect(container.querySelector('img[src="/Cards/Templates-Card.jpg"]')).toBeTruthy();
    expect(container.querySelector('img[class*="mix-blend-soft-light"]')).toBeTruthy();
    expect(screen.queryByText("Workshop routes")).toBeNull();
    expect(screen.queryByText("Start")).toBeNull();
    expect(screen.queryByText("Reuse")).toBeNull();
    const routePanel = screen.getByRole("region", { name: "Workshop routes" });
    expect(routePanel).toHaveClass("bg-transparent");
    expect(routePanel).toHaveClass("p-0");
    expect(routePanel).toHaveClass("border-0");
    expect(routePanel).not.toHaveClass("bg-white");
    const favorites = screen.getByRole("region", { name: "Favorites" });
    expect(within(favorites).queryByText("Starred")).toBeNull();
    const favoriteTabs = within(favorites).getByRole("tablist", { name: "Favorite views" });
    expect(within(favoriteTabs).getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Projects", "Estimate Sheets"]);
    expect(within(favoriteTabs).getByRole("tab", { name: "Projects" })).toHaveAttribute("aria-selected", "true");
    expect(within(favorites).getByRole("tabpanel", { name: "Favorite projects" })).toBeTruthy();
    expect(within(favorites).getByRole("link", { name: /Lewis Residence/ })).toHaveAttribute(
      "href",
      "/workshop/projects/22222222-2222-4222-8222-222222222222",
    );
    expect(screen.getAllByRole("button", { name: "Remove Lewis Residence from favorite projects" })[0]).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getAllByRole("button", { name: "Remove Lewis Residence from favorite projects" })[0]);
    expect(mocks.setProjectFavorite).toHaveBeenCalledWith({
      projectId: "22222222-2222-4222-8222-222222222222",
      favorite: false,
    });

    await user.click(within(favoriteTabs).getByRole("tab", { name: "Estimate Sheets" }));
    expect(within(favoriteTabs).getByRole("tab", { name: "Estimate Sheets" })).toHaveAttribute("aria-selected", "true");
    expect(within(favorites).getByRole("tabpanel", { name: "Favorite estimate sheets" })).toBeTruthy();
    expect(within(favorites).getByRole("link", { name: /Lewis Residence - 001/ })).toHaveAttribute(
      "href",
      "/workshop/projects/22222222-2222-4222-8222-222222222222/estimates/88888888-8888-4888-8888-888888888888",
    );
    expect(screen.queryByText("Project shortcuts")).toBeNull();
    expect(screen.queryByText("Estimate sheet shortcuts")).toBeNull();
    expect(screen.queryByText("First move")).toBeNull();
    expect(screen.queryByText("Recommended")).toBeNull();

    expect(screen.queryByText("Recent Projects")).toBeNull();
    expect(screen.queryByText("Sample Projects")).toBeNull();
    expect(screen.queryByText("View all")).toBeNull();
  });
});
