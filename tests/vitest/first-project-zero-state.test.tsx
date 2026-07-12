import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
  it("shows the three first-project choices only for an authoritative creator zero state", () => {
    const { rerender } = render(
      <ProjectsPageClient projects={[]} workspaceRole="member" />,
    );

    expect(screen.getByTestId("first-project-zero-state")).toHaveAttribute(
      "data-first-project-zero-state",
      "creator",
    );
    expect(screen.getByRole("button", { name: "Create blank project" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Browse templates" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Explore guided sample" })).toBeInTheDocument();

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
});
