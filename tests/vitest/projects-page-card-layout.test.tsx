import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProjectsPageClient, type ProjectListItem } from "./projects-page-test-harness";
import type { ProjectFavoriteEstimateSheetSummary } from "@/lib/repositories/workspace-repository";
import type { ProjectPublicationListSummary } from "@/lib/publication/types";
import type { Tables } from "@/lib/supabase/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/workshop/actions", () => ({
  setProjectFavorite: vi.fn(async () => undefined),
}));

vi.mock("@/lib/projects/actions", () => ({
  previewBulkDeleteProjects: vi.fn(),
  executeBulkDeleteProjects: vi.fn(),
}));

const PROJECT_FIXTURE = {
  id: "11111111-1111-4111-8111-111111111111",
  workspace_id: "22222222-2222-4222-8222-222222222222",
  name: "Lewis Residence",
  client_name: "Lewis Family",
  location: "Quezon City, Metro Manila, Philippines",
  project_code: "AE-LR-001",
  currency_code: "PHP",
  metadata: {},
  created_at: "2026-05-20T00:00:00.000Z",
  updated_at: "2026-05-26T00:00:00.000Z",
  created_by: null,
} satisfies Tables<"projects">;

function favoriteSheet(name: string): ProjectFavoriteEstimateSheetSummary {
  return {
    id: `00000000-0000-4000-8000-${name.toLowerCase().replaceAll(" ", "0").slice(0, 12).padEnd(12, "0")}`,
    project_id: PROJECT_FIXTURE.id,
    name,
    sheet_code: null,
    updated_at: "2026-05-26T00:00:00.000Z",
    favoriteCreatedAt: "2026-05-26T00:00:00.000Z",
  };
}

function projectItem(
  project: Tables<"projects">,
  favoriteEstimateSheets: readonly ProjectFavoriteEstimateSheetSummary[] = [],
  publicationSummary: ProjectPublicationListSummary | null = null,
): ProjectListItem {
  return {
    project,
    accessKind: "owned",
    currentUserRole: "owner",
    favoriteEstimateSheets: [...favoriteEstimateSheets],
    pendingInviteCount: 0,
    publicationSummary,
    sharedEstimateCount: 0,
  };
}

describe("Projects page card layout", () => {
  it("keeps large cards stable while favorite sheet details reveal as an overlay", () => {
    window.localStorage.setItem("archestimator_projects_view_mode_v1", "large");

    render(
      <ProjectsPageClient
        projects={[
          projectItem(PROJECT_FIXTURE, [
            favoriteSheet("Concept Budget"),
            favoriteSheet("Kitchen Fit-out Estimate"),
          ]),
        ]}
      />,
    );

    const card = screen.getByLabelText("Lewis Residence project, owned access");
    expect(card).toHaveClass("min-h-[360px]");
    expect(card).toHaveClass("workshop-project-card-glass");

    const tileContent = card.querySelector("[data-project-card-tile-content]");
    expect(tileContent).not.toBeNull();
    expect(tileContent).toHaveClass("p-0");
    expect(tileContent).toHaveClass("justify-between");
    expect(tileContent).not.toHaveClass("p-3");

    const titleBlock = card.querySelector("[data-project-card-title-block]");
    expect(titleBlock).not.toBeNull();
    expect(titleBlock).toHaveClass("p-2");
    expect(titleBlock).not.toHaveClass("pt-2");
    expect(titleBlock).not.toHaveClass("pr-2");
    expect(within(titleBlock as HTMLElement).getByText("Quezon City, Metro Manila, Philippines")).toBeInTheDocument();

    const thumbnail = card.querySelector("[data-project-card-thumbnail]");
    expect(thumbnail).toHaveClass("aspect-[4/3]");
    expect(thumbnail).toHaveClass("shrink-0");

    const hoverReveal = card.querySelector("[data-project-card-hover-reveal]");
    expect(hoverReveal).not.toBeNull();
    expect(hoverReveal).toHaveClass("absolute");
    expect(hoverReveal).toHaveClass("inset-0");
    expect(hoverReveal).toHaveClass("workshop-project-card-thumbnail-reveal");
    expect(hoverReveal).toHaveClass("p-2");
    expect(hoverReveal).not.toHaveClass("p-4");
    expect(hoverReveal).toHaveClass("pointer-events-none");
    expect(hoverReveal).toHaveClass("opacity-0");
    expect(hoverReveal).toHaveClass("group-hover/card:pointer-events-auto");
    expect(hoverReveal).toHaveClass("group-hover/card:opacity-100");

    const favoriteTray = card.querySelector("[data-project-card-favorite-sheets]");
    expect(favoriteTray).not.toBeNull();
    expect(favoriteTray).not.toHaveClass("min-h-[76px]");
    expect(within(favoriteTray as HTMLElement).queryByText("Favorite sheets")).not.toBeInTheDocument();

    expect(within(favoriteTray as HTMLElement).getByRole("link", { name: "Concept Budget" })).toHaveAttribute(
      "href",
      "/workshop/projects/11111111-1111-4111-8111-111111111111/estimates/00000000-0000-4000-8000-concept0budg",
    );
    expect(
      within(favoriteTray as HTMLElement).getByRole("link", { name: "Kitchen Fit-out Estimate" }),
    ).toHaveAttribute(
      "href",
      "/workshop/projects/11111111-1111-4111-8111-111111111111/estimates/00000000-0000-4000-8000-kitchen0fit-",
    );

    const metaStack = card.querySelector("[data-project-card-meta-stack]");
    expect(metaStack).not.toBeNull();
    expect(metaStack).not.toHaveClass("pb-3");
    expect(metaStack).not.toHaveClass("pb-2");

    const dateBand = card.querySelector("[data-project-card-date-band]");
    expect(dateBand).not.toBeNull();
    expect(dateBand).toHaveClass("grid");
    expect(dateBand).toHaveClass("grid-cols-2");
    expect(dateBand).toHaveClass("gap-1");
    expect(dateBand).not.toHaveClass("border-x");
    expect(dateBand).toHaveClass("border-t");
    expect(dateBand).not.toHaveClass("border-b");
    const createdDateCell = dateBand?.querySelector('[data-project-card-date-cell="created"]');
    const updatedDateCell = dateBand?.querySelector('[data-project-card-date-cell="updated"]');
    expect(createdDateCell).toHaveClass("rounded-xs", "border", "border-hairline", "bg-surfaceMuted");
    expect(updatedDateCell).toHaveClass("rounded-xs", "border", "border-hairline", "bg-surfaceMuted");
    expect(within(dateBand as HTMLElement).getByText("Created")).toHaveClass("text-[8px]");
    expect(within(dateBand as HTMLElement).getByText("Updated")).toHaveClass("text-[8px]");
    expect(within(dateBand as HTMLElement).getByText("May 20")).toHaveClass("text-ink");
    expect(within(dateBand as HTMLElement).getByText("May 26")).toHaveClass("text-ink");
    expect(within(metaStack as HTMLElement).queryByText("Created May 20")).not.toBeInTheDocument();
    expect(within(metaStack as HTMLElement).queryByText("Updated May 26")).not.toBeInTheDocument();

    const openAction = within(card).getByRole("link", { name: "Open" });
    expect(openAction.textContent).toBe("");
    expect(openAction).toHaveClass("size-6");
    expect(openAction).toHaveClass("border-hairline");
    expect(openAction).toHaveClass("workshop-project-card-control");
    expect(openAction.querySelector('[data-project-card-open-icon="square-out"]')).not.toBeNull();

    const footer = card.querySelector("[data-project-card-footer]");
    expect(footer).not.toBeNull();
    expect(footer).toHaveClass("mt-0");
    expect(footer).toHaveClass("p-2");
    expect(footer).not.toHaveClass("mt-auto");
    expect(footer).not.toHaveClass("pt-3");
  });

  it("places shared link details in the reference title and meta stack instead of the generic status row", () => {
    window.localStorage.setItem("archestimator_projects_view_mode_v1", "large");

    render(
      <ProjectsPageClient
        projects={[
          projectItem(PROJECT_FIXTURE, [], {
            status: "published",
            clientLinkPath: "/p/lewis-residence",
            openCount: 4,
            latestOpenedAt: null,
            passwordRequired: true,
          }),
        ]}
      />,
    );

    const card = screen.getByLabelText("Lewis Residence project, owned access");
    const statusSlot = card.querySelector("[data-project-card-status-slot]");
    expect(statusSlot).not.toHaveTextContent("Shared link");

    expect(card.querySelector("[data-project-card-shared-link-indicator]")).toBeNull();
    expect(card.querySelector("[data-project-card-details-action]")).not.toBeNull();
    expect(within(card).getByRole("button", { name: "Expand Lewis Residence details" })).toBeInTheDocument();

    expect(card.querySelector("[data-project-card-shared-link-meta]")).toBeNull();
    expect(card).not.toHaveTextContent("4 opens");
  });
});
