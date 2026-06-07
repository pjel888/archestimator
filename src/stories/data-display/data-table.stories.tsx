import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPeso, makeEstimateFixture } from "../fixtures/product-fixtures";
import { Note, StoryPanel } from "../ui-library/story-canvas";

function DataTablePreview({ state = "default" }: { state?: "default" | "toolbar" | "empty" | "loading" | "error" }) {
  const estimate = makeEstimateFixture();

  if (state === "empty") return <EmptyState title="No data table rows" description="Static fixture returned an empty row set." />;
  if (state === "loading") {
    return (
      <StoryPanel className="space-y-1">
        {[0, 1, 2, 3].map((row) => <Skeleton key={row} className="h-6 w-full" />)}
      </StoryPanel>
    );
  }
  if (state === "error") return <Note tone="danger">DataTable fixture failed local validation. No provider call was attempted.</Note>;

  return (
    <StoryPanel className="space-y-2 overflow-x-auto">
      {state === "toolbar" ? (
        <div className="flex items-center gap-1">
          <SearchInput value="" readOnly placeholder="Search rows" aria-label="Search data table rows" wrapperClassName="h-8 min-h-8 flex-1" />
          <Button size="sm">Filter</Button>
        </div>
      ) : null}
      <table className="w-full min-w-[520px] border-collapse text-left text-[10px] leading-4">
        <thead className="text-[9px] font-medium text-tertiary">
          <tr className="border-b border-hairline">
            <th className="py-1 pr-2 font-medium">Item</th>
            <th className="py-1 pr-2 font-medium">Qty</th>
            <th className="py-1 pr-2 font-medium">Unit</th>
            <th className="py-1 text-right font-medium">Rate</th>
          </tr>
        </thead>
        <tbody>
          {estimate.rows.map((row) => (
            <tr key={row.id} className="border-b border-hairline last:border-b-0">
              <td className="max-w-56 truncate py-1 pr-2 font-medium text-ink">{row.label}</td>
              <td className="py-1 pr-2 tabular-nums text-secondary">{row.quantity}</td>
              <td className="py-1 pr-2 text-secondary">{row.unit}</td>
              <td className="py-1 text-right tabular-nums text-ink">{formatPeso(row.rate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </StoryPanel>
  );
}

const meta = {
  title: "Data Display/DataTable",
  component: DataTablePreview,
  parameters: {
    archestimator: {
      storybookContract: "story-composition",
    },
    docs: {
      description: {
        component:
          "Standalone DataTable story documenting table shell, toolbar, empty, loading, and error states from static estimate fixtures.",
      },
    },
  },
} satisfies Meta<typeof DataTablePreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <DataTablePreview />,
};

export const WithToolbar: Story = {
  render: () => <DataTablePreview state="toolbar" />,
};

export const Empty: Story = {
  render: () => <DataTablePreview state="empty" />,
};

export const Loading: Story = {
  render: () => <DataTablePreview state="loading" />,
};

export const ErrorState: Story = {
  render: () => <DataTablePreview state="error" />,
};
