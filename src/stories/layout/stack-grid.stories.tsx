import type { Meta, StoryObj } from "@storybook/react";

import { StoryGrid, StoryPanel } from "../ui-library/story-canvas";

function StackGridPreview() {
  return (
    <StoryGrid columns="md:grid-cols-3">
      <StoryPanel><p className="text-[10px] font-medium leading-4 text-ink">Stack item</p></StoryPanel>
      <StoryPanel><p className="text-[10px] font-medium leading-4 text-ink">Inline item</p></StoryPanel>
      <StoryPanel><p className="text-[10px] font-medium leading-4 text-ink">Grid item</p></StoryPanel>
    </StoryGrid>
  );
}

const meta = {
  title: "Layout/Stack",
  component: StackGridPreview,
  parameters: {
    docs: {
      description: {
        component:
          "Story-only layout primitive preview for Stack, Inline, and Grid patterns using existing Storybook layout helpers.",
      },
    },
  },
} satisfies Meta<typeof StackGridPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <StackGridPreview />,
};
