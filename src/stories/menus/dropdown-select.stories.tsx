import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { DropdownSelect, type DropdownSelectOption } from "@/components/ui/dropdown-select";

const meta = {
  title: "Menus/DropdownSelect",
  component: DropdownSelect,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Select-semantics dropdown on the shared popup core: `role=\"combobox\"` trigger, portaled listbox with `aria-selected` options, virtual focus via `aria-activedescendant`. Use it for value pickers; use `DropdownMenu` for actions. With `name`, a hidden native select carries form submission, `required` validation, and reset behavior.",
      },
    },
  },
} satisfies Meta<typeof DropdownSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

const ADJUSTMENT_OPTIONS: DropdownSelectOption[] = [
  { value: "contingency", label: "Contingency" },
  { value: "discount", label: "Discount" },
];

const ROLE_OPTIONS: DropdownSelectOption[] = [
  { value: "", label: "Select role", disabled: true },
  { value: "viewer", label: "Viewer" },
  { value: "editor", label: "Editor" },
  { value: "manager", label: "Manager" },
];

function ControlledSelect({ options, ...props }: { options: DropdownSelectOption[] } & Partial<Parameters<typeof DropdownSelect>[0]>) {
  const [value, setValue] = useState(props.defaultValue ?? options.find((option) => !option.disabled)?.value ?? "");
  return (
    <div className="w-44">
      <DropdownSelect {...props} options={options} value={value} onValueChange={setValue} aria-label={props["aria-label"] ?? "Example picker"} />
    </div>
  );
}

export const Default: Story = {
  args: { options: ADJUSTMENT_OPTIONS, "aria-label": "Adjustment type" },
  render: () => <ControlledSelect options={ADJUSTMENT_OPTIONS} aria-label="Adjustment type" />,
};

export const Variants: Story = {
  args: { options: ADJUSTMENT_OPTIONS },
  render: () => (
    <div className="flex w-44 flex-col gap-4">
      <ControlledSelect options={ADJUSTMENT_OPTIONS} aria-label="Adjustment type" />
      <ControlledSelect options={ROLE_OPTIONS} defaultValue="" placeholder="Select role" aria-label="Role with placeholder" />
      <ControlledSelect options={ADJUSTMENT_OPTIONS} align="end" aria-label="End aligned" />
    </div>
  ),
};

export const States: Story = {
  args: { options: ADJUSTMENT_OPTIONS },
  render: () => (
    <div className="flex w-44 flex-col gap-4">
      <ControlledSelect options={ADJUSTMENT_OPTIONS} aria-label="Enabled" />
      <DropdownSelect options={ADJUSTMENT_OPTIONS} defaultValue="contingency" disabled aria-label="Hard disabled (permission)" />
      <DropdownSelect options={ADJUSTMENT_OPTIONS} defaultValue="contingency" ariaDisabled aria-label="Pending (focusable, ignored)" />
    </div>
  ),
};

export const LongContent: Story = {
  args: { options: ADJUSTMENT_OPTIONS },
  render: () => (
    <ControlledSelect
      options={Array.from({ length: 40 }, (_, index) => ({ value: `estimate-${index + 1}`, label: `Estimate ${index + 1}` }))}
      defaultValue="estimate-32"
      aria-label="Estimate picker with a long list"
    />
  ),
};

export const KeyboardFocus: Story = {
  args: { options: ADJUSTMENT_OPTIONS },
  render: () => (
    <div className="flex w-56 flex-col gap-2">
      <p className="text-[9px] leading-3 text-tertiary">
        Tab to the trigger. ArrowDown opens with the selected option active; type to jump (typeahead works closed too);
        Enter or Space commits; Tab commits and moves on; Escape closes without changing the value.
      </p>
      <ControlledSelect options={ROLE_OPTIONS} defaultValue="editor" aria-label="Keyboard walkthrough" />
    </div>
  ),
};
