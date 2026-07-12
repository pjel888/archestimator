import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PublisherRosterClient } from "@/components/workshop/publisher/PublisherRosterClient";
import type { PublisherRosterFilters } from "@/lib/publisher/roster-filter";
import type { ProjectPublicationRosterResult } from "@/lib/publisher/roster-repository";

const navigationMocks = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
const searchParamState = vi.hoisted(() => ({ value: "" }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/publisher",
  useRouter: () => navigationMocks,
  useSearchParams: () => new URLSearchParams(searchParamState.value),
}));

vi.mock("@/components/workshop/publisher/PublisherDrawer", () => ({
  PublisherDrawer: ({ row }: { row: { projectName: string } }) => <div data-testid="publisher-detail">Details for {row.projectName}</div>,
}));

vi.mock("@/components/workshop/publisher/PublisherProjectPicker", () => ({
  PublisherProjectPicker: ({ onSelect, open }: { onSelect: (projectId: string) => void; open: boolean }) => open ? (
    <button type="button" onClick={() => onSelect("project-outside-page")}>Choose outside project</button>
  ) : null,
}));

vi.mock("@/components/workshop/publisher/ShareWizard", () => ({
  ShareWizard: ({ open }: { open: boolean }) => open ? <div data-testid="share-wizard" /> : null,
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
    { id: "project-active", name: "Lewis Residence", projectCode: "LR-001" },
    { id: "project-outside-page", name: "Outside Page", projectCode: "OP-004" },
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
      clientName: "Broken Client",
      currentUserRole: "admin",
      expiresAt: null,
      latestActivityAt: null,
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
  totalRows: 2,
  truncated: false,
};

function renderRoster(overrides: Partial<React.ComponentProps<typeof PublisherRosterClient>> = {}) {
  return render(<PublisherRosterClient filters={filters} roster={roster} {...overrides} />);
}

describe("PublisherRosterClient", () => {
  beforeEach(() => {
    navigationMocks.push.mockReset();
    navigationMocks.replace.mockReset();
    searchParamState.value = "";
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("renders client-link cards with the selected project detail", () => {
    renderRoster();

    expect(screen.getByRole("heading", { name: "Client links" })).toBeInTheDocument();
    expect(document.querySelector('[data-publisher-roster-card="project-active"]')).toBeInTheDocument();
    expect(screen.getByText("2 estimates")).toBeInTheDocument();
    expect(screen.getByText("Details for Lewis Residence")).toBeInTheDocument();
    expect(screen.getAllByText("Link unavailable").length).toBeGreaterThan(0);
  });

  it("copies a client link without navigating", async () => {
    renderRoster();

    fireEvent.click(screen.getByRole("button", { name: "Copy client link for Lewis Residence" }));

    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      new URL("/share/active-token", window.location.origin).toString(),
    ));
    expect(navigationMocks.push).not.toHaveBeenCalled();
    expect(navigationMocks.replace).not.toHaveBeenCalled();
  });

  it("writes a drawer route when selecting a different project", () => {
    renderRoster();

    const card = document.querySelector('[data-publisher-roster-card="project-broken-link"]');
    fireEvent.click(card!.querySelector("button")!);

    expect(navigationMocks.push).toHaveBeenCalledWith(
      "/workshop/publisher?drawer=project-broken-link",
      { scroll: false },
    );
  });

  it("opens the project picker and carries its selected project into the wizard route", () => {
    renderRoster();

    fireEvent.click(screen.getByRole("button", { name: "Create client link" }));
    fireEvent.click(screen.getByRole("button", { name: "Choose outside project" }));

    expect(navigationMocks.replace).toHaveBeenCalledWith(
      "/workshop/publisher?project=project-outside-page&wizard=project-outside-page",
      { scroll: false },
    );
  });

  it("normalizes an old access drawer route to the client-link detail", () => {
    searchParamState.value = "project=project-active&drawer=project-active&tab=access";
    renderRoster({ filters: { ...filters, projectId: "project-active" } });

    expect(screen.getByText("Details for Lewis Residence")).toBeInTheDocument();
  });
});
