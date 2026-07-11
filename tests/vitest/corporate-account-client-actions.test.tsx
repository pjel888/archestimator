import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminAccountMembers } from "@/components/admin/AdminAccountMembers";
import { AdminAccountStatusControls } from "@/components/admin/AdminAccountStatusControls";
import { AdminAccountWorkspaces } from "@/components/admin/AdminAccountWorkspaces";
import { AdminCreateAccountForm } from "@/components/admin/AdminCreateAccountForm";

const routerMocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

const actionMocks = vi.hoisted(() => ({
  assignUserToCorporateAccountAction: vi.fn(),
  createCorporateAccountAction: vi.fn(),
  linkWorkspaceAction: vi.fn(),
  removeUserFromCorporateAccountAction: vi.fn(),
  unlinkWorkspaceAction: vi.fn(),
  updateCorporateAccountStatusAction: vi.fn(),
  updateMemberRoleAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}));
vi.mock("@/lib/admin/corporate-account-actions", () => actionMocks);

const ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const WORKSPACE_ID = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "confirm",
    vi.fn(() => true),
  );
  vi.stubGlobal("alert", vi.fn());
  actionMocks.createCorporateAccountAction.mockResolvedValue({
    ok: true,
    accountId: ACCOUNT_ID,
  });
  actionMocks.assignUserToCorporateAccountAction.mockResolvedValue({
    ok: true,
  });
  actionMocks.removeUserFromCorporateAccountAction.mockResolvedValue({
    ok: true,
  });
  actionMocks.updateMemberRoleAction.mockResolvedValue({ ok: true });
  actionMocks.linkWorkspaceAction.mockResolvedValue({ ok: true });
  actionMocks.unlinkWorkspaceAction.mockResolvedValue({ ok: true });
  actionMocks.updateCorporateAccountStatusAction.mockResolvedValue({
    ok: true,
  });
});

describe("corporate account client mutations", () => {
  it("creates an account and refreshes the list only after a successful action", async () => {
    render(<AdminCreateAccountForm />);

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Acme Construction" },
    });
    fireEvent.change(screen.getByLabelText("Description (optional)"), {
      target: { value: "Enterprise account" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(actionMocks.createCorporateAccountAction).toHaveBeenCalledWith({
        name: "Acme Construction",
        description: "Enterprise account",
      }),
    );
    expect(routerMocks.refresh).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText('Account "Acme Construction" created.'),
    ).toBeInTheDocument();
  });

  it("keeps the list unchanged when account creation fails", async () => {
    actionMocks.createCorporateAccountAction.mockResolvedValue({
      ok: false,
      error: "Name already exists.",
    });
    render(<AdminCreateAccountForm />);

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Acme Construction" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(screen.getByText("Name already exists.")).toBeInTheDocument(),
    );
    expect(routerMocks.refresh).not.toHaveBeenCalled();
  });

  it("refreshes members after direct assignment, role change, and removal", async () => {
    render(
      <AdminAccountMembers
        accountId={ACCOUNT_ID}
        members={[
          {
            user_id: USER_ID,
            email: "member@example.com",
            display_name: "Existing Member",
            avatar_url: null,
            role: "member",
            job_title: null,
            created_at: "2026-07-11T00:00:00.000Z",
          },
        ]}
        assignableUsers={[
          {
            id: "44444444-4444-4444-8444-444444444444",
            email: "new@example.com",
            display_name: "New Member",
            account_status: "active",
          },
        ]}
      />,
    );

    fireEvent.change(screen.getByLabelText("User"), {
      target: { value: "44444444-4444-4444-8444-444444444444" },
    });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Add member" }),
      ).not.toBeDisabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Add member" }));
    await waitFor(() =>
      expect(actionMocks.assignUserToCorporateAccountAction).toHaveBeenCalled(),
    );
    await waitFor(() => expect(routerMocks.refresh).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText("Role for member@example.com"), {
      target: { value: "viewer" },
    });
    await waitFor(() =>
      expect(actionMocks.updateMemberRoleAction).toHaveBeenCalledWith({
        accountId: ACCOUNT_ID,
        userId: USER_ID,
        role: "viewer",
      }),
    );
    await waitFor(() => expect(routerMocks.refresh).toHaveBeenCalledTimes(2));

    fireEvent.click(
      screen.getByRole("button", { name: "Remove member@example.com" }),
    );
    await waitFor(() =>
      expect(
        actionMocks.removeUserFromCorporateAccountAction,
      ).toHaveBeenCalledWith({
        accountId: ACCOUNT_ID,
        userId: USER_ID,
      }),
    );
    await waitFor(() => expect(routerMocks.refresh).toHaveBeenCalledTimes(3));
  });

  it("labels a cross-account move and refreshes after link and unlink", async () => {
    render(
      <AdminAccountWorkspaces
        accountId={ACCOUNT_ID}
        workspaces={[
          {
            id: WORKSPACE_ID,
            name: "Linked workspace",
            slug: "linked-workspace",
            created_by: "admin-1",
            created_at: "2026-07-11T00:00:00.000Z",
          },
        ]}
        linkableWorkspaces={[
          {
            id: "55555555-5555-4555-8555-555555555555",
            name: "Move candidate",
            slug: "move-candidate",
            created_by: "admin-1",
            created_at: "2026-07-11T00:00:00.000Z",
            corporate_account_id: "66666666-6666-4666-8666-666666666666",
            corporate_account_name: "Previous Account",
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("option", {
        name: "Move candidate - Move from Previous Account",
      }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Workspace"), {
      target: { value: "55555555-5555-4555-8555-555555555555" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Link workspace" }));
    await waitFor(() =>
      expect(actionMocks.linkWorkspaceAction).toHaveBeenCalledWith({
        workspaceId: "55555555-5555-4555-8555-555555555555",
        accountId: ACCOUNT_ID,
      }),
    );
    await waitFor(() => expect(routerMocks.refresh).toHaveBeenCalledTimes(1));

    fireEvent.click(
      screen.getByRole("button", { name: "Unlink Linked workspace" }),
    );
    await waitFor(() =>
      expect(actionMocks.unlinkWorkspaceAction).toHaveBeenCalledWith({
        workspaceId: WORKSPACE_ID,
      }),
    );
    await waitFor(() => expect(routerMocks.refresh).toHaveBeenCalledTimes(2));
  });

  it("requires confirmation before status changes and refreshes only after success", async () => {
    render(
      <AdminAccountStatusControls
        accountId={ACCOUNT_ID}
        status="active"
        accountName="Acme Construction"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Suspend" }));
    await waitFor(() =>
      expect(
        actionMocks.updateCorporateAccountStatusAction,
      ).toHaveBeenCalledWith({
        accountId: ACCOUNT_ID,
        status: "suspended",
      }),
    );
    expect(routerMocks.refresh).toHaveBeenCalledTimes(1);

    vi.mocked(window.confirm).mockReturnValue(false);
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(
      actionMocks.updateCorporateAccountStatusAction,
    ).toHaveBeenCalledTimes(1);
  });
});
