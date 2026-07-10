import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ProjectsPageClient,
  type ProjectListItem,
} from "./projects-page-test-harness";
import { ToastProvider } from "@/components/ui/toast";
import { MAX_PROJECT_GROUPS } from "@/lib/workshop/group-constants";
import { resolveAccent } from "@/lib/workshop/group-accent";
import type { ProjectGroupSummary } from "@/lib/repositories/workspace-repository";
import type { ProjectRow } from "@/lib/types/database";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  setProjectFavorite: vi.fn(async () => undefined),
  moveProjectToGroup: vi.fn(async () => undefined),
  bulkAssignProjectsToGroup: vi.fn(
    async (input: { projectIds: string[]; groupId: string | null }) => ({
      movedProjectIds: input.projectIds,
      skippedProjectIds: [] as string[],
    }),
  ),
  createProjectGroup: vi.fn(async () => ({ id: "g-new" })),
  renameProjectGroup: vi.fn(async () => undefined),
  recolorProjectGroup: vi.fn(async () => undefined),
  deleteProjectGroup: vi.fn(async () => undefined),
  reorderProjectGroups: vi.fn(async () => undefined),
  reorderProjectsInGroup: vi.fn(async () => undefined),
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
  updateProjectStatus: vi.fn(async () => undefined),
  previewBulkDeleteProjects: vi.fn(async (i: { projectIds: string[] }) => ({
    ok: true,
    targetType: "project",
    ids: i.projectIds,
    eligibleIds: i.projectIds,
    previewHash: "h",
    summary: {
      requestedCount: i.projectIds.length,
      eligibleCount: i.projectIds.length,
      blockedCount: 0,
    },
    issues: [],
    blocked: [],
    storageTargets: [],
  })),
  executeBulkDeleteProjects: vi.fn(async (i: { projectIds: string[] }) => ({
    ok: true,
    targetType: "project",
    ids: i.projectIds,
    deletedIds: i.projectIds,
    summary: {
      requestedCount: i.projectIds.length,
      eligibleCount: i.projectIds.length,
      blockedCount: 0,
    },
    issues: [],
    blocked: [],
    storageTargets: [],
  })),
}));
vi.mock("@/lib/collaboration/pending-invite-actions", () => ({
  acceptPendingInvitationById: vi.fn(async () => undefined),
}));

function renderClient(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  return `rgb(${parseInt(value.slice(0, 2), 16)}, ${parseInt(
    value.slice(2, 4),
    16,
  )}, ${parseInt(value.slice(4, 6), 16)})`;
}

function mockDataTransfer() {
  const store = new Map<string, string>();
  return {
    dropEffect: "move",
    effectAllowed: "all",
    getData: (key: string) => store.get(key) ?? "",
    setData: (key: string, value: string) => {
      store.set(key, value);
    },
    setDragImage: () => undefined,
  };
}

function setGroupSectionRect(element: HTMLElement, top = 0, height = 80) {
  element.getBoundingClientRect = () => ({
    x: 0,
    y: top,
    top,
    left: 0,
    right: 320,
    bottom: top + height,
    width: 320,
    height,
    toJSON: () => ({}),
  });
}

function dispatchProjectGroupDragEvent(
  element: HTMLElement,
  type: "dragstart" | "dragover" | "drop" | "dragend",
  options: {
    clientY?: number;
    dataTransfer: ReturnType<typeof mockDataTransfer>;
  },
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: options.dataTransfer });
  if (options.clientY !== undefined) {
    Object.defineProperty(event, "clientY", { value: options.clientY });
  }
  fireEvent(element, event);
}

/** Project-card drag UI state is deferred one animation frame so Chromium does not cancel native DnD. */
async function flushDeferredProjectCardDragUi() {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function project(o: Partial<ProjectRow> = {}): ProjectRow {
  return {
    id: o.id ?? "00000000-0000-4000-8000-000000000001",
    workspace_id: "00000000-0000-4000-8000-100000000001",
    name: o.name ?? "Project",
    client_name: "client_name" in o ? (o.client_name ?? null) : "Client",
    project_code: o.project_code ?? "P-001",
    location: o.location ?? "Manila",
    currency_code: "PHP",
    status: o.status ?? "ongoing",
    metadata: {},
    created_at: o.created_at ?? "2026-01-01T00:00:00.000Z",
    updated_at: o.updated_at ?? "2026-01-02T00:00:00.000Z",
    created_by: "00000000-0000-4000-8000-200000000001",
  };
}
function item(
  o: Partial<ProjectRow> = {},
  extra: Partial<ProjectListItem> = {},
): ProjectListItem {
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
    window.localStorage.setItem(
      "archestimator_projects_organize_by_v1",
      "group",
    );
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
    expect(screen.getByLabelText("Ungrouped")).toHaveAttribute(
      "data-project-group",
      "__ungrouped__",
    );
    expect(screen.getByLabelText("Ungrouped")).toHaveAttribute(
      "data-project-group-virtual",
      "",
    );
    expect(
      within(screen.getByLabelText("Pipeline")).getByRole("article"),
    ).toHaveTextContent("In Pipeline");
    expect(
      within(screen.getByLabelText("Ungrouped")).getByRole("article"),
    ).toHaveTextContent("Loose");
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

  it("keeps the per-card move-to-group control hidden until card hover or focus", () => {
    renderClient(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose" }, { groupId: null })]}
        projectGroups={groups}
      />,
    );

    const card = screen.getByLabelText("Loose project, owned access");
    const trigger = within(card).getByRole("button", {
      name: "Move Loose to a group",
    });
    const revealWrapper = trigger.closest(
      "[data-project-card-group-assign-control]",
    );

    expect(revealWrapper).not.toBeNull();
    expect(revealWrapper).toHaveClass("pointer-events-none");
    expect(revealWrapper).toHaveClass("opacity-0");
    expect(revealWrapper).toHaveClass("group-hover:pointer-events-auto");
    expect(revealWrapper).toHaveClass("group-hover:opacity-100");
    expect(revealWrapper).toHaveClass("group-focus-within:pointer-events-auto");
    expect(revealWrapper).toHaveClass("group-focus-within:opacity-100");
  });

  it("shows a project-card drag handle immediately before the selection checkbox", () => {
    renderClient(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose" }, { groupId: null })]}
        projectGroups={groups}
      />,
    );

    const card = screen.getByLabelText("Loose project, owned access");
    const dragHandle = within(card).getByRole("button", {
      name: "Drag Loose to a group",
    });
    const checkbox = within(card).getByRole("checkbox", {
      name: "Select Loose for deletion",
    });
    const topStrip = card.querySelector("[data-project-card-top-strip]");
    const leftControls = Array.from(
      topStrip?.querySelectorAll(
        "[data-project-card-drag-handle], input[type='checkbox']",
      ) ?? [],
    );

    expect(dragHandle).toHaveAttribute("draggable", "true");
    expect(dragHandle).toHaveClass("cursor-grab", "group-hover:opacity-100");
    expect(leftControls).toEqual([dragHandle, checkbox]);
  });

  it("buckets a dangling groupId into Ungrouped (cross-tab deletion defense)", () => {
    renderClient(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "Orphan" }, { groupId: "deleted-group" }),
        ]}
        projectGroups={groups}
      />,
    );
    expect(
      within(screen.getByLabelText("Ungrouped")).getByRole("article"),
    ).toHaveTextContent("Orphan");
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
    await user.click(
      screen.getByRole("button", { name: "Show projects search" }),
    );
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search projects" }),
      { target: { value: "clinic" } },
    );
    expect(screen.getByLabelText("Pipeline")).toBeInTheDocument();
    expect(screen.queryByLabelText("Archive")).not.toBeInTheDocument(); // empty during search
  });

  it("paints a group accent flag for an accented group", () => {
    renderClient(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "In Pipeline" }, { groupId: "g1" })]}
        projectGroups={groups}
      />,
    );
    const pipeline = screen.getByLabelText("Pipeline");
    const label = pipeline.querySelector(
      "[data-project-group-label]",
    ) as HTMLElement;
    const labelStyle = label.getAttribute("style") ?? "";
    // The accent now tints the flag border, background, and text.
    expect(labelStyle).toContain("background-color");
    expect(labelStyle).toContain("border-color");
    expect(labelStyle).toContain("color");
    // The old left accent rule/dot are gone.
    expect(
      pipeline.querySelector("[data-project-group-accent-rule]"),
    ).toBeNull();
    expect(
      pipeline.querySelector("[data-project-group-accent-dot]"),
    ).toBeNull();
  });

  it("reorders named groups by dragging a group handle", async () => {
    renderClient(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "In Pipeline" }, { groupId: "g1" }),
          item({ id: "p2", name: "In Backlog" }, { groupId: "g2" }),
          item({ id: "p3", name: "In Done" }, { groupId: "g3" }),
        ]}
        projectGroups={[
          { id: "g1", name: "Pipeline", accentId: null, position: 0 },
          { id: "g2", name: "Backlog", accentId: null, position: 1 },
          { id: "g3", name: "Done", accentId: null, position: 2 },
        ]}
      />,
    );

    const liveProjects = screen.getByLabelText("Live projects");
    const groupLabels = () =>
      within(liveProjects)
        .getAllByRole("region")
        .map((section) => section.getAttribute("aria-label"));
    expect(groupLabels()).toEqual(["Pipeline", "Backlog", "Done"]);

    const pipeline = screen.getByLabelText("Pipeline") as HTMLElement;
    const backlog = screen.getByLabelText("Backlog") as HTMLElement;
    const handle = within(backlog).getByRole("button", {
      name: "Reorder Backlog group",
    });
    expect(handle).toHaveAttribute("draggable", "true");
    setGroupSectionRect(pipeline, 0, 80);

    const dataTransfer = mockDataTransfer();
    dispatchProjectGroupDragEvent(handle, "dragstart", { dataTransfer });
    dispatchProjectGroupDragEvent(pipeline, "dragover", {
      dataTransfer,
      clientY: 1,
    });
    expect(pipeline).toHaveAttribute("data-project-group-drop-position", "before");
    dispatchProjectGroupDragEvent(pipeline, "drop", {
      dataTransfer,
      clientY: 1,
    });

    expect(groupLabels()).toEqual(["Backlog", "Pipeline", "Done"]);
    await waitFor(() =>
      expect(mocks.reorderProjectGroups).toHaveBeenCalledWith({
        orderedGroupIds: ["g2", "g1", "g3"],
      }),
    );
    await waitFor(() =>
      expect(groupLabels()).toEqual(["Backlog", "Pipeline", "Done"]),
    );
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
  });

  it("paints Cultural above Residential before starting group reorder persistence", async () => {
    const animationFrames: FrameRequestCallback[] = [];
    const requestAnimationFrameSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback: FrameRequestCallback) => {
        animationFrames.push(callback);
        return animationFrames.length;
      });

    try {
      renderClient(
        <ProjectsPageClient
          projects={[
            item({ id: "p1", name: "House" }, { groupId: "g1" }),
            item({ id: "p2", name: "Gallery" }, { groupId: "g2" }),
            item({ id: "p3", name: "Office" }, { groupId: "g3" }),
          ]}
          projectGroups={[
            { id: "g1", name: "Residential", accentId: null, position: 0 },
            { id: "g2", name: "Cultural", accentId: null, position: 1 },
            { id: "g3", name: "Commercial", accentId: null, position: 2 },
          ]}
        />,
      );

      const liveProjects = screen.getByLabelText("Live projects");
      const groupLabels = () =>
        within(liveProjects)
          .getAllByRole("region")
          .map((section) => section.getAttribute("aria-label"));
      expect(groupLabels()).toEqual(["Residential", "Cultural", "Commercial"]);

      const residential = screen.getByLabelText("Residential") as HTMLElement;
      const cultural = screen.getByLabelText("Cultural") as HTMLElement;
      const culturalHandle = within(cultural).getByRole("button", {
        name: "Reorder Cultural group",
      });
      setGroupSectionRect(residential, 0, 80);

      const dataTransfer = mockDataTransfer();
      dispatchProjectGroupDragEvent(culturalHandle, "dragstart", {
        dataTransfer,
      });
      dispatchProjectGroupDragEvent(residential, "dragover", {
        dataTransfer,
        clientY: 1,
      });
      dispatchProjectGroupDragEvent(residential, "drop", {
        dataTransfer,
        clientY: 1,
      });

      expect(groupLabels()).toEqual(["Cultural", "Residential", "Commercial"]);
      expect(mocks.reorderProjectGroups).not.toHaveBeenCalled();
      expect(animationFrames).toHaveLength(1);

      animationFrames[0]?.(performance.now());
      expect(mocks.reorderProjectGroups).toHaveBeenCalledWith({
        orderedGroupIds: ["g2", "g1", "g3"],
      });
      await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
    } finally {
      requestAnimationFrameSpy.mockRestore();
    }
  });
});

describe("ProjectsPageClient group mode — zero groups", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.values(mocks).forEach((m) => "mockClear" in m && m.mockClear());
    window.localStorage.setItem(
      "archestimator_projects_organize_by_v1",
      "group",
    );
  });

  it("shows a single Ungrouped flag holding all projects without an empty-state CTA", () => {
    renderClient(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "Loose One" }, { groupId: null }),
          item({ id: "p2", name: "Loose Two" }, { groupId: null }),
        ]}
        projectGroups={[]}
      />,
    );
    expect(
      screen.queryByText("Organize projects into groups"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Create your first group" }),
    ).not.toBeInTheDocument();
    const ungrouped = screen.getByLabelText("Ungrouped");
    expect(ungrouped).toHaveAttribute("data-project-group", "__ungrouped__");
    expect(within(ungrouped).getAllByRole("article")).toHaveLength(2);
    const wall = screen.getByLabelText("Live projects");
    expect(
      wall.compareDocumentPosition(ungrouped) &
        Node.DOCUMENT_POSITION_CONTAINED_BY,
    ).toBeTruthy();
  });

  it("does NOT show the zero-groups empty state once at least one group exists", () => {
    renderClient(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose One" }, { groupId: null })]}
        projectGroups={[
          { id: "g1", name: "Pipeline", accentId: null, position: 0 },
        ]}
      />,
    );
    expect(
      screen.queryByText("Organize projects into groups"),
    ).not.toBeInTheDocument();
  });
});

describe("ProjectsPageClient group mode — search-empty fallback (LD-10)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.values(mocks).forEach((m) => "mockClear" in m && m.mockClear());
    window.localStorage.setItem(
      "archestimator_projects_organize_by_v1",
      "group",
    );
  });

  it("leaves the group shell empty when a search hides every group", async () => {
    const user = userEvent.setup();
    renderClient(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "Pipeline Clinic" }, { groupId: "g1" }),
        ]}
        projectGroups={[
          { id: "g1", name: "Pipeline", accentId: null, position: 0 },
        ]}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Show projects search" }),
    );
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search projects" }),
      { target: { value: "zzz-no-match" } },
    );
    expect(screen.queryByLabelText("Pipeline")).not.toBeInTheDocument();
    expect(
      within(screen.getByLabelText("Live projects")).queryAllByRole("article"),
    ).toHaveLength(0);
    expect(
      screen.queryByText("No projects match your search"),
    ).not.toBeInTheDocument();
  });
});

describe("Project group toolbar and flag actions", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.values(mocks).forEach((m) => "mockClear" in m && m.mockClear());
    window.localStorage.setItem(
      "archestimator_projects_organize_by_v1",
      "group",
    );
  });

  it("disables expand and collapse all in the flat no-grouping view", () => {
    window.localStorage.setItem("archestimator_projects_group_by_v1", "none");
    window.localStorage.setItem(
      "archestimator_projects_organize_by_v1",
      "none",
    );
    renderClient(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose" }, { groupId: null })]}
        projectGroups={groups}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Expand all projects" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Collapse all projects" }),
    ).toBeDisabled();
  });

  it("expands and collapses all manual project groups from the header toolbar", async () => {
    const user = userEvent.setup();
    renderClient(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "In Pipeline" }, { groupId: "g1" }),
          item({ id: "p2", name: "In Archive" }, { groupId: "g2" }),
        ]}
        projectGroups={groups}
      />,
    );

    const pipeline = screen.getByLabelText("Pipeline");
    const archive = screen.getByLabelText("Archive");
    const collapseAll = screen.getByRole("button", {
      name: "Collapse all projects",
    });
    const expandAll = screen.getByRole("button", {
      name: "Expand all projects",
    });

    expect(collapseAll).not.toBeDisabled();
    expect(expandAll).not.toBeDisabled();
    expect(within(pipeline).getByRole("article")).toHaveTextContent(
      "In Pipeline",
    );
    expect(within(archive).getByRole("article")).toHaveTextContent(
      "In Archive",
    );

    await user.click(collapseAll);
    expect(within(pipeline).queryByRole("article")).toBeNull();
    expect(within(archive).queryByRole("article")).toBeNull();
    expect(
      within(pipeline).getByRole("button", { name: "Expand Pipeline" }),
    ).toHaveAttribute("aria-expanded", "false");

    await user.click(expandAll);
    expect(within(pipeline).getByRole("article")).toHaveTextContent(
      "In Pipeline",
    );
    expect(within(archive).getByRole("article")).toHaveTextContent(
      "In Archive",
    );
  });

  it("collapses and reopens scalar date groups without trapping the user", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "archestimator_projects_group_by_v1",
      "updated_at",
    );
    window.localStorage.setItem(
      "archestimator_projects_organize_by_v1",
      "updated_at",
    );
    renderClient(
      <ProjectsPageClient
        projects={[
          item({
            id: "p1",
            name: "February Project",
            updated_at: "2026-02-01T00:00:00.000Z",
          }),
        ]}
        projectGroups={groups}
      />,
    );

    const february = screen.getByLabelText("2026 · February");
    await user.click(
      screen.getByRole("button", { name: "Collapse all projects" }),
    );

    expect(within(february).queryByRole("article")).toBeNull();
    const expandFebruary = within(february).getByRole("button", {
      name: "Expand 2026 · February",
    });
    expect(expandFebruary).toHaveAttribute("aria-expanded", "false");

    await user.click(expandFebruary);
    expect(within(february).getByRole("article")).toHaveTextContent(
      "February Project",
    );
  });

  it("places Add group in the trailing action cluster before Add projects without Manage groups", () => {
    renderClient(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose" }, { groupId: null })]}
        projectGroups={[
          { id: "g1", name: "Pipeline", accentId: null, position: 0 },
        ]}
      />,
    );

    const toolbar = screen.getByLabelText("Project tools");
    const actionLabels = within(toolbar)
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label"));
    expect(actionLabels.slice(-2)).toEqual(["Add group", "Add projects"]);
    expect(
      within(toolbar).queryByRole("button", { name: "Manage groups" }),
    ).toBeNull();
    expect(
      within(toolbar).getByRole("button", { name: "Add group" }),
    ).toHaveClass("bg-orange-100", "text-orange-700", "cursor-pointer");
    expect(
      within(toolbar).getByRole("button", { name: "Add projects" }),
    ).toHaveClass("bg-orange-100", "text-orange-700", "cursor-pointer");
    expect(
      within(
        screen.getByRole("group", { name: "projects view filters" }),
      ).queryByRole("button", {
        name: "Manage groups",
      }),
    ).toBeNull();
  });

  it("clicking Add group creates a neutral default group, shows it immediately, switches to group view, and opens no dialog", async () => {
    const user = userEvent.setup();
    let resolveCreate: (value: { id: string }) => void = () => {};
    mocks.createProjectGroup.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
    );
    window.localStorage.setItem("archestimator_projects_group_by_v1", "none");
    window.localStorage.setItem("archestimator_projects_organize_by_v1", "none");
    renderClient(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose" }, { groupId: null })]}
        projectGroups={[
          { id: "g1", name: "New group", accentId: "teal", position: 0 },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add group" }));

    expect(mocks.createProjectGroup).toHaveBeenCalledWith({
      name: "New group 2",
      accentId: null,
    });
    expect(
      screen.queryByRole("dialog", { name: "Manage groups" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("New group 2")).toBeInTheDocument();
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(window.localStorage.getItem("archestimator_projects_group_by_v1")).toBe(
      "group",
    );
    resolveCreate({ id: "g-new" });
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
  });

  it("opens direct flag actions for neutral color and delete from the group kebab", async () => {
    const user = userEvent.setup();
    renderClient(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose" }, { groupId: "g1" })]}
        projectGroups={[
          { id: "g1", name: "Pipeline", accentId: "teal", position: 0 },
        ]}
      />,
    );

    const pipeline = screen.getByLabelText("Pipeline");
    expect(
      pipeline.querySelector("[data-project-group-drag-handle]"),
    ).not.toBeNull();
    await user.click(
      within(pipeline).getByRole("button", {
        name: "Group actions for Pipeline",
      }),
    );
    expect(
      screen.getAllByRole("menuitem").map((item) =>
        item.textContent?.replace(/\s+/g, " ").trim(),
      ),
    ).toEqual(["Color", "Delete group"]);
    const colorSubmenuTrigger = screen.getByRole("menuitem", {
      name: "Color",
    });
    expect(colorSubmenuTrigger).toHaveAttribute("aria-haspopup", "menu");
    expect(
      screen.queryByRole("menuitem", { name: "Neutral grey" }),
    ).not.toBeInTheDocument();
    colorSubmenuTrigger.focus();
    fireEvent.keyDown(colorSubmenuTrigger, { key: "ArrowRight" });
    const neutralColorItem = await screen.findByRole("menuitem", {
      name: "Neutral grey",
    });
    const neutralSwatch = neutralColorItem.querySelector(
      "[data-project-group-color-swatch='neutral']",
    ) as HTMLElement;
    const tealSwatch = screen
      .getByRole("menuitem", { name: "Teal" })
      .querySelector("[data-project-group-color-swatch='teal']") as HTMLElement;
    expect(neutralSwatch).not.toBeNull();
    expect(neutralSwatch.style.backgroundColor).toBe(
      hexToRgb(resolveAccent(null).ruleColor),
    );
    expect(tealSwatch).not.toBeNull();
    expect(tealSwatch.style.backgroundColor).toBe(
      hexToRgb(resolveAccent("teal").ruleColor),
    );
    await user.click(neutralColorItem);
    await waitFor(() =>
      expect(mocks.recolorProjectGroup).toHaveBeenCalledWith({
        groupId: "g1",
        accentId: null,
      }),
    );

    await user.click(
      within(pipeline).getByRole("button", {
        name: "Group actions for Pipeline",
      }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Delete group" }));
    expect(mocks.deleteProjectGroup).toHaveBeenCalledWith({ groupId: "g1" });
  });

  it("recolors a group immediately while the server refresh is still pending", async () => {
    const user = userEvent.setup();
    let resolveRecolor: () => void = () => {};
    mocks.recolorProjectGroup.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveRecolor = resolve;
        }),
    );
    renderClient(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose" }, { groupId: "g1" })]}
        projectGroups={[
          { id: "g1", name: "Pipeline", accentId: "teal", position: 0 },
        ]}
      />,
    );

    const pipeline = screen.getByLabelText("Pipeline");
    expect(
      (
        pipeline.querySelector("[data-project-group-label]") as HTMLElement
      ).style.borderColor,
    ).toBe(hexToRgb(resolveAccent("teal").ruleColor));

    await user.click(
      within(pipeline).getByRole("button", {
        name: "Group actions for Pipeline",
      }),
    );
    const colorSubmenuTrigger = screen.getByRole("menuitem", { name: "Color" });
    colorSubmenuTrigger.focus();
    fireEvent.keyDown(colorSubmenuTrigger, { key: "ArrowRight" });
    await user.click(await screen.findByRole("menuitem", { name: "Slate" }));

    await waitFor(() =>
      expect(mocks.recolorProjectGroup).toHaveBeenCalledWith({
        groupId: "g1",
        accentId: "slate",
      }),
    );
    expect(
      (
        screen
          .getByLabelText("Pipeline")
          .querySelector("[data-project-group-label]") as HTMLElement
      ).style.borderColor,
    ).toBe(hexToRgb(resolveAccent("slate").ruleColor));
    expect(mocks.refresh).not.toHaveBeenCalled();

    resolveRecolor();
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
  });

  it("renames a group inline immediately on Enter while the server refresh is still pending", async () => {
    const user = userEvent.setup();
    let resolveRename: () => void = () => {};
    mocks.renameProjectGroup.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveRename = resolve;
        }),
    );
    renderClient(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose" }, { groupId: "g1" })]}
        projectGroups={[
          { id: "g1", name: "Pipeline", accentId: "teal", position: 0 },
        ]}
      />,
    );

    await user.click(
      within(screen.getByLabelText("Pipeline")).getByRole("button", {
        name: "Rename Pipeline group",
      }),
    );
    const input = screen.getByRole("textbox", {
      name: "Rename Pipeline group",
    });
    await user.clear(input);
    await user.type(input, "Roadmap{Enter}");

    expect(mocks.renameProjectGroup).toHaveBeenCalledWith({
      groupId: "g1",
      name: "Roadmap",
    });
    expect(screen.getByLabelText("Roadmap")).toBeInTheDocument();
    expect(screen.queryByLabelText("Pipeline")).not.toBeInTheDocument();
    expect(mocks.refresh).not.toHaveBeenCalled();

    resolveRename();
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
  });

  it("disables Add group when the group cap is reached", () => {
    const maxGroups: ProjectGroupSummary[] = Array.from(
      { length: MAX_PROJECT_GROUPS },
      (_, index) => ({
        id: `g${index}`,
        name: `Group ${index}`,
        accentId: null,
        position: index,
      }),
    );
    renderClient(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose" }, { groupId: null })]}
        projectGroups={maxGroups}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Add group" }),
    ).toBeDisabled();
  });
});

describe("ProjectsPageClient group assignment", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.values(mocks).forEach((m) => "mockClear" in m && m.mockClear());
    window.localStorage.setItem(
      "archestimator_projects_organize_by_v1",
      "group",
    );
  });

  const assignGroups: ProjectGroupSummary[] = [
    { id: "g1", name: "Pipeline", accentId: null, position: 0 },
  ];
  const assignGroups2: ProjectGroupSummary[] = [
    { id: "g1", name: "Pipeline", accentId: null, position: 0 },
    { id: "g2", name: "Archive", accentId: null, position: 1 },
  ];

  it("optimistically moves a card to a group, calls the action, and triggers the RSC refresh (LD-6)", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose" }, { groupId: null })]}
        projectGroups={assignGroups}
      />,
    );
    // Card starts in Ungrouped.
    expect(
      within(screen.getByLabelText("Ungrouped")).getByRole("article"),
    ).toHaveTextContent("Loose");

    await user.click(
      screen.getByRole("button", { name: "Move Loose to a group" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Pipeline" }));

    expect(mocks.moveProjectToGroup).toHaveBeenCalledWith({
      projectId: "p1",
      groupId: "g1",
    });
    // Optimistic: card now appears under Pipeline.
    expect(
      within(screen.getByLabelText("Pipeline")).getByRole("article"),
    ).toHaveTextContent("Loose");
    // LD-6: the override is cleared by the reconciliation EFFECT once SSR is authoritative,
    // NOT inside a router.refresh().then(). Here we only assert the refresh was triggered;
    // the no-flicker reconciliation invariant is pinned by the interleaving test below.
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
  });

  it("moves a card into a group by dragging the project-card handle onto the group section", async () => {
    renderClient(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose" }, { groupId: null })]}
        projectGroups={assignGroups}
      />,
    );

    expect(
      within(screen.getByLabelText("Ungrouped")).getByRole("article"),
    ).toHaveTextContent("Loose");

    const card = screen.getByLabelText("Loose project, owned access");
    const handle = within(card).getByRole("button", {
      name: "Drag Loose to a group",
    });
    const pipeline = screen.getByLabelText("Pipeline") as HTMLElement;
    const dataTransfer = mockDataTransfer();

    dispatchProjectGroupDragEvent(handle, "dragstart", { dataTransfer });
    await flushDeferredProjectCardDragUi();
    dispatchProjectGroupDragEvent(pipeline, "dragover", { dataTransfer });
    expect(pipeline).toHaveAttribute("data-project-card-drop-active", "");
    expect(
      pipeline.querySelector("[data-project-card-drop-body-active]"),
    ).toBeInTheDocument();
    expect(
      pipeline.querySelector("[data-project-card-drop-skeleton]"),
    ).toBeInTheDocument();
    dispatchProjectGroupDragEvent(pipeline, "drop", { dataTransfer });

    expect(mocks.moveProjectToGroup).toHaveBeenCalledWith({
      projectId: "p1",
      groupId: "g1",
    });
    expect(
      within(screen.getByLabelText("Pipeline")).getByRole("article"),
    ).toHaveTextContent("Loose");
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
  });

  it("reveals an empty Ungrouped drop target while dragging a grouped card out", async () => {
    renderClient(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "In Pipeline" }, { groupId: "g1" })]}
        projectGroups={assignGroups}
      />,
    );
    expect(screen.queryByLabelText("Ungrouped")).not.toBeInTheDocument();

    const card = screen.getByLabelText("In Pipeline project, owned access");
    const handle = within(card).getByRole("button", {
      name: "Drag In Pipeline to a group",
    });
    const dataTransfer = mockDataTransfer();
    dispatchProjectGroupDragEvent(handle, "dragstart", { dataTransfer });
    await flushDeferredProjectCardDragUi();

    const ungrouped = screen.getByLabelText("Ungrouped") as HTMLElement;
    expect(ungrouped).toHaveAttribute("data-project-group-virtual", "");
    expect(
      ungrouped.querySelector("[data-project-card-drop-skeleton]"),
    ).toBeInTheDocument();
    dispatchProjectGroupDragEvent(ungrouped, "dragover", { dataTransfer });
    dispatchProjectGroupDragEvent(ungrouped, "drop", { dataTransfer });

    expect(mocks.moveProjectToGroup).toHaveBeenCalledWith({
      projectId: "p1",
      groupId: null,
    });
    expect(
      within(screen.getByLabelText("Ungrouped")).getByRole("article"),
    ).toHaveTextContent("In Pipeline");
  });

  it("reorders project cards within the same named group by dragging onto a card slot", async () => {
    renderClient(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "First" }, { groupId: "g1" }),
          item({ id: "p2", name: "Second" }, { groupId: "g1" }),
        ]}
        projectGroups={assignGroups}
      />,
    );

    const pipeline = screen.getByLabelText("Pipeline") as HTMLElement;
    expect(
      within(pipeline).getAllByRole("article").map((card) => card.textContent),
    ).toEqual([expect.stringContaining("First"), expect.stringContaining("Second")]);

    const firstCard = screen.getByLabelText("First project, owned access");
    const handle = within(firstCard).getByRole("button", {
      name: "Drag First to a group",
    });
    const secondSlot = pipeline.querySelector(
      '[data-project-card-drop-slot="p2"]',
    ) as HTMLElement;
    expect(secondSlot).toBeInstanceOf(HTMLElement);
    setGroupSectionRect(secondSlot, 0, 100);

    const dataTransfer = mockDataTransfer();
    dispatchProjectGroupDragEvent(handle, "dragstart", { dataTransfer });
    await flushDeferredProjectCardDragUi();
    dispatchProjectGroupDragEvent(secondSlot, "dragover", {
      dataTransfer,
      clientY: 88,
    });

    const insertionSkeleton = pipeline.querySelector(
      '[data-project-card-drop-skeleton-position="after"]',
    );
    expect(insertionSkeleton).toBeInTheDocument();
    expect(secondSlot.nextElementSibling).toBe(insertionSkeleton);

    dispatchProjectGroupDragEvent(secondSlot, "drop", {
      dataTransfer,
      clientY: 88,
    });

    expect(mocks.reorderProjectsInGroup).toHaveBeenCalledWith({
      groupId: "g1",
      orderedProjectIds: ["p2", "p1"],
    });
    expect(
      within(pipeline).getAllByRole("article").map((card) => card.textContent),
    ).toEqual([expect.stringContaining("Second"), expect.stringContaining("First")]);
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
  });

  it("restores the prior bucket and toasts when the move action rejects", async () => {
    const user = userEvent.setup();
    mocks.moveProjectToGroup.mockRejectedValueOnce(new Error("nope"));
    // MUST use renderClient (wraps ToastProvider). Bare render() gives useToast()
    // the noopToastContext, so the toast renders nothing and getByText below throws.
    renderClient(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose" }, { groupId: null })]}
        projectGroups={assignGroups}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Move Loose to a group" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Pipeline" }));
    // Provider-independent assertion FIRST: the rolled-back bucket state proves the
    // catch path ran even if the toast harness were ever misconfigured.
    await waitFor(() =>
      expect(
        within(screen.getByLabelText("Ungrouped")).getByRole("article"),
      ).toHaveTextContent("Loose"),
    );
    // Toast copy assertion — only resolvable because renderClient mounted ToastProvider.
    expect(
      screen.getByText("Could not move the project. Try again."),
    ).toBeInTheDocument();
  });

  it("bulk-moves selected owned projects via the dock affordance", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "One" }, { groupId: null }),
          item({ id: "p2", name: "Two" }, { groupId: null }),
        ]}
        projectGroups={assignGroups}
      />,
    );
    await user.click(
      within(screen.getByLabelText("One project, owned access")).getByRole(
        "checkbox",
        { name: "Select One for deletion" },
      ),
    );
    await user.click(
      within(screen.getByLabelText("Two project, owned access")).getByRole(
        "checkbox",
        { name: "Select Two for deletion" },
      ),
    );

    const toolbar = screen.getByRole("region", { name: "Bulk action toolbar" });
    expect(document.querySelector("[data-bulk-move-to-group]")).toBeNull();
    expect(
      within(toolbar).getByRole("button", {
        name: "Move selected projects to group",
      }),
    ).toBeInTheDocument();

    await user.click(
      within(toolbar).getByRole("button", {
        name: "Move selected projects to group",
      }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Pipeline" }));

    expect(mocks.bulkAssignProjectsToGroup).toHaveBeenCalledWith({
      projectIds: ["p1", "p2"],
      groupId: "g1",
    });
  });

  it("(LD-5) bulk-assigns an OWNED project that the delete flow would BLOCK (active shared link) — assignment never consults the delete gate", async () => {
    const user = userEvent.setup();
    // The assignment selection is its OWN source (selectedAssignableProjectIds), filtered by
    // canAssignProjectToGroup (accessKind === "owned") and read by the bottom-dock move
    // affordance — it is NOT the delete-execution-gated selectedVisibleProjectIds. p1 is an
    // owned project with an active outbound shared link: the delete EXECUTION would surface
    // it as a `blocked` id from previewBulkDeleteProjects (you cannot trash a project with a
    // live share), yet D9 requires it to remain bulk-GROUPABLE.
    render(
      <ProjectsPageClient
        projects={[
          item(
            { id: "p1", name: "Shared Out" },
            { groupId: null, sharedEstimateCount: 2 },
          ),
        ]}
        projectGroups={assignGroups}
      />,
    );
    await user.click(
      within(
        screen.getByLabelText("Shared Out project, owned access"),
      ).getByRole("checkbox", { name: /select shared out/i }),
    );

    await user.click(
      screen.getByRole("button", { name: "Move selected projects to group" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Pipeline" }));

    // It was bulk-assigned even though the delete flow would block it.
    expect(mocks.bulkAssignProjectsToGroup).toHaveBeenCalledWith({
      projectIds: ["p1"],
      groupId: "g1",
    });
  });

  it("(LD-11) keeps moved ids optimistic, rolls back SKIPPED ids, and toasts the partial result", async () => {
    const user = userEvent.setup();
    // The action reports only p1 moved; p2 skipped (e.g. lost ownership between read+write).
    mocks.bulkAssignProjectsToGroup.mockResolvedValueOnce({
      movedProjectIds: ["p1"],
      skippedProjectIds: ["p2"],
    });
    renderClient(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "One" }, { groupId: null }),
          item({ id: "p2", name: "Two" }, { groupId: null }),
        ]}
        projectGroups={assignGroups}
      />,
    );
    await user.click(
      within(screen.getByLabelText("One project, owned access")).getByRole(
        "checkbox",
        { name: /select one/i },
      ),
    );
    await user.click(
      within(screen.getByLabelText("Two project, owned access")).getByRole(
        "checkbox",
        { name: /select two/i },
      ),
    );
    await user.click(
      screen.getByRole("button", { name: "Move selected projects to group" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Pipeline" }));

    // Moved id stays under Pipeline (optimistic, until SSR reconciles); skipped id rolls
    // back to Ungrouped immediately.
    await waitFor(() =>
      expect(
        within(screen.getByLabelText("Pipeline")).getByRole("article"),
      ).toHaveTextContent("One"),
    );
    expect(
      within(screen.getByLabelText("Ungrouped")).getByRole("article"),
    ).toHaveTextContent("Two");
    expect(
      screen.getByText(/Moved 1; 1 could not be moved\./),
    ).toBeInTheDocument();
  });

  it("(LD-6) a rapid re-assign during a pending refresh does NOT flicker back to stale SSR", async () => {
    const user = userEvent.setup();
    // Hold the move action open so isPending stays true through the second click,
    // simulating an in-flight RSC refresh while the user reassigns again.
    let resolveFirst: () => void = () => {};
    mocks.moveProjectToGroup.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveFirst = () => resolve(undefined);
        }),
    );
    render(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose" }, { groupId: null })]}
        projectGroups={[
          { id: "g1", name: "Pipeline", accentId: null, position: 0 },
          { id: "g2", name: "Archive", accentId: null, position: 1 },
        ]}
      />,
    );
    // First move → Pipeline (action stays pending).
    await user.click(
      screen.getByRole("button", { name: "Move Loose to a group" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Pipeline" }));
    expect(
      within(screen.getByLabelText("Pipeline")).getByRole("article"),
    ).toHaveTextContent("Loose");

    // Re-assign → Archive BEFORE the first refresh settles. The override is now g2.
    await user.click(
      screen.getByRole("button", { name: "Move Loose to a group" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Archive" }));
    expect(
      within(screen.getByLabelText("Archive")).getByRole("article"),
    ).toHaveTextContent("Loose");

    // Resolve the FIRST action. Its router.refresh() fires, but the SSR prop still has
    // groupId:null (the test never re-feeds props), so the reconciliation effect MUST
    // NOT clear the g2 override (SSR != override) — the card stays under Archive, never
    // flickering back to Ungrouped/Pipeline.
    resolveFirst();
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
    expect(
      within(screen.getByLabelText("Archive")).getByRole("article"),
    ).toHaveTextContent("Loose");
    expect(
      screen.queryByLabelText("Pipeline")?.querySelector('[role="article"]'),
    ).toBeFalsy();
  });

  it("(reconcile) clears the override once SSR reflects the move (re-render with changed groupId), with no flicker", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose" }, { groupId: null })]}
        projectGroups={assignGroups}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Move Loose to a group" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Pipeline" }));
    // Optimistic: override puts the card under Pipeline.
    expect(
      within(screen.getByLabelText("Pipeline")).getByRole("article"),
    ).toHaveTextContent("Loose");
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());

    // Drive the reconciliation by re-rendering with SSR props that NOW reflect the move
    // (groupId === "g1"). The clear-on-match branch must drop the override; the card stays
    // under Pipeline the whole time (no flicker to Ungrouped).
    rerender(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose" }, { groupId: "g1" })]}
        projectGroups={assignGroups}
      />,
    );
    await waitFor(() =>
      expect(
        within(screen.getByLabelText("Pipeline")).getByRole("article"),
      ).toHaveTextContent("Loose"),
    );
    // Override cleared ⇒ SSR is authoritative; nothing fell back to Ungrouped.
    expect(screen.queryByLabelText("Ungrouped")).not.toBeInTheDocument();
  });

  it("(F1) clears a stuck override when the project is filtered OUT before SSR reconciles — no later masking", async () => {
    const user = userEvent.setup();
    // Start in Pipeline (g1). User optimistically moves it to Archive (g2) (override = g2),
    // then searches so the card leaves the FILTERED list before the move's refresh settles.
    const { rerender } = render(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose" }, { groupId: "g1" })]}
        projectGroups={assignGroups2}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "Move Loose to a group" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Archive" }));
    expect(
      within(screen.getByLabelText("Archive")).getByRole("article"),
    ).toHaveTextContent("Loose");
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());

    // Filter the project OUT (search miss). The override map still holds p1 → g2.
    await user.click(
      screen.getByRole("button", { name: "Show projects search" }),
    );
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search projects" }),
      {
        target: { value: "zzz-no-match" },
      },
    );
    // SSR now reflects the successful move (groupId === g2). The OLD effect iterated the
    // (now-empty) FILTERED list, so it never visited p1 and the override stuck forever.
    // The F1 fix iterates the FULL item set, so the override clears here.
    rerender(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose" }, { groupId: "g2" })]}
        projectGroups={assignGroups2}
      />,
    );

    // Prove the override is GONE (not merely coincidentally matching) by feeding a LATER
    // authoritative SSR move (g2 → g1) while still filtered. A stuck g2 override would mask
    // this and pin the card to Archive; a cleared map lets the new SSR group win.
    rerender(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose" }, { groupId: "g1" })]}
        projectGroups={assignGroups2}
      />,
    );
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search projects" }),
      { target: { value: "" } },
    );

    // Card follows the latest SSR group (Pipeline). With the bug, the stale g2 override
    // would have masked the move and kept it under Archive.
    await waitFor(() =>
      expect(
        within(screen.getByLabelText("Pipeline")).getByRole("article"),
      ).toHaveTextContent("Loose"),
    );
    expect(
      screen.queryByLabelText("Archive")?.querySelector('[role="article"]'),
    ).toBeFalsy();
  });

  it("(F2) a single-move during an in-flight bulk is NOT clobbered when the bulk skips that id", async () => {
    const user = userEvent.setup();
    // Hold the bulk action open so the single-move can race it while it is in flight.
    let resolveBulk: (value: {
      movedProjectIds: string[];
      skippedProjectIds: string[];
    }) => void = () => {};
    mocks.bulkAssignProjectsToGroup.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveBulk = (value) => resolve(value);
        }),
    );
    render(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "One" }, { groupId: null }),
          item({ id: "p2", name: "Two" }, { groupId: null }),
        ]}
        projectGroups={assignGroups2}
      />,
    );
    // Select both, bulk-move to Pipeline (g1) — stays pending.
    await user.click(
      within(screen.getByLabelText("One project, owned access")).getByRole(
        "checkbox",
        { name: /select one/i },
      ),
    );
    await user.click(
      within(screen.getByLabelText("Two project, owned access")).getByRole(
        "checkbox",
        { name: /select two/i },
      ),
    );
    await user.click(
      screen.getByRole("button", { name: "Move selected projects to group" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Pipeline" }));
    // Optimistic: both cards are now under Pipeline.
    expect(
      within(screen.getByLabelText("Pipeline")).getByText("One"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByLabelText("Pipeline")).getByText("Two"),
    ).toBeInTheDocument();

    // While the bulk is in flight, single-move p1 to Archive (g2). The override for p1 is
    // now g2, newer than the bulk's optimistic g1.
    await user.click(
      screen.getByRole("button", { name: "Move One to a group" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Archive" }));
    expect(
      within(screen.getByLabelText("Archive")).getByRole("article"),
    ).toHaveTextContent("One");

    // Resolve the bulk with p1 SKIPPED. The non-destructive rollback must only restore an
    // id whose CURRENT value still equals the bulk's optimistic g1 — p1 is now g2, so it
    // is left intact (NOT rolled back to pre-bulk null).
    resolveBulk({ movedProjectIds: ["p2"], skippedProjectIds: ["p1"] });
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
    // p1 retains the newer single-move (Archive), NOT the pre-bulk Ungrouped (no rollback).
    expect(
      within(screen.getByLabelText("Archive")).getByRole("article"),
    ).toHaveTextContent("One");
    // No Ungrouped section exists (p1 is in Archive, p2 stays optimistically in Pipeline) —
    // i.e. the skipped-rollback did NOT clobber p1 back to its pre-bulk null bucket.
    expect(screen.queryByLabelText("Ungrouped")).not.toBeInTheDocument();
  });

  it("(F5) clears the moved selection on bulk-assign success", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "One" }, { groupId: null }),
          item({ id: "p2", name: "Two" }, { groupId: null }),
        ]}
        projectGroups={assignGroups}
      />,
    );
    await user.click(
      within(screen.getByLabelText("One project, owned access")).getByRole(
        "checkbox",
        { name: /select one/i },
      ),
    );
    await user.click(
      within(screen.getByLabelText("Two project, owned access")).getByRole(
        "checkbox",
        { name: /select two/i },
      ),
    );
    // The bottom-dock move affordance is visible while the assignment selection is non-empty.
    expect(
      screen.getByRole("button", { name: "Move selected projects to group" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Move selected projects to group" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Pipeline" }));
    await waitFor(() =>
      expect(mocks.bulkAssignProjectsToGroup).toHaveBeenCalled(),
    );

    // On success the moved ids are pruned from the selection ⇒ the bulk-move affordance and
    // the delete dock both disappear (nothing selected anymore).
    await waitFor(() =>
      expect(
        screen.queryByRole("button", {
          name: "Move selected projects to group",
        }),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("button", { name: "Delete selected projects" }),
    ).not.toBeInTheDocument();
  });
});

describe("ProjectsPageClient group a11y + responsiveness", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.values(mocks).forEach((m) => "mockClear" in m && m.mockClear());
    window.localStorage.setItem(
      "archestimator_projects_organize_by_v1",
      "group",
    );
  });

  it("keeps the accent visual and the label/count the real signal", () => {
    render(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "In Pipeline" }, { groupId: "g1" })]}
        projectGroups={[
          { id: "g1", name: "Pipeline", accentId: "teal", position: 0 },
        ]}
      />,
    );
    const section = screen.getByLabelText("Pipeline");
    // The old left accent rule/dot are gone; color is now carried by the flag.
    expect(
      section.querySelector("[data-project-group-accent-rule]"),
    ).toBeNull();
    expect(section.querySelector("[data-project-group-accent-dot]")).toBeNull();
    const label = section.querySelector(
      "[data-project-group-label]",
    ) as HTMLElement;
    expect(label).toHaveAttribute("data-project-group-label");
    expect(label.getAttribute("style") ?? "").toContain("color");
  });

  it("toggles a group via keyboard on the collapse caret", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "In Pipeline" }, { groupId: "g1" })]}
        projectGroups={[
          { id: "g1", name: "Pipeline", accentId: null, position: 0 },
        ]}
      />,
    );
    const caret = within(screen.getByLabelText("Pipeline")).getByRole(
      "button",
      { name: /collapse pipeline/i },
    );
    caret.focus();
    await user.keyboard("{Enter}");
    expect(
      within(screen.getByLabelText("Pipeline")).queryAllByRole("article"),
    ).toHaveLength(0);
  });

  it.each(["small", "medium", "large", "list"] as const)(
    "renders group mode in %s view with the shared grid layout",
    async (mode) => {
      const user = userEvent.setup();
      render(
        <ProjectsPageClient
          projects={[
            item({ id: "p1", name: "In Pipeline" }, { groupId: "g1" }),
          ]}
          projectGroups={[
            { id: "g1", name: "Pipeline", accentId: null, position: 0 },
          ]}
        />,
      );
      await user.click(screen.getByRole("combobox", { name: "View" }));
      await user.click(
        screen.getByRole("option", {
          name:
            mode === "small"
              ? "Small"
              : mode === "medium"
                ? "Medium"
                : mode === "large"
                  ? "Large"
                  : "List",
        }),
      );
      await waitFor(() =>
        expect(screen.getByLabelText("Live projects")).toHaveAttribute(
          "data-project-view-mode",
          mode,
        ),
      );
      expect(screen.getByLabelText("Pipeline")).toBeInTheDocument();
    },
  );
});
