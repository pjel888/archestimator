import type { Meta, StoryObj } from "@storybook/react";

import { Card } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { StoryPanel } from "../ui-library/story-canvas";

const meta = {
  title: "Cards/Card",
  component: Card,
  parameters: {
    docs: {
      description: {
        component: "Card component for grouping related content.",
      },
    },
  },
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <StoryPanel className="max-w-md">
      <Card className="p-4">
        <h3 className="text-[12px] font-medium mb-2">Card Title</h3>
        <p className="text-[10px] text-muted">
          This is a basic card component. It provides a container with a border, background, and border radius.
        </p>
      </Card>
    </StoryPanel>
  ),
};

export const Interactive: Story = {
  render: () => (
    <StoryPanel className="max-w-md">
      <Card interactive className="p-4 cursor-pointer">
        <h3 className="text-[12px] font-medium mb-2">Interactive Card</h3>
        <p className="text-[10px] text-muted">
          Hover over this card to see the interactive state. It elevates slightly and adds a shadow.
        </p>
      </Card>
    </StoryPanel>
  ),
};

export const WithSections: Story = {
  render: () => (
    <StoryPanel className="max-w-md">
      <Card>
        <div className="p-4 border-b border-hairline">
          <h3 className="text-[12px] font-medium">Card Header</h3>
        </div>
        <div className="p-4">
          <p className="text-[10px] text-muted">
            This card has distinct sections separated by borders.
          </p>
        </div>
        <div className="p-4 border-t border-hairline bg-surfaceMuted rounded-b-xs">
          <p className="text-[10px] text-muted">Card Footer</p>
        </div>
      </Card>
    </StoryPanel>
  ),
};

export const WithHeader: Story = { args: { children: <><div className="text-[11px] font-medium text-ink">Header</div><div className="text-[10px] text-muted">Content</div></> } };
export const WithActions: Story = { args: { children: <><div className="text-[10px] text-ink">Card with actions</div><div className="mt-2 flex gap-2"><Button size="sm" variant="secondary">Cancel</Button><Button size="sm" variant="primary">Save</Button></div></> } };
export const Selected: Story = { args: { className: "ring-1 ring-focus", children: <div className="text-[10px] text-ink">Selected card</div> } };
export const Loading: Story = { args: { children: <div className="flex items-center gap-2"><div className="h-3 w-32 animate-pulse rounded-xs bg-surfaceMuted" /><div className="h-3 w-24 animate-pulse rounded-xs bg-surfaceMuted" /></div> } };
export const Empty: Story = { args: { children: <div className="text-[10px] text-muted py-4 text-center">No items to display</div> } };
export const Error: Story = { args: { children: <div className="text-[10px] text-danger py-4">Failed to load content</div> } };
export const LongContent: Story = { args: { children: <div className="text-[10px] text-ink">This is a very long content that should demonstrate how the card handles overflow and wrapping of text content within its boundaries properly without breaking the layout.</div> } };
