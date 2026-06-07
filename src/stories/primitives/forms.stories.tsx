import type { Meta, StoryObj } from "@storybook/react";

import { FormControlMatrix, Note, StoryHeader, StorySection } from "../ui-library/story-canvas";

const meta = {
  title: "Form field primitives/Control Stories",
  parameters: {
    docs: {
      description: {
        component:
          "P0 form field stories for ControlField, ControlInput, SearchInput, ControlSelect, textarea, invalid, disabled, readonly, helper, and error states.",
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const FieldInputSearchAndSelect: Story = {
  render: () => (
    <>
      <StoryHeader
        eyebrow="P0 forms"
        title="Field, input, search, select, and textarea states"
        description="Actual shared form primitives with static values and no provider-backed options."
      />
      <FormControlMatrix />
      <StorySection title="Accessibility note">
        <Note>
          Labels remain visually compact. Error examples set invalid state; future interaction tests should verify helper/error id associations when APIs expand.
        </Note>
      </StorySection>
    </>
  ),
};
