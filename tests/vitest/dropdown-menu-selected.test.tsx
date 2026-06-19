import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { DropdownMenu } from "@/components/ui/dropdown-menu";

function openMenu() {
  fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
  return screen.getByRole("menu");
}

describe("DropdownMenu.Item selected affordance", () => {
  it("renders a trailing check affordance for a selected item", () => {
    render(
      <DropdownMenu trigger={<button type="button">Open menu</button>}>
        <DropdownMenu.Item label="Group A" selected onClick={vi.fn()} />
        <DropdownMenu.Item label="Group B" onClick={vi.fn()} />
      </DropdownMenu>,
    );

    openMenu();

    const selectedItem = screen.getByRole("menuitem", { name: /Group A/ });
    // The check is exposed via a stable data hook and is an svg inside the item.
    expect(selectedItem).toHaveClass("cursor-pointer");
    expect(selectedItem.querySelector("[data-action-menu-item-check]")).not.toBeNull();
    expect(selectedItem.querySelector("[data-action-menu-item-check] svg")).not.toBeNull();
  });

  it("renders NO check affordance for an item without selected", () => {
    render(
      <DropdownMenu trigger={<button type="button">Open menu</button>}>
        <DropdownMenu.Item label="Group A" selected onClick={vi.fn()} />
        <DropdownMenu.Item label="Group B" onClick={vi.fn()} />
      </DropdownMenu>,
    );

    openMenu();

    const unselectedItem = screen.getByRole("menuitem", { name: /Group B/ });
    expect(unselectedItem.querySelector("[data-action-menu-item-check]")).toBeNull();
    // The check icon is aria-hidden, so the selected item exposes no extra
    // accessible text beyond its label.
    expect(unselectedItem).toHaveTextContent("Group B");
  });

  it("still fires onClick when a selected item is activated (selection does not disable it)", () => {
    const onClick = vi.fn();
    render(
      <DropdownMenu trigger={<button type="button">Open menu</button>}>
        <DropdownMenu.Item label="Group A" selected onClick={onClick} />
        <DropdownMenu.Item label="Group B" onClick={vi.fn()} />
      </DropdownMenu>,
    );

    openMenu();
    const selectedItem = screen.getByRole("menuitem", { name: /Group A/ });

    fireEvent.click(selectedItem);

    expect(onClick).toHaveBeenCalledTimes(1);
    // Activating an item closes the menu, proving it was not disabled.
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
