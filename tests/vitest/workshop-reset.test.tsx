import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { WorkshopPageShell } from "@/components/workshop/WorkshopPageShell";

vi.mock("@/lib/auth/session", () => ({
  getCurrentUserContext: vi.fn(async () => null),
}));

describe("workshop sidebar baseline", () => {
  test("renders the workshop shell with an overlay sidebar and blank canvas", async () => {
    render(
      await WorkshopPageShell({
        title: "Workshop",
        eyebrow: "Workspace",
        showEyebrow: false,
        breadcrumbs: ["Workshop"],
        contentClassName: "",
        footer: (
          <>
            <span>Workshop shell</span>
            <span>Select Projects or Components from the sidebar</span>
          </>
        ),
        children: <div className="h-full bg-white" aria-label="Workshop empty canvas" />,
      }),
    );

    expect(screen.getByRole("main", { name: "Workshop" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Expand sidebar" }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByLabelText("Workshop empty canvas").childElementCount).toBe(0);
  });
});
