import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import { DropdownSelect, type DropdownSelectOption } from "@/components/ui/dropdown-select";

const MODE_OPTIONS: DropdownSelectOption[] = [
  { value: "contingency", label: "Contingency" },
  { value: "discount", label: "Discount" },
];

const ESTIMATE_OPTIONS: DropdownSelectOption[] = [
  { value: "", label: "Select estimate", disabled: true },
  { value: "estimate-1", label: "Estimate 1" },
  { value: "estimate-10", label: "Estimate 10" },
  { value: "estimate-2", label: "Estimate 2" },
];

function trigger(name = "Adjustment type") {
  return screen.getByRole("combobox", { name });
}

function ControlledHarness({ onValueChange = vi.fn() }: { onValueChange?: (value: string) => void }) {
  const [value, setValue] = useState("contingency");
  return (
    <DropdownSelect
      options={MODE_OPTIONS}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onValueChange(next);
      }}
      aria-label="Adjustment type"
    />
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("DropdownSelect", () => {
  it("renders a combobox trigger whose accessible value is the current option label", () => {
    render(<ControlledHarness />);

    const combobox = trigger();
    expect(combobox).toHaveTextContent("Contingency");
    expect(combobox).toHaveAttribute("aria-haspopup", "listbox");
    expect(combobox).toHaveAttribute("aria-expanded", "false");
    expect(combobox).toHaveClass("cursor-pointer");
  });

  it("supports an icon-only trigger with icon and text options", () => {
    const viewOptions: DropdownSelectOption[] = [
      { value: "list", label: "List", icon: <span data-testid="list-icon" /> },
      { value: "large", label: "Large thumbnails", icon: <span data-testid="large-icon" /> },
    ];

    render(
      <DropdownSelect
        options={viewOptions}
        value="large"
        triggerDisplay="icon"
        aria-label="View"
      />,
    );

    const combobox = trigger("View");
    expect(combobox).not.toHaveTextContent("Large thumbnails");
    expect(combobox).toHaveAttribute("title", "Large thumbnails");
    expect(screen.getByTestId("large-icon")).toBeInTheDocument();

    fireEvent.click(combobox);

    const listOption = screen.getByRole("option", { name: "List" });
    expect(listOption).toHaveTextContent("List");
    expect(listOption).toHaveClass("cursor-pointer");
    expect(screen.getByTestId("list-icon")).toBeInTheDocument();
  });

  it("supports a contextual icon-only trigger title and a trigger-specific icon", () => {
    const groupOptions: DropdownSelectOption[] = [
      {
        value: "updated_at",
        label: "Last updated",
        icon: <span data-testid="field-icon" />,
        triggerIcon: <span data-testid="group-trigger-icon" />,
      },
    ];

    render(
      <DropdownSelect
        options={groupOptions}
        value="updated_at"
        triggerDisplay="icon"
        triggerTitlePrefix="Group by"
        aria-label="Group by"
      />,
    );

    const combobox = trigger("Group by");
    expect(combobox).toHaveAttribute("title", "Group by: Last updated");
    expect(screen.getByTestId("group-trigger-icon")).toBeInTheDocument();
    expect(screen.queryByTestId("field-icon")).not.toBeInTheDocument();

    fireEvent.click(combobox);

    expect(screen.getByRole("option", { name: "Last updated" })).toBeInTheDocument();
    expect(screen.getByTestId("field-icon")).toBeInTheDocument();
  });

  it("opens with the selected option active (not the first) and keeps DOM focus on the trigger", () => {
    render(
      <DropdownSelect options={MODE_OPTIONS} defaultValue="discount" aria-label="Adjustment type" />,
    );

    const combobox = trigger();
    combobox.focus();
    fireEvent.keyDown(combobox, { key: "ArrowDown" });

    const listbox = screen.getByRole("listbox");
    expect(listbox.parentElement).toBe(document.body);
    expect(document.activeElement).toBe(combobox);

    const active = combobox.getAttribute("aria-activedescendant");
    const discountOption = screen.getByRole("option", { name: "Discount" });
    expect(active).toBe(discountOption.id);
    expect(discountOption).toHaveAttribute("aria-selected", "true");
  });

  it("skips a disabled placeholder when opening with the placeholder value current", () => {
    render(<DropdownSelect options={ESTIMATE_OPTIONS} defaultValue="" placeholder="Select estimate" aria-label="Estimate" />);

    const combobox = trigger("Estimate");
    fireEvent.click(combobox);

    const active = combobox.getAttribute("aria-activedescendant");
    expect(active).toBe(screen.getByRole("option", { name: "Estimate 1" }).id);
  });

  it("supports typeahead while open, including multi-character buffers across shared prefixes", () => {
    render(<DropdownSelect options={ESTIMATE_OPTIONS} defaultValue="estimate-2" aria-label="Estimate" />);

    const combobox = trigger("Estimate");
    fireEvent.click(combobox);

    fireEvent.keyDown(combobox, { key: "e" });
    fireEvent.keyDown(combobox, { key: "s" });
    fireEvent.keyDown(combobox, { key: "t" });
    fireEvent.keyDown(combobox, { key: "i" });
    fireEvent.keyDown(combobox, { key: "m" });
    fireEvent.keyDown(combobox, { key: "a" });
    fireEvent.keyDown(combobox, { key: "t" });
    fireEvent.keyDown(combobox, { key: "e" });
    fireEvent.keyDown(combobox, { key: " " });
    fireEvent.keyDown(combobox, { key: "1" });
    fireEvent.keyDown(combobox, { key: "0" });

    expect(combobox.getAttribute("aria-activedescendant")).toBe(screen.getByRole("option", { name: "Estimate 10" }).id);
  });

  it("opens from a printable character on the closed trigger with the match active", () => {
    const onValueChange = vi.fn();
    render(<ControlledHarness onValueChange={onValueChange} />);

    const combobox = trigger();
    combobox.focus();
    fireEvent.keyDown(combobox, { key: "d" });

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(combobox.getAttribute("aria-activedescendant")).toBe(screen.getByRole("option", { name: "Discount" }).id);
    // Typeahead on the closed trigger opens; commit still requires Enter/Space/Tab.
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("commits on Enter, closes, and keeps trigger focus; Escape closes without committing", () => {
    const onValueChange = vi.fn();
    render(<ControlledHarness onValueChange={onValueChange} />);

    const combobox = trigger();
    combobox.focus();
    fireEvent.keyDown(combobox, { key: "ArrowDown" });
    fireEvent.keyDown(combobox, { key: "ArrowDown" });
    fireEvent.keyDown(combobox, { key: "Enter" });

    expect(onValueChange).toHaveBeenCalledWith("discount");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(combobox).toHaveTextContent("Discount");

    fireEvent.keyDown(combobox, { key: "ArrowDown" });
    fireEvent.keyDown(combobox, { key: "ArrowUp" });
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    });

    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(combobox).toHaveTextContent("Discount");
  });

  it("commits the active option on Tab without trapping focus", () => {
    const onValueChange = vi.fn();
    render(
      <div>
        <ControlledHarness onValueChange={onValueChange} />
        <input aria-label="Next field" />
      </div>,
    );

    const combobox = trigger();
    combobox.focus();
    fireEvent.keyDown(combobox, { key: "ArrowDown" });
    fireEvent.keyDown(combobox, { key: "ArrowDown" });
    fireEvent.keyDown(combobox, { key: "Tab" });

    expect(onValueChange).toHaveBeenCalledWith("discount");
    expect(screen.queryByRole("listbox")).toBeNull();
    // Focus stayed on the trigger throughout, so the browser's default Tab
    // moves to the next form control (jsdom does not move focus itself).
    expect(document.activeElement).toBe(combobox);
  });

  it("commits on option click and supports controlled and uncontrolled modes", () => {
    const onValueChange = vi.fn();
    const { unmount } = render(<ControlledHarness onValueChange={onValueChange} />);

    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("option", { name: "Discount" }));
    expect(onValueChange).toHaveBeenCalledWith("discount");
    expect(trigger()).toHaveTextContent("Discount");
    unmount();

    render(<DropdownSelect options={MODE_OPTIONS} defaultValue="contingency" aria-label="Adjustment type" />);
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("option", { name: "Discount" }));
    expect(trigger()).toHaveTextContent("Discount");
  });

  it("serializes the value through the hidden control, including the empty value", () => {
    render(
      <form data-testid="filter-form">
        <DropdownSelect options={ESTIMATE_OPTIONS} defaultValue="" name="status" placeholder="All statuses" aria-label="Status filter" />
      </form>,
    );

    const form = screen.getByTestId("filter-form") as HTMLFormElement;
    expect(new FormData(form).get("status")).toBe("");

    fireEvent.click(trigger("Status filter"));
    fireEvent.click(screen.getByRole("option", { name: "Estimate 2" }));
    expect(new FormData(form).get("status")).toBe("estimate-2");
  });

  it("does not fire onValueChange when the same value is re-committed (native change parity)", () => {
    const onValueChange = vi.fn();
    render(
      <DropdownSelect options={MODE_OPTIONS} defaultValue="contingency" onValueChange={onValueChange} aria-label="Adjustment type" />,
    );

    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("option", { name: "Contingency" }));

    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(trigger()).toHaveTextContent("Contingency");
  });

  it("resets the typeahead buffer after the idle timeout", () => {
    render(<DropdownSelect options={ESTIMATE_OPTIONS} defaultValue="estimate-2" aria-label="Estimate" />);

    const combobox = trigger("Estimate");
    fireEvent.click(combobox);

    fireEvent.keyDown(combobox, { key: "e" });
    expect(combobox.getAttribute("aria-activedescendant")).toBe(screen.getByRole("option", { name: "Estimate 1" }).id);

    act(() => {
      vi.advanceTimersByTime(700);
    });

    // A fresh single-character match cycles onward; a stale "ee" buffer
    // would match nothing and leave the highlight stuck.
    fireEvent.keyDown(combobox, { key: "e" });
    expect(combobox.getAttribute("aria-activedescendant")).toBe(screen.getByRole("option", { name: "Estimate 10" }).id);
  });

  it("treats space as a buffer character while typeahead is active, without committing or closing", () => {
    const onValueChange = vi.fn();
    render(
      <DropdownSelect options={ESTIMATE_OPTIONS} defaultValue="estimate-2" onValueChange={onValueChange} aria-label="Estimate" />,
    );

    const combobox = trigger("Estimate");
    fireEvent.click(combobox);
    fireEvent.keyDown(combobox, { key: "x" });

    // Space with an active buffer is typed, not an activation: the event is
    // prevented so the trigger button's default click cannot close the listbox.
    const spaceNotPrevented = fireEvent.keyDown(combobox, { key: " " });
    expect(spaceNotPrevented).toBe(false);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("opens from a closed trigger with the first/last enabled option active on Home/End", () => {
    render(<DropdownSelect options={ESTIMATE_OPTIONS} defaultValue="estimate-10" aria-label="Estimate" />);

    const combobox = trigger("Estimate");
    combobox.focus();

    fireEvent.keyDown(combobox, { key: "Home" });
    expect(combobox.getAttribute("aria-activedescendant")).toBe(screen.getByRole("option", { name: "Estimate 1" }).id);

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    });
    expect(screen.queryByRole("listbox")).toBeNull();

    fireEvent.keyDown(combobox, { key: "End" });
    expect(combobox.getAttribute("aria-activedescendant")).toBe(screen.getByRole("option", { name: "Estimate 2" }).id);
  });

  it("omits a hard-disabled picker from FormData, matching native disabled selects", () => {
    render(
      <form data-testid="parity-form">
        <DropdownSelect options={MODE_OPTIONS} defaultValue="contingency" name="mode" disabled aria-label="Adjustment type" />
      </form>,
    );

    const form = screen.getByTestId("parity-form") as HTMLFormElement;
    expect(new FormData(form).has("mode")).toBe(false);
  });

  it("keeps the hidden control out of the tab order and redirects invalid focus to the trigger", () => {
    render(
      <form>
        <DropdownSelect options={ESTIMATE_OPTIONS} defaultValue="" name="category" required aria-label="Category" />
      </form>,
    );

    const hidden = document.querySelector("[data-slot='dropdown-select-hidden']") as HTMLSelectElement;
    expect(hidden.tabIndex).toBe(-1);
    expect(hidden).toHaveAttribute("aria-hidden", "true");

    fireEvent.invalid(hidden);
    const combobox = trigger("Category");
    expect(document.activeElement).toBe(combobox);
    expect(combobox).toHaveAttribute("aria-invalid", "true");
  });

  it("resyncs the visible value when the form resets (React 19 post-action reset)", () => {
    render(
      <form data-testid="reset-form">
        <DropdownSelect options={MODE_OPTIONS} defaultValue="contingency" name="mode" aria-label="Adjustment type" />
      </form>,
    );

    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("option", { name: "Discount" }));
    expect(trigger()).toHaveTextContent("Discount");

    const form = screen.getByTestId("reset-form") as HTMLFormElement;
    fireEvent.reset(form);

    expect(trigger()).toHaveTextContent("Contingency");
    expect(new FormData(form).get("mode")).toBe("contingency");
  });

  it("renders the trigger as the first labelable descendant so wrapping labels focus it", () => {
    render(
      <label>
        Feedback type
        <DropdownSelect options={MODE_OPTIONS} defaultValue="contingency" name="feedbackType" aria-label="Feedback type" />
      </label>,
    );

    const label = screen.getByText("Feedback type").closest("label") as HTMLLabelElement;
    const labelables = label.querySelectorAll("button, select, input, textarea");
    expect(labelables[0]).toHaveAttribute("data-slot", "dropdown-select-trigger");
  });

  it('default (no variant) trigger contains underline classes and not boxed classes', () => {
    render(<ControlledHarness />);
    const combobox = trigger();
    expect(combobox.className).toContain('h-5');
    expect(combobox.className).toContain('border-b');
    expect(combobox.className).toContain('bg-transparent');
    expect(combobox.className).not.toContain('h-10');
    expect(combobox.className).not.toContain('bg-white');
  });

  it('boxed variant trigger has boxed classes and does not have underline-specific classes', () => {
    render(
      <DropdownSelect
        options={MODE_OPTIONS}
        value="contingency"
        variant="boxed"
        aria-label="Adjustment type"
      />,
    );
    const combobox = trigger();
    expect(combobox.className).toContain('h-10');
    expect(combobox.className).toContain('border-hairline');
    expect(combobox.className).toContain('bg-white');
    expect(combobox.className).not.toContain('h-5');
  });

  it("hard disabled is unfocusable; ariaDisabled stays focusable but ignores activation", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <DropdownSelect options={MODE_OPTIONS} defaultValue="contingency" disabled onValueChange={onValueChange} aria-label="Adjustment type" />,
    );

    expect(trigger()).toBeDisabled();

    rerender(
      <DropdownSelect options={MODE_OPTIONS} defaultValue="contingency" ariaDisabled onValueChange={onValueChange} aria-label="Adjustment type" />,
    );

    const combobox = trigger();
    expect(combobox).not.toBeDisabled();
    expect(combobox).toHaveAttribute("aria-disabled", "true");
    combobox.focus();
    expect(document.activeElement).toBe(combobox);

    fireEvent.click(combobox);
    fireEvent.keyDown(combobox, { key: "ArrowDown" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
