import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectsPageClient, type ProjectListItem } from "./projects-page-test-harness";
import { ToastProvider } from "@/components/ui/toast";
import type { ProjectRow } from "@/lib/types/database";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  setProjectFavorite: vi.fn(async () => undefined),
  moveProjectToGroup: vi.fn(async () => undefined),
  bulkAssignProjectsToGroup: vi.fn(async (input: { projectIds: string[]; groupId: string | null }) => ({
    movedProjectIds: input.projectIds,
    skippedProjectIds: [] as string[],
  })),
  createProjectGroup: vi.fn(async () => ({ id: "g-new" })),
  renameProjectGroup: vi.fn(async () => undefined),
  recolorProjectGroup: vi.fn(async () => undefined),
  deleteProjectGroup: vi.fn(async () => undefined),
  reorderProjectGroups: vi.fn(async () => undefined),
  reorderProjectsInGroup: vi.fn(async () => undefined),
}));

vi.mock("@/hooks/use-navigation-router", () => ({
  useNavigationRouter: () => ({ refresh: mocks.refresh, push: mocks.push, replace: mocks.replace }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh, push: mocks.push, replace: mocks.replace, prefetch: vi.fn() }),
}));
vi.mock("@/lib/workshop/actions", () => ({ setProjectFavorite: mocks.setProjectFavorite }));
vi.mock("@/lib/workshop/group-actions", () => ({
  moveProjectToGroup: mocks.moveProjectToGroup,
  bulkAssignProjectsToGroup: mocks.bulkAssignProjectsToGroup,
  createProjectGroup: mocks.createProjectGroup,
  renameProjectGroup: mocks.renameProjectGroup,
  recolorProjectGroup: mocks.recolorProjectGroup,
  deleteProjectGroup: mocks.deleteProjectGroup,
  reorderProjectGroups: mocks.reorderProjectGroups,
  reorderProjectsInGroup: mocks.reorderProjectsInGroup,
  ProjectGroupCapError: class extends Error {},
  ProjectGroupNameError: class extends Error {},
}));
vi.mock("@/lib/projects/actions", () => ({
  previewBulkDeleteProjects: vi.fn(async (i: { projectIds: string[] }) => ({
    ok: true, targetType: "project", ids: i.projectIds, eligibleIds: i.projectIds, previewHash: "h",
    summary: { requestedCount: i.projectIds.length, eligibleCount: i.projectIds.length, blockedCount: 0 },
    issues: [], blocked: [], storageTargets: [],
  })),
  executeBulkDeleteProjects: vi.fn(async (i: { projectIds: string[] }) => ({
    ok: true, targetType: "project", ids: i.projectIds, deletedIds: i.projectIds,
    summary: { requestedCount: i.projectIds.length, eligibleCount: i.projectIds.length, blockedCount: 0 },
    issues: [], blocked: [], storageTargets: [],
  })),
}));
vi.mock("@/lib/collaboration/pending-invite-actions", () => ({
  acceptPendingInvitationById: vi.fn(async () => undefined),
}));

function renderClient(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

function project(o: Partial<ProjectRow> = {}): ProjectRow {
  return {
    id: o.id ?? "00000000-0000-4000-8000-000000000001",
    workspace_id: "00000000-0000-4000-8000-100000000001",
    name: o.name ?? "Project",
    client_name: "client_name" in o ? o.client_name ?? null : "Client",
    project_code: o.project_code ?? "P-001",
    location: o.location ?? "Manila",
    currency_code: "PHP",
    metadata: {},
    created_at: o.created_at ?? "2026-01-01T00:00:00.000Z",
    updated_at: o.updated_at ?? "2026-01-02T00:00:00.000Z",
    created_by: "00000000-0000-4000-8000-200000000001",
  };
}
function item(o: Partial<ProjectRow> = {}, extra: Partial<ProjectListItem> = {}): ProjectListItem {
  return {
    project: project(o),
    accessKind: "owned",
    currentUserRole: "owner",
    groupId: null,
    pendingInviteCount: 0,
    publicationSummary: null,
    sharedEstimateCount: 0,
    favoriteEstimateSheets: [],
    ...extra,
  };
}
function sharedItem(o: Partial<ProjectRow> = {}): ProjectListItem {
  return item(o, { accessKind: "project-member", currentUserRole: "editor", ownerWorkspaceName: "Acme" });
}

async function selectGroupBy(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole("combobox", { name: "Group by" }));
  await user.click(screen.getByRole("option", { name: label }));
}

describe("ProjectsPageClient group-by control", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.values(mocks).forEach((m) => "mockClear" in m && m.mockClear());
  });

  it("defaults to no grouping", () => {
    renderClient(<ProjectsPageClient projects={[item({ id: "p1", name: "A", updated_at: "2026-02-01T00:00:00.000Z" })]} />);
    expect(screen.getByRole("combobox", { name: "Group by" })).toHaveAttribute("title", "Group by: No grouping");
    expect(screen.queryByLabelText("2026 · February")).not.toBeInTheDocument();
    expect(within(screen.getByLabelText("Live projects")).getAllByRole("article")).toHaveLength(1);
  });

  it("switches between date grouping and no grouping", async () => {
    const user = userEvent.setup();
    renderClient(<ProjectsPageClient projects={[item({ id: "p1", name: "A", updated_at: "2026-02-01T00:00:00.000Z" })]} />);
    await selectGroupBy(user, "Last updated");
    expect(screen.getByLabelText("2026 · February")).toBeInTheDocument();
    await selectGroupBy(user, "No grouping");
    expect(screen.queryByLabelText("2026 · February")).not.toBeInTheDocument();
    expect(within(screen.getByLabelText("Live projects")).getAllByRole("article")).toHaveLength(1);
  });

  it("keeps newest-first ordering in no-grouping mode (no flags, ordering branch untouched)", async () => {
    renderClient(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "Older", updated_at: "2026-01-01T00:00:00.000Z" }),
          item({ id: "p2", name: "Newer", updated_at: "2026-03-01T00:00:00.000Z" }),
          item({ id: "p3", name: "Middle", updated_at: "2026-02-01T00:00:00.000Z" }),
        ]}
      />,
    );
    // Default newest-first ordering survives groupBy="none" (no flags rendered).
    expect(screen.getByLabelText("Live projects").querySelectorAll("[data-project-group-label]")).toHaveLength(0);
    const names = within(screen.getByLabelText("Live projects"))
      .getAllByRole("article")
      .map((card) => card.getAttribute("aria-label")?.replace(" project, owned access", ""));
    expect(names).toEqual(["Newer", "Middle", "Older"]);
  });

  it("persists the organize preference across remounts via localStorage", async () => {
    const user = userEvent.setup();
    const { unmount } = renderClient(<ProjectsPageClient projects={[item({ id: "p1", updated_at: "2026-02-01T00:00:00.000Z" })]} />);
    await selectGroupBy(user, "Last updated");
    expect(window.localStorage.getItem("archestimator_projects_group_by_v1")).toBe("updated_at");
    unmount();
    renderClient(<ProjectsPageClient projects={[item({ id: "p1", updated_at: "2026-02-01T00:00:00.000Z" })]} />);
    expect(screen.getByRole("combobox", { name: "Group by" })).toHaveAttribute("title", "Group by: Last updated");
  });

  it("keeps Sort visible and active in every organize mode", async () => {
    const user = userEvent.setup();
    renderClient(<ProjectsPageClient projects={[item({ id: "p1", updated_at: "2026-02-01T00:00:00.000Z" })]} />);
    await selectGroupBy(user, "Last updated");
    expect(screen.getByRole("combobox", { name: "Sort field" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Sort direction" })).toBeInTheDocument();
  });

  it("keeps project grouping owned-only when non-owned rows are present", async () => {
    const user = userEvent.setup();
    renderClient(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "Owned", updated_at: "2026-02-01T00:00:00.000Z" }, { groupId: "g1" }),
          sharedItem({ id: "p2", name: "Shared", updated_at: "2026-02-01T00:00:00.000Z" }),
        ]}
        projectGroups={[{ id: "g1", name: "Pipeline", accentId: null, position: 0 }]}
      />,
    );

    await selectGroupBy(user, "Manual group order");
    expect(screen.getByLabelText("Pipeline")).toBeInTheDocument();
    expect(within(screen.getByLabelText("Pipeline")).getByText("Owned")).toBeInTheDocument();
    expect(screen.queryByText("Shared")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Group by" })).toHaveAttribute("title", "Group by: Manual group order");
  });

  it("preserves selectedProjectIds across organize-mode switches (selection is keyed by id)", async () => {
    const user = userEvent.setup();
    renderClient(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "Owned A", updated_at: "2026-02-01T00:00:00.000Z" }),
          item({ id: "p2", name: "Owned B", updated_at: "2026-02-02T00:00:00.000Z" }),
        ]}
      />,
    );

    // Select an owned project → the bulk action dock appears with the count.
    await user.click(
      within(screen.getByLabelText("Owned A project, owned access")).getByRole("checkbox", {
        name: "Select Owned A for deletion",
      }),
    );
    expect(screen.getByRole("region", { name: "Bulk action toolbar" })).toHaveTextContent("1 selected");

    // Switch group mode (none -> date -> none): selection survives.
    await selectGroupBy(user, "Last updated");
    await selectGroupBy(user, "No grouping");
    expect(screen.getByRole("region", { name: "Bulk action toolbar" })).toHaveTextContent("1 selected");
    expect(
      within(screen.getByLabelText("Owned A project, owned access")).getByRole("checkbox", {
        name: "Select Owned A for deletion",
      }),
    ).toBeChecked();
  });
});
