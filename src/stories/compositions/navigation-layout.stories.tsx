import type { Meta, StoryObj } from "@storybook/react";

import { Note, StoryHeader, StorySection, WorkshopShellPreview } from "../ui-library/story-canvas";

const meta = {
  title: "Navigation and layout/App Shell",
  parameters: {
    docs: {
      description: {
        component:
          "P1 static navigation, sidebar, app shell, tabs/switcher, and layout stories for Storybook review only.",
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const AppShellStates: Story = {
  render: () => (
    <>
      <StoryHeader
        eyebrow="P1 navigation"
        title="Static app shell and sidebar states"
        description="Expanded shell preview with active item, compact workspace density, and responsive single-column fallback."
      />
      <WorkshopShellPreview />
      <StorySection title="Migration boundary">
        <Note>WorkshopPageShell is not imported or replaced. Future route migration needs separate owner approval and graph impact.</Note>
      </StorySection>
    </>
  ),
};
