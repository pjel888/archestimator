import type { Meta, StoryObj } from "@storybook/react";

import { CompactDataTable, Note, StoryHeader, StorySection } from "../ui-library/story-canvas";

const meta = {
  title: "Data display/Table and Cells",
  parameters: {
    docs: {
      description: {
        component:
          "P1 dense data display stories for table, row, cell, editable state, selected state, sorting note, and overflow handling.",
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const TableStates: Story = {
  render: () => (
    <>
      <StoryHeader
        eyebrow="P1 data display"
        title="Compact table and editable cell states"
        description="Static estimate rows cover long labels, invalid state, dirty state, numeric alignment, and overflow."
      />
      <CompactDataTable />
      <StorySection title="Keyboard note">
        <Note>Interaction play candidate: Enter to edit, Escape to cancel, Tab to move to the next editable cell.</Note>
      </StorySection>
    </>
  ),
};
