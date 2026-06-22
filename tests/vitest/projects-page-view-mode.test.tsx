import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ProjectsPageClient,
  type ProjectListItem,
} from "./projects-page-test-harness";
import type { ProjectFavoriteEstimateSheetSummary } from "@/lib/repositories/workspace-repository";
import type { Tables } from "@/lib/supabase/types";

const routerMock = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@/lib/workshop/actions", () => ({
  setProjectFavorite: vi.fn(async () => undefined),
}));

const STORAGE_KEY = "archestimator_projects_view_mode_v1";

const PROJECT_FIXTURE = {
  id: "11111111-1111-4111-8111-111111111111",
  workspace_id: "22222222-2222-4222-8222-222222222222",
  name: "Lewis Residence",
  client_name: "Lewis Family",
  location: "Quezon City, Metro Manila, Philippines",
  project_code: "AE-LR-001",
  currency_code: "PHP",
  metadata: {},
  created_at: "2026-05-20T00:00:00.000Z",
  updated_at: "2026-05-26T00:00:00.000Z",
  created_by: null,
} satisfies Tables<"projects">;

function createFavoriteEstimateSheet(
  index: number,
  name: string,
): ProjectFavoriteEstimateSheetSummary {
  return {
    id: `00000000-0000-4000-8000-00000000010${index}`,
    project_id: PROJECT_FIXTURE.id,
    name,
    sheet_code: `S-${index}`,
    updated_at: "2026-05-26T00:00:00.000Z",
    favoriteCreatedAt: `2026-05-2${index}T00:00:00.000Z`,
  };
}

function createProjectItem(
  project: Tables<"projects">,
  favoriteEstimateSheets: ProjectFavoriteEstimateSheetSummary[] = [],
): ProjectListItem {
  return {
    project,
    accessKind: "owned",
    currentUserRole: "owner",
    ownerWorkspaceName: null,
    pendingInviteCount: 0,
    publicationSummary: null,
    sharedEstimateCount: 0,
    favoriteEstimateSheets,
  };
}

async function selectViewMode(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole("combobox", { name: "View" }));
  await user.click(screen.getByRole("option", { name: label }));
}

describe("ProjectsPageClient view modes", () => {
  beforeEach(() => {
    window.localStorage.clear();
    routerMock.refresh.mockClear();
  });

  it("defaults to large cards and persists selected thumbnail density", async () => {
    const user = userEvent.setup();
    const { container } = render(<ProjectsPageClient projects={[PROJECT_FIXTURE]} />);

    expect(container.firstElementChild).toHaveClass("dashboard-canvas-wash");
    expect(screen.getByLabelText("Project tools")).toHaveClass("bg-transparent");
    expect(screen.getByRole("tablist", { name: "Project access tabs" }).closest("[data-navigation-tabs]")).toHaveClass(
      "bg-transparent",
    );
    expect(screen.getByLabelText("Lewis Residence project, owned access")).toHaveClass("workshop-project-card-glass");
    expect(screen.getByLabelText("Live projects")).toHaveAttribute(
      "data-project-view-mode",
      "large",
    );
    const viewTrigger = screen.getByRole("combobox", { name: "View" });
    expect(viewTrigger).not.toHaveTextContent("View:");
    expect(viewTrigger).not.toHaveTextContent("Large thumbnails");
    expect(viewTrigger).toHaveAttribute("title", "Large");
    expect(viewTrigger.querySelectorAll("svg")).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "Add projects" }).parentElement?.parentElement,
    ).toHaveClass("ml-auto");
    expect(
      screen.getByRole("combobox", { name: "View" }).closest("[role='group']"),
    ).not.toHaveClass("ml-auto");
    expect(container.querySelector("[data-project-card-thumbnail]")).toHaveClass("aspect-[4/3]");

    await user.click(viewTrigger);
    expect(screen.getByRole("option", { name: "Large" }).querySelector("svg")).not.toBeNull();
    await user.click(screen.getByRole("option", { name: "Small" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Live projects")).toHaveAttribute(
        "data-project-view-mode",
        "small",
      );
    });
    expect(container.querySelector("[data-project-card-view]")).toHaveAttribute(
      "data-project-card-view",
      "small",
    );
    expect(container.querySelector("[data-project-card-thumbnail]")).toHaveClass("aspect-[4/3]");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("small");

    await selectViewMode(user, "Medium");

    await waitFor(() => {
      expect(screen.getByLabelText("Live projects")).toHaveAttribute(
        "data-project-view-mode",
        "medium",
      );
    });
    expect(container.querySelector("[data-project-card-view]")).toHaveAttribute(
      "data-project-card-view",
      "medium",
    );
    expect(container.querySelector("[data-project-card-thumbnail]")).toHaveClass("aspect-[4/3]");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("medium");
  });

  it("restores the stored project list view mode", async () => {
    window.localStorage.setItem(STORAGE_KEY, "list");

    const { container } = render(<ProjectsPageClient projects={[PROJECT_FIXTURE]} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Live projects")).toHaveAttribute(
        "data-project-view-mode",
        "list",
      );
    });
    const viewTrigger = screen.getByRole("combobox", { name: "View" });
    expect(viewTrigger).not.toHaveTextContent("View:");
    expect(viewTrigger).not.toHaveTextContent("List");
    expect(viewTrigger).toHaveAttribute("title", "List");
    expect(container.querySelector("[data-project-card-view]")).toHaveAttribute(
      "data-project-card-view",
      "list",
    );
  });

  it("reserves aligned favorite estimate sheet space and caps visible sheets at five", () => {
    window.localStorage.setItem(STORAGE_KEY, "large");

    const secondProject = {
      ...PROJECT_FIXTURE,
      id: "11111111-1111-4111-8111-111111111112",
      name: "Tropical House",
      project_code: "AE-TH-002",
    } satisfies Tables<"projects">;

    render(
      <ProjectsPageClient
        projects={[
          createProjectItem(PROJECT_FIXTURE, [
            createFavoriteEstimateSheet(1, "Foundation BOQ"),
            createFavoriteEstimateSheet(2, "Roof Framing"),
            createFavoriteEstimateSheet(3, "Interior Fit-Out"),
            createFavoriteEstimateSheet(4, "Electrical Works"),
            createFavoriteEstimateSheet(5, "Plumbing Rough-In"),
            createFavoriteEstimateSheet(6, "Landscape Package"),
          ]),
          createProjectItem(secondProject),
        ]}
      />,
    );

    const favoriteCard = screen.getByLabelText("Lewis Residence project, owned access");
    const favoriteTray = favoriteCard.querySelector("[data-project-card-favorite-sheets]");
    expect(favoriteTray).not.toBeNull();
    expect(within(favoriteTray as HTMLElement).queryByText("Favorite sheets")).not.toBeInTheDocument();
    expect(within(favoriteTray as HTMLElement).queryByText("5/5")).not.toBeInTheDocument();
    expect(within(favoriteTray as HTMLElement).getByRole("link", { name: "Foundation BOQ" })).toHaveAttribute(
      "href",
      "/workshop/projects/11111111-1111-4111-8111-111111111111/estimates/00000000-0000-4000-8000-000000000101",
    );
    expect(within(favoriteTray as HTMLElement).getByRole("link", { name: "Plumbing Rough-In" })).toHaveAttribute(
      "href",
      "/workshop/projects/11111111-1111-4111-8111-111111111111/estimates/00000000-0000-4000-8000-000000000105",
    );
    expect(within(favoriteTray as HTMLElement).queryByText("Landscape Package")).not.toBeInTheDocument();

    const emptyCard = screen.getByLabelText("Tropical House project, owned access");
    const emptyTray = emptyCard.querySelector("[data-project-card-favorite-sheets]");
    expect(emptyTray).not.toBeNull();
    expect(emptyTray).toHaveTextContent("");
    expect(emptyTray).toHaveAttribute(
      "aria-label",
      "No favorite estimate sheets for Tropical House",
    );
  });

  it("reserves shared-link and status rows without leaking empty placeholders", () => {
    window.localStorage.setItem(STORAGE_KEY, "large");

    const secondProject = {
      ...PROJECT_FIXTURE,
      id: "11111111-1111-4111-8111-111111111113",
      name: "Harbour Box",
      client_name: "Hong Kong Government",
      project_code: "AE-HB-003",
    } satisfies Tables<"projects">;

    render(
      <ProjectsPageClient
        projects={[
          {
            ...createProjectItem(PROJECT_FIXTURE),
            publicationSummary: {
              status: "published",
              clientLinkPath: "/p/lewis-residence",
              openCount: 1,
              latestOpenedAt: null,
              passwordRequired: false,
            },
          },
          createProjectItem(secondProject),
        ]}
      />,
    );

    const publishedCard = screen.getByLabelText("Lewis Residence project, owned access");
    const plainCard = screen.getByLabelText("Harbour Box project, owned access");

    const plainStatusSlot = plainCard.querySelector("[data-project-card-status-slot]");
    expect(plainStatusSlot).toHaveTextContent("");

    expect(publishedCard.querySelector("[data-project-card-shared-link-indicator]")).toBeNull();
    expect(publishedCard.querySelector("[data-project-card-details-action]")).not.toBeNull();
    expect(plainCard.querySelector("[data-project-card-details-action]")).not.toBeNull();
    expect(publishedCard.querySelector("[data-project-card-shared-link-meta]")).toBeNull();
    expect(plainCard.querySelector("[data-project-card-shared-link-meta]")).toBeNull();
    expect(publishedCard).not.toHaveTextContent("1 open");
  });

  it("keeps the live-project shell for first-run users", async () => {
    const user = userEvent.setup();
    render(<ProjectsPageClient projects={[]} />);

    const liveProjects = screen.getByLabelText("Live projects");
    expect(liveProjects).toHaveAttribute("data-project-view-mode", "large");
    expect(within(liveProjects).queryAllByRole("article")).toHaveLength(0);
    expect(screen.queryByLabelText("Sample project references")).not.toBeInTheDocument();
    expect(screen.queryByText("Create the first live project")).not.toBeInTheDocument();
    expect(screen.queryByText("No live projects yet.")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add projects" }));

    expect(await screen.findByRole("dialog", { name: "Create project" })).toBeInTheDocument();
  });

  it("keeps the live-project shell for live project search misses", async () => {
    const user = userEvent.setup();
    render(<ProjectsPageClient projects={[PROJECT_FIXTURE]} />);

    await user.click(screen.getByRole("button", { name: "Show projects search" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search projects" }), { target: { value: "zzzz-project" } });

    expect(within(screen.getByLabelText("Live projects")).queryAllByRole("article")).toHaveLength(0);
    expect(screen.queryByText("No projects match your search")).not.toBeInTheDocument();
    expect(screen.queryByText("Try adjusting your search terms")).not.toBeInTheDocument();
  });

  it("labels shared project memberships without hiding them behind the owned view", () => {
    const { container } = render(
      <ProjectsPageClient
        projects={[
          {
            project: PROJECT_FIXTURE,
            accessKind: "project-member",
            currentUserRole: "viewer",
            ownerWorkspaceName: "Lewis Workspace",
            sharedEstimateCount: 0,
          },
        ]}
      />,
    );

    expect(container.querySelector('[data-project-access-kind="project-member"]')).toBeInTheDocument();
    expect(screen.getByText("Shared project")).toBeInTheDocument();
    expect(screen.getByLabelText("Lewis Residence project, shared project, viewer access")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Shared/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByText("No live projects yet")).not.toBeInTheDocument();
  });
});
