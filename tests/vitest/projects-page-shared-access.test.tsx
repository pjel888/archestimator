import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ProjectsPageClient,
  type ProjectListItem,
} from "./projects-page-test-harness";
import type { ProjectRow } from "@/lib/types/database";

const routerMock = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@/lib/workshop/actions", () => ({
  setProjectFavorite: vi.fn(async () => undefined),
}));

vi.mock("@/lib/projects/actions", () => ({
  updateProjectDetails: vi.fn(async () => undefined),
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
} satisfies ProjectRow;

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
} satisfies ProjectRow;

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
} satisfies ProjectRow;

const PENDING_INVITE_PROJECT = {
  id: "77777777-7777-4777-8777-777777777777",
  workspace_id: "88888888-8888-4888-8888-888888888888",
  name: "Pending Museum Wing",
  client_name: "Pending invite",
  location: null,
  project_code: "AE-PM-301",
  currency_code: "PHP",
  metadata: {},
  created_at: "2026-06-01T00:00:00.000Z",
  updated_at: "2026-06-01T00:00:00.000Z",
  created_by: null,
} satisfies ProjectRow;

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
  {
    project: PENDING_INVITE_PROJECT,
    accessKind: "pending-invite",
    currentUserRole: "viewer",
    ownerWorkspaceName: "Studio Partner",
    pendingInvite: {
      id: "invitation-1",
      projectId: PENDING_INVITE_PROJECT.id,
      estimateId: null,
      projectName: PENDING_INVITE_PROJECT.name,
      projectCode: PENDING_INVITE_PROJECT.project_code,
      estimateName: null,
      role: "viewer",
      scope: "project",
      inviterLabel: "Studio Partner",
      state: "pending",
      expiresAt: "2026-06-10T00:00:00.000Z",
      lastOpenedAt: "2026-06-01T00:00:00.000Z",
    },
  },
];

describe("ProjectsPageClient shared access exclusion", () => {
  beforeEach(() => {
    window.localStorage.clear();
    routerMock.refresh.mockClear();
  });

  it("keeps received shared project, estimate-only, and pending invite rows off Projects", () => {
    render(<ProjectsPageClient projects={PROJECTS} />);

    const liveProjects = screen.getByLabelText("Live projects");
    expect(within(liveProjects).getByText("Lewis Residence")).toBeInTheDocument();
    expect(within(liveProjects).queryByText("Shared Clinic Fit-Out")).not.toBeInTheDocument();
    expect(within(liveProjects).queryByText("Shared Sheet Project")).not.toBeInTheDocument();
    expect(within(liveProjects).queryByText("Pending Museum Wing")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Shared" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept invite for Pending Museum Wing" })).not.toBeInTheDocument();
  });

  it("surfaces owned live shared-link status and open actions on project cards", () => {
    render(
      <ProjectsPageClient
        projects={[
          {
            ...PROJECTS[0],
            publicationSummary: {
              status: "published",
              clientLinkPath: "/share/client-token",
              openCount: 4,
              latestOpenedAt: "2026-05-27T01:00:00.000Z",
              passwordRequired: true,
            },
          },
        ]}
      />,
    );

    const card = screen.getByLabelText("Lewis Residence project, owned access");
    expect(card.querySelector("[data-project-card-shared-link-indicator]")).toBeNull();
    expect(card.querySelector("[data-project-card-details-action]")).not.toBeNull();
  });

  it("renders the standard empty live-project shell when there are only received rows", () => {
    render(<ProjectsPageClient projects={PROJECTS.slice(1)} />);

    const liveProjects = screen.getByLabelText("Live projects");
    expect(within(liveProjects).queryAllByRole("article")).toHaveLength(0);
    expect(screen.queryByText("Shared Clinic Fit-Out")).not.toBeInTheDocument();
    expect(screen.queryByText("Shared Sheet Project")).not.toBeInTheDocument();
    expect(screen.queryByText("Pending Museum Wing")).not.toBeInTheDocument();
    expect(screen.queryByText("No live projects yet.")).not.toBeInTheDocument();
  });
});
