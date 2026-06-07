import type { Meta, StoryObj } from "@storybook/react";
import { EstimateCell } from "@/components/ui/estimate-cell";

const meta = {
  title: "Domain/Workshop/EstimateCell",
  component: EstimateCell,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    align: {
      control: "select",
      options: ["left", "center", "right"],
    },
  },
} satisfies Meta<typeof EstimateCell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: "Standard text value",
  },
};

export const Selected: Story = {
  args: {
    value: "Selected cell",
    selected: true,
  },
};

export const Editing: Story = {
  args: {
    value: "Editing cell",
    editing: true,
  },
};

export const Numeric: Story = {
  args: {
    value: "$1,250.00",
    numeric: true,
    align: "right",
  },
};

export const AlignedCenter: Story = {
  args: {
    value: "Centered text",
    align: "center",
  },
};

export const AlignedRight: Story = {
  args: {
    value: "Right aligned",
    align: "right",
  },
};

export const SelectedAndEditing: Story = {
  args: {
    value: "Selected and editing",
    selected: true,
    editing: true,
  },
};
