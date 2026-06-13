import type { Meta, StoryObj } from "@storybook/react";

import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";
import { Note, StoryGrid, StoryPanel } from "../ui-library/story-canvas";

function BadgePreview() {
  return (
    <StoryPanel className="space-y-2">
      <div className="flex flex-wrap gap-1">
        <Badge>Draft</Badge>
        <Badge tone="success">Approved</Badge>
        <Badge tone="warning">Needs review</Badge>
        <Badge tone="danger">Blocked</Badge>
      </div>
      <Note>Status is never color-only: every indicator includes visible text.</Note>
    </StoryPanel>
  );
}

const meta = {
  title: "Status/Badge",
  component: BadgePreview,
  parameters: {
    docs: {
      description: {
        component:
          "Standalone status story for Badge, Pill, Chip, and compact indicators with label-first status communication.",
      },
    },
  },
} satisfies Meta<typeof BadgePreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <BadgePreview />,
};

export const ChipsAndPills: Story = {
  render: () => (
    <StoryPanel className="flex flex-wrap gap-1">
      <Chip active>Selected scope</Chip>
      <Chip removable>Millwork</Chip>
      <Chip tone="accent">Supplier</Chip>
      <Chip tone="danger">Over budget</Chip>
    </StoryPanel>
  ),
};

export const Indicators: Story = {
  render: () => (
    <StoryGrid columns="md:grid-cols-4">
      {["Online", "Warning", "Error", "Unsaved"].map((label) => (
        <StoryPanel key={label} className="flex items-center gap-2">
          <span className="block size-2 rounded-xs bg-ink" aria-hidden="true" />
          <span className="text-[10px] font-medium leading-4 text-ink">{label}</span>
        </StoryPanel>
      ))}
    </StoryGrid>
  ),
};
