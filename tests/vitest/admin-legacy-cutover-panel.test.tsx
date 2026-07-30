import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  recover: vi.fn(),
  run: vi.fn(),
}));

vi.mock("@/lib/admin/legacy-cutover-actions", () => ({
  recoverLegacyWorkspaceCutoverAction: mocks.recover,
  runLegacyWorkspaceCutoverAction: mocks.run,
}));

import { AdminLegacyCutoverPanel } from "@/components/admin/AdminLegacyCutoverPanel";

const report = {
  barrier: { frozenAt: null, mode: "none" as const, ownerUserId: null },
  cutoverAt: null,
  dryRun: true,
  freezeEnabled: false,
  inventory: {
    capturedAt: "2026-07-28T00:00:00.000Z",
    comments: 2,
    events: 3,
    fingerprint: "a".repeat(64),
    hosted: false,
    inconsistentMappings: 0,
    legacyPublications: 1,
    mappingStatuses: {},
    missingEncryptedTokens: 0,
    modernPortals: 0,
    projects: 1,
    projectsWithBothSystems: 0,
    publicationStatuses: { published: 1 },
    recipients: 1,
    responses: 1,
    workspaceId: "workspace_1",
  },
  migrated: 0,
  skipped: 1,
  status: "planned" as const,
  unresolved: [],
};

beforeEach(() => {
  mocks.recover.mockReset();
  mocks.run.mockReset().mockResolvedValue({ ok: true, report });
});

describe("AdminLegacyCutoverPanel", () => {
  it("keeps apply disabled until a clean dry check and exact confirmation", async () => {
    render(<AdminLegacyCutoverPanel />);
    const applyButton = screen.getByRole("button", { name: "Apply cutover" });
    expect(applyButton).toBeDisabled();

    fireEvent.change(screen.getByRole("textbox", { name: "Workspace ID" }), { target: { value: "workspace_1" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Apply confirmation" }), { target: { value: "CUTOVER workspace_1" } });
    expect(applyButton).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Run dry check" }));
    await screen.findByText("Dry run ready");
    expect(applyButton).toBeEnabled();

    fireEvent.click(applyButton);
    expect(mocks.run).toHaveBeenLastCalledWith({
      apply: true,
      confirmation: "CUTOVER workspace_1",
      expectedFingerprint: report.inventory.fingerprint,
      workspaceId: "workspace_1",
    });
  });

  it("renders the artifact-ready result returned by a dry check", async () => {
    render(<AdminLegacyCutoverPanel />);
    fireEvent.change(screen.getByRole("textbox", { name: "Workspace ID" }), { target: { value: "workspace_1" } });
    fireEvent.click(screen.getByRole("button", { name: "Run dry check" }));

    expect(await screen.findByText("Dry run ready")).toBeInTheDocument();
    expect(screen.getByText("No changes")).toBeInTheDocument();
    expect(screen.getByText("Artifact-ready JSON")).toBeInTheDocument();
    expect(mocks.run).toHaveBeenCalledWith({ apply: false, confirmation: "", workspaceId: "workspace_1" });
  });

  it("offers exact-confirmation recovery controls for a pending barrier", async () => {
    const pendingReport = {
      ...report,
      barrier: { frozenAt: "2026-07-28T00:00:00.000Z", mode: "pending" as const, ownerUserId: "admin_2" },
      freezeEnabled: true,
    };
    mocks.run.mockResolvedValue({ ok: true, report: pendingReport });
    mocks.recover.mockResolvedValue({ ok: true, report: { action: "takeover" } });
    render(<AdminLegacyCutoverPanel />);
    fireEvent.change(screen.getByRole("textbox", { name: "Workspace ID" }), { target: { value: "workspace_1" } });
    fireEvent.click(screen.getByRole("button", { name: "Run dry check" }));

    const takeover = await screen.findByRole("button", { name: "Take over safely" });
    expect(takeover).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "Pending-barrier recovery confirmation" }), {
      target: { value: "TAKEOVER workspace_1" },
    });
    expect(takeover).toBeEnabled();
    fireEvent.click(takeover);
    expect(mocks.recover).toHaveBeenCalledWith({
      action: "takeover",
      confirmation: "TAKEOVER workspace_1",
      expectedFingerprint: report.inventory.fingerprint,
      workspaceId: "workspace_1",
    });
  });
});
