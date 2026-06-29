import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import NotFound from "@/app/not-found";

describe("root not-found", () => {
  it("renders safe unmatched-route recovery copy", () => {
    render(<NotFound />);

    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to workshop" })).toHaveAttribute("href", "/workshop");
    expect(screen.getByLabelText("Page not found")).not.toHaveTextContent(/token|secret|database/i);
  });
});
