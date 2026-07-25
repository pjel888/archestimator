import type { Meta, StoryObj } from "@storybook/react";
import { Switch } from "@/components/ui/switch";

const meta = {
  title: "Forms/Switch",
  component: Switch,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    checked: false,
    "aria-label": "Enable notifications",
  },
};

export const Checked: Story = {
  args: {
    checked: true,
    "aria-label": "Enable notifications",
  },
};

export const WithLabel: Story = {
  args: {
    checked: false,
    label: "Enable notifications",
  },
};

export const CheckedWithLabel: Story = {
  args: {
    checked: true,
    label: "Compact mode",
  },
};

export const Disabled: Story = {
  args: {
    checked: false,
    disabled: true,
    label: "Disabled option",
  },
};

export const DisabledChecked: Story = {
  args: {
    checked: true,
    disabled: true,
    label: "Disabled checked",
  },
};

export const Invalid: Story = {
  args: {
    checked: false,
    invalid: true,
    label: "Required setting",
  },
};

export const InvalidChecked: Story = {
  args: {
    checked: true,
    invalid: true,
    label: "Invalid state",
  },
};

export const KeyboardFocus: Story = { args: { checked: false, label: "Toggle me" } };
