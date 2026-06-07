"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { CheckCircle, DotsThreeVertical, WarningCircle, XCircle } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { LoadingEmptyErrorMatrix, Note, StoryGrid, StoryHeader, StoryPanel, StorySection } from "../ui-library/story-canvas";

const meta = {
  title: "Menus and overlays/P0 States",
  parameters: {
    docs: {
      description: {
        component:
          "P0 ActionMenu, ContextMenu, Modal/Dialog, Tooltip, Toast, Empty, Skeleton, Loading, and Error states with static fixtures.",
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ActionMenuAndContextMenu: Story = {
  render: () => (
    <>
      <StoryHeader
        eyebrow="P0 menus"
        title="Action and context menu states"
        description="Static menu examples show grouped, disabled, destructive, shortcut, and keyboard-focus candidates without live actions."
      />
      <StoryGrid columns="md:grid-cols-2">
        <StoryPanel>
          <div className="mb-2 flex h-8 items-center justify-between border border-hairline bg-surfaceMuted px-2">
            <span className="truncate text-[10px] font-medium text-ink">Tree row: Wall cladding panels</span>
            <Button size="icon-sm" variant="ghost" aria-label="Open row actions">
              <DotsThreeVertical size={13} weight="regular" aria-hidden="true" />
            </Button>
          </div>
          <StaticMenu />
        </StoryPanel>
        <StoryPanel>
          <Note>Keyboard story candidate: open menu, move through items with arrows, select with Enter, close with Escape, and return focus to trigger.</Note>
        </StoryPanel>
      </StoryGrid>
    </>
  ),
};

export const ModalDialogStates: Story = {
  render: () => <ModalDemo />,
};

export const ToastStates: Story = {
  render: () => (
    <>
      <StoryHeader
        eyebrow="P0 feedback"
        title="Toast and live-region states"
        description="Actual provider trigger plus static state cards for neutral, success, warning, error, loading, and persistent patterns."
      />
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
      <StorySection title="Static toast state matrix">
        <StoryGrid columns="md:grid-cols-4">
          <ToastCard tone="neutral" icon={<CheckCircle size={13} weight="regular" />} label="Saved local fixture" />
          <ToastCard tone="success" icon={<CheckCircle size={13} weight="regular" />} label="Estimate approved" />
          <ToastCard tone="warning" icon={<WarningCircle size={13} weight="regular" />} label="Cost variance warning" />
          <ToastCard tone="danger" icon={<XCircle size={13} weight="regular" />} label="Static validation failed" />
        </StoryGrid>
      </StorySection>
    </>
  ),
};

export const EmptySkeletonLoadingAndError: Story = {
  render: () => (
    <>
      <StoryHeader
        eyebrow="P0 feedback"
        title="Empty, skeleton, loading, and error states"
        description="Shared feedback patterns are deterministic and provider-free."
      />
      <LoadingEmptyErrorMatrix />
    </>
  ),
};

function StaticMenu() {
  const rows = [
    ["Open estimate", "Enter", "default"],
    ["Duplicate row", "D", "default"],
    ["Rename group", "R", "default"],
    ["Locked: inherited access", "", "disabled"],
    ["Delete row", "Del", "danger"],
  ];

  return (
    <div className="w-56 border border-hairline bg-white p-1 shadow-[0_12px_32px_rgba(17,24,39,0.12)]">
      {rows.map(([label, shortcut, state]) => (
        <div
          key={label}
          className={[
            "flex min-h-7 items-center gap-2 px-2 py-1 text-[10px] font-medium leading-3",
            state === "danger" ? "text-danger" : state === "disabled" ? "text-tertiary opacity-50" : "text-ink",
          ].join(" ")}
        >
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {shortcut ? <span className="text-[9px] text-tertiary">{shortcut}</span> : null}
        </div>
      ))}
    </div>
  );
}

function ModalDemo() {
  const [open, setOpen] = useState(true);

  return (
    <>
      <StoryHeader
        eyebrow="P0 overlays"
        title="Modal dialog states"
        description="Actual shared Modal primitive with static form, busy, error, and destructive examples."
      />
      <StoryPanel className="space-y-2">
        <Button onClick={() => setOpen(true)}>Open modal</Button>
        <Note>Escape closes the dialog; focus-return testing remains a future interaction play candidate.</Note>
      </StoryPanel>
      <Modal open={open} title="Share review package" description="Static Storybook fixture only" onOpenChange={setOpen}>
        <div className="space-y-2">
          <Note>Confirm this package before sending a review link. No email or provider call happens from this story.</Note>
          <div className="flex justify-end gap-1">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => setOpen(false)}>Confirm</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function ToastTrigger() {
  const { toast } = useToast();

  return (
    <StoryPanel className="mb-3">
      <Button
        onClick={() => {
          toast({ id: "story-toast", message: "Storybook fixture toast shown.", tone: "success", durationMs: 3000 });
        }}
      >
        Show provider toast
      </Button>
    </StoryPanel>
  );
}

function ToastCard({ tone, icon, label }: { tone: "neutral" | "success" | "warning" | "danger"; icon: ReactNode; label: string }) {
  const toneClassName = {
    neutral: "border-hairline text-ink",
    success: "border-successSoft text-success",
    warning: "border-warningSoft text-warning",
    danger: "border-dangerSoft text-danger",
  }[tone];

  return (
    <div className={`flex min-h-8 items-start gap-1.5 border bg-white px-2 py-1.5 text-[10px] font-medium leading-4 ${toneClassName}`}>
      <span className="mt-0.5">{icon}</span>
      <span className="min-w-0 flex-1">{label}</span>
    </div>
  );
}
