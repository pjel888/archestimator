import type { Meta, StoryObj } from "@storybook/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HoverCard } from "@/components/ui/overlays/hover-card";
import { Note, StoryPanel } from "../ui-library/story-canvas";

function HoverCardFixture({ variant = "default" }: { variant?: "default" | "reviewer" | "cost" | "focus" }) {
  return (
    <StoryPanel className="min-h-48">
      <HoverCard
        trigger={<Button variant="secondary">{variant === "cost" ? "Cost item" : "Reviewer"}</Button>}
        title={variant === "cost" ? "Custom millwork" : "Client reviewer"}
        description="Hover or focus card with static Storybook data."
      >
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            <Badge tone={variant === "cost" ? "warning" : "success"}>{variant === "cost" ? "Allowance" : "Approved"}</Badge>
            <Badge>Static</Badge>
          </div>
          <p>
            {variant === "cost"
              ? "Shows cost context without opening a blocking modal."
              : "Shows reviewer metadata without a route transition."}
          </p>
          {variant === "focus" ? <Note>Keyboard contract: trigger is focusable and exposes the card by description id.</Note> : null}
        </div>
      </HoverCard>
    </StoryPanel>
  );
}

const meta = {
  title: "Overlays/HoverCard",
  component: HoverCard,
  parameters: {
    docs: {
      description: {
        component:
          "Reusable HoverCard primitive for non-blocking metadata previews on hover and focus.",
      },
    },
  },
} satisfies Meta<typeof HoverCard>;

export default meta;

type Story = StoryObj;

export const Default: Story = { render: () => <HoverCardFixture /> };
export const ReviewerPreview: Story = { render: () => <HoverCardFixture variant="reviewer" /> };
export const CostPreview: Story = { render: () => <HoverCardFixture variant="cost" /> };
export const KeyboardFocus: Story = { render: () => <HoverCardFixture variant="focus" /> };
