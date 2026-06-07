import type { Meta, StoryObj } from "@storybook/react";

import { Avatar } from "@/components/ui";
import { StoryPanel } from "../ui-library/story-canvas";

const meta = {
  title: "Media/Avatar",
  component: Avatar,
  parameters: {
    docs: {
      description: {
        component: "Avatar component for displaying user profile images or initials.",
      },
    },
  },
} satisfies Meta<typeof Avatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <StoryPanel className="flex items-center gap-4">
      <Avatar initials="JD" />
    </StoryPanel>
  ),
};

export const Sizes: Story = {
  render: () => (
    <StoryPanel className="flex items-end gap-4">
      <Avatar size="xs" initials="XS" />
      <Avatar size="sm" initials="SM" />
      <Avatar size="md" initials="MD" />
      <Avatar size="lg" initials="LG" />
    </StoryPanel>
  ),
};

export const WithImage: Story = {
  render: () => (
    <StoryPanel className="flex items-end gap-4">
      <Avatar size="xs" src="https://i.pravatar.cc/150?u=xs" alt="User XS" />
      <Avatar size="sm" src="https://i.pravatar.cc/150?u=sm" alt="User SM" />
      <Avatar size="md" src="https://i.pravatar.cc/150?u=md" alt="User MD" />
      <Avatar size="lg" src="https://i.pravatar.cc/150?u=lg" alt="User LG" />
    </StoryPanel>
  ),
};

export const Fallback: Story = {
  render: () => (
    <StoryPanel className="flex items-center gap-4">
      <Avatar src="https://invalid-url.com/image.jpg" initials="FB" alt="Fallback User" />
      <Avatar />
    </StoryPanel>
  ),
};
