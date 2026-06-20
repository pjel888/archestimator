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

// AC-MOD-13 — Backspace/Clear must not drop persisted chips; resend of an engaged recipient confirms.
describe("RecipientEmailComposer — interaction guards (AC-MOD-13)", () => {
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
    publicationActions.resendSharedLinkRecipientEmail.mockResolvedValue({ ok: true, message: "Resent." });
  });

  // MOD-RECIP-BACKSPACE-01 — Backspace-on-empty removes a local-only chip but never a persisted one.
  it("Backspace-on-empty removes a local-only chip but leaves the persisted recipient", async () => {
    publicationActions.listSharedLinkRecipients.mockResolvedValue([
      { id: "recipient-1", email: "persisted@example.com", display_name: null, delivery_status: "sent" },
    ]);
    const user = userEvent.setup();
    renderComposer();

    const emailInput = await screen.findByPlaceholderText("name@company.com, another@...");
    await waitFor(() => expect(emailInput).not.toBeDisabled());
    // Persisted chip is present; add a local-only chip on top of it.
    expect(await screen.findByText("persisted@example.com")).toBeInTheDocument();
    await user.type(emailInput, "typed@example.com,");
    expect(await screen.findByText("typed@example.com")).toBeInTheDocument();

    // Backspace on empty input removes the last (local-only) chip.
    await user.type(emailInput, "{Backspace}");
    await waitFor(() => expect(screen.queryByText("typed@example.com")).not.toBeInTheDocument());
    // The persisted chip remains — Backspace landing on it must NOT drop it.
    await user.type(emailInput, "{Backspace}");
    expect(screen.getByText("persisted@example.com")).toBeInTheDocument();
    expect(publicationActions.removeSharedLinkRecipient).not.toHaveBeenCalled();
  });

  // MOD-ACT-05 — "Clear" discards local-only chips only, keeping persisted recipients in view.
  it("Clear discards local-only chips but keeps persisted recipients", async () => {
    publicationActions.listSharedLinkRecipients.mockResolvedValue([
      { id: "recipient-1", email: "persisted@example.com", display_name: null, delivery_status: "sent" },
    ]);
    const user = userEvent.setup();
    renderComposer();

    const emailInput = await screen.findByPlaceholderText("name@company.com, another@...");
    await waitFor(() => expect(emailInput).not.toBeDisabled());
    expect(await screen.findByText("persisted@example.com")).toBeInTheDocument();
    await user.type(emailInput, "typed@example.com,");
    expect(await screen.findByText("typed@example.com")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Clear" }));

    // Local-only chip cleared; persisted chip stays; no server removal.
    await waitFor(() => expect(screen.queryByText("typed@example.com")).not.toBeInTheDocument());
    expect(screen.getByText("persisted@example.com")).toBeInTheDocument();
    expect(publicationActions.removeSharedLinkRecipient).not.toHaveBeenCalled();
  });

  it("disables Clear when only persisted recipients remain", async () => {
    publicationActions.listSharedLinkRecipients.mockResolvedValue([
      { id: "recipient-1", email: "persisted@example.com", display_name: null, delivery_status: "sent" },
    ]);
    renderComposer();

    expect(await screen.findByText("persisted@example.com")).toBeInTheDocument();
    // No local-only chips → Clear has nothing to discard → disabled.
    expect(screen.getByRole("button", { name: "Clear" })).toBeDisabled();
  });

  // MOD-REC-06 — resending a pending recipient fires immediately; an opened recipient confirms first.
  it("resends a pending recipient directly without a confirm", async () => {
    publicationActions.listSharedLinkRecipients.mockResolvedValue([
      { id: "recipient-1", email: "pending@example.com", display_name: null, delivery_status: "pending" },
    ]);
    const user = userEvent.setup();
    renderComposer();

    await user.click(await screen.findByRole("button", { name: "Resend pending@example.com" }));

    expect(screen.queryByRole("dialog", { name: "Resend a new link?" })).not.toBeInTheDocument();
    await waitFor(() =>
      expect(publicationActions.resendSharedLinkRecipientEmail).toHaveBeenCalledWith({
        publicationId: PUBLICATION_ID,
        recipientId: "recipient-1",
        baseClientLink: undefined,
      }),
    );
  });

  it("requires a confirm before resending an opened recipient (token rotation guard)", async () => {
    publicationActions.listSharedLinkRecipients.mockResolvedValue([
      { id: "recipient-2", email: "opened@example.com", display_name: null, delivery_status: "opened" },
    ]);
    const user = userEvent.setup();
    renderComposer();

    await user.click(await screen.findByRole("button", { name: "Resend opened@example.com" }));

    // No resend yet — the confirm gates it.
    expect(publicationActions.resendSharedLinkRecipientEmail).not.toHaveBeenCalled();
    const confirmDialog = await screen.findByRole("dialog", { name: "Resend a new link?" });
    expect(within(confirmDialog).getByText(/replaces their current link/i)).toBeInTheDocument();
    await user.click(within(confirmDialog).getByRole("button", { name: "Resend new link" }));

    await waitFor(() =>
      expect(publicationActions.resendSharedLinkRecipientEmail).toHaveBeenCalledWith({
        publicationId: PUBLICATION_ID,
        recipientId: "recipient-2",
        baseClientLink: undefined,
      }),
    );
  });

  it("cancelling the resend confirm does not resend a responded recipient", async () => {
    publicationActions.listSharedLinkRecipients.mockResolvedValue([
      { id: "recipient-3", email: "responded@example.com", display_name: null, delivery_status: "responded" },
    ]);
    const user = userEvent.setup();
    renderComposer();

    await user.click(await screen.findByRole("button", { name: "Resend responded@example.com" }));
    const confirmDialog = await screen.findByRole("dialog", { name: "Resend a new link?" });
    await user.click(within(confirmDialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Resend a new link?" })).not.toBeInTheDocument(),
    );
    expect(publicationActions.resendSharedLinkRecipientEmail).not.toHaveBeenCalled();
  });
});

// AC-MOD-17 (MOD-ACT-04 + MOD-REC-05) — after a send the merge must:
//   1) render a duplicate result NEUTRALLY (never the green "sent" chip), and
//   2) adopt the inserted id on a fresh success so the just-added chip's Resend/Remove
//      controls (which require an id) appear immediately, without a modal remount.
describe("RecipientEmailComposer — recipient-result merge (AC-MOD-17)", () => {
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
    publicationActions.listSharedLinkRecipients.mockResolvedValue([]);
  });

  async function typeAndSend(user: ReturnType<typeof userEvent.setup>, email: string) {
    const emailInput = await screen.findByPlaceholderText("name@company.com, another@...");
    await waitFor(() => expect(emailInput).not.toBeDisabled());
    await user.type(emailInput, `${email},`);
    expect(await screen.findByText(email)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Send to 1 recipient/ }));
  }

  it("renders a duplicate result as a neutral chip, not a green 'sent' chip", async () => {
    publicationActions.addSharedLinkRecipients.mockResolvedValue({
      ok: true,
      message: "No new recipients added (duplicates or invalid).",
      added: 0,
      failedEmails: [],
      emailResults: [{ email: "dupe@example.com", ok: true, status: "duplicate" }],
    });
    const user = userEvent.setup();
    renderComposer();

    await typeAndSend(user, "dupe@example.com");

    // The duplicate status renders with the neutral treatment and the "already invited" label.
    const badge = await screen.findByText("already invited");
    expect(badge).toHaveClass("bg-surfaceMuted", "text-tertiary");
    // It must NOT pick up the green success styling.
    expect(badge).not.toHaveClass("bg-successSoft");
    expect(badge).not.toHaveClass("text-success");
    // And there is no green "sent" badge for this email.
    expect(screen.queryByText(/^sent$/)).not.toBeInTheDocument();
  });

  it("adopts the inserted id on a fresh success so Resend/Remove are immediately available", async () => {
    publicationActions.addSharedLinkRecipients.mockResolvedValue({
      ok: true,
      message: "Added 1 recipient(s).",
      added: 1,
      failedEmails: [],
      emailResults: [{ email: "new@example.com", ok: true, id: "recipient-new", status: "sent" }],
    });
    const user = userEvent.setup();
    renderComposer();

    await typeAndSend(user, "new@example.com");

    // The chip is now a "sent" success chip...
    const badge = await screen.findByText("sent");
    expect(badge).toHaveClass("bg-successSoft", "text-success");
    // ...and because the id was adopted, the per-chip Resend/Remove controls appear (they only
    // render for a chip with an id) — so the just-added chip is actionable without a remount.
    expect(await screen.findByRole("button", { name: "Resend new@example.com" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove new@example.com" })).toBeInTheDocument();
  });

  it("reports failed recipient sends as error-toned alerts", async () => {
    const onMessage = vi.fn();
    publicationActions.addSharedLinkRecipients.mockRejectedValue(new Error("Email provider unavailable."));
    const user = userEvent.setup();

    render(<RecipientEmailComposer publicationId={PUBLICATION_ID} onMessage={onMessage} />);
    await typeAndSend(user, "new@example.com");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Email provider unavailable.");
    expect(alert).toHaveClass("bg-dangerSoft", "text-danger");
    await waitFor(() => {
      expect(onMessage).toHaveBeenCalledWith({
        text: "Email provider unavailable.",
        tone: "error",
      });
    });
  });
});
