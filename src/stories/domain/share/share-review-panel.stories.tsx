import type { Meta, StoryObj } from "@storybook/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ControlTextarea } from "@/components/ui/control-input";
import { makeShareReviewFixture } from "../../fixtures/product-fixtures";
import { StoryGrid, StoryPanel } from "../../ui-library/story-canvas";

function ShareReviewPanelPreview({ state = "pending" }: { state?: "pending" | "approved" | "changes-requested" | "expired" }) {
  const share = makeShareReviewFixture({ decision: state });
  const tone = state === "approved" ? "success" : state === "changes-requested" ? "warning" : state === "expired" ? "danger" : "neutral";

  return (
    <StoryPanel className="max-w-md space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[9px] leading-3 text-tertiary">Share review</p>
          <h3 className="text-[11px] font-medium leading-4 text-ink">{share.reviewerName}</h3>
        </div>
        <Badge tone={tone}>{share.decision}</Badge>
      </div>
      <p className="text-[10px] leading-4 text-secondary">{share.commentCount} static comments / {share.tokenLabel}</p>
      <ControlTextarea rows={3} defaultValue="Static review note for component library inspection." aria-label="Share review note" />
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="sm">Request changes</Button>
        <Button variant="primary" size="sm">Approve</Button>
      </div>
    </StoryPanel>
  );
}

const meta = {
  title: "Domain/Share/ShareReviewPanel",
  component: ShareReviewPanelPreview,
  parameters: {
    docs: {
      description: {
        component:
          "Standalone ShareReviewPanel story using static share fixtures. It does not access public share APIs, passwords, recipient sessions, or comments.",
      },
    },
  },
} satisfies Meta<typeof ShareReviewPanelPreview>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <ShareReviewPanelPreview />,
};

export const Pending: Story = {
  render: () => <ShareReviewPanelPreview state="pending" />,
};

export const Approved: Story = {
  render: () => <ShareReviewPanelPreview state="approved" />,
};

export const ChangesRequested: Story = {
  render: () => <ShareReviewPanelPreview state="changes-requested" />,
};

export const Expired: Story = {
  render: () => <ShareReviewPanelPreview state="expired" />,
};

export const StateMatrix: Story = {
  render: () => (
    <StoryGrid columns="md:grid-cols-2">
      <ShareReviewPanelPreview state="pending" />
      <ShareReviewPanelPreview state="approved" />
      <ShareReviewPanelPreview state="changes-requested" />
      <ShareReviewPanelPreview state="expired" />
    </StoryGrid>
  ),
};
