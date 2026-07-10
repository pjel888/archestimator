import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LandingHeader } from "@/components/landing/LandingHeader";
import { ArchestimatorLandingPage } from "@/components/landing-v3/ArchestimatorLandingPage";
import { LANDING_AUTH_HINT_PATH } from "@/lib/landing/landing-auth-session-cookie";

function renderWithQueryClient(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("landing auth hint client upgrade", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("AUTH-LAND-001: logged-out hint keeps Sign in on the marketing header", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ isLoggedIn: false }, { status: 200 }),
      ),
    );

    render(<LandingHeader />);

    expect(await screen.findByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login?next=/workshop/projects",
    );
    expect(screen.queryByRole("link", { name: "Workspace" })).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      LANDING_AUTH_HINT_PATH,
      expect.objectContaining({ credentials: "same-origin", cache: "no-store" }),
    );
  });

  it("AUTH-LAND-002: logged-in hint upgrades landing-v3 CTAs away from Sign in", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ isLoggedIn: true }, { status: 200 }),
      ),
    );

    renderWithQueryClient(<ArchestimatorLandingPage />);

    await waitFor(() => {
      expect(screen.queryByRole("link", { name: /^Sign in$/i })).not.toBeInTheDocument();
    });
    expect(screen.getAllByRole("link", { name: /Open workspace|Workspace/i }).length).toBeGreaterThan(0);
  });

  it("AUTH-ADV-001: failed hint fetch fails closed to Sign in", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ isLoggedIn: true }, { status: 500 }),
      ),
    );

    render(<LandingHeader />);

    expect(await screen.findByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Workspace" })).not.toBeInTheDocument();
  });
});
