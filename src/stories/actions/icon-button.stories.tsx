import type { Meta, StoryObj } from "@storybook/react";
import { DotsThree, FunnelSimple, MagnifyingGlass, Plus, Trash } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { ToolbarIconButton } from "@/components/ui/toolbar-icon-button";
import { Note, StoryPanel } from "../ui-library/story-canvas";

const meta = {
  title: "Actions/IconButton",
  component: Button,
  parameters: {
    docs: {
      description: {
        component:
          "Standalone icon-button story using the shared Button primitive and ToolbarIconButton wrapper. Icon-only controls must always provide labels and regular-weight Phosphor icons.",
      },
    },
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <StoryPanel className="flex items-center gap-2">
      <Button size="icon-sm" aria-label="Add component">
        <Plus size={12} weight="regular" aria-hidden="true" />
      </Button>
      <span className="text-[10px] font-medium leading-4 text-ink">Add component icon button</span>
    </StoryPanel>
  ),
};

export const Toolbar: Story = {
  render: () => (
    <StoryPanel className="flex items-center gap-1">
      <ToolbarIconButton label="Search">
        <MagnifyingGlass size={12} weight="regular" aria-hidden="true" />
      </ToolbarIconButton>
      <ToolbarIconButton label="Filter">
        <FunnelSimple size={12} weight="regular" aria-hidden="true" />
      </ToolbarIconButton>
      <ToolbarIconButton label="More actions">
        <DotsThree size={12} weight="regular" aria-hidden="true" />
      </ToolbarIconButton>
    </StoryPanel>
  ),
};

export const WithVisibleLabel: Story = {
  render: () => (
    <ToolbarIconButton label="Filter components" visibleLabel="Filter">
      <FunnelSimple size={12} weight="regular" aria-hidden="true" />
    </ToolbarIconButton>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Button size="icon-sm" aria-label="Delete selected rows" disabled>
      <Trash size={12} weight="regular" aria-hidden="true" />
    </Button>
  ),
};

export const Destructive: Story = {
  render: () => (
    <Button size="icon-sm" variant="danger" aria-label="Delete selected rows">
      <Trash size={12} weight="regular" aria-hidden="true" />
    </Button>
  ),
};

export const KeyboardFocus: Story = {
  render: () => (
    <StoryPanel className="space-y-2">
      <div className="flex items-center gap-1">
        <Button size="icon-sm" aria-label="Add row">
          <Plus size={12} weight="regular" aria-hidden="true" />
        </Button>
        <Button size="icon-sm" variant="ghost" aria-label="Open row actions">
          <DotsThree size={12} weight="regular" aria-hidden="true" />
        </Button>
      </div>
      <Note>Keyboard contract: icon buttons are native buttons, expose `aria-label`, and keep tooltip text supplemental.</Note>
    </StoryPanel>
  ),
};
