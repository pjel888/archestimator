import type { Meta, StoryObj } from "@storybook/react";

import { ControlInput, CONTROL_INPUT_SURFACE_CLASS } from "@/components/ui/control-input";
import { Note, StoryGrid, StoryPanel } from "../ui-library/story-canvas";

function EditableCellPreview() {
  return (
    <StoryGrid columns="md:grid-cols-3">
      <StoryPanel>
        <p className="mb-1 text-[9px] leading-3 text-tertiary">Text cell</p>
        <ControlInput className={CONTROL_INPUT_SURFACE_CLASS} defaultValue="Reception millwork" aria-label="Editable text cell" />
      </StoryPanel>
      <StoryPanel>
        <p className="mb-1 text-[9px] leading-3 text-tertiary">Money cell</p>
        <ControlInput className={CONTROL_INPUT_SURFACE_CLASS} align="right" defaultValue="285000" aria-label="Editable money cell" />
      </StoryPanel>
      <StoryPanel>
        <p className="mb-1 text-[9px] leading-3 text-tertiary">Invalid cell</p>
        <ControlInput className={CONTROL_INPUT_SURFACE_CLASS} invalid align="right" defaultValue="-4" aria-label="Invalid editable quantity cell" />
      </StoryPanel>
    </StoryGrid>
  );
}

const meta = {
  title: "Data Display/EditableCell",
  component: EditableCellPreview,
  parameters: {
    archestimator: {
      storybookContract: "story-composition",
    },
    docs: {
      description: {
        component:
          "Story-only editable cell composition using ControlInput. Documents expected text, money, quantity, and invalid cell states without changing estimate route behavior.",
      },
    },
  },
} satisfies Meta<typeof EditableCellPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <EditableCellPreview />,
};

export const KeyboardFocus: Story = {
  render: () => (
    <StoryPanel className="space-y-2">
      <EditableCellPreview />
      <Note>Keyboard contract: Enter/blur persistence remains route-owned; this story only documents visual cell states.</Note>
    </StoryPanel>
  ),
};
