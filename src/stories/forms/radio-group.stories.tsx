import type { Meta, StoryObj } from "@storybook/react";

import { Note, StoryPanel } from "../ui-library/story-canvas";

function RadioGroupPreview({ invalid = false, disabled = false }: { invalid?: boolean; disabled?: boolean }) {
  return (
    <StoryPanel className="space-y-2">
      <div className="space-y-2" role="radiogroup" aria-label="Review decision" aria-invalid={invalid || undefined}>
        {["Pending", "Approved", "Changes requested"].map((label, index) => (
          <label key={label} className={`flex items-center gap-2 text-[10px] font-medium leading-4 ${disabled ? "text-tertiary" : "text-ink"}`}>
            <input
              type="radio"
              name="review-decision-story"
              defaultChecked={index === 0}
              disabled={disabled}
              className="size-3 accent-[#292929]"
            />
            {label}
          </label>
        ))}
      </div>
      {invalid ? <Note tone="danger">Choose one static review decision before sharing.</Note> : null}
    </StoryPanel>
  );
}

const meta = {
  title: "Forms/RadioGroup",
  component: RadioGroupPreview,
  parameters: {
    archestimator: {
      storybookContract: "fixture-only",
    },
    docs: {
      description: {
        component:
          "Standalone RadioGroup story using native radio controls. No custom menu or provider state is introduced.",
      },
    },
  },
} satisfies Meta<typeof RadioGroupPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <RadioGroupPreview />,
};

export const Invalid: Story = {
  render: () => <RadioGroupPreview invalid />,
};

export const Disabled: Story = {
  render: () => <RadioGroupPreview disabled />,
};

export const KeyboardFocus: Story = {
  render: () => (
    <StoryPanel className="space-y-2">
      <RadioGroupPreview />
      <Note>Keyboard contract: native radio inputs support Tab entry and arrow-key selection in browser-managed groups.</Note>
    </StoryPanel>
  ),
};
