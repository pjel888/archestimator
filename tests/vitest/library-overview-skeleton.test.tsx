import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Loading from "@/app/workshop/library/loading";

describe("Library Overview skeleton shape", () => {
  it("renders a single column with no right rail", () => {
    const { container } = render(<Loading />);
    // The baseline skeleton had a `w-[312px] ... border-l` right rail, while
    // LibraryOverview is a single scrolling column. The right rail must be gone
    // so the cold-load skeleton does not shift layout when content paints (CLS).
    expect(container.querySelector(".border-l")).toBeNull();
    expect(container.querySelector(".w-\\[312px\\]")).toBeNull();
  });

  it("keeps the accessible loading status", () => {
    const { container } = render(<Loading />);
    const status = container.querySelector('[role="status"]');
    expect(status).not.toBeNull();
    expect(status?.getAttribute("aria-label")).toBe("Loading library");
    expect(container.querySelector(".sr-only")?.textContent).toContain("Loading");
  });

  it("renders a components card grid matching the overview (multi-column)", () => {
    const { container } = render(<Loading />);
    // LibraryOverview renders recent components in an auto-fill / lg:grid-cols-6
    // grid; the skeleton should mirror a card grid, not a single stacked column.
    const grid = container.querySelector('[class*="grid"]');
    expect(grid).not.toBeNull();
  });
});
