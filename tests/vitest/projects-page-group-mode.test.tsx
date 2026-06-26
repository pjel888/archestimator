import {
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
import type { ProjectGroupSummary } from "@/lib/repositories/workspace-repository";
import type { Tables } from "@/lib/supabase/types";

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
  ProjectGroupCapError: class extends Error {},
  ProjectGroupNameError: class extends Error {},
}));
vi.mock("@/lib/projects/actions", () => ({
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

function project(o: Partial<Tables<"projects">> = {}): Tables<"projects"> {
  return {
    id: o.id ?? "00000000-0000-4000-8000-000000000001",
    workspace_id: "00000000-0000-4000-8000-100000000001",
    name: o.name ?? "Project",
    client_name: "client_name" in o ? (o.client_name ?? null) : "Client",
    project_code: o.project_code ?? "P-001",
    location: o.location ?? "Manila",
    currency_code: "PHP",
    metadata: {},
    created_at: o.created_at ?? "2026-01-01T00:00:00.000Z",
    updated_at: o.updated_at ?? "2026-01-02T00:00:00.000Z",
    created_by: "00000000-0000-4000-8000-200000000001",
  };
}
function item(
  o: Partial<Tables<"projects">> = {},
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

  it("opens the Manage-groups popover from the toolbar when no groups exist", async () => {
    const user = userEvent.setup();
    renderClient(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose One" }, { groupId: null })]}
        projectGroups={[]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Manage groups" }));
    expect(
      screen.getByRole("dialog", { name: "Manage groups" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "New group name" }),
    ).toBeInTheDocument();
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

describe("ManageGroupsPopover via ProjectsPageClient", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.values(mocks).forEach((m) => "mockClear" in m && m.mockClear());
    window.localStorage.setItem(
      "archestimator_projects_organize_by_v1",
      "group",
    );
  });

  async function openPopover(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: "Manage groups" }));
    return screen.getByRole("dialog", { name: "Manage groups" });
  }

  it("places Manage groups in the trailing action cluster before Add projects", () => {
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
    expect(actionLabels.slice(-2)).toEqual(["Manage groups", "Add projects"]);
    expect(
      within(
        screen.getByRole("group", { name: "projects view filters" }),
      ).queryByRole("button", {
        name: "Manage groups",
      }),
    ).toBeNull();
  });

  it("creates a group through the New-group input", async () => {
    const user = userEvent.setup();
    renderClient(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose" }, { groupId: null })]}
        projectGroups={[
          { id: "g1", name: "Pipeline", accentId: null, position: 0 },
        ]}
      />,
    );
    const dialog = await openPopover(user);
    await user.type(
      within(dialog).getByRole("textbox", { name: "New group name" }),
      "Drafts",
    );
    await user.click(within(dialog).getByRole("button", { name: "Add group" }));
    expect(mocks.createProjectGroup).toHaveBeenCalledWith({
      name: "Drafts",
      accentId: null,
    });
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
  });

  it("renames a group on blur", async () => {
    const user = userEvent.setup();
    renderClient(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose" }, { groupId: null })]}
        projectGroups={[
          { id: "g1", name: "Pipeline", accentId: null, position: 0 },
        ]}
      />,
    );
    const dialog = await openPopover(user);
    const rename = within(dialog).getByRole("textbox", {
      name: "Rename Pipeline",
    });
    await user.clear(rename);
    await user.type(rename, "Renamed");
    fireEvent.blur(rename);
    expect(mocks.renameProjectGroup).toHaveBeenCalledWith({
      groupId: "g1",
      name: "Renamed",
    });
  });

  it("recolors a group via the recolor swatches with the current color checked", async () => {
    const user = userEvent.setup();
    renderClient(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose" }, { groupId: null })]}
        projectGroups={[
          { id: "g1", name: "Pipeline", accentId: "teal", position: 0 },
        ]}
      />,
    );
    const dialog = await openPopover(user);
    await user.click(
      within(dialog).getByRole("button", { name: "Recolor Pipeline" }),
    );
    // Scope to the recolor radiogroup (the New-group row also has accent swatches).
    const recolorGroup = within(dialog).getByRole("radiogroup", {
      name: "Recolor Pipeline",
    });
    // Current color (teal) shows a check indicator and is the checked radio.
    const tealSwatch = within(recolorGroup).getByRole("radio", {
      name: "Teal",
    });
    expect(tealSwatch).toBeChecked();
    expect(
      tealSwatch.querySelector("[data-action-menu-item-check]"),
    ).not.toBeNull();
    await user.click(
      within(recolorGroup).getByRole("radio", { name: "Indigo" }),
    );
    expect(mocks.recolorProjectGroup).toHaveBeenCalledWith({
      groupId: "g1",
      accentId: "indigo",
    });
  });

  it("deletes a group through an inline two-click confirm (never the bulk modal)", async () => {
    const user = userEvent.setup();
    renderClient(
      <ProjectsPageClient
        projects={[item({ id: "p1", name: "Loose" }, { groupId: null })]}
        projectGroups={[
          { id: "g1", name: "Pipeline", accentId: null, position: 0 },
        ]}
      />,
    );
    const dialog = await openPopover(user);
    await user.click(
      within(dialog).getByRole("button", { name: "Delete Pipeline" }),
    );
    // Inline confirm appears; no destructive preview modal.
    expect(
      within(dialog).getByRole("button", { name: "Confirm delete Pipeline" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: /Delete project/i }),
    ).not.toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", { name: "Confirm delete Pipeline" }),
    );
    expect(mocks.deleteProjectGroup).toHaveBeenCalledWith({ groupId: "g1" });
  });

  it("shows the at-limit message when the group cap is reached", async () => {
    const user = userEvent.setup();
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
    const dialog = await openPopover(user);
    expect(
      within(dialog).getByText(/reached the .*-group limit/i),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Add group" }),
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
