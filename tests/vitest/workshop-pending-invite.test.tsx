import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WorkshopHomebaseClient } from "@/components/workshop/WorkshopHomebaseClient";
import type { WorkshopHomebaseData } from "@/lib/repositories/workspace-repository";

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
} satisfies WorkshopHomebaseData;

describe("workshop pending invite bridge", () => {
  const workshopPage = readFileSync("src/app/workshop/page.tsx", "utf8");
  const homebaseClient = readFileSync("src/components/workshop/WorkshopHomebaseClient.tsx", "utf8");
  const pendingInviteResolver = readFileSync("src/lib/collaboration/workshop-pending-invite.ts", "utf8");
  const pendingInviteRoute = readFileSync("src/app/workshop/pending-invite/route.ts", "utf8");

  it("successful auth still lands on workshop and consumes a pending invite cookie there", () => {
    expect(workshopPage).toContain('redirect("/workshop/pending-invite")');
    expect(pendingInviteRoute).toContain("acceptPendingInviteBridge");
    expect(pendingInviteRoute).toContain("clearPendingInviteCookie(response)");
    expect(workshopPage).toContain("archestimator_pending_invite");
    expect(workshopPage).toContain("<WorkshopHomebaseClient");
    expect(workshopPage).not.toContain("Promise.all");
    expect(workshopPage).not.toContain("clearPendingInviteCookie");
  });

  it("renders invite resolution as a non-blocking banner and never as an onboarding gate", () => {
    expect(homebaseClient).toContain("inviteBanner");
    expect(homebaseClient).toContain("Project added");
    expect(homebaseClient).toContain("Sheet shared");
    expect(homebaseClient).not.toContain("country");
    expect(homebaseClient).not.toContain("profile gate");
  });

  it("keeps wrong-account bridge state retryable and includes invited email when available", () => {
    expect(pendingInviteResolver).toContain('if (state === "wrong_account")');
    expect(pendingInviteResolver).toContain("invited_email");
    expect(pendingInviteRoute).toContain('banner.kind !== "wrong-account"');
  });

  it("renders wrong-account recovery with the invited email and a sign-out path", () => {
    render(
      <WorkshopHomebaseClient
        homebase={emptyHomebase}
        inviteBanner={{ kind: "wrong-account", invitedEmail: "teammate@example.com" }}
      />,
    );

    expect(screen.getByRole("region", { name: "Invite unavailable" })).toBeInTheDocument();
    expect(screen.getByText(/teammate@example.com/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out and continue" })).toBeInTheDocument();
  });
});
