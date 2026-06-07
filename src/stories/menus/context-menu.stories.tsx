import type { Meta, StoryObj } from "@storybook/react";

import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Note, StoryPanel } from "../ui-library/story-canvas";

function ContextMenuDemo() {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="flex h-28 max-w-sm items-center justify-center rounded-xs border border-dashed border-hairline bg-surfaceMuted text-[10px] font-medium leading-4 text-secondary">
          Right-click this static estimate row surface
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuLabel>Estimate row</ContextMenuLabel>
        <ContextMenuItem>Open details<ContextMenuShortcut>↵</ContextMenuShortcut></ContextMenuItem>
        <ContextMenuItem>Rename<ContextMenuShortcut>R</ContextMenuShortcut></ContextMenuItem>
        <ContextMenuCheckboxItem checked>Show cost columns</ContextMenuCheckboxItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>Move to group</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem>General requirements</ContextMenuItem>
            <ContextMenuItem>Millwork</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuRadioGroup value="review">
          <ContextMenuRadioItem value="draft">Draft</ContextMenuRadioItem>
          <ContextMenuRadioItem value="review">Review</ContextMenuRadioItem>
        </ContextMenuRadioGroup>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive">Delete row</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function StaticContextMenuSurface() {
  return (
    <div className="w-52 rounded-xs border border-hairline bg-white p-1 shadow-[0_12px_32px_rgba(17,24,39,0.12)]">
      {["Open details", "Rename", "Show cost columns", "Move to group >"].map((item) => (
        <div key={item} className="flex min-h-7 items-center rounded-xs px-2 py-1 text-[10px] font-medium leading-3 text-ink">
          {item}
        </div>
      ))}
      <div className="-mx-1 my-1 h-px bg-hairline" />
      <div className="flex min-h-7 items-center rounded-xs px-2 py-1 text-[10px] font-medium leading-3 text-danger">
        Delete row
      </div>
    </div>
  );
}

const meta = {
  title: "Menus/ContextMenu",
  component: ContextMenu,
  parameters: {
    docs: {
      description: {
        component:
          "Standalone ContextMenu story for right-click row and tree actions. Interactive Radix content is paired with a static visible surface for design review.",
      },
    },
  },
} satisfies Meta<typeof ContextMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <ContextMenuDemo />,
};

export const RightClickExample: Story = {
  render: () => (
    <StoryPanel className="space-y-2">
      <ContextMenuDemo />
      <Note>Right-click or use the browser/context-menu key on the trigger to open the interactive menu.</Note>
    </StoryPanel>
  ),
};

export const StaticStateMatrix: Story = {
  render: () => <StaticContextMenuSurface />,
};

export const DisabledAndDestructive: Story = {
  render: () => <StaticContextMenuSurface />,
};

export const NestedOrSubmenu: Story = {
  render: () => <ContextMenuDemo />,
};

export const KeyboardFocus: Story = {
  render: () => (
    <StoryPanel className="space-y-2">
      <StaticContextMenuSurface />
      <Note>Keyboard contract: Context Menu key opens the trigger, Arrow keys move roving focus, Escape closes and returns focus.</Note>
    </StoryPanel>
  ),
};
