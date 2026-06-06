import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/app/providers";

vi.mock("next/navigation", () => ({
  usePathname: () => "/share/public-token",
}));

describe("AppProviders notification composition", () => {
  it("renders app children and toast viewport when notifications are route-gated off", () => {
    render(
      <AppProviders>
        <main>Application content</main>
      </AppProviders>,
    );

    expect(screen.getByText("Application content")).toBeInTheDocument();
    expect(document.querySelector("[data-toast-viewport='true']")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
