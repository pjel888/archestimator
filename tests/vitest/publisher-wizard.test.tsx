import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ShareLinkDisplay } from "@/components/workshop/publisher/ShareLinkDisplay";
import { ShareWizard } from "@/components/workshop/publisher/ShareWizard";
import type { ProjectPublicationRosterRow } from "@/lib/publisher/roster-repository";

const navigationMocks = vi.hoisted(() => ({ refresh: vi.fn() }));
const drawerActionMocks = vi.hoisted(() => ({ readPublisherPublicationDrawerData: vi.fn() }));
const publicationActionMocks = vi.hoisted(() => ({
  addSharedLinkRecipients: vi.fn(),
  listSharedLinkRecipients: vi.fn(),
  readSharedLinkEmailDeliveryReadiness: vi.fn(),
  removeSharedLinkRecipient: vi.fn(),
  republishProjectPublication: vi.fn(),
  resendSharedLinkRecipientEmail: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => navigationMocks }));
vi.mock("@/lib/publisher/drawer-actions", () => drawerActionMocks);
vi.mock("@/lib/publication/actions", () => publicationActionMocks);

const row: ProjectPublicationRosterRow = {
  canManagePublication: true,
  clientLinkPath: "/share/token",
  clientName: null,
  currentUserRole: "owner",
  expiresAt: null,
  latestActivityAt: null,
  latestOpenedAt: null,
  linkUnavailableReason: null,
  location: null,
  openCount: 0,
  passwordRequired: false,
  projectCode: null,
  projectId: "project-1",
  projectName: "Kitchen Remodel",
  publicationId: "publication-1",
  publishedAt: "2026-07-11T00:00:00.000Z",
  recipientCount: 0,
  selectedEstimateCount: 1,
  selectedEstimateIds: ["estimate-1"],
  snapshotVersion: 1,
  staleSnapshotWarning: null,
  status: "published",
  tokenCopyAvailable: true,
  workspaceId: "workspace-1",
};

function createPublisherSummary(overrides: Record<string, unknown> = {}) {
  return {
    canManagePublication: true,
    clientLinkPath: "/share/token",
    expiresAt: null,
    latestActivityAt: null,
    latestOpenedAt: null,
    latestRecipientOpen: null,
    locationVisibility: "locality",
    openCount: 0,
    passwordRequired: false,
    projectId: "project-1",
    publicationId: "publication-1",
    publishedAt: "2026-07-11T00:00:00.000Z",
    selectedEstimateCount: 1,
    selectedEstimateIds: ["estimate-1"],
    snapshotVersion: 1,
    staleSnapshotWarning: null,
    status: "published",
    tokenCopyAvailable: true,
    workspaceId: "workspace-1",
    ...overrides,
  };
}

function renderWizard(overrides: Partial<React.ComponentProps<typeof ShareWizard>> = {}) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
      <ShareWizard open row={row} onOpenChange={vi.fn()} {...overrides} />
    </QueryClientProvider>,
  );
}

describe("ShareWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    drawerActionMocks.readPublisherPublicationDrawerData.mockResolvedValue({
      collaborationSummary: null,
      currentUserEmail: "owner@example.test",
      estimateSheets: [{ id: "estimate-1", name: "Base", sheetCode: "E-1" }],
      summary: {
        canManagePublication: true,
        clientLinkPath: "/share/token",
        expiresAt: null,
        latestActivityAt: null,
        latestOpenedAt: null,
        latestRecipientOpen: null,
        locationVisibility: "locality",
        openCount: 0,
        passwordRequired: false,
        projectId: "project-1",
        publicationId: "publication-1",
        publishedAt: "2026-07-11T00:00:00.000Z",
        selectedEstimateCount: 1,
        selectedEstimateIds: ["estimate-1"],
        snapshotVersion: 1,
        staleSnapshotWarning: null,
        status: "published",
        tokenCopyAvailable: true,
        workspaceId: "workspace-1",
      },
    });
    publicationActionMocks.republishProjectPublication.mockResolvedValue({ ok: true, message: "Shared page updated.", clientLinkPath: "/share/token" });
    publicationActionMocks.listSharedLinkRecipients.mockResolvedValue([]);
    publicationActionMocks.readSharedLinkEmailDeliveryReadiness.mockResolvedValue({ configured: false, message: "Email is not configured." });
  });

  it("renders the direct client-link editor regardless of an old URL step", async () => {
    renderWizard({ initialStep: 2 });

    expect(await screen.findByText("Require a password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });

  it("generates an update through the existing publication action", async () => {
    renderWizard();
    await waitFor(() => expect(screen.getByRole("button", { name: "Save changes" })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(publicationActionMocks.republishProjectPublication).toHaveBeenCalledWith({
      clearPassword: true,
      password: undefined,
      projectId: "project-1",
      selectedEstimateIds: ["estimate-1"],
    }));
    expect(await screen.findByDisplayValue(new URL("/share/token", window.location.origin).toString())).toBeInTheDocument();
  });

  it("disables saving when the project has no estimates", async () => {
    drawerActionMocks.readPublisherPublicationDrawerData.mockResolvedValueOnce({
      collaborationSummary: null,
      currentUserEmail: "owner@example.test",
      estimateSheets: [],
      summary: null,
    });
    renderWizard({ row: { ...row, publicationId: null, status: "unpublished" } });

    expect(await screen.findByText("This project has no estimates yet. Add an estimate before creating a client link.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create client link" })).toBeDisabled();
  });

  it("keeps an existing password unless the user removes it", async () => {
    drawerActionMocks.readPublisherPublicationDrawerData.mockResolvedValueOnce({
      collaborationSummary: null,
      currentUserEmail: "owner@example.test",
      estimateSheets: [{ id: "estimate-1", name: "Base", sheetCode: "E-1" }],
      summary: createPublisherSummary({ passwordRequired: true }),
    });
    renderWizard({ initialStep: 3, row: { ...row, passwordRequired: false } });

    const shareButton = await screen.findByRole("button", { name: "Save changes" });
    await waitFor(() => expect(shareButton).not.toBeDisabled());
    fireEvent.click(shareButton);

    await waitFor(() => expect(publicationActionMocks.republishProjectPublication).toHaveBeenCalledWith({
      clearPassword: false,
      password: undefined,
      projectId: "project-1",
      selectedEstimateIds: ["estimate-1"],
    }));
  });

  it("clears an existing password only after the user removes it", async () => {
    drawerActionMocks.readPublisherPublicationDrawerData.mockResolvedValueOnce({
      collaborationSummary: null,
      currentUserEmail: "owner@example.test",
      estimateSheets: [{ id: "estimate-1", name: "Base", sheetCode: "E-1" }],
      summary: createPublisherSummary({ passwordRequired: true }),
    });
    renderWizard({ initialStep: 2, row: { ...row, passwordRequired: false } });

    const passwordToggle = await screen.findByRole("checkbox", { name: /require a password/i });
    await waitFor(() => expect(passwordToggle).toBeChecked());
    fireEvent.click(passwordToggle);
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(publicationActionMocks.republishProjectPublication).toHaveBeenCalledWith({
      clearPassword: true,
      password: undefined,
      projectId: "project-1",
      selectedEstimateIds: ["estimate-1"],
    }));
  });

  it("treats an empty saved estimate scope as all estimates", async () => {
    drawerActionMocks.readPublisherPublicationDrawerData.mockResolvedValueOnce({
      collaborationSummary: null,
      currentUserEmail: "owner@example.test",
      estimateSheets: [
        { id: "estimate-1", name: "Base", sheetCode: "E-1" },
        { id: "estimate-2", name: "Alternate", sheetCode: "E-2" },
      ],
      summary: createPublisherSummary({ selectedEstimateCount: 0, selectedEstimateIds: [] }),
    });
    renderWizard({ initialStep: 3 });

    expect(await screen.findByText("2 / 2 selected")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(publicationActionMocks.republishProjectPublication).toHaveBeenCalledWith({
      clearPassword: true,
      password: undefined,
      projectId: "project-1",
      selectedEstimateIds: ["estimate-1", "estimate-2"],
    }));
  });
});

describe("ShareLinkDisplay", () => {
  it("falls back to copying when native Web Share is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    render(<ShareLinkDisplay clientLinkPath="/share/token" projectName="Kitchen Remodel" />);

    expect(screen.queryByRole("button", { name: "Share" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(new URL("/share/token", window.location.origin).toString()));
  });
});
