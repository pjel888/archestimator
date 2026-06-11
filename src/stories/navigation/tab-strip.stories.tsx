import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Blueprint, Package } from "@phosphor-icons/react/dist/ssr";

import { TabStrip } from "@/components/ui";

const meta: Meta<typeof TabStrip> = {
  title: "Navigation/TabStrip",
  component: TabStrip,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Compact file-folder tab strip for tree/panel headers. The active tab lifts onto the white panel surface below it.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof TabStrip>;

function TabStripPreview({ tabs }: { tabs: { id: string; label: string }[] }) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? "");
  return (
    <div className="w-72 overflow-hidden rounded-xs border border-hairline">
      <TabStrip tabs={tabs} activeTab={activeTab} ariaLabel="Story views" onTabChange={setActiveTab} />
      <div className="h-16 bg-white" />
    </div>
  );
}

export const Default: Story = {
  render: () => (
    <TabStripPreview
      tabs={[
        { id: "components", label: "Components" },
        { id: "templates", label: "Templates" },
      ]}
    />
  ),
};

export const SingleTab: Story = {
  render: () => <TabStripPreview tabs={[{ id: "sheets", label: "Sheets" }]} />,
};

export const LinkTabsWithIconsAndCounts: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Route-backed mode: tabs with `href` render as prefetching links (Library page strip). Optional 12px icon and 8px tabular count badge.",
      },
    },
  },
  render: () => (
    <div className="w-96 overflow-hidden rounded-xs border border-hairline">
      <TabStrip
        tabs={[
          { id: "components", label: "Components", href: "#components", icon: <Package />, count: 154 },
          { id: "templates", label: "Templates", href: "#templates", icon: <Blueprint />, count: 3 },
        ]}
        activeTab="components"
        ariaLabel="Library sections"
      />
      <div className="h-16 bg-white" />
    </div>
  ),
};
