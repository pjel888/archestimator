import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { ManageGroupsPopover } from "@/components/workshop/ManageGroupsPopover";

const group = {
  id: "group-1",
  name: "Pipeline",
  accentId: null,
  position: 0,
};

function renderPopover(onRename = vi.fn()) {
  function Harness() {
    const [open, setOpen] = useState(true);
    return (
      <ManageGroupsPopover
        groups={[group]}
        open={open}
        onOpenChange={setOpen}
        onCreate={vi.fn()}
        onRename={onRename}
        onRecolor={vi.fn()}
        onDelete={vi.fn()}
      />
    );
  }
  render(<Harness />);
  return { onRename };
}

describe("ManageGroupsPopover rename inputs", () => {
  it("keeps the surface transparent and commits once on Enter", () => {
    const { onRename } = renderPopover();
    const input = screen.getByRole("textbox", { name: "Rename Pipeline" });

    expect(input).toHaveClass("bg-transparent");
    expect(input).not.toHaveClass("focus-visible:bg-accentSoft");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Roadmap" } });
    fireEvent.mouseLeave(input);
    expect(onRename).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Enter" });
    expect(onRename).toHaveBeenCalledTimes(1);
    expect(onRename).toHaveBeenCalledWith("group-1", "Roadmap");
  });

  it("cancels on Escape and commits a changed value on blur", () => {
    const { onRename } = renderPopover();
    const input = screen.getByRole("textbox", { name: "Rename Pipeline" });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Backlog" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("textbox", { name: "Rename Pipeline" })).not.toBeInTheDocument();
    expect(onRename).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Manage groups" }));
    const reopenedInput = screen.getByRole("textbox", { name: "Rename Pipeline" });
    expect(reopenedInput).toHaveValue("Pipeline");
    fireEvent.focus(reopenedInput);
    fireEvent.change(reopenedInput, { target: { value: "Current" } });
    fireEvent.blur(reopenedInput);
    expect(onRename).toHaveBeenCalledTimes(1);
    expect(onRename).toHaveBeenCalledWith("group-1", "Current");
  });
});
