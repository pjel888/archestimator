import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ProjectsPageClient,
  type ProjectListItem,
} from "@/components/workshop/projects-page-client";
import type { ProjectAccessKind } from "@/components/workshop/LiveProjectCard";
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
    summary: {
      requestedCount: input.projectIds.length,
      eligibleCount: input.projectIds.length,
      blockedCount: 0,
    },
    issues: [],
    blocked: [],
    storageTargets: [],
  })),
  executeBulkDeleteProjects: vi.fn(async (input: { projectIds: string[] }) => ({
    ok: true,
    targetType: "project",
    ids: input.projectIds,
    deletedIds: input.projectIds,
    summary: {
      requestedCount: input.projectIds.length,
      eligibleCount: input.projectIds.length,
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

function createProject(overrides: Partial<Tables<"projects">> = {}): Tables<"projects"> {
  return {
    id: overrides.id ?? "00000000-0000-4000-8000-000000000001",
    workspace_id: overrides.workspace_id ?? "00000000-0000-4000-8000-100000000001",
    name: overrides.name ?? "Owned Residence",
    client_name: overrides.client_name ?? "Lewis Family",
    project_code: overrides.project_code ?? "OWN-001",
    location: overrides.location ?? "Manila",
    currency_code: overrides.currency_code ?? "PHP",
    metadata: overrides.metadata ?? {},
    created_at: overrides.created_at ?? "2026-06-01T00:00:00.000Z",
    updated_at: overrides.updated_at ?? "2026-06-02T00:00:00.000Z",
    created_by: overrides.created_by ?? "00000000-0000-4000-8000-200000000001",
  };
}

function createProjectItem(
  accessKind: ProjectAccessKind,
  overrides: Partial<ProjectListItem> & { project?: Partial<Tables<"projects">> } = {},
): ProjectListItem {
  const projectName =
    overrides.project?.name ??
    (accessKind === "owned"
      ? "Owned Residence"
      : accessKind === "project-member"
        ? "Shared Clinic"
        : accessKind === "sheet-member"
          ? "Shared Sheet Tower"
          : "Pending Museum Wing");

  return {
    project: createProject({
      id:
        overrides.project?.id ??
        (accessKind === "owned"
          ? "00000000-0000-4000-8000-000000000001"
          : accessKind === "project-member"
            ? "00000000-0000-4000-8000-000000000002"
            : accessKind === "sheet-member"
              ? "00000000-0000-4000-8000-000000000003"
              : "00000000-0000-4000-8000-000000000004"),
      name: projectName,
      client_name: overrides.project?.client_name,
      project_code: overrides.project?.project_code,
      location: overrides.project?.location,
      workspace_id:
        overrides.project?.workspace_id ??
        (accessKind === "owned"
          ? "00000000-0000-4000-8000-100000000001"
          : "00000000-0000-4000-8000-900000000001"),
      ...overrides.project,
    }),
    accessKind,
    currentUserRole: overrides.currentUserRole ?? (accessKind === "owned" ? "owner" : "viewer"),
    ownerWorkspaceName: overrides.ownerWorkspaceName ?? (accessKind === "owned" ? null : "Partner Studio"),
    pendingInvite:
      overrides.pendingInvite ??
      (accessKind === "pending-invite"
        ? {
            id: "invite-pending-1",
            projectId: "00000000-0000-4000-8000-000000000004",
            estimateId: null,
            projectName,
            projectCode: "PEND-001",
            estimateName: null,
            role: "viewer",
            scope: "project",
            inviterLabel: "Partner Studio",
            state: "pending",
            expiresAt: "2026-06-10T00:00:00.000Z",
            lastOpenedAt: null,
          }
        : null),
    pendingInviteCount: overrides.pendingInviteCount ?? 0,
    publicationSummary: overrides.publicationSummary ?? null,
    sharedEstimateCount: overrides.sharedEstimateCount ?? (accessKind === "sheet-member" ? 1 : 0),
  };
}

function getActivePanel() {
  return screen.getByRole("tabpanel");
}

describe("ProjectsPageClient access tabs", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.refresh.mockClear();
    mocks.push.mockClear();
    mocks.replace.mockClear();
    mocks.setProjectFavorite.mockClear();
  });

  it("renders exactly the two requested access tabs and removes the old access filter", () => {
    render(
      <ProjectsPageClient
        projects={[createProjectItem("owned"), createProjectItem("project-member")]}
      />,
    );

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    const tablist = screen.getByRole("tablist", { name: "Project access tabs" });
    const ownedTab = screen.getByRole("tab", { name: /Your Projects/i });
    expect(tablist).toHaveClass("h-[32px]", "border-b", "bg-surfaceMuted");
    expect(ownedTab).toHaveClass("border-b-0", "bg-white", "-mb-px");
    expect(ownedTab).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Projects shared to you/i })).toBeInTheDocument();
    for (const tab of tabs) {
      const panelId = tab.getAttribute("aria-controls");
      expect(panelId).toBeTruthy();
      expect(document.getElementById(panelId ?? "")).toBeInTheDocument();
    }
    expect(screen.queryByRole("tab", { name: /^All/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /^Owned/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /^Shared$/i })).not.toBeInTheDocument();
  });

  it("starts on Your Projects when owned projects exist and scopes owned cards to that panel", () => {
    render(
      <ProjectsPageClient
        projects={[
          createProjectItem("owned"),
          createProjectItem("project-member"),
          createProjectItem("sheet-member"),
          createProjectItem("pending-invite"),
        ]}
      />,
    );

    expect(screen.getByRole("tab", { name: /Your Projects/i })).toHaveAttribute("aria-selected", "true");
    const panel = getActivePanel();
    expect(within(panel).getByText("Owned Residence")).toBeInTheDocument();
    expect(within(panel).queryByText("Shared Clinic")).not.toBeInTheDocument();
    expect(within(panel).queryByText("Shared Sheet Tower")).not.toBeInTheDocument();
    expect(within(panel).queryByText("Pending Museum Wing")).not.toBeInTheDocument();
  });

  it("shows all non-owned access kinds only in Projects shared to you", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsPageClient
        projects={[
          createProjectItem("owned"),
          createProjectItem("project-member"),
          createProjectItem("sheet-member"),
          createProjectItem("pending-invite"),
        ]}
      />,
    );

    await user.click(screen.getByRole("tab", { name: /Projects shared to you/i }));

    const panel = getActivePanel();
    expect(within(panel).queryByText("Owned Residence")).not.toBeInTheDocument();
    expect(within(panel).getByText("Shared Clinic")).toBeInTheDocument();
    expect(within(panel).getByText("Shared Sheet Tower")).toBeInTheDocument();
    expect(within(panel).getByText("Pending Museum Wing")).toBeInTheDocument();
    expect(within(panel).getByText("Shared project")).toBeInTheDocument();
    expect(within(panel).getByText("Estimate-only")).toBeInTheDocument();
    expect(within(panel).getByText("Pending invite")).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Accept invite for Pending Museum Wing" })).toBeInTheDocument();
  });

  it("defaults shared-only users into Projects shared to you without hiding Your Projects", () => {
    render(
      <ProjectsPageClient
        projects={[createProjectItem("project-member"), createProjectItem("pending-invite")]}
      />,
    );

    expect(screen.getByRole("tab", { name: /Projects shared to you/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Your Projects/i })).toBeInTheDocument();
    expect(within(getActivePanel()).getByText("Shared Clinic")).toBeInTheDocument();
    expect(within(getActivePanel()).getByText("Pending Museum Wing")).toBeInTheDocument();
  });

  it("searches within the active tab and preserves the query when switching tabs", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsPageClient
        projects={[
          createProjectItem("owned", { project: { name: "Owned Residence", client_name: "Lewis Family" } }),
          createProjectItem("project-member", { project: { name: "Shared Clinic", client_name: "Clinic Group" } }),
        ]}
      />,
    );

    await user.type(screen.getByRole("searchbox", { name: "Search projects" }), "clinic");

    expect(within(getActivePanel()).getByText("No projects match your search")).toBeInTheDocument();
    expect(within(getActivePanel()).queryByText("Shared Clinic")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Projects shared to you/i }));

    expect(screen.getByRole("searchbox", { name: "Search projects" })).toHaveValue("clinic");
    expect(within(getActivePanel()).getByText("Shared Clinic")).toBeInTheDocument();
    expect(within(getActivePanel()).queryByText("Owned Residence")).not.toBeInTheDocument();
  });

  it("explains an empty shared tab without showing a create-project action in that panel", async () => {
    const user = userEvent.setup();
    render(<ProjectsPageClient projects={[createProjectItem("owned")]} />);

    await user.click(screen.getByRole("tab", { name: /Projects shared to you/i }));

    const panel = getActivePanel();
    expect(within(panel).getByText("No projects shared to you yet")).toBeInTheDocument();
    expect(within(panel).getByText(/viewer, editor, admin, or sheet collaborator/i)).toBeInTheDocument();
    expect(within(panel).queryByRole("button", { name: /Create/i })).not.toBeInTheDocument();
  });

  it("suppresses favorite controls for shared cards while preserving owned favorites", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsPageClient
        projects={[createProjectItem("owned"), createProjectItem("project-member")]}
      />,
    );

    expect(
      within(getActivePanel()).getByRole("button", { name: "Add Owned Residence to favorite projects" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Projects shared to you/i }));

    expect(
      within(getActivePanel()).queryByRole("button", { name: "Add Shared Clinic to favorite projects" }),
    ).not.toBeInTheDocument();
  });

  it("keeps bulk selection scoped to the active visible tab while preserving hidden selections", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsPageClient
        projects={[
          createProjectItem("owned"),
          createProjectItem("project-member"),
          createProjectItem("sheet-member"),
          createProjectItem("pending-invite"),
        ]}
      />,
    );

    await user.click(within(getActivePanel()).getByRole("checkbox", { name: "Select Owned Residence for deletion" }));

    const toolbar = screen.getByRole("region", { name: "Bulk action toolbar" });
    expect(toolbar).toHaveTextContent("1 selected");
    expect(toolbar).toHaveClass("fixed");
    expect(toolbar.className).toContain("bottom-[calc(3.5rem+env(safe-area-inset-bottom))]");
    expect(getActivePanel()).toHaveClass("pb-20");
    const dockSurface = toolbar.querySelector("[data-bulk-action-dock-surface]");
    expect(dockSurface).toHaveClass(
      "bg-white/95",
      "flex-col",
      "shadow-[0_22px_54px_-30px_rgba(17,17,17,0.75)]",
      "backdrop-blur-md",
      "w-36",
    );
    expect(toolbar).not.toHaveTextContent("Project deletion blocks active shared links");
    expect(toolbar.querySelector("[data-bulk-action-count-floor]")).toHaveClass("h-6", "w-full");
    expect(toolbar.querySelector("[data-bulk-action-count-floor] p")).toHaveClass("w-[12ch]", "tabular-nums");
    expect(toolbar.querySelector("[data-bulk-action-icon-floor]")).toHaveClass(
      "h-9",
      "grid-cols-[2rem_2rem_1px_2rem]",
    );
    expect(screen.getByRole("group", { name: "Bulk selection actions" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select visible" })).toHaveClass("size-8");
    expect(screen.getByRole("button", { name: "Clear selection" })).toHaveClass("size-8");
    expect(screen.getByRole("button", { name: "Delete selected projects" })).toHaveClass("size-8", "text-danger");

    await user.click(screen.getByRole("tab", { name: /Projects shared to you/i }));

    expect(screen.queryByRole("region", { name: "Bulk action toolbar" })).not.toBeInTheDocument();
    expect(within(getActivePanel()).getByRole("checkbox", { name: "Select Shared Clinic for deletion" })).toBeDisabled();
    expect(within(getActivePanel()).getByRole("checkbox", { name: "Select Shared Sheet Tower for deletion" })).toBeDisabled();

    await user.click(screen.getByRole("tab", { name: /Your Projects/i }));

    expect(screen.getByRole("region", { name: "Bulk action toolbar" })).toHaveTextContent("1 selected");
  });

  it("supports Arrow/Home/End keyboard tab activation and keeps view mode unchanged", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsPageClient
        projects={[createProjectItem("owned"), createProjectItem("project-member")]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "View projects as Small thumbnails" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Live projects")).toHaveAttribute("data-project-view-mode", "small");
    });

    const ownedTab = screen.getByRole("tab", { name: /Your Projects/i });
    ownedTab.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: /Projects shared to you/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Projects shared to you/i })).toHaveFocus();
    expect(screen.getByLabelText("Live projects")).toHaveAttribute("data-project-view-mode", "small");

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: /Your Projects/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Your Projects/i })).toHaveFocus();

    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: /Projects shared to you/i })).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: /Your Projects/i })).toHaveAttribute("aria-selected", "true");
  });
});
