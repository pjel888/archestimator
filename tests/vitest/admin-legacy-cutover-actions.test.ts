import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  admin: { email: "admin@example.com", userId: "admin_1" },
  audit: vi.fn(),
  cutover: vi.fn(),
  recover: vi.fn(),
  database: { prepare: vi.fn() },
  requireAdmin: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/admin/audit", () => ({ writeAdminAuditEvent: mocks.audit }));
vi.mock("@/lib/admin/require-admin", () => ({ requireAdminContext: mocks.requireAdmin }));
vi.mock("@/lib/cloudflare/d1", () => ({ getCloudflareD1Database: vi.fn(async () => mocks.database) }));
vi.mock("@/lib/client-portal/legacy-cutover-service", () => ({
  cutoverLegacyWorkspaceToClientPortals: mocks.cutover,
  LegacyWorkspaceCutoverError: class LegacyWorkspaceCutoverError extends Error {},
  recoverLegacyWorkspaceCutoverBarrier: mocks.recover,
}));

import {
  recoverLegacyWorkspaceCutoverAction,
  runLegacyWorkspaceCutoverAction,
} from "@/lib/admin/legacy-cutover-actions";

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
  mocks.audit.mockReset().mockResolvedValue({ data: {}, error: null });
  mocks.cutover.mockReset().mockResolvedValue(report);
  mocks.recover.mockReset().mockResolvedValue({
    action: "takeover",
    barrierAfter: { frozenAt: "2026-07-28T00:00:00.000Z", mode: "pending", ownerUserId: "admin_1" },
    barrierBefore: { frozenAt: "2026-07-28T00:00:00.000Z", mode: "pending", ownerUserId: "admin_2" },
    recoveredAt: "2026-07-28T01:00:00.000Z",
    workspaceId: "workspace_1",
  });
  mocks.requireAdmin.mockReset().mockResolvedValue(mocks.admin);
  mocks.revalidatePath.mockReset();
});

describe("legacy workspace cutover admin action", () => {
  it("authenticates before validating operator input", async () => {
    await expect(runLegacyWorkspaceCutoverAction({ workspaceId: "" })).resolves.toMatchObject({ ok: false, error: "validation" });
    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
    expect(mocks.cutover).not.toHaveBeenCalled();
  });

  it("requires the exact workspace-scoped confirmation before apply", async () => {
    await expect(runLegacyWorkspaceCutoverAction({ apply: true, confirmation: "CUTOVER workspace_2", workspaceId: "workspace_1" }))
      .resolves.toMatchObject({ ok: false, error: "confirmation" });
    expect(mocks.cutover).not.toHaveBeenCalled();
  });

  it("requires an exact dry-check fingerprint before apply", async () => {
    await expect(runLegacyWorkspaceCutoverAction({
      apply: true,
      confirmation: "CUTOVER workspace_1",
      workspaceId: "workspace_1",
    })).resolves.toMatchObject({ ok: false, error: "preflight" });
    expect(mocks.cutover).not.toHaveBeenCalled();
  });

  it("runs an audited dry check without enabling apply", async () => {
    await expect(runLegacyWorkspaceCutoverAction({ workspaceId: "workspace_1" })).resolves.toEqual({ ok: true, report });
    expect(mocks.cutover).toHaveBeenCalledWith({
      apply: false,
      database: mocks.database,
      expectedFingerprint: undefined,
      operator: undefined,
      workspaceId: "workspace_1",
    });
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({
      action: "client_portal.legacy_workspace_cutover_inspected",
      targetId: "workspace_1",
    }));
  });

  it("fails closed when the dry-check audit cannot be recorded", async () => {
    mocks.audit.mockResolvedValue({ data: null, error: "Admin audit event could not be written." });

    await expect(runLegacyWorkspaceCutoverAction({ workspaceId: "workspace_1" }))
      .resolves.toMatchObject({ ok: false, error: "audit" });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("applies only after exact confirmation and records the operator event", async () => {
    const applied = { ...report, cutoverAt: "2026-07-28T01:00:00.000Z", dryRun: false, freezeEnabled: true, status: "cutover_complete" as const };
    mocks.cutover.mockResolvedValue(applied);

    await expect(runLegacyWorkspaceCutoverAction({
      apply: true,
      confirmation: "CUTOVER workspace_1",
      expectedFingerprint: report.inventory.fingerprint,
      workspaceId: "workspace_1",
    })).resolves.toEqual({ ok: true, report: applied });
    expect(mocks.cutover).toHaveBeenCalledWith({
      apply: true,
      database: mocks.database,
      expectedFingerprint: report.inventory.fingerprint,
      operator: mocks.admin,
      workspaceId: "workspace_1",
    });
    expect(mocks.audit).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/data-quality");
  });

  it("requires exact recovery confirmation and forwards the attributed operator", async () => {
    await expect(recoverLegacyWorkspaceCutoverAction({
      action: "delete" as "release",
      confirmation: "RELEASE workspace_1",
      expectedFingerprint: report.inventory.fingerprint,
      workspaceId: "workspace_1",
    })).resolves.toMatchObject({ ok: false, error: "validation" });
    expect(mocks.recover).not.toHaveBeenCalled();

    await expect(recoverLegacyWorkspaceCutoverAction({
      action: "takeover",
      confirmation: "RELEASE workspace_1",
      expectedFingerprint: report.inventory.fingerprint,
      workspaceId: "workspace_1",
    })).resolves.toMatchObject({ ok: false, error: "confirmation" });
    expect(mocks.recover).not.toHaveBeenCalled();

    await expect(recoverLegacyWorkspaceCutoverAction({
      action: "takeover",
      confirmation: "TAKEOVER workspace_1",
      expectedFingerprint: report.inventory.fingerprint,
      workspaceId: "workspace_1",
    })).resolves.toMatchObject({ ok: true });
    expect(mocks.recover).toHaveBeenCalledWith({
      action: "takeover",
      database: mocks.database,
      expectedFingerprint: report.inventory.fingerprint,
      operator: mocks.admin,
      workspaceId: "workspace_1",
    });
  });
});
