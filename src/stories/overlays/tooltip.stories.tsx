import type { Meta, StoryObj } from "@storybook/react";
import { MagnifyingGlass } from "@phosphor-icons/react";

import { ToolbarIconButton } from "@/components/ui/toolbar-icon-button";
import { Note, StoryPanel } from "../ui-library/story-canvas";

function TooltipPreview() {
  return (
    <StoryPanel className="space-y-3">
      <ToolbarIconButton label="Search estimate rows">
        <MagnifyingGlass size={12} weight="regular" aria-hidden="true" />
      </ToolbarIconButton>
      <span role="tooltip" className="inline-flex rounded-xs border border-hairline bg-ink px-1.5 py-1 text-[9px] font-medium leading-none text-white">
        Search estimate rows
      </span>
    </StoryPanel>
  );
}

const meta = {
  title: "Overlays/Tooltip",
  component: ToolbarIconButton,
  parameters: {
    docs: {
      description: {
        component:
          "Standalone tooltip story for the ToolbarIconButton + ToolbarTooltip pattern. Static tooltip state is shown so visual review does not depend on hover timing.",
      },
    },
  },
} satisfies Meta<typeof ToolbarIconButton>;

export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => <TooltipPreview />,
};

export const ToolbarTooltip: Story = {
  render: () => <TooltipPreview />,
};

export const KeyboardFocus: Story = {
  render: () => (
    <StoryPanel className="space-y-2">
      <TooltipPreview />
      <Note>Keyboard contract: icon buttons expose labels directly; tooltip text is supplemental, not the only accessible name.</Note>
    </StoryPanel>
  ),
};
