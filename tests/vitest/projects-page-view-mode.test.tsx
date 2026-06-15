import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectsPageClient } from "@/components/workshop/projects-page-client";
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

describe("ProjectsPageClient view modes", () => {
  beforeEach(() => {
    window.localStorage.clear();
    routerMock.refresh.mockClear();
  });

  it("defaults to large cards and persists selected thumbnail density", async () => {
    const user = userEvent.setup();
    const { container } = render(<ProjectsPageClient projects={[PROJECT_FIXTURE]} />);

    expect(screen.getByLabelText("Live projects")).toHaveAttribute(
      "data-project-view-mode",
      "large",
    );
    expect(screen.getByRole("button", { name: "View projects as Large thumbnails" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      within(screen.getByRole("group", { name: "Project view mode" })).getByRole("button", {
        name: "View projects as Large thumbnails",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add projects" }).parentElement?.parentElement,
    ).toHaveClass("ml-auto");
    expect(
      screen.getByRole("button", { name: "View projects as Large thumbnails" }).parentElement
        ?.parentElement,
    ).not.toHaveClass("ml-auto");

    await user.click(screen.getByRole("button", { name: "View projects as Small thumbnails" }));

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
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("small");

    await user.click(screen.getByRole("button", { name: "View projects as Medium thumbnails" }));

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
    expect(screen.getByRole("button", { name: "View projects as List" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(container.querySelector("[data-project-card-view]")).toHaveAttribute(
      "data-project-card-view",
      "list",
    );
  });

  it("guides first-run users to create a live project while keeping samples as references", async () => {
    const user = userEvent.setup();
    render(<ProjectsPageClient projects={[]} />);

    expect(screen.getByLabelText("Sample project references")).toBeInTheDocument();
    expect(screen.getByText("Create the first live project")).toBeInTheDocument();
    expect(screen.getByText(/Sample cards below are references only/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create the first project" })).toBeInTheDocument();
    expect(screen.queryByText("No live projects yet.")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create the first project" }));

    expect(await screen.findByRole("dialog", { name: "Create project" })).toBeInTheDocument();
  });

  it("uses shared no-result copy for live project search", async () => {
    const user = userEvent.setup();
    render(<ProjectsPageClient projects={[PROJECT_FIXTURE]} />);

    await user.click(screen.getByRole("button", { name: "Show projects search" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search projects" }), { target: { value: "zzzz-project" } });

    expect(screen.getByText("No projects match your search")).toBeInTheDocument();
    expect(screen.getByText("Try an owned project name, client, code, or location.")).toBeInTheDocument();
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
    expect(screen.getByRole("tab", { name: /Projects shared to you/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByText("No live projects yet")).not.toBeInTheDocument();
  });
});
