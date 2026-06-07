import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { SearchInput } from "@/components/ui/search-input";
import { Note, StoryPanel } from "../ui-library/story-canvas";

const meta = {
  title: "Forms/SearchInput",
  component: SearchInput,
  parameters: {
    docs: {
      description: {
        component:
          "Standalone SearchInput story for provider-free filtering and keyboard shortcut display. Controlled examples use local React state only.",
      },
    },
  },
  args: {
    placeholder: "Search components",
    shortcutKey: "K",
    "aria-label": "Search components",
  },
} satisfies Meta<typeof SearchInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <StoryPanel className="space-y-1">
      <p className="text-[9px] font-medium leading-3 text-tertiary">Search components</p>
      <SearchInput placeholder="Search components" shortcutKey="K" aria-label="Search components" />
    </StoryPanel>
  ),
};

export const ControlledWithClear: Story = {
  render: () => <ControlledSearchInput initialValue="millwork" />,
};

export const EmptyWithShortcut: Story = {
  args: {
    value: "",
    readOnly: true,
    shortcutKey: "/",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    value: "publication locked",
    readOnly: true,
  },
};

export const LongValue: Story = {
  render: () => <ControlledSearchInput initialValue="long supplier and component query that truncates without resizing the toolbar" />,
};

export const KeyboardFocus: Story = {
  render: () => (
    <StoryPanel className="space-y-2">
      <ControlledSearchInput initialValue="cabinet" />
      <Note>Keyboard contract: focus enters the native search input; clear control is a labelled button shown only when a value exists.</Note>
    </StoryPanel>
  ),
};

function ControlledSearchInput({ initialValue }: { initialValue: string }) {
  const [value, setValue] = useState(initialValue);

  return (
    <SearchInput
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onClear={() => setValue("")}
      placeholder="Search components"
      aria-label="Search components"
    />
  );
}
