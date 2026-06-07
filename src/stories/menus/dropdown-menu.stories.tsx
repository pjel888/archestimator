import type { Meta, StoryObj } from "@storybook/react";
import { DropdownMenu } from "@/components/ui";
import { Gear, SignOut, UserCircle, Check } from "@phosphor-icons/react";

const meta: Meta<typeof DropdownMenu> = {
  title: "Menus/DropdownMenu",
  component: DropdownMenu,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof DropdownMenu>;

export const Default: Story = {
  args: {
    trigger: <button className="rounded-xs bg-surface border border-hairline px-3 py-1.5 text-[10px] font-medium text-ink tracking-normal">Open Menu</button>,
    children: (
      <>
        <DropdownMenu.Item label="Profile" icon={<UserCircle weight="regular" />} onClick={() => {}} />
        <DropdownMenu.Item label="Settings" icon={<Gear weight="regular" />} onClick={() => {}} />
        <DropdownMenu.Item label="Sign Out" icon={<SignOut weight="regular" />} onClick={() => {}} destructive />
      </>
    ),
  },
};

export const WithGroups: Story = {
  args: {
    trigger: <button className="rounded-xs bg-surface border border-hairline px-3 py-1.5 text-[10px] font-medium text-ink tracking-normal">Actions</button>,
    children: (
      <>
        <DropdownMenu.Group label="Account">
          <DropdownMenu.Item label="View Profile" onClick={() => {}} />
          <DropdownMenu.Item label="Billing" onClick={() => {}} disabled />
        </DropdownMenu.Group>
        <DropdownMenu.Group label="Workspace">
          <DropdownMenu.Item label="Settings" icon={<Gear weight="regular" />} onClick={() => {}} />
          <DropdownMenu.Item label="Members" icon={<UserCircle weight="regular" />} onClick={() => {}} />
        </DropdownMenu.Group>
        <DropdownMenu.Item label="Sign Out" onClick={() => {}} destructive />
      </>
    ),
  },
};

export const WithShortcuts: Story = {
  args: {
    trigger: <button className="rounded-xs bg-surface border border-hairline px-3 py-1.5 text-[10px] font-medium text-ink tracking-normal">Edit</button>,
    children: (
      <>
        <DropdownMenu.Item label="Copy" shortcut="⌘C" onClick={() => {}} />
        <DropdownMenu.Item label="Paste" shortcut="⌘V" onClick={() => {}} />
        <DropdownMenu.Item label="Select All" shortcut="⌘A" onClick={() => {}} />
      </>
    ),
  },
};

export const Disabled: Story = {
  args: {
    trigger: <button className="rounded-xs bg-surface border border-hairline px-3 py-1.5 text-[10px] font-medium text-ink tracking-normal">Menu</button>,
    children: (
      <>
        <DropdownMenu.Item label="Enabled Action" onClick={() => {}} />
        <DropdownMenu.Item label="Disabled Action" onClick={() => {}} disabled />
        <DropdownMenu.Item label="Another Action" onClick={() => {}} />
      </>
    ),
  },
};
