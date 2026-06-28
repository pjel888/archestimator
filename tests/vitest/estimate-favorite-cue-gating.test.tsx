import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ProjectEstimateFavoriteButton,
  type EstimateFavoriteParentProject,
  type EstimateFavoriteScope,
} from "@/components/workshop/ProjectEstimateFavoriteButton";
import type { ProjectEstimateListRow } from "@/lib/estimates/project-estimate-list-row";

// The cue is fired imperatively through the module-scoped announcer; spy on it.
vi.mock("@/hooks/use-sidebar-favorites-announcer", () => ({
  announceSidebarFavoritePolite: vi.fn(),
  announceSidebarFavoriteAssertive: vi.fn(),
}));
// The mutationFn calls the server action; stub it so onMutate (where the cue fires)
// runs without a network round-trip.
vi.mock("@/lib/workshop/actions", () => ({
  setEstimateFavorite: vi.fn(async () => undefined),
}));

import {
  announceSidebarFavoriteAssertive,
  announceSidebarFavoritePolite,
} from "@/hooks/use-sidebar-favorites-announcer";

const politeSpy = vi.mocked(announceSidebarFavoritePolite);
const assertiveSpy = vi.mocked(announceSidebarFavoriteAssertive);

const scope: EstimateFavoriteScope = { workspaceId: "ws-1", userId: "user-1" };

function row(overrides: Partial<ProjectEstimateListRow> = {}): ProjectEstimateListRow {
  return {
    id: "est-1",
    project_id: "project-1",
    name: "Concept Budget",
    sheet_code: "ES-001",
    currency_code: "USD",
    notes: null,
    project_budget: null,
    created_at: "2026-06-16T00:00:00.000Z",
    updated_at: "2026-06-16T00:00:00.000Z",
    firstNodeId: null,
    nodeCount: 0,
    rowItemCount: 0,
    totalProjectCost: 0,
    isFavorite: false,
    favoriteCreatedAt: null,
    ...overrides,
  };
}

function parent(overrides: Partial<EstimateFavoriteParentProject> = {}): EstimateFavoriteParentProject {
  return {
    id: "project-1",
    name: "Lewis Residence",
    projectCode: "AE-LR-001",
    href: "/workshop/projects/project-1",
    isSidebarFavorite: false,
    ...overrides,
  };
}

function renderButton(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  politeSpy.mockReset();
  assertiveSpy.mockReset();
});
afterEach(() => vi.clearAllMocks());

describe("ProjectEstimateFavoriteButton cue gating (Phase 2 carry-forward / D5)", () => {
  it("FIRES the polite cue when ADDING a favorite under a parent that is NOT a sidebar favorite", async () => {
    renderButton(
      <ProjectEstimateFavoriteButton
        estimate={row({ isFavorite: false })}
        disabled={false}
        optimistic={false}
        parentProject={parent({ isSidebarFavorite: false })}
        scope={scope}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Add Concept Budget to favorite/i }));

    await waitFor(() =>
      expect(politeSpy).toHaveBeenCalledWith(
        "Estimate favorited. It now appears in the sidebar under its project.",
      ),
    );
    expect(politeSpy).toHaveBeenCalledTimes(1);
  });

  it("is SILENT when ADDING a favorite under a parent that IS a sidebar favorite", async () => {
    renderButton(
      <ProjectEstimateFavoriteButton
        estimate={row({ isFavorite: false })}
        disabled={false}
        optimistic={false}
        parentProject={parent({ isSidebarFavorite: true })}
        scope={scope}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Add Concept Budget to favorite/i }));

    // Give the mutation lifecycle a tick to settle; the cue must never fire.
    await waitFor(() => expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true"));
    expect(politeSpy).not.toHaveBeenCalled();
  });

  it("is SILENT when REMOVING a favorite (even under a non-favorite parent)", async () => {
    renderButton(
      <ProjectEstimateFavoriteButton
        estimate={row({ isFavorite: true, favoriteCreatedAt: "2026-06-16T00:00:00.000Z" })}
        disabled={false}
        optimistic={false}
        parentProject={parent({ isSidebarFavorite: false })}
        scope={scope}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Remove Concept Budget from favorite/i }));

    await waitFor(() => expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false"));
    expect(politeSpy).not.toHaveBeenCalled();
  });
});
