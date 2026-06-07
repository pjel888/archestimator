import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Note, StoryPanel } from "../ui-library/story-canvas";

function ConfirmDialogExample({ danger = false }: { danger?: boolean }) {
  const [open, setOpen] = useState(true);

  return (
    <StoryPanel className="min-h-56">
      <Button variant={danger ? "danger" : "secondary"} onClick={() => setOpen(true)}>
        Open confirmation
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={danger ? "Delete selected rows?" : "Apply review decision?"}
        description={danger ? "This action is destructive in production; this story is static." : "Confirm before changing shared review state."}
      >
        <div className="space-y-3">
          <Note tone={danger ? "danger" : "neutral"}>
            Static confirmation copy documents tone, focus, and action hierarchy without invoking app actions.
          </Note>
          <div className="flex justify-end gap-1">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant={danger ? "danger" : "primary"}>{danger ? "Delete" : "Apply"}</Button>
          </div>
        </div>
      </Modal>
    </StoryPanel>
  );
}

const meta = {
  title: "Overlays/ConfirmDialog",
  component: ConfirmDialogExample,
  parameters: {
    docs: {
      description: {
        component:
          "Story-only confirmation dialog composition built on Modal and Button. It documents confirm/cancel hierarchy while production route actions remain out of scope.",
      },
    },
  },
} satisfies Meta<typeof ConfirmDialogExample>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <ConfirmDialogExample />,
};

export const DestructiveConfirm: Story = {
  render: () => <ConfirmDialogExample danger />,
};

export const Busy: Story = {
  render: () => (
    <StoryPanel className="space-y-2">
      <ConfirmDialogExample />
      <Note tone="warning">Busy state disables the primary action in production; this story keeps it static for review.</Note>
    </StoryPanel>
  ),
};

export const FocusNotes: Story = {
  render: () => <Note>Keyboard contract: confirm dialogs use the Modal close/Escape behavior and labelled action buttons.</Note>,
};
