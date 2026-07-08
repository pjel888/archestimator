import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import NotFound from "@/app/not-found";
import { collectFileViolations } from "@/../scripts/enforce-app-design-system.mjs";

describe("root not-found", () => {
  it("keeps the fallback UI inside the compact app design contract", () => {
    const source = readFileSync("src/app/not-found.tsx", "utf8");

    expect(collectFileViolations("src/app/not-found.tsx", source)).toEqual([]);
  });

  it("renders safe unmatched-route recovery copy", () => {
    render(<NotFound />);

    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to workshop" })).toHaveAttribute("href", "/workshop");
    expect(screen.getByLabelText("Page not found")).not.toHaveTextContent(/token|secret|database/i);
  });
});
