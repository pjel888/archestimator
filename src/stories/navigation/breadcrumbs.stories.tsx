import type { Meta, StoryObj } from "@storybook/react";

import { Breadcrumbs } from "@/components/ui";
import { StoryPanel } from "../ui-library/story-canvas";

const meta = {
  title: "Navigation/Breadcrumbs",
  component: Breadcrumbs,
  parameters: {
    docs: {
      description: {
        component: "Breadcrumbs component for hierarchical navigation.",
      },
    },
  },
  args: {
    items: [
      { label: "Projects", href: "/projects" },
      { label: "Acme Corp HQ", href: "/projects/1" },
      { label: "Estimates", href: "/projects/1/estimates" },
      { label: "Base Bid" },
    ],
  },
} satisfies Meta<typeof Breadcrumbs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <StoryPanel>
      <Breadcrumbs
        items={[
          { label: "Projects", href: "/projects" },
          { label: "Acme Corp HQ", href: "/projects/1" },
          { label: "Estimates", href: "/projects/1/estimates" },
          { label: "Base Bid" },
        ]}
      />
    </StoryPanel>
  ),
};

export const WithHomeIcon: Story = {
  render: () => (
    <StoryPanel>
      <Breadcrumbs
        showHome
        items={[
          { label: "Projects", href: "/projects" },
          { label: "Acme Corp HQ", href: "/projects/1" },
          { label: "Base Bid" },
        ]}
      />
    </StoryPanel>
  ),
};

export const Truncated: Story = {
  render: () => (
    <StoryPanel>
      <Breadcrumbs
        maxItems={3}
        items={[
          { label: "Projects", href: "/projects" },
          { label: "Acme Corp HQ", href: "/projects/1" },
          { label: "Estimates", href: "/projects/1/estimates" },
          { label: "Drafts", href: "/projects/1/estimates/drafts" },
          { label: "Base Bid" },
        ]}
      />
    </StoryPanel>
  ),
};

export const LongLabels: Story = {
  render: () => (
    <StoryPanel>
      <Breadcrumbs
        items={[
          { label: "Projects", href: "/projects" },
          { label: "Very Long Project Name That Might Need Truncation In The UI", href: "/projects/1" },
          { label: "Base Bid" },
        ]}
      />
    </StoryPanel>
  ),
};
