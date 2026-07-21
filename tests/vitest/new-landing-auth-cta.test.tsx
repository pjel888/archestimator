import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthUtilityLink, EarlyAccessCta } from "@/components/landing-new/NewLandingAuthCta";

describe("new landing auth CTAs", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows one workspace action in the signed-in header state", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ isLoggedIn: true })));

    render(
      <>
        <AuthUtilityLink hideWhenLoggedIn />
        <EarlyAccessCta location="header" />
      </>,
    );

    await waitFor(() => {
      expect(screen.queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
    });
    expect(screen.getAllByRole("link", { name: "Open workspace" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Open workspace" })).toHaveAttribute("href", "/workshop");
  });

  it("keeps sign-in and beta access distinct for signed-out visitors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ isLoggedIn: false })));

    render(
      <>
        <AuthUtilityLink hideWhenLoggedIn />
        <EarlyAccessCta location="hero" />
      </>,
    );

    expect(await screen.findByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login?next=/workshop/projects");
    expect(screen.getByRole("link", { name: "Request beta access" })).toHaveAttribute(
      "href",
      "/contact?intent=beta-request",
    );
  });
});
