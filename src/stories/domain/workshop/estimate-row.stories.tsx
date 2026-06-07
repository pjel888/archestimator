import type { Meta, StoryObj } from "@storybook/react";

import { Badge } from "@/components/ui/badge";
import { ControlInput, CONTROL_INPUT_SURFACE_CLASS } from "@/components/ui/control-input";
import { formatPeso, makeEstimateFixture } from "../../fixtures/product-fixtures";
import { StoryPanel } from "../../ui-library/story-canvas";

function EstimateRowPreview({
  rowIndex = 0,
  editable = false,
  longContent = false,
  stateOverride,
}: {
  rowIndex?: number;
  editable?: boolean;
  longContent?: boolean;
  stateOverride?: "dirty" | "saving" | "invalid";
}) {
  const estimate = makeEstimateFixture();
  const row = estimate.rows[rowIndex] ?? estimate.rows[0];
  const state = stateOverride ?? row.state;
  const label = longContent
    ? "Very long estimate row label for custom millwork, site protection, night work, and phasing allowances"
    : row.label;
  const tone = state === "invalid" ? "danger" : state === "dirty" ? "warning" : state === "saving" ? "neutral" : "success";

  return (
    <StoryPanel className="grid max-w-xl grid-cols-[1fr_48px_52px_84px] items-center gap-2 text-[10px] leading-4">
      <span className="truncate font-medium text-ink">
        {label}
        {state ? <Badge className="ml-1" tone={tone} size="xs">{state}</Badge> : null}
      </span>
      <span className="text-right tabular-nums text-secondary">
        {editable ? <ControlInput className={`${CONTROL_INPUT_SURFACE_CLASS} h-6 px-1`} align="right" defaultValue={String(row.quantity)} aria-label={`Quantity for ${label}`} /> : row.quantity}
      </span>
      <span className="text-secondary">{row.unit}</span>
      <span className="text-right font-medium tabular-nums text-ink">{formatPeso(row.rate)}</span>
    </StoryPanel>
  );
}

const meta = {
  title: "Domain/Workshop/EstimateRow",
  component: EstimateRowPreview,
  parameters: {
    docs: {
      description: {
        component:
          "Standalone EstimateRow story using a static estimate fixture. Persistence, optimistic updates, and route mutations remain out of scope.",
      },
    },
  },
} satisfies Meta<typeof EstimateRowPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <EstimateRowPreview />,
};

export const Dirty: Story = {
  render: () => <EstimateRowPreview rowIndex={1} />,
};

export const Saving: Story = {
  render: () => <EstimateRowPreview rowIndex={0} stateOverride="saving" />,
};

export const Invalid: Story = {
  render: () => <EstimateRowPreview rowIndex={3} />,
};

export const Editable: Story = {
  render: () => <EstimateRowPreview rowIndex={1} editable />,
};

export const LongContent: Story = {
  render: () => <EstimateRowPreview longContent />,
};
