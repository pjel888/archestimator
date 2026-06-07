import type { Meta, StoryObj } from "@storybook/react";

import { DomainCardsPreview, Note, StoryHeader, StorySection } from "../ui-library/story-canvas";

const meta = {
  title: "Domain share/Share Review Blocks",
  parameters: {
    docs: {
      description: {
        component:
          "P1 public share review and proposal block stories using fake static share data only.",
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ShareReviewStates: Story = {
  render: () => (
    <>
      <StoryHeader
        eyebrow="P1 share"
        title="Share review panel states"
        description="Readonly pending, approved, needs-changes, and expired share patterns stay detached from token routes."
      />
      <DomainCardsPreview />
      <StorySection title="Boundary">
        <Note>These stories never import public share routes, recipient session initializers, comments actions, password forms, or token handlers.</Note>
      </StorySection>
    </>
  ),
};
