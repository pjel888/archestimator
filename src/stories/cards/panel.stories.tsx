import type { Meta, StoryObj } from "@storybook/react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";

const meta = {
  title: "Cards/Panel",
  component: Panel,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[400px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Panel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div className="text-[10px] text-secondary">
        This is a basic panel with just content.
      </div>
    ),
  },
};

export const WithTitle: Story = {
  args: {
    title: "Project Details",
    children: (
      <div className="text-[10px] text-secondary">
        Panel content goes here. The title is displayed in the header.
      </div>
    ),
  },
};

export const WithActions: Story = {
  args: {
    title: "Estimate Summary",
    actions: (
      <>
        <Button variant="ghost" size="sm">Cancel</Button>
        <Button variant="primary" size="sm">Save</Button>
      </>
    ),
    children: (
      <div className="space-y-2">
        <div className="flex justify-between text-[10px]">
          <span className="text-tertiary">Subtotal</span>
          <span className="font-medium text-ink">$45,000.00</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-tertiary">Tax</span>
          <span className="font-medium text-ink">$3,825.00</span>
        </div>
      </div>
    ),
  },
};

export const ComplexContent: Story = {
  args: {
    title: "Recent Activity",
    children: (
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 h-2 w-2 rounded-xs bg-primary" />
          <div>
            <div className="text-[10px] font-medium text-ink">Estimate Approved</div>
            <div className="text-[9px] text-muted">2 hours ago by John Doe</div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="mt-0.5 h-2 w-2 rounded-xs border border-hairline bg-surfaceMuted" />
          <div>
            <div className="text-[10px] font-medium text-ink">Review Requested</div>
            <div className="text-[9px] text-muted">Yesterday by Jane Smith</div>
          </div>
        </div>
      </div>
    ),
  },
};

export const WithHeader: Story = { args: { title: "Panel Header", children: <div className="text-[10px] text-muted">Panel body content</div> } };
export const Loading: Story = { args: { title: "Loading", children: <div className="space-y-2"><div className="h-3 w-full animate-pulse rounded-xs bg-surfaceMuted" /><div className="h-3 w-3/4 animate-pulse rounded-xs bg-surfaceMuted" /></div> } };
export const Empty: Story = { args: { title: "Empty Panel", children: <div className="text-[10px] text-muted py-4 text-center">No data available</div> } };
export const Error: Story = { args: { title: "Error", children: <div className="text-[10px] text-danger py-4">Something went wrong loading this panel.</div> } };
export const LongContent: Story = { args: { title: "Long Content", children: <div className="text-[10px] text-ink">This panel contains very long content that should demonstrate proper text wrapping and overflow handling within the panel container boundaries without causing layout issues or unexpected scroll behavior in the parent container.</div> } };
