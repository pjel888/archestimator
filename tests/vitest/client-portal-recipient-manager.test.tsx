import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invite: vi.fn(),
  refresh: vi.fn(),
  resend: vi.fn(),
  revoke: vi.fn(),
  update: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/lib/client-portal/recipient-actions", () => ({
  inviteClientPortalRecipientAction: mocks.invite,
  resendClientPortalRecipientInvitationAction: mocks.resend,
  revokeClientPortalRecipientAction: mocks.revoke,
  updateClientPortalRecipientRoleAction: mocks.update,
}));

import { ClientPortalRecipientManager } from "@/components/workshop/publisher/ClientPortalRecipientManager";

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
});

describe("ClientPortalRecipientManager", () => {
  it("edits permission role, domain identity, and approval authority independently", async () => {
    mocks.update.mockResolvedValue(undefined);
    render(<ClientPortalRecipientManager
      portalId="portal_1"
      projectId="project_1"
      recipients={[{
        clientOrganization: "Northstar",
        deliveryState: "delivered",
        displayName: "Avery Client",
        domainRole: "quantity_surveyor",
        domainRoleLabel: "Commercial lead",
        isRequiredApprover: true,
        nextAction: "decision_pending",
        recipientId: "recipient_1",
        role: "approver",
        verificationState: "verified",
      }]}
    />);

    expect(screen.getAllByRole("option", { name: "requester" })).toHaveLength(2);
    fireEvent.change(screen.getByLabelText("Avery Client permission role"), { target: { value: "requester" } });
    fireEvent.click(screen.getByRole("button", { name: "Save access profile" }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({
      clientOrganization: "Northstar",
      domainRole: "quantity_surveyor",
      domainRoleLabel: "Commercial lead",
      isRequiredApprover: true,
      portalId: "portal_1",
      projectId: "project_1",
      recipientId: "recipient_1",
      roleTemplate: "requester",
    }));
  });
});
