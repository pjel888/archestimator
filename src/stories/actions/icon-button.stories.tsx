import type { Meta, StoryObj } from "@storybook/react";
import { Plus, Trash, MagnifyingGlass, DotsThree, FunnelSimple, Gear } from "@phosphor-icons/react";

import { IconButton } from "@/components/ui";
import { StoryPanel } from "../ui-library/story-canvas";

const meta = {
  title: "Actions/IconButton",
  component: IconButton,
  parameters: {
    docs: {
      description: {
        component: "IconButton component for actions represented by an icon.",
      },
    },
  },
  args: {
    icon: <Plus size={14} weight="regular" />,
    label: "Add item",
  },
} satisfies Meta<typeof IconButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <StoryPanel>
      <IconButton icon={<Plus size={14} weight="regular" />} label="Add item" />
    </StoryPanel>
  ),
};

export const Variants: Story = {
  render: () => (
    <StoryPanel className="flex items-center gap-4">
      <IconButton variant="primary" icon={<Plus size={14} weight="regular" />} label="Add item" />
      <IconButton variant="secondary" icon={<MagnifyingGlass size={14} weight="regular" />} label="Search" />
      <IconButton variant="ghost" icon={<DotsThree size={14} weight="regular" />} label="More options" />
      <IconButton variant="danger" icon={<Trash size={14} weight="regular" />} label="Delete" />
    </StoryPanel>
  ),
};

export const Sizes: Story = {
  render: () => (
    <StoryPanel className="flex items-center gap-4">
      <IconButton size="icon-sm" icon={<Plus size={12} weight="regular" />} label="Add item (small)" />
      <IconButton size="icon" icon={<Plus size={14} weight="regular" />} label="Add item (default)" />
    </StoryPanel>
  ),
};

export const Disabled: Story = {
  render: () => (
    <StoryPanel className="flex items-center gap-4">
      <IconButton disabled variant="primary" icon={<Plus size={14} weight="regular" />} label="Add item" />
      <IconButton disabled variant="secondary" icon={<MagnifyingGlass size={14} weight="regular" />} label="Search" />
      <IconButton disabled variant="ghost" icon={<DotsThree size={14} weight="regular" />} label="More options" />
      <IconButton disabled variant="danger" icon={<Trash size={14} weight="regular" />} label="Delete" />
    </StoryPanel>
  ),
};

export const Toolbar: Story = { args: { size: "icon-sm", variant: "ghost", label: "Filter", icon: <FunnelSimple weight="regular" /> } };
export const WithVisibleLabel: Story = { args: { size: "icon-sm", variant: "ghost", label: "Add Item", icon: <Plus weight="regular" /> } };
export const Destructive: Story = { args: { size: "icon-sm", variant: "danger", label: "Delete", icon: <Trash weight="regular" /> } };
export const KeyboardFocus: Story = { args: { size: "icon-sm", variant: "ghost", label: "Settings", icon: <Gear weight="regular" /> } };
