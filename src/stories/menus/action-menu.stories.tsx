import type { Meta, StoryObj } from "@storybook/react";
import { Archive, Copy, DotsThree, Export, PencilSimple, Trash } from "@phosphor-icons/react";

import { ContextActionMenuContent, type ActionMenuGroup } from "@/components/ui/action-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";
import { Note, StoryGrid, StoryPanel } from "../ui-library/story-canvas";

const groups: ActionMenuGroup[] = [
  {
    id: "primary",
    items: [
      { id: "rename", label: "Rename", shortcut: "R", onSelect: () => undefined },
      { id: "duplicate", label: "Duplicate", shortcut: "D", onSelect: () => undefined },
      { id: "archive", label: "Archive", disabled: true, disabledReason: "Story fixture disabled state", onSelect: () => undefined },
    ],
  },
  {
    id: "danger",
    items: [
      { id: "delete", label: "Delete", shortcut: "⌫", tone: "destructive", onSelect: () => undefined },
    ],
  },
];

function StaticActionMenu() {
  return (
    <div className="w-44 rounded-xs border border-hairline bg-white p-1 shadow-[0_12px_32px_rgba(17,24,39,0.12)]">
      <div className="flex min-h-7 items-center gap-2 rounded-xs px-2 py-1 text-[10px] font-medium leading-3 text-ink">
        <PencilSimple size={12} weight="regular" aria-hidden="true" />
        Rename
        <span className="ml-auto text-[9px] text-tertiary">R</span>
      </div>
      <div className="flex min-h-7 items-center gap-2 rounded-xs px-2 py-1 text-[10px] font-medium leading-3 text-ink">
        <Copy size={12} weight="regular" aria-hidden="true" />
        Duplicate
        <span className="ml-auto text-[9px] text-tertiary">D</span>
      </div>
      <div className="flex min-h-7 items-center gap-2 rounded-xs px-2 py-1 text-[10px] font-medium leading-3 text-tertiary">
        <Archive size={12} weight="regular" aria-hidden="true" />
        Archive
      </div>
      <div className="-mx-1 my-1 h-px bg-hairline" />
      <div className="flex min-h-7 items-center gap-2 rounded-xs px-2 py-1 text-[10px] font-medium leading-3 text-danger">
        <Trash size={12} weight="regular" aria-hidden="true" />
        Delete
        <span className="ml-auto text-[9px] text-tertiary">⌫</span>
      </div>
    </div>
  );
}

const meta = {
  title: "Menus/ActionMenu",
  component: ContextActionMenuContent,
  parameters: {
    docs: {
      description: {
        component:
          "Standalone ActionMenu story for grouped row actions, disabled items, destructive actions, and shortcuts. Static menu surfaces supplement the Radix right-click trigger so the component is inspectable without live data.",
      },
    },
  },
} satisfies Meta<typeof ContextActionMenuContent>;

export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <StoryPanel className="space-y-2">
      <StaticActionMenu />
      <Note>Static fixture mirrors the interactive menu content so review does not depend on opening a popover.</Note>
    </StoryPanel>
  ),
};

export const TriggeredProviderFreeExample: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Button variant="secondary">
          <DotsThree size={12} weight="regular" aria-hidden="true" />
          Open with right click
        </Button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextActionMenuContent groups={groups} />
      </ContextMenuContent>
    </ContextMenu>
  ),
};

export const Grouped: Story = {
  render: () => (
    <StoryGrid columns="md:grid-cols-2">
      <StaticActionMenu />
      <div className="w-44 rounded-xs border border-hairline bg-white p-1 shadow-[0_12px_32px_rgba(17,24,39,0.12)]">
        <div className="px-2 py-1 text-[9px] font-medium leading-3 text-tertiary">Export</div>
        <div className="flex min-h-7 items-center gap-2 rounded-xs px-2 py-1 text-[10px] font-medium leading-3 text-ink">
          <Export size={12} weight="regular" aria-hidden="true" />
          Export proposal
        </div>
        <div className="-mx-1 my-1 h-px bg-hairline" />
        <div className="px-2 py-1 text-[9px] font-medium leading-3 text-tertiary">Danger zone</div>
        <div className="flex min-h-7 items-center gap-2 rounded-xs px-2 py-1 text-[10px] font-medium leading-3 text-danger">
          <Trash size={12} weight="regular" aria-hidden="true" />
          Delete estimate
        </div>
      </div>
    </StoryGrid>
  ),
};

export const DisabledItem: Story = {
  render: () => <StaticActionMenu />,
};

export const DestructiveItem: Story = {
  render: () => <StaticActionMenu />,
};

export const WithShortcut: Story = {
  render: () => <StaticActionMenu />,
};

export const KeyboardFocus: Story = {
  render: () => (
    <StoryPanel className="space-y-2">
      <StaticActionMenu />
      <Note>Keyboard contract: Radix ContextMenuContent owns roving focus when opened; static preview documents labels and shortcuts only.</Note>
    </StoryPanel>
  ),
};

export const RawContextItems: Story = {
  render: () => (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Button>Right-click row action</Button>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem>Open row</ContextMenuItem>
        <ContextMenuItem>Rename row<ContextMenuShortcut>R</ContextMenuShortcut></ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive">Delete row</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
};
