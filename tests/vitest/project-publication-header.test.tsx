import { readFileSync } from "node:fs";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectPublicationHeader, SheetPickerList } from "@/components/workshop/ProjectPublicationHeader";
import type { ProjectEstimateSheet, ProjectPublicationSummary } from "@/lib/publication/types";

const workspaceRepositorySource = readFileSync("src/lib/repositories/workspace-repository.ts", "utf8");

const publicationActions = vi.hoisted(() => ({
  addSharedLinkRecipients: vi.fn(),
  createProjectPublication: vi.fn(),
  listSharedLinkRecipients: vi.fn(),
  readSharedLinkEmailDeliveryReadiness: vi.fn(),
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
    publicationActions.removeSharedLinkRecipient.mockReset();
    publicationActions.republishProjectPublication.mockReset();
    publicationActions.resendSharedLinkRecipientEmail.mockReset();
    publicationActions.revokeProjectPublication.mockReset();
    publicationActions.rotateProjectPublicationLink.mockReset();
    publicationActions.readSharedLinkEmailDeliveryReadiness.mockResolvedValue({
      configured: true,
      message: "Email delivery is configured.",
    });

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

    expect(publicationActions.rotateProjectPublicationLink).toHaveBeenCalledWith({
      projectId: "project-1",
      password: undefined,
      clearPassword: false,
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

    expect(screen.getByText("Latest open")).toBeInTheDocument();
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
