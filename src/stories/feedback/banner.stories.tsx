import type { Meta, StoryObj } from "@storybook/react";

import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { StoryPanel } from "../ui-library/story-canvas";

const meta = {
  title: "Feedback/Banner",
  component: Banner,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "A banner component for displaying important messages, alerts, or notifications.",
      },
    },
  },
  args: {
    title: "Default banner title",
  },
  argTypes: {
    tone: {
      control: "select",
      options: ["info", "success", "warning", "danger"],
    },
  },
} satisfies Meta<typeof Banner>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AllTones: Story = {
  render: () => (
    <StoryPanel className="max-w-2xl space-y-4">
      <Banner 
        tone="info" 
        title="Update available" 
        description="A new version of the application is ready to install." 
      />
      <Banner 
        tone="success" 
        title="Project published" 
        description="Your estimate has been successfully published and shared." 
      />
      <Banner 
        tone="warning" 
        title="Approaching limit" 
        description="You have used 90% of your monthly storage quota." 
      />
      <Banner 
        tone="danger" 
        title="Connection lost" 
        description="We couldn't save your recent changes. Please check your internet connection." 
      />
    </StoryPanel>
  ),
};

export const Dismissible: Story = {
  render: () => (
    <StoryPanel className="max-w-2xl">
      <Banner 
        tone="info" 
        title="Welcome to the new workspace" 
        description="We've redesigned the interface to make estimating faster." 
        onDismiss={() => console.log("Dismissed")}
      />
    </StoryPanel>
  ),
};

export const WithActions: Story = {
  render: () => (
    <StoryPanel className="max-w-2xl">
      <Banner 
        tone="warning" 
        title="Subscription expiring soon" 
        description="Your current plan will expire in 3 days." 
        actions={
          <>
            <Button variant="ghost" size="sm" className="h-6 text-[10px]">Remind me later</Button>
            <Button variant="secondary" size="sm" className="h-6 text-[10px]">Renew now</Button>
          </>
        }
      />
    </StoryPanel>
  ),
};

export const TitleOnly: Story = {
  render: () => (
    <StoryPanel className="max-w-2xl">
      <Banner 
        tone="success" 
        title="Settings saved successfully." 
      />
    </StoryPanel>
  ),
};
