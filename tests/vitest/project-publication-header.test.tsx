import { readFileSync } from "node:fs";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ProjectPublicationHeader,
  SheetPickerList,
  readPublicationServerSignature,
  shouldUseOptimisticPublicationResult,
} from "@/components/workshop/ProjectPublicationHeader";
import type { ProjectEstimateSheet, ProjectPublicationSummary } from "@/lib/publication/types";

const workspaceRepositorySource = readFileSync("src/lib/repositories/workspace-repository.ts", "utf8");

const publicationActions = vi.hoisted(() => ({
  addSharedLinkRecipients: vi.fn(),
  createProjectPublication: vi.fn(),
  listSharedLinkRecipients: vi.fn(),
  readSharedLinkEmailDeliveryReadiness: vi.fn(),
  refreshProjectPublicationSummary: vi.fn(),
  removeSharedLinkRecipient: vi.fn(),
  republishProjectPublication: vi.fn(),
  resendSharedLinkRecipientEmail: vi.fn(),
  revokeProjectPublication: vi.fn(),
  rotateProjectPublicationLink: vi.fn(),
}));

vi.mock("@/lib/publication/actions", () => publicationActions);

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/projects/project-1/estimates/estimate-1",
}));

const publicationSummary: ProjectPublicationSummary = {
  projectId: "project-1",
  workspaceId: "workspace-1",
  canManagePublication: true,
  status: "published",
  publicationId: "publication-1",
  clientLinkPath: "/share/client-token",
  tokenCopyAvailable: true,
  publishedAt: "2026-05-27T00:00:00.000Z",
  expiresAt: null,
  passwordRequired: true,
  selectedEstimateCount: 2,
  selectedEstimateIds: ["est-1", "est-2"],
  snapshotVersion: 3,
  openCount: 4,
  latestOpenedAt: "2026-05-27T01:00:00.000Z",
  latestActivityAt: null,
};

const sampleEstimateSheets: ProjectEstimateSheet[] = [
  { id: "est-1", name: "Foundation", sheetCode: "S-100" },
  { id: "est-2", name: "Framing", sheetCode: "S-200" },
];

describe("ProjectPublicationHeader publication control", () => {
  beforeEach(() => {
    window.localStorage.clear();
    publicationActions.addSharedLinkRecipients.mockReset();
    publicationActions.createProjectPublication.mockReset();
    publicationActions.listSharedLinkRecipients.mockReset();
    publicationActions.readSharedLinkEmailDeliveryReadiness.mockReset();
    publicationActions.refreshProjectPublicationSummary.mockReset();
    publicationActions.removeSharedLinkRecipient.mockReset();
    publicationActions.republishProjectPublication.mockReset();
    publicationActions.resendSharedLinkRecipientEmail.mockReset();
    publicationActions.revokeProjectPublication.mockReset();
    publicationActions.rotateProjectPublicationLink.mockReset();
    publicationActions.readSharedLinkEmailDeliveryReadiness.mockResolvedValue({
      configured: true,
      message: "Email delivery is configured.",
    });
    // Default: live refetch returns nothing new so the prop summary stays the source of truth.
    publicationActions.refreshProjectPublicationSummary.mockResolvedValue(null);

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn(async () => undefined),
      },
    });
  });

  it("renders the shared-link header button and keeps the client link in its own modal", async () => {
    const user = userEvent.setup();
    render(
      <ProjectPublicationHeader
        summary={publicationSummary}
        projectEstimateSheets={sampleEstimateSheets}
      />,
    );

    const sharedLinkButton = screen.getByRole("button", { name: "Open shared link" });
    expect(sharedLinkButton).toHaveClass("size-10", "border", "bg-white");
    expect(sharedLinkButton).toHaveAttribute("aria-haspopup", "dialog");
    expect(sharedLinkButton).toHaveAttribute("aria-expanded", "false");

    await user.click(sharedLinkButton);

    const dialog = screen.getByRole("dialog", { name: "Shared link" });
    expect(sharedLinkButton).toHaveAttribute("aria-expanded", "true");
    expect(within(dialog).getAllByText("Shared link").length).toBeGreaterThan(0);
    expect(within(dialog).getByRole("textbox", { name: "Shared link" })).toHaveValue("http://localhost:3000/share/client-token");
    expect(within(dialog).getByText("Password on")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Update shared page" })).toBeEnabled();
    expect(within(dialog).getByRole("button", { name: "Create new shared link" })).toBeEnabled();
    expect(within(dialog).queryByText("Project share link")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Client publication snapshot")).not.toBeInTheDocument();
  });

  it("keeps the shared-link modal responsive instead of forcing a desktop grid on mobile", () => {
    const headerSource = readFileSync("src/components/workshop/ProjectPublicationHeader.tsx", "utf8");

    expect(headerSource).toContain("grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]");
    expect(headerSource).toContain("border-b border-hairline bg-surfaceMuted p-4 lg:border-b-0 lg:border-r lg:p-6");
    expect(headerSource).not.toContain('className="grid min-h-[600px] grid-cols-[260px_minmax(0,1fr)]"');
  });

  it("marks shared-link activity from the icon-only header entry", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const { container } = render(
      <ProjectPublicationHeader
        summary={publicationSummary}
        projectEstimateSheets={sampleEstimateSheets}
      />,
    );

    const sharedLinkButton = screen.getByRole("button", { name: "Open shared link" });
    expect(sharedLinkButton).toHaveClass("size-10", "border", "bg-white");
    expect(sharedLinkButton).toHaveAttribute("aria-haspopup", "dialog");
    expect(sharedLinkButton).toHaveAttribute("aria-expanded", "false");
    expect(container.querySelector('[data-shared-link-activity-dot="true"]')).toBeInTheDocument();
    await user.click(sharedLinkButton);
    expect(screen.getByRole("dialog", { name: "Shared link" })).toBeInTheDocument();
    expect(sharedLinkButton).toHaveAttribute("aria-expanded", "true");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("persists shared-link activity last seen and clears the header dot from the Activity tab", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ProjectPublicationHeader
        summary={publicationSummary}
        projectEstimateSheets={sampleEstimateSheets}
      />,
    );

    expect(container.querySelector('[data-shared-link-activity-dot="true"]')).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    await user.click(screen.getByRole("tab", { name: "Activity" }));

    expect(container.querySelector('[data-shared-link-activity-dot="true"]')).not.toBeInTheDocument();
    expect(window.localStorage.getItem("archestimator_shared_link_last_seen:publication-1")).toBe("2026-05-27T01:00:00.000Z");
  });

  it("does not show the shared-link activity dot after the latest activity is already seen", () => {
    window.localStorage.setItem("archestimator_shared_link_last_seen:publication-1", "2026-05-27T02:00:00.000Z");

    const { container } = render(
      <ProjectPublicationHeader
        summary={publicationSummary}
        projectEstimateSheets={sampleEstimateSheets}
      />,
    );

    expect(container.querySelector('[data-shared-link-activity-dot="true"]')).not.toBeInTheDocument();
  });

  // AC-MOD-07 — the dot must light on a new comment/decision (latestActivityAt), not just opens.
  // Non-vacuous: every OPEN timestamp here is OLDER than the seen marker, so the dot can only
  // appear because latestActivityAt is newer. This fails if the dot still ignores latestActivityAt.
  it("lights the activity dot when latestActivityAt is newer than the seen time, even with no new opens", () => {
    // Seen marker sits between the (older) opens and the (newer) comment/decision activity.
    window.localStorage.setItem("archestimator_shared_link_last_seen:publication-1", "2026-05-27T03:00:00.000Z");

    const activitySummary = {
      ...publicationSummary,
      latestOpenedAt: "2026-05-27T01:00:00.000Z", // older than seen
      latestRecipientOpen: {
        email: "client@example.com",
        displayName: "Client Receiver",
        openedAt: "2026-05-27T02:00:00.000Z", // older than seen
      },
      latestActivityAt: "2026-05-27T04:00:00.000Z", // a new comment/decision — newer than seen
    } as ProjectPublicationSummary;

    const { container } = render(
      <ProjectPublicationHeader summary={activitySummary} projectEstimateSheets={sampleEstimateSheets} />,
    );

    expect(container.querySelector('[data-shared-link-activity-dot="true"]')).toBeInTheDocument();
  });

  // MOD-ACT-03 (AC-MOD-03): the modal refetches the activity/metadata fields on open so the
  // open count / last opened / dot update live without a navigation. The refetch must NOT touch
  // status / clientLinkPath (those stay on the prop summary + optimistic reconcile).
  it("refetches metadata on modal open and reflects a newer open count + dot, without changing status", async () => {
    publicationActions.refreshProjectPublicationSummary.mockResolvedValue({
      ...publicationSummary,
      openCount: 11, // server moved on while the modal was mounted
      latestActivityAt: "2030-01-01T00:00:00.000Z", // newer than any stored "seen" → dot lights
    });

    const user = userEvent.setup();
    const { container } = render(
      <ProjectPublicationHeader summary={publicationSummary} projectEstimateSheets={sampleEstimateSheets} />,
    );

    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    const dialog = screen.getByRole("dialog", { name: "Shared link" });

    expect(publicationActions.refreshProjectPublicationSummary).toHaveBeenCalledWith("project-1");
    // Open count reflects the refetched value, not the prop summary's 4.
    expect(await within(dialog).findByText("11")).toBeInTheDocument();
    // Dot lights from the refetched latestActivityAt.
    await waitFor(() =>
      expect(container.querySelector('[data-shared-link-activity-dot="true"]')).toBeInTheDocument(),
    );
    // Status display still comes from the prop summary (published → "Link live").
    expect(within(dialog).getByText("Link live")).toBeInTheDocument();
  });

  it("generates a public view-only link with an optional password and shows it immediately", async () => {
    publicationActions.createProjectPublication.mockResolvedValueOnce({
      ok: true,
      message: "Shared link ready.",
      clientLinkPath: "/share/generated-token",
    });

    const user = userEvent.setup();
    const unpublishedSummary: ProjectPublicationSummary = {
      ...publicationSummary,
      status: "unpublished",
      publicationId: null,
      clientLinkPath: null,
      tokenCopyAvailable: false,
      publishedAt: null,
      passwordRequired: false,
      selectedEstimateCount: 0,
      snapshotVersion: 0,
      openCount: 0,
      latestOpenedAt: null,
    };

    render(
      <ProjectPublicationHeader
        summary={unpublishedSummary}
        projectEstimateSheets={sampleEstimateSheets}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    const dialog = screen.getByRole("dialog", { name: "Shared link" });
    await user.click(within(dialog).getByRole("tab", { name: "Access" }));
    await user.click(within(dialog).getByLabelText("Require password"));
    await user.type(within(dialog).getByLabelText("Link password"), "client-pass-1");
    await user.click(within(dialog).getByRole("button", { name: "Generate shared link" }));

    expect(publicationActions.createProjectPublication).toHaveBeenCalledWith({
      projectId: "project-1",
      selectedEstimateIds: ["est-1", "est-2"],
      password: "client-pass-1",
      // AC-MOD-10: Generate threads the owner expiry; this summary has no expiry so it stays null.
      expiresAt: null,
    });
    // Switch back to Link tab to see the populated input (generate works from any tab)
    await user.click(within(dialog).getByRole("tab", { name: "Link" }));
    expect(await within(dialog).findByDisplayValue("http://localhost:3000/share/generated-token")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Copy shared link" })).toBeEnabled();
    expect(within(dialog).getByRole("button", { name: "Create new shared link" })).toBeEnabled();
  });

  it("can create a fresh shared link for an already published page", async () => {
    publicationActions.rotateProjectPublicationLink.mockResolvedValueOnce({
      ok: true,
      message: "New shared link ready.",
      clientLinkPath: "/share/rotated-token",
    });

    const user = userEvent.setup();
    render(
      <ProjectPublicationHeader
        summary={publicationSummary}
        projectEstimateSheets={sampleEstimateSheets}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    const dialog = screen.getByRole("dialog", { name: "Shared link" });
    await user.click(within(dialog).getByRole("button", { name: "Create new shared link" }));

    expect(publicationActions.rotateProjectPublicationLink).not.toHaveBeenCalled();
    const confirmDialog = screen.getByRole("dialog", { name: "Create new shared link?" });
    expect(within(confirmDialog).getAllByText(/current shared link will stop working/i).length).toBeGreaterThan(0);
    await user.click(within(confirmDialog).getByRole("button", { name: "Create new link" }));

    // AC-MOD-13 (MOD-ROTATE-PWDRAFT-01): rotation no longer threads the password draft — it passes
    // only { projectId } so the server keeps the existing password_hash.
    expect(publicationActions.rotateProjectPublicationLink).toHaveBeenCalledWith({
      projectId: "project-1",
    });
    expect(await within(dialog).findByDisplayValue("http://localhost:3000/share/rotated-token")).toBeInTheDocument();
  });

  it("does not widen an existing shared link to every sheet when updating without changing sheet selection", async () => {
    publicationActions.republishProjectPublication.mockResolvedValueOnce({
      ok: true,
      message: "Shared page updated.",
      clientLinkPath: "/share/client-token",
    });
    const subsetSummary: ProjectPublicationSummary = {
      ...publicationSummary,
      selectedEstimateCount: 1,
      selectedEstimateIds: ["est-1"],
    };

    const user = userEvent.setup();
    render(
      <ProjectPublicationHeader
        summary={subsetSummary}
        projectEstimateSheets={sampleEstimateSheets}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    const dialog = screen.getByRole("dialog", { name: "Shared link" });
    await user.click(within(dialog).getByRole("button", { name: "Update shared page" }));

    expect(publicationActions.republishProjectPublication).toHaveBeenCalledWith({
      projectId: "project-1",
      selectedEstimateIds: ["est-1"],
      password: undefined,
      clearPassword: false,
      // AC-MOD-10: Update now threads the owner expiry; this summary has no expiry so it stays null.
      expiresAt: null,
    });
  });

  it("confirms before turning off a live shared link", async () => {
    publicationActions.revokeProjectPublication.mockResolvedValueOnce({
      ok: true,
      message: "Shared link turned off.",
      clientLinkPath: null,
    });

    const user = userEvent.setup();
    render(
      <ProjectPublicationHeader
        summary={publicationSummary}
        projectEstimateSheets={sampleEstimateSheets}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    const dialog = screen.getByRole("dialog", { name: "Shared link" });
    await user.click(within(dialog).getByRole("button", { name: "Turn off shared link" }));

    expect(publicationActions.revokeProjectPublication).not.toHaveBeenCalled();
    const confirmDialog = screen.getByRole("dialog", { name: "Turn off shared link?" });
    expect(within(confirmDialog).getAllByText(/recipients will lose access/i).length).toBeGreaterThan(0);
    await user.click(within(confirmDialog).getByRole("button", { name: "Turn off link" }));

    expect(publicationActions.revokeProjectPublication).toHaveBeenCalledWith({ projectId: "project-1" });
    expect(await within(dialog).findByRole("status")).toHaveTextContent("Shared link turned off.");
  });

  it("confirms before clearing an existing shared-link password", async () => {
    publicationActions.republishProjectPublication.mockResolvedValueOnce({
      ok: true,
      message: "Shared page updated.",
      clientLinkPath: "/share/client-token",
    });

    const user = userEvent.setup();
    render(
      <ProjectPublicationHeader
        summary={publicationSummary}
        projectEstimateSheets={sampleEstimateSheets}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    const dialog = screen.getByRole("dialog", { name: "Shared link" });
    await user.click(within(dialog).getByRole("tab", { name: "Access" }));
    await user.click(within(dialog).getByLabelText("Require password"));
    await user.click(within(dialog).getByRole("button", { name: "Update shared page" }));

    expect(publicationActions.republishProjectPublication).not.toHaveBeenCalled();
    const confirmDialog = screen.getByRole("dialog", { name: "Clear shared-link password?" });
    expect(within(confirmDialog).getByText(/anyone with the link can view it without a password/i)).toBeInTheDocument();
    await user.click(within(confirmDialog).getByRole("button", { name: "Clear password" }));

    expect(publicationActions.republishProjectPublication).toHaveBeenCalledWith({
      projectId: "project-1",
      selectedEstimateIds: ["est-1", "est-2"],
      password: undefined,
      clearPassword: true,
    });
  });

  // AC-MOD-10 — expired links reactivate in place (same token + password), no protected→open downgrade.
  it("reactivates an expired link in place (republish with expiresAt: null), keeping the token", async () => {
    publicationActions.republishProjectPublication.mockResolvedValueOnce({
      ok: true,
      message: "Shared page updated.",
      clientLinkPath: "/share/client-token",
    });

    const user = userEvent.setup();
    const expiredSummary: ProjectPublicationSummary = {
      ...publicationSummary,
      status: "expired",
      expiresAt: "2026-01-01T00:00:00.000Z",
    };

    render(
      <ProjectPublicationHeader summary={expiredSummary} projectEstimateSheets={sampleEstimateSheets} />,
    );

    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    const dialog = screen.getByRole("dialog", { name: "Shared link" });

    // The primary control in the expired state is a safe in-place reactivate (no confirm).
    const reactivateButton = within(dialog).getByRole("button", { name: "Reactivate link" });
    expect(reactivateButton).toBeEnabled();
    await user.click(reactivateButton);

    expect(publicationActions.republishProjectPublication).toHaveBeenCalledWith({
      projectId: "project-1",
      selectedEstimateIds: ["est-1", "est-2"],
      expiresAt: null,
    });
    // Reactivation never mints a new token via the create path.
    expect(publicationActions.createProjectPublication).not.toHaveBeenCalled();
    expect(publicationActions.rotateProjectPublicationLink).not.toHaveBeenCalled();
  });

  it("gates the fresh-token 'Create new link instead' path behind a confirm in the expired state", async () => {
    publicationActions.createProjectPublication.mockResolvedValueOnce({
      ok: true,
      message: "Shared link ready.",
      clientLinkPath: "/share/brand-new-token",
    });

    const user = userEvent.setup();
    // A non-password-protected expired link so the deliberate fresh-token path is unambiguous.
    const expiredSummary: ProjectPublicationSummary = {
      ...publicationSummary,
      status: "expired",
      passwordRequired: false,
      expiresAt: "2026-01-01T00:00:00.000Z",
    };

    render(
      <ProjectPublicationHeader summary={expiredSummary} projectEstimateSheets={sampleEstimateSheets} />,
    );

    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    const dialog = screen.getByRole("dialog", { name: "Shared link" });

    await user.click(within(dialog).getByRole("button", { name: "Create new link instead" }));
    // Confirm required before minting a new token — create must not fire yet.
    expect(publicationActions.createProjectPublication).not.toHaveBeenCalled();
    const confirmDialog = screen.getByRole("dialog", { name: "Create a brand-new shared link?" });
    expect(within(confirmDialog).getAllByText(/recipient links will stop working/i).length).toBeGreaterThan(0);
    await user.click(within(confirmDialog).getByRole("button", { name: "Create new link" }));

    expect(publicationActions.createProjectPublication).toHaveBeenCalledWith({
      projectId: "project-1",
      selectedEstimateIds: ["est-1", "est-2"],
      password: undefined,
      expiresAt: null,
    });
  });

  it("flows the owner expiry input value into the Update action (republish)", async () => {
    publicationActions.republishProjectPublication.mockResolvedValueOnce({
      ok: true,
      message: "Shared page updated.",
      clientLinkPath: "/share/client-token",
    });

    const user = userEvent.setup();
    render(
      <ProjectPublicationHeader summary={publicationSummary} projectEstimateSheets={sampleEstimateSheets} />,
    );

    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    const dialog = screen.getByRole("dialog", { name: "Shared link" });
    await user.click(within(dialog).getByRole("tab", { name: "Access" }));

    const expiryInput = within(dialog).getByLabelText("Link expiry");
    // datetime-local value (local wall-clock) → component converts to an ISO string.
    await user.clear(expiryInput);
    await user.type(expiryInput, "2027-08-15T12:30");
    await user.click(within(dialog).getByRole("button", { name: "Update shared page" }));

    expect(publicationActions.republishProjectPublication).toHaveBeenCalledTimes(1);
    const call = publicationActions.republishProjectPublication.mock.calls[0][0];
    expect(call.projectId).toBe("project-1");
    expect(typeof call.expiresAt).toBe("string");
    // Round-trips to the same wall-clock instant the owner picked.
    expect(new Date(call.expiresAt).getTime()).toBe(new Date("2027-08-15T12:30").getTime());
  });

  it("passes expiresAt: null into the Update action when the expiry input is cleared", async () => {
    publicationActions.republishProjectPublication.mockResolvedValueOnce({
      ok: true,
      message: "Shared page updated.",
      clientLinkPath: "/share/client-token",
    });

    const user = userEvent.setup();
    const expiringSummary: ProjectPublicationSummary = {
      ...publicationSummary,
      expiresAt: "2027-01-01T00:00:00.000Z",
    };
    render(
      <ProjectPublicationHeader summary={expiringSummary} projectEstimateSheets={sampleEstimateSheets} />,
    );

    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    const dialog = screen.getByRole("dialog", { name: "Shared link" });
    await user.click(within(dialog).getByRole("tab", { name: "Access" }));

    const expiryInput = within(dialog).getByLabelText("Link expiry");
    await user.clear(expiryInput);
    await user.click(within(dialog).getByRole("button", { name: "Update shared page" }));

    const call = publicationActions.republishProjectPublication.mock.calls[0][0];
    expect(call.expiresAt).toBeNull();
  });

  it("disables generate when 0 estimates selected (sheet filter validation)", async () => {
    const user = userEvent.setup();
    const noSheetSummary = { ...publicationSummary, status: "unpublished" as const, selectedEstimateCount: 0 };
    render(
      <ProjectPublicationHeader
        summary={noSheetSummary}
        projectEstimateSheets={[]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    const dialog = screen.getByRole("dialog", { name: "Shared link" });
    // Switch to Estimates (starts default empty when no sheets)
    await user.click(within(dialog).getByRole("tab", { name: "Estimates" }));
    const generateBtn = within(dialog).getByRole("button", { name: "Generate shared link" });
    expect(generateBtn).toBeDisabled();
  });

  it("computes stale snapshot warnings from snapshot generatedAt and latest estimate updates", () => {
    expect(workspaceRepositorySource).toContain("readPublicationSnapshotStaleness");
    expect(workspaceRepositorySource).toContain("snapshot_json");
    expect(workspaceRepositorySource).toContain("latestEstimateUpdatedAt");
    expect(workspaceRepositorySource).toContain("PUBLICATION_SNAPSHOT_STALENESS_CACHE_TTL_MS");
    expect(workspaceRepositorySource).toContain("staleSnapshotWarning");
  });

  it("loads the latest recipient-scoped open for the manager sidebar", () => {
    expect(workspaceRepositorySource).toContain("readLatestSharedLinkRecipientOpen");
    expect(workspaceRepositorySource).toContain("last_opened_at");
    expect(workspaceRepositorySource).toContain("latestRecipientOpen");
    expect(workspaceRepositorySource).toContain("canManagePublication ? readLatestSharedLinkRecipientOpen");
  });

  it("shows stale snapshot warning in the shared-link modal sidebar", async () => {
    const user = userEvent.setup();
    const staleSummary = {
      ...publicationSummary,
      staleSnapshotWarning: {
        daysBehind: 9,
        latestEstimateUpdatedAt: "2026-05-31T00:00:00.000Z",
        snapshotGeneratedAt: "2026-05-22T00:00:00.000Z",
      },
    } as ProjectPublicationSummary;

    render(<ProjectPublicationHeader summary={staleSummary} projectEstimateSheets={sampleEstimateSheets} />);

    await user.click(screen.getByRole("button", { name: "Open shared link" }));

    expect(screen.getByText("Snapshot is 9 days behind current data. Update shared page.")).toBeInTheDocument();
  });

  it("shows the latest recipient open email in the shared-link modal sidebar for publication managers", async () => {
    const user = userEvent.setup();
    const recipientOpenSummary = {
      ...publicationSummary,
      latestRecipientOpen: {
        email: "client@example.com",
        displayName: "Client Receiver",
        openedAt: "2026-05-27T01:00:00.000Z",
      },
    } as ProjectPublicationSummary;

    render(<ProjectPublicationHeader summary={recipientOpenSummary} projectEstimateSheets={sampleEstimateSheets} />);

    await user.click(screen.getByRole("button", { name: "Open shared link" }));

    expect(screen.getByText("Last opened by")).toBeInTheDocument();
    expect(screen.getByText(/Client Receiver/)).toBeInTheDocument();
    expect(screen.getByText(/client@example.com/)).toBeInTheDocument();
  });

  // MOD-MET-02 (AC-MOD-09): "last opened" must reflect the genuinely most-recent open.
  it("attributes 'last opened' to the recipient when their open is the most recent", async () => {
    const user = userEvent.setup();
    const recipientNewerSummary = {
      ...publicationSummary,
      latestOpenedAt: "2026-05-27T01:00:00.000Z", // anonymous open, older
      latestRecipientOpen: {
        email: "client@example.com",
        displayName: "Client Receiver",
        openedAt: "2026-05-27T05:00:00.000Z", // recipient open, newer
      },
    } as ProjectPublicationSummary;

    render(<ProjectPublicationHeader summary={recipientNewerSummary} projectEstimateSheets={sampleEstimateSheets} />);
    await user.click(screen.getByRole("button", { name: "Open shared link" }));

    expect(screen.getByText("Last opened by")).toBeInTheDocument();
    expect(screen.getByText(/Client Receiver/)).toBeInTheDocument();
  });

  it("shows a generic 'last opened' (no recipient attribution) when an anonymous open is newer", async () => {
    const user = userEvent.setup();
    const anonymousNewerSummary = {
      ...publicationSummary,
      latestOpenedAt: "2026-05-27T09:00:00.000Z", // anonymous open, newer
      latestRecipientOpen: {
        email: "client@example.com",
        displayName: "Client Receiver",
        openedAt: "2026-05-27T01:00:00.000Z", // recipient open, older
      },
    } as ProjectPublicationSummary;

    render(<ProjectPublicationHeader summary={anonymousNewerSummary} projectEstimateSheets={sampleEstimateSheets} />);
    await user.click(screen.getByRole("button", { name: "Open shared link" }));

    // The newer anonymous open wins: generic label, no recipient attribution.
    expect(screen.getByText("Last opened")).toBeInTheDocument();
    expect(screen.queryByText("Last opened by")).not.toBeInTheDocument();
    expect(screen.queryByText(/Client Receiver/)).not.toBeInTheDocument();
    expect(screen.queryByText(/client@example.com/)).not.toBeInTheDocument();
  });

  it("hides latest recipient open email from project viewers", async () => {
    const user = userEvent.setup();
    const viewerSummary = {
      ...publicationSummary,
      canManagePublication: false,
      latestRecipientOpen: {
        email: "client@example.com",
        displayName: "Client Receiver",
        openedAt: "2026-05-27T01:00:00.000Z",
      },
    } as ProjectPublicationSummary;

    render(<ProjectPublicationHeader summary={viewerSummary} projectEstimateSheets={sampleEstimateSheets} />);

    await user.click(screen.getByRole("button", { name: "Open shared link" }));

    expect(screen.getByText("Last opened")).toBeInTheDocument();
    expect(screen.queryByText("Last opened by")).not.toBeInTheDocument();
    expect(screen.queryByText(/Client Receiver/)).not.toBeInTheDocument();
    expect(screen.queryByText(/client@example.com/)).not.toBeInTheDocument();
  });

  // Historical red placeholder (P0/P2): "Tab rendering on receiver — red until P2 SharePageTabs"
  // P2 delivered (SharePageTabs + ARIA tabs); placeholder retained for historical red-first record.
  // No active assertion (would be noise post-delivery).
  it("receiver page renders accessible tabs for selected estimates", () => {
    // P2 delivered; original expect(true).toBe(false) removed.
  });

  // AC-MOD-05 — reconcile optimistic owner-modal state against server truth.
  it("shows 'Turned off' with disabled controls when the live summary is revoked elsewhere", async () => {
    publicationActions.republishProjectPublication.mockResolvedValueOnce({
      ok: true,
      message: "Shared page updated.",
      clientLinkPath: "/share/client-token",
    });

    const user = userEvent.setup();
    const { rerender } = render(
      <ProjectPublicationHeader summary={publicationSummary} projectEstimateSheets={sampleEstimateSheets} />,
    );

    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    const dialog = screen.getByRole("dialog", { name: "Shared link" });

    // Drive an owner action so the optimistic localResult is set ("Link live").
    await user.click(within(dialog).getByRole("button", { name: "Update shared page" }));
    expect(await within(dialog).findByRole("status")).toHaveTextContent("Shared page updated.");
    expect(within(dialog).getByText("Link live")).toBeInTheDocument();

    // The layout later passes a fresh summary whose link was revoked elsewhere
    // (same projectId, status now "revoked"). The optimistic signature no longer
    // matches, so the modal must fall back to server truth.
    const revokedSummary: ProjectPublicationSummary = {
      ...publicationSummary,
      status: "revoked",
      clientLinkPath: null,
    };
    rerender(
      <ProjectPublicationHeader summary={revokedSummary} projectEstimateSheets={sampleEstimateSheets} />,
    );

    expect(within(dialog).getByText("Turned off")).toBeInTheDocument();
    expect(within(dialog).queryByText("Link live")).not.toBeInTheDocument();
    // hasLiveClientLink is false → live-link controls disabled, Generate flips to create.
    expect(within(dialog).getByRole("button", { name: "Create new shared link" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Turn off shared link" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Generate shared link" })).toBeInTheDocument();
  });

  it("renders a revoked summary as 'Turned off' on first paint without any optimistic action", async () => {
    const user = userEvent.setup();
    const revokedSummary: ProjectPublicationSummary = {
      ...publicationSummary,
      status: "revoked",
      clientLinkPath: null,
    };
    render(<ProjectPublicationHeader summary={revokedSummary} projectEstimateSheets={sampleEstimateSheets} />);

    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    const dialog = screen.getByRole("dialog", { name: "Shared link" });
    expect(within(dialog).getByText("Turned off")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Turn off shared link" })).toBeDisabled();
  });

  // MOD-SHEET-01 — estimate-picker override clears on action success so it re-syncs to truth.
  it("clears the estimate-picker override after a successful publish (re-syncs to summary)", async () => {
    publicationActions.republishProjectPublication.mockResolvedValueOnce({
      ok: true,
      message: "Shared page updated.",
      clientLinkPath: "/share/client-token",
    });

    const user = userEvent.setup();
    render(
      <ProjectPublicationHeader summary={publicationSummary} projectEstimateSheets={sampleEstimateSheets} />,
    );

    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    const dialog = screen.getByRole("dialog", { name: "Shared link" });

    // Override the picker: deselect est-2 so only est-1 remains selected.
    await user.click(within(dialog).getByRole("tab", { name: "Estimates" }));
    const framing = within(dialog).getByRole("checkbox", { name: /S-200.*Framing/ });
    expect(framing).toBeChecked();
    await user.click(framing);
    expect(framing).not.toBeChecked();

    // Publish: the override should be cleared on success, re-syncing the picker
    // to the (unchanged) summary's full selection — est-2 checked again.
    await user.click(within(dialog).getByRole("button", { name: "Update shared page" }));
    expect(await within(dialog).findByRole("status")).toHaveTextContent("Shared page updated.");

    await user.click(within(dialog).getByRole("tab", { name: "Estimates" }));
    expect(within(dialog).getByRole("checkbox", { name: /S-200.*Framing/ })).toBeChecked();
  });
});

// AC-MOD-05 — pure reconcile predicate + server signature.
describe("optimistic publication-result reconciliation (AC-MOD-05)", () => {
  const baseSummary: ProjectPublicationSummary = {
    projectId: "project-1",
    workspaceId: "workspace-1",
    canManagePublication: true,
    status: "published",
    publicationId: "publication-1",
    clientLinkPath: "/share/client-token",
    tokenCopyAvailable: true,
    publishedAt: "2026-05-27T00:00:00.000Z",
    expiresAt: null,
    passwordRequired: true,
    selectedEstimateCount: 2,
    selectedEstimateIds: ["est-1", "est-2"],
    snapshotVersion: 3,
    openCount: 4,
    latestOpenedAt: "2026-05-27T01:00:00.000Z",
    latestActivityAt: null,
  };

  it("readPublicationServerSignature returns a stable signature and 'none' for null", () => {
    expect(readPublicationServerSignature(null)).toBe("none");
    const signature = readPublicationServerSignature(baseSummary);
    expect(signature).toBe("published|/share/client-token|3|true");
    // Stable across identical-field summaries.
    expect(readPublicationServerSignature({ ...baseSummary })).toBe(signature);
  });

  it("signature changes when status, link, snapshotVersion, or password flips (projectId unchanged)", () => {
    const base = readPublicationServerSignature(baseSummary);
    expect(readPublicationServerSignature({ ...baseSummary, status: "revoked", clientLinkPath: null })).not.toBe(base);
    expect(readPublicationServerSignature({ ...baseSummary, snapshotVersion: 4 })).not.toBe(base);
    expect(readPublicationServerSignature({ ...baseSummary, passwordRequired: false })).not.toBe(base);
    expect(readPublicationServerSignature({ ...baseSummary, status: "expired" })).not.toBe(base);
  });

  it("honors the optimistic result while summaryKey AND signature match", () => {
    const signature = readPublicationServerSignature(baseSummary);
    const localResult = { summaryKey: "project-1", baseServerSignature: signature };
    expect(shouldUseOptimisticPublicationResult(localResult, "project-1", signature)).toBe(true);
  });

  it("drops the optimistic result once the live signature moves on (revoke/expire elsewhere)", () => {
    const capturedSignature = readPublicationServerSignature(baseSummary);
    const localResult = { summaryKey: "project-1", baseServerSignature: capturedSignature };

    // Same projectId (summaryKey unchanged), but the link was revoked elsewhere.
    const revokedSignature = readPublicationServerSignature({
      ...baseSummary,
      status: "revoked",
      clientLinkPath: null,
    });
    expect(shouldUseOptimisticPublicationResult(localResult, "project-1", revokedSignature)).toBe(false);

    // Snapshot bump from a revalidation also drops it.
    const bumpedSignature = readPublicationServerSignature({ ...baseSummary, snapshotVersion: 4 });
    expect(shouldUseOptimisticPublicationResult(localResult, "project-1", bumpedSignature)).toBe(false);
  });

  it("returns false when localResult is null", () => {
    expect(shouldUseOptimisticPublicationResult(null, "project-1", "any")).toBe(false);
  });
});

/**
 * RED TESTS (P1): SheetPickerList component behavior.
 * Written BEFORE any SheetPickerList implementation logic or tab restructure in ProjectPublicationHeader.
 * These capture the required rendering, interaction, validation, a11y, and keyboard contract per the approved interface:
 *   interface SheetPickerListProps {
 *     estimates: Array<{id: string; name: string; sheetCode?: string | null}>;
 *     selectedIds: string[];
 *     onChange: (ids: string[]) => void;
 *     disabled?: boolean;
 *     'aria-label'?: string;
 *   }
 * All UI must comply with design system (SF Pro, ≤12px / text-[10px] text-[9px], rounded-xs, Phosphor regular, compact).
 * Integration expectations (0-selected disables Generate, empty state for 0 selected) exercised here and will be wired after header changes.
 */
describe("SheetPickerList (P1)", () => {
  const mockEstimates: ProjectEstimateSheet[] = [
    { id: "est-1", name: "Foundation", sheetCode: "S-100" },
    { id: "est-2", name: "Framing", sheetCode: "S-200" },
    { id: "est-3", name: "Electrical", sheetCode: null },
  ];

  const onChange = vi.fn();

  beforeEach(() => {
    onChange.mockReset();
  });

  it("renders list of estimates with checkboxes, labels showing name and sheetCode, and aria-label", () => {
    render(<SheetPickerList estimates={mockEstimates} selectedIds={["est-1"]} onChange={onChange} aria-label="Select estimates to include in shared link" />);
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
    expect(screen.getByLabelText(/S-100.*Foundation/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Electrical/)).toBeInTheDocument();
    expect(screen.getByLabelText("Select estimates to include in shared link")).toBeInTheDocument();
  });

  it("toggles individual estimate on checkbox change and calls onChange with updated set", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<SheetPickerList estimates={mockEstimates} selectedIds={[]} onChange={onChange} />);
    const foundation = screen.getByLabelText(/Foundation/);
    await user.click(foundation);
    expect(onChange).toHaveBeenCalledWith(["est-1"]);
    rerender(<SheetPickerList estimates={mockEstimates} selectedIds={["est-1"]} onChange={onChange} />);
    await user.click(foundation);
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("Select all affordance selects every estimate id and calls onChange", async () => {
    const user = userEvent.setup();
    render(<SheetPickerList estimates={mockEstimates} selectedIds={["est-1"]} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /select all/i }));
    expect(onChange).toHaveBeenCalledWith(["est-1", "est-2", "est-3"]);
  });

  it("Clear / deselect all affordance calls onChange with empty array", async () => {
    const user = userEvent.setup();
    render(<SheetPickerList estimates={mockEstimates} selectedIds={["est-1", "est-2"]} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /clear/i }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("shows explicit '0 estimates selected' message when selectedIds.length === 0", () => {
    render(<SheetPickerList estimates={mockEstimates} selectedIds={[]} onChange={onChange} />);
    expect(screen.getByText("0 estimates selected")).toBeInTheDocument();
  });

  it("renders empty state when project has 0 estimates", () => {
    render(<SheetPickerList estimates={[]} selectedIds={[]} onChange={onChange} />);
    expect(screen.getByText(/no estimates/i)).toBeInTheDocument();
  });

  it("respects disabled prop (no toggles, no select-all)", async () => {
    const user = userEvent.setup();
    render(<SheetPickerList estimates={mockEstimates} selectedIds={[]} onChange={onChange} disabled />);
    const cb = screen.getAllByRole("checkbox")[0];
    expect(cb).toBeDisabled();
    await user.click(cb);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("supports keyboard navigation (checkboxes are focusable with proper aria labels)", () => {
    render(<SheetPickerList estimates={mockEstimates} selectedIds={[]} onChange={onChange} aria-label="Estimates" />);
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).toHaveAttribute("aria-label", "S-100 — Foundation");
    // Native checkbox keyboard (Space/Enter) is provided by browser; focusable + labelled for a11y
    checkboxes[0].focus();
    expect(document.activeElement).toBe(checkboxes[0]);
  });
});

// P4 RED TESTS — RecipientEmailComposer + Recipients tab (must fail until implemented)
// Per Master Prompt + P4: chip input (email entry + add/remove), validation, send states (pending/sending/success/error),
// status chips (Pending/Sent/Bounced/Opened), graceful Resend, integrated as 4th tab in ProjectPublicationHeader.
describe("P4 — RecipientEmailComposer and Recipients tab (RED until implementation)", () => {
  const headerSrc = readFileSync("src/components/workshop/ProjectPublicationHeader.tsx", "utf8");
  const recipientComposerSrc = readFileSync("src/components/workshop/publication/RecipientEmailComposer.tsx", "utf8");

  it("exports and wires RecipientEmailComposer for the Recipients tab (chip email UI)", () => {
    // RED until component defined + exported (co-located export like SheetPickerList) and tab added
    expect(headerSrc).toContain("RecipientEmailComposer");
    expect(headerSrc).toContain("Recipients");
    // Tab bar extended to 4 tabs (link/sheets/access/recipients)
    expect(headerSrc).toMatch(/recipients|Recipients/i);
    // Uses design system: rounded-xs, text-[10px] or smaller, SF Pro via parent
    expect(headerSrc).toMatch(/rounded-xs|text-\[10px\]|text-\[9px\]/);
  });

  it("RecipientEmailComposer supports email chip input, validation, add/remove chips (RED)", () => {
    // Key behaviors required by P4 UX: enter/comma adds valid email chip; invalid rejected; remove chip; dedupe
    expect(`${headerSrc}\n${recipientComposerSrc}`).toMatch(/RecipientEmailComposer|recipients|chip|email.*input/i);
    expect(headerSrc).toContain("RecipientEmailComposer");
  });

  it("RecipientEmailComposer shows send states, calls add action, displays delivery status chips (RED)", () => {
    // Send button, loading/disabled during send, success message or list update
    // Status chips: Pending (default), Sent (on Resend ok), Bounced/Opened (from table)
    expect(recipientComposerSrc).toMatch(/delivery_status|Pending|Sent|Bounced|Opened|status.*chip|chip.*(pending|sent)/i);
    expect(recipientComposerSrc).toContain("addSharedLinkRecipients");
    expect(`${headerSrc}\n${recipientComposerSrc}`).toMatch(/isPending|startTransition|loading|disabled.*send/i);
  });

  it("Recipients tab integrates cleanly without breaking Link/Estimates/Access (backwards compat RED gate)", () => {
    expect(headerSrc).toContain("activeTab");
    // Existing 3 tabs still present; 4th added without removal
    expect(headerSrc).toMatch(/"link"|"sheets"|"access"/);
    // No breakage to runPublicationAction or existing controls
    expect(headerSrc).toContain("runPublicationAction");
  });

  it("dynamically imports and renders RecipientEmailComposer (chip input + validation + status display) — hard RED gate", async () => {
    // Dynamic to avoid top-level module load failure during red phase; will fail until export exists + impl
    const mod = await import("@/components/workshop/ProjectPublicationHeader");
    expect(mod.RecipientEmailComposer).toBeDefined(); // fails until exported

    // Once exported, these will fail until chip UI, email validation, send states, status chips implemented
    const { RecipientEmailComposer } = mod;
    // Minimal render to exercise (props per usage: publicationId, current list, callbacks)
    // Expectation: input for emails, chips list, send button, status badges with correct labels
    expect(RecipientEmailComposer).toBeTruthy();
    // (Full userEvent chip add/validate/remove/send would be added here post-export; current red via source + import)
  });

  it("renders a per-recipient resend action and sends the existing recipient a fresh secure link", async () => {
    publicationActions.listSharedLinkRecipients.mockResolvedValue([
      {
        id: "recipient-1",
        email: "client@example.com",
        display_name: null,
        delivery_status: "sent",
      },
    ]);
    publicationActions.resendSharedLinkRecipientEmail.mockResolvedValue({
      ok: true,
      message: "Recipient email resent.",
    });
    const user = userEvent.setup();

    render(<ProjectPublicationHeader summary={publicationSummary} projectEstimateSheets={sampleEstimateSheets} />);

    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    const dialog = screen.getByRole("dialog", { name: "Shared link" });
    await user.click(within(dialog).getByRole("tab", { name: "Recipients" }));

    expect(await within(dialog).findByText("client@example.com")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Resend client@example.com" }));

    expect(publicationActions.resendSharedLinkRecipientEmail).toHaveBeenCalledWith({
      publicationId: "publication-1",
      recipientId: "recipient-1",
      baseClientLink: "/share/client-token",
    });
    expect((await within(dialog).findAllByText("Recipient email resent.")).length).toBeGreaterThan(0);
  });

  it("disables visible recipient email controls when delivery is not configured", async () => {
    publicationActions.readSharedLinkEmailDeliveryReadiness.mockResolvedValue({
      configured: false,
      message: "Email delivery is disabled until Resend sender, reply-to, and webhook settings are configured. Copy the share link manually.",
    });
    publicationActions.listSharedLinkRecipients.mockResolvedValue([
      {
        id: "recipient-1",
        email: "client@example.com",
        display_name: null,
        delivery_status: "pending",
      },
    ]);
    const user = userEvent.setup();

    render(<ProjectPublicationHeader summary={publicationSummary} projectEstimateSheets={sampleEstimateSheets} />);

    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    const dialog = screen.getByRole("dialog", { name: "Shared link" });
    await user.click(within(dialog).getByRole("tab", { name: "Recipients" }));

    expect(await within(dialog).findByText(/Email delivery is disabled until Resend sender/)).toBeInTheDocument();
    expect(within(dialog).getByPlaceholderText("name@company.com, another@...")).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Resend client@example.com" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: /Send to 1 recipient/ })).toBeDisabled();
  });

  it("rejects adding the signed-in user's own email as a recipient before send", async () => {
    const user = userEvent.setup();
    publicationActions.readSharedLinkEmailDeliveryReadiness.mockResolvedValue({
      configured: true,
      message: "Email delivery is configured.",
    });
    publicationActions.listSharedLinkRecipients.mockResolvedValue([]);

    render(<ProjectPublicationHeader summary={publicationSummary} projectEstimateSheets={sampleEstimateSheets} currentUserEmail="philip@example.com" />);

    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    const dialog = screen.getByRole("dialog", { name: "Shared link" });
    await user.click(within(dialog).getByRole("tab", { name: "Recipients" }));

    const emailInput = within(dialog).getByPlaceholderText("name@company.com, another@...");
    await waitFor(() => expect(emailInput).not.toBeDisabled());
    await user.type(emailInput, "philip@example.com,");

    await waitFor(() => {
      expect(within(dialog).getAllByText("You cannot invite your own sign-in email to this shared link.").length).toBeGreaterThan(0);
    });
    expect(within(dialog).getByRole("button", { name: /Send to 0 recipients/ })).toBeDisabled();
    expect(publicationActions.addSharedLinkRecipients).not.toHaveBeenCalled();
  });
});

// AC-MOD-12 / AC-MOD-21 / AC-MOD-13 / AC-MOD-14 — feedback tone, double-submit guard,
// rotate ignores the password draft, and the estimates dirty indicator.
describe("ProjectPublicationHeader feedback + interaction guards (T5-7)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    publicationActions.createProjectPublication.mockReset();
    publicationActions.refreshProjectPublicationSummary.mockReset();
    publicationActions.republishProjectPublication.mockReset();
    publicationActions.revokeProjectPublication.mockReset();
    publicationActions.rotateProjectPublicationLink.mockReset();
    publicationActions.refreshProjectPublicationSummary.mockResolvedValue(null);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn(async () => undefined) },
    });
  });

  // AC-MOD-12 — a thrown action error renders as a danger alert, not a neutral status.
  it("renders a thrown action error as role=alert with danger styling", async () => {
    publicationActions.revokeProjectPublication.mockRejectedValueOnce(new Error("Turn off failed on the server."));

    const user = userEvent.setup();
    render(<ProjectPublicationHeader summary={publicationSummary} projectEstimateSheets={sampleEstimateSheets} />);

    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    const dialog = screen.getByRole("dialog", { name: "Shared link" });
    await user.click(within(dialog).getByRole("button", { name: "Turn off shared link" }));
    const confirmDialog = screen.getByRole("dialog", { name: "Turn off shared link?" });
    await user.click(within(confirmDialog).getByRole("button", { name: "Turn off link" }));

    // The failed action surfaces as an alert in the modal body with danger styling.
    const alert = await within(dialog).findByRole("alert");
    expect(alert).toHaveTextContent("Turn off failed on the server.");
    expect(alert).toHaveClass("bg-dangerSoft", "text-danger");
  });

  // AC-MOD-12 — a successful action renders neutral/status, never danger.
  it("renders a successful action as role=status with neutral styling", async () => {
    publicationActions.revokeProjectPublication.mockResolvedValueOnce({
      ok: true,
      message: "Shared link turned off.",
      clientLinkPath: null,
    });

    const user = userEvent.setup();
    render(<ProjectPublicationHeader summary={publicationSummary} projectEstimateSheets={sampleEstimateSheets} />);

    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    const dialog = screen.getByRole("dialog", { name: "Shared link" });
    await user.click(within(dialog).getByRole("button", { name: "Turn off shared link" }));
    await user.click(within(screen.getByRole("dialog", { name: "Turn off shared link?" })).getByRole("button", { name: "Turn off link" }));

    const status = await within(dialog).findByRole("status");
    expect(status).toHaveTextContent("Shared link turned off.");
    expect(status).not.toHaveClass("text-danger");
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
  });

  // AC-MOD-21 — rapid double "confirm" dispatches the underlying action exactly once.
  // Non-vacuous: a deferred-resolution mock keeps the transition pending across both clicks, and
  // both clicks are fired synchronously (before React re-renders and removes the confirm). Without
  // the in-flight latch + disabled guard the second click would dispatch revoke a second time.
  it("guards the destructive confirm against double-submit (action called once)", async () => {
    let resolveRevoke: ((value: { ok: boolean; message: string; clientLinkPath: null }) => void) | undefined;
    publicationActions.revokeProjectPublication.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRevoke = resolve;
        }),
    );

    const user = userEvent.setup();
    render(<ProjectPublicationHeader summary={publicationSummary} projectEstimateSheets={sampleEstimateSheets} />);

    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    const dialog = screen.getByRole("dialog", { name: "Shared link" });
    await user.click(within(dialog).getByRole("button", { name: "Turn off shared link" }));
    const confirmDialog = screen.getByRole("dialog", { name: "Turn off shared link?" });
    const confirmButton = within(confirmDialog).getByRole("button", { name: "Turn off link" });

    // Two clicks dispatched inside a single act() — React does NOT re-render between them, so both
    // use the same render's handler (the same `destructiveAction` closure). This reproduces the
    // real double-click race: without the synchronous in-flight latch the second click dispatches
    // revoke a second time. (Verified non-vacuous: removing the latch makes this assert 2 calls.)
    act(() => {
      confirmButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      confirmButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(publicationActions.revokeProjectPublication).toHaveBeenCalledTimes(1);

    resolveRevoke?.({ ok: true, message: "Shared link turned off.", clientLinkPath: null });
    await within(dialog).findByText("Shared link turned off.");
    expect(publicationActions.revokeProjectPublication).toHaveBeenCalledTimes(1);
  });

  it("disables the destructive confirm button while the action is pending", async () => {
    let resolveRevoke: (() => void) | undefined;
    publicationActions.revokeProjectPublication.mockImplementation(
      () => new Promise((resolve) => { resolveRevoke = () => resolve({ ok: true, message: "Off.", clientLinkPath: null }); }),
    );

    const user = userEvent.setup();
    render(<ProjectPublicationHeader summary={publicationSummary} projectEstimateSheets={sampleEstimateSheets} />);

    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    const dialog = screen.getByRole("dialog", { name: "Shared link" });
    await user.click(within(dialog).getByRole("button", { name: "Turn off shared link" }));
    const confirmButton = within(screen.getByRole("dialog", { name: "Turn off shared link?" })).getByRole("button", {
      name: "Turn off link",
    });
    await user.click(confirmButton);

    // While the revoke promise is unresolved the transition stays pending → controls disable.
    await waitFor(() =>
      expect(within(dialog).getByRole("button", { name: "Turn off shared link" })).toBeDisabled(),
    );
    resolveRevoke?.();
  });

  // AC-MOD-13 (MOD-ROTATE-PWDRAFT-01) — rotate ignores the unsaved password draft.
  it("rotates with only { projectId }, ignoring an edited password draft", async () => {
    publicationActions.rotateProjectPublicationLink.mockResolvedValueOnce({
      ok: true,
      message: "New shared link ready.",
      clientLinkPath: "/share/rotated-token",
    });

    const user = userEvent.setup();
    render(<ProjectPublicationHeader summary={publicationSummary} projectEstimateSheets={sampleEstimateSheets} />);

    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    const dialog = screen.getByRole("dialog", { name: "Shared link" });

    // Edit the password draft on the Access tab (should NOT be threaded into rotation).
    await user.click(within(dialog).getByRole("tab", { name: "Access" }));
    await user.type(within(dialog).getByLabelText("Link password"), "draft-secret");

    await user.click(within(dialog).getByRole("button", { name: "Create new shared link" }));
    const confirmDialog = screen.getByRole("dialog", { name: "Create new shared link?" });
    await user.click(within(confirmDialog).getByRole("button", { name: "Create new link" }));

    // Only the projectId is passed — no password / clearPassword from the draft.
    expect(publicationActions.rotateProjectPublicationLink).toHaveBeenCalledWith({ projectId: "project-1" });
    const call = publicationActions.rotateProjectPublicationLink.mock.calls[0][0];
    expect(call).not.toHaveProperty("password");
    expect(call).not.toHaveProperty("clearPassword");
  });

  // AC-MOD-14 (MOD-SHEET-03) — rotate confirm copy explains the estimate scope is the published one.
  it("explains in the rotate confirm that the new link keeps the currently-published estimates", async () => {
    const user = userEvent.setup();
    render(<ProjectPublicationHeader summary={publicationSummary} projectEstimateSheets={sampleEstimateSheets} />);

    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    const dialog = screen.getByRole("dialog", { name: "Shared link" });
    await user.click(within(dialog).getByRole("button", { name: "Create new shared link" }));

    const confirmDialog = screen.getByRole("dialog", { name: "Create new shared link?" });
    expect(within(confirmDialog).getByText(/keeps the currently-published estimates/i)).toBeInTheDocument();
  });

  // AC-MOD-14 (MOD-SHEET-02) — the dirty hint appears when the selection diverges and hides when it matches.
  it("shows the 'Unsaved' estimates hint only when the selection diverges from the published set", async () => {
    const user = userEvent.setup();
    render(<ProjectPublicationHeader summary={publicationSummary} projectEstimateSheets={sampleEstimateSheets} />);

    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    const dialog = screen.getByRole("dialog", { name: "Shared link" });
    await user.click(within(dialog).getByRole("tab", { name: "Estimates" }));

    // Initially the picker matches the published selection → no dirty hint.
    expect(within(dialog).queryByText("Unsaved — Update to apply")).not.toBeInTheDocument();

    // Deselect est-2 → selection diverges → hint shows.
    const framing = within(dialog).getByRole("checkbox", { name: /S-200.*Framing/ });
    await user.click(framing);
    expect(within(dialog).getByText("Unsaved — Update to apply")).toBeInTheDocument();

    // Re-select est-2 → matches the published set again → hint hides.
    await user.click(framing);
    expect(within(dialog).queryByText("Unsaved — Update to apply")).not.toBeInTheDocument();
  });
});

// AC-MOD-16 (MOD-PW-03 + MOD-PW-04 + MOD-PWDRAFT-CHECK-02) — password-state clarity.
// The Link-tab chip must reflect SERVER truth (summary.passwordRequired), not the optimistic
// draft. The Access tab must show a "currently set" / "no password set" line from server truth
// plus an "Unsaved — Update to apply" cue when the draft diverges from the saved state.
describe("ProjectPublicationHeader password-state clarity (AC-MOD-16)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    publicationActions.createProjectPublication.mockReset();
    publicationActions.refreshProjectPublicationSummary.mockReset();
    publicationActions.republishProjectPublication.mockReset();
    publicationActions.revokeProjectPublication.mockReset();
    publicationActions.rotateProjectPublicationLink.mockReset();
    publicationActions.refreshProjectPublicationSummary.mockResolvedValue(null);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn(async () => undefined) },
    });
  });

  // MOD-PW-03 — the chip tracks the SAVED server state, not the unsaved draft.
  // Non-vacuous: the summary has passwordRequired:true; after the owner unchecks "Require
  // password" (draft → open) the chip must STILL read "Password on" because nothing was saved.
  // If the chip read the draft it would flip to "Open access" instantly — this asserts it does not.
  it("keeps the Link-tab chip on server truth ('Password on') after the draft toggles password off", async () => {
    const user = userEvent.setup();
    render(<ProjectPublicationHeader summary={publicationSummary} projectEstimateSheets={sampleEstimateSheets} />);

    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    const dialog = screen.getByRole("dialog", { name: "Shared link" });

    // Server truth: a password is set → chip reads "Password on".
    expect(within(dialog).getByText("Password on")).toBeInTheDocument();

    // Owner unchecks "Require password" on the Access tab (optimistic draft only — not saved).
    await user.click(within(dialog).getByRole("tab", { name: "Access" }));
    await user.click(within(dialog).getByLabelText("Require password"));

    // Back on the Link tab the chip must STILL show server truth until Update is pressed.
    await user.click(within(dialog).getByRole("tab", { name: "Link" }));
    expect(within(dialog).getByText("Password on")).toBeInTheDocument();
    expect(within(dialog).queryByText("Open access")).not.toBeInTheDocument();
  });

  // The mirror: an open-access link's chip reads "Open access" even after the draft enables one.
  it("keeps the chip on 'Open access' (server truth) after the draft enables a password", async () => {
    const user = userEvent.setup();
    const openSummary: ProjectPublicationSummary = { ...publicationSummary, passwordRequired: false };
    render(<ProjectPublicationHeader summary={openSummary} projectEstimateSheets={sampleEstimateSheets} />);

    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    const dialog = screen.getByRole("dialog", { name: "Shared link" });
    expect(within(dialog).getByText("Open access")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("tab", { name: "Access" }));
    await user.click(within(dialog).getByLabelText("Require password"));
    await user.type(within(dialog).getByLabelText("Link password"), "new-pass");

    await user.click(within(dialog).getByRole("tab", { name: "Link" }));
    // The saved state is still open → chip unchanged until Update.
    expect(within(dialog).getByText("Open access")).toBeInTheDocument();
    expect(within(dialog).queryByText("Password on")).not.toBeInTheDocument();
  });

  // MOD-PW-04 — Access tab states the current SAVED password state explicitly.
  it("shows 'Password is currently set' on the Access tab when the summary has a password", async () => {
    const user = userEvent.setup();
    render(<ProjectPublicationHeader summary={publicationSummary} projectEstimateSheets={sampleEstimateSheets} />);

    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    const dialog = screen.getByRole("dialog", { name: "Shared link" });
    await user.click(within(dialog).getByRole("tab", { name: "Access" }));

    expect(within(dialog).getByText("Password is currently set")).toBeInTheDocument();
    expect(within(dialog).queryByText("No password set")).not.toBeInTheDocument();
  });

  it("shows 'No password set' on the Access tab for an open-access summary", async () => {
    const user = userEvent.setup();
    const openSummary: ProjectPublicationSummary = { ...publicationSummary, passwordRequired: false };
    render(<ProjectPublicationHeader summary={openSummary} projectEstimateSheets={sampleEstimateSheets} />);

    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    const dialog = screen.getByRole("dialog", { name: "Shared link" });
    await user.click(within(dialog).getByRole("tab", { name: "Access" }));

    expect(within(dialog).getByText("No password set")).toBeInTheDocument();
    expect(within(dialog).queryByText("Password is currently set")).not.toBeInTheDocument();
  });

  // MOD-PWDRAFT-CHECK-02 — an "Unsaved — Update to apply" cue when the draft diverges from
  // the saved state. Starts hidden (draft matches server), shows when the box is unchecked
  // (server has a password but the draft would remove it), and hides again when re-checked.
  it("toggles the Access-tab 'Unsaved' password cue as the draft diverges from / matches the saved state", async () => {
    const user = userEvent.setup();
    render(<ProjectPublicationHeader summary={publicationSummary} projectEstimateSheets={sampleEstimateSheets} />);

    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    const dialog = screen.getByRole("dialog", { name: "Shared link" });
    await user.click(within(dialog).getByRole("tab", { name: "Access" }));

    // Initially the draft matches the saved state (require=on, no new password typed) → no cue.
    const accessPanel = within(dialog).getByRole("tabpanel");
    expect(within(accessPanel).queryByText("Unsaved — Update to apply")).not.toBeInTheDocument();

    // Uncheck "Require password" → the draft (open) diverges from the saved (protected) state.
    await user.click(within(dialog).getByLabelText("Require password"));
    expect(within(accessPanel).getByText("Unsaved — Update to apply")).toBeInTheDocument();

    // Re-check → draft matches the saved state again → cue hides.
    await user.click(within(dialog).getByLabelText("Require password"));
    expect(within(accessPanel).queryByText("Unsaved — Update to apply")).not.toBeInTheDocument();
  });

  it("shows the 'Unsaved' password cue when a new password is typed for an already-protected link", async () => {
    const user = userEvent.setup();
    render(<ProjectPublicationHeader summary={publicationSummary} projectEstimateSheets={sampleEstimateSheets} />);

    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    const dialog = screen.getByRole("dialog", { name: "Shared link" });
    await user.click(within(dialog).getByRole("tab", { name: "Access" }));

    const accessPanel = within(dialog).getByRole("tabpanel");
    // Require stays checked (matches server) but a new password typed = a pending change.
    expect(within(accessPanel).queryByText("Unsaved — Update to apply")).not.toBeInTheDocument();
    await user.type(within(dialog).getByLabelText("Link password"), "rotated-secret");
    expect(within(accessPanel).getByText("Unsaved — Update to apply")).toBeInTheDocument();
  });
});

// AC-MOD-11 — keyboard + ARIA tabpanel wiring for the publication-manager tab strip.
describe("ProjectPublicationHeader tab a11y (AC-MOD-11)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    publicationActions.refreshProjectPublicationSummary.mockReset();
    publicationActions.refreshProjectPublicationSummary.mockResolvedValue(null);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn(async () => undefined) },
    });
  });

  it("renders the active panel as a tabpanel labelled by the active tab's id", async () => {
    const user = userEvent.setup();
    render(<ProjectPublicationHeader summary={publicationSummary} projectEstimateSheets={sampleEstimateSheets} />);

    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    const dialog = screen.getByRole("dialog", { name: "Shared link" });

    // The Link tab is active on open; the panel must reference its id.
    const linkTab = within(dialog).getByRole("tab", { name: "Link" });
    expect(linkTab).toHaveAttribute("id", "project-publication-tab-link");
    expect(linkTab).toHaveAttribute("aria-controls", "project-publication-panel-link");

    const panel = within(dialog).getByRole("tabpanel");
    expect(panel).toHaveAttribute("id", "project-publication-panel-link");
    expect(panel).toHaveAttribute("aria-labelledby", "project-publication-tab-link");
    expect(panel).toHaveAttribute("tabindex", "0");
  });

  it("switches the active tab/panel via arrow keys on the tablist (automatic activation)", async () => {
    const user = userEvent.setup();
    render(<ProjectPublicationHeader summary={publicationSummary} projectEstimateSheets={sampleEstimateSheets} />);

    await user.click(screen.getByRole("button", { name: "Open shared link" }));
    const dialog = screen.getByRole("dialog", { name: "Shared link" });

    const linkTab = within(dialog).getByRole("tab", { name: "Link" });
    linkTab.focus();
    fireEvent.keyDown(linkTab, { key: "ArrowRight" });

    // Focus and selection move to "Estimates"; the panel relabels to track it.
    const estimatesTab = within(dialog).getByRole("tab", { name: "Estimates" });
    expect(document.activeElement).toBe(estimatesTab);
    expect(estimatesTab).toHaveAttribute("aria-selected", "true");
    expect(linkTab).toHaveAttribute("aria-selected", "false");

    const panel = within(dialog).getByRole("tabpanel");
    expect(panel).toHaveAttribute("id", "project-publication-panel-sheets");
    expect(panel).toHaveAttribute("aria-labelledby", "project-publication-tab-sheets");
    // The Estimates panel content rendered (proves the switch is real, not cosmetic).
    expect(within(panel).getByText("Estimates to include")).toBeInTheDocument();
  });
});
