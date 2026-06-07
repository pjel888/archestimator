import type { Meta, StoryObj } from "@storybook/react";

import { Note, StoryPanel } from "../ui-library/story-canvas";

const bars = [62, 84, 48, 72];

function ChartContainerPreview() {
  return (
    <StoryPanel className="max-w-md space-y-2">
      <div className="flex h-32 items-end gap-2 border-b border-hairline px-2">
        {bars.map((value, index) => (
          <div key={value} className="flex flex-1 flex-col items-center gap-1">
            <div className="w-full rounded-xs bg-ink" style={{ height: `${value}%` }} aria-label={`Static bar ${index + 1}: ${value}`} />
            <span className="text-[8px] leading-3 text-tertiary">Q{index + 1}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] font-medium leading-4 text-ink">Cost summary chart container</p>
      <Note>No chart dependency is introduced; this is a static token/layout story.</Note>
    </StoryPanel>
  );
}

const meta = {
  title: "Charts/ChartContainer",
  component: ChartContainerPreview,
  parameters: {
    docs: {
      description: {
        component:
          "Story-only chart container and static mini-bar visualization. Production D3 chart behavior remains route-owned.",
      },
    },
  },
} satisfies Meta<typeof ChartContainerPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <ChartContainerPreview />,
};

export const Empty: Story = {
  render: () => <Note>No chart data fixture is available. The empty state must be explicit, compact, and non-provider-backed.</Note>,
};
