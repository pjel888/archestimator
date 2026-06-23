import type { Meta, StoryObj } from "@storybook/react";

import { Note, StoryGrid, StoryPanel } from "../ui-library/story-canvas";

function CheckboxRadioSwitchPreview() {
  return (
    <StoryGrid columns="md:grid-cols-3">
      <StoryPanel className="space-y-2">
        <label className="flex items-center gap-2 text-[10px] font-medium leading-4 text-ink">
          <input type="checkbox" defaultChecked className="size-3 accent-[#292929]" />
          Include supplier pricing
        </label>
        <label className="flex items-center gap-2 text-[10px] font-medium leading-4 text-ink">
          <input type="checkbox" className="size-3 accent-[#292929]" />
          Show inactive rows
        </label>
      </StoryPanel>
      <StoryPanel className="space-y-2">
        <div role="radiogroup" aria-label="Review decision" className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-medium leading-4 text-ink">
            <input type="radio" name="decision-story" defaultChecked className="size-3 accent-[#292929]" />
            Pending
          </label>
          <label className="flex items-center gap-2 text-[10px] font-medium leading-4 text-ink">
            <input type="radio" name="decision-story" className="size-3 accent-[#292929]" />
            Approved
          </label>
        </div>
      </StoryPanel>
      <StoryPanel className="space-y-2">
        <label className="flex items-center justify-between gap-3 text-[10px] font-medium leading-4 text-ink">
          Compact mode
          <input type="checkbox" role="switch" aria-checked={true} defaultChecked className="h-3 w-6 accent-[#292929]" />
        </label>
        <Note>Story-only native controls document Checkbox, RadioGroup, and Switch until a shared wrapper is approved.</Note>
      </StoryPanel>
    </StoryGrid>
  );
}

const meta = {
  title: "Forms/Checkbox Radio Switch",
  component: CheckboxRadioSwitchPreview,
  parameters: {
    docs: {
      description: {
        component:
          "Story-only native control coverage for Checkbox, RadioGroup, and Switch. No new runtime dependency or production primitive is introduced.",
      },
    },
  },
} satisfies Meta<typeof CheckboxRadioSwitchPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <CheckboxRadioSwitchPreview />,
};

export const Disabled: Story = {
  render: () => (
    <StoryPanel className="space-y-2">
      <label className="flex items-center gap-2 text-[10px] font-medium leading-4 text-tertiary">
        <input type="checkbox" disabled className="size-3 accent-[#292929]" />
        Disabled checkbox
      </label>
      <label className="flex items-center gap-2 text-[10px] font-medium leading-4 text-tertiary">
        <input type="radio" disabled className="size-3 accent-[#292929]" />
        Disabled radio
      </label>
      <label className="flex items-center justify-between gap-3 text-[10px] font-medium leading-4 text-tertiary">
        Disabled switch
        <input type="checkbox" role="switch" aria-checked={false} disabled className="h-3 w-6 accent-[#292929]" />
      </label>
    </StoryPanel>
  ),
};
