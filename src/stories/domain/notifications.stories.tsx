import type { Meta, StoryObj } from "@storybook/react";

import { Note, NotificationPreview, StoryHeader, StorySection } from "../ui-library/story-canvas";

const meta = {
  title: "Domain notifications/Notification Review Blocks",
  parameters: {
    docs: {
      description: {
        component:
          "P1 notification and release-announcement stories rendered from static notification fixtures only.",
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const NotificationListStates: Story = {
  render: () => (
    <>
      <StoryHeader
        eyebrow="P1 notifications"
        title="Notification center states"
        description="Unread, read, empty, announcement, warning, and release-modal patterns without live query hooks."
      />
      <NotificationPreview />
      <StorySection title="Boundary">
        <Note>NotificationProvider, server actions, repositories, and live delivery state stay out of Storybook.</Note>
      </StorySection>
    </>
  ),
};
