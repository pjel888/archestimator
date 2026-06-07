import type { Meta, StoryObj } from "@storybook/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterPopover, HelpPopover, InfoPopover, Popover } from "@/components/ui/overlays/popover";
import { Note, StoryPanel } from "../ui-library/story-canvas";

function PopoverFixture({ variant = "default" }: { variant?: "default" | "info" | "help" | "filter" | "footer" | "focus" }) {
  const Component = variant === "info" ? InfoPopover : variant === "help" ? HelpPopover : variant === "filter" ? FilterPopover : Popover;

  return (
    <StoryPanel className="min-h-48">
      <Component
        trigger={variant === "filter" ? "Filters" : "Details"}
        triggerLabel="Toggle story popover"
        defaultOpen
        title={variant === "filter" ? "Filter estimate rows" : "Popover surface"}
        description="Compact anchored overlay with local state only."
        footer={variant === "footer" ? <Button size="sm">Apply</Button> : undefined}
      >
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            <Badge>Draft</Badge>
            <Badge tone="success">Approved</Badge>
            <Badge tone="warning">Needs review</Badge>
          </div>
          {variant === "focus" ? <Note>Keyboard contract: trigger exposes expanded state and controls the popover id.</Note> : null}
        </div>
      </Component>
    </StoryPanel>
  );
}

const meta = {
  title: "Overlays/Popover",
  component: Popover,
  parameters: {
    docs: {
      description: {
        component:
          "Reusable Popover primitive with information, help, filter, footer-action, and keyboard-focused examples. This replaces the earlier deferred static preview.",
      },
    },
  },
} satisfies Meta<typeof Popover>;

export default meta;

type Story = StoryObj;

export const Default: Story = { render: () => <PopoverFixture /> };
export const Info: Story = { render: () => <PopoverFixture variant="info" /> };
export const Help: Story = { render: () => <PopoverFixture variant="help" /> };
export const Filter: Story = { render: () => <PopoverFixture variant="filter" /> };
export const WithFooterActions: Story = { render: () => <PopoverFixture variant="footer" /> };
export const KeyboardFocus: Story = { render: () => <PopoverFixture variant="focus" /> };
