import type { Meta, StoryObj } from "@storybook/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPeso, makeEstimateFixture } from "../fixtures/product-fixtures";
import { Note, StoryGrid, StoryPanel } from "../ui-library/story-canvas";

function PanelPreview({ state = "default" }: { state?: "default" | "loading" | "empty" | "error" | "long" }) {
  const estimate = makeEstimateFixture();

  if (state === "loading") {
    return (
      <StoryPanel className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-20 w-full" />
      </StoryPanel>
    );
  }

  if (state === "empty") return <EmptyState title="No panel content" description="Static fixture has no details yet." />;
  if (state === "error") return <Note tone="danger">Panel fixture failed local validation.</Note>;

  return (
    <section className="max-w-xl rounded-xs border border-hairline bg-white">
      <header className="flex min-h-10 items-center justify-between gap-2 border-b border-hairline px-2">
        <div className="min-w-0">
          <p className="text-[9px] leading-3 text-tertiary">Estimate panel</p>
          <h3 className="truncate text-[11px] font-medium leading-4 text-ink">{estimate.name}</h3>
        </div>
        <Badge tone="warning">{estimate.status}</Badge>
      </header>
      <div className="space-y-2 p-2">
        <p className="text-[10px] leading-4 text-secondary">
          {state === "long"
            ? "Long panel copy demonstrates wrapping and compact density without increasing text scale. ".repeat(4)
            : "Static summary panel for review surfaces."}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-[9px] leading-3 text-tertiary">Total</p>
            <p className="text-[10px] font-medium leading-4 text-ink">{formatPeso(estimate.totalCost)}</p>
          </div>
          <div>
            <p className="text-[9px] leading-3 text-tertiary">Updated</p>
            <p className="text-[10px] font-medium leading-4 text-ink">{estimate.updatedLabel}</p>
          </div>
        </div>
      </div>
      <footer className="flex justify-end gap-1 border-t border-hairline p-2">
        <Button variant="ghost" size="sm">Cancel</Button>
        <Button variant="primary" size="sm">Apply</Button>
      </footer>
    </section>
  );
}

const meta = {
  title: "Cards/Panel",
  component: PanelPreview,
  parameters: {
    archestimator: {
      storybookContract: "story-composition",
    },
    docs: {
      description: {
        component:
          "Standalone Panel story for compact bordered surfaces, headers, actions, loading, empty, error, and long-content states.",
      },
    },
  },
} satisfies Meta<typeof PanelPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <PanelPreview />,
};

export const WithHeader: Story = {
  render: () => <PanelPreview />,
};

export const WithActions: Story = {
  render: () => <PanelPreview />,
};

export const Loading: Story = {
  render: () => <PanelPreview state="loading" />,
};

export const Empty: Story = {
  render: () => <PanelPreview state="empty" />,
};

export const Error: Story = {
  render: () => <PanelPreview state="error" />,
};

export const LongContent: Story = {
  render: () => <PanelPreview state="long" />,
};

export const StateMatrix: Story = {
  render: () => (
    <StoryGrid columns="md:grid-cols-2">
      <PanelPreview />
      <PanelPreview state="loading" />
      <PanelPreview state="empty" />
      <PanelPreview state="error" />
    </StoryGrid>
  ),
};
