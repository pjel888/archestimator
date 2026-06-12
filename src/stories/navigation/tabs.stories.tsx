import type { Meta, StoryObj } from "@storybook/react";
import { Tabs, type TabsProps } from "@/components/ui/tabs";
import { useState } from "react";

const meta = {
  title: "Navigation/Tabs",
  component: Tabs,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["underline", "pills"],
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[400px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

const defaultTabs = [
  { id: "scope", label: "Scope" },
  { id: "pricing", label: "Pricing" },
  { id: "activity", label: "Activity" },
];

function TabsWithState(props: Omit<TabsProps, "activeId" | "onChange"> & { defaultActiveId?: string }) {
  const [activeId, setActiveId] = useState(props.defaultActiveId || props.tabs[0]?.id || "");
  return <Tabs {...props} activeId={activeId} onChange={setActiveId} />;
}

export const Underline: Story = {
  render: (args) => <TabsWithState {...args} defaultActiveId="scope" />,
  args: {
    tabs: defaultTabs,
    activeId: "scope",
    onChange: () => {},
    variant: "underline",
  },
};

export const Pills: Story = {
  render: (args) => <TabsWithState {...args} defaultActiveId="scope" />,
  args: {
    tabs: defaultTabs,
    activeId: "scope",
    onChange: () => {},
    variant: "pills",
  },
};

export const WithIcons: Story = {
  render: (args) => <TabsWithState {...args} defaultActiveId="scope" />,
  args: {
    tabs: [
      { id: "scope", label: "Scope", icon: <div className="h-3 w-3 rounded-xs bg-current" /> },
      { id: "pricing", label: "Pricing", icon: <div className="h-3 w-3 rounded-xs border border-current" /> },
      { id: "activity", label: "Activity", icon: <div className="h-3 w-3 rounded-xs bg-current opacity-50" /> },
    ],
    activeId: "scope",
    onChange: () => {},
  },
};

export const WithBadges: Story = {
  render: (args) => <TabsWithState {...args} defaultActiveId="scope" />,
  args: {
    tabs: [
      { id: "scope", label: "Scope" },
      { id: "pricing", label: "Pricing", badge: "New" },
      { id: "activity", label: "Activity", badge: "3" },
    ],
    activeId: "scope",
    onChange: () => {},
  },
};

export const WithDisabled: Story = {
  render: (args) => <TabsWithState {...args} defaultActiveId="scope" />,
  args: {
    tabs: [
      { id: "scope", label: "Scope" },
      { id: "pricing", label: "Pricing", disabled: true },
      { id: "activity", label: "Activity" },
    ],
    activeId: "scope",
    onChange: () => {},
  },
};

export const Scrollable: Story = {
  render: (args) => <TabsWithState {...args} defaultActiveId="tab1" />,
  args: {
    tabs: Array.from({ length: 10 }).map((_, i) => ({
      id: `tab${i + 1}`,
      label: `Long Tab Name ${i + 1}`,
    })),
    activeId: "tab1",
    onChange: () => {},
  },
};

export const Default: Story = {
  args: {
    tabs: [{ id: "1", label: "Tab One" }, { id: "2", label: "Tab Two" }],
    activeId: "1",
    onChange: () => {},
  },
};

export const KeyboardFocus: Story = {
  args: {
    tabs: [{ id: "a", label: "First Tab" }, { id: "b", label: "Second Tab" }, { id: "c", label: "Third Tab" }],
    activeId: "a",
    onChange: () => {},
  },
};
