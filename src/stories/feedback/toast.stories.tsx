import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "@/components/ui/button";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Note, StoryGrid, StoryPanel } from "../ui-library/story-canvas";

function ToastTriggerPanel({ tone, label }: { tone: "neutral" | "success" | "error" | "loading"; label: string }) {
  const { toast } = useToast();

  return (
    <Button
      onClick={() => toast({ id: `story-${tone}`, message: label, tone, durationMs: tone === "loading" ? null : 5000 })}
    >
      Trigger {label}
    </Button>
  );
}

function StaticToast({ tone, label }: { tone: "neutral" | "success" | "warning" | "error"; label: string }) {
  const toneClassName = {
    neutral: "border-hairline text-ink",
    success: "border-successSoft text-success",
    warning: "border-warningSoft text-warning",
    error: "border-dangerSoft text-danger",
  }[tone];

  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex min-h-8 items-start rounded-xs border bg-white px-2 py-1.5 text-[10px] font-medium leading-4 ${toneClassName}`}>
      {label}
    </div>
  );
}

const meta = {
  title: "Feedback/Toast",
  component: ToastProvider,
  parameters: {
    docs: {
      description: {
        component:
          "Standalone Toast story for static and triggered provider examples. The provider is local to Storybook and does not call notification APIs.",
      },
    },
  },
} satisfies Meta<typeof ToastProvider>;

export default meta;

type Story = StoryObj;

export const Info: Story = {
  render: () => <StaticToast tone="neutral" label="Estimate saved as a static story state." />,
};

export const Success: Story = {
  render: () => <StaticToast tone="success" label="Proposal review marked approved." />,
};

export const Warning: Story = {
  render: () => <StaticToast tone="warning" label="Lighting allowance is above baseline." />,
};

export const Error: Story = {
  render: () => <StaticToast tone="error" label="Could not validate static fixture." />,
};

export const Persistent: Story = {
  render: () => <StaticToast tone="warning" label="Persistent import in progress. Dismissal is intentionally delayed." />,
};

export const TriggeredProviderExample: Story = {
  render: () => (
    <ToastProvider viewportClassName="!absolute !bottom-2">
      <StoryPanel className="space-y-2">
        <ToastTriggerPanel tone="neutral" label="Info toast" />
        <ToastTriggerPanel tone="success" label="Success toast" />
        <ToastTriggerPanel tone="error" label="Error toast" />
      </StoryPanel>
    </ToastProvider>
  ),
};

export const StaticStateMatrix: Story = {
  render: () => (
    <StoryGrid columns="md:grid-cols-2">
      <StaticToast tone="neutral" label="Info state" />
      <StaticToast tone="success" label="Success state" />
      <StaticToast tone="warning" label="Warning state" />
      <StaticToast tone="error" label="Error state" />
    </StoryGrid>
  ),
};

export const AccessibilityNotes: Story = {
  render: () => <Note>Accessibility contract: error toasts use alert/assertive semantics; other toasts use polite status semantics.</Note>,
};
