import type { Meta, StoryObj } from "@storybook/react";

import { PageHeader, Button } from "@/components/ui";
import { StoryPanel } from "../ui-library/story-canvas";

const meta = {
  title: "Navigation/PageHeader",
  component: PageHeader,
  parameters: {
    docs: {
      description: {
        component: "PageHeader component for displaying page titles, descriptions, and actions.",
      },
    },
  },
  args: {
    title: "Projects",
  },
} satisfies Meta<typeof PageHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <StoryPanel>
      <PageHeader title="Projects" />
    </StoryPanel>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <StoryPanel>
      <PageHeader
        title="Projects"
        description="Manage your construction projects and estimates."
      />
    </StoryPanel>
  ),
};

export const WithActions: Story = {
  render: () => (
    <StoryPanel>
      <PageHeader
        title="Projects"
        description="Manage your construction projects and estimates."
        actions={
          <>
            <Button variant="secondary">Import</Button>
            <Button variant="primary">New Project</Button>
          </>
        }
      />
    </StoryPanel>
  ),
};

export const WithBreadcrumbs: Story = {
  render: () => (
    <StoryPanel>
      <PageHeader
        title="Base Bid"
        description="Main estimate for the Acme Corp HQ project."
        breadcrumbs={[
          { label: "Projects", href: "/projects" },
          { label: "Acme Corp HQ", href: "/projects/1" },
          { label: "Estimates", href: "/projects/1/estimates" },
          { label: "Base Bid" },
        ]}
        actions={
          <>
            <Button variant="secondary">Export</Button>
            <Button variant="primary">Share</Button>
          </>
        }
      />
    </StoryPanel>
  ),
};

export const LongTitle: Story = {
  render: () => (
    <StoryPanel className="max-w-md">
      <PageHeader
        title="Extremely Long Project Name That Might Need Truncation In The UI Because It Is So Long"
        description="This demonstrates how the page header handles very long titles that exceed the available width."
        actions={<Button variant="primary">Save</Button>}
      />
    </StoryPanel>
  ),
};
