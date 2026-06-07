import type { Meta, StoryObj } from "@storybook/react";
import { MagnifyingGlass, WarningCircle } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StoryGrid } from "../ui-library/story-canvas";

const meta = {
  title: "Feedback/EmptyState",
  component: EmptyState,
  parameters: {
    docs: {
      description: {
        component:
          "Standalone EmptyState story for no-results, permission, and error-style blank states. All examples use static fixture copy.",
      },
    },
  },
  args: {
    title: "No matching components",
    description: "Try removing filters or adding a static fixture component.",
  },
} satisfies Meta<typeof EmptyState>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAction: Story = {
  args: {
    icon: <MagnifyingGlass size={18} weight="regular" aria-hidden="true" />,
    action: <Button size="sm">Clear filters</Button>,
  },
};

export const ErrorState: Story = {
  args: {
    icon: <WarningCircle size={18} weight="regular" aria-hidden="true" />,
    title: "Could not load static fixture",
    description: "The story fixture failed local validation. No provider call was attempted.",
  },
};

export const StateMatrix: Story = {
  render: () => (
    <StoryGrid columns="md:grid-cols-3">
      <EmptyState title="No rows" description="Add a static row fixture." />
      <EmptyState title="No results" description="Try a different local filter." action={<Button size="sm">Reset</Button>} />
      <EmptyState title="Permission denied" description="Story-only permission copy; route auth is out of scope." />
    </StoryGrid>
  ),
};
