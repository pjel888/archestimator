import type { Meta, StoryObj } from "@storybook/react";

import { Note, StoryPanel } from "../ui-library/story-canvas";

function CheckboxPreview({ invalid = false, disabled = false }: { invalid?: boolean; disabled?: boolean }) {
  return (
    <StoryPanel className="space-y-2">
      <label className={`flex items-center gap-2 text-[10px] font-medium leading-4 ${disabled ? "text-tertiary" : "text-ink"}`}>
        <input
          type="checkbox"
          defaultChecked
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className="size-3 accent-[#292929]"
        />
        Include supplier pricing
      </label>
      {invalid ? <Note tone="danger">At least one static checkbox option must be selected.</Note> : null}
    </StoryPanel>
  );
}

const meta = {
  title: "Forms/Checkbox",
  component: CheckboxPreview,
  parameters: {
    docs: {
      description: {
        component:
          "Standalone Checkbox story using native controls until a shared wrapper is approved. Static examples cover default, invalid, disabled, and keyboard focus states.",
      },
    },
  },
} satisfies Meta<typeof CheckboxPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <CheckboxPreview />,
};

export const Invalid: Story = {
  render: () => <CheckboxPreview invalid />,
};

export const Disabled: Story = {
  render: () => <CheckboxPreview disabled />,
};

export const KeyboardFocus: Story = {
  render: () => (
    <StoryPanel className="space-y-2">
      <CheckboxPreview />
      <Note>Keyboard contract: native Space toggles the checkbox; Tab and Shift+Tab move between controls.</Note>
    </StoryPanel>
  ),
};
