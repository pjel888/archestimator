import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Spinner } from "@/components/ui/spinner";

describe("Spinner", () => {
  it("renders the orange blocks-shuffle loader as the default loading status", () => {
    const { container } = render(<Spinner size="md" />);

    const status = screen.getByRole("status", { name: "Loading" });
    expect(status).toHaveAttribute("data-blocks-shuffle-loader");
    expect(status).toHaveClass("size-6");
    expect(container.querySelectorAll("rect.blocks-shuffle-box")).toHaveLength(9);
    expect(container.querySelector("style")?.textContent).toContain("#F36F21");
    expect(container.querySelector("style")?.textContent).toContain("blocks-shuffle-9");
  });

  it("can render decoratively inside another loading status", () => {
    const { container } = render(<Spinner size="lg" decorative />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(container.querySelector("[data-blocks-shuffle-loader]")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("[data-blocks-shuffle-loader]")).toHaveClass("size-8");
  });
});
