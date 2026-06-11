import type { Meta, StoryObj } from "@storybook/react";
import { DropdownMenu } from "@/components/ui";
import { Gear, SignOut, UserCircle } from "@phosphor-icons/react";

const meta: Meta<typeof DropdownMenu> = {
  title: "Menus/DropdownMenu",
  component: DropdownMenu,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof DropdownMenu>;

export const Default: Story = {
  render: () => (
    <DropdownMenu
      trigger={<button className="rounded-xs bg-surface border border-hairline px-3 py-1.5 text-[10px] font-medium text-ink tracking-normal">Open Menu</button>}
    >
      <DropdownMenu.Item label="Profile" icon={<UserCircle weight="regular" />} onClick={() => {}} />
      <DropdownMenu.Item label="Settings" icon={<Gear weight="regular" />} onClick={() => {}} />
      <DropdownMenu.Item label="Sign Out" icon={<SignOut weight="regular" />} onClick={() => {}} destructive />
    </DropdownMenu>
  ),
};

export const WithGroups: Story = {
  render: () => (
    <DropdownMenu
      trigger={<button className="rounded-xs bg-surface border border-hairline px-3 py-1.5 text-[10px] font-medium text-ink tracking-normal">Actions</button>}
    >
      <DropdownMenu.Group label="Account">
        <DropdownMenu.Item label="View Profile" onClick={() => {}} />
        <DropdownMenu.Item label="Billing" onClick={() => {}} disabled />
      </DropdownMenu.Group>
      <DropdownMenu.Group label="Workspace">
        <DropdownMenu.Item label="Settings" icon={<Gear weight="regular" />} onClick={() => {}} />
        <DropdownMenu.Item label="Members" icon={<UserCircle weight="regular" />} onClick={() => {}} />
      </DropdownMenu.Group>
      <DropdownMenu.Item label="Sign Out" onClick={() => {}} destructive />
    </DropdownMenu>
  ),
};

export const WithShortcuts: Story = {
  render: () => (
    <DropdownMenu
      trigger={<button className="rounded-xs bg-surface border border-hairline px-3 py-1.5 text-[10px] font-medium text-ink tracking-normal">Edit</button>}
    >
      <DropdownMenu.Item label="Copy" shortcut="⌘C" onClick={() => {}} />
      <DropdownMenu.Item label="Paste" shortcut="⌘V" onClick={() => {}} />
      <DropdownMenu.Item label="Select All" shortcut="⌘A" onClick={() => {}} />
    </DropdownMenu>
  ),
};

export const Disabled: Story = {
  render: () => (
    <DropdownMenu
      trigger={<button className="rounded-xs bg-surface border border-hairline px-3 py-1.5 text-[10px] font-medium text-ink tracking-normal">Menu</button>}
    >
      <DropdownMenu.Item label="Enabled Action" onClick={() => {}} />
      <DropdownMenu.Item label="Disabled Action" onClick={() => {}} disabled />
      <DropdownMenu.Item label="Another Action" onClick={() => {}} />
    </DropdownMenu>
  ),
};
