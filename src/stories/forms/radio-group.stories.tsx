import type { Meta, StoryObj } from "@storybook/react";
import { RadioGroup } from "@/components/ui/radio-group";

const meta = {
  title: "Forms/RadioGroup",
  component: RadioGroup,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    layout: {
      control: "select",
      options: ["vertical", "horizontal"],
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[300px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const defaultOptions = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Changes requested" },
];

export const Vertical: Story = {
  args: {
    options: defaultOptions,
    value: "pending",
    name: "status-vertical",
  },
};

export const Horizontal: Story = {
  args: {
    options: defaultOptions,
    value: "approved",
    name: "status-horizontal",
    layout: "horizontal",
  },
};

export const Disabled: Story = {
  args: {
    options: defaultOptions,
    value: "pending",
    name: "status-disabled",
    disabled: true,
  },
};

export const PartiallyDisabled: Story = {
  args: {
    options: [
      { value: "pending", label: "Pending" },
      { value: "approved", label: "Approved", disabled: true },
      { value: "rejected", label: "Changes requested" },
    ],
    value: "pending",
    name: "status-partial-disabled",
  },
};

export const Invalid: Story = {
  args: {
    options: defaultOptions,
    value: "pending",
    name: "status-invalid",
    invalid: true,
  },
};

export const Default: Story = { args: { options: [{ value: "a", label: "Option A" }, { value: "b", label: "Option B" }], value: "a" } };
export const KeyboardFocus: Story = { args: { options: [{ value: "a", label: "Option A" }, { value: "b", label: "Option B" }], value: "a" } };
