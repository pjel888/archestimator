import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authHintMocks = vi.hoisted(() => ({
  useLandingAuthHintState: vi.fn(),
}));

vi.mock("@/lib/landing/use-landing-auth-hint", () => authHintMocks);

import { NewExperimentCta } from "../../src/app/new/_components/new-experiment-cta";
import {
  BETA_ACCESS_MAILTO_HREF,
  WORKSPACE_HREF,
} from "../../src/app/kimi3d/_content";

describe("new landing experiment CTA", () => {
  beforeEach(() => {
    authHintMocks.useLandingAuthHintState.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("keeps a signed-out fallback interactive while the auth hint loads", () => {
    authHintMocks.useLandingAuthHintState.mockReturnValue({
      isLoggedIn: false,
      isLoading: true,
    });

    render(<NewExperimentCta />);

    const fallback = screen.getByRole("link", { name: "Request early access" });
    expect(fallback).toHaveAttribute("href", BETA_ACCESS_MAILTO_HREF);
    expect(fallback).not.toHaveAttribute("aria-busy");
    expect(fallback).toHaveAttribute("data-new-cta-loading");
  });

  it("requests access for a signed-out visitor", () => {
    authHintMocks.useLandingAuthHintState.mockReturnValue({
      isLoggedIn: false,
      isLoading: false,
    });

    render(<NewExperimentCta />);

    expect(screen.getByRole("link", { name: "Request early access" })).toHaveAttribute(
      "href",
      BETA_ACCESS_MAILTO_HREF,
    );
  });

  it("opens the workspace for a signed-in visitor", () => {
    authHintMocks.useLandingAuthHintState.mockReturnValue({
      isLoggedIn: true,
      isLoading: false,
    });

    render(<NewExperimentCta />);

    expect(screen.getByRole("link", { name: "Open workspace" })).toHaveAttribute(
      "href",
      WORKSPACE_HREF,
    );
  });
});
