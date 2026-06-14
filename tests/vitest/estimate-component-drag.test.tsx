import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { EstimateMaterialCell } from "@/components/workshop/estimate-sheet/rows/cells";
import { estimateLibraryItems } from "@/components/workshop/estimate-tree-data";

// Req 4 / D4 / OD-14: a cancelled or failed component drag must NOT delete the
// attached component. moveRowComponent (the host) clears the source itself on a
// real move, so the drag-end handler must never clear — only the explicit
// delete/clear action removes a component.
function renderCell(overrides: Partial<Parameters<typeof EstimateMaterialCell>[0]> = {}) {
  const item = { ...estimateLibraryItems[0], id: "row-1" };
  const onClearComponent = vi.fn();
  render(
    <EstimateMaterialCell
      item={item}
      isReplaceTarget={false}
      onReplaceDragOver={() => {}}
      onReplaceDragLeave={() => {}}
      onReplace={() => {}}
      onClearComponent={onClearComponent}
      onRequestProjectSpecific={() => {}}
      onMoveComponent={() => {}}
      onOpenComponentDetails={() => {}}
      {...overrides}
    />,
  );
  return { item, onClearComponent };
}

describe("EstimateMaterialCell component drag safety (Req 4 / D4)", () => {
  it("does NOT clear the component when a drag is cancelled (dropEffect none)", () => {
    const { item, onClearComponent } = renderCell();
    const dragHandle = screen.getByRole("button", { name: `Drag component ${item.material}` });
    fireEvent.dragEnd(dragHandle, { dataTransfer: { dropEffect: "none" } });
    expect(onClearComponent).not.toHaveBeenCalled();
  });

  it("does NOT clear the source on a successful move (the move path clears it, not drag-end)", () => {
    const { item, onClearComponent } = renderCell();
    const dragHandle = screen.getByRole("button", { name: `Drag component ${item.material}` });
    fireEvent.dragEnd(dragHandle, { dataTransfer: { dropEffect: "move" } });
    expect(onClearComponent).not.toHaveBeenCalled();
  });

  it("still clears the component via the explicit Delete action", () => {
    const { item, onClearComponent } = renderCell();
    fireEvent.click(screen.getByRole("button", { name: `Delete component ${item.material}` }));
    expect(onClearComponent).toHaveBeenCalledTimes(1);
  });
});
