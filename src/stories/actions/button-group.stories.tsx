import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "@/components/ui/button";
import { StoryPanel } from "../ui-library/story-canvas";

function ButtonGroupExample() {
  return (
    <div role="group" aria-label="Estimate actions" className="inline-flex items-center gap-px rounded-xs border border-hairline bg-white p-px">
      <Button variant="ghost" size="sm" className="rounded-xs">
        Draft
      </Button>
      <Button variant="secondary" size="sm" className="rounded-xs bg-surfaceMuted">
        Review
      </Button>
      <Button variant="ghost" size="sm" className="rounded-xs">
        Approved
      </Button>
    </div>
  );
}

const meta = {
  title: "Actions/ButtonGroup",
  component: ButtonGroupExample,
  parameters: {
    archestimator: {
      storybookContract: "story-composition",
    },
    docs: {
      description: {
        component:
          "Story-only grouped Button composition for compact action clusters. This documents the grouping pattern without introducing a production route migration.",
      },
    },
  },
} satisfies Meta<typeof ButtonGroupExample>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <ButtonGroupExample />,
};

export const WithMixedActions: Story = {
  render: () => (
    <StoryPanel className="flex flex-wrap items-center gap-2">
      <ButtonGroupExample />
      <div role="group" aria-label="Selection actions" className="inline-flex items-center gap-px rounded-xs border border-hairline bg-white p-px">
        <Button variant="ghost" size="sm">Select all</Button>
        <Button variant="ghost" size="sm">Clear</Button>
        <Button variant="danger" size="sm">Delete</Button>
      </div>
    </StoryPanel>
  ),
};
