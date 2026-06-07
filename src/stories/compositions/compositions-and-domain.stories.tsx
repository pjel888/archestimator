import type { Meta, StoryObj } from "@storybook/react";

import {
  CompactDataTable,
  DomainCardsPreview,
  MotionBoundaryPreview,
  NotificationPreview,
  StoryHeader,
  StorySection,
  WorkshopShellPreview,
} from "../ui-library/story-canvas";

const meta = {
  title: "Domain workshop/Compositions and Static Blocks",
  parameters: {
    docs: {
      description: {
        component:
          "P1 app shell, sidebar, data table, editable-cell, project, estimate, component library, share, notification, proposal, and motion boundary stories built from static fixtures.",
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const AppShellSidebarAndTabs: Story = {
  render: () => (
    <>
      <StoryHeader
        eyebrow="P1 navigation and layout"
        title="App shell, sidebar, and compact workspace block"
        description="Static shell composition for review only. It does not replace WorkshopPageShell or any route UI."
      />
      <WorkshopShellPreview />
    </>
  ),
};

export const DataTableAndEditableCell: Story = {
  render: () => (
    <>
      <StoryHeader
        eyebrow="P1 data display"
        title="Data table and editable cell states"
        description="Static table uses fake estimate rows to cover loading, selected, overflow, dirty, invalid, and numeric states."
      />
      <CompactDataTable />
    </>
  ),
};

export const ProjectEstimateComponentLibraryAndShare: Story = {
  render: () => (
    <>
      <StoryHeader
        eyebrow="P1 domain"
        title="Project, estimate, component library, and share review cards"
        description="Representative domain blocks use deterministic fixtures and remain Storybook-only until owner migration approval."
      />
      <DomainCardsPreview />
    </>
  ),
};

export const NotificationAndReleaseStates: Story = {
  render: () => (
    <>
      <StoryHeader
        eyebrow="P1 notifications"
        title="Notification center and release modal states"
        description="Static notification list covers unread/read, success/warning/info, and compact timestamp states without NotificationProvider."
      />
      <NotificationPreview />
    </>
  ),
};

export const MotionAndLandingOnlyBoundary: Story = {
  render: () => (
    <>
      <StoryHeader
        eyebrow="P1 motion"
        title="Motion wrappers and landing-only boundary"
        description="Motion remains CSS-only and reduced-motion-safe; Aceternity-style effects are labelled landing-only."
      />
      <StorySection title="Motion boundary">
        <MotionBoundaryPreview />
      </StorySection>
    </>
  ),
};
