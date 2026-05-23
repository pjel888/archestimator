import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HeaderIconToolbar } from "@/components/ui/header-icon-toolbar";

describe("HeaderIconToolbar", () => {
  it("keeps filter and group actions visible by default", () => {
    render(<HeaderIconToolbar ariaLabel="Estimate tools" labelPrefix="estimate" addActions={[]} />);

    expect(screen.getByRole("button", { name: "Filter estimate" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Group estimate" })).toBeInTheDocument();
  });

  it("can hide default actions for toolbars that provide their own controls", () => {
    render(
      <HeaderIconToolbar
        ariaLabel="Chart tools"
        labelPrefix="chart"
        showDefaultActions={false}
        addActions={[{ label: "Add chart", visibleLabel: "Add chart" }]}
      />,
    );

    expect(screen.queryByRole("button", { name: "Filter chart" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Group chart" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add chart" })).toBeInTheDocument();
  });
});
