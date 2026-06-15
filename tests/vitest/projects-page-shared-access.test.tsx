import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
} satisfies Tables<"projects">;

describe("ProjectsPageClient shared access", () => {
  beforeEach(() => {
    window.localStorage.clear();
    routerMock.refresh.mockClear();
  });

  it("renders owned, shared project, and estimate-only cards with text badges", async () => {
    const user = userEvent.setup();
    render(<ProjectsPageClient projects={PROJECTS} />);

    expect(screen.getByLabelText("Lewis Residence project, owned access")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /Projects shared to you/i }));

    expect(screen.getByLabelText("Shared Clinic Fit-Out project, shared project, viewer access")).toBeInTheDocument();
    expect(screen.getByLabelText("Shared Sheet Project project, estimate-only access, viewer access")).toBeInTheDocument();
    expect(screen.getByText("Shared project")).toBeInTheDocument();
    expect(screen.getByText("Estimate-only")).toBeInTheDocument();
    expect(screen.getByText("2 shared estimates")).toBeInTheDocument();
    expect(screen.getByText("Shared by Studio Partner")).toBeInTheDocument();
  });

  it("surfaces live shared-link status and open activity on owned project cards", () => {
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
    expect(within(card).getByText("Shared link")).toBeInTheDocument();
    expect(within(card).getByText("4 opens")).toBeInTheDocument();
  });

  it("does not show the empty sample state when only shared projects exist", () => {
    render(<ProjectsPageClient projects={[PROJECTS[1], PROJECTS[2]]} />);

    expect(screen.getByRole("tab", { name: /Projects shared to you/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Live projects")).toBeInTheDocument();
    expect(screen.queryByText("No live projects yet.")).not.toBeInTheDocument();
    expect(screen.getByText("Shared project")).toBeInTheDocument();
    expect(screen.getByText("Estimate-only")).toBeInTheDocument();
  });

  it("renders invitee pending-invite project cards with accept actions", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsPageClient
        projects={[
          ...PROJECTS,
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
          {
            project: {
              ...PENDING_INVITE_PROJECT,
              id: "99999999-9999-4999-8999-999999999999",
              name: "Expired Gallery Wing",
              project_code: "AE-EG-401",
            },
            accessKind: "pending-invite",
            currentUserRole: "viewer",
            ownerWorkspaceName: "Studio Partner",
            pendingInvite: {
              id: "invitation-expired",
              projectId: "99999999-9999-4999-8999-999999999999",
              estimateId: null,
              projectName: "Expired Gallery Wing",
              projectCode: "AE-EG-401",
              estimateName: null,
              role: "viewer",
              scope: "project",
              inviterLabel: "Studio Partner",
              state: "expired",
              expiresAt: "2026-06-01T00:00:00.000Z",
              lastOpenedAt: null,
            },
          },
        ]}
      />,
    );

    await user.click(screen.getByRole("tab", { name: /Projects shared to you/i }));

    const pendingCard = screen.getByLabelText("Pending Museum Wing project, pending invite, viewer access");
    expect(pendingCard).toHaveAttribute("data-project-access-kind", "pending-invite");
    expect(within(pendingCard).getAllByText("Pending invite")).toHaveLength(2);
    expect(within(pendingCard).getByText("Expires Jun 10")).toBeInTheDocument();
    expect(within(pendingCard).getByRole("button", { name: "Accept invite for Pending Museum Wing" })).toBeInTheDocument();

    const expiredCard = screen.getByLabelText("Expired Gallery Wing project, pending invite, viewer access");
    expect(within(expiredCard).getAllByText("Pending invite")).toHaveLength(2);
    expect(within(expiredCard).getByText("Expired Jun 1")).toBeInTheDocument();
    expect(within(expiredCard).getByRole("button", { name: "Expired" })).toBeDisabled();
    expect(within(expiredCard).queryByRole("button", { name: "Accept invite for Expired Gallery Wing" })).not.toBeInTheDocument();
  });

  it("search matches shared projects within the shared tab", async () => {
    const user = userEvent.setup();
    render(<ProjectsPageClient projects={PROJECTS} />);

    expect(screen.getByRole("tab", { name: /Your Projects/i })).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByRole("tab", { name: /Projects shared to you/i }));

    expect(screen.queryByText("Lewis Residence")).not.toBeInTheDocument();
    expect(screen.getByText("Shared Clinic Fit-Out")).toBeInTheDocument();
    expect(screen.getByText("Shared Sheet Project")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show projects search" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search projects" }), { target: { value: "clinic" } });

    expect(screen.getByText("Shared Clinic Fit-Out")).toBeInTheDocument();
    expect(screen.queryByText("Shared Sheet Project")).not.toBeInTheDocument();
  });

  it("all card density modes preserve shared badges", async () => {
    const user = userEvent.setup();
    render(<ProjectsPageClient projects={PROJECTS} />);

    await user.click(screen.getByRole("tab", { name: /Projects shared to you/i }));

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
