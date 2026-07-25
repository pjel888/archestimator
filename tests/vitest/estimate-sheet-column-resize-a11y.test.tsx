import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EstimateColumnRuler } from "@/components/workshop/estimate-sheet/columns/EstimateColumnRuler";
import {
  DEFAULT_ESTIMATE_COLUMN_WIDTHS,
  RESIZABLE_ESTIMATE_COLUMN_IDS,
  getResizableEstimateColumnDefinition,
} from "@/lib/estimate-sheet/column-model";

function renderRuler(widths = { material: 240 }) {
  const onCommitWidths = vi.fn();
  const onResetWidths = vi.fn();
  const surfaceRef = { current: document.createElement("div") };
  render(<EstimateColumnRuler surfaceRef={surfaceRef} widths={widths} onCommitWidths={onCommitWidths} onResetWidths={onResetWidths} />);
  return { onCommitWidths, onResetWidths, surface: surfaceRef.current };
}

describe("EstimateColumnRuler", () => {
  it("exposes one accessible label while retaining both responsive column labels", () => {
    renderRuler();

    const fullLabel = screen.getByText("Contingency", {
      selector: '[data-estimate-column-label="full"]',
    });
    const responsiveLabel = fullLabel.parentElement;

    expect(responsiveLabel).toHaveAccessibleName("Contingency");
    expect(fullLabel).toHaveAttribute("aria-hidden", "true");
    expect(responsiveLabel?.querySelector('[data-estimate-column-label="compact"]')).toHaveTextContent("Cont.");
    expect(responsiveLabel?.querySelector('[data-estimate-column-label="compact"]')).toHaveAttribute("aria-hidden", "true");
  });

  it("renders one accessible resize separator for each resizable data column", () => {
    renderRuler();

    const handles = screen.getAllByRole("separator");
    expect(handles).toHaveLength(RESIZABLE_ESTIMATE_COLUMN_IDS.length);
    expect(screen.getByRole("separator", { name: "Resize Materials column" })).toHaveAttribute(
      "aria-valuemin",
      String(getResizableEstimateColumnDefinition("material").minWidth),
    );
    expect(screen.getByRole("separator", { name: "Resize Materials column" })).toHaveAttribute("aria-valuenow", "240");
    expect(screen.getByRole("separator", { name: "Resize Adjustment column" })).toHaveAttribute(
      "aria-valuemin",
      String(getResizableEstimateColumnDefinition("adjustment").minWidth),
    );
    expect(screen.queryByRole("separator", { name: "Resize # column" })).not.toBeInTheDocument();
    expect(screen.queryByRole("separator", { name: "Resize Select column" })).not.toBeInTheDocument();
    expect(screen.queryByRole("separator", { name: "Resize Actions column" })).not.toBeInTheDocument();
  });

  it("commits keyboard changes and column resets with clamped widths", () => {
    const { onCommitWidths, surface } = renderRuler({ material: 240 });
    const materialsHandle = screen.getByRole("separator", { name: "Resize Materials column" });

    fireEvent.keyDown(materialsHandle, { key: "ArrowRight" });
    expect(surface.style.getPropertyValue("--est-col-material")).toBe("256px");
    expect(onCommitWidths).toHaveBeenLastCalledWith({ material: 256 });

    fireEvent.keyDown(materialsHandle, { key: "Home" });
    expect(surface.style.getPropertyValue("--est-col-material")).toBe(`${DEFAULT_ESTIMATE_COLUMN_WIDTHS.material}px`);
    expect(onCommitWidths).toHaveBeenLastCalledWith({});

    fireEvent.doubleClick(materialsHandle);
    expect(onCommitWidths).toHaveBeenLastCalledWith({});
  });

  it("mutates the shared surface during pointer drag and commits once on release", () => {
    const { onCommitWidths, surface } = renderRuler({ material: 240 });
    const materialsHandle = screen.getByRole("separator", { name: "Resize Materials column" });

    fireEvent.pointerDown(materialsHandle, { button: 0, clientX: 100 });
    fireEvent.pointerMove(window, { clientX: 130 });
    fireEvent.pointerMove(window, { clientX: 148 });

    expect(surface.style.getPropertyValue("--est-col-material")).toBe("288px");
    expect(onCommitWidths).not.toHaveBeenCalled();

    fireEvent.pointerUp(window);

    expect(onCommitWidths).toHaveBeenCalledTimes(1);
    expect(onCommitWidths).toHaveBeenCalledWith({ material: 288 });
  });

  it("resets all widths from the fixed action track", () => {
    const { onResetWidths, surface } = renderRuler({ material: 240, quantity: 82 });

    fireEvent.click(screen.getByRole("button", { name: "Reset column widths" }));

    expect(surface.style.getPropertyValue("--est-col-material")).toBe(`${DEFAULT_ESTIMATE_COLUMN_WIDTHS.material}px`);
    expect(surface.style.getPropertyValue("--est-col-quantity")).toBe(`${DEFAULT_ESTIMATE_COLUMN_WIDTHS.quantity}px`);
    expect(onResetWidths).toHaveBeenCalledTimes(1);
  });
});
