import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Cube, FolderSimple, Package } from "@phosphor-icons/react";

import { Tree, TreePanelHeader, type TreeNode } from "@/components/ui";

const panelNodes: TreeNode[] = [
  {
    id: "ground-floor",
    label: "Ground Floor",
    icon: <FolderSimple weight="regular" className="h-3.5 w-3.5 text-tertiary" />,
    children: [
      { id: "kitchen", label: "Kitchen", icon: <Cube weight="regular" className="h-3.5 w-3.5 text-tertiary" />, isLeaf: true },
      { id: "living-room", label: "Living Room", icon: <Cube weight="regular" className="h-3.5 w-3.5 text-tertiary" />, isLeaf: true },
    ],
  },
  {
    id: "second-floor",
    label: "Second Floor",
    icon: <FolderSimple weight="regular" className="h-3.5 w-3.5 text-tertiary" />,
    children: [
      { id: "bedroom", label: "Bedroom", icon: <Cube weight="regular" className="h-3.5 w-3.5 text-tertiary" />, isLeaf: true },
    ],
  },
];

const meta: Meta<typeof TreePanelHeader> = {
  title: "Trees/TreePanelHeader",
  component: TreePanelHeader,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Sticky header for tree side panels: HeaderIconToolbar with a search-icon disclosure that drops a SearchInput panel over the content below, plus an optional TabStrip. Used by the estimate sheet tree (left sidebar) and the component library (right sidebar).",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof TreePanelHeader>;

function PanelPreview({
  addActions,
  searchOpen,
  tabs,
}: {
  addActions?: "estimate" | "library";
  searchOpen?: boolean;
  tabs?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(searchOpen ?? false);
  const [expandedIds, setExpandedIds] = useState<string[]>(["ground-floor", "second-floor"]);
  const [activeTab, setActiveTab] = useState("sheets");

  const filtered = query.trim()
    ? panelNodes
        .map((node) => ({
          ...node,
          children: node.children?.filter((child) => child.label.toLowerCase().includes(query.trim().toLowerCase())),
        }))
        .filter((node) => node.label.toLowerCase().includes(query.trim().toLowerCase()) || node.children?.length)
    : panelNodes;

  return (
    <div className="flex h-72 w-72 flex-col overflow-hidden rounded-xs border border-hairline bg-white">
      <TreePanelHeader
        ariaLabel="Tree tools"
        labelPrefix="tree"
        onExpandAll={() => setExpandedIds(["ground-floor", "second-floor"])}
        onCollapseAll={() => setExpandedIds([])}
        searchValue={query}
        onSearchValueChange={setQuery}
        searchPlaceholder="Search Tree"
        searchLabel="Search Tree"
        searchOpen={open}
        onSearchOpenChange={setOpen}
        addActions={
          addActions === "library"
            ? [
                {
                  label: "Add Component",
                  icon: <Package size={13} weight="regular" aria-hidden="true" />,
                  onClick: () => {},
                },
              ]
            : [
                {
                  label: "Add Group",
                  icon: <FolderSimple size={13} weight="regular" aria-hidden="true" />,
                  onClick: () => {},
                },
                {
                  label: "Add Node",
                  icon: <Cube size={13} weight="regular" aria-hidden="true" />,
                  onClick: () => {},
                },
              ]
        }
        tabs={
          tabs
            ? [
                { id: "sheets", label: "Sheets" },
                { id: "templates", label: "Templates" },
              ]
            : undefined
        }
        activeTab={tabs ? activeTab : undefined}
        tabsAriaLabel="Tree views"
        onTabChange={setActiveTab}
      />
      <div className="min-h-0 flex-1 overflow-auto p-2">
        <Tree
          nodes={filtered}
          ariaLabel="Story tree"
          expandedIds={query.trim() ? ["ground-floor", "second-floor"] : expandedIds}
          onExpandedChange={setExpandedIds}
        />
      </div>
    </div>
  );
}

export const Default: Story = {
  render: () => <PanelPreview tabs />,
};

export const SearchOpen: Story = {
  render: () => <PanelPreview tabs searchOpen />,
};

export const LibraryAddAction: Story = {
  render: () => <PanelPreview tabs addActions="library" />,
};

export const WithoutTabs: Story = {
  render: () => <PanelPreview />,
};
