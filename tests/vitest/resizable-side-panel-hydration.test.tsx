import { act } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ResizableSidePanel } from "@/components/workshop/ResizableSidePanel";
import { getSidePanelWidthCookieName } from "@/components/workshop/side-panel-widths";

function TestPanel() {
  return (
    <ResizableSidePanel
      side="left"
      ariaLabel="Tree"
      storageKey="estimate_sheet_tree_width"
      defaultWidth={272}
      minWidth={216}
      maxWidth={432}
      widthOffset={104}
    >
      <div>Tree content</div>
    </ResizableSidePanel>
  );
}

function renderWithoutDocument() {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { configurable: true, value: undefined });
  try {
    return renderToString(<TestPanel />);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "document", descriptor);
  }
}

describe("ResizableSidePanel hydration", () => {
  const cookieName = getSidePanelWidthCookieName("estimate_sheet_tree_width");
  let root: Root | null = null;

  afterEach(() => {
    document.cookie = `${cookieName}=; Path=/; Max-Age=0`;
    root?.unmount();
    root = null;
    vi.restoreAllMocks();
  });

  it("hydrates persisted widths without changing server-rendered resize attributes", async () => {
    document.cookie = `${cookieName}=240; Path=/; SameSite=Lax`;
    const serverHtml = renderWithoutDocument();
    const container = document.createElement("div");
    container.innerHTML = serverHtml;
    expect(container.querySelector('[role="separator"]')).toHaveAttribute("aria-valuenow", "272");

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await act(async () => {
      root = hydrateRoot(container, <TestPanel />);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(consoleError.mock.calls.map((call) => call.join(" ")).join("\n")).not.toMatch(
      /hydrated but some attributes|aria-valuenow/i,
    );
    expect(container.querySelector('[role="separator"]')).toHaveAttribute("aria-valuenow", "240");
  });
});
