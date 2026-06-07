import type { Meta, StoryObj } from "@storybook/react";
import { MagnifyingGlass } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { ToolbarIconButton } from "@/components/ui/toolbar-icon-button";
import { Tooltip } from "@/components/ui/overlays/tooltip";
import { Note, StoryPanel } from "../ui-library/story-canvas";

function TooltipFixture({ variant = "default" }: { variant?: "default" | "toolbar" | "long" | "focus" }) {
  return (
    <StoryPanel className="space-y-3">
      <Tooltip
        side={variant === "long" ? "bottom" : "top"}
        label={variant === "long" ? "Long tooltip text wraps by using a wider content class." : "Search estimate rows"}
        contentClassName={variant === "long" ? "max-w-48 whitespace-normal leading-3" : undefined}
      >
        {variant === "toolbar" ? (
          <ToolbarIconButton label="Search estimate rows">
            <MagnifyingGlass size={12} weight="regular" aria-hidden="true" />
          </ToolbarIconButton>
        ) : (
          <Button variant="secondary">Hover target</Button>
        )}
      </Tooltip>
      {variant === "focus" ? <Note>Keyboard contract: tooltip appears on focus and is supplemental to visible or accessible labels.</Note> : null}
    </StoryPanel>
  );
}

const meta = {
  title: "Overlays/Tooltip",
  component: Tooltip,
  parameters: {
    docs: {
      description: {
        component:
          "Reusable Tooltip primitive plus the existing ToolbarIconButton tooltip composition. Stories pin the tooltip open for visual review.",
      },
    },
  },
} satisfies Meta<typeof Tooltip>;

export default meta;

type Story = StoryObj;

export const Default: Story = { render: () => <TooltipFixture /> };
export const ToolbarTooltip: Story = { render: () => <TooltipFixture variant="toolbar" /> };
export const LongContent: Story = { render: () => <TooltipFixture variant="long" /> };
export const KeyboardFocus: Story = { render: () => <TooltipFixture variant="focus" /> };
