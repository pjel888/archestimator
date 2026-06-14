import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Circle, Cube, FolderSimple, FunnelSimple, Package, Plus } from "@phosphor-icons/react";

import { Checkbox, Tree, TreePanelHeader, type TreeNode } from "@/components/ui";
import { FilterPopover } from "@/components/ui/overlays/popover";

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
                  label: "Add Area",
                  icon: <Circle size={13} weight="regular" aria-hidden="true" />,
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

function SheetHeaderPreview() {
  const [query, setQuery] = useState("");
  const [staleOnly, setStaleOnly] = useState(false);

  return (
    <div className="flex h-40 w-96 flex-col overflow-hidden rounded-xs border border-hairline bg-white">
      <TreePanelHeader
        ariaLabel="Tree tools"
        labelPrefix="tree"
        searchValue={query}
        onSearchValueChange={setQuery}
        searchPlaceholder="Search components"
        searchLabel="Search components"
        showDefaultActions={false}
        filterSlot={
          <FilterPopover
            triggerLabel={staleOnly ? "Filter components (1 active)" : "Filter components"}
            trigger={
              <>
                <FunnelSimple size={12} weight="regular" aria-hidden="true" />
                {staleOnly ? (
                  <span className="rounded-xs bg-surfaceMuted px-1 text-[8px] font-medium leading-3 tabular-nums">1</span>
                ) : null}
              </>
            }
            triggerVariant="ghost"
            triggerClassName="h-6 min-h-6 w-auto gap-1 rounded-xs px-1.5 py-0 !text-[9px] text-tertiary"
            triggerPressed={staleOnly}
            title="Filter components"
          >
            <Checkbox
              label={<span className="text-[10px] leading-4 text-secondary">Prices older than 90 days</span>}
              checked={staleOnly}
              onChange={() => setStaleOnly((current) => !current)}
            />
          </FilterPopover>
        }
        addActions={[
          {
            label: "Add component",
            visibleLabel: "Add component",
            showVisibleLabel: true,
            icon: <Plus size={12} weight="regular" aria-hidden="true" />,
            onClick: () => {},
          },
        ]}
      />
      <div className="min-h-0 flex-1 bg-white p-2 text-[10px] leading-4 text-tertiary">
        One 40px header row owns search (disclosure), a wired filter popover in the filter slot, and the labeled
        ink-primary add action. Unwired defaults stay hidden via showDefaultActions.
      </div>
    </div>
  );
}

export const SheetHeaderFilterSlotAndLabeledAdd: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Library sheet pattern: `filterSlot` hosts a wired FilterPopover in the filter position, and an \"Add …\" action keeps its visible label via `showVisibleLabel` (ink-primary emphasis). Icon-only add actions now default to neutral tokens (the orange variant is retired).",
      },
    },
  },
  render: () => <SheetHeaderPreview />,
};
