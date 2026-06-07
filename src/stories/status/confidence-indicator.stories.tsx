import type { Meta, StoryObj } from "@storybook/react";

import { ConfidenceIndicator } from "@/components/ui";
import { StoryPanel } from "../ui-library/story-canvas";

const meta = {
  title: "Status/ConfidenceIndicator",
  component: ConfidenceIndicator,
  parameters: {
    docs: {
      description: {
        component: "ConfidenceIndicator component for displaying confidence levels.",
      },
    },
  },
  args: {
    level: "high",
  },
} satisfies Meta<typeof ConfidenceIndicator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <StoryPanel className="flex flex-col gap-4">
      <ConfidenceIndicator level="high" />
      <ConfidenceIndicator level="medium" />
      <ConfidenceIndicator level="low" />
    </StoryPanel>
  ),
};

export const WithLabels: Story = {
  render: () => (
    <StoryPanel className="flex flex-col gap-4">
      <ConfidenceIndicator level="high" showLabel />
      <ConfidenceIndicator level="medium" showLabel />
      <ConfidenceIndicator level="low" showLabel />
    </StoryPanel>
  ),
};

export const SmallSize: Story = {
  render: () => (
    <StoryPanel className="flex flex-col gap-4">
      <ConfidenceIndicator level="high" size="sm" />
      <ConfidenceIndicator level="medium" size="sm" />
      <ConfidenceIndicator level="low" size="sm" />
    </StoryPanel>
  ),
};

export const SmallWithLabels: Story = {
  render: () => (
    <StoryPanel className="flex flex-col gap-4">
      <ConfidenceIndicator level="high" size="sm" showLabel />
      <ConfidenceIndicator level="medium" size="sm" showLabel />
      <ConfidenceIndicator level="low" size="sm" showLabel />
    </StoryPanel>
  ),
};
