import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StoryPanel } from "../ui-library/story-canvas";

function PopoverPreview() {
  return (
    <StoryPanel className="space-y-2">
      <Button>Open popover trigger</Button>
      <div role="dialog" aria-label="Filter popover preview" className="w-56 rounded-xs border border-hairline bg-white p-2 shadow-[0_12px_32px_rgba(17,24,39,0.12)]">
        <p className="text-[11px] font-medium leading-4 text-ink">Filter estimate rows</p>
        <p className="mt-1 text-[9px] leading-3 text-tertiary">Static popover preview. Production Popover remains deferred until a shared primitive is approved.</p>
        <div className="mt-2 flex flex-wrap gap-1">
          <Badge>Draft</Badge>
          <Badge tone="success">Approved</Badge>
          <Badge tone="warning">Needs review</Badge>
        </div>
      </div>
    </StoryPanel>
  );
}

const meta = {
  title: "Overlays/Popover",
  component: PopoverPreview,
  parameters: {
    docs: {
      description: {
        component:
          "DEFERRED shared primitive story. This static preview documents the expected compact Popover surface without adding a new runtime dependency.",
      },
    },
  },
} satisfies Meta<typeof PopoverPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DeferredPreview: Story = {
  render: () => <PopoverPreview />,
};
