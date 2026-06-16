import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectsPageClient, type ProjectListItem } from "./projects-page-test-harness";
import { ToastProvider } from "@/components/ui/toast";
import { MAX_PROJECT_GROUPS } from "@/lib/workshop/group-constants";
import type { ProjectGroupSummary } from "@/lib/repositories/workspace-repository";
import type { Tables } from "@/lib/supabase/types";

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

function project(o: Partial<Tables<"projects">> = {}): Tables<"projects"> {
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
function item(o: Partial<Tables<"projects">> = {}, extra: Partial<ProjectListItem> = {}): ProjectListItem {
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

const groups: ProjectGroupSummary[] = [
  { id: "g1", name: "Pipeline", accentId: "teal", position: 0 },
  { id: "g2", name: "Archive", accentId: null, position: 1 },
];

describe("ProjectsPageClient group mode", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.values(mocks).forEach((m) => "mockClear" in m && m.mockClear());
    window.localStorage.setItem("archestimator_projects_organize_by_v1", "group");
  });

  it("renders one section per server group, in position order, plus a trailing Ungrouped", () => {
    renderClient(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "In Pipeline" }, { groupId: "g1" }),
          item({ id: "p2", name: "Loose" }, { groupId: null }),
        ]}
        projectGroups={groups}
      />,
    );
    const labels = within(screen.getByLabelText("Live projects"))
      .getAllByRole("region")
      .map((s) => s.getAttribute("aria-label"));
    expect(labels).toEqual(["Pipeline", "Archive", "Ungrouped"]);
    expect(screen.getByLabelText("Ungrouped")).toHaveAttribute("data-project-group", "__ungrouped__");
    expect(screen.getByLabelText("Ungrouped")).toHaveAttribute("data-project-group-virtual", "");
    expect(within(screen.getByLabelText("Pipeline")).getByRole("article")).toHaveTextContent("In Pipeline");
    expect(within(screen.getByLabelText("Ungrouped")).getByRole("article")).toHaveTextContent("Loose");
  });

  it("renders empty named groups when not searching, hides Ungrouped when empty", () => {
    renderClient(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "In Pipeline" }, { groupId: "g1" })]}
        projectGroups={groups}
      />,
    );
    expect(screen.getByLabelText("Pipeline")).toBeInTheDocument();
    expect(screen.getByLabelText("Archive")).toBeInTheDocument(); // empty named group still renders
    expect(screen.queryByLabelText("Ungrouped")).not.toBeInTheDocument(); // nothing ungrouped
  });

  it("buckets a dangling groupId into Ungrouped (cross-tab deletion defense)", () => {
    renderClient(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Orphan" }, { groupId: "deleted-group" })]}
        projectGroups={groups}
      />,
    );
    expect(within(screen.getByLabelText("Ungrouped")).getByRole("article")).toHaveTextContent("Orphan");
  });

  it("hides groups with zero matches during active search", async () => {
    const user = userEvent.setup();
    renderClient(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "Pipeline Clinic" }, { groupId: "g1" }),
          item({ id: "p2", name: "Archive Tower" }, { groupId: "g2" }),
        ]}
        projectGroups={groups}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Show projects search" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search projects" }), { target: { value: "clinic" } });
    expect(screen.getByLabelText("Pipeline")).toBeInTheDocument();
    expect(screen.queryByLabelText("Archive")).not.toBeInTheDocument(); // empty during search
  });

  it("paints a group accent rule + dot for an accented group, none for null", () => {
    renderClient(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "In Pipeline" }, { groupId: "g1" })]}
        projectGroups={groups}
      />,
    );
    const pipeline = screen.getByLabelText("Pipeline");
    expect(pipeline.querySelector("[data-project-group-accent-rule]")).not.toBeNull();
    expect(pipeline.querySelector("[data-project-group-accent-dot]")).not.toBeNull();
  });
});

describe("ProjectsPageClient group mode — zero groups (P0-1)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.values(mocks).forEach((m) => "mockClear" in m && m.mockClear());
    window.localStorage.setItem("archestimator_projects_organize_by_v1", "group");
  });

  it("shows the create-first-group EmptyState ABOVE a single Ungrouped flag holding all projects", () => {
    renderClient(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "Loose One" }, { groupId: null }),
          item({ id: "p2", name: "Loose Two" }, { groupId: null }),
        ]}
        projectGroups={[]}
      />,
    );
    expect(screen.getByText("Organize projects into groups")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create your first group" })).toBeInTheDocument();
    const ungrouped = screen.getByLabelText("Ungrouped");
    expect(ungrouped).toHaveAttribute("data-project-group", "__ungrouped__");
    expect(within(ungrouped).getAllByRole("article")).toHaveLength(2);
    const wall = screen.getByLabelText("Live projects");
    const emptyStateNode = screen.getByText("Organize projects into groups");
    expect(wall.compareDocumentPosition(emptyStateNode) & Node.DOCUMENT_POSITION_CONTAINED_BY).toBeTruthy();
    expect(
      emptyStateNode.compareDocumentPosition(ungrouped) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("opens the Manage-groups popover when the empty-state CTA is clicked", async () => {
    const user = userEvent.setup();
    renderClient(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose One" }, { groupId: null })]}
        projectGroups={[]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Create your first group" }));
    expect(screen.getByRole("dialog", { name: "Manage groups" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "New group name" })).toBeInTheDocument();
  });

  it("does NOT show the zero-groups empty state once at least one group exists", () => {
    renderClient(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose One" }, { groupId: null })]}
        projectGroups={[{ id: "g1", name: "Pipeline", accentId: null, position: 0 }]}
      />,
    );
    expect(screen.queryByText("Organize projects into groups")).not.toBeInTheDocument();
  });
});

describe("ProjectsPageClient group mode — search-empty fallback (LD-10)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.values(mocks).forEach((m) => "mockClear" in m && m.mockClear());
    window.localStorage.setItem("archestimator_projects_organize_by_v1", "group");
  });

  it("falls back to the search-empty state when a search hides every group", async () => {
    const user = userEvent.setup();
    renderClient(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Pipeline Clinic" }, { groupId: "g1" })]}
        projectGroups={[{ id: "g1", name: "Pipeline", accentId: null, position: 0 }]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Show projects search" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search projects" }), { target: { value: "zzz-no-match" } });
    expect(screen.queryByLabelText("Pipeline")).not.toBeInTheDocument();
    expect(screen.getByText("No projects match your search")).toBeInTheDocument();
  });
});

describe("ManageGroupsPopover via ProjectsPageClient", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.values(mocks).forEach((m) => "mockClear" in m && m.mockClear());
    window.localStorage.setItem("archestimator_projects_organize_by_v1", "group");
  });

  async function openPopover(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: "Manage groups" }));
    return screen.getByRole("dialog", { name: "Manage groups" });
  }

  it("creates a group through the New-group input", async () => {
    const user = userEvent.setup();
    renderClient(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose" }, { groupId: null })]}
        projectGroups={[{ id: "g1", name: "Pipeline", accentId: null, position: 0 }]}
      />,
    );
    const dialog = await openPopover(user);
    await user.type(within(dialog).getByRole("textbox", { name: "New group name" }), "Drafts");
    await user.click(within(dialog).getByRole("button", { name: "Add group" }));
    expect(mocks.createProjectGroup).toHaveBeenCalledWith({ name: "Drafts", accentId: null });
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
  });

  it("renames a group on blur", async () => {
    const user = userEvent.setup();
    renderClient(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose" }, { groupId: null })]}
        projectGroups={[{ id: "g1", name: "Pipeline", accentId: null, position: 0 }]}
      />,
    );
    const dialog = await openPopover(user);
    const rename = within(dialog).getByRole("textbox", { name: "Rename Pipeline" });
    await user.clear(rename);
    await user.type(rename, "Renamed");
    fireEvent.blur(rename);
    expect(mocks.renameProjectGroup).toHaveBeenCalledWith({ groupId: "g1", name: "Renamed" });
  });

  it("recolors a group via the recolor swatches with the current color checked", async () => {
    const user = userEvent.setup();
    renderClient(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose" }, { groupId: null })]}
        projectGroups={[{ id: "g1", name: "Pipeline", accentId: "teal", position: 0 }]}
      />,
    );
    const dialog = await openPopover(user);
    await user.click(within(dialog).getByRole("button", { name: "Recolor Pipeline" }));
    // Scope to the recolor radiogroup (the New-group row also has accent swatches).
    const recolorGroup = within(dialog).getByRole("radiogroup", { name: "Recolor Pipeline" });
    // Current color (teal) shows a check indicator and is the checked radio.
    const tealSwatch = within(recolorGroup).getByRole("radio", { name: "Teal" });
    expect(tealSwatch).toBeChecked();
    expect(tealSwatch.querySelector("[data-action-menu-item-check]")).not.toBeNull();
    await user.click(within(recolorGroup).getByRole("radio", { name: "Indigo" }));
    expect(mocks.recolorProjectGroup).toHaveBeenCalledWith({ groupId: "g1", accentId: "indigo" });
  });

  it("deletes a group through an inline two-click confirm (never the bulk modal)", async () => {
    const user = userEvent.setup();
    renderClient(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose" }, { groupId: null })]}
        projectGroups={[{ id: "g1", name: "Pipeline", accentId: null, position: 0 }]}
      />,
    );
    const dialog = await openPopover(user);
    await user.click(within(dialog).getByRole("button", { name: "Delete Pipeline" }));
    // Inline confirm appears; no destructive preview modal.
    expect(within(dialog).getByRole("button", { name: "Confirm delete Pipeline" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: /Delete project/i })).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Confirm delete Pipeline" }));
    expect(mocks.deleteProjectGroup).toHaveBeenCalledWith({ groupId: "g1" });
  });

  it("shows the at-limit message when the group cap is reached", async () => {
    const user = userEvent.setup();
    const maxGroups: ProjectGroupSummary[] = Array.from({ length: MAX_PROJECT_GROUPS }, (_, index) => ({
      id: `g${index}`,
      name: `Group ${index}`,
      accentId: null,
      position: index,
    }));
    renderClient(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose" }, { groupId: null })]}
        projectGroups={maxGroups}
      />,
    );
    const dialog = await openPopover(user);
    expect(within(dialog).getByText(/reached the .*-group limit/i)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Add group" })).toBeDisabled();
  });
});
