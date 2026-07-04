import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ProjectsPageClient,
  type ProjectListItem,
} from "./projects-page-test-harness";
import type { ProjectAccessKind } from "@/components/workshop/LiveProjectCard";
import type { ProjectRow } from "@/lib/types/database";

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

function createProject(
  overrides: Partial<ProjectRow> = {},
): ProjectRow {
  return {
    id: overrides.id ?? "00000000-0000-4000-8000-000000000001",
    workspace_id:
      overrides.workspace_id ?? "00000000-0000-4000-8000-100000000001",
    name: overrides.name ?? "Owned Residence",
    client_name: overrides.client_name ?? "Lewis Family",
    project_code: overrides.project_code ?? "OWN-001",
    location: overrides.location ?? "Manila",
    currency_code: overrides.currency_code ?? "PHP",
    metadata: overrides.metadata ?? {},
    created_at: overrides.created_at ?? "2026-06-01T00:00:00.000Z",
    updated_at: overrides.updated_at ?? "2026-06-02T00:00:00.000Z",
    created_by:
      overrides.created_by ?? "00000000-0000-4000-8000-200000000001",
  };
}

function createProjectItem(
  accessKind: ProjectAccessKind,
  overrides: Partial<ProjectListItem> & {
    project?: Partial<ProjectRow>;
  } = {},
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
    currentUserRole:
      overrides.currentUserRole ?? (accessKind === "owned" ? "owner" : "viewer"),
    ownerWorkspaceName:
      overrides.ownerWorkspaceName ?? (accessKind === "owned" ? null : "Partner Studio"),
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
    sharedEstimateCount:
      overrides.sharedEstimateCount ?? (accessKind === "sheet-member" ? 1 : 0),
  };
}

describe("ProjectsPageClient owned-project surface", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.refresh.mockClear();
    mocks.push.mockClear();
    mocks.replace.mockClear();
    mocks.setProjectFavorite.mockClear();
  });

  it("renders no access tablist or hidden shared panel", () => {
    render(
      <ProjectsPageClient
        projects={[
          createProjectItem("owned"),
          createProjectItem("project-member"),
        ]}
      />,
    );

    expect(
      screen.queryByRole("tablist", { name: "Project access tabs" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Shared" })).not.toBeInTheDocument();
    expect(document.getElementById("panel-shared-to-you")).toBeNull();
    expect(screen.getByLabelText("Projects")).toBeInTheDocument();
  });

  it("shows owned projects and excludes shared, estimate-only, and pending invite rows", () => {
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

    const liveProjects = screen.getByLabelText("Live projects");
    expect(within(liveProjects).getByText("Owned Residence")).toBeInTheDocument();
    expect(within(liveProjects).queryByText("Shared Clinic")).not.toBeInTheDocument();
    expect(within(liveProjects).queryByText("Shared Sheet Tower")).not.toBeInTheDocument();
    expect(within(liveProjects).queryByText("Pending Museum Wing")).not.toBeInTheDocument();
    expect(screen.queryByText("Shared project")).not.toBeInTheDocument();
    expect(screen.queryByText("Estimate-only")).not.toBeInTheDocument();
    expect(screen.queryByText("Pending invite")).not.toBeInTheDocument();
  });

  it("keeps search scoped to owned projects", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsPageClient
        projects={[
          createProjectItem("owned", {
            project: { name: "Owned Residence", client_name: "Lewis Family" },
          }),
          createProjectItem("project-member", {
            project: { name: "Shared Clinic", client_name: "Clinic Group" },
          }),
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Show projects search" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search projects" }), {
      target: { value: "clinic" },
    });

    expect(
      within(screen.getByLabelText("Live projects")).queryAllByRole("article"),
    ).toHaveLength(0);
    expect(screen.queryByText("Shared Clinic")).not.toBeInTheDocument();
    expect(screen.queryByText("No projects match your search")).not.toBeInTheDocument();
  });

  it("keeps owned bulk selection available without exposing shared selection controls", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsPageClient
        projects={[
          createProjectItem("owned"),
          createProjectItem("project-member"),
        ]}
      />,
    );

    await user.click(
      within(screen.getByLabelText("Owned Residence project, owned access")).getByRole(
        "checkbox",
        { name: "Select Owned Residence for deletion" },
      ),
    );

    expect(screen.getByRole("region", { name: "Bulk action toolbar" })).toHaveTextContent(
      "1 selected",
    );
    expect(
      screen.queryByRole("checkbox", { name: "Select Shared Clinic for deletion" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the normal shell when the server provides only non-owned rows", () => {
    render(
      <ProjectsPageClient
        projects={[
          createProjectItem("project-member"),
          createProjectItem("pending-invite"),
        ]}
      />,
    );

    expect(screen.getByLabelText("Live projects")).toBeInTheDocument();
    expect(within(screen.getByLabelText("Live projects")).queryAllByRole("article")).toHaveLength(0);
    expect(screen.queryByText("Shared Clinic")).not.toBeInTheDocument();
    expect(screen.queryByText("Pending Museum Wing")).not.toBeInTheDocument();
    expect(screen.queryByText("No live projects yet.")).not.toBeInTheDocument();
  });
});
