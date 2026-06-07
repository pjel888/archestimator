import type { Meta, StoryObj } from "@storybook/react";

import { Skeleton } from "@/components/ui/skeleton";
import { StoryGrid, StoryPanel } from "../ui-library/story-canvas";

function SkeletonTextPreview() {
  return (
    <StoryPanel className="space-y-1">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-3 w-44" />
      <Skeleton className="h-3 w-24" />
    </StoryPanel>
  );
}

function SkeletonCardPreview() {
  return (
    <StoryPanel className="space-y-2">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-3 w-36" />
      <Skeleton className="h-3 w-48" />
    </StoryPanel>
  );
}

function SkeletonTablePreview() {
  return (
    <StoryPanel className="space-y-1">
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="grid grid-cols-[1fr_48px_64px] gap-2">
          <Skeleton className="h-5" />
          <Skeleton className="h-5" />
          <Skeleton className="h-5" />
        </div>
      ))}
    </StoryPanel>
  );
}

const meta = {
  title: "Feedback/Skeleton",
  component: Skeleton,
  parameters: {
    docs: {
      description: {
        component:
          "Standalone Skeleton story for compact loading placeholders. Motion uses CSS pulse with motion-reduce fallback.",
      },
    },
  },
  args: {
    className: "h-8 w-40",
  },
} satisfies Meta<typeof Skeleton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SkeletonText: Story = {
  render: () => <SkeletonTextPreview />,
};

export const SkeletonCard: Story = {
  render: () => <SkeletonCardPreview />,
};

export const SkeletonTable: Story = {
  render: () => <SkeletonTablePreview />,
};

export const StateMatrix: Story = {
  render: () => (
    <StoryGrid columns="md:grid-cols-3">
      <SkeletonTextPreview />
      <SkeletonCardPreview />
      <SkeletonTablePreview />
    </StoryGrid>
  ),
};
