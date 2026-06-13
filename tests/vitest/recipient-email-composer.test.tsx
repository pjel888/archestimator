import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RecipientEmailComposer } from "@/components/workshop/publication/RecipientEmailComposer";

// AC-MOD-04 — confirmation before recipient removal (UI-only guard against
// irreversible decision loss via the cascade DELETE on shared_link_responses).
const publicationActions = vi.hoisted(() => ({
  addSharedLinkRecipients: vi.fn(),
  listSharedLinkRecipients: vi.fn(),
  readSharedLinkEmailDeliveryReadiness: vi.fn(),
  removeSharedLinkRecipient: vi.fn(),
  resendSharedLinkRecipientEmail: vi.fn(),
}));

vi.mock("@/lib/publication/actions", () => publicationActions);

const PUBLICATION_ID = "publication-1";

function renderComposer() {
  return render(<RecipientEmailComposer publicationId={PUBLICATION_ID} />);
}

describe("RecipientEmailComposer — recipient removal confirmation (AC-MOD-04)", () => {
  beforeEach(() => {
    publicationActions.addSharedLinkRecipients.mockReset();
    publicationActions.listSharedLinkRecipients.mockReset();
    publicationActions.readSharedLinkEmailDeliveryReadiness.mockReset();
    publicationActions.removeSharedLinkRecipient.mockReset();
    publicationActions.resendSharedLinkRecipientEmail.mockReset();

    publicationActions.readSharedLinkEmailDeliveryReadiness.mockResolvedValue({
      configured: true,
      message: "Email delivery is configured.",
    });
    publicationActions.removeSharedLinkRecipient.mockResolvedValue(undefined);
  });

  it("does NOT immediately remove a persisted recipient on ✕; it opens a confirm dialog", async () => {
    publicationActions.listSharedLinkRecipients.mockResolvedValue([
      { id: "recipient-1", email: "client@example.com", display_name: null, delivery_status: "sent" },
    ]);
    const user = userEvent.setup();
    renderComposer();

    const chipRemove = await screen.findByRole("button", { name: "Remove client@example.com" });
    await user.click(chipRemove);

    // No server call yet — only the confirm appears.
    expect(publicationActions.removeSharedLinkRecipient).not.toHaveBeenCalled();
    const confirmDialog = await screen.findByRole("dialog", { name: "Remove recipient?" });
    expect(confirmDialog).toBeInTheDocument();
    // Chip is still present until confirmed (the remove button only exists for a live chip).
    expect(screen.getByRole("button", { name: "Remove client@example.com" })).toBeInTheDocument();
  });

  it("confirming calls removeSharedLinkRecipient once and removes the chip", async () => {
    publicationActions.listSharedLinkRecipients.mockResolvedValue([
      { id: "recipient-1", email: "client@example.com", display_name: null, delivery_status: "sent" },
    ]);
    const user = userEvent.setup();
    renderComposer();

    await user.click(await screen.findByRole("button", { name: "Remove client@example.com" }));
    const confirmDialog = await screen.findByRole("dialog", { name: "Remove recipient?" });
    await user.click(within(confirmDialog).getByRole("button", { name: "Remove recipient" }));

    expect(publicationActions.removeSharedLinkRecipient).toHaveBeenCalledTimes(1);
    expect(publicationActions.removeSharedLinkRecipient).toHaveBeenCalledWith({
      publicationId: PUBLICATION_ID,
      recipientId: "recipient-1",
    });
    await waitFor(() => {
      expect(screen.queryByText("client@example.com")).not.toBeInTheDocument();
    });
  });

  it("cancelling does NOT call removeSharedLinkRecipient and keeps the chip", async () => {
    publicationActions.listSharedLinkRecipients.mockResolvedValue([
      { id: "recipient-1", email: "client@example.com", display_name: null, delivery_status: "sent" },
    ]);
    const user = userEvent.setup();
    renderComposer();

    await user.click(await screen.findByRole("button", { name: "Remove client@example.com" }));
    const confirmDialog = await screen.findByRole("dialog", { name: "Remove recipient?" });
    await user.click(within(confirmDialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Remove recipient?" })).not.toBeInTheDocument();
    });
    expect(publicationActions.removeSharedLinkRecipient).not.toHaveBeenCalled();
    expect(screen.getByText("client@example.com")).toBeInTheDocument();
  });

  it("warns that a recipient who has responded will lose their recorded decision", async () => {
    publicationActions.listSharedLinkRecipients.mockResolvedValue([
      { id: "recipient-2", email: "decided@example.com", display_name: null, delivery_status: "responded" },
    ]);
    const user = userEvent.setup();
    renderComposer();

    await user.click(await screen.findByRole("button", { name: "Remove decided@example.com" }));
    // A recipient with a recorded decision is a danger confirm → alertdialog role.
    const confirmDialog = await screen.findByRole("alertdialog", { name: "Remove recipient?" });

    expect(
      within(confirmDialog).getByText(/permanently delete their recorded decision/i),
    ).toBeInTheDocument();
  });

  it("removes a local-only chip immediately without any server call", async () => {
    publicationActions.listSharedLinkRecipients.mockResolvedValue([]);
    const user = userEvent.setup();
    renderComposer();

    const emailInput = await screen.findByPlaceholderText("name@company.com, another@...");
    await waitFor(() => expect(emailInput).not.toBeDisabled());
    await user.type(emailInput, "typed@example.com,");

    const chipRemove = await screen.findByRole("button", { name: "Remove typed@example.com" });
    await user.click(chipRemove);

    // No confirm dialog, no server call, chip gone.
    expect(screen.queryByRole("dialog", { name: "Remove recipient?" })).not.toBeInTheDocument();
    expect(publicationActions.removeSharedLinkRecipient).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText("typed@example.com")).not.toBeInTheDocument();
    });
  });
});
