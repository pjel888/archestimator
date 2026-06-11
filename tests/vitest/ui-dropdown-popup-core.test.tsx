import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

import { DropdownMenu } from "@/components/ui/dropdown-menu";

function renderMenu({
  onSelectItem = vi.fn(),
  containerClassName,
}: { onSelectItem?: ReturnType<typeof vi.fn>; containerClassName?: string } = {}) {
  const view = render(
    <div className={containerClassName} style={containerClassName ? undefined : {}}>
      <DropdownMenu trigger={<button type="button">Open menu</button>}>
        <DropdownMenu.Item label="Duplicate" onClick={() => onSelectItem("duplicate")} />
        <DropdownMenu.Item label="Rename" onClick={() => onSelectItem("rename")} />
        <DropdownMenu.Item label="Archive" onClick={() => onSelectItem("archive")} />
      </DropdownMenu>
    </div>,
  );
  return { ...view, onSelectItem };
}

function openMenu() {
  fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
  return screen.getByRole("menu");
}

describe("dropdown popup core", () => {
  it("portals the panel to document.body so overflow-hidden ancestors cannot clip it", () => {
    renderMenu({ containerClassName: "overflow-hidden" });

    const panel = openMenu();
    expect(panel.parentElement).toBe(document.body);
    expect(panel.className).toContain("fixed");
    expect(panel.className).toContain("z-[1050]");
  });

  it("does not dismiss on pointerdown over an item; the click commits exactly once and closes", () => {
    const { onSelectItem } = renderMenu();

    openMenu();
    const item = screen.getByRole("menuitem", { name: "Rename" });

    fireEvent.pointerDown(item);
    expect(screen.queryByRole("menu")).not.toBeNull();
    expect(onSelectItem).not.toHaveBeenCalled();

    fireEvent.click(item);
    expect(onSelectItem).toHaveBeenCalledTimes(1);
    expect(onSelectItem).toHaveBeenCalledWith("rename");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes on outside pointerdown without firing items and swallows that gesture's click", () => {
    const outsideClick = vi.fn();
    const onSelectItem = vi.fn();
    render(
      <div>
        <button type="button" onClick={outsideClick}>
          Outside target
        </button>
        <DropdownMenu trigger={<button type="button">Open menu</button>}>
          <DropdownMenu.Item label="Duplicate" onClick={() => onSelectItem("duplicate")} />
        </DropdownMenu>
      </div>,
    );

    openMenu();
    const outside = screen.getByRole("button", { name: "Outside target" });

    fireEvent.pointerDown(outside);
    expect(screen.queryByRole("menu")).toBeNull();
    expect(onSelectItem).not.toHaveBeenCalled();

    // The same gesture's click (detail >= 1) is suppressed: native selects
    // swallow it too.
    fireEvent.click(outside, { detail: 1 });
    expect(outsideClick).not.toHaveBeenCalled();

    // A later, separate click goes through normally.
    fireEvent.pointerDown(outside);
    fireEvent.click(outside, { detail: 1 });
    expect(outsideClick).toHaveBeenCalledTimes(1);

    // Keyboard-synthesized activations (detail 0) are never eaten, even
    // right after a pointer dismissal.
    openMenu();
    fireEvent.pointerDown(outside);
    fireEvent.click(outside, { detail: 0 });
    expect(outsideClick).toHaveBeenCalledTimes(2);
  });

  it("closes when an ancestor scrolls but stays open for scrolls inside the panel", () => {
    render(
      <div data-testid="scroll-container" style={{ overflow: "auto" }}>
        <DropdownMenu trigger={<button type="button">Open menu</button>}>
          <DropdownMenu.Item label="Duplicate" onClick={vi.fn()} />
        </DropdownMenu>
      </div>,
    );

    let panel = openMenu();
    fireEvent.scroll(panel);
    expect(screen.queryByRole("menu")).not.toBeNull();

    fireEvent.scroll(screen.getByTestId("scroll-container"));
    expect(screen.queryByRole("menu")).toBeNull();

    panel = openMenu();
    expect(panel).not.toBeNull();
  });

  it("removes the portaled panel when the trigger unmounts while open", () => {
    const { unmount } = renderMenu();

    openMenu();
    expect(document.querySelector("[data-slot='dropdown-menu-content']")).not.toBeNull();

    unmount();
    expect(document.querySelector("[data-slot='dropdown-menu-content']")).toBeNull();
  });

  it("closes on a native Escape, marks the event handled, and restores trigger focus", async () => {
    renderMenu();
    openMenu();

    const documentEscapeSpy = vi.fn();
    document.addEventListener("keydown", documentEscapeSpy);

    const escape = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    act(() => {
      document.dispatchEvent(escape);
    });

    expect(screen.queryByRole("menu")).toBeNull();
    expect(escape.defaultPrevented).toBe(true);
    // stopImmediatePropagation keeps bubble-phase document listeners (the
    // dialog's close-on-Escape) from ever seeing the handled press.
    expect(documentEscapeSpy).not.toHaveBeenCalled();
    document.removeEventListener("keydown", documentEscapeSpy);

    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
    });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Open menu" }));
  });

  it("keeps roving focus working through the portaled panel and focuses the first item on open", async () => {
    renderMenu();
    openMenu();

    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
    });
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Duplicate" }));

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "ArrowDown" });
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Rename" }));

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "End" });
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Archive" }));

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "Home" });
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Duplicate" }));
  });

  it("flips above the trigger when the viewport has no room below", () => {
    const scrollHeightSpy = vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(240);
    try {
      renderMenu();
      const trigger = screen.getByRole("button", { name: "Open menu" });
      trigger.getBoundingClientRect = () =>
        ({ top: 740, bottom: 760, left: 20, right: 120, width: 100, height: 20, x: 20, y: 740, toJSON: () => ({}) }) as DOMRect;

      // jsdom viewport is 768px tall: 8px of space below the trigger vs a
      // 240px panel, so the preferred bottom placement must flip to top.
      fireEvent.click(trigger);
      expect(screen.getByRole("menu").getAttribute("data-dropdown-popup-placement")).toBe("top");
    } finally {
      scrollHeightSpy.mockRestore();
    }
  });
});
