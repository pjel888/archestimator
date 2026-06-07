import type { Meta, StoryObj } from "@storybook/react";

import { MotionBoundaryPreview, StoryHeader } from "../ui-library/story-canvas";

const meta = {
  title: "Motion/Boundaries",
  parameters: {
    docs: {
      description: {
        component: "CSS-only motion wrappers and landing-only effect boundary for the Storybook MVP.",
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ReducedMotionAndLandingOnly: Story = {
  render: () => (
    <>
      <StoryHeader
        eyebrow="P1 motion"
        title="Reduced-motion and landing-only boundaries"
        description="No Motion or Framer dependency is added; app/workshop examples use CSS-only reduced-motion-safe transitions."
      />
      <MotionBoundaryPreview />
    </>
  ),
};
