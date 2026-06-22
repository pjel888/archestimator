import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AddEstimateColumn } from "@/components/workshop/project-data/AddEstimateColumn";

describe("AddEstimateColumn", () => {
  it("calls onAdd with the selected estimate id", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    render(
      <AddEstimateColumn
        canAdd
        onAdd={onAdd}
        remainingOptions={[{ value: "estimate-c", label: "Value Engineering (EST-003)" }]}
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Add estimate to compare" }));
    await user.click(screen.getByRole("option", { name: "Value Engineering (EST-003)" }));

    expect(onAdd).toHaveBeenCalledWith("estimate-c");
  });

  it("disables the picker when every sheet is already shown", () => {
    render(<AddEstimateColumn canAdd={false} onAdd={vi.fn()} remainingOptions={[]} />);

    expect(screen.getByRole("combobox", { name: "Add estimate to compare" })).toBeDisabled();
  });

  it("uses the add affordance class on the picker trigger", () => {
    render(
      <AddEstimateColumn
        canAdd
        onAdd={vi.fn()}
        remainingOptions={[{ value: "estimate-c", label: "Value Engineering (EST-003)" }]}
      />,
    );

    expect(screen.getByRole("combobox", { name: "Add estimate to compare" })).toHaveClass("bg-orange-100");
  });
});
