import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import WorkshopPage from "../../src/app/workshop/page";

describe("workshop sidebar baseline", () => {
  test("renders the workshop shell with an overlay sidebar and blank canvas", () => {
    render(<WorkshopPage />);

    expect(screen.getByRole("main", { name: "Workshop" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Expand sidebar" }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByLabelText("Workshop canvas").childElementCount).toBe(0);
  });
});
