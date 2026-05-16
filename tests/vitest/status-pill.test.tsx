import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusPill } from "@/components/ui/status-pill";

describe("StatusPill", () => {
  it("renders the status text for estimating workflow badges", () => {
    render(<StatusPill tone="review">Source changed</StatusPill>);

    expect(screen.getByText("Source changed")).toBeInTheDocument();
  });
});
