import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { StoryPanel } from "../ui-library/story-canvas";

const tabs = ["Scope", "Pricing", "Activity"];

function TabsPreview() {
  const [activeTab, setActiveTab] = useState("Scope");

  return (
    <StoryPanel className="max-w-md">
      <div role="tablist" aria-label="Estimate tabs" className="flex border-b border-hairline">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            className={`min-h-7 border-b px-2 text-[10px] font-medium leading-4 ${activeTab === tab ? "border-ink text-ink" : "border-transparent text-tertiary"}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="p-2 text-[10px] leading-4 text-secondary">
        {activeTab} static panel content. This story uses local state only.
      </div>
    </StoryPanel>
  );
}

const meta = {
  title: "Navigation/Tabs",
  component: TabsPreview,
  parameters: {
    archestimator: {
      storybookContract: "story-composition",
    },
    docs: {
      description: {
        component:
          "Standalone Tabs story for compact tablists and panels. Local state only; no route or search-param migration is performed.",
      },
    },
  },
} satisfies Meta<typeof TabsPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <TabsPreview />,
};

export const KeyboardFocus: Story = {
  render: () => <TabsPreview />,
};
