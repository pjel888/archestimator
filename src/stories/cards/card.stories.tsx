import type { Meta, StoryObj } from "@storybook/react";
import { ArrowRight, DotsThree, ImageSquare } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPeso, makeProjectFixture } from "../fixtures/product-fixtures";
import { Note, StoryGrid, StoryPanel } from "../ui-library/story-canvas";

function CardPreview({ state = "default" }: { state?: "default" | "selected" | "interactive" | "loading" | "empty" | "error" | "long" }) {
  const project = makeProjectFixture(state === "long" ? {
    name: "Extremely long renovation and procurement package title that demonstrates truncation",
  } : {});

  if (state === "loading") {
    return (
      <StoryPanel className="space-y-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-3 w-28" />
      </StoryPanel>
    );
  }

  if (state === "empty") {
    return <EmptyState title="No project card" description="Add a static fixture before review." />;
  }

  if (state === "error") {
    return <Note tone="danger">Card fixture failed local validation. No provider call was attempted.</Note>;
  }

  return (
    <article
      className={`flex min-h-52 max-w-sm flex-col rounded-xs border bg-white p-2 ${state === "selected" ? "border-ink ring-2 ring-focus" : "border-hairline"} ${state === "interactive" ? "transition hover:border-tertiary" : ""}`}
    >
      <div className="flex h-20 items-center justify-center rounded-xs border border-hairline bg-surfaceMuted text-tertiary">
        <ImageSquare size={20} weight="regular" aria-hidden="true" />
      </div>
      <div className="mt-2 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <Badge tone="success">{project.status}</Badge>
          <Button size="icon-sm" variant="ghost" aria-label="Card actions">
            <DotsThree size={12} weight="regular" aria-hidden="true" />
          </Button>
        </div>
        <h3 className="mt-2 line-clamp-2 text-[12px] font-medium leading-4 text-ink">{project.name}</h3>
        <p className="mt-1 text-[9px] leading-3 text-tertiary">{project.code} / {project.estimateCount} estimates</p>
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-hairline pt-2">
        <span className="text-[10px] font-medium leading-4 text-ink">{formatPeso(project.totalCost)}</span>
        <Button variant="ghost" size="sm">
          Open
          <ArrowRight size={11} weight="regular" aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}

const meta = {
  title: "Cards/Card",
  component: CardPreview,
  parameters: {
    docs: {
      description: {
        component:
          "Standalone Card story for compact project and library card states. This is a story-only review composition using static fixtures.",
      },
    },
  },
} satisfies Meta<typeof CardPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <CardPreview />,
};

export const WithHeader: Story = {
  render: () => <CardPreview />,
};

export const WithActions: Story = {
  render: () => <CardPreview />,
};

export const Selected: Story = {
  render: () => <CardPreview state="selected" />,
};

export const Interactive: Story = {
  render: () => <CardPreview state="interactive" />,
};

export const Loading: Story = {
  render: () => <CardPreview state="loading" />,
};

export const Empty: Story = {
  render: () => <CardPreview state="empty" />,
};

export const Error: Story = {
  render: () => <CardPreview state="error" />,
};

export const LongContent: Story = {
  render: () => <CardPreview state="long" />,
};

export const StateMatrix: Story = {
  render: () => (
    <StoryGrid columns="md:grid-cols-3">
      <CardPreview />
      <CardPreview state="selected" />
      <CardPreview state="loading" />
    </StoryGrid>
  ),
};
