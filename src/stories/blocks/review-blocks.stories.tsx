import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function ReviewBlockPreview() {
  return (
    <section className="max-w-xl rounded-xs border border-hairline bg-white p-2">
      <Badge tone="warning">Storybook-only block</Badge>
      <h3 className="mt-2 text-[12px] font-medium leading-4 text-ink">Proposal review block</h3>
      <p className="mt-1 text-[10px] leading-4 text-secondary">Reusable page blocks remain Storybook-only until Philip approves route migration.</p>
      <div className="mt-2 flex gap-1">
        <Button size="sm" variant="ghost">Request changes</Button>
        <Button size="sm" variant="primary">Approve</Button>
      </div>
    </section>
  );
}

const meta = {
  title: "Blocks/ReviewBlocks",
  component: ReviewBlockPreview,
  parameters: {
    docs: {
      description: {
        component:
          "DEFERRED Blocks group entry for page-level compositions. It documents Storybook-only review blocks without migrating production routes.",
      },
    },
  },
} satisfies Meta<typeof ReviewBlockPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DeferredPreview: Story = { render: () => <ReviewBlockPreview /> };
