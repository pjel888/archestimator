import type { Meta, StoryObj } from "@storybook/react";

import { ControlField, ControlTextarea } from "@/components/ui/control-input";
import { Note, StoryPanel } from "../ui-library/story-canvas";

const meta = {
  title: "Forms/Textarea",
  component: ControlTextarea,
  parameters: {
    docs: {
      description: {
        component:
          "Standalone textarea story for compact multi-line notes. Static fixtures cover helper, invalid, disabled, read-only, long value, and focus behavior.",
      },
    },
  },
  args: {
    rows: 4,
    defaultValue: "Review allowance assumptions before sharing this proposal.",
    "aria-label": "Reviewer notes",
  },
} satisfies Meta<typeof ControlTextarea>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHelper: Story = {
  render: () => (
    <ControlField label="Reviewer notes" helperText="Use static copy only in Storybook stories.">
      <ControlTextarea rows={4} defaultValue="Confirm fixture-only review copy." />
    </ControlField>
  ),
};

export const Invalid: Story = {
  render: () => (
    <ControlField label="Decision note" errorText="A note is required before requesting changes.">
      <ControlTextarea invalid rows={4} defaultValue="" placeholder="Explain the requested change" />
    </ControlField>
  ),
};

export const Disabled: Story = {
  args: {
    disabled: true,
    defaultValue: "Locked after client approval.",
  },
};

export const Readonly: Story = {
  args: {
    readOnly: true,
    defaultValue: "Published note shown as read-only review context.",
  },
};

export const LongValue: Story = {
  args: {
    rows: 5,
    defaultValue:
      "Long notes keep the compact app density while allowing scrollable, readable review copy. This story uses static data only and does not persist edits.",
  },
};

export const KeyboardFocus: Story = {
  render: () => (
    <StoryPanel className="space-y-2">
      <ControlTextarea rows={4} defaultValue="Tab into this field and use Shift+Tab to leave." aria-label="Keyboard focus textarea" />
      <Note>Keyboard contract: native textarea focus, Escape behavior remains route-specific and is not simulated here.</Note>
    </StoryPanel>
  ),
};
