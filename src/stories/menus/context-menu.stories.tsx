import type { Meta, StoryObj } from "@storybook/react";
import { Circle, PencilSimple, StackPlus, Trash } from "@phosphor-icons/react/dist/ssr";

import { ContextActionMenuContent } from "@/components/ui/action-menu";
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

/**
 * The tree CRUD pattern used by the estimate workspace trees (sheets,
 * components, templates): icon-aligned items via `ContextActionMenuContent`,
 * grouped create / edit / destructive sections, disabled reasons on hover.
 */
export const TreeCrudPattern: Story = {
  render: () => (
    <StoryPanel className="space-y-2">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="flex h-28 max-w-sm items-center justify-center rounded-xs border border-dashed border-hairline bg-surfaceMuted text-[10px] font-medium leading-4 text-secondary">
            Right-click this estimate tree group row
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextActionMenuContent
            groups={[
              {
                id: "create",
                items: [
                  { id: "add-area-inside", label: "Add area inside", icon: <Circle size={12} weight="regular" />, onSelect: () => {} },
                ],
              },
              {
                id: "actions",
                items: [
                  { id: "save-template", label: "Save as template", icon: <StackPlus size={12} weight="regular" />, onSelect: () => {} },
                  {
                    id: "rename",
                    label: "Rename",
                    icon: <PencilSimple size={12} weight="regular" />,
                    disabled: true,
                    disabledReason: "Finish the current tree save before renaming another node.",
                    onSelect: () => {},
                  },
                ],
              },
              {
                id: "danger",
                items: [
                  { id: "delete", label: "Delete", icon: <Trash size={12} weight="regular" />, tone: "destructive", onSelect: () => {} },
                ],
              },
            ]}
          />
        </ContextMenuContent>
      </ContextMenu>
      <Note>
        Create, edit, and destructive actions live in separated groups; every item carries an icon so labels stay on one
        axis, and disabled items explain themselves through their hover title.
      </Note>
    </StoryPanel>
  ),
};

export const KeyboardFocus: Story = {
  render: () => (
    <StoryPanel className="space-y-2">
      <StaticContextMenuSurface />
      <Note>Keyboard contract: Context Menu key opens the trigger, Arrow keys move roving focus, Escape closes and returns focus.</Note>
    </StoryPanel>
  ),
};
