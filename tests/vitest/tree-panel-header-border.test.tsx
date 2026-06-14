import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { TreePanelHeader } from "@/components/ui/tree-panel-header";

describe("TreePanelHeader bottom border (Req 3)", () => {
  test("the sticky root carries a consistent hairline bottom border", () => {
    const { container } = render(<TreePanelHeader ariaLabel="Test panel" labelPrefix="test" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.className).toMatch(/border-b/);
    expect(root.className).toMatch(/border-hairline/);
    // sanity: still the sticky white header
    expect(root.className).toMatch(/sticky/);
    expect(root.className).toMatch(/bg-white/);
  });
});
