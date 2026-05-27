import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectsPageClient, type ProjectListItem } from "@/components/workshop/projects-page-client";
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

const OWNED_PROJECT = {
  id: "11111111-1111-4111-8111-111111111111",
  workspace_id: "22222222-2222-4222-8222-222222222222",
  name: "Lewis Residence",
  client_name: "Lewis Family",
  location: "Quezon City",
  project_code: "AE-LR-001",
  currency_code: "PHP",
  metadata: {},
  created_at: "2026-05-20T00:00:00.000Z",
  updated_at: "2026-05-26T00:00:00.000Z",
  created_by: null,
} satisfies Tables<"projects">;

const SHARED_PROJECT = {
  id: "33333333-3333-4333-8333-333333333333",
  workspace_id: "44444444-4444-4444-8444-444444444444",
  name: "Shared Clinic Fit-Out",
  client_name: "Clinic Group",
  location: "Makati",
  project_code: "AE-SC-101",
  currency_code: "PHP",
  metadata: {},
  created_at: "2026-05-20T00:00:00.000Z",
  updated_at: "2026-05-26T00:00:00.000Z",
  created_by: null,
} satisfies Tables<"projects">;

const SHEET_ONLY_PROJECT = {
  id: "55555555-5555-4555-8555-555555555555",
  workspace_id: "66666666-6666-4666-8666-666666666666",
  name: "Shared Sheet Project",
  client_name: "Sheet Client",
  location: "Pasig",
  project_code: "AE-SS-201",
  currency_code: "PHP",
  metadata: {},
  created_at: "2026-05-20T00:00:00.000Z",
  updated_at: "2026-05-26T00:00:00.000Z",
  created_by: null,
} satisfies Tables<"projects">;

const PROJECTS: ProjectListItem[] = [
  {
    project: OWNED_PROJECT,
    accessKind: "owned",
    currentUserRole: "owner",
    sharedEstimateCount: 0,
  },
  {
    project: SHARED_PROJECT,
    accessKind: "project-member",
    currentUserRole: "viewer",
    sharedEstimateCount: 0,
    ownerWorkspaceName: "Studio Partner",
  },
  {
    project: SHEET_ONLY_PROJECT,
    accessKind: "sheet-member",
    currentUserRole: "viewer",
    sharedEstimateCount: 2,
    ownerWorkspaceName: "Consultant Workspace",
  },
];

describe("ProjectsPageClient shared access", () => {
  beforeEach(() => {
    window.localStorage.clear();
    routerMock.refresh.mockClear();
  });

  it("renders owned, shared project, and sheet-only cards with text badges", () => {
    render(<ProjectsPageClient projects={PROJECTS} />);

    expect(screen.getByLabelText("Lewis Residence project, owned access")).toBeInTheDocument();
    expect(screen.getByLabelText("Shared Clinic Fit-Out project, shared project, viewer access")).toBeInTheDocument();
    expect(screen.getByLabelText("Shared Sheet Project project, sheet-only access, viewer access")).toBeInTheDocument();
    expect(screen.getByText("Shared project")).toBeInTheDocument();
    expect(screen.getByText("Sheet-only")).toBeInTheDocument();
    expect(screen.getByText("2 shared sheets")).toBeInTheDocument();
    expect(screen.getByText("Shared by Studio Partner")).toBeInTheDocument();
  });

  it("does not show the empty sample state when only shared projects exist", () => {
    render(<ProjectsPageClient projects={[PROJECTS[1], PROJECTS[2]]} />);

    expect(screen.getByLabelText("Live projects")).toBeInTheDocument();
    expect(screen.queryByText("No live projects yet.")).not.toBeInTheDocument();
    expect(screen.getByText("Shared project")).toBeInTheDocument();
    expect(screen.getByText("Sheet-only")).toBeInTheDocument();
  });

  it("search matches shared projects and exposes owned/shared filters", async () => {
    const user = userEvent.setup();
    render(<ProjectsPageClient projects={PROJECTS} />);

    expect(screen.getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByRole("tab", { name: "Shared" }));

    expect(screen.queryByText("Lewis Residence")).not.toBeInTheDocument();
    expect(screen.getByText("Shared Clinic Fit-Out")).toBeInTheDocument();
    expect(screen.getByText("Shared Sheet Project")).toBeInTheDocument();

    await user.type(screen.getByRole("searchbox", { name: "Search projects" }), "clinic");

    expect(screen.getByText("Shared Clinic Fit-Out")).toBeInTheDocument();
    expect(screen.queryByText("Shared Sheet Project")).not.toBeInTheDocument();
  });

  it("all card density modes preserve shared badges", async () => {
    const user = userEvent.setup();
    render(<ProjectsPageClient projects={PROJECTS} />);

    for (const label of ["List", "Small thumbnails", "Medium thumbnails", "Large thumbnails"]) {
      await user.click(screen.getByRole("button", { name: `View projects as ${label}` }));
      await waitFor(() => {
        expect(screen.getByLabelText("Live projects")).toHaveAttribute(
          "data-project-view-mode",
          window.localStorage.getItem(STORAGE_KEY) ?? "large",
        );
      });
      const sharedCard = screen.getByLabelText("Shared Clinic Fit-Out project, shared project, viewer access");
      expect(sharedCard).toHaveAttribute("data-project-access-kind", "project-member");
      expect(within(sharedCard).getByText("Shared project")).toBeInTheDocument();
    }
  });
});
