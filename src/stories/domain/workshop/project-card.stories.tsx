import type { Meta, StoryObj } from "@storybook/react";
import { Clock, Folder, ImageSquare, MapPin } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPeso, makeComponentLibraryFixture, makeEstimateFixture, makeProjectFixture } from "../../fixtures/product-fixtures";
import { StoryGrid, StoryPanel } from "../../ui-library/story-canvas";

function ProjectCardPreview({ selected = false, longContent = false }: { selected?: boolean; longContent?: boolean }) {
  const project = longContent
    ? makeProjectFixture({
        name: "Long static project name for a multi-phase renovation package that proves compact card wrapping",
      })
    : makeProjectFixture();

  return (
    <article className={`max-w-sm rounded-xs border bg-white ${selected ? "border-ink ring-1 ring-ink" : "border-hairline"}`}>
      <div className="flex h-28 items-center justify-center border-b border-hairline bg-surfaceMuted text-tertiary">
        <ImageSquare size={22} weight="regular" aria-hidden="true" />
      </div>
      <div className="p-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[9px] font-medium leading-3 text-tertiary">{project.code}</span>
          <Badge tone="success">{project.status}</Badge>
        </div>
        <h3 className="mt-1 line-clamp-2 text-[12px] font-medium leading-4 text-ink">{project.name}</h3>
        <div className="mt-2 grid grid-cols-3 gap-1 border-y border-hairline py-2 text-[10px]">
          <Metric label="estimates" value={String(project.estimateCount)} />
          <Metric label="total" value={formatPeso(project.totalCost)} />
          <Metric label="owner" value={project.owner} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[9px] leading-3 text-tertiary">
          <span className="inline-flex items-center gap-1"><MapPin size={11} weight="regular" aria-hidden="true" /> Story site</span>
          <span className="inline-flex items-center gap-1"><Clock size={11} weight="regular" aria-hidden="true" /> 12m</span>
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-medium text-ink">{value}</p>
      <p className="mt-0.5 truncate text-tertiary">{label}</p>
    </div>
  );
}

export function TreeShellPreviewForDomain({ label = "Demo scope" }: { label?: string }) {
  return (
    <StoryPanel className="max-w-sm space-y-1">
      {["General requirements", "Millwork", "Loose furniture"].map((item, index) => (
        <div key={item} className="flex min-h-7 items-center gap-2 rounded-xs px-2 text-[10px] font-medium leading-4 text-secondary" style={{ paddingLeft: `${8 + index * 8}px` }}>
          <Folder size={12} weight="regular" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{index === 0 ? label : item}</span>
          <Badge size="xs">{index === 0 ? "group" : "area"}</Badge>
        </div>
      ))}
    </StoryPanel>
  );
}

function EstimateRowPreview() {
  const estimate = makeEstimateFixture();

  return (
    <StoryPanel className="max-w-xl">
      {estimate.rows.map((row) => (
        <div key={row.id} className="grid grid-cols-[1fr_48px_52px_84px] items-center gap-2 border-b border-hairline py-1 text-[10px] last:border-b-0">
          <span className="truncate font-medium text-ink">{row.label}</span>
          <span className="text-right tabular-nums text-secondary">{row.quantity}</span>
          <span className="text-secondary">{row.unit}</span>
          <span className="text-right font-medium tabular-nums text-ink">{formatPeso(row.rate)}</span>
        </div>
      ))}
    </StoryPanel>
  );
}

function ComponentLibraryCardPreview() {
  const components = makeComponentLibraryFixture();

  return (
    <StoryGrid columns="md:grid-cols-3">
      {components.map((component) => (
        <StoryPanel key={component.id} className="space-y-1">
          <Badge tone={component.status === "approved" ? "success" : component.status === "needs-review" ? "warning" : "neutral"}>{component.status}</Badge>
          <h3 className="truncate text-[11px] font-medium leading-4 text-ink">{component.name}</h3>
          <p className="text-[9px] leading-3 text-tertiary">{component.category} / {component.supplier}</p>
          <p className="text-[10px] font-medium leading-4 text-ink">{formatPeso(component.unitCost)} / {component.unit}</p>
          <Button size="sm" variant="secondary">Review</Button>
        </StoryPanel>
      ))}
    </StoryGrid>
  );
}

const meta = {
  title: "Domain/Workshop/ProjectCard",
  component: ProjectCardPreview,
  parameters: {
    docs: {
      description: {
        component:
          "Standalone domain ProjectCard story using static project fixtures. It does not import live project repositories or migrate `/workshop/projects` UI.",
      },
    },
  },
} satisfies Meta<typeof ProjectCardPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <ProjectCardPreview />,
};

export const WithActions: Story = {
  render: () => (
    <StoryPanel className="max-w-sm space-y-2">
      <ProjectCardPreview />
      <div className="flex justify-end gap-1">
        <Button size="sm" variant="ghost">Archive</Button>
        <Button size="sm" variant="primary">Open</Button>
      </div>
    </StoryPanel>
  ),
};

export const Selected: Story = {
  render: () => <ProjectCardPreview selected />,
};

export const Loading: Story = {
  render: () => (
    <StoryPanel className="max-w-sm space-y-2">
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-8 w-full" />
    </StoryPanel>
  ),
};

export const LongContent: Story = {
  render: () => <ProjectCardPreview longContent />,
};

export const EstimateRow: Story = {
  render: () => <EstimateRowPreview />,
};

export const ComponentLibraryCard: Story = {
  render: () => <ComponentLibraryCardPreview />,
};

export const TreeShell: Story = {
  render: () => <TreeShellPreviewForDomain />,
};
