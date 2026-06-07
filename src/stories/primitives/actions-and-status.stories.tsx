import type { Meta, StoryObj } from "@storybook/react";

import {
  ButtonMatrix,
  Note,
  StatusAndChipMatrix,
  StoryHeader,
  StorySection,
} from "../ui-library/story-canvas";

const meta = {
  title: "Actions and status/Primitive Stories",
  parameters: {
    docs: {
      description: {
        component:
          "P0 Button, IconButton, Badge, Chip, status, loading, disabled, danger, and long-content states.",
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ButtonAndIconButton: Story = {
  render: () => (
    <>
      <StoryHeader
        eyebrow="P0 actions"
        title="Button and icon button states"
        description="Actual shared Button primitive states before any production migration."
      />
      <ButtonMatrix />
      <StorySection title="Keyboard behavior">
        <Note>Native button semantics cover Tab focus and Enter/Space activation. Loading uses `aria-busy`.</Note>
      </StorySection>
    </>
  ),
};

export const BadgesChipsAndIndicators: Story = {
  render: () => (
    <>
      <StoryHeader
        eyebrow="P0 status"
        title="Badge, chip, and status indicator states"
        description="Compact status surfaces cover tone, selected, removable, long-content, and non-color cues."
      />
      <StatusAndChipMatrix />
    </>
  ),
};
