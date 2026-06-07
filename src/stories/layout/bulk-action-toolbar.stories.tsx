import type { Meta, StoryObj } from "@storybook/react";
import { Copy, Trash, Archive } from "@phosphor-icons/react/dist/ssr";

import { BulkActionToolbar } from "@/components/ui/bulk-action-toolbar";
import { StoryPanel } from "../ui-library/story-canvas";

const meta = {
  title: "Layout/BulkActionToolbar",
  component: BulkActionToolbar,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "A toolbar that appears when items are selected, offering bulk actions. Can be inline or docked at the bottom.",
      },
    },
  },
  args: {
    selectedCount: 1,
    actions: [],
    onClear: () => {},
  },
  argTypes: {
    placement: {
      control: "select",
      options: ["inline", "bottom-dock"],
    },
  },
} satisfies Meta<typeof BulkActionToolbar>;

export default meta;

type Story = StoryObj<typeof meta>;

const defaultActions = [
  {
    label: "Duplicate",
    icon: <Copy size={14} weight="regular" />,
    onClick: () => console.log("Duplicate"),
  },
  {
    label: "Archive",
    icon: <Archive size={14} weight="regular" />,
    onClick: () => console.log("Archive"),
  },
];

const dangerActions = [
  ...defaultActions,
  {
    label: "Delete",
    icon: <Trash size={14} weight="regular" />,
    onClick: () => console.log("Delete"),
    variant: "danger" as const,
  },
];

export const Inline: Story = {
  render: () => (
    <StoryPanel className="max-w-2xl">
      <div className="rounded-xs border border-hairline bg-surface overflow-hidden">
        <BulkActionToolbar
          selectedCount={2}
          selectedLabel="items selected"
          actions={defaultActions}
          onClear={() => console.log("Clear")}
          placement="inline"
        />
        <div className="p-8 text-center text-[10px] text-tertiary">
          Table or list content goes here
        </div>
      </div>
    </StoryPanel>
  ),
};

export const BottomDock: Story = {
  render: () => (
    <StoryPanel className="h-64 max-w-2xl relative bg-surfaceMuted">
      <div className="p-8 text-center text-[10px] text-tertiary">
        Scrollable content area
      </div>
      <BulkActionToolbar
        selectedCount={5}
        selectedLabel="rows selected"
        actions={defaultActions}
        onClear={() => console.log("Clear")}
        placement="bottom-dock"
        className="absolute"
      />
    </StoryPanel>
  ),
};

export const WithDangerAction: Story = {
  render: () => (
    <StoryPanel className="max-w-2xl">
      <div className="rounded-xs border border-hairline bg-surface overflow-hidden">
        <BulkActionToolbar
          selectedCount={3}
          selectedLabel="items selected"
          actions={dangerActions}
          onClear={() => console.log("Clear")}
          placement="inline"
        />
      </div>
    </StoryPanel>
  ),
};

export const NoSelection: Story = {
  render: () => (
    <StoryPanel className="max-w-2xl">
      <div className="rounded-xs border border-hairline bg-surface overflow-hidden">
        <BulkActionToolbar
          selectedCount={0}
          selectedLabel="items selected"
          actions={defaultActions}
          onClear={() => console.log("Clear")}
          placement="inline"
        />
        <div className="p-8 text-center text-[10px] text-tertiary">
          Toolbar is hidden when selectedCount is 0
        </div>
      </div>
    </StoryPanel>
  ),
};
