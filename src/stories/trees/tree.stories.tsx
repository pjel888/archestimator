import type { Meta, StoryObj } from "@storybook/react";
import { useState, useCallback } from "react";
import { Tree, moveTreeNode, type TreeDropPosition, type TreeNode, type TreeProps } from "@/components/ui";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from "@/components/ui";
import { Folder, FileText, Cube } from "@phosphor-icons/react";

const sampleNodes: TreeNode[] = [
  {
    id: "1",
    label: "Site Work",
    icon: <Folder weight="regular" className="h-3.5 w-3.5 text-tertiary" />,
    children: [
      { id: "1a", label: "Excavation", icon: <Cube weight="regular" className="h-3.5 w-3.5 text-tertiary" />, isLeaf: true },
      { id: "1b", label: "Grading", icon: <Cube weight="regular" className="h-3.5 w-3.5 text-tertiary" />, isLeaf: true },
      { id: "1c", label: "Backfill", icon: <Cube weight="regular" className="h-3.5 w-3.5 text-tertiary" />, isLeaf: true },
    ],
  },
  {
    id: "2",
    label: "Foundation",
    icon: <Folder weight="regular" className="h-3.5 w-3.5 text-tertiary" />,
    children: [
      {
        id: "2a",
        label: "Concrete",
        icon: <Folder weight="regular" className="h-3.5 w-3.5 text-tertiary" />,
        children: [
          { id: "2a1", label: "Footings", icon: <Cube weight="regular" className="h-3.5 w-3.5 text-tertiary" />, isLeaf: true },
          { id: "2a2", label: "Slab on Grade", icon: <Cube weight="regular" className="h-3.5 w-3.5 text-tertiary" />, isLeaf: true },
        ],
      },
      { id: "2b", label: "Waterproofing", icon: <Cube weight="regular" className="h-3.5 w-3.5 text-tertiary" />, isLeaf: true },
    ],
  },
  {
    id: "3",
    label: "Framing",
    icon: <Folder weight="regular" className="h-3.5 w-3.5 text-tertiary" />,
    children: [
      { id: "3a", label: "Walls", icon: <Cube weight="regular" className="h-3.5 w-3.5 text-tertiary" />, isLeaf: true },
      { id: "3b", label: "Roof Trusses", icon: <Cube weight="regular" className="h-3.5 w-3.5 text-tertiary" />, isLeaf: true },
    ],
  },
];

const meta: Meta<typeof Tree> = {
  title: "Trees/Tree",
  component: Tree,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Tree>;

function StatefulTree(props: Omit<TreeProps, "selectedIds" | "onSelectionChange" | "nodes"> & { nodes: TreeNode[] }) {
  const [nodes, setNodes] = useState<TreeNode[]>(props.nodes);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const handleSelectionChange = useCallback((ids: string[]) => setSelectedIds(ids), []);
  const handleDrop = useCallback((draggedId: string, targetId: string, position: TreeDropPosition) => {
    setNodes((current) => moveTreeNode(current, draggedId, targetId, position));
  }, []);
  return (
    <Tree
      {...props}
      nodes={nodes}
      selectedIds={selectedIds}
      onSelectionChange={handleSelectionChange}
      onDrop={props.draggable ? handleDrop : undefined}
    />
  );
}

export const Default: Story = {
  args: {
    nodes: sampleNodes,
    expandable: true,
    className: "max-h-96",
  },
};

export const Selectable: Story = {
  render: (args) => <StatefulTree {...args} />,
  args: {
    nodes: sampleNodes,
    expandable: true,
    selectable: true,
    className: "max-h-96",
  },
};

export const Draggable: Story = {
  render: (args) => <StatefulTree {...args} />,
  args: {
    nodes: sampleNodes,
    expandable: true,
    draggable: true,
    defaultExpandedIds: ["1", "2", "2a", "3"],
    className: "max-h-96",
  },
};

export const DraggableAndSelectable: Story = {
  render: (args) => <StatefulTree {...args} />,
  args: {
    nodes: sampleNodes,
    expandable: true,
    draggable: true,
    selectable: true,
    defaultExpandedIds: ["1", "2", "2a", "3"],
    className: "max-h-96",
  },
};

export const SingleLevel: Story = {
  render: (args) => <StatefulTree {...args} />,
  args: {
    nodes: [
      { id: "a", label: "Item One", icon: <FileText weight="regular" className="h-3.5 w-3.5 text-tertiary" />, isLeaf: true },
      { id: "b", label: "Item Two", icon: <FileText weight="regular" className="h-3.5 w-3.5 text-tertiary" />, isLeaf: true },
      { id: "c", label: "Item Three", icon: <FileText weight="regular" className="h-3.5 w-3.5 text-tertiary" />, isLeaf: true },
    ],
    expandable: false,
    selectable: true,
    className: "max-h-96",
  },
};

export const AllExpanded: Story = {
  args: {
    nodes: sampleNodes,
    expandable: true,
    defaultExpandedIds: ["1", "2", "2a", "3"],
    className: "max-h-96",
  },
};

export const WithContextMenu: Story = {
  render: (args) => (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="block w-full">
          <StatefulTree {...args} />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem>Rename</ContextMenuItem>
        <ContextMenuItem>Delete</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
  args: {
    nodes: sampleNodes,
    expandable: true,
    selectable: true,
    className: "max-h-96",
  },
};
