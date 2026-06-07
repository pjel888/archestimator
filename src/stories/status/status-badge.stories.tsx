import type { Meta, StoryObj } from "@storybook/react";
import { StatusBadge } from "@/components/ui/status-badge";

const meta = {
  title: "Status/StatusBadge",
  component: StatusBadge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    status: {
      control: "select",
      options: ["approved", "review", "danger", "draft", "active", "inactive"],
    },
  },
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Approved: Story = {
  args: {
    status: "approved",
    children: "Approved",
  },
};

export const Review: Story = {
  args: {
    status: "review",
    children: "Review",
  },
};

export const Danger: Story = {
  args: {
    status: "danger",
    children: "Danger",
  },
};

export const Draft: Story = {
  args: {
    status: "draft",
    children: "Draft",
  },
};

export const Active: Story = {
  args: {
    status: "active",
    children: "Active",
  },
};

export const Inactive: Story = {
  args: {
    status: "inactive",
    children: "Inactive",
  },
};

export const WithDot: Story = {
  args: {
    status: "approved",
    showDot: true,
    children: "Approved",
  },
};

export const AllWithDots: Story = {
  args: {
    status: "approved",
    showDot: true,
    children: "Approved",
  },
  render: () => (
    <div className="flex gap-2">
      <StatusBadge status="approved" showDot>Approved</StatusBadge>
      <StatusBadge status="review" showDot>Review</StatusBadge>
      <StatusBadge status="danger" showDot>Danger</StatusBadge>
      <StatusBadge status="draft" showDot>Draft</StatusBadge>
      <StatusBadge status="active" showDot>Active</StatusBadge>
      <StatusBadge status="inactive" showDot>Inactive</StatusBadge>
    </div>
  ),
};
