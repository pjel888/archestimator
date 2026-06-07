import type { Meta, StoryObj } from "@storybook/react";
import { Timeline } from "@/components/ui/timeline";

const meta = {
  title: "Data Display/Timeline",
  component: Timeline,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[400px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Timeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: [
      {
        title: "Project Created",
        description: "Initial project setup and configuration.",
        timestamp: "Oct 24, 2023",
        status: "completed",
      },
      {
        title: "Estimate Drafted",
        description: "Added initial cost items and quantities.",
        timestamp: "Oct 25, 2023",
        status: "completed",
      },
      {
        title: "Review Requested",
        description: "Sent to client for approval.",
        timestamp: "Oct 26, 2023",
        status: "active",
      },
      {
        title: "Approved",
        description: "Awaiting final sign-off.",
        status: "default",
      },
    ],
  },
};

export const WithIcons: Story = {
  args: {
    items: [
      {
        title: "Document Uploaded",
        description: "Floor_Plan_v1.pdf",
        timestamp: "10:00 AM",
        status: "completed",
        icon: <div className="h-2.5 w-2.5 rounded-xs bg-current" />,
      },
      {
        title: "Processing",
        description: "Extracting dimensions and areas.",
        timestamp: "10:05 AM",
        status: "active",
        icon: <div className="h-2.5 w-2.5 rounded-xs border border-current" />,
      },
      {
        title: "Ready for Review",
        status: "default",
        icon: <div className="h-2.5 w-2.5 rounded-xs bg-current opacity-50" />,
      },
    ],
  },
};

export const Simple: Story = {
  args: {
    items: [
      { title: "Step 1", status: "completed" },
      { title: "Step 2", status: "completed" },
      { title: "Step 3", status: "active" },
      { title: "Step 4", status: "default" },
    ],
  },
};
