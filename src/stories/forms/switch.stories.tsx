import type { Meta, StoryObj } from "@storybook/react";

import { Note, StoryPanel } from "../ui-library/story-canvas";

function SwitchPreview({ checked = false, disabled = false }: { checked?: boolean; disabled?: boolean }) {
  return (
    <StoryPanel className="max-w-xs space-y-2">
      <label className={`flex items-center justify-between gap-3 text-[10px] font-medium leading-4 ${disabled ? "text-tertiary" : "text-ink"}`}>
        Compact mode
        <input
          type="checkbox"
          role="switch"
          defaultChecked={checked}
          disabled={disabled}
          className="h-3 w-6 accent-[#292929]"
        />
      </label>
      <p className="text-[9px] leading-3 text-tertiary">Story-only native switch fixture; route persistence stays out of Storybook.</p>
    </StoryPanel>
  );
}

const meta = {
  title: "Forms/Switch",
  component: SwitchPreview,
  parameters: {
    docs: {
      description: {
        component:
          "Standalone Switch story using a native checkbox with role=switch. Covers unchecked, checked, disabled, and keyboard focus notes.",
      },
    },
  },
} satisfies Meta<typeof SwitchPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <SwitchPreview />,
};

export const Checked: Story = {
  render: () => <SwitchPreview checked />,
};

export const Disabled: Story = {
  render: () => <SwitchPreview checked disabled />,
};

export const KeyboardFocus: Story = {
  render: () => (
    <StoryPanel className="space-y-2">
      <SwitchPreview checked />
      <Note>Keyboard contract: native Space toggles the switch; visible label names the control.</Note>
    </StoryPanel>
  ),
};
