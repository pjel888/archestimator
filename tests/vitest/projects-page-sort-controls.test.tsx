import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectsPageClient, type ProjectListItem } from "@/components/workshop/projects-page-client";
import type { Tables } from "@/lib/supabase/types";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  setProjectFavorite: vi.fn(async () => undefined),
}));

vi.mock("@/hooks/use-navigation-router", () => ({
  useNavigationRouter: () => ({
    refresh: mocks.refresh,
    push: mocks.push,
    replace: mocks.replace,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mocks.refresh,
    push: mocks.push,
    replace: mocks.replace,
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/lib/workshop/actions", () => ({
  setProjectFavorite: mocks.setProjectFavorite,
}));

vi.mock("@/lib/projects/actions", () => ({
  previewBulkDeleteProjects: vi.fn(async (input: { projectIds: string[] }) => ({
    ok: true,
    targetType: "project",
    ids: input.projectIds,
    eligibleIds: input.projectIds,
    previewHash: "preview-hash",
    summary: { requestedCount: input.projectIds.length, eligibleCount: input.projectIds.length, blockedCount: 0 },
    issues: [],
    blocked: [],
    storageTargets: [],
  })),
  executeBulkDeleteProjects: vi.fn(async (input: { projectIds: string[] }) => ({
    ok: true,
    targetType: "project",
    ids: input.projectIds,
    deletedIds: input.projectIds,
    summary: { requestedCount: input.projectIds.length, eligibleCount: input.projectIds.length, blockedCount: 0 },
    issues: [],
    blocked: [],
    storageTargets: [],
  })),
}));

vi.mock("@/lib/collaboration/pending-invite-actions", () => ({
  acceptPendingInvitationById: vi.fn(async () => undefined),
}));

function project(overrides: Partial<Tables<"projects">> = {}): Tables<"projects"> {
  return {
    id: overrides.id ?? "00000000-0000-4000-8000-000000000001",
    workspace_id: overrides.workspace_id ?? "00000000-0000-4000-8000-100000000001",
    name: overrides.name ?? "Project 1",
    client_name: "client_name" in overrides ? overrides.client_name ?? null : "Client",
    project_code: overrides.project_code ?? "P-001",
    location: overrides.location ?? "Manila",
    currency_code: overrides.currency_code ?? "PHP",
    metadata: overrides.metadata ?? {},
    created_at: overrides.created_at ?? "2026-01-01T00:00:00.000Z",
    updated_at: overrides.updated_at ?? "2026-01-02T00:00:00.000Z",
    created_by: overrides.created_by ?? "00000000-0000-4000-8000-200000000001",
  };
}

function item(overrides: Partial<Tables<"projects">> = {}): ProjectListItem {
  return {
    project: project(overrides),
    accessKind: "owned",
    currentUserRole: "owner",
    ownerWorkspaceName: null,
    pendingInviteCount: 0,
    publicationSummary: null,
    sharedEstimateCount: 0,
    favoriteEstimateSheets: [],
  };
}

function liveProjectNames() {
  return within(screen.getByLabelText("Live projects"))
    .getAllByRole("article")
    .map((card) => card.getAttribute("aria-label")?.replace(" project, owned access", ""));
}

async function selectSortField(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole("combobox", { name: "Sort field" }));
  await user.click(screen.getByRole("option", { name: label }));
}

describe("ProjectsPageClient sort controls", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.refresh.mockClear();
    mocks.push.mockClear();
    mocks.replace.mockClear();
  });

  it("renders View and Sort controls alongside Add without changing untouched order", () => {
    render(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "Zulu Project", updated_at: "2026-02-01T00:00:00.000Z" }),
          item({ id: "p2", name: "Alpha Project", updated_at: "2026-02-01T00:00:00.000Z" }),
        ]}
      />,
    );

    expect(screen.getByRole("combobox", { name: "View" })).toHaveTextContent("View: Large");
    expect(screen.getByRole("combobox", { name: "Sort field" })).toHaveTextContent("Sort: Last updated");
    expect(screen.getByRole("button", { name: "Newest first" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add projects" }).parentElement?.parentElement).toHaveClass("ml-auto");
    expect(liveProjectNames()).toEqual(["Zulu Project", "Alpha Project"]);
  });

  it("sorts by created date and flips date direction labels", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "Older", created_at: "2026-01-01T00:00:00.000Z" }),
          item({ id: "p2", name: "Newer", created_at: "2026-03-01T00:00:00.000Z" }),
          item({ id: "p3", name: "Middle", created_at: "2026-02-01T00:00:00.000Z" }),
        ]}
      />,
    );

    await selectSortField(user, "Sort: Date created");
    expect(liveProjectNames()).toEqual(["Newer", "Middle", "Older"]);

    await user.click(screen.getByRole("button", { name: "Newest first" }));
    expect(screen.getByRole("button", { name: "Oldest first" })).not.toHaveAttribute("aria-pressed");
    expect(liveProjectNames()).toEqual(["Older", "Middle", "Newer"]);
  });

  it("sorts text fields with numeric/case-insensitive order and nulls last", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "Project 10", client_name: "Beta" }),
          item({ id: "p2", name: "project 2", client_name: "alpha" }),
          item({ id: "p3", name: "Project 1", client_name: null }),
        ]}
      />,
    );

    await selectSortField(user, "Sort: Client");
    expect(screen.getByRole("button", { name: "A to Z" })).toBeInTheDocument();
    expect(liveProjectNames()).toEqual(["project 2", "Project 10", "Project 1"]);

    await user.click(screen.getByRole("button", { name: "A to Z" }));
    expect(liveProjectNames()).toEqual(["Project 10", "project 2", "Project 1"]);

    await selectSortField(user, "Sort: Project name");
    expect(liveProjectNames()).toEqual(["Project 1", "project 2", "Project 10"]);
  });

  it("composes search and sort without clearing selected rows", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "Clinic 10", client_name: "Beta" }),
          item({ id: "p2", name: "Clinic 2", client_name: "Alpha" }),
          item({ id: "p3", name: "Residence 1", client_name: "Zeta" }),
        ]}
      />,
    );

    await user.click(within(screen.getByLabelText("Clinic 10 project, owned access")).getByRole("checkbox", { name: "Select Clinic 10 for deletion" }));
    await selectSortField(user, "Sort: Project name");
    expect(screen.getByRole("region", { name: "Bulk action toolbar" })).toHaveTextContent("1 selected");
    expect(within(screen.getByLabelText("Clinic 10 project, owned access")).getByRole("checkbox", { name: "Select Clinic 10 for deletion" })).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Show projects search" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search projects" }), { target: { value: "clinic" } });

    expect(liveProjectNames()).toEqual(["Clinic 2", "Clinic 10"]);
    expect(screen.getByRole("region", { name: "Bulk action toolbar" })).toHaveTextContent("1 selected");
  });

  it("hides Sort and disables View for empty/sample states while keeping search misses interactive", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ProjectsPageClient projects={[]} />);

    expect(screen.getByRole("combobox", { name: /View, disabled until this tab has projects/i })).toBeDisabled();
    expect(screen.queryByRole("combobox", { name: "Sort field" })).not.toBeInTheDocument();

    rerender(<ProjectsPageClient projects={[item({ id: "p1", name: "Live Project" })]} />);
    await user.click(screen.getByRole("button", { name: "Show projects search" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search projects" }), { target: { value: "no-match" } });

    expect(screen.getByRole("combobox", { name: "View" })).not.toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Sort field" })).toBeInTheDocument();
    expect(screen.getByText("No projects match your search")).toBeInTheDocument();
  });

  it("shows created date metadata only on large live cards", async () => {
    const user = userEvent.setup();
    render(<ProjectsPageClient projects={[item({ id: "p1", name: "Created Visible", created_at: "2026-01-05T00:00:00.000Z" })]} />);

    expect(screen.getByText("Created Jan 5").closest("p")).toHaveAttribute("title", "January 5, 2026");

    await user.click(screen.getByRole("combobox", { name: "View" }));
    await user.click(screen.getByRole("option", { name: "View: Medium" }));

    await waitFor(() => expect(screen.queryByText("Created Jan 5")).not.toBeInTheDocument());
  });
});
