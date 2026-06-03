import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TreeBulkActionBar, TreeDragHandle, TreeSelectionCheckbox } from "@/components/workshop/tree-row-affordances";
import { WorkshopTreeRow } from "@/components/workshop/workshop-tree";

describe("workshop tree row affordances", () => {
  it("renders a div row instead of invalid nested button markup when interactive slots are present", () => {
    render(
      <WorkshopTreeRow
        as="button"
        leadingSlot={
          <TreeSelectionCheckbox checked={false} onChange={() => undefined} aria-label="Select Kitchen" />
        }
      >
        <span>Kitchen</span>
      </WorkshopTreeRow>,
    );

    const row = screen.getByText("Kitchen").closest("[data-workshop-tree-row]");
    expect(row?.tagName).toBe("DIV");
    expect(row).not.toHaveAttribute("type");
    expect(screen.getByRole("checkbox", { name: "Select Kitchen" })).toBeInTheDocument();
  });

  it("isolates checkbox pointer, click, and change events from the parent row", () => {
    const onRowClick = vi.fn();
    const onCheckboxChange = vi.fn();

    render(
      <WorkshopTreeRow
        as="div"
        role="treeitem"
        onClick={onRowClick}
        leadingSlot={
          <TreeSelectionCheckbox checked={false} onChange={onCheckboxChange} aria-label="Select Ground Floor" />
        }
      >
        <span>Ground Floor</span>
      </WorkshopTreeRow>,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Select Ground Floor" });
    fireEvent.pointerDown(checkbox);
    fireEvent.click(checkbox);

    expect(onCheckboxChange).toHaveBeenCalledTimes(1);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("exposes the bulk action bar as a named toolbar with clear and destructive actions", () => {
    render(
      <TreeBulkActionBar
        selectedCount={2}
        entityLabel="folder"
        onClearSelection={() => undefined}
        onDelete={() => undefined}
      />,
    );

    expect(screen.getByRole("toolbar", { name: "Bulk actions" })).toBeInTheDocument();
    expect(screen.getByText("2 folders selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear selection" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete selected" })).toBeInTheDocument();
  });

  it("marks the drag handle as decorative while keeping pointer events off the parent row", () => {
    const onRowClick = vi.fn();
    render(
      <WorkshopTreeRow as="div" onClick={onRowClick} dragHandleSlot={<TreeDragHandle forceVisible />}>
        <span>Exterior</span>
      </WorkshopTreeRow>,
    );

    const handle = screen.getByTitle("Drag row");
    expect(handle).toHaveAttribute("aria-hidden", "true");
    fireEvent.pointerDown(handle);
    fireEvent.click(handle);
    expect(onRowClick).not.toHaveBeenCalled();
  });
});
