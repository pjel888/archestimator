import type { Meta, StoryObj } from "@storybook/react";
import { Separator } from "@/components/ui/separator";

const meta = {
  title: "Layout/Separator",
  component: Separator,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
    },
  },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  args: {
    orientation: "horizontal",
  },
  decorators: [
    (Story) => (
      <div className="w-[300px] space-y-4">
        <div className="text-[10px] text-ink">Above separator</div>
        <Story />
        <div className="text-[10px] text-ink">Below separator</div>
      </div>
    ),
  ],
};

export const Vertical: Story = {
  args: {
    orientation: "vertical",
  },
  decorators: [
    (Story) => (
      <div className="flex h-10 items-center space-x-4">
        <div className="text-[10px] text-ink">Left</div>
        <Story />
        <div className="text-[10px] text-ink">Right</div>
      </div>
    ),
  ],
};
