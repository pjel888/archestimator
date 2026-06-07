import type { Meta, StoryObj } from "@storybook/react";

import { DatePicker } from "@/components/ui/date-picker";
import { ControlField } from "@/components/ui/control-input";
import { StoryPanel } from "../ui-library/story-canvas";

const meta = {
  title: "Forms/DatePicker",
  component: DatePicker,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "A native date picker component with custom styling and clear button.",
      },
    },
  },
  args: {
    "aria-label": "Select date",
  },
  argTypes: {
    invalid: {
      control: "boolean",
    },
    disabled: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof DatePicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <StoryPanel className="max-w-sm">
      <ControlField label="Start Date">
        <DatePicker aria-label="Start Date" />
      </ControlField>
    </StoryPanel>
  ),
};

export const WithValue: Story = {
  render: () => (
    <StoryPanel className="max-w-sm">
      <ControlField label="Start Date">
        <DatePicker value="2024-05-15" aria-label="Start Date" />
      </ControlField>
    </StoryPanel>
  ),
};

export const Disabled: Story = {
  render: () => (
    <StoryPanel className="max-w-sm">
      <ControlField label="Start Date">
        <DatePicker value="2024-05-15" disabled aria-label="Start Date" />
      </ControlField>
    </StoryPanel>
  ),
};

export const Invalid: Story = {
  render: () => (
    <StoryPanel className="max-w-sm">
      <ControlField label="Start Date" errorText="Date must be in the future">
        <DatePicker value="2020-01-01" invalid aria-label="Start Date" />
      </ControlField>
    </StoryPanel>
  ),
};

export const WithMinMax: Story = {
  render: () => (
    <StoryPanel className="max-w-sm">
      <ControlField label="Start Date" helperText="Select a date in May 2024">
        <DatePicker min="2024-05-01" max="2024-05-31" aria-label="Start Date" />
      </ControlField>
    </StoryPanel>
  ),
};
