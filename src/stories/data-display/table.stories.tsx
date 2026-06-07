import type { Meta, StoryObj } from "@storybook/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ControlInput, CONTROL_INPUT_SURFACE_CLASS } from "@/components/ui/control-input";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPeso, makeEstimateFixture, type StoryEstimateRow } from "../fixtures/product-fixtures";
import { Note, StoryGrid, StoryPanel } from "../ui-library/story-canvas";

function EstimateRowsTable({ state = "default" }: { state?: "default" | "empty" | "loading" | "sortable" | "selectable" | "overflow" | "editable" | "error" }) {
  const estimate = makeEstimateFixture(state === "overflow" ? {
    rows: Array.from({ length: 8 }, (_, index) => ({
      id: `story-overflow-${index}`,
      label: `Long estimate row label ${index + 1} that proves overflow handling inside dense table cells`,
      quantity: index + 1,
      unit: "item",
      rate: 4200 + index * 900,
    })),
  } : {});

  if (state === "empty") return <EmptyState title="No table rows" description="Add static line-item fixtures." />;
  if (state === "loading") {
    return (
      <StoryPanel className="space-y-1">
        {[0, 1, 2].map((row) => <Skeleton key={row} className="h-6 w-full" />)}
      </StoryPanel>
    );
  }
  if (state === "error") return <Note tone="danger">Table fixture failed local validation. No provider call was attempted.</Note>;

  return (
    <StoryPanel className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-left text-[10px] leading-4">
        <thead className="text-[9px] font-medium text-tertiary">
          <tr className="border-b border-hairline">
            {state === "selectable" ? <th className="w-8 py-1 pr-2"><input type="checkbox" aria-label="Select all rows" /></th> : null}
            <th className="py-1 pr-2 font-medium">Item {state === "sortable" ? "↕" : ""}</th>
            <th className="py-1 pr-2 font-medium">Qty</th>
            <th className="py-1 pr-2 font-medium">Unit</th>
            <th className="py-1 text-right font-medium">Rate</th>
          </tr>
        </thead>
        <tbody>
          {estimate.rows.map((row) => (
            <EstimateTableRow key={row.id} row={row} selectable={state === "selectable"} editable={state === "editable"} />
          ))}
        </tbody>
      </table>
      {state === "sortable" ? <div className="mt-2"><Button size="sm">Sort by rate</Button></div> : null}
    </StoryPanel>
  );
}

function EstimateTableRow({ row, selectable, editable }: { row: StoryEstimateRow; selectable?: boolean; editable?: boolean }) {
  const tone = row.state === "invalid" ? "danger" : row.state === "dirty" ? "warning" : row.state === "saving" ? "neutral" : "success";

  return (
    <tr className="border-b border-hairline last:border-b-0">
      {selectable ? <td className="py-1 pr-2"><input type="checkbox" aria-label={`Select ${row.label}`} /></td> : null}
      <td className="max-w-56 truncate py-1 pr-2 font-medium text-ink">{row.label}</td>
      <td className="py-1 pr-2 tabular-nums text-secondary">
        {editable ? <ControlInput className={`${CONTROL_INPUT_SURFACE_CLASS} h-6 px-1`} align="right" defaultValue={String(row.quantity)} aria-label={`Quantity for ${row.label}`} /> : row.quantity}
      </td>
      <td className="py-1 pr-2 text-secondary">{row.unit}</td>
      <td className="py-1 text-right tabular-nums text-ink">
        <span className="mr-1">{formatPeso(row.rate)}</span>
        {row.state ? <Badge tone={tone} size="xs">{row.state}</Badge> : null}
      </td>
    </tr>
  );
}

const meta = {
  title: "Data Display/Table",
  component: EstimateRowsTable,
  parameters: {
    docs: {
      description: {
        component:
          "Standalone dense Table story for estimate rows. Static fixtures cover empty, loading, sortable, selectable, overflow, editable cell, and error states.",
      },
    },
  },
} satisfies Meta<typeof EstimateRowsTable>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <EstimateRowsTable />,
};

export const Empty: Story = {
  render: () => <EstimateRowsTable state="empty" />,
};

export const Loading: Story = {
  render: () => <EstimateRowsTable state="loading" />,
};

export const Sortable: Story = {
  render: () => <EstimateRowsTable state="sortable" />,
};

export const Selectable: Story = {
  render: () => <EstimateRowsTable state="selectable" />,
};

export const Overflow: Story = {
  render: () => <EstimateRowsTable state="overflow" />,
};

export const EditableCell: Story = {
  render: () => <EstimateRowsTable state="editable" />,
};

export const ErrorState: Story = {
  render: () => <EstimateRowsTable state="error" />,
};

export const StateMatrix: Story = {
  render: () => (
    <StoryGrid columns="md:grid-cols-2">
      <EstimateRowsTable />
      <EstimateRowsTable state="selectable" />
      <EstimateRowsTable state="editable" />
      <EstimateRowsTable state="loading" />
    </StoryGrid>
  ),
};
