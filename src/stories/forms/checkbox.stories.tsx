import type { Meta, StoryObj } from "@storybook/react";

import { Checkbox } from "@/components/ui";
import { Note, StoryPanel } from "../ui-library/story-canvas";

const meta = {
  title: "Forms/Checkbox",
  component: Checkbox,
  parameters: {
    docs: {
      description: {
        component: "Checkbox component for boolean selections.",
      },
    },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <StoryPanel>
      <Checkbox label="Include supplier pricing" />
    </StoryPanel>
  ),
};

export const Checked: Story = {
  render: () => (
    <StoryPanel>
      <Checkbox label="Include supplier pricing" defaultChecked />
    </StoryPanel>
  ),
};

export const Indeterminate: Story = {
  render: () => (
    <StoryPanel>
      <Checkbox label="Select all items" indeterminate />
    </StoryPanel>
  ),
};

export const Invalid: Story = {
  render: () => (
    <StoryPanel className="space-y-2">
      <Checkbox label="I accept the terms and conditions" invalid />
      <Note tone="danger">You must accept the terms to continue.</Note>
    </StoryPanel>
  ),
};

export const Disabled: Story = {
  render: () => (
    <StoryPanel className="space-y-2">
      <Checkbox label="Unchecked disabled" disabled />
      <Checkbox label="Checked disabled" disabled defaultChecked />
      <Checkbox label="Indeterminate disabled" disabled indeterminate />
    </StoryPanel>
  ),
};

export const WithoutLabel: Story = {
  render: () => (
    <StoryPanel>
      <Checkbox aria-label="Select row" />
    </StoryPanel>
  ),
};

export const KeyboardFocus: Story = { args: { children: "Focus me and press Tab" } };
