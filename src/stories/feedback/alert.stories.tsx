import type { Meta, StoryObj } from "@storybook/react";
import { Info, CheckCircle, Warning, XCircle } from "@phosphor-icons/react";

import { Alert } from "@/components/ui";
import { Button } from "@/components/ui";
import { StoryPanel } from "../ui-library/story-canvas";

const meta = {
  title: "Feedback/Alert",
  component: Alert,
  parameters: {
    docs: {
      description: {
        component: "Alert component for displaying feedback messages with different tones.",
      },
    },
  },
} satisfies Meta<typeof Alert>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <StoryPanel className="space-y-4 max-w-md">
      <Alert
        title="Information"
        description="This is an informational alert."
      />
    </StoryPanel>
  ),
};

export const Tones: Story = {
  render: () => (
    <StoryPanel className="space-y-4 max-w-md">
      <Alert
        tone="info"
        icon={<Info size={14} weight="regular" />}
        title="Information"
        description="This is an informational alert."
      />
      <Alert
        tone="success"
        icon={<CheckCircle size={14} weight="regular" />}
        title="Success"
        description="Your changes have been saved successfully."
      />
      <Alert
        tone="warning"
        icon={<Warning size={14} weight="regular" />}
        title="Warning"
        description="Your session is about to expire."
      />
      <Alert
        tone="danger"
        icon={<XCircle size={14} weight="regular" />}
        title="Error"
        description="Failed to save changes. Please try again."
      />
    </StoryPanel>
  ),
};

export const WithAction: Story = {
  render: () => (
    <StoryPanel className="space-y-4 max-w-md">
      <Alert
        tone="warning"
        icon={<Warning size={14} weight="regular" />}
        title="Update available"
        description="A new version of the application is available."
        action={
          <Button variant="secondary" size="sm">
            Update
          </Button>
        }
      />
    </StoryPanel>
  ),
};

export const Dismissible: Story = {
  render: () => (
    <StoryPanel className="space-y-4 max-w-md">
      <Alert
        tone="info"
        icon={<Info size={14} weight="regular" />}
        title="Welcome"
        description="Welcome to the new dashboard."
        onClose={() => console.log("Close clicked")}
      />
    </StoryPanel>
  ),
};

export const TitleOnly: Story = {
  render: () => (
    <StoryPanel className="space-y-4 max-w-md">
      <Alert
        tone="success"
        icon={<CheckCircle size={14} weight="regular" />}
        title="Operation completed successfully."
      />
    </StoryPanel>
  ),
};

export const DescriptionOnly: Story = {
  render: () => (
    <StoryPanel className="space-y-4 max-w-md">
      <Alert
        tone="info"
        icon={<Info size={14} weight="regular" />}
        description="Please note that the system will be down for maintenance at midnight."
      />
    </StoryPanel>
  ),
};
