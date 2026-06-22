import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectsPageClient, type ProjectListItem } from "./projects-page-test-harness";
import type { Tables } from "@/lib/supabase/types";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  setProjectFavorite: vi.fn(async () => undefined),
}));

vi.mock("@/hooks/use-navigation-router", () => ({
  useNavigationRouter: () => ({
    refresh: mocks.refresh,
    push: mocks.push,
    replace: mocks.replace,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mocks.refresh,
    push: mocks.push,
    replace: mocks.replace,
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/lib/workshop/actions", () => ({
  setProjectFavorite: mocks.setProjectFavorite,
}));

vi.mock("@/lib/projects/actions", () => ({
  previewBulkDeleteProjects: vi.fn(async (input: { projectIds: string[] }) => ({
    ok: true,
    targetType: "project",
    ids: input.projectIds,
    eligibleIds: input.projectIds,
    previewHash: "preview-hash",
    summary: { requestedCount: input.projectIds.length, eligibleCount: input.projectIds.length, blockedCount: 0 },
    issues: [],
    blocked: [],
    storageTargets: [],
  })),
  executeBulkDeleteProjects: vi.fn(async (input: { projectIds: string[] }) => ({
    ok: true,
    targetType: "project",
    ids: input.projectIds,
    deletedIds: input.projectIds,
    summary: { requestedCount: input.projectIds.length, eligibleCount: input.projectIds.length, blockedCount: 0 },
    issues: [],
    blocked: [],
    storageTargets: [],
  })),
}));

vi.mock("@/lib/collaboration/pending-invite-actions", () => ({
  acceptPendingInvitationById: vi.fn(async () => undefined),
}));

function project(overrides: Partial<Tables<"projects">> = {}): Tables<"projects"> {
  return {
    id: overrides.id ?? "00000000-0000-4000-8000-000000000001",
    workspace_id: overrides.workspace_id ?? "00000000-0000-4000-8000-100000000001",
    name: overrides.name ?? "Project 1",
    client_name: "client_name" in overrides ? overrides.client_name ?? null : "Client",
    project_code: overrides.project_code ?? "P-001",
    location: overrides.location ?? "Manila",
    currency_code: overrides.currency_code ?? "PHP",
    metadata: overrides.metadata ?? {},
    created_at: overrides.created_at ?? "2026-01-01T00:00:00.000Z",
    updated_at: overrides.updated_at ?? "2026-01-02T00:00:00.000Z",
    created_by: overrides.created_by ?? "00000000-0000-4000-8000-200000000001",
  };
}

function item(overrides: Partial<Tables<"projects">> = {}): ProjectListItem {
  return {
    project: project(overrides),
    accessKind: "owned",
    currentUserRole: "owner",
    ownerWorkspaceName: null,
    pendingInviteCount: 0,
    publicationSummary: null,
    sharedEstimateCount: 0,
    favoriteEstimateSheets: [],
  };
}

function liveProjectNames() {
  return within(screen.getByLabelText("Live projects"))
    .getAllByRole("article")
    .map((card) => card.getAttribute("aria-label")?.replace(" project, owned access", ""));
}

function projectDateGroupLabels() {
  return Array.from(screen.getByLabelText("Live projects").querySelectorAll("[data-project-group-label]"))
    .map((label) => label.textContent);
}

function projectDateGroupLabelWrapper(label: string) {
  return screen.getByText(label).closest("[data-project-group-label]")?.parentElement;
}

function localNoonIsoDaysAgo(daysAgo: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

function currentProjectDateGroupLabel() {
  const date = new Date();
  const month = new Intl.DateTimeFormat("en", { month: "long" }).format(date);
  return `${date.getFullYear()} · ${month}`;
}

async function selectSortField(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole("combobox", { name: "Sort field" }));
  await user.click(screen.getByRole("option", { name: label }));
}

async function selectSortDirection(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole("combobox", { name: "Sort direction" }));
  await user.click(screen.getByRole("option", { name: label }));
}

describe("ProjectsPageClient sort controls", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.refresh.mockClear();
    mocks.push.mockClear();
    mocks.replace.mockClear();
  });

  it("renders View and Sort controls alongside Add without changing untouched order", () => {
    render(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "Zulu Project", updated_at: "2026-02-01T00:00:00.000Z" }),
          item({ id: "p2", name: "Alpha Project", updated_at: "2026-02-01T00:00:00.000Z" }),
        ]}
      />,
    );

    expect(screen.getByRole("combobox", { name: "View" })).toHaveAttribute("title", "Large");
    expect(screen.getByRole("combobox", { name: "Sort field" })).toHaveAttribute("title", "Last updated");
    expect(screen.getByRole("combobox", { name: "Sort direction" })).toHaveAttribute("title", "Newest first");
    for (const controlName of ["View", "Sort field", "Sort direction"]) {
      const control = screen.getByRole("combobox", { name: controlName });
      expect(control).toHaveClass("border-0", "gap-1.5", "px-1.5");
      expect(control).not.toHaveClass("border-hairline");
      expect(control).not.toHaveClass("px-2");
    }
    const viewDivider = screen.getByRole("combobox", { name: "View" }).parentElement?.nextElementSibling;
    expect(viewDivider).toHaveAttribute("data-project-toolbar-view-divider", "");
    expect(viewDivider).toHaveAttribute("aria-hidden", "true");
    expect(viewDivider).toHaveClass("h-4", "w-px", "shrink-0", "bg-hairline");
    expect(screen.getByRole("button", { name: "Add projects" }).parentElement?.parentElement).toHaveClass("ml-auto");
    expect(liveProjectNames()).toEqual(["Zulu Project", "Alpha Project"]);
    expect(projectDateGroupLabels()).toEqual(["2026 · February"]);
    expect(screen.getByLabelText("2026 · February")).toBeInTheDocument();
    expect(screen.getByText("2026 · February")).toHaveClass("border-x", "border-b", "text-brand-orange-dark");
    expect(screen.getByText("2026 · February").getAttribute("style")).toContain(
      "color-mix(in srgb, var(--brand-orange) 25%, white)",
    );
    expect(screen.getByText("2026 · February").getAttribute("style")).toContain(
      "color-mix(in srgb, var(--brand-orange) 35%, white)",
    );
    expect(screen.getByText("2026 · February")).not.toHaveClass("bg-hairline");
    expect(screen.getByLabelText("2026 · February").querySelector("[data-project-group-rule]")?.getAttribute("style")).toContain(
      "color-mix(in srgb, var(--brand-orange) 35%, white)",
    );
  });

  it("sorts by created date and flips date direction labels", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "Older", created_at: "2026-01-01T00:00:00.000Z" }),
          item({ id: "p2", name: "Newer", created_at: "2026-03-01T00:00:00.000Z" }),
          item({ id: "p3", name: "Middle", created_at: "2026-02-01T00:00:00.000Z" }),
        ]}
      />,
    );

    await selectSortField(user, "Date created");
    expect(liveProjectNames()).toEqual(["Newer", "Middle", "Older"]);
    expect(projectDateGroupLabels()).toEqual([
      "2026 · March",
      "2026 · February",
      "2026 · January",
    ]);
    expect(screen.getByLabelText("2026 · March")).toBeInTheDocument();

    await selectSortDirection(user, "Oldest first");
    expect(screen.getByRole("combobox", { name: "Sort direction" })).toHaveAttribute("title", "Oldest first");
    expect(liveProjectNames()).toEqual(["Older", "Middle", "Newer"]);
    expect(projectDateGroupLabels()).toEqual([
      "2026 · January",
      "2026 · February",
      "2026 · March",
    ]);
  });

  it("groups same-month date sorted projects under one divider", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "March Later", created_at: "2026-03-28T00:00:00.000Z" }),
          item({ id: "p2", name: "February Project", created_at: "2026-02-12T00:00:00.000Z" }),
          item({ id: "p3", name: "March Earlier", created_at: "2026-03-02T00:00:00.000Z" }),
        ]}
      />,
    );

    await selectSortField(user, "Date created");

    const marchGroup = screen.getByLabelText("2026 · March");
    expect(within(marchGroup).getAllByRole("article").map((card) => card.getAttribute("aria-label"))).toEqual([
      "March Later project, owned access",
      "March Earlier project, owned access",
    ]);
    expect(screen.getByLabelText("2026 · February")).toBeInTheDocument();
  });

  it("uses the small thumbnail width for date flags in list view", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "List First", updated_at: "2026-02-01T00:00:00.000Z" }),
          item({ id: "p2", name: "List Second", updated_at: "2026-02-02T00:00:00.000Z" }),
        ]}
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "View" }));
    await user.click(screen.getByRole("option", { name: "List" }));

    expect(screen.getByLabelText("Live projects")).toHaveAttribute("data-project-view-mode", "list");
    expect(projectDateGroupLabelWrapper("2026 · February")).toHaveClass(
      "grid",
      "grid-cols-[repeat(auto-fill,minmax(132px,1fr))]",
      "gap-2",
    );

    await user.click(screen.getByRole("combobox", { name: "View" }));
    await user.click(screen.getByRole("option", { name: "Large" }));
    await waitFor(() => {
      expect(screen.getByLabelText("Live projects")).toHaveAttribute("data-project-view-mode", "large");
    });
  });

  it("keeps default date groups contiguous even when incoming projects are shuffled", () => {
    render(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "March First", updated_at: "2026-03-20T00:00:00.000Z" }),
          item({ id: "p2", name: "January Project", updated_at: "2026-01-20T00:00:00.000Z" }),
          item({ id: "p3", name: "March Second", updated_at: "2026-03-02T00:00:00.000Z" }),
        ]}
      />,
    );

    expect(projectDateGroupLabels()).toEqual(["2026 · March", "2026 · January"]);
    expect(within(screen.getByLabelText("2026 · March")).getAllByRole("article").map((card) => card.getAttribute("aria-label"))).toEqual([
      "March First project, owned access",
      "March Second project, owned access",
    ]);
  });

  it("sorts text fields with numeric/case-insensitive order and nulls last", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "Project 10", client_name: "Beta" }),
          item({ id: "p2", name: "project 2", client_name: "alpha" }),
          item({ id: "p3", name: "Project 1", client_name: null }),
        ]}
      />,
    );

    await selectSortField(user, "Client");
    expect(screen.getByRole("combobox", { name: "Sort direction" })).toHaveAttribute("title", "A to Z");
    expect(liveProjectNames()).toEqual(["project 2", "Project 10", "Project 1"]);
    expect(projectDateGroupLabels()).toEqual(["alpha", "Beta", "No client yet"]);
    expect(screen.getByLabelText("alpha").querySelector("[data-project-group-label]")).toHaveClass(
      "border-x",
      "border-b",
      "text-brand-orange-dark",
    );
    expect(screen.getByLabelText("alpha").querySelector("[data-project-group-label]")?.getAttribute("style")).toContain(
      "color-mix(in srgb, var(--brand-orange) 25%, white)",
    );
    expect(screen.getByLabelText("alpha").querySelector("[data-project-group-label]")?.getAttribute("style")).toContain(
      "color-mix(in srgb, var(--brand-orange) 35%, white)",
    );
    expect(within(screen.getByLabelText("alpha")).getByRole("article")).toHaveAttribute(
      "aria-label",
      "project 2 project, owned access",
    );
    expect(within(screen.getByLabelText("Beta")).getByRole("article")).toHaveAttribute(
      "aria-label",
      "Project 10 project, owned access",
    );
    expect(within(screen.getByLabelText("No client yet")).getByRole("article")).toHaveAttribute(
      "aria-label",
      "Project 1 project, owned access",
    );

    await selectSortDirection(user, "Z to A");
    expect(liveProjectNames()).toEqual(["Project 10", "project 2", "Project 1"]);
    expect(projectDateGroupLabels()).toEqual(["Beta", "alpha", "No client yet"]);

    await selectSortField(user, "Project name");
    expect(liveProjectNames()).toEqual(["Project 1", "project 2", "Project 10"]);
    expect(projectDateGroupLabels()).toEqual([]);
  });

  it("uses year-month buckets for current projects", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "Today Project", created_at: localNoonIsoDaysAgo(0) }),
        ]}
      />,
    );

    await selectSortField(user, "Date created");

    expect(projectDateGroupLabels()).toEqual([currentProjectDateGroupLabel()]);
    expect(screen.queryByLabelText("Today")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Earlier this month")).not.toBeInTheDocument();
  });

  it("composes search and sort without clearing selected rows", async () => {
    const user = userEvent.setup();
    render(
      <ProjectsPageClient
        projects={[
          item({ id: "p1", name: "Clinic 10", client_name: "Beta" }),
          item({ id: "p2", name: "Clinic 2", client_name: "Alpha" }),
          item({ id: "p3", name: "Residence 1", client_name: "Zeta" }),
        ]}
      />,
    );

    await user.click(within(screen.getByLabelText("Clinic 10 project, owned access")).getByRole("checkbox", { name: "Select Clinic 10 for deletion" }));
    await selectSortField(user, "Project name");
    expect(screen.getByRole("region", { name: "Bulk action toolbar" })).toHaveTextContent("1 selected");
    expect(within(screen.getByLabelText("Clinic 10 project, owned access")).getByRole("checkbox", { name: "Select Clinic 10 for deletion" })).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Show projects search" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search projects" }), { target: { value: "clinic" } });

    expect(liveProjectNames()).toEqual(["Clinic 2", "Clinic 10"]);
    expect(screen.getByRole("region", { name: "Bulk action toolbar" })).toHaveTextContent("1 selected");
  });

  it("keeps project controls available for empty states and search misses", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ProjectsPageClient projects={[]} />);

    expect(screen.getByRole("combobox", { name: "View" })).not.toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Sort field" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Sort direction" })).toBeInTheDocument();
    expect(within(screen.getByLabelText("Live projects")).queryAllByRole("article")).toHaveLength(0);

    rerender(<ProjectsPageClient projects={[item({ id: "p1", name: "Live Project" })]} />);
    await user.click(screen.getByRole("button", { name: "Show projects search" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search projects" }), { target: { value: "no-match" } });

    expect(screen.getByRole("combobox", { name: "View" })).not.toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Sort field" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Sort direction" })).toBeInTheDocument();
    expect(within(screen.getByLabelText("Live projects")).queryAllByRole("article")).toHaveLength(0);
    expect(screen.queryByText("No projects match your search")).not.toBeInTheDocument();
  });

  it("shows created date metadata only on large live cards", async () => {
    const user = userEvent.setup();
    render(<ProjectsPageClient projects={[item({ id: "p1", name: "Created Visible", created_at: "2026-01-05T00:00:00.000Z" })]} />);

    const createdDate = screen.getByText("Jan 5");
    expect(screen.getByText("Created")).toBeInTheDocument();
    expect(createdDate.closest("[data-project-card-date-band]")).toHaveAttribute(
      "title",
      "Created January 5, 2026; updated January 2, 2026",
    );

    await user.click(screen.getByRole("combobox", { name: "View" }));
    await user.click(screen.getByRole("option", { name: "Medium" }));

    await waitFor(() => expect(screen.queryByText("Jan 5")).not.toBeInTheDocument());
  });
});
