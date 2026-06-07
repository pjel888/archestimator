import type { Meta, StoryObj } from "@storybook/react";

import { NumberInput } from "@/components/ui/number-input";
import { ControlField } from "@/components/ui/control-input";
import { StoryPanel } from "../ui-library/story-canvas";

const meta = {
  title: "Forms/NumberInput",
  component: NumberInput,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "A number input component with custom up/down arrows.",
      },
    },
  },
  args: {
    defaultValue: 42,
    "aria-label": "Quantity",
  },
  argTypes: {
    invalid: {
      control: "boolean",
    },
    disabled: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof NumberInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <StoryPanel className="max-w-sm">
      <ControlField label="Quantity">
        <NumberInput defaultValue={42} aria-label="Quantity" />
      </ControlField>
    </StoryPanel>
  ),
};

export const WithMinMaxStep: Story = {
  render: () => (
    <StoryPanel className="max-w-sm">
      <ControlField label="Percentage" helperText="Min 0, Max 100, Step 5">
        <NumberInput defaultValue={50} min={0} max={100} step={5} aria-label="Percentage" />
      </ControlField>
    </StoryPanel>
  ),
};

export const Disabled: Story = {
  render: () => (
    <StoryPanel className="max-w-sm">
      <ControlField label="Quantity">
        <NumberInput defaultValue={42} disabled aria-label="Quantity" />
      </ControlField>
    </StoryPanel>
  ),
};

export const Invalid: Story = {
  render: () => (
    <StoryPanel className="max-w-sm">
      <ControlField label="Quantity" errorText="Value must be greater than 0">
        <NumberInput defaultValue={-5} invalid aria-label="Quantity" />
      </ControlField>
    </StoryPanel>
  ),
};

export const WithPlaceholder: Story = {
  render: () => (
    <StoryPanel className="max-w-sm">
      <ControlField label="Quantity">
        <NumberInput placeholder="Enter quantity..." aria-label="Quantity" />
      </ControlField>
    </StoryPanel>
  ),
};
