import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  requireAdminContext: vi.fn(),
}));

const repositoryMocks = vi.hoisted(() => ({
  addCorporateAccountMember: vi.fn(),
  createCorporateAccount: vi.fn(),
  isValidRole: vi.fn(),
  linkWorkspaceToCorporateAccountWithAudit: vi.fn(),
  removeCorporateAccountMember: vi.fn(),
  unlinkWorkspaceFromCorporateAccount: vi.fn(),
  updateCorporateAccountMemberRole: vi.fn(),
  updateCorporateAccountStatus: vi.fn(),
}));

const auditMocks = vi.hoisted(() => ({
  writeAdminAuditEvent: vi.fn(),
}));

const cacheMocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => cacheMocks);
vi.mock("@/lib/admin/audit", () => auditMocks);
vi.mock("@/lib/admin/require-admin", () => authMocks);
vi.mock("@/lib/admin/corporate-account-repository", () => repositoryMocks);

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const WORKSPACE_ID = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  authMocks.requireAdminContext.mockResolvedValue({
    userId: "admin-1",
    email: "admin@example.com",
  });
  auditMocks.writeAdminAuditEvent.mockResolvedValue({ data: null, error: null });
  repositoryMocks.createCorporateAccount.mockResolvedValue({ data: { id: ACCOUNT_ID }, error: null });
  repositoryMocks.addCorporateAccountMember.mockResolvedValue({ data: { ok: true }, error: null });
  repositoryMocks.removeCorporateAccountMember.mockResolvedValue({ data: { ok: true }, error: null });
  repositoryMocks.updateCorporateAccountMemberRole.mockResolvedValue({ data: { ok: true }, error: null });
  repositoryMocks.linkWorkspaceToCorporateAccountWithAudit.mockResolvedValue({ data: { ok: true }, error: null });
  repositoryMocks.unlinkWorkspaceFromCorporateAccount.mockResolvedValue({ data: { ok: true }, error: null });
  repositoryMocks.updateCorporateAccountStatus.mockResolvedValue({ data: { ok: true }, error: null });
  repositoryMocks.isValidRole.mockImplementation((role: string) => ["owner", "team_leader", "member", "viewer"].includes(role));
});

describe("corporate account actions", () => {
  it("authenticates, normalizes account creation, and records its audit event", async () => {
    const { createCorporateAccountAction } = await import("@/lib/admin/corporate-account-actions");

    await expect(createCorporateAccountAction({ name: "  Acme Construction  ", description: "Enterprise" })).resolves.toEqual({
      ok: true,
      accountId: ACCOUNT_ID,
    });

    expect(repositoryMocks.createCorporateAccount).toHaveBeenCalledWith({
      name: "Acme Construction",
      description: "Enterprise",
      createdBy: "admin-1",
    });
    expect(auditMocks.writeAdminAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: "admin-1",
      action: "corporate_account.created",
      targetId: ACCOUNT_ID,
      summary: { name: "Acme Construction" },
    }));
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/admin/accounts");
  });

  it("rejects invalid identifiers and roles without mutating, auditing, or revalidating", async () => {
    const { assignUserToCorporateAccountAction, updateCorporateAccountStatusAction } = await import(
      "@/lib/admin/corporate-account-actions"
    );

    await expect(assignUserToCorporateAccountAction({ accountId: "not-a-uuid", userId: USER_ID, role: "owner" })).resolves.toEqual({
      ok: false,
      error: "Invalid ID.",
    });
    await expect(assignUserToCorporateAccountAction({ accountId: ACCOUNT_ID, userId: USER_ID, role: "invalid" })).resolves.toEqual({
      ok: false,
      error: "Invalid role.",
    });
    await expect(updateCorporateAccountStatusAction({ accountId: ACCOUNT_ID, status: "deleted" })).resolves.toEqual({
      ok: false,
      error: "Invalid status.",
    });

    expect(repositoryMocks.addCorporateAccountMember).not.toHaveBeenCalled();
    expect(repositoryMocks.updateCorporateAccountStatus).not.toHaveBeenCalled();
    expect(auditMocks.writeAdminAuditEvent).not.toHaveBeenCalled();
    expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("audits successful member and status mutations with their exact target state", async () => {
    const { assignUserToCorporateAccountAction, updateCorporateAccountStatusAction } = await import(
      "@/lib/admin/corporate-account-actions"
    );

    await expect(assignUserToCorporateAccountAction({ accountId: ACCOUNT_ID, userId: USER_ID, role: "team_leader" })).resolves.toEqual({ ok: true });
    await expect(updateCorporateAccountStatusAction({ accountId: ACCOUNT_ID, status: "suspended" })).resolves.toEqual({ ok: true });

    expect(auditMocks.writeAdminAuditEvent).toHaveBeenNthCalledWith(1, expect.objectContaining({
      action: "corporate_account.member_assigned",
      targetId: ACCOUNT_ID,
      summary: { userId: USER_ID, role: "team_leader" },
    }));
    expect(auditMocks.writeAdminAuditEvent).toHaveBeenNthCalledWith(2, expect.objectContaining({
      action: "corporate_account.status_updated",
      targetId: ACCOUNT_ID,
      summary: { status: "suspended" },
    }));
    expect(cacheMocks.revalidatePath).toHaveBeenCalledTimes(2);
  });

  it("delegates workspace linking to the repository's atomic audit mutation without a duplicate audit", async () => {
    const { linkWorkspaceAction } = await import("@/lib/admin/corporate-account-actions");

    await expect(linkWorkspaceAction({ workspaceId: WORKSPACE_ID, accountId: ACCOUNT_ID })).resolves.toEqual({ ok: true });

    expect(repositoryMocks.linkWorkspaceToCorporateAccountWithAudit).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      accountId: ACCOUNT_ID,
      actorUserId: "admin-1",
      actorEmail: "admin@example.com",
    });
    expect(auditMocks.writeAdminAuditEvent).not.toHaveBeenCalled();
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/admin/accounts");
  });

  it("does not audit or revalidate when a repository mutation fails", async () => {
    repositoryMocks.removeCorporateAccountMember.mockResolvedValue({ data: { ok: false }, error: "Cannot remove final owner." });
    const { removeUserFromCorporateAccountAction } = await import("@/lib/admin/corporate-account-actions");

    await expect(removeUserFromCorporateAccountAction({ accountId: ACCOUNT_ID, userId: USER_ID })).resolves.toEqual({
      ok: false,
      error: "Cannot remove final owner.",
    });

    expect(auditMocks.writeAdminAuditEvent).not.toHaveBeenCalled();
    expect(cacheMocks.revalidatePath).not.toHaveBeenCalled();
  });
});
