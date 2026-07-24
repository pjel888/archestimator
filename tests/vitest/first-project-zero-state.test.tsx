import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectsPageClient } from "./projects-page-test-harness";
import type { ProjectRow } from "@/lib/types/database";

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("@/hooks/use-navigation-router", () => ({
  useNavigationRouter: () => routerMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@/components/workshop/NewProjectModal", () => ({
  NewProjectModal: () => <div role="dialog" aria-label="Create project" />,
}));

const PROJECT = {
  id: "99999999-8888-4777-8666-555555555555",
  workspace_id: "22222222-2222-4222-8222-222222222222",
  name: "First live project",
  client_name: null,
  location: null,
  project_code: null,
  currency_code: "PHP",
  status: "ongoing",
  metadata: {},
  created_at: "2026-07-12T00:00:00.000Z",
  updated_at: "2026-07-12T00:00:00.000Z",
  created_by: "user-test",
} satisfies ProjectRow;

describe("first project zero state", () => {
  beforeEach(() => {
    routerMock.replace.mockImplementation((href: string) => {
      window.history.replaceState({}, "", href);
    });
    window.history.replaceState({}, "", "/workshop/projects");
  });

  it("shows the four first-project choices only for an authoritative creator zero state", () => {
    const { rerender } = render(
      <ProjectsPageClient projects={[]} workspaceRole="member" />,
    );

    expect(screen.getByTestId("first-project-zero-state")).toHaveAttribute(
      "data-first-project-zero-state",
      "creator",
    );
    expect(screen.getByRole("button", { name: "Create blank project" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Browse templates" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start guided practice" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Getting Started" })).toBeInTheDocument();

    rerender(<ProjectsPageClient projects={[PROJECT]} workspaceRole="member" />);

    expect(screen.queryByTestId("first-project-zero-state")).not.toBeInTheDocument();
  });

  it("keeps creation controls out of the viewer zero state", () => {
    render(<ProjectsPageClient projects={[]} workspaceRole="viewer" />);

    expect(screen.getByTestId("first-project-zero-state")).toHaveAttribute(
      "data-first-project-zero-state",
      "viewer",
    );
    expect(screen.getByText(/contact a workspace owner/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create blank project" })).not.toBeInTheDocument();
  });

  it("opens project-start choices even when projects already exist", async () => {
    const user = userEvent.setup();
    window.history.replaceState(
      {},
      "",
      "/workshop/projects?start=project&tour=core_orientation",
    );
    render(
      <ProjectsPageClient
        initialProjectStartIntent="chooser"
        projects={[PROJECT]}
        workspaceRole="member"
      />,
    );

    const chooser = await screen.findByRole("dialog", { name: "Start a project" });
    expect(chooser).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.pathname).toBe("/workshop/projects");
      expect(window.location.search).toBe("?tour=core_orientation");
    });
    expect(screen.getByRole("button", { name: "Create blank project" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Browse templates" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start guided practice" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create blank project" }));

    expect(await screen.findByRole("dialog", { name: "Create project" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Start a project" })).not.toBeInTheDocument();
  });

  it("opens the blank-project form directly for the blank start intent", async () => {
    window.history.replaceState({}, "", "/workshop/projects?start=blank");
    render(
      <ProjectsPageClient
        initialProjectStartIntent="blank"
        projects={[PROJECT]}
        workspaceRole="member"
      />,
    );

    expect(await screen.findByRole("dialog", { name: "Create project" })).toBeInTheDocument();
  });

  it("does not open the blank-project form for viewers", async () => {
    window.history.replaceState({}, "", "/workshop/projects?start=blank");
    render(
      <ProjectsPageClient
        initialProjectStartIntent="blank"
        projects={[PROJECT]}
        workspaceRole="viewer"
      />,
    );

    await waitFor(() => {
      expect(window.location.pathname).toBe("/workshop/projects");
      expect(window.location.search).toBe("");
    });
    expect(screen.queryByRole("dialog", { name: "Create project" })).not.toBeInTheDocument();
  });
});
