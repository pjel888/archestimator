import type { Meta, StoryObj } from "@storybook/react";
import { CaretDown, CaretRight, Folder } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Note, StoryPanel } from "../ui-library/story-canvas";

type TreeState = "default" | "expanded" | "collapsed" | "selected" | "empty" | "loading" | "context" | "invalid";

function TreeShellPreview({ state = "default" }: { state?: TreeState }) {
  if (state === "empty") return <EmptyState title="No tree nodes" description="Add a static scope fixture." />;
  if (state === "loading") return <StoryPanel className="space-y-1">{[0, 1, 2].map((row) => <Skeleton key={row} className="h-6 w-full" />)}</StoryPanel>;
  if (state === "invalid") return <Note tone="danger">Invalid drop target: area nodes cannot contain child nodes.</Note>;

  const collapsed = state === "collapsed";
  const selected = state === "selected";

  return (
    <StoryPanel className="max-w-sm space-y-1">
      <TreeRow depth={0} label="Demo renovation package" expanded={!collapsed} selected={selected} badge="group" />
      {!collapsed ? (
        <>
          <TreeRow depth={1} label="General requirements" expanded badge="group" />
          <TreeRow depth={2} label="Permits and mobilization" badge="area" />
          <TreeRow depth={1} label="Millwork" expanded={state === "expanded"} badge="group" />
          {state === "expanded" ? <TreeRow depth={2} label="Reception counter" selected={selected} badge="area" /> : null}
        </>
      ) : null}
      {state === "context" ? (
        <div className="mt-2 rounded-xs border border-hairline bg-white p-1 text-[10px] font-medium leading-3 shadow-[0_12px_32px_rgba(17,24,39,0.12)]">
          <div className="px-2 py-1">Rename node</div>
          <div className="px-2 py-1">Add area</div>
          <div className="px-2 py-1 text-danger">Delete node</div>
        </div>
      ) : null}
    </StoryPanel>
  );
}

function TreeRow({ depth, label, expanded, selected, badge }: { depth: number; label: string; expanded?: boolean; selected?: boolean; badge: "group" | "area" }) {
  const Expander = expanded ? CaretDown : CaretRight;

  return (
    <div className={`flex min-h-7 items-center gap-1 rounded-xs px-2 text-[10px] font-medium leading-4 ${selected ? "bg-surfaceMuted text-ink" : "text-secondary"}`} style={{ paddingLeft: `${8 + depth * 14}px` }}>
      <Expander size={10} weight="regular" aria-hidden="true" className={badge === "group" ? "opacity-100" : "opacity-0"} />
      <Folder size={12} weight="regular" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <Badge size="xs" tone={badge === "group" ? "neutral" : "accent"}>{badge}</Badge>
    </div>
  );
}

const meta = {
  title: "Trees/TreeShell",
  component: TreeShellPreview,
  parameters: {
    archestimator: {
      storybookContract: "fixture-only",
    },
    docs: {
      description: {
        component:
          "Standalone TreeShell story for hierarchy, expansion, selection, context menu, invalid drop target, empty, and loading states. Static shell only; React Complex Tree production adapters are not modified.",
      },
    },
  },
} satisfies Meta<typeof TreeShellPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <TreeShellPreview />,
};

export const Expanded: Story = {
  render: () => <TreeShellPreview state="expanded" />,
};

export const Collapsed: Story = {
  render: () => <TreeShellPreview state="collapsed" />,
};

export const Selected: Story = {
  render: () => <TreeShellPreview state="selected" />,
};

export const Empty: Story = {
  render: () => <TreeShellPreview state="empty" />,
};

export const Loading: Story = {
  render: () => <TreeShellPreview state="loading" />,
};

export const ContextMenu: Story = {
  render: () => <TreeShellPreview state="context" />,
};

export const InvalidDropTarget: Story = {
  render: () => <TreeShellPreview state="invalid" />,
};

export const KeyboardNotes: Story = {
  render: () => (
    <StoryPanel className="space-y-2">
      <TreeShellPreview state="expanded" />
      <Note>Keyboard contract: production tree owns Arrow expansion and selection; this static story documents row states and labels.</Note>
    </StoryPanel>
  ),
};
