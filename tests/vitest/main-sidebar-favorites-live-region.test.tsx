import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MainSidebarFavoriteProject } from "@/components/sidebar/sidebar-types";
import { MainSidebar } from "@/components/sidebar/MainSidebar";
import {
  announceSidebarFavoriteAssertive,
  announceSidebarFavoritePolite,
} from "@/hooks/use-sidebar-favorites-announcer";

vi.mock("next/navigation", () => ({
  usePathname: () => "/workshop/projects/project-1",
  useRouter: () => ({ prefetch: vi.fn() }),
}));
vi.mock("@/lib/favorites/sidebar-favorites-actions", () => ({
  fetchSidebarFavoriteProjects: vi.fn(async () => [] as MainSidebarFavoriteProject[]),
}));

const scope = { workspaceId: "ws-1", userId: "user-1" };

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const POLITE_CUE = "Estimate favorited. Favorite the project to pin it in the sidebar.";
const ASSERTIVE_COPY = "Could not update favorite. Try again.";

describe("MainSidebar live regions: polite/assertive + dedup (QA-20)", () => {
  it("renders both always-mounted regions with the correct aria-live channels and routes copy by severity", async () => {
    const { container } = renderWithClient(
      <MainSidebar favoritesScope={scope} favoriteProjects={[]} user={{ displayName: "Philip Lewis" }} />,
    );

    const polite = container.querySelector("[data-sidebar-favorites-status]");
    const alertRegion = container.querySelector("[data-sidebar-favorites-alert]");

    expect(polite).toHaveAttribute("aria-live", "polite");
    expect(alertRegion).toHaveAttribute("aria-live", "assertive");

    act(() => announceSidebarFavoritePolite(POLITE_CUE));
    await waitFor(() => expect(polite).toHaveTextContent(POLITE_CUE));
    // D5 cue lives in the polite region, never the assertive one.
    expect(alertRegion).not.toHaveTextContent(POLITE_CUE);

    act(() => announceSidebarFavoriteAssertive(ASSERTIVE_COPY));
    await waitFor(() => expect(alertRegion).toHaveTextContent(ASSERTIVE_COPY));
    expect(polite).not.toHaveTextContent(ASSERTIVE_COPY);
  });
});

describe("MainSidebar live regions: dedup + auto-clear", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("clears the polite region to empty before writing the next cue (no stacking) and auto-clears after ~6s", () => {
    const { container } = renderWithClient(
      <MainSidebar favoritesScope={scope} favoriteProjects={[]} user={{ displayName: "Philip Lewis" }} />,
    );
    const polite = () => container.querySelector("[data-sidebar-favorites-status]");

    act(() => announceSidebarFavoritePolite("First cue."));
    expect(polite()).toHaveTextContent("First cue.");

    // Second cue must replace, not append (the first must be gone).
    act(() => announceSidebarFavoritePolite("Second cue."));
    expect(polite()).toHaveTextContent("Second cue.");
    expect(polite()).not.toHaveTextContent("First cue.");

    // ~6s later the polite region self-clears so a stale cue can't linger.
    act(() => vi.advanceTimersByTime(6000));
    expect(polite()?.textContent).toBe("");
  });
});
