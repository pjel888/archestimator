import type { Meta, StoryObj } from "@storybook/react";

import { CurrencyInput } from "@/components/ui/currency-input";
import { ControlField } from "@/components/ui/control-input";
import { StoryPanel } from "../ui-library/story-canvas";

const meta = {
  title: "Forms/CurrencyInput",
  component: CurrencyInput,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "A currency input component that formats values on blur and allows raw number input on focus.",
      },
    },
  },
  args: {
    value: 1500.5,
    "aria-label": "Amount",
  },
  argTypes: {
    invalid: {
      control: "boolean",
    },
    disabled: {
      control: "boolean",
    },
    currency: {
      control: "text",
    },
  },
} satisfies Meta<typeof CurrencyInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <StoryPanel className="max-w-sm">
      <ControlField label="Amount">
        <CurrencyInput value={1500.5} aria-label="Amount" />
      </ControlField>
    </StoryPanel>
  ),
};

export const ZeroValue: Story = {
  render: () => (
    <StoryPanel className="max-w-sm">
      <ControlField label="Amount">
        <CurrencyInput value={0} aria-label="Amount" />
      </ControlField>
    </StoryPanel>
  ),
};

export const LargeValue: Story = {
  render: () => (
    <StoryPanel className="max-w-sm">
      <ControlField label="Amount">
        <CurrencyInput value={12500000.75} aria-label="Amount" />
      </ControlField>
    </StoryPanel>
  ),
};

export const DifferentCurrencySymbol: Story = {
  render: () => (
    <StoryPanel className="max-w-sm">
      <ControlField label="Amount (USD)">
        <CurrencyInput value={1500.5} currency="$" aria-label="Amount" />
      </ControlField>
    </StoryPanel>
  ),
};

export const Disabled: Story = {
  render: () => (
    <StoryPanel className="max-w-sm">
      <ControlField label="Amount">
        <CurrencyInput value={1500.5} disabled aria-label="Amount" />
      </ControlField>
    </StoryPanel>
  ),
};
