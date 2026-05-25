import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

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
    expect(screen.getByRole("button", { name: "Add chart" })).not.toHaveTextContent("Add chart");
  });

  it("dismisses icon tooltips when their action is clicked", async () => {
    const user = userEvent.setup();
    const onFilter = vi.fn();
    render(<HeaderIconToolbar ariaLabel="Estimate tools" labelPrefix="estimate" onFilter={onFilter} addActions={[]} />);

    await user.hover(screen.getByRole("button", { name: "Filter estimate" }));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Filter estimate");

    await user.click(screen.getByRole("button", { name: "Filter estimate" }));

    expect(onFilter).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
  });
});
