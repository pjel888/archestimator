import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

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
