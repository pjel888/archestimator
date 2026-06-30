import { readFileSync } from "node:fs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { WorkshopHomebaseClient } from "@/components/workshop/WorkshopHomebaseClient";
import type { WorkshopHomebaseData } from "@/lib/repositories/workspace-repository";

const FAVORITES_SCOPE = { workspaceId: "workspace-1", userId: "user-1" } as const;

// WorkshopHomebaseClient now uses the useToggleProjectFavorite hook, which needs a
// TanStack QueryClient context. Wrap every render so these banner/invite tests stay green.
function renderHomebase(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/workshop/actions", () => ({
  setProjectFavorite: vi.fn(async () => undefined),
  setEstimateFavorite: vi.fn(async () => undefined),
}));

vi.mock("@/lib/collaboration/pending-invite-actions", () => ({
  acceptPendingInvitationById: vi.fn(async () => undefined),
  signOutForPendingInvite: vi.fn(async () => undefined),
}));

const emptyHomebase = {
  workspace: {
    id: "workspace-1",
    name: "Test Workspace",
    slug: null,
    created_by: "user-1",
    created_at: "2026-05-01T00:00:00.000Z",
    updated_at: "2026-05-01T00:00:00.000Z",
  },
  projects: [],
  estimates: [],
  pendingInvites: [],
  removedProjectFavorites: [],
  receivedPendingInviteCount: 0,
} satisfies WorkshopHomebaseData;

describe("workshop pending invite bridge", () => {
  const workshopPage = readFileSync("src/app/workshop/page.tsx", "utf8");
  const homebaseClient = readFileSync("src/components/workshop/WorkshopHomebaseClient.tsx", "utf8");
  const pendingInviteActions = readFileSync("src/lib/collaboration/pending-invite-actions.ts", "utf8");
  const pendingInviteResolver = readFileSync("src/lib/collaboration/workshop-pending-invite.ts", "utf8");
  const pendingInviteRoute = readFileSync("src/app/workshop/pending-invite/route.ts", "utf8");
  const projectDashboardPage = readFileSync("src/app/workshop/projects/[projectId]/page.tsx", "utf8");

  it("successful auth still lands on workshop and consumes a pending invite cookie there", () => {
    const authSetup = readFileSync("src/lib/auth/account-setup.ts", "utf8");

    expect(authSetup).toContain('PENDING_INVITE_AUTH_DESTINATION = "/workshop/pending-invite"');
    expect(workshopPage).toContain('redirect("/workshop/pending-invite")');
    expect(pendingInviteRoute).toContain("acceptPendingInviteBridge");
    expect(pendingInviteRoute).toContain("clearPendingInviteCookie(response)");
    expect(pendingInviteRoute).toContain("createPendingInviteProgressHtml");
    expect(pendingInviteRoute).toContain("window.location.replace");
    expect(pendingInviteRoute).toContain('"Cache-Control": "no-store"');
    expect(workshopPage).toContain("archestimator_pending_invite");
    expect(workshopPage).toContain("<WorkshopHomebaseClient");
    // The pending-invite cookie check + redirect runs BEFORE any data fetch, so the
    // dashboard's parallel Promise.all load never races the invite bridge.
    expect(workshopPage).not.toContain("clearPendingInviteCookie");
  });

  it("renders invite resolution as a non-blocking banner and never as an onboarding gate", () => {
    expect(homebaseClient).toContain("inviteBanner");
    expect(homebaseClient).toContain("removedProjectBanner");
    expect(homebaseClient).toContain("Project access removed");
    expect(homebaseClient).toContain("Project added");
    expect(homebaseClient).toContain("Estimate shared");
    expect(homebaseClient).toContain("roleLabel");
    expect(homebaseClient).toContain("projectName");
    expect(homebaseClient).not.toContain("country");
    expect(homebaseClient).not.toContain("profile gate");
  });

  it("routes inaccessible project opens back to the workshop removed-access banner", () => {
    expect(workshopPage).toContain("readRemovedProjectBannerFromSearchParams");
    expect(workshopPage).toContain("removedProjectBanner={removedProjectBanner}");
    expect(projectDashboardPage).toContain('redirect(`/workshop?removedProject=${encodeURIComponent(projectId)}`)');
  });

  it("renders accepted invite banners with role and project context when provided", () => {
    renderHomebase(
      <WorkshopHomebaseClient
        homebase={emptyHomebase}
        favoriteProjects={[]}
        librarySpotlight={null}
        favoritesScope={FAVORITES_SCOPE}
        inviteBanner={{
          kind: "accepted",
          scope: "project",
          targetHref: "/workshop/projects/project-1",
          targetLabel: "Open project",
          projectName: "Shared Clinic Fit-Out",
          roleLabel: "Viewer",
        }}
      />,
    );

    expect(screen.getByRole("region", { name: "Project added" })).toBeInTheDocument();
    expect(screen.getByText("You've been added as Viewer to Shared Clinic Fit-Out.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open project" })).toHaveAttribute("href", "/workshop/projects/project-1");
  });

  it("keeps wrong-account bridge state retryable and includes invited email when available", () => {
    expect(pendingInviteResolver).toContain("getCurrentUserContext");
    expect(pendingInviteResolver).toContain("acceptInvitationTokenForUser");
    expect(pendingInviteResolver).not.toContain("supabase.auth");
    expect(pendingInviteResolver).toContain('if (state === "wrong_account")');
    expect(pendingInviteResolver).toContain("invited_email");
    expect(pendingInviteRoute).toContain('banner.kind !== "wrong-account"');
  });

  it("wires signed-in pending invite cards to accept by invitation id without raw tokens", () => {
    expect(homebaseClient).toContain("PendingInvitesPanel");
    expect(homebaseClient).toContain("acceptPendingInvitationById");
    expect(homebaseClient).toContain('name="invitationId"');
    expect(pendingInviteActions).toContain("acceptInvitationByIdForUser");
    expect(pendingInviteActions).toContain("requireAuth");
    expect(pendingInviteActions).not.toContain("supabase.auth");
    expect(pendingInviteActions).not.toContain("invitation_token_hash");
  });

  it("renders wrong-account recovery with the invited email and a sign-out path", () => {
    renderHomebase(
      <WorkshopHomebaseClient
        homebase={emptyHomebase}
        favoriteProjects={[]}
        librarySpotlight={null}
        favoritesScope={FAVORITES_SCOPE}
        inviteBanner={{ kind: "wrong-account", invitedEmail: "teammate@example.com" }}
      />,
    );

    expect(screen.getByRole("region", { name: "Invite unavailable" })).toBeInTheDocument();
    expect(screen.getByText(/teammate@example.com/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out and continue" })).toBeInTheDocument();
  });

  it("renders signed-in pending invite cards on the homebase", () => {
    renderHomebase(
      <WorkshopHomebaseClient
        favoriteProjects={[]}
        librarySpotlight={null}
        favoritesScope={FAVORITES_SCOPE}
        homebase={{
          ...emptyHomebase,
          pendingInvites: [
            {
              id: "invitation-1",
              projectId: "project-1",
              estimateId: null,
              projectName: "Shared Clinic Fit-Out",
              projectCode: "AE-SC-101",
              estimateName: null,
              role: "viewer",
              scope: "project",
              inviterLabel: "Studio Partner",
              state: "pending",
              expiresAt: "2026-06-10T00:00:00.000Z",
              lastOpenedAt: "2026-06-01T00:00:00.000Z",
            },
            {
              id: "invitation-expired",
              projectId: "project-expired",
              estimateId: null,
              projectName: "Expired Gallery Wing",
              projectCode: "AE-EG-401",
              estimateName: null,
              role: "viewer",
              scope: "project",
              inviterLabel: "Studio Partner",
              state: "expired",
              expiresAt: "2026-06-01T00:00:00.000Z",
              lastOpenedAt: null,
            },
          ],
          receivedPendingInviteCount: 1,
        }}
      />,
    );

    const pendingInvites = screen.getByRole("region", { name: "Pending invites" });
    expect(within(pendingInvites).getByText("Shared Clinic Fit-Out")).toBeInTheDocument();
    expect(within(pendingInvites).getByText("AE-SC-101")).toBeInTheDocument();
    expect(within(pendingInvites).getAllByText("Viewer")).toHaveLength(2);
    expect(within(pendingInvites).getAllByText("Studio Partner")).toHaveLength(2);
    expect(within(pendingInvites).getByText("Opened Jun 1")).toBeInTheDocument();
    expect(within(pendingInvites).getByRole("button", { name: "Accept invite for Shared Clinic Fit-Out" })).toBeInTheDocument();
    expect(within(pendingInvites).getByText("Expired Gallery Wing")).toBeInTheDocument();
    expect(within(pendingInvites).getByText("Expired Jun 1")).toBeInTheDocument();
    expect(within(pendingInvites).getByRole("button", { name: "Expired" })).toBeDisabled();
  });
});
