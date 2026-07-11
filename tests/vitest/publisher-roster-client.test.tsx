import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PublisherRosterClient } from "@/components/workshop/publisher/PublisherRosterClient";
import type { PublisherRosterFilters } from "@/lib/publisher/roster-filter";
import type { ProjectPublicationRosterResult } from "@/lib/publisher/roster-repository";

const navigationMocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
}));

const searchParamState = vi.hoisted(() => ({
  value: "",
}));

const drawerActionMocks = vi.hoisted(() => ({
  readPublisherPublicationDrawerData: vi.fn(),
}));

const publicationActionMocks = vi.hoisted(() => ({
  addSharedLinkRecipients: vi.fn(),
  listSharedLinkRecipients: vi.fn(),
  loadSharedLinkActivity: vi.fn(),
  readSharedLinkEmailDeliveryReadiness: vi.fn(),
  removeSharedLinkRecipient: vi.fn(),
  republishProjectPublication: vi.fn(),
  resendSharedLinkRecipientEmail: vi.fn(),
  revokeProjectPublication: vi.fn(),
  rotateProjectPublicationLink: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/publisher",
  useRouter: () => ({
    replace: navigationMocks.replace,
    refresh: navigationMocks.refresh,
  }),
  useSearchParams: () => new URLSearchParams(searchParamState.value),
}));

vi.mock("@/lib/publisher/drawer-actions", () => drawerActionMocks);
vi.mock("@/lib/publication/actions", () => publicationActionMocks);
vi.mock("@/components/workshop/publisher/PublisherActivityFeed", () => ({
  PublisherActivityFeed: ({ projectId }: { projectId: string | null }) => (
    <div data-testid="publisher-activity-feed">Activity for {projectId}</div>
  ),
}));
vi.mock("@/components/workshop/publisher/PublisherProjectMembersPanel", () => ({
  PublisherProjectMembersPanel: ({ projectId }: { projectId: string }) => (
    <div data-testid="publisher-project-members-panel">Access for {projectId}</div>
  ),
}));

const filters: PublisherRosterFilters = {
  page: 1,
  pageSize: 25,
  projectId: null,
  search: "",
  status: "all",
};

const roster: ProjectPublicationRosterResult = {
  hasNextPage: false,
  page: 1,
  pageSize: 25,
  projectOptions: [
    {
      id: "project-active",
      name: "Lewis Residence",
      projectCode: "LR-001",
    },
    {
      id: "project-draft",
      name: "Draft Tower",
      projectCode: null,
    },
    {
      id: "project-broken-link",
      name: "Broken Link",
      projectCode: "BR-003",
    },
    {
      id: "project-outside-page",
      name: "Outside Page",
      projectCode: "OP-004",
    },
  ],
  rows: [
    {
      canManagePublication: true,
      clientLinkPath: "/share/active-token",
      clientName: "Lewis Family",
      currentUserRole: "owner",
      expiresAt: null,
      latestActivityAt: "2026-06-25T00:00:00.000Z",
      latestOpenedAt: "2026-06-24T00:00:00.000Z",
      linkUnavailableReason: null,
      location: "Makati",
      openCount: 3,
      passwordRequired: true,
      projectCode: "LR-001",
      projectId: "project-active",
      projectName: "Lewis Residence",
      publicationId: "pub-active",
      publishedAt: "2026-06-20T00:00:00.000Z",
      recipientCount: 2,
      selectedEstimateCount: 2,
      selectedEstimateIds: ["estimate-a", "estimate-b"],
      snapshotVersion: 2,
      staleSnapshotWarning: null,
      status: "published",
      tokenCopyAvailable: true,
      workspaceId: "workspace-1",
    },
    {
      canManagePublication: true,
      clientLinkPath: null,
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
      projectId: "project-draft",
      projectName: "Draft Tower",
      publicationId: null,
      publishedAt: null,
      recipientCount: 0,
      selectedEstimateCount: 0,
      selectedEstimateIds: [],
      snapshotVersion: 0,
      staleSnapshotWarning: null,
      status: "unpublished",
      tokenCopyAvailable: false,
      workspaceId: "workspace-1",
    },
    {
      canManagePublication: true,
      clientLinkPath: null,
      clientName: "Broken Client",
      currentUserRole: "admin",
      expiresAt: null,
      latestActivityAt: "2026-06-19T00:00:00.000Z",
      latestOpenedAt: null,
      linkUnavailableReason: "token-unavailable",
      location: null,
      openCount: 0,
      passwordRequired: false,
      projectCode: "BR-003",
      projectId: "project-broken-link",
      projectName: "Broken Link",
      publicationId: "pub-broken-link",
      publishedAt: "2026-06-19T00:00:00.000Z",
      recipientCount: 0,
      selectedEstimateCount: 0,
      selectedEstimateIds: [],
      snapshotVersion: 1,
      staleSnapshotWarning: null,
      status: "published",
      tokenCopyAvailable: false,
      workspaceId: "workspace-1",
    },
  ],
  totalRows: 3,
  truncated: false,
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
}

function renderPublisherRosterClient(props: {
  filters?: PublisherRosterFilters;
  roster?: ProjectPublicationRosterResult;
} = {}) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <PublisherRosterClient filters={props.filters ?? filters} roster={props.roster ?? roster} />
    </QueryClientProvider>,
  );
}

function createPublisherDrawerSummary(overrides: Record<string, unknown> = {}) {
  return {
    canManagePublication: true,
    clientLinkPath: "/share/active-token",
    expiresAt: null,
    latestActivityAt: "2026-06-25T00:00:00.000Z",
    latestOpenedAt: "2026-06-24T00:00:00.000Z",
    latestRecipientOpen: null,
    locationVisibility: "locality",
    openCount: 3,
    passwordRequired: true,
    projectId: "project-active",
    publicationId: "pub-active",
    publishedAt: "2026-06-20T00:00:00.000Z",
    selectedEstimateCount: 1,
    selectedEstimateIds: ["estimate-a"],
    snapshotVersion: 2,
    staleSnapshotWarning: null,
    status: "published",
    tokenCopyAvailable: true,
    workspaceId: "workspace-1",
    ...overrides,
  };
}

describe("PublisherRosterClient", () => {
  beforeEach(() => {
    navigationMocks.replace.mockReset();
    navigationMocks.refresh.mockReset();
    searchParamState.value = "";
    drawerActionMocks.readPublisherPublicationDrawerData.mockReset();
    publicationActionMocks.addSharedLinkRecipients.mockReset();
    publicationActionMocks.listSharedLinkRecipients.mockReset();
    publicationActionMocks.loadSharedLinkActivity.mockReset();
    publicationActionMocks.readSharedLinkEmailDeliveryReadiness.mockReset();
    publicationActionMocks.removeSharedLinkRecipient.mockReset();
    publicationActionMocks.republishProjectPublication.mockReset();
    publicationActionMocks.resendSharedLinkRecipientEmail.mockReset();
    publicationActionMocks.revokeProjectPublication.mockReset();
    publicationActionMocks.rotateProjectPublicationLink.mockReset();
    drawerActionMocks.readPublisherPublicationDrawerData.mockResolvedValue({
      currentUserEmail: "owner@example.com",
      estimateSheets: [
        { id: "estimate-a", name: "Base", sheetCode: "E-1" },
        { id: "estimate-b", name: "Upgrade", sheetCode: "E-2" },
      ],
      summary: createPublisherDrawerSummary(),
    });
    publicationActionMocks.listSharedLinkRecipients.mockResolvedValue([]);
    publicationActionMocks.readSharedLinkEmailDeliveryReadiness.mockResolvedValue({
      configured: true,
      message: "Email delivery is configured.",
    });
    publicationActionMocks.republishProjectPublication.mockResolvedValue({
      clientLinkPath: "/share/active-token",
      message: "Shared page updated.",
      ok: true,
    });
    publicationActionMocks.rotateProjectPublicationLink.mockResolvedValue({
      clientLinkPath: "/share/new-token",
      message: "New shared link ready.",
      ok: true,
    });
    publicationActionMocks.revokeProjectPublication.mockResolvedValue({
      clientLinkPath: null,
      message: "Shared link turned off.",
      ok: true,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn(async () => undefined),
      },
    });
  });

  it("renders the six primary roster columns and compact row data", () => {
    renderPublisherRosterClient();

    const table = screen.getByRole("table", { name: "Shared link manager roster" });
    expect(within(table).getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "Shared link",
      "Status",
      "Recipients",
      "Latest activity",
      "Estimates",
      "Actions",
    ]);
    expect(within(table).getByRole("rowheader", { name: /Lewis Residence/i })).toBeInTheDocument();
    expect(within(table).getByText("2 recipients")).toBeInTheDocument();
    expect(within(table).getByText("2 sheets")).toBeInTheDocument();
    expect(within(table).getByText("Link unavailable")).toBeInTheDocument();
  });

  it("uses statically generated desktop view classes for card and table toggles", () => {
    renderPublisherRosterClient();

    const tableView = screen.getByRole("table", { name: "Shared link manager roster" }).closest("div.rounded-xs");
    const cardGrid = screen.getAllByText("Lewis Residence")
      .map((element) => element.closest("div.grid-cols-2"))
      .find((element) => element?.className.includes("xl:grid-cols-2"));
    const cardView = cardGrid?.parentElement;

    expect(cardView).toHaveClass("min-[768px]:block");
    expect(tableView).toHaveClass("min-[768px]:hidden");

    fireEvent.click(screen.getByRole("button", { name: "Table" }));

    expect(cardView).toHaveClass("min-[768px]:hidden");
    expect(tableView).toHaveClass("min-[768px]:flex");
  });

  it("keeps project filter options independent of the current paginated row slice", () => {
    renderPublisherRosterClient();

    fireEvent.click(screen.getByRole("combobox", { name: "Filter by project" }));

    expect(screen.getByRole("option", { name: "Outside Page (OP-004)" })).toBeInTheDocument();
  });

  it("opens the share flow for projects outside the current page", () => {
    renderPublisherRosterClient();

    fireEvent.click(screen.getByRole("button", { name: "Share a project" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Outside Page (OP-004)" }));

    expect(navigationMocks.replace).toHaveBeenCalledWith(
      "/workshop/publisher?project=project-outside-page&wizard=project-outside-page",
      { scroll: false },
    );
  });

  it("copies the share URL without navigating the manager route", async () => {
    renderPublisherRosterClient();

    fireEvent.click(screen.getByRole("button", { name: "Copy shared link for Lewis Residence" }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        new URL("/share/active-token", window.location.origin).toString(),
      );
    });
    expect(navigationMocks.replace).not.toHaveBeenCalled();
    expect(await screen.findByText("pub-active: copied")).toBeInTheDocument();
  });

  it("routes manager previews without recording client opens", () => {
    renderPublisherRosterClient();

    const table = screen.getByRole("table", { name: "Shared link manager roster" });
    expect(within(table).getByRole("link", { name: "Preview shared page for Lewis Residence" })).toHaveAttribute(
      "href",
      "/workshop/publisher/preview/project-active",
    );
  });

  it("persists status filters through the route query", () => {
    renderPublisherRosterClient();

    fireEvent.click(screen.getByRole("tab", { name: "Stale" }));

    expect(navigationMocks.replace).toHaveBeenCalledWith("/workshop/publisher?status=stale", { scroll: false });
  });

  it("preserves a project-scoped Publisher deep link when status filters change", () => {
    searchParamState.value = "project=project-active";
    renderPublisherRosterClient({
      filters: {
        ...filters,
        projectId: "project-active",
      },
    });

    fireEvent.click(screen.getByRole("tab", { name: "Stale" }));

    expect(navigationMocks.replace).toHaveBeenCalledWith("/workshop/publisher?project=project-active&status=stale", {
      scroll: false,
    });
  });

  it("opens the Access drawer tab from a project-scoped Publisher deep link", async () => {
    searchParamState.value = "project=project-active&drawer=project-active&tab=access";
    renderPublisherRosterClient({
      filters: {
        ...filters,
        projectId: "project-active",
      },
    });

    expect(await screen.findByRole("dialog", { name: "Lewis Residence" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Team access" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("publisher-project-members-panel")).toHaveTextContent("Access for project-active");
  });

  it("clears stale drawer URL intent when a project-scoped Publisher drawer closes", async () => {
    searchParamState.value = "project=project-active&drawer=project-active&tab=access";
    renderPublisherRosterClient({
      filters: {
        ...filters,
        projectId: "project-active",
      },
    });

    expect(await screen.findByRole("dialog", { name: "Lewis Residence" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close publisher drawer" }));

    expect(navigationMocks.replace).toHaveBeenCalledWith("/workshop/publisher?project=project-active", {
      scroll: false,
    });
  });

  it("opens the Publisher detail drawer without changing roster URL filters", async () => {
    renderPublisherRosterClient();

    fireEvent.click(screen.getByRole("button", { name: "Manage shared link for Lewis Residence" }));

    expect(await screen.findByRole("dialog", { name: "Lewis Residence" })).toBeInTheDocument();
    await waitFor(() => {
      expect(drawerActionMocks.readPublisherPublicationDrawerData).toHaveBeenCalledWith("project-active");
    });
    expect(screen.getByRole("tab", { name: "Recipients" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Sheets" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Activity" })).toBeInTheDocument();
    expect(navigationMocks.replace).not.toHaveBeenCalled();
  });

  it("returns focus to the Manage trigger after the manual drawer closes", async () => {
    renderPublisherRosterClient();

    const manageButton = screen.getByRole("button", { name: "Manage shared link for Lewis Residence" });
    manageButton.focus();
    fireEvent.click(manageButton);
    expect(await screen.findByRole("dialog", { name: "Lewis Residence" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close publisher drawer" }));

    await waitFor(() => {
      expect(manageButton).toHaveFocus();
    });
  });

  it("saves shared link estimate scope through the existing republish action and refreshes the roster", async () => {
    renderPublisherRosterClient();

    fireEvent.click(screen.getByRole("button", { name: "Manage shared link for Lewis Residence" }));
    expect(await screen.findByRole("dialog", { name: "Lewis Residence" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Sheets" }));
    fireEvent.click(await screen.findByRole("checkbox", { name: /Upgrade/ }));
    fireEvent.click(screen.getByRole("button", { name: "Update shared page" }));

    await waitFor(() => {
      expect(publicationActionMocks.republishProjectPublication).toHaveBeenCalledWith({
        locationVisibility: "locality",
        projectId: "project-active",
        selectedEstimateIds: ["estimate-a", "estimate-b"],
      });
    });
    await waitFor(() => {
      expect(navigationMocks.refresh).toHaveBeenCalledTimes(1);
    });
  });

});
