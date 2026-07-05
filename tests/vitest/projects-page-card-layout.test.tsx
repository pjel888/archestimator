import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProjectsPageClient, type ProjectListItem } from "./projects-page-test-harness";
import type { ProjectCardEstimateSheetSummary } from "@/lib/repositories/workspace-repository";
import type { ProjectPublicationListSummary } from "@/lib/publication/types";
import type { ProjectRow } from "@/lib/types/database";

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
} satisfies ProjectRow;

function estimateSheet(name: string): ProjectCardEstimateSheetSummary {
  return {
    id: `00000000-0000-4000-8000-${name.toLowerCase().replaceAll(" ", "0").slice(0, 12).padEnd(12, "0")}`,
    project_id: PROJECT_FIXTURE.id,
    name,
    sheet_code: null,
    updated_at: "2026-05-26T00:00:00.000Z",
  };
}

function projectItem(
  project: ProjectRow,
  estimateSheets: readonly ProjectCardEstimateSheetSummary[] = [],
  publicationSummary: ProjectPublicationListSummary | null = null,
): ProjectListItem {
  return {
    project,
    accessKind: "owned",
    currentUserRole: "owner",
    favoriteEstimateSheets: [],
    estimateSheets: [...estimateSheets],
    pendingInviteCount: 0,
    publicationSummary,
    sharedEstimateCount: 0,
  };
}

describe("Projects page card layout", () => {
  it("prioritizes uploaded thumbnails, map thumbnails, and generated fallback gradients", () => {
    window.localStorage.setItem("archestimator_projects_view_mode_v1", "large");

    const uploadedProject = {
      ...PROJECT_FIXTURE,
      id: "11111111-1111-4111-8111-111111111112",
      metadata: {
        projectImageUrl: "/api/projects/images?path=project-images/full.webp",
        projectImageThumbnailUrl: "/api/projects/images?path=project-images/thumb.webp",
      },
    } satisfies ProjectRow;

    const { rerender } = render(
      <ProjectsPageClient
        googleMapsApiKey="test-google-browser-key"
        projects={[projectItem(uploadedProject)]}
      />,
    );

    let card = screen.getByLabelText("Lewis Residence project, owned access");
    let thumbnail = card.querySelector("[data-project-card-thumbnail]");
    expect(thumbnail).toHaveClass("rounded-[var(--project-card-inner-radius)]");
    expect(thumbnail).not.toHaveClass("rounded-t-[var(--project-card-inner-radius)]");
    expect(thumbnail?.querySelector("img")?.getAttribute("src")).toContain("/api/projects/images?path=project-images/thumb.webp");
    expect(thumbnail?.querySelector("img")?.getAttribute("src")).not.toContain("staticmap");
    expect(thumbnail?.querySelector("[data-project-card-generated-gradient]")).toBeNull();

    rerender(
      <ProjectsPageClient
        googleMapsApiKey="test-google-browser-key"
        projects={[projectItem(PROJECT_FIXTURE)]}
      />,
    );

    card = screen.getByLabelText("Lewis Residence project, owned access");
    thumbnail = card.querySelector("[data-project-card-thumbnail]");
    const mapImage = thumbnail?.querySelector("img");
    expect(mapImage?.getAttribute("src")).toContain("https://maps.googleapis.com/maps/api/staticmap");
    expect(mapImage?.getAttribute("src")).toContain("Quezon+City");
    expect(thumbnail?.querySelector("[data-project-card-generated-gradient]")).toBeNull();

    if (!mapImage) throw new Error("Expected map thumbnail image");
    fireEvent.error(mapImage);

    expect(thumbnail?.querySelector("img")).toBeNull();
    expect(within(thumbnail as HTMLElement).getByText("LR")).toBeInTheDocument();
    expect(thumbnail?.querySelector("[data-project-card-generated-gradient]")).not.toBeNull();

    rerender(<ProjectsPageClient projects={[projectItem({ ...PROJECT_FIXTURE, location: null })]} />);

    card = screen.getByLabelText("Lewis Residence project, owned access");
    thumbnail = card.querySelector("[data-project-card-thumbnail]");
    expect(thumbnail?.querySelector("img")).toBeNull();
    expect(within(thumbnail as HTMLElement).getByText("LR")).toBeInTheDocument();
    expect(thumbnail?.querySelector("[data-project-card-generated-gradient]")).not.toBeNull();
  });

  it("keeps large cards stable while estimate sheet details reveal as an overlay", () => {
    window.localStorage.setItem("archestimator_projects_view_mode_v1", "large");

    render(
      <ProjectsPageClient
        projects={[
          projectItem(PROJECT_FIXTURE, [
            estimateSheet("Concept Budget"),
            estimateSheet("Kitchen Fit-out Estimate"),
          ]),
        ]}
      />,
    );

    const card = screen.getByLabelText("Lewis Residence project, owned access");
    expect(card).toHaveClass("min-h-[372px]");
    expect(card).toHaveClass("workshop-project-card-glass");

    // Translucent TOP STRIP holds the hover-revealed controls (select left,
    // star/group/kebab right) in the glass band above the inset inner panel.
    const topStrip = card.querySelector("[data-project-card-top-strip]");
    expect(topStrip).not.toBeNull();
    expect(topStrip).toHaveClass("flex");
    expect(within(topStrip as HTMLElement).getByRole("checkbox", { name: "Select Lewis Residence for deletion" })).toBeInTheDocument();
    expect(within(topStrip as HTMLElement).getByRole("button", { name: "Expand Lewis Residence details" })).toBeInTheDocument();

    // INSET translucent inner panel wraps the thumbnail + content (no second blur).
    const inner = card.querySelector("[data-project-card-inner]");
    expect(inner).not.toBeNull();
    expect(inner).toHaveClass("workshop-project-card-inner");

    const tileContent = card.querySelector("[data-project-card-tile-content]");
    expect(tileContent).not.toBeNull();
    expect(tileContent).toHaveClass("p-2");
    expect(tileContent).toHaveClass("justify-between");
    expect(tileContent).not.toHaveClass("p-0");
    expect(tileContent).not.toHaveClass("p-3");

    // Title block is now text-only (client / name / location); the kebab moved
    // up to the top strip, so it is no longer inside the title block.
    const titleBlock = card.querySelector("[data-project-card-title-block]");
    expect(titleBlock).not.toBeNull();
    expect(titleBlock).toHaveClass("min-h-[70px]");
    expect(titleBlock).not.toHaveClass("p-2");
    expect(titleBlock).not.toHaveClass("pt-2");
    expect(titleBlock).not.toHaveClass("pr-2");
    expect(within(titleBlock as HTMLElement).getByText("Quezon City, Metro Manila, Philippines")).toBeInTheDocument();
    expect(within(titleBlock as HTMLElement).queryByRole("button", { name: "Expand Lewis Residence details" })).toBeNull();

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

    const estimateTray = card.querySelector("[data-project-card-estimate-sheets]");
    expect(estimateTray).not.toBeNull();
    expect(estimateTray).not.toHaveClass("min-h-[76px]");
    expect(estimateTray).toHaveClass("items-start", "justify-start");
    expect(within(estimateTray as HTMLElement).queryByText("Favorite sheets")).not.toBeInTheDocument();
    expect(card.querySelector("[data-project-card-estimate-sheet-list]")).toHaveClass(
      "content-start",
      "auto-rows-max",
    );

    expect(within(estimateTray as HTMLElement).getByRole("link", { name: "Concept Budget" })).toHaveAttribute(
      "href",
      "/workshop/projects/11111111-1111-4111-8111-111111111111/estimates/00000000-0000-4000-8000-concept0budg",
    );
    expect(
      within(estimateTray as HTMLElement).getByRole("link", { name: "Kitchen Fit-out Estimate" }),
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
    expect(createdDateCell).toHaveClass("rounded-xs", "px-2", "py-1.5");
    expect(createdDateCell).not.toHaveClass("border");
    expect(createdDateCell).not.toHaveClass("bg-surfaceMuted");
    expect(updatedDateCell).toHaveClass("rounded-xs", "px-2", "py-1.5");
    expect(updatedDateCell).not.toHaveClass("border");
    expect(updatedDateCell).not.toHaveClass("bg-surfaceMuted");
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
    expect(footer).toHaveClass("pt-2");
    expect(footer).not.toHaveClass("mt-auto");
    expect(footer).not.toHaveClass("pt-3");
  });

  it("uses shadow-only selection instead of a black card outline", () => {
    window.localStorage.setItem("archestimator_projects_view_mode_v1", "large");

    const { unmount } = render(<ProjectsPageClient projects={[projectItem(PROJECT_FIXTURE)]} />);

    let card = screen.getByLabelText("Lewis Residence project, owned access");
    fireEvent.click(within(card).getByRole("checkbox", { name: "Select Lewis Residence for deletion" }));

    expect(card).toHaveAttribute("data-project-card-selected", "true");
    expect(card).toHaveClass("border-hairline");
    expect(card).not.toHaveClass("border-ink");
    expect(card).not.toHaveClass("ring-1");
    expect(card).not.toHaveClass("ring-ink");

    unmount();

    window.localStorage.setItem("archestimator_projects_view_mode_v1", "list");
    render(<ProjectsPageClient projects={[projectItem(PROJECT_FIXTURE)]} />);
    card = screen.getByLabelText("Lewis Residence project, owned access");
    fireEvent.click(within(card).getByRole("checkbox", { name: "Select Lewis Residence for deletion" }));

    expect(card).toHaveAttribute("data-project-card-selected", "true");
    expect(card).not.toHaveClass("ring-1");
    expect(card).not.toHaveClass("ring-inset");
    expect(card).not.toHaveClass("ring-ink");
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
