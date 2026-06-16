import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { TreePanelHeader } from "@/components/ui/tree-panel-header";

describe("TreePanelHeader bottom border (Req 3)", () => {
  test("the toolbar icon row carries a consistent hairline bottom border", () => {
    const { container } = render(<TreePanelHeader ariaLabel="Test panel" labelPrefix="test" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).not.toBeNull();
    // sanity: still the sticky white header
    expect(root.className).toMatch(/sticky/);
    expect(root.className).toMatch(/bg-white/);
    // Req 3: the border lives on the toolbar row (search/filter/expand) itself —
    // directly under the icon row, above any tabs that render below it.
    const toolbarRow = root.firstElementChild as HTMLElement;
    expect(toolbarRow).not.toBeNull();
    expect(toolbarRow.className).toMatch(/border-b/);
    expect(toolbarRow.className).toMatch(/border-hairline/);
  });

  test("can omit its bottom divider when the next surface supplies the boundary", () => {
    const { container } = render(<TreePanelHeader ariaLabel="Test panel" labelPrefix="test" showBottomBorder={false} />);
    const root = container.firstElementChild as HTMLElement;
    const toolbarRow = root.firstElementChild as HTMLElement;

    expect(root.className).not.toMatch(/border-b/);
    expect(toolbarRow.className).not.toMatch(/border-b/);
  });

  test("can keep the icon row divider while omitting the wrapper divider", () => {
    const { container } = render(
      <TreePanelHeader ariaLabel="Test panel" labelPrefix="test" showBottomBorder={false} showToolbarBottomBorder />,
    );
    const root = container.firstElementChild as HTMLElement;
    const toolbarRow = root.firstElementChild as HTMLElement;

    expect(root.className).not.toMatch(/border-b/);
    expect(toolbarRow.className).toMatch(/border-b/);
    expect(toolbarRow.className).toMatch(/border-hairline/);
  });
});
