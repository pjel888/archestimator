import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectsPageClient } from "./projects-page-test-harness";
import type { Tables } from "@/lib/supabase/types";

const routerMock = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));

const actionMocks = vi.hoisted(() => ({
  createProjectRecord: vi.fn(),
  updateProjectImageMetadata: vi.fn(async () => undefined),
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

const estimateMocks = vi.hoisted(() => ({
  createEstimateSheetDraft: vi.fn(),
}));

const locationMocks = vi.hoisted(() => ({
  saveProjectLocation: vi.fn(),
}));

vi.mock("@/hooks/use-navigation-router", () => ({
  useNavigationRouter: () => routerMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@/lib/projects/actions", () => ({
  createProjectRecord: actionMocks.createProjectRecord,
  updateProjectImageMetadata: actionMocks.updateProjectImageMetadata,
  updateProjectDetails: vi.fn(async () => undefined),
  previewBulkDeleteProjects: actionMocks.previewBulkDeleteProjects,
  executeBulkDeleteProjects: actionMocks.executeBulkDeleteProjects,
}));

vi.mock("@/lib/estimates/actions", () => ({
  createEstimateSheetDraft: estimateMocks.createEstimateSheetDraft,
}));

vi.mock("@/lib/projects/location-actions", () => ({
  saveProjectLocation: locationMocks.saveProjectLocation,
}));

vi.mock("@/lib/workshop/actions", () => ({
  setProjectFavorite: vi.fn(async () => undefined),
}));

vi.mock("@/lib/collaboration/pending-invite-actions", () => ({
  acceptPendingInvitationById: vi.fn(async () => undefined),
}));

const CREATED_PROJECT = {
  id: "99999999-8888-4777-8666-555555555555",
  workspace_id: "22222222-2222-4222-8222-222222222222",
  name: "Instant Tower",
  client_name: "Fast Client",
  location: "Manila",
  project_code: "AE-FAST-001",
  currency_code: "PHP",
  metadata: {},
  created_at: "2026-06-23T00:00:00.000Z",
  updated_at: "2026-06-23T00:00:00.000Z",
  created_by: "user-test",
} satisfies Tables<"projects">;

async function submitNewProject() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Add projects" }));
  const projectName = await screen.findByRole("textbox", { name: "Project name" });
  await user.type(projectName, CREATED_PROJECT.name);
  await user.type(screen.getByRole("combobox", { name: "Client" }), CREATED_PROJECT.client_name ?? "");
  await user.type(screen.getByRole("textbox", { name: "Location" }), CREATED_PROJECT.location ?? "");
  await user.click(screen.getByRole("button", { name: "Create project" }));
}

describe("ProjectsPageClient optimistic project creation", () => {
  beforeEach(() => {
    window.localStorage.clear();
    routerMock.refresh.mockClear();
    routerMock.push.mockClear();
    routerMock.replace.mockClear();
    actionMocks.createProjectRecord.mockReset();
    actionMocks.updateProjectImageMetadata.mockClear();
    estimateMocks.createEstimateSheetDraft.mockReset();
    locationMocks.saveProjectLocation.mockReset();
    locationMocks.saveProjectLocation.mockResolvedValue({ status: "success", message: "Project pin saved." });
  });

  it("shows a pending project card immediately while the primary create request is still in flight", async () => {
    let resolveCreate!: (project: Tables<"projects">) => void;
    actionMocks.createProjectRecord.mockReturnValue(
      new Promise<Tables<"projects">>((resolve) => {
        resolveCreate = resolve;
      }),
    );
    estimateMocks.createEstimateSheetDraft.mockReturnValue(new Promise(() => {}));

    render(<ProjectsPageClient projects={[]} />);
    await submitNewProject();

    const pendingCard = await screen.findByLabelText("Instant Tower project, owned access");
    expect(pendingCard).toHaveAttribute("aria-busy", "true");
    expect(within(pendingCard).getByRole("status")).toHaveTextContent("Creating project...");
    expect(screen.queryByRole("dialog", { name: /create project/i })).not.toBeInTheDocument();
    expect(estimateMocks.createEstimateSheetDraft).not.toHaveBeenCalled();

    resolveCreate(CREATED_PROJECT);

    await waitFor(() => {
      expect(estimateMocks.createEstimateSheetDraft).toHaveBeenCalledWith(CREATED_PROJECT.id);
    });
    const createdCard = screen.getByLabelText("Instant Tower project, owned access");
    expect(createdCard).toHaveAttribute("aria-busy", "true");
    expect(within(createdCard).getByRole("status")).toHaveTextContent("Creating default estimate...");
    expect(routerMock.refresh).not.toHaveBeenCalled();
  });

  it("keeps the created project visible with an error overlay when secondary setup fails", async () => {
    actionMocks.createProjectRecord.mockResolvedValue(CREATED_PROJECT);
    estimateMocks.createEstimateSheetDraft.mockRejectedValue(new Error("Draft failed"));

    const { rerender } = render(<ProjectsPageClient projects={[]} />);
    await submitNewProject();

    const card = await screen.findByLabelText("Instant Tower project, owned access");
    await waitFor(() => {
      expect(within(card).getByRole("alert")).toHaveTextContent("Project was created, but setup needs attention.");
    });
    expect(card).not.toHaveAttribute("aria-busy", "true");
    expect(screen.getByLabelText("Instant Tower project, owned access")).toBeInTheDocument();
    expect(routerMock.refresh).toHaveBeenCalledTimes(1);

    rerender(<ProjectsPageClient projects={[CREATED_PROJECT]} />);

    await waitFor(() => {
      expect(screen.getAllByLabelText("Instant Tower project, owned access")).toHaveLength(1);
    });
    const serverCard = screen.getByLabelText("Instant Tower project, owned access");
    expect(serverCard).not.toHaveAttribute("data-project-card-setup-state");
    expect(within(serverCard).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("removes the pending card when the primary project insert fails", async () => {
    let rejectCreate!: (error: Error) => void;
    actionMocks.createProjectRecord.mockReturnValue(
      new Promise<Tables<"projects">>((_resolve, reject) => {
        rejectCreate = reject;
      }),
    );

    render(<ProjectsPageClient projects={[]} />);
    await submitNewProject();

    const pendingCard = await screen.findByLabelText("Instant Tower project, owned access");
    expect(pendingCard).toHaveAttribute("aria-busy", "true");
    expect(within(pendingCard).getByRole("status")).toHaveTextContent("Creating project...");

    rejectCreate(new Error("Project insert failed"));

    await waitFor(() => {
      expect(screen.queryByLabelText("Instant Tower project, owned access")).not.toBeInTheDocument();
    });
    expect(estimateMocks.createEstimateSheetDraft).not.toHaveBeenCalled();
    expect(routerMock.refresh).not.toHaveBeenCalled();
  });

  it("reconciles the pending card only after refreshed server projects include the created project", async () => {
    actionMocks.createProjectRecord.mockResolvedValue(CREATED_PROJECT);
    estimateMocks.createEstimateSheetDraft.mockResolvedValue({
      estimateId: "estimate-1",
      sheetCode: "ES-001",
      row: {},
    });

    const { rerender } = render(<ProjectsPageClient projects={[]} />);
    await submitNewProject();

    await waitFor(() => expect(routerMock.refresh).toHaveBeenCalledTimes(1));
    expect(within(screen.getByLabelText("Instant Tower project, owned access")).getByRole("status")).toHaveTextContent("Syncing project...");

    rerender(<ProjectsPageClient projects={[CREATED_PROJECT]} />);

    await waitFor(() => {
      expect(screen.getAllByLabelText("Instant Tower project, owned access")).toHaveLength(1);
    });
    const reconciledCard = screen.getByLabelText("Instant Tower project, owned access");
    expect(reconciledCard).not.toHaveAttribute("aria-busy", "true");
    expect(within(reconciledCard).queryByRole("status")).not.toBeInTheDocument();
  });
});
