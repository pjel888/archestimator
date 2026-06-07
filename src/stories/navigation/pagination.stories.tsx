import type { Meta, StoryObj } from "@storybook/react";

import { Pagination } from "@/components/ui";
import { StoryPanel } from "../ui-library/story-canvas";

const meta = {
  title: "Navigation/Pagination",
  component: Pagination,
  parameters: {
    docs: {
      description: {
        component: "Pagination component for navigating through multiple pages of content.",
      },
    },
  },
  args: {
    page: 1,
    totalPages: 5,
    onPageChange: () => {},
  },
} satisfies Meta<typeof Pagination>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <StoryPanel>
      <Pagination
        page={1}
        totalPages={5}
        onPageChange={() => {}}
      />
    </StoryPanel>
  ),
};

export const ManyPagesStart: Story = {
  render: () => (
    <StoryPanel>
      <Pagination
        page={1}
        totalPages={20}
        onPageChange={() => {}}
      />
    </StoryPanel>
  ),
};

export const ManyPagesMiddle: Story = {
  render: () => (
    <StoryPanel>
      <Pagination
        page={10}
        totalPages={20}
        onPageChange={() => {}}
      />
    </StoryPanel>
  ),
};

export const ManyPagesEnd: Story = {
  render: () => (
    <StoryPanel>
      <Pagination
        page={20}
        totalPages={20}
        onPageChange={() => {}}
      />
    </StoryPanel>
  ),
};

export const SinglePage: Story = {
  render: () => (
    <StoryPanel>
      <Pagination
        page={1}
        totalPages={1}
        onPageChange={() => {}}
      />
    </StoryPanel>
  ),
};
