import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ProjectsPageClient,
  type ProjectListItem,
} from "./projects-page-test-harness";
import type { ProjectCardEstimateSheetSummary } from "@/lib/repositories/workspace-repository";
import type { ProjectRow } from "@/lib/types/database";

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
} satisfies ProjectRow;

function createEstimateSheet(
  index: number,
  name: string,
): ProjectCardEstimateSheetSummary {
  return {
    id: `00000000-0000-4000-8000-00000000010${index}`,
    project_id: PROJECT_FIXTURE.id,
    name,
    sheet_code: `S-${index}`,
    updated_at: `2026-05-2${index}T00:00:00.000Z`,
  };
}

function createProjectItem(
  project: ProjectRow,
  estimateSheets: ProjectCardEstimateSheetSummary[] = [],
): ProjectListItem {
  return {
    project,
    accessKind: "owned",
    currentUserRole: "owner",
    ownerWorkspaceName: null,
    pendingInviteCount: 0,
    publicationSummary: null,
    sharedEstimateCount: 0,
    favoriteEstimateSheets: [],
    estimateSheets,
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

    expect(container.firstElementChild).toHaveClass("flex", "h-full", "flex-col");
    expect(screen.getByLabelText("Project tools")).toHaveClass("bg-transparent");
    expect(screen.queryByRole("tablist", { name: "Project access tabs" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Lewis Residence project, owned access")).toHaveClass("workshop-project-card-glass");
    expect(screen.getByLabelText("Live projects")).toHaveAttribute(
      "data-project-view-mode",
      "large",
    );
    const viewTrigger = screen.getByRole("combobox", { name: "View" });
    expect(viewTrigger).not.toHaveTextContent("View:");
    expect(viewTrigger).not.toHaveTextContent("Large thumbnails");
    expect(viewTrigger).toHaveAttribute("title", "View: Large");
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
    expect(viewTrigger).toHaveAttribute("title", "View: List");
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
    } satisfies ProjectRow;

    render(
      <ProjectsPageClient
        projects={[
          createProjectItem(PROJECT_FIXTURE, [
            createEstimateSheet(1, "Foundation BOQ"),
            createEstimateSheet(2, "Roof Framing"),
            createEstimateSheet(3, "Interior Fit-Out"),
            createEstimateSheet(4, "Electrical Works"),
            createEstimateSheet(5, "Plumbing Rough-In"),
            createEstimateSheet(6, "Landscape Package"),
          ]),
          createProjectItem(secondProject),
        ]}
      />,
    );

    const favoriteCard = screen.getByLabelText("Lewis Residence project, owned access");
    const estimateTray = favoriteCard.querySelector("[data-project-card-estimate-sheets]");
    expect(estimateTray).not.toBeNull();
    expect(estimateTray).toHaveAttribute("aria-label", "Estimate sheets for Lewis Residence");
    expect(within(estimateTray as HTMLElement).queryByText("Favorite sheets")).not.toBeInTheDocument();
    expect(within(estimateTray as HTMLElement).queryByText("5/5")).not.toBeInTheDocument();
    expect(within(estimateTray as HTMLElement).getByRole("link", { name: "Foundation BOQ" })).toHaveAttribute(
      "href",
      "/workshop/projects/11111111-1111-4111-8111-111111111111/estimates/00000000-0000-4000-8000-000000000101",
    );
    expect(within(estimateTray as HTMLElement).getByRole("link", { name: "Plumbing Rough-In" })).toHaveAttribute(
      "href",
      "/workshop/projects/11111111-1111-4111-8111-111111111111/estimates/00000000-0000-4000-8000-000000000105",
    );
    expect(within(estimateTray as HTMLElement).getByRole("link", { name: "Landscape Package" })).toBeInTheDocument();
    expect(within(estimateTray as HTMLElement).queryByText("+1 more")).not.toBeInTheDocument();
    expect(
      within(estimateTray as HTMLElement)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual([
      "Landscape Package",
      "Plumbing Rough-In",
      "Electrical Works",
      "Interior Fit-Out",
      "Roof Framing",
      "Foundation BOQ",
    ]);
    expect(favoriteCard.querySelector("[data-project-card-estimate-sheet-list]")).toHaveClass("overflow-y-auto");

    const emptyCard = screen.getByLabelText("Tropical House project, owned access");
    const emptyTray = emptyCard.querySelector("[data-project-card-estimate-sheets]");
    expect(emptyTray).not.toBeNull();
    expect(emptyTray).toHaveTextContent("");
    expect(emptyTray).toHaveAttribute(
      "aria-label",
      "No estimate sheets for Tropical House",
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
    } satisfies ProjectRow;

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
    expect(liveProjects).toHaveAttribute("data-project-view-mode");
    expect(within(liveProjects).queryAllByRole("article")).toHaveLength(0);
    expect(screen.queryByLabelText("Sample project references")).not.toBeInTheDocument();
    expect(screen.queryByText("Create the first live project")).not.toBeInTheDocument();
    expect(screen.queryByText("No live projects yet.")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add projects" }));

    expect(await screen.findByRole("dialog", { name: /create project/i })).toBeInTheDocument();
  });

  it("shows a modal-like empty state for live project search misses", async () => {
    const user = userEvent.setup();
    render(<ProjectsPageClient projects={[PROJECT_FIXTURE]} />);

    await user.click(screen.getByRole("button", { name: "Show projects search" }));
    const searchbox = screen.getByRole("searchbox", { name: "Search projects" });
    const searchPanel = document.querySelector<HTMLElement>("[data-tree-search-panel='true']");
    const searchRoot = searchbox.closest<HTMLElement>("[data-search-input-root='true']");

    expect(searchPanel).toHaveClass("bg-white/70", "backdrop-blur-xl", "rounded-b-[8px]");
    expect(searchRoot).toHaveClass("bg-transparent");
    expect(searchbox).toHaveClass("appearance-none", "bg-transparent", "shadow-none");
    expect(searchbox).toHaveAttribute("style", expect.stringContaining("background: transparent"));
    expect(searchbox).toHaveAttribute("type", "text");
    expect(searchbox).toHaveAttribute("role", "searchbox");
    expect(searchPanel).not.toHaveClass("focus-within:ring-1", "focus-within:ring-focus/30");
    expect(searchRoot).not.toHaveClass("focus-within:ring-1", "transition-[box-shadow,background-color,border-color]");

    fireEvent.change(searchbox, { target: { value: "zzzz-project" } });

    await waitFor(() => {
      expect(within(screen.getByLabelText("Live projects")).queryAllByRole("article")).toHaveLength(0);
    });
    const emptyState = screen.getByRole("region", {
      name: "No search results for zzzz-project",
    });
    expect(screen.getByLabelText("Projects")).toHaveClass("h-full", "min-h-0");
    expect(screen.getByLabelText("Live projects")).toHaveClass("min-h-0", "flex-1");
    expect(emptyState).toHaveAttribute("data-project-search-empty-state");
    expect(emptyState).toHaveTextContent('No search results for "zzzz-project"');
    expect(emptyState).toHaveTextContent("Try a project name, client, location, or project code.");
    expect(emptyState).toHaveClass("bg-white", "shadow-[0_10px_24px_rgba(30,35,50,0.075),0_2px_7px_rgba(30,35,50,0.045),inset_0_1px_0_rgba(255,255,255,0.88)]");
    expect(emptyState).not.toHaveClass("workshop-create-project-modal-glass");

    await user.click(within(emptyState).getByRole("button", { name: "Clear search" }));

    await waitFor(() => {
      expect(searchbox).toHaveValue("");
      expect(within(screen.getByLabelText("Live projects")).queryAllByRole("article")).toHaveLength(1);
    });
    expect(screen.queryByRole("region", { name: /No search results for/ })).not.toBeInTheDocument();
  });

  it("does not render shared project memberships on the Projects page", () => {
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

    expect(container.querySelector('[data-project-access-kind="project-member"]')).toBeNull();
    expect(screen.queryByText("Shared project")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Lewis Residence project, shared project, viewer access")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /Shared/i })).not.toBeInTheDocument();
    expect(screen.queryByText("No live projects yet")).not.toBeInTheDocument();
  });
});
